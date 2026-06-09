"use client";
import { useState, useEffect } from "react";

export default function RefreshButton({ onRefresh, label = "Rafraîchir", color = "#7CC8C8", size = "md" }) {
  const [spinning, setSpinning] = useState(false);
  async function handleClick() {
    setSpinning(true);
    try { await onRefresh?.(); } catch (e) { console.error(e); }
    setTimeout(() => setSpinning(false), 800);
  }
  const sizes = { sm: { btn: 32, font: 11, ic: 14 }, md: { btn: 40, font: 13, ic: 18 }, lg: { btn: 56, font: 15, ic: 24 } };
  const sz = sizes[size] || sizes.md;
  return (
    <button onClick={handleClick} title="Rafraîchir"
      style={{ height: sz.btn, padding: `0 ${sz.btn/3}px`, borderRadius: sz.btn/2.5,
        background: `linear-gradient(135deg, ${color}25, ${color}10)`, color: "#fff",
        border: `1px solid ${color}50`, cursor: spinning ? "wait" : "pointer",
        fontSize: sz.font, fontWeight: 700, fontFamily: "Quicksand",
        display: "inline-flex", alignItems: "center", gap: 8 }}>
      <i className="ti ti-refresh" style={{ fontSize: sz.ic, color, filter: `drop-shadow(0 0 4px ${color})`,
        animation: spinning ? "av-spin-refresh 800ms ease-out" : "none" }} />
      {label}
      <style jsx global>{`@keyframes av-spin-refresh { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}

export function GlobalFiltersBar() {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState({ quickSearch: "", statut: "", urgence: "", period: "all" });

  useEffect(() => {
    function onKey(e) {
      if (e.key === "f" && !["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName) && !e.ctrlKey && !e.metaKey) {
        e.preventDefault(); setOpen(o => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function applyFilters() {
    window.dispatchEvent(new CustomEvent("av-global-filters-change", { detail: filters }));
    setOpen(false);
  }

  const inp = { width: "100%", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", color: "#fff", border: "1px solid rgba(255,255,255,.15)", fontFamily: "Quicksand", fontSize: 13, outline: "none" };

  return (
    <>
      <button onClick={() => setOpen(!open)} title="Filtres globaux (F)"
        style={{ position: "fixed", left: open ? 280 : 0, top: "50%", transform: "translateY(-50%)",
          width: 36, height: 80, background: "linear-gradient(135deg, #7CC8C8, #5a8f8f)", color: "#fff",
          border: "none", borderRadius: "0 14px 14px 0", cursor: "pointer", fontSize: 18,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
          boxShadow: "4px 0 16px rgba(0,0,0,.3)", zIndex: 8000, transition: "left 300ms cubic-bezier(.2,.8,.2,1)" }}>
        <i className={`ti ti-${open ? "chevron-left" : "filter"}`} />
        <span style={{ fontSize: 10, fontWeight: 700, writingMode: "vertical-rl", transform: "rotate(180deg)" }}>FILTRES</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(12,22,34,.30)", zIndex: 7999 }} />
          <aside style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 280,
            background: "linear-gradient(180deg, #0e1a2a, #142131)", borderRight: "1px solid #7CC8C840",
            padding: 18, zIndex: 8000, color: "#fff", fontFamily: "Quicksand",
            display: "flex", flexDirection: "column", gap: 14, overflowY: "auto",
            boxShadow: "8px 0 32px rgba(0,0,0,.4)" }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-filter" style={{ color: "#7CC8C8" }} /> Filtres globaux
            </h2>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>
              Touche <kbd style={{ background: "rgba(255,255,255,.08)", padding: "2px 6px", borderRadius: 4 }}>F</kbd> pour ouvrir/fermer
            </div>
            <input type="search" placeholder="Recherche globale..." value={filters.quickSearch}
              onChange={(e) => setFilters({ ...filters, quickSearch: e.target.value })} style={inp} />
            <select value={filters.statut} onChange={(e) => setFilters({ ...filters, statut: e.target.value })} style={inp}>
              <option value="">Tous statuts</option><option value="actif">Actif</option>
              <option value="termine">Terminé</option><option value="en_retard">En retard</option><option value="nouveau">Nouveau</option>
            </select>
            <select value={filters.urgence} onChange={(e) => setFilters({ ...filters, urgence: e.target.value })} style={inp}>
              <option value="">Toutes urgences</option><option value="critique">Critique</option>
              <option value="haute">Haute</option><option value="normale">Normale</option><option value="basse">Basse</option>
            </select>
            <select value={filters.period} onChange={(e) => setFilters({ ...filters, period: e.target.value })} style={inp}>
              <option value="all">Toute période</option><option value="today">Aujourd'hui</option>
              <option value="week">7 jours</option><option value="month">30 jours</option><option value="quarter">3 mois</option>
            </select>
            <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
              <button onClick={() => setFilters({ quickSearch: "", statut: "", urgence: "", period: "all" })}
                style={{ flex: 1, padding: 10, borderRadius: 10, background: "rgba(255,255,255,.08)", color: "#fff",
                  border: "1px solid rgba(255,255,255,.15)", fontFamily: "Quicksand", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                Réinitialiser
              </button>
              <button onClick={applyFilters} style={{ flex: 2, padding: 10, borderRadius: 10,
                background: "linear-gradient(135deg, #7CC8C8, #5a8f8f)", color: "#fff", border: "none",
                fontFamily: "Quicksand", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>
                <i className="ti ti-check" /> Appliquer
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
