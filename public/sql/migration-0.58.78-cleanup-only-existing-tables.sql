-- =============================================================
-- Migration 0.58.78 — CLEANUP : on supprime les tables créées en 0.58.75
-- et on ne garde que les ajouts de colonnes sur les tables existantes
-- =============================================================
-- Stratégie : utiliser EXCLUSIVEMENT les tables qui existent déjà
--   (batiments, services, chambres, depots, transferts, magasins)
-- Pas de nouvelles tables.
-- =============================================================

-- ============================================================
-- 1) DROP des tables que j'ai créées en 0.58.75
-- ============================================================
-- IMPORTANT : CASCADE pour supprimer aussi les FK / vues qui en dépendent

DROP VIEW IF EXISTS v_depots_hierarchie CASCADE;

DROP TABLE IF EXISTS groupement_etablissements CASCADE;
DROP TABLE IF EXISTS groupements CASCADE;
DROP TABLE IF EXISTS etages CASCADE;

-- Retirer les colonnes etage_id et groupement_id qui pointaient vers les tables supprimées
ALTER TABLE depots DROP COLUMN IF EXISTS groupement_id;
ALTER TABLE depots DROP COLUMN IF EXISTS etage_id;
ALTER TABLE chambres DROP COLUMN IF EXISTS etage_id;
ALTER TABLE services DROP COLUMN IF EXISTS etage_id;

-- ============================================================
-- 2) Colonnes UTILES qu'on garde sur depots (rattachement à existant)
-- ============================================================
ALTER TABLE depots
  ADD COLUMN IF NOT EXISTS service_id UUID,                          -- rattachement service existant
  ADD COLUMN IF NOT EXISTS chambre_id UUID,                          -- rattachement chambre existante
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS niveau_hierarchique TEXT,                 -- 'batiment' | 'service' | 'chambre' | 'magasin' | 'mobile'
  ADD COLUMN IF NOT EXISTS capacite_max INTEGER,
  ADD COLUMN IF NOT EXISTS temperature_min NUMERIC(4, 1),
  ADD COLUMN IF NOT EXISTS temperature_max NUMERIC(4, 1),
  ADD COLUMN IF NOT EXISTS humidite_max NUMERIC(4, 1),
  ADD COLUMN IF NOT EXISTS securise BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS responsable_id UUID,
  ADD COLUMN IF NOT EXISTS adresse TEXT,
  ADD COLUMN IF NOT EXISTS code_postal TEXT,
  ADD COLUMN IF NOT EXISTS ville TEXT,
  ADD COLUMN IF NOT EXISTS couleur TEXT DEFAULT '#7CC8C8',
  ADD COLUMN IF NOT EXISTS icone TEXT DEFAULT 'ti-building-warehouse',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_depots_service ON depots(service_id) WHERE service_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_depots_chambre ON depots(chambre_id) WHERE chambre_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_depots_niveau ON depots(niveau_hierarchique);

-- ============================================================
-- 3) Colonnes utiles sur transferts (multi-source/destination + scan)
-- ============================================================
ALTER TABLE transferts
  ADD COLUMN IF NOT EXISTS depot_source_id UUID,
  ADD COLUMN IF NOT EXISTS depot_destination_id UUID,
  ADD COLUMN IF NOT EXISTS chambre_source_id UUID,
  ADD COLUMN IF NOT EXISTS chambre_destination_id UUID,
  ADD COLUMN IF NOT EXISTS service_source_id UUID,
  ADD COLUMN IF NOT EXISTS service_destination_id UUID,
  ADD COLUMN IF NOT EXISTS materiel_id UUID,
  ADD COLUMN IF NOT EXISTS scan_source TEXT,
  ADD COLUMN IF NOT EXISTS priorite TEXT DEFAULT 'normale',
  ADD COLUMN IF NOT EXISTS date_validation TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_reception TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS valide_par UUID,
  ADD COLUMN IF NOT EXISTS recu_par UUID;

CREATE INDEX IF NOT EXISTS idx_transferts_depot_src ON transferts(depot_source_id) WHERE depot_source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transferts_depot_dst ON transferts(depot_destination_id) WHERE depot_destination_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transferts_materiel ON transferts(materiel_id) WHERE materiel_id IS NOT NULL;

-- ============================================================
-- 4) Colonnes couleur/icone sur batiments si manquantes (pour UI cohérente)
-- ============================================================
ALTER TABLE batiments
  ADD COLUMN IF NOT EXISTS couleur TEXT DEFAULT '#185FA5',
  ADD COLUMN IF NOT EXISTS icone TEXT DEFAULT 'ti-building';

-- ============================================================
-- 5) Vue v_depots_hierarchie SIMPLIFIÉE
-- Plus de groupement ni d'étage : juste Bâtiment > Service > Chambre
-- ============================================================
CREATE OR REPLACE VIEW v_depots_hierarchie AS
SELECT
  d.id,
  d.nom,
  d.code,
  d.type,
  d.niveau_hierarchique,
  d.actif,
  d.securise,
  d.structure_id,
  d.etablissement_id,
  b.nom AS batiment_nom,
  s.nom AS service_nom,
  c.nom AS chambre_nom,
  m.nom AS magasin_nom,
  CONCAT_WS(' > ',
    b.nom,
    s.nom,
    c.nom,
    m.nom
  ) AS chemin_complet
FROM depots d
LEFT JOIN batiments b ON b.id = d.batiment_id
LEFT JOIN services s ON s.id = d.service_id
LEFT JOIN chambres c ON c.id = d.chambre_id
LEFT JOIN magasins m ON m.id = d.magasin_id;

COMMENT ON VIEW v_depots_hierarchie IS '0.58.78 - Simplifiée : Bâtiment > Service > Chambre > Magasin (sans groupement/etage)';

-- ============================================================
-- 6) Vérification
-- ============================================================
-- SELECT * FROM v_depots_hierarchie LIMIT 5;
-- SELECT COUNT(*) FROM depots WHERE service_id IS NOT NULL;
