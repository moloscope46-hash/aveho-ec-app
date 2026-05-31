"use client";
// =============================================================
//  ficheToPdf (Alpha 0.14)
//  Génère le HTML A4 d'une fiche patient ou matériel, prêt à
//  passer à openPdfPreview(). Pensé pour le dossier papier.
// =============================================================
import { openPdfPreview } from "./pdfPreview";

// Style commun à toutes les fiches imprimées
const STYLE_FICHE = `
<style>
  @page { margin: 12mm; size: A4 portrait; }
  body { font-family: 'Segoe UI', Helvetica, sans-serif; color: #142131; margin: 0; line-height: 1.5; }
  .head { border-bottom: 3px solid #7CC8C8; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end; }
  .eyebrow { color: #7CC8C8; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }
  h1 { margin: 6px 0 2px; font-size: 22px; font-weight: 700; }
  .meta { text-align: right; font-size: 11px; color: #6c7a89; }
  .infos { display: flex; gap: 18px; flex-wrap: wrap; font-size: 12.5px; color: #2a3a48; margin: 8px 0 14px; }
  .infos b { color: #142131; }
  .tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
  .tag { padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
  h2 { font-size: 14px; color: #142131; margin: 16px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e3e9ee; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 12px; }
  th { background: #f4f7fa; color: #142131; font-weight: 700; padding: 6px 8px; border-bottom: 2px solid #e3e9ee; text-align: left; }
  td { padding: 5px 8px; border-bottom: 1px solid #e3e9ee; vertical-align: top; }
  .empty { padding: 14px; text-align: center; color: #8a98a8; font-style: italic; font-size: 12px; }
  .st { padding: 1px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
  .kpi { padding: 10px 12px; border: 1px solid #e3e9ee; border-radius: 8px; text-align: center; }
  .kpi .v { font-size: 22px; font-weight: 700; color: #142131; line-height: 1; }
  .kpi .l { font-size: 10px; color: #6c7a89; text-transform: uppercase; letter-spacing: .5px; margin-top: 4px; }
  .foot { margin-top: 18px; color: #9aa7b4; font-size: 10px; text-align: center; border-top: 1px solid #e3e9ee; padding-top: 8px; }
</style>`;

// Helper interne : formatage d'une date YYYY-MM-DD ou ISO
function d(s) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("fr-FR"); } catch (_) { return s; }
}

// =============================================================
//  Fiche PATIENT
// =============================================================
export function imprimerFichePatient({ patient, etiquettes = [], materiels = [], interventions = [] }) {
  const p = patient;
  const age = p.date_naissance ? Math.floor((Date.now() - new Date(p.date_naissance)) / (365.25 * 86400000)) : null;
  const matEnLoc = materiels.filter((m) => m.etat === "En location").length;
  const diOuvertes = interventions.filter((di) => di.statut === "Nouvelle" || di.statut === "En cours").length;

  const infos = [
    age !== null ? `<span><b>${age} ans</b></span>` : "",
    p.date_naissance ? `<span><b>Né(e) le</b> ${d(p.date_naissance)}</span>` : "",
    p.chambre ? `<span><b>Chambre</b> ${p.chambre}</span>` : "",
    p.services?.nom ? `<span><b>Service</b> ${p.services.nom}</span>` : "",
    p.etablissements?.nom ? `<span><b>Établissement</b> ${p.etablissements.nom}</span>` : "",
    p.numero_dossier ? `<span><b>Dossier</b> ${p.numero_dossier}</span>` : "",
    p.medecin_traitant ? `<span><b>Médecin</b> ${p.medecin_traitant}</span>` : "",
    `<span><b>État</b> ${p.etat || "—"}</span>`,
  ].filter(Boolean).join("");

  const tagsHtml = etiquettes.length === 0 ? "" :
    `<div class="tags">${etiquettes.map((e) => `<span class="tag" style="background:${e.couleur}22;color:${e.couleur};border:1px solid ${e.couleur}44">${e.libelle}</span>`).join("")}</div>`;

  const matsHtml = materiels.length === 0
    ? `<div class="empty">Aucun matériel affecté à ce patient.</div>`
    : `<table><thead><tr><th>Libellé</th><th>Identifiants</th><th>Article</th><th>État</th></tr></thead><tbody>${
        materiels.map((m) => {
          const ids = [m.num_serie && `S/N ${m.num_serie}`, m.num_parc && `Parc ${m.num_parc}`, m.num_lot && `Lot ${m.num_lot}`].filter(Boolean).join(" · ");
          return `<tr><td><b>${m.libelle}</b></td><td style="font-size:10px;color:#8a98a8">${ids || "—"}</td><td>${m.articles?.libelle || "—"}</td><td>${m.etat || "—"}</td></tr>`;
        }).join("")
      }</tbody></table>`;

  const disHtml = interventions.length === 0
    ? `<div class="empty">Aucune demande d'intervention enregistrée.</div>`
    : `<table><thead><tr><th>N°</th><th>Date</th><th>Type</th><th>Urgence</th><th>Statut</th></tr></thead><tbody>${
        interventions.slice(0, 15).map((di) => `<tr><td><b>${di.numero}</b></td><td>${d(di.created_at)}</td><td>${di.type || "—"}</td><td>${di.urgence || "—"}</td><td>${di.statut || "—"}</td></tr>`).join("")
      }</tbody></table>${interventions.length > 15 ? `<p style="font-size:10px;color:#8a98a8;text-align:right">+ ${interventions.length - 15} DI plus anciennes non affichées</p>` : ""}`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fiche patient ${p.nom}</title>${STYLE_FICHE}</head><body>
    <div class="head">
      <div>
        <div class="eyebrow">AVEHO — FICHE PATIENT</div>
        <h1>${p.nom} ${p.prenom || ""}</h1>
      </div>
      <div class="meta">
        <div>Édition du ${new Date().toLocaleString("fr-FR")}</div>
      </div>
    </div>
    <div class="infos">${infos}</div>
    ${tagsHtml}
    <div class="kpis">
      <div class="kpi"><div class="v">${materiels.length}</div><div class="l">Matériels affectés</div></div>
      <div class="kpi"><div class="v">${matEnLoc}</div><div class="l">En location active</div></div>
      <div class="kpi"><div class="v">${diOuvertes}</div><div class="l">DI ouvertes</div></div>
      <div class="kpi"><div class="v">${interventions.length}</div><div class="l">DI au total</div></div>
    </div>
    <h2>Matériels affectés (${materiels.length})</h2>
    ${matsHtml}
    <h2>Demandes d'intervention (${interventions.length})</h2>
    ${disHtml}
    <div class="foot">Document généré depuis Aveho EC le ${new Date().toLocaleString("fr-FR")} — à classer dans le dossier patient</div>
  </body></html>`;

  openPdfPreview({
    titre: `Fiche patient — ${p.nom} ${p.prenom || ""}`,
    html,
    filename: `fiche-patient-${p.nom.toLowerCase()}`,
  });
}

// =============================================================
//  Fiche MATÉRIEL
// =============================================================
export function imprimerFicheMateriel({ materiel, tags = [], maintenances = [], interventions = [], transferts = [] }) {
  const m = materiel;

  const stMaint = (mnt) => {
    if (mnt.statut === "Faite" || mnt.statut === "Annulée") return mnt.statut;
    const auj = new Date().toISOString().slice(0, 10);
    if (mnt.date_prevue < auj) return "En retard";
    return mnt.statut;
  };
  const mntEnCours = maintenances.filter((mt) => stMaint(mt) !== "Faite" && mt.statut !== "Annulée").length;
  const mntRetard = maintenances.filter((mt) => stMaint(mt) === "En retard").length;
  const diOuvertes = interventions.filter((di) => di.statut === "Nouvelle" || di.statut === "En cours").length;

  const infos = [
    m.num_serie ? `<span><b>S/N</b> ${m.num_serie}</span>` : "",
    m.num_parc ? `<span><b>Parc</b> ${m.num_parc}</span>` : "",
    m.num_lot ? `<span><b>Lot</b> ${m.num_lot}</span>` : "",
    m.articles?.libelle ? `<span><b>Article</b> ${m.articles.libelle}</span>` : "",
    `<span><b>État</b> ${m.etat || "—"}</span>`,
    m.depots?.nom ? `<span><b>Dépôt</b> ${m.depots.nom}</span>` : "",
    m.zones?.nom ? `<span><b>Zone</b> ${m.zones.nom}</span>` : "",
    m.patients ? `<span><b>Patient</b> ${m.patients.nom} ${m.patients.prenom || ""}${m.patients.chambre ? ` (ch.${m.patients.chambre})` : ""}</span>` : "",
  ].filter(Boolean).join("");

  const tagsHtml = tags.length === 0 ? "" :
    `<div class="tags">${tags.map((t) => `<span class="tag" style="background:${t.couleur}22;color:${t.couleur};border:1px solid ${t.couleur}44">${t.libelle}</span>`).join("")}</div>`;

  const mntsHtml = maintenances.length === 0
    ? `<div class="empty">Aucune maintenance enregistrée.</div>`
    : `<table><thead><tr><th>Date prévue</th><th>Type</th><th>Intervenant</th><th>Statut</th></tr></thead><tbody>${
        maintenances.map((mt) => `<tr><td>${d(mt.date_prevue)}${mt.date_realisee ? `<div style="font-size:10px;color:#5aa05a">Réalisée le ${d(mt.date_realisee)}</div>` : ""}</td><td>${mt.type}</td><td>${mt.intervenant || "—"}</td><td>${stMaint(mt)}</td></tr>`).join("")
      }</tbody></table>`;

  const disHtml = interventions.length === 0
    ? `<div class="empty">Aucune DI enregistrée.</div>`
    : `<table><thead><tr><th>N°</th><th>Date</th><th>Type</th><th>Urgence</th><th>Statut</th></tr></thead><tbody>${
        interventions.slice(0, 15).map((di) => `<tr><td><b>${di.numero}</b></td><td>${d(di.created_at)}</td><td>${di.type || "—"}</td><td>${di.urgence || "—"}</td><td>${di.statut || "—"}</td></tr>`).join("")
      }</tbody></table>${interventions.length > 15 ? `<p style="font-size:10px;color:#8a98a8;text-align:right">+ ${interventions.length - 15} DI plus anciennes non affichées</p>` : ""}`;

  const trfHtml = transferts.length === 0 ? "" :
    `<h2>Derniers transferts (${transferts.length})</h2>
    <table><thead><tr><th>Date</th><th>Origine</th><th>Destination</th><th>Statut</th></tr></thead><tbody>${
      transferts.slice(0, 8).map((t) => `<tr><td>${d(t.created_at)}</td><td>${t.depots_source?.nom || "—"}</td><td>${t.depots_dest?.nom || "—"}</td><td>${t.statut || "—"}</td></tr>`).join("")
    }</tbody></table>`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fiche matériel ${m.libelle}</title>${STYLE_FICHE}</head><body>
    <div class="head">
      <div>
        <div class="eyebrow">AVEHO — FICHE MATÉRIEL</div>
        <h1>${m.libelle}</h1>
      </div>
      <div class="meta">
        <div>Édition du ${new Date().toLocaleString("fr-FR")}</div>
      </div>
    </div>
    <div class="infos">${infos}</div>
    ${tagsHtml}
    <div class="kpis">
      <div class="kpi"><div class="v">${maintenances.length}</div><div class="l">Maintenances</div></div>
      <div class="kpi"><div class="v">${mntEnCours}</div><div class="l">À venir / en cours</div></div>
      <div class="kpi"><div class="v">${mntRetard}</div><div class="l">En retard</div></div>
      <div class="kpi"><div class="v">${diOuvertes}</div><div class="l">DI ouvertes</div></div>
    </div>
    <h2>Maintenances (${maintenances.length})</h2>
    ${mntsHtml}
    <h2>Demandes d'intervention (${interventions.length})</h2>
    ${disHtml}
    ${trfHtml}
    <div class="foot">Document généré depuis Aveho EC le ${new Date().toLocaleString("fr-FR")} — à classer dans le dossier matériel</div>
  </body></html>`;

  openPdfPreview({
    titre: `Fiche matériel — ${m.libelle}`,
    html,
    filename: `fiche-materiel-${m.id}`,
  });
}
