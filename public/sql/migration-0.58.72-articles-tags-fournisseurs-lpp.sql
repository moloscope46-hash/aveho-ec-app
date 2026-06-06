-- =============================================================
-- Migration 0.58.72 — Tags articles + Fournisseurs + Prix location
--                     + Base LPP + Locations matériel
-- =============================================================
-- ⚠ Idempotent : utilise IF NOT EXISTS partout, DROP+CREATE pour RLS

-- ============================================================
-- 1) Prix location sur articles
-- ============================================================
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS prix_location_jour NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS prix_location_semaine NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS prix_location_mois NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS prix_location_trimestre NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS facturation_location TEXT,  -- 'jour' | 'semaine' | 'mois' | 'trimestre' | 'forfait'
  ADD COLUMN IF NOT EXISTS louable BOOLEAN DEFAULT false;

COMMENT ON COLUMN articles.prix_location_jour IS '0.58.72 - Tarif location à la journée';
COMMENT ON COLUMN articles.facturation_location IS '0.58.72 - Période de facturation par défaut pour la location';

-- ============================================================
-- 2) Tags pour articles (parallèle à tags_materiel)
-- ============================================================
CREATE TABLE IF NOT EXISTS tags_article (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL,
  libelle TEXT NOT NULL,
  couleur TEXT DEFAULT '#7a6fb0',
  icone TEXT DEFAULT 'ti-tag',
  description TEXT,
  -- Surcharges de prix appliquées aux articles tagués
  surcharge_prix_vente_pct NUMERIC(5, 2),       -- ex: 10 = +10%
  surcharge_prix_location_pct NUMERIC(5, 2),
  prix_vente_fixe NUMERIC(10, 2),                 -- override absolu
  prix_location_jour_fixe NUMERIC(10, 2),
  prix_location_mois_fixe NUMERIC(10, 2),
  ordre_affichage INTEGER DEFAULT 0,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tags_article_structure ON tags_article(structure_id);
CREATE INDEX IF NOT EXISTS idx_tags_article_actif ON tags_article(actif) WHERE actif = true;

ALTER TABLE tags_article ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tags_article_read_struct" ON tags_article;
CREATE POLICY "tags_article_read_struct" ON tags_article FOR SELECT
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "tags_article_write_struct" ON tags_article;
CREATE POLICY "tags_article_write_struct" ON tags_article FOR ALL
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire')))
  WITH CHECK (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire')));

-- Table de liaison article ↔ tag
CREATE TABLE IF NOT EXISTS article_tags (
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags_article(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_article_tags_tag ON article_tags(tag_id);

ALTER TABLE article_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "article_tags_read_struct" ON article_tags;
CREATE POLICY "article_tags_read_struct" ON article_tags FOR SELECT
  USING (article_id IN (SELECT id FROM articles WHERE structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "article_tags_write_struct" ON article_tags;
CREATE POLICY "article_tags_write_struct" ON article_tags FOR ALL
  USING (article_id IN (SELECT id FROM articles WHERE structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire'))))
  WITH CHECK (article_id IN (SELECT id FROM articles WHERE structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire'))));

-- ============================================================
-- 3) Fournisseurs (multi) pour article + prix achat + prioritaire
-- ============================================================
CREATE TABLE IF NOT EXISTS article_fournisseurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  fournisseur_type TEXT NOT NULL,            -- 'pharmacie' | 'partenaire' | 'fournisseur'
  fournisseur_id UUID NOT NULL,               -- FK vers pharmacies/etablissements_partenaires/fournisseurs
  prix_achat_ht NUMERIC(10, 4),
  remise_pct NUMERIC(5, 2),
  quantite_min INTEGER,                       -- quantité min commande
  delai_livraison_jours INTEGER,
  reference_fournisseur TEXT,                 -- réf article chez ce fournisseur
  conditions TEXT,
  est_prioritaire BOOLEAN DEFAULT false,      -- fournisseur principal
  actif BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_art_four_article ON article_fournisseurs(article_id);
CREATE INDEX IF NOT EXISTS idx_art_four_priori ON article_fournisseurs(article_id, est_prioritaire) WHERE est_prioritaire = true;
-- Contrainte : un seul fournisseur prioritaire par article
CREATE UNIQUE INDEX IF NOT EXISTS uq_art_four_priori ON article_fournisseurs(article_id) WHERE est_prioritaire = true;

ALTER TABLE article_fournisseurs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "art_four_read_struct" ON article_fournisseurs;
CREATE POLICY "art_four_read_struct" ON article_fournisseurs FOR SELECT
  USING (article_id IN (SELECT id FROM articles WHERE structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "art_four_write_struct" ON article_fournisseurs;
CREATE POLICY "art_four_write_struct" ON article_fournisseurs FOR ALL
  USING (article_id IN (SELECT id FROM articles WHERE structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire'))))
  WITH CHECK (article_id IN (SELECT id FROM articles WHERE structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire'))));

COMMENT ON TABLE article_fournisseurs IS '0.58.72 - Multi-fournisseurs par article avec prix achat distincts + fournisseur prioritaire';

-- ============================================================
-- 4) Base codes LPP/LPPR (référentiel officiel HAS)
-- ============================================================
CREATE TABLE IF NOT EXISTS lpp_codes (
  code TEXT PRIMARY KEY,                      -- code LPP (ex: '1124781')
  libelle TEXT NOT NULL,
  description TEXT,
  classe TEXT,                                -- I, II, III, IV
  tarif_ref NUMERIC(10, 2),                   -- tarif de référence publié
  prix_limite_vente NUMERIC(10, 2),
  taux_remboursement NUMERIC(5, 2),           -- 60 / 100 / etc.
  date_inscription DATE,
  date_radiation DATE,
  actif BOOLEAN DEFAULT true,
  type_distribution TEXT,                     -- 'achat' | 'location'
  source_url TEXT,
  donnees_brutes JSONB,                       -- payload complet de l'API
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lpp_actif ON lpp_codes(actif) WHERE actif = true;
CREATE INDEX IF NOT EXISTS idx_lpp_libelle_trgm ON lpp_codes USING gin (libelle gin_trgm_ops);
-- Index trigram pour search rapide (requiert extension pg_trgm)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- RLS publique en lecture (référentiel partagé), écriture admin uniquement
ALTER TABLE lpp_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lpp_codes_read_all" ON lpp_codes;
CREATE POLICY "lpp_codes_read_all" ON lpp_codes FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "lpp_codes_write_admin" ON lpp_codes;
CREATE POLICY "lpp_codes_write_admin" ON lpp_codes FOR ALL
  USING (EXISTS (SELECT 1 FROM membres_structure WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM membres_structure WHERE user_id = auth.uid() AND role = 'admin'));

COMMENT ON TABLE lpp_codes IS '0.58.72 - Référentiel des codes LPPR (HAS / Assurance Maladie). Sync via /admin/lpp-sync';

-- ============================================================
-- 5) Locations matériel
-- ============================================================
CREATE TABLE IF NOT EXISTS materiel_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  structure_id UUID NOT NULL,
  etablissement_id UUID,
  materiel_id UUID NOT NULL REFERENCES materiels(id) ON DELETE RESTRICT,
  patient_id UUID,
  -- Période
  date_debut DATE NOT NULL,
  date_fin_prevue DATE,
  date_fin_reelle DATE,
  -- Tarification
  periode_facturation TEXT NOT NULL,          -- 'jour' | 'semaine' | 'mois' | 'trimestre'
  prix_unitaire NUMERIC(10, 2) NOT NULL,
  quantite_periodes INTEGER,                  -- ex: 30 jours
  montant_total NUMERIC(12, 2),
  -- Statut
  statut TEXT NOT NULL DEFAULT 'en_cours',    -- en_cours | terminee | annulee
  motif_fin TEXT,
  -- Audit
  notes TEXT,
  user_id UUID,
  user_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mat_loc_materiel ON materiel_locations(materiel_id, statut);
CREATE INDEX IF NOT EXISTS idx_mat_loc_patient ON materiel_locations(patient_id);
CREATE INDEX IF NOT EXISTS idx_mat_loc_actives ON materiel_locations(structure_id, statut) WHERE statut = 'en_cours';

ALTER TABLE materiel_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mat_loc_read_struct" ON materiel_locations;
CREATE POLICY "mat_loc_read_struct" ON materiel_locations FOR SELECT
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "mat_loc_write_member" ON materiel_locations;
CREATE POLICY "mat_loc_write_member" ON materiel_locations FOR ALL
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()))
  WITH CHECK (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

COMMENT ON TABLE materiel_locations IS '0.58.72 - Locations de matériel à des patients (DM en location, perfusion, PPC, VPH, etc.)';

-- ============================================================
-- 6) Actions rapides via scan QR matériel (popup)
-- ============================================================
-- On utilise les tables existantes :
--   - DI = interventions (existe)
--   - Retour location = update materiel_locations.date_fin_reelle + statut='terminee'
--   - Échange = INSERT materiel_mouvements type='transfert' + new ligne loc si besoin
--   - Rebut = update materiels.etat='Rebut' (trigger crée auto mvt 'changement_etat')
-- Pas de nouvelle table nécessaire.
