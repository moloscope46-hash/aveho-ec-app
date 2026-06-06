-- =============================================================
-- Migration 0.58.77 — FIX idempotent du SQL 0.58.75
-- =============================================================
-- Cas de figure : tu as appliqué 0.58.75 mais ça a foiré au CREATE VIEW
-- car `etages.numero` n'existait pas. C'est parce que la table etages
-- existait déjà dans ta DB (créée par un autre process / autre migration).
--
-- Ce script :
-- 1. Ajoute toutes les colonnes manquantes sur etages (idempotent)
-- 2. S'assure que les autres ALTER se sont bien passés
-- 3. Recrée la vue v_depots_hierarchie
-- 4. Re-tente la création de groupements si elle n'existe pas
-- =============================================================

-- ============================================================
-- 1) Récupération etages : ajoute colonnes manquantes
-- ============================================================
ALTER TABLE etages
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS batiment_id UUID,
  ADD COLUMN IF NOT EXISTS nom TEXT,
  ADD COLUMN IF NOT EXISTS numero INTEGER,
  ADD COLUMN IF NOT EXISTS couleur TEXT DEFAULT '#7CC8C8',
  ADD COLUMN IF NOT EXISTS icone TEXT DEFAULT 'ti-stairs',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_etages_batiment ON etages(batiment_id);
CREATE INDEX IF NOT EXISTS idx_etages_structure ON etages(structure_id);

-- ============================================================
-- 2) Récupération groupements : recrée si absente
-- ============================================================
CREATE TABLE IF NOT EXISTS groupements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL,
  nom TEXT NOT NULL,
  code TEXT,
  type TEXT,
  description TEXT,
  siret TEXT,
  finess_juridique TEXT,
  raison_sociale TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  pays TEXT DEFAULT 'France',
  contact_nom TEXT,
  contact_email TEXT,
  contact_telephone TEXT,
  couleur TEXT DEFAULT '#7a6fb0',
  icone TEXT DEFAULT 'ti-building-community',
  notes TEXT,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_groupements_structure ON groupements(structure_id);

ALTER TABLE groupements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "groupements_read_struct" ON groupements;
CREATE POLICY "groupements_read_struct" ON groupements FOR SELECT
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "groupements_write_admin" ON groupements;
CREATE POLICY "groupements_write_admin" ON groupements FOR ALL
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire')))
  WITH CHECK (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire')));

-- ============================================================
-- 3) RLS etages
-- ============================================================
ALTER TABLE etages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "etages_read_struct" ON etages;
CREATE POLICY "etages_read_struct" ON etages FOR SELECT
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "etages_write_member" ON etages;
CREATE POLICY "etages_write_member" ON etages FOR ALL
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()))
  WITH CHECK (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

-- ============================================================
-- 4) Récupération chambres + services : ajoute etage_id si manquant
-- ============================================================
ALTER TABLE chambres ADD COLUMN IF NOT EXISTS etage_id UUID;
ALTER TABLE services ADD COLUMN IF NOT EXISTS etage_id UUID;

CREATE INDEX IF NOT EXISTS idx_chambres_etage ON chambres(etage_id) WHERE etage_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_services_etage ON services(etage_id) WHERE etage_id IS NOT NULL;

-- ============================================================
-- 5) Récupération depots : ajoute toutes colonnes 0.58.75
-- ============================================================
ALTER TABLE depots
  ADD COLUMN IF NOT EXISTS groupement_id UUID,
  ADD COLUMN IF NOT EXISTS etage_id UUID,
  ADD COLUMN IF NOT EXISTS service_id UUID,
  ADD COLUMN IF NOT EXISTS chambre_id UUID,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS niveau_hierarchique TEXT,
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

-- ============================================================
-- 6) Récupération transferts : ajoute toutes colonnes 0.58.75
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

-- ============================================================
-- 7) Récupération batiments : ajoute couleur/icone si manquants
-- ============================================================
ALTER TABLE batiments
  ADD COLUMN IF NOT EXISTS couleur TEXT DEFAULT '#185FA5',
  ADD COLUMN IF NOT EXISTS icone TEXT DEFAULT 'ti-building';

-- ============================================================
-- 8) Lien groupement <-> établissements (table absente probable)
-- ============================================================
CREATE TABLE IF NOT EXISTS groupement_etablissements (
  groupement_id UUID NOT NULL REFERENCES groupements(id) ON DELETE CASCADE,
  etablissement_id UUID NOT NULL,
  role TEXT,
  date_rattachement DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (groupement_id, etablissement_id)
);

ALTER TABLE groupement_etablissements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grp_etab_read_struct" ON groupement_etablissements;
CREATE POLICY "grp_etab_read_struct" ON groupement_etablissements FOR SELECT
  USING (groupement_id IN (SELECT id FROM groupements WHERE structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid())));

-- ============================================================
-- 9) RECREATE la vue v_depots_hierarchie (maintenant que etages.numero existe)
-- ============================================================
DROP VIEW IF EXISTS v_depots_hierarchie;

CREATE VIEW v_depots_hierarchie AS
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
  g.nom AS groupement_nom,
  b.nom AS batiment_nom,
  e.nom AS etage_nom,
  e.numero AS etage_numero,
  s.nom AS service_nom,
  c.numero AS chambre_numero,
  c.nom AS chambre_nom,
  m.nom AS magasin_nom,
  CONCAT_WS(' > ',
    g.nom,
    b.nom,
    CASE WHEN e.numero IS NOT NULL THEN CONCAT('Étage ', e.numero) ELSE e.nom END,
    s.nom,
    CASE WHEN c.numero IS NOT NULL THEN CONCAT('Ch. ', c.numero) ELSE c.nom END
  ) AS chemin_complet
FROM depots d
LEFT JOIN groupements g ON g.id = d.groupement_id
LEFT JOIN batiments b ON b.id = d.batiment_id
LEFT JOIN etages e ON e.id = d.etage_id
LEFT JOIN services s ON s.id = d.service_id
LEFT JOIN chambres c ON c.id = d.chambre_id
LEFT JOIN magasins m ON m.id = d.magasin_id;

COMMENT ON VIEW v_depots_hierarchie IS '0.58.77 - Recréée idempotemment (après échec 0.58.75 sur etages.numero)';

-- ============================================================
-- 10) Vérification — exécute pour confirmer
-- ============================================================
-- SELECT 'groupements' AS table_name, COUNT(*) FROM groupements UNION ALL
-- SELECT 'etages', COUNT(*) FROM etages UNION ALL
-- SELECT 'v_depots_hierarchie', COUNT(*) FROM v_depots_hierarchie;
