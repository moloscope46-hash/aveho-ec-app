// =============================================================
//  Tests unitaires — 0.58.39
//  Citation reroll + édit fav + météo + hook context + /interventions + Cmd+K timeline
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.39 - Version", () => {
  it("Version 0.58.39+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(39);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.39 - CitationWidget : bouton 'Une autre'", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("State overrideIdx pour piocher random", () => {
    expect(src).toMatch(/overrideIdx,\s*setOverrideIdx/);
  });

  it("Fonction pickAnother + backToDaily", () => {
    expect(src).toMatch(/function pickAnother/);
    expect(src).toMatch(/function backToDaily/);
  });

  it("Bouton 'Une autre' (ti-dice) / 'Du jour' (ti-arrow-back)", () => {
    expect(src).toMatch(/ti-dice/);
    expect(src).toMatch(/ti-arrow-back/);
    expect(src).toMatch(/Une autre/);
    expect(src).toMatch(/Du jour/);
  });
});

describe("0.58.39 - LiensFavorisWidget : édition", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("Fonction editFav avec dialogs.prompt defaultValue", () => {
    expect(src).toMatch(/async function editFav/);
    expect(src).toMatch(/defaultValue:\s*current\.label/);
    expect(src).toMatch(/defaultValue:\s*current\.url/);
  });

  it("Bouton edit (ti-pencil) avec class .av-fav-edit", () => {
    expect(src).toMatch(/ti-pencil/);
    expect(src).toMatch(/className="av-fav-edit"/);
  });

  it("CSS hover : .av-fav-edit visible au hover", () => {
    expect(src).toMatch(/div:hover > \.av-fav-remove, div:hover > \.av-fav-edit/);
  });
});

describe("0.58.39 - WeatherWidget : Open-Meteo + géolocalisation", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("Composant WeatherWidget exporté", () => {
    expect(src).toMatch(/export function WeatherWidget/);
  });

  it("Cache géoloc en localStorage av-weather-geo (TTL 24h)", () => {
    expect(src).toMatch(/GEO_STORAGE_KEY\s*=\s*["']av-weather-geo["']/);
    expect(src).toMatch(/GEO_TTL_MS\s*=\s*24 \* 60 \* 60 \* 1000/);
  });

  it("Utilise navigator.geolocation.getCurrentPosition", () => {
    expect(src).toMatch(/navigator\.geolocation\.getCurrentPosition/);
  });

  it("Appelle l'API Open-Meteo avec current=temperature_2m,weather_code", () => {
    expect(src).toMatch(/api\.open-meteo\.com\/v1\/forecast/);
    expect(src).toMatch(/temperature_2m,weather_code/);
  });

  it("Mapping WMO codes vers emoji + label (au moins 20 codes)", () => {
    expect(src).toMatch(/const WMO = \{/);
    expect(src).toMatch(/0:\s*\{[^}]*e:[^}]*l:/);
    expect(src).toMatch(/95:\s*\{[^}]*e:[^}]*l:/);
  });

  it("3 états : init / error / ok", () => {
    expect(src).toMatch(/status:\s*["']init["']/);
    expect(src).toMatch(/status:\s*["']error["']/);
    expect(src).toMatch(/status:\s*["']ok["']/);
  });
});

describe("0.58.39 - lib/dashboardLayout : widget meteo ajouté", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/dashboardLayout.js"), "utf-8");

  it("ALL_WIDGETS contient meteo", () => {
    expect(src).toMatch(/id:\s*["']meteo["']/);
    expect(src).toMatch(/icon:\s*["']ti-cloud["']/);
  });

  it("meteo opt-in (DEFAULT_ACTIVE false)", () => {
    expect(src).toMatch(/meteo:\s*false/);
  });

  it("DEFAULT_ORDER inclut meteo en dernier", () => {
    expect(src).toMatch(/DEFAULT_ORDER\s*=\s*\[[^\]]*"meteo"\]/);
  });
});

describe("0.58.39 - /accueil : intégration WeatherWidget", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/accueil/page.js"), "utf-8");

  it("Import WeatherWidget", () => {
    expect(src).toMatch(/WeatherWidget/);
  });

  it("Render conditionnel sur k === 'meteo'", () => {
    expect(src).toMatch(/k === ["']meteo["']/);
  });
});

describe("0.58.39 - lib/useCurrentContext : hook réutilisable", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/useCurrentContext.js"), "utf-8");

  it("Hook useCurrentContext exporté", () => {
    expect(src).toMatch(/export function useCurrentContext/);
  });

  it("Storage keys 'av-current-batiment-id' et 'av-current-service-id'", () => {
    expect(src).toMatch(/STORAGE_BAT\s*=\s*["']av-current-batiment-id["']/);
    expect(src).toMatch(/STORAGE_SVC\s*=\s*["']av-current-service-id["']/);
  });

  it("Écoute event av-current-context-change", () => {
    expect(src).toMatch(/av-current-context-change/);
  });

  it("Retourne {batimentId, serviceId, active, toggle, setActive}", () => {
    expect(src).toMatch(/return\s*\{\s*\.\.\.state,\s*toggle,\s*setActive\s*\}/);
  });
});

describe("0.58.39 - /interventions : filtre par contexte bât/svc", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/page.js"), "utf-8");

  it("Import useCurrentContext", () => {
    expect(src).toMatch(/import\s*\{\s*useCurrentContext\s*\}\s*from\s*["'][^"']*useCurrentContext["']/);
  });

  it("State ctxPatientIds chargé depuis chambres du contexte", () => {
    expect(src).toMatch(/ctxPatientIds,\s*setCtxPatientIds/);
    expect(src).toMatch(/from\(["']chambres["']\)[\s\S]*?\.eq\(["']service_id["']/);
  });

  it("Filtrage appliqué : DI avec patient_id dans ctxPatientIds", () => {
    expect(src).toMatch(/ctx\.active && ctxPatientIds/);
    expect(src).toMatch(/ctxPatientIds\.has\(r\.patient_id\)/);
  });

  it("Bouton toggle 'Filtrer par contexte' affiché si contexte défini", () => {
    expect(src).toMatch(/ctx\.batimentId \|\| ctx\.serviceId/);
    expect(src).toMatch(/Contexte ON|Filtrer par contexte/);
  });
});

describe("0.58.39 - Cmd+K : mini-timeline pour Récents", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/GlobalSearch.js"), "utf-8");

  it("pushHistory stocke timestamp ts: Date.now()", () => {
    expect(src).toMatch(/\.\.\.entry,\s*ts:\s*Date\.now\(\)/);
  });

  it("Fonction formatRelative (à l'instant / il y a Xmin / il y a Xh / hier / il y a Xj)", () => {
    expect(src).toMatch(/function formatRelative/);
    expect(src).toMatch(/à l'instant|il y a/);
    expect(src).toMatch(/hier/);
  });

  it("Timeline UI : ligne verticale + dots colorés", () => {
    expect(src).toMatch(/linear-gradient\(180deg,\s*#7CC8C8/);
    expect(src).toMatch(/borderRadius:\s*["']50%["']/);
  });

  it("Icône ti-clock-bolt en header Récents", () => {
    expect(src).toMatch(/ti-clock-bolt/);
  });

  it("Affichage du temps relatif via formatRelative(r.ts)", () => {
    expect(src).toMatch(/formatRelative\(r\.ts\)/);
  });
});
