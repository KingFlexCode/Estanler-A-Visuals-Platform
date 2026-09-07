-- EST-82 Quick Share Links for Client Favorite Selections
--
-- Creates authenticated-only management tables and narrow RPCs for public
-- selected-photo links. Quick shares snapshot the currently-favorited images at
-- creation time and never grant broader access than the parent gallery.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.client_gallery_quick_share_links (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.client_galleries(id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  allow_downloads boolean not null default false,
  status text not null default 'active',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz,
  constraint client_gallery_quick_share_links_token_length check (char_length(token) between 32 and 160),
  constraint client_gallery_quick_share_links_status_check check (status in ('active', 'disabled'))
);

create index if not exists client_gallery_quick_share_links_gallery_created_idx
  on public.client_gallery_quick_share_links(gallery_id, created_at desc);
create index if not exists client_gallery_quick_share_links_status_idx
  on public.client_gallery_quick_share_links(status);

create table if not exists public.client_gallery_quick_share_items (
  quick_share_id uuid not null references public.client_gallery_quick_share_links(id) on delete cascade,
  gallery_id uuid not null references public.client_galleries(id) on delete cascade,
  image_id uuid not null references public.client_gallery_images(id) on delete cascade,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (quick_share_id, image_id)
);

create index if not exists client_gallery_quick_share_items_gallery_idx
  on public.client_gallery_quick_share_items(gallery_id);
create index if not exists client_gallery_quick_share_items_image_idx
  on public.client_gallery_quick_share_items(image_id);

create table if not exists public.client_gallery_quick_share_events (
  id uuid primary key default gen_random_uuid(),
  quick_share_id uuid not null references public.client_gallery_quick_share_links(id) on delete cascade,
  gallery_id uuid not null references public.client_galleries(id) on delete cascade,
  visitor_id uuid references public.client_gallery_visitors(id) on delete set null,
  event_type text not null,
  item_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint client_gallery_quick_share_events_type_check
    check (event_type in ('create', 'copy', 'visit', 'download', 'disable')),
  constraint client_gallery_quick_share_events_item_count_check check (item_count >= 0)
);

create index if not exists client_gallery_quick_share_events_link_time_idx
  on public.client_gallery_quick_share_events(quick_share_id, occurred_at desc);
create index if not exists client_gallery_quick_share_events_gallery_time_idx
  on public.client_gallery_quick_share_events(gallery_id, occurred_at desc);

alter table public.client_gallery_quick_share_links enable row level security;
alter table public.client_gallery_quick_share_items enable row level security;
alter table public.client_gallery_quick_share_events enable row level security;

drop policy if exists "Authenticated users can manage quick share links" on public.client_gallery_quick_share_links;
create policy "Authenticated users can manage quick share links"
on public.client_gallery_quick_share_links
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage quick share items" on public.client_gallery_quick_share_items;
create policy "Authenticated users can manage quick share items"
on public.client_gallery_quick_share_items
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage quick share events" on public.client_gallery_quick_share_events;
create policy "Authenticated users can manage quick share events"
on public.client_gallery_quick_share_events
for all
to authenticated
using (true)
with check (true);

revoke all on public.client_gallery_quick_share_links from anon;
revoke all on public.client_gallery_quick_share_items from anon;
revoke all on public.client_gallery_quick_share_events from anon;
grant select, insert, update, delete on public.client_gallery_quick_share_links to authenticated;
grant select, insert, update, delete on public.client_gallery_quick_share_items to authenticated;
grant select, insert, update, delete on public.client_gallery_quick_share_events to authenticated;

create or replace function public.create_client_gallery_quick_share(
  p_gallery_id uuid,
  p_image_ids uuid[],
  p_allow_downloads boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  gallery_record public.client_galleries%rowtype;
  link_record public.client_gallery_quick_share_links%rowtype;
  inserted_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  select * into gallery_record
  from public.client_galleries
  where id = p_gallery_id
  limit 1;

  if gallery_record.id is null then
    raise exception 'Gallery not found.';
  end if;

  if coalesce(gallery_record.allow_sharing, true) = false then
    raise exception 'Gallery sharing is disabled.';
  end if;

  if coalesce(cardinality(p_image_ids), 0) = 0 then
    raise exception 'At least one favorite image is required.';
  end if;

  insert into public.client_gallery_quick_share_links (
    gallery_id,
    allow_downloads,
    created_by
  ) values (
    p_gallery_id,
    coalesce(p_allow_downloads, false),
    auth.uid()
  )
  returning * into link_record;

  insert into public.client_gallery_quick_share_items (
    quick_share_id,
    gallery_id,
    image_id,
    display_order
  )
  select
    link_record.id,
    p_gallery_id,
    image.id,
    row_number() over (order by image.display_order, image.created_at, image.id)::integer - 1
  from public.client_gallery_images image
  where image.gallery_id = p_gallery_id
    and image.id = any(p_image_ids)
    and exists (
      select 1
      from public.client_gallery_favorites favorite
      where favorite.gallery_id = p_gallery_id
        and favorite.image_id = image.id
    )
  order by image.display_order, image.created_at, image.id;

  get diagnostics inserted_count = row_count;

  if inserted_count = 0 then
    delete from public.client_gallery_quick_share_links where id = link_record.id;
    raise exception 'No current favorite images were available to share.';
  end if;

  insert into public.client_gallery_quick_share_events (
    quick_share_id,
    gallery_id,
    event_type,
    item_count,
    metadata
  ) values (
    link_record.id,
    p_gallery_id,
    'create',
    inserted_count,
    jsonb_build_object('allow_downloads', link_record.allow_downloads)
  );

  return jsonb_build_object(
    'id', link_record.id,
    'gallery_id', link_record.gallery_id,
    'token', link_record.token,
    'status', link_record.status,
    'allow_downloads', link_record.allow_downloads,
    'image_count', inserted_count,
    'created_at', link_record.created_at
  );
end;
$$;

create or replace function public.get_client_gallery_quick_shares(p_gallery_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  links_json jsonb;
  events_json jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (select 1 from public.client_galleries where id = p_gallery_id) then
    raise exception 'Gallery not found.';
  end if;

  select coalesce(jsonb_agg(row_data order by created_at desc), '[]'::jsonb)
  into links_json
  from (
    select
      link.created_at,
      jsonb_build_object(
        'id', link.id,
        'gallery_id', link.gallery_id,
        'token', link.token,
        'status', link.status,
        'allow_downloads', link.allow_downloads,
        'created_at', link.created_at,
        'disabled_at', link.disabled_at,
        'image_count', (select count(*) from public.client_gallery_quick_share_items item where item.quick_share_id = link.id),
        'visit_count', (select count(*) from public.client_gallery_quick_share_events event where event.quick_share_id = link.id and event.event_type = 'visit'),
        'download_count', (select count(*) from public.client_gallery_quick_share_events event where event.quick_share_id = link.id and event.event_type = 'download'),
        'downloaded_items', (select coalesce(sum(event.item_count), 0) from public.client_gallery_quick_share_events event where event.quick_share_id = link.id and event.event_type = 'download'),
        'copy_count', (select count(*) from public.client_gallery_quick_share_events event where event.quick_share_id = link.id and event.event_type = 'copy'),
        'last_visited_at', (select max(event.occurred_at) from public.client_gallery_quick_share_events event where event.quick_share_id = link.id and event.event_type = 'visit'),
        'last_downloaded_at', (select max(event.occurred_at) from public.client_gallery_quick_share_events event where event.quick_share_id = link.id and event.event_type = 'download')
      ) as row_data
    from public.client_gallery_quick_share_links link
    where link.gallery_id = p_gallery_id
  ) rows;

  select coalesce(jsonb_agg(row_data order by occurred_at desc), '[]'::jsonb)
  into events_json
  from (
    select
      event.occurred_at,
      jsonb_build_object(
        'id', event.id,
        'quick_share_id', event.quick_share_id,
        'event_type', event.event_type,
        'item_count', event.item_count,
        'metadata', event.metadata,
        'occurred_at', event.occurred_at,
        'visitor_id', event.visitor_id,
        'visitor_email', visitor.email,
        'visitor_name', visitor.name
      ) as row_data
    from public.client_gallery_quick_share_events event
    left join public.client_gallery_visitors visitor on visitor.id = event.visitor_id
    where event.gallery_id = p_gallery_id
    order by event.occurred_at desc
    limit 100
  ) rows;

  return jsonb_build_object('links', links_json, 'events', events_json);
end;
$$;

create or replace function public.log_client_gallery_quick_share_copy(p_quick_share_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  link_record public.client_gallery_quick_share_links%rowtype;
  event_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  select * into link_record
  from public.client_gallery_quick_share_links
  where id = p_quick_share_id
  limit 1;

  if link_record.id is null then
    raise exception 'Quick share link not found.';
  end if;

  if link_record.status <> 'active' then
    raise exception 'Quick share link is disabled.';
  end if;

  insert into public.client_gallery_quick_share_events (
    quick_share_id,
    gallery_id,
    event_type
  ) values (
    link_record.id,
    link_record.gallery_id,
    'copy'
  ) returning id into event_id;

  return event_id;
end;
$$;

create or replace function public.set_client_gallery_quick_share_downloads(
  p_quick_share_id uuid,
  p_allow_downloads boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link_record public.client_gallery_quick_share_links%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  update public.client_gallery_quick_share_links
  set allow_downloads = coalesce(p_allow_downloads, false),
      updated_at = now()
  where id = p_quick_share_id
    and status = 'active'
  returning * into link_record;

  if link_record.id is null then
    raise exception 'Active quick share link not found.';
  end if;

  return jsonb_build_object(
    'id', link_record.id,
    'allow_downloads', link_record.allow_downloads,
    'status', link_record.status,
    'updated_at', link_record.updated_at
  );
end;
$$;

create or replace function public.disable_client_gallery_quick_share(p_quick_share_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link_record public.client_gallery_quick_share_links%rowtype;
  changed boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  select * into link_record
  from public.client_gallery_quick_share_links
  where id = p_quick_share_id
  limit 1;

  if link_record.id is null then
    raise exception 'Quick share link not found.';
  end if;

  if link_record.status = 'active' then
    update public.client_gallery_quick_share_links
    set status = 'disabled',
        disabled_at = now(),
        updated_at = now()
    where id = link_record.id
    returning * into link_record;
    changed := true;
  end if;

  if changed then
    insert into public.client_gallery_quick_share_events (
      quick_share_id,
      gallery_id,
      event_type
    ) values (
      link_record.id,
      link_record.gallery_id,
      'disable'
    );
  end if;

  return jsonb_build_object(
    'id', link_record.id,
    'status', link_record.status,
    'disabled_at', link_record.disabled_at
  );
end;
$$;

create or replace function public.get_client_gallery_quick_share_public_payload(
  p_token text,
  p_password text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  link_record public.client_gallery_quick_share_links%rowtype;
  gallery_record public.client_galleries%rowtype;
  gallery_json jsonb;
  photos_json jsonb;
  password_ok boolean := false;
begin
  select link.* into link_record
  from public.client_gallery_quick_share_links link
  where link.token = nullif(trim(coalesce(p_token, '')), '')
  limit 1;

  if link_record.id is null then
    return jsonb_build_object('state', 'unavailable');
  end if;

  select * into gallery_record
  from public.client_galleries
  where id = link_record.gallery_id
  limit 1;

  if gallery_record.id is null then
    return jsonb_build_object('state', 'unavailable');
  end if;

  gallery_json := jsonb_build_object(
    'id', gallery_record.id,
    'slug', gallery_record.slug,
    'title', gallery_record.title,
    'client_name', gallery_record.client_name,
    'event_date', gallery_record.event_date,
    'description', gallery_record.description,
    'theme_color', gallery_record.theme_color,
    'typography_style', gallery_record.typography_style,
    'access_mode', gallery_record.access_mode,
    'require_visitor_identity', coalesce(gallery_record.require_visitor_identity, false),
    'collect_visitor_name', coalesce(gallery_record.collect_visitor_name, false),
    'allow_downloads', coalesce(gallery_record.allow_downloads, true),
    'allow_sharing', coalesce(gallery_record.allow_sharing, true)
  );

  if link_record.status <> 'active' then
    return jsonb_build_object('state', 'disabled', 'gallery', gallery_json);
  end if;

  if gallery_record.status <> 'published'
    or gallery_record.access_mode = 'hidden'
    or coalesce(gallery_record.allow_sharing, true) = false then
    return jsonb_build_object('state', 'unavailable', 'gallery', gallery_json);
  end if;

  if gallery_record.expires_at is not null and gallery_record.expires_at <= now() then
    return jsonb_build_object('state', 'expired', 'gallery', gallery_json);
  end if;

  if gallery_record.access_mode = 'password' then
    password_ok := gallery_record.access_password_hash is not null
      and p_password is not null
      and gallery_record.access_password_hash = extensions.crypt(p_password, gallery_record.access_password_hash);

    if not password_ok then
      return jsonb_build_object('state', 'locked', 'gallery', gallery_json);
    end if;
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(image) order by item.display_order, image.display_order),
    '[]'::jsonb
  ) into photos_json
  from public.client_gallery_quick_share_items item
  join public.client_gallery_images image on image.id = item.image_id
  where item.quick_share_id = link_record.id
    and image.gallery_id = gallery_record.id
    and exists (
      select 1
      from public.client_gallery_sections section
      where section.id = image.section_id
        and section.gallery_id = gallery_record.id
        and section.is_visible = true
    );

  return jsonb_build_object(
    'state', 'available',
    'gallery', gallery_json,
    'quick_share', jsonb_build_object(
      'id', link_record.id,
      'token', link_record.token,
      'status', link_record.status,
      'allow_downloads', coalesce(link_record.allow_downloads, false) and coalesce(gallery_record.allow_downloads, true),
      'created_at', link_record.created_at
    ),
    'photos', photos_json
  );
end;
$$;

create or replace function public.log_client_gallery_quick_share_public_event(
  p_token text,
  p_event_type text,
  p_password text default null,
  p_visitor_id uuid default null,
  p_image_ids uuid[] default '{}'::uuid[],
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  link_record public.client_gallery_quick_share_links%rowtype;
  gallery_record public.client_galleries%rowtype;
  event_id uuid;
  valid_image_ids uuid[] := '{}'::uuid[];
  valid_count integer := 0;
  password_ok boolean := false;
begin
  if p_event_type not in ('visit', 'download') then
    raise exception 'Unsupported quick share event type.';
  end if;

  select link.* into link_record
  from public.client_gallery_quick_share_links link
  where link.token = nullif(trim(coalesce(p_token, '')), '')
  limit 1;

  if link_record.id is null or link_record.status <> 'active' then
    raise exception 'Quick share link is not available.';
  end if;

  select * into gallery_record
  from public.client_galleries
  where id = link_record.gallery_id
  limit 1;

  if gallery_record.id is null
    or gallery_record.status <> 'published'
    or gallery_record.access_mode = 'hidden'
    or coalesce(gallery_record.allow_sharing, true) = false
    or (gallery_record.expires_at is not null and gallery_record.expires_at <= now()) then
    raise exception 'Gallery is not available.';
  end if;

  if gallery_record.access_mode = 'password' then
    password_ok := gallery_record.access_password_hash is not null
      and p_password is not null
      and gallery_record.access_password_hash = extensions.crypt(p_password, gallery_record.access_password_hash);
    if not password_ok then
      raise exception 'Gallery password is required.';
    end if;
  end if;

  if coalesce(gallery_record.require_visitor_identity, false) and p_visitor_id is null then
    raise exception 'Visitor identity is required.';
  end if;

  if p_visitor_id is not null and not exists (
    select 1
    from public.client_gallery_visitors visitor
    where visitor.id = p_visitor_id
      and visitor.gallery_id = gallery_record.id
  ) then
    raise exception 'Visitor identity is not valid for this gallery.';
  end if;

  if p_event_type = 'download' then
    if coalesce(link_record.allow_downloads, false) = false
      or coalesce(gallery_record.allow_downloads, true) = false then
      raise exception 'Downloads are disabled for this quick share link.';
    end if;

    select coalesce(array_agg(distinct item.image_id), '{}'::uuid[])
    into valid_image_ids
    from public.client_gallery_quick_share_items item
    join public.client_gallery_images image on image.id = item.image_id
    where item.quick_share_id = link_record.id
      and item.image_id = any(coalesce(p_image_ids, '{}'::uuid[]))
      and exists (
        select 1
        from public.client_gallery_sections section
        where section.id = image.section_id
          and section.gallery_id = gallery_record.id
          and section.is_visible = true
      );

    valid_count := coalesce(cardinality(valid_image_ids), 0);
    if valid_count = 0 then
      raise exception 'No downloadable quick share images were supplied.';
    end if;
  end if;

  insert into public.client_gallery_quick_share_events (
    quick_share_id,
    gallery_id,
    visitor_id,
    event_type,
    item_count,
    metadata
  ) values (
    link_record.id,
    gallery_record.id,
    p_visitor_id,
    p_event_type,
    case when p_event_type = 'download' then valid_count else 0 end,
    coalesce(p_metadata, '{}'::jsonb)
  ) returning id into event_id;

  return event_id;
end;
$$;

revoke all on function public.create_client_gallery_quick_share(uuid, uuid[], boolean) from public;
revoke all on function public.get_client_gallery_quick_shares(uuid) from public;
revoke all on function public.log_client_gallery_quick_share_copy(uuid) from public;
revoke all on function public.set_client_gallery_quick_share_downloads(uuid, boolean) from public;
revoke all on function public.disable_client_gallery_quick_share(uuid) from public;
revoke all on function public.get_client_gallery_quick_share_public_payload(text, text) from public;
revoke all on function public.log_client_gallery_quick_share_public_event(text, text, text, uuid, uuid[], jsonb) from public;

grant execute on function public.create_client_gallery_quick_share(uuid, uuid[], boolean) to authenticated;
grant execute on function public.get_client_gallery_quick_shares(uuid) to authenticated;
grant execute on function public.log_client_gallery_quick_share_copy(uuid) to authenticated;
grant execute on function public.set_client_gallery_quick_share_downloads(uuid, boolean) to authenticated;
grant execute on function public.disable_client_gallery_quick_share(uuid) to authenticated;
grant execute on function public.get_client_gallery_quick_share_public_payload(text, text) to anon, authenticated;
grant execute on function public.log_client_gallery_quick_share_public_event(text, text, text, uuid, uuid[], jsonb) to anon, authenticated;
