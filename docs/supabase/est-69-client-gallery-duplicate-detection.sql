-- EST-69 Client Gallery Duplicate Detection
--
-- Stores a SHA-256 hash of each original client-gallery upload. The gallery
-- uploader uses the hash as the primary duplicate check and falls back to
-- normalized filename + original size + MIME type for older rows.
--
-- Safe to run more than once.

alter table public.client_gallery_images
add column if not exists original_sha256 text;

drop index if exists public.client_gallery_images_gallery_sha_idx;

create unique index if not exists client_gallery_images_gallery_sha_idx
on public.client_gallery_images (gallery_id, original_sha256)
where original_sha256 is not null;
