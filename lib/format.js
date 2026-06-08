// Helpers réutilisables dans toute l'app (anti-doublon)

export const fmtEur = (n) =>
  Number(n || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("fr-FR") : "—";

// jours restants avant une date (>=0)
export const joursRestants = (d) => {
  if (!d) return null;
  const diff = Math.ceil((new Date(d) - new Date()) / 86400000);
  return diff > 0 ? diff : 0;
};

// classe CSS d'un statut de commande
export const statutClass = (s) =>
  s === "Validée" ? "s-validee" : s === "Livrée" ? "s-livree" : "s-encours";
