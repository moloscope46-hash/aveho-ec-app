"use client";
// =============================================================
//  EntityDrawersExtra — 5 drawers supplémentaires
//  Intervention / Commande / Dépôt / Établissement / Pharmacie
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase";
import EntityDrawer, { EntitySection, InfoField, InfoGrid, MiniKpi, Timeline } from "./EntityDrawer";

const URGENCE_COLORS = {
  critique: "#D45E5E",
  haute:    "#EF9F27",
  normale:  "#7CC8C8",
  basse:    "#5aa05a",
};
const STATUT_COLORS = {
  "Clôturée": "#5aa05a", "Refusée": "#888", "En cours": "#EF9F27",
  "Affectée": "#7CC8C8", "Nouvelle": "#185FA5",
};

// =============================================================
// INTERVENTION DRAWER
// =============================================================
export function InterventionDrawer({ open, interventionId, onClose, onEdit }) {
  const supabase = createClient();
  const COLOR = "#e35d5b";
  const [intervention, setIntervention] = useState(null);
  const [activeTab, setActiveTab] = useState("infos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !interventionId) return;
    (async () => {
      setLoading(true);
      const r = await supabase.from("interventions").select(`
        *,
        materiel:materiel_id(libelle, num_parc, fabricant_serie),
        patient:patient_id(nom, prenom, telephone, ville)
      `).eq("id", interventionId).maybeSingle();
      setIntervention(r.data);
      setLoading(false);
    })();
  }, [open, interventionId]);

  if (!intervention && !loading) return null;
  const urgColor = URGENCE_COLORS[intervention?.urgence] || COLOR;
  const statColor = STATUT_COLORS[intervention?.statut] || COLOR;

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      color={COLOR}
      icon="ti-tools"
      title={loading ? "Chargement..." : intervention?.numero || "DI"}
      subtitle={intervention?.type}
      badge={intervention?.statut}
      badgeColor={statColor}
      tabs={[
        { key: "infos",   label: "Détails",    icon: "ti-info-circle" },
        { key: "patient", label: "Patient",    icon: "ti-user" },
        { key: "materiel",label: "Matériel",   icon: "ti-armchair-2" },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerActions={onEdit && <button onClick={() => onEdit(intervention)} style={hBtn(COLOR)}><i className="ti ti-edit" /></button>}
    >
      {loading ? <Loader /> : !intervention ? <Empty msg="Intervention introuvable" /> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
            <MiniKpi icon="ti-alert-triangle" color={urgColor} value={intervention.urgence || "—"} label="Urgence" />
            <MiniKpi icon="ti-activity" color={statColor} value={intervention.statut || "—"} label="Statut" />
            <MiniKpi icon="ti-calendar" color={COLOR} value={intervention.created_at ? new Date(intervention.created_at).toLocaleDateString("fr-FR") : "—"} label="Créée le" />
          </div>

          {activeTab === "infos" && (
            <>
              <EntitySection title="Demande d'intervention" icon="ti-tools" color={COLOR}>
                <InfoGrid>
                  <InfoField label="Numéro" value={intervention.numero} icon="ti-hash" copy />
                  <InfoField label="Type" value={intervention.type} icon="ti-category" />
                  <InfoField label="Statut" value={intervention.statut} icon="ti-activity" color={statColor} />
                  <InfoField label="Urgence" value={intervention.urgence} icon="ti-alert-triangle" color={urgColor} />
                  <InfoField label="Créée le" value={intervention.created_at ? new Date(intervention.created_at).toLocaleString("fr-FR") : null} icon="ti-calendar-plus" />
                  <InfoField label="Échéance" value={intervention.due_date ? new Date(intervention.due_date).toLocaleString("fr-FR") : null} icon="ti-calendar-clock" />
                  <InfoField label="Technicien" value={intervention.assignee_email} icon="ti-user-check" />
                  <InfoField label="Code lieu" value={intervention.code_lieu_arrivee} icon="ti-map-pin" />
                </InfoGrid>
              </EntitySection>
              {intervention.description && (
                <EntitySection title="Description" icon="ti-file-text" color="#EF9F27" defaultOpen>
                  <div style={{ color: "rgba(255,255,255,.85)", fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{intervention.description}</div>
                </EntitySection>
              )}
              {intervention.resolution && (
                <EntitySection title="Résolution" icon="ti-check-circle" color="#5aa05a" defaultOpen={false}>
                  <div style={{ color: "rgba(255,255,255,.85)", fontSize: 13, whiteSpace: "pre-wrap" }}>{intervention.resolution}</div>
                </EntitySection>
              )}
            </>
          )}

          {activeTab === "patient" && (
            <EntitySection title="Patient concerné" icon="ti-user" color="#7a6fb0" defaultOpen>
              {intervention.patient ? (
                <InfoGrid>
                  <InfoField label="Nom" value={intervention.patient.nom} icon="ti-user" />
                  <InfoField label="Prénom" value={intervention.patient.prenom} icon="ti-user" />
                  <InfoField label="Téléphone" value={intervention.patient.telephone} icon="ti-phone" copy color="#5aa05a" />
                  <InfoField label="Ville" value={intervention.patient.ville} icon="ti-map-pin" />
                </InfoGrid>
              ) : <p style={{ color: "rgba(255,255,255,.5)", fontSize: 12 }}>Aucun patient associé</p>}
            </EntitySection>
          )}

          {activeTab === "materiel" && (
            <EntitySection title="Matériel concerné" icon="ti-armchair-2" color="#142131" defaultOpen>
              {intervention.materiel ? (
                <InfoGrid>
                  <InfoField fullWidth label="Libellé" value={intervention.materiel.libelle} icon="ti-armchair-2" />
                  <InfoField label="N° parc" value={intervention.materiel.num_parc} icon="ti-hash" copy />
                  <InfoField label="Fabricant/Série" value={intervention.materiel.fabricant_serie} icon="ti-bookmark" />
                </InfoGrid>
              ) : <p style={{ color: "rgba(255,255,255,.5)", fontSize: 12 }}>Aucun matériel associé</p>}
            </EntitySection>
          )}
        </>
      )}
    </EntityDrawer>
  );
}

// =============================================================
// COMMANDE DRAWER
// =============================================================
export function CommandeDrawer({ open, commandeId, onClose, onEdit }) {
  const supabase = createClient();
  const COLOR = "#2a5a5a";
  const [commande, setCommande] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [activeTab, setActiveTab] = useState("infos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !commandeId) return;
    (async () => {
      setLoading(true);
      const [c, l] = await Promise.all([
        supabase.from("commandes").select("*").eq("id", commandeId).maybeSingle(),
        supabase.from("commande_lignes").select("*, article:article_id(libelle, reference)").eq("commande_id", commandeId).limit(50),
      ]);
      setCommande(c.data);
      setLignes(l.data || []);
      setLoading(false);
    })();
  }, [open, commandeId]);

  if (!commande && !loading) return null;
  const totalQte = lignes.reduce((acc, l) => acc + (l.quantite || 0), 0);

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      color={COLOR}
      icon="ti-shopping-bag"
      title={loading ? "Chargement..." : commande?.numero || "Commande"}
      subtitle={commande?.created_at ? new Date(commande.created_at).toLocaleDateString("fr-FR") : null}
      badge={commande?.statut}
      tabs={[
        { key: "infos",  label: "Infos",  icon: "ti-info-circle" },
        { key: "lignes", label: "Articles", icon: "ti-list", count: lignes.length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerActions={onEdit && <button onClick={() => onEdit(commande)} style={hBtn(COLOR)}><i className="ti ti-edit" /></button>}
    >
      {loading ? <Loader /> : !commande ? <Empty msg="Commande introuvable" /> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
            <MiniKpi icon="ti-list" color={COLOR} value={lignes.length} label="Lignes" />
            <MiniKpi icon="ti-package" color="#EF9F27" value={totalQte} label="Qte totale" />
            <MiniKpi icon="ti-currency-euro" color="#5aa05a" value={commande.montant_total ? `${commande.montant_total.toFixed(2)}€` : "—"} label="Total" />
          </div>

          {activeTab === "infos" && (
            <>
              <EntitySection title="Commande" icon="ti-shopping-bag" color={COLOR}>
                <InfoGrid>
                  <InfoField label="Numéro" value={commande.numero} icon="ti-hash" copy />
                  <InfoField label="Statut" value={commande.statut} icon="ti-activity" />
                  <InfoField label="Type" value={commande.type_commande} icon="ti-category" />
                  <InfoField label="Magasin" value={commande.magasin_id} icon="ti-building-store" />
                  <InfoField label="Créée le" value={commande.created_at ? new Date(commande.created_at).toLocaleString("fr-FR") : null} icon="ti-calendar" />
                  <InfoField label="Livraison" value={commande.date_livraison_prevue ? new Date(commande.date_livraison_prevue).toLocaleString("fr-FR") : null} icon="ti-truck" />
                </InfoGrid>
              </EntitySection>
              {commande.commentaire && (
                <EntitySection title="Commentaire" icon="ti-message" color="#EF9F27">
                  <div style={{ color: "rgba(255,255,255,.85)", fontSize: 13, whiteSpace: "pre-wrap" }}>{commande.commentaire}</div>
                </EntitySection>
              )}
            </>
          )}

          {activeTab === "lignes" && (
            <EntitySection title={`Lignes (${lignes.length})`} icon="ti-list" color={COLOR} defaultOpen>
              {lignes.length === 0 ? <p style={{ color: "rgba(255,255,255,.5)", fontSize: 12 }}>Aucune ligne</p> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {lignes.map(l => (
                    <div key={l.id} style={{ padding: "10px 12px", background: "rgba(255,255,255,.04)", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${COLOR}30`, color: COLOR, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>
                        ×{l.quantite}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{l.article?.libelle || l.designation || "—"}</div>
                        {l.article?.reference && <div style={{ color: "rgba(255,255,255,.5)", fontSize: 11, fontFamily: "monospace" }}>{l.article.reference}</div>}
                      </div>
                      {l.prix_unitaire && <div style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{l.prix_unitaire.toFixed(2)} €</div>}
                    </div>
                  ))}
                </div>
              )}
            </EntitySection>
          )}
        </>
      )}
    </EntityDrawer>
  );
}

// =============================================================
// DEPOT DRAWER
// =============================================================
export function DepotDrawer({ open, depotId, onClose, onEdit }) {
  const supabase = createClient();
  const COLOR = "#EF9F27";
  const [depot, setDepot] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [activeTab, setActiveTab] = useState("infos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !depotId) return;
    (async () => {
      setLoading(true);
      const [d, s] = await Promise.all([
        supabase.from("depots").select("*").eq("id", depotId).maybeSingle(),
        supabase.from("stock_articles").select("*, article:article_id(libelle, reference)").eq("depot_id", depotId).limit(30),
      ]);
      setDepot(d.data);
      setStocks(s.data || []);
      setLoading(false);
    })();
  }, [open, depotId]);

  if (!depot && !loading) return null;
  const totalStock = stocks.reduce((acc, s) => acc + (s.quantite || 0), 0);
  const enAlerte = stocks.filter(s => s.quantite <= (s.seuil_alerte || 0)).length;

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      color={COLOR}
      icon="ti-building-warehouse"
      title={loading ? "Chargement..." : depot?.nom || "Dépôt"}
      subtitle={depot?.code}
      tabs={[
        { key: "infos",  label: "Infos",  icon: "ti-info-circle" },
        { key: "stocks", label: "Stocks", icon: "ti-boxes", count: stocks.length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerActions={onEdit && <button onClick={() => onEdit(depot)} style={hBtn(COLOR)}><i className="ti ti-edit" /></button>}
    >
      {loading ? <Loader /> : !depot ? <Empty msg="Dépôt introuvable" /> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
            <MiniKpi icon="ti-boxes" color={COLOR} value={stocks.length} label="Articles" />
            <MiniKpi icon="ti-package" color="#5a8f8f" value={totalStock} label="Qté totale" />
            <MiniKpi icon="ti-alert-triangle" color={enAlerte > 0 ? "#D45E5E" : "#5aa05a"} value={enAlerte} label="En alerte" />
          </div>

          {activeTab === "infos" && (
            <EntitySection title="Coordonnées dépôt" icon="ti-building-warehouse" color={COLOR}>
              <InfoGrid>
                <InfoField label="Code" value={depot.code} icon="ti-hash" copy />
                <InfoField label="Type" value={depot.type} icon="ti-category" />
                <InfoField fullWidth label="Adresse" value={depot.adresse} icon="ti-home" copy />
                <InfoField label="CP" value={depot.code_postal} icon="ti-map-pin" />
                <InfoField label="Ville" value={depot.ville} icon="ti-map-pin" />
                <InfoField label="Téléphone" value={depot.telephone} icon="ti-phone" copy color="#5aa05a" />
                <InfoField label="Email" value={depot.email} icon="ti-mail" copy />
              </InfoGrid>
            </EntitySection>
          )}

          {activeTab === "stocks" && (
            <EntitySection title={`Stocks (${stocks.length})`} icon="ti-boxes" color={COLOR} defaultOpen>
              {stocks.length === 0 ? <p style={{ color: "rgba(255,255,255,.5)", fontSize: 12 }}>Aucun stock</p> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {stocks.map(s => {
                    const enAlerte = s.quantite <= (s.seuil_alerte || 0);
                    return (
                      <div key={s.id} style={{ padding: "10px 12px", background: enAlerte ? "rgba(212,94,94,.08)" : "rgba(255,255,255,.04)", borderRadius: 10, display: "flex", alignItems: "center", gap: 10, border: enAlerte ? "1px solid #D45E5E40" : "1px solid transparent" }}>
                        <i className="ti ti-package" style={{ color: enAlerte ? "#D45E5E" : COLOR, filter: `drop-shadow(0 0 4px ${enAlerte ? "#D45E5E" : COLOR})` }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{s.article?.libelle || "—"}</div>
                          {s.article?.reference && <div style={{ color: "rgba(255,255,255,.5)", fontSize: 11, fontFamily: "monospace" }}>{s.article.reference}</div>}
                        </div>
                        <div style={{ color: enAlerte ? "#D45E5E" : "#fff", fontSize: 16, fontWeight: 800 }}>{s.quantite || 0}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </EntitySection>
          )}
        </>
      )}
    </EntityDrawer>
  );
}

// =============================================================
// ETABLISSEMENT DRAWER
// =============================================================
export function EtablissementDrawer({ open, etabId, onClose, onEdit }) {
  const supabase = createClient();
  const COLOR = "#C9867F";
  const [etab, setEtab] = useState(null);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState("infos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !etabId) return;
    (async () => {
      setLoading(true);
      const [e, p, i, b, s] = await Promise.all([
        supabase.from("etablissements").select("*").eq("id", etabId).maybeSingle(),
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("etablissement_id", etabId),
        supabase.from("interventions").select("id", { count: "exact", head: true }).eq("etablissement_id", etabId).neq("statut", "Clôturée").neq("statut", "Refusée"),
        supabase.from("batiments").select("id", { count: "exact", head: true }).eq("etablissement_id", etabId),
        supabase.from("services").select("id", { count: "exact", head: true }).eq("etablissement_id", etabId),
      ]);
      setEtab(e.data);
      setStats({
        patients: p.count || 0,
        interventions: i.count || 0,
        batiments: b.count || 0,
        services: s.count || 0,
      });
      setLoading(false);
    })();
  }, [open, etabId]);

  if (!etab && !loading) return null;

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      color={COLOR}
      icon="ti-building-hospital"
      title={loading ? "Chargement..." : etab?.nom || "Établissement"}
      subtitle={etab?.code}
      badge={etab?.type}
      tabs={[
        { key: "infos", label: "Infos", icon: "ti-info-circle" },
        { key: "stats", label: "Stats", icon: "ti-chart-bar" },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerActions={onEdit && <button onClick={() => onEdit(etab)} style={hBtn(COLOR)}><i className="ti ti-edit" /></button>}
    >
      {loading ? <Loader /> : !etab ? <Empty msg="Établissement introuvable" /> : (
        <>
          {activeTab === "infos" && (
            <>
              <EntitySection title="Identification" icon="ti-id-badge" color={COLOR}>
                <InfoGrid>
                  <InfoField label="Nom" value={etab.nom} icon="ti-building" fullWidth />
                  <InfoField label="Code" value={etab.code} icon="ti-hash" copy />
                  <InfoField label="Type" value={etab.type} icon="ti-category" />
                  <InfoField label="N° FINESS" value={etab.numero_finess} icon="ti-id-badge" copy />
                  <InfoField label="SIRET" value={etab.siret} icon="ti-building" copy />
                </InfoGrid>
              </EntitySection>
              <EntitySection title="Coordonnées" icon="ti-map-pin" color="#7CC8C8">
                <InfoGrid>
                  <InfoField fullWidth label="Adresse" value={etab.adresse} icon="ti-home" copy />
                  <InfoField label="CP" value={etab.code_postal} icon="ti-map-pin" />
                  <InfoField label="Ville" value={etab.ville} icon="ti-map-pin" />
                  <InfoField label="Téléphone" value={etab.telephone} icon="ti-phone" copy color="#5aa05a" />
                  <InfoField label="Email" value={etab.email} icon="ti-mail" copy />
                </InfoGrid>
              </EntitySection>
            </>
          )}
          {activeTab === "stats" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              <MiniKpi icon="ti-users" color="#7a6fb0" value={stats.patients} label="Patients" />
              <MiniKpi icon="ti-tools" color="#e35d5b" value={stats.interventions} label="DI ouvertes" />
              <MiniKpi icon="ti-building" color="#5a8f8f" value={stats.batiments} label="Bâtiments" />
              <MiniKpi icon="ti-stethoscope" color="#5aa05a" value={stats.services} label="Services" />
            </div>
          )}
        </>
      )}
    </EntityDrawer>
  );
}

// =============================================================
// PHARMACIE DRAWER
// =============================================================
export function PharmacieDrawer({ open, pharmacieId, onClose, onEdit }) {
  const supabase = createClient();
  const COLOR = "#5aa05a";
  const [pharmacie, setPharmacie] = useState(null);
  const [casiers, setCasiers] = useState([]);
  const [activeTab, setActiveTab] = useState("infos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !pharmacieId) return;
    (async () => {
      setLoading(true);
      const [p, c] = await Promise.all([
        supabase.from("pharmacies").select("*").eq("id", pharmacieId).maybeSingle(),
        supabase.from("pharmacie_casiers").select("*").eq("pharmacie_id", pharmacieId),
      ]);
      setPharmacie(p.data);
      setCasiers(c.data || []);
      setLoading(false);
    })();
  }, [open, pharmacieId]);

  if (!pharmacie && !loading) return null;

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      color={COLOR}
      icon="ti-medical-cross"
      title={loading ? "Chargement..." : pharmacie?.nom || "Pharmacie"}
      subtitle={pharmacie?.code}
      tabs={[
        { key: "infos",  label: "Infos",   icon: "ti-info-circle" },
        { key: "casiers",label: "Casiers", icon: "ti-box-multiple", count: casiers.length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerActions={onEdit && <button onClick={() => onEdit(pharmacie)} style={hBtn(COLOR)}><i className="ti ti-edit" /></button>}
    >
      {loading ? <Loader /> : !pharmacie ? <Empty msg="Pharmacie introuvable" /> : (
        <>
          {activeTab === "infos" && (
            <>
              <EntitySection title="Identification" icon="ti-medical-cross" color={COLOR}>
                <InfoGrid>
                  <InfoField label="Nom" value={pharmacie.nom} icon="ti-medical-cross" fullWidth />
                  <InfoField label="Code" value={pharmacie.code} icon="ti-hash" />
                  <InfoField label="N° FINESS" value={pharmacie.numero_finess} icon="ti-id-badge" copy />
                  <InfoField label="N° Pharmacie" value={pharmacie.numero_pharmacie} icon="ti-id-badge" copy />
                </InfoGrid>
              </EntitySection>
              <EntitySection title="Pharmacien titulaire" icon="ti-user-md" color="#7a6fb0">
                <InfoGrid>
                  <InfoField fullWidth label="Nom" value={pharmacie.pharmacien_titulaire_nom} icon="ti-user-md" />
                  <InfoField label="RPPS" value={pharmacie.pharmacien_titulaire_rpps} icon="ti-id-badge" copy />
                  <InfoField label="Téléphone" value={pharmacie.telephone} icon="ti-phone" copy color="#5aa05a" />
                </InfoGrid>
              </EntitySection>
            </>
          )}
          {activeTab === "casiers" && (
            <EntitySection title={`Casiers (${casiers.length})`} icon="ti-box-multiple" color={COLOR} defaultOpen>
              {casiers.length === 0 ? <p style={{ color: "rgba(255,255,255,.5)", fontSize: 12 }}>Aucun casier</p> : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {casiers.map(c => (
                    <div key={c.id} style={{ padding: "10px", background: "rgba(255,255,255,.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,.06)" }}>
                      <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>{c.code}</div>
                      <div style={{ color: "rgba(255,255,255,.6)", fontSize: 11 }}>{c.libelle || c.type_casier}</div>
                    </div>
                  ))}
                </div>
              )}
            </EntitySection>
          )}
        </>
      )}
    </EntityDrawer>
  );
}

// Helpers
function hBtn(color) {
  return { width: 34, height: 34, borderRadius: 10, background: `${color}25`, border: `1px solid ${color}50`, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 };
}
function Loader() {
  return <div style={{ color: "rgba(255,255,255,.6)", textAlign: "center", padding: 40 }}><i className="ti ti-loader-2 av-spinning" style={{ fontSize: 32 }} /><div style={{ marginTop: 10 }}>Chargement...</div></div>;
}
function Empty({ msg }) {
  return <div style={{ color: "rgba(255,255,255,.6)", textAlign: "center", padding: 40 }}>{msg}</div>;
}
