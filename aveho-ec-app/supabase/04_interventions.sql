-- ============================================================
--  AVEHO EC — Bloc Demandes d'intervention (mise à jour)
--  Relie les DI aux matériels/patients/emplacements et au transfert généré.
--  À exécuter APRÈS 02_referentiel.sql et 03_stock.sql
-- ============================================================

-- emplacement où se trouve le matériel concerné par la DI
alter table interventions add column if not exists depot_id    uuid references depots(id) on delete set null;
alter table interventions add column if not exists zone_id     uuid references zones(id)  on delete set null;
-- transfert éventuellement généré depuis la DI (ex: reprise -> dépôt)
alter table interventions add column if not exists transfert_id uuid references transferts(id) on delete set null;

-- (type, urgence, materiel_id, patient_id, description, statut existent déjà)

-- données de démo : 2 DI rattachées à du matériel réel de Hôpital Cédric
do $$
declare
  sid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  mat uuid; pat uuid;
begin
  select id into mat from materiels where structure_id = sid limit 1;
  select id into pat from patients  where structure_id = sid limit 1;
  if mat is not null then
    insert into interventions (structure_id, numero, type, urgence, materiel_id, patient_id, description, statut)
    values
      (sid, 'DI-4012', 'Panne / réparation', 'Urgent', mat, pat, 'Roue avant bloquée, frein HS', 'Planifiée'),
      (sid, 'DI-3998', 'Maintenance préventive', 'Normal', mat, pat, 'Contrôle annuel', 'Nouvelle');
  end if;
end $$;
