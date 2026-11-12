/*
# Server-side image upload validation via storage policy

## Problem
The 5 MB size limit and image-only MIME check existed only in the
browser. A direct API call could upload any file type/size.

## Fix
Tighten the storage.objects INSERT policy for the `images` bucket to
also require:
  - metadata.mimetype starts with 'image/'
  - (metadata.size::bigint) <= 5242880 (5 MB)

Supabase storage populates the metadata jsonb with mimetype and size
on upload, so these checks run server-side regardless of the client.

UPDATE is also tightened identically so replacement uploads are
validated too.
*/

-- INSERT: image-only, <= 5 MB, owner folder
DROP POLICY IF EXISTS "images_insert_own" ON storage.objects;
CREATE POLICY "images_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (metadata->>'mimetype') IS NOT NULL
    AND (metadata->>'mimetype') LIKE 'image/%'
    AND (metadata->>'size') IS NOT NULL
    AND (metadata->>'size')::bigint <= 5242880
  );

-- UPDATE: same validation on replacement uploads
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
    AND (metadata->>'mimetype') IS NOT NULL
    AND (metadata->>'mimetype') LIKE 'image/%'
    AND (metadata->>'size') IS NOT NULL
    AND (metadata->>'size')::bigint <= 5242880
  );