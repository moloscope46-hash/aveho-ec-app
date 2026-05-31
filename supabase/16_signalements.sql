-- ============================================================
--  AVEHO EC — Signalements anonymes (Alpha 0.12)
--  Boîte à idées / problèmes terrain. Visibles par tous les
--  membres de la collectivité, sans identifier l'auteur (sauf
--  si la personne signe explicitement via le champ signature).
--  À exécuter APRÈS 15_tags_materiel.sql
-- ============================================================

create table if not exists signalements (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade not null,
  etablissement_id uuid references etablissements(id) on delete cascade,
  type text not null,             -- "Problème" | "Idée" | "Question" | "Autre"
  titre text not null,
  description text not null,
  signature text,                  -- optionnel : nom/poste si l'auteur veut signer
  statut text not null default 'Nouveau', -- "Nouveau" | "En cours" | "Traité" | "Archivé"
  reponse text,                    -- réponse de la direction si elle en fait une
  reponse_par text,                -- qui a répondu (visible publiquement)
  reponse_le timestamptz,
  created_at timestamptz default now()
  -- NOTE : pas de user_id sur cette table. Volontaire pour l'anonymat.
);
create index if not exists idx_signal_struct on signalements (structure_id);
create index if not exists idx_signal_statut on signalements (statut);
create index if not exists idx_signal_type on signalements (type);

alter table signalements enable row level security;

drop policy if exists "signal_insert" on signalements;
drop policy if exists "signal_select" on signalements;
drop policy if exists "signal_update" on signalements;
drop policy if exists "signal_delete" on signalements;

-- Tous les membres peuvent créer un signalement
create policy "signal_insert" on signalements for insert
  with check (structure_id in (select mes_structures()));

-- Tous les membres voient tous les signalements (transparence)
create policy "signal_select" on signalements for select
  using (structure_id in (select mes_structures()));

-- Modification ouverte aux membres (l'app applique son propre filtrage admin)
create policy "signal_update" on signalements for update
  using (structure_id in (select mes_structures()));

create policy "signal_delete" on signalements for delete
  using (structure_id in (select mes_structures()));
