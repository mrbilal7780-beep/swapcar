-- =====================================================================
-- TORQUE : j'aime / commentaires, notifications, discussion de rasso
-- A lancer UNE fois dans Supabase > SQL Editor (peut être relancé sans danger).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) J'AIME ET COMMENTAIRES : un seul j'aime par personne, index rapides
-- ---------------------------------------------------------------------
delete from public.likes a using public.likes b
  where a.ctid < b.ctid and a.post_id = b.post_id and a.user_id = b.user_id;
create unique index if not exists likes_unique_user_post on public.likes (post_id, user_id);
create index if not exists likes_post_id_idx on public.likes (post_id);
create index if not exists comments_post_id_idx on public.comments (post_id);

-- ---------------------------------------------------------------------
-- 2) NOTIFICATIONS : tables
-- ---------------------------------------------------------------------
create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  actor_id uuid references public.profiles(user_id) on delete set null,
  type text not null,
  title text not null,
  body text,
  url text,
  entity_id uuid,
  count integer not null default 1,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists app_notifications_user_idx on public.app_notifications (user_id, created_at desc);
create index if not exists app_notifications_group_idx on public.app_notifications (user_id, type, entity_id) where read = false;

alter table public.app_notifications enable row level security;
drop policy if exists app_notifications_select_own on public.app_notifications;
create policy app_notifications_select_own on public.app_notifications
  for select to authenticated using (user_id = auth.uid());
drop policy if exists app_notifications_update_own on public.app_notifications;
create policy app_notifications_update_own on public.app_notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists app_notifications_delete_own on public.app_notifications;
create policy app_notifications_delete_own on public.app_notifications
  for delete to authenticated using (user_id = auth.uid());
revoke all on public.app_notifications from anon;
revoke insert, update on public.app_notifications from authenticated;
grant select, delete on public.app_notifications to authenticated;
grant update (read) on public.app_notifications to authenticated;
grant all on public.app_notifications to service_role;

create table if not exists public.notification_prefs (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  push_enabled boolean not null default true,
  likes boolean not null default true,
  comments boolean not null default true,
  follows boolean not null default true,
  messages boolean not null default true,
  events_nearby boolean not null default true,
  event_updates boolean not null default true,
  event_chat boolean not null default true,
  quiet_enabled boolean not null default false,
  quiet_start smallint not null default 22 check (quiet_start between 0 and 23),
  quiet_end smallint not null default 8 check (quiet_end between 0 and 23),
  tz text not null default 'Europe/Brussels',
  radius_km integer not null default 50 check (radius_km between 1 and 500),
  home_lat double precision,
  home_lng double precision,
  home_label text,
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
drop policy if exists notification_prefs_select_own on public.notification_prefs;
create policy notification_prefs_select_own on public.notification_prefs
  for select to authenticated using (user_id = auth.uid());
drop policy if exists notification_prefs_insert_own on public.notification_prefs;
create policy notification_prefs_insert_own on public.notification_prefs
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists notification_prefs_update_own on public.notification_prefs;
create policy notification_prefs_update_own on public.notification_prefs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.notification_prefs from anon;
grant select, insert, update on public.notification_prefs to authenticated;
grant all on public.notification_prefs to service_role;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
revoke all on public.push_subscriptions from anon;
revoke insert, update, delete on public.push_subscriptions from authenticated;
grant select on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;

-- Enregistrer / retirer l'appareil de la personne connectée
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_ua text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, p_ua)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent;
end $$;

create or replace function public.remove_push_subscription(p_endpoint text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
end $$;

revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
revoke execute on function public.remove_push_subscription(text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.remove_push_subscription(text) to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.app_notifications;
exception when others then null;
end $$;

-- ---------------------------------------------------------------------
-- 3) NOTIFICATIONS : fonctions de base (une erreur ici ne bloque JAMAIS une action)
-- ---------------------------------------------------------------------
create or replace function public.actor_name(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select coalesce(nullif(trim(display_name), ''), nullif(trim(username), '')) from public.profiles where user_id = p_user),
    'Quelqu''un');
$$;

create or replace function public.profile_ref(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select nullif(username, '') from public.profiles where user_id = p_user), p_user::text);
$$;

create or replace function public.notif_allowed(p_user uuid, p_kind text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case p_kind
      when 'likes' then likes
      when 'comments' then comments
      when 'follows' then follows
      when 'messages' then messages
      when 'events_nearby' then events_nearby
      when 'event_updates' then event_updates
      when 'event_chat' then event_chat
      else true end
    from public.notification_prefs where user_id = p_user), true);
$$;

-- Crée une notification. Si p_group est vrai, une notification non lue du même type et du
-- même sujet datant de moins de p_window est mise à jour (compteur) au lieu d'en créer une autre.
create or replace function public.push_notif(
  p_user uuid, p_actor uuid, p_type text, p_title text, p_body text, p_url text,
  p_entity uuid default null, p_group boolean default false, p_window interval default interval '2 minutes'
) returns void language plpgsql security definer set search_path = public as $$
declare existing uuid;
begin
  if p_user is null or p_user = p_actor then return; end if;
  if p_group and p_entity is not null then
    select id into existing from public.app_notifications
      where user_id = p_user and type = p_type and entity_id = p_entity and read = false
        and created_at > now() - p_window
      order by created_at desc limit 1;
    if existing is not null then
      update public.app_notifications
        set count = count + 1, body = p_body, created_at = now()
        where id = existing;
      return;
    end if;
  end if;
  insert into public.app_notifications (user_id, actor_id, type, title, body, url, entity_id)
  values (p_user, p_actor, p_type, p_title, p_body, p_url, p_entity);
exception when others then
  null;
end $$;

revoke execute on function public.actor_name(uuid) from public, anon, authenticated;
revoke execute on function public.profile_ref(uuid) from public, anon, authenticated;
revoke execute on function public.notif_allowed(uuid, text) from public, anon, authenticated;
revoke execute on function public.push_notif(uuid, uuid, text, text, text, text, uuid, boolean, interval) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4) NOTIFICATIONS : déclencheurs (j'aime, commentaires, abonnements, messages)
-- ---------------------------------------------------------------------
create or replace function public.likes_counter_trg() returns trigger
language plpgsql security definer set search_path = public as $$
declare pid uuid; aid uuid;
begin
  if tg_op = 'DELETE' then pid := old.post_id; else pid := new.post_id; end if;
  update public.posts set likes_count = (select count(*) from public.likes where post_id = pid) where id = pid;
  if tg_op = 'INSERT' then
    begin
      select author_id into aid from public.posts where id = new.post_id;
      if aid is not null and aid <> new.user_id and public.notif_allowed(aid, 'likes')
         and not exists (select 1 from public.app_notifications
                         where user_id = aid and actor_id = new.user_id and type = 'like' and entity_id = new.post_id) then
        perform public.push_notif(aid, new.user_id, 'like', public.actor_name(new.user_id),
                                  'a aimé ta publication', '/profile', new.post_id);
      end if;
    exception when others then null;
    end;
  end if;
  return null;
end $$;

create or replace function public.comments_counter_trg() returns trigger
language plpgsql security definer set search_path = public as $$
declare pid uuid; aid uuid;
begin
  if tg_op = 'DELETE' then pid := old.post_id; else pid := new.post_id; end if;
  update public.posts set comments_count = (select count(*) from public.comments where post_id = pid) where id = pid;
  if tg_op = 'INSERT' then
    begin
      select author_id into aid from public.posts where id = new.post_id;
      if aid is not null and aid <> new.user_id and public.notif_allowed(aid, 'comments') then
        perform public.push_notif(aid, new.user_id, 'comment', public.actor_name(new.user_id),
                                  'a commenté : ' || left(coalesce(new.content, ''), 80), '/profile', new.post_id,
                                  true, interval '10 minutes');
      end if;
    exception when others then null;
    end;
  end if;
  return null;
end $$;

create or replace function public.followings_notify_trg() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    if public.notif_allowed(new.following_id, 'follows') then
      perform public.push_notif(new.following_id, new.follower_id, 'follow', public.actor_name(new.follower_id),
                                's''est abonné à toi', '/u/' || public.profile_ref(new.follower_id), new.follower_id);
    end if;
  exception when others then null;
  end;
  return null;
end $$;

create or replace function public.messages_notify_trg() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    if public.notif_allowed(new.receiver_id, 'messages') then
      perform public.push_notif(new.receiver_id, new.sender_id, 'message', public.actor_name(new.sender_id),
                                left(coalesce(new.content, ''), 120), '/chat?with=' || new.sender_id::text,
                                new.sender_id, true, interval '2 minutes');
    end if;
  exception when others then null;
  end;
  return null;
end $$;

revoke execute on function public.likes_counter_trg() from public, anon, authenticated;
revoke execute on function public.comments_counter_trg() from public, anon, authenticated;
revoke execute on function public.followings_notify_trg() from public, anon, authenticated;
revoke execute on function public.messages_notify_trg() from public, anon, authenticated;

drop trigger if exists trg_likes_counter on public.likes;
create trigger trg_likes_counter after insert or delete on public.likes
  for each row execute function public.likes_counter_trg();
drop trigger if exists trg_comments_counter on public.comments;
create trigger trg_comments_counter after insert or delete on public.comments
  for each row execute function public.comments_counter_trg();
drop trigger if exists trg_followings_notify on public.followings;
create trigger trg_followings_notify after insert on public.followings
  for each row execute function public.followings_notify_trg();
drop trigger if exists trg_messages_notify on public.messages;
create trigger trg_messages_notify after insert on public.messages
  for each row execute function public.messages_notify_trg();

-- Remet tous les compteurs à la bonne valeur
update public.posts p set
  likes_count = (select count(*) from public.likes l where l.post_id = p.id),
  comments_count = (select count(*) from public.comments c where c.post_id = p.id);

-- ---------------------------------------------------------------------
-- 5) NOTIFICATIONS : rassos (près de chez toi, annulation, nouveau participant)
-- ---------------------------------------------------------------------
create or replace function public.events_nearby_trg() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published' then
    begin
      insert into public.app_notifications (user_id, actor_id, type, title, body, url, entity_id)
      select p.user_id, new.organizer_id, 'event_nearby', 'Nouveau rasso près de chez toi',
             new.title || coalesce(' · ' || nullif(new.city, ''), '') || ' · ' || round(d.km)::int || ' km · '
               || to_char(new.starts_at at time zone 'Europe/Brussels', 'DD/MM HH24:MI'),
             '/map?event=' || new.id::text, new.id
      from public.notification_prefs p
      cross join lateral (
        select 6371 * 2 * asin(least(1, sqrt(
          power(sin(radians(new.latitude - p.home_lat) / 2), 2)
          + cos(radians(p.home_lat)) * cos(radians(new.latitude))
            * power(sin(radians(new.longitude - p.home_lng) / 2), 2)))) as km
      ) d
      where p.events_nearby and p.home_lat is not null and p.home_lng is not null
        and p.user_id <> new.organizer_id and d.km <= p.radius_km;
    exception when others then null;
    end;
  end if;
  return null;
end $$;

create or replace function public.events_cancelled_trg() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from new.status and new.status = 'cancelled' then
    begin
      insert into public.app_notifications (user_id, actor_id, type, title, body, url, entity_id)
      select a.user_id, new.organizer_id, 'event_cancelled', 'Rasso annulé', new.title, '/map', new.id
      from public.event_attendees a
      where a.event_id = new.id and a.user_id <> new.organizer_id
        and public.notif_allowed(a.user_id, 'event_updates');
    exception when others then null;
    end;
  end if;
  return null;
end $$;

create or replace function public.attendees_notify_trg() returns trigger
language plpgsql security definer set search_path = public as $$
declare org uuid; ttl text;
begin
  begin
    select organizer_id, title into org, ttl from public.events where id = new.event_id;
    if org is not null and org <> new.user_id and public.notif_allowed(org, 'event_updates') then
      perform public.push_notif(org, new.user_id, 'event_join', public.actor_name(new.user_id),
                                'participe à « ' || coalesce(ttl, 'ton rasso') || ' »',
                                '/map?event=' || new.event_id::text, new.event_id, true, interval '10 minutes');
    end if;
  exception when others then null;
  end;
  return null;
end $$;

revoke execute on function public.events_nearby_trg() from public, anon, authenticated;
revoke execute on function public.events_cancelled_trg() from public, anon, authenticated;
revoke execute on function public.attendees_notify_trg() from public, anon, authenticated;

drop trigger if exists trg_events_nearby on public.events;
create trigger trg_events_nearby after insert on public.events
  for each row execute function public.events_nearby_trg();
drop trigger if exists trg_events_cancelled on public.events;
create trigger trg_events_cancelled after update of status on public.events
  for each row execute function public.events_cancelled_trg();
drop trigger if exists trg_attendees_notify on public.event_attendees;
create trigger trg_attendees_notify after insert on public.event_attendees
  for each row execute function public.attendees_notify_trg();

-- ---------------------------------------------------------------------
-- 6) DISCUSSION DE RASSO (inscrits + organisateur, fermée 24 h après la fin)
-- ---------------------------------------------------------------------
create or replace function public.event_chat_open(p_event uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event
      and now() < coalesce(e.ends_at, e.starts_at + interval '6 hours') + interval '24 hours'
      and (e.organizer_id = auth.uid()
           or exists (select 1 from public.event_attendees a where a.event_id = e.id and a.user_id = auth.uid()))
  );
$$;
revoke execute on function public.event_chat_open(uuid) from public, anon;
grant execute on function public.event_chat_open(uuid) to authenticated;

create table if not exists public.event_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  sender_id uuid not null references public.profiles(user_id) on delete cascade,
  content text check (content is null or char_length(content) <= 1000),
  media_path text,
  media_type text check (media_type is null or media_type in ('image', 'video')),
  view_once boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists event_messages_event_idx on public.event_messages (event_id, created_at);

create table if not exists public.event_message_views (
  message_id uuid not null references public.event_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.event_messages enable row level security;
alter table public.event_message_views enable row level security;

drop policy if exists event_messages_select on public.event_messages;
create policy event_messages_select on public.event_messages
  for select to authenticated using (public.event_chat_open(event_id));
drop policy if exists event_messages_insert on public.event_messages;
create policy event_messages_insert on public.event_messages
  for insert to authenticated with check (sender_id = auth.uid() and public.event_chat_open(event_id));
drop policy if exists event_messages_delete on public.event_messages;
create policy event_messages_delete on public.event_messages
  for delete to authenticated using (sender_id = auth.uid());
drop policy if exists event_message_views_select on public.event_message_views;
create policy event_message_views_select on public.event_message_views
  for select to authenticated using (user_id = auth.uid());

revoke all on public.event_messages from anon;
revoke all on public.event_message_views from anon;
grant select, insert, delete on public.event_messages to authenticated;
grant select on public.event_message_views to authenticated;
grant all on public.event_messages to service_role;
grant all on public.event_message_views to service_role;

create or replace function public.event_messages_guard_trg() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(new.content), '') = '' and new.media_path is null then
    raise exception 'Message vide.';
  end if;
  if (select count(*) from public.event_messages
        where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Doucement ! 20 messages par minute maximum.';
  end if;
  if new.media_path is not null and (select count(*) from public.event_messages
        where sender_id = new.sender_id and media_path is not null
          and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Limite atteinte : 30 photos/vidéos par heure.';
  end if;
  return new;
end $$;

create or replace function public.event_messages_notify_trg() returns trigger
language plpgsql security definer set search_path = public as $$
declare ttl text; r record; preview text;
begin
  begin
    select title into ttl from public.events where id = new.event_id;
    preview := case when new.media_path is not null
                    then case when new.media_type = 'video' then 'a envoyé une vidéo' else 'a envoyé une photo' end
                    else left(coalesce(new.content, ''), 100) end;
    for r in
      select a.user_id from public.event_attendees a where a.event_id = new.event_id
      union
      select e.organizer_id from public.events e where e.id = new.event_id
    loop
      if r.user_id <> new.sender_id and public.notif_allowed(r.user_id, 'event_chat') then
        perform public.push_notif(r.user_id, new.sender_id, 'event_chat', coalesce(ttl, 'Discussion du rasso'),
                                  public.actor_name(new.sender_id) || ' : ' || preview,
                                  '/map?event=' || new.event_id::text || '&chat=1', new.event_id,
                                  true, interval '10 minutes');
      end if;
    end loop;
  exception when others then null;
  end;
  return null;
end $$;

revoke execute on function public.event_messages_guard_trg() from public, anon, authenticated;
revoke execute on function public.event_messages_notify_trg() from public, anon, authenticated;

drop trigger if exists trg_event_messages_guard on public.event_messages;
create trigger trg_event_messages_guard before insert on public.event_messages
  for each row execute function public.event_messages_guard_trg();
drop trigger if exists trg_event_messages_notify on public.event_messages;
create trigger trg_event_messages_notify after insert on public.event_messages
  for each row execute function public.event_messages_notify_trg();

-- Stockage privé des photos/vidéos de discussion : lecture uniquement via la fonction serveur
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-chat', 'event-chat', false, 31457280,
        array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists event_chat_upload on storage.objects;
create policy event_chat_upload on storage.objects
  for insert to authenticated with check (
    bucket_id = 'event-chat'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.event_chat_open(((storage.foldername(name))[1])::uuid)
  );
drop policy if exists event_chat_delete_own on storage.objects;
create policy event_chat_delete_own on storage.objects
  for delete to authenticated using (
    bucket_id = 'event-chat' and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Nettoyage des discussions terminées (appelé par la fonction serveur toutes les heures)
create or replace function public.expired_event_media() returns table (message_id uuid, media_path text)
language sql stable security definer set search_path = public as $$
  select m.id, m.media_path
  from public.event_messages m join public.events e on e.id = m.event_id
  where m.media_path is not null
    and now() >= coalesce(e.ends_at, e.starts_at + interval '6 hours') + interval '24 hours';
$$;

create or replace function public.purge_expired_event_messages() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with gone as (
    delete from public.event_messages m using public.events e
    where e.id = m.event_id
      and now() >= coalesce(e.ends_at, e.starts_at + interval '6 hours') + interval '24 hours'
    returning m.id
  )
  select count(*) into n from gone;
  return n;
end $$;

revoke execute on function public.expired_event_media() from public, anon, authenticated;
revoke execute on function public.purge_expired_event_messages() from public, anon, authenticated;
grant execute on function public.expired_event_media() to service_role;
grant execute on function public.purge_expired_event_messages() to service_role;

notify pgrst, 'reload schema';
