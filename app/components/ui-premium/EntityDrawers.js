"use client";
// =============================================================
//  EntityDrawers — Drawer right pour chaque type d'entité
//  Réutilisable partout : patients, articles, matériels, dépôts...
//
//  Usage :
//    <PatientDrawer open={true} patientId={id} onClose={...} />
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase";
import EntityDrawer, { EntitySection, InfoField, InfoGrid, MiniKpi, Timeline } from "./EntityDrawer";

// =============================================================
// PATIENT DRAWER — dossier médical complet
// =============================================================
export function PatientDrawer({ open, patientId, onClose, onEdit }) {
  const supabase = createClient();
  const COLOR = "#7a6fb0";
  const [patient, setPatient] = useState(null);
  const [interventions, setInterventions] = useState([]);
  const [materiels, setMateriels] = useState([]);
  const [activeTab, setActiveTab] = useState("infos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !patientId) return;
    loadPatient();
  }, [open, patientId]);

  async function loadPatient() {
    setLoading(true);
    try {
      const [p, i, m] = await Promise.all([
        supabase.from("patients").select("*").eq("id", patientId).maybeSingle(),
        supabase.from("interventions").select("id, numero, type, statut, urgence, created_at, due_date").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(20),
        supabase.from("materiels").select("id, libelle, num_parc, statut").eq("patient_id", patientId).limit(20),
      ]);
      setPatient(p.data);
      setInterventions(i.data || []);
      setMateriels(m.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (!patient && !loading) return null;
  const age = patient?.date_naissance
    ? Math.floor((Date.now() - new Date(patient.date_naissance).getTime()) / (365.25 * 86400000))
    : null;

  const initials = patient ? `${(patient.prenom || "?")[0]}${(patient.nom || "?")[0]}`.toUpperCase() : "?";

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      color={COLOR}
      icon="ti-user"
      title={loading ? "Chargement..." : `${patient?.nom || ""} ${patient?.prenom || ""}`.trim() || "Patient"}
      subtitle={!loading && (age != null ? `${age} ans` : "") + (patient?.sexe ? ` · ${patient.sexe === "F" ? "Féminin" : patient.sexe === "M" ? "Masculin" : patient.sexe}` : "")}
      avatarText={initials}
      badge={patient?.gir ? `GIR ${patient.gir}` : null}
      tabs={[
        { key: "infos",      label: "Infos",         icon: "ti-info-circle", count: null },
        { key: "medical",    label: "Médical",       icon: "ti-stethoscope", count: null },
        { key: "interventions", label: "DI",         icon: "ti-tools",       count: interventions.length },
        { key: "materiels",  label: "Matériels",     icon: "ti-armchair-2",  count: materiels.length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      size="md"
      headerActions={
        onEdit && (
          <button onClick={() => onEdit(patient)} style={hBtn(COLOR)}>
            <i className="ti ti-edit" />
          </button>
        )
      }
    >
      {loading ? (
        <div style={{ color: "rgba(255,255,255,.6)", textAlign: "center", padding: 40 }}>
          <i className="ti ti-loader-2 av-spinning" style={{ fontSize: 32 }} />
          <div style={{ marginTop: 10 }}>Chargement du dossier...</div>
        </div>
      ) : !patient ? (
        <div style={{ color: "rgba(255,255,255,.6)", textAlign: "center", padding: 40 }}>Patient introuvable</div>
      ) : (
        <>
          {/* MINI KPIs en haut toujours visibles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
            <MiniKpi icon="ti-tools" color="#e35d5b" value={interventions.filter(i => !["Clôturée", "Refusée"].includes(i.statut)).length} label="DI ouvertes" />
            <MiniKpi icon="ti-armchair-2" color="#142131" value={materiels.length} label="Matériels" />
            <MiniKpi icon="ti-calendar" color={COLOR} value={age != null ? `${age}a` : "—"} label="Âge" />
          </div>

          {activeTab === "infos" && (
            <>
              <EntitySection title="Identité" icon="ti-id-badge" color={COLOR}>
                <InfoGrid>
                  <InfoField label="Nom" value={patient.nom} icon="ti-user" />
                  <InfoField label="Prénom" value={patient.prenom} icon="ti-user" />
                  <InfoField label="Date naissance" value={patient.date_naissance ? new Date(patient.date_naissance).toLocaleDateString("fr-FR") : null} icon="ti-cake" />
                  <InfoField label="Sexe" value={patient.sexe === "F" ? "Féminin" : patient.sexe === "M" ? "Masculin" : patient.sexe} icon="ti-gender-bigender" />
                  <InfoField label="GIR" value={patient.gir} icon="ti-stairs" />
                  <InfoField label="Mobilité" value={patient.mobilite} icon="ti-wheelchair" />
                </InfoGrid>
              </EntitySection>

              <EntitySection title="Coordonnées" icon="ti-map-pin" color="#7CC8C8">
                <InfoGrid>
                  <InfoField fullWidth label="Adresse" value={patient.adresse} icon="ti-home" copy />
                  <InfoField label="Code postal" value={patient.code_postal} icon="ti-map-pin" />
                  <InfoField label="Ville" value={patient.ville} icon="ti-map-pin" />
                  <InfoField label="Téléphone" value={patient.telephone} icon="ti-phone" copy color="#5aa05a" />
                  <InfoField label="Email" value={patient.email} icon="ti-mail" copy />
                </InfoGrid>
              </EntitySection>

              {(patient.contact_urgence_nom || patient.contact_urgence_telephone) && (
                <EntitySection title="Contact d'urgence" icon="ti-phone-call" color="#D45E5E">
                  <InfoGrid>
                    <InfoField label="Nom" value={patient.contact_urgence_nom} icon="ti-user" />
                    <InfoField label="Lien" value={patient.contact_urgence_lien} icon="ti-heart" />
                    <InfoField fullWidth label="Téléphone" value={patient.contact_urgence_telephone} icon="ti-phone" copy color="#D45E5E" />
                  </InfoGrid>
                </EntitySection>
              )}
            </>
          )}

          {activeTab === "medical" && (
            <>
              <EntitySection title="Données médicales" icon="ti-stethoscope" color="#D45E5E">
                <InfoGrid>
                  <InfoField label="GIR" value={patient.gir ? `GIR ${patient.gir}` : null} icon="ti-stairs" />
                  <InfoField label="Mobilité" value={patient.mobilite} icon="ti-wheelchair" />
                  <InfoField fullWidth label="Allergies" value={patient.allergies} icon="ti-alert-triangle" color="#EF9F27" />
                  <InfoField fullWidth label="Régime alimentaire" value={patient.regime_alimentaire} icon="ti-salad" />
                </InfoGrid>
              </EntitySection>

              {(patient.medecin_traitant || patient.medecin_traitant_telephone) && (
                <EntitySection title="Médecin traitant" icon="ti-stethoscope" color={COLOR}>
                  <InfoGrid>
                    <InfoField fullWidth label="Médecin" value={patient.medecin_traitant} icon="ti-user-md" />
                    <InfoField fullWidth label="Téléphone" value={patient.medecin_traitant_telephone} icon="ti-phone" copy color="#5aa05a" />
                  </InfoGrid>
                </EntitySection>
              )}

              {patient.notes && (
                <EntitySection title="Notes" icon="ti-notes" color="#EF9F27" defaultOpen={false}>
                  <div style={{ color: "rgba(255,255,255,.8)", fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                    {patient.notes}
                  </div>
                </EntitySection>
              )}
            </>
          )}

          {activeTab === "interventions" && (
            <EntitySection title={`Demandes d'intervention (${interventions.length})`} icon="ti-tools" color="#e35d5b" defaultOpen>
              {interventions.length === 0 ? (
                <p style={{ color: "rgba(255,255,255,.5)", margin: 0, fontSize: 12 }}>Aucune intervention enregistrée</p>
              ) : (
                <Timeline items={interventions.map(i => ({
                  date: i.created_at ? new Date(i.created_at).toLocaleDateString("fr-FR") : "",
                  title: `${i.numero || "—"} · ${i.type || ""}`,
                  description: `${i.statut || ""}${i.urgence ? ` · ${i.urgence}` : ""}`,
                  color: ["Clôturée", "Refusée"].includes(i.statut) ? "#888" : i.urgence === "critique" ? "#D45E5E" : "#e35d5b",
                }))} />
              )}
            </EntitySection>
          )}

          {activeTab === "materiels" && (
            <EntitySection title={`Matériels affectés (${materiels.length})`} icon="ti-armchair-2" color="#142131" defaultOpen>
              {materiels.length === 0 ? (
                <p style={{ color: "rgba(255,255,255,.5)", margin: 0, fontSize: 12 }}>Aucun matériel affecté</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {materiels.map(m => (
                    <div key={m.id} style={{
                      padding: "10px 12px",
                      background: "rgba(255,255,255,.04)",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,.06)",
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <i className="ti ti-armchair-2" style={{ color: "#142131", fontSize: 16, filter: "drop-shadow(0 0 4px #142131)" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{m.libelle}</div>
                        {m.num_parc && <div style={{ color: "rgba(255,255,255,.5)", fontSize: 11, fontFamily: "monospace" }}>{m.num_parc}</div>}
                      </div>
                      <span style={{ background: "rgba(255,255,255,.05)", padding: "2px 8px", borderRadius: 8, fontSize: 10, color: "rgba(255,255,255,.7)" }}>{m.statut || "—"}</span>
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
// ARTICLE DRAWER
// =============================================================
export function ArticleDrawer({ open, articleId, onClose, onEdit }) {
  const supabase = createClient();
  const COLOR = "#5a8f8f";
  const [article, setArticle] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [activeTab, setActiveTab] = useState("infos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !articleId) return;
    (async () => {
      setLoading(true);
      const [a, s] = await Promise.all([
        supabase.from("articles").select("*").eq("id", articleId).maybeSingle(),
        supabase.from("stock_articles").select("*, depot:depot_id(nom)").eq("article_id", articleId).limit(20),
      ]);
      setArticle(a.data);
      setStocks(s.data || []);
      setLoading(false);
    })();
  }, [open, articleId]);

  if (!article && !loading) return null;
  const totalStock = stocks.reduce((acc, s) => acc + (s.quantite || 0), 0);

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      color={COLOR}
      icon="ti-package"
      title={loading ? "Chargement..." : article?.libelle || "Article"}
      subtitle={article?.reference}
      badge={article?.actif === false ? "Inactif" : null}
      badgeColor="#888"
      tabs={[
        { key: "infos",  label: "Infos",  icon: "ti-info-circle" },
        { key: "stocks", label: "Stocks", icon: "ti-boxes", count: stocks.length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerActions={onEdit && <button onClick={() => onEdit(article)} style={hBtn(COLOR)}><i className="ti ti-edit" /></button>}
    >
      {loading ? <Loader /> : !article ? <Empty msg="Article introuvable" /> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
            <MiniKpi icon="ti-boxes" color={COLOR} value={totalStock} label="Stock total" />
            <MiniKpi icon="ti-building-warehouse" color="#EF9F27" value={stocks.length} label="Dépôts" />
            <MiniKpi icon="ti-currency-euro" color="#5aa05a" value={article.prix_unitaire ? `${article.prix_unitaire.toFixed(2)}€` : "—"} label="Prix" />
          </div>

          {activeTab === "infos" && (
            <>
              <EntitySection title="Référencement" icon="ti-id-badge" color={COLOR}>
                <InfoGrid>
                  <InfoField label="Référence" value={article.reference} icon="ti-tag" copy />
                  <InfoField label="Code barre" value={article.code_barre} icon="ti-barcode" copy />
                  <InfoField label="Marque" value={article.marque} icon="ti-bookmark" />
                  <InfoField label="Modèle" value={article.modele} icon="ti-info-circle" />
                  <InfoField label="Catégorie" value={article.categorie} icon="ti-category" />
                  <InfoField label="Famille" value={article.famille} icon="ti-folder" />
                </InfoGrid>
              </EntitySection>
              <EntitySection title="Tarification" icon="ti-currency-euro" color="#5aa05a">
                <InfoGrid>
                  <InfoField label="Prix unitaire" value={article.prix_unitaire ? `${article.prix_unitaire.toFixed(2)} €` : null} icon="ti-currency-euro" color="#5aa05a" />
                  <InfoField label="TVA" value={article.tva ? `${article.tva}%` : null} icon="ti-percentage" />
                  <InfoField label="Unité" value={article.unite} icon="ti-ruler" />
                  <InfoField label="Conditionnement" value={article.conditionnement} icon="ti-package" />
                </InfoGrid>
              </EntitySection>
              {article.description && (
                <EntitySection title="Description" icon="ti-file-text" color="#7CC8C8" defaultOpen={false}>
                  <div style={{ color: "rgba(255,255,255,.8)", fontSize: 13, whiteSpace: "pre-wrap" }}>{article.description}</div>
                </EntitySection>
              )}
            </>
          )}

          {activeTab === "stocks" && (
            <EntitySection title={`Stock par dépôt (${stocks.length})`} icon="ti-building-warehouse" color="#EF9F27" defaultOpen>
              {stocks.length === 0 ? <p style={{ color: "rgba(255,255,255,.5)", fontSize: 12 }}>Aucun stock</p> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {stocks.map(s => (
                    <div key={s.id} style={{ padding: "10px 12px", background: "rgba(255,255,255,.04)", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
                      <i className="ti ti-building-warehouse" style={{ color: "#EF9F27", filter: "drop-shadow(0 0 4px #EF9F27)" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{s.depot?.nom || "—"}</div>
                        {s.seuil_alerte != null && <div style={{ color: "rgba(255,255,255,.5)", fontSize: 11 }}>Seuil : {s.seuil_alerte}</div>}
                      </div>
                      <div style={{ color: s.quantite <= (s.seuil_alerte || 0) ? "#D45E5E" : "#fff", fontWeight: 800, fontSize: 16 }}>{s.quantite || 0}</div>
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
// MATERIEL DRAWER
// =============================================================
export function MaterielDrawer({ open, materielId, onClose, onEdit }) {
  const supabase = createClient();
  const COLOR = "#142131";
  const [materiel, setMateriel] = useState(null);
  const [interventions, setInterventions] = useState([]);
  const [activeTab, setActiveTab] = useState("infos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !materielId) return;
    (async () => {
      setLoading(true);
      const [m, i] = await Promise.all([
        supabase.from("materiels").select("*").eq("id", materielId).maybeSingle(),
        supabase.from("interventions").select("id, numero, type, statut, urgence, created_at").eq("materiel_id", materielId).order("created_at", { ascending: false }).limit(20),
      ]);
      setMateriel(m.data);
      setInterventions(i.data || []);
      setLoading(false);
    })();
  }, [open, materielId]);

  if (!materiel && !loading) return null;

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      color={COLOR}
      icon="ti-armchair-2"
      title={loading ? "Chargement..." : materiel?.libelle || "Matériel"}
      subtitle={materiel?.num_parc ? `N° parc : ${materiel.num_parc}` : null}
      badge={materiel?.statut}
      badgeColor={materiel?.statut === "actif" ? "#5aa05a" : materiel?.statut === "panne" ? "#D45E5E" : "#888"}
      tabs={[
        { key: "infos",  label: "Infos",  icon: "ti-info-circle" },
        { key: "interventions", label: "DI", icon: "ti-tools", count: interventions.length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerActions={onEdit && <button onClick={() => onEdit(materiel)} style={hBtn(COLOR)}><i className="ti ti-edit" /></button>}
    >
      {loading ? <Loader /> : !materiel ? <Empty msg="Matériel introuvable" /> : (
        <>
          {activeTab === "infos" && (
            <>
              <EntitySection title="Identification" icon="ti-id-badge" color={COLOR}>
                <InfoGrid>
                  <InfoField label="Libellé" value={materiel.libelle} icon="ti-armchair-2" fullWidth />
                  <InfoField label="N° parc" value={materiel.num_parc} icon="ti-barcode" copy />
                  <InfoField label="N° série" value={materiel.numero_serie} icon="ti-hash" copy />
                  <InfoField label="Fabricant/Série" value={materiel.fabricant_serie} icon="ti-bookmark" />
                  <InfoField label="Catégorie" value={materiel.categorie} icon="ti-category" />
                </InfoGrid>
              </EntitySection>
              <EntitySection title="État & localisation" icon="ti-map-pin" color="#EF9F27">
                <InfoGrid>
                  <InfoField label="Statut" value={materiel.statut} icon="ti-circle" />
                  <InfoField label="Emplacement" value={materiel.emplacement} icon="ti-map-pin" />
                  <InfoField fullWidth label="Notes état" value={materiel.notes_etat} icon="ti-notes" />
                </InfoGrid>
              </EntitySection>
            </>
          )}

          {activeTab === "interventions" && (
            <EntitySection title={`Historique interventions (${interventions.length})`} icon="ti-tools" color="#e35d5b" defaultOpen>
              {interventions.length === 0 ? <p style={{ color: "rgba(255,255,255,.5)", fontSize: 12 }}>Aucune intervention</p> : (
                <Timeline items={interventions.map(i => ({
                  date: i.created_at ? new Date(i.created_at).toLocaleDateString("fr-FR") : "",
                  title: `${i.numero || "—"} · ${i.type || ""}`,
                  description: `${i.statut || ""}${i.urgence ? ` · ${i.urgence}` : ""}`,
                  color: ["Clôturée", "Refusée"].includes(i.statut) ? "#888" : "#e35d5b",
                }))} />
              )}
            </EntitySection>
          )}
        </>
      )}
    </EntityDrawer>
  );
}

// Helpers internes
function hBtn(color) {
  return {
    width: 34, height: 34, borderRadius: 10,
    background: `${color}25`, border: `1px solid ${color}50`,
    color: "#fff", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 16,
    transition: "all 150ms",
  };
}
function Loader() {
  return <div style={{ color: "rgba(255,255,255,.6)", textAlign: "center", padding: 40 }}>
    <i className="ti ti-loader-2 av-spinning" style={{ fontSize: 32 }} /><div style={{ marginTop: 10 }}>Chargement...</div>
  </div>;
}
function Empty({ msg }) {
  return <div style={{ color: "rgba(255,255,255,.6)", textAlign: "center", padding: 40 }}>{msg}</div>;
}
