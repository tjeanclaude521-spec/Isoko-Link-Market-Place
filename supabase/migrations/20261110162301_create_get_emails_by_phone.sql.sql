-- Create a function that returns ALL candidate auth emails for a given phone number.
-- This replaces the single-return get_email_by_phone for the sign-in flow, because
-- multiple profiles may share the same physical phone number with different email
-- formats (e.g. 0783286211@isoko.link and 250783286211@isoko.link are two different
-- auth accounts for the same phone). The auth-gateway will try each candidate email
-- with signInWithPassword until one succeeds.

CREATE OR REPLACE FUNCTION public.get_emails_by_phone(p_phone text)
RETURNS TABLE(email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  normalized_input text;
BEGIN
  IF NOT public.validate_rwanda_phone(p_phone) THEN
    RETURN;
  END IF;

  normalized_input := regexp_replace(p_phone, '[^0-9]', '', 'g');
  IF normalized_input LIKE '0%' THEN
    normalized_input := '250' || substring(normalized_input from 2);
  END IF;

  RETURN QUERY
  SELECT p.email
  FROM public.profiles p
  WHERE (
    CASE
      WHEN regexp_replace(COALESCE(p.phone, ''), '[^0-9]', '', 'g') LIKE '0%'
        THEN '250' || substring(regexp_replace(COALESCE(p.phone, ''), '[^0-9]', '', 'g') from 2)
      ELSE regexp_replace(COALESCE(p.phone, ''), '[^0-9]', '', 'g')
    END
  ) = normalized_input
  AND p.email IS NOT NULL
  ORDER BY
    -- Prefer @isoko.link phone-signup accounts first
    (p.email LIKE '%@isoko.link') DESC,
    p.created_at DESC;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_emails_by_phone(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_emails_by_phone(text) TO service_role;
