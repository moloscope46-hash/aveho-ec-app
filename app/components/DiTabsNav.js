"use client";
// =============================================================
//  components/DiTabsNav.js (0.62.90)
//
//  Navigation entre les onglets d'une DI avec grosses flèches
//  premium. À utiliser dans la fiche /demande-interne/[id].
//
//  Onglets : Infos · Planning · Livraison · Matériels · Articles · Nomenclature
//
//  Usage :
//    <DiTabsNav active={tab} onChange={setTab} counts={{materiels: 5, articles: 12}} />
// =============================================================

const TABS = [
  { key: "infos",        label: "Infos",        icon: "ti-info-circle",     color: "#185FA5" },
  { key: "planning",     label: "Planning",     icon: "ti-calendar-stats",  color: "#5e4a8c" },
  { key: "livraison",    label: "Livraison",    icon: "ti-truck-delivery",  color: "#C9867F" },
  { key: "materiels",    label: "Matériels",    icon: "ti-armchair-2",      color: "#142131" },
  { key: "articles",     label: "Articles",     icon: "ti-package",         color: "#7CC8C8" },
  { key: "nomenclature", label: "Nomenclature", icon: "ti-list-numbers",    color: "#EF9F27" },
  { key: "magasin",      label: "Magasin",      icon: "ti-building-warehouse", color: "#5a8f8f" },
];

export default function DiTabsNav({ active = "infos", onChange, counts = {} }) {
  const currentIdx = TABS.findIndex(t => t.key === active);
  const prev = TABS[currentIdx - 1];
  const next = TABS[currentIdx + 1];

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Grosses flèches navigation */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button
          className="av-big-arrow"
          onClick={() => prev && onChange(prev.key)}
          disabled={!prev}
          style={{
            flex: "0 0 auto", opacity: prev ? 1 : 0.3,
            cursor: prev ? "pointer" : "not-allowed",
          }}
          title={prev ? `Précédent : ${prev.label}` : "Premier onglet"}
        >
          <i className="ti ti-chevron-left" />
          {prev && <span style={{ fontSize: 11 }}>{prev.label}</span>}
        </button>

        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          background: `linear-gradient(135deg, ${TABS[currentIdx]?.color}, ${TABS[currentIdx]?.color}dd)`,
          color: "#fff", borderRadius: 14, padding: "12px 16px",
          fontFamily: "inherit", fontSize: 14, fontWeight: 700,
          minHeight: 56, gap: 10,
          boxShadow: `0 4px 12px ${TABS[currentIdx]?.color}40`,
        }}>
          <i className={`ti ${TABS[currentIdx]?.icon}`} style={{ fontSize: 22 }} />
          <span>{TABS[currentIdx]?.label}</span>
          {counts[active] !== undefined && (
            <span style={{
              background: "rgba(255,255,255,.25)",
              padding: "2px 10px", borderRadius: 12,
              fontSize: 12, fontWeight: 800,
              backdropFilter: "blur(6px)",
            }}>{counts[active]}</span>
          )}
        </div>

        <button
          className="av-big-arrow"
          onClick={() => next && onChange(next.key)}
          disabled={!next}
          style={{
            flex: "0 0 auto", opacity: next ? 1 : 0.3,
            cursor: next ? "pointer" : "not-allowed",
          }}
          title={next ? `Suivant : ${next.label}` : "Dernier onglet"}
        >
          {next && <span style={{ fontSize: 11 }}>{next.label}</span>}
          <i className="ti ti-chevron-right" />
        </button>
      </div>

      {/* Pills onglets pour accès direct (desktop only) */}
      <div className="di-tabs-pills" style={{
        display: "flex", gap: 6, flexWrap: "wrap",
        padding: 6,
        background: "linear-gradient(135deg, #fafbfc, #fff)",
        borderRadius: 12, border: "1px solid #eef1f4",
      }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => onChange(t.key)}
            style={{
              padding: "6px 12px",
              background: active === t.key
                ? `linear-gradient(135deg, ${t.color}, ${t.color}dd)`
                : "#fff",
              color: active === t.key ? "#fff" : "#5a6878",
              border: `1px solid ${active === t.key ? t.color : "#e3e9ee"}`,
              borderRadius: 8,
              fontFamily: "inherit", fontSize: 12, fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 5,
              transition: "all 200ms",
            }}>
            <i className={`ti ${t.icon}`} />
            <span>{t.label}</span>
            {counts[t.key] !== undefined && (
              <span style={{
                background: active === t.key ? "rgba(255,255,255,.25)" : t.color + "20",
                color: active === t.key ? "#fff" : t.color,
                padding: "1px 6px", borderRadius: 10,
                fontSize: 10, fontWeight: 800,
              }}>{counts[t.key]}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export { TABS as DI_TABS };
