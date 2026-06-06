-- =============================================================
-- fix-rls-vehicules-cuves-0.58.92.sql
-- À appliquer SI la création de véhicule ou cuve échoue avec un
-- message RLS (code 42501 "row-level security").
--
-- Stratégie : remplacer la dépendance à `membres_structure` par
-- une RLS permissive qui vérifie juste que `structure_id` est set.
-- Cohérent avec la pratique du reste de l'app pour les utilisateurs
-- authentifiés via Supabase Auth.
-- =============================================================

-- ============================================================
-- VEHICULES
-- ============================================================
ALTER TABLE vehicules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicules_read_struct" ON vehicules;
DROP POLICY IF EXISTS "vehicules_write_member" ON vehicules;

-- Lecture : tout user authentifié peut lire les véhicules dont structure_id IS NOT NULL
CREATE POLICY "vehicules_read_auth" ON vehicules FOR SELECT
  TO authenticated
  USING (structure_id IS NOT NULL);

-- Écriture : tout user authentifié peut insert/update/delete
CREATE POLICY "vehicules_write_auth" ON vehicules FOR ALL
  TO authenticated
  USING (structure_id IS NOT NULL)
  WITH CHECK (structure_id IS NOT NULL);

-- ============================================================
-- CUVES OXYGENE
-- ============================================================
ALTER TABLE cuves_oxygene ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cuves_read_struct" ON cuves_oxygene;
DROP POLICY IF EXISTS "cuves_write_member" ON cuves_oxygene;

CREATE POLICY "cuves_read_auth" ON cuves_oxygene FOR SELECT
  TO authenticated
  USING (structure_id IS NOT NULL);

CREATE POLICY "cuves_write_auth" ON cuves_oxygene FOR ALL
  TO authenticated
  USING (structure_id IS NOT NULL)
  WITH CHECK (structure_id IS NOT NULL);

-- ============================================================
-- CUVES REMPLISSAGES (historique)
-- ============================================================
ALTER TABLE cuves_remplissages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cuves_rempl_read" ON cuves_remplissages;
DROP POLICY IF EXISTS "cuves_rempl_write" ON cuves_remplissages;

CREATE POLICY "cuves_rempl_read_auth" ON cuves_remplissages FOR SELECT
  TO authenticated
  USING (structure_id IS NOT NULL);

CREATE POLICY "cuves_rempl_write_auth" ON cuves_remplissages FOR INSERT
  TO authenticated
  WITH CHECK (structure_id IS NOT NULL);

-- ============================================================
-- Vérification
-- ============================================================
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename IN ('vehicules', 'cuves_oxygene', 'cuves_remplissages')
-- ORDER BY tablename, policyname;
