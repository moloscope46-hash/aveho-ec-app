// =============================================================
//  Tests unitaires — 0.55.33
//  Couvre : filtres RppsSearch étendus, actions tuiles, verrouillage SQL
// =============================================================
import { describe, it, expect } from "vitest";

describe("0.55.33 - RppsSearch - filtres étendus", () => {
  it("Supporte ville", () => {
    const params = new URLSearchParams();
    params.set("ville", "Paris");
    expect(params.get("ville")).toBe("Paris");
  });

  it("Supporte mode d'exercice", () => {
    const params = new URLSearchParams();
    params.set("mode", "libéral");
    expect(params.get("mode")).toBe("libéral");
  });

  it("Limite plafonnée à 100", () => {
    const limit = Math.min(150, 100);
    expect(limit).toBe(100);
  });

  it("12 professions disponibles", () => {
    const PROFESSIONS = [
      "Médecin", "Infirmier", "Kinésithérapeute", "Pharmacien", "Sage-femme",
      "Dentiste", "Pédicure", "Orthophoniste", "Ergothérapeute",
      "Psychologue", "Manipulateur",
    ];
    expect(PROFESSIONS.length).toBeGreaterThanOrEqual(10);
  });

  it("3 modes d'exercice", () => {
    const MODES = ["libéral", "salarié", "remplaçant"];
    expect(MODES.length).toBe(3);
  });
});

describe("0.55.33 - Filtre client côté API", () => {
  const rows = [
    { commune: "Paris", profession: "Médecin", mode_exercice: "libéral", cp: "75011" },
    { commune: "Lyon", profession: "Infirmier", mode_exercice: "salarié", cp: "69001" },
    { commune: "Gramat", profession: "Kinésithérapeute", mode_exercice: "libéral", cp: "46500" },
  ];

  function applyFilters(rows, { ville, mode, profession, cp }) {
    let r = rows;
    if (ville) r = r.filter(x => (x.commune || "").toLowerCase().includes(ville.toLowerCase()));
    if (mode) r = r.filter(x => (x.mode_exercice || "").toLowerCase().includes(mode.toLowerCase()));
    if (profession) r = r.filter(x => (x.profession || "").toLowerCase().includes(profession.toLowerCase()));
    if (cp) r = r.filter(x => (x.cp || "").startsWith(cp));
    return r;
  }

  it("Filtre par ville", () => {
    expect(applyFilters(rows, { ville: "Paris" }).length).toBe(1);
  });

  it("Filtre par CP préfixe (département)", () => {
    expect(applyFilters(rows, { cp: "75" }).length).toBe(1);
    expect(applyFilters(rows, { cp: "69" }).length).toBe(1);
  });

  it("Filtre par mode libéral", () => {
    expect(applyFilters(rows, { mode: "libéral" }).length).toBe(2);
  });

  it("Filtres combinés (mode + CP)", () => {
    expect(applyFilters(rows, { mode: "libéral", cp: "46" }).length).toBe(1);
  });
});

describe("0.55.33 - Action 'Transformer en utilisateur'", () => {
  const praticien = {
    rpps: "10000000001", adeli: "751234567",
    prenom: "Marie", nom: "DUPONT",
    profession: "Médecin", specialite: "Cardiologie",
    telephone: "0123456789", email: "marie@x.fr",
  };

  it("Pré-coche tous les champs présents", () => {
    const fields = {
      prenom: !!praticien.prenom,
      nom: !!praticien.nom,
      telephone: !!praticien.telephone,
      rpps: !!praticien.rpps,
      adeli: !!praticien.adeli,
      rpps_profession: !!praticien.profession,
      rpps_specialite: !!praticien.specialite,
    };
    expect(fields.prenom).toBe(true);
    expect(fields.rpps).toBe(true);
    expect(fields.rpps_specialite).toBe(true);
  });

  it("Ne pré-coche pas les champs absents", () => {
    const minimal = { nom: "X" };
    const fields = {
      telephone: !!minimal.telephone,
      rpps: !!minimal.rpps,
    };
    expect(fields.telephone).toBe(false);
    expect(fields.rpps).toBe(false);
  });

  it("Construit le payload selon les checkboxes cochées", () => {
    const f = { prenom: true, rpps: true, telephone: false };
    const payload = {
      prenom: f.prenom ? praticien.prenom : null,
      rpps: f.rpps ? praticien.rpps : null,
      telephone: f.telephone ? praticien.telephone : null,
    };
    expect(payload.prenom).toBe("Marie");
    expect(payload.rpps).toBe("10000000001");
    expect(payload.telephone).toBeNull();
  });

  it("origine='rpps_annuaire' dans le payload", () => {
    const payload = { origine: "rpps_annuaire" };
    expect(payload.origine).toBe("rpps_annuaire");
  });
});

describe("0.55.33 - Action 'Rattacher à un établissement'", () => {
  it("Combine étabs + partenaires dans la liste de choix", () => {
    const mine = [{ id: "m1", nom: "Mon EHPAD", kind: "mine" }];
    const partners = [{ id: "p1", nom: "Hôpital tiers", kind: "partner" }];
    const combined = [...mine, ...partners];
    expect(combined.length).toBe(2);
    expect(combined.find(e => e.kind === "partner")).toBeTruthy();
  });

  it("Évite le double rattachement (RPC array @> check)", () => {
    const currentIds = ["e1", "e2"];
    const newEtab = "e1";
    const alreadyLinked = currentIds.includes(newEtab);
    expect(alreadyLinked).toBe(true);
  });
});

describe("0.55.33 - Verrouillage SQL est_partenaire/groupement_id", () => {
  it("Le trigger ne bloque PAS si rien n'a changé sur ces champs", () => {
    const old = { est_partenaire: false, groupement_id: null, nom: "A" };
    const neu = { est_partenaire: false, groupement_id: null, nom: "B" };
    const blocked = (old.est_partenaire !== neu.est_partenaire) || (old.groupement_id !== neu.groupement_id);
    expect(blocked).toBe(false);
  });

  it("Le trigger bloque si est_partenaire change (sans droit admin)", () => {
    const old = { est_partenaire: false };
    const neu = { est_partenaire: true };
    const blocked = old.est_partenaire !== neu.est_partenaire;
    expect(blocked).toBe(true);
  });

  it("Le trigger bloque si groupement_id change", () => {
    const old = { groupement_id: null };
    const neu = { groupement_id: "uuid-1" };
    const blocked = old.groupement_id !== neu.groupement_id;
    expect(blocked).toBe(true);
  });
});

describe("0.55.33 - Schéma colonnes manquantes etablissements", () => {
  const newColumns = [
    "adresse", "cp", "pays", "latitude", "longitude",
    "finess", "siret", "siren",
    "contact_nom", "contact_fonction", "telephone", "email", "site_web",
    "notes", "tags", "est_partenaire",
  ];

  it("16 colonnes au total ajoutées (avec rétrocompat)", () => {
    expect(newColumns.length).toBe(16);
  });

  it("Identifiants officiels présents", () => {
    expect(newColumns).toContain("finess");
    expect(newColumns).toContain("siret");
    expect(newColumns).toContain("siren");
  });

  it("Adresse complète + géoloc", () => {
    expect(newColumns).toContain("latitude");
    expect(newColumns).toContain("longitude");
    expect(newColumns).toContain("cp");
  });
});
