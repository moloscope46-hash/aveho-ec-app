"use client";
// =============================================================
//  app/components/BatimentServiceSwitcher.js (0.58.35)
//
//  Sélecteurs bâtiment + service affichés dans la TopBar (desktop only).
//  - Charge les bâtiments de l'établissement courant (auth.etabId)
//  - Au changement de bâtiment, charge les services rattachés (via étages)
//  - Persiste les sélections en localStorage (av-current-batiment-id,
//    av-current-service-id) — purgeables au logout grâce au préfixe 'av-'
//  - Masqué en mobile via CSS class .bat-svc-switch (media query)
//  - Émet event "av-current-context-change" pour que d'autres composants
//    puissent réagir (filtrage de listes, par exemple)
// =============================================================

import { useEffect, useState } from "react";
import TopBarSelect from "./TopBarSelect";  /* 0.62.112 */
import { createClient } from "../../lib/supabase";
// 0.58.84 : helper sondage batiment_id (évite 400 cascadants)
import { selectServicesContexte } from "../../lib/services";
// 0.62.10 : Filtrer par rattachements magasin
import { useMagasinContext } from "../../lib/useMagasinContext";

const STORAGE_BAT = "av-current-batiment-id";
const STORAGE_SVC = "av-current-service-id";

export default function BatimentServiceSwitcher({ auth }) {
  const supabase = createClient();
  const magasinCtx = useMagasinContext();
  const [batiments, setBatiments] = useState([]);
  const [services, setServices] = useState([]);
  const [batId, setBatId] = useState("");
  const [svcId, setSvcId] = useState("");
  const [loading, setLoading] = useState(false);

  // 0.62.10 : En mode magasin, charger d'abord les rattachements
  const [rattachementsMagasin, setRattachementsMagasin] = useState(null);
  useEffect(() => {
    if (!magasinCtx.isUserMagasin || !magasinCtx.magasinId) { setRattachementsMagasin(null); return; }
    (async () => {
      try {
        const r = await supabase.from("magasins_rattachements")
          .select("etablissement_id, batiment_id, service_id, depot_id")
          .eq("magasin_id", magasinCtx.magasinId)
          .eq("actif", true);
        setRattachementsMagasin(r.data || []);
      } catch { setRattachementsMagasin([]); }
    })();
  }, [magasinCtx.isUserMagasin, magasinCtx.magasinId]);

  // Charge bâtiments quand l'établissement change
  useEffect(() => {
    if (!auth?.etabId) {
      setBatiments([]);
      setBatId("");
      return;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("batiments")
          .select("id, nom, icone")
          .eq("etablissement_id", auth.etabId)
          .order("nom");
        if (!alive) return;
        // Fallback gracieux si la colonne `icone` n'existe pas encore (SQL 0.58.60 pas passé)
        let list = data || [];
        if (error && (error.code === "42703" || /icone/i.test(error.message || ""))) {
          const fb = await supabase.from("batiments").select("id, nom").eq("etablissement_id", auth.etabId).order("nom");
          list = fb.data || [];
        }
        setBatiments(list);
        // 0.62.10 : En mode magasin, filtrer la liste sur les rattachements
        if (magasinCtx.isUserMagasin && Array.isArray(rattachementsMagasin)) {
          const bIdsAutorises = new Set(rattachementsMagasin.filter(r => r.batiment_id).map(r => r.batiment_id));
          // Si rattachements précisent des batiment_id, on filtre ; sinon (rattachement niveau étab) on garde tout
          if (bIdsAutorises.size > 0) {
            list = list.filter(b => bIdsAutorises.has(b.id));
            setBatiments(list);
          }
        }
        // Restore sélection précédente si toujours valide
        // 0.58.98 : si saved === "" → "Tous les bâtiments" (préserver le choix)
        try {
          const saved = localStorage.getItem(STORAGE_BAT);
          if (saved === "") {
            // "Tous les bâtiments" explicitement choisi
            setBatId("");
          } else if (saved && list.find(b => b.id === saved)) {
            setBatId(saved);
          } else if (list.length > 0) {
            // Par défaut au premier load : "Tous les bâtiments" (au lieu du 1er)
            // pour ne pas surprendre l'utilisateur en filtrant d'office
            setBatId("");
          } else {
            setBatId("");
          }
        } catch {
          setBatId("");
        }
      } catch (e) {
        setBatiments([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [auth?.etabId, rattachementsMagasin]);

  // 0.58.60 : équipes rattachées au service (ou bâtiment si pas de service)
  const [equipes, setEquipes] = useState([]);
  const [equipeId, setEquipeId] = useState("");

  // Charge services quand le bâtiment change (via étages → services)
  useEffect(() => {
    if (!batId) {
      setServices([]);
      setSvcId("");
      return;
    }
    let alive = true;
    (async () => {
      try {
        // 0.58.84 : helper qui sonde si batiment_id existe avant le filter
        // Plus de 400 cascadants. Si pas de batiment_id en DB → fallback structure.
        const r = await selectServicesContexte(supabase, {
          structureId,
          batimentId: batId,
        });
        if (!alive) return;
        const list = r?.data || [];
        setServices(list);
        try {
          const saved = localStorage.getItem(STORAGE_SVC);
          if (saved === "") {
            // 0.58.98 : "Tous les services" préservé
            setSvcId("");
          } else if (saved && list.find(s => s.id === saved)) {
            setSvcId(saved);
          } else {
            // Par défaut "Tous les services" (au lieu du 1er)
            setSvcId("");
          }
        } catch {
          setSvcId("");
        }
      } catch (err) {
        if (alive) { setServices([]); setSvcId(""); }
      }
    })();
    return () => { alive = false; };
  }, [batId]);

  // 0.58.60 : Charge les équipes du bâtiment courant
  useEffect(() => {
    if (!batId) {
      setEquipes([]);
      setEquipeId("");
      return;
    }
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("equipes")
          .select("id, nom, couleur")
          .eq("batiment_id", batId)
          .order("nom");
        if (!alive) return;
        if (error) {
          // colonne batiment_id absente ? on cherche via etablissement
          const fb = await supabase.from("equipes").select("id, nom, couleur").order("nom");
          setEquipes((fb.data || []).slice(0, 30));
        } else {
          setEquipes(data || []);
        }
        try {
          const saved = localStorage.getItem("av-current-equipe-id");
          if (saved && (data || []).find(e => e.id === saved)) {
            setEquipeId(saved);
          } else {
            setEquipeId("");
          }
        } catch {}
      } catch {
        if (alive) { setEquipes([]); setEquipeId(""); }
      }
    })();
    return () => { alive = false; };
  }, [batId]);

  // Persiste + dispatch event
  // 0.58.98 : id="" = "Tous les bâtiments" → dispatch batimentId: null
  function changeBat(id) {
    setBatId(id);
    try { localStorage.setItem(STORAGE_BAT, id); } catch {}
    // Reset service quand on change de bâtiment
    setSvcId("");
    try { localStorage.setItem(STORAGE_SVC, ""); } catch {}
    try {
      window.dispatchEvent(new CustomEvent("av-current-context-change", {
        detail: { batimentId: id || null, serviceId: null, equipeId: null },
      }));
    } catch {}
  }
  function changeSvc(id) {
    setSvcId(id);
    try { localStorage.setItem(STORAGE_SVC, id); } catch {}
    try {
      window.dispatchEvent(new CustomEvent("av-current-context-change", {
        detail: { batimentId: batId || null, serviceId: id || null, equipeId: equipeId || null },
      }));
    } catch {}
  }
  // 0.58.60 : change équipe + persist + dispatch
  function changeEquipe(id) {
    setEquipeId(id);
    try { localStorage.setItem("av-current-equipe-id", id); } catch {}
    try {
      window.dispatchEvent(new CustomEvent("av-current-context-change", {
        detail: { batimentId: batId || null, serviceId: svcId || null, equipeId: id || null },
      }));
    } catch {}
  }

  if (!auth?.etabId) return null;
  if (batiments.length === 0 && !loading) return null;

  return (
    <div
      className="bat-svc-switch"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        marginLeft: 4,
      }}
    >
      {/* 0.62.112 : refonte avec TopBarSelect (bottom-sheet mobile + pas de <select> natif) */}
      {/* Bâtiment */}
      <TopBarSelect
        options={batiments.map(b => ({ id: b.id, nom: b.nom, icone: b.icone }))}
        value={batId}
        onChange={changeBat}
        placeholder="—"
        icon="ti-building"
        iconColor="#7CC8C8"
        label="Choisir un bâtiment"
        allLabel={batiments.length > 0 ? "Tous les bâtiments" : null}
      />

      {/* Service */}
      {services.length > 0 && (
        <TopBarSelect
          options={services.map(s => ({ id: s.id, nom: s.nom, icone: s.icone }))}
          value={svcId}
          onChange={changeSvc}
          placeholder="Service"
          icon="ti-stethoscope"
          iconColor="#EF9F27"
          label="Choisir un service"
          allLabel="Tous les services"
        />
      )}

      {/* Équipe */}
      {equipes.length > 0 && (
        <TopBarSelect
          options={equipes.map(e => ({ id: e.id, nom: e.nom }))}
          value={equipeId}
          onChange={changeEquipe}
          placeholder="Équipe"
          icon="ti-users-group"
          iconColor={equipes.find(e => e.id === equipeId)?.couleur || "#7a6fb0"}
          label="Choisir une équipe"
          allLabel="Toutes les équipes"
        />
      )}

      <style jsx global>{`
        /* 0.58.35 : masqué en mobile (la TopBar a déjà peu de place) */
        @media (max-width: 768px) {
          .bat-svc-switch { display: none !important; }
        }
      `}</style>
    </div>
  );
}
