"use client";
// =============================================================
//  app/scan/bulletin-situation/page.js (Alpha 0.55.50)
//
//  OCR complet d'un bulletin de situation hospitalier.
//  1. Upload image (file ou camera) → 2. OCR via Claude Vision
//  → 3. Preview champs extraits édités → 4. Création patient
// =============================================================

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, StateMsg } from "../../ui";

export default function ScanBulletinSituationPage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState("upload");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [stats, setStats] = useState({ caisses: 0, mutuelles: 0 });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [createdPatientId, setCreatedPatientId] = useState(null);
  const [archiveWarning, setArchiveWarning] = useState(null);

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      const { count: nbC } = await supabase.from("caisses_assurance_maladie").select("*", { count: "exact", head: true });
      const { count: nbM } = await supabase.from("mutuelles").select("*", { count: "exact", head: true });
      setStats({ caisses: nbC || 0, mutuelles: nbM || 0 });
    })();
  }, [auth.ready]);

  function handleFile(f) {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { setError("Fichier trop volumineux (max 8 Mo)"); return; }
    setError(null);
    setFile(f);
    const r = new FileReader();
    r.onload = (e) => setFilePreview(e.target.result);
    r.readAsDataURL(f);
  }

  function onDrop(e) {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  }

  async function runOcr() {
    if (!file) return;
    setStep("ocr");
    setError(null);
    setLoading(true);
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = () => rej(new Error("Lecture fichier impossible"));
        r.readAsDataURL(file);
      });
      const res = await fetch("/api/ocr/bulletin-situation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: base64, media_type: file.type }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Erreur OCR");
        setStep("upload");
      } else {
        setOcrResult(data);
        setEditedData(data.data);
        setStep("review");
      }
    } catch (e) {
      setError(e.message);
      setStep("upload");
    } finally {
      setLoading(false);
    }
  }

  async function createPatient() {
    setLoading(true); setError(null);
    try {
      const token = (await supabase.auth.getSession()).data?.session?.access_token;
      // 0.56.1 : on transmet les méta-données du fichier source pour audit
      const res = await fetch("/api/patients/from-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          data: editedData,
          ocr_text_brut: ocrResult?.ocr_text,
          ocr_confiance: ocrResult?.confiance,
          ocr_tokens_in: ocrResult?.tokens?.input,
          ocr_tokens_out: ocrResult?.tokens?.output,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Erreur création");
        return;
      }

      const patientId = data.patient.id;
      setCreatedPatientId(patientId);

      // 0.56.1 : archivage du bulletin original dans Storage
      if (file && auth.structureId) {
        try {
          const { uploadBulletin } = await import("../../../lib/bulletinsStorage");
          const up = await uploadBulletin(supabase, file, {
            structureId: auth.structureId,
            patientId,
          });
          if (up.error) {
            // Patient créé OK, juste l'archivage qui foire — on log mais on continue
            setArchiveWarning(`Patient créé, mais archivage du bulletin échoué : ${up.error}`);
          } else {
            // Update patient avec le path + métadonnées du fichier
            await supabase.from("patients").update({
              bs_file_path: up.path,
              bs_file_mime: up.mime,
              bs_file_size_kb: up.size_kb,
            }).eq("id", patientId);
          }
        } catch (e) {
          setArchiveWarning(`Archivage échoué (non bloquant) : ${e.message}`);
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
    setStep("upload"); setFile(null); setFilePreview(null);
    setOcrResult(null); setEditedData({}); setError(null); setCreatedPatientId(null);
  }

  function setField(key, value) { setEditedData({ ...editedData, [key]: value }); }

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="OUTILS SCAN · OCR"
          icon="ti-file-scan"
          title="Créer un patient"
          accent="depuis un bulletin de situation"
          sub="Photographie ou téléverse le bulletin → l'IA extrait tout automatiquement"
        />

        <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
          <StepBadge n={1} label="Upload" active={step === "upload"} done={["ocr", "review", "create", "done"].includes(step)} />
          <StepBadge n={2} label="OCR IA" active={step === "ocr"} done={["review", "create", "done"].includes(step)} />
          <StepBadge n={3} label="Vérification" active={step === "review"} done={["done"].includes(step)} />
          <StepBadge n={4} label="Création" active={step === "create"} done={step === "done"} />
        </div>

        {error && <StateMsg type="error" icon="ti-alert-circle">{error}</StateMsg>}

        {step === "upload" && (
          <Panel>
            <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
              <i className="ti ti-upload" style={{ color: "#5aa05a", marginRight: 6 }} /> Téléverse le bulletin de situation
            </h3>
            <div
              onDrop={onDrop} onDragOver={(e) => e.preventDefault()}
              style={{
                border: "2px dashed #bfe2bf", borderRadius: 12, padding: 28, textAlign: "center",
                background: filePreview ? "#fff" : "#eef9ef", cursor: "pointer",
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {filePreview ? (
                <>
                  {file?.type === "application/pdf"
                    ? <div style={{ fontSize: 60 }}>📄</div>
                    : <img src={filePreview} alt="Aperçu" style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,.15)" }} />}
                  <div style={{ marginTop: 10, fontSize: 12.5, color: "#5aa05a", fontWeight: 700 }}>
                    <i className="ti ti-check" /> {file.name} ({Math.round(file.size / 1024)} Ko)
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setFile(null); setFilePreview(null); }} style={{ marginTop: 6, background: "transparent", border: "none", color: "#c0392b", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Changer de fichier</button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 48 }}>📷</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#2e6f33", marginTop: 8 }}>Glisse une photo ou clique pour parcourir</div>
                  <div style={{ fontSize: 11.5, color: "#6c7a89", marginTop: 6 }}>JPG, PNG, WEBP, PDF · Max 8 Mo</div>
                  <div style={{ marginTop: 10, fontSize: 11, color: "#7a4f15", background: "#fff8ec", padding: "6px 10px", borderRadius: 6, display: "inline-block" }}>
                    <i className="ti ti-info-circle" /> Sur mobile, l'option appareil photo est proposée automatiquement
                  </div>
                </>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" onChange={(e) => handleFile(e.target.files?.[0])} style={{ display: "none" }} />
            </div>
            {file && (
              <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={runOcr} disabled={loading} style={{
                  background: "linear-gradient(135deg, #5aa05a, #2e6f33)", color: "#fff", border: "none",
                  padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: loading ? "wait" : "pointer", fontFamily: "inherit",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}><i className="ti ti-wand" /> Lancer l'OCR IA</button>
              </div>
            )}
          </Panel>
        )}

        {step === "ocr" && (
          <Panel style={{ background: "linear-gradient(135deg, #eef9ef 0%, #fff 100%)", borderColor: "#bfe2bf", textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🔍</div>
            <h3 style={{ margin: 0, fontSize: 17, color: "#142131" }}>OCR en cours…</h3>
            <p style={{ fontSize: 12.5, color: "#6c7a89", margin: "6px 0 14px" }}>
              Claude analyse le bulletin et extrait les informations<br />
              Cela prend 5 à 15 secondes selon la qualité de l'image
            </p>
            <i className="ti ti-loader-2" style={{ fontSize: 32, color: "#5aa05a", animation: "spin 1s linear infinite" }} />
          </Panel>
        )}

        {step === "review" && editedData && (
          <>
            <Panel style={{
              marginBottom: 12,
              borderLeft: `4px solid ${ocrResult?.confiance === "haute" ? "#5aa05a" : "#EF9F27"}`,
              background: ocrResult?.confiance === "haute" ? "#eef9ef" : "#fff8ec",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <i className="ti ti-check-circle" style={{ fontSize: 22, color: "#5aa05a" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Extraction terminée — confiance <b>{ocrResult?.confiance}</b></div>
                  <div style={{ fontSize: 11, color: "#6c7a89" }}>
                    Durée {ocrResult?.duration_ms}ms · tokens IN {ocrResult?.tokens?.input} / OUT {ocrResult?.tokens?.output}
                  </div>
                </div>
                <button onClick={reset} style={{ background: "transparent", border: "1px solid #c0392b40", color: "#c0392b", padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                  <i className="ti ti-x" /> Recommencer
                </button>
              </div>
            </Panel>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.5fr)", gap: 12 }}>
              <Panel>
                <h3 style={{ margin: "0 0 8px", fontSize: 13 }}><i className="ti ti-photo" /> Bulletin source</h3>
                {file?.type === "application/pdf"
                  ? <div style={{ fontSize: 60, textAlign: "center", padding: 30 }}>📄</div>
                  : <img src={filePreview} alt="Bulletin" style={{ width: "100%", borderRadius: 6, border: "1px solid #e3e9ee" }} />}
              </Panel>

              <Panel>
                <h3 style={{ margin: "0 0 12px", fontSize: 14 }}><i className="ti ti-edit" style={{ color: "#185FA5" }} /> Champs extraits</h3>

                <Section title="Identité">
                  <Field label="Nom *" value={editedData.nom} onChange={v => setField("nom", v)} required />
                  <Field label="Prénom" value={editedData.prenom} onChange={v => setField("prenom", v)} />
                  <Field label="Nom naissance" value={editedData.nom_naissance} onChange={v => setField("nom_naissance", v)} />
                  <Field label="Sexe" value={editedData.sexe} onChange={v => setField("sexe", v)} />
                  <Field label="Date naissance" type="date" value={editedData.date_naissance} onChange={v => setField("date_naissance", v)} />
                  <Field label="Lieu naissance" value={editedData.lieu_naissance_ville} onChange={v => setField("lieu_naissance_ville", v)} />
                </Section>

                <Section title="Sécu sociale">
                  <Field label="N° Sécu" value={editedData.numero_secu} onChange={v => setField("numero_secu", v)} mono />
                  <Field label="Code organisme" value={editedData.code_organisme_rattachement} onChange={v => setField("code_organisme_rattachement", v)} mono />
                  <Field label="Caisse" value={editedData.nom_caisse} onChange={v => setField("nom_caisse", v)} />
                  <Field label="Régime" value={editedData.regime_secu} onChange={v => setField("regime_secu", v)} />
                </Section>

                <Section title="Mutuelle">
                  <Field label="Nom" value={editedData.mutuelle_nom} onChange={v => setField("mutuelle_nom", v)} />
                  <Field label="N° AMC" value={editedData.mutuelle_numero_amc} onChange={v => setField("mutuelle_numero_amc", v)} mono />
                  <Field label="N° adhérent" value={editedData.mutuelle_numero_adherent} onChange={v => setField("mutuelle_numero_adherent", v)} />
                </Section>

                <Section title="Adresse">
                  <Field label="Adresse" value={editedData.adresse} onChange={v => setField("adresse", v)} colSpan={2} />
                  <Field label="CP" value={editedData.code_postal} onChange={v => setField("code_postal", v)} mono />
                  <Field label="Ville" value={editedData.ville} onChange={v => setField("ville", v)} />
                </Section>

                <Section title="Médecin traitant">
                  <Field label="Nom" value={editedData.medecin_traitant_nom} onChange={v => setField("medecin_traitant_nom", v)} />
                  <Field label="Prénom" value={editedData.medecin_traitant_prenom} onChange={v => setField("medecin_traitant_prenom", v)} />
                  <Field label="RPPS" value={editedData.medecin_traitant_rpps} onChange={v => setField("medecin_traitant_rpps", v)} mono />
                </Section>

                <details style={{ marginTop: 8 }}>
                  <summary style={{ fontSize: 11, color: "#6c7a89", cursor: "pointer" }}>Voir texte OCR brut</summary>
                  <pre style={{ background: "#142131", color: "#e8edf2", padding: 8, borderRadius: 6, fontSize: 10.5, overflowX: "auto", marginTop: 6, maxHeight: 200, whiteSpace: "pre-wrap" }}>
                    {ocrResult?.ocr_text || "(aucun)"}
                  </pre>
                </details>

                <button onClick={createPatient} disabled={!editedData.nom || loading} style={{
                  width: "100%", marginTop: 14,
                  background: editedData.nom ? "linear-gradient(135deg, #5aa05a, #2e6f33)" : "#a0aeb9",
                  color: "#fff", border: "none", padding: "12px 18px", borderRadius: 10,
                  fontSize: 14, fontWeight: 700, cursor: editedData.nom ? "pointer" : "not-allowed",
                  fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  {loading ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> : <i className="ti ti-user-plus" />}
                  {loading ? "Création…" : "Créer le patient"}
                </button>
              </Panel>
            </div>
          </>
        )}

        {step === "done" && createdPatientId && (
          <Panel style={{ background: "linear-gradient(135deg, #eef9ef, #fff)", borderColor: "#bfe2bf", textAlign: "center", padding: 28 }}>
            <div style={{ fontSize: 60, marginBottom: 8 }}>✅</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 22, color: "#2e6f33" }}>Patient créé !</h2>
            <p style={{ fontSize: 13, color: "#6c7a89", margin: "0 0 8px" }}>
              <b>{editedData.prenom} {editedData.nom}</b> ajouté à la base.<br />
              Caisse et mutuelle ont été automatiquement liées si trouvées.
            </p>
            {/* 0.56.1 : info archivage Storage */}
            {!archiveWarning && file && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#dbe7f5", color: "#185FA5", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, marginBottom: 14 }}>
                <i className="ti ti-archive" /> Bulletin archivé dans Storage (visible dans l'onglet Audit de la fiche)
              </div>
            )}
            {archiveWarning && (
              <div style={{ background: "#fff8ec", border: "1px solid #f0d59f", color: "#7a4f15", padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 14, textAlign: "left" }}>
                <i className="ti ti-alert-triangle" /> <b>Archivage non bloqué :</b> {archiveWarning}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => router.push(`/patient/${createdPatientId}/edit`)} style={{ background: "#185FA5", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <i className="ti ti-arrow-right" /> Compléter la fiche
              </button>
              <button onClick={reset} style={{ background: "#fff", border: "1px solid #d3d9e0", color: "#142131", padding: "10px 18px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <i className="ti ti-refresh" /> Scanner un autre
              </button>
            </div>
          </Panel>
        )}

        <Panel style={{ marginTop: 14 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 13 }}><i className="ti ti-database" /> Référentiels disponibles pour auto-liaison</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
            <StatBox label="Caisses" value={stats.caisses} color="#185FA5" icon="ti-shield-check" />
            <StatBox label="Mutuelles" value={stats.mutuelles} color="#7a6fb0" icon="ti-heart-handshake" />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function StepBadge({ n, label, active, done }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 16,
      background: active ? "#185FA5" : done ? "#5aa05a" : "#f4f7fa",
      color: active || done ? "#fff" : "#6c7a89", fontSize: 11.5, fontWeight: 700,
    }}>
      <span style={{
        background: active || done ? "rgba(255,255,255,.3)" : "#d3d9e0",
        width: 20, height: 20, borderRadius: 10,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700,
      }}>{done ? "✓" : n}</span>
      {label}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10.5, color: "#185FA5", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 6 }}>{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", mono, required, colSpan }) {
  return (
    <div style={{ gridColumn: colSpan ? `span ${colSpan}` : undefined }}>
      <div style={{ fontSize: 10, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 700, marginBottom: 2 }}>
        {label}{required && <span style={{ color: "#c0392b" }}> *</span>}
      </div>
      <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} style={{
        width: "100%", boxSizing: "border-box", padding: "5px 8px",
        border: "1px solid #d3d9e0", borderRadius: 5, fontSize: 12,
        fontFamily: mono ? "Consolas, monospace" : "inherit", background: "#fff",
      }} />
    </div>
  );
}

function StatBox({ label, value, color, icon }) {
  return (
    <div style={{ background: "#f4f7fa", borderRadius: 6, padding: "8px 10px", borderLeft: `3px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#6c7a89", fontWeight: 600, textTransform: "uppercase" }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 11 }} /> {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color, marginTop: 2, fontFamily: "Consolas, monospace" }}>{value}</div>
    </div>
  );
}
