// =============================================================
//  lib/constants.js (Alpha 0.55.26)
//
//  Constantes partagées : couleurs, statuts, gradients, icônes.
//  Évite les valeurs hardcodées dispersées dans tous les composants.
//
//  Note : pour les valeurs CSS critiques (animations, layout),
//  utiliser les variables CSS dans globals.css au lieu de ces constantes.
// =============================================================

// ============================================================
//  Couleurs sémantiques (status)
// ============================================================
export const COLOR = {
  // Charte principale
  navy: "#142131",
  teal: "#7CC8C8",
  blue: "#185FA5",
  violet: "#7a6fb0",

  // États
  ok: "#5aa05a",       // vert succès / actif
  okBg: "#dff5e0",     // fond vert clair
  okDeep: "#2e6f33",   // vert foncé
  ko: "#c0392b",       // rouge erreur / refusé
  koBg: "#fce5e0",     // fond rouge clair
  koDeep: "#7a1f15",   // rouge foncé
  warn: "#EF9F27",     // ambre warning
  warnBg: "#fff4d6",   // fond ambre clair
  warnDeep: "#7a4f15", // ambre foncé
  unknown: "#8a98a8",  // gris neutre
  unknownBg: "#f4f7fa",
  border: "#e3e9ee",
  borderDark: "#d3d9e0",

  // Texte
  text: "#142131",
  textMuted: "#6c7a89",
  textLight: "#8a98a8",
};

// ============================================================
//  Gradients réutilisables
// ============================================================
export const GRADIENT = {
  primary: "linear-gradient(135deg, #142131 0%, #185FA5 100%)",
  success: "linear-gradient(135deg, #142131 0%, #5aa05a 100%)",
  danger: "linear-gradient(135deg, #c0392b, #e74c3c)",
  warn: "linear-gradient(135deg, #142131 0%, #EF9F27 100%)",
  teal: "linear-gradient(135deg, #185FA5, #7CC8C8)",
  violet: "linear-gradient(135deg, #142131, #7a6fb0)",
  empreinte: "linear-gradient(135deg, #185FA5, #7CC8C8)",
  face: "linear-gradient(135deg, #7a6fb0, #bfa9e0)",
};

// ============================================================
//  Icônes par feature (Tabler Icons)
// ============================================================
export const ICON = {
  fingerprint: "ti-fingerprint",
  face: "ti-face-id",
  wifi: "ti-wifi",
  wifiOff: "ti-wifi-off",
  bell: "ti-bell",
  bellOff: "ti-bell-off",
  mapPin: "ti-map-pin",
  mapPinOff: "ti-map-pin-off",
  pwa: "ti-device-mobile",
  pwaInstalled: "ti-device-mobile-check",
  sw: "ti-cloud-check",
  swOff: "ti-cloud-off",
  shield: "ti-shield-check",
  lock: "ti-lock",
  unlock: "ti-lock-open",
  check: "ti-circle-check",
  cross: "ti-circle-x",
  alert: "ti-alert-triangle",
  info: "ti-info-circle",
  loader: "ti-loader-2",
  flask: "ti-flask",
  database: "ti-database",
};

// ============================================================
//  Helpers UI
// ============================================================

/** Renvoie la couleur d'état d'un objet {ok, ko} */
export function colorForState(state) {
  if (!state) return COLOR.unknown;
  if (state.ok) return COLOR.ok;
  if (state.ko) return COLOR.ko;
  if (state.warn) return COLOR.warn;
  return COLOR.unknown;
}

/** Renvoie le badge label pour un état */
export function labelForState(state) {
  if (!state) return "INCONNU";
  if (state.ok) return "ACTIF";
  if (state.ko) return "REFUSÉ";
  if (state.warn) return "ATTENTION";
  return "INACTIF";
}
