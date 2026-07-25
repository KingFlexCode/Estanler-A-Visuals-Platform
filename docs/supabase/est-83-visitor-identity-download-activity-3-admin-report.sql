-- EST-83 Part 3 of 3: authenticated admin activity report and grants
-- Run after part 2. Safe to rerun.

create or replace function public.get_client_gallery_activity(p_gallery_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  summary_json jsonb;
  visitors_json jsonb;
  visits_json jsonb;
  downloads_json jsonb;
  image_totals_json jsonb;
  favorite_visitors_json jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (select 1 from public.client_galleries where id = p_gallery_id) then
    raise exception 'Gallery not found.';
  end if;

  select jsonb_build_object(
    'total_visitors', (select count(*) from public.client_gallery_visitors where gallery_id = p_gallery_id),
    'total_visits', (select count(*) from public.client_gallery_visits where gallery_id = p_gallery_id),
    'total_downloads', (select count(*) from public.client_gallery_downloads where gallery_id = p_gallery_id),
    'total_downloaded_images', (select count(*) from public.client_gallery_download_items where gallery_id = p_gallery_id)
  )
  into summary_json;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', visitor.id,
        'email', visitor.email,
        'name', visitor.name,
        'first_seen_at', visitor.first_seen_at,
        'last_seen_at', visitor.last_seen_at,
        'visit_count', (select count(*) from public.client_gallery_visits visit where visit.visitor_id = visitor.id),
        'download_events', (select count(*) from public.client_gallery_downloads download where download.visitor_id = visitor.id),
        'downloaded_images', (select count(*) from public.client_gallery_download_items item where item.visitor_id = visitor.id),
        'favorite_count', (
          select count(distinct favorite.image_id)
          from public.client_gallery_favorites favorite
          join public.client_gallery_visitor_tokens token
            on token.gallery_id = favorite.gallery_id
           and token.browser_token = favorite.visitor_id
          where token.visitor_id = visitor.id
            and favorite.gallery_id = p_gallery_id
        )
      )
      order by visitor.last_seen_at desc
    ),
    '[]'::jsonb
  )
  into visitors_json
  from public.client_gallery_visitors visitor
  where visitor.gallery_id = p_gallery_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', visit.id,
        'visitor_id', visit.visitor_id,
        'email', visitor.email,
        'name', visitor.name,
        'visited_at', visit.visited_at,
        'referrer', visit.referrer
      )
      order by visit.visited_at desc
    ),
    '[]'::jsonb
  )
  into visits_json
  from (
    select *
    from public.client_gallery_visits
    where gallery_id = p_gallery_id
    order by visited_at desc
    limit 200
  ) visit
  join public.client_gallery_visitors visitor on visitor.id = visit.visitor_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', download.id,
        'visitor_id', download.visitor_id,
        'email', visitor.email,
        'name', visitor.name,
        'download_type', download.download_type,
        'file_name', download.file_name,
        'item_count', download.item_count,
        'downloaded_at', download.downloaded_at,
        'metadata', download.metadata,
        'images', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', image.id,
              'file_name', image.file_name,
              'title', image.title
            )
            order by image.display_order
          )
          from public.client_gallery_download_items item
          join public.client_gallery_images image on image.id = item.image_id
          where item.download_id = download.id
        ), '[]'::jsonb)
      )
      order by download.downloaded_at desc
    ),
    '[]'::jsonb
  )
  into downloads_json
  from (
    select *
    from public.client_gallery_downloads
    where gallery_id = p_gallery_id
    order by downloaded_at desc
    limit 200
  ) download
  join public.client_gallery_visitors visitor on visitor.id = download.visitor_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'image_id', totals.image_id,
        'file_name', totals.file_name,
        'title', totals.title,
        'download_count', totals.download_count,
        'visitor_count', totals.visitor_count,
        'last_downloaded_at', totals.last_downloaded_at
      )
      order by totals.download_count desc, totals.file_name
    ),
    '[]'::jsonb
  )
  into image_totals_json
  from (
    select
      image.id as image_id,
      image.file_name,
      image.title,
      count(*)::integer as download_count,
      count(distinct item.visitor_id)::integer as visitor_count,
      max(item.downloaded_at) as last_downloaded_at
    from public.client_gallery_download_items item
    join public.client_gallery_images image on image.id = item.image_id
    where item.gallery_id = p_gallery_id
    group by image.id, image.file_name, image.title
  ) totals;

  with favorite_rows as (
    select
      favorite.visitor_id as browser_token,
      favorite.image_id,
      token.visitor_id as matched_visitor_id
    from public.client_gallery_favorites favorite
    left join public.client_gallery_visitor_tokens token
      on token.gallery_id = favorite.gallery_id
     and token.browser_token = favorite.visitor_id
    where favorite.gallery_id = p_gallery_id
  ), grouped_favorites as (
    select
      coalesce(visitor.id::text, 'browser:' || favorite.browser_token) as identity_key,
      visitor.id as visitor_id,
      visitor.email,
      visitor.name,
      min(favorite.browser_token) as browser_token,
      count(distinct favorite.image_id)::integer as favorite_count,
      jsonb_agg(distinct jsonb_build_object(
        'id', image.id,
        'file_name', image.file_name,
        'title', image.title
      )) as images
    from favorite_rows favorite
    join public.client_gallery_images image on image.id = favorite.image_id
    left join public.client_gallery_visitors visitor on visitor.id = favorite.matched_visitor_id
    group by coalesce(visitor.id::text, 'browser:' || favorite.browser_token), visitor.id, visitor.email, visitor.name
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'identity_key', grouped.identity_key,
        'visitor_id', grouped.visitor_id,
        'email', grouped.email,
        'name', grouped.name,
        'browser_token', grouped.browser_token,
        'favorite_count', grouped.favorite_count,
        'images', grouped.images
      )
      order by grouped.favorite_count desc
    ),
    '[]'::jsonb
  )
  into favorite_visitors_json
  from grouped_favorites grouped;

  return jsonb_build_object(
    'summary', summary_json,
    'visitors', visitors_json,
    'visits', visits_json,
    'downloads', downloads_json,
    'image_totals', image_totals_json,
    'favorite_visitors', favorite_visitors_json
  );
end;
$$;

grant execute on function public.get_client_gallery_identity_requirements(text) to anon, authenticated;
grant execute on function public.register_client_gallery_visitor(uuid, text, text, text) to anon, authenticated;
grant execute on function public.log_client_gallery_visit(uuid, uuid, text, text) to anon, authenticated;
grant execute on function public.log_client_gallery_download(uuid, uuid, text, uuid[], text, jsonb) to anon, authenticated;
grant execute on function public.get_client_gallery_activity(uuid) to authenticated;

grant select, insert, update, delete on public.client_gallery_visitors to authenticated;
grant select, insert, update, delete on public.client_gallery_visitor_tokens to authenticated;
grant select, insert, update, delete on public.client_gallery_visits to authenticated;
grant select, insert, update, delete on public.client_gallery_downloads to authenticated;
grant select, insert, update, delete on public.client_gallery_download_items to authenticated;

revoke all on public.client_gallery_visitors from anon;
revoke all on public.client_gallery_visitor_tokens from anon;
revoke all on public.client_gallery_visits from anon;
revoke all on public.client_gallery_downloads from anon;
revoke all on public.client_gallery_download_items from anon;
