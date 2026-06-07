"use client";
// Page Utilisateurs — Gestion des membres, rôles personnalisables et invitations
// 0.62.91 : force-dynamic pour éviter erreur Vercel build TDZ
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { fmtDate, relativeTime, activityDotColor } from "../../lib/format";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, FilterBar, IconButton } from "../ui";
import { Avatar, EmptyState, toast } from "../components/ui-premium";
import { KpiRow } from "../kpis";
import { logEvent } from "../../lib/events";
import { dialogs } from "../dialogs";
import RppsSearch from "../components/RppsSearch";
import Modal from "../components/Modal";
import AddressAutocomplete from "../AddressAutocomplete";
import { logger } from "../../lib/logger";
// 0.58.23 : NeonButton premium
import { NeonButton } from "../components/ui-premium";
const MODULES = [
  { k: "patients", l: "Patients" }, { k: "etablissement", l: "Établissement" },
  { k: "materiels", l: "Matériel" }, { k: "articles", l: "Articles" },
  { k: "stock", l: "Stock" }, { k: "transferts", l: "Transferts" },
  { k: "interventions", l: "Interventions" }, { k: "commandes", l: "Commandes" },
  { k: "utilisateurs", l: "Utilisateurs" },
  // 0.55.43 : module doublons. Permission "write" = peut forcer la création d'un doublon avec commentaire
  { k: "doublons", l: "Forcer doublons étab (avec commentaire)" },
];

export default function Utilisateurs() {
  const supabase = createClient();
  const auth = useAuth();
  const router = useRouter();
  const cart = useCart();
  const [tab, setTab] = useState("membres");
  const [membres, setMembres] = useState([]);
  const [roles, setRoles] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [services, setServices] = useState([]);
  const [memServices, setMemServices] = useState([]);
  // 0.62.13 : liste des magasins pour le sélecteur rôle pro
  const [magasinsListe, setMagasinsListe] = useState([]);
  // Alpha 0.17.0 : dernière activité par user (depuis v_user_activity)
  const [lastActivity, setLastActivity] = useState({}); // {user_id: {derniere_activite, nb_actions, actions_7j}}
  const [loading, setLoading] = useState(true);

  // modale rôle
  const [roleModal, setRoleModal] = useState(null);
  const [roleForm, setRoleForm] = useState({ nom: "", description: "", droits: {} });
  // modale invitation
  const [inviteModal, setInviteModal] = useState(false);
  // 0.55.12 : form enrichi pour création utilisateur
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role_id: "",
    nom_affiche: "",
    prenom: "",
    nom: "",
    telephone: "",
    mobile: "",
    fonction_detail: "",
    // 0.55.25 : rattachement multi-établissements + lock
    etablissement_ids: [],   // array d'UUID établissements
    lock_assignment: true,    // l'invité ne peut pas modifier
    matricule: "",            // numéro interne
    date_arrivee: "",
    notes_admin: "",
    // 0.55.29 : champs RPPS pré-remplis depuis l'API FHIR ANS
    rpps: "",
    adeli: "",
    rpps_profession: "",
    rpps_specialite: "",
    rpps_mode_exercice: "",
    // 0.58.55 : si l'user est aussi un collaborateur externe (partenaire prescripteur/IDE/pharmacie),
    //   on l'ajoute aussi dans partenaires_rpps avec les flags correspondants
    type_partenaire: "",  // "" | "prescripteur" | "infirmiere" | "pharmacien"
    est_collaborateur: false,  // badge "collaborateur" si activé
    // 0.62.13 : rôle pro + magasin pour pré-rattacher un user magasin dès la création
    role_professionnel: "",
    magasin_fournisseur_id: "",
  });
  // 0.55.29 : modale de recherche RPPS pour pré-remplir
  const [rppsSearchOpen, setRppsSearchOpen] = useState(false);
  // 0.55.12 : URL de l'invitation après création (pour la copier/montrer)
  const [createdInviteLink, setCreatedInviteLink] = useState(null);
  // Alpha 0.16.0 : filtre archive + modale info user
  const [filtreStatut, setFiltreStatut] = useState("actifs"); // 'actifs' | 'archives' | 'tous'
  // 0.62.52 : pagination grande liste membres (TODO depuis 0.58.31)
  const [membresPage, setMembresPage] = useState(0);
  useEffect(() => { setMembresPage(0); }, [searchMembres, filtreStatut]); // reset page au filtre
  const [filtreInvit, setFiltreInvit] = useState("non-archivees"); // 'non-archivees' | 'archivees' | 'toutes'
  // Alpha 0.20.0 : recherche dans la liste des membres
  const [searchMembres, setSearchMembres] = useState("");
  const [userInfoModal, setUserInfoModal] = useState(null);
  const [userInfoForm, setUserInfoForm] = useState({
    nom_affiche: "", telephone: "", poste: "", notes: "", date_arrivee: "",
    // 0.55.25 : nouveaux champs RH
    matricule: "", date_naissance: "", contact_urgence_nom: "", contact_urgence_tel: "",
    adresse: "", specialite: "", diplome: "", date_fin_contrat: "",
    // 0.55.29 : champs RPPS
    rpps: "", adeli: "", rpps_profession: "", rpps_specialite: "", rpps_mode_exercice: "",
  });
  const [userActivity, setUserActivity] = useState(null); // {nb_actions, derniere_activite, ...}
  const [err, setErr] = useState("");
  // 0.55.17 : méthodes biométriques par user (empreinte/face)
  const [authMethodsByUser, setAuthMethodsByUser] = useState({}); // { user_id: {has_empreinte, has_face, total_devices} }

  async function loadAll() {
    const [m, r, i, s, ms, mag] = await Promise.all([
      supabase.from("membres_structure").select("*, roles(nom)"),
      supabase.from("roles").select("*").order("created_at"),
      supabase.from("invitations").select("*, roles(nom)").order("created_at", { ascending: false }),
      supabase.from("services").select("id,nom"),
      supabase.from("membres_services").select("*"),
      supabase.from("magasins").select("id, nom, ville").order("nom"),
    ]);
    setMembres(m.data || []); setRoles(r.data || []); setInvitations(i.data || []);
    setServices(s.data || []); setMemServices(ms.data || []);
    setMagasinsListe(mag.data || []);
    // Alpha 0.17.0 : charger la dernière activité de chaque membre (vue v_user_activity)
    if (m.data?.length) {
      const userIds = m.data.map(x => x.user_id);
      const { data: act } = await supabase.from("v_user_activity")
        .select("user_id, derniere_activite, nb_actions, actions_7j")
        .in("user_id", userIds);
      const map = {};
      (act || []).forEach(a => { map[a.user_id] = a; });
      setLastActivity(map);

      // 0.55.17 : charger les méthodes bio activées par user
      try {
        const { data: auth_methods } = await supabase.from("v_users_auth_methods")
          .select("user_id, has_empreinte, has_face, total_devices")
          .in("user_id", userIds);
        const amap = {};
        (auth_methods || []).forEach(a => { amap[a.user_id] = a; });
        setAuthMethodsByUser(amap);
      } catch (e) {
        // Si la vue n'existe pas (SQL pas encore passé), on ignore silencieusement
        logger.warn("[utilisateurs] v_users_auth_methods non dispo:", e?.message);
      }
    }
    setLoading(false);
  }
  useEffect(() => { if (auth.ready) loadAll(); }, [auth.ready]);

  // ---- rôles ----
  function openRole(r) {
    if (r) { setRoleForm({ nom: r.nom, description: r.description || "", droits: r.droits || {} }); setRoleModal(r); }
    else { setRoleForm({ nom: "", description: "", droits: {} }); setRoleModal({}); }
    setErr("");
  }
  function toggleDroit(mod, perm) {
    setRoleForm((f) => {
      const cur = new Set(f.droits[mod] || []);
      cur.has(perm) ? cur.delete(perm) : cur.add(perm);
      // write implique read
      if (perm === "write" && cur.has("write")) cur.add("read");
      const d = { ...f.droits };
      if (cur.size) d[mod] = [...cur]; else delete d[mod];
      return { ...f, droits: d };
    });
  }
  async function saveRole() {
    if (!roleForm.nom) { setErr("Nom du rôle requis."); return; }
    const payload = { nom: roleForm.nom, description: roleForm.description, droits: roleForm.droits };
    if (roleModal.id) await supabase.from("roles").update(payload).eq("id", roleModal.id);
    else await supabase.from("roles").insert({ ...payload, structure_id: auth.structureId });
    setRoleModal(null); await loadAll();
  }
  async function delRole(r) {
    if (r.systeme) { toast.error("Rôle système non supprimable."); return; }
    if (!await dialogs.confirm({ title: "Supprimer ce rôle ?", variant: "danger" })) return;
    await supabase.from("roles").delete().eq("id", r.id); await loadAll();
  }

  // ---- membre : changer rôle / services / statut ----
  async function setMembreRole(userId, roleId) {
    await supabase.from("membres_structure").update({ role_id: roleId || null }).eq("user_id", userId).eq("structure_id", auth.structureId);
    await loadAll();
  }
  async function toggleActif(m) {
    await supabase.from("membres_structure").update({ actif: !m.actif }).eq("user_id", m.user_id).eq("structure_id", auth.structureId);
    await loadAll();
  }
  async function toggleService(userId, serviceId, has) {
    if (has) await supabase.from("membres_services").delete().eq("user_id", userId).eq("service_id", serviceId);
    else await supabase.from("membres_services").insert({ user_id: userId, service_id: serviceId, structure_id: auth.structureId });
    await loadAll();
  }
  async function toggleRestreint(m) {
    await supabase.from("membres_structure").update({ restreint_services: !m.restreint_services }).eq("user_id", m.user_id).eq("structure_id", auth.structureId);
    await loadAll();
  }
  // Alpha 0.16.0 : archiver / restaurer un membre
  async function toggleArchive(m) {
    const nouvellevaleur = !m.archive;
    const action = nouvellevaleur ? "Archiver" : "Restaurer";
    if (!await dialogs.confirm({ title: `${action} ${m.nom_affiche || "ce membre"} ?`, variant: "danger" })) return;
    await supabase.from("membres_structure")
      .update({ archive: nouvellevaleur })
      .eq("user_id", m.user_id)
      .eq("structure_id", auth.structureId);
    await logEvent(supabase, auth, {
      action: nouvellevaleur ? "archiver" : "restaurer",
      entite: "utilisateur", entite_id: m.user_id,
      details: { nom: m.nom_affiche },
    });
    await loadAll();
  }
  // Alpha 0.16.0 : ouvrir la modale info user
  async function openUserInfo(m) {
    setUserInfoModal(m);
    setUserInfoForm({
      nom_affiche: m.nom_affiche || "",
      telephone: m.telephone || "",
      poste: m.poste || "",
      notes: m.notes || "",
      date_arrivee: m.date_arrivee || "",
      // 0.55.25 : nouveaux champs RH
      matricule: m.matricule || "",
      date_naissance: m.date_naissance || "",
      contact_urgence_nom: m.contact_urgence_nom || "",
      contact_urgence_tel: m.contact_urgence_tel || "",
      adresse: m.adresse || "",
      specialite: m.specialite || "",
      diplome: m.diplome || "",
      date_fin_contrat: m.date_fin_contrat || "",
      // 0.55.29 : champs RPPS
      rpps: m.rpps || "",
      adeli: m.adeli || "",
      rpps_profession: m.rpps_profession || "",
      rpps_specialite: m.rpps_specialite || "",
      rpps_mode_exercice: m.rpps_mode_exercice || "",
    });
    setUserActivity(null);
    // Charger l'activité depuis audit_log
    const { data } = await supabase.from("audit_log")
      .select("created_at")
      .eq("structure_id", auth.structureId)
      .eq("user_id", m.user_id)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (data) {
      const now = Date.now();
      setUserActivity({
        nb_actions: data.length,
        derniere_activite: data[0]?.created_at || null,
        actions_7j: data.filter(d => now - new Date(d.created_at).getTime() < 7*86400000).length,
        actions_30j: data.filter(d => now - new Date(d.created_at).getTime() < 30*86400000).length,
      });
    } else setUserActivity({ nb_actions: 0, derniere_activite: null, actions_7j: 0, actions_30j: 0 });
  }
  async function saveUserInfo() {
    if (!userInfoModal) return;
    const updates = {
      nom_affiche: userInfoForm.nom_affiche || null,
      telephone: userInfoForm.telephone || null,
      poste: userInfoForm.poste || null,
      notes: userInfoForm.notes || null,
      date_arrivee: userInfoForm.date_arrivee || null,
    };
    // 0.55.25 + 0.55.29 : tenter d'ajouter les nouveaux champs (peut échouer si SQL pas passé → fallback)
    try {
      Object.assign(updates, {
        matricule: userInfoForm.matricule || null,
        date_naissance: userInfoForm.date_naissance || null,
        contact_urgence_nom: userInfoForm.contact_urgence_nom || null,
        contact_urgence_tel: userInfoForm.contact_urgence_tel || null,
        adresse: userInfoForm.adresse || null,
        specialite: userInfoForm.specialite || null,
        diplome: userInfoForm.diplome || null,
        date_fin_contrat: userInfoForm.date_fin_contrat || null,
        // 0.55.29 : RPPS
        rpps: userInfoForm.rpps || null,
        adeli: userInfoForm.adeli || null,
        rpps_profession: userInfoForm.rpps_profession || null,
        rpps_specialite: userInfoForm.rpps_specialite || null,
        rpps_mode_exercice: userInfoForm.rpps_mode_exercice || null,
      });
    } catch {}
    const { error } = await supabase.from("membres_structure")
      .update(updates)
      .eq("user_id", userInfoModal.user_id)
      .eq("structure_id", auth.structureId);
    if (error) {
      // Si la colonne n'existe pas, on retire les champs étendus et on réessaie
      logger.warn("[saveUserInfo] colonnes étendues absentes, retry sans:", error.message);
      const basicUpdates = {
        nom_affiche: userInfoForm.nom_affiche || null,
        telephone: userInfoForm.telephone || null,
        poste: userInfoForm.poste || null,
        notes: userInfoForm.notes || null,
        date_arrivee: userInfoForm.date_arrivee || null,
      };
      await supabase.from("membres_structure")
        .update(basicUpdates)
        .eq("user_id", userInfoModal.user_id)
        .eq("structure_id", auth.structureId);
    }
    setUserInfoModal(null);
    await loadAll();
  }

  // 0.55.25 — Réinitialiser le mot de passe d'un user (action admin)
  async function resetUserPassword(m) {
    if (!await dialogs.confirm({
      title: `Réinitialiser le mot de passe de ${m.nom_affiche || m.user_id.slice(0,8)} ?`,
      message: "L'utilisateur recevra un email pour définir un nouveau mot de passe.",
      variant: "danger",
    })) return;
    try {
      const { data, error } = await supabase.rpc("reset_user_password", { p_user_id: m.user_id });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Échec");
      await dialogs.alert({
        title: "Demande enregistrée",
        message: `La demande de réinitialisation a été journalisée. Pour envoyer l'email officiel, utilisez le tableau de bord Supabase Auth ou l'Edge Function dédiée.`,
      });
    } catch (e) {
      await dialogs.alert({
        title: "Erreur",
        message: e.message || "Erreur lors de la demande",
        variant: "danger",
      });
    }
  }
  // Alpha 0.16.0 : archive / restaure une invitation
  async function toggleInvitArchive(i) {
    await supabase.from("invitations").update({ archive: !i.archive }).eq("id", i.id);
    await loadAll();
  }
  async function relancerInvitation(i) {
    if (!await dialogs.confirm({ title: `Renvoyer l'invitation à ${i.email} ?`, variant: "danger" })) return;
    try {
      const roleNom = roles.find((r) => r.id === i.role_id)?.nom || "Utilisateur";
      const etabNoms = auth.etablissements.map((e) => e.nom);

      // 0.56.13 : reconstruire l'inviteLink depuis le token stocké (sinon l'Edge Function rejette en 400)
      const siteUrl = (typeof window !== "undefined" ? window.location.origin : "");
      const inviteLink = `${siteUrl}/inscription/${i.token}`;

      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: {
          email: i.email,
          nom: i.nom_affiche,
          collectivite: auth.structureNom,
          role: roleNom,
          etablissements: etabNoms,
          inviteLink,
        },
      });
      if (error) {
        let detail = error.message || "Erreur inconnue";
        try {
          if (error.context?.body) {
            const reader = error.context.body.getReader();
            const { value } = await reader.read();
            const text = new TextDecoder().decode(value);
            const json = JSON.parse(text);
            if (json.error) detail = json.error;
          }
        } catch {}
        // 0.57.22 : persister l'échec dans la BDD
        try {
          await supabase.from("invitations").update({
            mail_erreur: detail,
            mail_tentatives: (i.mail_tentatives || 0) + 1,
          }).eq("id", i.id);
        } catch {}
        toast.error(`Échec : ${detail}`);
        await loadAll();
        return;
      }
      if (data && data.ok === false) {
        try {
          await supabase.from("invitations").update({
            mail_erreur: data.error || "raison inconnue",
            mail_tentatives: (i.mail_tentatives || 0) + 1,
          }).eq("id", i.id);
        } catch {}
        toast.error(`Échec : ${data.error || "raison inconnue"}`);
        await loadAll();
        return;
      }
      // Succès : marquer le mail envoyé
      try {
        await supabase.from("invitations").update({
          mail_envoye_at: new Date().toISOString(),
          mail_erreur: null,
          mail_tentatives: (i.mail_tentatives || 0) + 1,
        }).eq("id", i.id);
      } catch {}
      toast.success("Invitation renvoyée.");
      await loadAll();
    } catch (e) {
      toast.error("Échec : la fonction d'envoi d'email n'est pas configurée.\n" + (e?.message || ""));
    }
  }

  // ---- invitations / création utilisateur (0.55.12) ----
  async function sendInvite() {
    if (!inviteForm.email) { setErr("Email requis."); return; }
    if (!auth.can("inviter")) { setErr("Ton rôle ne permet pas d'inviter."); return; }
    const nom_affiche_fallback = inviteForm.nom_affiche || `${inviteForm.prenom} ${inviteForm.nom}`.trim();

    // 1) enregistrer l'invitation + récupérer le token
    const insertPayload = {
      structure_id: auth.structureId,
      email: inviteForm.email,
      role_id: inviteForm.role_id || null,
      nom_affiche: nom_affiche_fallback,
      prenom: inviteForm.prenom || null,
      telephone: inviteForm.telephone || null,
      mobile: inviteForm.mobile || null,
      fonction_detail: inviteForm.fonction_detail || null,
      // 0.55.25
      etablissement_ids: inviteForm.etablissement_ids?.length ? inviteForm.etablissement_ids : null,
      lock_assignment: !!inviteForm.lock_assignment,
      matricule: inviteForm.matricule || null,
      date_arrivee: inviteForm.date_arrivee || null,
      notes_admin: inviteForm.notes_admin || null,
      // 0.55.29 : champs RPPS
      rpps: inviteForm.rpps || null,
      adeli: inviteForm.adeli || null,
      rpps_profession: inviteForm.rpps_profession || null,
      rpps_specialite: inviteForm.rpps_specialite || null,
      rpps_mode_exercice: inviteForm.rpps_mode_exercice || null,
      // 0.62.13 : rôle pro + magasin (pré-rattachement utilisateur_magasin)
      role_professionnel: inviteForm.role_professionnel || null,
      magasin_fournisseur_id: inviteForm.magasin_fournisseur_id || null,
    };

    let { data: invData, error: invErr } = await supabase
      .from("invitations")
      .insert(insertPayload)
      .select("token")
      .single();

    // Si erreur sur colonnes RPPS (SQL pas passé), retry sans
    if (invErr && (invErr.message || "").includes("rpps")) {
      const fallback = { ...insertPayload };
      delete fallback.rpps;
      delete fallback.adeli;
      delete fallback.rpps_profession;
      delete fallback.rpps_specialite;
      delete fallback.rpps_mode_exercice;
      const retry = await supabase.from("invitations").insert(fallback).select("token").single();
      invData = retry.data;
      invErr = retry.error;
    }
    // 0.62.13 : Si erreur sur role_professionnel/magasin_fournisseur_id (SQL 0.62.13 pas passé), retry
    if (invErr && /role_professionnel|magasin_fournisseur_id/i.test(invErr.message || "")) {
      const fallback = { ...insertPayload };
      delete fallback.role_professionnel;
      delete fallback.magasin_fournisseur_id;
      const retry = await supabase.from("invitations").insert(fallback).select("token").single();
      invData = retry.data;
      invErr = retry.error;
    }

    if (invErr) {
      setErr("Erreur création invitation : " + invErr.message);
      return;
    }

    // 2) Construire le lien d'inscription
    const siteUrl = (typeof window !== "undefined" ? window.location.origin : "");
    const inviteLink = `${siteUrl}/inscription/${invData.token}`;

    // 3) tenter l'envoi du mail de bienvenue (Edge Function invite-user)
    // 0.55.53 : vraie capture d'erreur + affichage du détail à l'user
    let mailWarning = null;
    try {
      const roleNom = roles.find((r) => r.id === inviteForm.role_id)?.nom || "Utilisateur";
      let etabNoms;
      if (inviteForm.etablissement_ids?.length) {
        etabNoms = auth.etablissements
          .filter((e) => inviteForm.etablissement_ids.includes(e.id))
          .map((e) => e.nom);
      } else {
        etabNoms = auth.etablissements.map((e) => e.nom);
      }
      const { data: invokeData, error: invokeErr } = await supabase.functions.invoke("invite-user", {
        body: {
          email: inviteForm.email,
          nom: nom_affiche_fallback,
          collectivite: auth.structureNom,
          role: roleNom,
          etablissements: etabNoms,
          inviteLink,
          rpps_profession: inviteForm.rpps_profession || null,
          rpps_specialite: inviteForm.rpps_specialite || null,
          rpps: inviteForm.rpps || null,
          lock_assignment: !!inviteForm.lock_assignment,
        },
      });
      // invoke() retourne {data, error} — error peut être un FunctionsHttpError
      // qui contient un body JSON {ok:false, error:"..."} renvoyé par l'Edge Function
      if (invokeErr) {
        // Essai de lire le body de l'erreur (Resend détail)
        let detail = invokeErr.message || "Erreur inconnue";
        try {
          if (invokeErr.context?.body) {
            const reader = invokeErr.context.body.getReader();
            const { value } = await reader.read();
            const text = new TextDecoder().decode(value);
            const json = JSON.parse(text);
            if (json.error) detail = json.error;
          }
        } catch {}
        mailWarning = `Mail NON envoyé : ${detail}`;
        logger.warn("Edge Function invite-user a échoué", invokeErr, invokeData);
      } else if (invokeData && invokeData.ok === false) {
        mailWarning = `Mail NON envoyé : ${invokeData.error || "raison inconnue"}`;
      }
    } catch (e) {
      mailWarning = `Mail NON envoyé : Edge Function injoignable (${e.message})`;
      logger.warn("Edge Function invite-user injoignable", e);
    }

    // 4) trace audit + notif
    // 0.57.22 : persister le statut d'envoi mail dans la table invitations
    // (avant : le warning UI était temporaire, disparaissait au reload)
    try {
      await supabase.from("invitations")
        .update({
          mail_envoye_at: mailWarning ? null : new Date().toISOString(),
          mail_erreur: mailWarning || null,
          mail_tentatives: 1,
        })
        .eq("token", invData.token);
    } catch (e) {
      // Si les colonnes n'existent pas encore (SQL patch 0.57.22 pas appliqué),
      // on ignore silencieusement — le code continue de marcher comme avant
      logger.warn("[invitations] update statut mail échoué (SQL patch 0.57.22 non appliqué ?)", e);
    }

    await logEvent(supabase, auth, {
      action: "inviter", entite: "invitation",
      details: { email: inviteForm.email, nom: nom_affiche_fallback },
      notif: true, notifType: "invitation",
      titre: "Nouvelle invitation envoyée",
      message: `${nom_affiche_fallback || inviteForm.email} a été invité(e).`,
      lien: "/utilisateurs",
    });

    // 0.58.55 : si l'user est aussi un partenaire externe (prescripteur/IDE/pharmacie),
    //   on l'ajoute dans partenaires_rpps avec les flags correspondants + est_collaborateur=true
    if (inviteForm.type_partenaire) {
      try {
        const isPrescr = inviteForm.type_partenaire === "prescripteur";
        const isInf = inviteForm.type_partenaire === "infirmiere";
        const isPharm = inviteForm.type_partenaire === "pharmacien";
        const profMapping = {
          prescripteur: "Médecin",
          infirmiere: "Infirmier(ière)",
          pharmacien: "Pharmacien",
        };
        const partenairePayload = {
          structure_id: auth.structureId,
          nom: inviteForm.nom || nom_affiche_fallback,
          prenom: inviteForm.prenom || null,
          email: inviteForm.email || null,
          telephone: inviteForm.telephone || null,
          rpps: inviteForm.rpps || null,
          adeli: inviteForm.adeli || null,
          profession: inviteForm.rpps_profession || profMapping[inviteForm.type_partenaire] || null,
          specialite: inviteForm.rpps_specialite || null,
          est_prescripteur: isPrescr,
          est_intervenant: isInf,
          est_pharmacien: isPharm,
          est_collaborateur: true,  // 0.58.55 : marque l'user comme collaborateur interne (a aussi un compte)
          created_by: auth.user?.id,
        };
        const { error: partErr } = await supabase.from("partenaires_rpps").insert(partenairePayload);
        if (partErr) {
          // Si la colonne est_collaborateur n'existe pas encore (SQL 0.58.55 pas passé), retry sans
          if ((partErr.message || "").includes("est_collaborateur")) {
            delete partenairePayload.est_collaborateur;
            await supabase.from("partenaires_rpps").insert(partenairePayload);
          } else {
            logger.warn("[invitations] partenaire creation failed:", partErr.message);
          }
        }
      } catch (e) {
        logger.warn("[invitations] partenaire creation exception:", e);
      }
    }

    // 5) Afficher le lien (au cas où l'email n'est pas configuré)
    // 0.55.30 : on stocke aussi un récap complet pour l'afficher dans la popup
    // 0.55.53 : si le mail a échoué, on l'indique clairement dans la popup
    setCreatedInviteLink({
      link: inviteLink,
      email: inviteForm.email,
      nom: nom_affiche_fallback,
      role: roles.find((r) => r.id === inviteForm.role_id)?.nom || "Utilisateur",
      rpps: inviteForm.rpps,
      rpps_profession: inviteForm.rpps_profession,
      rpps_specialite: inviteForm.rpps_specialite,
      etabNoms: inviteForm.etablissement_ids?.length
        ? auth.etablissements.filter(e => inviteForm.etablissement_ids.includes(e.id)).map(e => e.nom)
        : [],
      lock_assignment: inviteForm.lock_assignment,
      matricule: inviteForm.matricule,
      mailWarning,  // 0.55.53 : warning si Resend a échoué
      // 0.58.55 : info sur le type de partenaire créé
      type_partenaire: inviteForm.type_partenaire,
    });
    setInviteForm({
      email: "", role_id: "", nom_affiche: "", prenom: "", nom: "", telephone: "", mobile: "", fonction_detail: "",
      etablissement_ids: [], lock_assignment: true, matricule: "", date_arrivee: "", notes_admin: "",
      rpps: "", adeli: "", rpps_profession: "", rpps_specialite: "", rpps_mode_exercice: "",
      // 0.58.55
      type_partenaire: "", est_collaborateur: false,
    });
    await loadAll();
  }

  if (!auth.ready) return null;

  const kpis = [
    { label: "Utilisateurs", value: membres.length, icon: "ti-users", color: "#7a6fb0" },
    { label: "Actifs", value: membres.filter((m) => m.actif !== false).length, icon: "ti-user-check", color: "#5aa05a" },
    { label: "Rôles", value: roles.length, icon: "ti-shield-lock", color: "#185FA5" },
    { label: "Invitations en attente", value: invitations.filter((i) => i.statut === "En attente").length, icon: "ti-mail", color: "#e35d5b" },
  ];
  const svcOfUser = (uid) => memServices.filter((x) => x.user_id === uid).map((x) => x.service_id);

  // Alpha 0.17.1 : helpers relativeTime / activityDotColor déplacés dans lib/format.js

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead icon="ti-users-group" title="Gestion des utilisateurs" subtitle="Rôles, droits, rattachement aux services et invitations" color="#185FA5" small />
        <KpiRow tiles={kpis} />

        <div className="seg" style={{ marginBottom: 14 }}>
          <button className={tab === "membres" ? "on" : ""} onClick={() => setTab("membres")}>Membres</button>
          <button className={tab === "roles" ? "on" : ""} onClick={() => setTab("roles")}>Rôles & droits</button>
          <button className={tab === "invitations" ? "on" : ""} onClick={() => setTab("invitations")}>Invitations</button>
        </div>

        {loading ? <Panel><StateMsg>Chargement…</StateMsg></Panel> : (
          <>
            {tab === "membres" && (
              <Panel>
                {/* Filtre statut (Alpha 0.16.1 : FilterBar partagé) */}
                <FilterBar
                  label="Voir :"
                  value={filtreStatut}
                  onChange={setFiltreStatut}
                  options={[
                    { v:"actifs", l:"Actifs", count:membres.filter(m=>!m.archive).length },
                    { v:"archives", l:"Archivés", count:membres.filter(m=>m.archive).length },
                    { v:"tous", l:"Tous", count:membres.length },
                  ]}
                  rightSlot={
                    <div style={{ position:"relative", display:"inline-flex", alignItems:"center" }}>
                      <i className="ti ti-search" style={{ position:"absolute", left:10, color:"#8a98a8", fontSize:14, pointerEvents:"none" }} />
                      <input
                        type="text"
                        value={searchMembres}
                        onChange={(e) => setSearchMembres(e.target.value)}
                        placeholder="Rechercher (nom, poste, email)…"
                        aria-label="Rechercher un membre"
                        style={{ padding:"6px 28px 6px 32px", borderRadius:8, border:"1px solid #e1e6eb", fontFamily:"inherit", fontSize:13, width:240, background:"#fff" }}
                      />
                      {searchMembres && (
                        <button onClick={() => setSearchMembres("")} aria-label="Effacer la recherche" style={{ position:"absolute", right:6, background:"transparent", border:"none", cursor:"pointer", color:"#8a98a8", fontSize:14, padding:4 }}>
                          <i className="ti ti-x" />
                        </button>
                      )}
                    </div>
                  }
                />
                {(() => {
                  // Alpha 0.20.0 : filtrage par recherche (nom, poste, email)
                  const q = searchMembres.trim().toLowerCase();
                  const visiblesAll = membres.filter(m => {
                    // Filtre statut
                    if (filtreStatut === "actifs" && m.archive) return false;
                    if (filtreStatut === "archives" && !m.archive) return false;
                    // Filtre recherche
                    if (!q) return true;
                    const hay = [
                      m.nom_affiche,
                      m.poste,
                      m.telephone,
                      m.user_id,
                      m.roles?.nom,
                    ].filter(Boolean).join(" ").toLowerCase();
                    return hay.includes(q);
                  });
                  if (visiblesAll.length === 0) {
                    return <StateMsg>
                      {q ? `Aucun membre trouvé pour "${searchMembres}".` :
                       `Aucun membre ${filtreStatut === "archives" ? "archivé" : filtreStatut === "actifs" ? "actif" : ""}.`}
                    </StateMsg>;
                  }
                  // 0.62.52 : pagination intelligente (50 lignes / page) pour grandes listes
                  const PAGE_SIZE = 50;
                  const totalPages = Math.ceil(visiblesAll.length / PAGE_SIZE);
                  const startIdx = membresPage * PAGE_SIZE;
                  const visibles = visiblesAll.slice(startIdx, startIdx + PAGE_SIZE);
                  return (
                  <>
                  <div className="panel-table"><table>
                    <thead><tr><th>Utilisateur</th><th>Rôle</th><th>Services</th><th>Visibilité</th><th>Statut</th><th></th></tr></thead>
                    <tbody>
                      {visibles.map((m) => {
                        const userSvc = svcOfUser(m.user_id);
                        return (
                          <tr key={m.user_id} style={m.archive ? { opacity:.55 } : null}>
                            <td>
                              <button onClick={()=>openUserInfo(m)} title="Voir les infos détaillées" style={{ background:"transparent", border:"none", padding:0, cursor:"pointer", fontFamily:"inherit", color:"#142131", fontWeight:600, textAlign:"left", display:"flex", alignItems:"center", gap:10 }}>
                                {/* 0.58.6 : Avatar premium (gradient déterministe) */}
                                <Avatar name={m.nom_affiche || m.user_id} size={32} />
                                {/* Alpha 0.17.0 : pastille d'activité */}
                                <span title={lastActivity[m.user_id]?.derniere_activite ? `Dernière activité ${relativeTime(lastActivity[m.user_id].derniere_activite)}` : "Aucune activité enregistrée"}
                                  style={{ width:8, height:8, borderRadius:"50%", background:activityDotColor(lastActivity[m.user_id]?.derniere_activite), flexShrink:0, display:"inline-block" }} />
                                <span>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                    {m.nom_affiche || m.user_id.slice(0, 8)}
                                    {/* 0.55.22 : icônes méthodes bio toujours affichées (vert si activé, gris si pas) */}
                                    {(() => {
                                      const am = authMethodsByUser[m.user_id] || {};
                                      const e = am.has_empreinte;
                                      const f = am.has_face;
                                      return (
                                        <span style={{ display: "inline-flex", gap: 3, marginLeft: 4 }}>
                                          <span
                                            title={e ? "Empreinte digitale activée" : "Empreinte digitale non activée"}
                                            style={{
                                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                                              width: 18, height: 18, borderRadius: "50%",
                                              background: e ? "#5aa05a22" : "#e3e9ee",
                                              color: e ? "#5aa05a" : "#c0c5cc",
                                              fontSize: 11,
                                              border: e ? "1px solid #5aa05a55" : "1px solid #d3d9e0",
                                            }}
                                          >
                                            <i className="ti ti-fingerprint" />
                                          </span>
                                          <span
                                            title={f ? "Détection faciale activée" : "Détection faciale non activée"}
                                            style={{
                                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                                              width: 18, height: 18, borderRadius: "50%",
                                              background: f ? "#5aa05a22" : "#e3e9ee",
                                              color: f ? "#5aa05a" : "#c0c5cc",
                                              fontSize: 11,
                                              border: f ? "1px solid #5aa05a55" : "1px solid #d3d9e0",
                                            }}
                                          >
                                            <i className="ti ti-face-id" />
                                          </span>
                                        </span>
                                      );
                                    })()}
                                  </span>
                                  {m.poste && <span style={{ display:"block", fontSize:11, color:"#8a98a8", fontWeight:400, marginTop:1 }}>{m.poste}</span>}
                                  {lastActivity[m.user_id]?.derniere_activite && (
                                    <span style={{ display:"block", fontSize:10, color:"#8a98a8", fontWeight:400, marginTop:1 }}>
                                      {relativeTime(lastActivity[m.user_id].derniere_activite)}
                                    </span>
                                  )}
                                </span>
                              </button>
                            </td>
                            <td>
                              <select value={m.role_id || ""} onChange={(e) => setMembreRole(m.user_id, e.target.value)} style={{ height: 32, borderRadius: 8, border: "1px solid #e1e6eb", fontFamily: "inherit" }}>
                                <option value="">— Aucun —</option>
                                {roles.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
                              </select>
                            </td>
                            <td style={{ maxWidth: 240 }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                {services.map((s) => {
                                  const has = userSvc.includes(s.id);
                                  return <span key={s.id} onClick={() => toggleService(m.user_id, s.id, has)}
                                    style={{ cursor: "pointer", fontSize: 11, padding: "3px 9px", borderRadius: 12, fontWeight: 600, background: has ? "#eef6f6" : "#f1f3f5", color: has ? "#2a5a5a" : "#9aa7b4", border: `1px solid ${has ? "#cfe6e6" : "#e6ebf0"}` }}>
                                    {has ? <i className="ti ti-check" /> : <i className="ti ti-plus" />} {s.nom}
                                  </span>;
                                })}
                              </div>
                            </td>
                            <td>
                              <span onClick={() => toggleRestreint(m)} style={{ cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 12, background: m.restreint_services ? "#FFF3E0" : "#E1F5EE", color: m.restreint_services ? "#8a5300" : "#0F6E56" }}>
                                {m.restreint_services ? "Ses services" : "Tout l'établissement"}
                              </span>
                            </td>
                            <td>
                              <span onClick={() => toggleActif(m)} style={{ cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 12, background: m.actif !== false ? "#E1F5EE" : "#FDECEA", color: m.actif !== false ? "#0F6E56" : "#c0392b" }}>
                                {m.actif !== false ? "Actif" : "Inactif"}
                              </span>
                            </td>
                            <td style={{ whiteSpace:"nowrap", textAlign:"right" }}>
                              <button onClick={()=>openUserInfo(m)} title="Modifier les infos" style={{ background:"transparent", border:"none", color:"#185FA5", cursor:"pointer", fontSize:16, padding:"4px 6px" }}>
                                <i className="ti ti-info-circle" />
                              </button>
                              <button onClick={()=>toggleArchive(m)} title={m.archive ? "Restaurer" : "Archiver"} style={{ background:"transparent", border:"none", color: m.archive ? "#5aa05a" : "#8a98a8", cursor:"pointer", fontSize:16, padding:"4px 6px" }}>
                                <i className={`ti ${m.archive ? "ti-archive-off" : "ti-archive"}`} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table></div>
                  {/* 0.62.52 : barre pagination si grande liste */}
                  {totalPages > 1 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 4px", borderTop: "1px solid #eef1f4", marginTop: 8 }}>
                      <div style={{ fontSize: 12, color: "#5a6878" }}>
                        Affichage <b>{startIdx + 1}</b>–<b>{Math.min(startIdx + PAGE_SIZE, visiblesAll.length)}</b> sur <b>{visiblesAll.length}</b> membres
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button onClick={() => setMembresPage(0)} disabled={membresPage === 0} title="Première page"
                          style={{ padding: "6px 10px", background: "#fff", border: "1px solid #e3e9ee", borderRadius: 6, cursor: membresPage === 0 ? "not-allowed" : "pointer", opacity: membresPage === 0 ? .4 : 1, fontFamily: "inherit", fontSize: 12 }}>
                          <i className="ti ti-chevrons-left" />
                        </button>
                        <button onClick={() => setMembresPage(p => Math.max(0, p - 1))} disabled={membresPage === 0}
                          style={{ padding: "6px 10px", background: "#fff", border: "1px solid #e3e9ee", borderRadius: 6, cursor: membresPage === 0 ? "not-allowed" : "pointer", opacity: membresPage === 0 ? .4 : 1, fontFamily: "inherit", fontSize: 12 }}>
                          <i className="ti ti-chevron-left" /> Précédent
                        </button>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#142131", padding: "0 8px" }}>
                          Page {membresPage + 1} / {totalPages}
                        </span>
                        <button onClick={() => setMembresPage(p => Math.min(totalPages - 1, p + 1))} disabled={membresPage >= totalPages - 1}
                          style={{ padding: "6px 10px", background: "#fff", border: "1px solid #e3e9ee", borderRadius: 6, cursor: membresPage >= totalPages - 1 ? "not-allowed" : "pointer", opacity: membresPage >= totalPages - 1 ? .4 : 1, fontFamily: "inherit", fontSize: 12 }}>
                          Suivant <i className="ti ti-chevron-right" />
                        </button>
                        <button onClick={() => setMembresPage(totalPages - 1)} disabled={membresPage >= totalPages - 1} title="Dernière page"
                          style={{ padding: "6px 10px", background: "#fff", border: "1px solid #e3e9ee", borderRadius: 6, cursor: membresPage >= totalPages - 1 ? "not-allowed" : "pointer", opacity: membresPage >= totalPages - 1 ? .4 : 1, fontFamily: "inherit", fontSize: 12 }}>
                          <i className="ti ti-chevrons-right" />
                        </button>
                      </div>
                    </div>
                  )}
                  </>
                  );
                })()}
              </Panel>
            )}

            {tab === "roles" && (
              <Panel>
                <div className="di-toolbar">
                  {/* 0.58.23 : NeonButton variant=violet pour "Nouveau rôle" */}
                  <NeonButton variant="violet" icon="ti-plus" onClick={() => openRole(null)}>
                    Nouveau rôle
                  </NeonButton>
                </div>
                <div className="panel-table"><table>
                  <thead><tr><th>Rôle</th><th>Description</th><th>Modules autorisés</th><th></th></tr></thead>
                  <tbody>
                    {roles.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.nom}{r.systeme && <span className="tag-type" style={{ marginLeft: 6 }}>système</span>}</td>
                        <td style={{ fontSize: 12, color: "#5a6776" }}>{r.description}</td>
                        <td style={{ fontSize: 11, color: "#5a6776" }}>{Object.keys(r.droits || {}).length} module(s)</td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <IconButton icon="ti-edit" color="#EF9F27" ariaLabel="Modifier" onClick={() => openRole(r)} />
                          {!r.systeme && <IconButton icon="ti-trash" color="#C9867F" ariaLabel="Supprimer" onClick={() => delRole(r)} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </Panel>
            )}

            {tab === "invitations" && (
              <Panel>
                <div className="di-toolbar" style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:12 }}>
                  {auth.can("inviter") && (
                    /* 0.58.23 : NeonButton variant=teal pour "Créer un utilisateur" */
                    <NeonButton variant="teal" icon="ti-user-plus" onClick={() => { setErr(""); setInviteModal(true); }}>
                      Inviter par mail
                    </NeonButton>
                  )}
                  {auth.can("inviter") && (
                    /* 0.62.34 : Bouton création directe (sans mail) */
                    <NeonButton variant="amber" icon="ti-user-shield" onClick={() => router.push("/utilisateurs/creer-direct")}>
                      Créer directement
                    </NeonButton>
                  )}
                  {/* 0.58.15 : raccourci vers la page d'onboarding guidé */}
                  {auth.can("inviter") && (
                    <a
                      href="/onboarding"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 14px",
                        background: "linear-gradient(135deg, rgba(122,111,176,.12) 0%, rgba(122,111,176,.06) 100%)",
                        border: "1px solid rgba(122,111,176,.30)",
                        borderRadius: 10,
                        color: "#5d52a0",
                        fontFamily: "inherit",
                        fontSize: 12.5,
                        fontWeight: 700,
                        textDecoration: "none",
                        transition: "all 200ms",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "linear-gradient(135deg, rgba(122,111,176,.22) 0%, rgba(122,111,176,.12) 100%)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 4px 10px rgba(122,111,176,.20)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "linear-gradient(135deg, rgba(122,111,176,.12) 0%, rgba(122,111,176,.06) 100%)";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <i className="ti ti-wand" style={{ fontSize: 14 }} />
                      Onboarding guidé
                      <span style={{
                        fontSize: 9,
                        padding: "2px 6px",
                        background: "rgba(122,111,176,.20)",
                        border: "1px solid rgba(122,111,176,.30)",
                        borderRadius: 99,
                        letterSpacing: ".5px",
                        textTransform: "uppercase",
                        fontWeight: 800,
                      }}>NEW</span>
                    </a>
                  )}
                  <span style={{ marginLeft:"auto" }}>
                    <FilterBar
                      label="Voir :"
                      value={filtreInvit}
                      onChange={setFiltreInvit}
                      options={[
                        { v:"non-archivees", l:"En cours", count:invitations.filter(i=>!i.archive).length },
                        { v:"archivees", l:"Archivées", count:invitations.filter(i=>i.archive).length },
                        { v:"toutes", l:"Toutes", count:invitations.length },
                      ]}
                    />
                  </span>
                </div>
                {(() => {
                  const visibles = invitations.filter(i =>
                    filtreInvit === "toutes" ? true :
                    filtreInvit === "archivees" ? i.archive :
                    !i.archive
                  );
                  if (visibles.length === 0) return <StateMsg>Aucune invitation {filtreInvit === "archivees" ? "archivée" : filtreInvit === "non-archivees" ? "en cours" : ""}.</StateMsg>;
                  return (
                  <div className="panel-table"><table>
                    <thead><tr><th>Email</th><th>Nom</th><th>Rôle</th><th>Date</th><th>Statut</th><th>Mail</th><th></th></tr></thead>
                    <tbody>
                      {visibles.map((i) => (
                        <tr key={i.id} style={i.archive ? { opacity:.55 } : null}>
                          <td>{i.email}</td><td>{i.nom_affiche || "—"}</td><td>{i.roles?.nom || "—"}</td><td>{fmtDate(i.created_at)}</td>
                          <td>
                            <span className={`statut ${i.statut === "Acceptée" ? "s-validee" : i.statut === "Expirée" ? "s-refusee" : "s-attente"}`}>{i.statut || "En attente"}</span>
                          </td>
                          <td>
                            {/* 0.57.22 : affichage du statut d'envoi mail */}
                            {i.mail_envoye_at ? (
                              <span title={`Mail envoyé le ${fmtDate(i.mail_envoye_at)}${i.mail_tentatives > 1 ? ` (${i.mail_tentatives} tentatives)` : ""}`}
                                style={{ color: "#5aa05a", fontSize: 12, fontWeight: 600 }}>
                                <i className="ti ti-mail-check" /> Envoyé
                              </span>
                            ) : i.mail_erreur ? (
                              <span title={`Échec : ${i.mail_erreur}\nTentatives : ${i.mail_tentatives || 1}`}
                                style={{ color: "#c0392b", fontSize: 12, fontWeight: 600, cursor: "help" }}>
                                <i className="ti ti-mail-x" /> Échec
                              </span>
                            ) : (
                              <span title="Statut inconnu (avant 0.57.22) ou pas encore tenté"
                                style={{ color: "#8a98a8", fontSize: 12 }}>
                                <i className="ti ti-mail-question" /> —
                              </span>
                            )}
                          </td>
                          <td style={{ whiteSpace:"nowrap", textAlign:"right" }}>
                            {i.statut !== "Acceptée" && !i.archive && (
                              <button onClick={()=>relancerInvitation(i)} title="Renvoyer l'invitation" style={{ background:"transparent", border:"none", color:"#185FA5", cursor:"pointer", fontSize:16, padding:"4px 6px" }}>
                                <i className="ti ti-send" />
                              </button>
                            )}
                            <button onClick={()=>toggleInvitArchive(i)} title={i.archive ? "Restaurer" : "Archiver"} style={{ background:"transparent", border:"none", color: i.archive ? "#5aa05a" : "#8a98a8", cursor:"pointer", fontSize:16, padding:"4px 6px" }}>
                              <i className={`ti ${i.archive ? "ti-archive-off" : "ti-archive"}`} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                  );
                })()}
              </Panel>
            )}
          </>
        )}
      </div>

      {/* modale rôle */}
      {roleModal && (
        <div className="modal-bg" onClick={(e) => e.target.classList.contains("modal-bg") && setRoleModal(null)}>
          <div className="modal">
            <div className="modal-head">{roleModal.id ? "Modifier le rôle" : "Nouveau rôle"} <i className="ti ti-x" style={{ cursor: "pointer" }} onClick={() => setRoleModal(null)} /></div>
            <div className="modal-body">
              {err && <div className="err">{err}</div>}
              <div className="fld"><label>Nom du rôle</label><input value={roleForm.nom} onChange={(e) => setRoleForm({ ...roleForm, nom: e.target.value })} placeholder="Ex : Infirmier coordinateur" /></div>
              <div className="fld"><label>Description</label><input value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} /></div>
              <label style={{ display: "block", marginBottom: 8 }}>Droits par module</label>
              <div style={{ border: "1px solid #e6ebf0", borderRadius: 10, overflow: "hidden" }}>
                {MODULES.map((mod, i) => {
                  const cur = roleForm.droits[mod.k] || [];
                  return (
                    <div key={mod.k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: i % 2 ? "#f9fbfc" : "#fff" }}>
                      <span style={{ fontSize: 13 }}>{mod.l}</span>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", }}>
                        {["read", "write"].map((perm) => {
                          const on = cur.includes(perm);
                          return <span key={perm} onClick={() => toggleDroit(mod.k, perm)}
                            style={{ cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 12, background: on ? "#eef6f6" : "#f1f3f5", color: on ? "#2a5a5a" : "#9aa7b4", border: `1px solid ${on ? "#cfe6e6" : "#e6ebf0"}` }}>
                            {perm === "read" ? "Lecture" : "Écriture"}
                          </span>;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => setRoleModal(null)}>Annuler</button>
              <NeonButton variant="violet" icon="ti-device-floppy" onClick={saveRole}>
                Enregistrer
              </NeonButton>
            </div>
          </div>
        </div>
      )}

      {/* modale invitation */}
      {inviteModal && (
        <div className="modal-bg" onClick={(e) => e.target.classList.contains("modal-bg") && setInviteModal(false)}>
          <div className="modal" style={{ maxWidth: 560, maxHeight: "92vh", overflowY: "auto" }}>
            <div className="modal-head">
              <i className="ti ti-user-plus" /> Créer un utilisateur
              <i className="ti ti-x" style={{ cursor: "pointer" }} onClick={() => setInviteModal(false)} />
            </div>
            <div className="modal-body">
              {err && <div className="err">{err}</div>}

              {/* Section 1 : Identité */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#185FA5", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Identité</span>
                  {/* 0.55.29 : pré-remplissage via API FHIR ANS */}
                  <button
                    type="button"
                    onClick={() => setRppsSearchOpen(true)}
                    style={{
                      background: "linear-gradient(135deg, #7a6fb0, #bfa9e0)",
                      color: "#fff",
                      border: "none",
                      padding: "5px 10px",
                      borderRadius: 12,
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      letterSpacing: 0.4,
                    }}
                    title="Rechercher dans l'annuaire RPPS pour pré-remplir les champs"
                  >
                    <i className="ti ti-stethoscope" /> Rechercher RPPS
                  </button>
                </div>
                {/* Badge si pré-rempli via RPPS */}
                {inviteForm.rpps && (
                  <div style={{
                    background: "#f3effa",
                    border: "1px solid #d6c9ec",
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontSize: 11.5,
                    marginBottom: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}>
                    <span style={{ color: "#5a4a90", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <i className="ti ti-stethoscope" style={{ color: "#7a6fb0" }} />
                      <b>Pré-rempli depuis RPPS :</b> {inviteForm.rpps_profession || "—"}
                      {inviteForm.rpps_specialite ? ` · ${inviteForm.rpps_specialite}` : ""}
                      {" · RPPS "}<code style={{ background: "#fff", padding: "0 4px", borderRadius: 3, fontSize: 11 }}>{inviteForm.rpps}</code>
                    </span>
                    <button
                      type="button"
                      onClick={() => setInviteForm({
                        ...inviteForm,
                        rpps: "", adeli: "", rpps_profession: "", rpps_specialite: "", rpps_mode_exercice: "",
                      })}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#7a6fb0",
                        cursor: "pointer",
                        fontSize: 11,
                        textDecoration: "underline",
                      }}
                    >
                      <i className="ti ti-x" /> Retirer
                    </button>
                  </div>
                )}
                <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="fld">
                    <label>Prénom</label>
                    <input value={inviteForm.prenom} onChange={(e) => setInviteForm({ ...inviteForm, prenom: e.target.value })} placeholder="Marie" />
                  </div>
                  <div className="fld">
                    <label>Nom</label>
                    <input value={inviteForm.nom} onChange={(e) => setInviteForm({ ...inviteForm, nom: e.target.value })} placeholder="Dupont" />
                  </div>
                </div>
                <div className="fld">
                  <label>Email *</label>
                  <input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="prenom.nom@etablissement.fr" />
                </div>
              </div>

              {/* 0.58.55 : SECTION TYPE DE COLLABORATEUR — ajoute aussi dans partenaires si prescripteur/IDE/pharmacien */}
              <div style={{ marginBottom: 14, padding: 14, background: "linear-gradient(135deg, #f4f7fa, #fff)", borderRadius: 10, border: "1px solid #e3e9ee" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#5aa05a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                  <i className="ti ti-id-badge-2" /> Type de collaborateur (optionnel)
                </div>
                <p style={{ fontSize: 12, color: "#6c7a89", margin: "0 0 10px" }}>
                  Si cet utilisateur est aussi un partenaire de santé externe (prescripteur, infirmière, pharmacien),
                  cocher le type ci-dessous l'ajoutera automatiquement à <b>Mes partenaires</b> avec un badge <b>Collaborateur</b>.
                </p>
                <div className="grid-4-mobile-2" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {[
                    { k: "", l: "Aucun", ic: "ti-x", col: "#8a98a8" },
                    { k: "prescripteur", l: "Prescripteur", ic: "ti-stethoscope", col: "#5a4a90" },
                    { k: "infirmiere", l: "Infirmier(ère)", ic: "ti-heart-rate-monitor", col: "#C9867F" },
                    { k: "pharmacien", l: "Pharmacien", ic: "ti-prescription", col: "#5aa05a" },
                  ].map((opt) => (
                    <button
                      key={opt.k || "none"}
                      type="button"
                      onClick={() => setInviteForm({ ...inviteForm, type_partenaire: opt.k })}
                      style={{
                        padding: "10px 8px",
                        borderRadius: 8,
                        border: `2px solid ${inviteForm.type_partenaire === opt.k ? opt.col : "#e3e9ee"}`,
                        background: inviteForm.type_partenaire === opt.k ? opt.col + "15" : "#fff",
                        color: inviteForm.type_partenaire === opt.k ? opt.col : "#5a6878",
                        fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                        transition: "all 150ms",
                      }}
                    >
                      <i className={`ti ${opt.ic}`} style={{ fontSize: 22, color: opt.col }} />
                      {opt.l}
                    </button>
                  ))}
                </div>
                {inviteForm.type_partenaire && (
                  <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(90,160,90,.10)", border: "1px solid rgba(90,160,90,.30)", borderRadius: 6, fontSize: 11.5, color: "#3a5a3a" }}>
                    <i className="ti ti-check" /> Sera ajouté à <b>Mes partenaires</b> ({inviteForm.type_partenaire}) avec badge <b>Collaborateur</b>
                  </div>
                )}
              </div>

              {/* Section 2 : Contact */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#7CC8C8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                  Contact (optionnel)
                </div>
                <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="fld">
                    <label>Téléphone fixe</label>
                    <input type="tel" value={inviteForm.telephone} onChange={(e) => setInviteForm({ ...inviteForm, telephone: e.target.value })} placeholder="05 12 34 56 78" />
                  </div>
                  <div className="fld">
                    <label>Mobile</label>
                    <input type="tel" value={inviteForm.mobile} onChange={(e) => setInviteForm({ ...inviteForm, mobile: e.target.value })} placeholder="06 12 34 56 78" />
                  </div>
                </div>
                <div className="fld">
                  <label>Fonction détaillée</label>
                  <input value={inviteForm.fonction_detail} onChange={(e) => setInviteForm({ ...inviteForm, fonction_detail: e.target.value })} placeholder="Infirmière coordinatrice pôle gériatrie" />
                </div>
              </div>

              {/* Section 3 : Rôle */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#EF9F27", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                  Accès et rôle
                </div>
                <div className="fld">
                  <label>Rôle *</label>
                  <select value={inviteForm.role_id} onChange={(e) => setInviteForm({ ...inviteForm, role_id: e.target.value })}>
                    <option value="">— Choisir —</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
                  </select>
                </div>
                {/* 0.62.13 : Rôle professionnel */}
                <div className="fld" style={{ marginTop: 10 }}>
                  <label>Rôle professionnel</label>
                  <select value={inviteForm.role_professionnel} onChange={(e) => setInviteForm({ ...inviteForm, role_professionnel: e.target.value, magasin_fournisseur_id: e.target.value !== "utilisateur_magasin" ? "" : inviteForm.magasin_fournisseur_id })}>
                    <option value="">— Choisir (optionnel) —</option>
                    <option value="infirmier">Infirmier·ère</option>
                    <option value="docteur">Docteur / Médecin</option>
                    <option value="pharmacien">Pharmacien·ne</option>
                    <option value="aide_soignant">Aide-soignant·e</option>
                    <option value="kine">Kinésithérapeute</option>
                    <option value="secretaire">Secrétaire</option>
                    <option value="logistique">Logistique</option>
                    <option value="admin">Administratif</option>
                    <option value="utilisateur_magasin">🏬 Utilisateur Magasin</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                {/* 0.62.13 : Magasin rattaché — visible UNIQUEMENT si rôle = utilisateur_magasin */}
                {inviteForm.role_professionnel === "utilisateur_magasin" && (
                  <div className="fld" style={{ marginTop: 10, padding: 10, background: "rgba(94,143,143,.08)", borderRadius: 6, borderLeft: "3px solid #5a8f8f" }}>
                    <label style={{ color: "#5a8f8f", fontWeight: 700 }}>🏬 Magasin rattaché *</label>
                    <select value={inviteForm.magasin_fournisseur_id} onChange={(e) => setInviteForm({ ...inviteForm, magasin_fournisseur_id: e.target.value })}>
                      <option value="">— Choisir magasin —</option>
                      {(magasinsListe || []).map(m => <option key={m.id} value={m.id}>{m.nom}{m.ville ? ` · ${m.ville}` : ""}</option>)}
                    </select>
                    <div style={{ fontSize: 11, color: "#5a6878", marginTop: 6, fontStyle: "italic" }}>
                      Le user recevra un mail de bienvenue dédié magasin avec le bon contexte.
                    </div>
                  </div>
                )}
              </div>

              {/* 0.55.25 : Rattachement multi-établissements + lock */}
              <div style={{ marginTop: 16, padding: "12px 14px", background: "#f4f7fa", borderRadius: 8, border: "1px solid #e3e9ee" }}>
                <h4 style={{ margin: "0 0 10px", fontSize: 13.5, color: "#142131", fontWeight: 700 }}>
                  <i className="ti ti-building-hospital" /> Rattachement aux établissements
                </h4>
                {auth.etablissements?.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {auth.etablissements.map((etab) => {
                      const selected = inviteForm.etablissement_ids?.includes(etab.id);
                      return (
                        <span
                          key={etab.id}
                          onClick={() => {
                            const cur = inviteForm.etablissement_ids || [];
                            const next = selected ? cur.filter(x => x !== etab.id) : [...cur, etab.id];
                            setInviteForm({ ...inviteForm, etablissement_ids: next });
                          }}
                          style={{
                            cursor: "pointer", fontSize: 12, padding: "5px 10px", borderRadius: 14,
                            fontWeight: 600,
                            background: selected ? "#185FA5" : "#fff",
                            color: selected ? "#fff" : "#6c7a89",
                            border: `1px solid ${selected ? "#185FA5" : "#d3d9e0"}`,
                            display: "inline-flex", alignItems: "center", gap: 4,
                          }}
                        >
                          {selected ? <i className="ti ti-check" /> : <i className="ti ti-plus" />} {etab.nom}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: "#8a98a8", margin: 0 }}>Aucun établissement disponible</p>
                )}
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 12.5, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={inviteForm.lock_assignment}
                    onChange={(e) => setInviteForm({ ...inviteForm, lock_assignment: e.target.checked })}
                    style={{ width: 16, height: 16 }}
                  />
                  <span>
                    <b>Verrouiller le rattachement</b>
                    <span style={{ color: "#8a98a8", display: "block", fontSize: 11 }}>
                      L'utilisateur verra les établissements mais ne pourra pas les modifier
                    </span>
                  </span>
                </label>
              </div>

              {/* 0.55.25 : Champs RH pré-remplis (optionnels) */}
              <div style={{ marginTop: 12, padding: "12px 14px", background: "#f4f7fa", borderRadius: 8, border: "1px solid #e3e9ee" }}>
                <h4 style={{ margin: "0 0 10px", fontSize: 13.5, color: "#142131", fontWeight: 700 }}>
                  <i className="ti ti-id-badge" /> Informations RH <span style={{ color: "#8a98a8", fontWeight: 400, fontSize: 11 }}>(optionnel)</span>
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="form-row">
                    <label>Matricule</label>
                    <input
                      value={inviteForm.matricule}
                      onChange={(e) => setInviteForm({ ...inviteForm, matricule: e.target.value })}
                      placeholder="ex: 0042"
                    />
                  </div>
                  <div className="form-row">
                    <label>Date d'arrivée</label>
                    <input
                      type="date"
                      value={inviteForm.date_arrivee}
                      onChange={(e) => setInviteForm({ ...inviteForm, date_arrivee: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-row" style={{ marginTop: 8 }}>
                  <label>Notes internes (visible uniquement par admin)</label>
                  <textarea
                    value={inviteForm.notes_admin}
                    onChange={(e) => setInviteForm({ ...inviteForm, notes_admin: e.target.value })}
                    placeholder="Notes RH internes…"
                    rows={2}
                    style={{ resize: "vertical", fontFamily: "inherit", fontSize: 13 }}
                  />
                </div>
              </div>

              <p style={{ fontSize: 12, color: "#8a98a8", margin: "10px 0 0", lineHeight: 1.5 }}>
                <i className="ti ti-info-circle" /> L'utilisateur recevra un email avec un lien d'inscription pour choisir son mot de passe et compléter ses informations. Lien valide 7 jours.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => setInviteModal(false)}>Annuler</button>
              <button className="btn-save" onClick={sendInvite} disabled={!inviteForm.email || !inviteForm.role_id}>
                <i className="ti ti-send" /> Envoyer l'invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 0.55.12 + 0.55.30 : Modale post-création avec récap + lien */}
      {createdInviteLink && (
        <div className="modal-bg" onClick={(e) => e.target.classList.contains("modal-bg") && setCreatedInviteLink(null)}>
          <div className="modal" style={{ maxWidth: 580, maxHeight: "92vh", overflow: "auto" }}>
            <div className="modal-head" style={{
              background: createdInviteLink.mailWarning
                ? "linear-gradient(135deg, #EF9F27, #c97a2a)"
                : "linear-gradient(135deg, #5aa05a, #2e6f33)",
              color: "#fff"
            }}>
              <i className={`ti ${createdInviteLink.mailWarning ? "ti-alert-triangle" : "ti-circle-check"}`} />
              {createdInviteLink.mailWarning ? "Invitation créée — mail NON envoyé" : "Invitation créée"}
              <i className="ti ti-x" style={{ cursor: "pointer", color: "#fff" }} onClick={() => { setCreatedInviteLink(null); setInviteModal(false); }} />
            </div>
            <div className="modal-body">
              {createdInviteLink.mailWarning ? (
                <div style={{ background: "#fce5e0", border: "1px solid #f0c4be", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#7a2d23", marginBottom: 4 }}>
                    <i className="ti ti-mail-x" /> Mail d'invitation pas parti
                  </div>
                  <div style={{ fontSize: 12, color: "#7a2d23", lineHeight: 1.5 }}>
                    {createdInviteLink.mailWarning}
                  </div>
                  <div style={{ marginTop: 8, padding: "6px 10px", background: "#fff", borderRadius: 6, fontSize: 11.5, color: "#142131" }}>
                    <b>💡 Solution</b> : copie le lien d'invitation ci-dessous et envoie-le manuellement à <b>{createdInviteLink.email}</b> (SMS, WhatsApp, mail perso, etc.). L'invitation Aveho est bien créée en base, seul l'email automatique a échoué.
                  </div>
                </div>
              ) : (
                <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.5 }}>
                  ✓ L'invitation a été créée et un email a été envoyé à <b>{createdInviteLink.email}</b>.
                </p>
              )}

              {/* 0.55.30 : Récap de ce qui a été envoyé */}
              <div style={{ background: "#f4f7fa", border: "1px solid #e3e9ee", borderRadius: 10, padding: "12px 14px", marginBottom: 14, fontSize: 13 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#185FA5", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                  📧 Contenu de l'invitation
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6c7a89" }}>Nom</span>
                    <b style={{ color: "#142131" }}>{createdInviteLink.nom}</b>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6c7a89" }}>Rôle</span>
                    <span style={{ background: "#185FA522", color: "#185FA5", padding: "2px 8px", borderRadius: 6, fontWeight: 600, fontSize: 12 }}>{createdInviteLink.role}</span>
                  </div>
                  {createdInviteLink.matricule && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#6c7a89" }}>Matricule</span>
                      <code style={{ color: "#142131", fontFamily: "Consolas, monospace" }}>{createdInviteLink.matricule}</code>
                    </div>
                  )}
                  {createdInviteLink.etabNoms?.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ color: "#6c7a89" }}>
                        Établissements
                        {createdInviteLink.lock_assignment && (
                          <span style={{ marginLeft: 4, fontSize: 10, color: "#7a4f15", background: "#fff8ec", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>
                            <i className="ti ti-lock" /> VERROUILLÉ
                          </span>
                        )}
                      </span>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {createdInviteLink.etabNoms.map((nom, i) => (
                          <span key={i} style={{ background: "#eef6f6", color: "#2a5a5a", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600 }}>
                            🏥 {nom}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bloc RPPS si renseigné */}
              {createdInviteLink.rpps && (
                <div style={{ background: "#f3effa", border: "1px solid #d6c9ec", borderRadius: 10, padding: "12px 14px", marginBottom: 14, fontSize: 13 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#5a4a90", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                    🩺 Identité RPPS
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <b style={{ color: "#142131" }}>{createdInviteLink.rpps_profession || "—"}</b>
                    {createdInviteLink.rpps_specialite && <span style={{ color: "#5a4a90" }}>{createdInviteLink.rpps_specialite}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#5a4a90", marginTop: 4, fontFamily: "Consolas, monospace" }}>
                    RPPS {createdInviteLink.rpps}
                  </div>
                </div>
              )}

              <p style={{ margin: "0 0 8px", fontSize: 12, color: "#6c7a89" }}>
                Si l'email ne se configure pas, copiez le lien ci-dessous et transmettez-le manuellement :
              </p>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <input
                  readOnly
                  value={createdInviteLink.link}
                  onFocus={(e) => e.target.select()}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    border: "1px solid #d3d9e0",
                    borderRadius: 6,
                    fontSize: 12,
                    fontFamily: "Consolas, monospace",
                    background: "#f4f7fa",
                  }}
                />
                <button
                  className="btn-save"
                  onClick={() => {
                    navigator.clipboard.writeText(createdInviteLink.link);
                    toast.success("Lien copié !");
                  }}
                  title="Copier le lien"
                >
                  <i className="ti ti-copy" /> Copier
                </button>
              </div>
              <p style={{ fontSize: 11, color: "#8a98a8", margin: 0 }}>
                <i className="ti ti-clock" /> Ce lien est valide pendant 7 jours.
              </p>
            </div>
            <div className="modal-foot">
              <button
                className="btn-save"
                onClick={() => { setCreatedInviteLink(null); setInviteModal(false); }}
              >
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alpha 0.16.0 : modale infos utilisateur */}
      {userInfoModal && (
        <div className="modal-bg" onClick={(e) => e.target.classList.contains("modal-bg") && setUserInfoModal(null)}>
          <div className="modal" style={{ maxWidth: 540 }}>
            <div className="modal-head">
              Informations utilisateur
              <i className="ti ti-x" style={{ cursor: "pointer" }} onClick={() => setUserInfoModal(null)} />
            </div>
            <div className="modal-body">
              {/* Stats d'activité */}
              {userActivity && (
                <div style={{ background:"linear-gradient(135deg,#f4f7fa,#eaf2f4)", borderRadius:10, padding:14, marginBottom:14, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div>
                    <div style={{ fontSize:11, color:"#6c7a89", fontWeight:700, letterSpacing:.5, textTransform:"uppercase" }}>Dernière activité</div>
                    <div style={{ fontSize:14, color:"#142131", fontWeight:600, marginTop:3 }}>
                      {userActivity.derniere_activite ? fmtDate(userActivity.derniere_activite) : <span style={{ color:"#8a98a8", fontWeight:400 }}>Jamais</span>}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:"#6c7a89", fontWeight:700, letterSpacing:.5, textTransform:"uppercase" }}>Actions totales</div>
                    <div style={{ fontSize:14, color:"#142131", fontWeight:600, marginTop:3 }}>{userActivity.nb_actions}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:"#6c7a89", fontWeight:700, letterSpacing:.5, textTransform:"uppercase" }}>7 derniers jours</div>
                    <div style={{ fontSize:14, color:"#185FA5", fontWeight:600, marginTop:3 }}>{userActivity.actions_7j} action{userActivity.actions_7j>1?"s":""}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:"#6c7a89", fontWeight:700, letterSpacing:.5, textTransform:"uppercase" }}>30 derniers jours</div>
                    <div style={{ fontSize:14, color:"#185FA5", fontWeight:600, marginTop:3 }}>{userActivity.actions_30j} action{userActivity.actions_30j>1?"s":""}</div>
                  </div>
                </div>
              )}

              <div className="fld">
                <label>Nom affiché</label>
                <input value={userInfoForm.nom_affiche} onChange={(e)=>setUserInfoForm({...userInfoForm, nom_affiche:e.target.value})} placeholder="Marie Dupont" />
              </div>
              <div className="grid-2-mobile-1" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div className="fld">
                  <label>Poste / fonction</label>
                  <input value={userInfoForm.poste} onChange={(e)=>setUserInfoForm({...userInfoForm, poste:e.target.value})} placeholder="Infirmière coordinatrice" />
                </div>
                <div className="fld">
                  <label>Téléphone</label>
                  <input value={userInfoForm.telephone} onChange={(e)=>setUserInfoForm({...userInfoForm, telephone:e.target.value})} placeholder="06 12 34 56 78" />
                </div>
              </div>
              <div className="fld">
                <label>Date d'arrivée</label>
                <input type="date" value={userInfoForm.date_arrivee} onChange={(e)=>setUserInfoForm({...userInfoForm, date_arrivee:e.target.value})} />
              </div>

              {/* 0.55.29 : Bloc RPPS (visible uniquement si RPPS renseigné) */}
              {userInfoForm.rpps && (
                <div style={{
                  marginTop: 10,
                  background: "#f3effa",
                  border: "1px solid #d6c9ec",
                  borderRadius: 8,
                  padding: "10px 12px",
                }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: "#5a4a90",
                    display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
                  }}>
                    <i className="ti ti-stethoscope" /> Données RPPS (annuaire ANS)
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 10.5, color: "#6c7a89", fontWeight: 600, textTransform: "uppercase" }}>N° RPPS</div>
                      <code style={{ fontSize: 13, fontFamily: "Consolas, monospace", color: "#142131" }}>
                        {userInfoForm.rpps}
                      </code>
                    </div>
                    {userInfoForm.adeli && (
                      <div>
                        <div style={{ fontSize: 10.5, color: "#6c7a89", fontWeight: 600, textTransform: "uppercase" }}>N° ADELI</div>
                        <code style={{ fontSize: 13, fontFamily: "Consolas, monospace", color: "#142131" }}>
                          {userInfoForm.adeli}
                        </code>
                      </div>
                    )}
                  </div>
                  {(userInfoForm.rpps_profession || userInfoForm.rpps_specialite) && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "#5a4a90" }}>
                      <b>{userInfoForm.rpps_profession || "—"}</b>
                      {userInfoForm.rpps_specialite && <> · {userInfoForm.rpps_specialite}</>}
                      {userInfoForm.rpps_mode_exercice && <> · <i>{userInfoForm.rpps_mode_exercice}</i></>}
                    </div>
                  )}
                </div>
              )}

              {/* 0.55.25 : Champs RH étendus dans un bloc séparé */}
              <details style={{ marginTop: 10, background: "#f4f7fa", border: "1px solid #e3e9ee", borderRadius: 8, padding: "8px 12px" }}>
                <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#142131", padding: "4px 0" }}>
                  <i className="ti ti-id-badge" /> Informations RH étendues
                </summary>
                <div style={{ paddingTop: 10 }}>
                  <div className="grid-2-mobile-1" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <div className="fld">
                      <label>Matricule interne</label>
                      <input value={userInfoForm.matricule} onChange={(e)=>setUserInfoForm({...userInfoForm, matricule:e.target.value})} placeholder="ex: 0042" />
                    </div>
                    <div className="fld">
                      <label>Date de naissance</label>
                      <input type="date" value={userInfoForm.date_naissance} onChange={(e)=>setUserInfoForm({...userInfoForm, date_naissance:e.target.value})} />
                    </div>
                  </div>
                  <div className="grid-2-mobile-1" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop: 10 }}>
                    <div className="fld">
                      <label>Spécialité</label>
                      <input value={userInfoForm.specialite} onChange={(e)=>setUserInfoForm({...userInfoForm, specialite:e.target.value})} placeholder="ex: Cardiologie" />
                    </div>
                    <div className="fld">
                      <label>Diplôme</label>
                      <input value={userInfoForm.diplome} onChange={(e)=>setUserInfoForm({...userInfoForm, diplome:e.target.value})} placeholder="ex: IDE Bac+3" />
                    </div>
                  </div>
                  <div className="fld" style={{ marginTop: 10 }}>
                    <label>Adresse postale <span style={{ color: "#5aa05a", fontSize: 10, fontWeight: 600 }}>(autocomplétée INSEE)</span></label>
                    <AddressAutocomplete
                      value={userInfoForm.adresse}
                      onSelect={(addr) => setUserInfoForm({
                        ...userInfoForm,
                        adresse: addr.label,
                      })}
                      placeholder="12 rue de la République, 75001 Paris"
                    />
                  </div>
                  <div className="grid-2-mobile-1" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop: 10 }}>
                    <div className="fld">
                      <label>Contact d'urgence (nom)</label>
                      <input value={userInfoForm.contact_urgence_nom} onChange={(e)=>setUserInfoForm({...userInfoForm, contact_urgence_nom:e.target.value})} placeholder="Marie Dupont (conjoint)" />
                    </div>
                    <div className="fld">
                      <label>Contact d'urgence (tél)</label>
                      <input value={userInfoForm.contact_urgence_tel} onChange={(e)=>setUserInfoForm({...userInfoForm, contact_urgence_tel:e.target.value})} placeholder="06 12 34 56 78" />
                    </div>
                  </div>
                  <div className="fld" style={{ marginTop: 10 }}>
                    <label>Date de fin de contrat <span style={{ color: "#8a98a8", fontSize: 11 }}>(optionnel)</span></label>
                    <input type="date" value={userInfoForm.date_fin_contrat} onChange={(e)=>setUserInfoForm({...userInfoForm, date_fin_contrat:e.target.value})} />
                  </div>
                </div>
              </details>

              {/* 0.55.25 : Actions admin */}
              <details style={{ marginTop: 8, background: "#fff8ec", border: "1px solid #f0d59f", borderRadius: 8, padding: "8px 12px" }}>
                <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#7a4f15", padding: "4px 0" }}>
                  <i className="ti ti-tool" /> Actions administrateur
                </summary>
                <div style={{ paddingTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => resetUserPassword(userInfoModal)}
                    style={{
                      background: "linear-gradient(135deg, #c0392b, #e74c3c)",
                      color: "#fff", border: "none", padding: "8px 12px", borderRadius: 8,
                      fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      display: "inline-flex", alignItems: "center", gap: 5,
                    }}
                  >
                    <i className="ti ti-key" /> Réinitialiser mot de passe
                  </button>
                  <a
                    href={`mailto:${userInfoModal.email || ""}`}
                    style={{
                      background: "#185FA5", color: "#fff", border: "none", padding: "8px 12px",
                      borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                      fontFamily: "inherit", textDecoration: "none",
                      display: "inline-flex", alignItems: "center", gap: 5,
                    }}
                  >
                    <i className="ti ti-mail" /> Envoyer un email
                  </a>
                </div>
                <p style={{ fontSize: 11, color: "#7a4f15", marginTop: 8, margin: "8px 0 0", lineHeight: 1.4 }}>
                  <i className="ti ti-info-circle" /> La réinitialisation déclenche un email Supabase à l'utilisateur pour redéfinir son mot de passe.
                </p>
              </details>

              <div className="fld" style={{ marginTop: 10 }}>
                <label>Notes internes</label>
                <textarea value={userInfoForm.notes} onChange={(e)=>setUserInfoForm({...userInfoForm, notes:e.target.value})} rows={3} style={{ width:"100%", padding:9, border:"1px solid #e1e6eb", borderRadius:8, fontFamily:"inherit", fontSize:13, resize:"vertical" }} placeholder="Compétences, disponibilités, infos pratiques…" />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={()=>setUserInfoModal(null)}>Fermer</button>
              <button className="btn-save" onClick={saveUserInfo}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* 0.55.29 — Modale recherche RPPS pour pré-remplir l'invitation */}
      <Modal
        open={rppsSearchOpen}
        onClose={() => setRppsSearchOpen(false)}
        title="Rechercher dans l'annuaire RPPS"
        subtitle="Pré-remplit prénom / nom / profession / RPPS / ADELI"
        icon="ti-stethoscope"
        color="#7a6fb0"
        maxWidth={680}
      >
        <RppsSearch
          onSelect={(p) => {
            setInviteForm((f) => ({
              ...f,
              prenom: p.prenom || f.prenom,
              nom: p.nom || f.nom,
              nom_affiche: `${p.prenom || ""} ${p.nom || ""}`.trim() || f.nom_affiche,
              telephone: p.telephone || f.telephone,
              fonction_detail: p.profession || f.fonction_detail,
              rpps: p.rpps || "",
              adeli: p.adeli || "",
              rpps_profession: p.profession || "",
              rpps_specialite: p.specialite || "",
              rpps_mode_exercice: p.mode_exercice || "",
            }));
            setRppsSearchOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}
