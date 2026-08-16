CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  cover_size text NOT NULL,
  cover_size_id uuid REFERENCES public.cover_sizes(id) ON DELETE RESTRICT,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, cover_size)
);

ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS cover_size_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_variants_cover_size_id_fkey'
  ) THEN
    ALTER TABLE public.product_variants
      ADD CONSTRAINT product_variants_cover_size_id_fkey
      FOREIGN KEY (cover_size_id) REFERENCES public.cover_sizes(id) ON DELETE RESTRICT;
  END IF;
END $$;

UPDATE public.product_variants pv
SET cover_size_id = cs.id
FROM public.cover_sizes cs
WHERE pv.cover_size_id IS NULL AND pv.cover_size = cs.label;

INSERT INTO public.product_variants (product_id, cover_size, cover_size_id, price, stock, available)
SELECT p.id, cs.label, cs.id, p.price + cs.price_delta, p.stock, p.available
FROM public.products p
CROSS JOIN public.cover_sizes cs
WHERE cs.active
  AND NOT EXISTS (
    SELECT 1 FROM public.product_variants pv
    WHERE pv.product_id = p.id AND pv.cover_size_id = cs.id
  );

CREATE UNIQUE INDEX IF NOT EXISTS product_variants_product_cover_id_unique
  ON public.product_variants(product_id, cover_size_id)
  WHERE cover_size_id IS NOT NULL;

ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS variant_id uuid;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_variant_id_fkey') THEN
    ALTER TABLE public.cart_items
      ADD CONSTRAINT cart_items_variant_id_fkey
      FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_variant_id_fkey') THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_variant_id_fkey
      FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS cart_items_variant_id_idx ON public.cart_items(variant_id);
CREATE INDEX IF NOT EXISTS order_items_variant_id_idx ON public.order_items(variant_id);

UPDATE public.cart_items ci
SET variant_id = pv.id
FROM public.product_variants pv
WHERE ci.variant_id IS NULL
  AND ci.product_id = pv.product_id
  AND ci.cover_size_id = pv.cover_size_id;

UPDATE public.order_items oi
SET variant_id = pv.id
FROM public.product_variants pv
WHERE oi.variant_id IS NULL
  AND oi.product_id = pv.product_id
  AND oi.cover_size = pv.cover_size;

GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "product_variants_public_read" ON public.product_variants;
CREATE POLICY "product_variants_public_read" ON public.product_variants
FOR SELECT TO anon, authenticated USING (available = true);
DROP POLICY IF EXISTS "product_variants_admin_all" ON public.product_variants;
CREATE POLICY "product_variants_admin_all" ON public.product_variants
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.place_order(
  _user_id UUID, _customer_name TEXT, _email TEXT, _phone TEXT, _address TEXT,
  _locality TEXT, _city TEXT, _state TEXT, _pincode TEXT, _instructions TEXT,
  _delivery_charge NUMERIC
) RETURNS TABLE (order_id UUID, order_number TEXT, subtotal NUMERIC, delivery_charge NUMERIC, total NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cart_id UUID;
  v_subtotal NUMERIC := 0;
  v_order_id UUID;
  v_number TEXT;
  r RECORD;
BEGIN
  SELECT id INTO v_cart_id FROM public.carts WHERE customer_id = _user_id;
  IF v_cart_id IS NULL THEN RAISE EXCEPTION 'CART_EMPTY'; END IF;
  PERFORM 1 FROM public.cart_items WHERE cart_id = v_cart_id LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'CART_EMPTY'; END IF;

  FOR r IN
    SELECT ci.quantity, p.id AS product_id, p.name, p.price AS product_price, p.stock AS product_stock,
           p.available AS product_available, pv.id AS variant_id, pv.cover_size,
           pv.price AS variant_price, pv.stock AS variant_stock, pv.available AS variant_available
    FROM public.cart_items ci
    JOIN public.products p ON p.id = ci.product_id
    LEFT JOIN public.product_variants pv ON pv.id = ci.variant_id
    WHERE ci.cart_id = v_cart_id
    ORDER BY p.id, pv.id NULLS FIRST
    FOR UPDATE
  LOOP
    IF NOT r.product_available THEN RAISE EXCEPTION 'UNAVAILABLE: %', r.name; END IF;
    IF r.quantity <= 0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
    IF r.variant_id IS NOT NULL THEN
      IF NOT r.variant_available THEN RAISE EXCEPTION 'UNAVAILABLE: % (%)', r.name, r.cover_size; END IF;
      IF r.variant_stock < r.quantity THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK: % (%)', r.name, r.cover_size; END IF;
      v_subtotal := v_subtotal + (r.variant_price * r.quantity);
    ELSE
      IF r.product_stock < r.quantity THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK: %', r.name; END IF;
      v_subtotal := v_subtotal + (r.product_price * r.quantity);
    END IF;
  END LOOP;

  v_number := 'CG-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));

  INSERT INTO public.orders (order_number, customer_id, customer_name, email, phone, address, locality, city, state, pincode, delivery_instructions, subtotal, delivery_charge, total)
  VALUES (v_number, _user_id, _customer_name, _email, _phone, _address, _locality, _city, _state, _pincode, _instructions, v_subtotal, _delivery_charge, v_subtotal + _delivery_charge)
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_id, variant_id, product_name, cover_size, quantity, unit_price, line_total)
  SELECT v_order_id, p.id, pv.id, p.name, pv.cover_size, ci.quantity,
         COALESCE(pv.price, p.price), COALESCE(pv.price, p.price) * ci.quantity
  FROM public.cart_items ci
  JOIN public.products p ON p.id = ci.product_id
  LEFT JOIN public.product_variants pv ON pv.id = ci.variant_id
  WHERE ci.cart_id = v_cart_id;

  RETURN QUERY SELECT v_order_id, v_number, v_subtotal, _delivery_charge, v_subtotal + _delivery_charge;
END; $$;
REVOKE ALL ON FUNCTION public.place_order(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,NUMERIC) TO service_role;

CREATE OR REPLACE FUNCTION public.confirm_order_payment(_razorpay_order_id TEXT, _razorpay_payment_id TEXT)
RETURNS TABLE (order_id UUID, already_processed BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o RECORD; r RECORD;
BEGIN
  SELECT * INTO o FROM public.orders WHERE razorpay_order_id = _razorpay_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF o.stock_applied THEN RETURN QUERY SELECT o.id, true; RETURN; END IF;

  FOR r IN SELECT oi.variant_id, oi.product_id, oi.quantity, oi.product_name, oi.cover_size
           FROM public.order_items oi WHERE oi.order_id = o.id ORDER BY oi.variant_id NULLS LAST, oi.product_id
  LOOP
    IF r.variant_id IS NOT NULL THEN
      UPDATE public.product_variants SET stock = stock - r.quantity
      WHERE id = r.variant_id AND available AND stock >= r.quantity;
      IF NOT FOUND THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK: % (%)', r.product_name, COALESCE(r.cover_size, 'variant'); END IF;
    ELSE
      UPDATE public.products SET stock = stock - r.quantity
      WHERE id = r.product_id AND stock >= r.quantity;
      IF NOT FOUND THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK: %', r.product_name; END IF;
    END IF;
  END LOOP;

  UPDATE public.orders SET payment_status = 'paid', order_status = 'confirmed',
    razorpay_payment_id = COALESCE(_razorpay_payment_id, razorpay_payment_id), stock_applied = true
  WHERE id = o.id;

  DELETE FROM public.cart_items
  WHERE cart_id IN (SELECT id FROM public.carts WHERE customer_id = o.customer_id);

  RETURN QUERY SELECT o.id, false;
END; $$;
REVOKE ALL ON FUNCTION public.confirm_order_payment(TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_order_payment(TEXT,TEXT) TO service_role;
