-- ============================================================
--  AVEHO EC — Patch 0.47.0
--  Idempotent, à exécuter dans Supabase > SQL Editor.
--
--  AM - Vue agrégée stats multi-structures (dashboard direction)
-- ============================================================

-- ============================================================
-- AM - Vue stats par structure (totaux à date)
-- ============================================================
-- Réutilise les vues v_stats_di_global et v_stats_activite_par_user
-- existantes pour agréger côté structure.
create or replace view v_direction_par_structure as
select
  s.id as structure_id,
  s.nom as structure_nom,
  s.type as structure_type,
  s.ville as structure_ville,
  -- DI
  coalesce(gdi.total, 0) as nb_di_total,
  coalesce(gdi.nb_ce_mois, 0) as nb_di_ce_mois,
  coalesce(gdi.nb_ouvertes, 0) as nb_di_ouvertes,
  coalesce(gdi.nb_urgent_total, 0) as nb_di_urgent,
  coalesce(gdi.pct_resolu, 0) as pct_resolu,
  -- Patients
  (select count(*) from patients where structure_id = s.id) as nb_patients,
  -- Matériels
  (select count(*) from materiels where structure_id = s.id) as nb_materiels,
  -- Utilisateurs actifs (30 derniers jours via audit_log)
  (select count(distinct user_id) from audit_log 
   where structure_id = s.id 
     and user_id is not null 
     and created_at >= now() - interval '30 days') as nb_users_actifs_30j,
  -- Maintenances en retard
  (select count(*) from maintenances 
   where structure_id = s.id and statut = 'En retard') as nb_maint_retard,
  -- Signalements non traités
  (select count(*) from signalements 
   where structure_id = s.id 
     and statut not in ('Traité', 'Archivé')) as nb_signal_ouvert,
  -- Date dernière activité (toute action)
  (select max(created_at) from audit_log where structure_id = s.id) as derniere_activite
from structures s
left join v_stats_di_global gdi on gdi.structure_id = s.id;

grant select on v_direction_par_structure to authenticated;

-- ============================================================
-- AM - Vue totaux globaux (somme cross-structures du user)
-- ============================================================
-- Restreinte aux structures dont l'user est membre (via membres_structure).
-- Permet à un admin multi-structures de voir les chiffres consolidés.
create or replace view v_direction_totaux as
select
  ms.user_id,
  count(distinct ms.structure_id) as nb_structures,
  sum(dps.nb_di_total) as nb_di_total,
  sum(dps.nb_di_ce_mois) as nb_di_ce_mois,
  sum(dps.nb_di_ouvertes) as nb_di_ouvertes,
  sum(dps.nb_di_urgent) as nb_di_urgent,
  sum(dps.nb_patients) as nb_patients,
  sum(dps.nb_materiels) as nb_materiels,
  sum(dps.nb_users_actifs_30j) as nb_users_actifs_30j,
  sum(dps.nb_maint_retard) as nb_maint_retard,
  sum(dps.nb_signal_ouvert) as nb_signal_ouvert,
  max(dps.derniere_activite) as derniere_activite
from membres_structure ms
join v_direction_par_structure dps on dps.structure_id = ms.structure_id
group by ms.user_id;

grant select on v_direction_totaux to authenticated;

-- ============================================================
-- Reload PostgREST schema cache (réflexe 0.43)
-- ============================================================
notify pgrst, 'reload schema';

-- ============================================================
-- FIN DU PATCH 0.47.0
-- ============================================================
-- Vérifications :
--   -- Stats par structure
--   select * from v_direction_par_structure limit 5;
--
--   -- Totaux du user courant (à exécuter en tant qu'user authentifié)
--   select * from v_direction_totaux where user_id = auth.uid();
