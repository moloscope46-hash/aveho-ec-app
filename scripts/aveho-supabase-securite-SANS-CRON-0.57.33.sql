-- ═══════════════════════════════════════════════════════════════════════
-- AVEHO EC — Script SQL Supabase Sécurité (SANS pg_cron)
-- Version 0.57.33 — 3 juin 2026
-- ═══════════════════════════════════════════════════════════════════════
--
-- Version SIMPLIFIÉE qui exécute uniquement :
--   PARTIE A — RLS sur caisses + mutuelles
--   PARTIE B — Vues auth.users sécurisées
--   PARTIE C — Tracking statut mail invitation
--   PARTIE E — Vérification finale
--
-- ⚠️ La PARTIE D (cron jobs) est EXCLUE de ce script car elle nécessite
--    l'extension pg_cron. Pour activer pg_cron :
--    Dashboard → Database → Extensions → search "pg_cron" → toggle ON
--    Puis re-run le script EDITOR complet.
--
-- ⚠️ TANT QUE LA PARTIE D N'EST PAS APPLIQUÉE : les 6 CRON Edge Functions
--    ne tournent pas en automatique. Tu peux les appeler manuellement,
--    mais elles refuseront sans header x-cron-secret (sécurité).
--
-- ⚠️ IDEMPOTENT : peut être ré-exécuté plusieurs fois sans casser.
--
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════
-- PARTIE A — Activation RLS sur tables référentielles
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS public.caisses_assurance_maladie ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "caisses_read_authenticated" ON public.caisses_assurance_maladie;
CREATE POLICY "caisses_read_authenticated"
  ON public.caisses_assurance_maladie
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "caisses_write_admin" ON public.caisses_assurance_maladie;
CREATE POLICY "caisses_write_admin"
  ON public.caisses_assurance_maladie
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.membres_structure ms
      WHERE ms.user_id = auth.uid()
        AND ms.role IN ('admin', 'super_admin')
    )
  );

ALTER TABLE IF EXISTS public.mutuelles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mutuelles_read_authenticated" ON public.mutuelles;
CREATE POLICY "mutuelles_read_authenticated"
  ON public.mutuelles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "mutuelles_write_admin" ON public.mutuelles;
CREATE POLICY "mutuelles_write_admin"
  ON public.mutuelles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.membres_structure ms
      WHERE ms.user_id = auth.uid()
        AND ms.role IN ('admin', 'super_admin')
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- PARTIE B — Vues auth.users sécurisées (security_invoker)
-- ═══════════════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS public.v_equipe_structure CASCADE;
CREATE VIEW public.v_equipe_structure
  WITH (security_invoker = true)
  AS
  SELECT
    ms.user_id,
    ms.structure_id,
    ms.role,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    (u.raw_user_meta_data ->> 'prenom') AS prenom,
    (u.raw_user_meta_data ->> 'nom') AS nom
  FROM public.membres_structure ms
  JOIN auth.users u ON u.id = ms.user_id
  WHERE ms.structure_id IN (
    SELECT structure_id FROM public.membres_structure
    WHERE user_id = auth.uid()
  );

GRANT SELECT ON public.v_equipe_structure TO authenticated;

DROP VIEW IF EXISTS public.v_admins_structure CASCADE;
CREATE VIEW public.v_admins_structure
  WITH (security_invoker = true)
  AS
  SELECT
    ms.structure_id,
    ms.user_id,
    u.email
  FROM public.membres_structure ms
  JOIN auth.users u ON u.id = ms.user_id
  WHERE ms.role IN ('admin', 'super_admin')
    AND ms.structure_id IN (
      SELECT structure_id FROM public.membres_structure
      WHERE user_id = auth.uid()
    );

GRANT SELECT ON public.v_admins_structure TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- PARTIE C — Tracking statut email d'invitation
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS public.membres_structure
  ADD COLUMN IF NOT EXISTS invitation_mail_envoyee_at timestamptz;

ALTER TABLE IF EXISTS public.membres_structure
  ADD COLUMN IF NOT EXISTS invitation_mail_statut text
    CHECK (invitation_mail_statut IN ('en_attente', 'envoyee', 'echec', 'rappel_envoye', 'expire'));

ALTER TABLE IF EXISTS public.membres_structure
  ADD COLUMN IF NOT EXISTS invitation_mail_dernier_log text;

COMMENT ON COLUMN public.membres_structure.invitation_mail_envoyee_at
  IS '0.57.22 : timestamp du dernier envoi du mail d''invitation';
COMMENT ON COLUMN public.membres_structure.invitation_mail_statut
  IS '0.57.22 : statut envoi (en_attente / envoyee / echec / rappel_envoye / expire)';
COMMENT ON COLUMN public.membres_structure.invitation_mail_dernier_log
  IS '0.57.22 : message d''erreur ou ID Resend du dernier envoi';

-- ═══════════════════════════════════════════════════════════════════════
-- PARTIE D — DÉSACTIVÉE
--
-- Pour activer les cron jobs :
--   1. Dashboard → Database → Extensions → enable "pg_cron" + "pg_net"
--   2. Run le script aveho-supabase-securite-EDITOR-0.57.33.sql (version complète)
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════
-- PARTIE E — Vérification globale finale (sans cron)
-- ═══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_caisses_rls boolean;
  v_mutuelles_rls boolean;
  v_view_equipe boolean;
  v_view_admins boolean;
  v_col_envoyee boolean;
  v_col_statut boolean;
  v_col_log boolean;
BEGIN
  -- A : RLS activé sur caisses + mutuelles
  SELECT relrowsecurity INTO v_caisses_rls
    FROM pg_class WHERE relname = 'caisses_assurance_maladie' AND relnamespace = 'public'::regnamespace;
  SELECT relrowsecurity INTO v_mutuelles_rls
    FROM pg_class WHERE relname = 'mutuelles' AND relnamespace = 'public'::regnamespace;

  -- B : Vues sécurisées
  SELECT EXISTS(SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_equipe_structure') INTO v_view_equipe;
  SELECT EXISTS(SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_admins_structure') INTO v_view_admins;

  -- C : Colonnes tracking
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='membres_structure' AND column_name='invitation_mail_envoyee_at')
    INTO v_col_envoyee;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='membres_structure' AND column_name='invitation_mail_statut')
    INTO v_col_statut;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='membres_structure' AND column_name='invitation_mail_dernier_log')
    INTO v_col_log;

  RAISE NOTICE '═══ AVEHO EC — Vérification finale (sans cron) ═══';
  RAISE NOTICE '';
  RAISE NOTICE 'PARTIE A — RLS référentiels :';
  RAISE NOTICE '  caisses_assurance_maladie RLS : %', CASE WHEN v_caisses_rls THEN '✓ OK' ELSE '✗ FAIL' END;
  RAISE NOTICE '  mutuelles RLS                : %', CASE WHEN v_mutuelles_rls THEN '✓ OK' ELSE '✗ FAIL' END;
  RAISE NOTICE '';
  RAISE NOTICE 'PARTIE B — Vues sécurisées :';
  RAISE NOTICE '  v_equipe_structure  : %', CASE WHEN v_view_equipe THEN '✓ OK' ELSE '✗ FAIL' END;
  RAISE NOTICE '  v_admins_structure  : %', CASE WHEN v_view_admins THEN '✓ OK' ELSE '✗ FAIL' END;
  RAISE NOTICE '';
  RAISE NOTICE 'PARTIE C — Tracking mail invitation :';
  RAISE NOTICE '  invitation_mail_envoyee_at   : %', CASE WHEN v_col_envoyee THEN '✓ OK' ELSE '✗ FAIL' END;
  RAISE NOTICE '  invitation_mail_statut       : %', CASE WHEN v_col_statut THEN '✓ OK' ELSE '✗ FAIL' END;
  RAISE NOTICE '  invitation_mail_dernier_log  : %', CASE WHEN v_col_log THEN '✓ OK' ELSE '✗ FAIL' END;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'Si tu vois 7 ✓ OK ci-dessus, tout est bon !';
  RAISE NOTICE 'Reste à activer pg_cron pour les cron jobs.';
  RAISE NOTICE '═══════════════════════════════════════';
END $$;
