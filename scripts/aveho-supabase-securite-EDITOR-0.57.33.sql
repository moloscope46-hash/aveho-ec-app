-- ═══════════════════════════════════════════════════════════════════════
-- AVEHO EC — Script SQL Supabase Sécurité COMPLET (Editor compatible)
-- Version 0.57.33 — 3 juin 2026
-- ═══════════════════════════════════════════════════════════════════════
--
-- ⚠️  AVANT D'EXÉCUTER : tu dois remplacer 3 valeurs ci-dessous.
-- Utilise Find & Replace (Ctrl+H) dans Supabase SQL Editor pour
-- remplacer ces 3 placeholders :
--
--   <CRON_SECRET_VALUE>     → ton secret CRON (généré avec PowerShell)
--   <SUPABASE_URL>          → https://rnvlzddgxiuslgljkobm.supabase.co
--   <SERVICE_ROLE_KEY>      → ta clé service_role (Dashboard → Settings → API)
--
-- Ces 3 valeurs apparaissent UNIQUEMENT en PARTIE D (les cron jobs).
-- Les parties A, B, C, E s'exécutent telles quelles.
--
-- ⚠️  IDEMPOTENT : peut être ré-exécuté plusieurs fois sans casser.
-- ⚠️  VÉRIFIÉ : bloc DO LANGUAGE plpgsql en fin de script affiche le résultat.
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
-- PARTIE D — Reconfiguration des 6 cron jobs avec x-cron-secret
--
-- ⚠️ FIND & REPLACE (Ctrl+H) DANS L'ÉDITEUR SUPABASE AVANT DE RUN :
--    <CRON_SECRET_VALUE>  →  ton secret CRON (commence ici-bas)
--    <SUPABASE_URL>       →  https://rnvlzddgxiuslgljkobm.supabase.co
--    <SERVICE_ROLE_KEY>   →  eyJhbGc... (ta service_role_key complète)
-- ═══════════════════════════════════════════════════════════════════════

-- Nettoyage des anciens jobs (sans header x-cron-secret)
DO $$
DECLARE
  job_name text;
  cron_names text[] := ARRAY[
    'auto-archive-consents',
    'maintenance-daily-cron',
    'send-digest',
    'send-renouvellement-rappels',
    'sync-google-reviews',
    'weekly-stats-digest'
  ];
BEGIN
  FOREACH job_name IN ARRAY cron_names
  LOOP
    BEGIN
      PERFORM cron.unschedule(job_name);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Cron job % n''existait pas, on continue.', job_name;
    END;
  END LOOP;
END $$;

-- auto-archive-consents : le 1er du mois à 4h UTC
SELECT cron.schedule(
  'auto-archive-consents',
  '0 4 1 * *',
  $cron$
  SELECT net.http_post(
    url := '<SUPABASE_URL>/functions/v1/auto-archive-consents',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'x-cron-secret', '<CRON_SECRET_VALUE>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $cron$
);

-- maintenance-daily-cron : tous les jours à 6h UTC
SELECT cron.schedule(
  'maintenance-daily-cron',
  '0 6 * * *',
  $cron$
  SELECT net.http_post(
    url := '<SUPABASE_URL>/functions/v1/maintenance-daily-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'x-cron-secret', '<CRON_SECRET_VALUE>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $cron$
);

-- send-digest : tous les jours à 8h UTC
SELECT cron.schedule(
  'send-digest',
  '0 8 * * *',
  $cron$
  SELECT net.http_post(
    url := '<SUPABASE_URL>/functions/v1/send-digest',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'x-cron-secret', '<CRON_SECRET_VALUE>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $cron$
);

-- send-renouvellement-rappels : tous les jours à 7h UTC
SELECT cron.schedule(
  'send-renouvellement-rappels',
  '0 7 * * *',
  $cron$
  SELECT net.http_post(
    url := '<SUPABASE_URL>/functions/v1/send-renouvellement-rappels',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'x-cron-secret', '<CRON_SECRET_VALUE>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $cron$
);

-- sync-google-reviews : tous les lundis à 3h UTC
SELECT cron.schedule(
  'sync-google-reviews',
  '0 3 * * 1',
  $cron$
  SELECT net.http_post(
    url := '<SUPABASE_URL>/functions/v1/sync-google-reviews',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'x-cron-secret', '<CRON_SECRET_VALUE>',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('trigger_source', 'cron')
  );
  $cron$
);

-- weekly-stats-digest : tous les lundis à 7h UTC
SELECT cron.schedule(
  'weekly-stats-digest',
  '0 7 * * 1',
  $cron$
  SELECT net.http_post(
    url := '<SUPABASE_URL>/functions/v1/weekly-stats-digest',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'x-cron-secret', '<CRON_SECRET_VALUE>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $cron$
);

-- ═══════════════════════════════════════════════════════════════════════
-- PARTIE E — Vérification globale finale
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
  v_cron_count integer;
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

  -- D : 6 cron jobs configurés
  SELECT COUNT(*) INTO v_cron_count FROM cron.job
   WHERE jobname IN (
     'auto-archive-consents', 'maintenance-daily-cron', 'send-digest',
     'send-renouvellement-rappels', 'sync-google-reviews', 'weekly-stats-digest'
   );

  RAISE NOTICE '═══ AVEHO EC — Vérification finale ═══';
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
  RAISE NOTICE 'PARTIE D — Cron jobs avec x-cron-secret :';
  RAISE NOTICE '  Jobs scheduled : % / 6 %', v_cron_count, CASE WHEN v_cron_count = 6 THEN '✓ OK' ELSE '✗ FAIL' END;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'Si tu vois 9 ✓ OK ci-dessus, tout est bon !';
  RAISE NOTICE '═══════════════════════════════════════';
END $$;
