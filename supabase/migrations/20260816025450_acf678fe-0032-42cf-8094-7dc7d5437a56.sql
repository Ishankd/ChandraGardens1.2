CREATE TABLE public.cover_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  price_delta NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price_delta >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cover_sizes TO anon;
GRANT SELECT ON public.cover_sizes TO authenticated;
GRANT ALL ON public.cover_sizes TO service_role;
ALTER TABLE public.cover_sizes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cover_sizes_public_read"
ON public.cover_sizes;

CREATE POLICY "cover_sizes_public_read"
ON public.cover_sizes
FOR SELECT
TO anon, authenticated
USING (active);
INSERT INTO public.cover_sizes (label, price_delta, sort_order) VALUES
  ('6 inch cover', 0, 1),
  ('8 inch cover', 100, 2),
  ('10 inch cover', 250, 3),
  ('12 inch cover', 450, 4),
  ('14 inch cover', 700, 5);

ALTER TABLE public.cart_items ADD COLUMN cover_size_id UUID REFERENCES public.cover_sizes(id);
ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_cart_id_product_id_key;
CREATE UNIQUE INDEX cart_items_unique_line ON public.cart_items
  (cart_id, product_id, COALESCE(cover_size_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE public.order_items ADD COLUMN cover_size TEXT;

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
    SELECT ci.quantity, p.id AS pid, p.name, p.price, p.stock, p.available,
           COALESCE(cs.price_delta, 0) AS delta
    FROM public.cart_items ci
    JOIN public.products p ON p.id = ci.product_id
    LEFT JOIN public.cover_sizes cs ON cs.id = ci.cover_size_id
    WHERE ci.cart_id = v_cart_id
    ORDER BY p.id
    FOR UPDATE OF p
  LOOP
    IF NOT r.available THEN RAISE EXCEPTION 'UNAVAILABLE: %', r.name; END IF;
    IF r.quantity <= 0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
    IF r.stock < r.quantity THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK: %', r.name; END IF;
    v_subtotal := v_subtotal + ((r.price + r.delta) * r.quantity);
  END LOOP;

  v_number := 'CG-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));

  INSERT INTO public.orders (order_number, customer_id, customer_name, email, phone, address, locality, city, state, pincode, delivery_instructions, subtotal, delivery_charge, total)
  VALUES (v_number, _user_id, _customer_name, _email, _phone, _address, _locality, _city, _state, _pincode, _instructions, v_subtotal, _delivery_charge, v_subtotal + _delivery_charge)
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_id, product_name, cover_size, quantity, unit_price, line_total)
  SELECT v_order_id, p.id, p.name, cs.label, ci.quantity,
         p.price + COALESCE(cs.price_delta, 0),
         (p.price + COALESCE(cs.price_delta, 0)) * ci.quantity
  FROM public.cart_items ci
  JOIN public.products p ON p.id = ci.product_id
  LEFT JOIN public.cover_sizes cs ON cs.id = ci.cover_size_id
  WHERE ci.cart_id = v_cart_id;

  RETURN QUERY SELECT v_order_id, v_number, v_subtotal, _delivery_charge, v_subtotal + _delivery_charge;
END; $$;