-- ============================================================
--  AVEHO EC — Patch 0.31.0 (Statistiques activité utilisateurs)
--  Idempotent, à exécuter dans Supabase > SQL Editor.
--
--  Crée des vues d'agrégation pour le dashboard "qui fait quoi" :
--   - v_stats_activite_par_user : compteurs par utilisateur
--   - v_stats_activite_par_etab : compteurs par établissement
--   - v_stats_activite_par_jour : activité 90 derniers jours
--   - v_stats_activite_heatmap : matrice jour de la semaine × heure
--   - v_stats_activite_top_actions : top 10 actions par type
-- ============================================================

-- ============================================================
-- 1) Vue : Activité par utilisateur (à partir de audit_log)
-- ============================================================
-- Agrégation cross-tables via audit_log qui est la source de vérité.
-- Compte les actions de création par entité.
-- Top demandeurs / valideurs / receveurs en un seul SELECT.
create or replace view v_stats_activite_par_user as
select 
  a.structure_id,
  a.user_id,
  coalesce(a.user_email, '—') as user_email,
  -- Compteurs par entité (actions de création)
  count(*) filter (where a.action = 'creer' and a.entite = 'intervention') as nb_di_creees,
  count(*) filter (where a.action = 'creer' and a.entite = 'achat') as nb_achats_demandes,
  count(*) filter (where a.action = 'creer' and a.entite = 'transfert') as nb_transferts_crees,
  count(*) filter (where a.action = 'creer' and a.entite = 'patient') as nb_patients_crees,
  count(*) filter (where a.action = 'creer' and a.entite = 'materiel') as nb_materiels_crees,
  count(*) filter (where a.action = 'creer' and a.entite = 'maintenance') as nb_maintenances_creees,
  -- Compteurs par action (workflow)
  count(*) filter (where a.action = 'valider') as nb_validations,
  count(*) filter (where a.action = 'refuser') as nb_refus,
  count(*) filter (where a.action = 'recevoir') as nb_receptions,
  count(*) filter (where a.action = 'cloturer') as nb_cloturees,
  count(*) filter (where a.action = 'modifier') as nb_modifications,
  -- Total et dernière activité
  count(*) as nb_actions_total,
  max(a.created_at) as derniere_action,
  -- Activité récente (7 / 30 jours)
  count(*) filter (where a.created_at >= now() - interval '7 days') as nb_actions_7j,
  count(*) filter (where a.created_at >= now() - interval '30 days') as nb_actions_30j
from audit_log a
where a.user_id is not null
group by a.structure_id, a.user_id, a.user_email
order by nb_actions_total desc;

-- ============================================================
-- 2) Vue : Activité par établissement
-- ============================================================
-- À noter : audit_log a une colonne etablissement_id parfois nullable
-- (cas où l'action n'est pas rattachée à un étab).
create or replace view v_stats_activite_par_etab as
select 
  a.structure_id,
  a.etablissement_id,
  e.nom as etablissement_nom,
  count(*) filter (where a.action = 'creer' and a.entite = 'intervention') as nb_di,
  count(*) filter (where a.action = 'creer' and a.entite = 'achat') as nb_achats,
  count(*) filter (where a.action = 'creer' and a.entite = 'transfert') as nb_transferts,
  count(*) filter (where a.action = 'creer' and a.entite = 'maintenance') as nb_maintenances,
  count(distinct a.user_id) as nb_users_actifs,
  count(*) as nb_actions_total,
  count(*) filter (where a.created_at >= now() - interval '30 days') as nb_actions_30j
from audit_log a
left join etablissements e on e.id = a.etablissement_id
where a.etablissement_id is not null
group by a.structure_id, a.etablissement_id, e.nom
order by nb_actions_total desc;

-- ============================================================
-- 3) Vue : Activité par jour (90 derniers jours)
-- ============================================================
-- Une ligne par jour × structure, avec compteurs par entité.
-- Génère 90 jours même s'il n'y a pas d'activité (left join).
create or replace view v_stats_activite_par_jour as
with jours as (
  select 
    (current_date - (i || ' days')::interval)::date as jour
  from generate_series(0, 89) i
),
struct_jours as (
  select j.jour, s.id as structure_id
  from jours j
  cross join structures s
)
select 
  sj.structure_id,
  sj.jour,
  to_char(sj.jour, 'YYYY-MM-DD') as jour_iso,
  to_char(sj.jour, 'TMDy') as jour_label,
  count(a.id) filter (where a.action = 'creer' and a.entite = 'intervention') as nb_di,
  count(a.id) filter (where a.action = 'creer' and a.entite = 'achat') as nb_achats,
  count(a.id) filter (where a.action = 'creer' and a.entite = 'transfert') as nb_transferts,
  count(a.id) filter (where a.action = 'creer' and a.entite = 'signalement') as nb_signalements,
  count(a.id) as nb_total
from struct_jours sj
left join audit_log a 
  on a.structure_id = sj.structure_id 
  and a.created_at::date = sj.jour
group by sj.structure_id, sj.jour
order by sj.structure_id, sj.jour desc;

-- ============================================================
-- 4) Vue : Heatmap activité (jour de la semaine × heure)
-- ============================================================
-- Matrice 7 × 24 pour identifier les pics d'activité.
-- jour_semaine : 0 = dimanche, 1 = lundi, ..., 6 = samedi
create or replace view v_stats_activite_heatmap as
select 
  structure_id,
  extract(dow from created_at)::int as jour_semaine, -- 0=dim ... 6=sam
  extract(hour from created_at)::int as heure,
  count(*) as nb_actions
from audit_log
where created_at >= now() - interval '90 days'
group by structure_id, jour_semaine, heure
order by structure_id, jour_semaine, heure;

-- ============================================================
-- 5) Vue : Top actions (récap global)
-- ============================================================
create or replace view v_stats_activite_top_actions as
select 
  structure_id,
  action,
  entite,
  count(*) as nb,
  count(distinct user_id) as nb_users_distincts,
  max(created_at) as derniere
from audit_log
where created_at >= now() - interval '90 days'
group by structure_id, action, entite
order by structure_id, nb desc;

-- ============================================================
-- FIN DU PATCH 0.31.0
-- ============================================================
-- Vérifications :
--
--   select * from v_stats_activite_par_user 
--     where structure_id = 'XXX' order by nb_actions_total desc limit 10;
--
--   select * from v_stats_activite_par_etab where structure_id = 'XXX';
--
--   select jour_iso, nb_total from v_stats_activite_par_jour
--     where structure_id = 'XXX' order by jour desc limit 30;
--
--   select jour_semaine, heure, nb_actions from v_stats_activite_heatmap
--     where structure_id = 'XXX' order by nb_actions desc limit 20;
