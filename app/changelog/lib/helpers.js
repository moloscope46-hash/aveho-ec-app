// =============================================================
//  app/changelog/lib/helpers.js (extrait depuis page.js en 0.57.2)
//
//  Petites fonctions utilitaires partagées par la page changelog
//  et ses sous-composants (NoteModal, SqlModal, etc.)
// =============================================================

// =============================================================
//  ICONS_BY_CODE — palette complète pour les bulles d'identification
//  0.57.24 : enrichi avec TOUTES les codes utilisés dans versions-data.
//
//  Avant : seuls Fix/🆕/🎂/• avaient leur couleur, le reste tombait dans
//  /^[A-Z]{1,2}$/ → bleu uniforme, ou fallback gris → indistinguable.
//
//  Maintenant : chaque type de chantier a sa couleur sémantique unique
//  pour identification visuelle immédiate dans le changelog.
// =============================================================

export const ICONS_BY_CODE = {
  // === Anciens codes spéciaux ===
  Fix:  { color: "#c0392b", label: "FIX" },
  "🆕": { color: "#5aa05a", label: "NEW" },
  "🎂": { color: "#7a6fb0", label: "BONUS" },
  "•":  { color: "#6c7a89", label: "•" },

  // === 0.57.24 : couleurs distinctes pour chaque catégorie ===
  // Frontend / Backend
  FE:  { color: "#185FA5", label: "FE" },   // Frontend → bleu Aveho
  BE:  { color: "#EF9F27", label: "BE" },   // Backend → orange
  API: { color: "#1565c0", label: "API" },  // API → bleu marine

  // Base de données
  SQL: { color: "#5aa05a", label: "SQL" },  // SQL → vert
  DB:  { color: "#2e7d32", label: "DB" },   // DB → vert foncé

  // Qualité
  FIX: { color: "#c0392b", label: "FIX" },  // Correctif → rouge
  BUG: { color: "#e65100", label: "BUG" },  // Bug → orange foncé
  AI:  { color: "#7a6fb0", label: "AI" },   // Tests AI / autom → violet

  // Sécurité
  SEC: { color: "#b71c1c", label: "SEC" },  // Sécurité → rouge foncé

  // Documentation / UX
  DOC: { color: "#00838f", label: "DOC" },  // Documentation → cyan
  UX:  { color: "#ec407a", label: "UX" },   // User eXperience → rose

  // Utilisateurs
  USR: { color: "#9575cd", label: "USR" },  // User → violet clair
};

export function getCodeMeta(code) {
  if (ICONS_BY_CODE[code]) return ICONS_BY_CODE[code];
  // Fallback pour codes 1-2 lettres non répertoriés → bleu (préserve compat)
  if (/^[A-Z]{1,2}$/.test(code)) return { color: "#185FA5", label: code };
  // Fallback ultime gris (codes 3+ lettres inconnus)
  return { color: "#6c7a89", label: code };
}

export function versionKey(s) {
  const parts = s.split(".").map(Number);
  while (parts.length < 3) parts.push(0);
  return parts;
}

export function compareVersions(a, b) {
  const ka = versionKey(a);
  const kb = versionKey(b);
  for (let i = 0; i < 3; i++) {
    if (ka[i] !== kb[i]) return ka[i] - kb[i];
  }
  return 0;
}
