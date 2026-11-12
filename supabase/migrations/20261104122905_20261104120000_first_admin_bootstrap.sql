/*
# Create secure one-time first-admin bootstrap

1. New table
- `admin_bootstrap` stores exactly one bootstrap record for the approved email.
- `id` is a fixed singleton key so a second bootstrap record cannot be added.
- `allowed_email` is the canonical email permitted to claim the setup.
- `status` tracks whether the invitation has been sent or the bootstrap has been consumed.
- `invited_user_id`, `invited_at`, `claimed_user_id`, and `claimed_at` record lifecycle metadata without storing passwords or tokens.

2. New function
- `claim_admin_bootstrap()` atomically consumes the pending bootstrap and promotes only the authenticated caller.
- The caller must have a confirmed email matching the approved email, must have aal2 authenticator verification, and must not already be an administrator.

3. Security
- RLS is enabled with no client table grants or policies; the table is server-only.
- The claim function is SECURITY DEFINER, has a fixed search path, and is callable only by authenticated users.
- The privilege-protection trigger permits an admin role transition only during this function's internal transaction marker.
- The bootstrap cannot be claimed twice and does not alter existing users, products, QA accounts, or marketplace records.

4. Important notes
- The invitation email is sent by a server-side Edge Function, never by frontend code.
- The database claim is the final authority and re-checks email, confirmation, MFA assurance, and single-use status at claim time.
- The approved address is `admin@isokolinkmarketplace.rw`.
*/

CREATE TABLE IF NOT EXISTS public.admin_bootstrap (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  allowed_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'claimed')),
  invited_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at timestamptz,
  claimed_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  CONSTRAINT admin_bootstrap_allowed_email_lower CHECK (allowed_email = lower(trim(allowed_email)))
);

ALTER TABLE public.admin_bootstrap ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_bootstrap FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_bootstrap TO service_role;

INSERT INTO public.admin_bootstrap (id, allowed_email)
VALUES (true, 'admin@isokolinkmarketplace.rw')
ON CONFLICT (id) DO NOTHING;

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

  IF NEW.verified IS DISTINCT FROM OLD.verified AND NOT is_admin THEN
    RAISE EXCEPTION 'Not authorized to change verification status';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_admin_bootstrap()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_id uuid := auth.uid();
  caller_email text;
  claimed_id boolean;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' THEN
    RAISE EXCEPTION 'Authenticator verification required';
  END IF;

  SELECT lower(trim(u.email))
  INTO caller_email
  FROM auth.users u
  WHERE u.id = caller_id
    AND u.email_confirmed_at IS NOT NULL;

  IF caller_email IS NULL THEN
    RAISE EXCEPTION 'Confirmed email required';
  END IF;

  UPDATE public.admin_bootstrap b
  SET status = 'claimed', claimed_user_id = caller_id, claimed_at = now()
  WHERE b.id = true
    AND b.status = 'invited'
    AND b.allowed_email = caller_email
  RETURNING b.id INTO claimed_id;

  IF claimed_id IS NULL THEN
    RAISE EXCEPTION 'Bootstrap is unavailable';
  END IF;

  PERFORM set_config('app.admin_bootstrap_claim', 'true', true);
  UPDATE public.profiles
  SET role = 'admin', verified = true, updated_at = now()
  WHERE id = caller_id AND role <> 'admin';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile is unavailable';
  END IF;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_admin_bootstrap() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin_bootstrap() TO authenticated;
