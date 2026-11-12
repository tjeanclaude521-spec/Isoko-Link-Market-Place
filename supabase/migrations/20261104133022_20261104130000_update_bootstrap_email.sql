/*
# Update first-admin bootstrap email

1. What changes
- Updates the single admin_bootstrap row's allowed_email from admin@isokolinkmarketplace.rw to adminisokomarketplace@gmail.com.
- The bootstrap remains pending and one-time; no other fields change.

2. Security
- Only the service_role can reach this table (RLS enabled, no client grants).
- No existing users, products, or QA accounts are affected.
*/

UPDATE public.admin_bootstrap
SET allowed_email = 'adminisokomarketplace@gmail.com'
WHERE id = true AND status = 'pending';
