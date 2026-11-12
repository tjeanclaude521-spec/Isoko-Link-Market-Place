/*
# Harden product image uploads

1. Storage configuration
- Keep the existing public `images` bucket so buyer-facing product photos remain readable.
- Set a 5 MB server-side file size limit.
- Restrict stored uploads to JPEG and WebP, the two formats produced by the existing image compressor.

2. Security
- This migration does not change ownership policies or expose credentials.
- Existing `storage.objects` policies continue to require authenticated users, user-owned folders, image MIME metadata, and the existing 5 MB policy check.

3. Data safety
- No tables, product records, or existing storage objects are deleted or modified.
*/

UPDATE storage.buckets
SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/webp']::text[]
WHERE id = 'images';
