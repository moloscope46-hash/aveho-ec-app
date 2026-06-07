"use client";
// =============================================================
//  /bilan-sav/[id] — Exécution d'un bilan SAV (0.62.32)
//  5 points de contrôle + photos + signature technicien
//  → puis validation EC avec signature étab
// =============================================================
import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn, Modal } from "../../ui";
import BackButton from "../../components/BackButton";

// 5 points de contrôle standards (peuvent être customisés par article)
const POINTS_DEFAUT = [
  { n: 1, libelle: "Aspect général", description: "État visuel, propreté, signes d'usure" },
  { n: 2, libelle: "Fonctionnement principal", description: "Mise en marche, cycles, performance" },
  { n: 3, libelle: "Sécurité électrique / mécanique", description: "Câbles, fixations, alarmes" },
  { n: 4, libelle: "Conformité normes", description: "Étiquettes, marquages, mises à jour" },
  { n: 5, libelle: "Accessoires & consommables", description: "Pièces fournies, niveau, état" },
];

const RESULTATS = [
  { v: "conforme",     l: "✅ Conforme",       col: "#5aa05a" },
  { v: "reparable",    l: "🔧 Réparable",      col: "#EF9F27" },
  { v: "non_conforme", l: "⚠ Non conforme",   col: "#e35d5b" },
  { v: "a_remplacer",  l: "♻ À remplacer",    col: "#c0392b" },
];

export default function BilanSAVPage({ params }) {
  const p = use(params);
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();

  const [bilan, setBilan] = useState(null);
  const [points, setPoints] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validModal, setValidModal] = useState(null);
  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    reload();
  }, [auth.ready, auth.structureId]);

  async function reload() {
    setLoading(true);
    try {
      const r = await supabase.from("bilans_sav").select("*").eq("id", p.id).maybeSingle();
      if (r.error?.code === "42P01") { setTableMissing(true); setLoading(false); return; }
      if (r.error || !r.data) {
        // Pas trouvé → créer (l'ID peut être un sav_id en query "?new=true&sav_id=...")
        setLoading(false);
        return;
      }
      const b = r.data;
      setBilan(b);
      // Initialise les 5 points si vide
      const pts = Array.isArray(b.points) && b.points.length > 0 ? b.points : POINTS_DEFAUT.map(d => ({ ...d, conforme: null, commentaire: "" }));
      setPoints(pts);
      // Photos
      const ph = await supabase.from("bilans_sav_photos").select("*").eq("bilan_id", p.id).order("taken_at");
      setPhotos(ph.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function savePoints(newPoints) {
    setPoints(newPoints);
    if (!bilan) return;
    try {
      await supabase.from("bilans_sav").update({ points: newPoints, updated_at: new Date().toISOString() }).eq("id", bilan.id);
    } catch (e) { console.warn(e); }
  }

  function updatePoint(idx, patch) {
    const newPts = [...points];
    newPts[idx] = { ...newPts[idx], ...patch };
    savePoints(newPts);
  }

  async function uploadPhoto(file, pointN = null) {
    if (!file || !bilan) return;
    setSaving(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const filename = `bilan-${bilan.id}/${Date.now()}-pt${pointN || "global"}.${ext}`;
      // Upload Storage
      const up = await supabase.storage.from("sav-photos").upload(filename, file, { upsert: false });
      let url = filename;
      if (up.error) {
        // Bucket missing → fallback data URL en base64
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = reader.result;
          const ins = await supabase.from("bilans_sav_photos").insert({
            bilan_id: bilan.id, point_n: pointN, url: dataUrl, filename: file.name,
            taille_octets: file.size, taken_by: auth.user?.id,
          });
          if (!ins.error) reload();
        };
        reader.readAsDataURL(file);
        return;
      }
      // Signed URL pour affichage
      const signed = await supabase.storage.from("sav-photos").createSignedUrl(filename, 3600 * 24 * 365);
      url = signed.data?.signedUrl || filename;
      await supabase.from("bilans_sav_photos").insert({
        bilan_id: bilan.id, point_n: pointN, url, filename: file.name,
        taille_octets: file.size, taken_by: auth.user?.id,
      });
      reload();
    } catch (e) { alert("Erreur upload : " + e.message); }
    finally { setSaving(false); }
  }

  async function terminer() {
    if (!bilan) return;
    if (points.some(p => p.conforme === null)) {
      if (!confirm("Certains points ne sont pas évalués. Terminer quand même ?")) return;
    }
    setSaving(true);
    try {
      const r = await supabase.from("bilans_sav").update({
        statut: "termine",
        date_fin: new Date().toISOString(),
        points,
        resultat: bilan.resultat || "conforme",
        diagnostic: bilan.diagnostic || null,
        preconisations: bilan.preconisations || null,
      }).eq("id", bilan.id);
      if (r.error) throw r.error;
      alert("✓ Bilan terminé. En attente de validation côté EC.");
      reload();
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="bg-dark"><TopBar cartCount={cart.count} auth={auth} /><div style={{ padding: 40, textAlign: "center" }}>Chargement…</div></div>;

  if (tableMissing) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="page-content" style={{ padding: 24 }}>
          <Panel style={{ borderLeft: "4px solid #e35d5b", background: "rgba(227,93,91,.06)" }}>
            <div style={{ color: "#c0392b", fontSize: 13 }}>
              ⚠ Table <code>bilans_sav</code> manquante. Applique <a href="/sql/migration-0.62.32-bilans-sav.sql" target="_blank" style={{ color: "#185FA5", fontWeight: 700 }}>migration-0.62.32-bilans-sav.sql</a>.
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  if (!bilan) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="page-content" style={{ padding: 24 }}>
          <BackButton />
          <PageHead icon="ti-clipboard-list" title="Bilan SAV introuvable" subtitle="Crée un bilan depuis une demande SAV" />
        </div>
      </div>
    );
  }

  const isEditable = bilan.statut === "en_cours";
  const isReadOnly = ["valide_ec", "refuse_ec"].includes(bilan.statut);

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content" style={{ padding: "20px 24px", maxWidth: 900 }}>
        <BackButton />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <PageHead icon="ti-clipboard-check" title={`Bilan SAV ${bilan.numero || "—"}`} subtitle={`Statut : ${bilan.statut}`} />
          <div style={{ display: "flex", gap: 8 }}>
            {isEditable && <Btn variant="primary" icon="ti-check" onClick={terminer} disabled={saving}>Terminer bilan</Btn>}
            <Btn variant="ghost" icon="ti-printer" onClick={() => exportPDF(bilan, points, photos)}>PDF</Btn>
          </div>
        </div>

        {/* Statut */}
        <Panel style={{ marginTop: 12, borderLeft: `4px solid ${statutColor(bilan.statut)}`, background: `${statutColor(bilan.statut)}10` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <div>
              <div style={{ fontSize: 10.5, color: "#5a6878", fontWeight: 700, textTransform: "uppercase" }}>Technicien</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{bilan.technicien_nom || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: "#5a6878", fontWeight: 700, textTransform: "uppercase" }}>Début</div>
              <div style={{ fontSize: 13 }}>{bilan.date_debut ? new Date(bilan.date_debut).toLocaleString("fr-FR") : "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: "#5a6878", fontWeight: 700, textTransform: "uppercase" }}>Fin</div>
              <div style={{ fontSize: 13 }}>{bilan.date_fin ? new Date(bilan.date_fin).toLocaleString("fr-FR") : <em style={{ color: "#8a98a8" }}>En cours</em>}</div>
            </div>
          </div>
        </Panel>

        {/* 5 points de contrôle */}
        <Panel style={{ marginTop: 12 }}>
          <h3 style={{ margin: "0 0 14px", color: "#185FA5" }}>📋 5 Points de contrôle</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {points.map((pt, idx) => {
              const ptPhotos = photos.filter(p => p.point_n === pt.n);
              return (
                <div key={pt.n} style={{
                  background: "#fff", border: `2px solid ${pt.conforme === true ? "#5aa05a" : pt.conforme === false ? "#e35d5b" : "#e3e9ee"}`,
                  borderRadius: 10, padding: 12,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#142131" }}>
                        <span style={{ background: "#185FA5", color: "#fff", width: 24, height: 24, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", marginRight: 8, fontSize: 12 }}>{pt.n}</span>
                        {pt.libelle}
                      </div>
                      <div style={{ fontSize: 11, color: "#5a6878", marginLeft: 32, marginTop: 2 }}>{pt.description}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button disabled={!isEditable} onClick={() => updatePoint(idx, { conforme: true })} style={{
                        background: pt.conforme === true ? "#5aa05a" : "transparent",
                        color: pt.conforme === true ? "#fff" : "#5aa05a",
                        border: "2px solid #5aa05a",
                        borderRadius: 6, padding: "4px 10px",
                        fontFamily: "inherit", fontSize: 11, fontWeight: 700, cursor: isEditable ? "pointer" : "default",
                        opacity: isEditable ? 1 : 0.6,
                      }}>✓ OK</button>
                      <button disabled={!isEditable} onClick={() => updatePoint(idx, { conforme: false })} style={{
                        background: pt.conforme === false ? "#e35d5b" : "transparent",
                        color: pt.conforme === false ? "#fff" : "#e35d5b",
                        border: "2px solid #e35d5b",
                        borderRadius: 6, padding: "4px 10px",
                        fontFamily: "inherit", fontSize: 11, fontWeight: 700, cursor: isEditable ? "pointer" : "default",
                        opacity: isEditable ? 1 : 0.6,
                      }}>✗ KO</button>
                    </div>
                  </div>
                  <textarea
                    value={pt.commentaire || ""}
                    onChange={(e) => updatePoint(idx, { commentaire: e.target.value })}
                    disabled={!isEditable}
                    placeholder={pt.conforme === false ? "Décris l'anomalie..." : "Commentaire (optionnel)..."}
                    style={{
                      width: "100%", marginTop: 8, padding: "6px 10px",
                      border: "1px solid #cfd8e0", borderRadius: 6,
                      fontFamily: "inherit", fontSize: 12.5, minHeight: 40,
                      background: isEditable ? "#fff" : "#f4f7fa",
                    }}
                  />

                  {/* Photos du point */}
                  <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {ptPhotos.map(ph => (
                      <a key={ph.id} href={ph.url} target="_blank" rel="noreferrer" style={{ display: "block", width: 70, height: 70, borderRadius: 6, overflow: "hidden", border: "1px solid #cfd8e0" }}>
                        <img src={ph.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </a>
                    ))}
                    {isEditable && (
                      <label style={{
                        background: "#7CC8C8", color: "#fff",
                        border: "none", borderRadius: 6, padding: "8px 12px",
                        fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                        display: "inline-flex", alignItems: "center", gap: 4,
                      }}>
                        <i className="ti ti-camera" /> Photo
                        <input type="file" accept="image/*" capture="environment" onChange={(e) => uploadPhoto(e.target.files?.[0], pt.n)} style={{ display: "none" }} />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Synthèse */}
        <Panel style={{ marginTop: 12 }}>
          <h3 style={{ margin: "0 0 12px", color: "#185FA5" }}>📝 Synthèse globale</h3>

          {/* Résultat */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#5a6878", letterSpacing: 1 }}>Résultat</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              {RESULTATS.map(r => (
                <button key={r.v} disabled={!isEditable} onClick={() => { setBilan({ ...bilan, resultat: r.v }); supabase.from("bilans_sav").update({ resultat: r.v }).eq("id", bilan.id); }} style={{
                  background: bilan.resultat === r.v ? r.col : "transparent",
                  color: bilan.resultat === r.v ? "#fff" : r.col,
                  border: `2px solid ${r.col}`, borderRadius: 6,
                  padding: "6px 12px", fontFamily: "inherit",
                  fontSize: 12, fontWeight: 700, cursor: isEditable ? "pointer" : "default",
                  opacity: isEditable ? 1 : 0.7,
                }}>{r.l}</button>
              ))}
            </div>
          </div>

          {/* Diagnostic + Préco */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ fontSize: 11, color: "#5a6878", fontWeight: 700, textTransform: "uppercase" }}>Diagnostic
              <textarea defaultValue={bilan.diagnostic || ""} disabled={!isEditable}
                onBlur={(e) => supabase.from("bilans_sav").update({ diagnostic: e.target.value }).eq("id", bilan.id)}
                placeholder="Causes identifiées..." style={{ width: "100%", marginTop: 4, padding: 8, border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 13, minHeight: 70, background: isEditable ? "#fff" : "#f4f7fa" }} />
            </label>
            <label style={{ fontSize: 11, color: "#5a6878", fontWeight: 700, textTransform: "uppercase" }}>Préconisations
              <textarea defaultValue={bilan.preconisations || ""} disabled={!isEditable}
                onBlur={(e) => supabase.from("bilans_sav").update({ preconisations: e.target.value }).eq("id", bilan.id)}
                placeholder="Actions recommandées..." style={{ width: "100%", marginTop: 4, padding: 8, border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 13, minHeight: 70, background: isEditable ? "#fff" : "#f4f7fa" }} />
            </label>
          </div>
        </Panel>

        {/* Validation EC (si statut = termine) */}
        {bilan.statut === "termine" && (
          <Panel style={{ marginTop: 12, borderLeft: "4px solid #EF9F27", background: "rgba(239,159,39,.05)" }}>
            <h3 style={{ margin: "0 0 12px", color: "#EF9F27" }}>✍ Validation établissement</h3>
            <p style={{ fontSize: 13, color: "#5a6878", marginBottom: 12 }}>Le bilan est terminé par le technicien. L'établissement doit valider le rapport pour clôturer le SAV.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="primary" icon="ti-check" onClick={() => setValidModal("valider")}>✓ Valider le rapport</Btn>
              <Btn variant="ghost" icon="ti-x" onClick={() => setValidModal("refuser")}>⊘ Refuser</Btn>
            </div>
          </Panel>
        )}

        {bilan.statut === "valide_ec" && (
          <Panel style={{ marginTop: 12, borderLeft: "4px solid #5aa05a", background: "rgba(94,160,90,.05)" }}>
            <div style={{ color: "#5aa05a", fontWeight: 700 }}>✅ Bilan validé par {bilan.signature_ec_nom || "—"} le {bilan.signature_ec_le ? new Date(bilan.signature_ec_le).toLocaleString("fr-FR") : "—"}</div>
          </Panel>
        )}

        {bilan.statut === "refuse_ec" && bilan.motif_refus && (
          <Panel style={{ marginTop: 12, borderLeft: "4px solid #e35d5b", background: "rgba(227,93,91,.05)" }}>
            <div style={{ color: "#e35d5b", fontWeight: 700 }}>⊘ Bilan refusé</div>
            <div style={{ fontSize: 12.5, marginTop: 4, color: "#5a6878" }}>Motif : {bilan.motif_refus}</div>
          </Panel>
        )}

        {/* Modal validation EC */}
        {validModal && (
          <ValidationModal
            bilan={bilan}
            action={validModal}
            auth={auth}
            onClose={() => setValidModal(null)}
            onDone={reload}
          />
        )}
      </div>
    </div>
  );
}

function statutColor(s) {
  return s === "en_cours" ? "#185FA5" : s === "termine" ? "#EF9F27" : s === "valide_ec" ? "#5aa05a" : s === "refuse_ec" ? "#e35d5b" : "#8a98a8";
}

// =============================================================
// Modal validation EC avec signature canvas
// =============================================================
function ValidationModal({ bilan, action, auth, onClose, onDone }) {
  const supabase = createClient();
  const [signataire, setSignataire] = useState(auth.user?.email || "");
  const [motif, setMotif] = useState("");
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  function startDraw(e) {
    drawingRef.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function draw(e) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#142131";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
  }
  function stopDraw() { drawingRef.current = false; }
  function clearSign() {
    const c = canvasRef.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
  }

  async function valider() {
    setSaving(true);
    try {
      let signatureUrl = null;
      if (action === "valider") {
        // Capture canvas → data URL
        const c = canvasRef.current;
        signatureUrl = c.toDataURL("image/png");
      }
      const payload = action === "valider" ? {
        statut: "valide_ec",
        signature_ec_url: signatureUrl,
        signature_ec_par: auth.user?.id,
        signature_ec_le: new Date().toISOString(),
        signature_ec_nom: signataire,
      } : {
        statut: "refuse_ec",
        motif_refus: motif,
      };
      const r = await supabase.from("bilans_sav").update(payload).eq("id", bilan.id);
      if (r.error) throw r.error;
      onClose();
      onDone();
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={true} onClose={onClose} kind="patient"
      title={action === "valider" ? "✓ Valider le bilan SAV" : "⊘ Refuser le bilan SAV"}
      actions={
        <>
          <Btn variant="ghost" onClick={onClose}>Annuler</Btn>
          <Btn variant="primary" onClick={valider} disabled={saving}>{saving ? "..." : (action === "valider" ? "Valider" : "Refuser")}</Btn>
        </>
      }>
      {action === "valider" ? (
        <div>
          <label style={{ fontSize: 12, color: "#5a6878" }}><b>Nom du signataire</b>
            <input value={signataire} onChange={(e) => setSignataire(e.target.value)} placeholder="Ton nom" style={{ width: "100%", padding: "8px 10px", marginTop: 4, border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 13 }} />
          </label>
          <label style={{ fontSize: 12, color: "#5a6878", display: "block", marginTop: 12 }}><b>Signature</b>
            <div style={{ marginTop: 4, border: "2px dashed #cfd8e0", borderRadius: 8, background: "#fafbfc", position: "relative" }}>
              <canvas
                ref={canvasRef}
                width={460}
                height={140}
                style={{ width: "100%", height: 140, cursor: "crosshair", touchAction: "none" }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
              />
              <button onClick={clearSign} style={{ position: "absolute", top: 6, right: 6, background: "#fff", border: "1px solid #cfd8e0", borderRadius: 4, padding: "3px 8px", fontFamily: "inherit", fontSize: 10, cursor: "pointer" }}>↺ Effacer</button>
            </div>
            <div style={{ fontSize: 10.5, color: "#8a98a8", marginTop: 4, fontStyle: "italic" }}>Signe avec ton doigt (mobile) ou ta souris (desktop)</div>
          </label>
        </div>
      ) : (
        <label style={{ fontSize: 12, color: "#5a6878" }}><b>Motif du refus *</b>
          <textarea value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Pourquoi ce bilan est refusé ?" style={{ width: "100%", padding: "8px 10px", marginTop: 4, border: "1px solid #e35d5b", borderRadius: 6, fontFamily: "inherit", fontSize: 13, minHeight: 70 }} />
        </label>
      )}
    </Modal>
  );
}

// =============================================================
// Export PDF du bilan (jsPDF CDN)
// =============================================================
let jspdfLoading = null;
async function loadJsPDF() {
  if (window.jspdf) return window.jspdf;
  if (jspdfLoading) return jspdfLoading;
  jspdfLoading = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = () => res(window.jspdf);
    s.onerror = rej;
    document.head.appendChild(s);
  });
  return jspdfLoading;
}

async function exportPDF(bilan, points, photos) {
  try {
    const { jsPDF } = await loadJsPDF();
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    let y = 18;
    // Header navy
    doc.setFillColor(20, 33, 49);
    doc.rect(0, 0, 210, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("AVEHO — Rapport de Bilan SAV", 14, 9);
    doc.setTextColor(0, 0, 0);
    // Titre
    doc.setFontSize(18);
    doc.text(bilan.numero || "Bilan SAV", 14, y); y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Technicien : ${bilan.technicien_nom || "—"}`, 14, y); y += 5;
    doc.text(`Début : ${bilan.date_debut ? new Date(bilan.date_debut).toLocaleString("fr-FR") : "—"}`, 14, y); y += 5;
    doc.text(`Fin : ${bilan.date_fin ? new Date(bilan.date_fin).toLocaleString("fr-FR") : "En cours"}`, 14, y); y += 5;
    doc.text(`Statut : ${bilan.statut} · Résultat : ${bilan.resultat || "—"}`, 14, y); y += 8;

    // Points
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("5 Points de contrôle", 14, y); y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    points.forEach(pt => {
      const status = pt.conforme === true ? "✓ OK" : pt.conforme === false ? "✗ KO" : "—";
      const col = pt.conforme === true ? [90, 160, 90] : pt.conforme === false ? [227, 93, 91] : [138, 152, 168];
      doc.setTextColor(...col);
      doc.text(`${pt.n}. ${pt.libelle} — ${status}`, 14, y); y += 5;
      doc.setTextColor(0, 0, 0);
      if (pt.commentaire) {
        const lines = doc.splitTextToSize(pt.commentaire, 180);
        lines.forEach(l => { doc.text("   " + l, 14, y); y += 5; });
      }
      y += 2;
      if (y > 270) { doc.addPage(); y = 18; }
    });

    // Diagnostic
    if (bilan.diagnostic) {
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.text("Diagnostic", 14, y); y += 5;
      doc.setFont("helvetica", "normal");
      doc.splitTextToSize(bilan.diagnostic, 180).forEach(l => { doc.text(l, 14, y); y += 5; });
    }
    if (bilan.preconisations) {
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.text("Préconisations", 14, y); y += 5;
      doc.setFont("helvetica", "normal");
      doc.splitTextToSize(bilan.preconisations, 180).forEach(l => { doc.text(l, 14, y); y += 5; });
    }

    // Signature EC
    if (bilan.signature_ec_url) {
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Validation établissement", 14, y); y += 5;
      doc.setFont("helvetica", "normal");
      doc.text(`Validé par : ${bilan.signature_ec_nom || "—"}`, 14, y); y += 5;
      doc.text(`Le : ${bilan.signature_ec_le ? new Date(bilan.signature_ec_le).toLocaleString("fr-FR") : "—"}`, 14, y); y += 5;
      try {
        doc.addImage(bilan.signature_ec_url, "PNG", 14, y, 60, 22);
        y += 26;
      } catch {}
    }

    doc.setFontSize(8);
    doc.setTextColor(140, 152, 168);
    doc.text(`Généré le ${new Date().toLocaleString("fr-FR")} · ${photos.length} photo(s) jointe(s)`, 14, 285);
    doc.save(`${bilan.numero || "bilan-sav"}.pdf`);
  } catch (e) {
    alert("Erreur PDF : " + e.message);
  }
}
