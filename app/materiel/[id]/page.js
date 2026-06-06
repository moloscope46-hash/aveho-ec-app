"use client";
// =============================================================
//  /materiel/[id] — Fiche détaillée matériel (refonte 0.58.71)
//
//  Onglets premium :
//   - Vue d'ensemble (identifiants + affectations)
//   - Traçabilité UDI (DI/PI + QR scanné)
//   - Mouvements (materiel_mouvements, ventilation complète)
//   - État & SAV (changement état, cycle de vie, motif rebut)
//   - Historique opérationnel (DI / maintenances / transferts — ancienne page)
//   - Immobilisation (comptable, amortissement)
// =============================================================

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { Panel, StateMsg, Btn, IconButton } from "../../ui";
import { EmptyState, toast } from "../../components/ui-premium";
import { fmtDate, fmtEur } from "../../../lib/format";
import { logger } from "../../../lib/logger";
import { generateEan13Svg, isValidEan13, buildUdi, generateQrCodeUrl } from "../../../lib/barcode";
import { materielsHasArticleId, materielsHasUdi, materielsHasImmobilisation } from "../../../lib/materiels";
import { safeUpdate } from "../../../lib/safeWrite";
import BackButton from "../../components/BackButton";

// 0.58.72 — Ouvre une nouvelle fenêtre avec un QR pleine page prêt à imprimer
function openQrPrintWindow(mat, article) {
  if (typeof window === "undefined") return;
  const url = `${window.location.origin}/scan/quick?m=${mat.id}`;
  const qrImg = generateQrCodeUrl(url, 400);
  const w = window.open("", "_blank", "width=600,height=800");
  if (!w) return;
  const title = (mat.libelle || article?.libelle || "Matériel").replace(/[<>]/g, "");
  const sn = (mat.num_serie || "").replace(/[<>]/g, "");
  const lot = (mat.num_lot || "").replace(/[<>]/g, "");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QR ${title}</title>
    <style>
      *{box-sizing:border-box;font-family:Quicksand,sans-serif}
      body{margin:0;padding:24px;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#fff}
      .card{border:3px dashed #142131;border-radius:14px;padding:30px;text-align:center;max-width:500px}
      h1{font-size:18px;margin:14px 0 4px;color:#142131}
      .sn{font-family:Consolas,monospace;color:#5a6878;font-size:13px;margin:2px 0}
      .footer{margin-top:14px;font-size:10px;color:#8a98a8;text-transform:uppercase;letter-spacing:1px}
      @media print { .card { border-color: #000; } }
    </style></head><body>
    <div class="card">
      <img src="${qrImg}" alt="QR" width="400" height="400" style="display:block;margin:0 auto"/>
      <h1>${title}</h1>
      ${sn ? `<div class="sn">S/N ${sn}</div>` : ""}
      ${lot ? `<div class="sn">Lot ${lot}</div>` : ""}
      <div class="footer">Aveho — Scan pour DI / retour / échange / rebut</div>
    </div>
    <script>window.onload = () => setTimeout(() => window.print(), 500);</script>
  </body></html>`);
  w.document.close();
}

const COULEUR_DI = { "Nouvelle": "#e35d5b", "En cours": "#EF9F27", "Résolue": "#5aa05a", "Annulée": "#8a98a8" };
const COULEUR_MAINT = { "Planifiée": "#185FA5", "À faire": "#EF9F27", "Faite": "#5aa05a", "En retard": "#e35d5b", "Annulée": "#8a98a8" };

export const ETATS_MATERIEL = [
  { v: "Disponible",      color: "#5aa05a", icon: "ti-check",         tint: "rgba(90,160,90,.15)" },
  { v: "En patient",      color: "#7a6fb0", icon: "ti-user",          tint: "rgba(122,111,176,.15)" },
  { v: "En dépôt",        color: "#EF9F27", icon: "ti-package",       tint: "rgba(239,159,39,.15)" },
  { v: "En SAV",          color: "#185FA5", icon: "ti-tools",         tint: "rgba(24,95,165,.15)" },
  { v: "En transfert",    color: "#7CC8C8", icon: "ti-arrows-right",  tint: "rgba(124,200,200,.15)" },
  { v: "En quarantaine",  color: "#d28818", icon: "ti-alert-triangle", tint: "rgba(210,136,24,.18)" },
  { v: "Immobilisé",      color: "#5e4a8c", icon: "ti-lock",          tint: "rgba(94,74,140,.18)" },
  { v: "Réformé",         color: "#8a98a8", icon: "ti-archive",       tint: "rgba(138,152,168,.15)" },
  { v: "Rebut",           color: "#e35d5b", icon: "ti-trash",         tint: "rgba(227,93,91,.15)" },
  { v: "Perdu",           color: "#c0392b", icon: "ti-question-mark", tint: "rgba(192,57,43,.15)" },
  { v: "Volé",            color: "#c0392b", icon: "ti-shield-x",      tint: "rgba(192,57,43,.15)" },
  { v: "Détruit",         color: "#7f1d1d", icon: "ti-flame",         tint: "rgba(127,29,29,.15)" },
];

export function getEtatMeta(etat) {
  return ETATS_MATERIEL.find(e => e.v === etat) || { v: etat || "—", color: "#8a98a8", icon: "ti-help", tint: "rgba(138,152,168,.10)" };
}

function statutMaintEffectif(m) {
  if (m.statut === "Faite" || m.statut === "Annulée") return m.statut;
  const aujourdhui = new Date().toISOString().slice(0, 10);
  if (m.date_prevue && m.date_prevue < aujourdhui) return "En retard";
  return m.statut || "Planifiée";
}

export default function FicheMateriel({ params }) {
  const resolved = use(params);
  const matId = resolved?.id;
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [mat, setMat] = useState(null);
  const [article, setArticle] = useState(null);
  const [tags, setTags] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [transferts, setTransferts] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [editingEtat, setEditingEtat] = useState(false);
  const [hasArticleId, setHasArticleId] = useState(false);
  const [hasUdi, setHasUdi] = useState(false);
  const [hasImmo, setHasImmo] = useState(false);

  async function loadAll() {
    if (!auth.ready || !matId) return;
    setLoading(true);
    try {
      // Sondes capacités (cache module-level, pas de re-fetch en boucle)
      const [ha, hu, hi] = await Promise.all([
        materielsHasArticleId(supabase),
        materielsHasUdi(supabase),
        materielsHasImmobilisation(supabase),
      ]);
      setHasArticleId(ha);
      setHasUdi(hu);
      setHasImmo(hi);

      const { data: m } = await supabase
        .from("materiels")
        .select("*")
        .eq("id", matId).maybeSingle();
      if (!m) { setMat(null); setLoading(false); return; }

      // 0.58.79 : joins side-loaded en parallèle (au lieu de SELECT join qui crashe
      // si une table/FK n'existe pas). Chaque sous-fetch try/catch pour graceful fail.
      const sideTryFetch = async (q) => {
        try { const r = await q; return r.data; } catch { return null; }
      };
      const [pat, dep] = await Promise.all([
        m.patient_id ? sideTryFetch(supabase.from("patients").select("nom, prenom").eq("id", m.patient_id).maybeSingle()) : Promise.resolve(null),
        m.depot_id ? sideTryFetch(supabase.from("depots").select("nom").eq("id", m.depot_id).maybeSingle()) : Promise.resolve(null),
      ]);
      // Hydrate côté objet (mimique le pattern Supabase nested select)
      m.patients = pat;
      m.depots = dep;
      setMat(m);

      // Chargement parallèle des relations
      const promises = [
        supabase.from("tags_materiel").select("*"),
        supabase.from("materiel_tags").select("tag_id").eq("materiel_id", matId),
        supabase.from("maintenances").select("*").eq("materiel_id", matId).order("date_prevue", { ascending: false }),
        supabase.from("interventions").select("*").eq("materiel_id", matId).order("created_at", { ascending: false }),
        // 0.58.79 : transferts sans nested select (les FK depot_source_id / depot_destination_id n'ont pas de relations PostgREST déclarées)
        supabase.from("transferts").select("*").eq("materiel_id", matId).order("created_at", { ascending: false }).limit(20),
      ];
      if (ha && m.article_id) {
        promises.push(supabase.from("articles").select("id, libelle, reference, code_lpp, dispositif_medical, classe_dm, prix_vente_ttc").eq("id", m.article_id).maybeSingle());
      }
      const results = await Promise.allSettled(promises);
      const [tgR, linksR, mntR, diR, trfR, artR] = results;
      const tg = tgR.status === "fulfilled" ? tgR.value?.data || [] : [];
      const links = linksR.status === "fulfilled" ? linksR.value?.data || [] : [];
      const tagIds = links.map(l => l.tag_id);
      setTags(tg.filter(t => tagIds.includes(t.id)));
      setMaintenances(mntR.status === "fulfilled" ? mntR.value?.data || [] : []);
      setInterventions(diR.status === "fulfilled" ? diR.value?.data || [] : []);
      setTransferts(trfR.status === "fulfilled" ? trfR.value?.data || [] : []);
      if (ha && m.article_id) {
        setArticle(artR?.status === "fulfilled" ? artR.value?.data || null : null);
      }

      // Mouvements (table optionnelle si SQL 0.58.71 pas appliqué)
      try {
        const { data: mvts } = await supabase
          .from("materiel_mouvements").select("*").eq("materiel_id", matId)
          .order("created_at", { ascending: false }).limit(100);
        setMouvements(mvts || []);
      } catch {}
    } catch (e) {
      logger.error("[Materiel] load failed:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [auth.ready, matId]);

  async function changeEtat(newEtat) {
    if (!mat || newEtat === mat.etat) { setEditingEtat(false); return; }
    try {
      const updates = { etat: newEtat };
      if (newEtat === "Rebut") updates.date_rebut = new Date().toISOString().slice(0, 10);
      const { error } = await safeUpdate(supabase, "materiels", updates, { id: mat.id }, { userId: auth.user?.id });
      if (error) throw error;
      toast.success(`État changé : ${newEtat}`);
      setEditingEtat(false);
      await loadAll();
    } catch (e) {
      toast.error(e.message);
    }
  }

  if (!auth.ready || loading) return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap"><Panel><StateMsg>Chargement…</StateMsg></Panel></div>
    </div>
  );

  if (!mat) return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <Panel><StateMsg>Matériel introuvable.</StateMsg></Panel>
        <Btn variant="ghost" icon="ti-arrow-left" onClick={() => router.push("/materiels")}>Retour à la liste</Btn>
      </div>
    </div>
  );

  const etatMeta = getEtatMeta(mat.etat);
  const isPerime = mat.date_peremption && new Date(mat.date_peremption) < new Date();
  const udi = hasUdi && mat.udi_di ? buildUdi({ gtin: mat.udi_di, lot: mat.num_lot, serie: mat.num_serie, peremption: null }) : null;

  // KPIs (anciens)
  const maintenancesEnCours = maintenances.filter(m => statutMaintEffectif(m) !== "Faite" && m.statut !== "Annulée").length;
  const maintenancesRetard = maintenances.filter(m => statutMaintEffectif(m) === "En retard").length;
  const diOuvertes = interventions.filter(d => d.statut === "Nouvelle" || d.statut === "En cours").length;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        {/* 0.58.72 : Bouton retour */}
        <div style={{ marginBottom: 8 }}><BackButton /></div>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#5a6878", marginBottom: 6 }}>
            <a onClick={() => router.push("/materiels")} style={{ cursor: "pointer", color: "#185FA5", textDecoration: "none" }}>
              <i className="ti ti-arrow-left" /> Inventaire matériel
            </a>
            <i className="ti ti-chevron-right" style={{ fontSize: 10 }} />
            <span>{article?.libelle || "Sans article"}</span>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{
              width: 96, height: 96, borderRadius: 14,
              background: `linear-gradient(135deg, ${etatMeta.color}, ${etatMeta.color}cc)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, boxShadow: `0 8px 25px ${etatMeta.color}40`,
            }}>
              <i className={`ti ${etatMeta.icon}`} style={{ color: "#fff", fontSize: 42 }} />
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <h1 style={{ margin: "0 0 6px", fontSize: 24, color: "#142131", fontWeight: 700 }}>
                {mat.libelle || article?.libelle || "Matériel"}
              </h1>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, color: "#5a6878", marginBottom: 8 }}>
                {mat.num_serie && <span><i className="ti ti-hash" /> S/N <code style={{ background: "transparent", padding: 0, color: "#7a6fb0" }}>{mat.num_serie}</code></span>}
                {mat.num_lot && <span><i className="ti ti-tag" /> Lot <code style={{ background: "transparent", padding: 0, color: "#7CC8C8" }}>{mat.num_lot}</code></span>}
                {mat.date_peremption && (
                  <span style={{ color: isPerime ? "#e35d5b" : "#5a6878", fontWeight: isPerime ? 700 : 400 }}>
                    <i className="ti ti-clock" /> {isPerime ? "PÉRIMÉ" : "Péremption"} : {fmtDate(mat.date_peremption)}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {hasUdi && mat.udi_di && <span style={{ fontSize: 10.5, background: "rgba(94,74,140,.18)", color: "#5e4a8c", padding: "2px 7px", borderRadius: 4, fontWeight: 700 }}>🔖 UDI</span>}
                {hasImmo && mat.immobilisation_active && <span style={{ fontSize: 10.5, background: "rgba(94,74,140,.18)", color: "#5e4a8c", padding: "2px 7px", borderRadius: 4, fontWeight: 700 }}>📊 IMMO</span>}
                {mat.patients && <span style={{ fontSize: 10.5, background: "rgba(122,111,176,.18)", color: "#5a4a90", padding: "2px 7px", borderRadius: 4, fontWeight: 700 }}>👤 {mat.patients.nom} {mat.patients.prenom}</span>}
                {mat.depots?.nom && <span style={{ fontSize: 10.5, background: "rgba(239,159,39,.18)", color: "#7a4f15", padding: "2px 7px", borderRadius: 4, fontWeight: 700 }}>📦 {mat.depots.nom}</span>}
                {article?.dispositif_medical && <span style={{ fontSize: 10.5, background: "#fde4e1", color: "#c0392b", padding: "2px 7px", borderRadius: 4, fontWeight: 700 }}>DM{article.classe_dm ? ` ${article.classe_dm}` : ""}</span>}
                {tags.map(t => <span key={t.id} style={{ fontSize: 10.5, background: t.couleur ? `${t.couleur}22` : "#f0f3f6", color: t.couleur || "#5a6878", padding: "2px 7px", borderRadius: 4, fontWeight: 600 }}>{t.icone && <i className={`ti ${t.icone}`} style={{ marginRight: 3 }} />}{t.libelle}</span>)}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 220 }}>
              <div style={{ background: etatMeta.tint, border: `2px solid ${etatMeta.color}40`, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <i className={`ti ${etatMeta.icon}`} style={{ color: etatMeta.color, fontSize: 28 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10.5, color: etatMeta.color, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>État actuel</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: etatMeta.color }}>{etatMeta.v}</div>
                </div>
                <IconButton icon="ti-edit" color={etatMeta.color} ariaLabel="Changer état" onClick={() => setEditingEtat(true)} />
              </div>
              <Btn variant="ghost" icon="ti-scan" onClick={() => router.push(`/scan/materiel?materiel_id=${mat.id}`)}>Scanner / actions</Btn>
              {article && <Btn variant="ghost" icon="ti-external-link" onClick={() => router.push(`/article/${article.id}`)}>Voir l'article</Btn>}
            </div>
          </div>
        </div>

        {/* Modal édition état */}
        {editingEtat && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(20,33,49,.65)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setEditingEtat(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: 20, maxWidth: 540, width: "100%" }}>
              <h3 style={{ margin: "0 0 14px", color: "#142131" }}>Changer l'état du matériel</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {ETATS_MATERIEL.map(e => (
                  <button key={e.v} onClick={() => changeEtat(e.v)} style={{
                    background: mat.etat === e.v ? `linear-gradient(135deg, ${e.color}, ${e.color}cc)` : e.tint,
                    color: mat.etat === e.v ? "#fff" : e.color,
                    border: `1.5px solid ${e.color}`,
                    padding: "10px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <i className={`ti ${e.icon}`} /> {e.v}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 14, textAlign: "right" }}>
                <Btn variant="ghost" onClick={() => setEditingEtat(false)}>Annuler</Btn>
              </div>
            </div>
          </div>
        )}

        {/* KPI rapides */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}>
          <KpiCard label="Mvts traçabilité" value={mouvements.length} color="#7a6fb0" icon="ti-arrows-up-down" />
          <KpiCard label="Maint. en cours" value={maintenancesEnCours} color={maintenancesEnCours > 0 ? "#EF9F27" : "#5aa05a"} icon="ti-tools" />
          <KpiCard label="Maint. en retard" value={maintenancesRetard} color={maintenancesRetard > 0 ? "#e35d5b" : "#cfd8e0"} icon="ti-alert-triangle" />
          <KpiCard label="DI ouvertes" value={diOuvertes} color={diOuvertes > 0 ? "#e35d5b" : "#5aa05a"} icon="ti-bug" />
          <KpiCard label="Transferts" value={transferts.length} color="#7CC8C8" icon="ti-arrows-right" />
        </div>

        {/* Onglets */}
        <div style={{ display: "flex", borderBottom: "2px solid #e3e9ee", marginBottom: 16, overflowX: "auto" }}>
          {[
            { key: "overview",     lbl: "Vue d'ensemble", icon: "ti-eye" },
            { key: "udi",          lbl: "Traçabilité UDI", icon: "ti-barcode" },
            { key: "mouvements",   lbl: `Mouvements (${mouvements.length})`, icon: "ti-arrows-up-down" },
            { key: "etat",         lbl: "État & SAV", icon: "ti-tools" },
            { key: "historique",   lbl: `Opérationnel (${maintenances.length + interventions.length + transferts.length})`, icon: "ti-history" },
            { key: "immobilisation", lbl: "Immobilisation", icon: "ti-coin", disabled: !hasImmo },
          ].map(t => (
            <button key={t.key} onClick={() => !t.disabled && setActiveTab(t.key)} disabled={t.disabled}
              style={{
                background: activeTab === t.key ? "linear-gradient(135deg, rgba(122,111,176,.20), transparent)" : "transparent",
                color: t.disabled ? "#cfd8e0" : (activeTab === t.key ? "#5e4a8c" : "#5a6878"),
                border: "none", borderBottom: `3px solid ${activeTab === t.key ? "#5e4a8c" : "transparent"}`,
                padding: "9px 16px", fontSize: 13, fontWeight: activeTab === t.key ? 700 : 500,
                cursor: t.disabled ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                display: "inline-flex", alignItems: "center", gap: 5,
              }}>
              <i className={`ti ${t.icon}`} /> {t.lbl}
              {t.disabled && <span style={{ fontSize: 9, background: "#f0f3f6", color: "#a0aeb9", padding: "1px 5px", borderRadius: 3, fontStyle: "italic", marginLeft: 4 }}>SQL pending</span>}
            </button>
          ))}
        </div>

        {/* Onglet vue d'ensemble */}
        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Panel>
              <h3 style={{ margin: "0 0 12px", fontSize: 13, color: "#5a6878", textTransform: "uppercase" }}><i className="ti ti-info-circle" /> Identifiants</h3>
              <Field label="Libellé" value={mat.libelle} />
              <Field label="N° de série" value={mat.num_serie} mono />
              <Field label="N° de lot" value={mat.num_lot} mono />
              <Field label="Référence interne" value={mat.reference_interne || mat.reference} mono />
              {hasUdi && <Field label="UDI-DI (GTIN)" value={mat.udi_di} mono />}
              <Field label="Code-barres principal" value={mat.code_barre_principal} mono />
              {mat.fabricant_serie && <Field label="N° série fabricant" value={mat.fabricant_serie} mono />}
            </Panel>
            <Panel>
              <h3 style={{ margin: "0 0 12px", fontSize: 13, color: "#5a6878", textTransform: "uppercase" }}><i className="ti ti-link" /> Affectations</h3>
              {article ? (
                <Field label="Article catalogue" value={article.libelle} link={() => router.push(`/article/${article.id}`)} />
              ) : <Field label="Article catalogue" value={hasArticleId ? null : "Liaison désactivée (SQL pending)"} />}
              <Field label="Patient affecté" value={mat.patients ? `${mat.patients.nom || ""} ${mat.patients.prenom || ""}`.trim() : null} />
              <Field label="Chambre" value={mat.patients?.chambre} />
              <Field label="Dépôt" value={mat.depots?.nom} />
              <Field label="Zone" value={mat.zones?.nom} />
              <Field label="Date péremption" value={mat.date_peremption ? fmtDate(mat.date_peremption) : null} />
              <Field label="Mise en service" value={mat.date_mise_en_service ? fmtDate(mat.date_mise_en_service) : null} />
            </Panel>
          </div>
        )}

        {/* Onglet UDI */}
        {activeTab === "udi" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Panel style={{ borderLeft: "4px solid #5e4a8c" }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 14, color: "#5e4a8c" }}>
                <i className="ti ti-shield-check" /> UDI complet (Unique Device Identification)
              </h3>
              {!hasUdi ? (
                <div style={{ padding: "16px 18px", background: "rgba(239,159,39,.10)", borderRadius: 8, borderLeft: "3px solid #EF9F27", marginBottom: 10 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#7a4f15" }}>
                    Colonnes UDI non disponibles. Exécute le SQL <code>migration-0.58.71-materiels-extension.sql</code> dans Supabase pour activer la traçabilité UDI (norme HAS/FDA pour DM).
                  </p>
                </div>
              ) : (
                <>
                  <Field label="UDI-DI (Direct Identifier)" value={mat.udi_di} mono />
                  <Field label="UDI-PI (Production Identifier)" value={mat.udi_pi} mono />
                  {udi?.di && isValidEan13(udi.di) && (
                    <div style={{ marginTop: 10, padding: 10, background: "#fff", border: "1px solid #e3e9ee", borderRadius: 8 }} dangerouslySetInnerHTML={{ __html: generateEan13Svg(udi.di) }} />
                  )}
                  <p style={{ margin: "12px 0 0", fontSize: 11, color: "#8a98a8", lineHeight: 1.5 }}>
                    L'<b>UDI</b> permet la traçabilité réglementaire des dispositifs médicaux selon la norme HAS (et FDA pour les exports). Le <b>DI</b> identifie le modèle, le <b>PI</b> identifie l'instance physique (lot + série + dates).
                  </p>
                </>
              )}
            </Panel>
            <Panel>
              <h3 style={{ margin: "0 0 14px", fontSize: 14, color: "#142131" }}><i className="ti ti-qrcode" /> QR code imprimable</h3>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "#5a6878", lineHeight: 1.5 }}>
                Génère un QR code imprimable à coller sur le matériel. Le scan du QR ouvre la page "Scan rapide" avec actions DI / Retour location / Échange / Rebut.
              </p>
              <div style={{ textAlign: "center", padding: 16, background: "#fafbfc", border: "1px solid #e3e9ee", borderRadius: 8 }}>
                {(() => {
                  const url = `${typeof window !== "undefined" ? window.location.origin : "https://aveho-ec-app.vercel.app"}/scan/quick?m=${mat.id}`;
                  const qrImg = generateQrCodeUrl(url, 220);
                  return (
                    <>
                      <img src={qrImg} alt="QR matériel" width={220} height={220} style={{ display: "block", margin: "0 auto", border: "2px solid #142131", borderRadius: 6 }} />
                      <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: "#142131" }}>{mat.libelle || article?.libelle || "Matériel"}</div>
                      {mat.num_serie && <div style={{ fontSize: 10, color: "#5a6878", fontFamily: "Consolas, monospace" }}>S/N {mat.num_serie}</div>}
                    </>
                  );
                })()}
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                <Btn variant="primary" icon="ti-printer" onClick={() => openQrPrintWindow(mat, article)}>Imprimer</Btn>
                <Btn variant="ghost" icon="ti-scan" onClick={() => router.push(`/scan/materiel?materiel_id=${mat.id}`)}>Re-scanner UDI</Btn>
              </div>

              {hasUdi && mat.qr_code && (
                <>
                  <h4 style={{ margin: "16px 0 8px", fontSize: 12, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5 }}>Dernière capture GS1/DataMatrix</h4>
                  <div style={{ padding: 10, background: "#fafbfc", borderRadius: 8, border: "1px solid #e3e9ee", fontFamily: "Consolas, monospace", fontSize: 11, color: "#142131", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {mat.qr_code}
                  </div>
                </>
              )}
            </Panel>
          </div>
        )}

        {/* Onglet mouvements */}
        {activeTab === "mouvements" && (
          <Panel style={{ padding: 0, overflow: "hidden" }}>
            {mouvements.length === 0 ? (
              <EmptyState illustration="package" title="Aucun mouvement enregistré"
                message="Les mouvements sont créés automatiquement par trigger SQL quand l'état, le patient ou le dépôt change. Active le SQL 0.58.71 pour activer la traçabilité."
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: "linear-gradient(135deg, #f5f8fc, #fff)", borderBottom: "2px solid #e3e9ee" }}>
                      <th style={{ padding: "9px 8px", textAlign: "left", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Date</th>
                      <th style={{ padding: "9px 8px", textAlign: "left", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Type</th>
                      <th style={{ padding: "9px 8px", textAlign: "left", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Avant</th>
                      <th style={{ padding: "9px 8px", textAlign: "left", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Après</th>
                      <th style={{ padding: "9px 8px", textAlign: "left", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Motif / source</th>
                      <th style={{ padding: "9px 8px", textAlign: "left", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Par</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mouvements.map(m => (
                      <tr key={m.id} style={{ borderBottom: "1px solid #f0f3f6" }}>
                        <td style={{ padding: "8px", fontSize: 11.5, color: "#5a6878" }}>{new Date(m.created_at).toLocaleString("fr-FR")}</td>
                        <td style={{ padding: "8px" }}><MvtTypeBadge type={m.type} /></td>
                        <td style={{ padding: "8px", fontSize: 11.5 }}>{m.etat_avant || (m.patient_id_avant ? "👤" : "") || (m.depot_id_avant ? "📦" : "") || "—"}</td>
                        <td style={{ padding: "8px", fontSize: 11.5, fontWeight: 600 }}>{m.etat_apres || (m.patient_id_apres ? "👤" : "") || (m.depot_id_apres ? "📦" : "") || "—"}</td>
                        <td style={{ padding: "8px", fontSize: 11, color: "#5a6878" }}>{m.motif || m.source || "—"}</td>
                        <td style={{ padding: "8px", fontSize: 11, color: "#5a6878" }}>{m.user_email || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {/* Onglet état */}
        {activeTab === "etat" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Panel>
              <h3 style={{ margin: "0 0 12px", fontSize: 13, color: "#5a6878", textTransform: "uppercase" }}>État actuel</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: etatMeta.tint, borderRadius: 10, marginBottom: 14 }}>
                <i className={`ti ${etatMeta.icon}`} style={{ color: etatMeta.color, fontSize: 32 }} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: etatMeta.color }}>{etatMeta.v}</div>
                  {mat.notes_etat && <div style={{ fontSize: 12, color: "#5a6878", marginTop: 4 }}>{mat.notes_etat}</div>}
                </div>
              </div>
              <Btn variant="primary" icon="ti-edit" onClick={() => setEditingEtat(true)}>Changer l'état</Btn>
            </Panel>
            <Panel>
              <h3 style={{ margin: "0 0 12px", fontSize: 13, color: "#5a6878", textTransform: "uppercase" }}>Cycle de vie</h3>
              <Field label="Date acquisition" value={mat.created_at ? fmtDate(mat.created_at) : null} />
              <Field label="Mise en service" value={mat.date_mise_en_service ? fmtDate(mat.date_mise_en_service) : null} />
              <Field label="Péremption" value={mat.date_peremption ? fmtDate(mat.date_peremption) : null} />
              <Field label="Date rebut" value={mat.date_rebut ? fmtDate(mat.date_rebut) : null} />
              {mat.motif_rebut && (
                <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(227,93,91,.08)", borderLeft: "3px solid #e35d5b", borderRadius: 4 }}>
                  <div style={{ fontSize: 10.5, color: "#c0392b", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 3 }}>Motif rebut</div>
                  <div style={{ fontSize: 12, color: "#142131" }}>{mat.motif_rebut}</div>
                </div>
              )}
            </Panel>
          </div>
        )}

        {/* Onglet historique opérationnel (ancien contenu) */}
        {activeTab === "historique" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Panel>
              <h3 style={{ margin: "0 0 12px", fontSize: 13, color: "#5a6878", textTransform: "uppercase" }}><i className="ti ti-tools" /> Maintenances ({maintenances.length})</h3>
              {maintenances.length === 0 ? <p style={{ fontSize: 12, color: "#8a98a8" }}>Aucune maintenance</p> : (
                <div style={{ maxHeight: 320, overflowY: "auto" }}>
                  {maintenances.slice(0, 30).map(m => {
                    const statut = statutMaintEffectif(m);
                    return (
                      <div key={m.id} style={{ padding: "8px 10px", borderBottom: "1px solid #f0f3f6", display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 }}>
                        <div>
                          <b>{m.type || "Maintenance"}</b>{m.libelle && <span style={{ color: "#5a6878" }}> · {m.libelle}</span>}
                          <div style={{ fontSize: 10.5, color: "#8a98a8" }}>Prévue : {m.date_prevue ? fmtDate(m.date_prevue) : "—"}</div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: COULEUR_MAINT[statut] || "#5a6878", padding: "2px 7px", borderRadius: 4, background: `${COULEUR_MAINT[statut] || "#5a6878"}22`, whiteSpace: "nowrap" }}>{statut}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
            <Panel>
              <h3 style={{ margin: "0 0 12px", fontSize: 13, color: "#5a6878", textTransform: "uppercase" }}><i className="ti ti-bug" /> DI / Signalements ({interventions.length})</h3>
              {interventions.length === 0 ? <p style={{ fontSize: 12, color: "#8a98a8" }}>Aucune DI</p> : (
                <div style={{ maxHeight: 320, overflowY: "auto" }}>
                  {interventions.slice(0, 30).map(d => (
                    <div key={d.id} style={{ padding: "8px 10px", borderBottom: "1px solid #f0f3f6", display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 }}>
                      <div>
                        <b>{d.titre || d.libelle || "DI sans titre"}</b>
                        <div style={{ fontSize: 10.5, color: "#8a98a8" }}>{d.created_at ? fmtDate(d.created_at) : "—"}</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: COULEUR_DI[d.statut] || "#5a6878", padding: "2px 7px", borderRadius: 4, background: `${COULEUR_DI[d.statut] || "#5a6878"}22`, whiteSpace: "nowrap" }}>{d.statut}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
            <Panel style={{ gridColumn: "1 / -1" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 13, color: "#5a6878", textTransform: "uppercase" }}><i className="ti ti-arrows-right" /> Transferts ({transferts.length})</h3>
              {transferts.length === 0 ? <p style={{ fontSize: 12, color: "#8a98a8" }}>Aucun transfert</p> : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ borderBottom: "1px solid #e3e9ee" }}><th style={{ padding: 6, textAlign: "left" }}>Date</th><th style={{ padding: 6, textAlign: "left" }}>Source</th><th style={{ padding: 6, textAlign: "left" }}>Destination</th><th style={{ padding: 6, textAlign: "left" }}>Motif</th></tr></thead>
                  <tbody>
                    {transferts.map(t => (
                      <tr key={t.id} style={{ borderBottom: "1px solid #f0f3f6" }}>
                        <td style={{ padding: 6, fontSize: 11 }}>{t.created_at ? fmtDate(t.created_at) : "—"}</td>
                        <td style={{ padding: 6 }}>{t.depot_source_nom || (t.depot_source_id ? "Dépôt source" : "—")}</td>
                        <td style={{ padding: 6, fontWeight: 600 }}>{t.depot_dest_nom || (t.depot_destination_id ? "Dépôt destination" : "—")}</td>
                        <td style={{ padding: 6, fontSize: 11, color: "#5a6878" }}>{t.motif || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          </div>
        )}

        {/* Onglet immobilisation */}
        {activeTab === "immobilisation" && hasImmo && (
          <Panel style={{ borderLeft: "4px solid #5e4a8c" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 14, color: "#5e4a8c" }}><i className="ti ti-coin" /> Immobilisation comptable</h3>
            {!mat.immobilisation_active ? (
              <div style={{ padding: "16px 18px", background: "rgba(124,200,200,.10)", borderRadius: 8, borderLeft: "3px solid #7CC8C8" }}>
                <p style={{ margin: 0, fontSize: 13, color: "#1c5454" }}>
                  Ce matériel n'est pas immobilisé. Pour les DM ≥ 500€ HT avec durée de vie supérieure à 1 an, l'immobilisation comptable permet l'amortissement linéaire ou dégressif.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Date acquisition" value={mat.immobilisation_date_acquisition ? fmtDate(mat.immobilisation_date_acquisition) : null} />
                <Field label="Valeur acquisition" value={mat.immobilisation_valeur_acquisition ? fmtEur(mat.immobilisation_valeur_acquisition) : null} mono />
                <Field label="Durée amortissement" value={mat.immobilisation_duree_mois ? `${mat.immobilisation_duree_mois} mois (${(mat.immobilisation_duree_mois / 12).toFixed(1)} ans)` : null} />
                <Field label="Méthode" value={mat.immobilisation_methode || "linéaire"} />
                <Field label="Compte comptable" value={mat.immobilisation_compte} mono />
                <Field label="Référence fiche immo" value={mat.immobilisation_reference} mono />
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, color, icon }) {
  return (
    <div style={{ padding: "10px 14px", background: "#fff", border: "1px solid #e3e9ee", borderRadius: 10, borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 10.5, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>
        <i className={`ti ${icon}`} /> {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "Consolas, monospace" }}>{value}</div>
    </div>
  );
}

function Field({ label, value, mono, link }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10.5, color: "#8a98a8", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? (link ? "#185FA5" : "#142131") : "#cfd8e0", fontFamily: mono && value ? "Consolas, monospace" : "inherit", cursor: link ? "pointer" : "default" }} onClick={link || null}>
        {value || "—"}
        {link && value && <i className="ti ti-external-link" style={{ marginLeft: 4, fontSize: 11 }} />}
      </div>
    </div>
  );
}

function MvtTypeBadge({ type }) {
  const map = {
    "entree":          { lbl: "ENTRÉE",       color: "#5aa05a", icon: "ti-arrow-down" },
    "sortie":          { lbl: "SORTIE",       color: "#e35d5b", icon: "ti-arrow-up" },
    "transfert":       { lbl: "TRANSFERT",    color: "#7CC8C8", icon: "ti-arrows-right" },
    "sav_envoi":       { lbl: "SAV ENVOI",    color: "#185FA5", icon: "ti-tools" },
    "sav_retour":      { lbl: "SAV RETOUR",   color: "#5aa05a", icon: "ti-tools" },
    "rebut":           { lbl: "REBUT",        color: "#e35d5b", icon: "ti-trash" },
    "reaffectation":   { lbl: "RÉAFFECTATION", color: "#7a6fb0", icon: "ti-user" },
    "changement_etat": { lbl: "CHGT ÉTAT",    color: "#EF9F27", icon: "ti-edit" },
  };
  const m = map[type] || { lbl: (type || "?").toUpperCase(), color: "#8a98a8", icon: "ti-tag" };
  return (
    <span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: `${m.color}22`, color: m.color, display: "inline-flex", alignItems: "center", gap: 3 }}>
      <i className={`ti ${m.icon}`} /> {m.lbl}
    </span>
  );
}
