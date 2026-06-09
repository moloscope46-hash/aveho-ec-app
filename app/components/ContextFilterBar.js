"use client";
// =============================================================
//  ContextFilterBar — MOBILE ONLY (caché desktop >= 768px)
//  Requêtes safes : équipes via vue v_equipes_etablissement
//  Chambres : juste id, nom (pas de numero qui n'existe pas)
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

async function safeQuery(supabase, table, select, where) {
  try {
    let q = supabase.from(table).select(select);
    Object.entries(where || {}).forEach(([k, v]) => { q = q.eq(k, v); });
    const r = await q;
    if (r.error) {
      console.warn(`[ContextFilter] ${table}: ${r.error.message}`);
      return [];
    }
    return r.data || [];
  } catch (e) { return []; }
}

export default function ContextFilterBar({ auth }) {
  const supabase = createClient();
  const [isMobile, setIsMobile] = useState(false);
  const [etabs, setEtabs] = useState([]);
  const [services, setServices] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [batiments, setBatiments] = useState([]);
  const [chambres, setChambres] = useState([]);
  const [sel, setSel] = useState({ etabId: null, serviceId: null, equipeId: null, batId: null, chambreId: null });
  const [open, setOpen] = useState(false);

  // Détecter mobile (matchMedia + resize)
  useEffect(() => {
    if (typeof window === "undefined") return;
    function check() { setIsMobile(window.innerWidth < 768); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setSel(getContextFilters());
  }, []);

  useEffect(() => {
    if (!auth?.structureId || !isMobile) return;
    (async () => {
      let e = await safeQuery(supabase, "etablissements", "id, nom", { structure_id: auth.structureId });
      setEtabs(e);
    })();
  }, [auth?.structureId, isMobile]);

  useEffect(() => {
    if (!sel.etabId || !isMobile) {
      setServices([]); setEquipes([]); setBatiments([]); setChambres([]);
      return;
    }
    (async () => {
      const [s, eq, b] = await Promise.all([
        // Services : OK avec etablissement_id
        safeQuery(supabase, "services", "id, nom", { etablissement_id: sel.etabId }),
        // Équipes : via VUE v_equipes_etablissement (qui agrège via equipes_services)
        (async () => {
          let r = await safeQuery(supabase, "v_equipes_etablissement", "id, nom", { etablissement_id: sel.etabId });
          // Fallback : toutes les équipes de la structure
          if (r.length === 0) r = await safeQuery(supabase, "equipes", "id, nom", { structure_id: auth.structureId });
          return r;
        })(),
        safeQuery(supabase, "batiments", "id, nom", { etablissement_id: sel.etabId }),
      ]);
      setServices(s);
      setEquipes(eq);
      setBatiments(b);
    })();
  }, [sel.etabId, auth?.structureId, isMobile]);

  useEffect(() => {
    if (!sel.batId || !isMobile) { setChambres([]); return; }
    (async () => {
      // Chambres : juste id + nom (pas de "numero" qui n'existe pas chez tout le monde)
      const c = await safeQuery(supabase, "chambres", "id, nom", { batiment_id: sel.batId });
      setChambres(c);
    })();
  }, [sel.batId, isMobile]);

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

  // CACHÉ SUR DESKTOP : si pas mobile, ne rien afficher
  if (!isMobile) return null;
  if (!auth?.structureId) return null;

  const activeCount = Object.values(sel).filter(Boolean).length;
  const etabNom = etabs.find(e => e.id === sel.etabId)?.nom;

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 800,
      background: activeCount > 0 ? "linear-gradient(180deg, #185FA520 0%, #142131 100%)" : "#0e1a2a",
      borderBottom: "1px solid rgba(255,255,255,.06)",
      fontFamily: "Quicksand, sans-serif",
    }}>
      <div style={{ padding: "8px 12px", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => setOpen(!open)} style={{
          padding: "6px 10px",
          background: activeCount > 0 ? "linear-gradient(135deg, #185FA5, #0d4585)" : "rgba(255,255,255,.06)",
          color: "#fff",
          border: `1px solid ${activeCount > 0 ? "#185FA580" : "rgba(255,255,255,.10)"}`,
          borderRadius: 8, fontFamily: "Quicksand", fontWeight: 700, fontSize: 11,
          cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
        }}>
          <i className="ti ti-filter" />
          Contexte
          {activeCount > 0 && <span style={{ background: "rgba(255,255,255,.20)", padding: "1px 5px", borderRadius: 4, fontSize: 10 }}>{activeCount}</span>}
          <i className={`ti ti-chevron-${open ? "up" : "down"}`} style={{ fontSize: 10 }} />
        </button>

        {sel.etabId && etabNom && <Chip ic="ti-building-hospital" l={etabNom.substring(0, 12)} c="#C9867F" onRemove={() => changeFilter("etabId", null)} />}
        {sel.serviceId && <Chip ic="ti-stethoscope" l={(services.find(s => s.id === sel.serviceId)?.nom || "Service").substring(0, 10)} c="#7CC8C8" onRemove={() => changeFilter("serviceId", null)} />}
        {sel.equipeId && <Chip ic="ti-users" l={(equipes.find(e => e.id === sel.equipeId)?.nom || "Équipe").substring(0, 10)} c="#7a6fb0" onRemove={() => changeFilter("equipeId", null)} />}
        {sel.batId && <Chip ic="ti-building" l={(batiments.find(b => b.id === sel.batId)?.nom || "Bât").substring(0, 10)} c="#5e4a8c" onRemove={() => changeFilter("batId", null)} />}
        {sel.chambreId && <Chip ic="ti-bed" l={(chambres.find(c => c.id === sel.chambreId)?.nom || "Ch").substring(0, 8)} c="#EF9F27" onRemove={() => changeFilter("chambreId", null)} />}
        {activeCount > 0 && (
          <button onClick={clearAll} style={{
            marginLeft: "auto", padding: "3px 8px", background: "transparent",
            color: "rgba(255,255,255,.6)", border: "1px solid rgba(255,255,255,.15)",
            borderRadius: 6, fontFamily: "Quicksand", fontWeight: 700, fontSize: 10, cursor: "pointer",
          }}>
            <i className="ti ti-x" />
          </button>
        )}
      </div>

      {open && (
        <div style={{ padding: 10, background: "rgba(20,33,49,.95)", borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", flexDirection: "column", gap: 8 }}>
          <Sel label="Établissement" ic="ti-building-hospital" c="#C9867F" value={sel.etabId || ""} onChange={(v) => changeFilter("etabId", v || null)} options={etabs} />
          <Sel label="Service" ic="ti-stethoscope" c="#7CC8C8" value={sel.serviceId || ""} onChange={(v) => changeFilter("serviceId", v || null)} options={services} disabled={!sel.etabId} />
          <Sel label="Équipe" ic="ti-users" c="#7a6fb0" value={sel.equipeId || ""} onChange={(v) => changeFilter("equipeId", v || null)} options={equipes} disabled={!sel.etabId} />
          <Sel label="Bâtiment / Étage" ic="ti-building" c="#5e4a8c" value={sel.batId || ""} onChange={(v) => changeFilter("batId", v || null)} options={batiments} disabled={!sel.etabId} />
          <Sel label="Chambre" ic="ti-bed" c="#EF9F27" value={sel.chambreId || ""} onChange={(v) => changeFilter("chambreId", v || null)} options={chambres} disabled={!sel.batId} />
        </div>
      )}
    </div>
  );
}

function Sel({ label, ic, c, value, onChange, options, disabled }) {
  return (
    <div>
      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: c, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>
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
      border: `1px solid ${c}50`, padding: "3px 6px", borderRadius: 6,
      fontSize: 10, fontWeight: 600,
      display: "inline-flex", alignItems: "center", gap: 3,
    }}>
      <i className={`ti ${ic}`} style={{ color: c, fontSize: 11 }} />
      {l}
      <button onClick={onRemove} style={{ background: "transparent", color: c, border: "none", cursor: "pointer", fontSize: 9, padding: 0, marginLeft: 2 }}>
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
