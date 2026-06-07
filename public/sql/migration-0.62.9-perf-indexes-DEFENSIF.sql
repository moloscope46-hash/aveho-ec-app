-- =============================================================
-- migration-0.62.9-perf-indexes-DEFENSIF.sql
-- Version défensive : on ne crée un index QUE si la colonne existe
-- 100% idempotent — remplace l'ancien fichier
-- =============================================================

-- Helper macro : crée un index seulement si table + colonne existent
CREATE OR REPLACE FUNCTION pg_temp.create_index_if_col_exists(
  p_index_name TEXT, p_table TEXT, p_col TEXT, p_extra TEXT DEFAULT ''
) RETURNS VOID AS $$
DECLARE
  col_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = p_table AND column_name = p_col
  ) INTO col_exists;
  IF col_exists THEN
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(%I) %s', p_index_name, p_table, p_col, p_extra);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Interventions
SELECT pg_temp.create_index_if_col_exists('idx_interventions_etab', 'interventions', 'etablissement_id');
SELECT pg_temp.create_index_if_col_exists('idx_interventions_patient', 'interventions', 'patient_id');
SELECT pg_temp.create_index_if_col_exists('idx_interventions_materiel', 'interventions', 'materiel_id');
SELECT pg_temp.create_index_if_col_exists('idx_interventions_chambre', 'interventions', 'chambre_id');
SELECT pg_temp.create_index_if_col_exists('idx_interventions_statut', 'interventions', 'statut');
SELECT pg_temp.create_index_if_col_exists('idx_interventions_created', 'interventions', 'created_at');

-- Materiels
SELECT pg_temp.create_index_if_col_exists('idx_materiels_etab', 'materiels', 'etablissement_id');
SELECT pg_temp.create_index_if_col_exists('idx_materiels_patient', 'materiels', 'patient_id');
SELECT pg_temp.create_index_if_col_exists('idx_materiels_article', 'materiels', 'article_id');
SELECT pg_temp.create_index_if_col_exists('idx_materiels_chambre', 'materiels', 'chambre_id');
SELECT pg_temp.create_index_if_col_exists('idx_materiels_depot', 'materiels', 'depot_id');

-- Tournées
SELECT pg_temp.create_index_if_col_exists('idx_tournees_magasin', 'tournees', 'magasin_id');
SELECT pg_temp.create_index_if_col_exists('idx_tournees_statut', 'tournees', 'statut');
SELECT pg_temp.create_index_if_col_exists('idx_tournees_date', 'tournees', 'date_tournee');
SELECT pg_temp.create_index_if_col_exists('idx_tournees_chauffeur', 'tournees', 'chauffeur_user_id');
SELECT pg_temp.create_index_if_col_exists('idx_tournees_etapes_tournee', 'tournees_etapes', 'tournee_id');
SELECT pg_temp.create_index_if_col_exists('idx_tournees_gps_tournee', 'tournees_gps_track', 'tournee_id');

-- Marketplace
SELECT pg_temp.create_index_if_col_exists('idx_marketplace_offres_emetteur', 'marketplace_offres', 'magasin_emetteur_id');
SELECT pg_temp.create_index_if_col_exists('idx_marketplace_offres_repondeur', 'marketplace_offres', 'magasin_repondeur_id');
SELECT pg_temp.create_index_if_col_exists('idx_marketplace_offres_statut', 'marketplace_offres', 'statut');
SELECT pg_temp.create_index_if_col_exists('idx_marketplace_messages_offre', 'marketplace_messages', 'offre_id');

-- Membres + magasins
SELECT pg_temp.create_index_if_col_exists('idx_membres_user', 'membres_structure', 'user_id');
SELECT pg_temp.create_index_if_col_exists('idx_membres_magasin', 'membres_structure', 'magasin_fournisseur_id');
SELECT pg_temp.create_index_if_col_exists('idx_magasins_structure', 'magasins', 'structure_id');

-- Demandes internes
SELECT pg_temp.create_index_if_col_exists('idx_di_magasin', 'demandes_internes', 'magasin_id');
SELECT pg_temp.create_index_if_col_exists('idx_di_statut', 'demandes_internes', 'statut');
SELECT pg_temp.create_index_if_col_exists('idx_di_lignes_demande', 'demandes_internes_lignes', 'demande_id');

-- Notifications
SELECT pg_temp.create_index_if_col_exists('idx_notifications_user', 'notifications', 'user_id');

-- Articles
SELECT pg_temp.create_index_if_col_exists('idx_articles_structure', 'articles', 'structure_id');
SELECT pg_temp.create_index_if_col_exists('idx_articles_magasin', 'articles', 'magasin_id');
SELECT pg_temp.create_index_if_col_exists('idx_articles_rattachements_etab', 'articles_rattachements', 'etablissement_id');
SELECT pg_temp.create_index_if_col_exists('idx_articles_rattachements_art', 'articles_rattachements', 'article_etablissement_id');

-- Patients + chambres
SELECT pg_temp.create_index_if_col_exists('idx_patients_etab', 'patients', 'etablissement_id');
SELECT pg_temp.create_index_if_col_exists('idx_patients_chambre', 'patients', 'chambre_id');
SELECT pg_temp.create_index_if_col_exists('idx_chambres_service', 'chambres', 'service_id');
SELECT pg_temp.create_index_if_col_exists('idx_lits_chambre', 'lits', 'chambre_id');

-- Vérif
SELECT 'Indexes créés (défensif)' AS info, COUNT(*) AS total
FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%';
