// =============================================================
//  Tests unitaires — 0.47.0
//  Couvre : direction KPIs, webhooks UI, push API, diff visuel,
//  page offline, install banner refonte
// =============================================================
import { describe, it, expect } from "vitest";

describe("Dashboard direction — couleur DI selon urgence", () => {
  function diColor(urgent) {
    return urgent > 0 ? "#c0392b" : "#EF9F27";
  }
  it("avec urgentes → rouge", () => {
    expect(diColor(1)).toBe("#c0392b");
    expect(diColor(5)).toBe("#c0392b");
  });
  it("sans urgentes → orange", () => {
    expect(diColor(0)).toBe("#EF9F27");
  });
});

describe("Dashboard direction — couleur % résolu", () => {
  function pctColor(pct) {
    if (pct >= 80) return "#5aa05a";
    if (pct >= 50) return "#EF9F27";
    return "#c0392b";
  }
  it(">= 80 → vert", () => {
    expect(pctColor(80)).toBe("#5aa05a");
    expect(pctColor(95)).toBe("#5aa05a");
  });
  it("50-79 → orange", () => {
    expect(pctColor(60)).toBe("#EF9F27");
  });
  it("< 50 → rouge", () => {
    expect(pctColor(30)).toBe("#c0392b");
  });
});

describe("Webhooks UI — détection Teams vs Slack", () => {
  function isTeams(url) {
    return url.includes(".office.com") || url.includes("teams.microsoft");
  }
  it("URL Teams legacy (outlook.office.com)", () => {
    expect(isTeams("https://outlook.office.com/webhook/abc")).toBe(true);
  });
  it("URL Teams nouvelle (orga.webhook.office.com)", () => {
    expect(isTeams("https://aveho.webhook.office.com/webhookb2/xxx")).toBe(true);
  });
  it("URL Slack (hooks.slack.com)", () => {
    expect(isTeams("https://hooks.slack.com/services/T00/B00/xxx")).toBe(false);
  });
  it("URL générique", () => {
    expect(isTeams("https://example.com/webhook")).toBe(false);
  });
});

describe("Webhooks UI — payload Teams vs Slack", () => {
  function buildPayload(url, text) {
    const teams = url.includes(".office.com");
    return teams
      ? { "@type": "MessageCard", "@context": "https://schema.org/extensions", text }
      : { text: `🛎️ ${text}` };
  }
  it("Teams → MessageCard", () => {
    const p = buildPayload("https://outlook.office.com/webhook/x", "Hello");
    expect(p["@type"]).toBe("MessageCard");
    expect(p.text).toBe("Hello");
  });
  it("Slack → texte simple avec emoji", () => {
    const p = buildPayload("https://hooks.slack.com/x", "Hello");
    expect(p.text).toContain("🛎️");
    expect(p.text).toContain("Hello");
  });
});

describe("Push API — payload maintenance", () => {
  function buildMaintPushPayload(userId, type, libelle, date) {
    return {
      userId,
      title: "Maintenance proche",
      body: `${type} sur ${libelle} prévue le ${date}`,
      url: "/maintenance",
    };
  }
  it("payload complet", () => {
    const p = buildMaintPushPayload("u1", "Préventive", "Lit médicalisé X3", "2026-06-15");
    expect(p.userId).toBe("u1");
    expect(p.body).toContain("Préventive");
    expect(p.body).toContain("Lit médicalisé X3");
    expect(p.body).toContain("2026-06-15");
    expect(p.url).toBe("/maintenance");
  });
});

describe("Push API — payload digest hebdo", () => {
  function buildDigestPushPayload(adminId, structureNom, nbDi, nbSignal, nbAchat) {
    return {
      userId: adminId,
      title: `Récap hebdo ${structureNom}`,
      body: `${nbDi} DI, ${nbSignal} signalements, ${nbAchat} achats cette semaine`,
      url: "/accueil",
    };
  }
  it("body résume les 3 KPIs principaux", () => {
    const p = buildDigestPushPayload("u1", "EHPAD X", 5, 2, 10);
    expect(p.body).toContain("5 DI");
    expect(p.body).toContain("2 signalements");
    expect(p.body).toContain("10 achats");
  });
});

describe("ConflictResolver — DiffValue tokenize", () => {
  function tokenize(str) {
    return str.split(/(\s+|[.,;:!?])/).filter(Boolean);
  }
  it("sépare mots et ponctuation", () => {
    const t = tokenize("Hello, world!");
    expect(t).toContain("Hello");
    expect(t).toContain(",");
    expect(t).toContain("world");
    expect(t).toContain("!");
  });
  it("conserve les espaces", () => {
    const t = tokenize("a b");
    expect(t.some(x => /\s+/.test(x))).toBe(true);
  });
});

describe("ConflictResolver — markDiff", () => {
  function markDiff(a, b) {
    const bSet = new Set(b);
    return a.map((t) => ({ text: t, changed: !bSet.has(t) && t.trim().length > 0 }));
  }
  it("tokens présents dans b → non changed", () => {
    const r = markDiff(["a", " ", "b"], ["a", " ", "b"]);
    expect(r.every(x => !x.changed)).toBe(true);
  });
  it("tokens absents de b → changed", () => {
    const r = markDiff(["a", " ", "c"], ["a", " ", "b"]);
    expect(r.find(x => x.text === "c").changed).toBe(true);
    expect(r.find(x => x.text === "a").changed).toBe(false);
  });
  it("espaces ne sont jamais 'changed' (purement visuel)", () => {
    const r = markDiff(["a", "  "], ["a"]);
    expect(r.find(x => /\s+/.test(x.text)).changed).toBe(false);
  });
});

describe("Page /offline — fallback navigation", () => {
  function shouldFallbackToOffline(reqMode, destination) {
    return reqMode === "navigate" || destination === "document";
  }
  it("navigation → fallback", () => {
    expect(shouldFallbackToOffline("navigate", "document")).toBe(true);
  });
  it("API call → pas de fallback HTML", () => {
    expect(shouldFallbackToOffline("cors", "")).toBe(false);
  });
  it("destination document seul suffit", () => {
    expect(shouldFallbackToOffline("", "document")).toBe(true);
  });
});

describe("Page /offline — état en ligne / hors-ligne", () => {
  function getMessage(online) {
    return online
      ? "Tu es de nouveau en ligne. Tu peux recharger la page."
      : "Pas de problème — Aveho EC fonctionne en mode hors-ligne. Tes modifications seront synchronisées dès le retour du réseau.";
  }
  it("online → message positif", () => {
    expect(getMessage(true)).toContain("nouveau en ligne");
  });
  it("offline → rassure sur la sync", () => {
    expect(getMessage(false)).toContain("synchronisées");
  });
});

describe("InstallBanner — 3 bénéfices", () => {
  const BENEFITS = [
    { icon: "ti-rocket", label: "Plus rapide" },
    { icon: "ti-wifi-off", label: "Hors-ligne" },
    { icon: "ti-bell-ringing", label: "Notifs push" },
  ];
  it("3 bénéfices exactement", () => {
    expect(BENEFITS).toHaveLength(3);
  });
  it("chaque bénéfice a icon + label", () => {
    BENEFITS.forEach(b => {
      expect(b.icon).toMatch(/^ti-/);
      expect(b.label.length).toBeGreaterThan(0);
    });
  });
});

describe("InstallBanner — états persistés", () => {
  function shouldShow(state, now) {
    if (!state) return true;
    if (state.dismissed === "forever") return false;
    if (state.snoozedUntil && state.snoozedUntil > now) return false;
    return true;
  }
  const now = Date.now();
  it("aucun état → affiche", () => {
    expect(shouldShow(null, now)).toBe(true);
  });
  it("dismissed forever → masque", () => {
    expect(shouldShow({ dismissed: "forever" }, now)).toBe(false);
  });
  it("snooze futur → masque", () => {
    expect(shouldShow({ snoozedUntil: now + 86400000 }, now)).toBe(false);
  });
  it("snooze passé → affiche", () => {
    expect(shouldShow({ snoozedUntil: now - 86400000 }, now)).toBe(true);
  });
});
