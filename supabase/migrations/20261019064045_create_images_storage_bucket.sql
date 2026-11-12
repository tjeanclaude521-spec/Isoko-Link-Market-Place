/*
# Image upload storage bucket

## Purpose
Create a public-readable, user-scoped storage bucket for user-uploaded
images (product photos, seller profile photos). Replaces the previous
URL-paste inputs with real file uploads from the user's device.

## Changes
1. Create `images` storage bucket (public = true so uploaded images
   are readable via a public URL without signed URLs).
2. RLS policies on storage.objects:
   - SELECT (read): public — anyone can view images (anon + authenticated).
   - INSERT: authenticated users can upload only into a folder named
     after their own auth.uid() (e.g. `images/<uid>/...`).
   - UPDATE: a user can only update/replace their own files.
   - DELETE: a user can only delete their own files.
3. A helper function `public_image_url(bucket, path)` is NOT needed —
   the supabase-js client provides `getPublicUrl()`.

## Security
- Uploads are restricted to each user's own folder via `auth.uid()`
  path check, so a user cannot write into another user's folder.
- Reads are public because product/profile images must display to all
  buyers (including unauthenticated visitors).
- Deletes and updates are owner-only.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- SELECT: anyone can read images
DROP POLICY IF EXISTS "images_public_read" ON storage.objects;
CREATE POLICY "images_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'images');

-- INSERT: authenticated user can upload into their own folder
DROP POLICY IF EXISTS "images_insert_own" ON storage.objects;
CREATE POLICY "images_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: owner can replace their own files
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

-- DELETE: owner can delete their own files
DROP POLICY IF EXISTS "images_delete_own" ON storage.objects;
CREATE POLICY "images_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
