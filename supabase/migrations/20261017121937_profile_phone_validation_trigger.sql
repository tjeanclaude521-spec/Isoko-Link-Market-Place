/*
# Phone validation trigger for profiles

## Purpose
Enforce that phone numbers saved to profiles are valid Rwanda format (+250XXXXXXXXX or 0XXXXXXXXX)
at the database level via a trigger. This prevents bad data even if the frontend is bypassed.

## Changes
1. Create trigger function `validate_profile_phone()` that checks phone field on INSERT/UPDATE.
2. Attach it to profiles table BEFORE INSERT OR UPDATE OF phone.
*/

CREATE OR REPLACE FUNCTION public.validate_profile_phone_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role = 'farmer' AND (NEW.phone IS NOT NULL AND NEW.phone != '') THEN
    IF NOT public.validate_rwanda_phone(NEW.phone) THEN
      RAISE EXCEPTION 'Invalid Rwanda phone number format. Use +250XXXXXXXXX or 0XXXXXXXXX.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_profile_phone ON profiles;
CREATE TRIGGER trg_validate_profile_phone
  BEFORE INSERT OR UPDATE OF phone ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_phone_trigger();
