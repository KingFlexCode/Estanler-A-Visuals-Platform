-- EST-82 follow-up: keep admin quick-share RPCs authenticated-only.
-- Supabase grants function EXECUTE broadly by default, so explicitly remove
-- anonymous invocation from the five admin management functions.

revoke execute on function public.create_client_gallery_quick_share(uuid, uuid[], boolean) from anon;
revoke execute on function public.get_client_gallery_quick_shares(uuid) from anon;
revoke execute on function public.log_client_gallery_quick_share_copy(uuid) from anon;
revoke execute on function public.set_client_gallery_quick_share_downloads(uuid, boolean) from anon;
revoke execute on function public.disable_client_gallery_quick_share(uuid) from anon;

grant execute on function public.create_client_gallery_quick_share(uuid, uuid[], boolean) to authenticated;
grant execute on function public.get_client_gallery_quick_shares(uuid) to authenticated;
grant execute on function public.log_client_gallery_quick_share_copy(uuid) to authenticated;
grant execute on function public.set_client_gallery_quick_share_downloads(uuid, boolean) to authenticated;
grant execute on function public.disable_client_gallery_quick_share(uuid) to authenticated;
