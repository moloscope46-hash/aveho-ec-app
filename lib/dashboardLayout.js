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
  // 0.58.40 : widget notes personnelles (markdown léger + auto-save)
  {
    id: "notes",
    label: "Mes notes",
    icon: "ti-notes",
    color: "#EF9F27",
    description: "Bloc-notes personnel avec markdown léger (gras, italique, liste, lien, titre)",
  },
  // 0.58.43 : widget objectifs personnels avec progress bars
  {
    id: "objectifs",
    label: "Mes objectifs",
    icon: "ti-target",
    color: "#185FA5",
    description: "Suivi de tes objectifs personnels avec progress bars et milestones (jusqu'à 6)",
  },
  // 0.58.57 : widget vue des objectifs partagés par les membres de mes équipes
  {
    id: "objectifs-equipe",
    label: "Objectifs équipe",
    icon: "ti-users-group",
    color: "#7CC8C8",
    description: "Objectifs partagés par les autres membres de tes équipes (lecture seule)",
  },
  // 0.62.130 : widgets BI étendus
  {
    id: "top-sav",
    label: "Top 5 matériels en SAV",
    icon: "ti-trending-down",
    color: "#e35d5b",
    description: "Les 5 matériels avec le plus d'interventions sur les 30 derniers jours",
  },
  {
    id: "activite-semaine",
    label: "Activité 7 derniers jours",
    icon: "ti-chart-line",
    color: "#185FA5",
    description: "Vue d'ensemble : interventions, signalements, commandes, transferts de la semaine",
  },
  // 0.62.131 : widgets BI supplémentaires
  {
    id: "top-collab",
    label: "Top 5 collaborateurs actifs",
    icon: "ti-trophy",
    color: "#EF9F27",
    description: "Classement des collaborateurs les plus actifs sur les interventions (30j)",
  },
  {
    id: "temps-moyen",
    label: "Temps moyen de résolution",
    icon: "ti-clock-hour-4",
    color: "#7CC8C8",
    description: "Durée moyenne de résolution des interventions sur 30 jours (avec min/max)",
  },
  // 0.62.132 : widgets BI SLA + charge équipe
  {
    id: "sla-respect",
    label: "SLA respect (gauge)",
    icon: "ti-target-arrow",
    color: "#5aa05a",
    description: "Pourcentage d'interventions résolues dans les délais SLA (selon urgence). Gauge circulaire animée.",
  },
  {
    id: "charge-equipes",
    label: "Charge des équipes",
    icon: "ti-users-group",
    color: "#7a6fb0",
    description: "Nombre d'interventions en cours par équipe (top 5). Code couleur : vert <5, ambre 5-10, rouge >=10.",
  },
  // 0.62.133 : Top patients + Top fournisseurs
  {
    id: "top-patients",
    label: "Top 5 patients suivis",
    icon: "ti-user-heart",
    color: "#5e4a8c",
    description: "Patients avec le plus d'interventions sur 90 jours",
  },
  {
    id: "top-fournisseurs",
    label: "Top 5 fournisseurs",
    icon: "ti-building-warehouse",
    color: "#5a8f8f",
    description: "Fournisseurs avec le plus de commandes sur 90 jours",
  },
  // 0.62.134 : Taux de panne par catégorie
  {
    id: "taux-panne",
    label: "Taux de panne par catégorie",
    icon: "ti-tools-kitchen-off",
    color: "#e35d5b",
    description: "Identifie les catégories de matériel les plus problématiques (interventions / parc sur 90j)",
  },
  // 0.64.0 : Comparatif vs N-1
  {
    id: "comparatif-n1",
    label: "Comparatif vs année N-1",
    icon: "ti-chart-arcs",
    color: "#5e4a8c",
    description: "DI, signalements, tournées : mois en cours vs même mois l'année dernière, avec delta %",
  },
  // 0.64.0 : Évolution 6 mois
  {
    id: "evolution-6m",
    label: "Évolution sur 6 mois",
    icon: "ti-chart-line",
    color: "#185FA5",
    description: "Bar chart du volume DI sur les 6 derniers mois, mois courant en surbrillance",
  },
  // 0.65.0 : Heatmap géographique
  {
    id: "heatmap-geo",
    label: "Heatmap densité activité",
    icon: "ti-map-2",
    color: "#5aa05a",
    description: "Top 10 villes par nombre de DI sur 90j, avec barre heat colorée (vert/orange/rouge) selon intensité",
  },
];

export const DEFAULT_ORDER = ["atraiter", "kpis", "raccourcis", "dernieres", "notifs", "citation", "mini-calendrier", "liens-favoris", "meteo", "notes", "objectifs", "objectifs-equipe", "top-sav", "activite-semaine", "top-collab", "temps-moyen", "sla-respect", "charge-equipes", "top-patients", "top-fournisseurs", "taux-panne", "comparatif-n1", "evolution-6m", "heatmap-geo"];
export const DEFAULT_ACTIVE = {
  atraiter: true, kpis: true, raccourcis: true, dernieres: true, notifs: true,
  // Les widgets opt-in (désactivés par défaut)
  citation: false, "mini-calendrier": false, "liens-favoris": false, meteo: false, notes: false, objectifs: false,
  "objectifs-equipe": false,
  // 0.62.130 : BI widgets opt-in
  "top-sav": false, "activite-semaine": false,
  // 0.62.131 : BI widgets supplémentaires opt-in
  "top-collab": false, "temps-moyen": false,
  // 0.62.132 : SLA + charge équipes
  "sla-respect": false, "charge-equipes": false,
  // 0.62.133 : Top patients + Top fournisseurs
  "top-patients": false, "top-fournisseurs": false,
  // 0.62.134 : Taux de panne
  "taux-panne": false,
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
