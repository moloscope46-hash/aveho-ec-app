-- ============================================================
--  AVEHO EC — Patch 0.52.0
--  Idempotent, à exécuter dans Supabase > SQL Editor.
--
--  AK - Table app_logs (logs applicatifs côté front)
--  BF - Vue v_digest_stats (agrégation digest envoyés)
-- ============================================================

-- ============================================================
-- AK - Table app_logs
-- Permet aux composants front de logger des événements via API
-- (erreurs, warnings, infos métier hors audit_log) sans polluer
-- l'audit log destiné aux actions traçables.
-- ============================================================
create table if not exists app_logs (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  level text not null default 'info',  -- 'debug' | 'info' | 'warn' | 'error'
  source text,                          -- 'client' | 'sw' | 'cron' | etc.
  message text not null,
  context jsonb,                        -- payload libre (stack trace, url, etc.)
  user_agent text,
  url text,
  created_at timestamptz default now()
);

create index if not exists idx_app_logs_struct_created 
  on app_logs (structure_id, created_at desc);
create index if not exists idx_app_logs_level 
  on app_logs (level, created_at desc) where level in ('warn', 'error');

-- RLS
alter table app_logs enable row level security;

drop policy if exists "app_logs_select_admin" on app_logs;
create policy "app_logs_select_admin"
  on app_logs for select
  using (
    structure_id in (select mes_structures())
    and exists (
      select 1 from membres_structure ms
      join roles r on r.id = ms.role_id
      where ms.user_id = auth.uid()
        and ms.structure_id = app_logs.structure_id
        and (r.nom = 'Administrateur' or r.droits::text ilike '%manage_roles%')
    )
  );

drop policy if exists "app_logs_insert_authenticated" on app_logs;
create policy "app_logs_insert_authenticated"
  on app_logs for insert
  with check (
    structure_id in (select mes_structures())
    or structure_id is null  -- logs côté SW peuvent ne pas connaître la structure
  );

-- ============================================================
-- BF - Vue v_digest_stats
-- Agrège les envois de digest sur 30 jours glissants par structure.
-- ============================================================
create or replace view v_digest_stats as
select 
  structure_id,
  type_digest,
  count(*) filter (where succes = true) as nb_envoyes,
  count(*) filter (where succes = false) as nb_erreurs,
  count(*) as nb_total,
  case 
    when count(*) > 0 then round(100.0 * count(*) filter (where succes = true)::numeric / count(*)::numeric, 1)
    else 0
  end as taux_succes_pct,
  min(envoyee_le) as premier_envoi,
  max(envoyee_le) as dernier_envoi
from notification_digest_log
where envoyee_le >= now() - interval '30 days'
group by structure_id, type_digest;

grant select on v_digest_stats to authenticated;

-- ============================================================
-- BF - Vue v_digest_destinataires_uniques
-- Compte les destinataires uniques par type sur 30 jours.
-- ============================================================
create or replace view v_digest_destinataires_uniques as
select 
  structure_id,
  type_digest,
  count(distinct user_id) as nb_destinataires_uniques
from notification_digest_log
where envoyee_le >= now() - interval '30 days'
  and succes = true
group by structure_id, type_digest;

grant select on v_digest_destinataires_uniques to authenticated;

-- ============================================================
-- Reload PostgREST cache (réflexe 4)
-- ============================================================
notify pgrst, 'reload schema';

-- ============================================================
-- FIN DU PATCH 0.52.0
-- ============================================================
-- Vérifications :
--   select * from app_logs limit 5;
--   select * from v_digest_stats;
--   select * from v_digest_destinataires_uniques;
