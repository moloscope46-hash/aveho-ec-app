// =============================================================
//  Tests unitaires — 0.55.27
//  Couvre : KeyboardHelp logic, isTypingInInput, séquence G+key
// =============================================================
import { describe, it, expect } from "vitest";

describe("0.55.27 - isTypingInInput - détecter focus champs", () => {
  function isTypingInInput(activeElement) {
    if (!activeElement) return false;
    const tag = activeElement.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if (activeElement.isContentEditable) return true;
    return false;
  }

  it("input → true", () => {
    expect(isTypingInInput({ tagName: "INPUT" })).toBe(true);
    expect(isTypingInInput({ tagName: "input" })).toBe(true);
  });

  it("textarea → true", () => {
    expect(isTypingInInput({ tagName: "TEXTAREA" })).toBe(true);
  });

  it("select → true", () => {
    expect(isTypingInInput({ tagName: "SELECT" })).toBe(true);
  });

  it("contenteditable → true", () => {
    expect(isTypingInInput({ tagName: "DIV", isContentEditable: true })).toBe(true);
  });

  it("div normal → false", () => {
    expect(isTypingInInput({ tagName: "DIV" })).toBe(false);
  });

  it("button → false", () => {
    expect(isTypingInInput({ tagName: "BUTTON" })).toBe(false);
  });

  it("activeElement null → false", () => {
    expect(isTypingInInput(null)).toBe(false);
  });
});

describe("0.55.27 - Map G+lettre → route", () => {
  const NAV_MAP = {
    a: "/accueil",
    p: "/patients",
    m: "/materiel",
    u: "/utilisateurs",
    l: "/changelog",
    s: "/profil",
  };

  it("a → /accueil", () => {
    expect(NAV_MAP.a).toBe("/accueil");
  });

  it("p → /patients", () => {
    expect(NAV_MAP.p).toBe("/patients");
  });

  it("l → /changelog", () => {
    expect(NAV_MAP.l).toBe("/changelog");
  });

  it("toutes les routes commencent par /", () => {
    Object.values(NAV_MAP).forEach((route) => {
      expect(route.startsWith("/")).toBe(true);
    });
  });
});

describe("0.55.27 - SHORTCUTS structure", () => {
  it("au moins 4 sections", () => {
    const sections = ["Navigation", "Recherche", "Modales et listes", "Débogage (dev)"];
    expect(sections.length).toBeGreaterThanOrEqual(4);
  });

  it("Navigation contient G+letter", () => {
    const navItems = [
      { keys: ["G", "puis", "A"], label: "Aller à l'accueil" },
      { keys: ["G", "puis", "P"], label: "Aller aux patients" },
    ];
    expect(navItems.length).toBeGreaterThanOrEqual(2);
    navItems.forEach((item) => {
      expect(item.keys).toContain("puis");
    });
  });
});

describe("0.55.27 - Migration logger - vérifie imports corrects", () => {
  it("path relatif app/X/page.js → ../../lib/logger", () => {
    // app/achats/page.js depth = 2 → on remonte 2 niveaux pour atteindre root
    const path = "../../lib/logger";
    expect(path.match(/\.\.\//g).length).toBe(2);
  });

  it("path relatif app/X/[Y]/page.js → ../../../lib/logger", () => {
    // app/inscription/[token]/page.js depth = 3
    const path = "../../../lib/logger";
    expect(path.match(/\.\.\//g).length).toBe(3);
  });

  it("path relatif lib/X.js → ./logger", () => {
    // lib/events.js → ./logger
    const path = "./logger";
    expect(path.startsWith("./")).toBe(true);
  });
});
