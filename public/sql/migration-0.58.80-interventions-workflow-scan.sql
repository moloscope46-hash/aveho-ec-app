-- =============================================================
-- Migration 0.58.80 — Demandes d'intervention : ajouts pour workflow scan
-- Philosophie 0.58.78 : que des ALTER, jamais de nouvelle table
-- =============================================================

-- ============================================================
-- 1) Ajouts sur la table interventions
-- ============================================================
ALTER TABLE interventions
  ADD COLUMN IF NOT EXISTS emplacement TEXT,                       -- libellé précis "Étagère 3, casier B"
  ADD COLUMN IF NOT EXISTS cree_par_scan BOOLEAN DEFAULT false,    -- DI créée depuis le scan d'un QR
  ADD COLUMN IF NOT EXISTS equipe_id UUID,                         -- équipe assignée
  ADD COLUMN IF NOT EXISTS assigne_a UUID,                         -- user assigné (technicien)
  ADD COLUMN IF NOT EXISTS date_assignation TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_demarrage TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_resolution TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_cloture TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cloture_par UUID,
  ADD COLUMN IF NOT EXISTS resolution TEXT,                        -- description de la résolution
  ADD COLUMN IF NOT EXISTS duree_estimee_min INTEGER,
  ADD COLUMN IF NOT EXISTS duree_reelle_min INTEGER,
  ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;       -- array d'URLs photos

CREATE INDEX IF NOT EXISTS idx_interventions_statut ON interventions(statut);
CREATE INDEX IF NOT EXISTS idx_interventions_equipe ON interventions(equipe_id) WHERE equipe_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interventions_assigne ON interventions(assigne_a) WHERE assigne_a IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interventions_urgence ON interventions(urgence);
CREATE INDEX IF NOT EXISTS idx_interventions_depot ON interventions(depot_id) WHERE depot_id IS NOT NULL;

-- ============================================================
-- 2) Vue récapitulative pour le dashboard
-- ============================================================
DROP VIEW IF EXISTS v_interventions_stats CASCADE;

CREATE VIEW v_interventions_stats AS
SELECT
  i.structure_id,
  i.etablissement_id,
  COUNT(*) FILTER (WHERE i.statut = 'Nouvelle')   AS nb_nouvelles,
  COUNT(*) FILTER (WHERE i.statut = 'Planifiée')  AS nb_planifiees,
  COUNT(*) FILTER (WHERE i.statut = 'En cours')   AS nb_en_cours,
  COUNT(*) FILTER (WHERE i.statut = 'Résolue')    AS nb_resolues,
  COUNT(*) FILTER (WHERE i.statut = 'Clôturée')   AS nb_cloturees,
  COUNT(*) FILTER (WHERE i.urgence = 'Critique')  AS nb_critiques,
  COUNT(*) FILTER (WHERE i.urgence = 'Urgent')    AS nb_urgentes,
  COUNT(*) FILTER (WHERE i.cree_par_scan = true)  AS nb_par_scan,
  COUNT(*)                                         AS nb_total
FROM interventions i
GROUP BY i.structure_id, i.etablissement_id;

COMMENT ON VIEW v_interventions_stats IS '0.58.80 - Stats DI par statut/urgence pour dashboard';
