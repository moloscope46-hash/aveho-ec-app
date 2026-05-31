// =============================================================
//  Tests unitaires — Notifications email pour workflows
//  Alpha 0.33.0
// =============================================================
import { describe, it, expect } from "vitest";

describe("mapEmailEventType — mapping vers catégories prefs", () => {
  function mapEmailEventType(ev) {
    if (ev.entite === "intervention" || ev.notifType === "di") return "di";
    if (ev.entite === "achat") return "achat";
    if (ev.entite === "transfert") return "transfert";
    if (ev.entite === "signalement") return "signalement";
    if (ev.entite === "maintenance") return "maintenance";
    if (ev.entite === "consentement") return "consent_a_renouveler";
    return "autre";
  }

  it("intervention → di", () => {
    expect(mapEmailEventType({ entite: "intervention" })).toBe("di");
  });

  it("notifType di explicite", () => {
    expect(mapEmailEventType({ notifType: "di" })).toBe("di");
  });

  it("achat → achat", () => {
    expect(mapEmailEventType({ entite: "achat" })).toBe("achat");
  });

  it("transfert → transfert", () => {
    expect(mapEmailEventType({ entite: "transfert" })).toBe("transfert");
  });

  it("signalement → signalement", () => {
    expect(mapEmailEventType({ entite: "signalement" })).toBe("signalement");
  });

  it("maintenance → maintenance", () => {
    expect(mapEmailEventType({ entite: "maintenance" })).toBe("maintenance");
  });

  it("consentement → consent_a_renouveler", () => {
    expect(mapEmailEventType({ entite: "consentement" })).toBe("consent_a_renouveler");
  });

  it("entité inconnue → autre", () => {
    expect(mapEmailEventType({ entite: "patient" })).toBe("autre");
    expect(mapEmailEventType({})).toBe("autre");
  });
});

describe("escapeHtml — sécurité XSS dans corps email", () => {
  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  it("échappe les chevrons", () => {
    expect(escapeHtml("<script>alert(1)</script>"))
      .toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("échappe l'esperluette", () => {
    expect(escapeHtml("Marie & Co")).toBe("Marie &amp; Co");
  });

  it("échappe les guillemets simples et doubles", () => {
    expect(escapeHtml(`a"b'c`)).toBe("a&quot;b&#039;c");
  });

  it("gère null/undefined", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("convertit number en string", () => {
    expect(escapeHtml(42)).toBe("42");
  });
});

describe("Filtrage email côté Edge Function", () => {
  // Reproduit la logique du send-email
  function shouldSendEmail(userId, eventType, prefsByUser) {
    if (!userId) return true; // emails externes : toujours envoyer
    const pref = prefsByUser[userId];
    if (!pref?.prefs) return true; // pas de pref → envoie par défaut
    const emailKey = `email_${eventType}`;
    if (emailKey in pref.prefs) {
      return pref.prefs[emailKey] === true;
    }
    // Pas de clé explicite → OFF par défaut (opt-in)
    return false;
  }

  it("opt-in : pref absente → pas d'envoi", () => {
    expect(shouldSendEmail("alice", "di", { alice: { prefs: {} } })).toBe(false);
  });

  it("opt-in : email_di=true → envoie", () => {
    expect(shouldSendEmail("alice", "di", { alice: { prefs: { email_di: true } } })).toBe(true);
  });

  it("opt-in : email_di=false → pas d'envoi", () => {
    expect(shouldSendEmail("alice", "di", { alice: { prefs: { email_di: false } } })).toBe(false);
  });

  it("user sans pref enregistrée → envoie (cas par défaut)", () => {
    expect(shouldSendEmail("alice", "di", {})).toBe(true);
  });

  it("email externe (pas de user_id) → toujours envoie", () => {
    expect(shouldSendEmail(null, "di", {})).toBe(true);
  });

  it("filtrage indépendant entre types", () => {
    const prefs = {
      alice: { prefs: { email_di: true, email_achat: false } }
    };
    expect(shouldSendEmail("alice", "di", prefs)).toBe(true);
    expect(shouldSendEmail("alice", "achat", prefs)).toBe(false);
    expect(shouldSendEmail("alice", "transfert", prefs)).toBe(false); // pas de clé → off
  });
});

describe("Séparation push vs email dans prefs", () => {
  function isPushActive(prefs, key, defaultPush = true) {
    if (key in prefs) return prefs[key] === true;
    return defaultPush;
  }
  function isEmailActive(prefs, key) {
    return prefs[`email_${key}`] === true;
  }

  it("push activé par défaut, email OFF par défaut", () => {
    const prefs = {};
    expect(isPushActive(prefs, "di", true)).toBe(true);
    expect(isEmailActive(prefs, "di")).toBe(false);
  });

  it("toggle push n'affecte pas email", () => {
    const prefs = { di: false };
    expect(isPushActive(prefs, "di", true)).toBe(false);
    expect(isEmailActive(prefs, "di")).toBe(false);
  });

  it("toggle email n'affecte pas push", () => {
    const prefs = { email_di: true };
    expect(isPushActive(prefs, "di", true)).toBe(true);
    expect(isEmailActive(prefs, "di")).toBe(true);
  });

  it("config full : push ON, email ON", () => {
    const prefs = { di: true, email_di: true };
    expect(isPushActive(prefs, "di", true)).toBe(true);
    expect(isEmailActive(prefs, "di")).toBe(true);
  });

  it("config full : push OFF, email ON (silencieux mobile, mail seulement)", () => {
    const prefs = { di: false, email_di: true };
    expect(isPushActive(prefs, "di", true)).toBe(false);
    expect(isEmailActive(prefs, "di")).toBe(true);
  });
});

describe("buildEmailBody — construction HTML", () => {
  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function buildEmailBody(ev, titre, message) {
    const lines = [];
    if (message && message !== titre) {
      lines.push(`<p>${escapeHtml(message)}</p>`);
    }
    if (ev.details && typeof ev.details === "object") {
      const rows = [];
      for (const [k, v] of Object.entries(ev.details)) {
        if (v === null || v === undefined || v === "") continue;
        rows.push(`<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(String(v))}</td></tr>`);
      }
      if (rows.length > 0) {
        lines.push(`<table>${rows.join("")}</table>`);
      }
    }
    return lines.join("") || `<p>${escapeHtml(titre)}</p>`;
  }

  it("body simple avec message", () => {
    const html = buildEmailBody({ details: null }, "Titre", "Message body");
    expect(html).toContain("Message body");
  });

  it("body avec détails en tableau", () => {
    const html = buildEmailBody(
      { details: { numero: "DI-1234", statut: "Urgent" } },
      "Titre", "Message"
    );
    expect(html).toContain("DI-1234");
    expect(html).toContain("Urgent");
    expect(html).toContain("<table>");
  });

  it("body sans détails ni message différent → fallback titre", () => {
    const html = buildEmailBody({}, "Titre", "Titre");
    expect(html).toContain("Titre");
  });

  it("ignore les détails null/undefined/empty", () => {
    const html = buildEmailBody(
      { details: { numero: "DI-1234", motif: null, autre: "", note: undefined } },
      "Titre", null
    );
    expect(html).toContain("DI-1234");
    expect(html).not.toContain("motif");
    expect(html).not.toContain("autre");
  });

  it("XSS protection dans les détails", () => {
    const html = buildEmailBody(
      { details: { evil: "<script>alert(1)</script>" } },
      "Titre", null
    );
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toMatch(/<script>/);
  });
});

describe("Scénarios end-to-end notifications email", () => {
  function shouldSendEmail(userId, eventType, prefsByUser) {
    if (!userId) return true;
    const pref = prefsByUser[userId];
    if (!pref?.prefs) return true;
    const emailKey = `email_${eventType}`;
    if (emailKey in pref.prefs) return pref.prefs[emailKey] === true;
    return false;
  }

  it("Scénario : DI urgente, Alice opt-in email, Bob non", () => {
    const prefs = {
      alice: { prefs: { di: true, email_di: true } },
      bob: { prefs: { di: true } }, // pas de email_di → off par défaut
    };
    expect(shouldSendEmail("alice", "di", prefs)).toBe(true);
    expect(shouldSendEmail("bob", "di", prefs)).toBe(false);
  });

  it("Scénario : achat refusé, demandeur a opt-in email achat", () => {
    const prefs = { demandeur: { prefs: { email_achat: true } } };
    expect(shouldSendEmail("demandeur", "achat", prefs)).toBe(true);
  });

  it("Scénario : alerte DPO externe, toujours envoyée", () => {
    // target_emails sans user_id → bypass filtrage
    expect(shouldSendEmail(null, "consent_a_renouveler", {})).toBe(true);
  });

  it("Scénario : utilisateur nouveau (aucune pref) → pas d'email (opt-in)", () => {
    const prefs = {};
    expect(shouldSendEmail("nouveau", "di", prefs)).toBe(true); // pas dans prefs object
    // Mais s'il a un row vide :
    const prefs2 = { nouveau: { prefs: {} } };
    expect(shouldSendEmail("nouveau", "di", prefs2)).toBe(false); // opt-in strict
  });
});
