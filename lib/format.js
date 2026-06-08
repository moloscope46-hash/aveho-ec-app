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

// Alpha 0.17.1 : helper "il y a X" — temps relatif court FR
export function relativeTime(iso) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "à l'instant";
  if (diff < 3600000) return `il y a ${Math.floor(diff/60000)} min`;
  if (diff < 86400000) return `il y a ${Math.floor(diff/3600000)} h`;
  if (diff < 604800000) return `il y a ${Math.floor(diff/86400000)} j`;
  if (diff < 2592000000) return `il y a ${Math.floor(diff/604800000)} sem`;
  return "il y a +30 j";
}

// Alpha 0.17.1 : couleur de pastille d'activité selon ancienneté
export function activityDotColor(iso) {
  if (!iso) return "#cfd5db"; // gris : jamais
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 600000) return "#5aa05a"; // 10 min : vert (en ligne)
  if (diff < 86400000) return "#EF9F27"; // 24h : orange
  return "#cfd5db"; // gris
}
