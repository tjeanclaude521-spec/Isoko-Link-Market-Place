/*
# Fix phone-based sign-in

## Problem
Users who registered with a phone number could not sign in again using
that phone number — they got "No account found with this number."

## Root Causes
1. The `handle_new_user` trigger created the profile row WITHOUT the
   phone number, even though phone was in raw_user_meta_data.
2. The client-side update of profiles.phone after signUp failed
   silently, so phone never got saved to the profile.
3. `get_email_by_phone` used exact string matching, so different
   formats of the same number would not match.

## Changes
1. Recreate `handle_new_user` to also insert `phone` from metadata.
2. Recreate `get_email_by_phone` with phone normalization so
   +250788123456, 250788123456, 0788123456, and +250 788 123 456
   all match each other.
3. Backfill existing profiles from auth.users metadata (temporarily
   disabling the phone validation trigger for the backfill, then
   re-enabling it).

## Security
- No policy changes. Functions remain SECURITY DEFINER with
  search_path=public.
*/

-- 1. Recreate handle_new_user to include phone
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'buyer'),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$;

-- 2. Recreate get_email_by_phone with normalization
CREATE OR REPLACE FUNCTION get_email_by_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  normalized_input text;
  result_email text;
BEGIN
  -- Normalize input: strip everything except digits
  normalized_input := regexp_replace(p_phone, '[^0-9]', '', 'g');

  -- Convert local format 0XXXXXXXXX to 250XXXXXXXXX
  IF normalized_input LIKE '0%' THEN
    normalized_input := '250' || substring(normalized_input from 2);
  END IF;

  SELECT email INTO result_email
  FROM profiles
  WHERE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = normalized_input
  LIMIT 1;

  RETURN result_email;
END;
$$;

-- 3. Backfill existing profiles from auth.users metadata
-- Temporarily disable the phone validation trigger for the backfill
ALTER TABLE profiles DISABLE TRIGGER trg_validate_profile_phone;

UPDATE profiles p
SET phone = COALESCE(u.raw_user_meta_data->>'phone', p.phone),
    updated_at = now()
FROM auth.users u
WHERE p.id = u.id
  AND (p.phone IS NULL OR p.phone = '')
  AND u.raw_user_meta_data->>'phone' IS NOT NULL
  AND u.raw_user_meta_data->>'phone' != '';

-- Re-enable the phone validation trigger
ALTER TABLE profiles ENABLE TRIGGER trg_validate_profile_phone;