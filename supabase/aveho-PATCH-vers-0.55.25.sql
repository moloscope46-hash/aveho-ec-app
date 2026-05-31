-- ============================================================
--  AVEHO EC — Patch 0.55.25
--  Création utilisateur enrichie : rattachement multi-établissements,
--  lock à l'inscription, et fiche user enrichie (matricule, contacts...)
--  Idempotent — à exécuter dans Supabase > SQL Editor.
-- ============================================================

-- ============================================================
-- 1) invitations : rattachement + lock + champs pré-remplis
-- ============================================================
alter table invitations
  add column if not exists etablissement_ids uuid[] default '{}'::uuid[],
  add column if not exists groupement_id uuid,
  add column if not exists lock_assignment boolean not null default true,
  add column if not exists matricule text,
  add column if not exists date_arrivee date,
  add column if not exists notes_admin text;

-- ============================================================
-- 2) membres_structure : champs RH supplémentaires
-- ============================================================
alter table membres_structure
  add column if not exists matricule text,
  add column if not exists date_naissance date,
  add column if not exists contact_urgence_nom text,
  add column if not exists contact_urgence_tel text,
  add column if not exists adresse text,
  add column if not exists specialite text,
  add column if not exists diplome text,
  add column if not exists date_fin_contrat date,
  add column if not exists locked_fields jsonb not null default '{}'::jsonb;

-- ============================================================
-- 3) Vue v_user_complete : combine membres_structure + activité
--    + auth_methods pour la page /utilisateurs
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

-- ============================================================
-- 4) RPC : reset_user_password — demande de réinitialisation du
--    mot de passe par l'admin (envoie l'email officiel Supabase)
-- ============================================================
create or replace function reset_user_password(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_is_admin boolean;
begin
  -- Vérification : l'appelant doit être admin de la structure
  select bool_or(coalesce((r.droits->>'parametres_admin')::boolean, false)) into v_is_admin
  from membres_structure ms
  left join roles r on r.id = ms.role_id
  where ms.user_id = auth.uid()
    and ms.structure_id in (
      select structure_id from membres_structure where user_id = p_user_id
    );

  if not v_is_admin then
    return jsonb_build_object('ok', false, 'error', 'Permission refusée');
  end if;

  -- Récupérer l'email
  select email into v_email from auth.users where id = p_user_id;
  if v_email is null then
    return jsonb_build_object('ok', false, 'error', 'Utilisateur introuvable');
  end if;

  -- Marquer dans le log applicatif (l'admin doit ensuite envoyer
  -- manuellement le mail depuis l'Edge Function ou le tableau Supabase)
  insert into app_logs (user_id, level, source, message, payload)
  values (
    auth.uid(),
    'info',
    'utilisateurs',
    'Demande de réinitialisation mot de passe',
    jsonb_build_object('target_user_id', p_user_id, 'target_email', v_email)
  );

  return jsonb_build_object('ok', true, 'email', v_email);
exception when others then
  return jsonb_build_object('ok', false, 'error', SQLERRM);
end;
$$;

grant execute on function reset_user_password(uuid) to authenticated;

-- ============================================================
-- 5) RPC : apply_invitation_v2 — applique les champs lockés à
--    l'inscription depuis l'invitation
-- ============================================================
-- (à utiliser dans le flow d'inscription pour figer les champs)
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
    'structure_id', v_inv.structure_id
  );
end;
$$;

grant execute on function get_invitation_full(uuid) to anon, authenticated;

-- Fin du patch 0.55.25
