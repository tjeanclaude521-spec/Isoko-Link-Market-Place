/*
# Isoko Link Agricultural Marketplace Schema

## Overview
Full schema for the Isoko Link agricultural marketplace connecting farmers and buyers in Gisagara District, Rwanda. Includes user profiles with roles, product categories, listings, images, featured promotions, buyer enquiries, sales transactions, commission records, payment records, audit logs, and platform settings.

## Tables Created
1. profiles, 2. categories, 3. products, 4. product_images, 5. promotions, 6. enquiries, 7. sales, 8. payments, 9. audit_logs, 10. platform_settings

## Security
RLS enabled on all tables with role-based policies. Admin role checked via EXISTS subquery on profiles.
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  whatsapp text DEFAULT '',
  role text NOT NULL DEFAULT 'buyer' CHECK (role IN ('farmer', 'buyer', 'admin')),
  district text DEFAULT 'Gisagara',
  sector text DEFAULT '',
  village text DEFAULT '',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin" ON profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL UNIQUE,
  name_rw text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'Wheat',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_public_read" ON categories;
CREATE POLICY "categories_public_read" ON categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "categories_admin_write" ON categories;
CREATE POLICY "categories_admin_write" ON categories FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "categories_admin_update" ON categories;
CREATE POLICY "categories_admin_update" ON categories FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "categories_admin_delete" ON categories;
CREATE POLICY "categories_admin_delete" ON categories FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text DEFAULT '',
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  unit text NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'sack', 'basket', 'tonne', 'piece', 'litre', 'dozen')),
  quantity_available numeric(12,2) NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  district text NOT NULL DEFAULT 'Gisagara',
  sector text DEFAULT '',
  village text DEFAULT '',
  contact_phone text DEFAULT '',
  contact_whatsapp text DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'removed', 'rejected')),
  image_url text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_public_read" ON products;
CREATE POLICY "products_public_read" ON products FOR SELECT TO anon, authenticated USING (status IN ('active', 'paused'));
DROP POLICY IF EXISTS "products_farmer_or_admin_all" ON products;
CREATE POLICY "products_farmer_or_admin_all" ON products FOR SELECT TO authenticated USING (
  auth.uid() = farmer_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS "products_farmer_insert" ON products;
CREATE POLICY "products_farmer_insert" ON products FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = farmer_id AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('farmer', 'admin'))
);
DROP POLICY IF EXISTS "products_owner_update" ON products;
CREATE POLICY "products_owner_update" ON products FOR UPDATE TO authenticated USING (
  auth.uid() = farmer_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  auth.uid() = farmer_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS "products_owner_delete" ON products;
CREATE POLICY "products_owner_delete" ON products FOR DELETE TO authenticated USING (
  auth.uid() = farmer_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

CREATE INDEX IF NOT EXISTS idx_products_farmer_id ON products(farmer_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_district ON products(district);

-- PRODUCT_IMAGES
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_images_public_read" ON product_images;
CREATE POLICY "product_images_public_read" ON product_images FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "product_images_owner_insert" ON product_images;
CREATE POLICY "product_images_owner_insert" ON product_images FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM products WHERE products.id = product_id AND products.farmer_id = auth.uid())
);
DROP POLICY IF EXISTS "product_images_owner_update" ON product_images;
CREATE POLICY "product_images_owner_update" ON product_images FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM products WHERE products.id = product_id AND products.farmer_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM products WHERE products.id = product_id AND products.farmer_id = auth.uid())
);
DROP POLICY IF EXISTS "product_images_owner_delete" ON product_images;
CREATE POLICY "product_images_owner_delete" ON product_images FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM products WHERE products.id = product_id AND products.farmer_id = auth.uid())
);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

-- PROMOTIONS
CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  farmer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  duration_days int NOT NULL DEFAULT 7,
  start_date timestamptz,
  end_date timestamptz,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  payment_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promotions_owner_read" ON promotions;
CREATE POLICY "promotions_owner_read" ON promotions FOR SELECT TO authenticated USING (
  auth.uid() = farmer_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS "promotions_owner_insert" ON promotions;
CREATE POLICY "promotions_owner_insert" ON promotions FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = farmer_id AND EXISTS (SELECT 1 FROM products WHERE products.id = product_id AND products.farmer_id = auth.uid())
);
DROP POLICY IF EXISTS "promotions_admin_update" ON promotions;
CREATE POLICY "promotions_admin_update" ON promotions FOR UPDATE TO authenticated USING (
  auth.uid() = farmer_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  auth.uid() = farmer_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS "promotions_owner_delete" ON promotions;
CREATE POLICY "promotions_owner_delete" ON promotions FOR DELETE TO authenticated USING (
  auth.uid() = farmer_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE INDEX IF NOT EXISTS idx_promotions_farmer_id ON promotions(farmer_id);
CREATE INDEX IF NOT EXISTS idx_promotions_product_id ON promotions(product_id);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions(payment_status);

-- ENQUIRIES
CREATE TABLE IF NOT EXISTS enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  farmer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  buyer_name text NOT NULL DEFAULT '',
  buyer_phone text NOT NULL DEFAULT '',
  buyer_whatsapp text DEFAULT '',
  message text DEFAULT '',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "enquiries_owner_read" ON enquiries;
CREATE POLICY "enquiries_owner_read" ON enquiries FOR SELECT TO authenticated USING (
  auth.uid() = buyer_id OR auth.uid() = farmer_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS "enquiries_buyer_insert" ON enquiries;
CREATE POLICY "enquiries_buyer_insert" ON enquiries FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id OR buyer_id IS NULL);
DROP POLICY IF EXISTS "enquiries_owner_update" ON enquiries;
CREATE POLICY "enquiries_owner_update" ON enquiries FOR UPDATE TO authenticated USING (
  auth.uid() = buyer_id OR auth.uid() = farmer_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  auth.uid() = buyer_id OR auth.uid() = farmer_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE INDEX IF NOT EXISTS idx_enquiries_farmer_id ON enquiries(farmer_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_buyer_id ON enquiries(buyer_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_product_id ON enquiries(product_id);

-- SALES
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  farmer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  buyer_name text DEFAULT '',
  enquiry_id uuid REFERENCES enquiries(id) ON DELETE SET NULL,
  sale_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (sale_amount >= 0),
  quantity_sold numeric(12,2) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'kg',
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.0100 CHECK (commission_rate >= 0 AND commission_rate <= 1),
  commission_amount numeric(12,2) NOT NULL DEFAULT 0,
  seller_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'confirmed', 'disputed', 'cancelled', 'completed')),
  farmer_confirmed boolean NOT NULL DEFAULT false,
  buyer_confirmed boolean NOT NULL DEFAULT false,
  admin_notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  completed_at timestamptz
);
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_owner_or_admin_read" ON sales;
CREATE POLICY "sales_owner_or_admin_read" ON sales FOR SELECT TO authenticated USING (
  auth.uid() = farmer_id OR auth.uid() = buyer_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS "sales_farmer_insert" ON sales;
CREATE POLICY "sales_farmer_insert" ON sales FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = farmer_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS "sales_owner_or_admin_update" ON sales;
CREATE POLICY "sales_owner_or_admin_update" ON sales FOR UPDATE TO authenticated USING (
  auth.uid() = farmer_id OR auth.uid() = buyer_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  auth.uid() = farmer_id OR auth.uid() = buyer_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE INDEX IF NOT EXISTS idx_sales_farmer_id ON sales(farmer_id);
CREATE INDEX IF NOT EXISTS idx_sales_buyer_id ON sales(buyer_id);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('advertisement', 'commission', 'refund')),
  amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  payment_method text DEFAULT 'manual',
  transaction_ref text DEFAULT '',
  related_promotion_id uuid REFERENCES promotions(id) ON DELETE SET NULL,
  related_sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_owner_or_admin_read" ON payments;
CREATE POLICY "payments_owner_or_admin_read" ON payments FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS "payments_owner_insert" ON payments;
CREATE POLICY "payments_owner_insert" ON payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "payments_admin_update" ON payments;
CREATE POLICY "payments_admin_update" ON payments FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "payments_admin_delete" ON payments;
CREATE POLICY "payments_admin_delete" ON payments FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_purpose ON payments(purpose);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text DEFAULT '',
  entity_id uuid,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_admin_read" ON audit_logs;
CREATE POLICY "audit_logs_admin_read" ON audit_logs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS "audit_logs_admin_insert" ON audit_logs;
CREATE POLICY "audit_logs_admin_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);

-- PLATFORM SETTINGS
CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_price numeric(12,2) NOT NULL DEFAULT 1000.00,
  promotion_duration_days int NOT NULL DEFAULT 7,
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.0100 CHECK (commission_rate >= 0 AND commission_rate <= 1),
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_public_read" ON platform_settings;
CREATE POLICY "settings_public_read" ON platform_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "settings_admin_update" ON platform_settings;
CREATE POLICY "settings_admin_update" ON platform_settings FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "settings_admin_insert" ON platform_settings;
CREATE POLICY "settings_admin_insert" ON platform_settings FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- TRIGGER: Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'buyer')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- FUNCTION: Generate reference number
CREATE OR REPLACE FUNCTION public.generate_reference(prefix text DEFAULT 'ENQ')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  ref text;
BEGIN
  ref := prefix || '-' || to_char(now(), 'YYMMDD') || '-' || lpad(floor(random() * 100000)::text, 5, '0');
  RETURN ref;
END;
$$;

-- Seed data
INSERT INTO categories (name_en, name_rw, icon, sort_order)
VALUES
  ('Cereals', 'Amasaka', 'Wheat', 1),
  ('Legumes', 'Ibishinganyimbo', 'Bean', 2),
  ('Vegetables', 'Ibibondere', 'Salad', 3),
  ('Fruits', 'Ibinyombyo', 'Apple', 4),
  ('Tubers', 'Imyumbati', 'Carrot', 5),
  ('Cash Crops', 'Imyaka yamadovize', 'Coffee', 6),
  ('Other', 'Ibindi', 'Package', 7)
ON CONFLICT (name_en) DO NOTHING;

INSERT INTO platform_settings (promotion_price, promotion_duration_days, commission_rate)
SELECT 1000.00, 7, 0.0100
WHERE NOT EXISTS (SELECT 1 FROM platform_settings);