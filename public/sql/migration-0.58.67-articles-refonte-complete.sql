-- =============================================================
-- Migration 0.58.67 : refonte complète table articles (logistique + tva + tracabilité)
-- =============================================================
-- Ajoute massivement des colonnes pour transformer articles en vrai référentiel
-- catalogue PSAD/FBM avec :
--   - Logistique : poids, dimensions, conditionnement, unité, code-barres GS1
--   - Tarifs : prix achat, prix vente, marge, TVA (table dédiée)
--   - Tracabilité : flag lot/série
--   - Rattachements : étab partenaire / pharmacie / fournisseur
--   - Compta : compte vente, compte achat, code analytique
-- =============================================================

-- 1) Table TVA paramétrable (référentiel taux)
CREATE TABLE IF NOT EXISTS tva_taux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL,
  code TEXT NOT NULL,                       -- ex: "NORMAL", "REDUIT", "SUPER_REDUIT", "EXO"
  libelle TEXT NOT NULL,                    -- ex: "TVA Normale 20%"
  taux NUMERIC(5,2) NOT NULL DEFAULT 0,     -- ex: 20.00 (en %)
  -- Comptable (paramétrage compta)
  compte_vente TEXT,                        -- ex: "707000"
  compte_achat TEXT,                        -- ex: "607000"
  compte_tva_collectee TEXT,                -- ex: "44571000"
  compte_tva_deductible TEXT,               -- ex: "44566000"
  code_analytique TEXT,                     -- ex: "PSAD", "FBM"
  est_defaut BOOLEAN NOT NULL DEFAULT false,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (structure_id, code)
);
CREATE INDEX IF NOT EXISTS idx_tva_taux_structure ON tva_taux(structure_id, actif);

-- Seed initial des 4 taux français usuels
-- (à exécuter manuellement après création — décommentez les structure_id)
-- INSERT INTO tva_taux (structure_id, code, libelle, taux, compte_vente, compte_achat, est_defaut) VALUES
--   ('VOTRE_STRUCTURE_ID', 'NORMAL',       'TVA Normale 20%',      20.00, '707100', '607100', true),
--   ('VOTRE_STRUCTURE_ID', 'INTERMEDIAIRE','TVA Intermédiaire 10%', 10.00, '707200', '607200', false),
--   ('VOTRE_STRUCTURE_ID', 'REDUIT',       'TVA Réduite 5.5%',       5.50, '707300', '607300', false),
--   ('VOTRE_STRUCTURE_ID', 'SUPER_REDUIT', 'TVA Super-réduite 2.1%', 2.10, '707400', '607400', false),
--   ('VOTRE_STRUCTURE_ID', 'EXO',          'Exonération TVA',         0.00, '707500', '607500', false);

-- 2) Refonte massive table articles
ALTER TABLE articles
  -- Code-barres (GS1 supporté)
  ADD COLUMN IF NOT EXISTS code_barre TEXT,                          -- EAN13 / GS1-128 principal
  ADD COLUMN IF NOT EXISTS code_barres_alt TEXT[],                   -- codes secondaires (variantes)
  ADD COLUMN IF NOT EXISTS code_barre_type TEXT,                     -- "EAN13" | "GS1-128" | "CODE128" | "DATAMATRIX"
  ADD COLUMN IF NOT EXISTS code_lpp TEXT,                            -- code LPPR (réf nomenclature)
  ADD COLUMN IF NOT EXISTS code_acl TEXT,                            -- code ACL pharmacie
  ADD COLUMN IF NOT EXISTS code_ucd TEXT,                            -- code UCD hôpital
  -- Logistique
  ADD COLUMN IF NOT EXISTS unite TEXT DEFAULT 'unité',               -- "unité" | "boîte" | "kg" | "L" | "m" | "paire"
  ADD COLUMN IF NOT EXISTS conditionnement INTEGER DEFAULT 1,        -- nb d'unités par conditionnement
  ADD COLUMN IF NOT EXISTS conditionnement_libelle TEXT,             -- ex: "Boîte de 12"
  ADD COLUMN IF NOT EXISTS poids_g NUMERIC(10,2),                    -- poids unitaire en grammes
  ADD COLUMN IF NOT EXISTS volume_ml NUMERIC(10,2),                  -- volume en ml
  ADD COLUMN IF NOT EXISTS longueur_cm NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS largeur_cm NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS hauteur_cm NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS quantite_palette INTEGER,                 -- nb par palette
  ADD COLUMN IF NOT EXISTS quantite_carton INTEGER,                  -- nb par carton
  -- Stock
  ADD COLUMN IF NOT EXISTS stock_min INTEGER DEFAULT 0,              -- seuil mini alerte
  ADD COLUMN IF NOT EXISTS stock_max INTEGER,                        -- seuil maxi (réappro)
  ADD COLUMN IF NOT EXISTS delai_appro_jours INTEGER,                -- délai de réappro
  -- Tarifs
  ADD COLUMN IF NOT EXISTS prix_achat_ht NUMERIC(10,4),              -- prix achat HT
  ADD COLUMN IF NOT EXISTS prix_vente_ht NUMERIC(10,4),              -- prix vente HT
  ADD COLUMN IF NOT EXISTS prix_vente_ttc NUMERIC(10,4),             -- prix vente TTC (calculé)
  ADD COLUMN IF NOT EXISTS tva_taux_id UUID REFERENCES tva_taux(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tva_pct NUMERIC(5,2),                     -- snapshot du taux au moment de la création
  ADD COLUMN IF NOT EXISTS marge_pct NUMERIC(5,2),                   -- marge en %
  ADD COLUMN IF NOT EXISTS devise TEXT DEFAULT 'EUR',
  -- Tracabilité
  ADD COLUMN IF NOT EXISTS gere_lot BOOLEAN NOT NULL DEFAULT false,        -- nécessite saisie lot ?
  ADD COLUMN IF NOT EXISTS gere_serie BOOLEAN NOT NULL DEFAULT false,      -- nécessite n° série ?
  ADD COLUMN IF NOT EXISTS gere_peremption BOOLEAN NOT NULL DEFAULT false, -- nécessite date péremption ?
  ADD COLUMN IF NOT EXISTS duree_vie_jours INTEGER,                        -- durée de vie standard
  -- Rattachements
  ADD COLUMN IF NOT EXISTS fournisseur_principal_id UUID,            -- FK fournisseurs (sans REFERENCES par sécurité)
  ADD COLUMN IF NOT EXISTS etablissement_partenaire_id UUID,         -- FK etablissements_partenaires
  ADD COLUMN IF NOT EXISTS pharmacie_id UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fabricant TEXT,
  ADD COLUMN IF NOT EXISTS marque TEXT,
  ADD COLUMN IF NOT EXISTS modele TEXT,
  -- Étiquettes / classifications
  ADD COLUMN IF NOT EXISTS etiquette_id UUID,                        -- étiquette principale (couleur)
  ADD COLUMN IF NOT EXISTS classe_dm TEXT,                           -- classe DM "I" | "IIa" | "IIb" | "III"
  ADD COLUMN IF NOT EXISTS sterile BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS usage_unique BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispositif_medical BOOLEAN DEFAULT false, -- DM oui/non
  -- Comptabilité (override de la TVA si besoin)
  ADD COLUMN IF NOT EXISTS compte_vente_override TEXT,               -- override du compte vente TVA
  ADD COLUMN IF NOT EXISTS compte_achat_override TEXT,
  ADD COLUMN IF NOT EXISTS code_analytique_override TEXT,
  -- Métadonnées
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS notes_internes TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,                           -- URL photo article
  ADD COLUMN IF NOT EXISTS actif BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS archive BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Index pour accélérer recherches courantes
CREATE INDEX IF NOT EXISTS idx_articles_code_barre ON articles(code_barre) WHERE code_barre IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_code_lpp ON articles(code_lpp) WHERE code_lpp IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_fournisseur ON articles(fournisseur_principal_id) WHERE fournisseur_principal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_partenaire ON articles(etablissement_partenaire_id) WHERE etablissement_partenaire_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_pharmacie ON articles(pharmacie_id) WHERE pharmacie_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_tva ON articles(tva_taux_id) WHERE tva_taux_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_actif ON articles(structure_id, actif, archive);
CREATE INDEX IF NOT EXISTS idx_articles_famille ON articles(famille) WHERE famille IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_dm ON articles(dispositif_medical) WHERE dispositif_medical = true;

-- 3) Trigger updated_at
CREATE OR REPLACE FUNCTION articles_set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS articles_set_updated_at_trigger ON articles;
CREATE TRIGGER articles_set_updated_at_trigger
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION articles_set_updated_at();

-- 4) RLS sur tva_taux (lecture pour la structure, écriture pour les admins)
ALTER TABLE tva_taux ENABLE ROW LEVEL SECURITY;

-- PostgreSQL ne supporte pas CREATE POLICY IF NOT EXISTS → DROP puis CREATE
DROP POLICY IF EXISTS "tva_taux_read_struct" ON tva_taux;
CREATE POLICY "tva_taux_read_struct"
  ON tva_taux FOR SELECT
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "tva_taux_write_admin" ON tva_taux;
CREATE POLICY "tva_taux_write_admin"
  ON tva_taux FOR ALL
  USING (
    structure_id IN (
      SELECT structure_id FROM membres_structure
      WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire')
    )
  );

COMMENT ON TABLE tva_taux IS '0.58.67 - Référentiel TVA paramétrable + comptes comptables';
COMMENT ON COLUMN articles.code_barre IS '0.58.67 - Code-barres principal (EAN13/GS1-128)';
COMMENT ON COLUMN articles.gere_lot IS '0.58.67 - Article tracé par lot (saisie obligatoire)';
COMMENT ON COLUMN articles.gere_serie IS '0.58.67 - Article tracé par n° de série (saisie obligatoire)';
COMMENT ON COLUMN articles.pharmacie_id IS '0.58.67 - Pharmacie de référence (PUI, officine ou LPP)';

-- =============================================================
-- Vérification :
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'articles' AND column_name IN ('code_barre','tva_taux_id','gere_lot','pharmacie_id');
-- SELECT * FROM tva_taux WHERE structure_id = 'VOTRE_STRUCTURE_ID';
-- =============================================================
