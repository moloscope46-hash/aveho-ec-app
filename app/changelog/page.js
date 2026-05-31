"use client";
// =============================================================
//  /changelog — Historique complet + recherche thématique
//  Alpha 0.52.3 — Téléchargement HTML + filtres par thème
// =============================================================
import { useState, useMemo } from "react";
import { useAuth } from "../../lib/useAuth";
import { useCart } from "../useCart";
import TopBar from "../TopBar";
import { PageHead, Panel } from "../ui";
import pkg from "../../package.json";
import { ALL_VERSIONS, THEME_LABELS } from "./versions-data";

const ICONS_BY_CODE = {
  Fix: { color: "#c0392b", label: "FIX" },
  "🆕": { color: "#5aa05a", label: "NEW" },
  "🎂": { color: "#7a6fb0", label: "BONUS" },
  "•": { color: "#6c7a89", label: "•" },
};

function getCodeMeta(code) {
  if (ICONS_BY_CODE[code]) return ICONS_BY_CODE[code];
  if (/^[A-Z]{1,2}$/.test(code)) return { color: "#185FA5", label: code };
  return { color: "#6c7a89", label: code };
}

function versionKey(s) {
  const parts = s.split(".").map(Number);
  while (parts.length < 3) parts.push(0);
  return parts;
}
function compareVersions(a, b) {
  const ka = versionKey(a);
  const kb = versionKey(b);
  for (let i = 0; i < 3; i++) {
    if (ka[i] !== kb[i]) return ka[i] - kb[i];
  }
  return 0;
}

export default function ChangelogPage() {
  const auth = useAuth();
  const cart = useCart();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedThemes, setSelectedThemes] = useState([]);  // multi-select
  const [expandedV, setExpandedV] = useState(null);  // version dont les détails sont ouverts

  // Stats sur les thèmes filtrés (dynamique)
  const themeCounts = useMemo(() => {
    const counts = {};
    ALL_VERSIONS.forEach(v => {
      (v.themes || []).forEach(t => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return counts;
  }, []);

  const filtered = useMemo(() => {
    let arr = [...ALL_VERSIONS];
    arr.sort((a, b) => compareVersions(b.v, a.v));
    
    if (filter === "version") arr = arr.filter(v => v.kind === "version");
    if (filter === "hotfix") arr = arr.filter(v => v.kind === "hotfix");
    
    // Filtre par thèmes (OR si plusieurs sélectionnés)
    if (selectedThemes.length > 0) {
      arr = arr.filter(v => 
        (v.themes || []).some(t => selectedThemes.includes(t))
      );
    }
    
    if (search.trim()) {
      const s = search.toLowerCase();
      arr = arr.filter(v => 
        v.titre.toLowerCase().includes(s) ||
        v.v.includes(s) ||
        v.chantiers.some(c => c.txt.toLowerCase().includes(s) || c.code.toLowerCase().includes(s)) ||
        (v.themes || []).some(t => (THEME_LABELS[t]?.lbl || t).toLowerCase().includes(s))
      );
    }
    
    return arr;
  }, [filter, search, selectedThemes]);

  const currentVersion = pkg.version.replace(/-alpha$/, "");
  const totalVersions = ALL_VERSIONS.filter(v => v.kind === "version").length;
  const totalHotfix = ALL_VERSIONS.filter(v => v.kind === "hotfix").length;

  function toggleTheme(t) {
    setSelectedThemes(prev => 
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  }

  function resetFilters() {
    setFilter("all");
    setSearch("");
    setSelectedThemes([]);
  }

  const hasActiveFilters = filter !== "all" || search.trim() || selectedThemes.length > 0;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="HISTORIQUE COMPLET"
          icon="ti-versions"
          title="Changelog"
          accent="Aveho EC"
          sub={`Version actuelle : ${pkg.version} · ${totalVersions} versions + ${totalHotfix} hotfix`}
        />

        {/* Stats KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
          <div style={{ background: "linear-gradient(135deg, #eef5fc 0%, #fff 100%)", border: "1px solid #bfd6f0", borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#185FA5" }}>{totalVersions}</div>
            <div style={{ fontSize: 11, color: "#6c7a89", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600 }}>Versions</div>
          </div>
          <div style={{ background: "linear-gradient(135deg, #fff8ec 0%, #fff 100%)", border: "1px solid #f0d59f", borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#EF9F27" }}>{totalHotfix}</div>
            <div style={{ fontSize: 11, color: "#6c7a89", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600 }}>Hotfix</div>
          </div>
          <div style={{ background: "linear-gradient(135deg, #eef9ef 0%, #fff 100%)", border: "1px solid #bfe2bf", borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#5aa05a" }}>{ALL_VERSIONS.length}</div>
            <div style={{ fontSize: 11, color: "#6c7a89", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600 }}>Total</div>
          </div>
        </div>

        {/* Barre filtres principale */}
        <Panel style={{ marginBottom: 10, padding: "12px 16px" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Rechercher (titre, version, chantier, thème…)"
              style={{ flex: 1, minWidth: 240, padding: "8px 14px", border: "1px solid #e3e9ee", borderRadius: 18, fontSize: 13, fontFamily: "inherit" }}
            />
            {[
              { v: "all", lbl: "Tout", n: ALL_VERSIONS.length, c: "#185FA5" },
              { v: "version", lbl: "Versions", n: totalVersions, c: "#185FA5" },
              { v: "hotfix", lbl: "Hotfix", n: totalHotfix, c: "#EF9F27" },
            ].map(f => (
              <button
                key={f.v}
                onClick={() => setFilter(f.v)}
                style={{
                  background: filter === f.v ? f.c : "#fff",
                  color: filter === f.v ? "#fff" : f.c,
                  border: `1px solid ${filter === f.v ? f.c : "#bfd6f0"}`,
                  padding: "5px 12px", borderRadius: 14,
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {f.lbl} <span style={{ opacity: .7, marginLeft: 2 }}>({f.n})</span>
              </button>
            ))}
            {hasActiveFilters && (
              <button onClick={resetFilters} style={{ background: "transparent", border: "none", color: "#c0392b", padding: "5px 8px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                <i className="ti ti-x" /> Réinitialiser
              </button>
            )}
          </div>

          {/* Thèmes (multi-select) */}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #e3e9ee" }}>
            <div className="chip-row">
              <span style={{ fontSize: 11, fontWeight: 700, color: "#6c7a89", textTransform: "uppercase", letterSpacing: ".5px", marginRight: 4 }}>
                <i className="ti ti-tags" /> Thèmes
              </span>
              {Object.entries(THEME_LABELS).map(([key, meta]) => {
                const count = themeCounts[key] || 0;
                if (count === 0) return null;
                const isSelected = selectedThemes.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleTheme(key)}
                    title={meta.lbl}
                    style={{
                      background: isSelected ? meta.color : meta.color + "12",
                      color: isSelected ? "#fff" : meta.color,
                      border: `1px solid ${isSelected ? meta.color : meta.color + "55"}`,
                      padding: "3px 10px", borderRadius: 12,
                      fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                      display: "inline-flex", alignItems: "center", gap: 4,
                    }}
                  >
                    <i className={`ti ${meta.icon}`} /> {meta.lbl}
                    <span style={{ opacity: .7, marginLeft: 2, fontSize: 10 }}>({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {hasActiveFilters && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#185FA5" }}>
              <b>{filtered.length}</b> résultat{filtered.length > 1 ? "s" : ""}
              {selectedThemes.length > 0 && (
                <span style={{ marginLeft: 6, color: "#8a98a8" }}>
                  · filtres thèmes : {selectedThemes.map(t => THEME_LABELS[t]?.lbl).join(", ")}
                </span>
              )}
            </div>
          )}
        </Panel>

        {/* Timeline */}
        <div style={{ position: "relative", paddingLeft: 26 }}>
          <div style={{ position: "absolute", left: 7, top: 8, bottom: 8, width: 2, background: "#e3e9ee" }} aria-hidden="true" />

          {filtered.length === 0 && (
            <Panel><div style={{ textAlign: "center", color: "#8a98a8", padding: 20 }}>Aucun résultat — essaie d'élargir tes filtres</div></Panel>
          )}

          {filtered.map((v) => {
            const isCurrent = currentVersion === v.v || (currentVersion + "-alpha") === v.v;
            const hotfix = v.kind === "hotfix";
            const color = isCurrent ? "#5aa05a" : hotfix ? "#EF9F27" : "#185FA5";
            const isExpanded = expandedV === v.v + v.kind;
            
            return (
              <div key={v.v + v.kind} style={{ position: "relative", marginBottom: 14, paddingBottom: 4 }}>
                <div style={{
                  position: "absolute", left: -23, top: 6,
                  width: 16, height: 16, borderRadius: "50%",
                  background: color, border: "3px solid #fff",
                  boxShadow: `0 0 0 1px ${color}44`,
                }} aria-hidden="true" />

                <div style={{ 
                  background: isCurrent ? "linear-gradient(135deg, #eef9ef 0%, #fff 100%)" : "#fff",
                  border: `1px solid ${isCurrent ? "#bfe2bf" : "#e3e9ee"}`,
                  borderLeft: `4px solid ${color}`,
                  borderRadius: 10, padding: "12px 16px",
                }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                    <h3 style={{ margin: 0, fontSize: 14.5, color: "#142131", fontWeight: 700, flex: 1, minWidth: 200 }}>
                      <span style={{ background: color, color: "#fff", padding: "2px 8px", borderRadius: 6, fontSize: 11.5, fontFamily: "Consolas, monospace", marginRight: 8, fontWeight: 700 }}>v{v.v}</span>
                      {v.titre}
                      {isCurrent && <span style={{ marginLeft: 8, fontSize: 10, color: "#2e6f33", background: "#cfeacb", padding: "2px 8px", borderRadius: 8, fontWeight: 700, letterSpacing: ".4px" }}>ACTUELLE</span>}
                      {hotfix && !isCurrent && <span style={{ marginLeft: 8, fontSize: 10, color: "#7a4f15", background: "#fcefda", padding: "2px 8px", borderRadius: 8, fontWeight: 700, letterSpacing: ".4px" }}>HOTFIX</span>}
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: "#8a98a8" }}>{v.date || "—"}</span>
                      {v.noteFile && (
                        <a 
                          href={`/changelog-notes/${v.noteFile}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          download
                          title={`Télécharger la note ${v.v}`}
                          style={{ 
                            display: "inline-flex", alignItems: "center", gap: 3,
                            background: "#fff", border: `1px solid ${color}55`,
                            color: color, padding: "3px 8px", borderRadius: 12,
                            fontSize: 11, fontWeight: 600, textDecoration: "none",
                          }}
                        >
                          <i className="ti ti-download" /> HTML
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Thèmes en chips */}
                  {(v.themes || []).length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                      {(v.themes || []).map(t => {
                        const tm = THEME_LABELS[t];
                        if (!tm) return null;
                        return (
                          <button
                            key={t}
                            onClick={() => toggleTheme(t)}
                            style={{
                              background: tm.color + "12",
                              color: tm.color,
                              border: `1px solid ${tm.color}33`,
                              padding: "1px 7px", borderRadius: 8,
                              fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                              display: "inline-flex", alignItems: "center", gap: 3,
                            }}
                            title={`Filtrer par : ${tm.lbl}`}
                          >
                            <i className={`ti ${tm.icon}`} style={{ fontSize: 11 }} /> {tm.lbl}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {v.chantiers.length > 0 && (
                    <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none" }}>
                      {(isExpanded ? v.chantiers : v.chantiers.slice(0, 5)).map((c, j) => {
                        const meta = getCodeMeta(c.code);
                        return (
                          <li key={j} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12.5, color: "#2a3a48", margin: "3px 0", lineHeight: 1.45 }}>
                            <span style={{ display: "inline-block", minWidth: 32, background: meta.color + "22", color: meta.color, fontSize: 10, fontWeight: 700, fontFamily: "Consolas, monospace", padding: "2px 6px", borderRadius: 4, textAlign: "center", flexShrink: 0 }}>{meta.label}</span>
                            <span>{c.txt}</span>
                          </li>
                        );
                      })}
                      {v.chantiers.length > 5 && (
                        <li>
                          <button 
                            onClick={() => setExpandedV(isExpanded ? null : v.v + v.kind)}
                            style={{ background: "transparent", border: "none", color: "#185FA5", fontSize: 11.5, fontWeight: 600, cursor: "pointer", padding: "4px 0", fontFamily: "inherit" }}
                          >
                            {isExpanded ? <><i className="ti ti-chevron-up" /> Voir moins</> : <><i className="ti ti-chevron-down" /> Voir les {v.chantiers.length - 5} autre{v.chantiers.length - 5 > 1 ? "s" : ""}</>}
                          </button>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <Panel style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "#8a98a8" }}>
          <p style={{ margin: 0 }}>
            <i className="ti ti-info-circle" aria-hidden="true" /> {ALL_VERSIONS.length} entrées · {Object.keys(THEME_LABELS).length} thèmes · Notes HTML téléchargeables
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 11 }}>
            <b style={{ color: "#5aa05a" }}>● Vert</b> = actuelle · <b style={{ color: "#EF9F27" }}>● Orange</b> = hotfix · <b style={{ color: "#185FA5" }}>● Bleu</b> = version majeure
          </p>
        </Panel>
      </div>
    </div>
  );
}
