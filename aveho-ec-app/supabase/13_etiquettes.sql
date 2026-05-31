-- ============================================================
--  AVEHO EC — Étiquettes patients (Alpha 0.9)
--  Permet d'étiqueter les patients avec des marqueurs colorés
--  personnalisables par collectivité (chronique, allergie, etc.).
--  À exécuter APRÈS 12_di_assignation.sql
-- ============================================================

-- Table des étiquettes possibles, définies par collectivité
create table if not exists etiquettes (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade not null,
  libelle text not null,                  -- ex: "Chronique", "Sortie prévue"
  couleur text not null default '#7CC8C8', -- code hex
  description text,
  created_at timestamptz default now()
);
create index if not exists idx_etiquettes_struct on etiquettes (structure_id);
alter table etiquettes enable row level security;
create policy "etiquettes_select" on etiquettes for select
  using (structure_id in (select mes_structures()));
create policy "etiquettes_write" on etiquettes for all
  using (structure_id in (select mes_structures()))
  with check (structure_id in (select mes_structures()));

-- Table de liaison patient ↔ étiquettes (n:n)
create table if not exists patient_etiquettes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade not null,
  etiquette_id uuid references etiquettes(id) on delete cascade not null,
  structure_id uuid references structures(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (patient_id, etiquette_id)
);
create index if not exists idx_pat_etq_pat on patient_etiquettes (patient_id);
create index if not exists idx_pat_etq_etq on patient_etiquettes (etiquette_id);
alter table patient_etiquettes enable row level security;
create policy "pat_etq_select" on patient_etiquettes for select
  using (structure_id in (select mes_structures()));
create policy "pat_etq_write" on patient_etiquettes for all
  using (structure_id in (select mes_structures()))
  with check (structure_id in (select mes_structures()));

-- Quelques étiquettes démo (insérées seulement si la collectivité existe)
do $$
declare
  sid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
begin
  if exists (select 1 from structures where id = sid) then
    insert into etiquettes (structure_id, libelle, couleur, description) values
      (sid, 'Chronique', '#7a6fb0', 'Patient avec affection longue durée'),
      (sid, 'Sortie prévue', '#5aa05a', 'Sortie programmée dans les 7 jours'),
      (sid, 'Allergie connue', '#e35d5b', 'Allergie médicamenteuse documentée'),
      (sid, 'À surveiller', '#EF9F27', 'Suivi médical renforcé'),
      (sid, 'Isolement', '#C9867F', 'Isolement contact ou respiratoire')
    on conflict do nothing;
  end if;
end $$;
