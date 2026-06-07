-- =============================================================
-- migration-0.62.19-v-collaborateurs-enrichie.sql
-- Recrée v_collaborateurs avec TOUTES les infos jointes :
--   - étab + service + bâtiment
--   - magasin (nom, ville)
--   - pharmacie
-- 100% idempotent
-- =============================================================

DROP VIEW IF EXISTS v_collaborateurs CASCADE;

CREATE OR REPLACE VIEW v_collaborateurs AS
SELECT
  m.user_id,
  m.id,
  m.structure_id,
  m.email,
  m.prenom,
  m.nom,
  m.nom_affiche,
  m.telephone,
  m.mobile,
  m.fonction_detail,
  m.role_professionnel,
  m.specialite,
  m.numero_adeli,
  m.numero_rpps,
  m.diplome,
  m.matricule,
  m.role,
  m.photo_url,
  m.actif,
  m.date_arrivee,
  m.created_at,

  -- Étab principal (premier de la liste)
  COALESCE(m.etablissement_id, (m.etablissement_ids->>0)::uuid) AS etablissement_id,
  e.nom AS etablissement_nom,
  e.ville AS etablissement_ville,

  -- Service
  m.service_id,
  s.nom AS service_nom,

  -- Bâtiment via service
  s.batiment_id,
  b.nom AS batiment_nom,

  -- Magasin
  m.magasin_fournisseur_id,
  mag.nom AS magasin_fournisseur_nom,
  mag.nom AS magasin_nom,
  mag.ville AS magasin_ville,

  -- Pharmacie
  m.pharmacie_id,
  ph.nom AS pharmacie_nom

FROM membres_structure m
LEFT JOIN etablissements e ON e.id = COALESCE(m.etablissement_id, (m.etablissement_ids->>0)::uuid)
LEFT JOIN services s       ON s.id = m.service_id
LEFT JOIN batiments b      ON b.id = s.batiment_id
LEFT JOIN magasins mag     ON mag.id = m.magasin_fournisseur_id
LEFT JOIN pharmacies ph    ON ph.id = m.pharmacie_id;

-- Vérif
SELECT 'v_collaborateurs enrichie' AS info, COUNT(*) AS nb_colonnes
FROM information_schema.columns
WHERE table_name = 'v_collaborateurs';
