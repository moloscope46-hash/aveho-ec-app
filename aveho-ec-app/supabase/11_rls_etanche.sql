-- ============================================================
--  AVEHO EC — RLS étanche par établissement (Alpha 0.5)
--  Ajoute une COUCHE supplémentaire de RLS au niveau établissement,
--  en plus de la RLS collectivité existante. Les deux s'appliquent
--  conjointement (AND).
--
--  PRINCIPE :
--    - Si l'utilisateur a au moins un rattachement membres_etablissements,
--      il ne voit QUE les données des établissements auxquels il est rattaché.
--    - Si l'utilisateur n'a AUCUN rattachement etab (= admin collectivité),
--      il voit tout dans sa collectivité (fallback).
--
--  À exécuter APRÈS 10_audit.sql.
-- ============================================================

-- ---------- FONCTION : établissements accessibles par l'utilisateur ----------
-- Retourne les UUIDs des établissements auxquels l'utilisateur est rattaché.
-- Si l'utilisateur n'a aucun rattachement, retourne TOUS les établissements
-- de sa collectivité (= comportement "admin collectivité").
create or replace function mes_etablissements()
returns table(etab_id uuid)
language sql security definer set search_path = public
as $$
  with rattachements as (
    select etablissement_id from membres_etablissements where user_id = auth.uid()
  )
  select etablissement_id from membres_etablissements where user_id = auth.uid()
  union
  select e.id from etablissements e
  where not exists (select 1 from rattachements)
    and e.structure_id in (select mes_structures());
$$;

-- ---------- DROP des anciennes politiques (pour les remplacer proprement) ----------
-- Pour chaque table avec etablissement_id, on remplace la politique "*_all"
-- par deux politiques distinctes : select (étanche etab) + write (étanche etab).
do $$
declare
  tables_etab text[] := array['patients','articles','materiels','interventions','depots','zones','stock_articles','transferts','commandes','batiments'];
  t text;
begin
  foreach t in array tables_etab loop
    execute format('drop policy if exists "%s all" on %I', t, t);
    execute format('drop policy if exists "%s_select_etab" on %I', t, t);
    execute format('drop policy if exists "%s_write_etab" on %I', t, t);
  end loop;
end $$;

-- ---------- POLITIQUES ÉTANCHES par établissement ----------
-- patients
create policy "patients_select_etab" on patients for select
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));
create policy "patients_write_etab" on patients for all
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())))
  with check (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));

-- articles
create policy "articles_select_etab" on articles for select
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));
create policy "articles_write_etab" on articles for all
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())))
  with check (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));

-- materiels
create policy "materiels_select_etab" on materiels for select
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));
create policy "materiels_write_etab" on materiels for all
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())))
  with check (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));

-- interventions
create policy "interventions_select_etab" on interventions for select
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));
create policy "interventions_write_etab" on interventions for all
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())))
  with check (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));

-- depots, zones, stock_articles
create policy "depots_select_etab" on depots for select
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));
create policy "depots_write_etab" on depots for all
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())))
  with check (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));

create policy "zones_select_etab" on zones for select
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));
create policy "zones_write_etab" on zones for all
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())))
  with check (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));

create policy "stock_articles_select_etab" on stock_articles for select
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));
create policy "stock_articles_write_etab" on stock_articles for all
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())))
  with check (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));

-- transferts, commandes
create policy "transferts_select_etab" on transferts for select
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));
create policy "transferts_write_etab" on transferts for all
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())))
  with check (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));

create policy "commandes_select_etab" on commandes for select
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));
create policy "commandes_write_etab" on commandes for all
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())))
  with check (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));

-- batiments (et donc indirectement etages, services, chambres, lits via cascade RLS héritée)
create policy "batiments_select_etab" on batiments for select
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));
create policy "batiments_write_etab" on batiments for all
  using (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())))
  with check (structure_id in (select mes_structures())
    and (etablissement_id is null or etablissement_id in (select etab_id from mes_etablissements())));

-- ---------- ÉTAGES / SERVICES / CHAMBRES / LITS ----------
-- Ces tables n'ont pas de structure_id ni etablissement_id, mais elles sont
-- liées à un bâtiment (cascade). On ajoute une RLS via EXISTS sur la chaîne.
drop policy if exists "etages_rls" on etages;
create policy "etages_rls" on etages for all
  using (exists (select 1 from batiments b where b.id = etages.batiment_id
    and b.structure_id in (select mes_structures())
    and (b.etablissement_id is null or b.etablissement_id in (select etab_id from mes_etablissements()))))
  with check (exists (select 1 from batiments b where b.id = etages.batiment_id
    and b.structure_id in (select mes_structures())
    and (b.etablissement_id is null or b.etablissement_id in (select etab_id from mes_etablissements()))));

drop policy if exists "services_rls" on services;
create policy "services_rls" on services for all
  using (exists (select 1 from etages e join batiments b on b.id = e.batiment_id
    where e.id = services.etage_id
    and b.structure_id in (select mes_structures())
    and (b.etablissement_id is null or b.etablissement_id in (select etab_id from mes_etablissements()))))
  with check (exists (select 1 from etages e join batiments b on b.id = e.batiment_id
    where e.id = services.etage_id
    and b.structure_id in (select mes_structures())
    and (b.etablissement_id is null or b.etablissement_id in (select etab_id from mes_etablissements()))));

drop policy if exists "chambres_rls" on chambres;
create policy "chambres_rls" on chambres for all
  using (exists (select 1 from services s join etages e on e.id = s.etage_id join batiments b on b.id = e.batiment_id
    where s.id = chambres.service_id
    and b.structure_id in (select mes_structures())
    and (b.etablissement_id is null or b.etablissement_id in (select etab_id from mes_etablissements()))))
  with check (exists (select 1 from services s join etages e on e.id = s.etage_id join batiments b on b.id = e.batiment_id
    where s.id = chambres.service_id
    and b.structure_id in (select mes_structures())
    and (b.etablissement_id is null or b.etablissement_id in (select etab_id from mes_etablissements()))));

drop policy if exists "lits_rls" on lits;
create policy "lits_rls" on lits for all
  using (exists (select 1 from chambres c join services s on s.id = c.service_id join etages e on e.id = s.etage_id join batiments b on b.id = e.batiment_id
    where c.id = lits.chambre_id
    and b.structure_id in (select mes_structures())
    and (b.etablissement_id is null or b.etablissement_id in (select etab_id from mes_etablissements()))))
  with check (exists (select 1 from chambres c join services s on s.id = c.service_id join etages e on e.id = s.etage_id join batiments b on b.id = e.batiment_id
    where c.id = lits.chambre_id
    and b.structure_id in (select mes_structures())
    and (b.etablissement_id is null or b.etablissement_id in (select etab_id from mes_etablissements()))));

-- ---------- TEST DE COHÉRENCE ----------
-- Pour vérifier que tout est en place après exécution :
-- select tablename, policyname from pg_policies where schemaname='public' and policyname like '%etab%' order by tablename;
