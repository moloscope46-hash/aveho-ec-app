"use client";
// =============================================================
//  app/parametres/apparence/page.js (0.62.128)
//
//  Page de personnalisation du thème de l'app.
//  Choisir un preset OU personnaliser couleur par couleur.
// =============================================================

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel } from "../../ui";
import { NeonButton, toast } from "../../components/ui-premium";
import { DEFAULT_THEME, THEME_PRESETS, applyTheme, saveTheme, saveThemeToStructure, resetTheme } from "../../../lib/themeManager";

const COLOR_LABELS = {
  primary: { l: "Primaire", desc: "Bleu navy clair" },
  primaryDark: { l: "Primaire foncé", desc: "Bleu navy foncé" },
  accent: { l: "Accent", desc: "Couleur d'emphase (teal)" },
  warning: { l: "Avertissement", desc: "Orange amber" },
  danger: { l: "Danger", desc: "Rouge / corail" },
  success: { l: "Succès", desc: "Vert" },
  info: { l: "Information", desc: "Violet" },
  bg: { l: "Fond général", desc: "Couleur du fond" },
  card: { l: "Carte", desc: "Couleur des panels" },
  text: { l: "Texte principal", desc: "Couleur du texte" },
  textMuted: { l: "Texte secondaire", desc: "Texte atténué" },
  border: { l: "Bordures", desc: "Couleur des bordures" },
};

export default function ApparencePage() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [theme, setThemeState] = useState(DEFAULT_THEME);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Charge le thème actuel
    try {
      const stored = localStorage.getItem("aveho_theme");
      if (stored) setThemeState({ ...DEFAULT_THEME, ...JSON.parse(stored) });
    } catch {}
  }, []);

  function applyPreset(preset) {
    setThemeState(preset.t);
    saveTheme(preset.t);
    toast.success(`Thème "${preset.l}" appliqué !`);
  }

  function changeColor(key, val) {
    const newTheme = { ...theme, [key]: val };
    setThemeState(newTheme);
    saveTheme(newTheme);
  }

  async function saveForStructure() {
    if (!auth?.structureId) return;
    setBusy(true);
    try {
      await saveThemeToStructure(auth.structureId, theme);
      toast.success("Thème enregistré pour la structure !");
    } catch (e) {
      toast.error("Erreur : " + e.message);
    } finally { setBusy(false); }
  }

  function resetAll() {
    if (!confirm("Réinitialiser le thème aux couleurs Aveho par défaut ?")) return;
    setThemeState(DEFAULT_THEME);
    resetTheme();
    toast.info("Thème réinitialisé");
  }

  if (!auth?.user) return <div className="bg-dark"><div style={{ padding: 40, color: "#fff" }}>Authentification…</div></div>;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          icon="ti-palette"
          title="Apparence"
          accent="violet"
          sub="Personnalisez les couleurs de votre Espace Collectivité"
          eyebrow="PARAMÈTRES"
        />

        {/* Presets */}
        <Panel style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <i className="ti ti-sparkles" style={{ fontSize: 18, color: "#EF9F27" }} />
            <h3 style={{ margin: 0, fontSize: 14, color: "#142131" }}>Thèmes prédéfinis</h3>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "#8a98a8" }}>Click pour appliquer</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {THEME_PRESETS.map(p => (
              <button key={p.k} onClick={() => applyPreset(p)}
                style={{
                  background: "#fff",
                  border: "2px solid #e3e9ee",
                  borderRadius: 12,
                  padding: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                  transition: "all 200ms",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(20, 33, 49, .12)"; e.currentTarget.style.borderColor = p.t.primary; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#e3e9ee"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 6, background: p.t.primary }}></div>
                  <div style={{ width: 18, height: 18, borderRadius: 6, background: p.t.accent }}></div>
                  <div style={{ width: 18, height: 18, borderRadius: 6, background: p.t.warning }}></div>
                  <div style={{ width: 18, height: 18, borderRadius: 6, background: p.t.danger }}></div>
                </div>
                <div style={{ fontWeight: 700, color: "#142131", fontSize: 13 }}>{p.l}</div>
                <div style={{ fontSize: 11, color: "#5a6878", marginTop: 2 }}>{p.desc}</div>
              </button>
            ))}
          </div>
        </Panel>

        {/* Personnalisation fine */}
        <Panel>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <i className="ti ti-color-swatch" style={{ fontSize: 18, color: "#7a6fb0" }} />
            <h3 style={{ margin: 0, fontSize: 14, color: "#142131" }}>Personnalisation avancée</h3>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {auth?.structureId && (auth.role?.nom === "Administrateur" || auth.can?.("parametres_admin")) && (
                <NeonButton variant="violet" icon="ti-cloud-upload" onClick={saveForStructure} disabled={busy}>
                  Appliquer à toute la structure
                </NeonButton>
              )}
              <button onClick={resetAll}
                style={{ padding: "8px 14px", background: "transparent", border: "1px solid #e35d5b", color: "#e35d5b", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}>
                <i className="ti ti-rotate" /> Réinitialiser
              </button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {Object.entries(COLOR_LABELS).map(([key, meta]) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, background: "#fff", border: "1px solid #e3e9ee", borderRadius: 8 }}>
                <input type="color" value={theme[key]} onChange={(e) => changeColor(key, e.target.value)}
                  style={{ width: 40, height: 40, padding: 0, border: "none", borderRadius: 6, cursor: "pointer" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "#142131" }}>{meta.l}</div>
                  <div style={{ fontSize: 10, color: "#8a98a8" }}>{meta.desc}</div>
                  <code style={{ fontSize: 9.5, color: theme[key], fontWeight: 700, fontFamily: "Consolas, monospace" }}>{theme[key]}</code>
                </div>
              </label>
            ))}
          </div>
        </Panel>

        {/* Preview live */}
        <Panel style={{ marginTop: 16 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, color: "#142131" }}>
            <i className="ti ti-eye" style={{ color: "#5aa05a", marginRight: 6 }} /> Aperçu en direct
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            <div style={{ padding: 16, background: theme.primary, color: "#fff", borderRadius: 10, fontWeight: 700, textAlign: "center" }}>Primary</div>
            <div style={{ padding: 16, background: theme.accent, color: "#fff", borderRadius: 10, fontWeight: 700, textAlign: "center" }}>Accent</div>
            <div style={{ padding: 16, background: theme.warning, color: "#fff", borderRadius: 10, fontWeight: 700, textAlign: "center" }}>Warning</div>
            <div style={{ padding: 16, background: theme.danger, color: "#fff", borderRadius: 10, fontWeight: 700, textAlign: "center" }}>Danger</div>
            <div style={{ padding: 16, background: theme.success, color: "#fff", borderRadius: 10, fontWeight: 700, textAlign: "center" }}>Success</div>
            <div style={{ padding: 16, background: theme.info, color: "#fff", borderRadius: 10, fontWeight: 700, textAlign: "center" }}>Info</div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
