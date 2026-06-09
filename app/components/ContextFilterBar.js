"use client";
// =============================================================
//  ContextFilterBar — Sélecteurs Étab/Service/Équipe/Bâtiment/Chambre
//  ULTRA DÉFENSIF : tolère colonnes/tables manquantes
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";

const STORAGE_KEYS = {
  etab:    "av-ctx-etab-id",
  service: "av-ctx-service-id",
  equipe:  "av-ctx-equipe-id",
  bat:     "av-ctx-bat-id",
  chambre: "av-ctx-chambre-id",
};

export function getContextFilters() {
  if (typeof window === "undefined") return {};
  try {
    return {
      etabId:    localStorage.getItem(STORAGE_KEYS.etab) || null,
      serviceId: localStorage.getItem(STORAGE_KEYS.service) || null,
      equipeId:  localStorage.getItem(STORAGE_KEYS.equipe) || null,
      batId:     localStorage.getItem(STORAGE_KEYS.bat) || null,
      chambreId: localStorage.getItem(STORAGE_KEYS.chambre) || null,
    };
  } catch (e) { return {}; }
}

export function setContextFilter(key, value) {
  if (typeof window === "undefined") return;
  try {
    if (value) localStorage.setItem(STORAGE_KEYS[key], value);
    else localStorage.removeItem(STORAGE_KEYS[key]);
    window.dispatchEvent(new CustomEvent("av-ctx-change", { detail: { key, value } }));
  } catch (e) {}
}

// Helper : safe query avec fallback
async function safeQuery(supabase, table, select, where) {
  try {
    let q = supabase.from(table).select(select);
    Object.entries(where || {}).forEach(([k, v]) => { q = q.eq(k, v); });
    const r = await q;
    if (r.error) {
      console.warn(`[ContextFilter] ${table} query failed:`, r.error.message);
      return [];
    }
    return r.data || [];
  } catch (e) {
    console.warn(`[ContextFilter] ${table} threw:`, e.message);
    return [];
  }
}

export default function ContextFilterBar({ auth }) {
  const supabase = createClient();
  const [etabs, setEtabs] = useState([]);
  const [services, setServices] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [batiments, setBatiments] = useState([]);
  const [chambres, setChambres] = useState([]);
  const [sel, setSel] = useState({ etabId: null, serviceId: null, equipeId: null, batId: null, chambreId: null });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setSel(getContextFilters());
  }, []);

  useEffect(() => {
    if (!auth?.structureId) return;
    (async () => {
      // Établissements : essai avec structure_id
      let e = await safeQuery(supabase, "etablissements", "id, nom", { structure_id: auth.structureId });
      if (e.length === 0) {
        // Fallback : tous les etabs
        e = await safeQuery(supabase, "etablissements", "id, nom", {});
      }
      setEtabs(e);
    })();
  }, [auth?.structureId]);

  useEffect(() => {
    if (!sel.etabId) {
      setServices([]); setEquipes([]); setBatiments([]); setChambres([]);
      return;
    }
    (async () => {
      // Tentatives multiples car les schémas varient
      const [s, eq, b] = await Promise.all([
        safeQuery(supabase, "services", "id, nom", { etablissement_id: sel.etabId }),
        // Équipes : peut être lié à structure_id OU etablissement_id OU rien
        (async () => {
          let r = await safeQuery(supabase, "equipes", "id, nom", { etablissement_id: sel.etabId });
          if (r.length === 0) r = await safeQuery(supabase, "equipes", "id, nom", { structure_id: auth.structureId });
          if (r.length === 0) r = await safeQuery(supabase, "equipes", "id, nom", {});
          return r;
        })(),
        safeQuery(supabase, "batiments", "id, nom", { etablissement_id: sel.etabId }),
      ]);
      setServices(s);
      setEquipes(eq);
      setBatiments(b);
    })();
  }, [sel.etabId, auth?.structureId]);

  useEffect(() => {
    if (!sel.batId) { setChambres([]); return; }
    (async () => {
      let c = await safeQuery(supabase, "chambres", "id, nom, numero", { batiment_id: sel.batId });
      // Fallback si pas batiment_id
      if (c.length === 0 && sel.etabId) {
        c = await safeQuery(supabase, "chambres", "id, nom, numero", { etablissement_id: sel.etabId });
      }
      setChambres(c);
    })();
  }, [sel.batId, sel.etabId]);

  function changeFilter(key, value) {
    const newSel = { ...sel, [key]: value };
    if (key === "etabId") {
      newSel.serviceId = null; newSel.equipeId = null; newSel.batId = null; newSel.chambreId = null;
      setContextFilter("service", null); setContextFilter("equipe", null);
      setContextFilter("bat", null); setContextFilter("chambre", null);
    } else if (key === "batId") {
      newSel.chambreId = null;
      setContextFilter("chambre", null);
    }
    setSel(newSel);
    setContextFilter(key.replace("Id", ""), value);
  }

  function clearAll() {
    setSel({ etabId: null, serviceId: null, equipeId: null, batId: null, chambreId: null });
    Object.keys(STORAGE_KEYS).forEach(k => setContextFilter(k, null));
  }

  const activeCount = Object.values(sel).filter(Boolean).length;
  const etabNom = etabs.find(e => e.id === sel.etabId)?.nom;

  // Si pas connecté, ne rien afficher
  if (!auth?.structureId) return null;

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 800,
      background: activeCount > 0 ? "linear-gradient(180deg, #185FA520 0%, #142131 100%)" : "#0e1a2a",
      borderBottom: "1px solid rgba(255,255,255,.06)",
      fontFamily: "Quicksand, sans-serif",
    }}>
      <div style={{ padding: "8px 16px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => setOpen(!open)} style={{
          padding: "6px 12px",
          background: activeCount > 0 ? "linear-gradient(135deg, #185FA5, #0d4585)" : "rgba(255,255,255,.06)",
          color: "#fff",
          border: `1px solid ${activeCount > 0 ? "#185FA580" : "rgba(255,255,255,.10)"}`,
          borderRadius: 8, fontFamily: "Quicksand", fontWeight: 700, fontSize: 11,
          cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          <i className="ti ti-filter" />
          Contexte
          {activeCount > 0 && <span style={{ background: "rgba(255,255,255,.20)", padding: "1px 6px", borderRadius: 4, fontSize: 10 }}>{activeCount}</span>}
          <i className="ti ti-chevron-down" style={{ fontSize: 10 }} />
        </button>

        {sel.etabId && etabNom && <Chip ic="ti-building-hospital" l={etabNom} c="#C9867F" onRemove={() => changeFilter("etabId", null)} />}
        {sel.serviceId && <Chip ic="ti-stethoscope" l={services.find(s => s.id === sel.serviceId)?.nom || "Service"} c="#7CC8C8" onRemove={() => changeFilter("serviceId", null)} />}
        {sel.equipeId && <Chip ic="ti-users" l={equipes.find(e => e.id === sel.equipeId)?.nom || "Équipe"} c="#7a6fb0" onRemove={() => changeFilter("equipeId", null)} />}
        {sel.batId && <Chip ic="ti-building" l={batiments.find(b => b.id === sel.batId)?.nom || "Bâtiment"} c="#5e4a8c" onRemove={() => changeFilter("batId", null)} />}
        {sel.chambreId && <Chip ic="ti-bed" l={chambres.find(c => c.id === sel.chambreId)?.nom || chambres.find(c => c.id === sel.chambreId)?.numero || "Chambre"} c="#EF9F27" onRemove={() => changeFilter("chambreId", null)} />}
        {activeCount > 0 && (
          <button onClick={clearAll} style={{
            marginLeft: "auto", padding: "4px 10px", background: "transparent",
            color: "rgba(255,255,255,.6)", border: "1px solid rgba(255,255,255,.15)",
            borderRadius: 6, fontFamily: "Quicksand", fontWeight: 700, fontSize: 10, cursor: "pointer",
          }}>
            <i className="ti ti-x" /> Tout effacer
          </button>
        )}
      </div>

      {open && (
        <div style={{ padding: 12, background: "rgba(20,33,49,.95)", borderTop: "1px solid rgba(255,255,255,.06)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <Sel label="Établissement" ic="ti-building-hospital" c="#C9867F" value={sel.etabId || ""} onChange={(v) => changeFilter("etabId", v || null)} options={etabs} />
          <Sel label="Service" ic="ti-stethoscope" c="#7CC8C8" value={sel.serviceId || ""} onChange={(v) => changeFilter("serviceId", v || null)} options={services} disabled={!sel.etabId} />
          <Sel label="Équipe" ic="ti-users" c="#7a6fb0" value={sel.equipeId || ""} onChange={(v) => changeFilter("equipeId", v || null)} options={equipes} disabled={!sel.etabId} />
          <Sel label="Bâtiment / Étage" ic="ti-building" c="#5e4a8c" value={sel.batId || ""} onChange={(v) => changeFilter("batId", v || null)} options={batiments} disabled={!sel.etabId} />
          <Sel label="Chambre" ic="ti-bed" c="#EF9F27" value={sel.chambreId || ""} onChange={(v) => changeFilter("chambreId", v || null)} options={chambres.map(c => ({ id: c.id, nom: c.nom || c.numero || c.id }))} disabled={!sel.batId} />
        </div>
      )}
    </div>
  );
}

function Sel({ label, ic, c, value, onChange, options, disabled }) {
  return (
    <div>
      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: c, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
        <i className={`ti ${ic}`} /> {label} {options.length > 0 && <span style={{ marginLeft: "auto", color: "rgba(255,255,255,.3)" }}>{options.length}</span>}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled || options.length === 0} style={{
        width: "100%", padding: "6px 8px",
        background: disabled ? "rgba(255,255,255,.02)" : "rgba(255,255,255,.08)",
        color: disabled ? "rgba(255,255,255,.3)" : "#fff",
        border: `1px solid ${c}30`, borderRadius: 6,
        fontFamily: "Quicksand", fontSize: 12,
        cursor: disabled ? "not-allowed" : "pointer",
      }}>
        <option value="">— Tous —</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
      </select>
    </div>
  );
}

function Chip({ ic, l, c, onRemove }) {
  return (
    <span style={{
      background: `${c}25`, color: "#fff",
      border: `1px solid ${c}50`, padding: "3px 8px", borderRadius: 6,
      fontSize: 11, fontWeight: 600,
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      <i className={`ti ${ic}`} style={{ color: c }} />
      {l}
      <button onClick={onRemove} style={{ background: "transparent", color: c, border: "none", cursor: "pointer", fontSize: 10, padding: 0, marginLeft: 2 }}>
        <i className="ti ti-x" />
      </button>
    </span>
  );
}

export function useContextFilters() {
  const [filters, setFilters] = useState(() => getContextFilters());
  useEffect(() => {
    function onChange() { setFilters(getContextFilters()); }
    window.addEventListener("av-ctx-change", onChange);
    return () => window.removeEventListener("av-ctx-change", onChange);
  }, []);
  return filters;
}
