-- ============================================================
--  AVEHO EC — Bloc Audit log (Alpha 0.4)
--  Table d'historique des actions : qui a fait quoi, quand.
--  À exécuter APRÈS 09_parametres.sql
-- ============================================================

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid references structures(id) on delete cascade,
  etablissement_id uuid references etablissements(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,                  -- snapshot de l'email au cas où l'user est supprimé
  action text not null,             -- 'creer','modifier','supprimer','valider','recevoir','inviter','connexion'
  entite text not null,             -- 'patient','materiel','transfert','di','commande',...
  entite_id uuid,                   -- ID de l'objet concerné (peut être null)
  details jsonb,                    -- payload libre : champs changés, ancien/nouveau, etc.
  created_at timestamptz default now()
);
create index if not exists idx_audit_struct on audit_log (structure_id, created_at desc);
create index if not exists idx_audit_user on audit_log (user_id, created_at desc);
create index if not exists idx_audit_entite on audit_log (entite, entite_id);

alter table audit_log enable row level security;

-- Lecture : tout membre de la collectivité peut consulter l'historique
create policy "audit_select" on audit_log for select
  using (structure_id in (select mes_structures()));

-- Insertion : tout membre peut insérer dans sa propre collectivité (l'app pose user_id = auth.uid())
create policy "audit_insert" on audit_log for insert
  with check (structure_id in (select mes_structures()));

-- Pas de suppression ni mise à jour : l'audit log est immutable.
