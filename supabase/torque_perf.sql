-- =====================================================================
-- TORQUE : index pour que les listes restent rapides quand il y a du monde
-- A lancer une fois (sans risque : chaque index est créé seulement s'il n'existe pas).
-- =====================================================================
do $$
declare stmt text;
begin
  foreach stmt in array array[
    'create index if not exists posts_created_idx on public.posts (created_at desc)',
    'create index if not exists posts_author_created_idx on public.posts (author_id, created_at desc)',
    'create index if not exists posts_media_created_idx on public.posts (media_type, created_at desc)',
    'create index if not exists comments_post_created_idx on public.comments (post_id, created_at)',
    'create index if not exists likes_user_idx on public.likes (user_id)',
    'create index if not exists followings_follower_idx on public.followings (follower_id)',
    'create index if not exists followings_following_idx on public.followings (following_id)',
    'create index if not exists messages_receiver_created_idx on public.messages (receiver_id, created_at desc)',
    'create index if not exists messages_sender_created_idx on public.messages (sender_id, created_at desc)',
    'create index if not exists events_status_starts_idx on public.events (status, starts_at)',
    'create index if not exists events_organizer_idx on public.events (organizer_id)',
    'create index if not exists event_attendees_user_idx on public.event_attendees (user_id)',
    'create index if not exists profiles_username_idx on public.profiles (username)'
  ] loop
    begin
      execute stmt;
    exception when others then
      raise notice 'ignoré : % (%)', stmt, sqlerrm;
    end;
  end loop;
end $$;

analyze;
