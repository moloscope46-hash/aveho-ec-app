"use client";
// =============================================================
//  app/components/DashboardWidgets.js (0.58.38)
//
//  3 nouveaux widgets opt-in pour le dashboard d'accueil :
//   - CitationWidget : citation du jour (déterministe sur la date)
//   - MiniCalendrierWidget : vue mois courant
//   - LiensFavorisWidget : 8 slots configurables (localStorage av-favorite-links)
// =============================================================

import { useEffect, useState } from "react";
import { Panel } from "../ui";
import { dialogs } from "../dialogs";

// 30 citations soigneusement choisies (pas trop perso, pas trop corporate)
const CITATIONS = [
  { t: "La qualité, c'est faire bien même quand personne ne regarde.", a: "Henry Ford" },
  { t: "Le secret pour avancer, c'est commencer.", a: "Mark Twain" },
  { t: "Prendre soin de soi, c'est prendre soin de tout le monde.", a: "Audre Lorde" },
  { t: "Ce n'est pas parce que c'est difficile que nous n'osons pas, c'est parce que nous n'osons pas que c'est difficile.", a: "Sénèque" },
  { t: "Le meilleur moyen de prédire l'avenir est de le créer.", a: "Peter Drucker" },
  { t: "La simplicité est la sophistication suprême.", a: "Léonard de Vinci" },
  { t: "L'apprentissage est une expérience. Tout le reste est juste de l'information.", a: "Albert Einstein" },
  { t: "Faire de votre passion votre métier, c'est ne plus jamais avoir à travailler.", a: "Confucius" },
  { t: "On n'est jamais aussi vulnérable que quand on aime, mais c'est aussi la seule façon de vivre pleinement.", a: "Maya Angelou" },
  { t: "Le courage, ce n'est pas de ne pas avoir peur ; c'est d'agir malgré la peur.", a: "Nelson Mandela" },
  { t: "Aide-toi, le ciel t'aidera.", a: "Jean de La Fontaine" },
  { t: "Un voyage de mille lieues commence toujours par un premier pas.", a: "Lao Tseu" },
  { t: "Le seul vrai voyage, ce ne serait pas d'aller vers de nouveaux paysages, mais d'avoir d'autres yeux.", a: "Marcel Proust" },
  { t: "On ne voit bien qu'avec le cœur. L'essentiel est invisible pour les yeux.", a: "Antoine de Saint-Exupéry" },
  { t: "La vie, c'est comme une bicyclette : pour conserver l'équilibre, il faut avancer.", a: "Albert Einstein" },
  { t: "Donne à chaque jour la chance d'être le plus beau de ta vie.", a: "Mark Twain" },
  { t: "Le succès, c'est tomber sept fois, se relever huit.", a: "Proverbe japonais" },
  { t: "Ce que nous sommes est le résultat de ce que nous avons pensé.", a: "Bouddha" },
  { t: "L'optimisme est la foi qui mène à la réussite.", a: "Helen Keller" },
  { t: "L'imagination est plus importante que la connaissance.", a: "Albert Einstein" },
  { t: "Soyez le changement que vous voulez voir dans le monde.", a: "Gandhi" },
  { t: "La gentillesse est un langage que les sourds peuvent entendre et que les aveugles peuvent voir.", a: "Mark Twain" },
  { t: "On ne change pas les choses en combattant la réalité existante. Pour changer quelque chose, construis un nouveau modèle qui rend l'ancien obsolète.", a: "R. Buckminster Fuller" },
  { t: "Toute action humaine, qu'elle devienne positive ou négative, doit dépendre de la motivation.", a: "Dalaï Lama" },
  { t: "La connaissance s'acquiert par l'expérience, tout le reste n'est que de l'information.", a: "Albert Einstein" },
  { t: "Il n'y a pas de bonheur dans la faiblesse, pas encore s'attarder dans la faiblesse de la vie.", a: "Lao Tseu" },
  { t: "Le plus grand risque est de ne prendre aucun risque.", a: "Mark Zuckerberg" },
  { t: "La meilleure façon de commencer est d'arrêter de parler et de commencer à faire.", a: "Walt Disney" },
  { t: "Réussir, c'est passer d'échec en échec sans perdre son enthousiasme.", a: "Winston Churchill" },
  { t: "Le futur appartient à ceux qui croient à la beauté de leurs rêves.", a: "Eleanor Roosevelt" },
];

// Hash simple : transforme une date YYYY-MM-DD en index dans CITATIONS
function pickCitation() {
  const d = new Date();
  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return CITATIONS[Math.abs(hash) % CITATIONS.length];
}

// ============================================================
//  CitationWidget — citation du jour
// ============================================================
export function CitationWidget() {
  const [c, setC] = useState(null);
  // 0.58.39 : permet de piocher une autre citation random (sans changer celle du jour)
  const [overrideIdx, setOverrideIdx] = useState(null);

  useEffect(() => {
    if (overrideIdx === null) setC(pickCitation());
    else setC(CITATIONS[overrideIdx % CITATIONS.length]);
  }, [overrideIdx]);

  function pickAnother() {
    // Pioche au hasard une citation différente de celle en cours
    let next;
    do { next = Math.floor(Math.random() * CITATIONS.length); }
    while (CITATIONS[next] === c && CITATIONS.length > 1);
    setOverrideIdx(next);
  }

  function backToDaily() {
    setOverrideIdx(null);
  }

  if (!c) return null;
  return (
    <Panel style={{ marginTop: 0, background: "linear-gradient(135deg, #fff 0%, #fff5f3 100%)", borderColor: "#e8c5bf", position: "relative", overflow: "hidden" }}>
      {/* Quote mark décoratif */}
      <i className="ti ti-quote" style={{
        position: "absolute", top: 8, right: 14,
        color: "#C9867F", opacity: 0.18, fontSize: 56,
        pointerEvents: "none",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <p style={{
          margin: 0, fontSize: 14.5, lineHeight: 1.55, fontStyle: "italic",
          color: "#5a4540", fontWeight: 500,
        }}>« {c.t} »</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 8 }}>
          <p style={{ margin: 0, fontSize: 12, color: "#C9867F", fontWeight: 700, flex: 1, textAlign: "right" }}>
            — {c.a}
          </p>
          {/* 0.58.39 : bouton 'Une autre' / 'Retour citation du jour' */}
          <button
            onClick={overrideIdx === null ? pickAnother : backToDaily}
            title={overrideIdx === null ? "Piocher une autre citation au hasard" : "Revenir à la citation du jour"}
            style={{
              background: "transparent",
              border: "1px solid #e8c5bf",
              color: "#C9867F",
              padding: "3px 10px",
              borderRadius: 99,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              flexShrink: 0,
              transition: "all 150ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#C9867F";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#C9867F";
            }}
          >
            <i className={`ti ${overrideIdx === null ? "ti-dice" : "ti-arrow-back"}`} />
            {overrideIdx === null ? "Une autre" : "Du jour"}
          </button>
        </div>
      </div>
    </Panel>
  );
}

// ============================================================
//  MiniCalendrierWidget — calendrier mensuel
// ============================================================
const FR_MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const FR_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function MiniCalendrierWidget() {
  const [today, setToday] = useState(null);
  const [viewMonth, setViewMonth] = useState(null); // {year, month}
  useEffect(() => {
    const d = new Date();
    setToday(d);
    setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
  }, []);
  if (!today || !viewMonth) return null;

  const firstDay = new Date(viewMonth.year, viewMonth.month, 1);
  const lastDay = new Date(viewMonth.year, viewMonth.month + 1, 0);
  // Décalage lundi-based : getDay() retourne 0=dimanche, on veut 0=lundi
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (day) => day === today.getDate() &&
    viewMonth.year === today.getFullYear() &&
    viewMonth.month === today.getMonth();

  function shiftMonth(delta) {
    const d = new Date(viewMonth.year, viewMonth.month + delta, 1);
    setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
  }

  return (
    <Panel style={{ marginTop: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => shiftMonth(-1)} aria-label="Mois précédent" style={{
          background: "transparent", border: "1px solid #e3e9ee", borderRadius: 8,
          width: 28, height: 28, cursor: "pointer", color: "#185FA5", fontFamily: "inherit",
        }}>
          <i className="ti ti-chevron-left" />
        </button>
        <h2 style={{ margin: 0, fontSize: 15, color: "#142131" }}>
          <i className="ti ti-calendar" style={{ color: "#5a8f8f", marginRight: 6 }} />
          {FR_MONTHS[viewMonth.month]} {viewMonth.year}
        </h2>
        <button onClick={() => shiftMonth(1)} aria-label="Mois suivant" style={{
          background: "transparent", border: "1px solid #e3e9ee", borderRadius: 8,
          width: 28, height: 28, cursor: "pointer", color: "#185FA5", fontFamily: "inherit",
        }}>
          <i className="ti ti-chevron-right" />
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, fontSize: 11 }}>
        {FR_DAYS.map(d => (
          <div key={d} style={{ padding: 6, textAlign: "center", fontWeight: 700, color: "#8a98a8", textTransform: "uppercase", letterSpacing: 0.4, fontSize: 10 }}>
            {d}
          </div>
        ))}
        {cells.map((day, i) => (
          <div key={i} style={{
            padding: 8, textAlign: "center", borderRadius: 6,
            background: isToday(day) ? "linear-gradient(135deg, #7CC8C8, #5a8f8f)" : "transparent",
            color: isToday(day) ? "#fff" : day ? "#142131" : "transparent",
            fontWeight: isToday(day) ? 700 : 500,
            fontSize: 13,
            boxShadow: isToday(day) ? "0 4px 12px rgba(124,200,200,.40)" : "none",
            transition: "all 150ms",
          }}>
            {day || ""}
          </div>
        ))}
      </div>
      <p style={{ margin: "12px 0 0", fontSize: 11.5, color: "#5a8f8f", textAlign: "center" }}>
        <i className="ti ti-sparkles" /> Aujourd'hui : {today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
      </p>
    </Panel>
  );
}

// ============================================================
//  LiensFavorisWidget — 8 liens configurables
// ============================================================
const FAV_STORAGE_KEY = "av-favorite-links";
const FAV_MAX = 8;
const DEFAULT_FAVS = [];

function getFavLinks() {
  if (typeof window === "undefined") return DEFAULT_FAVS;
  try {
    const raw = localStorage.getItem(FAV_STORAGE_KEY);
    if (!raw) return DEFAULT_FAVS;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, FAV_MAX) : DEFAULT_FAVS;
  } catch { return DEFAULT_FAVS; }
}

function setFavLinks(arr) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(arr.slice(0, FAV_MAX))); } catch {}
}

export function LiensFavorisWidget() {
  const [favs, setFavs] = useState([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setFavs(getFavLinks());
    setMounted(true);
  }, []);

  async function addFav() {
    if (favs.length >= FAV_MAX) {
      await dialogs.alert({ title: "Limite atteinte", message: `Maximum ${FAV_MAX} liens favoris.` });
      return;
    }
    const label = await dialogs.prompt({ title: "Nouveau lien favori", message: "Libellé :", placeholder: "Ex : Documentation PERFADOM" });
    if (!label) return;
    const url = await dialogs.prompt({ title: "URL du lien", message: "URL complète (interne /xxx ou externe https://...)", placeholder: "/interventions ou https://..." });
    if (!url) return;
    const next = [...favs, { label: label.slice(0, 32), url }];
    setFavs(next);
    setFavLinks(next);
  }

  // 0.58.39 : édition d'un lien existant
  async function editFav(idx) {
    const current = favs[idx];
    if (!current) return;
    const label = await dialogs.prompt({
      title: "Modifier le libellé",
      message: "Libellé :",
      defaultValue: current.label,
      placeholder: "Libellé du lien",
    });
    if (label === null) return; // annulation
    const url = await dialogs.prompt({
      title: "Modifier l'URL",
      message: "URL complète (interne /xxx ou externe https://...)",
      defaultValue: current.url,
      placeholder: "/interventions ou https://...",
    });
    if (url === null) return;
    const next = favs.map((f, i) => i === idx ? { label: label.slice(0, 32) || current.label, url: url || current.url } : f);
    setFavs(next);
    setFavLinks(next);
  }

  async function removeFav(idx) {
    const ok = await dialogs.confirm({
      title: "Supprimer ce lien ?",
      message: `« ${favs[idx]?.label || ""} »`,
      confirmLabel: "Supprimer",
      cancelLabel: "Annuler",
      variant: "warning",
    });
    if (!ok) return;
    const next = favs.filter((_, i) => i !== idx);
    setFavs(next);
    setFavLinks(next);
  }

  if (!mounted) return null;
  return (
    <Panel style={{ marginTop: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15 }}>
          <i className="ti ti-bookmark" style={{ color: "#e35d5b", marginRight: 6 }} /> Liens favoris
        </h2>
        <button onClick={addFav} disabled={favs.length >= FAV_MAX} style={{
          background: favs.length >= FAV_MAX ? "#cfd8e0" : "linear-gradient(135deg, #e35d5b, #c0392b)",
          color: "#fff", border: "none",
          padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          cursor: favs.length >= FAV_MAX ? "not-allowed" : "pointer",
          fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4,
        }}>
          <i className="ti ti-plus" /> Ajouter
        </button>
      </div>
      {favs.length === 0 ? (
        <div style={{
          padding: 20, textAlign: "center", color: "#8a98a8", fontSize: 13,
          background: "#fff5f3", border: "1px dashed #e8c5bf", borderRadius: 10,
        }}>
          <i className="ti ti-bookmark-off" style={{ fontSize: 28, color: "#C9867F", display: "block", marginBottom: 8 }} />
          Aucun favori. Clique sur "Ajouter" pour créer ton premier raccourci personnel.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
          {favs.map((f, idx) => (
            <div key={idx} style={{ position: "relative" }}>
              <a
                href={f.url}
                onClick={(e) => {
                  // Si URL externe, ouvrir nouveau onglet ; sinon laisse Next router
                  if (/^https?:\/\//.test(f.url)) {
                    e.preventDefault();
                    window.open(f.url, "_blank", "noopener,noreferrer");
                  }
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                  border: "1px solid #e8c5bf", borderRadius: 10, background: "#fff",
                  fontFamily: "inherit", fontSize: 12.5, fontWeight: 600,
                  color: "#142131", textDecoration: "none",
                  transition: "all 150ms", cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#fff5f3";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(227,93,91,.20)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <i className={`ti ${/^https?:\/\//.test(f.url) ? "ti-external-link" : "ti-link"}`} style={{ color: "#e35d5b", fontSize: 14, flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.label}</span>
              </a>
              {/* 0.58.39 : bouton éditer */}
              <button
                onClick={() => editFav(idx)}
                aria-label={`Modifier ${f.label}`}
                title="Modifier"
                style={{
                  position: "absolute", top: -6, right: 18,
                  background: "#185FA5", color: "#fff",
                  border: "2px solid #fff", width: 20, height: 20, borderRadius: "50%",
                  cursor: "pointer", padding: 0, fontSize: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(24,95,165,.40)",
                  opacity: 0, transition: "opacity 150ms",
                }}
                className="av-fav-edit"
              >
                <i className="ti ti-pencil" />
              </button>
              <button
                onClick={() => removeFav(idx)}
                aria-label={`Supprimer ${f.label}`}
                style={{
                  position: "absolute", top: -6, right: -6,
                  background: "#e35d5b", color: "#fff",
                  border: "2px solid #fff", width: 20, height: 20, borderRadius: "50%",
                  cursor: "pointer", padding: 0, fontSize: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(227,93,91,.40)",
                  opacity: 0, transition: "opacity 150ms",
                }}
                className="av-fav-remove"
              >
                <i className="ti ti-x" />
              </button>
            </div>
          ))}
        </div>
      )}
      <style jsx global>{`
        .av-shortcuts-bar button:hover .av-shortcut-tooltip { opacity: 1; }
        div[class] > .av-fav-remove, div[class] > .av-fav-edit { display: none; }
        div:hover > .av-fav-remove, div:hover > .av-fav-edit { display: flex !important; opacity: 1 !important; }
      `}</style>
    </Panel>
  );
}

// ============================================================
//  WeatherWidget — météo locale (0.58.39)
//
//  Utilise navigator.geolocation pour récupérer les coords de l'user
//  puis l'API publique Open-Meteo (https://open-meteo.com, gratuite,
//  sans clé API, sans tracking). Cache la position en localStorage
//  pour ne pas redemander à chaque visite.
// ============================================================

const GEO_STORAGE_KEY = "av-weather-geo";
const GEO_TTL_MS = 24 * 60 * 60 * 1000;  // 24h
// Mapping codes météo Open-Meteo → emoji + label
const WMO = {
  0: { e: "☀️", l: "Ciel dégagé" },
  1: { e: "🌤", l: "Plutôt dégagé" },
  2: { e: "⛅", l: "Partiellement nuageux" },
  3: { e: "☁️", l: "Couvert" },
  45: { e: "🌫", l: "Brouillard" }, 48: { e: "🌫", l: "Brouillard givrant" },
  51: { e: "🌦", l: "Bruine légère" }, 53: { e: "🌦", l: "Bruine modérée" }, 55: { e: "🌧", l: "Bruine forte" },
  61: { e: "🌧", l: "Pluie légère" }, 63: { e: "🌧", l: "Pluie modérée" }, 65: { e: "🌧", l: "Pluie forte" },
  71: { e: "🌨", l: "Neige légère" }, 73: { e: "🌨", l: "Neige modérée" }, 75: { e: "❄️", l: "Neige forte" },
  80: { e: "🌦", l: "Averses légères" }, 81: { e: "🌧", l: "Averses modérées" }, 82: { e: "⛈", l: "Averses violentes" },
  95: { e: "⛈", l: "Orage" }, 96: { e: "⛈", l: "Orage + grêle" }, 99: { e: "⛈", l: "Orage violent" },
};

export function WeatherWidget() {
  const [state, setState] = useState({ status: "init", data: null, geo: null, error: null });

  useEffect(() => {
    let alive = true;
    (async () => {
      // 1) Tente de récupérer la géoloc cachée
      let geo = null;
      try {
        const raw = localStorage.getItem(GEO_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.ts && Date.now() - parsed.ts < GEO_TTL_MS) {
            geo = { lat: parsed.lat, lng: parsed.lng };
          }
        }
      } catch {}

      // 2) Sinon, demande la géoloc browser
      if (!geo) {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          if (alive) setState({ status: "error", data: null, geo: null, error: "Géolocalisation indisponible" });
          return;
        }
        try {
          geo = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              (err) => reject(err),
              { timeout: 8000, maximumAge: 30 * 60 * 1000 },
            );
          });
          try { localStorage.setItem(GEO_STORAGE_KEY, JSON.stringify({ ...geo, ts: Date.now() })); } catch {}
        } catch (err) {
          if (alive) setState({ status: "error", data: null, geo: null, error: err?.message || "Permission refusée" });
          return;
        }
      }

      // 3) Appelle l'API Open-Meteo
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lng}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        if (!alive) return;
        setState({ status: "ok", data: json.current, geo, error: null });
      } catch (err) {
        if (alive) setState({ status: "error", data: null, geo, error: err?.message || "Erreur API" });
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <Panel style={{ marginTop: 0, background: "linear-gradient(135deg, #e0f4ff 0%, #fff 100%)", borderColor: "#bce0f7" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15, color: "#185FA5" }}>
          <i className="ti ti-cloud" style={{ marginRight: 6, color: "#2a7ed1" }} /> Météo locale
        </h2>
        {state.status === "ok" && state.geo && (
          <span style={{ fontSize: 10.5, color: "#5a8888", fontFamily: "Consolas, monospace" }}>
            {state.geo.lat.toFixed(2)}, {state.geo.lng.toFixed(2)}
          </span>
        )}
      </div>

      {state.status === "init" && (
        <p style={{ margin: 0, color: "#8a98a8", fontSize: 12.5, textAlign: "center", padding: "16px 0" }}>
          <i className="ti ti-loader ti-spin" /> Chargement de la météo...
        </p>
      )}

      {state.status === "error" && (
        <div style={{ padding: "16px 12px", background: "#fff5f3", border: "1px dashed #e8c5bf", borderRadius: 10, color: "#8a5e58", fontSize: 12.5, textAlign: "center" }}>
          <i className="ti ti-cloud-off" style={{ fontSize: 24, display: "block", marginBottom: 6, color: "#C9867F" }} />
          Météo indisponible<br/>
          <span style={{ fontSize: 11, opacity: 0.7 }}>{state.error}</span>
        </div>
      )}

      {state.status === "ok" && state.data && (() => {
        const code = state.data.weather_code;
        const wmo = WMO[code] || { e: "🌡", l: "Conditions" };
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 56, lineHeight: 1, filter: "drop-shadow(0 4px 8px rgba(24,95,165,.30))" }}>
              {wmo.e}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#185FA5", lineHeight: 1 }}>
                {Math.round(state.data.temperature_2m)}°<span style={{ fontSize: 18, color: "#5a8888" }}>C</span>
              </div>
              <div style={{ fontSize: 12.5, color: "#5a8888", marginTop: 4 }}>{wmo.l}</div>
              <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 6, display: "flex", gap: 12 }}>
                <span><i className="ti ti-wind" /> {Math.round(state.data.wind_speed_10m)} km/h</span>
                <span><i className="ti ti-droplet" /> {state.data.relative_humidity_2m}%</span>
              </div>
            </div>
          </div>
        );
      })()}

      <style jsx global>{`
        .ti-spin {
          display: inline-block;
          animation: av-weather-spin 1.4s linear infinite;
        }
        @keyframes av-weather-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Panel>
  );
}
