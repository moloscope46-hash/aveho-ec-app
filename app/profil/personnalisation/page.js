"use client";
export const dynamic = "force-dynamic";
// =============================================================
//  /profil/personnalisation — Positionnement précis des boutons
//  Raccourcis app + Mode TV
// =============================================================
import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { PageShell, ModernCard, HiTechIconBox } from "../../components/ui-premium";

const COLOR = "#7a6fb0";

// Catalogue de boutons disponibles à placer
const BUTTONS_CATALOGUE = [
  { id: "dashboard",     lbl: "Tableau de bord",  ic: "ti-dashboard",          c: "#142131", url: "/" },
  { id: "patients",      lbl: "Patients",         ic: "ti-user-heart",         c: "#7a6fb0", url: "/patients" },
  { id: "carte",         lbl: "Carte",            ic: "ti-map",                c: "#5aa05a", url: "/carte-v2" },
  { id: "tournees",      lbl: "Tournées",         ic: "ti-route",              c: "#185FA5", url: "/tournees" },
  { id: "tournees_glob", lbl: "Tournées globales",ic: "ti-route-2",            c: "#185FA5", url: "/tournees-globales" },
  { id: "agenda",        lbl: "Agenda",           ic: "ti-calendar-event",     c: "#EF9F27", url: "/agenda" },
  { id: "interventions", lbl: "Demandes",         ic: "ti-clipboard-list",     c: "#D45E5E", url: "/interventions" },
  { id: "pharmacie",     lbl: "Pharmacie",        ic: "ti-pill",               c: "#5aa05a", url: "/pharmacie" },
  { id: "caisse",        lbl: "Caisse",           ic: "ti-cash-register",      c: "#EF9F27", url: "/pharmacie/caisse" },
  { id: "infirmieres",   lbl: "Infirmières",      ic: "ti-stethoscope",        c: "#C9867F", url: "/infirmieres" },
  { id: "bsi",           lbl: "BSI/DSI",          ic: "ti-clipboard-check",    c: "#C9867F", url: "/infirmieres/bsi" },
  { id: "services",      lbl: "Services",         ic: "ti-building-cottage",   c: "#7CC8C8", url: "/services" },
  { id: "materiel",      lbl: "Matériel",         ic: "ti-package",            c: "#7CC8C8", url: "/materiel" },
  { id: "stock",         lbl: "Stock",            ic: "ti-box",                c: "#185FA5", url: "/stock" },
  { id: "facturation",   lbl: "Facturation",      ic: "ti-receipt",            c: "#EF9F27", url: "/magasin/facturation" },
  { id: "voiture",       lbl: "Mode Voiture",     ic: "ti-car",                c: "#185FA5", url: "/voiture" },
  { id: "mode_tv",       lbl: "Mode TV",          ic: "ti-device-tv",          c: "#5e4a8c", url: "/presentation/tournees" },
  { id: "rgpd",          lbl: "RGPD",             ic: "ti-lock",               c: "#142131", url: "/rgpd" },
  { id: "rapports",      lbl: "Rapports",         ic: "ti-chart-bar",          c: "#5aa05a", url: "/stats" },
];

const POSITIONS_APP = ["top-left", "top-right", "fab", "menu-1", "menu-2", "menu-3", "sidebar"];
const POSITIONS_TV  = ["tv-top", "tv-bottom-left", "tv-bottom-right", "tv-sidebar"];

export default function PersonnalisationPage() {
  const auth = useAuth();
  const [layoutApp, setLayoutApp] = useState({});
  const [layoutTV, setLayoutTV] = useState({});
  const [activeTab, setActiveTab] = useState("app");

  useEffect(() => {
    try {
      setLayoutApp(JSON.parse(localStorage.getItem("av-layout-app") || "{}"));
      setLayoutTV(JSON.parse(localStorage.getItem("av-layout-tv") || "{}"));
    } catch {}
  }, []);

  function saveLayoutApp(next) {
    setLayoutApp(next);
    localStorage.setItem("av-layout-app", JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("av-layout-change", { detail: { which: "app" } }));
  }
  function saveLayoutTV(next) {
    setLayoutTV(next);
    localStorage.setItem("av-layout-tv", JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("av-layout-change", { detail: { which: "tv" } }));
  }

  function moveButton(btnId, position, isTV) {
    const layout = isTV ? layoutTV : layoutApp;
    const save = isTV ? saveLayoutTV : saveLayoutApp;
    const next = { ...layout };
    // Retirer le bouton de toutes les positions précédentes
    Object.keys(next).forEach(pos => {
      if (Array.isArray(next[pos])) next[pos] = next[pos].filter(b => b !== btnId);
    });
    // Ajouter à la nouvelle position
    if (position && position !== "none") {
      next[position] = [...(next[position] || []), btnId];
    }
    save(next);
  }

  function getButtonPosition(btnId, isTV) {
    const layout = isTV ? layoutTV : layoutApp;
    for (const [pos, list] of Object.entries(layout)) {
      if (Array.isArray(list) && list.includes(btnId)) return pos;
    }
    return null;
  }

  function resetLayout(isTV) {
    if (!confirm("Réinitialiser la disposition ?")) return;
    if (isTV) saveLayoutTV({}); else saveLayoutApp({});
  }

  const positions = activeTab === "app" ? POSITIONS_APP : POSITIONS_TV;

  return (
    <>
      <TopBar />
      <PageShell
        color={COLOR}
        icon="ti-layout-dashboard"
        title="Personnalisation"
        subtitle="Positionne tes boutons raccourcis dans l'app et le Mode TV"
        actions={
          <button onClick={() => resetLayout(activeTab === "tv")} style={btnDanger}>
            <i className="ti ti-refresh" /> Réinitialiser
          </button>
        }
      >
        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,.06)", paddingBottom: 12 }}>
          <Tab label="🖥 Application" active={activeTab === "app"} onClick={() => setActiveTab("app")} c={COLOR} />
          <Tab label="📺 Mode TV / Présentation" active={activeTab === "tv"} onClick={() => setActiveTab("tv")} c="#5e4a8c" />
        </div>

        {/* Aperçu des positions disponibles */}
        <ModernCard color={COLOR} icon="ti-info-circle" title="Positions disponibles" padding={14}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginTop: 10 }}>
            {positions.map(pos => {
              const ic = POS_ICONS[pos] || "ti-square";
              const count = (activeTab === "app" ? layoutApp : layoutTV)[pos]?.length || 0;
              return (
                <div key={pos} style={{ padding: 10, background: count > 0 ? `${COLOR}25` : "rgba(255,255,255,.04)", border: `1px solid ${count > 0 ? COLOR+"40" : "rgba(255,255,255,.08)"}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <i className={`ti ${ic}`} style={{ color: COLOR, fontSize: 18 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{POS_LABELS[pos] || pos}</div>
                    <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10 }}>{count} bouton{count > 1 ? "s" : ""}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </ModernCard>

        {/* Liste des boutons à positionner */}
        <h3 style={{ color: "#fff", marginTop: 20, marginBottom: 10, fontSize: 14, fontWeight: 800 }}>
          <i className="ti ti-grid-dots" /> Boutons à placer
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 10 }}>
          {BUTTONS_CATALOGUE.map(btn => {
            const current = getButtonPosition(btn.id, activeTab === "tv");
            return (
              <ModernCard key={btn.id} color={btn.c} padding={12} hoverable>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <HiTechIconBox name={btn.ic} color={btn.c} variant="gradient" size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{btn.lbl}</div>
                    <div style={{ color: "rgba(255,255,255,.4)", fontSize: 10, fontFamily: "monospace" }}>{btn.url}</div>
                  </div>
                  <select
                    value={current || "none"}
                    onChange={(e) => moveButton(btn.id, e.target.value, activeTab === "tv")}
                    style={{
                      padding: "6px 10px", borderRadius: 8,
                      background: current ? `${btn.c}25` : "rgba(255,255,255,.06)",
                      color: "#fff", border: `1px solid ${current ? btn.c+"50" : "rgba(255,255,255,.10)"}`,
                      fontFamily: "Quicksand", fontSize: 11, fontWeight: 700, cursor: "pointer", minWidth: 130,
                    }}
                  >
                    <option value="none">— Non placé —</option>
                    {positions.map(pos => <option key={pos} value={pos}>{POS_LABELS[pos] || pos}</option>)}
                  </select>
                </div>
              </ModernCard>
            );
          })}
        </div>
      </PageShell>
    </>
  );
}

const POS_LABELS = {
  "top-left":      "🔝 Haut gauche",
  "top-right":     "🔝 Haut droite",
  "fab":           "🟣 FAB flottant",
  "menu-1":        "📋 Menu (1)",
  "menu-2":        "📋 Menu (2)",
  "menu-3":        "📋 Menu (3)",
  "sidebar":       "📚 Sidebar",
  "tv-top":        "📺 TV haut",
  "tv-bottom-left":"📺 TV bas gauche",
  "tv-bottom-right":"📺 TV bas droite",
  "tv-sidebar":    "📺 TV sidebar",
};

const POS_ICONS = {
  "top-left": "ti-corner-up-left",
  "top-right": "ti-corner-up-right",
  "fab": "ti-circle-dot",
  "menu-1": "ti-menu",
  "menu-2": "ti-menu-2",
  "menu-3": "ti-menu-deep",
  "sidebar": "ti-layout-sidebar",
  "tv-top": "ti-square-arrow-up",
  "tv-bottom-left": "ti-square-arrow-left",
  "tv-bottom-right": "ti-square-arrow-right",
  "tv-sidebar": "ti-layout-sidebar-right",
};

function Tab({ label, active, onClick, c }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 16px", borderRadius: 10,
      background: active ? `linear-gradient(135deg, ${c}, ${c}cc)` : "rgba(255,255,255,.06)",
      color: active ? "#fff" : "rgba(255,255,255,.7)",
      border: `1px solid ${active ? c+"60" : "rgba(255,255,255,.10)"}`,
      fontFamily: "Quicksand", fontWeight: 700, fontSize: 12,
      cursor: "pointer", boxShadow: active ? `0 4px 12px ${c}40` : "none",
    }}>
      {label}
    </button>
  );
}

const btnDanger = {
  padding: "8px 14px", borderRadius: 8, background: "rgba(212,94,94,.15)", color: "#D45E5E",
  border: "1px solid rgba(212,94,94,.30)", fontFamily: "Quicksand", fontWeight: 700, fontSize: 12, cursor: "pointer",
};
