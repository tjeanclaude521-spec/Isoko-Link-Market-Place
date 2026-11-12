/*
# Allow the protected bootstrap to verify its own first admin

1. Modified function
- Updates `prevent_unauthorized_privilege_change` so the internal, authenticated, MFA-verified bootstrap claim can set both the admin role and verified flag in one controlled transaction.

2. Security
- The exception applies only when `claim_admin_bootstrap()` has set its transaction-local marker.
- Direct profile updates, ordinary signups, QA accounts, and all existing admin checks remain protected.
- No data is deleted or changed by this migration.
*/

CREATE OR REPLACE FUNCTION public.prevent_unauthorized_privilege_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  is_bootstrap_claim boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) INTO is_admin;

  is_bootstrap_claim := current_setting('app.admin_bootstrap_claim', true) = 'true';

  IF NEW.role = 'admin' AND OLD.role <> 'admin' AND NOT is_admin AND NOT is_bootstrap_claim THEN
    RAISE EXCEPTION 'Not authorized to set admin role';
  END IF;

  IF NEW.verified IS DISTINCT FROM OLD.verified AND NOT is_admin AND NOT is_bootstrap_claim THEN
    RAISE EXCEPTION 'Not authorized to change verification status';
  END IF;

  RETURN NEW;
END;
$$;
