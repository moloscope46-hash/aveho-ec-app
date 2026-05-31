-- ============================================================
--  AVEHO EC — Patch 0.17.1 (Push VAPID + Webhooks Teams/Slack)
--  Idempotent, à exécuter dans Supabase > SQL Editor.
-- ============================================================

-- ============================================================
-- 1) Table push_subscriptions
-- ============================================================
-- Stocke les abonnements push VAPID des utilisateurs.
-- Un utilisateur peut avoir plusieurs subscriptions (un par appareil).
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  structure_id uuid not null references structures(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now(),
  last_used_at timestamptz
);
create index if not exists idx_push_user on push_subscriptions (user_id);
create index if not exists idx_push_struct on push_subscriptions (structure_id);

alter table push_subscriptions enable row level security;

drop policy if exists "push_own_select" on push_subscriptions;
drop policy if exists "push_own_insert" on push_subscriptions;
drop policy if exists "push_own_delete" on push_subscriptions;

-- Un user ne voit/écrit que ses propres subscriptions
create policy "push_own_select" on push_subscriptions for select
  using (user_id = auth.uid());
create policy "push_own_insert" on push_subscriptions for insert
  with check (user_id = auth.uid());
create policy "push_own_delete" on push_subscriptions for delete
  using (user_id = auth.uid());

-- ============================================================
-- 2) Colonnes webhook sur structures
-- ============================================================
-- URL des webhooks Teams et Slack par collectivité.
-- Permet de relayer les notifs critiques (DI urgentes, achats validés).
alter table structures
  add column if not exists webhook_teams_url text,
  add column if not exists webhook_slack_url text,
  add column if not exists webhook_filters jsonb default '{"di_urgente":true,"achat_a_valider":true,"signalement":false}'::jsonb;

-- ============================================================
-- 3) Vue pour les Edge Functions (subscriptions actives par structure)
-- ============================================================
create or replace view v_push_targets as
select 
  ps.user_id,
  ps.structure_id,
  ps.endpoint,
  ps.p256dh,
  ps.auth as auth_key,
  ms.nom_affiche
from push_subscriptions ps
join membres_structure ms on ms.user_id = ps.user_id and ms.structure_id = ps.structure_id
where coalesce(ms.actif, true) = true
  and coalesce(ms.archive, false) = false;

-- ============================================================
-- FIN DU PATCH 0.17.1
-- ============================================================
-- Vérifications :
--
--   -- Tables/vues créées ?
--   select tablename from pg_tables where tablename = 'push_subscriptions';
--   select viewname from pg_views where viewname = 'v_push_targets';
--
--   -- Colonnes webhook ajoutées ?
--   select column_name from information_schema.columns 
--   where table_name = 'structures' and column_name like 'webhook%';
--
-- Après l'application du patch, déployer les Edge Functions :
--   supabase functions deploy send-push
--   supabase functions deploy send-webhook
-- Et configurer les secrets :
--   supabase secrets set VAPID_PUBLIC_KEY=<...>
--   supabase secrets set VAPID_PRIVATE_KEY=<...>
--   supabase secrets set VAPID_SUBJECT=mailto:contact@aveho.fr
