-- ============================================================
--  AVEHO EC — Patch 0.55.43
--  Système anti-doublon réutilisable pour les établissements
--  + nouveau droit force_doublon_etab
--  100% idempotent.
-- ============================================================

-- ============================================================
-- 1) Colonnes RPPS sur etablissements_partenaires (0.55.44 : ajout avant index)
--    Doit être fait AVANT l'index rpps ci-dessous, sinon erreur 42703
-- ============================================================
alter table etablissements_partenaires
  add column if not exists rpps text,
  add column if not exists adeli text,
  add column if not exists profession text,
  add column if not exists specialite text;

-- ============================================================
-- 2) Colonnes commentaire doublon sur les tables étab
-- ============================================================
alter table etablissements
  add column if not exists doublon_force_commentaire text,
  add column if not exists doublon_force_par uuid references auth.users(id) on delete set null,
  add column if not exists doublon_force_at timestamptz;

alter table etablissements_partenaires
  add column if not exists doublon_force_commentaire text,
  add column if not exists doublon_force_par uuid references auth.users(id) on delete set null,
  add column if not exists doublon_force_at timestamptz;

-- Index pour lookup rapide doublons par identifiants officiels
create index if not exists idx_etab_finess on etablissements(structure_id, finess) where finess is not null;
create index if not exists idx_etab_siret on etablissements(structure_id, siret) where siret is not null;
create index if not exists idx_etab_part_finess on etablissements_partenaires(structure_id, finess) where finess is not null;
create index if not exists idx_etab_part_siret on etablissements_partenaires(structure_id, siret) where siret is not null;
create index if not exists idx_etab_part_rpps on etablissements_partenaires(structure_id, rpps) where rpps is not null;

-- ============================================================
-- 2) RPC : check_etab_doublon — recherche un doublon par identifiants
--    Retourne TOUS les matches (mine + partner) trouvés
-- ============================================================
create or replace function check_etab_doublon(
  p_finess text default null,
  p_siret text default null,
  p_siren text default null,
  p_rpps text default null,
  p_nom text default null,
  p_exclude_id uuid default null  -- pour éviter de matcher soi-même en édition
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_struct_id uuid;
  v_results jsonb := '[]'::jsonb;
  v_row jsonb;
begin
  -- Trouve la structure du user courant
  select structure_id into v_struct_id
  from membres_structure where user_id = auth.uid() limit 1;

  if v_struct_id is null then
    return jsonb_build_object('ok', false, 'error', 'Pas de structure');
  end if;

  -- Search dans etablissements (mes étab)
  for v_row in
    select jsonb_build_object(
      'kind', 'mine',
      'id', e.id,
      'nom', e.nom,
      'type', e.type,
      'finess', e.finess,
      'siret', e.siret,
      'adresse', e.adresse,
      'cp', e.cp,
      'ville', e.ville,
      'matched_on', case
        when p_finess is not null and e.finess = p_finess then 'finess'
        when p_siret is not null and e.siret = p_siret then 'siret'
        when p_siren is not null and e.siret like p_siren || '%' then 'siren'
        when p_nom is not null and lower(e.nom) = lower(p_nom) then 'nom'
        else null
      end,
      'created_at', e.created_at,
      'doublon_force_commentaire', e.doublon_force_commentaire,
      'doublon_force_par', e.doublon_force_par,
      'doublon_force_at', e.doublon_force_at
    )
    from etablissements e
    where e.structure_id = v_struct_id
      and (p_exclude_id is null or e.id <> p_exclude_id)
      and (
        (p_finess is not null and e.finess = p_finess)
        or (p_siret is not null and e.siret = p_siret)
        or (p_siren is not null and e.siret like p_siren || '%')
        or (p_nom is not null and length(p_nom) > 3 and lower(e.nom) = lower(p_nom))
      )
  loop
    v_results := v_results || v_row;
  end loop;

  -- Search dans etablissements_partenaires
  for v_row in
    select jsonb_build_object(
      'kind', 'partner',
      'id', ep.id,
      'nom', ep.nom,
      'type', ep.type,
      'type_relation', ep.type_relation,
      'finess', ep.finess,
      'siret', ep.siret,
      'rpps', ep.rpps,
      'adresse', ep.adresse,
      'cp', ep.cp,
      'ville', ep.ville,
      'matched_on', case
        when p_finess is not null and ep.finess = p_finess then 'finess'
        when p_siret is not null and ep.siret = p_siret then 'siret'
        when p_siren is not null and ep.siret like p_siren || '%' then 'siren'
        when p_rpps is not null and ep.rpps = p_rpps then 'rpps'
        when p_nom is not null and lower(ep.nom) = lower(p_nom) then 'nom'
        else null
      end,
      'created_at', ep.created_at,
      'created_by', ep.created_by,
      'doublon_force_commentaire', ep.doublon_force_commentaire,
      'doublon_force_par', ep.doublon_force_par,
      'doublon_force_at', ep.doublon_force_at
    )
    from etablissements_partenaires ep
    where ep.structure_id = v_struct_id
      and (p_exclude_id is null or ep.id <> p_exclude_id)
      and (
        (p_finess is not null and ep.finess = p_finess)
        or (p_siret is not null and ep.siret = p_siret)
        or (p_siren is not null and ep.siret like p_siren || '%')
        or (p_rpps is not null and ep.rpps = p_rpps)
        or (p_nom is not null and length(p_nom) > 3 and lower(ep.nom) = lower(p_nom))
      )
  loop
    v_results := v_results || v_row;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'found', jsonb_array_length(v_results) > 0,
    'count', jsonb_array_length(v_results),
    'matches', v_results
  );
end;
$$;

revoke all on function check_etab_doublon(text, text, text, text, text, uuid) from public;
grant execute on function check_etab_doublon(text, text, text, text, text, uuid) to authenticated;

-- ============================================================
-- 3) Vue récap : qui force des doublons et pour quelle raison
--    (utile pour audit admin)
-- ============================================================
drop view if exists v_doublons_forces;
create view v_doublons_forces as
select
  'mine' as kind,
  e.id,
  e.structure_id,
  e.nom,
  e.finess,
  e.siret,
  null::text as rpps,
  e.doublon_force_commentaire,
  e.doublon_force_par,
  e.doublon_force_at
from etablissements e
where e.doublon_force_commentaire is not null
union all
select
  'partner' as kind,
  ep.id,
  ep.structure_id,
  ep.nom,
  ep.finess,
  ep.siret,
  ep.rpps,
  ep.doublon_force_commentaire,
  ep.doublon_force_par,
  ep.doublon_force_at
from etablissements_partenaires ep
where ep.doublon_force_commentaire is not null;

alter view v_doublons_forces set (security_invoker = true);

-- Fin du patch 0.55.43
