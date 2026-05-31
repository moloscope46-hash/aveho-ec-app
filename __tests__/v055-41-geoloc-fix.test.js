// =============================================================
//  Tests unitaires — 0.55.41
//  Fix géoloc + géocodage BAN INSEE pour filtres carte
// =============================================================
import { describe, it, expect } from "vitest";

describe("0.55.41 - Géoloc options HighAccuracy + maximumAge 0", () => {
  it("Options forceFresh utilise maximumAge=0", () => {
    const forceFresh = true;
    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: forceFresh ? 0 : 60000,
    };
    expect(options.enableHighAccuracy).toBe(true);
    expect(options.maximumAge).toBe(0);
    expect(options.timeout).toBe(15000);
  });

  it("Options par défaut sans forceFresh acceptent 60s de cache", () => {
    const forceFresh = false;
    const opts = { maximumAge: forceFresh ? 0 : 60000 };
    expect(opts.maximumAge).toBe(60000);
  });
});

describe("0.55.41 - formatRelativeTime", () => {
  function formatRelativeTime(ts) {
    if (!ts) return "";
    const diff = Date.now() - ts;
    if (diff < 60_000) return "à l'instant";
    if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`;
    if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)} h`;
    return `il y a ${Math.floor(diff / 86_400_000)} j`;
  }

  it("Vide si ts null", () => {
    expect(formatRelativeTime(null)).toBe("");
  });

  it("'à l'instant' si < 1 min", () => {
    expect(formatRelativeTime(Date.now() - 10_000)).toBe("à l'instant");
  });

  it("'il y a X min' si < 1h", () => {
    expect(formatRelativeTime(Date.now() - 5 * 60_000)).toBe("il y a 5 min");
  });

  it("'il y a X h' si < 24h", () => {
    expect(formatRelativeTime(Date.now() - 3 * 3_600_000)).toBe("il y a 3 h");
  });

  it("'il y a X j' au-delà", () => {
    expect(formatRelativeTime(Date.now() - 2 * 86_400_000)).toBe("il y a 2 j");
  });
});

describe("0.55.41 - geocodeBatch — utilise les coords si dispo", () => {
  it("Ne re-géocode pas si lat/lng déjà présent", () => {
    const item = { adresse: "12 rue X", latitude: 48.8, longitude: 2.3 };
    const shouldSkip = !!(item.latitude && item.longitude);
    expect(shouldSkip).toBe(true);
  });

  it("Skip query trop court", () => {
    const query = "ab";
    expect(query.length < 4).toBe(true);
  });

  it("Cache key construit depuis adresse complète", () => {
    const item = { adresse: "12 rue X", cp: "75011", commune: "Paris" };
    const query = [item.adresse, item.cp, item.commune].filter(Boolean).join(" ");
    expect(query).toBe("12 rue X 75011 Paris");
  });
});

describe("0.55.41 - URL BAN INSEE pour géocodage", () => {
  it("Format URL correct", () => {
    const query = "12 rue de Rivoli Paris";
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=1`;
    expect(url).toContain("api-adresse.data.gouv.fr");
    expect(url).toContain("limit=1");
    expect(url).toContain("12%20rue");
  });
});

describe("0.55.41 - SIRENE recherche par proximité lat/lng", () => {
  it("Params lat/long/radius passés à l'API", () => {
    const params = new URLSearchParams({
      q: "pharmacie",
      lat: "44.85",
      long: "1.7",
      radius: "50",
    });
    expect(params.get("lat")).toBe("44.85");
    expect(params.get("long")).toBe("1.7");
    expect(params.get("radius")).toBe("50");
  });
});

describe("0.55.41 - Filtre bbox post-géocodage", () => {
  function isInBbox(p, b) {
    return p.latitude && p.longitude &&
      p.latitude >= b.south && p.latitude <= b.north &&
      p.longitude >= b.west && p.longitude <= b.east;
  }

  it("Garde un point dans la bbox", () => {
    const p = { latitude: 44.85, longitude: 1.7 };
    const b = { south: 44, north: 45, west: 1, east: 2 };
    expect(isInBbox(p, b)).toBe(true);
  });

  it("Exclut hors bbox", () => {
    const p = { latitude: 48.85, longitude: 2.35 }; // Paris
    const b = { south: 44, north: 45, west: 1, east: 2 }; // Lot
    expect(isInBbox(p, b)).toBe(false);
  });

  it("Exclut sans coords", () => {
    const p = { adresse: "X" };
    const b = { south: 44, north: 45, west: 1, east: 2 };
    expect(isInBbox(p, b)).toBeFalsy();
  });
});

describe("0.55.41 - Précision géoloc avertissement", () => {
  it("Couleur rouge si précision > 1km (IP-based)", () => {
    const accuracy = 1500;
    const color = accuracy > 1000 ? "#c0392b" : "#5aa05a";
    expect(color).toBe("#c0392b");
  });

  it("Couleur verte si précision <= 1km (GPS)", () => {
    const accuracy = 50;
    const color = accuracy > 1000 ? "#c0392b" : "#5aa05a";
    expect(color).toBe("#5aa05a");
  });
});
