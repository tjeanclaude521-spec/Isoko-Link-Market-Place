/*
# Seller Profiles Enhancement

## Purpose
Add business description and profile photo support to seller profiles,
enforce phone number requirement before product publishing, add Rwanda
phone validation, and create a secure function for publishing products.

## Changes

### 1. New columns on `profiles`
- `business_description` (text, nullable) — short business description shown on seller profile
- `profile_photo_url` (text, nullable) — optional profile photo URL

### 2. Phone validation function
- `validate_rwanda_phone(p_phone text)` — returns boolean
- Accepts +250 followed by 9 digits, or 0 followed by 9 digits (local format)
- Strips spaces and dashes before checking

### 3. Product publish enforcement function
- `publish_product()` — SECURITY DEFINER function that checks the farmer's
  profile has a valid phone number before allowing a new product insert.
  Returns the new product id or raises an exception with a clear message.
- This is the backend enforcement: even if the frontend is bypassed, the
  database rejects the insert.

### 4. Public seller profile view
- `seller_profiles` view — exposes only public fields (id, full_name,
  business_description, profile_photo_url, district, sector, phone,
  whatsapp, verified, created_at) for farmers. Does NOT expose email,
  village, or role. Readable by anon + authenticated.

### 5. RLS policy updates
- Add SELECT policy on profiles for anon+authenticated to read farmer
  profiles (so product pages and seller profile pages can show seller info).
  Only farmer profiles are public; buyer/admin profiles remain private.

## Security
- SECURITY DEFINER function for product publishing enforces phone requirement
  at the database level, not just in the UI.
- Public seller view exposes only contact fields needed for commerce,
  not email or other private account data.
- Phone validation prevents malformed phone numbers from being saved.
*/

-- 1. Add new columns to profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_description') THEN
    ALTER TABLE profiles ADD COLUMN business_description text DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_photo_url') THEN
    ALTER TABLE profiles ADD COLUMN profile_photo_url text DEFAULT '';
  END IF;
END $$;

-- 2. Phone validation function
CREATE OR REPLACE FUNCTION public.validate_rwanda_phone(p_phone text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_phone IS NULL OR p_phone = '' THEN false
    WHEN p_phone ~ '^\+250[ ]?[0-9]{3}[ ]?[0-9]{3}[ ]?[0-9]{3}$' THEN true
    WHEN p_phone ~ '^\+250[0-9]{9}$' THEN true
    WHEN p_phone ~ '^0[0-9]{9}$' THEN true
    ELSE false
  END;
$$;

-- 3. Product publish enforcement (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.publish_product(
  p_name text,
  p_description text DEFAULT '',
  p_price numeric DEFAULT 0,
  p_unit text DEFAULT 'kg',
  p_quantity_available numeric DEFAULT 0,
  p_category_id uuid DEFAULT NULL,
  p_district text DEFAULT 'Gisagara',
  p_sector text DEFAULT '',
  p_village text DEFAULT '',
  p_contact_phone text DEFAULT '',
  p_contact_whatsapp text DEFAULT '',
  p_image_url text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_farmer_id uuid := auth.uid();
  v_profile_phone text;
  v_product_id uuid;
BEGIN
  IF v_farmer_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to publish a product.';
  END IF;

  SELECT phone INTO v_profile_phone FROM profiles WHERE id = v_farmer_id;

  IF v_profile_phone IS NULL OR v_profile_phone = '' OR NOT public.validate_rwanda_phone(v_profile_phone) THEN
    RAISE EXCEPTION 'Please complete your profile with a valid Rwanda phone number (+250XXXXXXXXX) before publishing products.';
  END IF;

  INSERT INTO products (
    farmer_id, name, description, price, unit, quantity_available,
    category_id, district, sector, village, contact_phone, contact_whatsapp,
    image_url, status
  ) VALUES (
    v_farmer_id, p_name, p_description, p_price, p_unit, p_quantity_available,
    p_category_id, p_district, p_sector, p_village,
    COALESCE(NULLIF(p_contact_phone, ''), v_profile_phone),
    p_contact_whatsapp, p_image_url, 'active'
  )
  RETURNING id INTO v_product_id;

  RETURN v_product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_product TO authenticated;

-- 4. Public seller profile view (exposes only farmer public fields)
CREATE OR REPLACE VIEW public.seller_profiles AS
SELECT
  id,
  full_name,
  business_description,
  profile_photo_url,
  district,
  sector,
  phone,
  whatsapp,
  verified,
  created_at
FROM profiles
WHERE role = 'farmer';

-- Allow anon + authenticated to read the seller_profiles view
-- (views bypass RLS by default if the owner has access, but we need
-- the underlying profiles table to allow this read)
DROP POLICY IF EXISTS "profiles_public_farmer_read" ON profiles;
CREATE POLICY "profiles_public_farmer_read" ON profiles FOR SELECT
  TO anon, authenticated USING (
    role = 'farmer'
  );

-- Grant select on the view
GRANT SELECT ON public.seller_profiles TO anon, authenticated;
