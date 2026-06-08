"use client";
// 0.62.128 : ThemeProvider — applique le thème au boot

import { useEffect } from "react";
import { applyTheme, loadTheme, loadThemeFromStructure } from "../../lib/themeManager";
import { useAuth } from "../../lib/useAuth";

export default function ThemeProvider({ children }) {
  const auth = useAuth();

  useEffect(() => {
    // 1. Charge depuis localStorage immédiatement
    const local = loadTheme();
    applyTheme(local);

    // 2. Si user connecté, charge le thème de la structure (priorité haute)
    if (auth?.structureId) {
      loadThemeFromStructure(auth.structureId).then(structTheme => {
        if (structTheme) applyTheme(structTheme);
      });
    }
  }, [auth?.structureId]);

  return children || null;
}
