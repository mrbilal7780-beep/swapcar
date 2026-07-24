-- =====================================================================
-- TORQUE — verrouillage RLS
-- A coller dans Supabase > SQL Editor > New query > Run.
--
-- Constat : un simple insert avec la cle publique (anon), sans session
-- utilisateur, a reussi sur `posts` en se faisant passer pour n'importe
-- quel author_id. Ca veut dire qu'au moins une table accepte des
-- ecritures sans verifier que l'auteur est bien l'utilisateur connecte.
-- Ce script repart d'une base propre : il supprime TOUTES les policies
-- existantes sur les tables listees puis les recree avec des regles
-- minimales et correctes (lecture publique, ecriture reservee au
-- proprietaire de la ligne).
--
-- A verifier apres coup : que tu peux toujours poster, liker, suivre,
-- creer un rassemblement, etc. normalement en etant connecte.
-- =====================================================================

-- 1) Repartir d'un etat propre : supprime toutes les policies existantes
--    sur ces tables (quel que soit leur nom actuel).
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles','posts','likes','comments','followings',
        'vehicles','events','event_attendees','messages'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

-- 2) S'assurer que RLS est bien actif partout
alter table public.profiles        enable row level security;
alter table public.posts           enable row level security;
alter table public.likes           enable row level security;
alter table public.comments        enable row level security;
alter table public.followings      enable row level security;
alter table public.vehicles        enable row level security;
alter table public.events          enable row level security;
alter table public.event_attendees enable row level security;
alter table public.messages        enable row level security;

-- 3) profiles — lecture publique, modification seulement de sa propre fiche
create policy "profiles_select_all" on public.profiles
  for select using (true);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4) posts — lecture publique, ecriture seulement par l'auteur
create policy "posts_select_all" on public.posts
  for select using (true);
create policy "posts_insert_own" on public.posts
  for insert with check (auth.uid() = author_id);
create policy "posts_update_own" on public.posts
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "posts_delete_own" on public.posts
  for delete using (auth.uid() = author_id);

-- 5) likes — lecture publique, un utilisateur ne gere que ses propres likes
create policy "likes_select_all" on public.likes
  for select using (true);
create policy "likes_insert_own" on public.likes
  for insert with check (auth.uid() = user_id);
create policy "likes_delete_own" on public.likes
  for delete using (auth.uid() = user_id);

-- 6) comments — lecture publique, un utilisateur ne gere que ses propres commentaires
create policy "comments_select_all" on public.comments
  for select using (true);
create policy "comments_insert_own" on public.comments
  for insert with check (auth.uid() = user_id);
create policy "comments_delete_own" on public.comments
  for delete using (auth.uid() = user_id);

-- 7) followings — lecture publique, seul le follower gere sa relation
create policy "followings_select_all" on public.followings
  for select using (true);
create policy "followings_insert_own" on public.followings
  for insert with check (auth.uid() = follower_id);
create policy "followings_delete_own" on public.followings
  for delete using (auth.uid() = follower_id);

-- 8) vehicles — lecture publique, ecriture seulement par le proprietaire
create policy "vehicles_select_all" on public.vehicles
  for select using (true);
create policy "vehicles_insert_own" on public.vehicles
  for insert with check (auth.uid() = owner_id);
create policy "vehicles_update_own" on public.vehicles
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "vehicles_delete_own" on public.vehicles
  for delete using (auth.uid() = owner_id);

-- 9) events — lecture publique, ecriture seulement par l'organisateur
create policy "events_select_all" on public.events
  for select using (true);
create policy "events_insert_own" on public.events
  for insert with check (auth.uid() = organizer_id);
create policy "events_update_own" on public.events
  for update using (auth.uid() = organizer_id) with check (auth.uid() = organizer_id);
create policy "events_delete_own" on public.events
  for delete using (auth.uid() = organizer_id);

-- 10) event_attendees — lecture publique, chacun gere sa propre participation
create policy "event_attendees_select_all" on public.event_attendees
  for select using (true);
create policy "event_attendees_insert_own" on public.event_attendees
  for insert with check (auth.uid() = user_id);
create policy "event_attendees_delete_own" on public.event_attendees
  for delete using (auth.uid() = user_id);

-- 11) messages — prive : seuls l'expediteur et le destinataire peuvent lire,
--     seul l'expediteur peut ecrire en son nom
create policy "messages_select_own" on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "messages_insert_own" on public.messages
  for insert with check (auth.uid() = sender_id);
