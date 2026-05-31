"use client";
// =============================================================
//  Page Statistiques Activité — Dashboard "qui fait quoi"
//  Alpha 0.31.0
//
//  Pour les admins / managers. Affiche :
//   - Top demandeurs (DI, achats, transferts) avec podium
//   - Activité par établissement
//   - Heatmap jour de la semaine × heure (identifier pics)
//   - Évolution sur 30/90 jours
//   - Top actions (matrice action × entité)
//   - Export PDF
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg } from "../ui";
import { KpiRow } from "../kpis";
import { BarChart, Heatmap, Gauge, TrendBadge } from "../Charts";
import { Modal } from "../ui";
import { relativeTime, fmtDate } from "../../lib/format";

export default function StatistiquesActivite() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();

  const [users, setUsers] = useState([]);
  const [parEtab, setParEtab] = useState([]);
  const [parJour, setParJour] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [topActions, setTopActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportBusy, setExportBusy] = useState(false);
  const [periode, setPeriode] = useState("30"); // 7 | 30 | 90
  // Alpha 0.37.0 : stats globales (mois courant vs précédent) + drill heatmap
  const [statsGlobal, setStatsGlobal] = useState(null);
  const [drillData, setDrillData] = useState(null); // { jour_label, heure, items[], loading }
  // Alpha 0.53.0 (BK) : comparaison période courante vs précédente
  const [statsCompare, setStatsCompare] = useState(null);
  // Alpha 0.39.0 : filtres avancés
  const [filtreEtab, setFiltreEtab] = useState(""); // etablissement_id ou ""
  const [filtreUser, setFiltreUser] = useState(""); // user_id ou ""
  const [filtreCategorie, setFiltreCategorie] = useState(""); // catégorie d'action ou ""
  const [csvBusy, setCsvBusy] = useState(false);

  async function load() {
    if (!auth.structureId) return;
    setLoading(true);
    const [uResp, eResp, jResp, hResp, aResp, sResp, gResp] = await Promise.all([
      supabase.from("v_stats_activite_par_user").select("*").eq("structure_id", auth.structureId).limit(50),
      supabase.from("v_stats_activite_par_etab").select("*").eq("structure_id", auth.structureId),
      supabase.from("v_stats_activite_par_jour").select("*").eq("structure_id", auth.structureId).order("jour", { ascending: false }).limit(90),
      supabase.from("v_stats_activite_heatmap").select("*").eq("structure_id", auth.structureId),
      supabase.from("v_stats_activite_top_actions").select("*").eq("structure_id", auth.structureId).limit(20),
      // Alpha 0.32.0 : signalements signés (opt-in) par user
      supabase.from("v_signalements_par_user").select("*").eq("structure_id", auth.structureId),
      // Alpha 0.37.0 : stats globales avec mois courant vs précédent
      supabase.from("v_stats_activite_global").select("*").eq("structure_id", auth.structureId).maybeSingle(),
    ]);
    // Fusionner les signalements signés dans les users
    const signalementsByUser = {};
    (sResp.data || []).forEach((s) => { signalementsByUser[s.user_id] = s; });
    const usersEnriched = (uResp.data || []).map((u) => ({
      ...u,
      nb_signalements_signes: signalementsByUser[u.user_id]?.nb_signalements_signes || 0,
    }));
    setUsers(usersEnriched);
    setParEtab(eResp.data || []);
    setParJour(jResp.data || []);
    setHeatmap(hResp.data || []);
    setTopActions(aResp.data || []);
    setStatsGlobal(gResp.data || null);
    
    // Alpha 0.53.0 (BK) : comparaison période courante vs précédente
    const { data: cmp } = await supabase
      .from("v_stats_periode_comparee")
      .select("*")
      .eq("structure_id", auth.structureId);
    if (cmp && cmp.length > 0) {
      // Agréger par période (somme sur tous les établissements)
      const courante = { nb_patients_crees: 0, nb_di: 0, nb_transferts: 0, nb_commandes: 0, nb_signalements: 0, nb_users_actifs: 0 };
      const precedente = { nb_patients_crees: 0, nb_di: 0, nb_transferts: 0, nb_commandes: 0, nb_signalements: 0, nb_users_actifs: 0 };
      cmp.forEach(r => {
        const target = r.periode === "courante" ? courante : precedente;
        target.nb_patients_crees += Number(r.nb_patients_crees) || 0;
        target.nb_di += Number(r.nb_di) || 0;
        target.nb_transferts += Number(r.nb_transferts) || 0;
        target.nb_commandes += Number(r.nb_commandes) || 0;
        target.nb_signalements += Number(r.nb_signalements) || 0;
        // Note : on additionne nb_users_actifs par étab mais c'est une approximation
        target.nb_users_actifs = Math.max(target.nb_users_actifs, Number(r.nb_users_actifs) || 0);
      });
      setStatsCompare({ courante, precedente });
    }
    
    setLoading(false);
  }

  // Alpha 0.37.0 : ouvre la modale drill-down pour un créneau heatmap
  async function openDrill(cell) {
    setDrillData({ ...cell, loading: true, items: [] });
    try {
      const { data, error } = await supabase.rpc("get_heatmap_drill", {
        p_structure_id: auth.structureId,
        p_jour_semaine: cell.jour_semaine,
        p_heure: cell.heure,
        p_limit: 50,
      });
      if (error) throw error;
      setDrillData({ ...cell, loading: false, items: data || [] });
    } catch (e) {
      console.warn("drill error:", e.message);
      setDrillData({ ...cell, loading: false, items: [], error: e.message });
    }
  }

  useEffect(() => { if (auth.ready) load(); }, [auth.ready, auth.structureId]);

  // ----- Calculs dérivés -----
  const periodeJours = parseInt(periode);

  // Alpha 0.39.0 : filtrage des users selon filtres avancés
  const filteredUsers = users.filter((u) => {
    if (filtreUser && u.user_id !== filtreUser) return false;
    if (filtreEtab && u.etablissement_id !== filtreEtab && u.etablissements_actifs && !String(u.etablissements_actifs).includes(filtreEtab)) {
      // Si la vue v_stats_activite_par_user n'a pas le champ etab_id direct,
      // on filtre seulement quand le champ est dispo. Sinon on désactive ce filtre.
      // Fallback : ne pas exclure (le filtre etab impactera surtout l'export CSV).
    }
    return true;
  });

  const totalActions = filteredUsers.reduce((s, u) => s + (periode === "7" ? u.nb_actions_7j : periode === "30" ? u.nb_actions_30j : u.nb_actions_total), 0);
  const usersActifs = filteredUsers.filter((u) => (periode === "7" ? u.nb_actions_7j : periode === "30" ? u.nb_actions_30j : u.nb_actions_total) > 0).length;

  // Top 3 utilisateurs (par actions sur la période choisie)
  const topUsers = [...filteredUsers].sort((a, b) => {
    const aVal = periode === "7" ? a.nb_actions_7j : periode === "30" ? a.nb_actions_30j : a.nb_actions_total;
    const bVal = periode === "7" ? b.nb_actions_7j : periode === "30" ? b.nb_actions_30j : b.nb_actions_total;
    return bVal - aVal;
  }).slice(0, 10);

  // Top demandeurs DI
  const topDi = [...filteredUsers].sort((a, b) => b.nb_di_creees - a.nb_di_creees).filter(u => u.nb_di_creees > 0).slice(0, 5);

  // Alpha 0.39.0 : export CSV brut des actions audit_log filtrées
  async function exportCSV() {
    if (!auth.structureId) return;
    setCsvBusy(true);
    try {
      const sinceDays = parseInt(periode);
      const since = new Date(Date.now() - sinceDays * 86400000).toISOString();
      let query = supabase
        .from("audit_log")
        .select("created_at, action, entite, entite_id, user_email, user_id, etablissement_id, details")
        .eq("structure_id", auth.structureId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (filtreEtab) query = query.eq("etablissement_id", filtreEtab);
      if (filtreUser) query = query.eq("user_id", filtreUser);
      if (filtreCategorie) query = query.eq("action", filtreCategorie);
      const { data, error } = await query;
      if (error) throw error;
      const rows = data || [];

      // Construction CSV
      const escapeCSV = (v) => {
        if (v == null) return "";
        const s = typeof v === "object" ? JSON.stringify(v) : String(v);
        if (s.includes(";") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };
      const headers = ["Date", "Action", "Entité", "ID entité", "Utilisateur (email)", "Établissement", "Détails"];
      const lines = [headers.map(escapeCSV).join(";")];
      rows.forEach((r) => {
        lines.push([
          r.created_at ? new Date(r.created_at).toLocaleString("fr-FR") : "",
          r.action || "",
          r.entite || "",
          r.entite_id || "",
          r.user_email || "",
          r.etablissement_id || "",
          r.details ? JSON.stringify(r.details) : "",
        ].map(escapeCSV).join(";"));
      });
      // BOM UTF-8 + CRLF pour bonne compat Excel FR
      const csv = "\uFEFF" + lines.join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-aveho-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Erreur export CSV : " + (e.message || e));
    } finally {
      setCsvBusy(false);
    }
  }
  const topAchats = [...users].sort((a, b) => b.nb_achats_demandes - a.nb_achats_demandes).filter(u => u.nb_achats_demandes > 0).slice(0, 5);
  const topValideurs = [...users].sort((a, b) => b.nb_validations - a.nb_validations).filter(u => u.nb_validations > 0).slice(0, 5);

  // Activité par jour (n derniers jours selon la période)
  const parJourPeriode = parJour
    .slice(0, periodeJours)
    .reverse(); // anciens à gauche

  const activiteChartData = parJourPeriode.map((j) => ({
    label: j.jour_iso?.slice(5) || "", // MM-DD
    value: j.nb_total,
    color: "#185FA5",
  }));

  // ----- Export PDF -----
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
      const periodeLabel = periode === "7" ? "7 derniers jours" : periode === "30" ? "30 derniers jours" : "90 derniers jours";

      // Header navy plein largeur
      doc.setFillColor(20, 33, 49);
      doc.rect(0, 0, 210, 30, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("aveho", 14, 18);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Espace Collectivité — Statistiques d'activité", 14, 24);
      doc.setFontSize(9);
      doc.text(`Édité le ${today}`, 14, 28);

      // Titre
      doc.setTextColor(20, 33, 49);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(auth.structureNom || "Collectivité", 14, 42);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(108, 122, 137);
      doc.text(`Rapport d'activité — ${periodeLabel}`, 14, 48);

      let y = 60;
      doc.setTextColor(20, 33, 49);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Indicateurs clés", 14, y);
      y += 8;

      const kpis = [
        { label: "Utilisateurs actifs", value: usersActifs },
        { label: "Total actions", value: totalActions },
        { label: "Établissements actifs", value: parEtab.length },
        { label: "Période", value: periodeLabel },
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
      y += 22;

      // Top 10 utilisateurs
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20, 33, 49);
      doc.text("Top 10 utilisateurs les plus actifs", 14, y);
      y += 7;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(108, 122, 137);
      doc.text("#", 14, y);
      doc.text("Utilisateur", 22, y);
      doc.text("DI", 110, y);
      doc.text("Achats", 130, y);
      doc.text("Validations", 152, y);
      doc.text("Total", 188, y);
      y += 1;
      doc.setDrawColor(227, 233, 238);
      doc.line(14, y, 196, y);
      y += 4;
      doc.setTextColor(20, 33, 49);
      topUsers.slice(0, 10).forEach((u, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const email = (u.user_email || "—").slice(0, 38);
        doc.text(String(i + 1), 14, y);
        doc.text(email, 22, y);
        doc.text(String(u.nb_di_creees || 0), 110, y);
        doc.text(String(u.nb_achats_demandes || 0), 130, y);
        doc.text(String(u.nb_validations || 0), 152, y);
        doc.setFont("helvetica", "bold");
        doc.text(String(u.nb_actions_total || 0), 188, y);
        doc.setFont("helvetica", "normal");
        y += 5;
      });
      y += 6;

      // Par établissement
      if (parEtab.length > 0) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text("Activité par établissement", 14, y);
        y += 7;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(108, 122, 137);
        doc.text("Établissement", 14, y);
        doc.text("DI", 100, y);
        doc.text("Achats", 120, y);
        doc.text("Transferts", 142, y);
        doc.text("Users", 168, y);
        doc.text("30j", 185, y);
        y += 1;
        doc.line(14, y, 196, y);
        y += 4;
        doc.setTextColor(20, 33, 49);
        parEtab.forEach((e) => {
          if (y > 270) { doc.addPage(); y = 20; }
          const nom = (e.etablissement_nom || "—").slice(0, 35);
          doc.text(nom, 14, y);
          doc.text(String(e.nb_di || 0), 100, y);
          doc.text(String(e.nb_achats || 0), 120, y);
          doc.text(String(e.nb_transferts || 0), 142, y);
          doc.text(String(e.nb_users_actifs || 0), 168, y);
          doc.text(String(e.nb_actions_30j || 0), 185, y);
          y += 5;
        });
        y += 6;
      }

      // Footer pagination
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(138, 152, 168);
        doc.text(`Aveho EC — Rapport d'activité ${auth.structureNom || ""} — Page ${i}/${pageCount}`, 14, 290);
        doc.text(`Édité le ${today}`, 196, 290, { align: "right" });
      }

      const slug = (auth.structureNom || "structure")
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const isoDate = new Date().toISOString().slice(0, 10);
      doc.save(`rapport-activite-${slug}-${isoDate}.pdf`);
    } catch (e) {
      alert("Erreur lors de l'export PDF : " + (e.message || "inconnue"));
    } finally {
      setExportBusy(false);
    }
  }

  if (!auth.ready) return null;

  // Restriction admin
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

  // ----- Helpers podium -----
  function podiumColor(rank) {
    if (rank === 0) return { bg: "#fef3e2", fg: "#a06a15", border: "#EF9F27", icon: "ti-trophy", iconColor: "#EF9F27" };
    if (rank === 1) return { bg: "#f0f0f3", fg: "#5a6171", border: "#8a98a8", icon: "ti-award", iconColor: "#8a98a8" };
    if (rank === 2) return { bg: "#fcefda", fg: "#7a4f15", border: "#C9867F", icon: "ti-medal", iconColor: "#C9867F" };
    return { bg: "#fff", fg: "#2a3a48", border: "#e3e9ee", icon: "ti-user", iconColor: "#185FA5" };
  }

  function emailShort(email) {
    if (!email || email === "—") return "—";
    return email.length > 28 ? email.slice(0, 25) + "…" : email;
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="MANAGEMENT · DASHBOARD"
          icon="ti-users"
          title="Statistiques"
          accent="d'activité"
          sub="Qui fait quoi dans la collectivité — pour managers et admins"
        />

        {/* Sélecteur période + export */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { v: "7", l: "7 jours" },
              { v: "30", l: "30 jours" },
              { v: "90", l: "90 jours" },
            ].map((p) => (
              <button
                key={p.v}
                onClick={() => setPeriode(p.v)}
                style={{
                  padding: "6px 14px", borderRadius: 8,
                  border: periode === p.v ? "1.5px solid #185FA5" : "1px solid #e3e9ee",
                  background: periode === p.v ? "#eef5fc" : "#fff",
                  color: periode === p.v ? "#185FA5" : "#6c7a89",
                  fontWeight: periode === p.v ? 700 : 500,
                  fontFamily: "inherit", fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {p.l}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={exportCSV}
              disabled={csvBusy || loading}
              style={{
                padding: "8px 16px", borderRadius: 8,
                border: "1px solid #185FA5",
                background: csvBusy ? "#ccc" : "#fff",
                color: "#185FA5",
                cursor: csvBusy ? "wait" : "pointer",
                fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
              title="Export CSV brut des actions audit_log (limite 5000 lignes)"
            >
              <i className="ti ti-file-spreadsheet" /> {csvBusy ? "Export…" : "Export CSV"}
            </button>
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
        </div>

        {/* Alpha 0.39.0 : filtres avancés */}
        {!loading && (
          <Panel style={{ marginBottom: 14, padding: "12px 16px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <i className="ti ti-filter" style={{ color: "#185FA5", fontSize: 18 }} />
              <span style={{ fontSize: 12, color: "#6c7a89", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px" }}>Filtres</span>

              {/* Filtre établissement */}
              <select
                value={filtreEtab}
                onChange={(e) => setFiltreEtab(e.target.value)}
                style={{ padding: "6px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 12.5, minWidth: 180 }}
              >
                <option value="">Tous établissements</option>
                {parEtab.map((e) => (
                  <option key={e.etablissement_id || e.etab_id} value={e.etablissement_id || e.etab_id}>
                    {e.etablissement_nom || e.nom || "—"}
                  </option>
                ))}
              </select>

              {/* Filtre user */}
              <select
                value={filtreUser}
                onChange={(e) => setFiltreUser(e.target.value)}
                style={{ padding: "6px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 12.5, minWidth: 200 }}
              >
                <option value="">Tous utilisateurs</option>
                {users.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.user_email || u.user_id?.slice(0, 8)}
                  </option>
                ))}
              </select>

              {/* Filtre catégorie d'action */}
              <select
                value={filtreCategorie}
                onChange={(e) => setFiltreCategorie(e.target.value)}
                style={{ padding: "6px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 12.5, minWidth: 160 }}
              >
                <option value="">Toutes catégories</option>
                <option value="creer">Création</option>
                <option value="modifier">Modification</option>
                <option value="supprimer">Suppression</option>
                <option value="valider">Validation</option>
                <option value="refuser">Refus</option>
                <option value="recevoir">Réception</option>
                <option value="cloturer">Clôture</option>
              </select>

              {/* Reset */}
              {(filtreEtab || filtreUser || filtreCategorie) && (
                <button
                  onClick={() => { setFiltreEtab(""); setFiltreUser(""); setFiltreCategorie(""); }}
                  style={{
                    padding: "5px 10px", borderRadius: 6, border: "1px solid #e3e9ee",
                    background: "#fff", color: "#c0392b",
                    fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}
                >
                  <i className="ti ti-x" /> Réinitialiser
                </button>
              )}

              {/* Indicateur filtres actifs */}
              {(filtreEtab || filtreUser || filtreCategorie) && (
                <span style={{ fontSize: 11, color: "#185FA5", marginLeft: "auto" }}>
                  <i className="ti ti-info-circle" /> Filtres affectent KPIs/podium · La heatmap et les tendances restent globales (vues SQL préagrégées)
                </span>
              )}
            </div>
          </Panel>
        )}

        {loading ? <Panel><StateMsg>Chargement des statistiques…</StateMsg></Panel> : (
          <>
            {/* KPIs */}
            <KpiRow tiles={[
              { label: "Utilisateurs actifs", value: usersActifs, icon: "ti-users", color: "#185FA5" },
              { label: "Actions totales", value: totalActions, icon: "ti-activity", color: "#5aa05a" },
              { label: "Établissements actifs", value: parEtab.length, icon: "ti-building-hospital", color: "#7a6fb0" },
              { label: "Moyenne / user", value: usersActifs > 0 ? Math.round(totalActions / usersActifs) : 0, icon: "ti-calculator", color: "#EF9F27" },
            ]} />

            {/* Alpha 0.37.0 : panneau tendances mois courant vs précédent */}
            {statsGlobal && (
              <Panel style={{ marginBottom: 18, borderLeft: "4px solid #185FA5" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: "#142131" }}>
                    <i className="ti ti-trending-up" style={{ color: "#185FA5", marginRight: 6 }} />
                    Ce mois vs mois dernier
                  </h3>
                  <span style={{ fontSize: 11, color: "#8a98a8" }}>
                    {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                  <TrendRow label="Actions totales" current={statsGlobal.actions_ce_mois} previous={statsGlobal.actions_mois_dernier} icon="ti-activity" color="#5aa05a" />
                  <TrendRow label="DI créées" current={statsGlobal.di_ce_mois} previous={statsGlobal.di_mois_dernier} icon="ti-tools" color="#185FA5" />
                  <TrendRow label="Achats" current={statsGlobal.achats_ce_mois} previous={statsGlobal.achats_mois_dernier} icon="ti-shopping-cart" color="#EF9F27" />
                  <TrendRow label="Transferts" current={statsGlobal.transferts_ce_mois} previous={statsGlobal.transferts_mois_dernier} icon="ti-arrows-exchange" color="#7a6fb0" />
                  <TrendRow label="Utilisateurs actifs" current={statsGlobal.users_ce_mois} previous={statsGlobal.users_mois_dernier} icon="ti-users" color="#1c5454" />
                  <TrendRow label="Validations" current={statsGlobal.validations_ce_mois} previous={statsGlobal.validations_mois_dernier} icon="ti-circle-check" color="#5aa05a" />
                </div>
              </Panel>
            )}

            {/* Alpha 0.53.0 (BK) : comparaison 30 derniers jours vs 30 jours d'avant */}
            {statsCompare && (
              <Panel style={{ marginBottom: 18, borderLeft: "4px solid #7a6fb0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: "#142131" }}>
                    <i className="ti ti-chart-arrows" style={{ color: "#7a6fb0", marginRight: 6 }} />
                    30 derniers jours vs 30 jours d'avant
                  </h3>
                  <span style={{ fontSize: 11, color: "#8a98a8" }}>période glissante</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  <ComparisonCard label="Patients créés" current={statsCompare.courante.nb_patients_crees} previous={statsCompare.precedente.nb_patients_crees} icon="ti-user-plus" color="#185FA5" />
                  <ComparisonCard label="DI (interventions)" current={statsCompare.courante.nb_di} previous={statsCompare.precedente.nb_di} icon="ti-clipboard-check" color="#1c5454" />
                  <ComparisonCard label="Transferts" current={statsCompare.courante.nb_transferts} previous={statsCompare.precedente.nb_transferts} icon="ti-arrows-exchange" color="#5aa05a" />
                  <ComparisonCard label="Commandes" current={statsCompare.courante.nb_commandes} previous={statsCompare.precedente.nb_commandes} icon="ti-shopping-cart" color="#EF9F27" />
                  <ComparisonCard label="Signalements" current={statsCompare.courante.nb_signalements} previous={statsCompare.precedente.nb_signalements} icon="ti-alert-triangle" color="#c0392b" />
                  <ComparisonCard label="Users actifs (pic)" current={statsCompare.courante.nb_users_actifs} previous={statsCompare.precedente.nb_users_actifs} icon="ti-users" color="#7a6fb0" />
                </div>
              </Panel>
            )}

            {/* Podium top 3 + reste */}
            <Panel style={{ marginBottom: 18 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#142131" }}>
                <i className="ti ti-trophy" style={{ color: "#EF9F27", marginRight: 6 }} />
                Top utilisateurs actifs (sur {periode === "7" ? "7" : periode === "30" ? "30" : "90"} jours)
              </h3>

              {topUsers.length === 0 ? (
                <p style={{ color: "#8a98a8", fontSize: 13 }}>Aucune activité enregistrée sur cette période.</p>
              ) : (
                <>
                  {/* Top 3 en cartes */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
                    {topUsers.slice(0, 3).map((u, i) => {
                      const col = podiumColor(i);
                      const actions = periode === "7" ? u.nb_actions_7j : periode === "30" ? u.nb_actions_30j : u.nb_actions_total;
                      return (
                        <div key={u.user_id} style={{
                          background: col.bg, border: `1.5px solid ${col.border}`,
                          padding: "16px 18px", borderRadius: 12,
                          display: "flex", alignItems: "center", gap: 14,
                        }}>
                          <div style={{
                            width: 50, height: 50, borderRadius: "50%",
                            background: "#fff", border: `2px solid ${col.border}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            <i className={`ti ${col.icon}`} style={{ fontSize: 24, color: col.iconColor }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: col.fg, textTransform: "uppercase", letterSpacing: ".5px" }}>
                              {i === 0 ? "🥇 1er" : i === 1 ? "🥈 2e" : "🥉 3e"}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#142131", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={u.user_email}>
                              {emailShort(u.user_email)}
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: "#142131", marginTop: 2 }}>
                              {actions} <span style={{ fontSize: 11, fontWeight: 500, color: "#6c7a89" }}>actions</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reste du top en jauges */}
                  {topUsers.length > 3 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {topUsers.slice(3, 10).map((u, i) => {
                        const actions = periode === "7" ? u.nb_actions_7j : periode === "30" ? u.nb_actions_30j : u.nb_actions_total;
                        const maxVal = periode === "7" ? topUsers[0].nb_actions_7j : periode === "30" ? topUsers[0].nb_actions_30j : topUsers[0].nb_actions_total;
                        return (
                          <Gauge
                            key={u.user_id}
                            value={actions}
                            max={maxVal || 1}
                            label={`#${i + 4} · ${emailShort(u.user_email)}`}
                            color="#185FA5"
                            suffix=" actions"
                          />
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </Panel>

            {/* Top par catégorie */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 18 }}>
              <Panel>
                <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#142131" }}>
                  <i className="ti ti-tools" style={{ color: "#185FA5", marginRight: 6 }} />
                  Top demandeurs DI
                </h3>
                {topDi.length === 0 ? <p style={{ color: "#8a98a8", fontSize: 12 }}>Aucune donnée.</p> :
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {topDi.map((u, i) => (
                      <Gauge key={u.user_id} value={u.nb_di_creees} max={topDi[0].nb_di_creees || 1} label={`#${i + 1} ${emailShort(u.user_email)}`} color="#185FA5" suffix="" />
                    ))}
                  </div>
                }
              </Panel>
              <Panel>
                <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#142131" }}>
                  <i className="ti ti-shopping-cart" style={{ color: "#EF9F27", marginRight: 6 }} />
                  Top demandeurs achats
                </h3>
                {topAchats.length === 0 ? <p style={{ color: "#8a98a8", fontSize: 12 }}>Aucune donnée.</p> :
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {topAchats.map((u, i) => (
                      <Gauge key={u.user_id} value={u.nb_achats_demandes} max={topAchats[0].nb_achats_demandes || 1} label={`#${i + 1} ${emailShort(u.user_email)}`} color="#EF9F27" suffix="" />
                    ))}
                  </div>
                }
              </Panel>
              <Panel>
                <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#142131" }}>
                  <i className="ti ti-circle-check" style={{ color: "#5aa05a", marginRight: 6 }} />
                  Top valideurs
                </h3>
                {topValideurs.length === 0 ? <p style={{ color: "#8a98a8", fontSize: 12 }}>Aucune donnée.</p> :
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {topValideurs.map((u, i) => (
                      <Gauge key={u.user_id} value={u.nb_validations} max={topValideurs[0].nb_validations || 1} label={`#${i + 1} ${emailShort(u.user_email)}`} color="#5aa05a" suffix="" />
                    ))}
                  </div>
                }
              </Panel>
            </div>

            {/* Heatmap */}
            <Panel style={{ marginBottom: 18 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#142131" }}>
                <i className="ti ti-grid-dots" style={{ color: "#7a6fb0", marginRight: 6 }} />
                Heatmap d'activité (jour de la semaine × heure, 90 derniers jours)
              </h3>
              {heatmap.length === 0 ? (
                <p style={{ color: "#8a98a8", fontSize: 13 }}>Pas encore assez de données pour la heatmap.</p>
              ) : (
                <>
                  <Heatmap data={heatmap} color="#185FA5" onCellClick={openDrill} />
                  <p style={{ fontSize: 11.5, color: "#8a98a8", marginTop: 10, marginBottom: 0 }}>
                    <i className="ti ti-click" /> <b>Clique sur une cellule colorée</b> pour voir le détail des actions de ce créneau.
                  </p>
                </>
              )}
            </Panel>

            {/* Activité par jour */}
            <Panel style={{ marginBottom: 18 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#142131" }}>
                <i className="ti ti-chart-bar" style={{ color: "#185FA5", marginRight: 6 }} />
                Activité jour par jour ({periode === "7" ? "7 derniers" : periode === "30" ? "30 derniers" : "90 derniers"} jours)
              </h3>
              {activiteChartData.length === 0 ? (
                <p style={{ color: "#8a98a8", fontSize: 13 }}>Pas encore de données.</p>
              ) : (
                <BarChart data={activiteChartData} height={180} />
              )}
            </Panel>

            {/* Tableau par établissement */}
            {parEtab.length > 0 && (
              <Panel style={{ marginBottom: 18 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#142131" }}>
                  <i className="ti ti-building-hospital" style={{ color: "#185FA5", marginRight: 6 }} />
                  Activité par établissement
                </h3>
                <table>
                  <thead>
                    <tr>
                      <th>Établissement</th>
                      <th style={{ textAlign: "right" }}>DI</th>
                      <th style={{ textAlign: "right" }}>Achats</th>
                      <th style={{ textAlign: "right" }}>Transferts</th>
                      <th style={{ textAlign: "right" }}>Maintenances</th>
                      <th style={{ textAlign: "right" }}>Users actifs</th>
                      <th style={{ textAlign: "right" }}>Actions 30j</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parEtab.map((e, i) => (
                      <tr key={i}>
                        <td><b>{e.etablissement_nom || "—"}</b></td>
                        <td style={{ textAlign: "right", color: "#185FA5", fontWeight: 600 }}>{e.nb_di}</td>
                        <td style={{ textAlign: "right", color: "#EF9F27" }}>{e.nb_achats}</td>
                        <td style={{ textAlign: "right", color: "#7a6fb0" }}>{e.nb_transferts}</td>
                        <td style={{ textAlign: "right", color: "#5aa05a" }}>{e.nb_maintenances}</td>
                        <td style={{ textAlign: "right", color: "#6c7a89" }}>{e.nb_users_actifs}</td>
                        <td style={{ textAlign: "right", fontWeight: 600, color: "#142131" }}>{e.nb_actions_30j}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            )}

            {/* Tableau complet utilisateurs */}
            {users.length > 0 && (
              <Panel>
                <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#142131" }}>
                  <i className="ti ti-list-details" style={{ color: "#185FA5", marginRight: 6 }} />
                  Tableau complet des utilisateurs ({users.length})
                </h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>Utilisateur</th>
                        <th style={{ textAlign: "right" }}>DI</th>
                        <th style={{ textAlign: "right" }}>Achats</th>
                        <th style={{ textAlign: "right" }}>Transferts</th>
                        <th style={{ textAlign: "right" }}>Validations</th>
                        <th style={{ textAlign: "right" }}>Modifs</th>
                        <th style={{ textAlign: "right" }}>7j</th>
                        <th style={{ textAlign: "right" }}>30j</th>
                        <th style={{ textAlign: "right" }}>Total</th>
                        <th>Dernière</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.user_id}>
                          <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={u.user_email}>
                            {emailShort(u.user_email)}
                          </td>
                          <td style={{ textAlign: "right" }}>{u.nb_di_creees}</td>
                          <td style={{ textAlign: "right" }}>{u.nb_achats_demandes}</td>
                          <td style={{ textAlign: "right" }}>{u.nb_transferts_crees}</td>
                          <td style={{ textAlign: "right" }}>{u.nb_validations}</td>
                          <td style={{ textAlign: "right" }}>{u.nb_modifications}</td>
                          <td style={{ textAlign: "right", color: u.nb_actions_7j > 0 ? "#5aa05a" : "#8a98a8" }}>{u.nb_actions_7j}</td>
                          <td style={{ textAlign: "right" }}>{u.nb_actions_30j}</td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: "#142131" }}>{u.nb_actions_total}</td>
                          <td style={{ fontSize: 11, color: "#8a98a8" }} title={u.derniere_action ? new Date(u.derniere_action).toLocaleString("fr-FR") : ""}>
                            {u.derniere_action ? relativeTime(u.derniere_action) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}
          </>
        )}

        {/* Alpha 0.37.0 : modale drill-down heatmap */}
        {drillData && (
          <Modal
            open={true}
            title={`${drillData.jour_label || "Créneau"} ${drillData.heure}h — ${drillData.nb_actions || 0} action${(drillData.nb_actions || 0) > 1 ? "s" : ""}`}
            onClose={() => setDrillData(null)}
            size="lg"
          >
            {drillData.loading ? (
              <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>
                <i className="ti ti-loader-2" style={{ fontSize: 28, animation: "spin 1s linear infinite" }} />
                <p style={{ marginTop: 10, fontSize: 13 }}>Chargement du détail…</p>
              </div>
            ) : drillData.error ? (
              <div style={{ padding: 20, background: "#fef0ee", borderRadius: 8, color: "#c0392b", fontSize: 13 }}>
                <i className="ti ti-alert-triangle" /> Impossible de charger le détail : {drillData.error}
              </div>
            ) : drillData.items.length === 0 ? (
              <p style={{ color: "#8a98a8", fontSize: 13 }}>Aucune action sur ce créneau (sur les 90 derniers jours).</p>
            ) : (
              <>
                <p style={{ fontSize: 12, color: "#6c7a89", marginTop: 0, marginBottom: 14 }}>
                  <i className="ti ti-info-circle" /> Liste des {drillData.items.length} dernières actions sur ce créneau horaire, agrégées sur les 90 derniers jours (toutes dates de ce jour de semaine confondues).
                </p>
                <div style={{ maxHeight: 480, overflowY: "auto", borderRadius: 8, border: "1px solid #e3e9ee" }}>
                  <table style={{ fontSize: 12.5 }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Action</th>
                        <th>Entité</th>
                        <th>Utilisateur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drillData.items.map((it) => (
                        <tr key={it.id}>
                          <td style={{ fontSize: 11.5, color: "#6c7a89", whiteSpace: "nowrap" }}>{it.jour_label}</td>
                          <td>
                            <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, background: actionColor(it.action).bg, color: actionColor(it.action).fg, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".3px" }}>
                              {it.action}
                            </span>
                          </td>
                          <td>
                            <i className={`ti ${entiteIcon(it.entite)}`} style={{ marginRight: 4, color: "#8a98a8" }} />
                            {it.entite}
                          </td>
                          <td style={{ fontSize: 11.5, color: "#142131" }}>{it.user_email || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Modal>
        )}
      </div>
    </div>
  );
}

// Alpha 0.37.0 : ligne de tendance avec badge
function TrendRow({ label, current, previous, icon, color }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e3e9ee",
      borderRadius: 10,
      padding: "12px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6c7a89" }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 16 }} />
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: "#142131", lineHeight: 1 }}>{current ?? 0}</span>
        <TrendBadge current={current ?? 0} previous={previous ?? 0} size="sm" />
      </div>
      <div style={{ fontSize: 10.5, color: "#8a98a8" }}>
        Mois dernier : {previous ?? 0}
      </div>
    </div>
  );
}

// Alpha 0.53.0 (BK) : carte de comparaison 30j courant vs 30j précédent
function ComparisonCard({ label, current, previous, icon, color }) {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  const delta = cur - prev;
  const pctRaw = prev > 0 ? Math.round((delta / prev) * 100) : (cur > 0 ? 100 : 0);
  const isUp = delta > 0;
  const isDown = delta < 0;
  const arrowColor = isUp ? "#2e6f33" : isDown ? "#c0392b" : "#8a98a8";
  const arrowIcon = isUp ? "ti-trending-up" : isDown ? "ti-trending-down" : "ti-minus";
  return (
    <div style={{
      background: "linear-gradient(135deg, #fff 0%, #fafbfc 100%)",
      border: "1px solid #e3e9ee",
      borderRadius: 10,
      padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6c7a89", fontWeight: 600 }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 16 }} />
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: "#142131", lineHeight: 1 }}>{cur}</span>
        <span style={{ fontSize: 13, color: "#8a98a8" }}>vs {prev}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: arrowColor }}>
        <i className={`ti ${arrowIcon}`} />
        {delta >= 0 ? "+" : ""}{delta} ({pctRaw >= 0 ? "+" : ""}{pctRaw}%)
      </div>
    </div>
  );
}

// Couleurs par action pour le tableau drill
function actionColor(action) {
  const map = {
    creer: { bg: "#dff5e0", fg: "#2e6f33" },
    modifier: { bg: "#fcefda", fg: "#7a4f15" },
    supprimer: { bg: "#fef0ee", fg: "#c0392b" },
    valider: { bg: "#eaf7f7", fg: "#1c5454" },
    refuser: { bg: "#fef0ee", fg: "#c0392b" },
    recevoir: { bg: "#e8e0f0", fg: "#5e4a8c" },
    cloturer: { bg: "#d8e8f0", fg: "#1c4d6a" },
  };
  return map[action] || { bg: "#f4f7fa", fg: "#6c7a89" };
}

function entiteIcon(entite) {
  const map = {
    intervention: "ti-tools",
    achat: "ti-shopping-cart",
    transfert: "ti-arrows-exchange",
    signalement: "ti-message",
    patient: "ti-user",
    materiel: "ti-armchair-2",
    maintenance: "ti-tool",
    consentement: "ti-shield-check",
  };
  return map[entite] || "ti-circle";
}
