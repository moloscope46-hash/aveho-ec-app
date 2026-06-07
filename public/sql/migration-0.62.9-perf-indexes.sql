-- =============================================================
-- migration-0.62.9-perf-indexes.sql
-- Indexes de performance pour les requêtes les plus chaudes
-- 100% idempotent
-- =============================================================

-- Interventions (DI) — recherches fréquentes par patient, chambre, materiel, statut
CREATE INDEX IF NOT EXISTS idx_interventions_etab ON interventions(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_interventions_patient ON interventions(patient_id);
CREATE INDEX IF NOT EXISTS idx_interventions_materiel ON interventions(materiel_id);
CREATE INDEX IF NOT EXISTS idx_interventions_chambre ON interventions(chambre_id);
CREATE INDEX IF NOT EXISTS idx_interventions_statut ON interventions(statut) WHERE statut IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interventions_created ON interventions(created_at DESC);

-- Materiels — joints fréquemment par patient + article + état
CREATE INDEX IF NOT EXISTS idx_materiels_etab ON materiels(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_materiels_patient ON materiels(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_materiels_article ON materiels(article_id) WHERE article_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_materiels_chambre ON materiels(chambre_id) WHERE chambre_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_materiels_depot ON materiels(depot_id) WHERE depot_id IS NOT NULL;

-- Tournées — affichage carte + filtre statut/date/magasin
CREATE INDEX IF NOT EXISTS idx_tournees_magasin ON tournees(magasin_id);
CREATE INDEX IF NOT EXISTS idx_tournees_statut ON tournees(statut);
CREATE INDEX IF NOT EXISTS idx_tournees_date ON tournees(date_tournee DESC);
CREATE INDEX IF NOT EXISTS idx_tournees_chauffeur ON tournees(chauffeur_user_id) WHERE chauffeur_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tournees_etapes_tournee ON tournees_etapes(tournee_id);
CREATE INDEX IF NOT EXISTS idx_tournees_gps_tournee ON tournees_gps_track(tournee_id, recorded_at DESC);

-- Marketplace — temps réel
CREATE INDEX IF NOT EXISTS idx_marketplace_offres_emetteur ON marketplace_offres(magasin_emetteur_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_offres_repondeur ON marketplace_offres(magasin_repondeur_id) WHERE magasin_repondeur_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_marketplace_offres_statut ON marketplace_offres(statut);
CREATE INDEX IF NOT EXISTS idx_marketplace_messages_offre ON marketplace_messages(offre_id, created_at);

-- Membres + magasins (cantonnement utilisateur)
CREATE INDEX IF NOT EXISTS idx_membres_user ON membres_structure(user_id);
CREATE INDEX IF NOT EXISTS idx_membres_magasin ON membres_structure(magasin_fournisseur_id) WHERE magasin_fournisseur_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_magasins_structure ON magasins(structure_id);

-- Demandes internes
CREATE INDEX IF NOT EXISTS idx_di_magasin ON demandes_internes(magasin_id) WHERE magasin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_di_statut ON demandes_internes(statut);
CREATE INDEX IF NOT EXISTS idx_di_lignes_demande ON demandes_internes_lignes(demande_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, lue, created_at DESC);

-- Articles
CREATE INDEX IF NOT EXISTS idx_articles_structure ON articles(structure_id);
CREATE INDEX IF NOT EXISTS idx_articles_magasin ON articles(magasin_id) WHERE magasin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_rattachements_etab ON articles_rattachements(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_articles_rattachements_art ON articles_rattachements(article_etablissement_id);

-- Patients + chambres
CREATE INDEX IF NOT EXISTS idx_patients_etab ON patients(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_patients_chambre ON patients(chambre_id) WHERE chambre_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chambres_service ON chambres(service_id);
CREATE INDEX IF NOT EXISTS idx_lits_chambre ON lits(chambre_id);

-- Vérif
SELECT 'Indexes créés' AS info, COUNT(*) AS total
FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%';
