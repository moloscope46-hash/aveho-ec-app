-- ============================================================
--  AVEHO EC — Patch 0.55.31
--  Table DÉDIÉE etablissements_partenaires (séparée d'etablissements)
--  Migration des données existantes (est_partenaire=true → nouvelle table)
--  Table d'audit dédiée etab_partenaires_audit + triggers
--  100% idempotent. Compatible avec le SQL 0.55.30 (recoupe sans rejouer).
-- ============================================================

-- ============================================================
-- 1) RAPPEL HOTFIX 0.55.30 (si pas encore joué)
-- ============================================================
alter table etablissements
  add column if not exists groupement_id uuid;

create index if not exists idx_etablissements_groupement
  on etablissements(groupement_id) where groupement_id is not null;

-- ============================================================
-- 2) Table dédiée : etablissements_partenaires
--    Séparée d'etablissements pour :
--     - Champs spécifiques aux externes (siret, contact, type relation)
--     - RLS et sécurité distinctes
--     - Requêtes propres (pas de WHERE est_partenaire = true partout)
-- ============================================================
create table if not exists etablissements_partenaires (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null references structures(id) on delete cascade,
  -- Identité
  nom text not null,
  type text,                          -- "Hôpital", "Cabinet", "Pharmacie", etc.
  type_relation text,                 -- "Prescripteur", "Fournisseur", "Sous-traitant", "Autre"
  -- Identifiants officiels
  finess text,                        -- N° FINESS (établissements de santé)
  siret text,                         -- N° SIRET
  siren text,
  -- Adresse
  adresse text,
  cp text,
  ville text,
  pays text default 'France',
  latitude numeric,
  longitude numeric,
  -- Contact
  contact_nom text,                   -- nom du référent
  contact_fonction text,
  telephone text,
  email text,
  site_web text,
  -- Métadonnées
  notes text,
  tags text[] default '{}',
  groupement_id uuid,                 -- rattachement à un groupement éventuel
  -- Liens
  link_to_etablissement_id uuid references etablissements(id) on delete set null,
                                      -- pour transition douce : si on avait déjà un
                                      -- etablissement avec est_partenaire=true,
                                      -- on garde le pointeur
  -- État
  actif boolean not null default true,
  archive boolean not null default false,
  -- Audit
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Index
create index if not exists idx_etab_part_struct on etablissements_partenaires(structure_id) where archive = false;
create index if not exists idx_etab_part_finess on etablissements_partenaires(finess) where finess is not null;
create index if not exists idx_etab_part_siret on etablissements_partenaires(siret) where siret is not null;
create index if not exists idx_etab_part_groupement on etablissements_partenaires(groupement_id) where groupement_id is not null;

-- RLS
alter table etablissements_partenaires enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'etablissements_partenaires' and policyname = 'etab_part_member_rw') then
    create policy etab_part_member_rw on etablissements_partenaires for all using (
      structure_id in (select structure_id from membres_structure where user_id = auth.uid())
    ) with check (
      structure_id in (select structure_id from membres_structure where user_id = auth.uid())
    );
  end if;
end $$;

-- Trigger updated_at + updated_by
create or replace function trg_etab_part_updated_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_etab_part_updated_at on etablissements_partenaires;
create trigger trg_etab_part_updated_at
  before update on etablissements_partenaires
  for each row execute function trg_etab_part_updated_at();

-- ============================================================
-- 3) Table d'audit DÉDIÉE etab_partenaires_audit
--    Tracks toutes les modifications sur etablissements_partenaires
-- ============================================================
create table if not exists etab_partenaires_audit (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  action text not null,               -- 'INSERT', 'UPDATE', 'DELETE'
  partenaire_id uuid,                  -- ref vers etablissements_partenaires (peut être null si DELETE)
  structure_id uuid,
  user_id uuid,                       -- auteur de l'action
  old_data jsonb,                     -- snapshot avant (UPDATE/DELETE)
  new_data jsonb,                     -- snapshot après (INSERT/UPDATE)
  changes jsonb                       -- diff colonne-par-colonne (UPDATE)
);

create index if not exists idx_etab_part_audit_ts on etab_partenaires_audit(ts desc);
create index if not exists idx_etab_part_audit_struct on etab_partenaires_audit(structure_id, ts desc);
create index if not exists idx_etab_part_audit_partenaire on etab_partenaires_audit(partenaire_id);

-- RLS : seuls les admins de la structure peuvent lire l'audit
alter table etab_partenaires_audit enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'etab_partenaires_audit' and policyname = 'etab_part_audit_admin_read') then
    create policy etab_part_audit_admin_read on etab_partenaires_audit
      for select using (
        exists (
          select 1 from membres_structure ms
          left join roles r on r.id = ms.role_id
          where ms.user_id = auth.uid()
            and ms.structure_id = etab_partenaires_audit.structure_id
            and (coalesce((r.droits->>'parametres_admin')::boolean, false)
                 or coalesce((r.droits->>'utilisateurs_write')::boolean, false))
        )
      );
  end if;
end $$;

-- Insert : ouvert (les triggers y écrivent via security definer)
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'etab_partenaires_audit' and policyname = 'etab_part_audit_insert') then
    create policy etab_part_audit_insert on etab_partenaires_audit
      for insert with check (true);
  end if;
end $$;

-- ============================================================
-- 4) Trigger d'audit sur etablissements_partenaires
-- ============================================================
create or replace function trg_audit_etab_partenaires()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_changes jsonb := '{}'::jsonb;
  v_key text;
begin
  if TG_OP = 'INSERT' then
    insert into etab_partenaires_audit (action, partenaire_id, structure_id, user_id, new_data)
    values ('INSERT', new.id, new.structure_id, auth.uid(), to_jsonb(new));
    return new;
  elsif TG_OP = 'UPDATE' then
    -- Calculer le diff
    for v_key in select jsonb_object_keys(to_jsonb(new)) loop
      if to_jsonb(new)->v_key is distinct from to_jsonb(old)->v_key then
        v_changes := v_changes || jsonb_build_object(v_key, jsonb_build_object('old', to_jsonb(old)->v_key, 'new', to_jsonb(new)->v_key));
      end if;
    end loop;
    if v_changes != '{}'::jsonb then
      insert into etab_partenaires_audit (action, partenaire_id, structure_id, user_id, old_data, new_data, changes)
      values ('UPDATE', new.id, new.structure_id, auth.uid(), to_jsonb(old), to_jsonb(new), v_changes);
    end if;
    return new;
  elsif TG_OP = 'DELETE' then
    insert into etab_partenaires_audit (action, partenaire_id, structure_id, user_id, old_data)
    values ('DELETE', old.id, old.structure_id, auth.uid(), to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_audit_etab_partenaires on etablissements_partenaires;
create trigger trg_audit_etab_partenaires
  after insert or update or delete on etablissements_partenaires
  for each row execute function trg_audit_etab_partenaires();

-- ============================================================
-- 5) Migration : copier les etablissements existants avec est_partenaire=true
--    vers la nouvelle table etablissements_partenaires
--    Idempotent : si déjà migré, ne refait pas
--    ROBUSTE : utilise jsonb pour tolérer un schéma variable
--    (certains champs comme cp/latitude/longitude peuvent ne pas exister
--     selon les structures clients)
-- ============================================================
do $$
declare
  e jsonb;
  v_migrated int := 0;
begin
  for e in
    select to_jsonb(t) from etablissements t
    where t.est_partenaire = true
      and not exists (
        select 1 from etablissements_partenaires ep
        where ep.link_to_etablissement_id = t.id
      )
  loop
    begin
      insert into etablissements_partenaires (
        structure_id, nom, type, adresse, cp, ville, latitude, longitude,
        groupement_id, link_to_etablissement_id, actif, created_at
      )
      values (
        (e->>'structure_id')::uuid,
        e->>'nom',
        e->>'type',
        e->>'adresse',
        e->>'cp',
        e->>'ville',
        nullif(e->>'latitude', '')::numeric,
        nullif(e->>'longitude', '')::numeric,
        nullif(e->>'groupement_id', '')::uuid,
        (e->>'id')::uuid,
        coalesce((e->>'actif')::boolean, true),
        coalesce((e->>'created_at')::timestamptz, now())
      );
      v_migrated := v_migrated + 1;
    exception when others then
      raise notice 'Migration partenaire échouée (id=%) : %', e->>'id', SQLERRM;
    end;
  end loop;
  raise notice 'Migration : % partenaires copiés vers etablissements_partenaires', v_migrated;
end $$;

-- ============================================================
-- 6) Vue unifiée v_etablissements_all
--    Pour les pages qui veulent voir Mes + Partenaires en un seul SELECT
--    ROBUSTE : la colonne cp peut ne pas exister sur etablissements,
--    on construit la vue dynamiquement
-- ============================================================
drop view if exists v_etablissements_all;

do $$
declare
  v_has_cp boolean;
  v_has_groupement boolean;
  v_sql text;
begin
  select exists(select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'etablissements' and column_name = 'cp')
    into v_has_cp;
  select exists(select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'etablissements' and column_name = 'groupement_id')
    into v_has_groupement;

  v_sql := format($q$
    create view v_etablissements_all as
      select
        id, structure_id, nom, type, ville, actif,
        %s as cp,
        %s as groupement_id,
        false as est_partenaire,
        'mine'::text as source,
        null::uuid as link_to_etablissement_id,
        null::text as type_relation
      from etablissements
      where coalesce(est_partenaire, false) = false
    union all
      select
        ep.id, ep.structure_id, ep.nom, ep.type, ep.ville, ep.actif,
        ep.cp,
        ep.groupement_id,
        true as est_partenaire,
        'partner'::text as source,
        ep.link_to_etablissement_id,
        ep.type_relation
      from etablissements_partenaires ep
      where ep.archive = false;
  $q$,
    case when v_has_cp then 'cp' else 'null::text' end,
    case when v_has_groupement then 'groupement_id' else 'null::uuid' end
  );

  execute v_sql;
end $$;

alter view v_etablissements_all set (security_invoker = true);

-- ============================================================
-- 7) RPC convert_etab_to_partner — bascule un etablissement
--    legacy vers la nouvelle table partenaires
--    ROBUSTE : accès via jsonb pour tolérer schéma variable
-- ============================================================
create or replace function convert_etab_to_partner(p_etab_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  e jsonb;
  v_struct_id uuid;
  v_new_id uuid;
  v_is_admin boolean;
begin
  select to_jsonb(t) into e from etablissements t where t.id = p_etab_id;
  if e is null then
    return jsonb_build_object('ok', false, 'error', 'Établissement introuvable');
  end if;
  v_struct_id := (e->>'structure_id')::uuid;

  -- Vérif droits
  select bool_or(coalesce((r.droits->>'parametres_admin')::boolean, false)) into v_is_admin
  from membres_structure ms
  left join roles r on r.id = ms.role_id
  where ms.user_id = auth.uid() and ms.structure_id = v_struct_id;

  if not v_is_admin then
    return jsonb_build_object('ok', false, 'error', 'Permission refusée');
  end if;

  insert into etablissements_partenaires (
    structure_id, nom, type, adresse, cp, ville, latitude, longitude,
    groupement_id, link_to_etablissement_id, actif, created_by
  )
  values (
    v_struct_id,
    e->>'nom',
    e->>'type',
    e->>'adresse',
    e->>'cp',
    e->>'ville',
    nullif(e->>'latitude', '')::numeric,
    nullif(e->>'longitude', '')::numeric,
    nullif(e->>'groupement_id', '')::uuid,
    p_etab_id,
    true,
    auth.uid()
  )
  returning id into v_new_id;

  -- Marquer l'établissement origine comme archivé / partenaire pour ne pas le dupliquer
  update etablissements set est_partenaire = true where id = p_etab_id;

  return jsonb_build_object('ok', true, 'partenaire_id', v_new_id);
exception when others then
  return jsonb_build_object('ok', false, 'error', SQLERRM);
end;
$$;

revoke all on function convert_etab_to_partner(uuid) from public;
grant execute on function convert_etab_to_partner(uuid) to authenticated;

-- Fin du patch 0.55.31
