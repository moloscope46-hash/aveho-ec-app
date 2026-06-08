"use client";
// =============================================================
//  components/DashboardActions.js (0.65.0)
//
//  - Bouton Export PDF custom (modal sélection widgets + format)
//  - Bouton Mode présentation (overlay grand format des widgets BI)
// =============================================================

import { useState, useEffect } from "react";
import { ALL_WIDGETS as WIDGETS_AVAILABLE, getDashboardLayout as getLayout, setDashboardLayout as saveLayout } from "../../lib/dashboardLayout";

export default function DashboardActions() {
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // 0.65.0 : Export custom — sélection widgets + format
  const [exportFormat, setExportFormat] = useState("A4-portrait");
  const [exportSelected, setExportSelected] = useState({});
  const [exportTitle, setExportTitle] = useState("");

  function openExportModal() {
    // Pré-cocher les widgets actuellement actifs
    const layout = getLayout();
    const active = {};
    Object.entries(layout.active || {}).forEach(([k, v]) => { if (v) active[k] = true; });
    setExportSelected(active);
    setExportTitle("Dashboard Aveho — " + new Date().toLocaleDateString("fr-FR"));
    setExportOpen(true);
  }

  function exportPDF() {
    // Format CSS @page selon choix
    const fmtMap = {
      "A4-portrait": "A4 portrait",
      "A4-paysage": "A4 landscape",
      "A3-portrait": "A3 portrait",
      "A3-paysage": "A3 landscape",
    };
    const cssSize = fmtMap[exportFormat] || "A4 portrait";

    // Style @page dynamique
    let styleEl = document.getElementById("av-pdf-page-style");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "av-pdf-page-style";
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `@page { size: ${cssSize}; margin: 12mm; }`;

    // Sauvegarde temporaire du layout actuel
    const prevLayout = getLayout();
    // Appliquer la sélection custom
    const customActive = { ...exportSelected };
    saveLayout({ active: customActive, order: prevLayout.order });

    // Header dans body via data-attr (CSS @page peut utiliser)
    if (exportTitle) document.body.setAttribute("data-pdf-title", exportTitle);

    document.body.classList.add("av-pdf-export");

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove("av-pdf-export");
        document.body.removeAttribute("data-pdf-title");
        // Restaurer le layout précédent
        saveLayout(prevLayout);
      }, 500);
    }, 250);

    setExportOpen(false);
  }

  function legacyExportPDF() {
    document.body.classList.add("av-pdf-export");
    setTimeout(() => {
      window.print();
      setTimeout(() => document.body.classList.remove("av-pdf-export"), 500);
    }, 200);
  }

  return (
    <>
      <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
        <button onClick={openExportModal}
          className="av-no-print"
          title="Exporter le dashboard en PDF (sélection widgets + format)"
          style={{
            padding: "6px 12px",
            background: "rgba(227, 93, 91, .12)",
            color: "#c0392b",
            border: "1px solid rgba(227, 93, 91, .3)",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "inherit",
            fontWeight: 700,
            display: "inline-flex", alignItems: "center", gap: 4,
          }}>
          <i className="ti ti-file-type-pdf" /> Export PDF
        </button>
        <button onClick={() => setPresentationOpen(true)}
          className="av-no-print"
          title="Mode présentation grand format"
          style={{
            padding: "6px 12px",
            background: "linear-gradient(135deg, rgba(122, 111, 176, .15), rgba(122, 111, 176, .05))",
            color: "#5e4a8c",
            border: "1px solid rgba(122, 111, 176, .3)",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "inherit",
            fontWeight: 700,
            display: "inline-flex", alignItems: "center", gap: 4,
          }}>
          <i className="ti ti-maximize" /> Présentation
        </button>
      </div>

      {presentationOpen && <PresentationMode onClose={() => setPresentationOpen(false)} />}

      {/* CSS print pour export PDF propre */}
      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .av-no-print,
          .topbar,
          .av-floating-action-bar,
          .av-rolebadge-icon,
          .install-pwa,
          .notif-bell-enhanced,
          button[onclick*="setPersonalize"] { display: none !important; }
          .bg-dark { background: #fff !important; }
          .wrap { max-width: 100% !important; padding: 0 !important; }
          .av-panel, .panel { box-shadow: none !important; border: 1px solid #cfd8e0 !important; page-break-inside: avoid; }
        }
        body.av-pdf-export .av-no-print { display: none !important; }
      `}</style>

      {/* 0.65.0 : Modal export PDF custom */}
      {exportOpen && (
        <ExportModal
          format={exportFormat}
          setFormat={setExportFormat}
          selected={exportSelected}
          setSelected={setExportSelected}
          title={exportTitle}
          setTitle={setExportTitle}
          onClose={() => setExportOpen(false)}
          onExport={exportPDF}
        />
      )}
    </>
  );
}

// =============================================================
//  ExportModal (0.65.0) — sélection widgets + format
// =============================================================
function ExportModal({ format, setFormat, selected, setSelected, title, setTitle, onClose, onExport }) {
  const FORMATS = [
    { v: "A4-portrait", l: "A4 Portrait",  ic: "ti-file-text" },
    { v: "A4-paysage",  l: "A4 Paysage",   ic: "ti-rectangle" },
    { v: "A3-portrait", l: "A3 Portrait",  ic: "ti-file-text" },
    { v: "A3-paysage",  l: "A3 Paysage",   ic: "ti-rectangle" },
  ];

  const widgets = WIDGETS_AVAILABLE.filter(w => !["atraiter", "kpis", "raccourcis", "dernieres", "notifs"].includes(w.id));

  const nbSelected = Object.values(selected).filter(Boolean).length;

  // 0.65.5 : Lock scroll body + scroll en haut quand modal ouvert
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevScroll = window.scrollY;
    document.body.style.overflow = "hidden";
    // Scroll en haut au moment de l'ouverture pour s'assurer que le modal est visible
    window.scrollTo({ top: 0, behavior: "instant" });
    return () => {
      document.body.style.overflow = prevOverflow;
      window.scrollTo({ top: prevScroll, behavior: "instant" });
    };
  }, []);

  function toggleAll(val) {
    const next = {};
    widgets.forEach(w => { next[w.id] = val; });
    ["atraiter", "kpis", "raccourcis"].forEach(k => { next[k] = true; });
    setSelected(next);
  }

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(20,33,49,.7)",
        backdropFilter: "blur(6px)",
        zIndex: 999999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "5vh 20px",
        overflowY: "auto",
      }}>
      <div style={{
        background: "#fff", borderRadius: 14, padding: 0,
        maxWidth: 720, width: "100%", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 30px 80px rgba(0,0,0,.4)",
        fontFamily: "Quicksand, sans-serif",
        margin: "auto",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 18px", background: "linear-gradient(135deg, #185FA5, #7CC8C8)", color: "#fff", borderRadius: "14px 14px 0 0", display: "flex", alignItems: "center", gap: 10 }}>
          <i className="ti ti-file-export" style={{ fontSize: 22 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Export PDF personnalisé</div>
            <div style={{ fontSize: 11.5, opacity: 0.9, marginTop: 2 }}>Choisis les widgets et le format</div>
          </div>
          <button onClick={onClose}
            style={{ background: "rgba(255,255,255,.15)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontFamily: "inherit", fontSize: 16 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div style={{ padding: 18 }}>
          {/* Titre */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: "#5a6878", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, display: "block", marginBottom: 4 }}>
              <i className="ti ti-letter-t" /> Titre du document
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Dashboard Aveho - juin 2026"
              style={{
                width: "100%", padding: "8px 12px",
                border: "1.5px solid #e3e9ee", borderRadius: 8,
                fontSize: 13, fontFamily: "inherit",
              }} />
          </div>

          {/* Format */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: "#5a6878", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, display: "block", marginBottom: 6 }}>
              <i className="ti ti-aspect-ratio" /> Format de page
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {FORMATS.map(f => (
                <button key={f.v} onClick={() => setFormat(f.v)}
                  style={{
                    padding: "10px 8px",
                    background: format === f.v ? "linear-gradient(135deg, #185FA5, #7CC8C8)" : "#fafbfc",
                    color: format === f.v ? "#fff" : "#5a6878",
                    border: `1.5px solid ${format === f.v ? "transparent" : "#e3e9ee"}`,
                    borderRadius: 8, cursor: "pointer",
                    fontFamily: "inherit", fontSize: 11.5, fontWeight: 700,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  }}>
                  <i className={`ti ${f.ic}`} style={{ fontSize: 18 }} />
                  {f.l}
                </button>
              ))}
            </div>
          </div>

          {/* Widgets sélection */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 11, color: "#5a6878", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>
                <i className="ti ti-checkbox" /> Widgets à inclure ({nbSelected})
              </label>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => toggleAll(true)}
                  style={{ padding: "3px 9px", background: "rgba(90,160,90,.15)", color: "#5aa05a", border: "1px solid #5aa05a55", borderRadius: 6, cursor: "pointer", fontSize: 10.5, fontWeight: 700, fontFamily: "inherit" }}>
                  Tout
                </button>
                <button onClick={() => toggleAll(false)}
                  style={{ padding: "3px 9px", background: "rgba(227,93,91,.15)", color: "#e35d5b", border: "1px solid #e35d5b55", borderRadius: 6, cursor: "pointer", fontSize: 10.5, fontWeight: 700, fontFamily: "inherit" }}>
                  Aucun
                </button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, maxHeight: 280, overflowY: "auto", padding: 5, background: "#fafbfc", borderRadius: 8, border: "1px solid #e3e9ee" }}>
              {widgets.map(w => {
                const on = !!selected[w.id];
                return (
                  <label key={w.id} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 9px",
                    background: on ? "#fff" : "transparent",
                    border: `1.5px solid ${on ? w.color + "55" : "transparent"}`,
                    borderRadius: 6, cursor: "pointer",
                    fontSize: 12, color: "#142131",
                  }}>
                    <input type="checkbox" checked={on}
                      onChange={() => setSelected(prev => ({ ...prev, [w.id]: !on }))}
                      style={{ accentColor: w.color, cursor: "pointer" }} />
                    <i className={`ti ${w.icon}`} style={{ color: w.color, fontSize: 14 }} />
                    <span style={{ flex: 1, fontSize: 11.5, fontWeight: on ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: "12px 18px", borderTop: "1px solid #e3e9ee", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose}
            style={{ padding: "8px 16px", background: "#fafbfc", color: "#5a6878", border: "1.5px solid #e3e9ee", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>
            Annuler
          </button>
          <button onClick={onExport} disabled={nbSelected === 0}
            style={{
              padding: "8px 18px",
              background: nbSelected === 0 ? "#cfd8e0" : "linear-gradient(135deg, #185FA5, #7CC8C8)",
              color: "#fff", border: "none", borderRadius: 8,
              cursor: nbSelected === 0 ? "not-allowed" : "pointer",
              fontFamily: "inherit", fontSize: 13, fontWeight: 700,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
            <i className="ti ti-printer" /> Générer le PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Mode présentation : carousel widgets BI en grand format
// =============================================================
function PresentationMode({ onClose }) {
  const [idx, setIdx] = useState(0);
  const [auto, setAuto] = useState(true);

  // Liste des widgets BI à présenter
  const widgets = [
    { k: "top-sav", l: "Top 5 matériels SAV", comp: "TopMaterielsSAVWidget" },
    { k: "activite-semaine", l: "Activité 7 jours", comp: "ActiviteSemaineWidget" },
    { k: "top-collab", l: "Top 5 collaborateurs", comp: "TopCollaborateursWidget" },
    { k: "temps-moyen", l: "Temps moyen résolution", comp: "TempsMoyenResolutionWidget" },
    { k: "sla-respect", l: "SLA respect", comp: "SLARespectWidget" },
    { k: "charge-equipes", l: "Charge équipes", comp: "ChargeEquipesWidget" },
    { k: "top-patients", l: "Top 5 patients", comp: "TopPatientsWidget" },
    { k: "top-fournisseurs", l: "Top 5 fournisseurs", comp: "TopFournisseursWidget" },
    { k: "taux-panne", l: "Taux de panne par catégorie", comp: "TauxPanneCategorieWidget" },
  ];

  // Auto-cycle toutes les 8s
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => {
      setIdx(i => (i + 1) % widgets.length);
    }, 8000);
    return () => clearInterval(t);
  }, [auto, widgets.length]);

  // Esc pour fermer + arrows pour naviguer
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setIdx(i => (i + 1) % widgets.length);
      else if (e.key === "ArrowLeft") setIdx(i => (i - 1 + widgets.length) % widgets.length);
      else if (e.key === " ") { e.preventDefault(); setAuto(a => !a); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, widgets.length]);

  const current = widgets[idx];
  const [WidgetComp, setWidgetComp] = useState(null);

  // Charge dynamiquement le composant widget
  useEffect(() => {
    let alive = true;
    import("./DashboardWidgets").then(mod => {
      if (alive) setWidgetComp(() => mod[current.comp]);
    });
    return () => { alive = false; };
  }, [current.comp]);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "linear-gradient(135deg, #142131, #1c2e44)",
      zIndex: 9999,
      display: "flex", flexDirection: "column",
      animation: "av-fade-in 300ms",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 24px",
        borderBottom: "1px solid rgba(255,255,255,.08)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <i className="ti ti-presentation" style={{ fontSize: 24, color: "#7CC8C8" }} />
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>Mode présentation</div>
          <div style={{ color: "#8a98a8", fontSize: 12 }}>
            {current.l} · {idx + 1}/{widgets.length} · {auto ? "Auto-cycle 8s" : "Pause"} · Esc pour fermer
          </div>
        </div>
        <button onClick={() => setAuto(a => !a)}
          style={{
            padding: "6px 12px",
            background: auto ? "rgba(124, 200, 200, .15)" : "rgba(239, 159, 39, .15)",
            color: auto ? "#7CC8C8" : "#EF9F27",
            border: `1px solid ${auto ? "rgba(124, 200, 200, .35)" : "rgba(239, 159, 39, .35)"}`,
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "inherit",
            fontWeight: 700,
          }}>
          <i className={`ti ti-${auto ? "player-pause" : "player-play"}`} /> {auto ? "Pause" : "Reprendre"}
        </button>
        <button onClick={onClose}
          style={{
            padding: "6px 12px",
            background: "rgba(227, 93, 91, .15)",
            color: "#fff",
            border: "1px solid rgba(227, 93, 91, .35)",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "inherit",
            fontWeight: 700,
          }}>
          <i className="ti ti-x" /> Fermer (Esc)
        </button>
      </div>

      {/* Widget grand format */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 30 }}>
        <div style={{
          width: "100%", maxWidth: 800,
          transform: "scale(1.8)",
          transformOrigin: "center",
        }}>
          {WidgetComp ? <WidgetComp /> : <div style={{ color: "#fff", textAlign: "center" }}>Chargement…</div>}
        </div>
      </div>

      {/* Footer navigation */}
      <div style={{
        padding: "16px 24px",
        borderTop: "1px solid rgba(255,255,255,.08)",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
      }}>
        <button onClick={() => setIdx(i => (i - 1 + widgets.length) % widgets.length)}
          style={{
            padding: "10px 16px",
            background: "rgba(255,255,255,.08)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,.15)",
            borderRadius: 10,
            cursor: "pointer",
            fontSize: 14,
            fontFamily: "inherit",
          }}>
          <i className="ti ti-chevron-left" /> Précédent
        </button>
        <div style={{ display: "flex", gap: 4 }}>
          {widgets.map((w, i) => (
            <button key={w.k} onClick={() => setIdx(i)}
              style={{
                width: idx === i ? 28 : 8, height: 8,
                background: idx === i ? "#7CC8C8" : "rgba(255,255,255,.2)",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                transition: "all 200ms",
              }} />
          ))}
        </div>
        <button onClick={() => setIdx(i => (i + 1) % widgets.length)}
          style={{
            padding: "10px 16px",
            background: "rgba(255,255,255,.08)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,.15)",
            borderRadius: 10,
            cursor: "pointer",
            fontSize: 14,
            fontFamily: "inherit",
          }}>
          Suivant <i className="ti ti-chevron-right" />
        </button>
      </div>
    </div>
  );
}
