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
import { createClient } from "../../lib/supabase";
// 0.58.84 : helper sondage batiment_id (évite 400 cascadants)
import { selectServicesContexte } from "../../lib/services";

const STORAGE_BAT = "av-current-batiment-id";
const STORAGE_SVC = "av-current-service-id";

export default function BatimentServiceSwitcher({ auth }) {
  const supabase = createClient();
  const [batiments, setBatiments] = useState([]);
  const [services, setServices] = useState([]);
  const [batId, setBatId] = useState("");
  const [svcId, setSvcId] = useState("");
  const [loading, setLoading] = useState(false);

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
  }, [auth?.etabId]);

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
      {/* Bâtiment */}
      <div
        title="Bâtiment courant"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          background: "rgba(255,255,255,.06)",
          border: "1px solid rgba(255,255,255,.10)",
          borderRadius: 8,
          padding: "4px 4px 4px 8px",
        }}
      >
        <i
          className={`ti ti-${batiments.find(b => b.id === batId)?.icone || "building"}`}
          style={{ color: "#7CC8C8", fontSize: 14 }}
        />
        <select
          value={batId}
          onChange={(e) => changeBat(e.target.value)}
          aria-label="Bâtiment courant"
          style={{
            background: "transparent",
            border: "none",
            color: "#dde4eb",
            fontSize: 12,
            fontFamily: "inherit",
            cursor: "pointer",
            maxWidth: 130,
            outline: "none",
          }}
        >
          {batiments.length === 0 && <option value="">—</option>}
          {/* 0.58.98 : option "Tous les bâtiments" pour ne pas filtrer */}
          {batiments.length > 0 && (
            <option value="" style={{ color: "#142131", fontWeight: 700 }}>
              ★ Tous les bâtiments
            </option>
          )}
          {batiments.map(b => (
            <option key={b.id} value={b.id} style={{ color: "#142131" }}>{b.nom}</option>
          ))}
        </select>
      </div>

      {/* Service */}
      {services.length > 0 && (
        <div
          title="Service courant"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "rgba(255,255,255,.06)",
            border: "1px solid rgba(255,255,255,.10)",
            borderRadius: 8,
            padding: "4px 4px 4px 8px",
          }}
        >
          <i
            className={`ti ti-${services.find(s => s.id === svcId)?.icone || "stethoscope"}`}
            style={{ color: "#EF9F27", fontSize: 14 }}
          />
          <select
            value={svcId}
            onChange={(e) => changeSvc(e.target.value)}
            aria-label="Service courant"
            style={{
              background: "transparent",
              border: "none",
              color: "#dde4eb",
              fontSize: 12,
              fontFamily: "inherit",
              cursor: "pointer",
              maxWidth: 130,
              outline: "none",
            }}
          >
            {/* 0.58.98 : option "Tous les services" */}
            <option value="" style={{ color: "#142131", fontWeight: 700 }}>
              ★ Tous les services
            </option>
            {services.map(s => (
              <option key={s.id} value={s.id} style={{ color: "#142131" }}>{s.nom}</option>
            ))}
          </select>
        </div>
      )}

      {/* 0.58.60 : Équipe */}
      {equipes.length > 0 && (
        <div
          title="Équipe courante (filtre)"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "rgba(255,255,255,.06)",
            border: "1px solid rgba(255,255,255,.10)",
            borderRadius: 8,
            padding: "4px 4px 4px 8px",
          }}
        >
          <i
            className="ti ti-users-group"
            style={{
              color: equipes.find(e => e.id === equipeId)?.couleur || "#7a6fb0",
              fontSize: 14,
            }}
          />
          <select
            value={equipeId}
            onChange={(e) => changeEquipe(e.target.value)}
            aria-label="Équipe courante"
            style={{
              background: "transparent",
              border: "none",
              color: "#dde4eb",
              fontSize: 12,
              fontFamily: "inherit",
              cursor: "pointer",
              maxWidth: 130,
              outline: "none",
            }}
          >
            <option value="" style={{ color: "#142131" }}>— Toutes les équipes —</option>
            {equipes.map(e => (
              <option key={e.id} value={e.id} style={{ color: "#142131" }}>{e.nom}</option>
            ))}
          </select>
        </div>
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
