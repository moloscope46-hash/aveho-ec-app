"use client";
// =============================================================
//  MagasinSidebar — Layout ERP avec menu latéral (0.62.70)
//  Refonte : sections repliables + burger mobile + animations premium
// =============================================================
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useViewMode } from "../../lib/useViewMode";
import { useAuth } from "../../lib/useAuth";
import { useMagasinContext } from "../../lib/useMagasinContext";
import { createClient } from "../../lib/supabase";

const MAG_NAV = [
  { section: "Tableau de bord", icon: "ti-dashboard", items: [
    { p: "/magasin", ic: "ti-dashboard", lbl: "Vue d'ensemble", col: "#5a8f8f" },
    { p: "/magasin/scan", ic: "ti-scan", lbl: "🔍 Scan magasin", col: "#185FA5" },
    { p: "/magasin/analytics-sav", ic: "ti-chart-bar", lbl: "Analytics SAV", col: "#7CC8C8" },
    { p: "/magasin/analytics-tournees", ic: "ti-chart-area-line", lbl: "Analytics Tournées", col: "#5aa05a" },
    { p: "/mobile/magasin", ic: "ti-device-mobile", lbl: "Vue mobile", col: "#7CC8C8" },
  ]},
  { section: "Stock & dépôts", icon: "ti-package", items: [
    { p: "/magasin/depots", ic: "ti-building-warehouse", lbl: "Dépôts clients", col: "#5a8f8f" },
    { p: "/magasin/inventaires", ic: "ti-clipboard-list", lbl: "Inventaires", col: "#EF9F27" },
  ]},
  { section: "Catalogue & Commerce", icon: "ti-shopping-bag", items: [
    { p: "/magasin/catalogue", ic: "ti-package", lbl: "Catalogue articles", col: "#5a8f8f" },
    { p: "/familles-articles", ic: "ti-categories", lbl: "Familles d'articles", col: "#185FA5" },
    { p: "/magasin/rattachements", ic: "ti-link", lbl: "Rattachements étab", col: "#185FA5" },
    { p: "/magasin/rattachements-perimetre", ic: "ti-link", lbl: "Périmètre intervention", col: "#7a6fb0" },
    { p: "/magasin/mercuriales", ic: "ti-file-text", lbl: "Mercuriales & marchés", col: "#7a6fb0" },
    { p: "/magasin/marketplace", ic: "ti-shopping-cart-plus", lbl: "Marketplace inter-magasins", col: "#EF9F27" },
    { p: "/magasin/pieces-marketplace", ic: "ti-tool", lbl: "Marketplace pièces", col: "#e35d5b" },
    { p: "/magasin/fournisseurs", ic: "ti-truck", lbl: "Fournisseurs", col: "#185FA5" },
    { p: "/magasin/receptions", ic: "ti-package-import", lbl: "Réceptions (BL+transferts+DI)", col: "#5aa05a" },
    { p: "/magasin/recyclage", ic: "ti-recycle", lbl: "Recyclage & valorisation", col: "#5aa05a" },
  ]},
  { section: "Flotte & livraisons", icon: "ti-truck", items: [
    { p: "/magasin/tournees", ic: "ti-route", lbl: "Tournées", col: "#185FA5" },
    { p: "/magasin/flotte", ic: "ti-truck", lbl: "Flotte véhicules", col: "#5aa05a" },
    { p: "/magasin/garages", ic: "ti-parking", lbl: "Garages", col: "#EF9F27" },
  ]},
  { section: "Demandes reçues", icon: "ti-mail", items: [
    { p: "/magasin?tab=di", ic: "ti-message-circle", lbl: "Demandes internes (DI)", col: "#185FA5" },
    { p: "/magasin?tab=sav", ic: "ti-tools", lbl: "SAV", col: "#e35d5b" },
    { p: "/magasin?tab=transferts", ic: "ti-arrows-exchange", lbl: "Transferts", col: "#7a6fb0" },
    { p: "/magasin/bilans-sav", ic: "ti-file-report", lbl: "Bilans SAV", col: "#7a6fb0" },
  ]},
  { section: "Configuration", icon: "ti-settings", items: [
    { p: "/magasin/etablissements", ic: "ti-building", lbl: "Mes établissements", col: "#185FA5" },
    { p: "/magasin/collaborateurs", ic: "ti-users", lbl: "Collaborateurs", col: "#7CC8C8" },
    { p: "/magasin/droits", ic: "ti-shield-lock", lbl: "Droits & permissions", col: "#7a6fb0" },
    { p: "/magasin/parametres", ic: "ti-settings", lbl: "Paramètres magasin", col: "#8a98a8" },
  ]},
  { section: "Mon espace", icon: "ti-user", items: [
    { p: "/magasin/profil", ic: "ti-user", lbl: "Mon profil", col: "#5a8f8f" },
  ]},
];

export default function MagasinSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const viewMode = useViewMode();
  const magasinCtx = useMagasinContext();
  const [counts, setCounts] = useState({ di: 0, sav: 0, transferts: 0, marketplace: 0 });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [burgerOpen, setBurgerOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setSidebarCollapsed(localStorage.getItem("av-mag-sidebar-collapsed") === "1");
      const cs = localStorage.getItem("av-mag-sections-collapsed");
      if (cs) setCollapsedSections(JSON.parse(cs));
    } catch {}
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setSidebarCollapsed(c => { const next = !c; try { localStorage.setItem("av-mag-sidebar-collapsed", next ? "1" : "0"); } catch {}; return next; });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!auth?.user || !viewMode.ready || !viewMode.isMagasin) return;
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      try {
        const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
        const [di, sav, tr] = await Promise.all([
          tryFetch(supabase.from("demandes_internes").select("id").in("statut", ["en_attente", "validee"])),
          tryFetch(supabase.from("signalements_materiels").select("id").eq("traite", false)),
          tryFetch(supabase.from("transferts").select("id").in("statut", ["en_attente", "valide"])),
        ]);
        if (cancelled) return;
        setCounts({ di: di.length, sav: sav.length, transferts: tr.length, marketplace: 0 });
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [auth?.user?.id, viewMode.ready, viewMode.isMagasin]);

  function toggleSection(name) {
    setCollapsedSections(prev => {
      const next = { ...prev, [name]: !prev[name] };
      try { localStorage.setItem("av-mag-sections-collapsed", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  if (!viewMode.ready) return null;
  if (!viewMode.isMagasin) return null;
  const collapsed = sidebarCollapsed;

  return (
    <>
      {/* Burger mobile */}
      <button onClick={() => setBurgerOpen(true)} className="magasin-burger-btn" style={{
        display: "none", position: "fixed", top: 70, left: 12, zIndex: 999,
        width: 42, height: 42, borderRadius: 10,
        background: "linear-gradient(135deg, #5a8f8f, #7CC8C8)", color: "#fff",
        border: "none", boxShadow: "0 4px 12px rgba(20,33,49,.25)",
        cursor: "pointer", fontSize: 20,
        alignItems: "center", justifyContent: "center",
      }}>
        <i className="ti ti-menu-2" />
      </button>
      {burgerOpen && (
        <div onClick={() => setBurgerOpen(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 998,
          animation: "av-fade-in 200ms",
        }} />
      )}

      <aside className={`magasin-sidebar-erp ${collapsed ? "collapsed" : ""} ${burgerOpen ? "burger-open" : ""}`} style={{
        width: collapsed ? 64 : 260, minHeight: "calc(100vh - 60px)",
        background: "linear-gradient(180deg, #142131, #0a141f)",
        borderRight: "1px solid rgba(94,143,143,.20)",
        padding: collapsed ? "16px 8px" : "16px 12px",
        position: "sticky", top: 60,
        overflowY: "auto",
        fontFamily: "Quicksand, sans-serif",
        flexShrink: 0,
        transition: "width 220ms cubic-bezier(0.4, 0, 0.2, 1), padding 220ms",
      }}>
        {/* Fermer mobile */}
        <button onClick={() => setBurgerOpen(false)} className="magasin-burger-close" style={{
          display: "none", position: "absolute", top: 12, left: 12,
          width: 30, height: 30, borderRadius: 8,
          background: "rgba(255,255,255,.1)", color: "#fff", border: "none",
          cursor: "pointer", fontSize: 16,
        }}>
          <i className="ti ti-x" />
        </button>

        {/* Toggle desktop */}
        <button onClick={() => setSidebarCollapsed(c => { const next = !c; try { localStorage.setItem("av-mag-sidebar-collapsed", next ? "1" : "0"); } catch {}; return next; })}
          title={collapsed ? "Déplier (Cmd+B)" : "Replier (Cmd+B)"}
          className="magasin-collapse-btn"
          style={{
            position: "absolute", top: 12, right: collapsed ? 12 : 8,
            width: 26, height: 26, borderRadius: 6,
            background: "rgba(255,255,255,.08)", color: "#a8d8d8",
            border: "1px solid rgba(255,255,255,.15)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, transition: "all 150ms", zIndex: 5,
          }}>
          <i className={`ti ti-${collapsed ? "chevron-right" : "chevron-left"}`} />
        </button>

        {/* Header magasin */}
        <div style={{
          padding: collapsed ? "10px 4px" : "12px 14px", borderRadius: 12,
          background: "linear-gradient(135deg, rgba(94,143,143,.15), rgba(124,200,200,.08))",
          border: "1px solid rgba(94,143,143,.30)",
          marginBottom: 14, marginTop: collapsed ? 36 : 0,
          textAlign: collapsed ? "center" : "left",
          boxShadow: "0 4px 12px rgba(94,143,143,.15)",
        }}>
          {collapsed ? (
            <div style={{ fontSize: 22 }}>🏬</div>
          ) : (
            <>
              <div style={{ fontSize: 10.5, color: "#a8d8d8", letterSpacing: 1.8, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>
                🏬 ESPACE MAGASIN
              </div>
              <div style={{ fontSize: 13, color: "#fff", fontWeight: 600, marginBottom: 6 }}>
                {magasinCtx.magasinNom || auth.user?.email?.split("@")[0]}
              </div>
              <button onClick={() => { viewMode.setMode("ec"); router.push("/collaborateurs"); }} style={{
                padding: "6px 10px",
                background: "rgba(255,255,255,.06)", color: "#fff",
                border: "1px solid rgba(255,255,255,.20)", borderRadius: 6,
                fontFamily: "inherit", fontSize: 10.5, fontWeight: 600, cursor: "pointer",
                width: "100%", transition: "all 200ms",
              }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,.12)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,.06)"}
                title="Repasser en vue EC">
                <i className="ti ti-switch" /> Repasser en EC
              </button>
            </>
          )}
        </div>

        {/* Sections collapsibles */}
        {MAG_NAV.map((sect) => {
          const sectCollapsed = collapsedSections[sect.section];
          return (
            <div key={sect.section} style={{ marginBottom: 8 }}>
              {!collapsed && (
                <button onClick={() => toggleSection(sect.section)} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  width: "100%", background: "transparent", border: "none",
                  color: "#a8d8d8", padding: "6px 8px",
                  fontSize: 9.8, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                  borderRadius: 4, transition: "background 150ms",
                }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,.04)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <i className={`ti ${sect.icon || "ti-folder"}`} style={{ fontSize: 12 }} />
                  <span style={{ flex: 1, textAlign: "left" }}>{sect.section}</span>
                  <i className={`ti ti-chevron-${sectCollapsed ? "right" : "down"}`} style={{ fontSize: 12, transition: "transform 200ms" }} />
                </button>
              )}
              {(!sectCollapsed || collapsed) && (
                <div style={{ overflow: "hidden" }}>
                  {sect.items.map(it => {
                    const isActive = pathname === it.p.split("?")[0];
                    let badge = null;
                    if (it.p === "/magasin?tab=di" && counts.di > 0) badge = counts.di;
                    else if (it.p === "/magasin?tab=sav" && counts.sav > 0) badge = counts.sav;
                    else if (it.p === "/magasin?tab=transferts" && counts.transferts > 0) badge = counts.transferts;
                    else if (it.p === "/magasin/marketplace" && counts.marketplace > 0) badge = counts.marketplace;
                    return (
                      <button key={it.p} onClick={() => { router.push(it.p); setBurgerOpen(false); }} title={collapsed ? it.lbl : undefined} style={{
                        display: "flex", alignItems: "center", gap: collapsed ? 0 : 10,
                        width: "100%", padding: collapsed ? "10px 0" : "8px 12px",
                        background: isActive ? "linear-gradient(90deg, rgba(94,143,143,.25), rgba(94,143,143,.10))" : "transparent",
                        color: isActive ? "#fff" : "#bfe6e6",
                        border: "none", borderRadius: 8,
                        fontFamily: "inherit", fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                        cursor: "pointer", textAlign: collapsed ? "center" : "left",
                        borderLeft: isActive ? `3px solid ${it.col}` : "3px solid transparent",
                        marginBottom: 2,
                        justifyContent: collapsed ? "center" : "flex-start",
                        position: "relative", transition: "all 180ms",
                      }}
                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,.04)"; }}
                        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                      >
                        <i className={`ti ${it.ic}`} style={{ color: it.col, fontSize: collapsed ? 18 : 16 }} />
                        {!collapsed && <span style={{ flex: 1 }}>{it.lbl}</span>}
                        {badge !== null && (
                          <span style={{
                            background: it.col, color: "#fff",
                            fontSize: 10, fontWeight: 700,
                            padding: "1px 6px", borderRadius: 8,
                            minWidth: 18, textAlign: "center",
                            position: collapsed ? "absolute" : "static",
                            top: collapsed ? 2 : undefined, right: collapsed ? 4 : undefined,
                            boxShadow: `0 2px 6px ${it.col}40`,
                          }}>{badge}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </aside>
    </>
  );
}
