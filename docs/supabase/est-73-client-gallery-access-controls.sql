-- EST-73 Client Gallery Access Controls, Passwords, Expiration, and Delivery Toggles
--
-- Run this after EST-72.
-- This adds gallery access fields and a public-safe RPC payload used by /gallery/:slug.
-- Password hashes stay server-side and are never returned to the browser.
-- This script is safe to rerun while testing EST-73.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
set search_path = public, extensions;

alter table public.client_galleries
  add column if not exists access_mode text not null default 'public',
  add column if not exists access_password_hash text,
  add column if not exists expires_at timestamptz,
  add column if not exists allow_downloads boolean not null default true,
  add column if not exists allow_favorites boolean not null default true,
  add column if not exists allow_sharing boolean not null default true,
  add column if not exists watermark_mode text not null default 'off',
  add column if not exists watermark_file_path text,
  add column if not exists watermark_text text;

alter table public.client_galleries
  drop constraint if exists client_galleries_access_mode_check;

alter table public.client_galleries
  add constraint client_galleries_access_mode_check
  check (access_mode in ('public', 'password', 'hidden'));

alter table public.client_galleries
  drop constraint if exists client_galleries_watermark_mode_check;

alter table public.client_galleries
  add constraint client_galleries_watermark_mode_check
  check (watermark_mode in ('off', 'subtle', 'strong'));

update public.client_galleries
set access_mode = 'public'
where access_mode is null;

update public.client_galleries
set access_password_hash = null
where access_mode <> 'password';

update public.client_galleries
set watermark_mode = 'off'
where watermark_mode is null;

create index if not exists client_galleries_access_mode_idx
  on public.client_galleries(access_mode);

create index if not exists client_galleries_expires_at_idx
  on public.client_galleries(expires_at);

-- Public gallery payload RPC.
-- This lets the public viewer know whether a gallery is available, locked,
-- expired, or unavailable without exposing password hashes. When a password is
-- supplied and verified, the same function returns visible sections and photos.
create or replace function public.get_client_gallery_public_payload(
  p_slug text,
  p_password text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  gallery_record public.client_galleries%rowtype;
  gallery_json jsonb;
  section_json jsonb;
  image_json jsonb;
  password_ok boolean := false;
begin
  select *
  into gallery_record
  from public.client_galleries
  where slug = p_slug
  limit 1;

  if gallery_record.id is null then
    return jsonb_build_object('state', 'unavailable');
  end if;

  gallery_json := to_jsonb(gallery_record) - 'access_password_hash';

  if gallery_record.status <> 'published' or gallery_record.access_mode = 'hidden' then
    return jsonb_build_object('state', 'unavailable');
  end if;

  if gallery_record.expires_at is not null and gallery_record.expires_at <= now() then
    return jsonb_build_object(
      'state', 'expired',
      'gallery', gallery_json
    );
  end if;

  if gallery_record.access_mode = 'password' then
    password_ok := gallery_record.access_password_hash is not null
      and p_password is not null
      and gallery_record.access_password_hash = crypt(p_password, gallery_record.access_password_hash);

    if not password_ok then
      return jsonb_build_object(
        'state', 'locked',
        'gallery', gallery_json
      );
    end if;
  end if;

  select coalesce(jsonb_agg(to_jsonb(section_row) order by section_row.display_order), '[]'::jsonb)
  into section_json
  from public.client_gallery_sections section_row
  where section_row.gallery_id = gallery_record.id
    and section_row.is_visible = true;

  select coalesce(jsonb_agg(to_jsonb(image_row) order by image_row.display_order), '[]'::jsonb)
  into image_json
  from public.client_gallery_images image_row
  where image_row.gallery_id = gallery_record.id
    and exists (
      select 1
      from public.client_gallery_sections section_row
      where section_row.id = image_row.section_id
        and section_row.is_visible = true
    );

  return jsonb_build_object(
    'state', 'available',
    'gallery', gallery_json,
    'sections', section_json,
    'photos', image_json
  );
end;
$$;

grant execute on function public.get_client_gallery_public_payload(text, text) to anon, authenticated;

-- Admin password setter.
-- Authenticated admins can set, replace, or clear the password without the hash
-- ever being handled directly by the React app.
create or replace function public.set_client_gallery_password(
  p_gallery_id uuid,
  p_password text
)
returns public.client_galleries
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  updated_gallery public.client_galleries;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if p_password is null or length(trim(p_password)) = 0 then
    update public.client_galleries
    set access_password_hash = null,
        access_mode = case when access_mode = 'password' then 'public' else access_mode end
    where id = p_gallery_id
    returning * into updated_gallery;
  else
    update public.client_galleries
    set access_password_hash = crypt(p_password, gen_salt('bf')),
        access_mode = 'password'
    where id = p_gallery_id
    returning * into updated_gallery;
  end if;

  if updated_gallery.id is null then
    raise exception 'Gallery not found.';
  end if;

  return updated_gallery;
end;
$$;

grant execute on function public.set_client_gallery_password(uuid, text) to authenticated;

-- Tighten direct public reads so normal anonymous SELECT only covers active public galleries.
-- Password-protected payloads should be delivered through get_client_gallery_public_payload.
drop policy if exists "Public can read published client galleries" on public.client_galleries;
drop policy if exists "Public can read active public client galleries" on public.client_galleries;
create policy "Public can read active public client galleries"
on public.client_galleries
for select
to anon, authenticated
using (
  status = 'published'
  and access_mode = 'public'
  and (expires_at is null or expires_at > now())
);

drop policy if exists "Public can read visible published client gallery sections" on public.client_gallery_sections;
drop policy if exists "Public can read visible active public client gallery sections" on public.client_gallery_sections;
create policy "Public can read visible active public client gallery sections"
on public.client_gallery_sections
for select
to anon, authenticated
using (
  is_visible = true
  and exists (
    select 1
    from public.client_galleries gallery
    where gallery.id = client_gallery_sections.gallery_id
      and gallery.status = 'published'
      and gallery.access_mode = 'public'
      and (gallery.expires_at is null or gallery.expires_at > now())
  )
);

drop policy if exists "Public can read published client gallery images" on public.client_gallery_images;
drop policy if exists "Public can read active public client gallery images" on public.client_gallery_images;
create policy "Public can read active public client gallery images"
on public.client_gallery_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.client_gallery_sections section
    join public.client_galleries gallery
      on gallery.id = section.gallery_id
    where section.id = client_gallery_images.section_id
      and section.is_visible = true
      and gallery.status = 'published'
      and gallery.access_mode = 'public'
      and (gallery.expires_at is null or gallery.expires_at > now())
  )
);
