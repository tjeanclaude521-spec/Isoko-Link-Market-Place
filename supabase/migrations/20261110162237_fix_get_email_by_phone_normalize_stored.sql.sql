-- Fix: get_email_by_phone normalized the input phone but did not apply the same
-- normalization to the stored phone column before comparing. A profile stored as
-- "0783286211" (local format) would never match an input of "+250783286211"
-- (international format) even though they are the same number. This caused phone
-- login to fail for users whose profile phone was stored in local 0XXXXXXXXX format.
--
-- The fix normalizes BOTH sides to the same canonical 250XXXXXXXXX format before
-- comparison, then prefers the @isoko.link phone-signup email, falling back to the
-- most recently created matching profile.

CREATE OR REPLACE FUNCTION public.get_email_by_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Prefer the deterministic phone-generated email (phone signup account).
  -- Normalize stored phone the same way: strip non-digits, convert 0X -> 250X.
  SELECT email INTO result_email
  FROM public.profiles
  WHERE (
    CASE
      WHEN regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') LIKE '0%'
        THEN '250' || substring(regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') from 2)
      ELSE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g')
    END
  ) = normalized_input
  AND email = normalized_input || '@isoko.link'
  LIMIT 1;

  IF result_email IS NOT NULL THEN
    RETURN result_email;
  END IF;

  -- Fall back to the most recently created profile with that phone
  SELECT email INTO result_email
  FROM public.profiles
  WHERE (
    CASE
      WHEN regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') LIKE '0%'
        THEN '250' || substring(regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') from 2)
      ELSE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g')
    END
  ) = normalized_input
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN result_email;
END;
$function$;

-- Keep the function callable only by service_role (used by the auth-gateway edge function)
REVOKE EXECUTE ON FUNCTION public.get_email_by_phone(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_phone(text) TO service_role;
