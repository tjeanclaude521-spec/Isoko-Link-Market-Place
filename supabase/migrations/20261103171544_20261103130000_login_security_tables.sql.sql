/*
# Login security tables

1. New Tables
- login_attempts: hashed counters and cooldown timers per account+IP, per account, and per IP. Stores no raw emails, phone numbers, or IP addresses.
- security_events: log of suspicious login activity for administrator review. Stores hashed account and IP keys only.

2. Security
- RLS enabled on both new tables with no policies.
- No access for anon or authenticated roles; only the service role (server-side functions) can read or write.
- Revokes anonymous access to audit_logs (existing admin policies unchanged).

3. Important notes
- Idempotent: safe to re-run.
- No existing data is modified.
*/

CREATE TABLE IF NOT EXISTS public.login_attempts (
  scope_key text PRIMARY KEY,
  scope text NOT NULL CHECK (scope IN ('account_ip', 'account', 'ip')),
  failed_count integer NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  strikes integer NOT NULL DEFAULT 0 CHECK (strikes >= 0),
  locked_until timestamptz,
  last_failed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_attempts_locked_until_idx ON public.login_attempts (locked_until);

CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  account_key text,
  ip_key text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS security_events_created_idx ON public.security_events (created_at DESC);
CREATE INDEX IF NOT EXISTS security_events_account_idx ON public.security_events (account_key);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.login_attempts FROM anon, authenticated;
REVOKE ALL ON public.security_events FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.login_attempts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_events TO service_role;

REVOKE ALL ON public.audit_logs FROM anon;
