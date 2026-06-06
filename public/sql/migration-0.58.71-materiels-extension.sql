-- =============================================================
-- Migration 0.58.71 — Extension matériels + mouvements
-- =============================================================
-- 1) Ajoute colonnes UDI / immobilisation / états étendus à `materiels`
-- 2) Crée la table `materiel_mouvements` pour traçabilité par matériel
--
-- ⚠ Idempotent : safe à ré-exécuter, utilise IF NOT EXISTS partout.
-- ⚠ Compatible PG <17 : pas de CREATE POLICY IF NOT EXISTS
-- =============================================================

-- 1) Extension table materiels
ALTER TABLE materiels
  -- UDI (Unique Device Identification) — norme HAS/FDA pour DM
  ADD COLUMN IF NOT EXISTS udi_di TEXT,                       -- Direct Identifier (GTIN type)
  ADD COLUMN IF NOT EXISTS udi_pi TEXT,                       -- Production Identifier (lot + série + péremption combinés)
  ADD COLUMN IF NOT EXISTS qr_code TEXT,                      -- QR code complet scanné (full GS1-128 ou DataMatrix)
  ADD COLUMN IF NOT EXISTS code_barre_principal TEXT,         -- Code-barres physique principal (EAN13 ou autre)

  -- Immobilisation comptable
  ADD COLUMN IF NOT EXISTS immobilisation_active BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS immobilisation_date_acquisition DATE,
  ADD COLUMN IF NOT EXISTS immobilisation_valeur_acquisition NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS immobilisation_duree_mois INTEGER,  -- durée amortissement en mois
  ADD COLUMN IF NOT EXISTS immobilisation_methode TEXT,        -- 'lineaire' | 'degressif'
  ADD COLUMN IF NOT EXISTS immobilisation_compte TEXT,         -- compte comptable classe 2 (215xxx)
  ADD COLUMN IF NOT EXISTS immobilisation_reference TEXT,      -- N° fiche immobilisation

  -- Métadonnées étendues
  ADD COLUMN IF NOT EXISTS date_mise_en_service DATE,
  ADD COLUMN IF NOT EXISTS date_rebut DATE,                    -- date de mise au rebut
  ADD COLUMN IF NOT EXISTS motif_rebut TEXT,
  ADD COLUMN IF NOT EXISTS fabricant_serie TEXT,               -- série fabricant si différente du SN local
  ADD COLUMN IF NOT EXISTS notes_etat TEXT;                    -- notes libres état/maintenance

-- Note : la colonne `etat` existe déjà. Liste des valeurs étendue (libre, pas de CHECK)
-- afin de ne pas casser l'existant. Valeurs recommandées :
--   'Disponible', 'En patient', 'En SAV', 'Rebut', 'Immobilisé',
--   'Réformé', 'Perdu', 'Volé', 'Détruit', 'En transfert', 'En quarantaine'

CREATE INDEX IF NOT EXISTS idx_materiels_udi_di ON materiels(udi_di) WHERE udi_di IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_materiels_code_barre ON materiels(code_barre_principal) WHERE code_barre_principal IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_materiels_immo ON materiels(immobilisation_active) WHERE immobilisation_active = true;
CREATE INDEX IF NOT EXISTS idx_materiels_date_rebut ON materiels(date_rebut) WHERE date_rebut IS NOT NULL;

COMMENT ON COLUMN materiels.udi_di IS 'UDI Direct Identifier (GTIN, identifiant produit). Norme HAS/FDA pour DM.';
COMMENT ON COLUMN materiels.udi_pi IS 'UDI Production Identifier (lot + série + date péremption concaténés)';
COMMENT ON COLUMN materiels.qr_code IS 'Contenu complet du QR/DataMatrix scanné (avant parsing GS1)';

-- 2) Table materiel_mouvements (parallèle à stock_mouvements mais pour matériel physique)
CREATE TABLE IF NOT EXISTS materiel_mouvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL,
  etablissement_id UUID,
  materiel_id UUID NOT NULL REFERENCES materiels(id) ON DELETE CASCADE,
  type TEXT NOT NULL,    -- 'entree' | 'sortie' | 'transfert' | 'sav_envoi' | 'sav_retour' | 'rebut' | 'reaffectation' | 'changement_etat'
  etat_avant TEXT,
  etat_apres TEXT,
  -- Mouvements liés
  patient_id_avant UUID,
  patient_id_apres UUID,
  depot_id_avant UUID,
  depot_id_apres UUID,
  -- Métadonnées
  motif TEXT,                                  -- raison du mouvement
  notes TEXT,
  reference_externe TEXT,                       -- BL, n° SAV, etc.
  source TEXT,                                  -- 'scan_barcode' | 'manuel' | 'systeme' | 'import'
  user_id UUID,
  user_email TEXT,
  -- Snapshot horaire
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mat_mvts_materiel ON materiel_mouvements(materiel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mat_mvts_structure ON materiel_mouvements(structure_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mat_mvts_type ON materiel_mouvements(type);
CREATE INDEX IF NOT EXISTS idx_mat_mvts_patient ON materiel_mouvements(patient_id_apres) WHERE patient_id_apres IS NOT NULL;

-- RLS
ALTER TABLE materiel_mouvements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mat_mvts_read_struct" ON materiel_mouvements;
CREATE POLICY "mat_mvts_read_struct"
  ON materiel_mouvements FOR SELECT
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "mat_mvts_insert_member" ON materiel_mouvements;
CREATE POLICY "mat_mvts_insert_member"
  ON materiel_mouvements FOR INSERT
  WITH CHECK (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "mat_mvts_update_admin" ON materiel_mouvements;
CREATE POLICY "mat_mvts_update_admin"
  ON materiel_mouvements FOR UPDATE
  USING (
    structure_id IN (
      SELECT structure_id FROM membres_structure
      WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire')
    )
  );

COMMENT ON TABLE materiel_mouvements IS '0.58.71 - Traçabilité des mouvements par matériel physique (états, transferts, SAV, rebut)';

-- 3) Trigger : à chaque UPDATE de materiels.etat ou .patient_id ou .depot_id,
--    on insère automatiquement un mouvement.
CREATE OR REPLACE FUNCTION track_materiel_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Changement d'état
  IF (NEW.etat IS DISTINCT FROM OLD.etat) THEN
    INSERT INTO materiel_mouvements (
      structure_id, etablissement_id, materiel_id, type,
      etat_avant, etat_apres, source
    ) VALUES (
      NEW.structure_id, NEW.etablissement_id, NEW.id, 'changement_etat',
      OLD.etat, NEW.etat, 'systeme'
    );
  END IF;
  -- Réaffectation patient
  IF (NEW.patient_id IS DISTINCT FROM OLD.patient_id) THEN
    INSERT INTO materiel_mouvements (
      structure_id, etablissement_id, materiel_id, type,
      patient_id_avant, patient_id_apres, source
    ) VALUES (
      NEW.structure_id, NEW.etablissement_id, NEW.id, 'reaffectation',
      OLD.patient_id, NEW.patient_id, 'systeme'
    );
  END IF;
  -- Changement de dépôt
  IF (NEW.depot_id IS DISTINCT FROM OLD.depot_id) THEN
    INSERT INTO materiel_mouvements (
      structure_id, etablissement_id, materiel_id, type,
      depot_id_avant, depot_id_apres, source
    ) VALUES (
      NEW.structure_id, NEW.etablissement_id, NEW.id, 'transfert',
      OLD.depot_id, NEW.depot_id, 'systeme'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_materiels_track_changes ON materiels;
CREATE TRIGGER trg_materiels_track_changes
  AFTER UPDATE ON materiels
  FOR EACH ROW
  EXECUTE FUNCTION track_materiel_changes();

COMMENT ON FUNCTION track_materiel_changes IS '0.58.71 - Auto-insert dans materiel_mouvements sur changement etat/patient/depot';
