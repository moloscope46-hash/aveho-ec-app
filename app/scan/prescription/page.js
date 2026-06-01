"use client";
// =============================================================
//  app/scan/prescription/page.js (Alpha 0.56.3)
//
//  Scan d'une ordonnance médicale :
//    1. Upload image ou PDF
//    2. OCR Claude Vision → JSON structuré (prescripteur + médicaments)
//    3. Vérification/édition par l'utilisateur
//    4. Sélection du patient cible (avec recherche)
//    5. Création prescription + lignes + archivage Storage
// =============================================================

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import RppsVerifyBadge from "../../RppsVerifyBadge";
import { PageHead, Panel } from "../../ui";

// 0.56.3 : useSearchParams requiert un Suspense boundary à la racine
export default function ScanPrescriptionPageWrapper() {
  return (
    <Suspense fallback={null}>
      <ScanPrescriptionPage />
    </Suspense>
  );
}

function ScanPrescriptionPage() {
  const supabase = createClient();
  const auth = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const cart = useCart();

  // Si le patient est passé en query string ?patient_id=...
  const presetPatientId = params.get("patient_id");

  const [step, setStep] = useState("upload"); // upload | ocr | review | done
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [editedMeds, setEditedMeds] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState(presetPatientId || "");
  const [createdId, setCreatedId] = useState(null);
  const [archiveWarning, setArchiveWarning] = useState(null);

  // Charge la liste des patients pour le sélecteur
  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    (async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, nom, prenom, numero_dossier, date_naissance")
        .eq("structure_id", auth.structureId)
        .order("nom")
        .limit(500);
      setPatients(data || []);
    })();
  }, [auth.ready, auth.structureId]);

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    setError(null);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result);
      reader.readAsDataURL(f);
    } else {
      setFilePreview(null);
    }
  }

  async function runOcr() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setStep("ocr");
    try {
      const b64 = await fileToBase64(file);
      const res = await fetch("/api/ocr/prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: b64,
          media_type: file.type,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "OCR échoué");
        setStep("upload");
        return;
      }
      setOcrResult(data);
      // Précharge éditeur
      setEditedData({
        ...data.data,
        prescripteur: data.data?.prescripteur || {},
      });
      setEditedMeds(data.data?.medicaments || []);
      setStep("review");
    } catch (e) {
      setError(e.message);
      setStep("upload");
    } finally {
      setLoading(false);
    }
  }

  async function createPrescription() {
    if (!selectedPatientId) {
      setError("Sélectionne un patient");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const token = (await supabase.auth.getSession()).data?.session?.access_token;
      const res = await fetch("/api/prescriptions/from-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          structure_id: auth.structureId,
          etablissement_id: auth.etabId || null,
          data: { ...editedData, medicaments: editedMeds },
          ocr_text_brut: ocrResult?.ocr_text,
          ocr_confiance: editedData?.confiance,
          ocr_tokens_in: ocrResult?.tokens?.input,
          ocr_tokens_out: ocrResult?.tokens?.output,
        }),
      });
      const result = await res.json();
      if (!result.ok) {
        setError(result.error || "Création échouée");
        return;
      }

      const prescriptionId = result.prescription_id;
      setCreatedId(prescriptionId);

      // Archivage Storage (réutilise l'archi 0.56.1 mais bucket dédié)
      if (file && auth.structureId) {
        try {
          const { uploadPrescription } = await import("../../../lib/prescriptionsStorage");
          const up = await uploadPrescription(supabase, file, {
            structureId: auth.structureId,
            patientId: selectedPatientId,
            prescriptionId,
          });
          if (up.error) {
            setArchiveWarning(`Prescription créée, archivage échoué : ${up.error}`);
          } else {
            await supabase.from("prescriptions").update({
              fichier_path: up.path,
              fichier_mime: up.mime,
              fichier_size_kb: up.size_kb,
            }).eq("id", prescriptionId);
          }
        } catch (e) {
          setArchiveWarning(`Archivage non bloquant : ${e.message}`);
        }
      }

      setStep("done");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("upload");
    setFile(null); setFilePreview(null);
    setOcrResult(null); setEditedData({}); setEditedMeds([]);
    setError(null); setCreatedId(null); setArchiveWarning(null);
  }

  function updateMed(idx, key, value) {
    setEditedMeds(meds => meds.map((m, i) => i === idx ? { ...m, [key]: value } : m));
  }
  function removeMed(idx) {
    setEditedMeds(meds => meds.filter((_, i) => i !== idx));
  }
  function addMed() {
    setEditedMeds(meds => [...meds, { medicament_nom: "", posologie_libre: "" }]);
  }

  const filteredPatients = patientSearch
    ? patients.filter(p => {
        const q = patientSearch.toLowerCase();
        return (p.nom || "").toLowerCase().includes(q)
          || (p.prenom || "").toLowerCase().includes(q)
          || (p.numero_dossier || "").toLowerCase().includes(q);
      })
    : patients.slice(0, 50);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="OUTILS SCAN · ORDONNANCE"
          icon="ti-prescription"
          title="OCR Ordonnance"
          accent="(prescripteur + médicaments + posologie)"
          sub="Photo ou PDF d'ordonnance → extraction automatique des médicaments par Claude Vision"
        />

        {/* Stepper */}
        <Panel style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
            <Step n={1} label="Upload" active={step === "upload"} done={["ocr", "review", "done"].includes(step)} />
            <i className="ti ti-chevron-right" style={{ color: "#a0aeb9" }} />
            <Step n={2} label="OCR IA" active={step === "ocr"} done={["review", "done"].includes(step)} />
            <i className="ti ti-chevron-right" style={{ color: "#a0aeb9" }} />
            <Step n={3} label="Vérification" active={step === "review"} done={step === "done"} />
            <i className="ti ti-chevron-right" style={{ color: "#a0aeb9" }} />
            <Step n={4} label="Patient & création" active={step === "create"} done={step === "done"} />
          </div>
        </Panel>

        {/* Étape Upload */}
        {step === "upload" && (
          <Panel>
            <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>
              <i className="ti ti-cloud-upload" /> Charger une ordonnance
            </h3>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
              onChange={(e) => handleFile(e.target.files?.[0])}
              style={{ padding: 10, border: "2px dashed #d3d9e0", borderRadius: 8, width: "100%", fontSize: 12 }}
            />
            {file && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 12, color: "#6c7a89" }}>
                  <i className="ti ti-file" /> {file.name} · {Math.round(file.size / 1024)} Ko · {file.type}
                </p>
                {filePreview && (
                  <img src={filePreview} alt="Aperçu" style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 8, border: "1px solid #e3e9ee", marginTop: 8 }} />
                )}
                <button
                  onClick={runOcr}
                  disabled={loading}
                  style={{
                    marginTop: 12, background: "#5aa05a", color: "#fff", border: "none",
                    padding: "10px 20px", borderRadius: 6, fontSize: 13, fontWeight: 700,
                    cursor: loading ? "wait" : "pointer", fontFamily: "inherit",
                  }}
                >
                  <i className="ti ti-wand" /> Lancer l'OCR Claude Vision
                </button>
              </div>
            )}
          </Panel>
        )}

        {/* Étape OCR en cours */}
        {step === "ocr" && (
          <Panel style={{ textAlign: "center", padding: 40 }}>
            <i className="ti ti-loader-2" style={{ fontSize: 48, color: "#5aa05a", animation: "spin 1s linear infinite" }} />
            <h3 style={{ margin: "16px 0 6px", fontSize: 16 }}>OCR en cours…</h3>
            <p style={{ fontSize: 12, color: "#6c7a89" }}>Claude analyse l'ordonnance — peut prendre 5 à 15 secondes</p>
          </Panel>
        )}

        {/* Étape Review */}
        {step === "review" && ocrResult && (
          <>
            <Panel style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, fontSize: 14, flex: 1 }}>
                  <i className="ti ti-check" style={{ color: "#5aa05a" }} /> OCR terminé
                </h3>
                <Pill label={editedData.confiance || "?"} color={
                  editedData.confiance === "haute" ? "#5aa05a"
                  : editedData.confiance === "moyenne" ? "#EF9F27"
                  : "#c0392b"
                } />
                <span style={{ fontSize: 11, color: "#6c7a89" }}>
                  {ocrResult.duration_ms}ms · {ocrResult.tokens?.input || 0}+{ocrResult.tokens?.output || 0} tokens
                </span>
              </div>
            </Panel>

            {/* Prescripteur */}
            <Panel style={{ marginBottom: 12 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>
                <i className="ti ti-user-circle" style={{ color: "#7a6fb0" }} /> Prescripteur
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <Field label="Nom" value={editedData.prescripteur?.nom || ""} onChange={(v) => setEditedData({ ...editedData, prescripteur: { ...editedData.prescripteur, nom: v } })} />
                <Field label="Prénom" value={editedData.prescripteur?.prenom || ""} onChange={(v) => setEditedData({ ...editedData, prescripteur: { ...editedData.prescripteur, prenom: v } })} />
                <Field label="RPPS (11 chiffres)" mono value={editedData.prescripteur?.rpps || ""} onChange={(v) => setEditedData({ ...editedData, prescripteur: { ...editedData.prescripteur, rpps: v } })} />
                <Field label="Spécialité" value={editedData.prescripteur?.specialite || ""} onChange={(v) => setEditedData({ ...editedData, prescripteur: { ...editedData.prescripteur, specialite: v } })} />
                <Field label="Téléphone" mono value={editedData.prescripteur?.telephone || ""} onChange={(v) => setEditedData({ ...editedData, prescripteur: { ...editedData.prescripteur, telephone: v } })} />
                <Field label="FINESS" mono value={editedData.prescripteur?.finess || ""} onChange={(v) => setEditedData({ ...editedData, prescripteur: { ...editedData.prescripteur, finess: v } })} />
              </div>
              <div style={{ marginTop: 8 }}>
                <Field label="Adresse" value={editedData.prescripteur?.adresse || ""} onChange={(v) => setEditedData({ ...editedData, prescripteur: { ...editedData.prescripteur, adresse: v } })} />
              </div>
              {/* 0.56.5 : vérification automatique du RPPS contre l'annuaire ANS */}
              {editedData.prescripteur?.rpps && (
                <div style={{ marginTop: 10 }}>
                  <RppsVerifyBadge
                    rpps={editedData.prescripteur.rpps}
                    nomOcr={editedData.prescripteur.nom}
                    prenomOcr={editedData.prescripteur.prenom}
                    specialiteOcr={editedData.prescripteur.specialite}
                    onOfficialData={(official) => {
                      setEditedData({
                        ...editedData,
                        prescripteur: {
                          ...editedData.prescripteur,
                          nom: official.nom || editedData.prescripteur.nom,
                          prenom: official.prenom || editedData.prescripteur.prenom,
                          specialite: official.specialite || editedData.prescripteur.specialite,
                          finess: official.finess || editedData.prescripteur.finess,
                          adresse: [official.adresse, official.code_postal, official.ville].filter(Boolean).join(", ") || editedData.prescripteur.adresse,
                          telephone: official.telephone || editedData.prescripteur.telephone,
                        },
                        _rpps_verified: true,
                        _rpps_source: "ANS FHIR",
                      });
                    }}
                  />
                </div>
              )}
            </Panel>

            {/* Métadonnées ordonnance */}
            <Panel style={{ marginBottom: 12 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>
                <i className="ti ti-calendar-event" style={{ color: "#185FA5" }} /> Ordonnance
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                <Field label="Date" type="date" value={editedData.date_prescription || ""} onChange={(v) => setEditedData({ ...editedData, date_prescription: v })} />
                <FieldSelect label="Type" value={editedData.type_prescription || "ordonnance"} onChange={(v) => setEditedData({ ...editedData, type_prescription: v })} options={[
                  { v: "ordonnance", lbl: "Ordonnance simple" },
                  { v: "bizone", lbl: "Bizone (ALD)" },
                  { v: "medicaments_exception", lbl: "Médicaments d'exception" },
                  { v: "hospitaliere", lbl: "Hospitalière" },
                  { v: "securisee", lbl: "Sécurisée" },
                ]} />
                <Field label="Durée traitement" value={editedData.duree_traitement || ""} onChange={(v) => setEditedData({ ...editedData, duree_traitement: v })} />
                <Field label="Renouvellements" type="number" value={editedData.nb_renouvellements || 0} onChange={(v) => setEditedData({ ...editedData, nb_renouvellements: parseInt(v) || 0 })} />
              </div>
            </Panel>

            {/* Médicaments */}
            <Panel style={{ marginBottom: 12, background: "linear-gradient(135deg, #f3effa, #fff)", borderColor: "#d6c9ec" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, fontSize: 14, flex: 1 }}>
                  <i className="ti ti-pill" style={{ color: "#5a4a90" }} /> Médicaments
                  <span style={{ marginLeft: 6, background: "#f3effa", color: "#5a4a90", padding: "2px 8px", borderRadius: 8, fontSize: 11 }}>
                    {editedMeds.length}
                  </span>
                </h3>
                <button onClick={addMed} style={{ background: "#7a6fb0", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  <i className="ti ti-plus" /> Ajouter
                </button>
              </div>

              {editedMeds.length === 0 && (
                <p style={{ fontSize: 12, color: "#6c7a89", textAlign: "center", padding: 20 }}>
                  Aucun médicament détecté. Clique "Ajouter" pour en saisir manuellement.
                </p>
              )}

              {editedMeds.map((m, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid #e3e9ee", borderRadius: 8, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ background: "#5a4a90", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>#{i + 1}</span>
                    <b style={{ fontSize: 13, flex: 1 }}>{m.medicament_nom || "Médicament"}</b>
                    <button onClick={() => removeMed(i)} style={{ background: "transparent", color: "#c0392b", border: "none", fontSize: 18, cursor: "pointer" }}>×</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                    <Field label="Nom commercial" value={m.medicament_nom || ""} onChange={(v) => updateMed(i, "medicament_nom", v)} compact />
                    <Field label="DCI" value={m.medicament_dci || ""} onChange={(v) => updateMed(i, "medicament_dci", v)} compact />
                    <Field label="Forme" value={m.forme || ""} onChange={(v) => updateMed(i, "forme", v)} compact placeholder="comprimé, gélule…" />
                    <Field label="Dosage" mono value={m.dosage || ""} onChange={(v) => updateMed(i, "dosage", v)} compact placeholder="500 mg" />
                    <Field label="Voie" value={m.voie_administration || ""} onChange={(v) => updateMed(i, "voie_administration", v)} compact />
                    <Field label="Prises/jour" type="number" value={m.prises_par_jour || ""} onChange={(v) => updateMed(i, "prises_par_jour", parseInt(v) || null)} compact />
                    <Field label="Durée (jours)" type="number" value={m.duree_jours || ""} onChange={(v) => updateMed(i, "duree_jours", parseInt(v) || null)} compact />
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <Field label="Posologie complète" value={m.posologie_libre || ""} onChange={(v) => updateMed(i, "posologie_libre", v)} compact placeholder="1 comprimé matin et soir pendant 7 jours" />
                  </div>
                  {m.commentaire && (
                    <div style={{ marginTop: 6 }}>
                      <Field label="Commentaire" value={m.commentaire} onChange={(v) => updateMed(i, "commentaire", v)} compact />
                    </div>
                  )}
                </div>
              ))}
            </Panel>

            {/* Sélection patient */}
            <Panel style={{ marginBottom: 12, background: "#fff8ec", borderColor: "#f0d59f" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>
                <i className="ti ti-user" style={{ color: "#7a4f15" }} /> Patient destinataire
              </h3>
              {selectedPatient ? (
                <div style={{ background: "#dff5e0", padding: 10, borderRadius: 6, display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="ti ti-check" style={{ color: "#2e6f33" }} />
                  <span style={{ flex: 1 }}>
                    <b>{selectedPatient.nom}</b> {selectedPatient.prenom}
                    {selectedPatient.numero_dossier && <span style={{ marginLeft: 6, fontFamily: "Consolas, monospace", fontSize: 11, color: "#6c7a89" }}>n°{selectedPatient.numero_dossier}</span>}
                  </span>
                  <button onClick={() => setSelectedPatientId("")} style={{ background: "transparent", border: "1px solid #d3d9e0", color: "#142131", padding: "4px 10px", borderRadius: 4, fontSize: 11, cursor: "pointer" }}>
                    Changer
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="search"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Chercher un patient (nom, prénom, n° dossier)…"
                    style={{ width: "100%", boxSizing: "border-box", padding: 8, border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 12 }}
                  />
                  <div style={{ maxHeight: 200, overflowY: "auto", marginTop: 6, border: "1px solid #e3e9ee", borderRadius: 6 }}>
                    {filteredPatients.length === 0 && (
                      <p style={{ padding: 10, fontSize: 12, color: "#6c7a89", textAlign: "center" }}>Aucun patient trouvé</p>
                    )}
                    {filteredPatients.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPatientId(p.id)}
                        style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 10px", background: "#fff", border: "none", borderBottom: "1px solid #f4f7fa", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}
                      >
                        <b>{p.nom}</b> {p.prenom}
                        {p.numero_dossier && <span style={{ marginLeft: 6, fontFamily: "Consolas, monospace", fontSize: 10, color: "#a0aeb9" }}>n°{p.numero_dossier}</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </Panel>

            {error && (
              <Panel style={{ background: "#fce5e0", borderColor: "#f0c4be", marginBottom: 12 }}>
                <p style={{ margin: 0, color: "#7a2d23", fontSize: 12 }}>
                  <i className="ti ti-alert-circle" /> {error}
                </p>
              </Panel>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button onClick={reset} style={{ background: "#fff", color: "#142131", border: "1px solid #d3d9e0", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <i className="ti ti-x" /> Annuler
              </button>
              <button onClick={createPrescription} disabled={loading || !selectedPatientId} style={{
                background: !selectedPatientId ? "#a0aeb9" : "#5aa05a", color: "#fff", border: "none",
                padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: loading || !selectedPatientId ? "not-allowed" : "pointer", fontFamily: "inherit",
              }}>
                {loading ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> : <i className="ti ti-check" />}
                {loading ? " Création…" : " Créer la prescription"}
              </button>
            </div>
          </>
        )}

        {/* Étape Done */}
        {step === "done" && createdId && (
          <Panel style={{ background: "linear-gradient(135deg, #eef9ef, #fff)", borderColor: "#bfe2bf", textAlign: "center", padding: 28 }}>
            <div style={{ fontSize: 60, marginBottom: 8 }}>✅</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 22, color: "#2e6f33" }}>Prescription créée !</h2>
            <p style={{ fontSize: 13, color: "#6c7a89", margin: "0 0 8px" }}>
              <b>{editedMeds.length}</b> médicament(s) enregistré(s) pour <b>{selectedPatient?.nom} {selectedPatient?.prenom}</b>
            </p>
            {!archiveWarning && file && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#dbe7f5", color: "#185FA5", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, marginBottom: 14 }}>
                <i className="ti ti-archive" /> Ordonnance archivée dans Storage
              </div>
            )}
            {archiveWarning && (
              <div style={{ background: "#fff8ec", border: "1px solid #f0d59f", color: "#7a4f15", padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 14, textAlign: "left" }}>
                <i className="ti ti-alert-triangle" /> {archiveWarning}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => router.push(`/patient/${selectedPatientId}/edit?tab=prescriptions`)} style={{ background: "#185FA5", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <i className="ti ti-arrow-right" /> Voir la fiche patient
              </button>
              <button onClick={reset} style={{ background: "#fff", border: "1px solid #d3d9e0", color: "#142131", padding: "10px 18px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <i className="ti ti-refresh" /> Scanner une autre
              </button>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function Step({ n, label, active, done }) {
  const bg = done ? "#5aa05a" : active ? "#185FA5" : "#e3e9ee";
  const fg = done || active ? "#fff" : "#a0aeb9";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: bg, color: fg, padding: "6px 12px", borderRadius: 14, fontSize: 11, fontWeight: 700 }}>
      <span style={{ background: "rgba(255,255,255,.3)", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>{n}</span>
      {label}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, mono, compact }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 700, marginBottom: 3 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: compact ? "5px 8px" : "7px 10px",
          border: "1px solid #d3d9e0", borderRadius: 6,
          fontSize: compact ? 11.5 : 12.5,
          fontFamily: mono ? "Consolas, monospace" : "inherit",
        }}
      />
    </div>
  );
}

function FieldSelect({ label, value, onChange, options }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 700, marginBottom: 3 }}>{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", padding: "6px 10px", border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 12, background: "#fff" }}>
        {options.map(o => <option key={o.v} value={o.v}>{o.lbl}</option>)}
      </select>
    </div>
  );
}

function Pill({ label, color }) {
  return (
    <span style={{ background: color, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, textTransform: "uppercase" }}>
      {label}
    </span>
  );
}
