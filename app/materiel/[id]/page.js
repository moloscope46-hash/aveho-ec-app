"use client";
// Page Fiche Matériel — Vue 360° d'un équipement : tags, maintenances,
// DI, transferts, historique. Accessible via /materiel/[id].
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, StateMsg, Btn } from "../../ui";
import { fmtDate } from "../../../lib/format";
import { logger } from "../../../lib/logger";
import Tooltip from "../../Tooltip";

const COULEUR_DI = { "Nouvelle": "#e35d5b", "En cours": "#EF9F27", "Résolue": "#5aa05a", "Annulée": "#8a98a8" };
const COULEUR_MAINT = { "Planifiée": "#185FA5", "À faire": "#EF9F27", "Faite": "#5aa05a", "En retard": "#e35d5b", "Annulée": "#8a98a8" };

function statutMaintEffectif(m) {
  if (m.statut === "Faite" || m.statut === "Annulée") return m.statut;
  const aujourdhui = new Date().toISOString().slice(0, 10);
  if (m.date_prevue < aujourdhui) return "En retard";
  return m.statut;
}

export default function FicheMateriel() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const auth = useAuth();
  const cart = useCart();
  const [mat, setMat] = useState(null);
  const [tags, setTags] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [transferts, setTransferts] = useState([]);
  const [loading, setLoading] = useState(true);
  const matId = params?.id;

  useEffect(() => {
    if (!auth.ready || !matId) return;
    (async () => {
      try {
        // Charger le matériel + ses relations
        const [{ data: m }, { data: tg }, { data: links }, { data: mnt }, { data: di }, { data: trf }] = await Promise.all([
          supabase.from("materiels").select("*, articles(libelle, reference), patients(nom, prenom, chambre), depots(nom), zones(nom)").eq("id", matId).single(),
          supabase.from("tags_materiel").select("*"),
          supabase.from("materiel_tags").select("tag_id").eq("materiel_id", matId),
          supabase.from("maintenances").select("*").eq("materiel_id", matId).order("date_prevue", { ascending: false }),
          supabase.from("interventions").select("*").eq("materiel_id", matId).order("created_at", { ascending: false }),
          supabase.from("transferts").select("*, depots_source:depot_id_source(nom), depots_dest:depot_id_dest(nom)").eq("materiel_id", matId).order("created_at", { ascending: false }).limit(20),
        ]);
        setMat(m || null);
        // Filtrer les tags pour ne garder que ceux liés au matériel
        const tagIds = (links || []).map((l) => l.tag_id);
        setTags((tg || []).filter((t) => tagIds.includes(t.id)));
        setMaintenances(mnt || []);
        setInterventions(di || []);
        setTransferts(trf || []);
      } catch (e) {
        // 0.56.22 : try/catch pour pas planter la page
        logger.error("[Materiel] load failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [auth.ready, matId]);

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

  // KPIs synthétiques
  const maintenancesEnCours = maintenances.filter((m) => statutMaintEffectif(m) !== "Faite" && m.statut !== "Annulée").length;
  const maintenancesRetard = maintenances.filter((m) => statutMaintEffectif(m) === "En retard").length;
  const diOuvertes = interventions.filter((d) => d.statut === "Nouvelle" || d.statut === "En cours").length;
  const totalMnt = maintenances.length;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <Btn variant="ghost" icon="ti-arrow-left" onClick={() => router.push("/materiels")}>Retour à la liste</Btn>

        {/* Entête fiche */}
        <Panel style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 11, letterSpacing: 2, color: "#7CC8C8", fontWeight: 700 }}><i className="ti ti-armchair-2" /> FICHE MATÉRIEL</span>
              <h1 style={{ margin: "8px 0 6px", fontSize: 24, color: "#142131" }}>{mat.libelle}</h1>
              {/* Identifiants — principal visible, détails au survol (Alpha 0.16.1) */}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, color: "#6c7a89", marginBottom: 10 }}>
                {mat.num_serie && (
                  <Tooltip content={`Numéro de série constructeur : ${mat.num_serie}`}>
                    <span><b>S/N</b> {mat.num_serie}</span>
                  </Tooltip>
                )}
                {mat.num_parc && (
                  <Tooltip content={`Identifiant interne du parc Aveho : ${mat.num_parc}`}>
                    <span><b>Parc</b> {mat.num_parc}</span>
                  </Tooltip>
                )}
                {mat.num_lot && (
                  <Tooltip content={`Numéro de lot fabrication : ${mat.num_lot}`}>
                    <span><b>Lot</b> {mat.num_lot}</span>
                  </Tooltip>
                )}
                {mat.articles && (
                  <Tooltip content={`Catalogue : ${mat.articles.libelle}${mat.articles.reference ? ` — réf. ${mat.articles.reference}` : ""}`}>
                    <span><i className="ti ti-package" style={{ color: "#5a8f8f" }} /> Réf.</span>
                  </Tooltip>
                )}
              </div>
              {/* Tags */}
              {tags.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {tags.map((t) => (
                    <span key={t.id} className="etq-tag" style={{ background: t.couleur + "22", color: t.couleur, border: `1px solid ${t.couleur}44` }}>
                      <i className="ti ti-tag" /> {t.libelle}
                    </span>
                  ))}
                </div>
              )}
              {/* État + emplacements */}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13.5 }}>
                <span><b>État :</b> <span style={{ color: mat.etat === "Disponible" ? "#5aa05a" : mat.etat === "Maintenance" ? "#EF9F27" : "#185FA5" }}>{mat.etat || "—"}</span></span>
                {mat.depots && <span><b>Dépôt :</b> {mat.depots.nom}</span>}
                {mat.zones && <span><b>Zone :</b> {mat.zones.nom}</span>}
                {mat.patients && <span><b>Patient :</b> {mat.patients.nom} {mat.patients.prenom || ""}{mat.patients.chambre ? ` (ch.${mat.patients.chambre})` : ""}</span>}
              </div>
            </div>
            {auth.can("ecrire") && (
              <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                <Btn variant="ghost" icon="ti-printer" onClick={async () => {
                  // Alpha 0.19.0 : lazy load du module ficheToPdf (économise ~10KB au chargement initial)
                  const { imprimerFicheMateriel } = await import("../../../lib/ficheToPdf");
                  imprimerFicheMateriel({ materiel: mat, tags, maintenances, interventions, transferts });
                }}>Imprimer</Btn>
                <Btn variant="ghost" icon="ti-edit" onClick={() => router.push("/materiels")}>Modifier</Btn>
                {/* Alpha 0.16.1 : commander un remplacement */}
                <Btn variant="ghost" icon="ti-shopping-cart" onClick={() => {
                  const params = new URLSearchParams({
                    nouvelle: "oui",
                    designation: mat.libelle || mat.articles?.libelle || "Matériel",
                    motif: `Remplacement ${mat.libelle || ""}${mat.num_serie ? ` (S/N ${mat.num_serie})` : ""}`,
                    qte: "1",
                  });
                  router.push(`/achats?${params.toString()}`);
                }}>Commander remplacement</Btn>
              </div>
            )}
          </div>
        </Panel>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginTop: 14 }}>
          <div className="kpi-tile">
            <span className="kpi-ic" style={{ background: "#5a8f8f22", color: "#5a8f8f" }}><i className="ti ti-tool" /></span>
            <span className="kpi-val">{totalMnt}</span>
            <span className="kpi-lbl">Maintenances totales</span>
          </div>
          <div className="kpi-tile">
            <span className="kpi-ic" style={{ background: "#EF9F2722", color: "#EF9F27" }}><i className="ti ti-clock" /></span>
            <span className="kpi-val">{maintenancesEnCours}</span>
            <span className="kpi-lbl">À venir / en cours</span>
          </div>
          <div className="kpi-tile">
            <span className="kpi-ic" style={{ background: "#e35d5b22", color: "#e35d5b" }}><i className="ti ti-alert-triangle" /></span>
            <span className="kpi-val">{maintenancesRetard}</span>
            <span className="kpi-lbl">En retard</span>
          </div>
          <div className="kpi-tile">
            <span className="kpi-ic" style={{ background: "#7a6fb022", color: "#7a6fb0" }}><i className="ti ti-tools" /></span>
            <span className="kpi-val">{diOuvertes}</span>
            <span className="kpi-lbl">DI ouvertes</span>
          </div>
        </div>

        {/* Maintenances */}
        <Panel style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 17 }}><i className="ti ti-tool" style={{ color: "#5a8f8f" }} /> Maintenances ({maintenances.length})</h2>
            {auth.can("ecrire") && <Btn variant="ghost" icon="ti-plus" onClick={() => router.push("/maintenance")}>Planifier</Btn>}
          </div>
          {maintenances.length === 0 ? <StateMsg>Aucune maintenance enregistrée pour ce matériel.</StateMsg> : (
            <table>
              <thead><tr><th>Date prévue</th><th>Type</th><th>Intervenant</th><th>Statut</th></tr></thead>
              <tbody>
                {maintenances.map((m) => {
                  const st = statutMaintEffectif(m);
                  return (
                    <tr key={m.id}>
                      <td>{fmtDate(m.date_prevue)}{m.date_realisee && <div style={{ fontSize: 11, color: "#5aa05a" }}>Réalisée le {fmtDate(m.date_realisee)}</div>}</td>
                      <td>{m.type}</td>
                      <td style={{ fontSize: 13 }}>{m.intervenant || "—"}</td>
                      <td><span style={{ background: COULEUR_MAINT[st] + "22", color: COULEUR_MAINT[st], padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, border: `1px solid ${COULEUR_MAINT[st]}44` }}>{st}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>

        {/* Interventions / DI */}
        <Panel style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 17 }}><i className="ti ti-tools" style={{ color: "#e35d5b" }} /> Demandes d'intervention ({interventions.length})</h2>
            {auth.can("ecrire") && <Btn variant="ghost" icon="ti-plus" onClick={() => router.push("/interventions")}>Créer une DI</Btn>}
          </div>
          {interventions.length === 0 ? <StateMsg>Aucune DI pour ce matériel.</StateMsg> : (
            <table>
              <thead><tr><th>N°</th><th>Date</th><th>Type</th><th>Urgence</th><th>Statut</th></tr></thead>
              <tbody>
                {interventions.map((d) => (
                  <tr key={d.id} style={{ cursor: "pointer" }} onClick={() => router.push("/interventions")}>
                    <td style={{ fontWeight: 600 }}>{d.numero}</td>
                    <td>{fmtDate(d.created_at)}</td>
                    <td style={{ fontSize: 13 }}>{d.type}</td>
                    <td>{d.urgence || "—"}</td>
                    <td><span style={{ background: (COULEUR_DI[d.statut] || "#8a98a8") + "22", color: COULEUR_DI[d.statut] || "#8a98a8", padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, border: `1px solid ${COULEUR_DI[d.statut] || "#8a98a8"}44` }}>{d.statut}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        {/* Transferts récents */}
        <Panel style={{ marginTop: 14 }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 17 }}><i className="ti ti-transfer" style={{ color: "#185FA5" }} /> Derniers transferts ({transferts.length})</h2>
          {transferts.length === 0 ? <StateMsg>Aucun transfert enregistré pour ce matériel.</StateMsg> : (
            <table>
              <thead><tr><th>Date</th><th>Origine</th><th>Destination</th><th>Statut</th></tr></thead>
              <tbody>
                {transferts.map((t) => (
                  <tr key={t.id}>
                    <td>{fmtDate(t.created_at)}</td>
                    <td style={{ fontSize: 13 }}>{t.depots_source?.nom || "—"}</td>
                    <td style={{ fontSize: 13 }}>{t.depots_dest?.nom || "—"}</td>
                    <td>{t.statut || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  );
}
