-- =============================================================
-- migration-0.62.20-v-collaborateurs-FIX.sql
-- Fix erreur 42703 : m.etablissement_ids n'existe pas
-- → utiliser uniquement etablissement_id (colonne simple)
-- 100% idempotent
-- =============================================================

DROP VIEW IF EXISTS v_collaborateurs CASCADE;

-- Détection sécurisée : on essaie d'utiliser etablissement_ids si elle existe
DO $$
DECLARE
  has_etab_ids BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'membres_structure' AND column_name = 'etablissement_ids'
  ) INTO has_etab_ids;

  IF has_etab_ids THEN
    EXECUTE $V$
      CREATE OR REPLACE VIEW v_collaborateurs AS
      SELECT
        m.user_id, m.id, m.structure_id,
        m.email, m.prenom, m.nom, m.nom_affiche,
        m.telephone, m.mobile, m.fonction_detail,
        m.role_professionnel, m.specialite, m.numero_adeli, m.numero_rpps,
        m.diplome, m.matricule, m.role, m.photo_url, m.actif, m.date_arrivee, m.created_at,
        COALESCE(m.etablissement_id, (m.etablissement_ids->>0)::uuid) AS etablissement_id,
        e.nom AS etablissement_nom, e.ville AS etablissement_ville,
        m.service_id, s.nom AS service_nom, s.batiment_id, b.nom AS batiment_nom,
        m.magasin_fournisseur_id, mag.nom AS magasin_fournisseur_nom, mag.nom AS magasin_nom, mag.ville AS magasin_ville,
        m.pharmacie_id, ph.nom AS pharmacie_nom
      FROM membres_structure m
      LEFT JOIN etablissements e ON e.id = COALESCE(m.etablissement_id, (m.etablissement_ids->>0)::uuid)
      LEFT JOIN services s       ON s.id = m.service_id
      LEFT JOIN batiments b      ON b.id = s.batiment_id
      LEFT JOIN magasins mag     ON mag.id = m.magasin_fournisseur_id
      LEFT JOIN pharmacies ph    ON ph.id = m.pharmacie_id;
    $V$;
  ELSE
    EXECUTE $V$
      CREATE OR REPLACE VIEW v_collaborateurs AS
      SELECT
        m.user_id, m.id, m.structure_id,
        m.email, m.prenom, m.nom, m.nom_affiche,
        m.telephone, m.mobile, m.fonction_detail,
        m.role_professionnel, m.specialite, m.numero_adeli, m.numero_rpps,
        m.diplome, m.matricule, m.role, m.photo_url, m.actif, m.date_arrivee, m.created_at,
        m.etablissement_id,
        e.nom AS etablissement_nom, e.ville AS etablissement_ville,
        m.service_id, s.nom AS service_nom, s.batiment_id, b.nom AS batiment_nom,
        m.magasin_fournisseur_id, mag.nom AS magasin_fournisseur_nom, mag.nom AS magasin_nom, mag.ville AS magasin_ville,
        m.pharmacie_id, ph.nom AS pharmacie_nom
      FROM membres_structure m
      LEFT JOIN etablissements e ON e.id = m.etablissement_id
      LEFT JOIN services s       ON s.id = m.service_id
      LEFT JOIN batiments b      ON b.id = s.batiment_id
      LEFT JOIN magasins mag     ON mag.id = m.magasin_fournisseur_id
      LEFT JOIN pharmacies ph    ON ph.id = m.pharmacie_id;
    $V$;
  END IF;
END $$;

-- Vérif
SELECT 'v_collaborateurs créée' AS info, COUNT(*) AS nb_colonnes
FROM information_schema.columns
WHERE table_name = 'v_collaborateurs';
