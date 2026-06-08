"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "./supabase";

const ETAB_KEY = "aveho_etab_courant";

/**
 * Auth + contexte. Charge la collectivité (structure) ET les établissements
 * de l'utilisateur, avec un établissement "courant" mémorisé (localStorage).
 * Renvoie { ready, user, structureId, structureNom, etablissements, etabId, etabNom, setEtab }.
 */
export function useAuth() {
  const supabase = createClient();
  const router = useRouter();
  const [state, setState] = useState({
    ready: false, user: null, structureId: null, structureNom: "",
    etablissements: [], etabId: null, etabNom: "",
  });

  function setEtab(id) {
    const e = state.etablissements.find((x) => x.id === id);
    if (!e) return;
    try { localStorage.setItem(ETAB_KEY, id); } catch {}
    setState((p) => ({ ...p, etabId: id, etabNom: e.nom }));
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { router.push("/login"); return; }
      const { data: m } = await supabase.from("membres_structure").select("structure_id, structures(nom)").limit(1).maybeSingle();
      const structureId = m?.structure_id || null;

      // établissements accessibles
      let etabs = [];
      if (structureId) {
        const { data: me } = await supabase
          .from("membres_etablissements")
          .select("etablissement_id, etablissements(id,nom,type,ville,actif)")
          .eq("user_id", s.session.user.id);
        etabs = (me || []).map((x) => x.etablissements).filter(Boolean).filter((e) => e.actif !== false);
        // fallback : si pas de rattachement, prendre tous les établissements de la collectivité
        if (!etabs.length) {
          const { data: all } = await supabase.from("etablissements").select("id,nom,type,ville,actif").eq("structure_id", structureId);
          etabs = (all || []).filter((e) => e.actif !== false);
        }
      }
      let saved = null;
      try { saved = localStorage.getItem(ETAB_KEY); } catch {}
      const cur = etabs.find((e) => e.id === saved) || etabs[0] || null;

      if (!active) return;
      setState({
        ready: true, user: s.session.user, structureId,
        structureNom: m?.structures?.nom || "",
        etablissements: etabs, etabId: cur?.id || null, etabNom: cur?.nom || "",
      });
    })();
    return () => { active = false; };
  }, []);

  return { ...state, setEtab };
}
