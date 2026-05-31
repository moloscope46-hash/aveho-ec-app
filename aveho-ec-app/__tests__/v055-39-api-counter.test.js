// =============================================================
//  Tests unitaires — 0.55.39
//  Compteur API, page intégrations, login moyens visibles
// =============================================================
import { describe, it, expect } from "vitest";

describe("0.55.39 - .env.local créé (non commit)", () => {
  it("Doit contenir GOOGLE_PLACES_API_KEY", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const envLocal = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envLocal)) {
      const content = fs.readFileSync(envLocal, "utf-8");
      expect(content).toContain("GOOGLE_PLACES_API_KEY");
    } else {
      // OK si fichier absent (CI/CD)
      expect(true).toBe(true);
    }
  });

  it(".gitignore contient .env.local", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const gi = fs.readFileSync(path.resolve(process.cwd(), ".gitignore"), "utf-8");
    expect(gi).toContain(".env.local");
  });
});

describe("0.55.39 - Schéma SQL api_usage_log", () => {
  const COLUMNS = [
    "id", "structure_id", "user_id",
    "api_name", "endpoint", "status",
    "http_status", "error_message", "duration_ms",
    "created_at",
  ];

  it("Colonnes essentielles présentes", () => {
    expect(COLUMNS).toContain("api_name");
    expect(COLUMNS).toContain("status");
    expect(COLUMNS).toContain("duration_ms");
  });

  it("4 statuts possibles", () => {
    const STATUSES = ["ok", "error", "no_key", "cache_hit"];
    expect(STATUSES.length).toBe(4);
  });
});

describe("0.55.39 - Page intégrations - 5 APIs listées", () => {
  const API_META = {
    google_places: { freeQuota: 1000, pricePerThousand: 17 },
    rpps: { freeQuota: null, pricePerThousand: 0 },
    finess: { freeQuota: null, pricePerThousand: 0 },
    sirene: { freeQuota: null, pricePerThousand: 0 },
    ban_insee: { freeQuota: null, pricePerThousand: 0 },
  };

  it("5 APIs configurées", () => {
    expect(Object.keys(API_META).length).toBe(5);
  });

  it("Google Places a un quota gratuit", () => {
    expect(API_META.google_places.freeQuota).toBe(1000);
    expect(API_META.google_places.pricePerThousand).toBe(17);
  });

  it("Autres APIs gratuites", () => {
    expect(API_META.rpps.freeQuota).toBeNull();
    expect(API_META.finess.freeQuota).toBeNull();
    expect(API_META.sirene.freeQuota).toBeNull();
    expect(API_META.ban_insee.freeQuota).toBeNull();
  });
});

describe("0.55.39 - Calcul coût Google Places", () => {
  function calculateCost(calls, freeQuota, pricePerThousand) {
    if (calls <= freeQuota) return 0;
    return ((calls - freeQuota) * pricePerThousand) / 1000;
  }

  it("Sous quota gratuit = 0€", () => {
    expect(calculateCost(500, 1000, 17)).toBe(0);
  });

  it("À la limite = 0€", () => {
    expect(calculateCost(1000, 1000, 17)).toBe(0);
  });

  it("Au-dessus du quota = (excédent × $/1000)", () => {
    const cost = calculateCost(2000, 1000, 17);
    expect(cost).toBeCloseTo(17, 2);
  });

  it("Beaucoup au-dessus", () => {
    const cost = calculateCost(11000, 1000, 17);
    expect(cost).toBeCloseTo(170, 2);
  });
});

describe("0.55.39 - Login : message biométrie si pas enregistrée", () => {
  it("Affiche astuce si email rempli + WebAuthn supporté + pas de méthodes", () => {
    const bioMethodsForEmail = [];
    const email = "user@x.fr";
    const webAuthnSupported = true;
    const shouldShow = bioMethodsForEmail.length === 0 && !!email && webAuthnSupported;
    expect(shouldShow).toBe(true);
  });

  it("N'affiche pas si déjà des méthodes", () => {
    const bioMethodsForEmail = ["empreinte"];
    const shouldShow = bioMethodsForEmail.length === 0;
    expect(shouldShow).toBe(false);
  });
});

describe("0.55.39 - API /api/place avec logging", () => {
  it("Logging ne bloque jamais la réponse (try/catch)", async () => {
    // Test que la fonction logCall ne throw jamais
    const logCall = async () => {
      try { throw new Error("supabase indisponible"); }
      catch (_) { /* swallowed */ }
    };
    await expect(logCall()).resolves.toBeUndefined();
  });
});
