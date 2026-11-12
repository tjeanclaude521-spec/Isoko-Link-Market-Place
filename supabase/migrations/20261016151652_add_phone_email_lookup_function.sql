/*
# Add phone-to-email lookup function for phone sign-in

## Purpose
The phone sign-in flow needs to find a user's email from their phone number
before they are authenticated (so we can call signInWithPassword with email).
The profiles table has RLS that blocks anon reads, so a SECURITY DEFINER
function is the safe way to expose only the email for a given phone number.

## Changes
1. New function: `get_email_by_phone(phone text)` — returns the email for a
   profile matching the given phone, or NULL if no match. SECURITY DEFINER so
   it bypasses RLS, but it only returns the email column — no other data.
2. Grant EXECUTE to anon and authenticated so the sign-in flow can call it.

## Security
- The function is SECURITY DEFINER (runs as the table owner, bypassing RLS).
- It only returns the email text — no IDs, names, roles, or other fields.
- This is safe because the email is needed for Supabase password auth and
  is not sensitive on its own (the password is still required to sign in).
*/

CREATE OR REPLACE FUNCTION public.get_email_by_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT email FROM profiles WHERE phone = p_phone LIMIT 1;
  RETURN FOUND email;
END;
$$;

-- Actually use a simpler SQL function body for the return
CREATE OR REPLACE FUNCTION public.get_email_by_phone(p_phone text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM profiles WHERE phone = p_phone LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_phone(text) TO anon, authenticated;
