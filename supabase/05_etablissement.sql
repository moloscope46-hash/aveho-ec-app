-- ============================================================
--  AVEHO EC — Bloc Mon établissement
--  Bâtiment > Étage > Service > Chambre > Lit, lits reliés aux patients
--  À exécuter APRÈS 02_referentiel.sql
-- ============================================================

create table if not exists batiments (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade,
  nom text not null, created_at timestamptz default now()
);
create table if not exists etages (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade,
  batiment_id uuid references batiments(id) on delete cascade,
  nom text not null, created_at timestamptz default now()
);
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade,
  etage_id uuid references etages(id) on delete cascade,
  nom text not null, created_at timestamptz default now()
);
create table if not exists chambres (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade,
  service_id uuid references services(id) on delete cascade,
  nom text not null, created_at timestamptz default now()
);
create table if not exists lits (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade,
  chambre_id uuid references chambres(id) on delete cascade,
  nom text not null,
  patient_id uuid references patients(id) on delete set null,
  created_at timestamptz default now()
);

alter table batiments enable row level security;
alter table etages    enable row level security;
alter table services  enable row level security;
alter table chambres  enable row level security;
alter table lits      enable row level security;

create policy "batiments all" on batiments for all using (structure_id in (select mes_structures())) with check (structure_id in (select mes_structures()));
create policy "etages all"    on etages    for all using (structure_id in (select mes_structures())) with check (structure_id in (select mes_structures()));
create policy "services all"  on services  for all using (structure_id in (select mes_structures())) with check (structure_id in (select mes_structures()));
create policy "chambres all"  on chambres  for all using (structure_id in (select mes_structures())) with check (structure_id in (select mes_structures()));
create policy "lits all"      on lits      for all using (structure_id in (select mes_structures())) with check (structure_id in (select mes_structures()));

-- ---------- DÉMO (Hôpital Cédric) ----------
do $$
declare
  sid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  b1 uuid; e1 uuid; e2 uuid; s1 uuid; s2 uuid; s3 uuid; c uuid;
  p1 uuid; p2 uuid; p3 uuid;
begin
  select id into p1 from patients where structure_id=sid and nom='MARTIN' limit 1;
  select id into p2 from patients where structure_id=sid and nom='DURAND' limit 1;
  select id into p3 from patients where structure_id=sid and nom='PETIT'  limit 1;

  insert into batiments (structure_id,nom) values (sid,'Bâtiment Principal') returning id into b1;
  insert into etages (structure_id,batiment_id,nom) values (sid,b1,'Rez-de-chaussée') returning id into e1;
  insert into etages (structure_id,batiment_id,nom) values (sid,b1,'1er étage') returning id into e2;

  insert into services (structure_id,etage_id,nom) values (sid,e1,'Médecine générale') returning id into s1;
  insert into services (structure_id,etage_id,nom) values (sid,e1,'Soins de suite') returning id into s2;
  insert into services (structure_id,etage_id,nom) values (sid,e2,'Gériatrie') returning id into s3;

  insert into chambres (structure_id,service_id,nom) values (sid,s1,'104') returning id into c;
  insert into lits (structure_id,chambre_id,nom,patient_id) values (sid,c,'1',p1),(sid,c,'2',null);
  insert into chambres (structure_id,service_id,nom) values (sid,s1,'105') returning id into c;
  insert into lits (structure_id,chambre_id,nom,patient_id) values (sid,c,'1',null),(sid,c,'2',null);
  insert into chambres (structure_id,service_id,nom) values (sid,s2,'118') returning id into c;
  insert into lits (structure_id,chambre_id,nom,patient_id) values (sid,c,'1',p3);
  insert into chambres (structure_id,service_id,nom) values (sid,s3,'210') returning id into c;
  insert into lits (structure_id,chambre_id,nom,patient_id) values (sid,c,'1',p2),(sid,c,'2',null);
  insert into chambres (structure_id,service_id,nom) values (sid,s3,'211') returning id into c;
  insert into lits (structure_id,chambre_id,nom,patient_id) values (sid,c,'1',null);
end $$;
