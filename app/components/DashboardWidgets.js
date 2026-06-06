"use client";
// =============================================================
//  app/components/DashboardWidgets.js (0.58.38)
//
//  3 nouveaux widgets opt-in pour le dashboard d'accueil :
//   - CitationWidget : citation du jour (déterministe sur la date)
//   - MiniCalendrierWidget : vue mois courant
//   - LiensFavorisWidget : 8 slots configurables (localStorage av-favorite-links)
// =============================================================

import { useEffect, useState, useRef } from "react";
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
  // 0.58.40 : drag&drop pour réordonner
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  useEffect(() => {
    setFavs(getFavLinks());
    setMounted(true);
  }, []);

  // 0.58.40 : Handlers drag&drop natif HTML5
  function handleDragStart(idx) { setDragIdx(idx); }
  function handleDragOver(e, idx) { e.preventDefault(); setDragOverIdx(idx); }
  function handleDragLeave() { setDragOverIdx(null); }
  function handleDragEnd() { setDragIdx(null); setDragOverIdx(null); }
  function handleDrop(e, targetIdx) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null); setDragOverIdx(null);
      return;
    }
    const next = [...favs];
    const [removed] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, removed);
    setFavs(next);
    setFavLinks(next);
    setDragIdx(null); setDragOverIdx(null);
  }

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
      {/* 0.58.40 : hint drag&drop si 2+ favoris */}
      {favs.length >= 2 && (
        <p style={{ margin: "0 0 10px", fontSize: 11, color: "#8a98a8", fontStyle: "italic", display: "inline-flex", alignItems: "center", gap: 4 }}>
          <i className="ti ti-grip-vertical" style={{ fontSize: 13 }} /> Glisse pour réordonner
        </p>
      )}
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
            <div
              key={idx}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              style={{
                position: "relative",
                opacity: dragIdx === idx ? 0.4 : 1,
                transform: dragOverIdx === idx && dragIdx !== idx ? "translateY(-2px)" : "translateY(0)",
                transition: "all 150ms",
                cursor: dragIdx === idx ? "grabbing" : "grab",
                outline: dragOverIdx === idx && dragIdx !== idx ? "2px dashed #e35d5b" : "none",
                outlineOffset: 2,
                borderRadius: 10,
              }}
            >
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
  const [state, setState] = useState({ status: "init", data: null, geo: null, locationName: null, forecast: null, error: null });
  // 0.58.40 : auto-refresh toutes les 30min
  const [refreshTick, setRefreshTick] = useState(0);
  // 0.58.44 : toggle pour afficher les prévisions des 3 prochains jours
  const [showForecast, setShowForecast] = useState(false);
  // 0.58.46 : focus sur un jour des prévisions (0/1/2) pour afficher détails
  const [focusForecastIdx, setFocusForecastIdx] = useState(null);
  // 0.58.46 : ref pour le touchstart (swipe mobile)
  const touchStartX = useRef(null);

  useEffect(() => {
    // Auto-refresh toutes les 30min : déclenche un re-fetch
    const interval = setInterval(() => setRefreshTick(t => t + 1), 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      // 1) Tente de récupérer la géoloc cachée
      let geo = null;
      let cachedLocationName = null;
      try {
        const raw = localStorage.getItem(GEO_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.ts && Date.now() - parsed.ts < GEO_TTL_MS) {
            geo = { lat: parsed.lat, lng: parsed.lng };
            cachedLocationName = parsed.locationName || null;
          }
        }
      } catch {}

      // 2) Sinon, demande la géoloc browser
      if (!geo) {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          if (alive) setState({ status: "error", data: null, geo: null, locationName: null, forecast: null, error: "Géolocalisation indisponible" });
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
        } catch (err) {
          if (alive) setState({ status: "error", data: null, geo: null, locationName: null, forecast: null, error: err?.message || "Permission refusée" });
          return;
        }
      }

      // 3) Géocodage inverse pour avoir le nom de la ville (BAN API française, gratuite, sans clé)
      //    On le fait avant la météo, mais on n'attend pas le résultat (parallèle)
      let locationName = cachedLocationName;
      let geocodePromise = null;
      if (!locationName) {
        geocodePromise = (async () => {
          try {
            // BAN : couvre la France. Pour les autres pays, fallback Open-Meteo geocoding API
            const banUrl = `https://api-adresse.data.gouv.fr/reverse/?lon=${geo.lng}&lat=${geo.lat}`;
            const r = await fetch(banUrl);
            if (r.ok) {
              const json = await r.json();
              const feature = json?.features?.[0];
              if (feature?.properties) {
                const p = feature.properties;
                return p.city || p.name || p.postcode || null;
              }
            }
            // Fallback Open-Meteo geocoding (mondial)
            const omUrl = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${geo.lat}&longitude=${geo.lng}&language=fr&count=1`;
            const r2 = await fetch(omUrl);
            if (r2.ok) {
              const json2 = await r2.json();
              const res = json2?.results?.[0];
              if (res) return res.name + (res.country ? ` (${res.country})` : "");
            }
          } catch {}
          return null;
        })();
      }

      // 4) Appelle l'API Open-Meteo enrichie
      try {
        // 0.58.44 : on demande beaucoup plus de données (current + daily 3j + ressenti + min/max + lever/coucher + pluie + visibilité + pression)
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lng}` +
          `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,precipitation,pressure_msl,cloud_cover,visibility` +
          `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset,uv_index_max,wind_speed_10m_max` +
          `&timezone=auto&forecast_days=4`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        if (!alive) return;
        // Récupère le nom de la ville si on l'attend
        if (geocodePromise) {
          locationName = await geocodePromise;
        }
        // Cache la géoloc + locationName
        try { localStorage.setItem(GEO_STORAGE_KEY, JSON.stringify({ ...geo, locationName, ts: Date.now() })); } catch {}
        setState({
          status: "ok",
          data: json.current,
          geo,
          locationName,
          forecast: json.daily,
          error: null,
          lastFetch: Date.now(),
        });
      } catch (err) {
        if (alive) setState({ status: "error", data: null, geo, locationName: null, forecast: null, error: err?.message || "Erreur API" });
      }
    })();
    return () => { alive = false; };
  }, [refreshTick]);  // 0.58.40 : se redéclenche au refresh tick

  // 0.58.44 : helper pour la direction du vent (cardinal)
  function windDirCardinal(deg) {
    if (deg == null) return "";
    const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
    return dirs[Math.round(deg / 45) % 8];
  }
  // 0.58.44 : formatte heure depuis ISO string
  function formatTime(iso) {
    if (!iso) return "";
    try { return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
  }
  // 0.58.44 : formatte jour court (Lun, Mar, Mer)
  function formatDayShort(iso) {
    if (!iso) return "";
    try { return new Date(iso).toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""); } catch { return ""; }
  }

  return (
    <Panel style={{ marginTop: 0, background: "linear-gradient(135deg, #e0f4ff 0%, #fff 100%)", borderColor: "#bce0f7" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15, color: "#185FA5", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <i className="ti ti-cloud" style={{ color: "#2a7ed1" }} />
          {/* 0.58.44 : affiche le nom du lieu dans le titre */}
          {state.status === "ok" && state.locationName ? (
            <>Météo · <span style={{ color: "#142131" }}>{state.locationName}</span></>
          ) : "Météo locale"}
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {state.status === "ok" && state.geo && (
            <span style={{ fontSize: 10, color: "#5a8888", fontFamily: "Consolas, monospace", opacity: 0.7 }} title={`Coordonnées GPS : ${state.geo.lat.toFixed(4)}, ${state.geo.lng.toFixed(4)}`}>
              {state.geo.lat.toFixed(2)}, {state.geo.lng.toFixed(2)}
            </span>
          )}
          {/* 0.58.44 : toggle prévisions */}
          {state.status === "ok" && state.forecast && (
            <button
              onClick={() => setShowForecast(s => !s)}
              aria-label="Voir les prévisions"
              title={showForecast ? "Masquer prévisions" : "Voir prévisions 3 jours"}
              style={{
                background: showForecast ? "rgba(24,95,165,.15)" : "transparent",
                border: "1px solid rgba(24,95,165,.20)",
                color: "#185FA5",
                borderRadius: 6, width: 24, height: 24, cursor: "pointer", padding: 0,
                display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11,
                transition: "all 150ms",
              }}
            >
              <i className="ti ti-calendar" />
            </button>
          )}
          {/* 0.58.40 : bouton refresh manuel */}
          <button
            onClick={() => setRefreshTick(t => t + 1)}
            aria-label="Rafraîchir la météo"
            title="Rafraîchir maintenant (auto toutes les 30min)"
            style={{
              background: "transparent",
              border: "1px solid rgba(24,95,165,.20)",
              color: "#185FA5",
              borderRadius: 6,
              width: 24, height: 24,
              cursor: "pointer",
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              transition: "all 150ms",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(24,95,165,.10)"; e.currentTarget.style.transform = "rotate(45deg)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "rotate(0deg)"; }}
          >
            <i className="ti ti-refresh" />
          </button>
        </div>
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
        const dailyMax = state.forecast?.temperature_2m_max?.[0];
        const dailyMin = state.forecast?.temperature_2m_min?.[0];
        const precipSum = state.forecast?.precipitation_sum?.[0];
        const uv = state.forecast?.uv_index_max?.[0];
        const sunrise = state.forecast?.sunrise?.[0];
        const sunset = state.forecast?.sunset?.[0];
        const visKm = state.data.visibility != null ? Math.round(state.data.visibility / 1000) : null;
        const apparent = state.data.apparent_temperature;
        const dirCard = windDirCardinal(state.data.wind_direction_10m);
        const windMax = state.forecast?.wind_speed_10m_max?.[0];

        // 0.58.44 : couleur UV
        const uvColor = uv == null ? "#8a98a8" : (uv <= 2 ? "#5aa05a" : uv <= 5 ? "#EF9F27" : uv <= 7 ? "#e35d5b" : "#7a3030");
        const uvLabel = uv == null ? "" : (uv <= 2 ? "Faible" : uv <= 5 ? "Modéré" : uv <= 7 ? "Élevé" : "Très élevé");

        // 0.58.45 : vigilance "maison" basée sur les seuils des données récupérées
        // Niveaux : 0=vert, 1=jaune, 2=orange, 3=rouge (calque sur les couleurs Météo France)
        const alerts = [];
        const tempMax = dailyMax;
        const tempMin = dailyMin;
        const windToCheck = Math.max(state.data.wind_speed_10m || 0, windMax || 0);
        // Codes WMO dangereux (orages, neige forte, grêle)
        const dangerousCodes = [95, 96, 99, 75, 86]; // 95-99=orages, 75=neige forte, 86=averses neige fortes
        // Vent
        if (windToCheck >= 90) alerts.push({ level: 3, icon: "ti-wind", label: "Vent violent", value: `${Math.round(windToCheck)} km/h` });
        else if (windToCheck >= 70) alerts.push({ level: 2, icon: "ti-wind", label: "Vent fort", value: `${Math.round(windToCheck)} km/h` });
        else if (windToCheck >= 50) alerts.push({ level: 1, icon: "ti-wind", label: "Vent soutenu", value: `${Math.round(windToCheck)} km/h` });
        // Précipitations
        if (precipSum >= 50) alerts.push({ level: 3, icon: "ti-cloud-rain", label: "Pluie extrême", value: `${precipSum.toFixed(0)} mm` });
        else if (precipSum >= 30) alerts.push({ level: 2, icon: "ti-cloud-rain", label: "Forte pluie", value: `${precipSum.toFixed(0)} mm` });
        else if (precipSum >= 15) alerts.push({ level: 1, icon: "ti-cloud-rain", label: "Pluie soutenue", value: `${precipSum.toFixed(0)} mm` });
        // UV
        if (uv >= 10) alerts.push({ level: 3, icon: "ti-sun", label: "UV extrême", value: `Indice ${Math.round(uv)}` });
        else if (uv >= 8) alerts.push({ level: 2, icon: "ti-sun", label: "UV très élevé", value: `Indice ${Math.round(uv)}` });
        // Canicule
        if (tempMax >= 38) alerts.push({ level: 3, icon: "ti-temperature-sun", label: "Canicule extrême", value: `${Math.round(tempMax)}°C` });
        else if (tempMax >= 33) alerts.push({ level: 2, icon: "ti-temperature-sun", label: "Forte chaleur", value: `${Math.round(tempMax)}°C` });
        else if (tempMax >= 28) alerts.push({ level: 1, icon: "ti-temperature-sun", label: "Chaleur", value: `${Math.round(tempMax)}°C` });
        // Grand froid
        if (tempMin <= -10) alerts.push({ level: 3, icon: "ti-temperature-snow", label: "Grand froid", value: `${Math.round(tempMin)}°C` });
        else if (tempMin <= -5) alerts.push({ level: 2, icon: "ti-temperature-snow", label: "Froid sévère", value: `${Math.round(tempMin)}°C` });
        else if (tempMin <= 0) alerts.push({ level: 1, icon: "ti-snowflake", label: "Gel", value: `${Math.round(tempMin)}°C` });
        // Orage / phénomène dangereux
        if (dangerousCodes.includes(code)) alerts.push({ level: 2, icon: "ti-bolt", label: wmo.l, value: "En cours" });
        // Niveau global = max des niveaux
        const maxLevel = alerts.length ? Math.max(...alerts.map(a => a.level)) : 0;
        const vigilanceColors = {
          1: { bg: "linear-gradient(135deg, #fef9c3, #fef3c7)", border: "#EF9F27", text: "#7a4f15", label: "JAUNE" },
          2: { bg: "linear-gradient(135deg, #fed7aa, #fdba74)", border: "#e35d5b", text: "#7a3030", label: "ORANGE" },
          3: { bg: "linear-gradient(135deg, #fecaca, #fca5a5)", border: "#7a3030", text: "#5c1818", label: "ROUGE" },
        };
        const vigColors = vigilanceColors[maxLevel];

        return (
          <>
            {/* 0.58.45 : bannière vigilance météo si niveau >= 1 */}
            {maxLevel >= 1 && vigColors && (
              <div style={{
                background: vigColors.bg,
                border: `1px solid ${vigColors.border}`,
                borderLeft: `4px solid ${vigColors.border}`,
                borderRadius: 8,
                padding: "8px 12px",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}>
                <span style={{
                  background: vigColors.border,
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 1,
                  padding: "3px 8px",
                  borderRadius: 4,
                  textTransform: "uppercase",
                }}>
                  <i className="ti ti-alert-triangle" /> Vigilance {vigColors.label}
                </span>
                <span style={{ flex: 1, fontSize: 12, color: vigColors.text, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {alerts.filter(a => a.level === maxLevel).map((a, i) => (
                    <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <i className={`ti ${a.icon}`} />
                      <b>{a.label}</b>
                      <span style={{ opacity: 0.75 }}>({a.value})</span>
                    </span>
                  ))}
                </span>
              </div>
            )}

            {/* Bloc principal : emoji + temp + résumé */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 64, lineHeight: 1, filter: "drop-shadow(0 4px 12px rgba(24,95,165,.30))" }}>
                {wmo.e}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: "#185FA5", lineHeight: 1 }}>
                  {Math.round(state.data.temperature_2m)}°<span style={{ fontSize: 18, color: "#5a8888" }}>C</span>
                </div>
                <div style={{ fontSize: 13, color: "#5a8888", marginTop: 4, fontWeight: 600 }}>{wmo.l}</div>
                {/* 0.58.44 : ressenti */}
                {apparent != null && Math.abs(apparent - state.data.temperature_2m) >= 1 && (
                  <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 3 }}>
                    Ressenti <b style={{ color: "#5a8888" }}>{Math.round(apparent)}°C</b>
                  </div>
                )}
              </div>
              {/* 0.58.44 : min/max du jour à droite */}
              {(dailyMax != null || dailyMin != null) && (
                <div style={{ textAlign: "right", borderLeft: "1px solid #bce0f7", paddingLeft: 12 }}>
                  <div style={{ fontSize: 11, color: "#8a98a8", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>Aujourd'hui</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <i className="ti ti-arrow-up" style={{ color: "#e35d5b", fontSize: 12 }} />
                    <b style={{ fontSize: 14, color: "#e35d5b" }}>{Math.round(dailyMax)}°</b>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                    <i className="ti ti-arrow-down" style={{ color: "#2a7ed1", fontSize: 12 }} />
                    <b style={{ fontSize: 14, color: "#2a7ed1" }}>{Math.round(dailyMin)}°</b>
                  </div>
                </div>
              )}
            </div>

            {/* 0.58.44 : grille d'infos détaillées (8 valeurs) */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 6,
              padding: "10px 0",
              borderTop: "1px solid #bce0f7",
              borderBottom: state.data.precipitation > 0 || precipSum > 0 ? "none" : "1px solid #bce0f7",
            }}>
              <div title="Vitesse du vent" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#8a98a8", marginBottom: 2 }}><i className="ti ti-wind" /> Vent</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#185FA5" }}>
                  {Math.round(state.data.wind_speed_10m)}<span style={{ fontSize: 10, color: "#8a98a8", fontWeight: 500 }}> km/h</span>
                </div>
                {dirCard && <div style={{ fontSize: 9.5, color: "#8a98a8" }}>{dirCard}</div>}
              </div>
              <div title="Humidité relative" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#8a98a8", marginBottom: 2 }}><i className="ti ti-droplet" /> Humid.</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#185FA5" }}>
                  {state.data.relative_humidity_2m}<span style={{ fontSize: 10, color: "#8a98a8", fontWeight: 500 }}> %</span>
                </div>
              </div>
              <div title="Pression atmosphérique" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#8a98a8", marginBottom: 2 }}><i className="ti ti-gauge" /> Pression</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#185FA5" }}>
                  {state.data.pressure_msl ? Math.round(state.data.pressure_msl) : "—"}<span style={{ fontSize: 10, color: "#8a98a8", fontWeight: 500 }}> hPa</span>
                </div>
              </div>
              <div title="Visibilité" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#8a98a8", marginBottom: 2 }}><i className="ti ti-eye" /> Visib.</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#185FA5" }}>
                  {visKm != null ? visKm : "—"}<span style={{ fontSize: 10, color: "#8a98a8", fontWeight: 500 }}> km</span>
                </div>
              </div>
              {uv != null && (
                <div title="Indice UV maximum" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#8a98a8", marginBottom: 2 }}><i className="ti ti-sun" /> UV</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: uvColor }}>
                    {Math.round(uv)}<span style={{ fontSize: 9.5, color: uvColor, fontWeight: 500, opacity: 0.7 }}> {uvLabel}</span>
                  </div>
                </div>
              )}
              {state.data.cloud_cover != null && (
                <div title="Couverture nuageuse" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#8a98a8", marginBottom: 2 }}><i className="ti ti-cloud" /> Nuages</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#185FA5" }}>
                    {state.data.cloud_cover}<span style={{ fontSize: 10, color: "#8a98a8", fontWeight: 500 }}> %</span>
                  </div>
                </div>
              )}
              {sunrise && (
                <div title="Lever du soleil" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#8a98a8", marginBottom: 2 }}><i className="ti ti-sunrise" /> Lever</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#EF9F27" }}>{formatTime(sunrise)}</div>
                </div>
              )}
              {sunset && (
                <div title="Coucher du soleil" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#8a98a8", marginBottom: 2 }}><i className="ti ti-sunset" /> Coucher</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#C9867F" }}>{formatTime(sunset)}</div>
                </div>
              )}
            </div>

            {/* 0.58.44 : alerte précipitations si présentes */}
            {(state.data.precipitation > 0 || precipSum > 0) && (
              <div style={{
                padding: "8px 12px",
                background: "linear-gradient(135deg, rgba(42,126,209,.10), rgba(124,200,200,.15))",
                borderTop: "1px solid #bce0f7",
                borderBottom: "1px solid #bce0f7",
                fontSize: 12,
                color: "#185FA5",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
              }}>
                <span><i className="ti ti-cloud-rain" /> <b>Précipitations</b></span>
                <span style={{ fontSize: 11 }}>
                  {state.data.precipitation > 0 && <>en cours : <b>{state.data.precipitation.toFixed(1)} mm</b></>}
                  {state.data.precipitation > 0 && precipSum > 0 && " · "}
                  {precipSum > 0 && <>jour : <b>{precipSum.toFixed(1)} mm</b></>}
                </span>
              </div>
            )}

            {/* 0.58.44 : prévisions 3 prochains jours (toggle) */}
            {/* 0.58.46 : ajout focus jour (clic ou swipe) → mini-panneau détails */}
            {showForecast && state.forecast && state.forecast.time && state.forecast.time.length > 1 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #bce0f7" }}>
                <div style={{ fontSize: 10.5, color: "#8a98a8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span><i className="ti ti-calendar" /> Prévisions 3 jours</span>
                  {focusForecastIdx !== null && (
                    <button
                      onClick={() => setFocusForecastIdx(null)}
                      style={{ background: "transparent", border: "none", color: "#185FA5", cursor: "pointer", fontSize: 11, padding: 0, fontFamily: "inherit", fontWeight: 600 }}
                    >
                      <i className="ti ti-x" /> Désélectionner
                    </button>
                  )}
                </div>
                <div
                  style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, touchAction: "pan-y" }}
                  // 0.58.46 : swipe horizontal pour changer le jour focus (mobile-friendly)
                  onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                  onTouchEnd={(e) => {
                    if (touchStartX.current == null) return;
                    const dx = e.changedTouches[0].clientX - touchStartX.current;
                    touchStartX.current = null;
                    if (Math.abs(dx) < 40) return;  // pas un swipe significatif
                    const dir = dx < 0 ? 1 : -1;  // swipe gauche = jour suivant
                    setFocusForecastIdx((curr) => {
                      const nb = 3;
                      const next = (curr == null ? 0 : curr) + dir;
                      if (next < 0 || next >= nb) return curr;
                      return next;
                    });
                  }}
                >
                  {state.forecast.time.slice(1, 4).map((iso, i) => {
                    const fcCode = state.forecast.weather_code[i + 1];
                    const fcWmo = WMO[fcCode] || { e: "🌡", l: "—" };
                    const fcMax = state.forecast.temperature_2m_max[i + 1];
                    const fcMin = state.forecast.temperature_2m_min[i + 1];
                    const isFocus = focusForecastIdx === i;
                    return (
                      <div
                        key={iso}
                        onClick={() => setFocusForecastIdx(isFocus ? null : i)}
                        style={{
                          textAlign: "center",
                          padding: "8px 6px",
                          background: isFocus ? "linear-gradient(135deg, rgba(24,95,165,.18), rgba(124,200,200,.15))" : "rgba(255,255,255,.6)",
                          borderRadius: 8,
                          border: `1px solid ${isFocus ? "#185FA5" : "rgba(188,224,247,.5)"}`,
                          cursor: "pointer",
                          transition: "all 150ms",
                          transform: isFocus ? "scale(1.04)" : "scale(1)",
                          boxShadow: isFocus ? "0 4px 12px rgba(24,95,165,.20)" : "none",
                        }}
                        title="Cliquer pour voir les détails"
                      >
                        <div style={{ fontSize: 11, color: isFocus ? "#185FA5" : "#8a98a8", fontWeight: 600, textTransform: "capitalize" }}>{formatDayShort(iso)}</div>
                        <div style={{ fontSize: isFocus ? 30 : 26, lineHeight: 1, margin: "4px 0", transition: "font-size 150ms" }}>{fcWmo.e}</div>
                        <div style={{ fontSize: 11 }}>
                          <b style={{ color: "#e35d5b" }}>{Math.round(fcMax)}°</b>
                          <span style={{ color: "#8a98a8", margin: "0 3px" }}>/</span>
                          <b style={{ color: "#2a7ed1" }}>{Math.round(fcMin)}°</b>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* 0.58.46 : panneau détails du jour focus */}
                {focusForecastIdx !== null && state.forecast.time[focusForecastIdx + 1] && (() => {
                  const i = focusForecastIdx + 1;
                  const iso = state.forecast.time[i];
                  const fcCode = state.forecast.weather_code[i];
                  const fcWmo = WMO[fcCode] || { e: "🌡", l: "—" };
                  const fcMax = state.forecast.temperature_2m_max[i];
                  const fcMin = state.forecast.temperature_2m_min[i];
                  const fcWind = state.forecast.wind_speed_10m_max?.[i];
                  const fcPrecip = state.forecast.precipitation_sum?.[i];
                  const fcUv = state.forecast.uv_index_max?.[i];
                  const fcSunrise = state.forecast.sunrise?.[i];
                  const fcSunset = state.forecast.sunset?.[i];
                  const dayLabel = new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
                  return (
                    <div style={{
                      marginTop: 8,
                      padding: "10px 12px",
                      background: "linear-gradient(135deg, rgba(24,95,165,.08), rgba(124,200,200,.10))",
                      border: "1px solid rgba(24,95,165,.20)",
                      borderRadius: 10,
                      animation: "av-fc-expand 200ms ease-out",
                    }}>
                      <div style={{ fontSize: 11.5, color: "#185FA5", fontWeight: 700, marginBottom: 6, textTransform: "capitalize" }}>
                        <i className="ti ti-info-circle" /> {dayLabel} — {fcWmo.l}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, fontSize: 11 }}>
                        {fcWind != null && (
                          <div>
                            <div style={{ color: "#8a98a8" }}><i className="ti ti-wind" /> Vent max</div>
                            <b style={{ color: "#185FA5" }}>{Math.round(fcWind)} km/h</b>
                          </div>
                        )}
                        {fcPrecip != null && (
                          <div>
                            <div style={{ color: "#8a98a8" }}><i className="ti ti-cloud-rain" /> Précip.</div>
                            <b style={{ color: "#185FA5" }}>{fcPrecip.toFixed(1)} mm</b>
                          </div>
                        )}
                        {fcUv != null && (
                          <div>
                            <div style={{ color: "#8a98a8" }}><i className="ti ti-sun" /> UV max</div>
                            <b style={{ color: "#185FA5" }}>Indice {Math.round(fcUv)}</b>
                          </div>
                        )}
                        {fcSunrise && (
                          <div>
                            <div style={{ color: "#8a98a8" }}><i className="ti ti-sunrise" /> Lever</div>
                            <b style={{ color: "#EF9F27" }}>{formatTime(fcSunrise)}</b>
                          </div>
                        )}
                        {fcSunset && (
                          <div>
                            <div style={{ color: "#8a98a8" }}><i className="ti ti-sunset" /> Coucher</div>
                            <b style={{ color: "#C9867F" }}>{formatTime(fcSunset)}</b>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </>
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
        @keyframes av-fc-expand {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Panel>
  );
}

// ============================================================
//  NotesWidget — notes personnelles (0.58.40)
//
//  Bloc-notes personnel stocké en localStorage (av-personal-notes).
//  Support markdown léger : **gras**, *italique*, [link](url),
//   - bullets, ## headings, ligne vide = paragraphe.
//  Modes : preview (rendu rich) + edit (textarea).
//  Auto-save 1s après dernière frappe.
// ============================================================

// 0.58.42 : refonte pour supporter multi-onglets (jusqu'à 4 notes)
// 0.58.45 : limite augmentée pour permettre l'insertion d'images compressées (~50KB par note)
const NOTES_STORAGE_KEY = "av-personal-notes-v2"; // v2 pour migration depuis ancien format string
const NOTES_LEGACY_KEY = "av-personal-notes"; // ancien format (string simple)
const NOTES_MAX_LEN = 50000;
const NOTES_MAX_TABS = 4;
const NOTES_DEFAULT_LABEL = "Note";
// 0.58.45 : pour la compression d'images en paste
const NOTES_IMG_MAX_WIDTH = 800;     // largeur max après compression
const NOTES_IMG_QUALITY = 0.78;      // qualité JPEG (0-1)
const NOTES_IMG_MAX_KB = 250;        // taille max après compression (avant refus)

// 0.58.45 : compresse une image (Blob ou File) en dataURL JPEG via canvas
//   Retourne null si l'image compressée dépasse encore NOTES_IMG_MAX_KB
async function compressImageToDataUrl(blob) {
  if (typeof window === "undefined" || !blob) return null;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(null);
      img.onload = () => {
        try {
          // Redimensionne en gardant le ratio
          const ratio = img.width > NOTES_IMG_MAX_WIDTH ? NOTES_IMG_MAX_WIDTH / img.width : 1;
          const w = Math.round(img.width * ratio);
          const h = Math.round(img.height * ratio);
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d");
          // Fond blanc (utile pour les PNG transparents convertis en JPG)
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          // Tente JPEG d'abord (compression efficace)
          let dataUrl = canvas.toDataURL("image/jpeg", NOTES_IMG_QUALITY);
          // dataUrl ≈ 4/3 de la taille réelle → estime taille en KB
          const sizeKB = Math.round(dataUrl.length * 0.75 / 1024);
          if (sizeKB > NOTES_IMG_MAX_KB) {
            // Re-tente avec qualité plus basse
            dataUrl = canvas.toDataURL("image/jpeg", 0.55);
            const newSize = Math.round(dataUrl.length * 0.75 / 1024);
            if (newSize > NOTES_IMG_MAX_KB) {
              resolve(null);
              return;
            }
          }
          resolve(dataUrl);
        } catch {
          resolve(null);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(blob);
  });
}

// Format v2 : { tabs: [{ id, label, text }], activeId }
function getNotesData() {
  if (typeof window === "undefined") return { tabs: [{ id: "default", label: NOTES_DEFAULT_LABEL, text: "" }], activeId: "default" };
  try {
    // Tentative v2
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.tabs && Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
        return {
          tabs: parsed.tabs.slice(0, NOTES_MAX_TABS),
          activeId: parsed.activeId || parsed.tabs[0].id,
        };
      }
    }
    // Fallback v1 (string simple) → migration
    const legacy = localStorage.getItem(NOTES_LEGACY_KEY);
    if (legacy) {
      return { tabs: [{ id: "default", label: NOTES_DEFAULT_LABEL, text: legacy }], activeId: "default" };
    }
  } catch {}
  return { tabs: [{ id: "default", label: NOTES_DEFAULT_LABEL, text: "" }], activeId: "default" };
}

function setNotesData(data) {
  if (typeof window === "undefined") return;
  try {
    // Tronque chaque texte à NOTES_MAX_LEN
    const safe = {
      tabs: data.tabs.slice(0, NOTES_MAX_TABS).map(t => ({
        id: t.id,
        label: (t.label || NOTES_DEFAULT_LABEL).slice(0, 30),
        text: (t.text || "").slice(0, NOTES_MAX_LEN),
      })),
      activeId: data.activeId,
    };
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(safe));
  } catch {}
}

// Mini-renderer markdown (sécurisé — pas d'injection HTML libre)
function renderMd(text, onToggleCheckbox) {
  if (!text) return null;
  // Escape HTML pour éviter XSS, puis remplace les patterns sûrs
  const esc = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Lignes
  const blocks = esc.split(/\n\n+/);
  let globalLineIdx = 0; // index global pour identifier les checkboxes uniquement
  // Compteur ré-init basé sur l'esc original car les lignes vides ne sont pas comptées dans esc
  // Mais pour onToggleCheckbox on a besoin de la position dans le texte source (text non-esc)
  // Simplification : on retrouve la position de chaque checkbox dans le texte original (non escaped)
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;
    // Heading ## (sur tout le block)
    if (trimmed.startsWith("## ")) {
      return <h4 key={i} style={{ margin: "8px 0 4px", fontSize: 13, color: "#142131" }}>{inlineMd(trimmed.slice(3))}</h4>;
    }
    const lines = trimmed.split("\n");
    // 0.58.42 : check si toutes les lignes sont des checkboxes (- [ ] ou - [x])
    const allCheckboxes = lines.every(l => /^-\s*\[[\sxX]\]\s/.test(l.trim()));
    if (allCheckboxes && lines.length >= 1) {
      return (
        <ul key={i} style={{ margin: "4px 0", paddingLeft: 4, fontSize: 12.5, listStyle: "none" }}>
          {lines.map((l, j) => {
            const m = l.trim().match(/^-\s*\[([\sxX])\]\s(.*)$/);
            if (!m) return null;
            const checked = m[1].toLowerCase() === "x";
            const content = m[2];
            const lineIdx = globalLineIdx++;
            return (
              <li key={j} style={{ marginBottom: 4, display: "flex", alignItems: "flex-start", gap: 6 }}>
                <span
                  onClick={() => onToggleCheckbox && onToggleCheckbox(lineIdx)}
                  style={{
                    cursor: onToggleCheckbox ? "pointer" : "default",
                    width: 14, height: 14, borderRadius: 3,
                    border: `2px solid ${checked ? "#5aa05a" : "#d4c896"}`,
                    background: checked ? "#5aa05a" : "transparent",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: 2,
                    transition: "all 150ms",
                  }}
                >
                  {checked && <i className="ti ti-check" style={{ fontSize: 10, color: "#fff" }} />}
                </span>
                <span style={{
                  flex: 1,
                  color: checked ? "#8a98a8" : "#142131",
                  textDecoration: checked ? "line-through" : "none",
                }}>
                  {inlineMd(content)}
                </span>
              </li>
            );
          })}
        </ul>
      );
    }
    // Liste bulletée classique
    const allBullets = lines.every(l => l.trim().startsWith("- "));
    if (allBullets && lines.length >= 1) {
      return (
        <ul key={i} style={{ margin: "4px 0", paddingLeft: 18, fontSize: 12.5 }}>
          {lines.map((l, j) => <li key={j} style={{ marginBottom: 2 }}>{inlineMd(l.replace(/^- /, ""))}</li>)}
        </ul>
      );
    }
    // Paragraphe normal (lignes séparées par <br>)
    return (
      <p key={i} style={{ margin: "4px 0", fontSize: 12.5, lineHeight: 1.45 }}>
        {lines.map((l, j) => (
          <span key={j}>
            {inlineMd(l)}
            {j < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  });
}

// Inline : **gras**, *italique*, [link](url)
function inlineMd(text) {
  // Split sur les patterns, en gardant les délimiteurs
  // Simple approche : sériel parsing
  const parts = [];
  let i = 0;
  while (i < text.length) {
    // **gras**
    if (text[i] === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2);
      if (end !== -1) { parts.push(<b key={i}>{text.slice(i + 2, end)}</b>); i = end + 2; continue; }
    }
    // *italique*
    if (text[i] === "*") {
      const end = text.indexOf("*", i + 1);
      if (end !== -1) { parts.push(<i key={i} style={{ fontStyle: "italic" }}>{text.slice(i + 1, end)}</i>); i = end + 1; continue; }
    }
    // 0.58.45 : ![alt](url) — image (markdown syntax)
    if (text[i] === "!" && text[i + 1] === "[") {
      const closeBr = text.indexOf("]", i + 2);
      if (closeBr !== -1 && text[closeBr + 1] === "(") {
        const closePar = text.indexOf(")", closeBr + 2);
        if (closePar !== -1) {
          const alt = text.slice(i + 2, closeBr);
          const src = text.slice(closeBr + 2, closePar);
          // Sécurité : seules les data:image/, http(s) ou URLs relatives
          if (/^(data:image\/|https?:\/\/|\/)/.test(src)) {
            parts.push(
              <img
                key={i}
                src={src}
                alt={alt || ""}
                style={{
                  maxWidth: "100%",
                  maxHeight: 240,
                  borderRadius: 8,
                  margin: "4px 0",
                  display: "block",
                  border: "1px solid #f0d59f",
                  cursor: "pointer",
                }}
                title={alt ? `${alt} (cliquer pour ouvrir en grand)` : "Cliquer pour ouvrir en grand"}
                onClick={(e) => {
                  // Ouvre l'image en grand dans un nouvel onglet ou modal léger
                  if (src.startsWith("data:")) {
                    // Pour les data URL : ouvre une lightbox modale légère
                    const overlay = document.createElement("div");
                    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;padding:24px";
                    overlay.innerHTML = `<img src="${src}" style="max-width:96vw;max-height:96vh;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.5)" alt="${(alt || "").replace(/"/g, "&quot;")}" />`;
                    overlay.addEventListener("click", () => overlay.remove());
                    document.body.appendChild(overlay);
                  } else {
                    window.open(src, "_blank", "noopener,noreferrer");
                  }
                }}
              />
            );
            i = closePar + 1; continue;
          }
        }
      }
    }
    // [link](url)
    if (text[i] === "[") {
      const closeBr = text.indexOf("]", i + 1);
      if (closeBr !== -1 && text[closeBr + 1] === "(") {
        const closePar = text.indexOf(")", closeBr + 2);
        if (closePar !== -1) {
          const label = text.slice(i + 1, closeBr);
          const url = text.slice(closeBr + 2, closePar);
          // Sécurité : seules les URLs http(s) ou relatives
          if (/^(https?:\/\/|\/)/.test(url)) {
            parts.push(
              <a key={i} href={url} target={url.startsWith("http") ? "_blank" : undefined}
                 rel={url.startsWith("http") ? "noopener noreferrer" : undefined}
                 style={{ color: "#185FA5", fontWeight: 600 }}>
                {label}
              </a>
            );
            i = closePar + 1; continue;
          }
        }
      }
    }
    // Texte normal — accumule jusqu'au prochain pattern
    let j = i;
    while (j < text.length && text[j] !== "*" && text[j] !== "[" && text[j] !== "!") j++;
    // Si on s'est arrêté sur "!" mais que ce n'est pas suivi de "[", consomme aussi le "!"
    if (j === i && text[j] === "!") { j++; }
    parts.push(text.slice(i, j));
    i = j;
  }
  return <>{parts}</>;
}

export function NotesWidget() {
  const [data, setData] = useState({ tabs: [{ id: "default", label: NOTES_DEFAULT_LABEL, text: "" }], activeId: "default" });
  const [editing, setEditing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [saveStatus, setSaveStatus] = useState(""); // "" | "saving" | "saved"

  useEffect(() => {
    setData(getNotesData());
    setMounted(true);
  }, []);

  // Active tab
  const activeTab = data.tabs.find(t => t.id === data.activeId) || data.tabs[0];
  const text = activeTab?.text || "";

  // Auto-save debounce 800ms
  useEffect(() => {
    if (!mounted || !editing) return;
    setSaveStatus("saving");
    const t = setTimeout(() => {
      setNotesData(data);
      setSaveStatus("saved");
      const t2 = setTimeout(() => setSaveStatus(""), 1200);
      return () => clearTimeout(t2);
    }, 800);
    return () => clearTimeout(t);
  }, [data, mounted, editing]);

  function updateActiveText(newText) {
    setData(prev => ({
      ...prev,
      tabs: prev.tabs.map(t => t.id === prev.activeId ? { ...t, text: newText.slice(0, NOTES_MAX_LEN) } : t),
    }));
  }

  // 0.58.42 : toggle checkbox dans le texte source par index global (position dans le texte)
  function toggleCheckbox(targetIdx) {
    const lines = text.split("\n");
    let cbIdx = -1;
    const updated = lines.map(line => {
      const m = line.match(/^(\s*-\s*\[)([\sxX])(\]\s.*)$/);
      if (m) {
        cbIdx++;
        if (cbIdx === targetIdx) {
          const wasChecked = m[2].toLowerCase() === "x";
          return m[1] + (wasChecked ? " " : "x") + m[3];
        }
      }
      return line;
    });
    updateActiveText(updated.join("\n"));
    // Force save immédiat pour les checkboxes (UX)
    setEditing(true);
  }

  async function addTab() {
    if (data.tabs.length >= NOTES_MAX_TABS) {
      await dialogs.alert({ title: "Limite atteinte", message: `Maximum ${NOTES_MAX_TABS} notes.` });
      return;
    }
    const label = await dialogs.prompt({
      title: "Nouvelle note",
      message: "Titre de la note :",
      placeholder: "Ex : Idées, Sprint en cours, To-do...",
    });
    if (!label) return;
    const newId = `note-${Date.now()}`;
    setData(prev => ({
      tabs: [...prev.tabs, { id: newId, label: label.slice(0, 30), text: "" }],
      activeId: newId,
    }));
    setEditing(true);
  }

  async function renameTab(tabId) {
    const tab = data.tabs.find(t => t.id === tabId);
    if (!tab) return;
    const label = await dialogs.prompt({
      title: "Renommer la note",
      message: "Nouveau titre :",
      defaultValue: tab.label,
    });
    if (!label) return;
    setData(prev => ({
      ...prev,
      tabs: prev.tabs.map(t => t.id === tabId ? { ...t, label: label.slice(0, 30) } : t),
    }));
  }

  async function deleteTab(tabId) {
    if (data.tabs.length <= 1) {
      await dialogs.alert({ title: "Impossible", message: "Au moins une note doit rester." });
      return;
    }
    const tab = data.tabs.find(t => t.id === tabId);
    const ok = await dialogs.confirm({
      title: "Supprimer la note",
      message: `Supprimer "${tab?.label}" et son contenu ?`,
      okLabel: "Supprimer",
      okColor: "#c0392b",
    });
    if (!ok) return;
    setData(prev => {
      const newTabs = prev.tabs.filter(t => t.id !== tabId);
      return {
        tabs: newTabs,
        activeId: prev.activeId === tabId ? newTabs[0].id : prev.activeId,
      };
    });
  }

  if (!mounted) return null;

  return (
    <Panel style={{ marginTop: 0, background: "linear-gradient(135deg, #fffef0 0%, #fff 100%)", borderColor: "#f0e0a0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 15, color: "#7a4f15" }}>
          <i className="ti ti-notes" style={{ marginRight: 6, color: "#EF9F27" }} /> Mes notes
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {saveStatus === "saving" && <span style={{ fontSize: 10.5, color: "#8a98a8" }}><i className="ti ti-loader ti-spin" /> Enregistrement…</span>}
          {saveStatus === "saved" && <span style={{ fontSize: 10.5, color: "#5aa05a" }}><i className="ti ti-check" /> Enregistré</span>}
          <button
            onClick={() => setEditing(!editing)}
            style={{
              background: editing ? "linear-gradient(135deg, #5aa05a, #4a8a4a)" : "transparent",
              color: editing ? "#fff" : "#EF9F27",
              border: editing ? "none" : "1px solid #f0d59f",
              padding: "4px 10px",
              borderRadius: 8,
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <i className={`ti ${editing ? "ti-check" : "ti-pencil"}`} />
            {editing ? "Terminer" : "Modifier"}
          </button>
        </div>
      </div>

      {/* 0.58.42 : barre d'onglets pour multi-notes */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10, borderBottom: "1px solid #f0e0a0", paddingBottom: 6, overflowX: "auto" }}>
        {data.tabs.map(tab => {
          const isActive = tab.id === data.activeId;
          return (
            <div
              key={tab.id}
              onClick={() => setData(prev => ({ ...prev, activeId: tab.id }))}
              style={{
                padding: "4px 10px",
                borderRadius: "8px 8px 0 0",
                fontSize: 11.5,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                background: isActive ? "#EF9F27" : "transparent",
                color: isActive ? "#fff" : "#7a4f15",
                border: isActive ? "1px solid #EF9F27" : "1px solid transparent",
                borderBottom: isActive ? "1px solid #EF9F27" : "none",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                transition: "all 150ms",
                position: "relative",
                marginBottom: -7,
              }}
              title={isActive ? "Cliquez sur ✏ pour renommer ou × pour supprimer" : tab.label}
            >
              <span>{tab.label}</span>
              {isActive && data.tabs.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); renameTab(tab.id); }}
                  aria-label="Renommer"
                  style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: 0, fontSize: 10, display: "inline-flex", alignItems: "center" }}
                >
                  <i className="ti ti-pencil" />
                </button>
              )}
              {isActive && data.tabs.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); deleteTab(tab.id); }}
                  aria-label="Supprimer"
                  style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: 0, fontSize: 11, display: "inline-flex", alignItems: "center" }}
                >
                  <i className="ti ti-x" />
                </button>
              )}
            </div>
          );
        })}
        {data.tabs.length < NOTES_MAX_TABS && (
          <button
            onClick={addTab}
            aria-label="Ajouter une note"
            title="Ajouter une note"
            style={{
              background: "transparent",
              color: "#EF9F27",
              border: "1px dashed #f0d59f",
              padding: "3px 8px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <i className="ti ti-plus" /> Nouvelle
          </button>
        )}
      </div>

      {editing ? (
        <>
          <textarea
            value={text}
            onChange={(e) => updateActiveText(e.target.value)}
            // 0.58.45 : Ctrl+V intercepte les images du presse-papier et les compresse en dataURL
            onPaste={async (e) => {
              const items = e.clipboardData?.items;
              if (!items) return;
              let imageItem = null;
              for (let i = 0; i < items.length; i++) {
                if (items[i].type && items[i].type.startsWith("image/")) {
                  imageItem = items[i];
                  break;
                }
              }
              if (!imageItem) return; // pas d'image → comportement paste normal
              e.preventDefault();
              const blob = imageItem.getAsFile();
              if (!blob) return;
              try {
                // Compresse via canvas
                const dataUrl = await compressImageToDataUrl(blob);
                if (!dataUrl) {
                  await dialogs.alert({ title: "Image trop volumineuse", message: `Impossible de compresser sous ${NOTES_IMG_MAX_KB} Ko. Essaie une image plus petite.`, variant: "warning" });
                  return;
                }
                // Insère à la position du curseur
                const ta = e.target;
                const start = ta.selectionStart || 0;
                const end = ta.selectionEnd || 0;
                const markdownImg = `![Image collée](${dataUrl})`;
                const newText = text.slice(0, start) + markdownImg + text.slice(end);
                if (newText.length > NOTES_MAX_LEN) {
                  await dialogs.alert({ title: "Note trop longue", message: `L'image ferait dépasser ${NOTES_MAX_LEN} caractères. Supprime du contenu d'abord.`, variant: "warning" });
                  return;
                }
                updateActiveText(newText);
                // Restaure le curseur après l'image insérée
                setTimeout(() => {
                  if (ta) ta.setSelectionRange(start + markdownImg.length, start + markdownImg.length);
                }, 0);
              } catch (err) {
                console.error("Paste image error:", err);
              }
            }}
            // 0.58.43 : raccourci Ctrl+Shift+X (et Cmd+Shift+X sur Mac) pour toggle la checkbox sur la ligne du curseur
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "x" || e.key === "X")) {
                e.preventDefault();
                const ta = e.target;
                const pos = ta.selectionStart;
                const lines = text.split("\n");
                // Trouve la ligne où se trouve le curseur
                let acc = 0, lineIdx = 0;
                for (let i = 0; i < lines.length; i++) {
                  if (pos <= acc + lines[i].length) { lineIdx = i; break; }
                  acc += lines[i].length + 1; // +1 pour le \n
                }
                const line = lines[lineIdx];
                const m = line.match(/^(\s*)(-\s*\[)([\sxX])(\]\s.*)$/);
                if (m) {
                  // Toggle existante : ' ' → 'x' ou 'x' → ' '
                  const wasChecked = m[3].toLowerCase() === "x";
                  lines[lineIdx] = m[1] + m[2] + (wasChecked ? " " : "x") + m[4];
                } else if (line.trim().startsWith("- ")) {
                  // Convert "- truc" en "- [ ] truc"
                  const indent = line.match(/^(\s*)/)[1];
                  lines[lineIdx] = `${indent}- [ ] ${line.trim().slice(2)}`;
                } else if (line.trim()) {
                  // Convert ligne texte en "- [ ] texte"
                  const indent = line.match(/^(\s*)/)[1];
                  lines[lineIdx] = `${indent}- [ ] ${line.trim()}`;
                } else {
                  // Ligne vide : insère un nouveau "- [ ] "
                  lines[lineIdx] = "- [ ] ";
                }
                updateActiveText(lines.join("\n"));
                // Restaure le curseur à la même position (ou ajusté)
                setTimeout(() => {
                  if (ta) ta.setSelectionRange(pos + 6, pos + 6); // approximation
                }, 0);
              }
            }}
            placeholder="Tes notes ici…&#10;&#10;Markdown supporté :&#10;## Titre&#10;**gras**, *italique*&#10;- liste&#10;- [ ] todo (Ctrl+Shift+X pour cocher)&#10;- [x] fait&#10;[texte](https://lien)&#10;![alt](image-url) — ou colle direct une image (Ctrl+V)"
            style={{
              width: "100%",
              minHeight: 140,
              maxHeight: 300,
              padding: "10px 12px",
              border: "1px solid #f0d59f",
              borderRadius: 10,
              fontFamily: "inherit",
              fontSize: 12.5,
              lineHeight: 1.5,
              background: "#fff",
              color: "#142131",
              resize: "vertical",
              outline: "none",
            }}
            autoFocus
          />
          <p style={{ margin: "6px 0 0", fontSize: 10.5, color: "#8a98a8", display: "flex", justifyContent: "space-between" }}>
            <span><i className="ti ti-info-circle" /> Markdown : **gras**, *italique*, ## titre, - liste, [ ]/[x] (Ctrl+Shift+X), [lien](url), 📋 Ctrl+V pour coller une image</span>
            <span>{text.length} / {NOTES_MAX_LEN}</span>
          </p>
        </>
      ) : (
        <div style={{ minHeight: 60 }}>
          {text.trim() ? (
            renderMd(text, toggleCheckbox)
          ) : (
            <p style={{ margin: 0, padding: "20px 12px", textAlign: "center", color: "#8a98a8", fontSize: 12.5, fontStyle: "italic" }}>
              <i className="ti ti-notes-off" style={{ fontSize: 24, display: "block", marginBottom: 6, color: "#f0d59f" }} />
              Aucune note dans "{activeTab?.label}". Clique sur "Modifier" pour commencer.
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}

// ============================================================
//  ObjectifsWidget — Mes objectifs (0.58.43)
//
//  Widget opt-in pour suivre des objectifs personnels avec progress
//  bars et milestones. Storage localStorage av-personal-goals.
//  Chaque objectif : { id, label, current, target, unit, color, milestones }
// ============================================================

const GOALS_STORAGE_KEY = "av-personal-goals";
const GOALS_MAX = 6;
// 0.58.52 : flag pour activer la sync Supabase (false = localStorage seulement)
//   Activé automatiquement si user authentifié + table user_goals présente
const GOALS_SYNC_TTL_KEY = "av-goals-sync-disabled-until";

function getGoals() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GOALS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, GOALS_MAX) : [];
  } catch { return []; }
}

function saveGoals(goals) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals.slice(0, GOALS_MAX))); } catch {}
}

// 0.58.52 : sync Supabase
//   - Au mount : charge depuis Supabase, fallback localStorage si offline ou erreur
//   - À chaque save : pousse vers Supabase + sauve aussi en localStorage (cache offline)
//   - Si erreur 404 (table absente), flag pour 24h, mode local only

function isGoalsSyncDisabled() {
  if (typeof window === "undefined") return true;
  try {
    const until = parseInt(localStorage.getItem(GOALS_SYNC_TTL_KEY) || "0", 10);
    return until > Date.now();
  } catch { return false; }
}

function disableGoalsSyncFor24h() {
  try {
    const next24h = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(GOALS_SYNC_TTL_KEY, String(next24h));
  } catch {}
}

async function fetchGoalsFromSupabase(supabase, userId) {
  if (!supabase || !userId || isGoalsSyncDisabled()) return null;
  try {
    const { data, error } = await supabase
      .from("user_goals")
      .select("*")
      .eq("user_id", userId)
      .order("position", { ascending: true });
    if (error) {
      if (error.code === "PGRST205" || error.code === "42P01" || /not found/i.test(error.message || "")) {
        disableGoalsSyncFor24h();
      }
      return null;
    }
    // Transforme les rows Supabase au format local
    return (data || []).map(r => ({
      id: r.id,
      label: r.label,
      target: Number(r.target) || 0,
      current: Number(r.current) || 0,
      unit: r.unit || "",
      colorId: r.color_id || "blue",
    }));
  } catch {
    return null;
  }
}

async function pushGoalsToSupabase(supabase, userId, goals) {
  if (!supabase || !userId || isGoalsSyncDisabled()) return false;
  try {
    // Stratégie : delete all + insert all (simple, idempotent, max 6 lignes)
    const { error: delErr } = await supabase.from("user_goals").delete().eq("user_id", userId);
    if (delErr) {
      if (delErr.code === "PGRST205" || delErr.code === "42P01") {
        disableGoalsSyncFor24h();
      }
      return false;
    }
    if (goals.length === 0) return true;
    const rows = goals.map((g, idx) => ({
      user_id: userId,
      label: g.label,
      target: g.target,
      current: g.current,
      unit: g.unit || null,
      color_id: g.colorId || "blue",
      position: idx,
    }));
    const { error: insErr } = await supabase.from("user_goals").insert(rows);
    if (insErr) return false;
    return true;
  } catch {
    return false;
  }
}

// Palette de couleurs pour les objectifs
const GOAL_COLORS = [
  { id: "navy",  bg: "#142131", grad: "linear-gradient(90deg, #142131, #2a3850)" },
  { id: "teal",  bg: "#7CC8C8", grad: "linear-gradient(90deg, #7CC8C8, #5da8a8)" },
  { id: "terra", bg: "#C9867F", grad: "linear-gradient(90deg, #C9867F, #b56e67)" },
  { id: "amber", bg: "#EF9F27", grad: "linear-gradient(90deg, #EF9F27, #d28818)" },
  { id: "green", bg: "#5aa05a", grad: "linear-gradient(90deg, #5aa05a, #4a8a4a)" },
  { id: "blue",  bg: "#185FA5", grad: "linear-gradient(90deg, #185FA5, #134e87)" },
];

export function ObjectifsWidget() {
  const [goals, setGoals] = useState([]);
  const [mounted, setMounted] = useState(false);
  // 0.58.46 : mode présentation (overlay plein écran pour les réunions d'équipe)
  const [presentMode, setPresentMode] = useState(false);
  // 0.58.52 : sync Supabase (état d'affichage du statut)
  const [syncStatus, setSyncStatus] = useState("local");  // "local" | "syncing" | "synced" | "error"

  useEffect(() => {
    // 0.58.52 : load avec stratégie hybride
    //   1. Affiche localStorage immédiatement (offline-first)
    //   2. Si user authentifié + table dispo → sync depuis Supabase + cache local
    setGoals(getGoals());
    setMounted(true);

    // Tentative de sync Supabase en background
    (async () => {
      try {
        const { createClient } = await import("../../lib/supabase");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const remoteGoals = await fetchGoalsFromSupabase(supabase, user.id);
        if (remoteGoals && remoteGoals.length > 0) {
          // Si Supabase a des données → écrase le local
          setGoals(remoteGoals);
          saveGoals(remoteGoals);
          setSyncStatus("synced");
        } else if (remoteGoals !== null) {
          // Supabase OK mais vide → push le local vers Supabase (1ère sync)
          const local = getGoals();
          if (local.length > 0) {
            const ok = await pushGoalsToSupabase(supabase, user.id, local);
            setSyncStatus(ok ? "synced" : "local");
          } else {
            setSyncStatus("synced");
          }
        } else {
          // Erreur ou table absente → reste en local
          setSyncStatus("local");
        }
      } catch {
        setSyncStatus("local");
      }
    })();
  }, []);

  // 0.58.52 : helper save qui pousse aussi vers Supabase
  async function saveAndSync(nextGoals) {
    saveGoals(nextGoals);
    setSyncStatus("syncing");
    try {
      const { createClient } = await import("../../lib/supabase");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSyncStatus("local");
        return;
      }
      const ok = await pushGoalsToSupabase(supabase, user.id, nextGoals);
      setSyncStatus(ok ? "synced" : "local");
    } catch {
      setSyncStatus("local");
    }
  }

  // 0.58.46 : ESC pour quitter le mode présentation
  useEffect(() => {
    if (!presentMode) return;
    function onKey(e) { if (e.key === "Escape") setPresentMode(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presentMode]);

  async function addGoal() {
    if (goals.length >= GOALS_MAX) {
      await dialogs.alert({ title: "Limite atteinte", message: `Maximum ${GOALS_MAX} objectifs.` });
      return;
    }
    const label = await dialogs.prompt({
      title: "Nouvel objectif",
      message: "Libellé :",
      placeholder: "Ex : Visites clients ce mois, Articles écrits...",
    });
    if (!label) return;
    const targetStr = await dialogs.prompt({
      title: "Cible",
      message: "Valeur à atteindre :",
      placeholder: "Ex : 20",
    });
    const target = parseFloat(targetStr);
    if (!target || target <= 0) return;
    const unit = await dialogs.prompt({
      title: "Unité (optionnel)",
      message: "Unité :",
      placeholder: "Ex : visites, articles, km...",
      defaultValue: "",
    });
    const colorIdx = goals.length % GOAL_COLORS.length;
    const newGoal = {
      id: `g-${Date.now()}`,
      label: label.slice(0, 40),
      current: 0,
      target,
      unit: (unit || "").slice(0, 20),
      colorId: GOAL_COLORS[colorIdx].id,
    };
    const next = [...goals, newGoal];
    setGoals(next);
    saveAndSync(next);
  }

  async function setCurrent(goalId) {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const v = await dialogs.prompt({
      title: `Mettre à jour ${goal.label}`,
      message: `Valeur actuelle (cible : ${goal.target}${goal.unit ? " " + goal.unit : ""}) :`,
      defaultValue: String(goal.current || 0),
    });
    const num = parseFloat(v);
    if (isNaN(num) || num < 0) return;
    const next = goals.map(g => g.id === goalId ? { ...g, current: num } : g);
    setGoals(next);
    saveAndSync(next);
  }

  async function deleteGoal(goalId) {
    const goal = goals.find(g => g.id === goalId);
    const ok = await dialogs.confirm({
      title: "Supprimer l'objectif",
      message: `Supprimer "${goal?.label}" ?`,
      okLabel: "Supprimer",
      okColor: "#c0392b",
    });
    if (!ok) return;
    const next = goals.filter(g => g.id !== goalId);
    setGoals(next);
    saveAndSync(next);
  }

  function quickIncrement(goalId, delta) {
    const next = goals.map(g => g.id === goalId ? { ...g, current: Math.max(0, (g.current || 0) + delta) } : g);
    setGoals(next);
    saveAndSync(next);
  }

  if (!mounted) return null;

  return (
    <Panel style={{ marginTop: 0, background: "linear-gradient(135deg, #f5f8fc 0%, #fff 100%)", borderColor: "#cfd8e0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15, color: "#142131", display: "flex", alignItems: "center", gap: 8 }}>
          <i className="ti ti-target" style={{ marginRight: 6, color: "#185FA5" }} /> Mes objectifs
          {/* 0.58.52 : badge de statut de sync */}
          {syncStatus === "synced" && (
            <span title="Synchronisé avec Supabase" style={{ fontSize: 10, color: "#5aa05a", display: "inline-flex", alignItems: "center", gap: 2 }}>
              <i className="ti ti-cloud-check" /> Sync
            </span>
          )}
          {syncStatus === "syncing" && (
            <span title="Synchronisation en cours…" style={{ fontSize: 10, color: "#8a98a8", display: "inline-flex", alignItems: "center", gap: 2 }}>
              <i className="ti ti-cloud-upload ti-spin" /> Sync…
            </span>
          )}
          {syncStatus === "local" && (
            <span title="Mode local (Supabase non disponible)" style={{ fontSize: 10, color: "#8a98a8", display: "inline-flex", alignItems: "center", gap: 2 }}>
              <i className="ti ti-device-floppy" /> Local
            </span>
          )}
        </h2>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* 0.58.46 : bouton mode présentation (visible seulement si au moins 1 objectif) */}
          {goals.length > 0 && (
            <button
              onClick={() => setPresentMode(true)}
              title="Affichage plein écran pour réunion d'équipe (ESC pour fermer)"
              style={{
                background: "transparent",
                color: "#7CC8C8",
                border: "1px solid rgba(124,200,200,.4)",
                padding: "4px 10px", borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 4,
              }}
            >
              <i className="ti ti-presentation" /> Présentation
            </button>
          )}
          <button onClick={addGoal} disabled={goals.length >= GOALS_MAX} style={{
            background: goals.length >= GOALS_MAX ? "#cfd8e0" : "linear-gradient(135deg, #185FA5, #134e87)",
            color: "#fff", border: "none",
            padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            cursor: goals.length >= GOALS_MAX ? "not-allowed" : "pointer",
            fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4,
          }}>
            <i className="ti ti-plus" /> Ajouter
          </button>
        </div>
      </div>

      {goals.length === 0 ? (
        <div style={{ padding: "20px 12px", textAlign: "center", color: "#8a98a8", fontSize: 12.5 }}>
          <i className="ti ti-target-off" style={{ fontSize: 28, display: "block", marginBottom: 8, color: "#cfd8e0" }} />
          Aucun objectif. Clique sur "Ajouter" pour en créer un.
          <p style={{ margin: "8px 0 0", fontSize: 11, fontStyle: "italic" }}>
            Ex : "Visites clients ce mois", "Articles écrits", "Km à vélo"...
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {goals.map((g) => {
            const pct = g.target > 0 ? Math.min(100, Math.max(0, (g.current / g.target) * 100)) : 0;
            const color = GOAL_COLORS.find(c => c.id === g.colorId) || GOAL_COLORS[0];
            const isComplete = g.current >= g.target;
            return (
              <div key={g.id} style={{ position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <span
                    onClick={() => setCurrent(g.id)}
                    style={{ fontSize: 12.5, fontWeight: 600, color: "#142131", cursor: "pointer" }}
                    title="Cliquer pour modifier la valeur actuelle"
                  >
                    {isComplete && <i className="ti ti-check" style={{ color: "#5aa05a", marginRight: 4 }} />}
                    {g.label}
                  </span>
                  <span style={{ fontSize: 11.5, color: "#5a6878", fontFamily: "Consolas, monospace" }}>
                    <b style={{ color: isComplete ? "#5aa05a" : color.bg, fontSize: 13 }}>{g.current}</b>
                    <span style={{ opacity: 0.6 }}> / {g.target}{g.unit ? ` ${g.unit}` : ""}</span>
                    <span style={{ marginLeft: 6, fontWeight: 700, color: isComplete ? "#5aa05a" : color.bg }}>
                      {Math.round(pct)}%
                    </span>
                  </span>
                </div>
                {/* Progress bar */}
                <div style={{
                  width: "100%", height: 10, background: "#e3e9ee", borderRadius: 5,
                  overflow: "hidden", position: "relative",
                }}>
                  <div style={{
                    width: `${pct}%`, height: "100%",
                    background: isComplete ? "linear-gradient(90deg, #5aa05a, #4a8a4a)" : color.grad,
                    borderRadius: 5,
                    transition: "width 400ms ease-out",
                    boxShadow: isComplete ? "0 0 8px rgba(90,160,90,.50)" : `0 0 6px ${color.bg}40`,
                  }} />
                  {/* Milestones : marqueurs aux 25%, 50%, 75% */}
                  {[25, 50, 75].map((m) => (
                    <div key={m} style={{
                      position: "absolute", left: `${m}%`, top: 0, bottom: 0,
                      width: 1, background: "rgba(255,255,255,.5)",
                      pointerEvents: "none",
                    }} />
                  ))}
                </div>
                {/* Actions inline : +1, +5, modifier, supprimer */}
                <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
                  <button onClick={() => quickIncrement(g.id, 1)} title="+1"
                    style={{ background: color.bg + "22", color: color.bg, border: "none", padding: "2px 8px", borderRadius: 4, fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+1</button>
                  <button onClick={() => quickIncrement(g.id, 5)} title="+5"
                    style={{ background: color.bg + "22", color: color.bg, border: "none", padding: "2px 8px", borderRadius: 4, fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+5</button>
                  <button onClick={() => quickIncrement(g.id, -1)} title="-1"
                    style={{ background: "#cfd8e0", color: "#5a6878", border: "none", padding: "2px 8px", borderRadius: 4, fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>-1</button>
                  <button onClick={() => setCurrent(g.id)} title="Modifier la valeur"
                    style={{ background: "transparent", color: "#5a6878", border: "none", padding: "2px 4px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                    <i className="ti ti-edit" />
                  </button>
                  <button onClick={() => deleteGoal(g.id)} title="Supprimer"
                    style={{ background: "transparent", color: "#c0392b", border: "none", padding: "2px 4px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", marginLeft: "auto" }}>
                    <i className="ti ti-trash" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 0.58.46 : overlay mode présentation (plein écran pour réunions) */}
      {presentMode && (() => {
        // Calcul du score global = moyenne des % par objectif
        const totalPct = goals.length > 0
          ? Math.round(goals.reduce((acc, g) => acc + (g.target > 0 ? Math.min(100, (g.current / g.target) * 100) : 0), 0) / goals.length)
          : 0;
        const completedCount = goals.filter(g => g.current >= g.target).length;
        return (
          <div
            onClick={(e) => { if (e.target === e.currentTarget) setPresentMode(false); }}
            style={{
              position: "fixed", inset: 0, zIndex: 99998,
              background: "radial-gradient(1400px 800px at 70% -10%, #1f2a3a 0%, #0d1322 50%, #050a14 100%)",
              padding: "40px 24px", overflowY: "auto",
              display: "flex", flexDirection: "column", gap: 24,
              animation: "av-present-fade-in 250ms ease-out",
            }}
          >
            {/* Header avec titre + bouton close */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
              <div>
                <div style={{ fontSize: 13, color: "#7CC8C8", letterSpacing: 3, fontWeight: 700, marginBottom: 4 }}>
                  <i className="ti ti-target" /> MES OBJECTIFS
                </div>
                <h1 style={{ margin: 0, color: "#fff", fontSize: 36, fontWeight: 700 }}>
                  {completedCount === goals.length ? "🎉 Tous les objectifs atteints !" : `${completedCount} / ${goals.length} objectifs atteints`}
                </h1>
                <div style={{ marginTop: 8, fontSize: 18, color: "#bfe6e6" }}>
                  Avancement global : <b style={{ color: "#7CC8C8", fontSize: 24 }}>{totalPct}%</b>
                </div>
              </div>
              <button
                onClick={() => setPresentMode(false)}
                style={{
                  background: "rgba(124,200,200,.10)",
                  color: "#7CC8C8",
                  border: "1px solid rgba(124,200,200,.3)",
                  padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                <i className="ti ti-x" /> Fermer (ESC)
              </button>
            </div>

            {/* Grille des objectifs en grand */}
            <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: goals.length <= 3 ? "1fr" : "repeat(auto-fit, minmax(420px, 1fr))", gap: 20 }}>
              {goals.map((g) => {
                const pct = g.target > 0 ? Math.min(100, (g.current / g.target) * 100) : 0;
                const color = GOAL_COLORS.find(c => c.id === g.colorId) || GOAL_COLORS[0];
                const isComplete = g.current >= g.target;
                return (
                  <div key={g.id} style={{
                    background: "rgba(20,33,49,.6)",
                    border: `1px solid ${isComplete ? "rgba(90,160,90,.5)" : "rgba(124,200,200,.18)"}`,
                    borderRadius: 16,
                    padding: 24,
                    backdropFilter: "blur(20px)",
                    boxShadow: isComplete ? "0 0 30px rgba(90,160,90,.25)" : "0 8px 30px rgba(0,0,0,.30)",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                        {isComplete && <i className="ti ti-check" style={{ color: "#5aa05a", fontSize: 26 }} />}
                        {g.label}
                      </div>
                      <div style={{ fontSize: 18, fontFamily: "Consolas, monospace", color: "#bfe6e6" }}>
                        <b style={{ color: isComplete ? "#5aa05a" : color.bg, fontSize: 32 }}>{g.current}</b>
                        <span style={{ opacity: 0.7 }}> / {g.target}{g.unit ? ` ${g.unit}` : ""}</span>
                      </div>
                    </div>
                    {/* Barre XL */}
                    <div style={{ width: "100%", height: 22, background: "rgba(255,255,255,.08)", borderRadius: 11, overflow: "hidden", position: "relative", marginBottom: 8 }}>
                      <div style={{
                        width: `${pct}%`, height: "100%",
                        background: isComplete ? "linear-gradient(90deg, #5aa05a, #4a8a4a)" : color.grad,
                        borderRadius: 11,
                        transition: "width 600ms ease-out",
                        boxShadow: isComplete ? "0 0 16px rgba(90,160,90,.6)" : `0 0 12px ${color.bg}80`,
                      }} />
                      {[25, 50, 75].map((m) => (
                        <div key={m} style={{ position: "absolute", left: `${m}%`, top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,.20)" }} />
                      ))}
                    </div>
                    <div style={{ textAlign: "right", fontSize: 36, fontWeight: 700, color: isComplete ? "#5aa05a" : color.bg }}>
                      {Math.round(pct)}%
                    </div>
                  </div>
                );
              })}
            </div>

            <style jsx global>{`
              @keyframes av-present-fade-in {
                from { opacity: 0; transform: scale(.98); }
                to { opacity: 1; transform: scale(1); }
              }
            `}</style>
          </div>
        );
      })()}
    </Panel>
  );
}
