-- ============================================================
--  AVEHO EC — Patch 0.55.33
--  Création des colonnes manquantes sur `etablissements`
--  + verrouillage est_partenaire / groupement_id après création
--  + champs contact/identifiants pour cohérence avec partenaires
--  100% idempotent.
-- ============================================================

-- ============================================================
-- 1) Colonnes manquantes sur etablissements
--    (toutes en ADD COLUMN IF NOT EXISTS pour rester idempotent)
-- ============================================================
alter table etablissements
  -- Adresse complète
  add column if not exists adresse text,
  add column if not exists cp text,
  add column if not exists pays text default 'France',
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  -- Identifiants officiels
  add column if not exists finess text,
  add column if not exists siret text,
  add column if not exists siren text,
  -- Contact référent
  add column if not exists contact_nom text,
  add column if not exists contact_fonction text,
  add column if not exists telephone text,
  add column if not exists email text,
  add column if not exists site_web text,
  -- Notes
  add column if not exists notes text,
  add column if not exists tags text[] default '{}'::text[],
  -- Rétrocompat
  add column if not exists est_partenaire boolean default false;

-- Indexes utiles
create index if not exists idx_etablissements_finess
  on etablissements(finess) where finess is not null;
create index if not exists idx_etablissements_siret
  on etablissements(siret) where siret is not null;
create index if not exists idx_etablissements_cp
  on etablissements(cp) where cp is not null;

-- ============================================================
-- 2) Verrouillage : est_partenaire et groupement_id ne peuvent
--    plus être modifiés après création (à part par un admin)
-- ============================================================
create or replace function trg_lock_etab_critical_fields()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_is_admin boolean;
begin
  -- Si on est en INSERT, on laisse passer
  if TG_OP = 'INSERT' then return new; end if;

  -- Si rien n'a changé sur les champs critiques, laisse passer
  if (old.est_partenaire is not distinct from new.est_partenaire)
     and (old.groupement_id is not distinct from new.groupement_id) then
    return new;
  end if;

  -- Sinon : vérifier que l'appelant est admin parametres
  select bool_or(coalesce((r.droits->>'parametres_admin')::boolean, false)) into v_is_admin
  from membres_structure ms
  left join roles r on r.id = ms.role_id
  where ms.user_id = auth.uid() and ms.structure_id = new.structure_id;

  if not v_is_admin then
    raise exception 'Champs verrouillés : est_partenaire et groupement_id ne peuvent être modifiés que par un admin (parametres_admin)';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_lock_etab_critical on etablissements;
create trigger trg_lock_etab_critical
  before update on etablissements
  for each row execute function trg_lock_etab_critical_fields();

-- ============================================================
-- 3) Idem sur etablissements_partenaires : type_relation
--    et groupement_id verrouillés sauf admin
-- ============================================================
create or replace function trg_lock_etab_partenaires_critical()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_is_admin boolean;
begin
  if TG_OP = 'INSERT' then return new; end if;
  if (old.type_relation is not distinct from new.type_relation)
     and (old.groupement_id is not distinct from new.groupement_id) then
    return new;
  end if;
  select bool_or(coalesce((r.droits->>'parametres_admin')::boolean, false)) into v_is_admin
  from membres_structure ms
  left join roles r on r.id = ms.role_id
  where ms.user_id = auth.uid() and ms.structure_id = new.structure_id;
  if not v_is_admin then
    raise exception 'Champs verrouillés : type_relation et groupement_id ne peuvent être modifiés que par un admin';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lock_etab_part_critical on etablissements_partenaires;
create trigger trg_lock_etab_part_critical
  before update on etablissements_partenaires
  for each row execute function trg_lock_etab_partenaires_critical();

-- ============================================================
-- 4) Étendre invitations avec un flag d'origine RPPS
--    (pour repérer celles créées depuis l'annuaire RPPS)
-- ============================================================
alter table invitations
  add column if not exists origine text default 'manuelle';
  -- valeurs possibles : 'manuelle', 'rpps_annuaire', 'rpps_partenaire'

-- ============================================================
-- 5) RPC link_partenaire_rpps_to_etablissement
--    Rattache un partenaire RPPS (personne physique) à un
--    établissement (peut être etablissements OU etablissements_partenaires)
-- ============================================================
create or replace function link_partenaire_rpps_to_etablissement(
  p_partenaire_rpps_id uuid,
  p_etablissement_id uuid
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_struct_id uuid;
  v_current_ids uuid[];
begin
  select structure_id, etablissement_ids into v_struct_id, v_current_ids
  from partenaires_rpps where id = p_partenaire_rpps_id;

  if v_struct_id is null then
    return jsonb_build_object('ok', false, 'error', 'Partenaire RPPS introuvable');
  end if;

  -- Vérifier que l'appelant a accès à la structure
  if not exists (
    select 1 from membres_structure
    where user_id = auth.uid() and structure_id = v_struct_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'Permission refusée');
  end if;

  -- Ajouter l'établissement à la liste (sans doublon)
  if v_current_ids @> array[p_etablissement_id] then
    return jsonb_build_object('ok', true, 'already_linked', true);
  end if;

  update partenaires_rpps
  set etablissement_ids = array_append(coalesce(etablissement_ids, '{}'::uuid[]), p_etablissement_id)
  where id = p_partenaire_rpps_id;

  return jsonb_build_object('ok', true);
exception when others then
  return jsonb_build_object('ok', false, 'error', SQLERRM);
end;
$$;

revoke all on function link_partenaire_rpps_to_etablissement(uuid, uuid) from public;
grant execute on function link_partenaire_rpps_to_etablissement(uuid, uuid) to authenticated;

-- ============================================================
-- 6) RPC unlink (retire un rattachement)
-- ============================================================
create or replace function unlink_partenaire_rpps_from_etablissement(
  p_partenaire_rpps_id uuid,
  p_etablissement_id uuid
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_struct_id uuid;
begin
  select structure_id into v_struct_id
  from partenaires_rpps where id = p_partenaire_rpps_id;

  if v_struct_id is null then
    return jsonb_build_object('ok', false, 'error', 'Partenaire RPPS introuvable');
  end if;

  if not exists (
    select 1 from membres_structure
    where user_id = auth.uid() and structure_id = v_struct_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'Permission refusée');
  end if;

  update partenaires_rpps
  set etablissement_ids = array_remove(coalesce(etablissement_ids, '{}'::uuid[]), p_etablissement_id)
  where id = p_partenaire_rpps_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function unlink_partenaire_rpps_from_etablissement(uuid, uuid) from public;
grant execute on function unlink_partenaire_rpps_from_etablissement(uuid, uuid) to authenticated;

-- Fin du patch 0.55.33
