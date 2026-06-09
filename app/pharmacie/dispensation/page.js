"use client";
// =============================================================
//  /pharmacie/dispensation — Sortie médicament patient
//  Lecture code-barres (scanner = clavier rapide)
//  Décrémente stock automatiquement via trigger SQL
// =============================================================
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { PageShell, ModernCard, ModernModal, ModalBtn, HiTechIconBox } from "../../components/ui-premium";

const COLOR = "#5aa05a";

export default function DispensationPage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const scanInputRef = useRef(null);

  const [pharmacies, setPharmacies] = useState([]);
  const [patients, setPatients] = useState([]);
  const [pharmacieId, setPharmacieId] = useState(null);
  const [patientId, setPatientId] = useState(null);
  const [scanBuffer, setScanBuffer] = useState("");
  const [scanMessage, setScanMessage] = useState(null);  // {type, text}
  const [panier, setPanier] = useState([]);  // [{stock, medicament, quantite}]
  const [busy, setBusy] = useState(false);
  const [autoFocus, setAutoFocus] = useState(true);

  useEffect(() => { if (auth.ready) loadInitial(); }, [auth.ready]);
  // Focus auto sur le champ scan
  useEffect(() => {
    if (!autoFocus) return;
    const t = setInterval(() => {
      if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA" && document.activeElement?.tagName !== "SELECT") {
        scanInputRef.current?.focus();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [autoFocus]);

  async function loadInitial() {
    const [ph, pa] = await Promise.all([
      supabase.from("pharmacies").select("id, nom").eq("structure_id", auth.structureId).order("nom"),
      supabase.from("patients").select("id, nom, prenom, date_naissance").eq("structure_id", auth.structureId).order("nom"),
    ]);
    setPharmacies(ph.data || []);
    setPatients(pa.data || []);
    if (ph.data?.length === 1) setPharmacieId(ph.data[0].id);
  }

  async function handleScan(code) {
    if (!code.trim()) return;
    setScanMessage({ type: "loading", text: `?? Recherche ${code}...` });

    // 1. Chercher dans medicaments par CIP
    const { data: meds } = await supabase
      .from("medicaments")
      .select("*")
      .or(`code_cip.eq.${code},code_ucd.eq.${code}`)
      .eq("structure_id", auth.structureId)
      .limit(1);

    if (!meds || meds.length === 0) {
      setScanMessage({ type: "error", text: `❌ Code "${code}" inconnu` });
      setTimeout(() => setScanMessage(null), 3000);
      return;
    }
    const med = meds[0];

    // 2. Chercher stock disponible pour cette pharmacie (FIFO périmant le + proche)
    const { data: stocks } = await supabase
      .from("pharmacie_stock")
      .select("*, casier:casier_id(code)")
      .eq("pharmacie_id", pharmacieId)
      .eq("medicament_id", med.id)
      .gt("quantite", 0)
      .order("date_peremption", { ascending: true, nullsLast: true })
      .limit(1);

    if (!stocks || stocks.length === 0) {
      setScanMessage({ type: "warning", text: `⚠ ${med.nom_commercial} : rupture de stock` });
      setTimeout(() => setScanMessage(null), 3000);
      return;
    }
    const stock = stocks[0];

    // 3. Ajouter au panier (ou incrémenter)
    setPanier(p => {
      const existing = p.findIndex(x => x.stock.id === stock.id);
      if (existing >= 0) {
        const copy = [...p];
        copy[existing] = { ...copy[existing], quantite: copy[existing].quantite + 1 };
        return copy;
      }
      return [...p, { stock, medicament: med, quantite: 1 }];
    });

    setScanMessage({ type: "success", text: `✓ ${med.nom_commercial} ajouté (casier ${stock.casier?.code || "—"})` });
    setTimeout(() => setScanMessage(null), 2000);
  }

  function handleScanKeyDown(e) {
    // Scanner émule clavier + Enter à la fin
    if (e.key === "Enter") {
      e.preventDefault();
      handleScan(scanBuffer);
      setScanBuffer("");
    }
  }

  function updateQuantite(idx, delta) {
    setPanier(p => {
      const copy = [...p];
      copy[idx].quantite = Math.max(1, Math.min(copy[idx].stock.quantite, copy[idx].quantite + delta));
      return copy;
    });
  }

  function removeLine(idx) {
    setPanier(p => p.filter((_, i) => i !== idx));
  }

  async function validateDispensation() {
    if (!patientId || !pharmacieId || panier.length === 0) return;
    setBusy(true);

    // Récup nom pharmacien courant
    const pharmacienNom = auth.user?.email || "Pharmacien";

    // Insérer une dispensation par ligne (le trigger SQL décrémente le stock)
    const inserts = panier.map(p => ({
      structure_id: auth.structureId,
      pharmacie_id: pharmacieId,
      patient_id: patientId,
      stock_id: p.stock.id,
      casier_id: p.stock.casier_id,
      medicament_id: p.medicament.id,
      numero_lot: p.stock.numero_lot,
      date_peremption: p.stock.date_peremption,
      quantite: p.quantite,
      pharmacien_id: auth.user?.id,
      pharmacien_nom: pharmacienNom,
      est_validee: true,
    }));

    const { error } = await supabase.from("dispensations").insert(inserts);
    if (error) {
      alert("Erreur : " + error.message);
      setBusy(false);
      return;
    }

    setScanMessage({ type: "success", text: `✅ ${panier.length} médicaments dispensés` });
    setPanier([]);
    setPatientId(null);
    setBusy(false);
    setTimeout(() => setScanMessage(null), 4000);
  }

  const patient = patients.find(p => p.id === patientId);

  return (
    <>
      <TopBar />
      <PageShell
        color={COLOR}
        icon="ti-pill"
        title="Dispensation"
        subtitle="Sortie de médicaments — scan code-barres ou recherche"
        badge={panier.length > 0 ? `${panier.length} en cours` : null}
      >
        {/* Sélection contexte */}
        <ModernCard color={COLOR} variant="default" padding={14} style={{ marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Pharmacie *">
              <select value={pharmacieId || ""} onChange={(e) => setPharmacieId(e.target.value)} style={inputDark}>
                <option value="">— Choisir —</option>
                {pharmacies.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </Field>
            <Field label="Patient *">
              <select value={patientId || ""} onChange={(e) => setPatientId(e.target.value)} style={inputDark}>
                <option value="">— Choisir —</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
              </select>
            </Field>
          </div>
          {patient && (
            <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(122,111,176,.15)", borderRadius: 8, border: "1px solid rgba(122,111,176,.30)" }}>
              <span style={{ color: "#fff", fontWeight: 700 }}>?? {patient.prenom} {patient.nom}</span>
              {patient.date_naissance && <span style={{ color: "rgba(255,255,255,.6)", marginLeft: 10 }}>({Math.floor((Date.now() - new Date(patient.date_naissance).getTime()) / (365.25 * 86400000))} ans)</span>}
            </div>
          )}
        </ModernCard>

        {/* Zone scan */}
        <ModernCard color={COLOR} variant="accent" padding={20} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <HiTechIconBox name="ti-barcode" color={COLOR} variant="gradient" size={56} pulse />
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.7)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                Scanner ou saisir un code CIP/UCD
              </label>
              <input
                ref={scanInputRef}
                value={scanBuffer}
                onChange={(e) => setScanBuffer(e.target.value)}
                onKeyDown={handleScanKeyDown}
                disabled={!pharmacieId}
                placeholder={pharmacieId ? "Cliquez ici ou scannez..." : "Sélectionnez une pharmacie d'abord"}
                style={{
                  width: "100%", padding: "12px 14px",
                  background: "rgba(0,0,0,.30)", color: "#fff",
                  border: `2px solid ${COLOR}80`, borderRadius: 10,
                  fontSize: 18, fontFamily: "monospace",
                  outline: "none", letterSpacing: 1,
                }}
                autoFocus
              />
            </div>
          </div>
          {scanMessage && (
            <div style={{
              marginTop: 12, padding: "10px 14px", borderRadius: 8,
              background: scanMessage.type === "success" ? "rgba(90,160,90,.20)" : scanMessage.type === "error" ? "rgba(212,94,94,.20)" : scanMessage.type === "warning" ? "rgba(239,159,39,.20)" : "rgba(124,200,200,.20)",
              border: `1px solid ${scanMessage.type === "success" ? "#5aa05a" : scanMessage.type === "error" ? "#D45E5E" : scanMessage.type === "warning" ? "#EF9F27" : "#7CC8C8"}60`,
              color: "#fff", fontWeight: 600,
            }}>
              {scanMessage.text}
            </div>
          )}
        </ModernCard>

        {/* Panier */}
        <ModernCard color={COLOR} variant="default" icon="ti-shopping-cart" title={`Panier (${panier.length} médicaments)`}>
          {panier.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,.5)", margin: 0, textAlign: "center", padding: 20 }}>
              <i className="ti ti-barcode" style={{ fontSize: 32, opacity: 0.4, display: "block", marginBottom: 8 }} />
              Scannez un code-barres pour ajouter
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {panier.map((line, i) => (
                <div key={i} style={{
                  padding: "12px 14px", background: "rgba(255,255,255,.04)",
                  borderRadius: 10, display: "flex", alignItems: "center", gap: 12,
                  border: "1px solid rgba(255,255,255,.06)",
                }}>
                  <HiTechIconBox name="ti-pill" color={COLOR} variant="ring" size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{line.medicament.nom_commercial}</div>
                    <div style={{ color: "rgba(255,255,255,.55)", fontSize: 11 }}>
                      {line.medicament.dci} {line.medicament.dosage && `· ${line.medicament.dosage}`}
                      {line.stock.numero_lot && ` · Lot ${line.stock.numero_lot}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,.30)", borderRadius: 10, padding: 4 }}>
                    <button onClick={() => updateQuantite(i, -1)} style={qtyBtn}>−</button>
                    <span style={{ color: "#fff", fontWeight: 800, fontSize: 16, minWidth: 32, textAlign: "center" }}>{line.quantite}</span>
                    <button onClick={() => updateQuantite(i, +1)} style={qtyBtn}>+</button>
                  </div>
                  <button onClick={() => removeLine(i)} style={{ ...qtyBtn, background: "rgba(212,94,94,.20)", color: "#D45E5E" }}>
                    <i className="ti ti-trash" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {panier.length > 0 && (
            <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: "rgba(255,255,255,.7)", fontSize: 13 }}>
                Total : <strong style={{ color: "#fff", fontSize: 16 }}>{panier.reduce((a, l) => a + l.quantite, 0)} unités</strong>
              </div>
              <button
                onClick={validateDispensation}
                disabled={busy || !patientId || panier.length === 0}
                style={{
                  padding: "12px 24px", borderRadius: 12,
                  background: `linear-gradient(135deg, ${COLOR} 0%, ${COLOR}cc 100%)`,
                  color: "#fff", border: "none",
                  fontFamily: "Quicksand", fontWeight: 800, fontSize: 14,
                  cursor: (busy || !patientId) ? "not-allowed" : "pointer",
                  opacity: (busy || !patientId) ? 0.6 : 1,
                  boxShadow: `0 6px 16px ${COLOR}60`,
                }}
              >
                <i className="ti ti-check" /> {busy ? "Validation..." : "Valider la dispensation"}
              </button>
            </div>
          )}
        </ModernCard>
      </PageShell>
    </>
  );
}

const inputDark = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  background: "rgba(255,255,255,.10)", color: "#fff",
  border: "1px solid rgba(255,255,255,.15)",
  fontFamily: "Quicksand", fontSize: 13,
};

const qtyBtn = {
  width: 32, height: 32, borderRadius: 8,
  background: "rgba(255,255,255,.08)", color: "#fff",
  border: "1px solid rgba(255,255,255,.15)",
  fontSize: 18, fontWeight: 800, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.65)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}
