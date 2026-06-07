"use client";
// =============================================================
//  MagasinSidebar — Layout ERP avec menu latéral pour mode Magasin (0.60.1)
// =============================================================
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useViewMode } from "../../lib/useViewMode";
import { useAuth } from "../../lib/useAuth";
import { useMagasinContext } from "../../lib/useMagasinContext";
import { createClient } from "../../lib/supabase";

const MAG_NAV = [
  { section: "Tableau de bord", items: [
    { p: "/magasin", ic: "ti-dashboard", lbl: "Vue d'ensemble", col: "#5a8f8f" },
    { p: "/magasin/scan", ic: "ti-scan", lbl: "🔍 Scan magasin", col: "#185FA5" },
    { p: "/magasin/analytics-sav", ic: "ti-chart-bar", lbl: "Analytics SAV", col: "#7CC8C8" },
    { p: "/mobile/magasin", ic: "ti-device-mobile", lbl: "Vue mobile", col: "#7CC8C8" },
  ]},
  { section: "Stock & dépôts", items: [
    { p: "/magasin/depots", ic: "ti-building-warehouse", lbl: "Dépôts clients", col: "#5a8f8f" },
    { p: "/magasin/inventaires", ic: "ti-clipboard-list", lbl: "Inventaires", col: "#EF9F27" },
  ]},
  // 0.61.4 : Catalogue + commerce
  { section: "Catalogue & Commerce", items: [
    { p: "/magasin/catalogue", ic: "ti-package", lbl: "Catalogue articles", col: "#5a8f8f" },
    { p: "/familles-articles", ic: "ti-categories", lbl: "Familles d'articles", col: "#185FA5" },
    { p: "/magasin/rattachements", ic: "ti-link", lbl: "Rattachements étab", col: "#185FA5" },
    { p: "/magasin/rattachements-perimetre", ic: "ti-link", lbl: "Périmètre intervention", col: "#7a6fb0" },
    { p: "/magasin/mercuriales", ic: "ti-file-text", lbl: "Mercuriales & marchés", col: "#7a6fb0" },
    { p: "/magasin/marketplace", ic: "ti-shopping-cart-plus", lbl: "Marketplace inter-magasins", col: "#EF9F27" },
    { p: "/magasin/pieces-marketplace", ic: "ti-tool", lbl: "Marketplace pièces détachées", col: "#e35d5b" },
    { p: "/magasin/fournisseurs", ic: "ti-truck", lbl: "Fournisseurs", col: "#185FA5" },
    { p: "/magasin/receptions", ic: "ti-package-import", lbl: "Réceptions (BL + transferts + DI)", col: "#5aa05a" },
    { p: "/magasin/recyclage", ic: "ti-recycle", lbl: "Recyclage & valorisation", col: "#5aa05a" },
  ]},
  // 0.61.3 : Flotte & livraisons
  { section: "Flotte & livraisons", items: [
    { p: "/magasin/flotte", ic: "ti-truck-delivery", lbl: "Flotte véhicules", col: "#185FA5" },
    { p: "/magasin/garages", ic: "ti-parking", lbl: "Garages magasin", col: "#7a6fb0" },
    { p: "/magasin/tournees", ic: "ti-route", lbl: "Tournées", col: "#7a6fb0" },
    { p: "/magasin/tournees/calendrier", ic: "ti-calendar", lbl: "Calendrier tournées", col: "#EF9F27" },
    { p: "/magasin/collaborateurs", ic: "ti-users", lbl: "Collaborateurs", col: "#5a8f8f" },
    { p: "/magasin/analytics-tournees", ic: "ti-chart-line", lbl: "Analytics tournées", col: "#5a8f8f" },
  ]},
  { section: "Catalogue & Articles", items: [
    { p: "/articles", ic: "ti-package", lbl: "Articles", col: "#185FA5" },
    { p: "/articles?new=1&magasin=1", ic: "ti-package-plus", lbl: "Nouvel article", col: "#5aa05a" },
  ]},
  { section: "Demandes reçues", items: [
    { p: "/magasin?tab=di", ic: "ti-truck-loading", lbl: "DI reçues", col: "#EF9F27" },
    { p: "/magasin?tab=sav", ic: "ti-tool", lbl: "SAV reçues", col: "#e35d5b" },
    { p: "/magasin?tab=transferts", ic: "ti-transfer", lbl: "Transferts", col: "#7a6fb0" },
    { p: "/magasin/etablissements", ic: "ti-building-hospital", lbl: "Mes EC clients", col: "#185FA5" },
    { p: "/magasin/etablissements/nouveau", ic: "ti-building-plus", lbl: "+ Nouvel EC client", col: "#5aa05a" },
  ]},
  { section: "Configuration", items: [
    { p: "/magasin/bilans-sav", ic: "ti-clipboard-check", lbl: "Bilans SAV", col: "#7CC8C8" },
    { p: "/magasin?tab=fournisseurs", ic: "ti-truck-delivery", lbl: "Partenaires", col: "#7a6fb0" },
    { p: "/magasin/droits", ic: "ti-shield-lock", lbl: "Droits EC", col: "#5e4a8c" },
  ]},
  // 0.60.2 : profil + paramètres dédiés magasin
  { section: "Mon espace", items: [
    { p: "/magasin/profil", ic: "ti-user-circle", lbl: "Mon profil", col: "#7CC8C8" },
    { p: "/magasin/parametres", ic: "ti-settings", lbl: "Paramètres", col: "#5a6878" },
  ]},
];

export function MagasinSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const viewMode = useViewMode();
  const auth = useAuth();
  // 0.62.6 : Compteurs DI/SAV/Transferts en attente
  const magasinCtx = useMagasinContext();
  const supabase = createClient();
  const [counts, setCounts] = useState({ di: 0, sav: 0, transferts: 0, marketplace: 0 });
  // 0.62.47 : sidebar collapsible persisté
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { setSidebarCollapsed(localStorage.getItem("av-mag-sidebar-collapsed") === "1"); } catch {}
    function onKey(e) {
      if (e.key === "b" && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setSidebarCollapsed(c => { const next = !c; try { localStorage.setItem("av-mag-sidebar-collapsed", next ? "1" : "0"); } catch {}; return next; });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!auth?.user || !viewMode.ready || !viewMode.isMagasin) return;
    let cancelled = false;
    (async () => {
      try {
        const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
        // DI/SAV en attente sur ce magasin
        let q = supabase.from("v_magasin_di").select("statut, type_demande");
        if (magasinCtx.magasinId) q = q.eq("magasin_id", magasinCtx.magasinId);
        const dis = await tryFetch(q);
        const pending = dis.filter(d => ["nouvelle", "en_attente", null, "draft"].includes(d.statut));
        // Marketplace : offres non répondues vers moi
        let mktQ = supabase.from("marketplace_offres").select("id").eq("statut", "active");
        if (magasinCtx.magasinId) mktQ = mktQ.neq("magasin_emetteur_id", magasinCtx.magasinId);
        const mkt = await tryFetch(mktQ);
        if (!cancelled) {
          setCounts({
            di: pending.filter(d => !d.type_demande || d.type_demande === "di").length,
            sav: pending.filter(d => d.type_demande === "sav").length,
            transferts: pending.filter(d => d.type_demande === "transfert").length,
            marketplace: mkt.length,
          });
        }
      } catch (e) { console.warn("[sidebar counts]", e); }
    })();
    return () => { cancelled = true; };
  }, [auth?.user, viewMode.ready, viewMode.isMagasin, magasinCtx.magasinId, pathname]);

  // 0.60.5 : ne rend rien tant que viewMode pas chargé (évite hydration mismatch React #418)
  if (!viewMode.ready) return null;
  // Visible uniquement en mode magasin
  if (!viewMode.isMagasin) return null;

  // 0.62.47 : sidebar collapsible (TODO depuis 0.58.31 !)
  const collapsed = sidebarCollapsed;

  return (
    <aside className={`magasin-sidebar-erp ${collapsed ? "collapsed" : ""}`} style={{
      width: collapsed ? 64 : 240, minHeight: "calc(100vh - 60px)",
      background: "linear-gradient(180deg, #142131, #0a141f)",
      borderRight: "1px solid rgba(94,143,143,.20)",
      padding: collapsed ? "16px 8px" : "16px 12px",
      position: "sticky", top: 60,
      overflowY: "auto",
      fontFamily: "Quicksand, sans-serif",
      flexShrink: 0,
      transition: "width 220ms cubic-bezier(0.4, 0, 0.2, 1), padding 220ms",
    }}>
      {/* Toggle button */}
      <button onClick={() => setSidebarCollapsed(c => { const next = !c; try { localStorage.setItem("av-mag-sidebar-collapsed", next ? "1" : "0"); } catch {}; return next; })}
        title={collapsed ? "Déplier (Cmd+B)" : "Replier (Cmd+B)"}
        style={{
          position: "absolute", top: 12, right: collapsed ? 12 : 8,
          width: 26, height: 26, borderRadius: 6,
          background: "rgba(255,255,255,.08)", color: "#a8d8d8",
          border: "1px solid rgba(255,255,255,.15)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, transition: "all 150ms",
          zIndex: 5,
        }}>
        <i className={`ti ti-${collapsed ? "chevron-right" : "chevron-left"}`} />
      </button>
      {/* Header magasin */}
      <div style={{
        padding: collapsed ? "8px 4px" : "10px 12px", borderRadius: 10,
        background: "rgba(94,143,143,.10)", border: "1px solid rgba(94,143,143,.30)",
        marginBottom: 14, marginTop: collapsed ? 36 : 0,
        textAlign: collapsed ? "center" : "left",
      }}>
        {collapsed ? (
          <div style={{ fontSize: 18 }}>🏬</div>
        ) : (
          <>
            <div style={{ fontSize: 11, color: "#a8d8d8", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>
              🏬 ESPACE MAGASIN
            </div>
            <div style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>
              {auth.user?.email?.split("@")[0]}
            </div>
            <button onClick={() => { viewMode.setMode("ec"); router.push("/collaborateurs"); }} style={{
              marginTop: 8, padding: "5px 8px",
              background: "rgba(255,255,255,.05)", color: "#fff",
              border: "1px solid rgba(255,255,255,.20)", borderRadius: 6,
              fontFamily: "inherit", fontSize: 10.5, fontWeight: 600, cursor: "pointer",
              width: "100%",
            }} title="Repasser en vue EC">
              <i className="ti ti-switch" /> Repasser en EC
            </button>
          </>
        )}
      </div>

      {/* Sections */}
      {MAG_NAV.map((sect, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          {!collapsed && (
            <div style={{ fontSize: 9.5, color: "#a8d8d8", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, padding: "0 8px 4px" }}>
              {sect.section}
            </div>
          )}
          {sect.items.map(it => {
            const isActive = pathname === it.p.split("?")[0];
            // 0.62.6 : compteur badge sur certains items
            let badge = null;
            if (it.p === "/magasin?tab=di" && counts.di > 0) badge = counts.di;
            else if (it.p === "/magasin?tab=sav" && counts.sav > 0) badge = counts.sav;
            else if (it.p === "/magasin?tab=transferts" && counts.transferts > 0) badge = counts.transferts;
            else if (it.p === "/magasin/marketplace" && counts.marketplace > 0) badge = counts.marketplace;
            return (
              <button key={it.p} onClick={() => router.push(it.p)} title={collapsed ? it.lbl : undefined} style={{
                display: "flex", alignItems: "center", gap: collapsed ? 0 : 10,
                width: "100%", padding: collapsed ? "10px 0" : "8px 12px",
                background: isActive ? "rgba(94,143,143,.18)" : "transparent",
                color: isActive ? "#fff" : "#bfe6e6",
                border: "none", borderRadius: 6,
                fontFamily: "inherit", fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                cursor: "pointer", textAlign: collapsed ? "center" : "left",
                borderLeft: isActive ? `3px solid ${it.col}` : "3px solid transparent",
                marginBottom: 2,
                justifyContent: collapsed ? "center" : "flex-start",
                position: "relative",
              }}>
                <i className={`ti ${it.ic}`} style={{ color: it.col, fontSize: collapsed ? 18 : 16 }} />
                {!collapsed && <span style={{ flex: 1 }}>{it.lbl}</span>}
                {badge !== null && (
                  <span style={{
                    background: it.col, color: "#fff",
                    fontSize: 10, fontWeight: 700,
                    padding: "1px 6px", borderRadius: 8,
                    minWidth: 18, textAlign: "center",
                    position: collapsed ? "absolute" : "static",
                    top: collapsed ? 2 : undefined,
                    right: collapsed ? 4 : undefined,
                  }}>{badge}</span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
