-- =============================================================
--  aveho-PATCH-vers-0.57.22.sql
--
--  Ajoute le tracking du statut d'envoi mail dans la table invitations.
--
--  CONTEXTE :
--  Avant cette version, quand on invitait un user :
--   - Le mail était envoyé via Edge Function 'invite-user' (Resend)
--   - Si Resend échouait, un warning UI temporaire s'affichait
--   - Mais AUCUNE trace persistée en BDD
--   - Donc plus tard, impossible de savoir si le mail est parti ou pas
--   - L'utilisateur ne pouvait pas voir le statut dans la liste
--
--  Cette migration ajoute 3 colonnes :
--   - mail_envoye_at  : TIMESTAMPTZ NULL  → date d'envoi réussi (null = pas envoyé)
--   - mail_erreur     : TEXT NULL          → message d'erreur Resend si échec
--   - mail_tentatives : INT DEFAULT 0      → nombre d'essais (init + renvois)
--
--  Idempotent : utilise IF NOT EXISTS, peut être exécutée plusieurs fois.
--
--  ⚠️ AVANT D'EXÉCUTER : snapshot Supabase recommandé
-- =============================================================


-- ============================================================
-- ÉTAPE 1 : Ajouter les colonnes (idempotent)
-- ============================================================

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS mail_envoye_at TIMESTAMPTZ NULL;

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS mail_erreur TEXT NULL;

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS mail_tentatives INTEGER DEFAULT 0;


-- ============================================================
-- ÉTAPE 2 : Backfill optionnel pour les invitations existantes
-- ============================================================
-- Pour les invitations créées avant cette version, on ne sait pas
-- si le mail a été envoyé. On les marque comme "tentative 1" pour
-- éviter de pourrir les stats. À ajuster si tu veux autre chose.

UPDATE public.invitations
SET mail_tentatives = 1
WHERE mail_tentatives = 0
  AND created_at < now() - interval '1 hour';
-- → Les invitations vieilles de + 1h sont supposées avoir eu au moins 1 tentative


-- ============================================================
-- ÉTAPE 3 : Index pour requêtes filtrées
-- ============================================================
-- Optimise les requêtes du type "invitations avec erreur mail"
-- (utilisées dans la page utilisateurs pour le filtre/badge)

CREATE INDEX IF NOT EXISTS idx_invitations_mail_erreur
  ON public.invitations(mail_erreur)
  WHERE mail_erreur IS NOT NULL;


-- ============================================================
-- ÉTAPE 4 : Commentaires sur les colonnes (documentation)
-- ============================================================

COMMENT ON COLUMN public.invitations.mail_envoye_at IS
  'Date d''envoi réussi du mail d''invitation via Edge Function invite-user. NULL = pas encore envoyé ou échec.';

COMMENT ON COLUMN public.invitations.mail_erreur IS
  'Message d''erreur du dernier essai d''envoi (Resend / Edge Function). NULL si succès ou pas encore tenté.';

COMMENT ON COLUMN public.invitations.mail_tentatives IS
  'Nombre total de tentatives d''envoi (création initiale + renvois). Default 0.';


-- ============================================================
-- ÉTAPE 5 : Vérification post-migration
-- ============================================================

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'invitations'
  AND column_name IN ('mail_envoye_at', 'mail_erreur', 'mail_tentatives')
ORDER BY column_name;

-- Attendu :
--  mail_envoye_at  | timestamp with time zone | YES | NULL
--  mail_erreur     | text                     | YES | NULL
--  mail_tentatives | integer                  | YES | 0


-- ============================================================
-- ÉTAPE 6 : Stats actuelles (vérif fonctionnelle)
-- ============================================================
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE mail_envoye_at IS NOT NULL) AS mails_envoyes,
  COUNT(*) FILTER (WHERE mail_erreur IS NOT NULL) AS mails_en_echec,
  COUNT(*) FILTER (WHERE mail_envoye_at IS NULL AND mail_erreur IS NULL) AS jamais_tente,
  AVG(mail_tentatives) AS moyenne_tentatives
FROM public.invitations;


-- ============================================================
-- ROLLBACK (en cas de problème)
-- ============================================================
/*
ALTER TABLE public.invitations DROP COLUMN IF EXISTS mail_envoye_at;
ALTER TABLE public.invitations DROP COLUMN IF EXISTS mail_erreur;
ALTER TABLE public.invitations DROP COLUMN IF EXISTS mail_tentatives;
DROP INDEX IF EXISTS idx_invitations_mail_erreur;
*/
