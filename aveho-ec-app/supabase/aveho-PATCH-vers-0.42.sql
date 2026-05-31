-- ============================================================
--  AVEHO EC — Patch 0.42.0
--  Idempotent, à exécuter dans Supabase > SQL Editor.
--
--  1) I - consent_templates.etablissement_id : templates RGPD par établissement
--  2) I - v_consent_template_actif refondue (etab > structure > code)
-- ============================================================

-- ============================================================
-- I - Colonne etablissement_id sur consent_templates
-- ============================================================
-- Nullable : NULL = template global structure ; sinon = template spécifique à l'établissement.
alter table consent_templates 
  add column if not exists etablissement_id uuid references etablissements(id) on delete cascade;

create index if not exists idx_consent_tpl_etab on consent_templates (etablissement_id);

-- ============================================================
-- I - Vue refondue : résout etab > structure > NULL fallback code
-- ============================================================
-- Pour CHAQUE couple (structure, etablissement), retourne le template actif :
-- 1) Le template etablissement-spécifique s'il existe et is_active = true
-- 2) Sinon le template structure (etablissement_id NULL) si is_active = true
-- 3) Sinon NULL (le front utilisera le template hardcodé)
drop view if exists v_consent_template_actif;
create or replace view v_consent_template_actif as
with etabs as (
  select id as etab_id, structure_id from etablissements
),
etab_actifs as (
  -- Template etab-spécifique actif (si présent)
  select 
    e.structure_id,
    e.etab_id as etablissement_id,
    t.id as template_id,
    t.version,
    t.contenu_md,
    t.nom,
    t.description,
    t.activated_at,
    1 as priorite
  from etabs e
  join consent_templates t 
    on t.structure_id = e.structure_id 
    and t.etablissement_id = e.etab_id 
    and t.is_active = true
),
struct_actifs as (
  -- Template global structure actif (fallback si pas de template etab)
  select 
    e.structure_id,
    e.etab_id as etablissement_id,
    t.id as template_id,
    t.version,
    t.contenu_md,
    t.nom,
    t.description,
    t.activated_at,
    2 as priorite
  from etabs e
  join consent_templates t 
    on t.structure_id = e.structure_id 
    and t.etablissement_id is null 
    and t.is_active = true
),
struct_no_etab as (
  -- Pour les patients sans etab : on prend le template global de la structure
  -- (etablissement_id NULL dans la vue)
  select 
    t.structure_id,
    null::uuid as etablissement_id,
    t.id as template_id,
    t.version,
    t.contenu_md,
    t.nom,
    t.description,
    t.activated_at,
    2 as priorite
  from consent_templates t
  where t.etablissement_id is null and t.is_active = true
),
tous as (
  select * from etab_actifs
  union all
  select * from struct_actifs
  union all
  select * from struct_no_etab
),
classed as (
  select *,
    row_number() over (partition by structure_id, etablissement_id order by priorite asc) as rn
  from tous
)
select 
  structure_id,
  etablissement_id,
  template_id,
  version,
  contenu_md,
  nom,
  description,
  activated_at
from classed
where rn = 1;

-- ============================================================
-- FIN DU PATCH 0.42.0
-- ============================================================
-- Vérifications :
--   -- Colonne ajoutée
--   select column_name from information_schema.columns 
--   where table_name='consent_templates' and column_name='etablissement_id';
--
--   -- Vue retourne 1 ligne par (structure, etablissement)
--   select * from v_consent_template_actif limit 10;
