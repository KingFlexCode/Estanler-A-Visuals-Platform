-- EST-71 Client Gallery Core Collection Workspace
--
-- This SQL documents the database source of truth for the admin client gallery
-- workspace. Run it in Supabase SQL Editor if these tables do not already exist.
--
-- Source-of-truth rules:
-- - portfolio_images remains the source of truth for uploaded/optimized image assets.
-- - client_galleries stores collection-level gallery details.
-- - client_gallery_sections stores gallery structure.
-- - client_gallery_images stores the relationship between a section and an existing portfolio image.
-- - Removing a client_gallery_images row must never delete a portfolio_images row or storage object.

create extension if not exists pgcrypto;

create table if not exists public.client_galleries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  client_name text,
  client_email text,
  event_date date,
  description text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  cover_image_id uuid references public.portfolio_images(id) on delete set null,
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
  portfolio_image_id uuid not null references public.portfolio_images(id) on delete restrict,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_id, portfolio_image_id)
);

create index if not exists client_galleries_status_idx
  on public.client_galleries(status);

create index if not exists client_galleries_slug_idx
  on public.client_galleries(slug);

create index if not exists client_gallery_sections_gallery_order_idx
  on public.client_gallery_sections(gallery_id, display_order);

create index if not exists client_gallery_images_gallery_section_order_idx
  on public.client_gallery_images(gallery_id, section_id, display_order);

create index if not exists client_gallery_images_portfolio_image_idx
  on public.client_gallery_images(portfolio_image_id);

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

-- If portfolio_images.id is not uuid in the existing Supabase project, update
-- cover_image_id and portfolio_image_id to match the existing portfolio_images.id type
-- before running this SQL.
