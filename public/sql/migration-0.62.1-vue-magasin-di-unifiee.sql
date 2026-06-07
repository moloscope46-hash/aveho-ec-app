-- =============================================================
-- migration-0.62.1-vue-magasin-di-unifiee.sql
-- Étend v_magasin_di pour inclure AUSSI les interventions
-- (DI créées depuis /interventions côté EC)
-- + ajout magasin_id sur interventions
-- 100% idempotent
-- =============================================================

-- 1. Ajout magasin_id sur interventions (si pas déjà fait)
ALTER TABLE IF EXISTS interventions
  ADD COLUMN IF NOT EXISTS magasin_id UUID;

CREATE INDEX IF NOT EXISTS idx_interventions_magasin ON interventions(magasin_id) WHERE magasin_id IS NOT NULL;

-- 2. Vue v_magasin_di unifiée : demandes_internes + interventions
DROP VIEW IF EXISTS v_magasin_di;

CREATE VIEW v_magasin_di AS
-- Branche 1 : Demandes internes classiques
SELECT
  d.id,
  d.numero,
  d.created_at,
  d.statut,
  d.priorite,
  d.magasin_id,
  d.depot_destination_id,
  d.structure_id,
  d.commentaire,
  d.numero_bl,
  d.created_by,
  d.type_demande,
  d.panne_description,
  'demande_interne' AS source_table,
  (SELECT COUNT(*) FROM demandes_internes_lignes WHERE demande_id = d.id) AS nb_lignes,
  (SELECT SUM(quantite_demandee) FROM demandes_internes_lignes WHERE demande_id = d.id) AS qte_totale
FROM demandes_internes d
WHERE d.magasin_id IS NOT NULL

UNION ALL

-- Branche 2 : Interventions (DI depuis page /interventions)
SELECT
  i.id,
  i.numero,
  i.created_at,
  i.statut,
  NULL AS priorite,
  i.magasin_id,
  i.depot_id AS depot_destination_id,
  i.structure_id,
  i.description AS commentaire,
  NULL AS numero_bl,
  i.created_by,
  COALESCE(i.type, 'intervention') AS type_demande,
  i.description AS panne_description,
  'intervention' AS source_table,
  1 AS nb_lignes,
  1 AS qte_totale
FROM interventions i
WHERE i.magasin_id IS NOT NULL

ORDER BY created_at DESC;

-- Vérif
SELECT 'v_magasin_di OK' AS info, COUNT(*) AS rows_total FROM v_magasin_di;
