"use client";
export const dynamic = "force-dynamic";
// =============================================================
//  /parametres/voiture — TOUS les paramètres Mode Voiture & CarPlay
//  Sécurité conduite, TTS, Connection, Layout, Navigation, etc.
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { PageShell, ModernCard, HiTechIconBox } from "../../components/ui-premium";

const COLOR = "#185FA5";

const CATEGORIES = [
  { key: "cat_patients",       lbl: "Patients",                ic: "ti-user-heart",  c: "#7a6fb0" },
  { key: "cat_etablissements", lbl: "Établissements",          ic: "ti-building-hospital", c: "#C9867F" },
  { key: "cat_magasins",       lbl: "Magasins",                ic: "ti-building-store", c: "#7CC8C8" },
  { key: "cat_pharmacies",     lbl: "Pharmacies",              ic: "ti-pill",        c: "#5aa05a" },
  { key: "cat_rpps",           lbl: "Annuaire RPPS",           ic: "ti-stethoscope", c: "#185FA5" },
  { key: "cat_fournisseurs",   lbl: "Fournisseurs",            ic: "ti-truck",       c: "#5e4a8c" },
  { key: "cat_had",            lbl: "HAD (Hospi. à Domicile)", ic: "ti-home-heart",  c: "#D45E5E" },
  { key: "cat_tournees_jour",  lbl: "Tournées du jour",        ic: "ti-route",       c: "#185FA5" },
  { key: "cat_di_urgentes",    lbl: "DI urgentes",             ic: "ti-alert-triangle", c: "#D45E5E" },
  { key: "cat_infirmieres",    lbl: "Infirmières",             ic: "ti-stethoscope", c: "#C9867F" },
  { key: "cat_visites_inf",    lbl: "Visites infirmières",     ic: "ti-clipboard-check", c: "#C9867F" },
  { key: "cat_chambres",       lbl: "Chambres",                ic: "ti-bed",         c: "#EF9F27" },
];

const NAV_OPTIONS = [
  { v: "waze",        l: "Waze",         ic: "ti-brand-waze" },
  { v: "google_maps", l: "Google Maps",  ic: "ti-map" },
  { v: "apple_plans", l: "Apple Plans",  ic: "ti-brand-apple" },
  { v: "mappy",       l: "Mappy",        ic: "ti-map-pin" },
];

const THEMES = [
  { v: "navy",   l: "Navy (sombre)",  c: "#142131" },
  { v: "teal",   l: "Teal (mer)",     c: "#7CC8C8" },
  { v: "amber",  l: "Amber (ambré)",  c: "#EF9F27" },
  { v: "violet", l: "Violet",         c: "#7a6fb0" },
];

const TAILLES = [
  { v: "petite",  l: "Petite (plus d'éléments)" },
  { v: "normale", l: "Normale" },
  { v: "grande",  l: "Grande (lisibilité +)" },
  { v: "xl",      l: "XL (conduite)" },
];

const VOIX_TTS = [
  { v: "fr-FR-AmelieNeural",  l: "Amélie (féminine, FR)" },
  { v: "fr-FR-HenriNeural",   l: "Henri (masculin, FR)" },
  { v: "fr-FR-DeniseNeural",  l: "Denise (féminine, FR)" },
  { v: "fr-FR-CelesteNeural", l: "Céleste (féminine, FR)" },
];

const DEFAULT_CONFIG = {
  // Catégories
  cat_patients: true, cat_etablissements: true, cat_magasins: true, cat_pharmacies: false,
  cat_rpps: false, cat_fournisseurs: false, cat_had: true, cat_tournees_jour: true,
  cat_di_urgentes: true, cat_infirmieres: false, cat_visites_inf: false, cat_chambres: false,
  // Comportement
  tts_active: true, wakelock_active: true, compact_mode: false, aujourd_hui_only: true,
  // Sécurité
  vibrations_actives: true, son_actif: true, vitesse_max_interaction: 30,
  // Navigation
  navigation_par_defaut: "waze", proposer_pause_min: 120,
  // TTS
  langue_tts: "fr-FR", vitesse_tts: 1.0, voix_tts: "fr-FR-AmelieNeural",
  // Connection
  bluetooth_auto: true, android_auto_active: true, carplay_actif: true, miroir_actif: true,
  // Layout
  taille_tuiles: "normale", theme_couleur: "navy",
};

export default function ParametresVoiturePage() {
  const supabase = createClient();
  const auth = useAuth();
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState("categories");

  useEffect(() => {
    if (!auth?.user?.id) return;
    (async () => {
      const r = await supabase.from("carplay_config").select("*").eq("user_id", auth.user.id).maybeSingle();
      if (r.data) setConfig({ ...DEFAULT_CONFIG, ...r.data });
    })();
  }, [auth?.user?.id]);

  async function save() {
    if (!auth?.user?.id) return;
    await supabase.from("carplay_config").upsert({
      user_id: auth.user.id,
      structure_id: auth.structureId,
      ...config,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function set(k, v) { setConfig({ ...config, [k]: v }); }
  function toggle(k) { set(k, !config[k]); }

  return (
    <>
      <TopBar />
      <PageShell
        color={COLOR}
        icon="ti-car"
        title="Paramètres Mode Voiture & CarPlay"
        subtitle="Catégories, sécurité conduite, TTS, navigation, connexion"
        actions={
          <button onClick={save} style={{
            padding: "10px 18px", borderRadius: 10,
            background: saved ? "linear-gradient(135deg, #5aa05a, #4a8a4a)" : `linear-gradient(135deg, ${COLOR}, ${COLOR}cc)`,
            color: "#fff", border: "none", fontFamily: "Quicksand", fontWeight: 700, fontSize: 13,
            cursor: "pointer", boxShadow: `0 4px 12px ${COLOR}50`,
          }}>
            <i className={`ti ${saved ? "ti-check" : "ti-device-floppy"}`} /> {saved ? "Sauvegardé ✓" : "Sauvegarder"}
          </button>
        }
      >
        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,.06)", paddingBottom: 12, flexWrap: "wrap" }}>
          {[
            { k: "categories", l: "Catégories", ic: "ti-grid-dots" },
            { k: "comportement", l: "Comportement", ic: "ti-settings-2" },
            { k: "securite", l: "Sécurité conduite", ic: "ti-shield-check" },
            { k: "tts", l: "Voix TTS", ic: "ti-volume" },
            { k: "navigation", l: "Navigation", ic: "ti-map-pin" },
            { k: "connection", l: "Connexion", ic: "ti-bluetooth" },
            { k: "apparence", l: "Apparence", ic: "ti-palette" },
          ].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{
              padding: "8px 14px", borderRadius: 10,
              background: tab === t.k ? `linear-gradient(135deg, ${COLOR}, ${COLOR}cc)` : "rgba(255,255,255,.06)",
              color: tab === t.k ? "#fff" : "rgba(255,255,255,.65)",
              border: `1px solid ${tab === t.k ? COLOR+"60" : "rgba(255,255,255,.10)"}`,
              fontFamily: "Quicksand", fontWeight: 700, fontSize: 12, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 5,
            }}>
              <i className={`ti ${t.ic}`} /> {t.l}
            </button>
          ))}
        </div>

        {/* CATEGORIES */}
        {tab === "categories" && (
          <ModernCard color={COLOR} icon="ti-grid-dots" title="Catégories visibles dans le Mode Voiture" padding={16}>
            <p style={{ color: "rgba(255,255,255,.65)", margin: "0 0 14px", fontSize: 12 }}>
              Coche les catégories que tu veux voir s'afficher quand tu actives le Mode Voiture / Android Auto / CarPlay.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
              {CATEGORIES.map(cat => {
                const on = config[cat.key];
                return (
                  <label key={cat.key} onClick={() => toggle(cat.key)} style={{
                    padding: 10, background: on ? `${cat.c}25` : "rgba(255,255,255,.04)",
                    border: `1px solid ${on ? cat.c+"60" : "rgba(255,255,255,.08)"}`,
                    borderRadius: 10, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <HiTechIconBox name={cat.ic} color={cat.c} variant={on ? "gradient" : "subtle"} size={32} />
                    <div style={{ flex: 1, color: "#fff", fontSize: 12, fontWeight: 600 }}>{cat.lbl}</div>
                    <div style={{ width: 32, height: 18, borderRadius: 9, background: on ? cat.c : "rgba(255,255,255,.10)", position: "relative" }}>
                      <div style={{ position: "absolute", top: 2, left: on ? 16 : 2, width: 14, height: 14, borderRadius: 7, background: "#fff", transition: "left 150ms" }} />
                    </div>
                  </label>
                );
              })}
            </div>
          </ModernCard>
        )}

        {/* COMPORTEMENT */}
        {tab === "comportement" && (
          <ModernCard color={COLOR} icon="ti-settings-2" title="Comportement général" padding={16}>
            <Toggle label="Synthèse vocale (TTS)" desc="Annonces vocales des étapes" v={config.tts_active} on={() => toggle("tts_active")} c="#5aa05a" ic="ti-volume" />
            <Toggle label="Empêcher la mise en veille" desc="Écran toujours allumé en mode voiture" v={config.wakelock_active} on={() => toggle("wakelock_active")} c="#EF9F27" ic="ti-screen-share" />
            <Toggle label="Mode compact" desc="Affichage densifié (plus d'infos)" v={config.compact_mode} on={() => toggle("compact_mode")} c="#7CC8C8" ic="ti-layout-grid" />
            <Toggle label="Aujourd'hui uniquement" desc="Filtre auto sur les tournées/RDV du jour" v={config.aujourd_hui_only} on={() => toggle("aujourd_hui_only")} c="#185FA5" ic="ti-calendar-event" />
          </ModernCard>
        )}

        {/* SECURITE */}
        {tab === "securite" && (
          <ModernCard color="#D45E5E" icon="ti-shield-check" title="Sécurité de conduite" padding={16}>
            <p style={{ color: "rgba(255,255,255,.65)", margin: "0 0 14px", fontSize: 12 }}>
              <i className="ti ti-alert-triangle" style={{ color: "#EF9F27" }} /> Pour ta sécurité, certaines interactions sont bloquées en roulant.
            </p>
            <Toggle label="Vibrations" desc="Retours haptiques sur les boutons" v={config.vibrations_actives} on={() => toggle("vibrations_actives")} c="#7a6fb0" ic="ti-device-mobile-vibration" />
            <Toggle label="Sons de notification" desc="Bip et alertes audio" v={config.son_actif} on={() => toggle("son_actif")} c="#5aa05a" ic="ti-bell-ringing" />
            <div style={{ padding: 14, background: "rgba(212,94,94,.10)", border: "1px solid rgba(212,94,94,.30)", borderRadius: 10, marginTop: 10 }}>
              <label style={{ color: "#fff", fontWeight: 700, fontSize: 12, display: "block", marginBottom: 6 }}>
                <i className="ti ti-gauge" style={{ color: "#D45E5E", marginRight: 5 }} />
                Vitesse max pour interagir avec l'écran : <strong style={{ color: "#D45E5E" }}>{config.vitesse_max_interaction} km/h</strong>
              </label>
              <input type="range" min={0} max={130} step={5} value={config.vitesse_max_interaction}
                onChange={(e) => set("vitesse_max_interaction", parseInt(e.target.value))}
                style={{ width: "100%" }} />
              <div style={{ color: "rgba(255,255,255,.5)", fontSize: 11, marginTop: 4 }}>
                Au-dessus, l'écran se verrouille en lecture seule. 0 = jamais bloquer.
              </div>
            </div>
            <div style={{ padding: 14, background: "rgba(239,159,39,.10)", border: "1px solid rgba(239,159,39,.30)", borderRadius: 10, marginTop: 10 }}>
              <label style={{ color: "#fff", fontWeight: 700, fontSize: 12, display: "block", marginBottom: 6 }}>
                <i className="ti ti-coffee" style={{ color: "#EF9F27", marginRight: 5 }} />
                Proposer une pause toutes les <strong style={{ color: "#EF9F27" }}>{config.proposer_pause_min} min</strong>
              </label>
              <input type="range" min={30} max={300} step={15} value={config.proposer_pause_min}
                onChange={(e) => set("proposer_pause_min", parseInt(e.target.value))}
                style={{ width: "100%" }} />
              <div style={{ color: "rgba(255,255,255,.5)", fontSize: 11, marginTop: 4 }}>
                Recommandé : 120 min (Code de la route)
              </div>
            </div>
          </ModernCard>
        )}

        {/* TTS */}
        {tab === "tts" && (
          <ModernCard color="#5aa05a" icon="ti-volume" title="Voix de synthèse vocale (TTS)" padding={16}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <Field label="Voix" ic="ti-microphone" c="#5aa05a">
                <select value={config.voix_tts} onChange={(e) => set("voix_tts", e.target.value)} style={selectS}>
                  {VOIX_TTS.map(v => <option key={v.v} value={v.v}>{v.l}</option>)}
                </select>
              </Field>
              <Field label="Langue" ic="ti-language" c="#5aa05a">
                <select value={config.langue_tts} onChange={(e) => set("langue_tts", e.target.value)} style={selectS}>
                  <option value="fr-FR">🇫🇷 Français</option>
                  <option value="en-US">🇺🇸 Anglais</option>
                  <option value="es-ES">🇪🇸 Espagnol</option>
                  <option value="de-DE">🇩🇪 Allemand</option>
                </select>
              </Field>
              <Field label={`Vitesse parole : ${config.vitesse_tts}×`} ic="ti-player-play" c="#5aa05a">
                <input type="range" min={0.5} max={2.0} step={0.1} value={config.vitesse_tts}
                  onChange={(e) => set("vitesse_tts", parseFloat(e.target.value))} style={{ width: "100%" }} />
              </Field>
            </div>
            <button onClick={() => {
              try {
                const u = new SpeechSynthesisUtterance("Test de la synthèse vocale. Bonjour Cédric, Mode Voiture activé.");
                u.lang = config.langue_tts;
                u.rate = config.vitesse_tts;
                window.speechSynthesis.speak(u);
              } catch {}
            }} style={{
              marginTop: 14, padding: "8px 14px",
              background: "linear-gradient(135deg, #5aa05a, #4a8a4a)",
              color: "#fff", border: "none", borderRadius: 8,
              fontFamily: "Quicksand", fontWeight: 700, fontSize: 12, cursor: "pointer",
            }}>
              <i className="ti ti-volume" /> Tester la voix
            </button>
          </ModernCard>
        )}

        {/* NAVIGATION */}
        {tab === "navigation" && (
          <ModernCard color="#185FA5" icon="ti-map-pin" title="Application de navigation" padding={16}>
            <p style={{ color: "rgba(255,255,255,.65)", margin: "0 0 14px", fontSize: 12 }}>
              Quand tu cliques sur "Naviguer" depuis le mode voiture, on ouvre cette app.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              {NAV_OPTIONS.map(opt => {
                const sel = config.navigation_par_defaut === opt.v;
                return (
                  <button key={opt.v} onClick={() => set("navigation_par_defaut", opt.v)} style={{
                    padding: 14, borderRadius: 10,
                    background: sel ? `linear-gradient(135deg, ${COLOR}, ${COLOR}cc)` : "rgba(255,255,255,.06)",
                    color: "#fff", border: `1px solid ${sel ? COLOR+"60" : "rgba(255,255,255,.10)"}`,
                    cursor: "pointer", fontFamily: "Quicksand", fontWeight: 700, fontSize: 13,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  }}>
                    <i className={`ti ${opt.ic}`} style={{ fontSize: 28 }} />
                    {opt.l}
                  </button>
                );
              })}
            </div>
          </ModernCard>
        )}

        {/* CONNECTION */}
        {tab === "connection" && (
          <ModernCard color="#7a6fb0" icon="ti-bluetooth" title="Connexion véhicule" padding={16}>
            <Toggle label="Android Auto" desc="Détection auto + interface compatible" v={config.android_auto_active} on={() => toggle("android_auto_active")} c="#5aa05a" ic="ti-brand-android" />
            <Toggle label="Apple CarPlay" desc="Détection auto + interface compatible" v={config.carplay_actif} on={() => toggle("carplay_actif")} c="#142131" ic="ti-brand-apple" />
            <Toggle label="Bluetooth auto" desc="Détection auto du véhicule en Bluetooth" v={config.bluetooth_auto} on={() => toggle("bluetooth_auto")} c="#185FA5" ic="ti-bluetooth" />
            <Toggle label="Miroir d'écran" desc="Mode miroir si pas CarPlay/Android Auto" v={config.miroir_actif} on={() => toggle("miroir_actif")} c="#7a6fb0" ic="ti-device-mobile" />
          </ModernCard>
        )}

        {/* APPARENCE */}
        {tab === "apparence" && (
          <ModernCard color="#EF9F27" icon="ti-palette" title="Apparence" padding={16}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ color: "#fff", fontWeight: 700, fontSize: 12, display: "block", marginBottom: 8 }}>
                <i className="ti ti-zoom-in" /> Taille des tuiles
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                {TAILLES.map(t => {
                  const sel = config.taille_tuiles === t.v;
                  return (
                    <button key={t.v} onClick={() => set("taille_tuiles", t.v)} style={{
                      padding: 10, borderRadius: 8,
                      background: sel ? `linear-gradient(135deg, #EF9F27, #d28818)` : "rgba(255,255,255,.06)",
                      color: "#fff", border: `1px solid ${sel ? "#EF9F2760" : "rgba(255,255,255,.10)"}`,
                      cursor: "pointer", fontFamily: "Quicksand", fontWeight: 700, fontSize: 12,
                    }}>{t.l}</button>
                  );
                })}
              </div>
            </div>
            <div>
              <label style={{ color: "#fff", fontWeight: 700, fontSize: 12, display: "block", marginBottom: 8 }}>
                <i className="ti ti-palette" /> Thème couleur
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                {THEMES.map(t => {
                  const sel = config.theme_couleur === t.v;
                  return (
                    <button key={t.v} onClick={() => set("theme_couleur", t.v)} style={{
                      padding: 12, borderRadius: 8,
                      background: sel ? `linear-gradient(135deg, ${t.c}, ${t.c}cc)` : "rgba(255,255,255,.06)",
                      color: "#fff", border: `1px solid ${sel ? t.c+"80" : "rgba(255,255,255,.10)"}`,
                      cursor: "pointer", fontFamily: "Quicksand", fontWeight: 700, fontSize: 12,
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, background: t.c, border: "1px solid rgba(255,255,255,.20)" }} />
                      {t.l}
                    </button>
                  );
                })}
              </div>
            </div>
          </ModernCard>
        )}
      </PageShell>
    </>
  );
}

function Toggle({ label, desc, v, on, c, ic }) {
  return (
    <label onClick={on} style={{
      padding: 12, background: v ? `${c}20` : "rgba(255,255,255,.04)",
      border: `1px solid ${v ? c+"50" : "rgba(255,255,255,.08)"}`,
      borderRadius: 10, cursor: "pointer", marginBottom: 8,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <HiTechIconBox name={ic} color={c} variant={v ? "gradient" : "subtle"} size={32} />
      <div style={{ flex: 1 }}>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{label}</div>
        <div style={{ color: "rgba(255,255,255,.55)", fontSize: 11 }}>{desc}</div>
      </div>
      <div style={{ width: 38, height: 20, borderRadius: 10, background: v ? c : "rgba(255,255,255,.10)", position: "relative" }}>
        <div style={{ position: "absolute", top: 2, left: v ? 20 : 2, width: 16, height: 16, borderRadius: 8, background: "#fff", transition: "left 150ms" }} />
      </div>
    </label>
  );
}

function Field({ label, ic, c, children }) {
  return (
    <div>
      <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: c, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.3 }}>
        <i className={`ti ${ic}`} /> {label}
      </label>
      {children}
    </div>
  );
}

const selectS = {
  width: "100%", padding: "8px 10px",
  background: "rgba(255,255,255,.08)", color: "#fff",
  border: "1px solid rgba(255,255,255,.15)",
  borderRadius: 8, fontFamily: "Quicksand", fontSize: 12,
};
