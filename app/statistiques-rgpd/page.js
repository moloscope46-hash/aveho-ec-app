"use client";
// =============================================================
//  Page Statistiques RGPD — Dashboard collectif RGPD pour DPO/managers
//  Alpha 0.30.0
//
//  Affiche les KPIs et graphiques pour le suivi RGPD de la collectivité :
//   - KPIs globaux (signés, refus, taux de refus, vérifications QR)
//   - Graphique mensuel signés vs refusés (12 mois glissants)
//   - Donut : répartition signés / refusés / archivés
//   - Bar chart : expirations à 30/60/90j + déjà expirés
//   - Tableau : performance par établissement
//   - Top finalités acceptées
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Modal } from "../ui";
import { KpiRow } from "../kpis";
import { BarChart, StackedBarChart, DonutChart, Gauge, TrendBadge, Heatmap } from "../Charts";
import { FINALITES } from "../../lib/rgpd";
import { logger } from "../../lib/logger";

export default function StatistiquesRgpd() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();

  const [global, setGlobal] = useState(null);
  const [parMois, setParMois] = useState([]);
  const [parEtab, setParEtab] = useState([]);
  const [expirations, setExpirations] = useState(null);
  const [finalites, setFinalites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportBusy, setExportBusy] = useState(false);
  // Alpha 0.40.0 : heatmap RGPD + renouvellements + finalités detail
  const [heatmapRgpd, setHeatmapRgpd] = useState([]);
  const [renouvellements, setRenouvellements] = useState(null);
  // Alpha 0.46.0 : calendrier signatures mois courant
  const [signaturesParJour, setSignaturesParJour] = useState({});
  const [moisCal, setMoisCal] = useState(new Date());
  const [finalitesDetail, setFinalitesDetail] = useState([]);
  // Alpha 0.41.0 : drill heatmap signatures
  const [drillRgpd, setDrillRgpd] = useState(null); // { jour_semaine, heure, jour_label, items, loading }

  async function load() {
    if (!auth.structureId) return;
    setLoading(true);
    const [gResp, mResp, eResp, expResp, fResp, hResp, rResp, fdResp] = await Promise.all([
      supabase.from("v_stats_rgpd_global").select("*").eq("structure_id", auth.structureId).maybeSingle(),
      supabase.from("v_stats_rgpd_par_mois").select("*").eq("structure_id", auth.structureId).order("mois_debut"),
      supabase.from("v_stats_rgpd_par_etab").select("*").eq("structure_id", auth.structureId),
      supabase.from("v_stats_rgpd_expirations").select("*").eq("structure_id", auth.structureId).maybeSingle(),
      supabase.from("v_stats_rgpd_finalites").select("*").eq("structure_id", auth.structureId).order("nb_acceptations", { ascending: false }),
      // Alpha 0.40.0 : 3 nouvelles vues
      supabase.from("v_stats_rgpd_heatmap").select("*").eq("structure_id", auth.structureId),
      supabase.from("v_stats_rgpd_renouvellements").select("*").eq("structure_id", auth.structureId).maybeSingle(),
      supabase.from("v_stats_rgpd_par_finalite").select("*").eq("structure_id", auth.structureId).order("nb_acceptations", { ascending: false }),
    ]);
    setGlobal(gResp.data);
    setParMois(mResp.data || []);
    setParEtab(eResp.data || []);
    setExpirations(expResp.data);
    setFinalites(fResp.data || []);
    setHeatmapRgpd(hResp.data || []);
    setRenouvellements(rResp.data || null);
    setFinalitesDetail(fdResp.data || []);
    setLoading(false);
  }

  useEffect(() => { if (auth.ready) load(); }, [auth.ready, auth.structureId]);

  // Alpha 0.46.0 : charger signatures du mois affiché
  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    const year = moisCal.getFullYear();
    const m = moisCal.getMonth();
    const debutISO = new Date(year, m, 1).toISOString();
    const finISO = new Date(year, m + 1, 1).toISOString();
    (async () => {
      try {
        const { data } = await supabase
          .from("consentements_rgpd")
          .select("date_signature, a_consenti")
          .eq("structure_id", auth.structureId)
          .gte("date_signature", debutISO)
          .lt("date_signature", finISO);
        // Group by day
        const map = {};
        (data || []).forEach((c) => {
          const day = c.date_signature?.slice(0, 10);
          if (!day) return;
          if (!map[day]) map[day] = { total: 0, oui: 0, non: 0 };
          map[day].total++;
          if (c.a_consenti) map[day].oui++;
          else map[day].non++;
        });
        setSignaturesParJour(map);
      } catch (e) {
        // 0.57.5 : try/catch englobant pour pas crasher la page
        logger.error("[StatistiquesRgpd] load failed:", e);
      }
    })();
  }, [auth.ready, auth.structureId, moisCal]);

  // Alpha 0.41.0 : drill heatmap RGPD
  async function openDrillRgpd(cell) {
    setDrillRgpd({ ...cell, loading: true, items: [] });
    try {
      const { data, error } = await supabase.rpc("get_rgpd_heatmap_drill", {
        p_structure_id: auth.structureId,
        p_jour_semaine: cell.jour_semaine,
        p_heure: cell.heure,
        p_limit: 50,
      });
      if (error) throw error;
      setDrillRgpd({ ...cell, loading: false, items: data || [] });
    } catch (e) {
      setDrillRgpd({ ...cell, loading: false, items: [], error: e.message });
    }
  }

  // ---------- Calculs dérivés ----------
  const tendance = global && global.signes_mois_dernier > 0
    ? Math.round(((global.signes_ce_mois - global.signes_mois_dernier) / global.signes_mois_dernier) * 100)
    : null;

  const donutData = global ? [
    { label: "Signés", value: global.actifs || 0, color: "#5aa05a" },
    { label: "Refus", value: global.refus || 0, color: "#c0392b" },
    { label: "Archivés", value: global.archives || 0, color: "#8a98a8" },
  ].filter(s => s.value > 0) : [];

  const expirationsData = expirations ? [
    { label: "30j", value: expirations.nb_30j || 0, color: "#EF9F27" },
    { label: "31-60j", value: expirations.nb_31_60j || 0, color: "#7CC8C8" },
    { label: "61-90j", value: expirations.nb_61_90j || 0, color: "#185FA5" },
    { label: "Expirés", value: expirations.nb_deja_expires || 0, color: "#c0392b" },
  ] : [];

  // Pour le top finalités : mappe les ids vers les libellés
  const finalitesAvecLabel = finalites.map((f) => {
    const def = FINALITES.find((x) => x.id === f.finalite_id);
    return {
      ...f,
      label: def?.libelle || f.finalite_id,
    };
  });

  // ---------- Export PDF ----------
  // Charge jsPDF dynamiquement depuis le CDN (même stratégie que lib/consentPdf.js)
  async function loadJsPdfFromCDN() {
    if (typeof window === "undefined") throw new Error("PDF : côté client uniquement");
    if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js";
      s.async = true;
      s.onload = () => resolve(window.jspdf.jsPDF);
      s.onerror = () => reject(new Error("Impossible de charger jsPDF depuis le CDN"));
      document.head.appendChild(s);
    });
  }

  async function exportPdf() {
    setExportBusy(true);
    try {
      const jsPDF = await loadJsPdfFromCDN();
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const today = new Date().toLocaleDateString("fr-FR");

      // ===== Header brandé =====
      doc.setFillColor(20, 33, 49); // navy
      doc.rect(0, 0, 210, 30, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("aveho", 14, 18);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Espace Collectivité — Statistiques RGPD", 14, 24);
      doc.setFontSize(9);
      doc.text(`Édité le ${today}`, 14, 28);

      // ===== Titre =====
      doc.setTextColor(20, 33, 49);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(auth.structureNom || "Collectivité", 14, 42);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(108, 122, 137);
      doc.text("Rapport mensuel de conformité RGPD", 14, 48);

      // ===== KPIs principaux =====
      let y = 60;
      doc.setTextColor(20, 33, 49);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Indicateurs clés", 14, y);
      y += 8;

      const kpis = [
        { label: "Consentements signés actifs", value: global?.actifs || 0 },
        { label: "Refus de consentement", value: global?.refus || 0 },
        { label: "Taux de refus", value: `${global?.taux_refus_pct || 0}%` },
        { label: "Signés ce mois-ci", value: global?.signes_ce_mois || 0 },
        { label: "Refus ce mois-ci", value: global?.refus_ce_mois || 0 },
        { label: "Total archivés", value: global?.archives || 0 },
        { label: "Vérifications QR", value: global?.nb_verifications || 0 },
        { label: "Vérifications valides", value: global?.nb_verifs_valides || 0 },
      ];

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      kpis.forEach((k, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const xCol = 14 + col * 95;
        const yRow = y + row * 10;
        doc.setTextColor(108, 122, 137);
        doc.text(k.label + " :", xCol, yRow);
        doc.setTextColor(20, 33, 49);
        doc.setFont("helvetica", "bold");
        doc.text(String(k.value), xCol + 70, yRow);
        doc.setFont("helvetica", "normal");
      });
      y += Math.ceil(kpis.length / 2) * 10 + 8;

      // ===== Évolution mensuelle =====
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20, 33, 49);
      doc.text("Évolution mensuelle (12 derniers mois)", 14, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(108, 122, 137);
      doc.text("Mois", 14, y);
      doc.text("Signés", 90, y);
      doc.text("Refus", 120, y);
      doc.text("Archivés", 150, y);
      y += 1;
      doc.setDrawColor(227, 233, 238);
      doc.line(14, y, 196, y);
      y += 4;

      doc.setTextColor(20, 33, 49);
      parMois.forEach((m) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(m.mois_label, 14, y);
        doc.text(String(m.nb_signes || 0), 90, y);
        doc.text(String(m.nb_refuses || 0), 120, y);
        doc.text(String(m.nb_archives || 0), 150, y);
        y += 5;
      });
      y += 6;

      // ===== Performance par établissement =====
      if (parEtab.length > 0) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text("Performance par établissement", 14, y);
        y += 6;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(108, 122, 137);
        doc.text("Établissement", 14, y);
        doc.text("Signés", 90, y);
        doc.text("Refus", 115, y);
        doc.text("Archivés", 140, y);
        doc.text("À renouv.", 165, y);
        doc.text("Expirés", 188, y);
        y += 1;
        doc.line(14, y, 196, y);
        y += 4;

        doc.setTextColor(20, 33, 49);
        parEtab.forEach((e) => {
          if (y > 270) { doc.addPage(); y = 20; }
          const nom = (e.etablissement_nom || "—").slice(0, 35);
          doc.text(nom, 14, y);
          doc.text(String(e.nb_signes || 0), 90, y);
          doc.text(String(e.nb_refuses || 0), 115, y);
          doc.text(String(e.nb_archives || 0), 140, y);
          doc.text(String(e.nb_a_renouveler_30j || 0), 165, y);
          doc.text(String(e.nb_expires || 0), 188, y);
          y += 5;
        });
        y += 6;
      }

      // ===== Expirations à venir =====
      if (expirations) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(20, 33, 49);
        doc.text("Expirations à venir", 14, y);
        y += 8;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const expLines = [
          { label: "Dans 30 jours", value: expirations.nb_30j || 0, alert: true },
          { label: "Dans 31-60 jours", value: expirations.nb_31_60j || 0 },
          { label: "Dans 61-90 jours", value: expirations.nb_61_90j || 0 },
          { label: "Déjà expirés", value: expirations.nb_deja_expires || 0, alert: true },
        ];
        expLines.forEach((l) => {
          if (l.alert) doc.setTextColor(192, 57, 43);
          else doc.setTextColor(20, 33, 49);
          doc.text(`${l.label} :`, 14, y);
          doc.setFont("helvetica", "bold");
          doc.text(String(l.value), 60, y);
          doc.setFont("helvetica", "normal");
          y += 6;
        });
      }

      // ===== Footer =====
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(138, 152, 168);
        doc.text(
          `Aveho EC — Rapport RGPD ${auth.structureNom || ""} — Page ${i}/${pageCount}`,
          14, 290
        );
        doc.text(`Édité le ${today}`, 196, 290, { align: "right" });
      }

      // Téléchargement
      const slug = (auth.structureNom || "structure")
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const isoDate = new Date().toISOString().slice(0, 10);
      doc.save(`rapport-rgpd-${slug}-${isoDate}.pdf`);
    } catch (e) {
      alert("Erreur lors de l'export PDF : " + (e.message || "inconnue"));
    } finally {
      setExportBusy(false);
    }
  }

  if (!auth.ready) return null;

  // Restriction : admin uniquement
  const peutVoir = auth.can?.("gerer_roles") || auth.can?.("manage_collectivite") || auth.role?.systeme === "admin" || auth.role?.nom === "Administrateur";

  if (!peutVoir) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap">
          <Panel><StateMsg><i className="ti ti-shield-x" /> Cette page est réservée aux administrateurs.</StateMsg></Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead 
          eyebrow="CONFORMITÉ · DASHBOARD" 
          icon="ti-shield-check" 
          title="Statistiques" 
          accent="RGPD"
          sub="Indicateurs et tendances pour le DPO et la direction" 
        />

        {/* Bouton export */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14, gap: 8 }}>
          <button
            onClick={exportPdf}
            disabled={exportBusy || loading}
            style={{
              padding: "8px 16px", borderRadius: 8,
              border: "1px solid #5aa05a",
              background: exportBusy ? "#ccc" : "#fff",
              color: "#2e6f33",
              cursor: exportBusy ? "wait" : "pointer",
              fontFamily: "inherit", fontSize: 13, fontWeight: 600,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            <i className="ti ti-file-text" /> {exportBusy ? "Génération…" : "Export PDF"}
          </button>
        </div>

        {loading ? <Panel><StateMsg>Chargement des statistiques…</StateMsg></Panel> : (
          <>
            {/* KPIs */}
            <KpiRow tiles={[
              { label: "Consentements actifs", value: global?.actifs || 0, icon: "ti-shield-check", color: "#5aa05a" },
              { label: "Refus", value: global?.refus || 0, icon: "ti-shield-x", color: "#c0392b" },
              { label: "Taux de refus", value: `${global?.taux_refus_pct || 0}%`, icon: "ti-chart-pie", color: "#EF9F27" },
              { label: "Signés ce mois", value: global?.signes_ce_mois || 0, icon: "ti-calendar-event", color: "#185FA5" },
              { label: "Archivés", value: global?.archives || 0, icon: "ti-archive", color: "#8a98a8" },
              { label: "Vérifications QR", value: global?.nb_verifications || 0, icon: "ti-shield-search", color: "#7a6fb0" },
            ]} />

            {/* Tendance mois en cours */}
            {tendance !== null && (
              <Panel style={{ marginBottom: 18, borderLeft: "4px solid #185FA5" }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#142131" }}>
                  <i className="ti ti-trending-up" style={{ color: "#185FA5", marginRight: 6 }} />
                  Tendance ce mois
                </h3>
                <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#8a98a8", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700 }}>Ce mois</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "#142131", lineHeight: 1 }}>{global.signes_ce_mois}</div>
                    <div style={{ fontSize: 11.5, color: "#6c7a89" }}>signature{global.signes_ce_mois > 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ borderLeft: "1px solid #e3e9ee", height: 56, margin: "0 8px" }} />
                  <div>
                    <div style={{ fontSize: 11, color: "#8a98a8", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700 }}>Mois dernier</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: "#6c7a89", lineHeight: 1 }}>{global.signes_mois_dernier}</div>
                    <div style={{ fontSize: 11.5, color: "#8a98a8" }}>signature{global.signes_mois_dernier > 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <TrendBadge current={global.signes_ce_mois} previous={global.signes_mois_dernier} size="md" />
                  </div>
                </div>
              </Panel>
            )}

            {/* Graphique : évolution mensuelle */}
            <Panel style={{ marginBottom: 18 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#142131" }}>
                <i className="ti ti-chart-bar" style={{ color: "#185FA5", marginRight: 6 }} />
                Évolution mensuelle (12 mois)
              </h3>
              {parMois.length === 0 ? (
                <p style={{ color: "#8a98a8", fontSize: 13 }}>Pas encore de données disponibles.</p>
              ) : (
                <StackedBarChart
                  data={parMois.map((m) => ({
                    label: m.mois_label?.slice(0, 3) || "",
                    nb_signes: m.nb_signes,
                    nb_refuses: m.nb_refuses,
                  }))}
                  series={[
                    { key: "nb_signes", label: "Signés", color: "#5aa05a" },
                    { key: "nb_refuses", label: "Refus", color: "#c0392b" },
                  ]}
                  height={220}
                />
              )}
            </Panel>

            {/* Alpha 0.40.0 : Heatmap des signatures RGPD */}
            <Panel style={{ marginBottom: 18 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#142131" }}>
                <i className="ti ti-grid-pattern" style={{ color: "#5aa05a", marginRight: 6 }} />
                Heatmap des signatures (90 derniers jours)
              </h3>
              {heatmapRgpd.length === 0 ? (
                <p style={{ color: "#8a98a8", fontSize: 13 }}>Pas encore assez de données pour la heatmap.</p>
              ) : (
                <>
                  <Heatmap data={heatmapRgpd.map(h => ({ jour_semaine: h.jour_semaine, heure: h.heure, nb_actions: h.nb_signatures }))} color="#5aa05a" onCellClick={openDrillRgpd} />
                  <p style={{ fontSize: 11.5, color: "#8a98a8", marginTop: 10, marginBottom: 0 }}>
                    <i className="ti ti-click" /> <b>Clique sur une cellule colorée</b> pour voir le détail des signatures de ce créneau.
                  </p>
                </>
              )}
            </Panel>

            {/* Alpha 0.40.0 : Alertes renouvellements à venir */}
            {renouvellements && (renouvellements.expires > 0 || renouvellements.expire_dans_30j > 0) && (
              <Panel style={{ marginBottom: 18, borderLeft: "4px solid #EF9F27" }}>
                <h3 style={{ margin: "0 0 14px", fontSize: 16, color: "#142131" }}>
                  <i className="ti ti-alert-circle" style={{ color: "#EF9F27", marginRight: 6 }} />
                  Renouvellements à prévoir
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                  <RenouvCard label="Expirés" value={renouvellements.expires} color="#c0392b" urgent />
                  <RenouvCard label="Dans 7 jours" value={renouvellements.expire_dans_7j} color="#EF9F27" urgent={renouvellements.expire_dans_7j > 0} />
                  <RenouvCard label="Dans 15 jours" value={renouvellements.expire_dans_15j} color="#EF9F27" />
                  <RenouvCard label="Dans 30 jours" value={renouvellements.expire_dans_30j} color="#185FA5" />
                </div>
                <p style={{ fontSize: 11.5, color: "#8a98a8", marginTop: 12, marginBottom: 0 }}>
                  <i className="ti ti-clock" /> Basé sur un renouvellement annuel (365 jours après la date de signature initiale).
                </p>
              </Panel>
            )}

            {/* Alpha 0.40.0 : Détail par finalité */}
            {finalitesDetail.length > 0 && (
              <Panel style={{ marginBottom: 18 }}>
                <h3 style={{ margin: "0 0 14px", fontSize: 16, color: "#142131" }}>
                  <i className="ti ti-target" style={{ color: "#7a6fb0", marginRight: 6 }} />
                  Acceptation par finalité
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {finalitesDetail.slice(0, 10).map((f, i) => {
                    const max = finalitesDetail[0]?.nb_acceptations || 1;
                    const pct = (f.nb_acceptations / max) * 100;
                    return (
                      <div key={i} style={{ background: "#fff", border: "1px solid #e3e9ee", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, fontSize: 13 }}>
                          <span style={{ fontWeight: 600, color: "#142131" }}>{f.finalite}</span>
                          <span style={{ fontSize: 12, color: "#6c7a89" }}>
                            <b style={{ color: "#142131", fontSize: 14 }}>{f.nb_acceptations}</b>
                            {f.nb_ce_mois > 0 && <span style={{ color: "#5aa05a", marginLeft: 8 }}>+{f.nb_ce_mois} ce mois</span>}
                          </span>
                        </div>
                        <div style={{ height: 6, background: "#f4f7fa", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #7a6fb0, #5aa05a)", transition: "width .3s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            )}

            {/* Donut + Gauge */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 14, marginBottom: 18 }}>
              <Panel>
                <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#142131" }}>
                  <i className="ti ti-chart-donut" style={{ color: "#7CC8C8", marginRight: 6 }} />
                  Répartition globale
                </h3>
                <DonutChart segments={donutData} size={180} />
              </Panel>
              <Panel>
                <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#142131" }}>
                  <i className="ti ti-target" style={{ color: "#EF9F27", marginRight: 6 }} />
                  Indicateurs qualité
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Gauge value={global?.taux_refus_pct || 0} max={100} label="Taux de refus" color={global?.taux_refus_pct > 20 ? "#c0392b" : "#5aa05a"} />
                  {global?.nb_verifications > 0 && (
                    <Gauge
                      value={Math.round((global.nb_verifs_valides / global.nb_verifications) * 100)}
                      max={100}
                      label="Vérifications QR valides"
                      color="#185FA5"
                    />
                  )}
                  <div style={{ fontSize: 12, color: "#8a98a8", marginTop: 4 }}>
                    <i className="ti ti-info-circle" /> Un taux de refus &lt; 10% est habituel pour le secteur santé à domicile.
                  </div>
                </div>
              </Panel>
            </div>

            {/* Expirations */}
            <Panel style={{ marginBottom: 18 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#142131" }}>
                <i className="ti ti-clock-exclamation" style={{ color: "#EF9F27", marginRight: 6 }} />
                Expirations à venir
              </h3>
              <BarChart data={expirationsData} height={180} />
              {expirations?.nb_deja_expires > 0 && (
                <div style={{ marginTop: 14, padding: 12, background: "#fef0ee", border: "1px solid #f0c4be", borderRadius: 8, fontSize: 13, color: "#7a1f15" }}>
                  <b><i className="ti ti-alert-triangle" /> Attention :</b> {expirations.nb_deja_expires} consentement{expirations.nb_deja_expires > 1 ? "s ont" : " a"} dépassé leur date d'expiration. À renouveler ou archiver.
                </div>
              )}
            </Panel>

            {/* Tableau par établissement */}
            {parEtab.length > 0 && (
              <Panel style={{ marginBottom: 18 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#142131" }}>
                  <i className="ti ti-building-hospital" style={{ color: "#185FA5", marginRight: 6 }} />
                  Performance par établissement
                </h3>
                <table>
                  <thead>
                    <tr>
                      <th>Établissement</th>
                      <th style={{ textAlign: "right" }}>Signés</th>
                      <th style={{ textAlign: "right" }}>Refus</th>
                      <th style={{ textAlign: "right" }}>Archivés</th>
                      <th style={{ textAlign: "right" }}>À renouveler 30j</th>
                      <th style={{ textAlign: "right" }}>Expirés</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parEtab.map((e, i) => (
                      <tr key={i}>
                        <td><b>{e.etablissement_nom || "—"}</b></td>
                        <td style={{ textAlign: "right", color: "#5aa05a", fontWeight: 600 }}>{e.nb_signes}</td>
                        <td style={{ textAlign: "right", color: "#c0392b" }}>{e.nb_refuses}</td>
                        <td style={{ textAlign: "right", color: "#8a98a8" }}>{e.nb_archives}</td>
                        <td style={{ textAlign: "right", color: e.nb_a_renouveler_30j > 0 ? "#EF9F27" : "#6c7a89", fontWeight: e.nb_a_renouveler_30j > 0 ? 600 : 400 }}>
                          {e.nb_a_renouveler_30j}
                        </td>
                        <td style={{ textAlign: "right", color: e.nb_expires > 0 ? "#c0392b" : "#6c7a89", fontWeight: e.nb_expires > 0 ? 600 : 400 }}>
                          {e.nb_expires}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            )}

            {/* Top finalités */}
            {finalitesAvecLabel.length > 0 && (
              <Panel>
                <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#142131" }}>
                  <i className="ti ti-list-check" style={{ color: "#5aa05a", marginRight: 6 }} />
                  Finalités acceptées (top {Math.min(finalitesAvecLabel.length, 10)})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {finalitesAvecLabel.slice(0, 10).map((f, i) => {
                    const maxNb = finalitesAvecLabel[0]?.nb_acceptations || 1;
                    return (
                      <Gauge
                        key={f.finalite_id}
                        value={f.nb_acceptations}
                        max={maxNb}
                        label={f.label}
                        color="#5aa05a"
                        suffix=""
                      />
                    );
                  })}
                </div>
              </Panel>
            )}
          </>
        )}

        {/* Alpha 0.41.0 : modale drill heatmap RGPD */}
        {drillRgpd && (
          <Modal
            open={true}
            title={`${drillRgpd.jour_label || "Créneau"} ${drillRgpd.heure}h — ${drillRgpd.nb_actions || 0} signature${(drillRgpd.nb_actions || 0) > 1 ? "s" : ""}`}
            onClose={() => setDrillRgpd(null)}
            size="lg"
          >
            {drillRgpd.loading ? (
              <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>
                <i className="ti ti-loader-2" style={{ fontSize: 28, animation: "aveho-spin 1s linear infinite" }} />
                <p style={{ marginTop: 10, fontSize: 13 }}>Chargement…</p>
              </div>
            ) : drillRgpd.error ? (
              <div style={{ padding: 20, background: "#fef0ee", borderRadius: 8, color: "#c0392b", fontSize: 13 }}>
                <i className="ti ti-alert-triangle" /> {drillRgpd.error}
              </div>
            ) : drillRgpd.items.length === 0 ? (
              <p style={{ color: "#8a98a8", fontSize: 13 }}>Aucune signature sur ce créneau (sur les 90 derniers jours).</p>
            ) : (
              <>
                <p style={{ fontSize: 12, color: "#6c7a89", marginTop: 0, marginBottom: 14 }}>
                  <i className="ti ti-info-circle" /> Liste des {drillRgpd.items.length} dernières signatures sur ce créneau horaire (agrégées sur 90 jours, tous les jours de semaine identiques).
                </p>
                <div style={{ maxHeight: 480, overflowY: "auto", borderRadius: 8, border: "1px solid #e3e9ee" }}>
                  <table style={{ fontSize: 12.5 }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Patient</th>
                        <th>Finalités</th>
                        <th>Version</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drillRgpd.items.map((it) => (
                        <tr key={it.id}>
                          <td style={{ fontSize: 11.5, color: "#6c7a89", whiteSpace: "nowrap" }}>{it.jour_label}</td>
                          <td style={{ fontSize: 12, color: "#142131", fontWeight: 600 }}>{it.patient_nom_prenom}</td>
                          <td style={{ fontSize: 10.5, color: "#5aa05a" }}>
                            {(it.finalites_acceptees || []).length} finalité{(it.finalites_acceptees || []).length > 1 ? "s" : ""}
                          </td>
                          <td style={{ fontSize: 11, color: "#8a98a8" }}>v{it.version_template || "1.0"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Modal>
        )}

        {/* Alpha 0.46.0 : Calendrier signatures du mois */}
        <Panel style={{ marginTop: 18 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 16, color: "#142131" }}>
            <i className="ti ti-calendar" style={{ color: "#7a6fb0", marginRight: 6 }} />
            Calendrier des signatures
          </h3>
          <CalendrierSignatures
            signaturesParJour={signaturesParJour}
            mois={moisCal}
            setMois={setMoisCal}
          />
        </Panel>
      </div>
    </div>
  );
}

// Alpha 0.46.0 : composant calendrier mensuel signatures RGPD
const MOIS_CAL = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const JOURS_CAL = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function CalendrierSignatures({ signaturesParJour, mois, setMois }) {
  const year = mois.getFullYear();
  const m = mois.getMonth();
  const firstDay = new Date(year, m, 1);
  const lastDay = new Date(year, m + 1, 0);
  const offset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMonth = lastDay.getDate();
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
  const today = new Date().toISOString().slice(0, 10);

  function intensity(total) {
    if (!total) return 0;
    if (total >= 10) return 4;
    if (total >= 5) return 3;
    if (total >= 2) return 2;
    return 1;
  }
  const palette = [null, "#e8f5e6", "#bfe2bf", "#8fcc8f", "#5aa05a"];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button onClick={() => setMois(new Date(year, m - 1, 1))} style={{ padding: "6px 12px", border: "1px solid #e3e9ee", borderRadius: 6, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }} aria-label="Mois précédent">
          <i className="ti ti-chevron-left" /> Précédent
        </button>
        <h4 style={{ margin: 0, fontSize: 16, color: "#142131", fontWeight: 700 }}>
          {MOIS_CAL[m]} {year}
        </h4>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setMois(new Date())} style={{ padding: "6px 12px", border: "1px solid #185FA5", borderRadius: 6, background: "#fff", color: "#185FA5", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }} aria-label="Mois actuel">
            Aujourd'hui
          </button>
          <button onClick={() => setMois(new Date(year, m + 1, 1))} style={{ padding: "6px 12px", border: "1px solid #e3e9ee", borderRadius: 6, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }} aria-label="Mois suivant">
            Suivant <i className="ti ti-chevron-right" />
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {JOURS_CAL.map((j) => (
          <div key={j} style={{ padding: "6px 4px", textAlign: "center", fontWeight: 700, color: "#6c7a89", fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".4px", background: "#f4f7fa", borderRadius: 6 }}>
            {j}
          </div>
        ))}
        {Array.from({ length: totalCells }).map((_, i) => {
          const dayNum = i - offset + 1;
          const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
          const dateISO = inMonth ? `${year}-${String(m + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}` : null;
          const data = dateISO ? signaturesParJour[dateISO] : null;
          const isToday = dateISO === today;
          const inten = intensity(data?.total);
          return (
            <div
              key={i}
              title={data ? `${data.total} signature${data.total > 1 ? "s" : ""} le ${dateISO} (✓ ${data.oui} · ✗ ${data.non})` : ""}
              style={{
                minHeight: 56,
                padding: 6,
                background: !inMonth ? "#fafbfc" : (palette[inten] || "#fff"),
                border: isToday ? "2px solid #185FA5" : "1px solid #e3e9ee",
                borderRadius: 6,
                opacity: !inMonth ? 0.4 : 1,
                display: "flex", flexDirection: "column",
              }}
            >
              {inMonth && (
                <>
                  <div style={{ fontSize: 11, color: isToday ? "#185FA5" : "#6c7a89", fontWeight: isToday ? 700 : 500 }}>
                    {dayNum}
                  </div>
                  {data && (
                    <div style={{ marginTop: "auto", textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#2e6f33", lineHeight: 1 }}>{data.total}</div>
                      {data.non > 0 && (
                        <div style={{ fontSize: 9, color: "#c0392b", marginTop: 2 }}>
                          ✗{data.non}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6c7a89" }}>
        <span>Moins</span>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} style={{ width: 14, height: 14, background: palette[i], borderRadius: 3, border: "1px solid #e3e9ee" }} />
        ))}
        <span>Plus</span>
      </div>
    </div>
  );
}

// Alpha 0.40.0 : helper carte renouvellement
function RenouvCard({ label, value, color, urgent = false }) {
  return (
    <div style={{
      background: urgent && value > 0 ? color + "15" : "#fff",
      border: `1px solid ${urgent && value > 0 ? color + "44" : "#e3e9ee"}`,
      borderRadius: 10, padding: "12px 14px",
    }}>
      <div style={{ fontSize: 11, color: "#6c7a89", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: value > 0 ? color : "#8a98a8", lineHeight: 1 }}>
        {value || 0}
      </div>
      <div style={{ fontSize: 10.5, color: "#8a98a8", marginTop: 2 }}>
        consentement{value > 1 ? "s" : ""}
      </div>
    </div>
  );
}
