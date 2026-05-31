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
import { VERSION_TESTS, runTestsForVersion } from "./smoke-tests";

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
  // 0.55.16 : modale d'affichage de la note HTML avec highlight des termes
  // Remplace le hover preview (qui se coupait sur mobile et flashait sur PC)
  const [noteModal, setNoteModal] = useState(null);
  // noteModal = { version, noteFile, rawHtml, html (avec marks), matchCount, currentMatch, searchText, kind, color }
  const noteCacheRef = useRef({}); // cache des HTML chargés
  const noteContentRef = useRef(null); // ref vers le div scrollable du contenu
  // 0.55.14 : télécharger toutes les notes en ZIP
  const [zipBusy, setZipBusy] = useState(false);
  const [zipProgress, setZipProgress] = useState("");
  // 0.55.15 : modale d'affichage du SQL
  const [sqlModal, setSqlModal] = useState(null); // { version, file, content }
  const [sqlCopied, setSqlCopied] = useState(false);
  const sqlCacheRef = useRef({});
  // 0.55.18 : modale tests + smoke tests
  const [testModal, setTestModal] = useState(null); // { version, results: [{name, ok, msg, error}], running: bool }

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

  // 0.55.16 — Chargement de la note HTML (avec cache et fallback)
  async function fetchNoteHtml(noteFile) {
    if (noteCacheRef.current[noteFile]) return noteCacheRef.current[noteFile];
    try {
      const res = await fetch(`/changelog-notes/${noteFile}`, { cache: "force-cache" });
      if (!res.ok) {
        const res2 = await fetch(`/changelog-notes/${noteFile}`, { cache: "no-cache" });
        if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
        const txt = await res2.text();
        const scoped = scopeHtml(txt);
        noteCacheRef.current[noteFile] = scoped;
        return scoped;
      }
      const txt = await res.text();
      const scoped = scopeHtml(txt);
      noteCacheRef.current[noteFile] = scoped;
      return scoped;
    } catch (e) {
      console.warn("[Changelog] note load fail:", noteFile, e);
      return `<div style="padding:30px;font-family:sans-serif;color:#7a4f15;background:#fff8ec;text-align:center">
        <p style="margin:0 0 8px;font-size:18px"><b>⏳ Note indisponible</b></p>
        <p style="margin:0;font-size:13px;color:#8a98a8">${noteFile}</p>
      </div>`;
    }
  }

  // Helper : scope les styles du body de la note pour ne pas écraser la page
  function scopeHtml(fullHtml) {
    const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const styleMatch = fullHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const body = bodyMatch ? bodyMatch[1] : fullHtml;
    const styles = styleMatch ? styleMatch[1] : "";
    // Préfixe ".cl-note-scope" sur tous les sélecteurs pour les confiner
    const scopedStyles = styles
      .replace(/body\s*\{/g, '.cl-note-scope {')
      .replace(/(^|\})\s*\.wrap\b/g, '$1 .cl-note-scope .wrap');
    return `<style>${scopedStyles}</style><div class="cl-note-scope">${body}</div>`;
  }

  // 0.55.16 — Extraction des mots-clés significatifs d'un texte d'évolution
  // pour pouvoir les surligner dans la note HTML.
  const STOPWORDS_FR = new Set([
    "le","la","les","un","une","des","de","du","au","aux","et","ou","mais","donc","car","ni","or",
    "à","en","dans","sur","sous","pour","par","avec","sans","chez","vers","entre","contre","selon",
    "ce","cet","cette","ces","mon","ma","mes","ton","ta","tes","son","sa","ses","notre","votre","leur","leurs","nos","vos",
    "qui","que","quoi","dont","où","quand","comme","si","ne","pas","plus","moins","très","trop","aussi","encore","déjà","puis",
    "est","sont","être","était","sera","ont","avoir","avait","fait","faire","peut","peuvent","doit","doivent",
    "tous","toutes","tout","toute","chaque","autre","autres","même","mêmes","aucun","aucune",
    "alors","ainsi","puis","ensuite","enfin","cependant","toutefois","néanmoins",
    "via","sans","cas","mode","etc",
  ]);

  function extractKeywords(text) {
    if (!text) return [];
    // Normalise et tokenise
    const tokens = text
      .toLowerCase()
      .replace(/[«»''""()[\]{},;:!?.…]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    const kws = new Set();
    for (const t of tokens) {
      // Garde les mots de 4+ caractères, non-stopword
      // OU les versions/numéros (ex: "0.55.12") ou les codes (ex: "CERFA")
      if (t.length >= 4 && !STOPWORDS_FR.has(t) && /[a-zà-ÿ0-9]/i.test(t)) {
        // Strip leading/trailing punct restant
        const clean = t.replace(/^[^a-zà-ÿ0-9]+|[^a-zà-ÿ0-9]+$/gi, "");
        if (clean.length >= 4) kws.add(clean);
      } else if (/^\d+(\.\d+)+$/.test(t)) {
        kws.add(t); // versions
      } else if (t.length >= 3 && /^[A-Z0-9]+$/i.test(t) && /[A-Z]/.test(t)) {
        kws.add(t); // acronymes type RPC, FR, etc.
      }
    }
    return Array.from(kws);
  }

  // Échappe les caractères regex spéciaux dans un mot-clé
  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Surligne les keywords dans le HTML scopé en injectant des <mark>
  // Renvoie { html, matchCount }
  function highlightInHtml(html, keywords) {
    if (!keywords || keywords.length === 0) return { html, matchCount: 0 };
    // Construit une regex OR des keywords avec word boundaries (compatible accents)
    // \b ne marche pas bien avec les accents, donc on utilise lookaround
    const escaped = keywords.map(escapeRegex).sort((a, b) => b.length - a.length); // long d'abord
    const pattern = new RegExp(
      `(?<![a-zà-ÿ0-9])(${escaped.join("|")})(?![a-zà-ÿ0-9])`,
      "gi"
    );

    // On découpe le HTML en alternance tag/texte pour ne pas matcher dans les attributs
    const tokenizer = /<[^>]+>|[^<]+/g;
    let result = "";
    let matchIdx = 0;
    let match;
    while ((match = tokenizer.exec(html)) !== null) {
      const seg = match[0];
      if (seg.startsWith("<")) {
        // C'est un tag, on le laisse intact
        result += seg;
      } else {
        // C'est du texte, on applique le highlight
        result += seg.replace(pattern, (m) => {
          const idx = matchIdx++;
          return `<mark class="cl-match" data-cl-idx="${idx}">${m}</mark>`;
        });
      }
    }
    return { html: result, matchCount: matchIdx };
  }

  // 0.55.16 — Ouvrir la modale de note avec highlight optionnel
  async function openNote(version, kind, color, searchText = "") {
    if (!version.noteFile) return;
    // Affiche immédiatement la modale en mode chargement
    setNoteModal({
      version: version.v,
      noteFile: version.noteFile,
      kind, color,
      searchText,
      rawHtml: null,
      html: null,
      matchCount: 0,
      currentMatch: 0,
      loading: true,
    });
    try {
      const rawHtml = await fetchNoteHtml(version.noteFile);
      const keywords = extractKeywords(searchText);
      const { html, matchCount } = highlightInHtml(rawHtml, keywords);
      setNoteModal((m) => m && m.version === version.v ? {
        ...m,
        rawHtml,
        html,
        matchCount,
        currentMatch: matchCount > 0 ? 0 : -1,
        keywords,
        loading: false,
      } : m);
    } catch (e) {
      console.error("[Changelog] openNote fail:", e);
    }
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

  // 0.55.18 — Lancer les tests in-browser pour une version
  async function runTests(version) {
    setTestModal({ version, results: [], running: true });
    try {
      const results = await runTestsForVersion(version);
      setTestModal({ version, results: results || [], running: false });
    } catch (e) {
      setTestModal({ version, results: [{ name: "Erreur", ok: false, msg: e.message }], running: false });
    }
  }

  // 0.55.16 — Scroll auto vers le match courant + toggle classe .active
  useEffect(() => {
    if (!noteModal || !noteContentRef.current || noteModal.currentMatch < 0) return;
    const container = noteContentRef.current;
    // 0.55.20 : utiliser requestAnimationFrame pour éviter le forced reflow
    const raf = requestAnimationFrame(() => {
      container.querySelectorAll("mark.cl-match.active").forEach((el) => el.classList.remove("active"));
      const target = container.querySelector(`mark.cl-match[data-cl-idx="${noteModal.currentMatch}"]`);
      if (target) {
        target.classList.add("active");
        // scrollIntoView dans un 2e RAF pour laisser le navigateur appliquer la classe
        requestAnimationFrame(() => {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [noteModal?.currentMatch, noteModal?.html]);

  // 0.55.16 — Escape pour fermer la modale note + raccourcis nav (F3 / n / p)
  useEffect(() => {
    if (!noteModal) return;
    function handleKey(e) {
      if (e.key === "Escape") {
        setNoteModal(null);
        return;
      }
      if (noteModal.matchCount > 0) {
        if (e.key === "F3" || (e.key === "n" && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== "INPUT")) {
          e.preventDefault();
          setNoteModal((m) => m ? { ...m, currentMatch: (m.currentMatch + 1) % m.matchCount } : m);
        }
        if ((e.shiftKey && e.key === "F3") || (e.key === "p" && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== "INPUT")) {
          e.preventDefault();
          setNoteModal((m) => m ? { ...m, currentMatch: (m.currentMatch - 1 + m.matchCount) % m.matchCount } : m);
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [noteModal]);

  // Style des boutons de navigation matches
  const navBtn = {
    background: "transparent",
    border: "none",
    color: "#fff",
    width: 30,
    height: 30,
    borderRadius: 6,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    transition: "background .15s",
  };

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
                      onClick={() => v.noteFile && openNote(v, v.kind, color, v.titre || "")}
                      style={{ margin: 0, fontSize: 14.5, color: "#142131", fontWeight: 700, flex: 1, minWidth: 200, cursor: v.noteFile ? "pointer" : "default" }}
                      title={v.noteFile ? "Cliquer pour afficher la note complète" : ""}
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
                      {/* 0.55.18 : bouton Tester (si version a des smoke tests) */}
                      {VERSION_TESTS[v.v] && (
                        <button
                          onClick={() => runTests(v.v)}
                          title={`Lancer les smoke tests de la version ${v.v}`}
                          style={{ 
                            display: "inline-flex", alignItems: "center", gap: 3,
                            background: "#5aa05a", border: "1px solid #5aa05a",
                            color: "#fff", padding: "3px 8px", borderRadius: 12,
                            fontSize: 11, fontWeight: 600, cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          <i className="ti ti-flask" /> Tester
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
                            onClick={() => v.noteFile && openNote(v, v.kind, color, c.txt)}
                            title={v.noteFile ? "Cliquer pour voir cette évolution dans la note" : ""}
                            style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12.5, color: "#2a3a48", margin: "3px 0", lineHeight: 1.45, cursor: v.noteFile ? "pointer" : "default", padding: "3px 6px", borderRadius: 4, transition: "background .15s" }}
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

      {/* 0.55.18 — Modale résultats des tests in-browser */}
      {testModal && (
        <div
          onClick={(e) => e.target === e.currentTarget && setTestModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20,33,49,.7)",
            zIndex: 9992,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 14px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 14,
              width: "100%",
              maxWidth: 680,
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 30px 80px rgba(0,0,0,.45)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg, #142131 0%, #5aa05a 100%)",
              color: "#fff",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}>
              <i className="ti ti-flask" style={{ fontSize: 22, color: "#cfeacb", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#dff5e0", fontWeight: 700 }}>
                  TESTS IN-BROWSER — VERSION {testModal.version}
                </div>
                {!testModal.running && testModal.results.length > 0 && (
                  <div style={{ fontSize: 12.5, marginTop: 2 }}>
                    <b>{testModal.results.filter(r => r.ok).length}/{testModal.results.length}</b> tests OK
                    {testModal.results.filter(r => !r.ok).length > 0 && (
                      <span style={{ color: "#ffd1c8", marginLeft: 8 }}>
                        · {testModal.results.filter(r => !r.ok).length} échec(s)
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setTestModal(null)}
                style={{
                  background: "transparent",
                  color: "#fff",
                  border: "none",
                  padding: 6,
                  cursor: "pointer",
                  fontSize: 22,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <i className="ti ti-x" />
              </button>
            </div>

            {/* Contenu */}
            <div style={{ flex: 1, overflow: "auto", padding: "12px 18px" }}>
              {testModal.running ? (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 140,
                  color: "#8a98a8",
                  fontSize: 13,
                }}>
                  <i className="ti ti-loader-2" style={{ fontSize: 24, animation: "spin 1s linear infinite", marginRight: 10 }} />
                  Exécution des tests…
                </div>
              ) : testModal.results.length === 0 ? (
                <div style={{ color: "#8a98a8", fontSize: 13, padding: 20, textAlign: "center" }}>
                  Aucun test défini pour cette version.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {testModal.results.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "9px 12px",
                        background: r.ok ? "#eef9ef" : "#fef0ee",
                        border: `1px solid ${r.ok ? "#bfe2bf" : "#f0c4be"}`,
                        borderRadius: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <i
                        className={`ti ${r.ok ? "ti-circle-check" : "ti-circle-x"}`}
                        style={{ fontSize: 18, color: r.ok ? "#2e6f33" : "#c0392b", flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#142131" }}>{r.name}</div>
                        <div style={{ fontSize: 11.5, color: "#6c7a89", marginTop: 1 }}>
                          {r.msg}
                          {r.error && <span style={{ color: "#c0392b" }}> · {r.error}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              background: "#f4f7fa",
              borderTop: "1px solid #e3e9ee",
              padding: "10px 18px",
              fontSize: 11,
              color: "#8a98a8",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}>
              <span>
                <i className="ti ti-info-circle" /> Tests exécutés dans votre navigateur (HTTPS + session courante)
              </span>
              <button
                onClick={() => runTests(testModal.version)}
                disabled={testModal.running}
                style={{
                  background: "#142131",
                  color: "#fff",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: testModal.running ? "wait" : "pointer",
                  fontFamily: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <i className="ti ti-refresh" /> Relancer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 0.55.16 — Modale plein écran d'affichage de la note avec highlight et navigation */}
      {noteModal && (
        <div
          onClick={(e) => e.target === e.currentTarget && setNoteModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20,33,49,.75)",
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
              maxWidth: 960,
              height: "92vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 30px 80px rgba(0,0,0,.45)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{
              background: `linear-gradient(135deg, #142131 0%, ${noteModal.color || "#185FA5"} 100%)`,
              color: "#fff",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}>
              <i className="ti ti-file-text" style={{ fontSize: 22, color: "#7CC8C8", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#cfe4f5", fontWeight: 700 }}>
                  NOTE DE VERSION — {noteModal.version}
                </div>
                <div style={{ fontSize: 12.5, fontFamily: "Consolas, monospace", marginTop: 2, opacity: 0.85 }}>
                  {noteModal.noteFile}
                </div>
              </div>

              {/* Navigation matches */}
              {noteModal.matchCount > 0 && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "rgba(255,255,255,.12)",
                  border: "1px solid rgba(255,255,255,.22)",
                  borderRadius: 8,
                  padding: "2px 4px",
                }}>
                  <button
                    onClick={() => setNoteModal((m) => m ? { ...m, currentMatch: (m.currentMatch - 1 + m.matchCount) % m.matchCount } : m)}
                    title="Match précédent"
                    style={navBtn}
                  >
                    <i className="ti ti-chevron-up" />
                  </button>
                  <span style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    padding: "0 8px",
                    minWidth: 56,
                    textAlign: "center",
                    fontFamily: "Consolas, monospace",
                  }}>
                    {noteModal.currentMatch + 1}/{noteModal.matchCount}
                  </span>
                  <button
                    onClick={() => setNoteModal((m) => m ? { ...m, currentMatch: (m.currentMatch + 1) % m.matchCount } : m)}
                    title="Match suivant"
                    style={navBtn}
                  >
                    <i className="ti ti-chevron-down" />
                  </button>
                </div>
              )}

              <a
                href={`/changelog-notes/${noteModal.noteFile}`}
                target="_blank"
                rel="noopener noreferrer"
                download
                title="Télécharger la note"
                style={{
                  background: "#7CC8C8",
                  color: "#142131",
                  border: "none",
                  padding: "7px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  minHeight: 34,
                }}
              >
                <i className="ti ti-download" /> HTML
              </a>

              <button
                onClick={() => setNoteModal(null)}
                title="Fermer (Échap)"
                style={{
                  background: "transparent",
                  color: "#fff",
                  border: "none",
                  padding: 6,
                  cursor: "pointer",
                  fontSize: 22,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <i className="ti ti-x" />
              </button>
            </div>

            {/* Bandeau search context */}
            {noteModal.searchText && noteModal.keywords?.length > 0 && (
              <div style={{
                background: noteModal.matchCount > 0 ? "#fff8ec" : "#f4f7fa",
                borderBottom: `1px solid ${noteModal.matchCount > 0 ? "#f0d59f" : "#e3e9ee"}`,
                padding: "8px 18px",
                fontSize: 12,
                color: noteModal.matchCount > 0 ? "#7a4f15" : "#6c7a89",
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}>
                <i className={`ti ${noteModal.matchCount > 0 ? "ti-highlight" : "ti-search-off"}`} />
                <span>
                  {noteModal.matchCount > 0 ? (
                    <>
                      <b>{noteModal.matchCount} passage{noteModal.matchCount > 1 ? "s" : ""}</b> surligné{noteModal.matchCount > 1 ? "s" : ""} pour&nbsp;
                    </>
                  ) : (
                    <>Aucun passage correspondant trouvé pour&nbsp;</>
                  )}
                  <i style={{ color: "#142131" }}>« {noteModal.searchText.slice(0, 90)}{noteModal.searchText.length > 90 ? "…" : ""} »</i>
                </span>
                {noteModal.keywords?.length > 0 && (
                  <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.7 }}>
                    Mots : {noteModal.keywords.slice(0, 6).join(", ")}{noteModal.keywords.length > 6 ? "…" : ""}
                  </span>
                )}
              </div>
            )}

            {/* Contenu HTML scrollable */}
            <div
              ref={noteContentRef}
              style={{
                flex: 1,
                overflow: "auto",
                background: "#f4f7fa",
              }}
            >
              {noteModal.loading || !noteModal.html ? (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 200,
                  color: "#8a98a8",
                }}>
                  <i className="ti ti-loader-2" style={{ fontSize: 24, animation: "spin 1s linear infinite" }} />
                  <span style={{ marginLeft: 10, fontSize: 13 }}>Chargement de la note…</span>
                </div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: noteModal.html }} />
              )}
            </div>
          </div>

          {/* Styles inline pour les <mark> */}
          <style>{`
            .cl-note-scope mark.cl-match {
              background: #ffeb9c;
              color: #142131;
              padding: 1px 3px;
              border-radius: 3px;
              box-shadow: 0 0 0 1px rgba(239,159,39,.4);
              transition: background .15s, box-shadow .15s, outline .15s;
            }
            .cl-note-scope mark.cl-match.active {
              background: #EF9F27;
              color: #fff;
              box-shadow: 0 0 0 2px #EF9F27, 0 0 12px rgba(239,159,39,.5);
              outline: 2px solid #fff;
              outline-offset: 2px;
            }
            .cl-note-scope { font-family: 'Segoe UI', sans-serif; }
            .cl-note-scope .wrap { padding: 24px 28px 40px; }
          `}</style>
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
