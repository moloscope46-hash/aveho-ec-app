-- ============================================================
--  AVEHO EC — Bloc Notifications (Alpha 0.3)
--  Table notifications + RLS par collectivité.
--  À exécuter APRÈS 07_collectivite.sql
-- ============================================================

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,  -- destinataire (null = tous les membres)
  type text not null,                                         -- 'transfert','di','invitation','commande','systeme'
  titre text not null,
  message text,
  lien text,                                                  -- chemin relatif (ex: '/transferts')
  lue boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_notif_user on notifications (user_id, lue, created_at desc);
create index if not exists idx_notif_struct on notifications (structure_id, created_at desc);

alter table notifications enable row level security;

-- Politique : je vois mes notifs personnelles + celles destinées "à tous" dans ma collectivité
create policy "notif_select" on notifications for select
  using (
    structure_id in (select mes_structures())
    and (user_id is null or user_id = auth.uid())
  );

-- Création : un admin ou un service peut créer une notif pour quelqu'un dans sa collectivité
create policy "notif_insert" on notifications for insert
  with check (structure_id in (select mes_structures()));

-- Mise à jour : on ne peut marquer comme lue QUE ses propres notifs
create policy "notif_update" on notifications for update
  using (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid() or user_id is null);

-- Suppression : optionnelle, on autorise pour ses propres notifs
create policy "notif_delete" on notifications for delete
  using (user_id = auth.uid());

-- Quelques notifs de démo pour voir la cloche s'animer
do $$
declare
  sid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
begin
  insert into notifications (structure_id, type, titre, message, lien)
  values
    (sid, 'systeme', 'Bienvenue dans Aveho EC', 'Votre Espace Collectivité est prêt. Explorez les modules depuis le menu.', null),
    (sid, 'transfert', 'Nouveau transfert à valider', 'Un transfert de réapprovisionnement est en attente.', '/transferts'),
    (sid, 'di', 'DI urgente sur matériel', 'Une demande d''intervention urgente vient d''être créée.', '/interventions')
  on conflict do nothing;
end $$;
