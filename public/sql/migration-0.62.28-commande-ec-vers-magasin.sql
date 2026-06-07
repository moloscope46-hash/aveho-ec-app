-- =============================================================
-- migration-0.62.28-commande-ec-vers-magasin.sql
-- Workflow validation 2 étapes : Panier EC → Commande → Validation EC → DI magasin
-- 100% idempotent
-- =============================================================

-- 1. Table commandes_ec (= commandes émises depuis l'établissement)
CREATE TABLE IF NOT EXISTS commandes_ec (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL,
  structure_id UUID NOT NULL,
  etablissement_id UUID,
  batiment_id UUID,
  service_id UUID,
  depot_id UUID,
  magasin_id UUID,  -- magasin destinataire (à qui on commande)
  -- Workflow 2 étapes
  statut TEXT DEFAULT 'brouillon',
  -- 'brouillon' : en cours de saisie
  -- 'a_valider_ec' : envoyée pour validation chef de service
  -- 'validee_ec' : validée côté étab (chef service)
  -- 'envoyee_magasin' : transmise au magasin (DI créée)
  -- 'preparation' : magasin en cours de préparation
  -- 'expediee' : magasin a expédié
  -- 'livree' : livrée
  -- 'receptionnee' : réceptionnée + bon de réception OK
  -- 'rejetee' : refus en chemin (étab ou magasin)
  -- workflow
  cree_par UUID,
  cree_le TIMESTAMPTZ DEFAULT NOW(),
  validee_ec_par UUID,
  validee_ec_le TIMESTAMPTZ,
  validee_ec_commentaire TEXT,
  envoyee_magasin_le TIMESTAMPTZ,
  di_id UUID,  -- DI créée automatiquement à l'envoi magasin
  -- détails
  total_lignes INTEGER DEFAULT 0,
  total_ht NUMERIC(12,2),
  total_ttc NUMERIC(12,2),
  notes TEXT,
  motif_rejet TEXT,
  urgence TEXT DEFAULT 'normale',  -- normale | urgente
  livraison_souhaitee_le DATE
);

CREATE INDEX IF NOT EXISTS idx_commandes_ec_structure ON commandes_ec(structure_id);
CREATE INDEX IF NOT EXISTS idx_commandes_ec_etab ON commandes_ec(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_commandes_ec_magasin ON commandes_ec(magasin_id);
CREATE INDEX IF NOT EXISTS idx_commandes_ec_statut ON commandes_ec(statut);
CREATE INDEX IF NOT EXISTS idx_commandes_ec_cree_par ON commandes_ec(cree_par);

-- 2. Table commandes_ec_lignes
CREATE TABLE IF NOT EXISTS commandes_ec_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id UUID NOT NULL REFERENCES commandes_ec(id) ON DELETE CASCADE,
  article_id UUID NOT NULL,
  quantite INTEGER NOT NULL DEFAULT 1,
  prix_unitaire_ht NUMERIC(10,2),
  tva_pct NUMERIC(5,2),
  total_ht NUMERIC(12,2),
  notes TEXT,
  ordre INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_commandes_ec_lignes_commande ON commandes_ec_lignes(commande_id);

-- 3. RLS commandes
ALTER TABLE commandes_ec ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS commandes_ec_select ON commandes_ec;
CREATE POLICY commandes_ec_select ON commandes_ec FOR SELECT TO authenticated
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS commandes_ec_insert ON commandes_ec;
CREATE POLICY commandes_ec_insert ON commandes_ec FOR INSERT TO authenticated
  WITH CHECK (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS commandes_ec_update ON commandes_ec;
CREATE POLICY commandes_ec_update ON commandes_ec FOR UPDATE TO authenticated
  USING (structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid()));

ALTER TABLE commandes_ec_lignes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS commandes_ec_lignes_select ON commandes_ec_lignes;
CREATE POLICY commandes_ec_lignes_select ON commandes_ec_lignes FOR SELECT TO authenticated
  USING (commande_id IN (SELECT id FROM commandes_ec WHERE structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS commandes_ec_lignes_insert ON commandes_ec_lignes;
CREATE POLICY commandes_ec_lignes_insert ON commandes_ec_lignes FOR INSERT TO authenticated
  WITH CHECK (commande_id IN (SELECT id FROM commandes_ec WHERE structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS commandes_ec_lignes_update ON commandes_ec_lignes;
CREATE POLICY commandes_ec_lignes_update ON commandes_ec_lignes FOR UPDATE TO authenticated
  USING (commande_id IN (SELECT id FROM commandes_ec WHERE structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS commandes_ec_lignes_delete ON commandes_ec_lignes;
CREATE POLICY commandes_ec_lignes_delete ON commandes_ec_lignes FOR DELETE TO authenticated
  USING (commande_id IN (SELECT id FROM commandes_ec WHERE structure_id IN (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid())));

-- 4. Fonction qui transforme une commande validée en DI magasin
CREATE OR REPLACE FUNCTION fn_commande_ec_vers_di(p_commande_id UUID)
RETURNS UUID AS $$
DECLARE
  v_cmd RECORD;
  v_di_id UUID;
  v_numero TEXT;
BEGIN
  -- Charge la commande
  SELECT * INTO v_cmd FROM commandes_ec WHERE id = p_commande_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
  IF v_cmd.statut != 'validee_ec' THEN
    RAISE EXCEPTION 'Commande pas dans le bon statut (current: %)', v_cmd.statut;
  END IF;

  -- Génère numéro DI
  v_numero := 'DI-CMD-' || to_char(NOW(), 'YYYYMMDD-HH24MISS');

  -- Crée la DI dans la table demandes_internes (si elle existe)
  -- Sinon on log un avertissement
  BEGIN
    INSERT INTO demandes_internes (
      numero, type, sous_type,
      structure_id, etablissement_id, batiment_id, service_id, depot_id, magasin_id,
      description, urgence, statut,
      cree_par, created_at,
      commande_id_origine
    ) VALUES (
      v_numero,
      'livraison',
      'commande_ec',
      v_cmd.structure_id, v_cmd.etablissement_id, v_cmd.batiment_id, v_cmd.service_id, v_cmd.depot_id, v_cmd.magasin_id,
      'Livraison commande ' || v_cmd.numero,
      v_cmd.urgence,
      'nouvelle',
      v_cmd.validee_ec_par,
      NOW(),
      v_cmd.id
    )
    RETURNING id INTO v_di_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erreur création DI : % (commande_id_origine peut être manquant)', SQLERRM;
    -- Fallback : essayer sans commande_id_origine
    INSERT INTO demandes_internes (
      numero, type, sous_type,
      structure_id, etablissement_id, batiment_id, service_id, depot_id, magasin_id,
      description, urgence, statut,
      cree_par, created_at
    ) VALUES (
      v_numero,
      'livraison',
      'commande_ec',
      v_cmd.structure_id, v_cmd.etablissement_id, v_cmd.batiment_id, v_cmd.service_id, v_cmd.depot_id, v_cmd.magasin_id,
      'Livraison commande ' || v_cmd.numero,
      v_cmd.urgence,
      'nouvelle',
      v_cmd.validee_ec_par,
      NOW()
    )
    RETURNING id INTO v_di_id;
  END;

  -- Update commande avec DI créée
  UPDATE commandes_ec SET
    statut = 'envoyee_magasin',
    envoyee_magasin_le = NOW(),
    di_id = v_di_id
  WHERE id = p_commande_id;

  RETURN v_di_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Ajoute commande_id_origine sur demandes_internes (lien retour vers commande)
ALTER TABLE IF EXISTS demandes_internes ADD COLUMN IF NOT EXISTS commande_id_origine UUID;
CREATE INDEX IF NOT EXISTS idx_di_commande_origine ON demandes_internes(commande_id_origine);

-- 6. Vue compteurs commandes EC pour dashboard
CREATE OR REPLACE VIEW v_commandes_ec_compteurs AS
SELECT
  structure_id,
  magasin_id,
  COUNT(*) FILTER (WHERE statut = 'brouillon') AS nb_brouillons,
  COUNT(*) FILTER (WHERE statut = 'a_valider_ec') AS nb_a_valider,
  COUNT(*) FILTER (WHERE statut = 'validee_ec') AS nb_validees,
  COUNT(*) FILTER (WHERE statut = 'envoyee_magasin') AS nb_envoyees,
  COUNT(*) FILTER (WHERE statut IN ('preparation', 'expediee', 'livree')) AS nb_en_cours,
  COUNT(*) FILTER (WHERE statut = 'receptionnee') AS nb_terminees
FROM commandes_ec
GROUP BY structure_id, magasin_id;

-- Vérif
SELECT 'commandes_ec' AS info, (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'commandes_ec') AS exists
UNION ALL SELECT 'commandes_ec_lignes', (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'commandes_ec_lignes')
UNION ALL SELECT 'fn_commande_ec_vers_di', (SELECT COUNT(*) FROM pg_proc WHERE proname = 'fn_commande_ec_vers_di')
UNION ALL SELECT 'v_commandes_ec_compteurs', (SELECT COUNT(*) FROM pg_views WHERE viewname = 'v_commandes_ec_compteurs');
