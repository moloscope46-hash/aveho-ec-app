"use client";
// =============================================================
//  useAuth — hook central d'authentification et de contexte Aveho EC
//  Charge la collectivité, les établissements, le rôle de l'utilisateur,
//  et expose un helper `can(action)` pour vérifier les droits.
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "./supabase";

const ETAB_KEY = "aveho_etab_courant";

// Définition des permissions par action — mapping centralisé
// Chaque action requiert une "permission" : un rôle aura une liste de permissions
// dans son champ permissions_json (en base). Les rôles système ont un raccourci :
//   "admin" => tout
//   "lecture" => uniquement lectures
//   "membre" => lecture + écritures non destructives
const PERMS = {
  // structure du droit : action -> permission requise
  "ecrire": "write",
  "supprimer": "delete",
  "inviter": "invite_users",
  "gerer_roles": "manage_roles",
  "valider_transfert": "validate_transfer",
  "valider_di": "validate_di",
  "creer_etablissement": "manage_collectivite",
  "editer_etablissement": "manage_collectivite",
  "creer_chambre": "manage_locations",
  "editer_hierarchie": "manage_locations",
  // 0.55.43 : forcer la création d'un établissement en doublon
  // (avec commentaire obligatoire pour traçabilité)
  // Format objet { module, perm } pour ne matcher QUE le module "doublons" + write
  "force_doublon_etab": { module: "doublons", perm: "write" },
};

// Helper pur (testable) : un rôle peut-il faire telle action ?
export function canDo(role, action) {
  if (!role) return false;
  // raccourcis système
  if (role.systeme === "admin" || role.nom === "Administrateur") return true;
  if (role.systeme === "lecture" || role.nom === "Lecture seule") return false;
  // sinon on regarde les permissions explicites
  const needed = PERMS[action];
  if (!needed) return true; // action non listée = autorisée par défaut
  const perms = role.permissions_json || role.droits || role.permissions || [];

  // 0.55.43 : si la perm est un objet { module, perm }, on vérifie ce module précis
  if (typeof needed === "object" && needed.module && needed.perm) {
    if (Array.isArray(perms)) return perms.includes(needed.perm);
    if (perms && typeof perms === "object") {
      const v = perms[needed.module];
      if (Array.isArray(v)) return v.includes(needed.perm) || v.includes("*");
      if (v === "*" || v === needed.perm) return true;
    }
    return false;
  }

  // Format Array : ["write", "read", "*"]
  if (Array.isArray(perms)) return perms.includes(needed) || perms.includes("*");
  // Format Objet par module : { "stock": ["read","write"], "patients": ["read"] }
  // Si une seule clé contient le droit demandé, c'est OK
  if (perms && typeof perms === "object") {
    for (const mod in perms) {
      const v = perms[mod];
      if (Array.isArray(v) && (v.includes(needed) || v.includes("*"))) return true;
      if (v === "*" || v === needed) return true;
    }
  }
  return false;
}

export function useAuth() {
  const supabase = createClient();
  const router = useRouter();
  const [state, setState] = useState({
    ready: false, user: null, structureId: null, structureNom: "",
    etablissements: [], etabId: null, etabNom: "",
    role: null,                 // rôle effectif de l'utilisateur dans cette collectivité
  });

  function setEtab(id) {
    // 0.62.94 : id=null → mode "Tous les établissements" (pas de filtrage)
    if (!id) {
      try { localStorage.removeItem(ETAB_KEY); } catch {}
      setState((p) => ({ ...p, etabId: null, etabNom: "Tous les établissements" }));
      return;
    }
    const e = state.etablissements.find((x) => x.id === id);
    if (!e) return;
    try { localStorage.setItem(ETAB_KEY, id); } catch {}
    setState((p) => ({ ...p, etabId: id, etabNom: e.nom }));
  }

  // Helper exposé : auth.can("supprimer") -> boolean
  // Alpha 0.10 : si mode lecture seule activé, on bloque toutes les actions d'écriture
  function can(action) {
    if (typeof window !== "undefined") {
      try {
        if (localStorage.getItem("aveho_lecture_seule") === "1") {
          // En lecture seule, on n'autorise que les actions purement lecture
          if (["ecrire", "supprimer", "valider", "commander", "gerer_roles"].includes(action)) return false;
        }
      } catch (_) {}
    }
    return canDo(state.role, action);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { router.push("/login"); return; }
      // 1) collectivité + rôle de l'utilisateur dans cette collectivité
      // Tente d'abord avec les 2 noms de colonne possibles (compatibilité 0.1 vs nouvelle)
      let mRes = await supabase.from("membres_structure")
        .select("structure_id, role, structures(nom), roles(id,nom,systeme,permissions_json,droits)")
        .limit(1).maybeSingle();
      // Fallback : si la colonne droits/permissions_json n'existe pas, requête minimaliste
      if (mRes.error && (mRes.error.message?.includes("does not exist") || mRes.error.code === "42703")) {
        mRes = await supabase.from("membres_structure")
          .select("structure_id, role, structures(nom), roles(id,nom,systeme)")
          .limit(1).maybeSingle();
      }
      const m = mRes.data;
      const structureId = m?.structure_id || null;
      // rôle effectif : soit la table roles liée, soit le champ role texte (admin/membre/lecture)
      let role = m?.roles || null;
      if (!role && m?.role) {
        role = { systeme: m.role, nom: m.role === "admin" ? "Administrateur" : m.role === "lecture" ? "Lecture seule" : "Membre" };
      }

      // 2) établissements accessibles
      let etabs = [];
      if (structureId) {
        const { data: me } = await supabase
          .from("membres_etablissements")
          .select("etablissement_id, etablissements(id,nom,type,ville,actif,est_partenaire)")
          .eq("user_id", s.session.user.id);
        // 0.55.3 : on exclut les partenaires du switcher (l'user ne bosse pas DANS un partenaire)
        etabs = (me || []).map((x) => x.etablissements).filter(Boolean).filter((e) => e.actif !== false && !e.est_partenaire);
        if (!etabs.length) {
          const { data: all } = await supabase.from("etablissements").select("id,nom,type,ville,actif,est_partenaire").eq("structure_id", structureId);
          etabs = (all || []).filter((e) => e.actif !== false && !e.est_partenaire);
        }
      }
      let saved = null;
      try { saved = localStorage.getItem(ETAB_KEY); } catch {}
      let cur = etabs.find((e) => e.id === saved) || null;

      // 0.62.88 : Auto-connect via membres_magasin si user a un magasin attribué
      // et qu'aucun étab n'est explicitement sauvegardé en local
      if (!cur && structureId) {
        try {
          const { data: mm } = await supabase
            .from("membres_magasin")
            .select("magasin_id, magasins(id, etablissement_id, nom)")
            .eq("user_id", s.session.user.id)
            .limit(1)
            .maybeSingle();
          const magasinEtabId = mm?.magasins?.etablissement_id;
          if (magasinEtabId) {
            cur = etabs.find((e) => e.id === magasinEtabId) || cur;
            if (cur) {
              try { localStorage.setItem(ETAB_KEY, cur.id); } catch {}
            }
          }
        } catch {}
      }

      // Fallback : 1er étab disponible
      if (!cur) cur = etabs[0] || null;

      if (!active) return;
      setState({
        ready: true, user: s.session.user, structureId,
        structureNom: m?.structures?.nom || "",
        etablissements: etabs, etabId: cur?.id || null, etabNom: cur?.nom || "",
        role,
      });
    })();
    return () => { active = false; };
  }, []);

  // 0.62.95 : helpers pour mode "Tous les établissements"
  const isAllEtabs = !state.etabId;
  const allEtabIds = state.etablissements.map(e => e.id);
  // applyEtabFilter(query) : ajoute .eq("etablissement_id", etabId) sauf si "Tous"
  // → si tous, on utilise .in("etablissement_id", allEtabIds) ou rien si scope structure
  function applyEtabFilter(query, column = "etablissement_id") {
    if (!query) return query;
    if (state.etabId) return query.eq(column, state.etabId);
    if (allEtabIds.length > 0) return query.in(column, allEtabIds);
    return query;
  }

  return { ...state, setEtab, can, isAllEtabs, allEtabIds, applyEtabFilter };
}
