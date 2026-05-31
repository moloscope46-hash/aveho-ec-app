-- ============================================================
--  AVEHO EC — Patch 0.29.0 (Préférences notifications par user)
--  Idempotent, à exécuter dans Supabase > SQL Editor.
-- ============================================================

-- ============================================================
-- 1) Table user_notification_preferences
-- ============================================================
-- Une ligne par utilisateur, stocke en jsonb les types d'events
-- qu'il souhaite recevoir en push.
-- Si absente : on considère que toutes les notifs sont activées (défaut)
create table if not exists user_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  structure_id uuid references structures(id) on delete cascade,
  -- jsonb : { di: true, achat: true, transfert: true, signalement: true,
  --          consent_a_renouveler: true, consent_auto_archive: false, ... }
  prefs jsonb not null default '{}'::jsonb,
  -- Heures silencieuses : { start: "22:00", end: "07:00" } ou null
  quiet_hours jsonb,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 2) RLS
-- ============================================================
alter table user_notification_preferences enable row level security;

drop policy if exists "user_notification_preferences_select_own" on user_notification_preferences;
create policy "user_notification_preferences_select_own"
  on user_notification_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "user_notification_preferences_upsert_own" on user_notification_preferences;
create policy "user_notification_preferences_upsert_own"
  on user_notification_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_notification_preferences_update_own" on user_notification_preferences;
create policy "user_notification_preferences_update_own"
  on user_notification_preferences for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 3) Trigger updated_at auto
-- ============================================================
create or replace function update_user_notif_prefs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tg_user_notif_prefs_updated on user_notification_preferences;
create trigger tg_user_notif_prefs_updated
  before update on user_notification_preferences
  for each row execute function update_user_notif_prefs_updated_at();

-- ============================================================
-- 4) RPC : vérifier si un user accepte un type de notif
-- ============================================================
-- Utilisée côté Edge Function (send-push) avant d'envoyer.
-- Si pas de préférence enregistrée → true (accepte tout par défaut)
create or replace function user_accepts_notif(p_user_id uuid, p_event_type text)
returns boolean
language sql
stable
security definer
as $$
  select coalesce(
    -- Si une préférence explicite false existe pour ce type → refuse
    (
      select (p.prefs ->> p_event_type)::boolean
      from user_notification_preferences p
      where p.user_id = p_user_id
        and p.prefs ? p_event_type
    ),
    -- Sinon (pas de pref ou type pas listé) → accepte
    true
  );
$$;

grant execute on function user_accepts_notif(uuid, text) to authenticated;
grant execute on function user_accepts_notif(uuid, text) to anon;

-- ============================================================
-- FIN DU PATCH 0.29.0
-- ============================================================
-- Vérification :
--
--   -- Ma préférence ?
--   select user_id, prefs, quiet_hours from user_notification_preferences
--   where user_id = auth.uid();
--
--   -- Test RPC :
--   select user_accepts_notif(auth.uid(), 'di');
