/*
# Prevent admin role on signup

## Problem
The `prevent_privilege_escalation` trigger only fires BEFORE UPDATE,
not BEFORE INSERT. So a user could sign up with role='admin' in their
auth metadata, and `handle_new_user` would insert a profile with
role='admin' — bypassing the privilege escalation guard.

## Fix
Modify `handle_new_user` to force the role to 'buyer' if the metadata
contains 'admin'. Admin accounts must be created/assigned by an
existing admin, never through public signup.
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  requested_role text;
BEGIN
  requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'buyer');

  -- Never allow admin role on public signup
  IF requested_role = 'admin' THEN
    requested_role := 'buyer';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    requested_role,
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$;