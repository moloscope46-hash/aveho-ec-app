// =============================================================
//  Tests unitaires — lib/importCsv.js : parseCSVText()
//  Alpha 0.19.0
// =============================================================
import { describe, it, expect } from "vitest";
import { parseCSVText } from "../lib/importCsv.js";

describe("parseCSVText", () => {
  describe("séparateur virgule", () => {
    it("CSV simple avec virgules", () => {
      const r = parseCSVText("nom,prenom\nDupont,Jean\nMartin,Marie");
      expect(r).toEqual([
        { nom: "Dupont", prenom: "Jean" },
        { nom: "Martin", prenom: "Marie" },
      ]);
    });
  });

  describe("séparateur point-virgule", () => {
    it("CSV avec point-virgule (format français Excel)", () => {
      const r = parseCSVText("nom;ville;cp\nDupont;Paris;75001\nMartin;Lyon;69001");
      expect(r).toHaveLength(2);
      expect(r[0]).toEqual({ nom: "Dupont", ville: "Paris", cp: "75001" });
      expect(r[1].ville).toBe("Lyon");
    });
  });

  describe("BOM UTF-8", () => {
    it("retire le BOM en début de fichier", () => {
      const r = parseCSVText("\uFEFFnom,prenom\nDupont,Jean");
      expect(r[0].nom).toBe("Dupont");
      // Le BOM ne doit pas être préservé dans la clé
      expect(Object.keys(r[0])).toEqual(["nom", "prenom"]);
    });
  });

  describe("guillemets", () => {
    it("guillemets autour d'une cellule", () => {
      const r = parseCSVText('nom,note\n"Dupont","Avec, virgule"');
      expect(r[0]).toEqual({ nom: "Dupont", note: "Avec, virgule" });
    });

    it("guillemets échappés (doublés)", () => {
      const r = parseCSVText('nom,note\n"Dupont","Dit ""oui"""');
      expect(r[0].note).toBe('Dit "oui"');
    });

    it("cellule contenant un retour ligne entre guillemets", () => {
      const r = parseCSVText('nom,adresse\n"Dupont","Rue Foo\nVille Bar"');
      expect(r).toHaveLength(1);
      expect(r[0].adresse).toBe("Rue Foo\nVille Bar");
    });
  });

  describe("lignes vides", () => {
    it("ignore les lignes complètement vides", () => {
      const r = parseCSVText("nom,prenom\nDupont,Jean\n\n\nMartin,Marie\n");
      expect(r).toHaveLength(2);
    });
  });

  describe("retours ligne Windows vs Unix", () => {
    it("\\r\\n fonctionne (Windows)", () => {
      const r = parseCSVText("nom,prenom\r\nDupont,Jean\r\nMartin,Marie");
      expect(r).toHaveLength(2);
      expect(r[0].nom).toBe("Dupont");
    });
    it("\\n fonctionne (Unix)", () => {
      const r = parseCSVText("nom,prenom\nDupont,Jean");
      expect(r[0].nom).toBe("Dupont");
    });
  });

  describe("cas limites", () => {
    it("chaîne vide retourne []", () => {
      expect(parseCSVText("")).toEqual([]);
    });

    it("seulement l'en-tête → []", () => {
      const r = parseCSVText("nom,prenom");
      expect(r).toEqual([]);
    });

    it("cellule manquante → string vide", () => {
      const r = parseCSVText("a,b,c\n1,2");
      expect(r[0]).toEqual({ a: "1", b: "2", c: "" });
    });

    it("trim sur les valeurs", () => {
      const r = parseCSVText("nom,age\n  Dupont  ,  42  ");
      expect(r[0]).toEqual({ nom: "Dupont", age: "42" });
    });
  });

  describe("cas réel Aveho — import patients", () => {
    it("liste de patients avec colonnes typées", () => {
      const csv = `nom;prenom;chambre;date_naissance
Dupont;Jean;204;1945-03-15
Martin;Marie;205;1950-07-22`;
      const r = parseCSVText(csv);
      expect(r).toHaveLength(2);
      expect(r[0]).toMatchObject({
        nom: "Dupont",
        prenom: "Jean",
        chambre: "204",
        date_naissance: "1945-03-15",
      });
    });

    it("liste de prescripteurs avec champs entre guillemets", () => {
      const csv = `nom_prenom,specialite,rpps\n"Dr. Lambert, J.","Médecin généraliste","12345678901"\n"Dr. Mignot","Cardiologie","98765432109"`;
      const r = parseCSVText(csv);
      expect(r).toHaveLength(2);
      expect(r[0].nom_prenom).toBe("Dr. Lambert, J.");
      expect(r[0].rpps).toBe("12345678901");
    });
  });
});
