// =============================================================
//  Tests unitaires — lib/events.js (helpers purs uniquement)
//  Alpha 0.18.0
// =============================================================
import { describe, it, expect } from "vitest";
import { mapNotifType, mapEventType, defaultTitre } from "../lib/events.js";

describe("mapNotifType", () => {
  it("mappe entité → type de notif", () => {
    expect(mapNotifType("transfert")).toBe("transfert");
    expect(mapNotifType("di")).toBe("di");
    expect(mapNotifType("intervention")).toBe("di");
    expect(mapNotifType("invitation")).toBe("invitation");
    expect(mapNotifType("commande")).toBe("commande");
  });
  it("fallback systeme pour patient/materiel/article", () => {
    expect(mapNotifType("patient")).toBe("systeme");
    expect(mapNotifType("materiel")).toBe("systeme");
    expect(mapNotifType("article")).toBe("systeme");
  });
  it("fallback systeme pour entité inconnue", () => {
    expect(mapNotifType("foobar")).toBe("systeme");
    expect(mapNotifType("")).toBe("systeme");
    expect(mapNotifType(undefined)).toBe("systeme");
  });
});

describe("mapEventType", () => {
  it("intervention → di_urgente", () => {
    expect(mapEventType({ entite: "intervention" })).toBe("di_urgente");
  });
  it("notifType di → di_urgente", () => {
    expect(mapEventType({ notifType: "di" })).toBe("di_urgente");
  });
  it("achat → achat_a_valider", () => {
    expect(mapEventType({ entite: "achat" })).toBe("achat_a_valider");
  });
  it("signalement → signalement", () => {
    expect(mapEventType({ entite: "signalement" })).toBe("signalement");
  });
  it("autre entité fallback sur notifType ou autre", () => {
    expect(mapEventType({ entite: "patient", notifType: "systeme" })).toBe("systeme");
    expect(mapEventType({ entite: "patient" })).toBe("autre");
  });
});

describe("defaultTitre", () => {
  it("creer → entité créé", () => {
    expect(defaultTitre({ action: "creer", entite: "patient" })).toBe("Patient créé");
    expect(defaultTitre({ action: "creer", entite: "intervention" })).toBe("Intervention créé");
  });
  it("modifier/supprimer/valider/recevoir/inviter", () => {
    expect(defaultTitre({ action: "modifier", entite: "depot" })).toBe("Depot modifié");
    expect(defaultTitre({ action: "supprimer", entite: "depot" })).toBe("Depot supprimé");
    expect(defaultTitre({ action: "valider", entite: "achat" })).toBe("Achat validé");
    expect(defaultTitre({ action: "recevoir", entite: "commande" })).toBe("Commande reçu");
    expect(defaultTitre({ action: "inviter", entite: "utilisateur" })).toBe("Utilisateur invité");
  });
  it("action inconnue conservée telle quelle", () => {
    expect(defaultTitre({ action: "exporter", entite: "stock" })).toBe("Stock exporter");
  });
  it("capitalise l'entité", () => {
    expect(defaultTitre({ action: "creer", entite: "patient" })).toMatch(/^Patient/);
  });
});
