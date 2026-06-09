"use client";
import { useEffect, useState, useCallback } from "react";

const TRANSLATIONS = {
  fr: {
    "menu.home": "Accueil",
    "menu.patients": "Patients",
    "menu.settings": "Paramètres",
    "common.save": "Enregistrer",
    "common.cancel": "Annuler",
    "common.delete": "Supprimer",
    "common.search": "Rechercher",
  },
  en: {
    "menu.home": "Home",
    "menu.patients": "Patients",
    "menu.settings": "Settings",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.search": "Search",
  },
  es: {
    "menu.home": "Inicio",
    "menu.patients": "Pacientes",
    "menu.settings": "Ajustes",
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.delete": "Eliminar",
    "common.search": "Buscar",
  },
};

export function useI18n() {
  const [lang, setLangState] = useState("fr");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("av-lang") || (navigator.language?.split("-")[0] || "fr");
    if (["fr", "en", "es"].includes(saved)) setLangState(saved);
  }, []);
  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem("av-lang", l); } catch {}
    document.documentElement.lang = l;
  }, []);
  const t = useCallback((key, fallback) => {
    return TRANSLATIONS[lang]?.[key] || fallback || key;
  }, [lang]);
  return { lang, setLang, t };
}
