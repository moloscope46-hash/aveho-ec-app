-- =============================================================
-- Migration 0.58.47 : ajout colonne `icone` aux tables de tags
-- =============================================================
-- À exécuter dans Supabase SQL Editor.
-- Ajoute un champ texte optionnel pour stocker un nom d'icône Tabler
-- (ex: "ti-stethoscope", "ti-bolt", "ti-medical-cross").
-- Si null, l'icône par défaut "ti-tag" est utilisée à l'affichage.
-- =============================================================

-- 1. Tags matériel
ALTER TABLE tags_materiel
ADD COLUMN IF NOT EXISTS icone TEXT;

COMMENT ON COLUMN tags_materiel.icone IS '0.58.47 - Icône Tabler optionnelle (ex: ti-stethoscope). NULL = ti-tag par défaut';

-- 2. Étiquettes patient (= tags client/patient)
ALTER TABLE etiquettes
ADD COLUMN IF NOT EXISTS icone TEXT;

COMMENT ON COLUMN etiquettes.icone IS '0.58.47 - Icône Tabler optionnelle pour personnaliser le marqueur';

-- 3. Annonces (icône custom qui surcharge l'icône par défaut du niveau)
ALTER TABLE annonces
ADD COLUMN IF NOT EXISTS icone TEXT;

COMMENT ON COLUMN annonces.icone IS '0.58.47 - Icône Tabler optionnelle (surcharge l''icône par défaut du niveau)';

-- =============================================================
-- Vérification (optionnel)
-- =============================================================
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE column_name = 'icone' AND table_name IN ('tags_materiel', 'etiquettes', 'annonces');
