-- ============================================================
--  AVEHO EC — Patch 0.55.29
--  Enrichissement utilisateurs : champs RPPS récupérés depuis
--  l'API FHIR ANS (numéro RPPS, ADELI, profession, spécialité).
--  100% idempotent.
-- ============================================================

-- ============================================================
-- 1) invitations : champs RPPS pour pré-remplissage
-- ============================================================
alter table invitations
  add column if not exists rpps text,
  add column if not exists adeli text,
  add column if not exists rpps_profession text,
  add column if not exists rpps_specialite text,
  add column if not exists rpps_mode_exercice text;

-- Index pour recherche par RPPS
create index if not exists idx_invitations_rpps 
  on invitations(rpps) where rpps is not null;

-- ============================================================
-- 2) membres_structure : mêmes champs
-- ============================================================
alter table membres_structure
  add column if not exists rpps text,
  add column if not exists adeli text,
  add column if not exists rpps_profession text,
  add column if not exists rpps_specialite text,
  add column if not exists rpps_mode_exercice text;

create index if not exists idx_membres_rpps 
  on membres_structure(structure_id, rpps) 
  where rpps is not null;

-- ============================================================
-- 3) Mise à jour de la vue v_user_complete pour exposer ces champs
-- ============================================================
drop view if exists v_user_complete;

create view v_user_complete as
select
  ms.user_id,
  ms.structure_id,
  ms.nom_affiche,
  ms.poste,
  ms.telephone,
  ms.matricule,
  ms.date_arrivee,
  ms.date_fin_contrat,
  ms.date_naissance,
  ms.contact_urgence_nom,
  ms.contact_urgence_tel,
  ms.adresse,
  ms.specialite,
  ms.diplome,
  ms.notes,
  ms.role_id,
  ms.archive,
  ms.locked_fields,
  ms.restreint_services,
  -- 0.55.29 : champs RPPS
  ms.rpps,
  ms.adeli,
  ms.rpps_profession,
  ms.rpps_specialite,
  ms.rpps_mode_exercice,
  -- biométrie
  (select count(*) from webauthn_credentials wc 
   where wc.user_id = ms.user_id and wc.active = true) as bio_devices_count,
  exists(select 1 from webauthn_credentials wc 
         where wc.user_id = ms.user_id 
           and wc.auth_method = 'empreinte' 
           and wc.active = true) as has_empreinte,
  exists(select 1 from webauthn_credentials wc 
         where wc.user_id = ms.user_id 
           and wc.auth_method = 'face' 
           and wc.active = true) as has_face
from membres_structure ms;

-- Réappliquer le security_invoker (perdu lors du DROP)
alter view v_user_complete set (security_invoker = true);

-- ============================================================
-- 4) RPC get_invitation_full mise à jour (avec RPPS)
-- ============================================================
create or replace function get_invitation_full(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv invitations%rowtype;
begin
  select * into v_inv from invitations 
  where token = p_token 
    and archive = false 
    and expires_at > now();

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Invitation introuvable ou expirée');
  end if;

  return jsonb_build_object(
    'ok', true,
    'email', v_inv.email,
    'role_id', v_inv.role_id,
    'nom_affiche', v_inv.nom_affiche,
    'prenom', v_inv.prenom,
    'telephone', v_inv.telephone,
    'mobile', v_inv.mobile,
    'fonction_detail', v_inv.fonction_detail,
    'matricule', v_inv.matricule,
    'date_arrivee', v_inv.date_arrivee,
    'etablissement_ids', v_inv.etablissement_ids,
    'groupement_id', v_inv.groupement_id,
    'lock_assignment', v_inv.lock_assignment,
    'structure_id', v_inv.structure_id,
    -- 0.55.29 : champs RPPS
    'rpps', v_inv.rpps,
    'adeli', v_inv.adeli,
    'rpps_profession', v_inv.rpps_profession,
    'rpps_specialite', v_inv.rpps_specialite,
    'rpps_mode_exercice', v_inv.rpps_mode_exercice
  );
end;
$$;

-- Fin du patch 0.55.29
