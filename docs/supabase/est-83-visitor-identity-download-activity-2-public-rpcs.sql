-- EST-83 Part 2 of 3: public visitor registration, visits, and downloads
-- Run after part 1. Safe to rerun.

create or replace function public.get_client_gallery_identity_requirements(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  gallery_record public.client_galleries%rowtype;
begin
  select *
  into gallery_record
  from public.client_galleries
  where slug = p_slug
  limit 1;

  if gallery_record.id is null
    or gallery_record.status <> 'published'
    or gallery_record.access_mode = 'hidden' then
    return jsonb_build_object('available', false, 'state', 'unavailable');
  end if;

  if gallery_record.expires_at is not null and gallery_record.expires_at <= now() then
    return jsonb_build_object('available', false, 'state', 'expired');
  end if;

  return jsonb_build_object(
    'available', true,
    'state', case when gallery_record.access_mode = 'password' then 'locked' else 'available' end,
    'gallery_id', gallery_record.id,
    'slug', gallery_record.slug,
    'title', gallery_record.title,
    'access_mode', gallery_record.access_mode,
    'require_visitor_identity', coalesce(gallery_record.require_visitor_identity, false),
    'collect_visitor_name', coalesce(gallery_record.collect_visitor_name, false),
    'allow_downloads', coalesce(gallery_record.allow_downloads, true),
    'allow_favorites', coalesce(gallery_record.allow_favorites, true)
  );
end;
$$;

create or replace function public.register_client_gallery_visitor(
  p_gallery_id uuid,
  p_email text default null,
  p_name text default null,
  p_browser_token text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  gallery_record public.client_galleries%rowtype;
  visitor_record public.client_gallery_visitors%rowtype;
  normalized_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  normalized_name text := nullif(trim(coalesce(p_name, '')), '');
  normalized_token text := nullif(trim(coalesce(p_browser_token, '')), '');
begin
  select *
  into gallery_record
  from public.client_galleries
  where id = p_gallery_id
  limit 1;

  if gallery_record.id is null
    or gallery_record.status <> 'published'
    or gallery_record.access_mode = 'hidden'
    or (gallery_record.expires_at is not null and gallery_record.expires_at <= now()) then
    raise exception 'Gallery is not available.';
  end if;

  if normalized_token is null or char_length(normalized_token) < 8 then
    raise exception 'A valid browser visitor token is required.';
  end if;

  if coalesce(gallery_record.require_visitor_identity, false) and normalized_email is null then
    raise exception 'Email is required for this gallery.';
  end if;

  if normalized_email is not null and position('@' in normalized_email) <= 1 then
    raise exception 'Enter a valid email address.';
  end if;

  if not coalesce(gallery_record.collect_visitor_name, false) then
    normalized_name := null;
  end if;

  select visitor.*
  into visitor_record
  from public.client_gallery_visitor_tokens token
  join public.client_gallery_visitors visitor on visitor.id = token.visitor_id
  where token.gallery_id = p_gallery_id
    and token.browser_token = normalized_token
  limit 1;

  if visitor_record.id is null and normalized_email is not null then
    select visitor.*
    into visitor_record
    from public.client_gallery_visitors visitor
    where visitor.gallery_id = p_gallery_id
      and lower(visitor.email) = normalized_email
    limit 1;
  end if;

  if visitor_record.id is null then
    insert into public.client_gallery_visitors (
      gallery_id,
      email,
      name,
      first_seen_at,
      last_seen_at
    ) values (
      p_gallery_id,
      normalized_email,
      normalized_name,
      now(),
      now()
    )
    returning * into visitor_record;
  else
    update public.client_gallery_visitors
    set email = coalesce(normalized_email, email),
        name = coalesce(normalized_name, name),
        last_seen_at = now()
    where id = visitor_record.id
    returning * into visitor_record;
  end if;

  insert into public.client_gallery_visitor_tokens (
    gallery_id,
    visitor_id,
    browser_token,
    last_seen_at
  ) values (
    p_gallery_id,
    visitor_record.id,
    normalized_token,
    now()
  )
  on conflict (gallery_id, browser_token)
  do update set
    visitor_id = excluded.visitor_id,
    last_seen_at = now();

  return jsonb_build_object(
    'id', visitor_record.id,
    'gallery_id', visitor_record.gallery_id,
    'email', visitor_record.email,
    'name', visitor_record.name,
    'first_seen_at', visitor_record.first_seen_at,
    'last_seen_at', visitor_record.last_seen_at
  );
end;
$$;

create or replace function public.log_client_gallery_visit(
  p_gallery_id uuid,
  p_visitor_id uuid,
  p_user_agent text default null,
  p_referrer text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  visit_id uuid;
begin
  if not exists (
    select 1
    from public.client_gallery_visitors visitor
    join public.client_galleries gallery on gallery.id = visitor.gallery_id
    where visitor.id = p_visitor_id
      and visitor.gallery_id = p_gallery_id
      and gallery.status = 'published'
      and gallery.access_mode <> 'hidden'
      and (gallery.expires_at is null or gallery.expires_at > now())
  ) then
    raise exception 'Visitor or gallery is not available.';
  end if;

  insert into public.client_gallery_visits (
    gallery_id,
    visitor_id,
    user_agent,
    referrer
  ) values (
    p_gallery_id,
    p_visitor_id,
    left(p_user_agent, 1000),
    left(p_referrer, 1000)
  )
  returning id into visit_id;

  update public.client_gallery_visitors
  set last_seen_at = now()
  where id = p_visitor_id;

  update public.client_gallery_visitor_tokens
  set last_seen_at = now()
  where gallery_id = p_gallery_id
    and visitor_id = p_visitor_id;

  return visit_id;
end;
$$;

create or replace function public.log_client_gallery_download(
  p_gallery_id uuid,
  p_visitor_id uuid,
  p_download_type text,
  p_image_ids uuid[] default '{}'::uuid[],
  p_file_name text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  download_id uuid;
  valid_image_ids uuid[] := '{}'::uuid[];
  image_count integer := 0;
begin
  if p_download_type not in ('photo', 'gallery_zip', 'favorites_zip') then
    raise exception 'Unsupported download type.';
  end if;

  if not exists (
    select 1
    from public.client_gallery_visitors visitor
    join public.client_galleries gallery on gallery.id = visitor.gallery_id
    where visitor.id = p_visitor_id
      and visitor.gallery_id = p_gallery_id
      and gallery.status = 'published'
      and gallery.access_mode <> 'hidden'
      and coalesce(gallery.allow_downloads, true) = true
      and (gallery.expires_at is null or gallery.expires_at > now())
  ) then
    raise exception 'Visitor or gallery download access is not available.';
  end if;

  select coalesce(array_agg(image.id order by image.display_order), '{}'::uuid[])
  into valid_image_ids
  from public.client_gallery_images image
  where image.gallery_id = p_gallery_id
    and image.id = any(coalesce(p_image_ids, '{}'::uuid[]));

  image_count := coalesce(array_length(valid_image_ids, 1), 0);

  insert into public.client_gallery_downloads (
    gallery_id,
    visitor_id,
    download_type,
    file_name,
    item_count,
    metadata
  ) values (
    p_gallery_id,
    p_visitor_id,
    p_download_type,
    nullif(left(trim(coalesce(p_file_name, '')), 500), ''),
    image_count,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into download_id;

  if image_count > 0 then
    insert into public.client_gallery_download_items (
      download_id,
      gallery_id,
      visitor_id,
      image_id,
      downloaded_at
    )
    select
      download_id,
      p_gallery_id,
      p_visitor_id,
      image_id,
      now()
    from unnest(valid_image_ids) as image_id;
  end if;

  update public.client_gallery_visitors
  set last_seen_at = now()
  where id = p_visitor_id;

  return download_id;
end;
$$;
