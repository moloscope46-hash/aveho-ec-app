-- ============================================================
--  AVEHO EC — Patch 0.20.0 (Full-text search + utils)
--  VERSION ROBUSTE : détecte dynamiquement les colonnes présentes
--  Idempotent, à exécuter dans Supabase > SQL Editor.
-- ============================================================

-- ============================================================
-- 1) Configuration FTS française avec accent-insensitive
-- ============================================================
create extension if not exists unaccent;

do $$
begin
  if not exists (select 1 from pg_ts_config where cfgname = 'aveho_fr') then
    create text search configuration aveho_fr (copy = french);
    alter text search configuration aveho_fr
      alter mapping for hword, hword_part, word with unaccent, french_stem;
  end if;
end $$;

-- ============================================================
-- 2) Colonne tsvector générée sur patients
-- Construit l'expression dynamiquement selon les colonnes existantes
-- ============================================================
do $$
declare
  expr text := '';
  has_col boolean;
begin
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'patients' and column_name = 'search_vector'
  ) then
    raise notice 'patients.search_vector existe déjà, skip';
  else
    expr := 'coalesce(nom, '''')';

    select exists(select 1 from information_schema.columns where table_name='patients' and column_name='prenom') into has_col;
    if has_col then expr := expr || ' || '' '' || coalesce(prenom, '''')'; end if;

    select exists(select 1 from information_schema.columns where table_name='patients' and column_name='chambre') into has_col;
    if has_col then expr := expr || ' || '' '' || coalesce(chambre, '''')'; end if;

    select exists(select 1 from information_schema.columns where table_name='patients' and column_name='numero_dossier') into has_col;
    if has_col then expr := expr || ' || '' '' || coalesce(numero_dossier, '''')'; end if;

    select exists(select 1 from information_schema.columns where table_name='patients' and column_name='num_dossier') into has_col;
    if has_col then expr := expr || ' || '' '' || coalesce(num_dossier, '''')'; end if;

    select exists(select 1 from information_schema.columns where table_name='patients' and column_name='medecin_traitant') into has_col;
    if has_col then expr := expr || ' || '' '' || coalesce(medecin_traitant, '''')'; end if;

    select exists(select 1 from information_schema.columns where table_name='patients' and column_name='ipp') into has_col;
    if has_col then expr := expr || ' || '' '' || coalesce(ipp, '''')'; end if;

    execute format(
      'alter table patients add column search_vector tsvector generated always as (to_tsvector(''aveho_fr'', %s)) stored',
      expr
    );
    raise notice 'patients.search_vector créée avec expression : %', expr;
  end if;
end $$;

create index if not exists idx_patients_search 
  on patients using gin (search_vector);

-- ============================================================
-- 3) Colonne tsvector générée sur materiels
-- ============================================================
do $$
declare
  expr text := '';
  has_col boolean;
begin
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'materiels' and column_name = 'search_vector'
  ) then
    raise notice 'materiels.search_vector existe déjà, skip';
  else
    expr := 'coalesce(libelle, '''')';

    select exists(select 1 from information_schema.columns where table_name='materiels' and column_name='num_serie') into has_col;
    if has_col then expr := expr || ' || '' '' || coalesce(num_serie, '''')'; end if;

    select exists(select 1 from information_schema.columns where table_name='materiels' and column_name='num_parc') into has_col;
    if has_col then expr := expr || ' || '' '' || coalesce(num_parc, '''')'; end if;

    select exists(select 1 from information_schema.columns where table_name='materiels' and column_name='num_lot') into has_col;
    if has_col then expr := expr || ' || '' '' || coalesce(num_lot, '''')'; end if;

    execute format(
      'alter table materiels add column search_vector tsvector generated always as (to_tsvector(''aveho_fr'', %s)) stored',
      expr
    );
    raise notice 'materiels.search_vector créée avec expression : %', expr;
  end if;
end $$;

create index if not exists idx_materiels_search 
  on materiels using gin (search_vector);

-- ============================================================
-- 4) RPC pour recherche patients/materiels
-- Colonnes garanties (présentes depuis 0.1) : 
-- patients : id, nom, prenom, chambre
-- materiels : id, libelle, num_serie, num_parc, num_lot
-- ============================================================
create or replace function search_patients(q text, lim int default 10)
returns table (id uuid, nom text, prenom text, chambre text, rank real)
language sql
stable
as $$
  select p.id, p.nom, p.prenom, p.chambre,
    ts_rank(p.search_vector, plainto_tsquery('aveho_fr', q)) as rank
  from patients p
  where p.search_vector @@ plainto_tsquery('aveho_fr', q)
  order by rank desc
  limit lim;
$$;

create or replace function search_materiels(q text, lim int default 10)
returns table (id uuid, libelle text, num_serie text, num_parc text, num_lot text, rank real)
language sql
stable
as $$
  select m.id, m.libelle, m.num_serie, m.num_parc, m.num_lot,
    ts_rank(m.search_vector, plainto_tsquery('aveho_fr', q)) as rank
  from materiels m
  where m.search_vector @@ plainto_tsquery('aveho_fr', q)
  order by rank desc
  limit lim;
$$;

-- ============================================================
-- FIN DU PATCH 0.20.0
-- ============================================================
-- Vérifications :
--   -- Voir les NOTICES Postgres pour savoir quelles colonnes ont été indexées
--   -- (panneau "Messages" du SQL Editor Supabase)
--
--   -- Tests fonctionnels :
--   select * from search_patients('dupont', 5);
--   select * from search_materiels('lit', 5);
--
--   -- Voir l'expression générée :
--   select column_name, generation_expression 
--   from information_schema.columns
--   where table_name in ('patients', 'materiels') and column_name = 'search_vector';
