-- Allow PNG uploads in the images bucket. Some browsers produce PNG output
-- from canvas.toBlob even when WebP is requested, and transparent PNGs are
-- also valid profile/product images.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'images';
