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
    { p: "/magasin/rattachements", ic: "ti-link", lbl: "Rattachements étab", col: "#185FA5" },
    { p: "/magasin/rattachements-perimetre", ic: "ti-link", lbl: "Périmètre intervention", col: "#7a6fb0" },
    { p: "/magasin/mercuriales", ic: "ti-file-text", lbl: "Mercuriales & marchés", col: "#7a6fb0" },
    { p: "/magasin/marketplace", ic: "ti-shopping-cart-plus", lbl: "Marketplace inter-magasins", col: "#EF9F27" },
  ]},
  // 0.61.3 : Flotte & livraisons
  { section: "Flotte & livraisons", items: [
    { p: "/magasin/flotte", ic: "ti-truck-delivery", lbl: "Flotte véhicules", col: "#185FA5" },
    { p: "/magasin/tournees", ic: "ti-route", lbl: "Tournées", col: "#7a6fb0" },
    { p: "/magasin/tournees/calendrier", ic: "ti-calendar", lbl: "Calendrier tournées", col: "#EF9F27" },
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

  return (
    <aside className="magasin-sidebar-erp" style={{
      width: 240, minHeight: "calc(100vh - 60px)",
      background: "linear-gradient(180deg, #142131, #0a141f)",
      borderRight: "1px solid rgba(94,143,143,.20)",
      padding: "16px 12px",
      position: "sticky", top: 60,
      overflowY: "auto",
      fontFamily: "Quicksand, sans-serif",
      flexShrink: 0,
    }}>
      {/* Header magasin */}
      <div style={{
        padding: "10px 12px", borderRadius: 10,
        background: "rgba(94,143,143,.10)", border: "1px solid rgba(94,143,143,.30)",
        marginBottom: 14,
      }}>
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
      </div>

      {/* Sections */}
      {MAG_NAV.map((sect, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9.5, color: "#a8d8d8", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, padding: "0 8px 4px" }}>
            {sect.section}
          </div>
          {sect.items.map(it => {
            const isActive = pathname === it.p.split("?")[0];
            // 0.62.6 : compteur badge sur certains items
            let badge = null;
            if (it.p === "/magasin?tab=di" && counts.di > 0) badge = counts.di;
            else if (it.p === "/magasin?tab=sav" && counts.sav > 0) badge = counts.sav;
            else if (it.p === "/magasin?tab=transferts" && counts.transferts > 0) badge = counts.transferts;
            else if (it.p === "/magasin/marketplace" && counts.marketplace > 0) badge = counts.marketplace;
            return (
              <button key={it.p} onClick={() => router.push(it.p)} style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "8px 12px",
                background: isActive ? "rgba(94,143,143,.18)" : "transparent",
                color: isActive ? "#fff" : "#bfe6e6",
                border: "none", borderRadius: 6,
                fontFamily: "inherit", fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                cursor: "pointer", textAlign: "left",
                borderLeft: isActive ? `3px solid ${it.col}` : "3px solid transparent",
                marginBottom: 2,
              }}>
                <i className={`ti ${it.ic}`} style={{ color: it.col, fontSize: 16 }} />
                <span style={{ flex: 1 }}>{it.lbl}</span>
                {badge !== null && (
                  <span style={{
                    background: it.col, color: "#fff",
                    fontSize: 10, fontWeight: 700,
                    padding: "1px 6px", borderRadius: 8,
                    minWidth: 18, textAlign: "center",
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
