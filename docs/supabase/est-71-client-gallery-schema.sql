-- EST-71 Client Gallery Core Collection Workspace
--
-- This SQL documents the database source of truth for the admin client gallery
-- workspace. Run it in Supabase SQL Editor before browser testing EST-71.
--
-- Source-of-truth rules:
-- - /admin/portfolio and portfolio_images remain the source of truth for public portfolio assets.
-- - /admin/galleries and the tables below are the source of truth for client galleries.
-- - Client gallery photos are gallery-specific deliverables, not portfolio_images records.
-- - Removing a client_gallery_images row removes the photo from the gallery database only.
-- - Storage cleanup for deleted client gallery files can be added later as a safe admin action.

create extension if not exists pgcrypto;

-- Gallery-specific storage bucket. This is separate from the Portfolio bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-galleries',
  'client-galleries',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.client_galleries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  client_name text,
  client_email text,
  event_date date,
  description text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  cover_image_id uuid,
  cover_style text not null default 'center' check (cover_style in ('center', 'left', 'frame', 'stripe')),
  theme_color text not null default '#C8A96A',
  grid_style text not null default 'masonry' check (grid_style in ('masonry', 'square', 'editorial')),
  typography_style text not null default 'classic' check (typography_style in ('classic', 'modern', 'editorial')),
  cover_focal_x numeric not null default 50,
  cover_focal_y numeric not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_gallery_sections (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.client_galleries(id) on delete cascade,
  title text not null default 'Highlights',
  display_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_gallery_images (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.client_galleries(id) on delete cascade,
  section_id uuid not null references public.client_gallery_sections(id) on delete cascade,
  file_name text,
  title text,
  alt_text text,
  original_path text,
  display_path text,
  thumbnail_path text,
  display_order integer not null default 0,
  original_size_bytes bigint,
  display_size_bytes bigint,
  thumbnail_size_bytes bigint,
  display_width integer,
  display_height integer,
  thumbnail_width integer,
  thumbnail_height integer,
  mime_type text,
  focal_x numeric not null default 50,
  focal_y numeric not null default 50,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If an older EST-71 draft schema was already run, convert client_gallery_images
-- from a portfolio relationship table into gallery-specific photo assets.
alter table public.client_galleries add column if not exists cover_image_id uuid;
alter table public.client_galleries add column if not exists cover_style text not null default 'center';
alter table public.client_galleries add column if not exists theme_color text not null default '#C8A96A';
alter table public.client_galleries add column if not exists grid_style text not null default 'masonry';
alter table public.client_galleries add column if not exists typography_style text not null default 'classic';
alter table public.client_galleries add column if not exists cover_focal_x numeric not null default 50;
alter table public.client_galleries add column if not exists cover_focal_y numeric not null default 50;

alter table public.client_gallery_images drop constraint if exists client_gallery_images_portfolio_image_id_fkey;
alter table public.client_gallery_images drop constraint if exists client_gallery_images_section_id_portfolio_image_id_key;
alter table public.client_gallery_images drop column if exists portfolio_image_id;
alter table public.client_gallery_images add column if not exists file_name text;
alter table public.client_gallery_images add column if not exists title text;
alter table public.client_gallery_images add column if not exists alt_text text;
alter table public.client_gallery_images add column if not exists original_path text;
alter table public.client_gallery_images add column if not exists display_path text;
alter table public.client_gallery_images add column if not exists thumbnail_path text;
alter table public.client_gallery_images add column if not exists original_size_bytes bigint;
alter table public.client_gallery_images add column if not exists display_size_bytes bigint;
alter table public.client_gallery_images add column if not exists thumbnail_size_bytes bigint;
alter table public.client_gallery_images add column if not exists display_width integer;
alter table public.client_gallery_images add column if not exists display_height integer;
alter table public.client_gallery_images add column if not exists thumbnail_width integer;
alter table public.client_gallery_images add column if not exists thumbnail_height integer;
alter table public.client_gallery_images add column if not exists mime_type text;
alter table public.client_gallery_images add column if not exists focal_x numeric not null default 50;
alter table public.client_gallery_images add column if not exists focal_y numeric not null default 50;
alter table public.client_gallery_images add column if not exists uploaded_at timestamptz not null default now();

create index if not exists client_galleries_status_idx
  on public.client_galleries(status);

create index if not exists client_galleries_slug_idx
  on public.client_galleries(slug);

create index if not exists client_gallery_sections_gallery_order_idx
  on public.client_gallery_sections(gallery_id, display_order);

create index if not exists client_gallery_images_gallery_section_order_idx
  on public.client_gallery_images(gallery_id, section_id, display_order);

create index if not exists client_gallery_images_section_order_idx
  on public.client_gallery_images(section_id, display_order);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_client_galleries_updated_at on public.client_galleries;
create trigger set_client_galleries_updated_at
before update on public.client_galleries
for each row execute function public.set_updated_at();

drop trigger if exists set_client_gallery_sections_updated_at on public.client_gallery_sections;
create trigger set_client_gallery_sections_updated_at
before update on public.client_gallery_sections
for each row execute function public.set_updated_at();

drop trigger if exists set_client_gallery_images_updated_at on public.client_gallery_images;
create trigger set_client_gallery_images_updated_at
before update on public.client_gallery_images
for each row execute function public.set_updated_at();

-- The first EST-71 draft briefly used cover_image_id as a portfolio_images reference.
-- Clear any old cover value that does not point to a client_gallery_images row,
-- then recreate the correct gallery-photo foreign key.
alter table public.client_galleries drop constraint if exists client_galleries_cover_image_id_fkey;

update public.client_galleries as gallery
set cover_image_id = null
where cover_image_id is not null
  and not exists (
    select 1
    from public.client_gallery_images as photo
    where photo.id = gallery.cover_image_id
  );

alter table public.client_galleries
  add constraint client_galleries_cover_image_id_fkey
  foreign key (cover_image_id)
  references public.client_gallery_images(id)
  on delete set null;

alter table public.client_galleries enable row level security;
alter table public.client_gallery_sections enable row level security;
alter table public.client_gallery_images enable row level security;

-- Admin workspace policies. The app already protects /admin routes with Supabase auth.
-- Public gallery read policies should be added in EST-72 when /gallery/:slug is rebuilt.

drop policy if exists "Authenticated users can manage client galleries" on public.client_galleries;
create policy "Authenticated users can manage client galleries"
on public.client_galleries
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage client gallery sections" on public.client_gallery_sections;
create policy "Authenticated users can manage client gallery sections"
on public.client_gallery_sections
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage client gallery images" on public.client_gallery_images;
create policy "Authenticated users can manage client gallery images"
on public.client_gallery_images
for all
to authenticated
using (true)
with check (true);

-- Storage policies for authenticated admin uploads into the client-galleries bucket.
drop policy if exists "Authenticated users can upload client gallery files" on storage.objects;
create policy "Authenticated users can upload client gallery files"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'client-galleries');

drop policy if exists "Authenticated users can update client gallery files" on storage.objects;
create policy "Authenticated users can update client gallery files"
on storage.objects
for update
to authenticated
using (bucket_id = 'client-galleries')
with check (bucket_id = 'client-galleries');

drop policy if exists "Authenticated users can read client gallery files" on storage.objects;
create policy "Authenticated users can read client gallery files"
on storage.objects
for select
to authenticated
using (bucket_id = 'client-galleries');

-- A public read policy for published client galleries should be tightened and added
-- in EST-72 alongside the public /gallery/:slug viewer.
