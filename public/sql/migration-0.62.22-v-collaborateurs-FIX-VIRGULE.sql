-- =============================================================
-- migration-0.62.22-v-collaborateurs-FIX-VIRGULE.sql
-- Fix bug 0.62.21 : virgule manquante entre la liste de colonnes
-- dynamiques (de la boucle) et les colonnes des jointures
-- 100% idempotent
-- =============================================================

DROP VIEW IF EXISTS v_collaborateurs CASCADE;

DO $$
DECLARE
  cols TEXT := '';
  has_col BOOLEAN;
  candidate_cols TEXT[] := ARRAY[
    'user_id', 'id', 'structure_id',
    'email', 'prenom', 'nom', 'nom_affiche',
    'telephone', 'mobile', 'fonction_detail',
    'role_professionnel', 'specialite', 'numero_adeli', 'numero_rpps',
    'diplome', 'matricule', 'role', 'photo_url', 'actif', 'date_arrivee', 'created_at',
    'etablissement_id', 'service_id',
    'magasin_fournisseur_id', 'pharmacie_id'
  ];
  c TEXT;
  has_etab_ids BOOLEAN;
  etab_expr TEXT;
BEGIN
  FOREACH c IN ARRAY candidate_cols LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'membres_structure' AND column_name = c
    ) INTO has_col;
    IF has_col THEN
      cols := cols || 'm.' || c || ', ';
    END IF;
  END LOOP;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'membres_structure' AND column_name = 'etablissement_ids'
  ) INTO has_etab_ids;
  etab_expr := CASE WHEN has_etab_ids THEN 'COALESCE(m.etablissement_id, (m.etablissement_ids->>0)::uuid)' ELSE 'm.etablissement_id' END;

  -- cols se termine par ', ' donc on enchaine directement avec les autres colonnes
  -- PLUS de rtrim — on GARDE la virgule pour enchainer avec e.nom etc.
  EXECUTE format($V$
    CREATE OR REPLACE VIEW v_collaborateurs AS
    SELECT
      %s
      e.nom AS etablissement_nom, e.ville AS etablissement_ville,
      s.nom AS service_nom, s.batiment_id, b.nom AS batiment_nom,
      mag.nom AS magasin_fournisseur_nom, mag.nom AS magasin_nom, mag.ville AS magasin_ville,
      ph.nom AS pharmacie_nom
    FROM membres_structure m
    LEFT JOIN etablissements e ON e.id = %s
    LEFT JOIN services s       ON s.id = m.service_id
    LEFT JOIN batiments b      ON b.id = s.batiment_id
    LEFT JOIN magasins mag     ON mag.id = m.magasin_fournisseur_id
    LEFT JOIN pharmacies ph    ON ph.id = m.pharmacie_id
  $V$, cols, etab_expr);
END $$;

-- Vérif
SELECT 'v_collaborateurs OK' AS info, COUNT(*) AS nb_colonnes
FROM information_schema.columns WHERE table_name = 'v_collaborateurs';

-- Diagnostic colonnes membres_structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'membres_structure'
ORDER BY ordinal_position;
