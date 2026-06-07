"use client";
// =============================================================
//  MagasinBottomNav — Navigation mobile en bas d'écran (0.61.2)
//  Affichée uniquement sur mobile + mode magasin
// =============================================================
import { useRouter, usePathname } from "next/navigation";
import { useViewMode } from "../../lib/useViewMode";

const ITEMS = [
  { p: "/mobile/magasin", ic: "ti-home", lbl: "Accueil", col: "#5a8f8f" },
  { p: "/magasin", ic: "ti-dashboard", lbl: "Vue d'ensemble", col: "#5a8f8f" },
  { p: "/scan/article", ic: "ti-scan", lbl: "Scan", col: "#7CC8C8" },
  { p: "/magasin/inventaires", ic: "ti-clipboard-list", lbl: "Inventaires", col: "#EF9F27" },
  { p: "/magasin/profil", ic: "ti-user-circle", lbl: "Profil", col: "#185FA5" },
];

export function MagasinBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const viewMode = useViewMode();

  // Affiché uniquement en mode magasin + sur mobile (CSS media query)
  if (!viewMode.ready || !viewMode.isMagasin) return null;

  return (
    <nav className="magasin-bottom-nav" style={{
      display: "none",  // overridé en CSS sur mobile
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
      background: "rgba(20, 33, 49, 0.95)",
      backdropFilter: "blur(12px)",
      borderTop: "1px solid rgba(124, 200, 200, 0.30)",
      padding: "6px 4px env(safe-area-inset-bottom, 6px)",
      boxShadow: "0 -4px 16px rgba(0,0,0,0.20)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-around" }}>
        {ITEMS.map(it => {
          const active = pathname === it.p || (it.p === "/mobile/magasin" && pathname?.startsWith("/mobile/magasin"));
          return (
            <button key={it.p} onClick={() => router.push(it.p)} style={{
              flex: 1, padding: "6px 4px",
              background: "transparent", border: "none",
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              position: "relative",
            }}>
              {active && <span style={{
                position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)",
                width: 28, height: 3, background: it.col, borderRadius: 2,
              }} />}
              <i className={`ti ${it.ic}`} style={{
                color: active ? it.col : "#bfe6e6", fontSize: 22,
                transition: "color 200ms",
              }} />
              <span style={{
                fontSize: 9.5, fontWeight: 700,
                color: active ? it.col : "#a8d8d8",
                letterSpacing: 0.2, textTransform: "uppercase",
              }}>{it.lbl}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
