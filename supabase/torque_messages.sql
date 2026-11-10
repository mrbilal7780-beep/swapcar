-- =====================================================================
-- TORQUE : photos/vidéos privées dans les messages, alerte à CHAQUE message,
-- suppression propre d'une publication.
-- A lancer une fois dans Supabase > SQL Editor (peut être relancé sans danger).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) MESSAGES PRIVÉS : colonnes pour les médias
-- ---------------------------------------------------------------------
alter table public.messages add column if not exists media_path text;
alter table public.messages add column if not exists media_type text;
alter table public.messages add column if not exists view_once boolean not null default false;

-- Un message peut n'avoir qu'une photo, sans texte
do $$ begin
  alter table public.messages alter column content drop not null;
exception when others then null;
end $$;

-- Qui a ouvert quelle vue unique (écrit uniquement par la fonction serveur)
create table if not exists public.message_views (
  message_id text not null,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
alter table public.message_views enable row level security;
drop policy if exists message_views_select_own on public.message_views;
create policy message_views_select_own on public.message_views
  for select to authenticated using (user_id = auth.uid());
revoke all on public.message_views from anon;
revoke insert, update, delete on public.message_views from authenticated;
grant select on public.message_views to authenticated;
grant all on public.message_views to service_role;

-- Garde-fous à l'envoi : fichier réellement à soi, pas de spam
create or replace function public.messages_guard_trg() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.media_path is not null then
    if split_part(new.media_path, '/', 1) <> new.sender_id::text then
      raise exception 'Fichier invalide.';
    end if;
    if new.media_type is null or new.media_type not in ('image', 'video') then
      raise exception 'Type de média invalide.';
    end if;
    if (select count(*) from public.messages
          where sender_id = new.sender_id and media_path is not null
            and created_at > now() - interval '1 hour') >= 40 then
      raise exception 'Limite atteinte : 40 photos/vidéos par heure.';
    end if;
  else
    new.view_once := false;
    new.media_type := null;
  end if;
  if coalesce(trim(new.content), '') = '' and new.media_path is null then
    raise exception 'Message vide.';
  end if;
  if (select count(*) from public.messages
        where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 40 then
    raise exception 'Doucement ! 40 messages par minute maximum.';
  end if;
  return new;
end $$;
revoke execute on function public.messages_guard_trg() from public, anon, authenticated;
drop trigger if exists trg_messages_guard on public.messages;
create trigger trg_messages_guard before insert on public.messages
  for each row execute function public.messages_guard_trg();

-- Stockage privé des médias de messages
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-media', 'chat-media', false, 31457280,
        array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists chat_media_upload on storage.objects;
create policy chat_media_upload on storage.objects
  for insert to authenticated with check (
    bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists chat_media_delete_own on storage.objects;
create policy chat_media_delete_own on storage.objects
  for delete to authenticated using (
    bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------
-- 2) ALERTE A CHAQUE MESSAGE (une notification par message, instantanée)
-- ---------------------------------------------------------------------
create or replace function public.messages_notify_trg() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    if public.notif_allowed(new.receiver_id, 'messages') then
      perform public.push_notif(
        new.receiver_id, new.sender_id, 'message', public.actor_name(new.sender_id),
        case when new.media_path is not null
             then case when new.media_type = 'video' then 'a envoyé une vidéo' else 'a envoyé une photo' end
             else left(coalesce(new.content, ''), 120) end,
        '/chat?with=' || new.sender_id::text, new.sender_id, false);
    end if;
  exception when others then null;
  end;
  return null;
end $$;
revoke execute on function public.messages_notify_trg() from public, anon, authenticated;

-- Messages reçus en direct dans l'app
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when others then null;
end $$;

-- ---------------------------------------------------------------------
-- 3) SUPPRIMER UNE PUBLICATION proprement (j'aime, commentaires, alertes, puis la publication)
-- ---------------------------------------------------------------------
create or replace function public.delete_my_post(p_post uuid) returns text[]
language plpgsql security definer set search_path = public as $$
declare aid uuid; urls text[];
begin
  select author_id, media_urls into aid, urls from public.posts where id = p_post;
  if aid is null then return array[]::text[]; end if;
  if aid <> auth.uid() then raise exception 'Tu ne peux supprimer que tes propres publications.'; end if;
  delete from public.likes where post_id = p_post;
  delete from public.comments where post_id = p_post;
  delete from public.app_notifications where entity_id = p_post and type in ('like', 'comment');
  delete from public.posts where id = p_post;
  return coalesce(urls, array[]::text[]);
end $$;
revoke execute on function public.delete_my_post(uuid) from public, anon;
grant execute on function public.delete_my_post(uuid) to authenticated;

notify pgrst, 'reload schema';
