// =============================================================
//  Tests unitaires — lib/useAuth.js : canDo()
//  Alpha 0.19.0
// =============================================================
import { describe, it, expect } from "vitest";
import { canDo } from "../lib/useAuth.js";

describe("canDo — gestion des rôles et permissions", () => {
  describe("rôles système (raccourcis)", () => {
    it("Administrateur peut tout faire", () => {
      const role = { nom: "Administrateur" };
      expect(canDo(role, "ecrire")).toBe(true);
      expect(canDo(role, "supprimer")).toBe(true);
      expect(canDo(role, "inviter")).toBe(true);
      expect(canDo(role, "gerer_roles")).toBe(true);
      expect(canDo(role, "creer_etablissement")).toBe(true);
    });

    it("rôle systeme='admin' équivaut à Administrateur", () => {
      const role = { systeme: "admin", nom: "Custom Admin" };
      expect(canDo(role, "supprimer")).toBe(true);
      expect(canDo(role, "valider_di")).toBe(true);
    });

    it("Lecture seule ne peut rien écrire", () => {
      const role = { nom: "Lecture seule" };
      expect(canDo(role, "ecrire")).toBe(false);
      expect(canDo(role, "supprimer")).toBe(false);
      expect(canDo(role, "inviter")).toBe(false);
    });

    it("rôle systeme='lecture' équivaut à Lecture seule", () => {
      const role = { systeme: "lecture", nom: "Read Only" };
      expect(canDo(role, "ecrire")).toBe(false);
    });
  });

  describe("rôle null/undefined", () => {
    it("null ne peut rien faire", () => {
      expect(canDo(null, "ecrire")).toBe(false);
      expect(canDo(null, "supprimer")).toBe(false);
    });
    it("undefined ne peut rien faire", () => {
      expect(canDo(undefined, "ecrire")).toBe(false);
    });
  });

  describe("permissions au format Array", () => {
    it("array contenant la permission requise → autorisé", () => {
      const role = { nom: "Gestionnaire", permissions_json: ["write", "validate_transfer"] };
      expect(canDo(role, "ecrire")).toBe(true);
      expect(canDo(role, "valider_transfert")).toBe(true);
    });

    it("array sans la permission → refusé", () => {
      const role = { nom: "Gestionnaire", permissions_json: ["write"] };
      expect(canDo(role, "supprimer")).toBe(false);
      expect(canDo(role, "gerer_roles")).toBe(false);
    });

    it("wildcard * dans array → tout autorisé", () => {
      const role = { nom: "Super", permissions_json: ["*"] };
      expect(canDo(role, "ecrire")).toBe(true);
      expect(canDo(role, "supprimer")).toBe(true);
      expect(canDo(role, "inviter")).toBe(true);
    });
  });

  describe("permissions au format Objet par module", () => {
    it("objet avec module contenant la perm → autorisé", () => {
      const role = { nom: "Chef stock", permissions_json: { stock: ["read", "write"], patients: ["read"] } };
      expect(canDo(role, "ecrire")).toBe(true);
    });

    it("objet avec wildcard module → autorisé", () => {
      const role = { nom: "Admin stock", permissions_json: { stock: ["*"] } };
      expect(canDo(role, "ecrire")).toBe(true);
      expect(canDo(role, "supprimer")).toBe(true);
    });

    it("aucun module avec la perm → refusé", () => {
      const role = { nom: "Patient view", permissions_json: { patients: ["read"] } };
      expect(canDo(role, "ecrire")).toBe(false);
    });
  });

  describe("compatibilité legacy droits / permissions", () => {
    it("fallback sur 'droits' si pas de permissions_json", () => {
      const role = { nom: "Legacy", droits: ["write"] };
      expect(canDo(role, "ecrire")).toBe(true);
    });

    it("fallback sur 'permissions' (sans _json)", () => {
      const role = { nom: "Legacy", permissions: ["delete"] };
      expect(canDo(role, "supprimer")).toBe(true);
    });
  });

  describe("actions non listées", () => {
    it("action inconnue autorisée par défaut", () => {
      const role = { nom: "Membre", permissions_json: [] };
      expect(canDo(role, "action_inexistante")).toBe(true);
    });
  });

  describe("cas réels d'usage", () => {
    it("Cas Cédric : admin de structure", () => {
      const role = { nom: "Administrateur", systeme: "admin" };
      expect(canDo(role, "ecrire")).toBe(true);
      expect(canDo(role, "creer_etablissement")).toBe(true);
      expect(canDo(role, "gerer_roles")).toBe(true);
    });

    it("Cas trainer : peut écrire mais pas gérer rôles", () => {
      const role = { nom: "Formateur", permissions_json: ["write", "invite_users"] };
      expect(canDo(role, "ecrire")).toBe(true);
      expect(canDo(role, "inviter")).toBe(true);
      expect(canDo(role, "gerer_roles")).toBe(false);
      expect(canDo(role, "supprimer")).toBe(false);
    });

    it("Cas observateur externe : tout en lecture seule", () => {
      const role = { nom: "Lecture seule" };
      expect(canDo(role, "ecrire")).toBe(false);
      expect(canDo(role, "supprimer")).toBe(false);
    });
  });
});
