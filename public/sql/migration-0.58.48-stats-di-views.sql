-- =============================================================
-- Migration 0.58.48 : (re)création des vues statistiques DI
-- =============================================================
-- À exécuter dans Supabase SQL Editor.
-- Re-crée les 6 vues utilisées par /statistiques-interventions.
-- Si elles existent déjà, le CREATE OR REPLACE met juste à jour.
-- Si une vue manque, elle est créée — fix le 404 sur v_stats_di_top_demandeurs.
-- =============================================================

-- 1) Vue globale (KPIs)
CREATE OR REPLACE VIEW v_stats_di_global AS
WITH stats AS (
  SELECT
    structure_id,
    count(*) AS total,
    count(*) FILTER (WHERE created_at >= date_trunc('month', current_date)) AS nb_ce_mois,
    count(*) FILTER (
      WHERE created_at >= date_trunc('month', current_date) - INTERVAL '1 month'
        AND created_at < date_trunc('month', current_date)
    ) AS nb_mois_dernier,
    count(*) FILTER (WHERE urgence = 'Urgent') AS nb_urgent_total,
    count(*) FILTER (WHERE statut IN ('Résolue', 'Clôturée')) AS nb_resolu,
    count(*) FILTER (WHERE statut NOT IN ('Résolue', 'Clôturée', 'Annulée', 'Refusée')) AS nb_ouvertes,
    count(*) FILTER (WHERE created_at >= now() - INTERVAL '7 days') AS nb_7j,
    count(*) FILTER (WHERE created_at >= now() - INTERVAL '30 days') AS nb_30j
  FROM interventions
  GROUP BY structure_id
)
SELECT
  structure_id, total, nb_ce_mois, nb_mois_dernier,
  nb_urgent_total, nb_resolu, nb_ouvertes, nb_7j, nb_30j,
  CASE WHEN total > 0 THEN round(100.0 * nb_urgent_total / total) ELSE 0 END AS pct_urgent,
  CASE WHEN total > 0 THEN round(100.0 * nb_resolu / total) ELSE 0 END AS pct_resolu
FROM stats;

-- 2) DI par type (top types)
CREATE OR REPLACE VIEW v_stats_di_par_type AS
SELECT
  structure_id,
  coalesce(type, 'Non précisé') AS type,
  count(*) AS nb_total,
  count(*) FILTER (WHERE urgence = 'Urgent') AS nb_urgent,
  count(*) FILTER (WHERE created_at >= now() - INTERVAL '30 days') AS nb_30j
FROM interventions
GROUP BY structure_id, coalesce(type, 'Non précisé')
ORDER BY nb_total DESC;

-- 3) DI par urgence
CREATE OR REPLACE VIEW v_stats_di_par_urgence AS
SELECT
  structure_id,
  coalesce(urgence, 'Normal') AS urgence,
  count(*) AS nb_total,
  count(*) FILTER (WHERE created_at >= now() - INTERVAL '30 days') AS nb_30j
FROM interventions
GROUP BY structure_id, coalesce(urgence, 'Normal');

-- 4) Heatmap création DI (jour de semaine × heure, 90 jours)
CREATE OR REPLACE VIEW v_stats_di_heatmap AS
SELECT
  structure_id,
  extract(dow FROM created_at)::int AS jour_semaine,
  extract(hour FROM created_at)::int AS heure,
  count(*) AS nb_creations
FROM interventions
WHERE created_at >= now() - INTERVAL '90 days'
GROUP BY structure_id, jour_semaine, heure;

-- 5) Top demandeurs DI (créateurs) — ⚠ celle-ci manquait en prod, fix du 404
CREATE OR REPLACE VIEW v_stats_di_top_demandeurs AS
SELECT
  i.structure_id,
  i.created_by AS user_id,
  ue.email AS user_email,
  count(*) AS nb_di,
  count(*) FILTER (WHERE i.urgence = 'Urgent') AS nb_urgent,
  count(*) FILTER (WHERE i.created_at >= now() - INTERVAL '30 days') AS nb_30j
FROM interventions i
LEFT JOIN v_users_emails ue ON ue.user_id = i.created_by
WHERE i.created_by IS NOT NULL
GROUP BY i.structure_id, i.created_by, ue.email;

-- 6) DI par mois (série temporelle)
CREATE OR REPLACE VIEW v_stats_di_par_mois AS
SELECT
  structure_id,
  date_trunc('month', created_at)::date AS mois_debut,
  to_char(created_at, 'YYYY-MM') AS mois_label,
  count(*) AS nb_total,
  count(*) FILTER (WHERE urgence = 'Urgent') AS nb_urgent,
  count(*) FILTER (WHERE statut IN ('Résolue', 'Clôturée')) AS nb_resolu
FROM interventions
WHERE created_at >= now() - INTERVAL '12 months'
GROUP BY structure_id, date_trunc('month', created_at), to_char(created_at, 'YYYY-MM')
ORDER BY mois_debut;

-- =============================================================
-- Vérification post-déploiement (optionnel)
-- =============================================================
-- SELECT viewname FROM pg_views WHERE viewname LIKE 'v_stats_di%' ORDER BY viewname;
-- Attendu : 6 lignes (v_stats_di_global, v_stats_di_par_type, v_stats_di_par_urgence,
--   v_stats_di_heatmap, v_stats_di_top_demandeurs, v_stats_di_par_mois)
