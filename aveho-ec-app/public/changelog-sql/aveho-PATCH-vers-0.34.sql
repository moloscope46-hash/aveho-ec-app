-- ============================================================
--  AVEHO EC — Patch 0.34.0 (Modèles consentement personnalisables)
--  Idempotent, à exécuter dans Supabase > SQL Editor.
--
--  Sort le template de consentement du code vers la base de données.
--  Chaque collectivité peut maintenant avoir son propre template,
--  avec un versionning pour préserver l'audit RGPD (les consentements
--  signés gardent une référence vers la version utilisée).
--
--  Note importante : les consentements existants conservent leur
--  texte intégral dans le champ texte_consentement de
--  consentements_rgpd. Aucune perte d'historique.
-- ============================================================

-- ============================================================
-- 1) Table consent_templates
-- ============================================================
-- Une ligne par version de template × collectivité.
-- Le template actif (is_active = true) est utilisé pour les nouveaux
-- consentements. Les anciens templates restent pour l'audit.
create table if not exists consent_templates (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null references structures(id) on delete cascade,
  -- Versioning : x.y (incrémental, on n'efface jamais une version utilisée)
  version text not null,
  -- Status
  is_active boolean not null default false,
  -- Contenu (markdown léger comme dans lib/rgpd.js)
  contenu_md text not null,
  -- Métadonnées
  nom text,                       -- "Template standard 2026"
  description text,               -- "Inclut clause télé-suivi"
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  activated_at timestamptz,
  -- Unique : 1 seule version active par structure
  -- (géré par trigger plus bas)
  unique (structure_id, version)
);

-- ============================================================
-- 2) Index pour requêtes fréquentes
-- ============================================================
create index if not exists idx_consent_templates_struct 
  on consent_templates (structure_id);
create index if not exists idx_consent_templates_active 
  on consent_templates (structure_id) 
  where is_active = true;

-- ============================================================
-- 3) Trigger : un seul template actif par structure
-- ============================================================
create or replace function ensure_single_active_template()
returns trigger
language plpgsql
as $$
begin
  -- Si on active un template, désactiver les autres de la même structure
  if NEW.is_active = true then
    update consent_templates
       set is_active = false
     where structure_id = NEW.structure_id
       and id != NEW.id
       and is_active = true;
    -- Mettre activated_at si pas déjà fait
    if NEW.activated_at is null then
      NEW.activated_at := now();
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists tg_single_active_template on consent_templates;
create trigger tg_single_active_template
  before insert or update of is_active on consent_templates
  for each row execute function ensure_single_active_template();

-- ============================================================
-- 4) RLS — Lecture libre pour membres, écriture pour admins
-- ============================================================
-- Note : roles.systeme est BOOLEAN (rôle non supprimable). Pas un type d'admin.
-- La détection "admin" se fait par : nom = 'Administrateur'
-- OU par présence de la permission dans droits/permissions_json.
alter table consent_templates enable row level security;

drop policy if exists "consent_templates_select" on consent_templates;
create policy "consent_templates_select"
  on consent_templates for select
  using (
    -- Membre de la structure peut lire
    exists (
      select 1 from membres_structure m
      where m.user_id = auth.uid()
        and m.structure_id = consent_templates.structure_id
    )
  );

drop policy if exists "consent_templates_insert" on consent_templates;
create policy "consent_templates_insert"
  on consent_templates for insert
  with check (
    -- Admin de la structure peut créer
    -- Reconnaît : nom = 'Administrateur' OU permission manage_roles/manage_collectivite
    -- dans le jsonb droits (format array ou objet).
    exists (
      select 1 from membres_structure m
      join roles r on r.id = m.role_id
      where m.user_id = auth.uid()
        and m.structure_id = consent_templates.structure_id
        and (
          r.nom = 'Administrateur'
          or r.droits::text ilike '%manage_roles%'
          or r.droits::text ilike '%manage_collectivite%'
          or coalesce(r.permissions_json::text, '') ilike '%manage_roles%'
          or coalesce(r.permissions_json::text, '') ilike '%manage_collectivite%'
        )
    )
  );

drop policy if exists "consent_templates_update" on consent_templates;
create policy "consent_templates_update"
  on consent_templates for update
  using (
    exists (
      select 1 from membres_structure m
      join roles r on r.id = m.role_id
      where m.user_id = auth.uid()
        and m.structure_id = consent_templates.structure_id
        and (
          r.nom = 'Administrateur'
          or r.droits::text ilike '%manage_roles%'
          or r.droits::text ilike '%manage_collectivite%'
          or coalesce(r.permissions_json::text, '') ilike '%manage_roles%'
          or coalesce(r.permissions_json::text, '') ilike '%manage_collectivite%'
        )
    )
  );

-- Pas de DELETE : on ne supprime jamais un template utilisé
-- (sinon perte traçabilité audit). Pour "désactiver", mettre is_active=false.

-- ============================================================
-- 5) Référence template depuis consentements_rgpd
-- ============================================================
-- Ajout d'une colonne template_id NULLABLE pour rattacher un consentement
-- à la version exacte de template utilisée. NULL = ancien consentement
-- (pré-0.34) où le template était en dur dans le code.
alter table consentements_rgpd
  add column if not exists template_id uuid references consent_templates(id) on delete set null;

create index if not exists idx_consent_rgpd_template
  on consentements_rgpd (template_id)
  where template_id is not null;

-- ============================================================
-- 6) Vue helper : template actif par structure
-- ============================================================
create or replace view v_consent_template_actif as
select 
  structure_id,
  id as template_id,
  version,
  contenu_md,
  nom,
  description,
  activated_at
from consent_templates
where is_active = true;

-- ============================================================
-- FIN DU PATCH 0.34.0
-- ============================================================
-- Vérifications :
--
--   -- Voir les templates de ma structure
--   select id, version, is_active, nom 
--   from consent_templates 
--   where structure_id = 'XXX'
--   order by created_at desc;
--
--   -- Template actuellement utilisé
--   select * from v_consent_template_actif where structure_id = 'XXX';
--
--   -- Combien de consentements signés avec template custom vs dur (NULL)
--   select 
--     count(*) filter (where template_id is null) as ancien_template_hardcode,
--     count(*) filter (where template_id is not null) as nouveau_template_db
--   from consentements_rgpd 
--   where structure_id = 'XXX' and statut = 'signe';
