/*
# Dashboard Security Hardening + Reports/Complaints Table

## Security Changes

### 1. Admin UPDATE policy on profiles
- Adds `profiles_admin_update` policy so admins can update any profile
  (needed for verify/unverify and role management).
- Previously admins could not update other users' profiles — the verify
  buttons in the admin dashboard were silently failing.

### 2. Privilege escalation prevention trigger
- Creates a BEFORE UPDATE trigger on `profiles` that blocks:
  - Setting `role` to 'admin' unless the caller is already an admin.
  - Changing `verified` unless the caller is an admin.
- This prevents users from self-promoting to admin or self-verifying
  through the data API, even though they can update their own profile row.
- Non-admin users can still change their role between 'buyer' and 'farmer'
  (not a security concern).

### 3. Reports table
- New `reports` table for user-submitted complaints about products or users.
- RLS: users see their own reports; admins see all; only admins can
  update/resolve reports.

## Important Notes
1. The trigger uses `auth.uid()` to identify the caller — this works
   inside RLS-aware triggers because the data API sets the session.
2. The admin UPDATE policy uses the same admin-check subquery pattern
   as existing policies.
3. No existing data is modified or deleted.
*/

-- 1. Admin UPDATE policy on profiles
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
CREATE POLICY "profiles_admin_update" ON profiles FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- 2. Privilege escalation prevention trigger
CREATE OR REPLACE FUNCTION prevent_unauthorized_privilege_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin') INTO is_admin;

  -- Block escalation TO admin unless caller is admin
  IF NEW.role = 'admin' AND OLD.role <> 'admin' AND NOT is_admin THEN
    RAISE EXCEPTION 'Not authorized to set admin role';
  END IF;

  -- Block verification changes unless caller is admin
  IF NEW.verified IS DISTINCT FROM OLD.verified AND NOT is_admin THEN
    RAISE EXCEPTION 'Not authorized to change verification status';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_privilege_escalation ON profiles;
CREATE TRIGGER prevent_privilege_escalation
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_unauthorized_privilege_change();

-- 3. Reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reported_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  reason text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  admin_notes text NOT NULL DEFAULT '',
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_owner_read" ON reports;
CREATE POLICY "reports_owner_read" ON reports FOR SELECT
TO authenticated
USING (reporter_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "reports_owner_insert" ON reports;
CREATE POLICY "reports_owner_insert" ON reports FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "reports_admin_update" ON reports;
CREATE POLICY "reports_admin_update" ON reports FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "reports_admin_delete" ON reports;
CREATE POLICY "reports_admin_delete" ON reports FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);