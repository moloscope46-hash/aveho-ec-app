-- =============================================================
-- DIAGNOSTIC-rattachement-magasin.sql
-- À EXÉCUTER pour diagnostiquer pourquoi tu peux rien créer côté magasin
-- =============================================================

-- 1. Es-tu reconnu comme utilisateur_magasin ?
SELECT
  'Mon compte' AS info,
  m.user_id,
  m.prenom,
  m.nom,
  m.email,
  m.role_professionnel,
  m.magasin_fournisseur_id,
  CASE
    WHEN m.magasin_fournisseur_id IS NULL THEN '❌ Pas rattaché — création impossible'
    WHEN m.role_professionnel != 'utilisateur_magasin' THEN '⚠ Pas rôle utilisateur_magasin'
    ELSE '✓ OK'
  END AS diagnostic
FROM membres_structure m
WHERE m.user_id = auth.uid();

-- 2. Quels magasins existent dans ta structure ?
SELECT
  'Magasins existants' AS info,
  id,
  nom,
  ville,
  code
FROM magasins
LIMIT 10;

-- 3. SI rien dans #2, créer un magasin par défaut :
-- INSERT INTO magasins (nom, ville, structure_id, actif)
-- VALUES ('Mon Magasin Aveho', 'Mayrinhac-Lentour',
--   (SELECT structure_id FROM membres_structure WHERE user_id = auth.uid() LIMIT 1),
--   true);

-- 4. PUIS rattacher ton user au premier magasin :
-- UPDATE membres_structure
-- SET magasin_fournisseur_id = (SELECT id FROM magasins LIMIT 1),
--     role_professionnel = 'utilisateur_magasin'
-- WHERE user_id = auth.uid();

-- 5. Re-exécute la requête #1 pour confirmer
