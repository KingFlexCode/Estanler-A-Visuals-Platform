-- EST-69 Client Gallery Duplicate Detection
--
-- Purpose:
-- Store a SHA-256 hash of the original uploaded file so the admin gallery
-- uploader can skip duplicate photos before uploading another copy.
--
-- This SQL is safe to run more than once.

alter table public.client_gallery_images
add column if not exists original_sha256 text;

create index if not exists client_gallery_images_gallery_sha_idx
on public.client_gallery_images (gallery_id, original_sha256)
where original_sha256 is not null;

-- Duplicate detection behavior in the app:
-- 1. Primary duplicate check: original_sha256
-- 2. Fallback duplicate check for older rows with no hash:
--    file_name + original_size_bytes + mime_type
-- 3. Duplicate files are skipped and shown as skipped in the upload progress panel.
