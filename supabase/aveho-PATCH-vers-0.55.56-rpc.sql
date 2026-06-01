-- ============================================================
--  AVEHO EC — Patch 0.55.56 SUITE
--  Fonctions RPC pour seed batch du dump RPPS (5000 lignes/appel)
--  À jouer APRÈS le patch principal 0.55.56.
-- ============================================================

-- RPC : upsert batch (5000 lignes max par appel)
create or replace function upsert_rpps_dump_batch(rows jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count int;
begin
  with src as (
    select * from jsonb_to_recordset(rows) as r(
      rpps text, adeli text, civilite text, nom text, prenom text,
      profession_code text, profession_libelle text,
      specialite_code text, specialite_libelle text,
      categorie_pro text, mode_exercice text,
      raison_sociale_lieu text, finess text,
      adresse text, complement_adresse text,
      code_postal text, ville text, code_insee_commune text,
      telephone text, email text,
      latitude numeric, longitude numeric,
      date_extrait date
    )
  ),
  ins as (
    insert into rpps_dump (
      rpps, adeli, civilite, nom, prenom,
      profession_code, profession_libelle, specialite_code, specialite_libelle,
      categorie_pro, mode_exercice,
      raison_sociale_lieu, finess,
      adresse, complement_adresse, code_postal, ville, code_insee_commune,
      telephone, email, latitude, longitude, date_extrait
    )
    select
      rpps, adeli, civilite, nom, prenom,
      profession_code, profession_libelle, specialite_code, specialite_libelle,
      categorie_pro, mode_exercice,
      raison_sociale_lieu, finess,
      adresse, complement_adresse, code_postal, ville, code_insee_commune,
      telephone, email, latitude, longitude, date_extrait
    from src
    where rpps is not null and nom is not null
    on conflict (rpps) do update set
      adeli = excluded.adeli,
      civilite = excluded.civilite,
      nom = excluded.nom,
      prenom = excluded.prenom,
      profession_code = excluded.profession_code,
      profession_libelle = excluded.profession_libelle,
      specialite_code = excluded.specialite_code,
      specialite_libelle = excluded.specialite_libelle,
      categorie_pro = excluded.categorie_pro,
      mode_exercice = excluded.mode_exercice,
      raison_sociale_lieu = excluded.raison_sociale_lieu,
      finess = excluded.finess,
      adresse = excluded.adresse,
      complement_adresse = excluded.complement_adresse,
      code_postal = excluded.code_postal,
      ville = excluded.ville,
      code_insee_commune = excluded.code_insee_commune,
      telephone = excluded.telephone,
      email = excluded.email,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      date_extrait = excluded.date_extrait,
      updated_at = now()
    returning 1
  )
  select count(*) into inserted_count from ins;

  return inserted_count;
end;
$$;

grant execute on function upsert_rpps_dump_batch to authenticated;

-- RPC : maj du méta (à appeler après le dernier batch)
create or replace function rpps_dump_meta_update(
  p_status text,
  p_message text default null,
  p_source_url text default null,
  p_source_extract_date date default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update rpps_dump_meta set
    seed_status = p_status,
    seed_message = p_message,
    source_url = coalesce(p_source_url, source_url),
    source_extract_date = coalesce(p_source_extract_date, source_extract_date),
    last_seed_at = case when p_status = 'completed' then now() else last_seed_at end,
    last_seed_user_id = case when p_status = 'completed' then auth.uid() else last_seed_user_id end,
    total_records = case when p_status = 'completed' then (select count(*) from rpps_dump) else total_records end
  where id = 1;
end;
$$;

grant execute on function rpps_dump_meta_update to authenticated;

-- RPC : vider la table (avant un seed complet)
create or replace function rpps_dump_truncate() returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  truncate table rpps_dump;
  update rpps_dump_meta set
    seed_status = 'seeding',
    seed_message = 'Table vidée, en attente d''insertion',
    total_records = 0
  where id = 1;
end;
$$;

grant execute on function rpps_dump_truncate to authenticated;

-- Fin du patch 0.55.56 SUITE
