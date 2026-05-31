-- ============================================================
--  AVEHO EC — Patch 0.44.0
--  Idempotent, à exécuter dans Supabase > SQL Editor.
--
--  1) M - Indexes manquants pour performance (interventions, achats,
--         signalements, audit_log, notifications, consentements)
--  2) J - Aucune modif SQL nécessaire (activation groupée = bulk UPDATE)
--  3) L - Aucune modif SQL nécessaire (Edge Function existante étendue)
--  4) K - Aucune modif SQL nécessaire (Realtime côté front)
--  5) O - Aucune modif SQL (audit a11y front uniquement)
-- ============================================================

-- ============================================================
-- M - Indexes performance
-- ============================================================
-- Pour chaque table métier, on indexe les colonnes les plus filtrées
-- côté front. Bénéfice : queries instantanées même sur 100k+ lignes.

-- Interventions : filtres fréquents sur created_by (top demandeurs),
-- patient_id (fiche patient), statut, urgence
create index if not exists idx_interventions_created_by 
  on interventions (created_by) where created_by is not null;

create index if not exists idx_interventions_patient 
  on interventions (patient_id) where patient_id is not null;

create index if not exists idx_interventions_materiel 
  on interventions (materiel_id) where materiel_id is not null;

create index if not exists idx_interventions_struct_statut 
  on interventions (structure_id, statut);

create index if not exists idx_interventions_struct_created 
  on interventions (structure_id, created_at desc);

-- Achats : filtres fréquents sur statut, demandeur
create index if not exists idx_achats_struct_statut 
  on achats (structure_id, statut);

create index if not exists idx_achats_demandeur 
  on achats (demandeur_id) where demandeur_id is not null;

-- Signalements : filtres workflow + catégorie
create index if not exists idx_signalements_struct_statut 
  on signalements (structure_id, statut);

create index if not exists idx_signalements_categorie 
  on signalements (categorie) where categorie is not null;

-- Notifications : filtres user + lue
create index if not exists idx_notifications_user_lue 
  on notifications (user_id, lue) where user_id is not null;

create index if not exists idx_notifications_struct_created 
  on notifications (structure_id, created_at desc);

-- Audit log : filtres période + entité (déjà struct/created existant)
create index if not exists idx_audit_entite 
  on audit_log (structure_id, entite, created_at desc);

create index if not exists idx_audit_user 
  on audit_log (user_id, created_at desc) where user_id is not null;

-- Consentements RGPD (table consentements_rgpd, pas "consentements")
-- Note : idx_consent_patient, idx_consent_date, idx_consent_structure existent
-- déjà via patch 0.21. On n'ajoute rien ici.

-- Patients : recherche par nom (full-text léger sans extensions)
create index if not exists idx_patients_struct_nom 
  on patients (structure_id, lower(nom));

create index if not exists idx_patients_etablissement 
  on patients (etablissement_id) where etablissement_id is not null;

-- Matériels : recherches par parc/série/lot
create index if not exists idx_materiels_struct_libelle 
  on materiels (structure_id, lower(libelle));

create index if not exists idx_materiels_num_parc 
  on materiels (num_parc) where num_parc is not null;

create index if not exists idx_materiels_num_serie 
  on materiels (num_serie) where num_serie is not null;

-- Maintenance_recurrences (table créée en 0.41) : tri par prochaine_due
create index if not exists idx_maint_recur_struct_due 
  on maintenance_recurrences (structure_id, prochaine_due) 
  where actif = true;

-- ============================================================
-- Statistiques table (pour planner) — recommandé après création indexes
-- ============================================================
analyze interventions;
analyze achats;
analyze signalements;
analyze notifications;
analyze audit_log;
analyze consentements_rgpd;
analyze patients;
analyze materiels;
analyze maintenance_recurrences;

-- ============================================================
-- Recharger le cache PostgREST (leçon hotfix 0.43 !)
-- ============================================================
notify pgrst, 'reload schema';

-- ============================================================
-- FIN DU PATCH 0.44.0
-- ============================================================
-- Vérifications :
--   -- Liste des indexes créés sur interventions
--   select indexname from pg_indexes 
--   where tablename = 'interventions' 
--     and indexname like 'idx_%' 
--   order by indexname;
--
--   -- Mesurer l'effet sur une query type
--   explain analyze 
--   select * from interventions 
--   where structure_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
--     and statut = 'Nouvelle'
--   order by created_at desc limit 50;
--   -- → tu dois voir "Index Scan using idx_interventions_struct_statut"
