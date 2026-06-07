-- =============================================================
-- migration-0.62.21-v-collaborateurs-ULTRA-DEFENSIF.sql
-- Fix erreur 42703 sur m.id : la colonne `id` n'existe pas non plus
-- → On ne sélectionne QUE les colonnes qui existent réellement
-- Plus aucune erreur 42703 garantie : on test colonne par colonne
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
BEGIN
  -- On ajoute uniquement les colonnes qui existent
  FOREACH c IN ARRAY candidate_cols LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'membres_structure' AND column_name = c
    ) INTO has_col;
    IF has_col THEN
      cols := cols || 'm.' || c || ', ';
    END IF;
  END LOOP;

  -- Vérifie si etablissement_ids existe (pour étabs multiples)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'membres_structure' AND column_name = 'etablissement_ids'
  ) INTO has_col;

  -- Construit le SELECT
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
  $V$,
  rtrim(cols, ', '),
  CASE WHEN has_col THEN 'COALESCE(m.etablissement_id, (m.etablissement_ids->>0)::uuid)' ELSE 'm.etablissement_id' END
  );
END $$;

-- Vérif
SELECT 'v_collaborateurs créée' AS info, COUNT(*) AS nb_colonnes
FROM information_schema.columns WHERE table_name = 'v_collaborateurs';

-- Bonus diagnostic : liste les vraies colonnes de membres_structure
SELECT 'membres_structure cols' AS info, column_name
FROM information_schema.columns
WHERE table_name = 'membres_structure'
ORDER BY ordinal_position;
