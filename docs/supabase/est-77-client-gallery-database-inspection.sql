-- EST-77 Client Gallery Database Migration and Cleanup
-- Safe inspection SQL only.
-- Do not drop old tables as part of EST-77.

-- 1. Check whether old gallery tables still exist.
select
  table_name,
  case
    when table_name in ('galleries', 'gallery_photos', 'gallery_access') then 'legacy / deprecated'
    when table_name in ('client_galleries', 'client_gallery_sections', 'client_gallery_images') then 'current source of truth'
    else 'other'
  end as est77_status
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'galleries',
    'gallery_photos',
    'gallery_access',
    'client_galleries',
    'client_gallery_sections',
    'client_gallery_images'
  )
order by table_name;

-- 2. Confirm current client gallery records.
select
  id,
  title,
  slug,
  status,
  created_at
from public.client_galleries
order by created_at desc;

-- 3. Confirm current client gallery sections.
select
  cgs.id,
  cg.title as gallery_title,
  cg.slug as gallery_slug,
  cgs.title as section_title,
  cgs.display_order,
  cgs.is_visible
from public.client_gallery_sections cgs
left join public.client_galleries cg on cg.id = cgs.gallery_id
order by cg.created_at desc, cgs.display_order asc;

-- 4. Confirm current client gallery image relationships.
select
  cgi.id,
  cg.title as gallery_title,
  cg.slug as gallery_slug,
  cgs.title as section_title,
  cgi.file_name,
  cgi.display_order,
  cgi.original_path,
  cgi.display_path,
  cgi.thumbnail_path
from public.client_gallery_images cgi
left join public.client_galleries cg on cg.id = cgi.gallery_id
left join public.client_gallery_sections cgs on cgs.id = cgi.section_id
order by cg.created_at desc, cgs.display_order asc, cgi.display_order asc;

-- 5. Optional legacy row checks.
-- Run these only if the old tables exist in the result from section 1.

-- select count(*) as galleries_count from public.galleries;
-- select count(*) as gallery_photos_count from public.gallery_photos;
-- select count(*) as gallery_access_count from public.gallery_access;

-- 6. Future cleanup only.
-- Do not run these as part of EST-77 without manual approval and a backup.

-- drop table if exists public.gallery_access;
-- drop table if exists public.gallery_photos;
-- drop table if exists public.galleries;
