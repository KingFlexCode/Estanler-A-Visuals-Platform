# EST-77 Client Gallery Database Migration and Cleanup

## Purpose

EST-77 reviews the old gallery database structure and confirms the newer client gallery schema as the source of truth for current client gallery workflows.

This issue is intentionally conservative. It documents the migration state and avoids destructive database changes unless the old tables are confirmed unused in production data.

## Goal

Clean up the old gallery system and make the new client gallery schema the source of truth.

## Old gallery tables

These tables belong to the older gallery system and should be treated as legacy/deprecated unless a future audit proves they still contain required production data.

```txt
galleries
gallery_photos
gallery_access
```

### Decision

```txt
Status: Deprecated
Action for EST-77: Document and isolate
Do not delete automatically in this issue
```

The old tables should not be used by active admin pages or the public client gallery viewer. If they still exist in Supabase, they can remain temporarily for historical backup until production data is reviewed.

## New client gallery tables

These are the current source-of-truth tables for client gallery workflows.

```txt
client_galleries
client_gallery_sections
client_gallery_images
```

### client_galleries

Used for the main client gallery collection record.

Expected responsibilities:

```txt
1. Gallery title
2. Public URL slug
3. Client name
4. Client email
5. Event date
6. Description
7. Publish status
8. Cover image
9. Design settings
10. Access mode
11. Expiration setting
12. Download, favorite, and sharing controls
```

### client_gallery_sections

Used for gallery photo sets/sections.

Expected responsibilities:

```txt
1. Gallery relationship through gallery_id
2. Section title
3. Section slug
4. Display order
5. Visibility
```

### client_gallery_images

Used for all images uploaded into a client gallery.

Expected responsibilities:

```txt
1. Gallery relationship through gallery_id
2. Section relationship through section_id
3. File name and title metadata
4. Original image path
5. Display image path
6. Thumbnail image path
7. Display order
8. File size and dimensions
9. Cover/focal point support
```

## Current app dependency review

The current app uses the new client gallery schema in the active admin and public gallery flows.

### Admin dashboard

File:

```txt
src/pages/admin/Dashboard.jsx
```

Current behavior:

```txt
Dashboard counts client galleries from client_galleries.
```

Expected query:

```js
supabase.from("client_galleries").select("*", { count: "exact", head: true })
```

EST-77 result:

```txt
Dashboard gallery count is already using the correct new table.
```

### Admin gallery list

File:

```txt
src/pages/admin/Galleries.jsx
```

Current behavior:

```txt
1. Creates galleries in client_galleries
2. Creates default sections in client_gallery_sections
3. Loads gallery cards from client_galleries
4. Updates publish/hidden status in client_galleries
5. Deletes gallery records from client_galleries
```

EST-77 result:

```txt
The admin gallery list is already using the new schema.
```

### Admin gallery editor

File:

```txt
src/pages/admin/GalleryEditor.jsx
```

Current behavior:

```txt
1. Loads gallery workspace from client_galleries
2. Loads photo sets from client_gallery_sections
3. Loads photos from client_gallery_images
4. Saves gallery settings to client_galleries
5. Saves photo sets to client_gallery_sections
6. Saves uploaded image records to client_gallery_images
```

EST-77 result:

```txt
The admin gallery editor is already using the new schema.
```

### Public client gallery viewer

Files:

```txt
src/App.jsx
src/pages/ClientGalleryViewer.jsx
src/pages/PublicGalleryViewer.jsx
```

Current behavior:

```txt
1. /gallery/:slug renders ClientGalleryViewer
2. ClientGalleryViewer exports PublicGalleryViewer
3. PublicGalleryViewer loads public gallery data through get_client_gallery_public_payload
```

Expected RPC:

```js
supabase.rpc("get_client_gallery_public_payload", {
  p_slug: slug,
  p_password: password,
})
```

EST-77 result:

```txt
The public gallery route uses the new public viewer flow. The Supabase RPC should remain based on client_galleries, client_gallery_sections, and client_gallery_images.
```

## SQL inspection notes

Use these SQL checks in Supabase before any future destructive cleanup.

### Check old table row counts

```sql
select 'galleries' as table_name, count(*) as row_count from galleries
union all
select 'gallery_photos' as table_name, count(*) as row_count from gallery_photos
union all
select 'gallery_access' as table_name, count(*) as row_count from gallery_access;
```

### Check new table row counts

```sql
select 'client_galleries' as table_name, count(*) as row_count from client_galleries
union all
select 'client_gallery_sections' as table_name, count(*) as row_count from client_gallery_sections
union all
select 'client_gallery_images' as table_name, count(*) as row_count from client_gallery_images;
```

### Confirm active gallery records

```sql
select id, title, slug, status, created_at
from client_galleries
order by created_at desc;
```

### Confirm public gallery image relationships

```sql
select
  cg.title as gallery_title,
  cg.slug as gallery_slug,
  cgs.title as section_title,
  cgi.file_name,
  cgi.display_order
from client_gallery_images cgi
left join client_galleries cg on cg.id = cgi.gallery_id
left join client_gallery_sections cgs on cgs.id = cgi.section_id
order by cg.created_at desc, cgs.display_order asc, cgi.display_order asc;
```

## Migration recommendation

For EST-77, do not drop old tables automatically.

Recommended lifecycle:

```txt
1. Treat old tables as deprecated
2. Confirm no active code depends on old tables
3. Confirm whether old tables contain production data
4. Export old data if it needs to be preserved
5. Only drop old tables in a future cleanup after a backup exists
```

## Optional future SQL cleanup

Only use this after manually confirming the old tables are no longer needed and backups exist.

```sql
-- Future cleanup only. Do not run as part of EST-77 without manual approval.
-- drop table if exists gallery_access;
-- drop table if exists gallery_photos;
-- drop table if exists galleries;
```

## EST-77 conclusion

```txt
1. Old tables are documented as deprecated
2. New client gallery tables are documented as the source of truth
3. Dashboard count is already using client_galleries
4. Admin gallery list is already using client_galleries
5. Admin gallery editor is already using client_galleries, client_gallery_sections, and client_gallery_images
6. Public /gallery/:slug uses the PublicGalleryViewer flow through get_client_gallery_public_payload
7. No destructive database changes are included in this issue
```
