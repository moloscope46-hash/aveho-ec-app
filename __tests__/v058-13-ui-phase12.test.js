// =============================================================
//  Tests unitaires — 0.58.13 UI PHASE 12
//
//  RangePicker (plage de dates avec presets)
//  + Stepper (wizard multi-étapes avec Body + Footer)
//  + BulkToolbar (action bar contextuelle multi-sélection)
//  + Refonte Notifications avec Drawer
//  + Migration dialogs.alert/confirm legacy → Dialog premium
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.13 - Version", () => {
  it("Version 0.58.13+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(13);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.13 - RangePicker", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/RangePicker.js"), "utf-8");

  it("'use client' + export default function RangePicker", () => {
    expect(src).toMatch(/^["']use client["']/);
    expect(src).toMatch(/export default function RangePicker/);
  });

  it("Value = { from, to } pattern", () => {
    expect(src).toMatch(/value\s*=\s*\{\s*from:\s*["']{2},\s*to:\s*["']{2}\s*\}/);
  });

  it("5 presets par défaut : 7d, 30d, 3m, 6m, 1y", () => {
    expect(src).toMatch(/DEFAULT_PRESETS/);
    expect(src).toMatch(/id:\s*["']7d["']/);
    expect(src).toMatch(/id:\s*["']30d["']/);
    expect(src).toMatch(/id:\s*["']3m["']/);
    expect(src).toMatch(/id:\s*["']6m["']/);
    expect(src).toMatch(/id:\s*["']1y["']/);
  });

  it("Helpers : shiftDays, shiftMonths, formatDateFR", () => {
    expect(src).toMatch(/function shiftDays/);
    expect(src).toMatch(/function shiftMonths/);
    expect(src).toMatch(/function formatDateFR/);
    expect(src).toMatch(/toLocaleDateString\(["']fr-FR["']/);
  });

  it("Click outside pour fermer", () => {
    expect(src).toMatch(/document\.addEventListener\(["']mousedown["']/);
  });

  it("Draft state + apply/clear", () => {
    expect(src).toMatch(/draftFrom/);
    expect(src).toMatch(/draftTo/);
    expect(src).toMatch(/function applyCustom/);
    expect(src).toMatch(/function clearAll/);
    expect(src).toMatch(/function applyPreset/);
  });

  it("max/min sur les inputs pour cohérence from <= to", () => {
    expect(src).toMatch(/max=\{draftTo\s*\|\|\s*undefined\}/);
    expect(src).toMatch(/min=\{draftFrom\s*\|\|\s*undefined\}/);
  });

  it("Exporté depuis ui-premium", () => {
    const idx = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/index.js"), "utf-8");
    expect(idx).toMatch(/RangePicker/);
  });
});

describe("0.58.13 - Stepper (wizard multi-étapes)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/Stepper.js"), "utf-8");

  it("'use client' + export default function Stepper", () => {
    expect(src).toMatch(/^["']use client["']/);
    expect(src).toMatch(/export default function Stepper/);
  });

  it("Props : active, steps, onStepClick, allowSkipForward, size", () => {
    expect(src).toMatch(/active\s*=\s*0/);
    expect(src).toMatch(/steps\s*=\s*\[\]/);
    expect(src).toMatch(/onStepClick,/);
    expect(src).toMatch(/allowSkipForward\s*=\s*false/);
  });

  it("3 tailles (sm 28 / md 32 / lg 36)", () => {
    expect(src).toMatch(/sm:\s*\{[^}]*circle:\s*28/);
    expect(src).toMatch(/md:\s*\{[^}]*circle:\s*32/);
    expect(src).toMatch(/lg:\s*\{[^}]*circle:\s*36/);
  });

  it("3 états : done (gradient teal + check) / current (navy + glow) / future (gris)", () => {
    expect(src).toMatch(/done\s*=\s*i\s*<\s*active/);
    expect(src).toMatch(/current\s*=\s*i\s*===\s*active/);
    expect(src).toMatch(/future\s*=\s*i\s*>\s*active/);
  });

  it("Trait connecteur entre étapes", () => {
    expect(src).toMatch(/i\s*<\s*steps\.length\s*-\s*1\s*&&\s*\(/);
  });

  it("Click step : par défaut backward only, allowSkipForward override", () => {
    expect(src).toMatch(/function clickStep/);
    expect(src).toMatch(/i\s*<\s*active\s*\|\|\s*allowSkipForward/);
  });

  it("aria-current=step sur l'étape active", () => {
    expect(src).toMatch(/aria-current=\{current\s*\?\s*["']step["']/);
  });

  it("StepperBody + StepperFooter sub-exports", () => {
    expect(src).toMatch(/export function StepperBody/);
    expect(src).toMatch(/export function StepperFooter/);
    expect(src).toMatch(/Stepper\.Body\s*=\s*StepperBody/);
    expect(src).toMatch(/Stepper\.Footer\s*=\s*StepperFooter/);
  });

  it("StepperFooter avec prev/next/submit + indicateur 'Étape X sur N'", () => {
    expect(src).toMatch(/prevLabel\s*=\s*["']Précédent["']/);
    expect(src).toMatch(/nextLabel\s*=\s*["']Suivant["']/);
    expect(src).toMatch(/submitLabel\s*=\s*["']Valider["']/);
    expect(src).toMatch(/Étape/);
  });

  it("Bouton submit (last step) avec gradient vert success", () => {
    expect(src).toMatch(/isLast[\s\S]*?#5aa05a/);
  });
});

describe("0.58.13 - BulkToolbar (multi-sélection contextuelle)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/BulkToolbar.js"), "utf-8");

  it("'use client' + export default function BulkToolbar", () => {
    expect(src).toMatch(/^["']use client["']/);
    expect(src).toMatch(/export default function BulkToolbar/);
  });

  it("Props : count, onClear, actions, position, itemName, itemNamePlural", () => {
    expect(src).toMatch(/count\s*=\s*0/);
    expect(src).toMatch(/onClear,/);
    expect(src).toMatch(/actions\s*=\s*\[\]/);
    expect(src).toMatch(/position\s*=\s*["']bottom["']/);
    expect(src).toMatch(/itemName\s*=\s*["']élément["']/);
  });

  it("Retourne null si count <= 0", () => {
    expect(src).toMatch(/if \(count <= 0\) return null/);
  });

  it("Display count mémorisé pour éviter flash '0' pendant exit", () => {
    expect(src).toMatch(/displayCount/);
    expect(src).toMatch(/setDisplayCount/);
  });

  it("Animation av-bulk-toolbar-in déclarée + utilisée", () => {
    expect(src).toMatch(/animation:\s*`av-bulk-toolbar-in/);
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/@keyframes av-bulk-toolbar-in/);
    expect(css).toMatch(/scale\(0\.92\)/);
  });

  it("Action variant=danger en rouge tendre", () => {
    expect(src).toMatch(/isDanger\s*=\s*a\.variant\s*===\s*["']danger["']/);
    expect(src).toMatch(/#f5b6b0/);
  });

  it("Bouton close avec rotation 90deg au hover (cohérent avec drawer/modal)", () => {
    expect(src).toMatch(/style\.transform\s*=\s*["']rotate\(90deg\)["']/);
  });

  it("Compteur badge avec gradient teal + shadow", () => {
    expect(src).toMatch(/linear-gradient\(135deg,\s*#7CC8C8/);
    expect(src).toMatch(/rgba\(124,200,200,\.40\)/);
  });

  it("BulkToolbar exporté", () => {
    const idx = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/index.js"), "utf-8");
    expect(idx).toMatch(/BulkToolbar/);
  });
});

describe("0.58.13 - Refonte Notifications panel avec Drawer", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/NotifBell.js"), "utf-8");

  it("Import Drawer depuis ui-premium", () => {
    expect(src).toMatch(/import\s+\{\s*Drawer\s*\}\s+from\s+["']\.\/components\/ui-premium["']/);
  });

  it("Utilise <Drawer> au lieu de <div className='notif-panel'>", () => {
    expect(src).toMatch(/<Drawer\b/);
    expect(src).toMatch(/<Drawer[\s\S]*?title="Notifications"/);
    expect(src).toMatch(/<Drawer[\s\S]*?side="right"/);
  });

  it("Subtitle dynamique : 'X non lues' ou 'Tout est à jour'", () => {
    expect(src).toMatch(/non lue\$\{nonLues\s*>\s*1\s*\?\s*["']s["']\s*:\s*["']{2}\}|Tout est à jour/);
  });

  it("Footer Drawer = bouton 'Tout marquer comme lu' uniquement si nonLues > 0", () => {
    expect(src).toMatch(/footer=\{nonLues\s*>\s*0\s*\?/);
    expect(src).toMatch(/Tout marquer comme lu/);
  });

  it("Empty state avec icon ti-bell-off", () => {
    expect(src).toMatch(/ti-bell-off/);
    expect(src).toMatch(/Aucune notification/);
  });

  it("Plus de className='notif-panel' (ancien layout supprimé)", () => {
    // Doit avoir disparu sauf dans commentaires
    const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(codeOnly).not.toMatch(/className="notif-panel"/);
  });
});

describe("0.58.13 - Migration dialogs.alert/confirm → Dialog premium", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/dialogs.js"), "utf-8");

  it("Helper tryNewDialog avec import dynamique de Dialog", () => {
    expect(src).toMatch(/function tryNewDialog/);
    expect(src).toMatch(/import\(["']\.\/components\/ui-premium\/Dialog["']\)/);
  });

  it("dialogs.confirm délègue à Dialog.confirm() avec mapping danger", () => {
    expect(src).toMatch(/confirm\(options\)\s*\{[\s\S]*?tryNewDialog\(["']confirm["']/);
    expect(src).toMatch(/danger:\s*options\?\.variant\s*===\s*["']danger["']/);
  });

  it("dialogs.alert délègue à Dialog.alert() avec normalisation string", () => {
    expect(src).toMatch(/alert\(options\)\s*\{[\s\S]*?typeof\s+options\s*===\s*["']string["']/);
    expect(src).toMatch(/tryNewDialog\(["']alert["']/);
  });

  it("Mapping variant legacy → variant Dialog premium", () => {
    expect(src).toMatch(/variantMap\s*=\s*\{[^}]*primary:\s*["']info["'][\s\S]*?danger:\s*["']danger["']/);
  });

  it("Fallback legacy conservé (setConfirmGlobal / setAlertGlobal)", () => {
    expect(src).toMatch(/Fallback legacy/);
    expect(src).toMatch(/setConfirmGlobal/);
    expect(src).toMatch(/setAlertGlobal/);
  });

  it("typeof window === undefined → null (SSR safe)", () => {
    expect(src).toMatch(/typeof window === ["']undefined["']/);
  });
});

describe("0.58.13 - Récap composants premium (17 au total)", () => {
  it("17 composants exportés depuis ui-premium", () => {
    const idx = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/index.js"), "utf-8");
    const components = [
      "KpiCard", "Sparkline", "MetricCard",
      "Skeleton", "SkeletonText", "SkeletonRow", "SkeletonGrid",
      "SkeletonCard", "SkeletonAvatar", "SkeletonKpi",
      "EmptyState",
      "Toast", "showToast", "toast",
      "PageHero",
      "Tabs", "TabPanel",
      "Avatar", "AvatarGroup",
      "Select",
      "DatePicker",
      "Combobox",
      "TimePicker",
      "Dialog",
      "Drawer",
      // Nouveaux 0.58.13
      "RangePicker",
      "Stepper", "StepperBody", "StepperFooter",
      "BulkToolbar",
    ];
    for (const c of components) {
      expect(idx).toMatch(new RegExp(`\\b${c}\\b`));
    }
  });
});
