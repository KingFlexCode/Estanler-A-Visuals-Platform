-- EST-83 Part 1 of 3: visitor and download activity schema
-- Run parts 1, 2, and 3 in order. Safe to rerun.

create extension if not exists pgcrypto;

alter table public.client_galleries
  add column if not exists require_visitor_identity boolean not null default false,
  add column if not exists collect_visitor_name boolean not null default false;

update public.client_galleries
set collect_visitor_name = false
where require_visitor_identity = false
  and collect_visitor_name = true;

create table if not exists public.client_gallery_visitors (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.client_galleries(id) on delete cascade,
  email text,
  name text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_gallery_visitors_email_length check (email is null or char_length(email) between 3 and 320),
  constraint client_gallery_visitors_name_length check (name is null or char_length(name) <= 160)
);

create unique index if not exists client_gallery_visitors_gallery_email_unique_idx
  on public.client_gallery_visitors(gallery_id, lower(email))
  where email is not null;

create index if not exists client_gallery_visitors_gallery_last_seen_idx
  on public.client_gallery_visitors(gallery_id, last_seen_at desc);

create table if not exists public.client_gallery_visitor_tokens (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.client_galleries(id) on delete cascade,
  visitor_id uuid not null references public.client_gallery_visitors(id) on delete cascade,
  browser_token text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint client_gallery_visitor_tokens_length check (char_length(browser_token) between 8 and 200),
  constraint client_gallery_visitor_tokens_gallery_browser_unique unique (gallery_id, browser_token)
);

create index if not exists client_gallery_visitor_tokens_visitor_idx
  on public.client_gallery_visitor_tokens(visitor_id);

create table if not exists public.client_gallery_visits (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.client_galleries(id) on delete cascade,
  visitor_id uuid not null references public.client_gallery_visitors(id) on delete cascade,
  visited_at timestamptz not null default now(),
  user_agent text,
  referrer text
);

create index if not exists client_gallery_visits_gallery_time_idx
  on public.client_gallery_visits(gallery_id, visited_at desc);

create index if not exists client_gallery_visits_visitor_time_idx
  on public.client_gallery_visits(visitor_id, visited_at desc);

create table if not exists public.client_gallery_downloads (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.client_galleries(id) on delete cascade,
  visitor_id uuid not null references public.client_gallery_visitors(id) on delete cascade,
  download_type text not null,
  file_name text,
  item_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  downloaded_at timestamptz not null default now(),
  constraint client_gallery_downloads_type_check check (download_type in ('photo', 'gallery_zip', 'favorites_zip')),
  constraint client_gallery_downloads_item_count_check check (item_count >= 0)
);

create index if not exists client_gallery_downloads_gallery_time_idx
  on public.client_gallery_downloads(gallery_id, downloaded_at desc);

create index if not exists client_gallery_downloads_visitor_time_idx
  on public.client_gallery_downloads(visitor_id, downloaded_at desc);

create table if not exists public.client_gallery_download_items (
  download_id uuid not null references public.client_gallery_downloads(id) on delete cascade,
  gallery_id uuid not null references public.client_galleries(id) on delete cascade,
  visitor_id uuid not null references public.client_gallery_visitors(id) on delete cascade,
  image_id uuid not null references public.client_gallery_images(id) on delete cascade,
  downloaded_at timestamptz not null default now(),
  primary key (download_id, image_id)
);

create index if not exists client_gallery_download_items_gallery_image_idx
  on public.client_gallery_download_items(gallery_id, image_id, downloaded_at desc);

create index if not exists client_gallery_download_items_visitor_idx
  on public.client_gallery_download_items(visitor_id, downloaded_at desc);

create or replace function public.touch_client_gallery_visitor_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_client_gallery_visitor_updated_at on public.client_gallery_visitors;
create trigger touch_client_gallery_visitor_updated_at
before update on public.client_gallery_visitors
for each row execute function public.touch_client_gallery_visitor_updated_at();

alter table public.client_gallery_visitors enable row level security;
alter table public.client_gallery_visitor_tokens enable row level security;
alter table public.client_gallery_visits enable row level security;
alter table public.client_gallery_downloads enable row level security;
alter table public.client_gallery_download_items enable row level security;

drop policy if exists "Authenticated users can manage gallery visitors" on public.client_gallery_visitors;
create policy "Authenticated users can manage gallery visitors"
on public.client_gallery_visitors
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage gallery visitor tokens" on public.client_gallery_visitor_tokens;
create policy "Authenticated users can manage gallery visitor tokens"
on public.client_gallery_visitor_tokens
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage gallery visits" on public.client_gallery_visits;
create policy "Authenticated users can manage gallery visits"
on public.client_gallery_visits
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage gallery downloads" on public.client_gallery_downloads;
create policy "Authenticated users can manage gallery downloads"
on public.client_gallery_downloads
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage gallery download items" on public.client_gallery_download_items;
create policy "Authenticated users can manage gallery download items"
on public.client_gallery_download_items
for all
to authenticated
using (true)
with check (true);
