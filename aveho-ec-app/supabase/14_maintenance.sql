-- ============================================================
--  AVEHO EC — Maintenance préventive du matériel (Alpha 0.10)
--  Permet de planifier les contrôles périodiques du matériel
--  (révision annuelle, étalonnage, vérification sécurité, etc.)
--  À exécuter APRÈS 13_etiquettes.sql
-- ============================================================

create table if not exists maintenances (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade not null,
  etablissement_id uuid references etablissements(id) on delete cascade,
  materiel_id uuid references materiels(id) on delete cascade not null,
  type text not null,                       -- ex: "Révision annuelle", "Étalonnage", "Contrôle sécurité"
  date_prevue date not null,                -- date planifiée
  date_realisee date,                       -- renseignée quand effectuée
  statut text not null default 'Planifiée', -- "Planifiée" | "À faire" | "Faite" | "En retard" | "Annulée"
  intervenant text,                         -- nom du technicien/prestataire (libre)
  notes text,
  assignee_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_maint_struct on maintenances (structure_id);
create index if not exists idx_maint_mat on maintenances (materiel_id);
create index if not exists idx_maint_date on maintenances (date_prevue);
create index if not exists idx_maint_statut on maintenances (statut);

-- RLS
alter table maintenances enable row level security;
create policy "maint_select" on maintenances for select
  using (structure_id in (select mes_structures()));
create policy "maint_write" on maintenances for all
  using (structure_id in (select mes_structures()))
  with check (structure_id in (select mes_structures()));

-- Trigger : recalcul du statut "En retard" automatiquement à la lecture (via vue)
-- On garde simple : le calcul du statut En retard est fait côté app

-- Quelques maintenances démo
do $$
declare
  sid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  eid uuid;
  mid uuid;
begin
  if exists (select 1 from structures where id = sid) then
    select id into eid from etablissements where structure_id = sid limit 1;
    select id into mid from materiels where structure_id = sid limit 1;
    if mid is not null then
      insert into maintenances (structure_id, etablissement_id, materiel_id, type, date_prevue, statut, intervenant, notes) values
        (sid, eid, mid, 'Révision annuelle', current_date + interval '15 days', 'Planifiée', 'Tech Aveho', 'Vérification générale et nettoyage'),
        (sid, eid, mid, 'Contrôle sécurité', current_date - interval '5 days', 'En retard', 'Bureau Veritas', 'Test électrique annuel obligatoire'),
        (sid, eid, mid, 'Étalonnage', current_date + interval '45 days', 'Planifiée', null, null)
      on conflict do nothing;
    end if;
  end if;
end $$;
