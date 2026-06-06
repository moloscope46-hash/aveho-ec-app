"use client";
// =============================================================
//  app/components/TeamStatsPdfExport.js (0.58.62)
//
//  Bouton qui exporte les stats d'équipe (depuis TeamGoalsWidget)
//  en PDF via window.print() ciblé sur une zone imprimable.
//
//  Pas de dépendance jspdf — utilise la fonctionnalité native du
//  navigateur "Imprimer en PDF" via window.print() + CSS @media print.
// =============================================================

export default function TeamStatsPdfExport({ stats, teamGoals }) {
  if (!stats || !teamGoals || teamGoals.length === 0) return null;

  function handleExport() {
    // Crée une fenêtre dédiée avec mise en page imprimable
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) {
      alert("Le navigateur a bloqué l'ouverture de la fenêtre PDF. Autorise les popups pour cette page.");
      return;
    }
    const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>Stats objectifs équipe - ${today}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Quicksand,Segoe UI,Arial,sans-serif;color:#142131;margin:0;padding:30px}
  .header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #7CC8C8;padding-bottom:14px;margin-bottom:24px}
  .brand{display:flex;align-items:center;gap:10px}
  .brand-name{font-size:26px;font-weight:600;letter-spacing:2px;color:#142131}
  .brand-name .v{color:#7CC8C8}
  .date{font-size:12px;color:#8a98a8}
  h1{font-size:22px;color:#142131;margin:0 0 6px}
  h2{font-size:16px;color:#185FA5;margin:24px 0 10px;border-left:4px solid #7CC8C8;padding-left:10px}
  .subtitle{font-size:13px;color:#5a6878;margin:0 0 20px}
  .stats-bar{background:linear-gradient(135deg,#fff,#f0fafa);border:1px solid #cfe0e0;border-radius:10px;padding:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:22px}
  .stat-cell{text-align:center}
  .stat-cell.middle{border-left:1px solid #e3e9ee;border-right:1px solid #e3e9ee}
  .stat-lbl{font-size:10px;color:#8a98a8;text-transform:uppercase;letter-spacing:.5px;font-weight:700}
  .stat-val{font-size:24px;font-weight:700;margin-top:4px;color:#185FA5}
  .stat-val.green{color:#5aa05a}
  .stat-val.amber{color:#EF9F27}
  table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}
  th,td{padding:8px 10px;text-align:left;border-bottom:1px solid #e3e9ee}
  th{background:#f5f8fc;color:#142131;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
  .team-tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;color:#fff}
  .progress{display:inline-block;width:80px;height:8px;background:#e3e9ee;border-radius:4px;overflow:hidden;vertical-align:middle}
  .progress-fill{height:100%;background:linear-gradient(90deg,#185FA5,#7CC8C8);transition:width 200ms}
  .progress-fill.done{background:linear-gradient(90deg,#5aa05a,#4a8a4a)}
  .checked{color:#5aa05a;font-weight:700}
  footer{margin-top:40px;padding-top:14px;border-top:1px solid #e3e9ee;font-size:10px;color:#8a98a8;text-align:center}
  @media print {
    body{padding:14px}
    button{display:none !important}
  }
  .print-btn{position:fixed;top:20px;right:20px;background:linear-gradient(135deg,#185FA5,#134e87);color:#fff;border:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(24,95,165,.30);font-family:inherit}
</style></head>
<body>
<button class="print-btn" onclick="window.print()">📄 Imprimer / Enregistrer en PDF</button>

<div class="header">
  <div class="brand">
    <div class="brand-name">a<span class="v">v</span>eho</div>
  </div>
  <div class="date">${today}</div>
</div>

<h1>📊 Stats objectifs d'équipe</h1>
<p class="subtitle">Vue d'ensemble de l'avancement des objectifs partagés par les membres de tes équipes</p>

<h2>Synthèse globale</h2>
<div class="stats-bar">
  <div class="stat-cell">
    <div class="stat-lbl">Moyenne d'avancement</div>
    <div class="stat-val ${stats.avgPct >= 80 ? "green" : ""}">${Math.round(stats.avgPct)}%</div>
  </div>
  <div class="stat-cell middle">
    <div class="stat-lbl">Objectifs atteints</div>
    <div class="stat-val green">${stats.nbAtteints} / ${teamGoals.length}</div>
  </div>
  <div class="stat-cell">
    <div class="stat-lbl">Taux d'atteinte</div>
    <div class="stat-val ${stats.tauxAtteinte >= 50 ? "green" : "amber"}">${Math.round(stats.tauxAtteinte)}%</div>
  </div>
</div>

${stats.teamStats && stats.teamStats.length > 1 ? `
<h2>Par équipe</h2>
<table>
  <thead><tr><th>Équipe</th><th>Objectifs</th><th>Atteints</th><th>Moyenne</th><th>Taux</th></tr></thead>
  <tbody>
    ${stats.teamStats.map(t => `
      <tr>
        <td><span class="team-tag" style="background:${t.team?.couleur || "#185FA5"}">${(t.team?.nom || "Sans équipe").replace(/</g, "&lt;")}</span></td>
        <td>${t.goals.length}</td>
        <td class="checked">${t.achieved}</td>
        <td><b>${Math.round(t.avgPct)}%</b></td>
        <td>${Math.round(t.tauxAtteinte)}%</td>
      </tr>
    `).join("")}
  </tbody>
</table>
` : ""}

<h2>Détail des objectifs (${teamGoals.length})</h2>
<table>
  <thead><tr><th>Membre</th><th>Équipe</th><th>Objectif</th><th>Avancement</th><th>%</th></tr></thead>
  <tbody>
    ${teamGoals.map(g => {
      const pct = g.target > 0 ? Math.min(100, (g.current / g.target) * 100) : 0;
      const done = g.current >= g.target;
      return `
        <tr>
          <td>${(g.ownerName || "—").replace(/</g, "&lt;")}</td>
          <td>${g.team?.nom ? `<span class="team-tag" style="background:${g.team?.couleur || "#185FA5"}">${g.team.nom.replace(/</g, "&lt;")}</span>` : "—"}</td>
          <td>${done ? "✓ " : ""}${(g.label || "").replace(/</g, "&lt;")}</td>
          <td>${g.current} / ${g.target}${g.unit ? " " + g.unit : ""} <div class="progress"><div class="progress-fill ${done ? "done" : ""}" style="width:${pct}%"></div></div></td>
          <td class="${done ? "checked" : ""}"><b>${Math.round(pct)}%</b></td>
        </tr>
      `;
    }).join("")}
  </tbody>
</table>

<footer>
  Aveho — Espace Collectivité · Export Stats Équipe · ${today}
</footer>

<script>
  // Auto-print après chargement (option commentée — laisse l'user décider)
  // setTimeout(() => window.print(), 600);
<\/script>
</body></html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  return (
    <button
      onClick={handleExport}
      title="Exporter ces stats en PDF imprimable"
      style={{
        background: "linear-gradient(135deg, #185FA5, #134e87)",
        color: "#fff",
        border: "none",
        padding: "5px 12px",
        borderRadius: 8,
        fontSize: 11.5,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <i className="ti ti-file-download" /> PDF
    </button>
  );
}
