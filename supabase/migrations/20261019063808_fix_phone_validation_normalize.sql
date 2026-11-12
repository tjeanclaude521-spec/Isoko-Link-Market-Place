/*
# Fix phone validation mismatch between frontend and database

## Problem
The database function `validate_rwanda_phone()` checks phone numbers
against regex patterns that only accept specific spaced formats
(e.g. `+250 XXX XXX XXX`). The frontend `isValidRwandaPhone()` strips
spaces and dashes before checking, so it accepts formats like
`+250 78 812 3456` that the database rejects.

When a farmer signs up, `handle_new_user` inserts the profile with the
phone from the registration form. The `trg_validate_profile_phone`
trigger then calls `validate_rwanda_phone()` — which rejects numbers
the frontend considered valid — and the entire INSERT fails, aborting
the signup. The user sees a generic auth error with no indication that
the phone format was the cause.

## Fix
Recreate `validate_rwanda_phone()` to normalize the input (strip all
non-digit characters except the leading `+`) before applying the regex,
matching the frontend's behavior. This ensures any valid Rwanda phone
format accepted by the frontend is also accepted by the database.

## Changes
1. Recreate `validate_rwanda_phone()` with normalization.
2. No schema or policy changes.
*/

CREATE OR REPLACE FUNCTION public.validate_rwanda_phone(p_phone text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  WITH normalized AS (
    SELECT
      CASE
        WHEN p_phone IS NULL OR p_phone = '' THEN ''
        WHEN trim(p_phone) LIKE '+%' THEN '+' || regexp_replace(trim(p_phone), '[^0-9]', '', 'g')
        ELSE regexp_replace(trim(p_phone), '[^0-9]', '', 'g')
      END AS num
  )
  SELECT
    CASE
      WHEN num ~ '^\+250[0-9]{9}$' THEN true
      WHEN num ~ '^0[0-9]{9}$' THEN true
      WHEN num ~ '^250[0-9]{9}$' THEN true
      ELSE false
    END
  FROM normalized;
$$;
