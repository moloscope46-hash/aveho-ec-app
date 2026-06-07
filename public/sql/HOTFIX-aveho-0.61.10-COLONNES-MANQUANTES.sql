-- =============================================================
-- HOTFIX-aveho-0.61.10-COLONNES-MANQUANTES.sql
-- Ajoute les colonnes qui manquent dans membres_structure
-- + autres tables qui causent les 400/503
-- 100% idempotent
-- =============================================================

-- membres_structure : colonnes utilisées par le code mais peut-être absentes
ALTER TABLE IF EXISTS membres_structure
  ADD COLUMN IF NOT EXISTS role_professionnel TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS telephone TEXT,
  ADD COLUMN IF NOT EXISTS prenom TEXT,
  ADD COLUMN IF NOT EXISTS nom TEXT,
  ADD COLUMN IF NOT EXISTS nom_affiche TEXT,
  ADD COLUMN IF NOT EXISTS fonction_detail TEXT,
  ADD COLUMN IF NOT EXISTS magasin_fournisseur_id UUID,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS rpps TEXT,
  ADD COLUMN IF NOT EXISTS adeli TEXT,
  ADD COLUMN IF NOT EXISTS rpps_profession TEXT,
  ADD COLUMN IF NOT EXISTS pharmacie_id UUID,
  ADD COLUMN IF NOT EXISTS service_id UUID,
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_ms_user ON membres_structure(user_id);
CREATE INDEX IF NOT EXISTS idx_ms_role ON membres_structure(role_professionnel);
CREATE INDEX IF NOT EXISTS idx_ms_magasin ON membres_structure(magasin_fournisseur_id);

-- magasins_fournisseurs (table aussi très utilisée)
CREATE TABLE IF NOT EXISTS magasins_fournisseurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL
);
ALTER TABLE magasins_fournisseurs
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS structure_id UUID,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS adresse TEXT,
  ADD COLUMN IF NOT EXISTS code_postal TEXT,
  ADD COLUMN IF NOT EXISTS ville TEXT,
  ADD COLUMN IF NOT EXISTS pays TEXT DEFAULT 'France',
  ADD COLUMN IF NOT EXISTS telephone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS siret TEXT,
  ADD COLUMN IF NOT EXISTS finess TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS couleur_principale TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true;
ALTER TABLE magasins_fournisseurs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mf_all" ON magasins_fournisseurs;
CREATE POLICY "mf_all" ON magasins_fournisseurs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- v_collaborateurs : vue dont dépendent certaines pages
DROP VIEW IF EXISTS v_collaborateurs;
CREATE OR REPLACE VIEW v_collaborateurs AS
SELECT
  m.user_id, m.prenom, m.nom, m.email, m.telephone,
  m.role_professionnel, m.service_id, m.structure_id,
  m.magasin_fournisseur_id, m.photo_url, m.fonction_detail,
  m.created_at
FROM membres_structure m;

-- VÉRIFICATION
SELECT 'membres_structure cols' AS info, column_name FROM information_schema.columns
WHERE table_name = 'membres_structure' ORDER BY ordinal_position;
