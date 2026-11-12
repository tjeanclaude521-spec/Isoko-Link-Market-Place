-- ============================================================================
-- Security Audit Fixes — Isoko Link
-- Reversible migration addressing 8 Supabase security advisor findings
-- ============================================================================

-- 1. seller_profiles VIEW: SECURITY DEFINER -> security_invoker
--    The view exposes only public farmer columns (no email, no role, no village).
--    The profiles table has a `profiles_public_farmer_read` policy allowing
--    anon and authenticated to SELECT farmer rows. Switching to security_invoker
--    means the view enforces the caller's RLS on profiles, which is the correct
--    behavior — callers see exactly the farmer rows they're allowed to see.
ALTER VIEW public.seller_profiles SET (security_invoker = true);

-- 2. validate_rwanda_phone: set fixed search_path (SQL function, not SECURITY DEFINER)
DROP FUNCTION IF EXISTS public.validate_rwanda_phone(p_phone text);
CREATE FUNCTION public.validate_rwanda_phone(p_phone text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = 'public'
AS $$
WITH normalized AS (
  SELECT
    CASE
      WHEN p_phone IS NULL OR p_phone = '' THEN ''
      WHEN trim(p_phone) LIKE '+%' THEN '+' || regexp_replace(trim(p_phone), '[^0-9]', '', 'g')
      ELSE regexp_replace(trim(p_phone), '[^0-9]', '', 'g')
    END AS num
)
SELECT
  CASE
    WHEN num ~ '^\+250[0-9]{9}$' THEN true
    WHEN num ~ '^0[0-9]{9}$' THEN true
    WHEN num ~ '^250[0-9]{9}$' THEN true
    ELSE false
  END
FROM normalized;
$$;

-- 3. validate_profile_phone_trigger: set fixed search_path
--    Drop trigger first, then function, then recreate both
DROP TRIGGER IF EXISTS trg_validate_profile_phone ON public.profiles;
DROP FUNCTION IF EXISTS public.validate_profile_phone_trigger();
CREATE FUNCTION public.validate_profile_phone_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
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
CREATE TRIGGER trg_validate_profile_phone
  BEFORE INSERT OR UPDATE OF phone, role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_phone_trigger();

-- 4. generate_reference: revoke from anon and authenticated
--    Used internally by the application for enquiry references. Not called
--    directly from frontend RPC. Keep service_role access.
REVOKE EXECUTE ON FUNCTION public.generate_reference(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_reference(text) FROM authenticated;

-- 5. get_email_by_phone: harden with input validation, keep for login flow
--    The function is needed by the phone-based login flow (anon users).
--    Add Rwanda phone format validation to prevent blind enumeration with
--    arbitrary strings. Keep SECURITY DEFINER with fixed search_path so it
--    can query profiles regardless of caller's RLS.
DROP FUNCTION IF EXISTS public.get_email_by_phone(p_phone text);
CREATE FUNCTION public.get_email_by_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  normalized_input text;
  result_email text;
BEGIN
  -- Validate input is a plausible Rwanda phone number before querying
  IF NOT public.validate_rwanda_phone(p_phone) THEN
    RETURN NULL;
  END IF;

  -- Normalize input: strip everything except digits
  normalized_input := regexp_replace(p_phone, '[^0-9]', '', 'g');

  -- Convert local format 0XXXXXXXXX to 250XXXXXXXXX
  IF normalized_input LIKE '0%' THEN
    normalized_input := '250' || substring(normalized_input from 2);
  END IF;

  SELECT email INTO result_email
  FROM public.profiles
  WHERE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = normalized_input
  LIMIT 1;

  RETURN result_email;
END;
$$;
-- Keep anon and authenticated access (required for phone-based login flow)

-- 6. handle_new_user: revoke EXECUTE from anon and authenticated
--    This is a trigger function on auth.users, not a public RPC.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- 7. prevent_unauthorized_privilege_change: revoke EXECUTE from anon and authenticated
--    This is a trigger function on profiles, not a public RPC.
REVOKE EXECUTE ON FUNCTION public.prevent_unauthorized_privilege_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.prevent_unauthorized_privilege_change() FROM authenticated;

-- 8. publish_product: revoke EXECUTE from anon, keep authenticated
--    The function already validates auth.uid() internally and uses it as
--    farmer_id, preventing cross-user publishing. anon cannot call it.
REVOKE EXECUTE ON FUNCTION public.publish_product(
  text, text, numeric, text, numeric, uuid, text, text, text, text, text, text
) FROM anon;
