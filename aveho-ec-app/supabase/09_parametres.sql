-- ============================================================
--  AVEHO EC — Bloc Paramètres collectivité (Alpha 0.3)
--  Stocke les préférences d'affichage et libellés personnalisés
--  par collectivité, en JSON.
--  À exécuter APRÈS 08_notifications.sql
-- ============================================================

alter table structures add column if not exists parametres jsonb default '{}'::jsonb;

-- exemples de paramètres stockés dans `parametres` :
--   libelle_patient        -> "Résident" (pour les EHPAD) au lieu de "Patient"
--   libelle_chambre        -> "Logement" au lieu de "Chambre"
--   devise                 -> "EUR" / "CHF"
--   format_date            -> "fr-FR" / "en-US"
--   theme                  -> "navy" / "clair"
--   afficher_promotions    -> true/false
--   notif_email            -> true/false
