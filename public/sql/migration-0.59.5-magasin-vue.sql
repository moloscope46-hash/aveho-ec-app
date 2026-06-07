-- =============================================================
-- migration-0.59.5-magasin-vue.sql
-- - Ajoute colonne `est_fournisseur` aux etablissements_partenaires
--   (quand on crée un partenaire avec ce flag → il apparaît dans /magasins)
-- - Ajoute colonne `article_magasin_id` à articles
--   (mapping article étab → article du catalogue magasin Aveho)
-- - Ajoute `magasin_id` aux articles pour identifier le catalogue d'origine
-- - Vue v_magasin_di pour voir les DI reçues côté magasin
-- =============================================================

-- ==========================================
-- ETABLISSEMENTS_PARTENAIRES : flag fournisseur
-- ==========================================
ALTER TABLE etablissements_partenaires
  ADD COLUMN IF NOT EXISTS est_fournisseur BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS magasin_id UUID; -- lien vers table magasins si existant

CREATE INDEX IF NOT EXISTS idx_partenaires_fournisseur
  ON etablissements_partenaires(est_fournisseur)
  WHERE est_fournisseur = true;

-- ==========================================
-- ARTICLES : rattachement au catalogue magasin
-- ==========================================
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS magasin_id UUID,            -- magasin Aveho propriétaire du catalogue
  ADD COLUMN IF NOT EXISTS article_magasin_id UUID,    -- si article étab → réf vers article magasin
  ADD COLUMN IF NOT EXISTS est_catalogue_magasin BOOLEAN DEFAULT false; -- true si article créé par magasin

CREATE INDEX IF NOT EXISTS idx_articles_magasin ON articles(magasin_id);
CREATE INDEX IF NOT EXISTS idx_articles_corresp ON articles(article_magasin_id);

-- ==========================================
-- TABLE MAGASINS — colonnes minimum
-- (existe déjà mais on ajoute des colonnes utiles)
-- ==========================================
ALTER TABLE magasins
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS nom TEXT,
  ADD COLUMN IF NOT EXISTS adresse TEXT,
  ADD COLUMN IF NOT EXISTS code_postal TEXT,
  ADD COLUMN IF NOT EXISTS ville TEXT,
  ADD COLUMN IF NOT EXISTS telephone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS responsable TEXT,
  ADD COLUMN IF NOT EXISTS favori BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS partenaire_id UUID; -- lien vers etablissements_partenaires

-- ==========================================
-- VUE v_magasin_di : DI reçues côté magasin
-- ==========================================
CREATE OR REPLACE VIEW v_magasin_di AS
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
  (SELECT COUNT(*) FROM demandes_internes_lignes WHERE demande_id = d.id) AS nb_lignes,
  (SELECT SUM(quantite_demandee) FROM demandes_internes_lignes WHERE demande_id = d.id) AS qte_totale
FROM demandes_internes d
ORDER BY d.created_at DESC;

-- ==========================================
-- Vérification
-- ==========================================
SELECT
  table_name, column_name
FROM information_schema.columns
WHERE (table_name = 'etablissements_partenaires' AND column_name IN ('est_fournisseur', 'magasin_id'))
   OR (table_name = 'articles' AND column_name IN ('magasin_id', 'article_magasin_id', 'est_catalogue_magasin'))
ORDER BY table_name, column_name;
