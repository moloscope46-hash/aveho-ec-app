// =============================================================
//  app/changelog/lib/helpers.js (extrait depuis page.js en 0.57.2)
//
//  Petites fonctions utilitaires partagées par la page changelog
//  et ses sous-composants (NoteModal, SqlModal, etc.)
// =============================================================

export const ICONS_BY_CODE = {
  Fix: { color: "#c0392b", label: "FIX" },
  "🆕": { color: "#5aa05a", label: "NEW" },
  "🎂": { color: "#7a6fb0", label: "BONUS" },
  "•": { color: "#6c7a89", label: "•" },
};

export function getCodeMeta(code) {
  if (ICONS_BY_CODE[code]) return ICONS_BY_CODE[code];
  if (/^[A-Z]{1,2}$/.test(code)) return { color: "#185FA5", label: code };
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
