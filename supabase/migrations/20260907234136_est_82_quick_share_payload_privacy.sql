-- EST-82 follow-up: when a quick share has downloads disabled, do not expose
-- original storage paths in the anonymous public payload.

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
  can_download boolean := false;
begin
  select * into link_record
  from public.client_gallery_quick_share_links
  where token = nullif(trim(coalesce(p_token, '')), '')
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

  can_download := coalesce(link_record.allow_downloads, false)
    and coalesce(gallery_record.allow_downloads, true);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', image.id,
        'file_name', image.file_name,
        'title', image.title,
        'alt_text', image.alt_text,
        'display_path', image.display_path,
        'thumbnail_path', image.thumbnail_path,
        'original_path', case when can_download then image.original_path else null end,
        'display_order', image.display_order,
        'display_width', image.display_width,
        'display_height', image.display_height
      )
      order by item.display_order, image.display_order
    ),
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
      'allow_downloads', can_download,
      'created_at', link_record.created_at
    ),
    'photos', photos_json
  );
end;
$$;

revoke all on function public.get_client_gallery_quick_share_public_payload(text, text) from public;
grant execute on function public.get_client_gallery_quick_share_public_payload(text, text) to anon, authenticated;
