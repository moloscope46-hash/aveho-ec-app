-- =============================================================
-- Migration 0.58.75 — Groupements + Étages + Hiérarchie dépôts
-- =============================================================
-- 1) Table groupements (groupements PSAD / FBM / médical)
-- 2) Table etages (nouvelle hiérarchie sous batiments)
-- 3) Extension depots : etage_id, service_id, chambre_id, groupement_id, code, capacite
-- 4) Vue v_depots_hierarchie pour affichage complet
-- =============================================================
-- ⚠ Idempotent : utilise IF NOT EXISTS partout, DROP+CREATE pour RLS

-- ============================================================
-- 1) Table groupements
-- ============================================================
CREATE TABLE IF NOT EXISTS groupements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL,
  nom TEXT NOT NULL,
  code TEXT,                                  -- code interne (ex: "GRP-001")
  type TEXT,                                  -- 'ehpad' | 'hopital' | 'clinique' | 'reseau' | 'maison_sante' | 'autre'
  description TEXT,
  -- Coordonnées juridiques
  siret TEXT,
  finess_juridique TEXT,
  raison_sociale TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  pays TEXT DEFAULT 'France',
  -- Contact
  contact_nom TEXT,
  contact_email TEXT,
  contact_telephone TEXT,
  -- Métadonnées
  couleur TEXT DEFAULT '#7a6fb0',             -- pour affichage UI
  icone TEXT DEFAULT 'ti-building-community',
  notes TEXT,
  actif BOOLEAN DEFAULT true,
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_groupements_structure ON groupements(structure_id);
CREATE INDEX IF NOT EXISTS idx_groupements_actif ON groupements(actif) WHERE actif = true;
CREATE UNIQUE INDEX IF NOT EXISTS uq_groupements_siret ON groupements(structure_id, siret) WHERE siret IS NOT NULL;

ALTER TABLE groupements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "groupements_read_struct" ON groupements;
CREATE POLICY "groupements_read_struct" ON groupements FOR SELECT
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "groupements_write_admin" ON groupements;
CREATE POLICY "groupements_write_admin" ON groupements FOR ALL
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire')))
  WITH CHECK (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire')));

COMMENT ON TABLE groupements IS '0.58.75 - Groupements clients (EHPAD, hôpitaux, cliniques, réseaux de santé)';

-- ============================================================
-- 2) Lien groupement <-> établissements
-- ============================================================
CREATE TABLE IF NOT EXISTS groupement_etablissements (
  groupement_id UUID NOT NULL REFERENCES groupements(id) ON DELETE CASCADE,
  etablissement_id UUID NOT NULL,
  role TEXT,                                   -- 'principal' | 'membre' | 'partenaire'
  date_rattachement DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (groupement_id, etablissement_id)
);

CREATE INDEX IF NOT EXISTS idx_grp_etab_etab ON groupement_etablissements(etablissement_id);

ALTER TABLE groupement_etablissements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grp_etab_read_struct" ON groupement_etablissements;
CREATE POLICY "grp_etab_read_struct" ON groupement_etablissements FOR SELECT
  USING (groupement_id IN (SELECT id FROM groupements WHERE structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "grp_etab_write_admin" ON groupement_etablissements;
CREATE POLICY "grp_etab_write_admin" ON groupement_etablissements FOR ALL
  USING (groupement_id IN (SELECT id FROM groupements WHERE structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire'))))
  WITH CHECK (groupement_id IN (SELECT id FROM groupements WHERE structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire'))));

-- ============================================================
-- 3) Table etages (entre batiments et services/chambres)
-- ============================================================
CREATE TABLE IF NOT EXISTS etages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL,
  batiment_id UUID NOT NULL,
  nom TEXT NOT NULL,                           -- 'Rez-de-chaussée', '1er étage', 'Sous-sol'
  numero INTEGER,                              -- -1, 0, 1, 2, etc.
  couleur TEXT DEFAULT '#7CC8C8',
  icone TEXT DEFAULT 'ti-stairs',
  notes TEXT,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_etages_batiment ON etages(batiment_id);
CREATE INDEX IF NOT EXISTS idx_etages_structure ON etages(structure_id);

ALTER TABLE etages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "etages_read_struct" ON etages;
CREATE POLICY "etages_read_struct" ON etages FOR SELECT
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "etages_write_member" ON etages;
CREATE POLICY "etages_write_member" ON etages FOR ALL
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()))
  WITH CHECK (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

COMMENT ON TABLE etages IS '0.58.75 - Niveau hiérarchique entre bâtiment et service/chambre';

-- Lier chambres aux étages (colonne optionnelle)
ALTER TABLE chambres
  ADD COLUMN IF NOT EXISTS etage_id UUID;

CREATE INDEX IF NOT EXISTS idx_chambres_etage ON chambres(etage_id) WHERE etage_id IS NOT NULL;

-- Lier services aux étages
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS etage_id UUID;

CREATE INDEX IF NOT EXISTS idx_services_etage ON services(etage_id) WHERE etage_id IS NOT NULL;

-- ============================================================
-- 4) Extension depots : hiérarchie complète + métadonnées
-- ============================================================
ALTER TABLE depots
  ADD COLUMN IF NOT EXISTS groupement_id UUID,                       -- groupement gestionnaire
  ADD COLUMN IF NOT EXISTS etage_id UUID,                            -- étage dans le bâtiment
  ADD COLUMN IF NOT EXISTS service_id UUID,                          -- service rattaché
  ADD COLUMN IF NOT EXISTS chambre_id UUID,                          -- chambre spécifique (pour stock chambre)
  ADD COLUMN IF NOT EXISTS code TEXT,                                -- code interne (ex: "DEP-A-001")
  ADD COLUMN IF NOT EXISTS niveau_hierarchique TEXT,                 -- 'groupement' | 'batiment' | 'etage' | 'service' | 'chambre' | 'mobile'
  ADD COLUMN IF NOT EXISTS capacite_max INTEGER,                     -- capacité max (nb articles ou m3)
  ADD COLUMN IF NOT EXISTS temperature_min NUMERIC(4, 1),            -- T° contrôlée min (°C)
  ADD COLUMN IF NOT EXISTS temperature_max NUMERIC(4, 1),            -- T° contrôlée max (°C)
  ADD COLUMN IF NOT EXISTS humidite_max NUMERIC(4, 1),               -- humidité relative max (%)
  ADD COLUMN IF NOT EXISTS securise BOOLEAN DEFAULT false,           -- accès restreint (coffre, médicaments)
  ADD COLUMN IF NOT EXISTS responsable_id UUID,                      -- user responsable
  ADD COLUMN IF NOT EXISTS adresse TEXT,
  ADD COLUMN IF NOT EXISTS code_postal TEXT,
  ADD COLUMN IF NOT EXISTS ville TEXT,
  ADD COLUMN IF NOT EXISTS couleur TEXT DEFAULT '#7CC8C8',
  ADD COLUMN IF NOT EXISTS icone TEXT DEFAULT 'ti-building-warehouse',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_depots_groupement ON depots(groupement_id) WHERE groupement_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_depots_etage ON depots(etage_id) WHERE etage_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_depots_service ON depots(service_id) WHERE service_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_depots_chambre ON depots(chambre_id) WHERE chambre_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_depots_niveau ON depots(niveau_hierarchique);

COMMENT ON COLUMN depots.niveau_hierarchique IS '0.58.75 - Niveau de rattachement du dépôt dans la hiérarchie spatiale';
COMMENT ON COLUMN depots.securise IS '0.58.75 - Accès restreint (médicaments contrôlés, coffres)';

-- ============================================================
-- 5) Extension transferts : multi-source/destination + scan
-- ============================================================
ALTER TABLE transferts
  ADD COLUMN IF NOT EXISTS depot_source_id UUID,
  ADD COLUMN IF NOT EXISTS depot_destination_id UUID,
  ADD COLUMN IF NOT EXISTS chambre_source_id UUID,
  ADD COLUMN IF NOT EXISTS chambre_destination_id UUID,
  ADD COLUMN IF NOT EXISTS service_source_id UUID,
  ADD COLUMN IF NOT EXISTS service_destination_id UUID,
  ADD COLUMN IF NOT EXISTS materiel_id UUID,                         -- pour transfert d'un matériel précis
  ADD COLUMN IF NOT EXISTS scan_source TEXT,                         -- 'manuel' | 'scan_barcode' | 'scan_qr' | 'import'
  ADD COLUMN IF NOT EXISTS priorite TEXT DEFAULT 'normale',          -- 'basse' | 'normale' | 'haute' | 'urgente'
  ADD COLUMN IF NOT EXISTS date_validation TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_reception TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS valide_par UUID,
  ADD COLUMN IF NOT EXISTS recu_par UUID;

CREATE INDEX IF NOT EXISTS idx_transferts_depot_src ON transferts(depot_source_id) WHERE depot_source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transferts_depot_dst ON transferts(depot_destination_id) WHERE depot_destination_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transferts_materiel ON transferts(materiel_id) WHERE materiel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transferts_priorite ON transferts(priorite) WHERE priorite IN ('haute', 'urgente');

-- ============================================================
-- 6) Vue v_depots_hierarchie pour affichage rapide
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
  g.nom AS groupement_nom,
  b.nom AS batiment_nom,
  e.nom AS etage_nom,
  e.numero AS etage_numero,
  s.nom AS service_nom,
  c.numero AS chambre_numero,
  c.nom AS chambre_nom,
  m.nom AS magasin_nom,
  -- Chemin hiérarchique complet
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

COMMENT ON VIEW v_depots_hierarchie IS '0.58.75 - Vue dépôts avec chemin hiérarchique complet (Groupement > Bâtiment > Étage > Service > Chambre)';
