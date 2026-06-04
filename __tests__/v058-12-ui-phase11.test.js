// =============================================================
//  Tests unitaires — 0.58.12 UI PHASE 11
//
//  TimePicker custom + Migration 5 selects modal interventions
//  + Toast action button stylisé + toast.undo() helper
//  + Composant Dialog (confirm/prompt/alert) + Drawer Side
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.12 - Version", () => {
  it("Version 0.58.12+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(12);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.12 - TimePicker custom", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/TimePicker.js"), "utf-8");

  it("'use client' + export default function TimePicker", () => {
    expect(src).toMatch(/^["']use client["']/);
    expect(src).toMatch(/export default function TimePicker/);
  });

  it("Helpers toMinutes + toHHMM", () => {
    expect(src).toMatch(/function toMinutes/);
    expect(src).toMatch(/function toHHMM/);
  });

  it("Props : value, onChange, step, minTime, maxTime, disabled, size, fullWidth", () => {
    expect(src).toMatch(/value\s*=\s*["']{2}/);
    expect(src).toMatch(/onChange,/);
    expect(src).toMatch(/step\s*=\s*30/);
    expect(src).toMatch(/minTime\s*=\s*["']00:00["']/);
    expect(src).toMatch(/maxTime\s*=\s*["']23:59["']/);
    expect(src).toMatch(/size\s*=\s*["']md["']/);
  });

  it("Génère les slots avec useMemo selon step + min/max", () => {
    expect(src).toMatch(/useMemo\(/);
    expect(src).toMatch(/for\s*\(let m = startMin; m <= endMin; m \+= step\)/);
  });

  it("Auto-scroll vers la valeur sélectionnée à l'ouverture", () => {
    expect(src).toMatch(/data-slot=\{slot\}/);
    expect(src).toMatch(/dropdownRef\.current\?\.querySelector\(`\[data-slot=/);
  });

  it("Click outside pour fermer", () => {
    expect(src).toMatch(/document\.addEventListener\(["']mousedown["']/);
  });

  it("Keyboard : Enter/Space/ArrowDown ouvre, Escape ferme", () => {
    expect(src).toMatch(/e\.key === ["']Enter["']/);
    expect(src).toMatch(/e\.key === ["']ArrowDown["']/);
    expect(src).toMatch(/e\.key === ["']Escape["']/);
  });

  it("TimePicker exporté depuis ui-premium", () => {
    const idx = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/index.js"), "utf-8");
    expect(idx).toMatch(/TimePicker/);
  });
});

describe("0.58.12 - Migration 5 selects modal interventions", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/page.js"), "utf-8");

  it("DatePicker importé pour échéance", () => {
    expect(src).toMatch(/import\s+\{[^}]*DatePicker[^}]*\}\s+from\s+["'][^"']*ui-premium["']/);
    expect(src).toMatch(/<DatePicker[\s\S]*?value=\{form\.due_date/);
  });

  it("Select premium sur form.type (type de demande)", () => {
    expect(src).toMatch(/<Select[\s\S]*?value=\{form\.type\}/);
  });

  it("Select searchable sur form.materiel_id", () => {
    expect(src).toMatch(/<Select[\s\S]*?value=\{form\.materiel_id/);
    // Doit être searchable car liste matériels longue
    expect(src).toMatch(/value=\{form\.materiel_id[\s\S]*?searchable[\s\S]*?>/);
  });

  it("Select searchable sur form.patient_id", () => {
    expect(src).toMatch(/<Select[\s\S]*?value=\{form\.patient_id/);
    expect(src).toMatch(/value=\{form\.patient_id[\s\S]*?searchable[\s\S]*?>/);
  });

  it("Select sur form.depot_id et form.zone_id", () => {
    expect(src).toMatch(/<Select[\s\S]*?value=\{form\.depot_id/);
    expect(src).toMatch(/<Select[\s\S]*?value=\{form\.zone_id/);
  });

  it("Plus aucun <select> natif restant dans la page", () => {
    const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const nativeSelects = (codeOnly.match(/<select\s/g) || []).length;
    expect(nativeSelects).toBe(0);
  });
});

describe("0.58.12 - Toast action button stylisé + toast.undo()", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/Toast.js"), "utf-8");

  it("Action button stylisé en pill (border-radius 99px) au lieu de underline", () => {
    expect(src).toMatch(/data-toast-action[\s\S]*?border-radius:99px/);
    expect(src).toMatch(/data-toast-action[\s\S]*?ti-arrow-back-up/);
  });

  it("Hover effect sur action button (transform + box-shadow)", () => {
    expect(src).toMatch(/data-toast-action[\s\S]*?onmouseover=/);
    expect(src).toMatch(/translateY\(-1px\)/);
  });

  it("Helper toast.undo(title, onUndo, opts) avec duration étendue 6s", () => {
    expect(src).toMatch(/undo:\s*\(title,\s*onUndo,\s*opts\)\s*=>/);
    expect(src).toMatch(/undo:[\s\S]*?duration:\s*6000/);
    expect(src).toMatch(/undo:[\s\S]*?actionLabel:\s*["']Annuler["']/);
    expect(src).toMatch(/undo:[\s\S]*?onAction:\s*onUndo/);
  });

  it("6 helpers au total : success, info, warning, error, neutral, undo", () => {
    expect(src).toMatch(/success:/);
    expect(src).toMatch(/info:/);
    expect(src).toMatch(/warning:/);
    expect(src).toMatch(/error:/);
    expect(src).toMatch(/neutral:/);
    expect(src).toMatch(/undo:/);
  });
});

describe("0.58.12 - Composant Dialog (confirm/prompt/alert)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/Dialog.js"), "utf-8");
  const idx = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/index.js"), "utf-8");

  it("'use client' + import dynamique react-dom/client", () => {
    expect(src).toMatch(/^["']use client["']/);
    expect(src).toMatch(/import\(["']react-dom\/client["']\)/);
  });

  it("ConfirmDialog avec props danger + preview", () => {
    expect(src).toMatch(/function ConfirmDialog/);
    expect(src).toMatch(/danger\s*\?\s*["']#C9867F["']/);
    expect(src).toMatch(/preview\s*&&/);
  });

  it("PromptDialog avec validation + multiline support", () => {
    expect(src).toMatch(/function PromptDialog/);
    expect(src).toMatch(/validate,/);
    expect(src).toMatch(/multiline\s*\?\s*\(/);
    // Cmd/Ctrl+Enter pour valider en multiline
    expect(src).toMatch(/e\.key === ["']Enter["'][\s\S]*?metaKey\s*\|\|\s*e\.ctrlKey/);
  });

  it("AlertDialog avec 4 variants (info, success, warning, danger)", () => {
    expect(src).toMatch(/function AlertDialog/);
    expect(src).toMatch(/cfgByVariant\s*=\s*\{[\s\S]*?info:[\s\S]*?success:[\s\S]*?warning:[\s\S]*?danger:/);
  });

  it("Dialog.confirm / Dialog.prompt / Dialog.alert exposés via API publique", () => {
    expect(src).toMatch(/Dialog\s*=\s*\{[\s\S]*?confirm:[\s\S]*?prompt:[\s\S]*?alert:/);
  });

  it("Open monte un root React dynamiquement (ensureRoot + createRoot)", () => {
    expect(src).toMatch(/function ensureRoot/);
    expect(src).toMatch(/ReactDOM\.createRoot/);
  });

  it("Close avec animation timeout (250ms) avant unmount", () => {
    expect(src).toMatch(/setTimeout\([\s\S]*?reactRoot\.unmount\(\)[\s\S]*?\},\s*250\)/);
  });

  it("Dialog exporté depuis ui-premium index", () => {
    expect(idx).toMatch(/\bDialog\b/);
  });
});

describe("0.58.12 - Drawer Side", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/Drawer.js"), "utf-8");

  it("'use client' + export default function Drawer", () => {
    expect(src).toMatch(/^["']use client["']/);
    expect(src).toMatch(/export default function Drawer/);
  });

  it("Props : open, onClose, title, subtitle, icon, color, side, size, width, footer", () => {
    expect(src).toMatch(/open,/);
    expect(src).toMatch(/side\s*=\s*["']right["']/);
    expect(src).toMatch(/size\s*=\s*["']md["']/);
    expect(src).toMatch(/width,/);
    expect(src).toMatch(/footer,/);
    expect(src).toMatch(/closeOnBackdrop\s*=\s*true/);
  });

  it("4 sizes (sm 360, md 480, lg 640, xl 800)", () => {
    expect(src).toMatch(/widths = \{\s*sm:\s*360,\s*md:\s*480,\s*lg:\s*640,\s*xl:\s*800\s*\}/);
  });

  it("Animation slide-right OU slide-left selon side", () => {
    expect(src).toMatch(/av-drawer-slide-\$\{isRight \? ["']right["'] : ["']left["']\}/);
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/@keyframes av-drawer-slide-right/);
    expect(css).toMatch(/@keyframes av-drawer-slide-left/);
  });

  it("Backdrop blur(6px) avec animation av-drawer-bg-in", () => {
    expect(src).toMatch(/backdropFilter:\s*["']blur\(6px\)\s*saturate\(140%\)["']/);
    expect(src).toMatch(/animation:\s*["']av-drawer-bg-in/);
  });

  it("Lock body scroll quand open", () => {
    expect(src).toMatch(/document\.body\.style\.overflow\s*=\s*["']hidden["']/);
    expect(src).toMatch(/document\.body\.style\.overflow\s*=\s*prevOverflow/);
  });

  it("Focus trap + ESC + tab cycle (comme Modal)", () => {
    expect(src).toMatch(/ev\.key === ["']Escape["']/);
    expect(src).toMatch(/ev\.key === ["']Tab["']/);
    expect(src).toMatch(/shiftKey/);
  });

  it("Close button rotation 90deg au hover (cohérent avec Modal)", () => {
    expect(src).toMatch(/style\.transform = ["']rotate\(90deg\)["']/);
  });

  it("Drawer exporté depuis ui-premium", () => {
    const idx = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/index.js"), "utf-8");
    expect(idx).toMatch(/\bDrawer\b/);
  });
});

describe("0.58.12 - Récap composants premium (14 au total)", () => {
  it("14 composants exportés", () => {
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
      // Nouveaux 0.58.12
      "TimePicker",
      "Dialog",
      "Drawer",
    ];
    for (const c of components) {
      expect(idx).toMatch(new RegExp(`\\b${c}\\b`));
    }
  });
});
