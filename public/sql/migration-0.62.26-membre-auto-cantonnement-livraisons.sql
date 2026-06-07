-- =============================================================
-- migration-0.62.26-membre-auto-cantonnement-livraisons.sql
-- 1. Trigger : création auto membres_structure quand un user s'inscrit
--    Pour les invitations validées (table invitations), on crée
--    automatiquement le membre dans la structure
-- 2. Vue v_livraisons_cantonnement_etab : filtre les livraisons
--    par étab en se basant sur les étapes des tournées
-- 100% idempotent
-- =============================================================

-- =============================
-- 1. Trigger inscription user → membres_structure
-- =============================
CREATE OR REPLACE FUNCTION fn_user_signup_creer_membre()
RETURNS TRIGGER AS $$
DECLARE
  v_invitation RECORD;
  v_role_magasin TEXT;
  v_types_di TEXT;
BEGIN
  -- Cherche une invitation pour cet email
  SELECT * INTO v_invitation
  FROM invitations
  WHERE LOWER(email) = LOWER(NEW.email)
    AND (accepted_at IS NULL OR accepted_at > NOW() - INTERVAL '5 minutes')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_invitation.id IS NOT NULL THEN
    -- Extraire le rôle magasin du notes_admin si présent
    v_role_magasin := substring(v_invitation.notes_admin FROM '\[ROLE_MAGASIN:([^\]]+)\]');
    v_types_di := substring(v_invitation.notes_admin FROM '\[TYPES_DI:([^\]]+)\]');

    -- Crée le membre dans la structure
    INSERT INTO membres_structure (
      user_id, structure_id, email,
      prenom, nom, nom_affiche, telephone,
      fonction_detail, role_professionnel,
      etablissement_id, magasin_fournisseur_id, pharmacie_id,
      actif, date_arrivee, created_at
    ) VALUES (
      NEW.id,
      v_invitation.structure_id,
      NEW.email,
      v_invitation.prenom,
      v_invitation.nom,
      v_invitation.nom_affiche,
      v_invitation.telephone,
      v_invitation.fonction_detail,
      v_invitation.role_professionnel,
      v_invitation.etablissement_id,
      v_invitation.magasin_fournisseur_id,
      v_invitation.pharmacie_id,
      TRUE,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Marque l'invitation comme acceptée
    UPDATE invitations SET accepted_at = NOW(), accepted_by_user_id = NEW.id WHERE id = v_invitation.id;

    RAISE NOTICE 'Membre créé depuis invitation : user=% structure=% role_magasin=%', NEW.id, v_invitation.structure_id, v_role_magasin;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erreur création membre auto : %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur auth.users après création
DROP TRIGGER IF EXISTS trg_user_signup_membre ON auth.users;
CREATE TRIGGER trg_user_signup_membre
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_user_signup_creer_membre();

-- =============================
-- 2. Vue v_livraisons_cantonnement_etab
-- Une livraison pour un étab si AU MOINS UNE étape de la tournée
-- pointe sur un étab/dépôt du périmètre du user
-- =============================
DROP VIEW IF EXISTS v_livraisons_etab CASCADE;

DO $$
DECLARE
  has_etapes_table BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'tournees_etapes'
  ) INTO has_etapes_table;

  IF has_etapes_table THEN
    EXECUTE $V$
      CREATE OR REPLACE VIEW v_livraisons_etab AS
      SELECT DISTINCT
        t.id AS tournee_id,
        t.numero,
        t.nom,
        t.date_tournee,
        t.statut,
        t.magasin_id,
        t.chauffeur_user_id,
        t.vehicule_id,
        t.nb_etapes,
        t.nb_completees,
        te.etablissement_id AS etape_etablissement_id,
        te.depot_id AS etape_depot_id
      FROM tournees t
      INNER JOIN tournees_etapes te ON te.tournee_id = t.id
      WHERE t.statut IN ('planifiee', 'a_faire', 'en_cours', 'livree')
    $V$;
  END IF;
END $$;

-- =============================
-- 3. Garages côté magasin : assure que magasin_id existe (idempotent)
-- =============================
ALTER TABLE IF EXISTS garages ADD COLUMN IF NOT EXISTS magasin_id UUID;
CREATE INDEX IF NOT EXISTS idx_garages_magasin ON garages(magasin_id);
ALTER TABLE IF EXISTS garages ADD COLUMN IF NOT EXISTS etablissement_id UUID;
CREATE INDEX IF NOT EXISTS idx_garages_etab ON garages(etablissement_id);

-- =============================
-- 4. Vue compteurs livraisons par étab
-- =============================
CREATE OR REPLACE VIEW v_livraisons_compteurs_etab AS
SELECT
  COALESCE(te.etablissement_id, '00000000-0000-0000-0000-000000000000'::uuid) AS etablissement_id,
  COUNT(DISTINCT t.id) FILTER (WHERE t.statut = 'planifiee') AS nb_planifiees,
  COUNT(DISTINCT t.id) FILTER (WHERE t.statut = 'en_cours') AS nb_en_cours,
  COUNT(DISTINCT t.id) FILTER (WHERE t.statut = 'livree') AS nb_a_receptionner,
  COUNT(DISTINCT t.id) FILTER (WHERE t.statut = 'receptionnee') AS nb_receptionnees
FROM tournees t
LEFT JOIN tournees_etapes te ON te.tournee_id = t.id
GROUP BY te.etablissement_id;

SELECT 'Triggers et vues OK' AS info,
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'fn_user_signup_creer_membre') AS trigger_signup,
  (SELECT COUNT(*) FROM pg_views WHERE viewname = 'v_livraisons_etab') AS view_livraisons,
  (SELECT COUNT(*) FROM pg_views WHERE viewname = 'v_livraisons_compteurs_etab') AS view_compteurs;
