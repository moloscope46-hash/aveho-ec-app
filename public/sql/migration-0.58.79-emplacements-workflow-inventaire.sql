-- =============================================================
-- Migration 0.58.79 — Emplacements (sous-dépôt) + Workflow transferts
-- =============================================================
-- Apporte :
-- 1. Table `emplacements` (sous-niveau de dépôt avec QR)
-- 2. Colonne `materiels.emplacement_id` (rangement précis)
-- 3. Colonnes workflow sur `transferts` (statut, scan source, scan destination)
-- 4. Table `inventaires` + `inventaires_lignes` (campagne d'inventaire scan)
-- =============================================================

-- ============================================================
-- 1) Table EMPLACEMENTS — sous-niveau de dépôt
-- ============================================================
-- Permet de subdiviser un dépôt en zones précises (étagère A, casier 3, etc.)
-- Chaque emplacement a son propre QR imprimable
CREATE TABLE IF NOT EXISTS emplacements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL,
  depot_id UUID NOT NULL REFERENCES depots(id) ON DELETE CASCADE,
  code TEXT,                                       -- ex: A-01, B-12, ÉTAGÈRE-3
  nom TEXT NOT NULL,                               -- ex: "Étagère A, casier 1"
  position TEXT,                                   -- ex: "Rang 2, niveau bas"
  capacite_max INTEGER,                            -- nb d'articles max
  couleur TEXT DEFAULT '#7CC8C8',
  icone TEXT DEFAULT 'ti-box',
  notes TEXT,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_emplacements_depot ON emplacements(depot_id);
CREATE INDEX IF NOT EXISTS idx_emplacements_structure ON emplacements(structure_id);
CREATE INDEX IF NOT EXISTS idx_emplacements_code ON emplacements(code) WHERE code IS NOT NULL;

ALTER TABLE emplacements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "emp_read_struct" ON emplacements;
CREATE POLICY "emp_read_struct" ON emplacements FOR SELECT
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "emp_write_member" ON emplacements;
CREATE POLICY "emp_write_member" ON emplacements FOR ALL
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()))
  WITH CHECK (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

-- ============================================================
-- 2) Ajout emplacement_id sur materiels
-- ============================================================
ALTER TABLE materiels ADD COLUMN IF NOT EXISTS emplacement_id UUID;
CREATE INDEX IF NOT EXISTS idx_materiels_emplacement ON materiels(emplacement_id) WHERE emplacement_id IS NOT NULL;

-- ============================================================
-- 3) Workflow transferts complet (statut + scans + dates)
-- ============================================================
ALTER TABLE transferts
  ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'demande',  -- demande | en_cours | livre | annule
  ADD COLUMN IF NOT EXISTS scan_source_at TIMESTAMPTZ,     -- horodatage scan départ
  ADD COLUMN IF NOT EXISTS scan_source_by UUID,             -- qui a scanné en sortie
  ADD COLUMN IF NOT EXISTS scan_dest_at TIMESTAMPTZ,        -- horodatage scan arrivée
  ADD COLUMN IF NOT EXISTS scan_dest_by UUID,               -- qui a scanné à destination
  ADD COLUMN IF NOT EXISTS emplacement_source_id UUID,      -- emplacement précis source
  ADD COLUMN IF NOT EXISTS emplacement_destination_id UUID, -- emplacement précis destination
  ADD COLUMN IF NOT EXISTS motif TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_transferts_statut ON transferts(statut);

-- ============================================================
-- 4) Inventaires (campagnes de comptage scan)
-- ============================================================
CREATE TABLE IF NOT EXISTS inventaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL,
  depot_id UUID REFERENCES depots(id) ON DELETE SET NULL,
  emplacement_id UUID REFERENCES emplacements(id) ON DELETE SET NULL,
  nom TEXT NOT NULL,                               -- ex: "Inventaire annuel Bât. A - 2026"
  statut TEXT DEFAULT 'en_cours',                  -- en_cours | clos | annule
  date_debut TIMESTAMPTZ DEFAULT now(),
  date_cloture TIMESTAMPTZ,
  nb_attendus INTEGER DEFAULT 0,                   -- théorique (stock attendu)
  nb_scannes INTEGER DEFAULT 0,                    -- effectivement scannés
  nb_ecarts INTEGER DEFAULT 0,                     -- différence
  ecart_montant NUMERIC(10, 2) DEFAULT 0,          -- valorisation écart €
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  clos_par UUID
);

CREATE INDEX IF NOT EXISTS idx_inventaires_depot ON inventaires(depot_id) WHERE depot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventaires_structure ON inventaires(structure_id);
CREATE INDEX IF NOT EXISTS idx_inventaires_statut ON inventaires(statut);

ALTER TABLE inventaires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inv_read_struct" ON inventaires;
CREATE POLICY "inv_read_struct" ON inventaires FOR SELECT
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "inv_write_member" ON inventaires;
CREATE POLICY "inv_write_member" ON inventaires FOR ALL
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()))
  WITH CHECK (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

-- ============================================================
-- 5) Lignes d'inventaire (1 ligne par matériel scanné)
-- ============================================================
CREATE TABLE IF NOT EXISTS inventaire_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventaire_id UUID NOT NULL REFERENCES inventaires(id) ON DELETE CASCADE,
  materiel_id UUID,                                -- nullable si scanné mais pas dans la DB
  article_id UUID,
  code_scanne TEXT,                                -- le code-barre / QR scanné
  attendu BOOLEAN DEFAULT false,                   -- était dans le stock théorique
  trouve BOOLEAN DEFAULT false,                    -- a été scanné
  ecart_type TEXT,                                 -- 'manquant' | 'surplus' | 'ok' | 'mauvaise_place'
  emplacement_attendu_id UUID,
  emplacement_trouve_id UUID,
  quantite_attendue INTEGER DEFAULT 1,
  quantite_trouvee INTEGER DEFAULT 0,
  valeur_unitaire NUMERIC(10, 2),
  notes TEXT,
  scanned_at TIMESTAMPTZ,
  scanned_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_lignes_inv ON inventaire_lignes(inventaire_id);
CREATE INDEX IF NOT EXISTS idx_inv_lignes_materiel ON inventaire_lignes(materiel_id) WHERE materiel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inv_lignes_ecart ON inventaire_lignes(ecart_type);

ALTER TABLE inventaire_lignes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invl_read_via_inv" ON inventaire_lignes;
CREATE POLICY "invl_read_via_inv" ON inventaire_lignes FOR SELECT
  USING (inventaire_id IN (SELECT id FROM inventaires WHERE structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "invl_write_via_inv" ON inventaire_lignes;
CREATE POLICY "invl_write_via_inv" ON inventaire_lignes FOR ALL
  USING (inventaire_id IN (SELECT id FROM inventaires WHERE structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid())))
  WITH CHECK (inventaire_id IN (SELECT id FROM inventaires WHERE structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid())));

-- ============================================================
-- 6) Trigger : recalc stats inventaire à chaque insert/update ligne
-- ============================================================
CREATE OR REPLACE FUNCTION fn_recalc_inventaire_stats() RETURNS TRIGGER AS $$
BEGIN
  UPDATE inventaires SET
    nb_attendus = (SELECT COUNT(*) FROM inventaire_lignes WHERE inventaire_id = NEW.inventaire_id AND attendu = true),
    nb_scannes = (SELECT COUNT(*) FROM inventaire_lignes WHERE inventaire_id = NEW.inventaire_id AND trouve = true),
    nb_ecarts = (SELECT COUNT(*) FROM inventaire_lignes WHERE inventaire_id = NEW.inventaire_id AND ecart_type IN ('manquant', 'surplus', 'mauvaise_place')),
    ecart_montant = (SELECT COALESCE(SUM(
      CASE
        WHEN ecart_type = 'manquant' THEN COALESCE(valeur_unitaire, 0) * quantite_attendue
        WHEN ecart_type = 'surplus' THEN COALESCE(valeur_unitaire, 0) * quantite_trouvee
        ELSE 0
      END
    ), 0) FROM inventaire_lignes WHERE inventaire_id = NEW.inventaire_id),
    updated_at = now()
  WHERE id = NEW.inventaire_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE inventaires ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DROP TRIGGER IF EXISTS trg_recalc_inv_stats ON inventaire_lignes;
CREATE TRIGGER trg_recalc_inv_stats
  AFTER INSERT OR UPDATE ON inventaire_lignes
  FOR EACH ROW EXECUTE FUNCTION fn_recalc_inventaire_stats();

-- ============================================================
-- 7) Vue v_inventaires_resume : stats consolidées par campagne
-- ============================================================
CREATE OR REPLACE VIEW v_inventaires_resume AS
SELECT
  i.id,
  i.nom,
  i.statut,
  i.date_debut,
  i.date_cloture,
  i.depot_id,
  i.emplacement_id,
  d.nom AS depot_nom,
  e.nom AS emplacement_nom,
  i.nb_attendus,
  i.nb_scannes,
  i.nb_ecarts,
  i.ecart_montant,
  CASE
    WHEN i.nb_attendus = 0 THEN 0
    ELSE ROUND((i.nb_scannes::numeric / i.nb_attendus::numeric) * 100, 1)
  END AS taux_completion_pct,
  CASE
    WHEN i.nb_attendus = 0 THEN 0
    ELSE ROUND(((i.nb_attendus - i.nb_ecarts)::numeric / i.nb_attendus::numeric) * 100, 1)
  END AS taux_fiabilite_pct
FROM inventaires i
LEFT JOIN depots d ON d.id = i.depot_id
LEFT JOIN emplacements e ON e.id = i.emplacement_id;

COMMENT ON VIEW v_inventaires_resume IS '0.58.79 - Résumé des campagnes inventaire avec taux complétion + fiabilité';

-- ============================================================
-- 8) Vérification
-- ============================================================
-- SELECT * FROM emplacements LIMIT 5;
-- SELECT * FROM v_inventaires_resume;
