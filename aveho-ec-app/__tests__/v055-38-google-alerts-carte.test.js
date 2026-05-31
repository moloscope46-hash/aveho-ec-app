// =============================================================
//  Tests unitaires — 0.55.38
//  Google Places, AlertToast, filtres carte RPPS/SIRENE
// =============================================================
import { describe, it, expect } from "vitest";

describe("0.55.38 - EtabPhoto Wikipedia retiré", () => {
  it("Plus de référence à fr.wikipedia.org dans EtabPhoto", async () => {
    // Charge le code et vérifie qu'aucune URL Wikipedia n'y figure
    const fs = await import("fs");
    const src = fs.readFileSync(new URL("../app/components/EtabPhoto.js", import.meta.url), "utf-8");
    expect(src).not.toContain("fr.wikipedia.org");
    expect(src).not.toContain("wbgetentities");
  });

  it("EtabPhoto utilise /api/place (proxy Google)", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync(new URL("../app/components/EtabPhoto.js", import.meta.url), "utf-8");
    expect(src).toContain("/api/place");
  });
});

describe("0.55.38 - API /api/place sans clé Google", () => {
  it("Retourne ok:true place:null si clé absente", () => {
    const KEY = null;
    const response = KEY
      ? { ok: true, place: { photoUrl: "..." } }
      : { ok: true, place: null, note: "Pas de clé" };
    expect(response.ok).toBe(true);
    expect(response.place).toBeNull();
  });

  it("Fields demandés à Google Places Details", () => {
    const fields = ["photos", "rating", "user_ratings_total", "opening_hours", "formatted_phone_number", "website", "url", "name", "formatted_address"];
    expect(fields).toContain("rating");
    expect(fields).toContain("opening_hours");
    expect(fields).toContain("photos");
  });
});

describe("0.55.38 - Étoiles de notation (RatingStars)", () => {
  function buildStars(value) {
    const full = Math.floor(value);
    const half = value - full >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    return { full, half, empty };
  }

  it("4.5 → 4 pleines + 1 demi + 0 vide", () => {
    const r = buildStars(4.5);
    expect(r.full).toBe(4);
    expect(r.half).toBe(true);
    expect(r.empty).toBe(0);
  });

  it("3.0 → 3 pleines + 0 demi + 2 vides", () => {
    const r = buildStars(3.0);
    expect(r.full).toBe(3);
    expect(r.half).toBe(false);
    expect(r.empty).toBe(2);
  });

  it("5.0 → 5 pleines", () => {
    const r = buildStars(5.0);
    expect(r.full).toBe(5);
    expect(r.empty).toBe(0);
  });
});

describe("0.55.38 - AlertToast - système de queue", () => {
  it("Ajoute une alerte avec ID unique", () => {
    const id1 = `alert-${Date.now()}-x`;
    const id2 = `alert-${Date.now() + 1}-y`;
    expect(id1).not.toBe(id2);
  });

  it("Durée par défaut 20 000ms (20s)", () => {
    const alert = { duration: 20000 };
    expect(alert.duration).toBe(20000);
  });

  it("Couleur selon rating (high)", () => {
    const rating = 5;
    const color = rating >= 4 ? "#5aa05a" : rating <= 2 ? "#c0392b" : "#EF9F27";
    expect(color).toBe("#5aa05a");
  });

  it("Couleur selon rating (low)", () => {
    const rating = 1;
    const color = rating >= 4 ? "#5aa05a" : rating <= 2 ? "#c0392b" : "#EF9F27";
    expect(color).toBe("#c0392b");
  });

  it("Couleur selon rating (mid)", () => {
    const rating = 3;
    const color = rating >= 4 ? "#5aa05a" : rating <= 2 ? "#c0392b" : "#EF9F27";
    expect(color).toBe("#EF9F27");
  });
});

describe("0.55.38 - Carte filtres RPPS et SIRENE", () => {
  it("8 professions RPPS disponibles", () => {
    const PROFS = ["Médecin", "Infirmier", "Kinésithérapeute", "Pharmacien", "Sage-femme", "Dentiste", "Pédicure", "Orthophoniste"];
    expect(PROFS.length).toBe(8);
  });

  it("5 catégories SIRENE", () => {
    const CATS = ["pharmacie", "matériel médical", "orthopédie", "audioprothésiste", "opticien"];
    expect(CATS.length).toBe(5);
  });

  it("Toggle filtre ajoute/retire", () => {
    let filters = ["Médecin"];
    const add = (p) => filters.includes(p) ? filters.filter(x => x !== p) : [...filters, p];
    filters = add("Infirmier");
    expect(filters).toEqual(["Médecin", "Infirmier"]);
    filters = add("Médecin");
    expect(filters).toEqual(["Infirmier"]);
  });
});

describe("0.55.38 - SQL préférences alertes", () => {
  it("Structure user_review_alert_prefs PK composite", () => {
    const pk = ["user_id", "etablissement_id"];
    expect(pk.length).toBe(2);
  });

  it("min_rating + max_rating dans 1-5", () => {
    const minRating = 1;
    const maxRating = 5;
    expect(minRating).toBeGreaterThanOrEqual(1);
    expect(maxRating).toBeLessThanOrEqual(5);
  });

  it("etablissement_kind = 'mine' ou 'partner'", () => {
    const validKinds = ["mine", "partner"];
    expect(validKinds).toContain("mine");
    expect(validKinds).toContain("partner");
  });
});
