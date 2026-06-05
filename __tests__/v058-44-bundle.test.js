// =============================================================
//  Tests unitaires — 0.58.44
//  Fix dialogs.prompt + Météo enrichie + Bannière widgets bonus
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.44 - Version", () => {
  it("Version 0.58.44+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(44);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.44 - dialogs.prompt fix", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/dialogs.js"), "utf-8");

  it("dialogs.prompt(options) exposé sur le singleton", () => {
    expect(src).toMatch(/prompt\s*\(options\)\s*\{/);
  });

  it("Délègue à tryNewDialog('prompt', ...) pour Dialog premium", () => {
    expect(src).toMatch(/tryNewDialog\(["']prompt["']/);
  });

  it("Passe defaultValue, placeholder, okLabel, cancelLabel", () => {
    expect(src).toMatch(/defaultValue:\s*opts\.defaultValue/);
    expect(src).toMatch(/placeholder:\s*opts\.placeholder/);
  });

  it("Fallback window.prompt() si Dialog premium indispo", () => {
    expect(src).toMatch(/window\.prompt/);
  });
});

describe("0.58.44 - WeatherWidget enrichi", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("State contient locationName + forecast", () => {
    expect(src).toMatch(/status:\s*["']init["'][\s\S]*?locationName/);
    expect(src).toMatch(/forecast/);
  });

  it("Géocodage inverse via api-adresse.data.gouv.fr (BAN)", () => {
    expect(src).toMatch(/api-adresse\.data\.gouv\.fr\/reverse/);
  });

  it("Fallback Open-Meteo geocoding (mondial)", () => {
    expect(src).toMatch(/geocoding-api\.open-meteo\.com\/v1\/reverse/);
  });

  it("API Open-Meteo enrichie : apparent_temperature, pressure_msl, cloud_cover, visibility", () => {
    expect(src).toMatch(/apparent_temperature/);
    expect(src).toMatch(/pressure_msl/);
    expect(src).toMatch(/cloud_cover/);
    expect(src).toMatch(/visibility/);
  });

  it("Daily forecast : temperature_2m_max/min, sunrise/sunset, uv_index_max, precipitation_sum", () => {
    expect(src).toMatch(/temperature_2m_max,temperature_2m_min/);
    expect(src).toMatch(/sunrise,sunset/);
    expect(src).toMatch(/uv_index_max/);
    expect(src).toMatch(/precipitation_sum/);
  });

  it("forecast_days=4 (aujourd'hui + 3 jours)", () => {
    expect(src).toMatch(/forecast_days=4/);
  });

  it("Helper windDirCardinal (N/NE/E/SE/S/SO/O/NO)", () => {
    expect(src).toMatch(/function windDirCardinal/);
    expect(src).toMatch(/\["N",\s*"NE",\s*"E",\s*"SE",\s*"S",\s*"SO",\s*"O",\s*"NO"\]/);
  });

  it("Affiche le nom du lieu dans le titre quand state.locationName disponible", () => {
    expect(src).toMatch(/state\.locationName[\s\S]*?Météo · /);
  });

  it("Toggle prévisions 3 jours via showForecast", () => {
    expect(src).toMatch(/showForecast,\s*setShowForecast/);
  });

  it("Indice UV avec couleur et label (Faible/Modéré/Élevé/Très élevé)", () => {
    expect(src).toMatch(/uvLabel/);
    expect(src).toMatch(/Très élevé/);
  });

  it("Min/Max du jour affichés à droite du bloc principal", () => {
    expect(src).toMatch(/dailyMax[\s\S]*?dailyMin/);
    expect(src).toMatch(/ti-arrow-up[\s\S]*?ti-arrow-down/);
  });

  it("Bloc précipitations affiché si > 0", () => {
    expect(src).toMatch(/precipitation > 0 \|\| precipSum > 0/);
    expect(src).toMatch(/ti-cloud-rain/);
  });

  it("Grille d'infos détaillées (Vent + dir cardinale, Humid, Pression, Visib, UV, Nuages, Lever, Coucher)", () => {
    expect(src).toMatch(/ti-gauge/);  // Pression
    expect(src).toMatch(/ti-eye/);    // Visibilité
    expect(src).toMatch(/ti-sunrise/); // Lever
    expect(src).toMatch(/ti-sunset/);  // Coucher
  });
});

describe("0.58.44 - Bannière widgets bonus + badge personnaliser", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/accueil/page.js"), "utf-8");

  it("Badge sur bouton 'Personnaliser' avec compteur de widgets cachés", () => {
    expect(src).toMatch(/hiddenOptIn[\s\S]*?ALL_WIDGETS\.filter\(w => !widgets\[w\.id\]\)/);
    expect(src).toMatch(/widget.*bonus disponible/);
  });

  it("Bannière dismissable avec storage 'av-widgets-banner-dismissed'", () => {
    expect(src).toMatch(/av-widgets-banner-dismissed/);
  });

  it("State bannerDismissed (true par défaut pour SSR)", () => {
    expect(src).toMatch(/bannerDismissed,\s*setBannerDismissed/);
    expect(src).toMatch(/useState\(true\)[\s\S]*?bannerDismissed/);
  });

  it("Bouton 'Découvrir' qui ouvre editLayout", () => {
    expect(src).toMatch(/Découvrir/);
    expect(src).toMatch(/setEditLayout\(true\)/);
  });

  it("Affiche jusqu'à 6 widgets en preview dans la bannière", () => {
    expect(src).toMatch(/hiddenOptIn\.slice\(0,\s*6\)/);
  });

  it("Bannière cachée pendant editLayout ou si déjà dismissée", () => {
    expect(src).toMatch(/editLayout \|\| bannerDismissed/);
  });
});
