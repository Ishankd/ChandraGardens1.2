
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('customer','admin');
CREATE TYPE public.order_status AS ENUM ('placed','confirmed','packed','shipped','delivered','cancelled');
CREATE TYPE public.payment_status AS ENUM ('pending','paid','failed','refunded');
CREATE TYPE public.difficulty_level AS ENUM ('Easy','Medium','Hard');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  role public.app_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = _role);
$$;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
-- role and id cannot be changed by the user: enforced by trigger below
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    NEW.role := OLD.role;
    NEW.id := OLD.id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_profiles_no_escalation BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    COALESCE(NEW.email,''),
    NEW.raw_user_meta_data->>'phone',
    'customer'
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CATEGORIES
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "categories_admin_write" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  available BOOLEAN NOT NULL DEFAULT true,
  sunlight TEXT,
  watering TEXT,
  soil TEXT,
  difficulty public.difficulty_level NOT NULL DEFAULT 'Easy',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_available ON public.products(available);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "products_public_read" ON public.products FOR SELECT TO anon, authenticated USING (available = true);
CREATE POLICY "products_admin_read" ON public.products FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "products_admin_write" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- CARTS
CREATE TABLE public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carts TO authenticated;
GRANT ALL ON public.carts TO service_role;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_carts_updated BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "carts_own" ON public.carts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id)
);
CREATE INDEX idx_cart_items_cart ON public.cart_items(cart_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_cart_items_updated BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "cart_items_own" ON public.cart_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = auth.uid()));

-- ORDERS
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  locality TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  delivery_instructions TEXT,
  subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  delivery_charge NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (delivery_charge >= 0),
  total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  order_status public.order_status NOT NULL DEFAULT 'placed',
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  stock_applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_customer ON public.orders(customer_id);
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "orders_select_own" ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = customer_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "orders_admin_write" ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(10,2) NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_select_own" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id
    AND (o.customer_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "order_items_admin_write" ON public.order_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- SEED CATEGORIES + PRODUCTS (matching existing frontend catalogue)
INSERT INTO public.categories (name, slug, image) VALUES
 ('Decorative','decorative','https://images.unsplash.com/photo-1463936575829-25148e1db1b8?auto=format&fit=crop&w=800&q=80'),
 ('Fruit','fruit','https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?auto=format&fit=crop&w=800&q=80');

INSERT INTO public.products (name, slug, description, category_id, price, stock, image, featured, available, sunlight, watering, soil, difficulty) VALUES
 ('Eugenia','eugenia','An elegant ornamental shrub perfect for topiary, hedging and decorative landscaping. Glossy evergreen foliage.',(SELECT id FROM public.categories WHERE slug='decorative'),450,25,'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=900&q=80',true,true,'Full to Partial Sun','Weekly','Well-drained loam','Easy'),
 ('Ball Aralia','ball-aralia','Lush rounded foliage that brings a sculptural touch to indoor and patio spaces.',(SELECT id FROM public.categories WHERE slug='decorative'),650,15,'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=900&q=80',true,true,'Bright Indirect','Alternate Days','Rich potting mix','Medium'),
 ('Jaboticaba','jaboticaba','The Brazilian grape tree — sweet, aromatic fruits grow directly on the trunk. A true conversation piece.',(SELECT id FROM public.categories WHERE slug='fruit'),1800,8,'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?auto=format&fit=crop&w=900&q=80',true,true,'Full Sun','Weekly','Acidic, well-drained','Medium'),
 ('Rambutan','rambutan','Tropical fruit tree with sweet juicy arils, thrives in Kerala''s humid climate.',(SELECT id FROM public.categories WHERE slug='fruit'),1200,10,'https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?auto=format&fit=crop&w=900&q=80',false,true,'Full Sun','Alternate Days','Loamy, well-drained','Medium'),
 ('Jackfruit','jackfruit','Kerala''s beloved fruit tree — vigorous, generous and easy to grow.',(SELECT id FROM public.categories WHERE slug='fruit'),350,40,'https://images.unsplash.com/photo-1596458397260-255807e979de?auto=format&fit=crop&w=900&q=80',false,true,'Full Sun','Weekly','Deep sandy loam','Easy'),
 ('Mangosteen','mangosteen','The queen of fruits — delicate, fragrant and prized. Needs shade and patience.',(SELECT id FROM public.categories WHERE slug='fruit'),2200,5,'https://images.unsplash.com/photo-1597714026720-8f74c62310ba?auto=format&fit=crop&w=900&q=80',false,true,'Partial Sun','Daily','Rich organic soil','Hard');

-- ATOMIC ORDER PLACEMENT (server-side, service role only)
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

  -- lock products and validate
  FOR r IN
    SELECT ci.quantity, p.id AS pid, p.name, p.price, p.stock, p.available
    FROM public.cart_items ci JOIN public.products p ON p.id = ci.product_id
    WHERE ci.cart_id = v_cart_id
    ORDER BY p.id
    FOR UPDATE OF p
  LOOP
    IF NOT r.available THEN RAISE EXCEPTION 'UNAVAILABLE: %', r.name; END IF;
    IF r.quantity <= 0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
    IF r.stock < r.quantity THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK: %', r.name; END IF;
    v_subtotal := v_subtotal + (r.price * r.quantity);
  END LOOP;

  v_number := 'CG-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));

  INSERT INTO public.orders (order_number, customer_id, customer_name, email, phone, address, locality, city, state, pincode, delivery_instructions, subtotal, delivery_charge, total)
  VALUES (v_number, _user_id, _customer_name, _email, _phone, _address, _locality, _city, _state, _pincode, _instructions, v_subtotal, _delivery_charge, v_subtotal + _delivery_charge)
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_id, product_name, quantity, unit_price, line_total)
  SELECT v_order_id, p.id, p.name, ci.quantity, p.price, p.price * ci.quantity
  FROM public.cart_items ci JOIN public.products p ON p.id = ci.product_id
  WHERE ci.cart_id = v_cart_id;

  RETURN QUERY SELECT v_order_id, v_number, v_subtotal, _delivery_charge, v_subtotal + _delivery_charge;
END; $$;
REVOKE ALL ON FUNCTION public.place_order(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,NUMERIC) TO service_role;

-- IDEMPOTENT PAYMENT CONFIRMATION
CREATE OR REPLACE FUNCTION public.confirm_order_payment(_razorpay_order_id TEXT, _razorpay_payment_id TEXT)
RETURNS TABLE (order_id UUID, already_processed BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o RECORD; r RECORD;
BEGIN
  SELECT * INTO o FROM public.orders WHERE razorpay_order_id = _razorpay_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF o.stock_applied THEN RETURN QUERY SELECT o.id, true; RETURN; END IF;

  FOR r IN SELECT oi.product_id, oi.quantity, oi.product_name FROM public.order_items oi
           WHERE oi.order_id = o.id AND oi.product_id IS NOT NULL ORDER BY oi.product_id
  LOOP
    UPDATE public.products SET stock = stock - r.quantity
    WHERE id = r.product_id AND stock >= r.quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK: %', r.product_name; END IF;
  END LOOP;

  UPDATE public.orders
  SET payment_status = 'paid', order_status = 'confirmed',
      razorpay_payment_id = COALESCE(_razorpay_payment_id, razorpay_payment_id),
      stock_applied = true
  WHERE id = o.id;

  DELETE FROM public.cart_items WHERE cart_id IN (SELECT id FROM public.carts WHERE user_id = o.customer_id);

  RETURN QUERY SELECT o.id, false;
END; $$;
REVOKE ALL ON FUNCTION public.confirm_order_payment(TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_order_payment(TEXT,TEXT) TO service_role;
