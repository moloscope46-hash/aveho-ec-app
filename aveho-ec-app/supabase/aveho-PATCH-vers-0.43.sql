-- ============================================================
--  AVEHO EC — Patch 0.43.0
--  Idempotent, à exécuter dans Supabase > SQL Editor.
--
--  1) N - 6 vues stats DI (interventions) calquées sur le modèle activité (0.31)
--  2) J - RPC audit log heatmap filtrable (par action / entité)
-- ============================================================

-- ============================================================
-- N - Stats DI globales (mois courant vs précédent)
-- ============================================================
create or replace view v_stats_di_global as
with stats as (
  select 
    structure_id,
    count(*) as total,
    count(*) filter (where created_at >= date_trunc('month', current_date)) as nb_ce_mois,
    count(*) filter (
      where created_at >= date_trunc('month', current_date) - interval '1 month'
        and created_at < date_trunc('month', current_date)
    ) as nb_mois_dernier,
    count(*) filter (where urgence = 'Urgent') as nb_urgent_total,
    count(*) filter (where statut in ('Résolue', 'Clôturée')) as nb_resolu,
    count(*) filter (where statut not in ('Résolue', 'Clôturée', 'Annulée', 'Refusée')) as nb_ouvertes,
    count(*) filter (where created_at >= now() - interval '7 days') as nb_7j,
    count(*) filter (where created_at >= now() - interval '30 days') as nb_30j
  from interventions
  group by structure_id
)
select 
  structure_id, total, nb_ce_mois, nb_mois_dernier,
  nb_urgent_total, nb_resolu, nb_ouvertes, nb_7j, nb_30j,
  case when total > 0 then round(100.0 * nb_urgent_total / total) else 0 end as pct_urgent,
  case when total > 0 then round(100.0 * nb_resolu / total) else 0 end as pct_resolu
from stats;

-- ============================================================
-- N - DI par type (top types)
-- ============================================================
create or replace view v_stats_di_par_type as
select 
  structure_id,
  coalesce(type, 'Non précisé') as type,
  count(*) as nb_total,
  count(*) filter (where urgence = 'Urgent') as nb_urgent,
  count(*) filter (where created_at >= now() - interval '30 days') as nb_30j
from interventions
group by structure_id, coalesce(type, 'Non précisé')
order by nb_total desc;

-- ============================================================
-- N - DI par urgence
-- ============================================================
create or replace view v_stats_di_par_urgence as
select 
  structure_id,
  coalesce(urgence, 'Normal') as urgence,
  count(*) as nb_total,
  count(*) filter (where created_at >= now() - interval '30 days') as nb_30j
from interventions
group by structure_id, coalesce(urgence, 'Normal');

-- ============================================================
-- N - Heatmap création DI (jour de semaine × heure, 90j)
-- ============================================================
create or replace view v_stats_di_heatmap as
select 
  structure_id,
  extract(dow from created_at)::int as jour_semaine,
  extract(hour from created_at)::int as heure,
  count(*) as nb_creations
from interventions
where created_at >= now() - interval '90 days'
group by structure_id, jour_semaine, heure;

-- ============================================================
-- N - Top demandeurs DI (créateurs)
-- ============================================================
create or replace view v_stats_di_top_demandeurs as
select 
  i.structure_id,
  i.created_by as user_id,
  ue.email as user_email,
  count(*) as nb_di,
  count(*) filter (where i.urgence = 'Urgent') as nb_urgent,
  count(*) filter (where i.created_at >= now() - interval '30 days') as nb_30j
from interventions i
left join v_users_emails ue on ue.user_id = i.created_by
where i.created_by is not null
group by i.structure_id, i.created_by, ue.email;

-- ============================================================
-- N - DI par mois (12 derniers mois pour trend chart)
-- ============================================================
create or replace view v_stats_di_par_mois as
with months as (
  select generate_series(
    date_trunc('month', current_date) - interval '11 months',
    date_trunc('month', current_date),
    '1 month'::interval
  )::date as mois_debut
)
select 
  i.structure_id,
  m.mois_debut,
  to_char(m.mois_debut, 'TMMon YYYY') as mois_label,
  count(i.id) as nb_total,
  count(i.id) filter (where i.urgence = 'Urgent') as nb_urgent,
  count(i.id) filter (where i.statut in ('Résolue', 'Clôturée')) as nb_resolu
from months m
cross join (select distinct structure_id from interventions) s
left join interventions i 
  on i.structure_id = s.structure_id
  and i.created_at >= m.mois_debut
  and i.created_at < m.mois_debut + interval '1 month'
group by i.structure_id, m.mois_debut, s.structure_id
order by m.mois_debut;

-- ============================================================
-- J - RPC drill heatmap audit log (filtré par action/entite optionnels)
-- ============================================================
-- Retourne la heatmap (dow × heure) sur 90j, optionnellement filtrée par action ou entité.
create or replace function get_audit_heatmap(
  p_structure_id uuid,
  p_action text default null,
  p_entite text default null,
  p_jours int default 90
)
returns table (
  jour_semaine int,
  heure int,
  nb_actions bigint
)
language sql
stable
security invoker
as $$
  select 
    extract(dow from created_at)::int as jour_semaine,
    extract(hour from created_at)::int as heure,
    count(*) as nb_actions
  from audit_log
  where structure_id = p_structure_id
    and created_at >= now() - (p_jours || ' days')::interval
    and (p_action is null or action = p_action)
    and (p_entite is null or entite = p_entite)
  group by jour_semaine, heure;
$$;
grant execute on function get_audit_heatmap(uuid, text, text, int) to authenticated;

-- ============================================================
-- FIN DU PATCH 0.43.0
-- ============================================================
-- Vérifications :
--   select * from v_stats_di_global 
--   where structure_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
--
--   select * from v_stats_di_heatmap 
--   where structure_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' limit 5;
--
--   select * from get_audit_heatmap(
--     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'creer', 'di', 30);
