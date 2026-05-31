"use client";
// =============================================================
//  /changelog — Historique complet + recherche thématique
//  Alpha 0.52.3 — Téléchargement HTML + filtres par thème
//  Alpha 0.55.11 — Tooltip hover : preview HTML de la note au survol
// =============================================================
import { useState, useMemo, useEffect, useRef } from "react";
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
  // 0.55.11 : hover preview de la note HTML
  const [hoverPreview, setHoverPreview] = useState(null); // {noteFile, x, y, html} ou null
  const noteCacheRef = useRef({}); // cache des HTML chargés
  const hoverTimeoutRef = useRef(null);
  // 0.55.14 : télécharger toutes les notes en ZIP
  const [zipBusy, setZipBusy] = useState(false);
  const [zipProgress, setZipProgress] = useState("");
  // 0.55.15 : modale d'affichage du SQL
  const [sqlModal, setSqlModal] = useState(null); // { version, file, content }
  const [sqlCopied, setSqlCopied] = useState(false);
  const sqlCacheRef = useRef({});

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

  // 0.55.11 — Hover preview de la note HTML
  // 0.55.14 — Cache miss retry + meilleur fallback
  async function fetchNoteHtml(noteFile) {
    if (noteCacheRef.current[noteFile]) return noteCacheRef.current[noteFile];
    try {
      const res = await fetch(`/changelog-notes/${noteFile}`, { cache: "force-cache" });
      if (!res.ok) {
        // Retry sans force-cache (au cas où le SW serve un 503 cacheable)
        const res2 = await fetch(`/changelog-notes/${noteFile}`, { cache: "no-cache" });
        if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
        const fullHtml = await res2.text();
        const scoped = scopeHtml(fullHtml);
        noteCacheRef.current[noteFile] = scoped;
        return scoped;
      }
      const fullHtml = await res.text();
      const scoped = scopeHtml(fullHtml);
      noteCacheRef.current[noteFile] = scoped;
      return scoped;
    } catch (e) {
      console.warn("[Changelog] preview load fail:", noteFile, e);
      // Fallback élégant — pas cacheé pour qu'on retente la fois suivante
      return `<div style="padding:24px;font-family:sans-serif;color:#7a4f15;background:#fff8ec">
        <p style="margin:0 0 8px"><b>⏳ Aperçu indisponible</b></p>
        <p style="margin:0;font-size:12px;color:#8a98a8">${noteFile}</p>
        <p style="margin:8px 0 0;font-size:12px">Réessaie le hover dans quelques secondes ou télécharge directement la note.</p>
      </div>`;
    }
  }

  // Helper : scope les styles du body de la note pour qu'ils ne fuient pas
  function scopeHtml(fullHtml) {
    const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const styleMatch = fullHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const body = bodyMatch ? bodyMatch[1] : fullHtml;
    const styles = styleMatch ? styleMatch[1] : "";
    return `<style>${styles.replace(/body\s*{/g, '.hover-note-scope {')}</style><div class="hover-note-scope">${body}</div>`;
  }

  function handleMouseEnter(e, noteFile) {
    if (!noteFile) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    const x = e.clientX;
    const y = e.clientY;
    // Délai 250ms avant fetch pour éviter de spammer
    hoverTimeoutRef.current = setTimeout(async () => {
      const html = await fetchNoteHtml(noteFile);
      setHoverPreview({ noteFile, x, y, html });
    }, 250);
  }

  function handleMouseMove(e) {
    if (!hoverPreview) return;
    setHoverPreview(p => p ? { ...p, x: e.clientX, y: e.clientY } : null);
  }

  function handleMouseLeave() {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoverPreview(null);
  }

  // 0.55.15 — fetch du contenu SQL quand on ouvre la modale
  useEffect(() => {
    if (!sqlModal || sqlModal.content) return;
    const { file } = sqlModal;
    if (sqlCacheRef.current[file]) {
      setSqlModal((m) => m ? { ...m, content: sqlCacheRef.current[file] } : null);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/changelog-sql/${file}`, { cache: "force-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const txt = await res.text();
        sqlCacheRef.current[file] = txt;
        setSqlModal((m) => m && m.file === file ? { ...m, content: txt } : m);
      } catch (e) {
        setSqlModal((m) => m && m.file === file ? { ...m, content: `-- Erreur de chargement\n-- ${e.message}` } : m);
      }
    })();
  }, [sqlModal?.file]);

  async function copySqlToClipboard() {
    if (!sqlModal?.content) return;
    try {
      await navigator.clipboard.writeText(sqlModal.content);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2000);
    } catch (e) {
      alert("Copie clipboard refusée. Utilisez Ctrl+A puis Ctrl+C dans la fenêtre.");
    }
  }

  // 0.55.15 — Escape pour fermer la modale SQL
  useEffect(() => {
    if (!sqlModal) return;
    function handleKey(e) {
      if (e.key === "Escape") setSqlModal(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [sqlModal]);

  // 0.55.14 — Télécharger toutes les notes HTML en un seul .zip
  async function downloadAllNotesZip() {
    if (zipBusy) return;
    setZipBusy(true);
    setZipProgress("Préparation…");
    try {
      // Dynamic import jszip (économise ~100KB initial)
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      const allNotes = ALL_VERSIONS.filter(v => v.noteFile);
      let count = 0;
      const total = allNotes.length;

      for (const v of allNotes) {
        setZipProgress(`${count}/${total}…`);
        try {
          const res = await fetch(`/changelog-notes/${v.noteFile}`);
          if (res.ok) {
            const txt = await res.text();
            zip.file(v.noteFile, txt);
            count++;
          } else {
            console.warn(`[Zip] ${v.noteFile} → HTTP ${res.status}`);
          }
        } catch (e) {
          console.warn(`[Zip] ${v.noteFile} fail:`, e);
        }
      }

      // Ajouter un INDEX.html qui liste toutes les notes
      const indexHtml = makeIndexHtml(allNotes);
      zip.file("INDEX.html", indexHtml);

      setZipProgress("Compression…");
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date().toISOString().slice(0, 10);
      a.download = `aveho-changelog-notes-${today}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setZipProgress(`✓ ${count} notes`);
      setTimeout(() => setZipProgress(""), 2000);
    } catch (e) {
      console.error("[Zip] erreur :", e);
      alert("Erreur lors de la création du zip : " + e.message);
      setZipProgress("");
    } finally {
      setZipBusy(false);
    }
  }

  // Helper : génère un index.html pour le zip
  function makeIndexHtml(notes) {
    const rows = notes.map(v => {
      const kindClass = v.kind === "hotfix" ? "hotfix" : "version";
      return `<tr class="${kindClass}">
        <td><a href="${v.noteFile}">v${v.v}</a></td>
        <td>${v.kind === "hotfix" ? "Hotfix" : "Version"}</td>
        <td>${v.date || "—"}</td>
        <td>${(v.titre || "").replace(/</g, "&lt;")}</td>
      </tr>`;
    }).join("\n");

    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>Aveho EC — Index des notes</title>
<style>
body{font-family:'Segoe UI',sans-serif;background:#f4f7fa;color:#2a3a48;margin:0;padding:0}
.wrap{max-width:1000px;margin:0 auto;padding:32px 24px}
header{background:linear-gradient(135deg,#142131,#185FA5);color:#fff;padding:32px 28px;border-radius:14px;margin-bottom:20px}
header h1{margin:0;font-size:22px}
header p{margin:6px 0 0;font-size:14px;opacity:.85}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.04)}
th{text-align:left;background:#f4f7fa;padding:10px 12px;font-size:12px;color:#142131;border-bottom:2px solid #e3e9ee}
td{padding:10px 12px;border-bottom:1px solid #e3e9ee;font-size:13px}
td a{color:#185FA5;font-weight:700;font-family:'Consolas',monospace;text-decoration:none}
td a:hover{text-decoration:underline}
tr.hotfix td:nth-child(2){color:#7a4f15;font-weight:600}
tr.version td:nth-child(2){color:#185FA5;font-weight:600}
footer{margin-top:18px;text-align:center;color:#8a98a8;font-size:12px}
</style></head>
<body>
<div class="wrap">
  <header>
    <h1>Aveho EC — Notes de version</h1>
    <p>Index des ${notes.length} notes publiées · Export du ${new Date().toLocaleDateString("fr-FR")}</p>
  </header>
  <table>
    <thead><tr><th>Version</th><th>Type</th><th>Date</th><th>Titre</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <footer>Cliquez sur une version pour ouvrir la note HTML correspondante.</footer>
</div>
</body></html>`;
  }

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
            {/* 0.55.14 : Télécharger toutes les notes en ZIP */}
            <button
              onClick={downloadAllNotesZip}
              disabled={zipBusy}
              title="Télécharger toutes les notes HTML en un seul .zip"
              style={{
                background: zipBusy ? "#8a98a8" : "linear-gradient(135deg, #142131, #185FA5)",
                color: "#fff",
                border: "none",
                padding: "5px 12px",
                borderRadius: 14,
                fontSize: 12,
                fontWeight: 600,
                cursor: zipBusy ? "wait" : "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                marginLeft: "auto",
              }}
            >
              {zipBusy ? (
                <><i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> {zipProgress}</>
              ) : (
                <><i className="ti ti-file-zip" /> Télécharger toutes les notes ({ALL_VERSIONS.filter(v => v.noteFile).length})</>
              )}
            </button>
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
                    <h3 
                      onMouseEnter={(e) => handleMouseEnter(e, v.noteFile)}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                      style={{ margin: 0, fontSize: 14.5, color: "#142131", fontWeight: 700, flex: 1, minWidth: 200, cursor: v.noteFile ? "help" : "default" }}
                    >
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
                      {/* 0.55.15 : bouton Requête SQL */}
                      {v.sqlFile && (
                        <button
                          onClick={() => setSqlModal({ version: v.v, file: v.sqlFile, content: null })}
                          title={`Voir la requête SQL ${v.v}`}
                          style={{ 
                            display: "inline-flex", alignItems: "center", gap: 3,
                            background: "#142131", border: "1px solid #142131",
                            color: "#7CC8C8", padding: "3px 8px", borderRadius: 12,
                            fontSize: 11, fontWeight: 600, cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          <i className="ti ti-database" /> SQL
                        </button>
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
                          <li 
                            key={j} 
                            onMouseEnter={(e) => handleMouseEnter(e, v.noteFile)}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                            style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12.5, color: "#2a3a48", margin: "3px 0", lineHeight: 1.45, cursor: v.noteFile ? "help" : "default", padding: "2px 4px", borderRadius: 4, transition: "background .15s" }}
                            onMouseOver={(e) => { if (v.noteFile) e.currentTarget.style.background = "#fef9ed"; }}
                            onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                          >
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

      {/* 0.55.11 — Popup hover preview de la note HTML */}
      {hoverPreview && (
        <div 
          style={{
            position: "fixed",
            // Positionnement : à droite du curseur si y a la place, sinon à gauche
            left: (typeof window !== "undefined" && hoverPreview.x + 480 < window.innerWidth) 
              ? hoverPreview.x + 18 
              : Math.max(10, hoverPreview.x - 478),
            top: (typeof window !== "undefined" && hoverPreview.y + 480 < window.innerHeight)
              ? hoverPreview.y + 14
              : Math.max(10, hoverPreview.y - 478),
            width: 460,
            maxHeight: 460,
            background: "#fff",
            border: "1px solid #d3d9e0",
            borderRadius: 10,
            boxShadow: "0 18px 50px rgba(20,33,49,.28)",
            overflow: "hidden",
            zIndex: 9999,
            pointerEvents: "none",  // ne bloque pas la souris
          }}
        >
          <div style={{
            background: "linear-gradient(90deg, #142131 0%, #185FA5 100%)",
            color: "#fff",
            padding: "6px 12px",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".5px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span><i className="ti ti-eye" /> APERÇU NOTE</span>
            <span style={{ fontFamily: "Consolas, monospace", opacity: 0.85 }}>{hoverPreview.noteFile}</span>
          </div>
          <div 
            style={{ 
              maxHeight: 430, 
              overflow: "auto",
              fontSize: 12,
            }}
            dangerouslySetInnerHTML={{ __html: hoverPreview.html }} 
          />
        </div>
      )}

      {/* 0.55.15 — Modale d'affichage du SQL d'une version */}
      {sqlModal && (
        <div
          onClick={(e) => e.target === e.currentTarget && setSqlModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20,33,49,.7)",
            zIndex: 9991,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 14px",
            animation: "fadeIn .15s",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 14,
              width: "100%",
              maxWidth: 920,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 30px 80px rgba(0,0,0,.45)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg, #142131 0%, #185FA5 100%)",
              color: "#fff",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}>
              <i className="ti ti-database" style={{ fontSize: 22, color: "#7CC8C8" }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#cfe4f5", fontWeight: 700 }}>
                  REQUÊTE SQL — VERSION {sqlModal.version}
                </div>
                <div style={{ fontSize: 13, fontFamily: "Consolas, monospace", marginTop: 2 }}>
                  {sqlModal.file}
                </div>
              </div>
              <button
                onClick={copySqlToClipboard}
                disabled={!sqlModal.content}
                title="Copier dans le presse-papier"
                style={{
                  background: sqlCopied ? "#5aa05a" : "#fff",
                  color: sqlCopied ? "#fff" : "#142131",
                  border: "none",
                  padding: "7px 14px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: sqlModal.content ? "pointer" : "wait",
                  fontFamily: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  minHeight: 36,
                }}
              >
                <i className={`ti ${sqlCopied ? "ti-check" : "ti-copy"}`} />
                {sqlCopied ? "Copié !" : "Copier"}
              </button>
              <a
                href={sqlModal.content ? `/changelog-sql/${sqlModal.file}` : "#"}
                download={sqlModal.file}
                title="Télécharger le fichier .sql"
                style={{
                  background: "#7CC8C8",
                  color: "#142131",
                  border: "none",
                  padding: "7px 14px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  minHeight: 36,
                }}
              >
                <i className="ti ti-download" /> Télécharger
              </a>
              <button
                onClick={() => setSqlModal(null)}
                title="Fermer"
                style={{
                  background: "transparent",
                  color: "#fff",
                  border: "none",
                  padding: 6,
                  cursor: "pointer",
                  fontSize: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i className="ti ti-x" />
              </button>
            </div>

            {/* Instructions */}
            <div style={{
              background: "#fff8ec",
              borderBottom: "1px solid #f0d59f",
              padding: "8px 18px",
              fontSize: 11.5,
              color: "#7a4f15",
              lineHeight: 1.5,
            }}>
              <i className="ti ti-info-circle" /> Coller dans <b>Supabase Dashboard → SQL Editor → Run</b>. Le patch est idempotent (peut être exécuté plusieurs fois sans risque).
            </div>

            {/* Contenu SQL */}
            <div style={{
              flex: 1,
              overflow: "auto",
              background: "#142131",
              padding: 0,
            }}>
              {!sqlModal.content ? (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 200,
                  color: "#7CC8C8",
                }}>
                  <i className="ti ti-loader-2" style={{ fontSize: 24, animation: "spin 1s linear infinite" }} />
                  <span style={{ marginLeft: 10, fontSize: 13 }}>Chargement…</span>
                </div>
              ) : (
                <pre style={{
                  margin: 0,
                  padding: "16px 20px",
                  color: "#e8edf2",
                  fontFamily: "Consolas, 'Menlo', monospace",
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  whiteSpace: "pre",
                  overflow: "auto",
                }}>
                  <code>{sqlModal.content}</code>
                </pre>
              )}
            </div>

            {/* Footer */}
            <div style={{
              background: "#f4f7fa",
              borderTop: "1px solid #e3e9ee",
              padding: "8px 18px",
              fontSize: 11,
              color: "#8a98a8",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}>
              <span>
                <i className="ti ti-file-text" /> {sqlModal.content ? `${sqlModal.content.split("\n").length} lignes · ${(sqlModal.content.length / 1024).toFixed(1)} Ko` : "—"}
              </span>
              <span>Échap pour fermer</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
