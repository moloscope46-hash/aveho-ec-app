-- ============================================================
--  AVEHO EC — Patch 0.40.0 (5 modules en une version)
--  Idempotent, à exécuter dans Supabase > SQL Editor.
--
--  1) F - notification_digest_prefs : préférences digest hebdo/quotidien
--  2) F - notification_digest_log : trace des envois pour anti-doublon
--  3) K - signalement_votes : table de votes (1 vote/user/signalement)
--  4) K - signalements.categorie + reponse_notifie : enrichissement table
--  5) L - v_stats_rgpd_heatmap : signatures par jour/heure
--  6) L - v_stats_rgpd_par_finalite : drill par finalité
--  7) L - v_stats_rgpd_renouvellements : alertes consentements à renouveler
-- ============================================================

-- ============================================================
-- F - Notifications digest
-- ============================================================
create table if not exists notification_digest_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  structure_id uuid not null references structures(id) on delete cascade,
  frequence text not null default 'jamais',
  -- 'jamais' | 'quotidien' (8h locale) | 'hebdo' (lundi 8h)
  derniere_envoi timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table notification_digest_prefs enable row level security;
drop policy if exists "digest_prefs_select_own" on notification_digest_prefs;
drop policy if exists "digest_prefs_upsert_own" on notification_digest_prefs;
create policy "digest_prefs_select_own" on notification_digest_prefs for select 
  using (user_id = auth.uid());
create policy "digest_prefs_upsert_own" on notification_digest_prefs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists notification_digest_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  structure_id uuid not null references structures(id) on delete cascade,
  envoyee_le timestamptz default now(),
  type_digest text not null,  -- 'quotidien' | 'hebdo'
  contenu_resume jsonb,
  succes boolean default true,
  erreur text
);
alter table notification_digest_log enable row level security;
drop policy if exists "digest_log_select_own" on notification_digest_log;
create policy "digest_log_select_own" on notification_digest_log for select 
  using (user_id = auth.uid());

create index if not exists idx_digest_log_user on notification_digest_log (user_id, envoyee_le desc);

-- ============================================================
-- K - Signalements enrichis : catégorie + votes
-- ============================================================
-- Ajout colonne catégorie (libre, optionnelle pour catégorisation fine)
alter table signalements add column if not exists categorie text;
alter table signalements add column if not exists nb_votes int default 0;
alter table signalements add column if not exists reponse_notifie boolean default false;

-- Table de votes (1 user vote 1 fois par signalement)
create table if not exists signalement_votes (
  signalement_id uuid not null references signalements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (signalement_id, user_id)
);
alter table signalement_votes enable row level security;
drop policy if exists "votes_select_all" on signalement_votes;
drop policy if exists "votes_insert_own" on signalement_votes;
drop policy if exists "votes_delete_own" on signalement_votes;
create policy "votes_select_all" on signalement_votes for select using (true);
create policy "votes_insert_own" on signalement_votes for insert 
  with check (user_id = auth.uid());
create policy "votes_delete_own" on signalement_votes for delete 
  using (user_id = auth.uid());

-- Trigger pour maintenir nb_votes sur signalements
create or replace function update_signalement_votes() returns trigger
language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update signalements set nb_votes = coalesce(nb_votes, 0) + 1 
    where id = NEW.signalement_id;
  elsif TG_OP = 'DELETE' then
    update signalements set nb_votes = greatest(coalesce(nb_votes, 0) - 1, 0) 
    where id = OLD.signalement_id;
  end if;
  return null;
end;
$$;
drop trigger if exists trg_signalement_votes on signalement_votes;
create trigger trg_signalement_votes 
  after insert or delete on signalement_votes
  for each row execute function update_signalement_votes();

-- ============================================================
-- L - Stats RGPD enrichies
-- ============================================================

-- Vue heatmap RGPD (signatures par jour de semaine × heure)
create or replace view v_stats_rgpd_heatmap as
select 
  structure_id,
  extract(dow from created_at)::int as jour_semaine,
  extract(hour from created_at)::int as heure,
  count(*) as nb_signatures
from consentements_rgpd
where statut = 'signe' 
  and not archive
  and created_at >= now() - interval '90 days'
group by structure_id, jour_semaine, heure;

-- Vue par finalité (combien de patients ont accepté chaque finalité)
create or replace view v_stats_rgpd_par_finalite as
with finalites_unnest as (
  select 
    structure_id,
    unnest(finalites_acceptees) as finalite,
    statut,
    archive,
    created_at
  from consentements_rgpd
  where statut = 'signe' and not archive
)
select 
  structure_id,
  finalite,
  count(*) as nb_acceptations,
  count(*) filter (where created_at >= now() - interval '30 days') as nb_30j,
  count(*) filter (where created_at >= date_trunc('month', current_date)) as nb_ce_mois
from finalites_unnest
group by structure_id, finalite
order by nb_acceptations desc;

-- Vue alertes renouvellements (consentements arrivant à expiration)
-- Par défaut renouvellement annuel à 365 jours
create or replace view v_stats_rgpd_renouvellements as
select 
  structure_id,
  count(*) filter (where created_at < now() - interval '335 days' and created_at >= now() - interval '365 days') as expire_dans_30j,
  count(*) filter (where created_at < now() - interval '350 days' and created_at >= now() - interval '365 days') as expire_dans_15j,
  count(*) filter (where created_at < now() - interval '358 days' and created_at >= now() - interval '365 days') as expire_dans_7j,
  count(*) filter (where created_at < now() - interval '365 days') as expires
from consentements_rgpd
where statut = 'signe' and not archive
group by structure_id;

-- ============================================================
-- FIN DU PATCH 0.40.0
-- ============================================================
-- Vérifications :
--
--   -- Table digest prefs
--   select * from notification_digest_prefs limit 1;
--   
--   -- Table votes
--   select count(*) from signalement_votes;
--   
--   -- Colonnes ajoutées signalements
--   select column_name from information_schema.columns 
--   where table_name='signalements' 
--     and column_name in ('categorie','nb_votes','reponse_notifie');
--
--   -- Vues RGPD nouvelles
--   select * from v_stats_rgpd_heatmap limit 5;
--   select * from v_stats_rgpd_par_finalite limit 5;
--   select * from v_stats_rgpd_renouvellements limit 5;
