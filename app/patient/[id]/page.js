"use client";
// Page Fiche Patient — Vue 360° d'un patient : étiquettes, matériels
// affectés, DI, historique. Accessible via /patient/[id].
// Symétrique à /materiel/[id] livrée en 0.12.
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { logger } from "../../../lib/logger";
import TopBar from "../../TopBar";
import ContactActions from "../../ContactActions";
import { useCart } from "../../useCart";
import { Panel, StateMsg, Btn, Modal} from "../../ui";
import { fmtDate } from "../../../lib/format";
import Tooltip from "../../Tooltip";
import { safeInsert, safeDelete } from "../../../lib/safeWrite";

const COULEUR_DI = { "Nouvelle": "#e35d5b", "En cours": "#EF9F27", "Résolue": "#5aa05a", "Annulée": "#8a98a8" };

export default function FichePatient() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const auth = useAuth();
  const cart = useCart();
  const [pat, setPat] = useState(null);
  const [etiquettes, setEtiquettes] = useState([]);
  // Alpha 0.15 : gestion étiquettes depuis la fiche
  const [toutesEtiquettes, setToutesEtiquettes] = useState([]);
  const [etqModal, setEtqModal] = useState(false);
  const [materiels, setMateriels] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [historique, setHistorique] = useState([]);
  // Alpha 0.48.0 : consentements RGPD du patient
  const [consents, setConsents] = useState([]);
  // Alpha 0.42.0 : filtre par type matériel sur la timeline DI
  const [filtreMatDI, setFiltreMatDI] = useState("");
  // Alpha 0.56.18 : infos caisse + mutuelle pour boutons GPS/tel
  const [caisseInfo, setCaisseInfo] = useState(null);
  const [mutuelleInfo, setMutuelleInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const patId = params?.id;

  useEffect(() => {
    if (!auth.ready || !patId) return;
    (async () => {
      try {
        // Charger le patient + toutes ses relations en parallèle
        // Alpha 0.48.0 : + consentements RGPD
        const [{ data: p }, { data: etqs }, { data: links }, { data: mats }, { data: di }, { data: ev }, { data: cs }] = await Promise.all([
          supabase.from("patients").select("*, etablissements(nom)").eq("id", patId).single(),
          supabase.from("etiquettes").select("*"),
          supabase.from("patient_etiquettes").select("etiquette_id").eq("patient_id", patId),
          supabase.from("materiels").select("id, libelle, num_serie, num_parc, num_lot, etat, articles(libelle)").eq("patient_id", patId),
          supabase.from("interventions").select("*, materiels(id,libelle,num_serie,num_parc)").eq("patient_id", patId).order("created_at", { ascending: false }),
          supabase.from("audit_log").select("*").or(`details->>patient_id.eq.${patId}`).order("created_at", { ascending: false }).limit(20),
          // 0.58.36 : query défensive (fallback si colonnes manquantes en base — 400 reporté)
          (async () => {
            try {
              const r = await supabase
                .from("consentements_rgpd")
                .select("id, date_signature, a_consenti, date_expiration")
                .eq("patient_id", patId)
                .order("date_signature", { ascending: false });
              if (r.error) throw r.error;
              return r;
            } catch {
              try {
                const r = await supabase
                  .from("consentements_rgpd")
                  .select("id, date_signature")
                  .eq("patient_id", patId)
                  .order("date_signature", { ascending: false });
                return r;
              } catch {
                return { data: [] };
              }
            }
          })(),
        ]);
        setPat(p || null);
        const etqIds = (links || []).map((l) => l.etiquette_id);
        setEtiquettes((etqs || []).filter((e) => etqIds.includes(e.id)));
        setToutesEtiquettes(etqs || []);
        setMateriels(mats || []);
        setInterventions(di || []);
        setHistorique(ev || []);
        setConsents(cs || []);

        // 0.56.18 : charger en parallèle caisse + mutuelle si le patient en a une
        const promises = [];
        if (p?.caisse_id) {
          promises.push(
            supabase.from("caisses_assurance_maladie").select("*").eq("id", p.caisse_id).single()
              .then(r => setCaisseInfo(r.data || null))
              .catch(() => {})  // 0.57.5 : ignore si caisse pas trouvée
          );
        }
        if (p?.mutuelle_id) {
          promises.push(
            supabase.from("mutuelles").select("*").eq("id", p.mutuelle_id).single()
              .then(r => setMutuelleInfo(r.data || null))
              .catch(() => {})  // 0.57.5 : ignore si mutuelle pas trouvée
          );
        }
        await Promise.all(promises);
      } catch (e) {
        // 0.57.5 : try/catch englobant pour pas planter la page si Supabase répond mal
        logger.error("[Patient] load failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [auth.ready, patId]);

  // Alpha 0.15 : toggle étiquette directement depuis la fiche
  async function toggleEtq(etqId) {
    const dejaActive = etiquettes.some((e) => e.id === etqId);
    const userId = auth.user?.id;
    if (dejaActive) {
      await safeDelete(supabase, "patient_etiquettes", { patient_id: patId, etiquette_id: etqId }, { userId });
      setEtiquettes(etiquettes.filter((e) => e.id !== etqId));
    } else {
      await safeInsert(supabase, "patient_etiquettes", { patient_id: patId, etiquette_id: etqId, structure_id: auth.structureId }, { userId });
      const etq = toutesEtiquettes.find((e) => e.id === etqId);
      if (etq) setEtiquettes([...etiquettes, etq]);
    }
  }

  if (!auth.ready || loading) return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap"><Panel><StateMsg>Chargement…</StateMsg></Panel></div>
    </div>
  );

  if (!pat) return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <Panel><StateMsg>Patient introuvable.</StateMsg></Panel>
        <Btn variant="ghost" icon="ti-arrow-left" onClick={() => router.push("/patients")}>Retour à la liste</Btn>
      </div>
    </div>
  );

  // KPIs synthétiques
  const matEnLocation = materiels.filter((m) => m.etat === "En location").length;
  const diOuvertes = interventions.filter((d) => d.statut === "Nouvelle" || d.statut === "En cours").length;
  const diTotal = interventions.length;
  const diRecentes = interventions.filter((d) => {
    const date = new Date(d.created_at);
    return (Date.now() - date.getTime()) < 30 * 86400000;
  }).length;

  // Calcul de l'âge si date de naissance
  const age = pat.date_naissance ? Math.floor((Date.now() - new Date(pat.date_naissance)) / (365.25 * 86400000)) : null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <Btn variant="ghost" icon="ti-arrow-left" onClick={() => router.push("/patients")}>Retour à la liste</Btn>

        {/* Entête fiche */}
        <Panel style={{ marginTop: 12 }}>
          {/* 0.55.54 : fil d'Ariane pour clarifier qu'on est dans la fiche d'UN patient (pas une liste) */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#6c7a89", marginBottom: 8 }}>
            <button
              onClick={() => router.push("/patients")}
              style={{ background: "transparent", border: "none", color: "#185FA5", cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, textDecoration: "none" }}
              onMouseEnter={e => e.target.style.textDecoration = "underline"}
              onMouseLeave={e => e.target.style.textDecoration = "none"}
            >
              <i className="ti ti-arrow-left" /> Tous les patients
            </button>
            <span style={{ color: "#d3d9e0" }}>/</span>
            <span>Fiche de</span>
            <b style={{ color: "#142131" }}>{pat.nom} {pat.prenom || ""}</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 11, letterSpacing: 2, color: "#7CC8C8", fontWeight: 700 }}><i className="ti ti-user" /> FICHE PATIENT</span>
              <h1 style={{ margin: "8px 0 6px", fontSize: 24, color: "#142131" }}>{pat.nom} {pat.prenom || ""}</h1>
              {/* Ligne principale toujours visible : âge, chambre, établissement */}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, color: "#6c7a89", marginBottom: 10 }}>
                {age !== null && (
                  <Tooltip content={pat.date_naissance ? `Né(e) le ${fmtDate(pat.date_naissance)}` : "Date de naissance non renseignée"}>
                    <span><b>{age} ans</b></span>
                  </Tooltip>
                )}
                {pat.chambre && <span><b>Chambre</b> {pat.chambre}</span>}
                {pat.batiment && (
                  <Tooltip content={`Bâtiment ${pat.batiment}`} side="bottom">
                    <span><b>Bât.</b> {pat.batiment}</span>
                  </Tooltip>
                )}
                {pat.etablissements && <span><b>Étab.</b> {pat.etablissements.nom}</span>}
                {pat.numero_dossier && (
                  <Tooltip content={`Numéro de dossier : ${pat.numero_dossier}`} side="bottom">
                    <span><b>N°</b> {pat.numero_dossier}</span>
                  </Tooltip>
                )}
                {pat.medecin_traitant && (
                  <Tooltip content={`Médecin traitant : ${pat.medecin_traitant}`} side="bottom">
                    <span><i className="ti ti-stethoscope" style={{ color:"#185FA5" }} /> Médecin</span>
                  </Tooltip>
                )}
                {pat.date_entree && (
                  <Tooltip content={`Date d'entrée dans l'établissement : ${fmtDate(pat.date_entree)}`} side="bottom">
                    <span><i className="ti ti-calendar" style={{ color:"#7CC8C8" }} /> Entré le {fmtDate(pat.date_entree)}</span>
                  </Tooltip>
                )}
              </div>
              {/* Étiquettes */}
              {(etiquettes.length > 0 || (toutesEtiquettes.length > 0 && auth.can("ecrire"))) && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
                  {etiquettes.map((e) => (
                    <span key={e.id} className="etq-tag" style={{ background: e.couleur + "22", color: e.couleur, border: `1px solid ${e.couleur}44` }}>
                      <i className="ti ti-tag" /> {e.libelle}
                    </span>
                  ))}
                  {auth.can("ecrire") && toutesEtiquettes.length > 0 && (
                    <button onClick={() => setEtqModal(true)} style={{
                      padding: "3px 10px", border: "1px dashed #7CC8C8", color: "#2a5a5a",
                      background: "transparent", borderRadius: 12, fontSize: 12, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit",
                    }}>
                      <i className="ti ti-tags" /> Gérer
                    </button>
                  )}
                </div>
              )}
              {/* État */}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13.5 }}>
                <span><b>État :</b> <span style={{ color: pat.etat === "Présent" ? "#5aa05a" : "#8a98a8" }}>{pat.etat || "—"}</span></span>
              </div>
            </div>
            {auth.can("ecrire") && (
              <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                <Btn variant="ghost" icon="ti-printer" onClick={async () => {
                  // Alpha 0.19.0 : lazy load du module ficheToPdf
                  const { imprimerFichePatient } = await import("../../../lib/ficheToPdf");
                  imprimerFichePatient({ patient: pat, etiquettes, materiels, interventions });
                }}>Imprimer</Btn>
                <Btn variant="ghost" icon="ti-clipboard-heart" onClick={() => router.push(`/patient/${patId}/dashboard`)}>Dashboard santé</Btn>
                <Btn variant="ghost" icon="ti-edit" onClick={() => router.push(`/patient/${patId}/edit`)}>Édition complète</Btn>
              </div>
            )}
          </div>
        </Panel>

        {/* 0.56.18 : Coordonnées & contacts (téléphones patient/urgence/confiance, dossier, caisse, mutuelle) */}
        <CoordonneesPanel
          pat={pat}
          caisseInfo={caisseInfo}
          mutuelleInfo={mutuelleInfo}
        />

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginTop: 14 }}>
          <div className="kpi-tile">
            <span className="kpi-ic" style={{ background: "#185FA522", color: "#185FA5" }}><i className="ti ti-armchair-2" /></span>
            <span className="kpi-val">{materiels.length}</span>
            <span className="kpi-lbl">Matériels affectés</span>
          </div>
          <div className="kpi-tile">
            <span className="kpi-ic" style={{ background: "#5aa05a22", color: "#5aa05a" }}><i className="ti ti-check" /></span>
            <span className="kpi-val">{matEnLocation}</span>
            <span className="kpi-lbl">En location active</span>
          </div>
          <div className="kpi-tile">
            <span className="kpi-ic" style={{ background: "#e35d5b22", color: "#e35d5b" }}><i className="ti ti-tools" /></span>
            <span className="kpi-val">{diOuvertes}</span>
            <span className="kpi-lbl">DI ouvertes</span>
          </div>
          <div className="kpi-tile">
            <span className="kpi-ic" style={{ background: "#EF9F2722", color: "#EF9F27" }}><i className="ti ti-clock" /></span>
            <span className="kpi-val">{diRecentes}</span>
            <span className="kpi-lbl">DI 30 derniers j.</span>
          </div>
          {/* Alpha 0.48.0 : KPI RGPD */}
          <div className="kpi-tile">
            <span className="kpi-ic" style={{ 
              background: consents.find(c => c.a_consenti) ? "#5aa05a22" : consents.find(c => !c.a_consenti) ? "#c0392b22" : "#EF9F2722",
              color: consents.find(c => c.a_consenti) ? "#5aa05a" : consents.find(c => !c.a_consenti) ? "#c0392b" : "#EF9F27"
            }}>
              <i className={`ti ${consents.find(c => c.a_consenti) ? "ti-shield-check" : "ti-shield-half"}`} />
            </span>
            <span className="kpi-val">{consents.length}</span>
            <span className="kpi-lbl">RGPD ({consents.find(c => c.a_consenti) ? "OK" : consents.find(c => !c.a_consenti) ? "Refus" : "à recueillir"})</span>
          </div>
        </div>

        {/* Alpha 0.48.0 : Consentements RGPD */}
        {consents.length > 0 && (
          <Panel style={{ marginTop: 14 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 17 }}>
              <i className="ti ti-shield-check" style={{ color: "#5aa05a" }} /> Consentements RGPD ({consents.length})
            </h2>
            {consents.map((c) => (
              <div key={c.id} style={{
                background: c.a_consenti ? "#eef9ef" : "#fef0ee",
                border: `1px solid ${c.a_consenti ? "#bfe2bf" : "#f0c4be"}`,
                borderRadius: 8, padding: "10px 14px",
                marginBottom: 8,
                display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
              }}>
                <div>
                  <span style={{ fontWeight: 600, color: c.a_consenti ? "#2e6f33" : "#7a1f15" }}>
                    <i className={`ti ${c.a_consenti ? "ti-circle-check" : "ti-circle-x"}`} /> {c.a_consenti ? "Consenti" : "Refusé"}
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: "#8a98a8" }}>
                  Signé le {fmtDate(c.date_signature)}
                  {c.date_expiration && ` · Expire le ${fmtDate(c.date_expiration)}`}
                </div>
              </div>
            ))}
          </Panel>
        )}

        {/* Matériels affectés */}
        <Panel style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 17 }}><i className="ti ti-armchair-2" style={{ color: "#185FA5" }} /> Matériels affectés ({materiels.length})</h2>
            {auth.can("ecrire") && <Btn variant="ghost" icon="ti-plus" onClick={() => router.push("/materiels")}>Gérer</Btn>}
          </div>
          {materiels.length === 0 ? <StateMsg>Aucun matériel affecté à ce patient.</StateMsg> : (
            <table>
              <thead><tr><th>Libellé</th><th>Identifiants</th><th>Article</th><th>État</th></tr></thead>
              <tbody>
                {materiels.map((m) => {
                  const ids = [m.num_serie && `S/N ${m.num_serie}`, m.num_parc && `Parc ${m.num_parc}`, m.num_lot && `Lot ${m.num_lot}`].filter(Boolean).join(" · ");
                  return (
                    <tr key={m.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/materiel/${m.id}`)}>
                      <td style={{ fontWeight: 600, color: "#142131" }}>{m.libelle}</td>
                      <td style={{ fontSize: 12, color: "#8a98a8" }}>{ids || "—"}</td>
                      <td style={{ fontSize: 13 }}>{m.articles?.libelle || "—"}</td>
                      <td>
                        <span style={{ color: m.etat === "Disponible" ? "#5aa05a" : m.etat === "Maintenance" ? "#EF9F27" : "#185FA5", fontSize: 13, fontWeight: 600 }}>{m.etat || "—"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>

        {/* Interventions / DI — Alpha 0.42.0 : timeline + filtre matériel */}
        <Panel style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 17 }}>
              <i className="ti ti-tools" style={{ color: "#e35d5b" }} /> Demandes d'intervention ({interventions.length})
            </h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {interventions.length > 0 && (() => {
                const mats = [...new Set(interventions.map(d => d.materiels?.libelle).filter(Boolean))].sort();
                if (mats.length <= 1) return null;
                return (
                  <select
                    value={filtreMatDI || ""}
                    onChange={(e) => setFiltreMatDI(e.target.value)}
                    style={{ padding: "5px 9px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 12 }}
                  >
                    <option value="">Tous matériels</option>
                    {mats.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                );
              })()}
              {auth.can("ecrire") && <Btn variant="ghost" icon="ti-plus" onClick={() => router.push("/interventions")}>Créer une DI</Btn>}
            </div>
          </div>
          {(() => {
            const filtered = filtreMatDI 
              ? interventions.filter(d => d.materiels?.libelle === filtreMatDI)
              : interventions;
            if (filtered.length === 0) return <StateMsg>Aucune DI pour ce patient{filtreMatDI ? ` avec ${filtreMatDI}` : ""}.</StateMsg>;
            return (
              <div style={{ position: "relative", paddingLeft: 24 }}>
                {/* Ligne verticale timeline */}
                <div style={{ position: "absolute", left: 8, top: 8, bottom: 8, width: 2, background: "#e3e9ee" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {filtered.map((d) => (
                    <div key={d.id} style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: 12 }}>
                      {/* Dot timeline */}
                      <div style={{
                        position: "absolute", left: -22, top: 12, width: 12, height: 12, borderRadius: "50%",
                        background: COULEUR_DI[d.statut] || "#8a98a8",
                        border: "2px solid #fff", boxShadow: "0 0 0 1.5px " + (COULEUR_DI[d.statut] || "#8a98a8"),
                      }} />
                      {/* Card */}
                      <div
                        onClick={() => router.push("/interventions")}
                        style={{
                          flex: 1, padding: "10px 14px",
                          background: "#fff", border: "1px solid #e3e9ee", borderRadius: 10,
                          cursor: "pointer", transition: "border-color .15s",
                        }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = "#185FA5"}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = "#e3e9ee"}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: "#142131" }}>{d.numero}</span>
                            <span style={{ fontSize: 11.5, color: "#6c7a89" }}>{fmtDate(d.created_at)}</span>
                            {d.urgence === "Urgent" && (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: "#fef0ee", color: "#c0392b", textTransform: "uppercase", letterSpacing: ".3px" }}>
                                Urgent
                              </span>
                            )}
                          </div>
                          <span style={{ background: (COULEUR_DI[d.statut] || "#8a98a8") + "22", color: COULEUR_DI[d.statut] || "#8a98a8", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, border: `1px solid ${(COULEUR_DI[d.statut] || "#8a98a8")}44` }}>{d.statut}</span>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12.5, color: "#2a3a48" }}>
                          <i className="ti ti-tag" style={{ color: "#7a6fb0", marginRight: 4 }} /> {d.type}
                          {d.materiels && (
                            <span style={{ marginLeft: 12, color: "#6c7a89" }}>
                              <i className="ti ti-armchair-2" /> {d.materiels.libelle}
                              {d.materiels.num_parc && <span style={{ color: "#8a98a8", fontSize: 11 }}> (Parc {d.materiels.num_parc})</span>}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </Panel>

        {/* Historique d'événements */}
        {historique.length > 0 && (
          <Panel style={{ marginTop: 14 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 17 }}><i className="ti ti-history" style={{ color: "#7a6fb0" }} /> Activité récente ({historique.length})</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {historique.slice(0, 10).map((e) => (
                <div key={e.id} style={{ padding: "8px 12px", background: "#f4f7fa", borderRadius: 8, fontSize: 13 }}>
                  <span style={{ color: "#8a98a8", fontSize: 11 }}>{fmtDate(e.created_at)}</span>
                  {" — "}
                  <b>{e.action}</b> {e.entite}
                  {e.titre && <span style={{ color: "#6c7a89" }}> · {e.titre}</span>}
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>

      {/* Alpha 0.15 : modale gestion étiquettes patient */}
      <Modal
        open={etqModal}
        onClose={() => setEtqModal(false)}
        kind="patient"
        title={`Étiquettes — ${pat?.nom || ""} ${pat?.prenom || ""}`}
        footer={<Btn variant="primary" onClick={() => setEtqModal(false)}>Fermer</Btn>}
      >
        {toutesEtiquettes.length === 0 ? (
          <p style={{ color: "#6c7a89", fontSize: 13 }}>
            Aucune étiquette définie dans la collectivité. <a href="/etiquettes" style={{ color: "#2a5a5a", fontWeight: 600 }}>Créer une étiquette →</a>
          </p>
        ) : (
          <>
            <p style={{ color: "#6c7a89", fontSize: 13, marginTop: 0 }}>
              Clique pour basculer une étiquette. Les changements sont enregistrés immédiatement.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {toutesEtiquettes.map((e) => {
                const active = etiquettes.some((x) => x.id === e.id);
                return (
                  <button key={e.id} onClick={() => toggleEtq(e.id)} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", border: `2px solid ${active ? e.couleur : "#e3e9ee"}`,
                    background: active ? e.couleur + "1a" : "#fff",
                    borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                  }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="etq-tag" style={{ background: e.couleur + "22", color: e.couleur, border: `1px solid ${e.couleur}44` }}>
                        <i className="ti ti-tag" /> {e.libelle}
                      </span>
                      {e.description && <span style={{ color: "#8a98a8", fontSize: 12 }}>{e.description}</span>}
                    </span>
                    {active && <i className="ti ti-check" style={{ color: e.couleur, fontSize: 18 }} />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

// =============================================================
//  0.56.18 — Panel coordonnées & contacts
//  Affiche tous les numéros + entités contactables du patient
//  avec boutons GPS / Tel / Mail / Web via <ContactActions />
// =============================================================
function CoordonneesPanel({ pat, caisseInfo, mutuelleInfo }) {
  if (!pat) return null;

  // Helper : copie du n° dossier dans le presse-papier
  function copyToClipboard(text, label) {
    if (!text) return;
    try {
      navigator.clipboard?.writeText(text);
      // Simple feedback visuel (peut être amélioré avec un toast global)
      const btn = document.activeElement;
      if (btn?.tagName === "BUTTON") {
        const old = btn.innerHTML;
        btn.innerHTML = '<i class="ti ti-check"></i> Copié !';
        setTimeout(() => { btn.innerHTML = old; }, 1500);
      }
    } catch {}
  }

  // Entité patient construite à partir des colonnes "patients"
  const patientEntity = {
    telephone: pat.telephone_portable || pat.telephone_fixe,
    email: pat.email,
    adresse: pat.adresse,
    code_postal: pat.code_postal,
    ville: pat.ville,
  };
  const hasPatientCoords = !!(patientEntity.telephone || patientEntity.email || patientEntity.adresse);

  const urgenceEntity = pat.contact_urgence_telephone ? {
    telephone: pat.contact_urgence_telephone,
  } : null;

  const confianceEntity = pat.personne_confiance_telephone ? {
    telephone: pat.personne_confiance_telephone,
  } : null;

  const medecinEntity = pat.medecin_traitant_telephone ? {
    telephone: pat.medecin_traitant_telephone,
  } : null;

  // Si rien à afficher, masquer la panel
  const hasAnything = hasPatientCoords || urgenceEntity || confianceEntity || medecinEntity
    || pat.numero_dossier || pat.ipp || pat.numero_secu
    || caisseInfo || mutuelleInfo;
  if (!hasAnything) return null;

  return (
    <div style={{
      background: "#fff", border: "1px solid #e3e9ee", borderRadius: 12,
      padding: "16px 18px", marginTop: 14,
    }}>
      <h2 style={{ margin: "0 0 14px", fontSize: 16, color: "#142131" }}>
        <i className="ti ti-address-book" style={{ color: "#185FA5" }} /> Coordonnées & contacts
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>

        {/* Patient */}
        {hasPatientCoords && (
          <CoordRow
            icon="ti-user"
            color="#185FA5"
            label="Patient"
            value={[pat.telephone_portable && `📱 ${pat.telephone_portable}`, pat.telephone_fixe && `☎️ ${pat.telephone_fixe}`, pat.email].filter(Boolean).join(" · ")}
            entity={patientEntity}
          />
        )}

        {/* Contact d'urgence */}
        {urgenceEntity && (
          <CoordRow
            icon="ti-alert-triangle"
            color="#c0392b"
            label={`Urgence${pat.contact_urgence_nom ? ` : ${pat.contact_urgence_prenom || ""} ${pat.contact_urgence_nom}`.trim() : ""}`}
            sub={pat.contact_urgence_lien ? `(${pat.contact_urgence_lien})` : null}
            value={pat.contact_urgence_telephone}
            entity={urgenceEntity}
          />
        )}

        {/* Personne de confiance */}
        {confianceEntity && (
          <CoordRow
            icon="ti-heart-handshake"
            color="#7a6fb0"
            label={`Personne de confiance${pat.personne_confiance_nom ? ` : ${pat.personne_confiance_prenom || ""} ${pat.personne_confiance_nom}`.trim() : ""}`}
            value={pat.personne_confiance_telephone}
            entity={confianceEntity}
          />
        )}

        {/* Médecin traitant */}
        {(medecinEntity || pat.medecin_traitant) && (
          <CoordRow
            icon="ti-stethoscope"
            color="#5aa05a"
            label={`Médecin traitant${pat.medecin_traitant ? ` : ${pat.medecin_traitant_prenom || ""} ${pat.medecin_traitant}`.trim() : ""}`}
            sub={pat.medecin_traitant_rpps ? `RPPS ${pat.medecin_traitant_rpps}` : null}
            value={pat.medecin_traitant_telephone || "—"}
            entity={medecinEntity}
          />
        )}

        {/* Caisse */}
        {caisseInfo && (
          <CoordRow
            icon="ti-shield-check"
            color="#185FA5"
            label={`Caisse : ${caisseInfo.nom || "—"}`}
            sub={[caisseInfo.type_caisse, caisseInfo.code_organisme && `Code ${caisseInfo.code_organisme}`].filter(Boolean).join(" · ")}
            value={[caisseInfo.adresse, caisseInfo.cp, caisseInfo.ville].filter(Boolean).join(", ")}
            entity={caisseInfo}
          />
        )}

        {/* Mutuelle */}
        {mutuelleInfo && (
          <CoordRow
            icon="ti-heart-handshake"
            color="#7a6fb0"
            label={`Mutuelle : ${mutuelleInfo.raison_sociale || mutuelleInfo.nom_court || "—"}`}
            sub={[mutuelleInfo.type_organisme, mutuelleInfo.numero_amc && `AMC ${mutuelleInfo.numero_amc}`].filter(Boolean).join(" · ")}
            value={[mutuelleInfo.adresse, mutuelleInfo.cp, mutuelleInfo.ville].filter(Boolean).join(", ")}
            entity={mutuelleInfo}
          />
        )}

      </div>

      {/* Identifiants administratifs : dossier, IPP, n° SS, n° adhérent mutuelle */}
      {(pat.numero_dossier || pat.ipp || pat.numero_secu || pat.mutuelle_numero_adherent) && (
        <div style={{
          marginTop: 14, paddingTop: 14, borderTop: "1px dashed #e3e9ee",
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8,
        }}>
          {pat.numero_dossier && (
            <IdRow icon="ti-file" label="Dossier" value={pat.numero_dossier} onCopy={() => copyToClipboard(pat.numero_dossier, "Numéro de dossier")} />
          )}
          {pat.ipp && (
            <IdRow icon="ti-hash" label="IPP" value={pat.ipp} onCopy={() => copyToClipboard(pat.ipp, "IPP")} />
          )}
          {pat.numero_secu && (
            <IdRow icon="ti-shield" label="N° Sécurité Sociale" value={pat.numero_secu} onCopy={() => copyToClipboard(pat.numero_secu, "N° SS")} mono />
          )}
          {pat.mutuelle_numero_adherent && (
            <IdRow icon="ti-id-badge-2" label="N° Adhérent mutuelle" value={pat.mutuelle_numero_adherent} onCopy={() => copyToClipboard(pat.mutuelle_numero_adherent, "N° adhérent")} mono />
          )}
        </div>
      )}
    </div>
  );
}

function CoordRow({ icon, color, label, sub, value, entity }) {
  return (
    <div style={{
      background: "#f4f7fa", borderRadius: 8, padding: "10px 12px",
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 16 }} />
        <b style={{ fontSize: 12.5, color: "#142131" }}>{label}</b>
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "#6c7a89", marginBottom: 4, marginLeft: 22 }}>{sub}</div>
      )}
      {value && (
        <div style={{ fontSize: 12, color: "#2a3a48", marginBottom: 6, marginLeft: 22, wordBreak: "break-word" }}>
          {value}
        </div>
      )}
      <div style={{ marginLeft: 22 }}>
        <ContactActions entity={entity} size="sm" />
      </div>
    </div>
  );
}

function IdRow({ icon, label, value, onCopy, mono }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <i className={`ti ${icon}`} style={{ color: "#8a98a8", fontSize: 14 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, color: "#8a98a8", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.3 }}>{label}</div>
        <div style={{
          fontSize: 12.5, color: "#142131",
          fontFamily: mono ? "'Consolas', 'Menlo', monospace" : "inherit",
          fontWeight: 600,
        }}>{value}</div>
      </div>
      <button onClick={onCopy} title="Copier" style={{
        background: "#dbe7f5", color: "#185FA5",
        border: "none", padding: "4px 8px", borderRadius: 4,
        cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700,
      }}>
        <i className="ti ti-copy" /> Copier
      </button>
    </div>
  );
}
