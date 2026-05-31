-- ============================================================
--  AVEHO EC — Patch 0.55.3
--  Idempotent, à exécuter dans Supabase > SQL Editor.
--
--  Ajoute la notion d'établissement partenaire (= structure 
--  référencée pour livraisons/contacts mais non gérée par la 
--  collectivité — ex: hôpitaux prescripteurs).
-- ============================================================

alter table etablissements
  add column if not exists est_partenaire boolean not null default false;

-- Index pour filtrer rapidement les non-partenaires (les étabs "actifs" 
-- gérés par la collectivité), utilisé par le switcher d'établissement.
create index if not exists idx_etablissements_partenaire
  on etablissements (structure_id, est_partenaire);

-- Reload PostgREST cache
notify pgrst, 'reload schema';

-- Vérif :
-- select id, nom, type, est_partenaire from etablissements limit 10;
