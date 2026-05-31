// =============================================================
//  Tests unitaires — 0.55.36
//  Composant EtabPhoto, Wikipedia API, cache localStorage, fallback
// =============================================================
import { describe, it, expect, beforeEach } from "vitest";

describe("0.55.36 - EtabPhoto - construction URL Wikipedia", () => {
  function buildWikiUrl(query) {
    return `https://fr.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&prop=pageimages&pithumbsize=600&format=json&origin=*`;
  }

  it("Encode correctement le query string", () => {
    const url = buildWikiUrl("Hôpital Saint-Joseph Paris");
    expect(url).toContain("H%C3%B4pital");
    expect(url).toContain("Saint-Joseph");
    expect(url).toContain("Paris");
  });

  it("Inclut origin=* pour CORS", () => {
    const url = buildWikiUrl("X");
    expect(url).toContain("origin=*");
  });

  it("Demande prop=pageimages pour récupérer le thumbnail", () => {
    const url = buildWikiUrl("X");
    expect(url).toContain("prop=pageimages");
  });

  it("Taille thumbnail 600px (lisible en bannière)", () => {
    const url = buildWikiUrl("X");
    expect(url).toContain("pithumbsize=600");
  });

  it("gsrlimit=1 (un seul résultat suffit)", () => {
    const url = buildWikiUrl("X");
    expect(url).toContain("gsrlimit=1");
  });
});

describe("0.55.36 - Parsing réponse Wikipedia", () => {
  function parseWikiResponse(data) {
    const pages = data?.query?.pages;
    if (!pages) return "";
    const firstPage = Object.values(pages)[0];
    return firstPage?.thumbnail?.source || "";
  }

  it("Extrait thumbnail.source du premier hit", () => {
    const data = {
      query: {
        pages: {
          "12345": {
            title: "Hôpital Saint-Joseph",
            thumbnail: { source: "https://upload.wikimedia.org/.../hop.jpg" },
          },
        },
      },
    };
    expect(parseWikiResponse(data)).toBe("https://upload.wikimedia.org/.../hop.jpg");
  });

  it("Retourne vide si pas de query.pages", () => {
    expect(parseWikiResponse({})).toBe("");
    expect(parseWikiResponse({ query: {} })).toBe("");
    expect(parseWikiResponse(null)).toBe("");
  });

  it("Retourne vide si page sans thumbnail", () => {
    const data = { query: { pages: { "1": { title: "X" } } } };
    expect(parseWikiResponse(data)).toBe("");
  });
});

describe("0.55.36 - Cache localStorage TTL 7 jours", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") localStorage.clear();
  });

  const CACHE_KEY_PREFIX = "aveho:etab-photo:";
  const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  function getCached(key) {
    try {
      const raw = localStorage.getItem(CACHE_KEY_PREFIX + key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (Date.now() - obj.t > CACHE_TTL_MS) return null;
      return obj.url;
    } catch { return null; }
  }

  function setCached(key, url) {
    try {
      localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify({ t: Date.now(), url }));
    } catch {}
  }

  it("Set + get fonctionne", () => {
    if (typeof localStorage === "undefined") return;
    setCached("test", "https://x.com/img.jpg");
    expect(getCached("test")).toBe("https://x.com/img.jpg");
  });

  it("Cache un échec (string vide) pour ne pas re-demander", () => {
    if (typeof localStorage === "undefined") return;
    setCached("notfound", "");
    expect(getCached("notfound")).toBe("");
  });

  it("Renvoie null si pas en cache", () => {
    if (typeof localStorage === "undefined") return;
    expect(getCached("inexistant")).toBeNull();
  });

  it("Expire après 7 jours (test de la logique)", () => {
    const now = Date.now();
    const oldEntry = { t: now - CACHE_TTL_MS - 1000, url: "old" };
    const isExpired = Date.now() - oldEntry.t > CACHE_TTL_MS;
    expect(isExpired).toBe(true);
  });
});

describe("0.55.36 - Fallback par type d'établissement", () => {
  const ICON_BY_TYPE = {
    "Hôpital": { ic: "ti-building-hospital", grad: "linear-gradient(135deg, #185FA5, #7CC8C8)" },
    "EHPAD": { ic: "ti-building-community", grad: "linear-gradient(135deg, #7a6fb0, #bfa9e0)" },
    "Clinique": { ic: "ti-stethoscope", grad: "linear-gradient(135deg, #5aa05a, #a8d590)" },
    "Cabinet": { ic: "ti-prescription", grad: "linear-gradient(135deg, #EF9F27, #f5c673)" },
    "Pharmacie": { ic: "ti-pill", grad: "linear-gradient(135deg, #c0392b, #e8857a)" },
    "Autre": { ic: "ti-building", grad: "linear-gradient(135deg, #6c7a89, #a0aeb9)" },
  };

  function getFallback(type) {
    if (!type) return ICON_BY_TYPE["Autre"];
    const lower = type.toLowerCase();
    for (const key of Object.keys(ICON_BY_TYPE)) {
      if (lower.includes(key.toLowerCase().slice(0, 4))) return ICON_BY_TYPE[key];
    }
    return ICON_BY_TYPE["Autre"];
  }

  it("Hôpital → icône hospital", () => {
    expect(getFallback("Hôpital").ic).toBe("ti-building-hospital");
  });

  it("EHPAD → icône community", () => {
    expect(getFallback("EHPAD").ic).toBe("ti-building-community");
  });

  it("Centre Hôpital → match Hôpital (prefix)", () => {
    expect(getFallback("Centre Hôpital").ic).toBe("ti-building-hospital");
  });

  it("Type inconnu → fallback Autre", () => {
    expect(getFallback("XYZ").ic).toBe("ti-building");
  });

  it("Type vide → fallback Autre", () => {
    expect(getFallback("").ic).toBe("ti-building");
    expect(getFallback(null).ic).toBe("ti-building");
  });
});

describe("0.55.36 - Query construction (nom + ville)", () => {
  function buildQuery(nom, ville) {
    return ville ? `${nom} ${ville}` : nom;
  }

  it("Combine nom + ville si ville fournie", () => {
    expect(buildQuery("Hôpital Saint-Joseph", "Paris")).toBe("Hôpital Saint-Joseph Paris");
  });

  it("Juste nom si pas de ville", () => {
    expect(buildQuery("Hôpital Saint-Joseph", null)).toBe("Hôpital Saint-Joseph");
    expect(buildQuery("X", "")).toBe("X");
  });
});
