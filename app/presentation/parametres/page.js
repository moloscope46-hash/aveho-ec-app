"use client";
// =============================================================
//  /presentation/parametres (0.65.10)
//
//  Page de configuration ULTRA complète pour le mode TV :
//   - Détection multi-écrans
//   - Cast (Chromecast / AirPlay)
//   - Disposition : quel écran montre quoi
//   - Couleurs / thème
//   - Refresh rate
//   - Auto-rotation des pages TV
//   - Mode picture-in-picture
//   - Plein écran auto
//   - QR code pour mobile
// =============================================================

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/useAuth";

const TV_PAGES = [
  { v: "/presentation/interventions", l: "DI",            ic: "ti-clipboard-list", col: "#EF9F27" },
  { v: "/presentation/planning",      l: "Planning",      ic: "ti-calendar",       col: "#7CC8C8" },
  { v: "/presentation/architecture",  l: "Architecture",  ic: "ti-building",       col: "#185FA5" },
  { v: "/presentation/livraisons",    l: "Livraisons",    ic: "ti-truck-delivery", col: "#C9867F" },
  { v: "/presentation/carte-had",     l: "Carte HAD",     ic: "ti-map-pin",        col: "#5aa05a" },
  { v: "/presentation/had-list",      l: "Liste HAD",     ic: "ti-home-heart",     col: "#5db5b5" },
  { v: "/presentation/dashboard",     l: "Dashboard",     ic: "ti-chart-bar",      col: "#7a6fb0" },
  { v: "/presentation/stats",         l: "Stats",         ic: "ti-pulse",          col: "#5a8f8f" },
];

const THEMES = [
  { v: "default", l: "Aveho", primary: "#7CC8C8", bg: "linear-gradient(135deg, #142131 0%, #1c5454 100%)" },
  { v: "navy",    l: "Navy",  primary: "#185FA5", bg: "linear-gradient(135deg, #0a141f 0%, #0e2a4e 100%)" },
  { v: "ember",   l: "Ember", primary: "#EF9F27", bg: "linear-gradient(135deg, #2a1a0a 0%, #54320a 100%)" },
  { v: "violet",  l: "Violet",primary: "#7a6fb0", bg: "linear-gradient(135deg, #1a142a 0%, #3a2c5a 100%)" },
  { v: "rouge",   l: "Rouge", primary: "#e35d5b", bg: "linear-gradient(135deg, #2a0a0a 0%, #5a1a1a 100%)" },
  { v: "clair",   l: "Clair", primary: "#185FA5", bg: "linear-gradient(135deg, #fafbfc 0%, #e3e9ee 100%)" },
];

export default function PresentationParametres() {
  const auth = useAuth();
  const router = useRouter();

  // ========= État =========
  const [screens, setScreens] = useState([]);
  const [screenAssignments, setScreenAssignments] = useState({});  // { screenIdx: pageUrl }
  const [refreshSec, setRefreshSec] = useState(60);
  const [theme, setTheme] = useState("default");
  const [autoRotation, setAutoRotation] = useState(false);
  const [rotationInterval, setRotationInterval] = useState(120);  // 2 min entre pages
  const [selectedPages, setSelectedPages] = useState(TV_PAGES.slice(0, 4).map(p => p.v));
  const [autoFullscreen, setAutoFullscreen] = useState(true);
  const [hideTopbar, setHideTopbar] = useState(true);
  const [castAvailable, setCastAvailable] = useState(false);
  const [airplayAvailable, setAirplayAvailable] = useState(false);
  const [multiScreenAvailable, setMultiScreenAvailable] = useState(false);
  const [openedWindows, setOpenedWindows] = useState({});  // { screenIdx: WindowRef }

  // ========= Chargement initial =========
  useEffect(() => {
    if (typeof window === "undefined") return;
    setCastAvailable(!!window.chrome?.cast);
    setAirplayAvailable(typeof window.WebKitPlaybackTargetAvailabilityEvent !== "undefined");
    setMultiScreenAvailable(typeof window.getScreenDetails === "function");

    // Restore localStorage
    try {
      const saved = JSON.parse(localStorage.getItem("av-tv-params") || "{}");
      if (saved.refreshSec) setRefreshSec(saved.refreshSec);
      if (saved.theme) setTheme(saved.theme);
      if (saved.autoRotation !== undefined) setAutoRotation(saved.autoRotation);
      if (saved.rotationInterval) setRotationInterval(saved.rotationInterval);
      if (saved.selectedPages) setSelectedPages(saved.selectedPages);
      if (saved.autoFullscreen !== undefined) setAutoFullscreen(saved.autoFullscreen);
      if (saved.hideTopbar !== undefined) setHideTopbar(saved.hideTopbar);
      if (saved.screenAssignments) setScreenAssignments(saved.screenAssignments);
    } catch {}
  }, []);

  // ========= Persistance =========
  useEffect(() => {
    try {
      localStorage.setItem("av-tv-params", JSON.stringify({
        refreshSec, theme, autoRotation, rotationInterval, selectedPages,
        autoFullscreen, hideTopbar, screenAssignments,
      }));
    } catch {}
  }, [refreshSec, theme, autoRotation, rotationInterval, selectedPages, autoFullscreen, hideTopbar, screenAssignments]);

  // ========= Actions =========
  async function detectScreens() {
    if (!window.getScreenDetails) {
      alert("API multi-écran non disponible. Utilise Chrome 100+ sur desktop.");
      return;
    }
    try {
      const sd = await window.getScreenDetails();
      const list = sd.screens.map((s, i) => ({
        idx: i,
        label: s.label || `Écran ${i + 1}`,
        width: s.width,
        height: s.height,
        availLeft: s.availLeft,
        availTop: s.availTop,
        isPrimary: s.isPrimary,
        isInternal: s.isInternal,
      }));
      setScreens(list);
    } catch (e) {
      if (e.name === "NotAllowedError") {
        alert("Permission refusée. Click sur l'icône cadenas dans la barre d'adresse → autoriser \"Window placement\".");
      } else {
        alert("Erreur détection écrans : " + (e.message || e.name));
      }
    }
  }

  function deployTo(screen, pageUrl) {
    const queryParams = new URLSearchParams({
      refresh: String(refreshSec),
      theme,
      ...(autoRotation ? { rotation: String(rotationInterval), pages: selectedPages.join(",") } : {}),
    });
    const url = `${window.location.origin}${pageUrl}?${queryParams.toString()}`;
    const features = `left=${screen.availLeft},top=${screen.availTop},width=${screen.width},height=${screen.height},popup=yes,noopener=no`;
    const win = window.open(url, `av-tv-screen-${screen.idx}`, features);
    if (win) {
      setOpenedWindows({ ...openedWindows, [screen.idx]: win });
      if (autoFullscreen) {
        setTimeout(() => {
          try { win.document.documentElement.requestFullscreen?.(); } catch {}
        }, 1500);
      }
    } else {
      alert("Popup bloquée. Autorise les popups pour ce site dans Chrome → cadenas.");
    }
  }

  function deployAll() {
    Object.entries(screenAssignments).forEach(([idx, pageUrl]) => {
      const screen = screens.find(s => s.idx === parseInt(idx));
      if (screen && pageUrl) {
        deployTo(screen, pageUrl);
      }
    });
  }

  function closeAll() {
    Object.values(openedWindows).forEach(win => {
      try { win.close(); } catch {}
    });
    setOpenedWindows({});
  }

  function showQrCode() {
    const baseUrl = window.location.origin + "/presentation/interventions";
    const url = encodeURIComponent(baseUrl + "?refresh=" + refreshSec);
    window.open(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${url}`, "_blank", "width=500,height=500");
  }

  function togglePage(pageUrl) {
    setSelectedPages(prev =>
      prev.includes(pageUrl) ? prev.filter(p => p !== pageUrl) : [...prev, pageUrl]
    );
  }

  function copyDeepLink() {
    const queryParams = new URLSearchParams({
      refresh: String(refreshSec),
      theme,
      ...(autoRotation ? { rotation: String(rotationInterval), pages: selectedPages.join(",") } : {}),
    });
    const url = `${window.location.origin}/presentation/interventions?${queryParams.toString()}`;
    navigator.clipboard?.writeText(url).then(() => {
      alert("Lien copié ! Colle-le sur la box TV / dans le navigateur de l'écran cible.");
    });
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #142131 0%, #1c5454 100%)",
      color: "#fff",
      fontFamily: "Segoe UI, Quicksand, Helvetica, Arial, sans-serif",
      padding: "32px max(20px, env(safe-area-inset-left)) 60px",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <button onClick={() => router.push("/presentation/interventions")}
            style={{
              background: "rgba(255,255,255,.06)",
              color: "#7CC8C8",
              border: "1px solid rgba(124,200,200,.3)",
              padding: "6px 12px",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "inherit",
              marginBottom: 18,
            }}>
            <i className="ti ti-arrow-left" /> Retour mode TV
          </button>
          <div style={{ fontSize: 13, letterSpacing: 3, color: "#7CC8C8", fontWeight: 700, marginBottom: 4 }}>
            AVEHO — TV PARAMÉTRAGE
          </div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: 1 }}>
            <i className="ti ti-settings-2" /> Paramètres du mode TV
          </h1>
          <p style={{ color: "#bfe6e6", fontSize: 14, marginTop: 6, opacity: 0.85 }}>
            Configure tes écrans, dispositions, refresh, rotation et thèmes pour la salle de garde
          </p>
        </div>

        {/* Status des APIs détectées */}
        <Section icon="ti-info-circle" color="#7CC8C8" title="Capacités détectées">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            <Capability ok={castAvailable}        label="Chromecast"     hint="Chrome sur desktop" />
            <Capability ok={airplayAvailable}     label="AirPlay"        hint="Safari macOS/iOS" />
            <Capability ok={multiScreenAvailable} label="Multi-écran"    hint="Chrome 100+ desktop" />
            <Capability ok={typeof document !== "undefined" && "pictureInPictureEnabled" in document} label="Picture-in-Pic" hint="Chrome/Edge" />
          </div>
        </Section>

        {/* Multi-écran */}
        <Section icon="ti-devices" color="#EF9F27" title="Multi-écrans physiques">
          <p style={{ fontSize: 12.5, color: "#bfe6e6", marginBottom: 12, lineHeight: 1.5 }}>
            Si tu as plusieurs écrans branchés à ton PC/box TV, on peut déployer une page différente sur chacun automatiquement.
            <span style={{ color: "#EF9F27", fontWeight: 700 }}> Chrome 100+ requis</span>, et il faut autoriser "Window placement" dans les permissions du navigateur.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <button onClick={detectScreens} style={primaryBtn()}>
              <i className="ti ti-refresh" /> Détecter mes écrans
            </button>
            {screens.length > 0 && (
              <>
                <button onClick={deployAll} style={primaryBtn("#5aa05a")}>
                  <i className="ti ti-rocket" /> Lancer la diffusion sur tous
                </button>
                {Object.keys(openedWindows).length > 0 && (
                  <button onClick={closeAll} style={primaryBtn("#e35d5b")}>
                    <i className="ti ti-x" /> Tout fermer
                  </button>
                )}
              </>
            )}
          </div>

          {screens.length === 0 ? (
            <div style={{ padding: 14, background: "rgba(255,255,255,.04)", borderRadius: 10, fontSize: 12, color: "#bfe6e6", fontStyle: "italic", textAlign: "center" }}>
              Aucun écran détecté pour l'instant. Click "Détecter mes écrans".
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {screens.map((s) => (
                <div key={s.idx} style={{
                  background: "rgba(255,255,255,.05)",
                  border: "1.5px solid " + (s.isPrimary ? "rgba(239,159,39,.5)" : "rgba(124,200,200,.2)"),
                  borderRadius: 12,
                  padding: 14,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <i className={`ti ${s.isPrimary ? "ti-device-desktop-star" : "ti-device-desktop"}`} style={{ fontSize: 22, color: s.isPrimary ? "#EF9F27" : "#7CC8C8" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>
                        {s.label}
                        {s.isPrimary && <span style={{ fontSize: 9, background: "#EF9F27", color: "#fff", padding: "1px 5px", borderRadius: 4, marginLeft: 6 }}>PRINCIPAL</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#9bb5b5" }}>{s.width} × {s.height}</div>
                    </div>
                  </div>
                  <label style={{ fontSize: 10, color: "#bfe6e6", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" }}>
                    Page à afficher
                  </label>
                  <select
                    value={screenAssignments[s.idx] || ""}
                    onChange={(e) => setScreenAssignments({ ...screenAssignments, [s.idx]: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      background: "rgba(20,33,49,.6)",
                      color: "#fff",
                      border: "1px solid rgba(124,200,200,.3)",
                      borderRadius: 8,
                      fontSize: 12,
                      fontFamily: "inherit",
                      marginBottom: 8,
                    }}>
                    <option value="">— Aucune —</option>
                    {TV_PAGES.map(p => (
                      <option key={p.v} value={p.v}>{p.l}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => screenAssignments[s.idx] && deployTo(s, screenAssignments[s.idx])}
                    disabled={!screenAssignments[s.idx]}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      background: screenAssignments[s.idx] ? "linear-gradient(135deg, #7CC8C8, #5db5b5)" : "rgba(124,200,200,.15)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: screenAssignments[s.idx] ? "pointer" : "not-allowed",
                      fontFamily: "inherit",
                      opacity: screenAssignments[s.idx] ? 1 : 0.5,
                    }}>
                    <i className="ti ti-rocket" /> Déployer sur cet écran
                  </button>
                  {openedWindows[s.idx] && (
                    <div style={{ fontSize: 10, color: "#5aa05a", marginTop: 6, textAlign: "center" }}>
                      <i className="ti ti-circle-filled" style={{ fontSize: 8 }} /> Diffusion en cours
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Cast Chromecast / AirPlay */}
        <Section icon="ti-cast" color="#185FA5" title="Cast vers TV (Chromecast / AirPlay / Box)">
          <p style={{ fontSize: 12.5, color: "#bfe6e6", marginBottom: 12, lineHeight: 1.5 }}>
            Pour caster sur une <strong>Smart TV</strong>, <strong>Chromecast</strong>, <strong>Apple TV</strong>, <strong>Mi Box</strong> ou autre box Android/iOS :
          </p>
          <ul style={{ fontSize: 12, color: "#bfe6e6", marginLeft: 18, lineHeight: 1.7 }}>
            <li><strong>Chromecast</strong> (Mi Box, Nvidia Shield, Chromecast natif) → menu Chrome → "Caster…" → choisir l'appareil</li>
            <li><strong>Apple TV</strong> → Safari → bouton AirPlay dans la barre d'adresse ou Control Center iOS</li>
            <li><strong>Smart TV LG/Samsung</strong> → ouvre le navigateur web de la TV et entre cette URL :</li>
          </ul>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <button onClick={copyDeepLink} style={primaryBtn("#185FA5")}>
              <i className="ti ti-link" /> Copier le lien direct (avec paramètres)
            </button>
            <button onClick={showQrCode} style={primaryBtn("#C9867F")}>
              <i className="ti ti-qrcode" /> QR Code pour smartphone
            </button>
          </div>
        </Section>

        {/* Refresh + rotation */}
        <Section icon="ti-refresh" color="#7a6fb0" title="Refresh & rotation automatique">
          <div style={{ marginBottom: 14 }}>
            <label style={lblStyle()}>
              <i className="ti ti-clock" /> Refresh des données ({refreshSec}s)
            </label>
            <input type="range" min={15} max={300} step={15} value={refreshSec} onChange={(e) => setRefreshSec(parseInt(e.target.value))}
              style={{ width: "100%" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9bb5b5", marginTop: 2 }}>
              <span>15s (rapide)</span><span>2min</span><span>5min (lent)</span>
            </div>
          </div>

          <label style={{ ...lblStyle(), display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={autoRotation} onChange={(e) => setAutoRotation(e.target.checked)} />
            <i className="ti ti-rotate" /> Auto-rotation entre les pages
          </label>

          {autoRotation && (
            <div style={{ paddingLeft: 24, marginTop: 8 }}>
              <label style={{ fontSize: 12, color: "#bfe6e6" }}>Toutes les {rotationInterval} sec</label>
              <input type="range" min={30} max={600} step={15} value={rotationInterval} onChange={(e) => setRotationInterval(parseInt(e.target.value))}
                style={{ width: "100%", marginTop: 4 }} />
              <div style={{ marginTop: 10, fontSize: 11, color: "#bfe6e6", fontWeight: 700, textTransform: "uppercase" }}>
                Pages à inclure dans la rotation :
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {TV_PAGES.map(p => (
                  <button key={p.v} onClick={() => togglePage(p.v)}
                    style={{
                      padding: "4px 10px",
                      background: selectedPages.includes(p.v) ? p.col : "rgba(255,255,255,.05)",
                      color: selectedPages.includes(p.v) ? "#fff" : "#bfe6e6",
                      border: selectedPages.includes(p.v) ? "none" : "1px solid rgba(124,200,200,.2)",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}>
                    <i className={`ti ${p.ic}`} /> {p.l}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Thème / couleurs */}
        <Section icon="ti-palette" color="#C9867F" title="Thème de couleur">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {THEMES.map(t => (
              <button key={t.v} onClick={() => setTheme(t.v)}
                style={{
                  padding: 12,
                  background: t.bg,
                  border: theme === t.v ? `2.5px solid ${t.primary}` : "2px solid rgba(124,200,200,.2)",
                  borderRadius: 12,
                  cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  fontFamily: "inherit",
                  boxShadow: theme === t.v ? `0 0 0 4px ${t.primary}33` : "none",
                  transition: "all 220ms",
                }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: t.primary, boxShadow: `0 4px 10px ${t.primary}66` }} />
                <span style={{ color: t.v === "clair" ? "#142131" : "#fff", fontWeight: 700, fontSize: 13 }}>{t.l}</span>
                {theme === t.v && (
                  <i className="ti ti-check" style={{ color: t.primary, fontSize: 14 }} />
                )}
              </button>
            ))}
          </div>
        </Section>

        {/* Options diverses */}
        <Section icon="ti-toggle-right" color="#5aa05a" title="Options d'affichage">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={autoFullscreen} onChange={(e) => setAutoFullscreen(e.target.checked)} />
              <i className="ti ti-maximize" /> Plein écran automatique au déploiement
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={hideTopbar} onChange={(e) => setHideTopbar(e.target.checked)} />
              <i className="ti ti-eye-off" /> Masquer la topbar Aveho sur les pages TV
            </label>
          </div>
        </Section>

        {/* Aide */}
        <Section icon="ti-help" color="#9bb5b5" title="Astuces & raccourcis clavier">
          <ul style={{ fontSize: 12.5, color: "#bfe6e6", lineHeight: 1.8, marginLeft: 18 }}>
            <li><kbd style={kbd}>F11</kbd> : plein écran sur la fenêtre active</li>
            <li><kbd style={kbd}>1-8</kbd> : changer de page TV directement (depuis n'importe quelle vue TV)</li>
            <li><kbd style={kbd}>R</kbd> : refresh manuel de la page</li>
            <li><kbd style={kbd}>P P P</kbd> (3x rapide) : activer le DesignAuditor pour identifier les polishs</li>
          </ul>
        </Section>

      </div>
    </div>
  );
}

const kbd = {
  background: "rgba(124,200,200,.15)",
  border: "1px solid rgba(124,200,200,.4)",
  borderRadius: 4,
  padding: "1px 6px",
  fontFamily: "Consolas, monospace",
  fontSize: 11,
  fontWeight: 700,
  color: "#7CC8C8",
};

function Section({ icon, color, title, children }) {
  return (
    <div style={{
      background: "rgba(255,255,255,.04)",
      border: "1px solid rgba(124,200,200,.15)",
      borderRadius: 14,
      padding: "16px 20px",
      marginBottom: 16,
    }}>
      <h2 style={{
        margin: "0 0 14px",
        fontSize: 16,
        fontWeight: 800,
        color: color,
        display: "flex",
        alignItems: "center",
        gap: 8,
        textTransform: "uppercase",
        letterSpacing: 1,
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 20 }} />
        {title}
      </h2>
      {children}
    </div>
  );
}

function Capability({ ok, label, hint }) {
  return (
    <div style={{
      padding: 10,
      background: ok ? "rgba(90,160,90,.12)" : "rgba(155,181,181,.06)",
      border: `1px solid ${ok ? "rgba(90,160,90,.35)" : "rgba(155,181,181,.2)"}`,
      borderRadius: 10,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 18, color: ok ? "#5aa05a" : "#666" }}>
        <i className={`ti ${ok ? "ti-circle-check-filled" : "ti-circle-x"}`} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginTop: 2 }}>{label}</div>
      <div style={{ fontSize: 9.5, color: "#9bb5b5", marginTop: 2 }}>{hint}</div>
    </div>
  );
}

function lblStyle() {
  return {
    fontSize: 12,
    color: "#bfe6e6",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    display: "block",
    marginBottom: 6,
  };
}

function primaryBtn(color = "#7CC8C8") {
  return {
    padding: "10px 18px",
    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "inherit",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    boxShadow: `0 4px 14px ${color}50`,
  };
}
