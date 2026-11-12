/*
# Require verified two-step sign-in for admin database access

1. What changes
- Adds a helper that returns true only when the signed-in user is an admin AND their session has passed the authenticator-app check (aal2).
- Every row-level security policy that previously checked only the admin role now calls this helper instead. Names, roles, and commands of the policies are unchanged.

2. Security
- Ordinary buyer and seller policies are not modified.
- The helper is not callable by anonymous users.
- Admin users without a verified second factor lose direct admin writes and reads until they verify.

3. Notes
- Policies are altered in place, so no data is moved or deleted.
*/

CREATE OR REPLACE FUNCTION public.is_admin_mfa()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    AND EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin_mfa() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_mfa() TO authenticated;

DO $$
DECLARE
  r record;
  clause text;
  new_qual text;
  new_check text;
BEGIN
  FOR r IN
    SELECT tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual ~ 'role = ''admin''' OR with_check ~ 'role = ''admin''')
  LOOP
    new_qual := CASE WHEN r.qual IS NULL THEN NULL ELSE regexp_replace(r.qual, 'EXISTS \(\s*SELECT 1\s+FROM profiles p\s+WHERE \(\(p\.id = auth\.uid\(\)\) AND \(p\.role = ''admin''::text\)\)\)', 'public.is_admin_mfa()', 'g') END;
    new_check := CASE WHEN r.with_check IS NULL THEN NULL ELSE regexp_replace(r.with_check, 'EXISTS \(\s*SELECT 1\s+FROM profiles p\s+WHERE \(\(p\.id = auth\.uid\(\)\) AND \(p\.role = ''admin''::text\)\)\)', 'public.is_admin_mfa()', 'g') END;
    clause := '';
    IF new_qual IS NOT NULL THEN clause := clause || format(' USING (%s)', new_qual); END IF;
    IF new_check IS NOT NULL THEN clause := clause || format(' WITH CHECK (%s)', new_check); END IF;
    EXECUTE format('ALTER POLICY %I ON public.%I%s', r.policyname, r.tablename, clause);
  END LOOP;
END $$;
