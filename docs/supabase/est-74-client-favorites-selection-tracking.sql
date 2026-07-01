-- EST-74 Client Favorites and Selection Tracking
-- Run this in Supabase SQL editor after EST-73 has been applied.

create extension if not exists pgcrypto;

create table if not exists public.client_gallery_favorites (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.client_galleries(id) on delete cascade,
  image_id uuid not null references public.client_gallery_images(id) on delete cascade,
  visitor_id text not null,
  visitor_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_gallery_favorites_visitor_id_length check (char_length(visitor_id) between 8 and 160),
  constraint client_gallery_favorites_unique_selection unique (gallery_id, image_id, visitor_id)
);

create index if not exists client_gallery_favorites_gallery_id_idx
  on public.client_gallery_favorites(gallery_id);

create index if not exists client_gallery_favorites_image_id_idx
  on public.client_gallery_favorites(image_id);

create index if not exists client_gallery_favorites_gallery_visitor_idx
  on public.client_gallery_favorites(gallery_id, visitor_id);

create index if not exists client_gallery_favorites_created_at_idx
  on public.client_gallery_favorites(created_at desc);

create or replace function public.touch_client_gallery_favorite_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_client_gallery_favorite_updated_at on public.client_gallery_favorites;
create trigger touch_client_gallery_favorite_updated_at
before update on public.client_gallery_favorites
for each row execute function public.touch_client_gallery_favorite_updated_at();

alter table public.client_gallery_favorites enable row level security;

-- Authenticated admins can review and manage all client gallery selections.
drop policy if exists "Authenticated users can manage client gallery favorites" on public.client_gallery_favorites;
create policy "Authenticated users can manage client gallery favorites"
on public.client_gallery_favorites
for all
to authenticated
using (true)
with check (true);

-- Public visitors can read their own favorite state for active galleries that allow favorites.
drop policy if exists "Visitors can read own gallery favorites" on public.client_gallery_favorites;
create policy "Visitors can read own gallery favorites"
on public.client_gallery_favorites
for select
to anon
using (
  exists (
    select 1
    from public.client_galleries gallery
    where gallery.id = client_gallery_favorites.gallery_id
      and gallery.status = 'published'
      and coalesce(gallery.allow_favorites, true) = true
      and (gallery.expires_at is null or gallery.expires_at > now())
  )
);

-- Public visitors can favorite images in active galleries that allow favorites.
drop policy if exists "Visitors can create gallery favorites" on public.client_gallery_favorites;
create policy "Visitors can create gallery favorites"
on public.client_gallery_favorites
for insert
to anon
with check (
  exists (
    select 1
    from public.client_galleries gallery
    join public.client_gallery_images image on image.gallery_id = gallery.id
    where gallery.id = client_gallery_favorites.gallery_id
      and image.id = client_gallery_favorites.image_id
      and gallery.status = 'published'
      and coalesce(gallery.allow_favorites, true) = true
      and (gallery.expires_at is null or gallery.expires_at > now())
  )
);

-- Public visitors can remove their own favorite state from active galleries.
drop policy if exists "Visitors can remove own gallery favorites" on public.client_gallery_favorites;
create policy "Visitors can remove own gallery favorites"
on public.client_gallery_favorites
for delete
to anon
using (
  exists (
    select 1
    from public.client_galleries gallery
    where gallery.id = client_gallery_favorites.gallery_id
      and gallery.status = 'published'
      and coalesce(gallery.allow_favorites, true) = true
      and (gallery.expires_at is null or gallery.expires_at > now())
  )
);

-- Admin summary view for gallery workspace favorite counts.
create or replace view public.client_gallery_favorite_summary as
select
  favorite.gallery_id,
  favorite.image_id,
  count(*)::integer as favorite_count,
  max(favorite.created_at) as last_favorited_at
from public.client_gallery_favorites favorite
group by favorite.gallery_id, favorite.image_id;

grant select on public.client_gallery_favorite_summary to authenticated;
grant select, insert, delete on public.client_gallery_favorites to anon;
grant select, insert, update, delete on public.client_gallery_favorites to authenticated;
