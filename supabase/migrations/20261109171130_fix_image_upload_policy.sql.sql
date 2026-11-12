/*
# Fix image upload failures

The images_insert_own and images_update_own policies required
metadata->>'mimetype' and metadata->>'size' to be present. Supabase
storage does not always populate these fields reliably when the client
passes explicit metadata, causing uploads to be rejected silently.

The bucket itself already enforces allowed_mime_types and
file_size_limit server-side, so the metadata checks are redundant.
Remove them so uploads succeed as long as the user is authenticated
and uploading to their own folder.
*/

DROP POLICY IF EXISTS "images_insert_own" ON storage.objects;
CREATE POLICY "images_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "images_update_own" ON storage.objects;
CREATE POLICY "images_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
