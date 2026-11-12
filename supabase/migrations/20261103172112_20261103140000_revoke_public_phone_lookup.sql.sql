/*
# Revoke public phone-to-email lookup

1. Changes
- The get_email_by_phone function can no longer be called by anonymous or signed-in browser clients.

2. Security
- Only the server-side sign-in and recovery functions (service role) can use the lookup.
- Closes the issue where anyone could find the email linked to a phone number.

3. Important notes
- Phone login and password recovery now run through the server-side gateway, so they keep working.
- Idempotent: safe to re-run.
*/

REVOKE EXECUTE ON FUNCTION public.get_email_by_phone(text) FROM PUBLIC, anon, authenticated;
