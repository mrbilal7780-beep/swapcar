-- Détection automatique des rassos près de soi (à lancer une fois)
alter table public.notification_prefs add column if not exists auto_locate boolean not null default false;
alter table public.notification_prefs add column if not exists home_updated_at timestamptz;
notify pgrst, 'reload schema';
