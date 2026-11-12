-- Fix: get_email_by_phone could return the wrong email when multiple profiles
-- share the same phone number (e.g. one signed up with phone -> 0783286211@isoko.link,
-- another updated their phone to the same number). The old LIMIT 1 with no ORDER BY
-- returned an arbitrary row, causing the auth-gateway to attempt signInWithPassword
-- against the wrong auth account — the password would not match and login failed.
--
-- The fix: prefer the profile whose email matches the deterministic phone-generated
-- pattern (<digits>@isoko.link), since that is the account created via phone signup
-- and the one phone-login should target. If none exists, prefer the most recently
-- created profile with that phone number.

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

  -- Prefer the deterministic phone-generated email (phone signup account)
  SELECT email INTO result_email
  FROM public.profiles
  WHERE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = normalized_input
    AND email = normalized_input || '@isoko.link'
  LIMIT 1;

  IF result_email IS NOT NULL THEN
    RETURN result_email;
  END IF;

  -- Fall back to the most recently created profile with that phone
  SELECT email INTO result_email
  FROM public.profiles
  WHERE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = normalized_input
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN result_email;
END;
$function$;

-- Keep the function callable only by service_role (used by the auth-gateway edge function)
REVOKE EXECUTE ON FUNCTION public.get_email_by_phone(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_phone(text) TO service_role;
