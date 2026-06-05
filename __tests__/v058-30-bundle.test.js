// =============================================================
//  Tests unitaires — 0.58.30
//
//  1. AuditTimeline composant partagé extrait
//  2. /audit : toggle Tableau/Timeline + utilise AuditTimeline
//  3. Toast premium : dedupe + badge compteur
//  4. Mode focus : option "masquer les notifs aussi"
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.30 - Version", () => {
  it("Version 0.58.30+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(30);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.30 - AuditTimeline composant partagé", () => {
  it("Fichier app/components/AuditTimeline.js existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/components/AuditTimeline.js"))).toBe(true);
  });

  it("Export default + props rows + onClickRow + showDetailJson + emptyMessage", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/AuditTimeline.js"), "utf-8");
    expect(src).toMatch(/export default function AuditTimeline/);
    expect(src).toMatch(/rows\s*=\s*\[\]/);
    expect(src).toMatch(/onClickRow/);
    expect(src).toMatch(/showDetailJson\s*=\s*false/);
    expect(src).toMatch(/emptyMessage/);
  });

  it("Helpers internes : fmtDay, fmtTime, emailToInitials, avatarColor", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/AuditTimeline.js"), "utf-8");
    expect(src).toMatch(/function fmtDay\(/);
    expect(src).toMatch(/function fmtTime\(/);
    expect(src).toMatch(/function emailToInitials\(/);
    expect(src).toMatch(/function avatarColor\(/);
  });

  it("Groupage par jour + structure timeline (pastille + card)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/AuditTimeline.js"), "utf-8");
    expect(src).toMatch(/const groupedByDay = \{\}/);
    expect(src).toMatch(/days\.map\(/);
    expect(src).toMatch(/ACTION_COLOR/);
    expect(src).toMatch(/ACTION_ICON/);
  });

  it("Bouton 'Voir détail JSON' si showDetailJson=true et onClickRow fourni", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/AuditTimeline.js"), "utf-8");
    expect(src).toMatch(/showDetailJson && onClickRow && \(/);
    expect(src).toMatch(/Voir détail JSON/);
  });
});

describe("0.58.30 - /audit : toggle Tableau/Timeline", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/audit/page.js"), "utf-8");

  it("Import AuditTimeline depuis components partagés", () => {
    expect(src).toMatch(/import AuditTimeline from\s*["']\.\.\/components\/AuditTimeline["']/);
  });

  it("State viewMode initialisé à 'timeline'", () => {
    expect(src).toMatch(/const \[viewMode, setViewMode\] = useState\(["']timeline["']\)/);
  });

  it("Toggle Timeline/Tableau avec NeonButton", () => {
    expect(src).toMatch(/setViewMode\(["']timeline["']\)/);
    expect(src).toMatch(/setViewMode\(["']table["']\)/);
  });

  it("Render <AuditTimeline rows={rows} onClickRow={...}>", () => {
    expect(src).toMatch(/<AuditTimeline[\s\S]*?rows=\{rows\}[\s\S]*?onClickRow=/);
    expect(src).toMatch(/showDetailJson=\{true\}/);
  });

  it("Conditional rendering selon viewMode (timeline OU table)", () => {
    expect(src).toMatch(/viewMode === ["']timeline["'] \?[\s\S]*?<AuditTimeline/);
  });
});

describe("0.58.30 - Toast premium : dedupe + badge compteur", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/Toast.js"), "utf-8");

  it("Dedupe key via type + title", () => {
    expect(src).toMatch(/const dedupeKey = `\$\{type\}::\$\{title \|\| ""\}`/);
  });

  it("querySelector sur data-toast-dedupe-key (incrémente si existant)", () => {
    expect(src).toMatch(/data-toast-dedupe-key="\$\{CSS\.escape\(dedupeKey\)\}"/);
  });

  it("Toast créé avec data-toast-dedupe-key + data-toast-count=1", () => {
    expect(src).toMatch(/setAttribute\(["']data-toast-dedupe-key["'], dedupeKey\)/);
    expect(src).toMatch(/toast\.dataset\.toastCount = ["']1["']/);
  });

  it("Badge compteur data-toast-counter dans le DOM avec animation bump", () => {
    expect(src).toMatch(/data-toast-counter/);
    expect(src).toMatch(/×\$\{currentCount\}/);
    expect(src).toMatch(/av-toast-counter-bump/);
  });

  it("Timer dismiss exposé sur toast._dismissTimer", () => {
    expect(src).toMatch(/toast\._dismissTimer = dismissTimer/);
    expect(src).toMatch(/existing\._dismissTimer/);
  });

  it("Keyframe av-toast-counter-bump dans globals.css", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/@keyframes av-toast-counter-bump/);
  });
});

describe("0.58.30 - Mode focus : option 'masquer notifs'", () => {
  it("lib/focusMode.js : exports isFocusHideNotifs + setFocusHideNotifs", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "lib/focusMode.js"), "utf-8");
    expect(src).toMatch(/export function isFocusHideNotifs\(\)/);
    expect(src).toMatch(/export function setFocusHideNotifs\(/);
  });

  it("Storage key dédié 'av-focus-hide-notifs'", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "lib/focusMode.js"), "utf-8");
    expect(src).toMatch(/HIDE_NOTIFS_KEY = ["']av-focus-hide-notifs["']/);
  });

  it("Event 'av-focus-hide-notifs-change' dispatched", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "lib/focusMode.js"), "utf-8");
    expect(src).toMatch(/av-focus-hide-notifs-change/);
  });

  it("Classe HTML 'av-focus-hide-notifs' appliquée à <html>", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "lib/focusMode.js"), "utf-8");
    expect(src).toMatch(/html\.classList\.add\(["']av-focus-hide-notifs["']\)/);
    expect(src).toMatch(/html\.classList\.remove\(["']av-focus-hide-notifs["']\)/);
  });

  it("CSS : cache .notif-wrap + #av-toast-container quand classe combinée", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/html\.av-focus-mode\.av-focus-hide-notifs[\s\S]*?\.notif-wrap[\s\S]*?display:\s*none/);
    expect(css).toMatch(/html\.av-focus-mode\.av-focus-hide-notifs[\s\S]*?#av-toast-container[\s\S]*?display:\s*none/);
  });

  it("/profil : import setFocusHideNotifs + checkbox dans FocusModeToggle", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/profil/page.js"), "utf-8");
    expect(src).toMatch(/import\s*\{[^}]*setFocusHideNotifs[^}]*\}\s*from\s*["'][^"']*focusMode["']/);
    expect(src).toMatch(/Masquer aussi les notifications/);
    expect(src).toMatch(/<input\s+type=["']checkbox["']\s+checked=\{hideNotifs\}/);
  });
});
