"use client";
export const dynamic = "force-dynamic";
// =============================================================
//  /presentation — HUB Mode TV principal
//  Tuiles d'accès aux 9 modes TV avec icônes + descriptions
// =============================================================
import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const MODES_TV = [
  { p: "/presentation/tournees",      l: "Tournées du jour",    d: "Livraisons, étapes, chauffeurs",      ic: "ti-route",          c: "#7CC8C8" },
  { p: "/presentation/interventions", l: "Interventions / DI",  d: "Demandes urgentes, techniciens",      ic: "ti-tool",           c: "#D45E5E" },
  { p: "/presentation/planning",      l: "Planning équipes",    d: "Agenda, occupation, congés",          ic: "ti-calendar-week",  c: "#185FA5" },
  { p: "/presentation/livraisons",    l: "Livraisons planifiées",d: "Plan de tournée détaillé",          ic: "ti-truck-delivery", c: "#5e4a8c" },
  { p: "/presentation/dashboard",     l: "Dashboard global",    d: "KPIs, widgets, BI temps réel",        ic: "ti-dashboard",      c: "#EF9F27" },
  { p: "/presentation/stats",         l: "Statistiques",        d: "Analyses, courbes, comparatifs",      ic: "ti-chart-bar",      c: "#5aa05a" },
  { p: "/presentation/pharmacie",     l: "Pharmacie",           d: "Stock alertes, dispensations, stupéfiants", ic: "ti-pill",     c: "#5aa05a" },
  { p: "/presentation/carte-had",     l: "Carte HAD",           d: "Patients à domicile sur carte",       ic: "ti-map-pin-heart",  c: "#D45E5E" },
  { p: "/presentation/architecture",  l: "Architecture",        d: "Vue système, intégrations",           ic: "ti-sitemap",        c: "#7a6fb0" },
];

export default function PresentationHubPage() {
  return (
    <Suspense fallback={<div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#142131", color: "#bfe6e6", fontSize: 18 }}>Chargement…</div>}>
      <PresentationHub />
    </Suspense>
  );
}

function PresentationHub() {
  const router = useRouter();
  const [autoRotation, setAutoRotation] = useState(null);

  function lancerRotation(secs) {
    const params = MODES_TV.map(m => m.p.replace("/presentation/", "")).join(",");
    router.push(`/presentation/tournees?rotation=${secs}&liste=${params}`);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a1422 0%, #142131 50%, #1a2c44 100%)",
      color: "#fff",
      fontFamily: "Quicksand, sans-serif",
      padding: "40px 24px",
    }}>
      {/* Toolbar haut-droite */}
      <div style={{ position: "fixed", top: 14, right: 14, display: "flex", gap: 6, zIndex: 100 }}>
        <button onClick={() => router.push("/")} title="Retour à l'app" style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,.06)", color: "#fff", border: "1px solid rgba(255,255,255,.10)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
          <i className="ti ti-arrow-left" />
        </button>
        <button onClick={() => document.documentElement.requestFullscreen?.()} title="Plein écran" style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,.06)", color: "#fff", border: "1px solid rgba(255,255,255,.10)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
          <i className="ti ti-arrows-maximize" />
        </button>
      </div>

      {/* Header */}
      <div style={{ maxWidth: 1400, margin: "0 auto 40px", textAlign: "center" }}>
        <div style={{ width: 80, height: 80, margin: "0 auto 20px", borderRadius: 24, background: "linear-gradient(135deg, #185FA5, #5e4a8c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, boxShadow: "0 16px 40px rgba(94,74,140,.5)" }}>
          <i className="ti ti-device-tv" />
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 10px", letterSpacing: -0.5 }}>Mode TV - Hub principal</h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,.55)", margin: 0 }}>
          Choisis un écran à afficher · Toutes les vues sont en plein écran avec toolbar dédiée
        </p>
      </div>

      {/* Tuiles Mode TV */}
      <div style={{
        maxWidth: 1400, margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 20,
      }}>
        {MODES_TV.map(m => (
          <button key={m.p} onClick={() => router.push(m.p)} style={{
            padding: 24, borderRadius: 20,
            background: `linear-gradient(135deg, ${m.c}15, ${m.c}05)`,
            border: `1px solid ${m.c}40`,
            color: "#fff", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14,
            transition: "all 250ms",
            fontFamily: "Quicksand",
            textAlign: "left",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-6px)";
            e.currentTarget.style.background = `linear-gradient(135deg, ${m.c}30, ${m.c}10)`;
            e.currentTarget.style.boxShadow = `0 20px 40px ${m.c}40`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.background = `linear-gradient(135deg, ${m.c}15, ${m.c}05)`;
            e.currentTarget.style.boxShadow = "none";
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: `linear-gradient(135deg, ${m.c}, ${m.c}cc)`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36,
              boxShadow: `0 8px 24px ${m.c}60`,
            }}>
              <i className={`ti ${m.ic}`} />
            </div>
            <div style={{ width: "100%" }}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{m.l}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", lineHeight: 1.4 }}>{m.d}</div>
            </div>
            <div style={{ marginTop: "auto", padding: "6px 12px", borderRadius: 8, background: `${m.c}20`, color: m.c, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Ouvrir <i className="ti ti-arrow-right" />
            </div>
          </button>
        ))}
      </div>

      {/* Footer - rotation auto */}
      <div style={{ maxWidth: 1400, margin: "40px auto 0", padding: 20, borderRadius: 16, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #7a6fb0, #5e4a8c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
            <i className="ti ti-rotate-clockwise" />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Mode kiosque - Rotation automatique</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>Affiche les écrans en boucle pour panneaux d'affichage</div>
          </div>
          {[10, 30, 60, 120].map(s => (
            <button key={s} onClick={() => lancerRotation(s)} style={{
              padding: "8px 14px", borderRadius: 10,
              background: "linear-gradient(135deg, #7a6fb0, #5e4a8c)",
              color: "#fff", border: "none", fontFamily: "Quicksand",
              fontWeight: 700, fontSize: 12, cursor: "pointer",
            }}>{s}s</button>
          ))}
        </div>
      </div>
    </div>
  );
}
