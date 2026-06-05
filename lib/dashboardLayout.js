"use client";
// =============================================================
//  lib/dashboardLayout.js (0.58.33)
//
//  Gère la configuration personnalisable du dashboard d'accueil :
//  - widgets activés / désactivés
//  - ordre des widgets (drag & drop)
//
//  Storage : localStorage "aveho_dashboard" (rétrocompat depuis 0.6).
//  Event : "av-dashboard-layout-change" pour sync entre composants.
// =============================================================

const STORAGE_KEY = "aveho_dashboard";

// Définition canonique de tous les widgets disponibles
export const ALL_WIDGETS = [
  {
    id: "atraiter",
    label: "À traiter",
    icon: "ti-clipboard-list",
    color: "#EF9F27",
    description: "DI ouvertes, achats à valider, signalements, renouvellements RGPD, maintenances",
  },
  {
    id: "kpis",
    label: "Indicateurs clés",
    icon: "ti-chart-bar",
    color: "#185FA5",
    description: "Promotions, commandes, montant à régler",
  },
  {
    id: "raccourcis",
    label: "Raccourcis modules",
    icon: "ti-layout-grid",
    color: "#7CC8C8",
    description: "Liens rapides vers les modules principaux",
  },
  {
    id: "dernieres",
    label: "Dernières commandes",
    icon: "ti-truck-delivery",
    color: "#5aa05a",
    description: "Les 5 dernières commandes passées",
  },
  {
    id: "notifs",
    label: "Notifications récentes",
    icon: "ti-bell",
    color: "#7a6fb0",
    description: "Les 5 dernières notifications",
  },
  // 0.58.38 : 3 nouveaux widgets (citation, mini-calendrier, liens-favoris)
  {
    id: "citation",
    label: "Citation du jour",
    icon: "ti-quote",
    color: "#C9867F",
    description: "Une citation inspirante qui change chaque jour",
  },
  {
    id: "mini-calendrier",
    label: "Mini calendrier",
    icon: "ti-calendar",
    color: "#5a8f8f",
    description: "Vue calendrier du mois courant avec aujourd'hui en surbrillance",
  },
  {
    id: "liens-favoris",
    label: "Liens favoris",
    icon: "ti-bookmark",
    color: "#e35d5b",
    description: "Tes liens personnalisés (configurables, jusqu'à 8)",
  },
  // 0.58.39 : widget météo locale (Open-Meteo + géolocalisation)
  {
    id: "meteo",
    label: "Météo locale",
    icon: "ti-cloud",
    color: "#2a7ed1",
    description: "Température + conditions + vent + humidité de ta position actuelle",
  },
];

export const DEFAULT_ORDER = ["atraiter", "kpis", "raccourcis", "dernieres", "notifs", "citation", "mini-calendrier", "liens-favoris", "meteo"];
export const DEFAULT_ACTIVE = {
  atraiter: true, kpis: true, raccourcis: true, dernieres: true, notifs: true,
  // Les widgets opt-in (désactivés par défaut)
  citation: false, "mini-calendrier": false, "liens-favoris": false, meteo: false,
};

/**
 * Lit la config dashboard depuis localStorage avec rétrocompat.
 * @returns {{ active: Object<string,boolean>, order: string[] }}
 */
export function getDashboardLayout() {
  if (typeof window === "undefined") return { active: DEFAULT_ACTIVE, order: DEFAULT_ORDER };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { active: DEFAULT_ACTIVE, order: DEFAULT_ORDER };
    const data = JSON.parse(raw);
    // Rétrocompat 0.6 : juste { kpis: true, ... } sans wrap
    if (data.active || data.order) {
      return {
        active: { ...DEFAULT_ACTIVE, ...(data.active || {}) },
        order: Array.isArray(data.order) ? mergeOrder(data.order) : DEFAULT_ORDER,
      };
    }
    return { active: { ...DEFAULT_ACTIVE, ...data }, order: DEFAULT_ORDER };
  } catch {
    return { active: DEFAULT_ACTIVE, order: DEFAULT_ORDER };
  }
}

/**
 * Sauvegarde + dispatche event.
 */
export function setDashboardLayout({ active, order }) {
  if (typeof window === "undefined") return;
  try {
    const safe = {
      active: { ...DEFAULT_ACTIVE, ...active },
      order: mergeOrder(order),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    window.dispatchEvent(new CustomEvent("av-dashboard-layout-change", { detail: safe }));
  } catch {}
}

/**
 * Reset aux valeurs par défaut.
 */
export function resetDashboardLayout() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("av-dashboard-layout-change", {
      detail: { active: DEFAULT_ACTIVE, order: DEFAULT_ORDER },
    }));
  } catch {}
}

/**
 * Merge un ordre potentiellement incomplet avec le défaut :
 * - garde l'ordre des widgets connus
 * - ajoute à la fin les widgets connus mais absents (nouveaux widgets après update)
 * - retire les widgets inconnus
 */
function mergeOrder(order) {
  const known = new Set(ALL_WIDGETS.map(w => w.id));
  const filtered = (order || []).filter(id => known.has(id));
  const missing = ALL_WIDGETS.map(w => w.id).filter(id => !filtered.includes(id));
  return [...filtered, ...missing];
}
