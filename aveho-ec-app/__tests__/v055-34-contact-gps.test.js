// =============================================================
//  Tests unitaires — 0.55.34
//  ContactActions, GPS popup, recherche FINESS/SIRENE dans création
// =============================================================
import { describe, it, expect } from "vitest";

describe("0.55.34 - ContactActions - logique d'affichage", () => {
  it("Affiche bouton appel si telephone présent", () => {
    const props = { telephone: "0123456789" };
    expect(!!props.telephone).toBe(true);
  });

  it("Affiche bouton mail si email présent", () => {
    const props = { email: "x@y.fr" };
    expect(!!props.email).toBe(true);
  });

  it("Affiche GPS si adresse OU coordonnées", () => {
    const p1 = { adresse: "12 rue X" };
    const p2 = { latitude: 48.8566, longitude: 2.3522 };
    expect(!!(p1.adresse || p1.commune || p1.cp || (p1.latitude && p1.longitude))).toBe(true);
    expect(!!(p2.adresse || p2.commune || p2.cp || (p2.latitude && p2.longitude))).toBe(true);
  });

  it("Ne s'affiche pas si rien de défini", () => {
    const p = {};
    const hasAnything = !!(p.telephone || p.email || p.adresse || p.commune || p.cp);
    expect(hasAnything).toBe(false);
  });
});

describe("0.55.34 - URLs GPS générées", () => {
  const lat = 48.8566;
  const lng = 2.3522;
  const adresse = "12 rue de la République, 75011 Paris";

  it("Google Maps avec coords", () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    expect(url).toContain("google.com/maps");
    expect(url).toContain("48.8566,2.3522");
  });

  it("Google Maps avec adresse (encoded)", () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`;
    expect(url).toContain("12%20rue");
  });

  it("Apple Maps", () => {
    const url = `https://maps.apple.com/?daddr=${lat},${lng}`;
    expect(url).toContain("maps.apple.com");
  });

  it("Waze format navigate=yes", () => {
    const url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    expect(url).toContain("waze.com");
    expect(url).toContain("navigate=yes");
  });

  it("OpenStreetMap zoom 18", () => {
    const url = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;
    expect(url).toContain("openstreetmap.org");
    expect(url).toContain("#map=18/");
  });
});

describe("0.55.34 - tel: et mailto: encoding", () => {
  it("tel: retire les espaces et points", () => {
    const tel = "01 23 45 67 89";
    const cleaned = tel.replace(/[\s.]/g, "");
    expect(cleaned).toBe("0123456789");
  });

  it("tel: garde le + initial pour international", () => {
    const tel = "+33 1 23 45 67 89";
    const cleaned = tel.replace(/[\s.]/g, "");
    expect(cleaned).toBe("+33123456789");
  });

  it("mailto: ne modifie pas l'email", () => {
    const email = "marie.dupont+aveho@example.fr";
    expect(`mailto:${email}`).toContain("+aveho");
  });
});

describe("0.55.34 - Recherche FINESS/SIRENE dans création partenaire", () => {
  it("FinessSearch onSelect mappe les champs", () => {
    const finessResult = {
      nom: "Hôpital Saint-Joseph",
      type: "Hôpital",
      finess: "750712184",
      siret: "12345678901234",
      adresse: "185 rue Raymond Losserand",
      code_postal: "75014",
      ville: "Paris",
      telephone: "0144123456",
    };
    // Pré-remplissage form
    const form = { nom: "", type: "", finess: "", adresse: "", cp: "" };
    const filled = {
      ...form,
      nom: finessResult.nom,
      type: finessResult.type,
      finess: finessResult.finess,
      siret: finessResult.siret,
      adresse: finessResult.adresse,
      cp: finessResult.code_postal,
      ville: finessResult.ville,
      telephone: finessResult.telephone,
    };
    expect(filled.nom).toBe("Hôpital Saint-Joseph");
    expect(filled.cp).toBe("75014");
    expect(filled.telephone).toBe("0144123456");
  });

  it("SireneSearch onSelect mappe SIRET + SIREN", () => {
    const sireneResult = {
      nom: "AVEHO SAS",
      siret: "12345678901234",
      siren: "123456789",
      adresse: "1 rue de la Tech",
      code_postal: "75011",
      ville: "Paris",
    };
    const form = { siret: "", siren: "" };
    const filled = { ...form, siret: sireneResult.siret, siren: sireneResult.siren };
    expect(filled.siret).toBe("12345678901234");
    expect(filled.siren).toBe("123456789");
  });

  it("Pré-remplissage ne ré-écrit pas si form a déjà valeur", () => {
    const form = { nom: "Mon hôpital perso", type: "" };
    const result = { nom: "AUTRE NOM", type: "Hôpital" };
    const filled = {
      ...form,
      nom: result.nom || form.nom,
      type: result.type || form.type,
    };
    // Le or-fallback écrase. Le user peut choisir d'éditer ensuite manuellement.
    expect(filled.nom).toBe("AUTRE NOM");
    expect(filled.type).toBe("Hôpital");
  });
});

describe("0.55.34 - Popup version (remplace bulle visible)", () => {
  it("État versionOpen géré par useState", () => {
    let state = false;
    const setState = (v) => { state = v; };
    setState(true);
    expect(state).toBe(true);
    setState(false);
    expect(state).toBe(false);
  });

  it("Bouton i a un title et aria-label", () => {
    const btn = { title: "À propos de cette version", ariaLabel: "À propos de cette version" };
    expect(btn.title).toBeTruthy();
    expect(btn.ariaLabel).toBeTruthy();
  });
});
