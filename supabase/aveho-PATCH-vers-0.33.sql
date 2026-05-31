-- ============================================================
--  AVEHO EC — Patch 0.33.0 (Notifications email pour workflows)
--  Idempotent, à exécuter dans Supabase > SQL Editor.
--
--  Crée une vue v_users_emails pour résoudre rapidement user_id → email
--  depuis l'Edge Function send-email sans avoir à appeler auth.admin.getUserById
--  pour chaque destinataire (qui est plus lent et nécessite la service role key).
--
--  Note : la vue lit auth.users qui n'est accessible qu'en service_role.
--  Pas de RLS publique nécessaire (utilisée uniquement côté Edge Function).
-- ============================================================

-- ============================================================
-- 1) Vue v_users_emails
-- ============================================================
-- Vue minimaliste pour résoudre user_id -> email rapidement
-- depuis les Edge Functions (service role).
create or replace view v_users_emails as
select 
  id as user_id,
  email,
  raw_user_meta_data->>'nom_affiche' as nom_affiche,
  created_at
from auth.users;

-- Grant uniquement à service_role (les Edge Functions)
revoke all on v_users_emails from public, authenticated, anon;
grant select on v_users_emails to service_role;

-- ============================================================
-- 2) NOTE — Pas de modification des prefs
-- ============================================================
-- Les préférences email sont stockées dans la même table 
-- user_notification_preferences (0.29) sous des clés préfixées :
--   prefs.di          → push (existait déjà)
--   prefs.email_di    → email (nouveau en 0.33)
--   prefs.achat       → push
--   prefs.email_achat → email
--   etc.
--
-- Pas besoin de schema migration : jsonb accepte n'importe quelle clé.
-- Les anciens utilisateurs n'auront aucune clé email_* → opt-in par défaut OFF.

-- ============================================================
-- FIN DU PATCH 0.33.0
-- ============================================================
-- Vérifications :
--
--   -- La vue existe et est limitée au service_role ?
--   select count(*) from v_users_emails;  -- doit fonctionner si tu es admin SQL
--
--   -- Mes prefs (push vs email) :
--   select prefs from user_notification_preferences where user_id = auth.uid();
