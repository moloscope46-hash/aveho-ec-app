// =============================================================
//  Tests unitaires — 0.58.38
//  Mode présentation masquer notifs + 3 widgets + filtrage patients
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.38 - Version", () => {
  it("Version 0.58.38+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(38);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.38 - Mode présentation : masquer notifs", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/presentationMode.js"), "utf-8");

  it("isPresentationHideNotifs / setPresentationHideNotifs exportés", () => {
    expect(src).toMatch(/export function isPresentationHideNotifs/);
    expect(src).toMatch(/export function setPresentationHideNotifs/);
  });

  it("Storage key 'av-presentation-hide-notifs' (purgeable au logout via 'av-')", () => {
    expect(src).toMatch(/HIDE_NOTIFS_KEY\s*=\s*["']av-presentation-hide-notifs["']/);
  });

  it("Event 'av-presentation-hide-notifs-change' dispatched", () => {
    expect(src).toMatch(/av-presentation-hide-notifs-change/);
  });

  it("Init applique hide-notifs au refresh", () => {
    expect(src).toMatch(/if \(isPresentationHideNotifs\(\)\) applyHideNotifs\(true\)/);
  });
});

describe("0.58.38 - CSS : hide notifs en mode présentation", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("Selector av-presentation-mode.av-presentation-hide-notifs cache .notif-wrap", () => {
    expect(src).toMatch(/html\.av-presentation-mode\.av-presentation-hide-notifs \.notif-wrap/);
  });
});

describe("0.58.38 - lib/dashboardLayout : 3 nouveaux widgets opt-in", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/dashboardLayout.js"), "utf-8");

  it("ALL_WIDGETS contient citation / mini-calendrier / liens-favoris", () => {
    expect(src).toMatch(/id:\s*["']citation["']/);
    expect(src).toMatch(/id:\s*["']mini-calendrier["']/);
    expect(src).toMatch(/id:\s*["']liens-favoris["']/);
  });

  it("DEFAULT_ACTIVE : nouveaux widgets opt-in (false par défaut)", () => {
    expect(src).toMatch(/citation:\s*false/);
    expect(src).toMatch(/["']mini-calendrier["']:\s*false/);
    expect(src).toMatch(/["']liens-favoris["']:\s*false/);
  });

  it("DEFAULT_ORDER inclut les 3 nouveaux à la fin", () => {
    // 0.58.41 : assoupli — les 3 widgets 0.58.38 sont présents, peu importe ce qui vient après
    expect(src).toMatch(/DEFAULT_ORDER\s*=\s*\[[^\]]*"citation"[^\]]*"mini-calendrier"[^\]]*"liens-favoris"[^\]]*\]/);
  });
});

describe("0.58.38 - app/components/DashboardWidgets : 3 widgets", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("CitationWidget exporté + 30 citations + hash déterministe sur date", () => {
    expect(src).toMatch(/export function CitationWidget/);
    expect(src).toMatch(/const CITATIONS = \[/);
    expect(src).toMatch(/function pickCitation/);
    expect(src).toMatch(/hash\s*=\s*\(hash \* 31 \+ key\.charCodeAt\(i\)\)/);
  });

  it("MiniCalendrierWidget : navigation prev/next + today highlight", () => {
    expect(src).toMatch(/export function MiniCalendrierWidget/);
    expect(src).toMatch(/function shiftMonth/);
    expect(src).toMatch(/isToday/);
    expect(src).toMatch(/FR_MONTHS|FR_DAYS/);
  });

  it("LiensFavorisWidget : 8 slots max + storage av-favorite-links + add/remove", () => {
    expect(src).toMatch(/export function LiensFavorisWidget/);
    expect(src).toMatch(/FAV_STORAGE_KEY\s*=\s*["']av-favorite-links["']/);
    expect(src).toMatch(/FAV_MAX\s*=\s*8/);
    expect(src).toMatch(/function addFav/);
    expect(src).toMatch(/function removeFav/);
  });

  it("LiensFavorisWidget : URLs externes ouvrent en nouveau onglet", () => {
    expect(src).toMatch(/window\.open\(f\.url,\s*["']_blank["']/);
  });
});

describe("0.58.38 - /accueil : integration des 3 widgets", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/accueil/page.js"), "utf-8");

  it("Import des 3 widgets", () => {
    expect(src).toMatch(/import\s*\{[^}]*CitationWidget[^}]*MiniCalendrierWidget[^}]*LiensFavorisWidget[^}]*\}\s*from/);
  });

  it("Render conditionnel sur k === 'citation' / 'mini-calendrier' / 'liens-favoris'", () => {
    expect(src).toMatch(/k === ["']citation["']/);
    expect(src).toMatch(/k === ["']mini-calendrier["']/);
    expect(src).toMatch(/k === ["']liens-favoris["']/);
  });
});

describe("0.58.38 - /patients : filtrage par contexte bât/svc", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/patients/page.js"), "utf-8");

  it("State ctxFilter + listener av-current-context-change", () => {
    expect(src).toMatch(/ctxFilter,\s*setCtxFilter/);
    expect(src).toMatch(/av-current-context-change/);
  });

  it("Filtrage appliqué selon batimentId / serviceId si ctxFilter.active", () => {
    expect(src).toMatch(/ctxFilter\.active && \(ctxFilter\.batimentId \|\| ctxFilter\.serviceId\)/);
    expect(src).toMatch(/ctxFilter\.serviceId && ch\.service_id !== ctxFilter\.serviceId/);
    expect(src).toMatch(/ctxFilter\.batimentId && ch\.batiment_id !== ctxFilter\.batimentId/);
  });

  it("Bouton toggle 'Filtrer par contexte' affiché si contexte défini", () => {
    expect(src).toMatch(/ctxFilter\.batimentId \|\| ctxFilter\.serviceId/);
    expect(src).toMatch(/Contexte ON|Filtrer par contexte/);
  });
});

describe("0.58.38 - /profil : toggle hide notifs pour mode présentation", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/profil/page.js"), "utf-8");

  it("Import isPresentationHideNotifs + setPresentationHideNotifs", () => {
    expect(src).toMatch(/isPresentationHideNotifs[\s\S]*setPresentationHideNotifs[\s\S]*from\s*["'][^"']*presentationMode["']/);
  });

  it("Checkbox 'Masquer les notifications pendant les démos'", () => {
    expect(src).toMatch(/Masquer les notifications pendant les démos/);
  });

  it("Checkbox disabled si mode présentation OFF", () => {
    expect(src).toMatch(/disabled=\{!isOn\}/);
  });
});
