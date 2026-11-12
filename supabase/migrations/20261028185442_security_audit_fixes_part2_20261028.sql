-- ============================================================================
-- Security Audit Fixes Part 2 — Revoke EXECUTE from PUBLIC
-- The initial REVOKE from anon/authenticated had no effect because both roles
-- inherit EXECUTE from PUBLIC (the default grant). Must revoke from PUBLIC
-- and then re-grant only to the roles that need it.
-- ============================================================================

-- 4. generate_reference: revoke from PUBLIC, grant only to service_role
REVOKE EXECUTE ON FUNCTION public.generate_reference(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_reference(text) TO service_role;

-- 5. get_email_by_phone: keep callable by anon and authenticated (login flow)
--    No PUBLIC revoke needed here — the function must remain callable by anon
--    for phone-based sign-in. Input validation already added in part 1.
GRANT EXECUTE ON FUNCTION public.get_email_by_phone(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_phone(text) TO authenticated;

-- 6. handle_new_user: revoke from PUBLIC (trigger only, not a public RPC)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- 7. prevent_unauthorized_privilege_change: revoke from PUBLIC (trigger only)
REVOKE EXECUTE ON FUNCTION public.prevent_unauthorized_privilege_change() FROM PUBLIC;

-- 8. publish_product: revoke from PUBLIC, grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.publish_product(
  text, text, numeric, text, numeric, uuid, text, text, text, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_product(
  text, text, numeric, text, numeric, uuid, text, text, text, text, text, text
) TO authenticated;

-- validate_rwanda_phone and validate_profile_phone_trigger are NOT SECURITY DEFINER
-- so they are safe to leave callable. validate_rwanda_phone is a pure validation
-- utility used by the app. validate_profile_phone_trigger is a trigger function.
-- Revoke the trigger function from PUBLIC to prevent direct RPC calls.
REVOKE EXECUTE ON FUNCTION public.validate_profile_phone_trigger() FROM PUBLIC;
