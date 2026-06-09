"use client";
export const dynamic = "force-dynamic";
// =============================================================
//  /pharmacie/caisse — Caisse tactile NF525 (POS)
//  Scanner code-barres → trouve tiroir + ouverture IoT
//  Encaissement multi-paiements + ticket
// =============================================================
import { useEffect, useState, useRef } from "react";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { PageShell, ModernCard, ModernModal, ModalBtn, HiTechIconBox } from "../../components/ui-premium";
import PermissionGate from "../../components/PermissionGate";

const COLOR = "#EF9F27";

const TVA_TAUX = {
  "2.10": "Médicaments remboursables",
  "5.50": "Médicaments non remboursables",
  "10.00": "Préparations magistrales",
  "20.00": "Parapharmacie",
};

export default function CaissePage() {
  const supabase = createClient();
  const auth = useAuth();
  const [terminal, setTerminal] = useState(null);
  const [session, setSession] = useState(null);
  const [tableMissing, setTableMissing] = useState(false);
  
  // Panier en cours
  const [lignes, setLignes] = useState([]);
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [client, setClient] = useState(null);
  
  // Encaissement
  const [modePaiement, setModePaiement] = useState("cb");
  const [montantRecu, setMontantRecu] = useState("");
  
  // Modals
  const [modal, setModal] = useState(null);
  const scanRef = useRef(null);

  useEffect(() => { if (auth.ready) loadInit(); }, [auth.ready]);
  useEffect(() => { scanRef.current?.focus(); }, [lignes]);

  async function loadInit() {
    // 1ère caisse rattachée à la pharmacie de l'user
    const r = await supabase.from("caisse_terminals").select("*").eq("structure_id", auth.structureId).limit(1).maybeSingle();
    if (r.error?.code === "42P01") { setTableMissing(true); return; }
    setTerminal(r.data);

    if (r.data) {
      // Chercher session ouverte
      const s = await supabase.from("caisse_sessions").select("*").eq("terminal_id", r.data.id).eq("est_cloturee", false).maybeSingle();
      setSession(s.data);
    }
  }

  async function ouvrirSession() {
    if (!terminal) return;
    const fond = prompt("Fond de caisse d'ouverture (€) ?", "100");
    if (fond === null) return;
    const { data, error } = await supabase.from("caisse_sessions").insert({
      structure_id: auth.structureId,
      terminal_id: terminal.id,
      pharmacie_id: terminal.pharmacie_id,
      numero: `Z-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      fond_caisse_ouverture: parseFloat(fond) || 0,
      ouvert_par: auth.userId,
      ouvert_par_nom: auth.userNom,
    }).select().single();
    if (error) { alert(error.message); return; }
    setSession(data);
  }

  async function cloturerSession() {
    if (!session) return;
    const fond = prompt("Fond de caisse de fermeture (€) ?", "100");
    if (fond === null) return;
    await supabase.from("caisse_sessions").update({
      date_fermeture: new Date().toISOString(),
      fond_caisse_fermeture: parseFloat(fond) || 0,
      ferme_par: auth.userId,
      ferme_par_nom: auth.userNom,
      est_cloturee: true,
    }).eq("id", session.id);
    setSession(null);
    setLignes([]);
    alert("✓ Session clôturée (Z journalier)");
  }

  async function handleScan(e) {
    if (e.key !== "Enter" || !scanInput) return;
    const cip = scanInput.trim();
    setScanInput("");

    try {
      // Localiser le médicament
      const { data, error } = await supabase.rpc("localiser_medicament", {
        p_pharmacie_id: terminal?.pharmacie_id,
        p_code_cip: cip,
      });
      
      if (error || !data || data.length === 0) {
        // Recherche directe
        const { data: m } = await supabase.from("medicaments").select("*").eq("code_cip", cip).maybeSingle();
        if (m) {
          addLigne({ medicament: m, tiroir: null });
        } else {
          alert(`❌ Médicament CIP ${cip} non trouvé`);
        }
        return;
      }
      
      const tiroir = data[0];
      const { data: med } = await supabase.from("medicaments").select("*").eq("code_cip", cip).maybeSingle();
      
      addLigne({ medicament: med, tiroir });
      
      // OUVRIR LE TIROIR ÉLECTRONIQUE
      if (tiroir.est_electronique) {
        ouvrirTiroir(tiroir.tiroir_id);
      }
    } catch (e) { console.error(e); }
  }

  function addLigne({ medicament, tiroir }) {
    const prix_ttc = medicament?.prix_unitaire || 10;
    const taux_tva = medicament?.est_stupefiant ? 2.10 : 2.10;
    const montant_ttc = prix_ttc * 1;
    const montant_ht = montant_ttc / (1 + taux_tva / 100);
    const montant_tva_v = montant_ttc - montant_ht;
    
    setLignes(l => [...l, {
      uid: Math.random().toString(36).substring(2, 11),
      medicament_id: medicament?.id,
      code_cip: medicament?.code_cip,
      designation: medicament?.nom_commercial || medicament?.dci || "Article",
      quantite: 1,
      prix_unitaire_ttc: prix_ttc,
      taux_tva,
      montant_ht: montant_ht,
      montant_tva: montant_tva_v,
      montant_ttc: montant_ttc,
      tiroir_id: tiroir?.tiroir_id || null,
      tiroir_code: tiroir?.tiroir_code || null,
    }]);
  }

  async function ouvrirTiroir(tiroirId) {
    // Simulation IoT - en vrai, ferait un POST à l'API IoT
    console.log("🔓 Ouverture tiroir IoT:", tiroirId);
    await supabase.from("depot_tiroirs_log").insert({
      structure_id: auth.structureId,
      tiroir_id: tiroirId,
      type_event: "ouverture",
      user_id: auth.userId,
      user_nom: auth.userNom,
    });
    // Visual feedback
    setScanResult({ tiroirId, time: Date.now() });
    setTimeout(() => setScanResult(null), 3000);
  }

  async function ouvrirTiroirCaisse() {
    alert("💵 Tiroir caisse ouvert");
    // En vrai : POST à l'imprimante via ESC/POS pour command kick drawer
  }

  function updateLigne(uid, q) {
    setLignes(l => l.map(li => li.uid === uid ? { ...li, quantite: q, montant_ttc: li.prix_unitaire_ttc * q, montant_ht: (li.prix_unitaire_ttc * q) / (1 + li.taux_tva/100), montant_tva: (li.prix_unitaire_ttc * q) - (li.prix_unitaire_ttc * q) / (1 + li.taux_tva/100) } : li));
  }
  function delLigne(uid) { setLignes(l => l.filter(li => li.uid !== uid)); }

  const totaux = {
    ht: lignes.reduce((a, l) => a + l.montant_ht, 0),
    tva: lignes.reduce((a, l) => a + l.montant_tva, 0),
    ttc: lignes.reduce((a, l) => a + l.montant_ttc, 0),
    nb: lignes.length,
  };

  async function validerTicket() {
    if (lignes.length === 0) return;
    const numero = `T-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const { data: ticket, error } = await supabase.from("caisse_tickets").insert({
      structure_id: auth.structureId,
      terminal_id: terminal.id,
      session_id: session?.id,
      pharmacie_id: terminal.pharmacie_id,
      numero,
      date_ticket: new Date().toISOString(),
      patient_id: client?.id,
      client_nom: client?.nom_complet,
      montant_ht: totaux.ht,
      montant_tva: totaux.tva,
      montant_ttc: totaux.ttc,
      montant_a_payer: totaux.ttc,
      montant_paye: totaux.ttc,
      mode_paiement: modePaiement,
      est_validee: true,
      caissier_id: auth.userId,
      caissier_nom: auth.userNom,
    }).select().single();
    if (error) { alert(error.message); return; }

    // Lignes ticket
    const ticketLignes = lignes.map((l, idx) => ({
      structure_id: auth.structureId,
      ticket_id: ticket.id,
      ordre: idx + 1,
      medicament_id: l.medicament_id,
      code_cip: l.code_cip,
      designation: l.designation,
      quantite: l.quantite,
      prix_unitaire_ttc: l.prix_unitaire_ttc,
      taux_tva: l.taux_tva,
      montant_ht: l.montant_ht,
      montant_tva: l.montant_tva,
      montant_ttc: l.montant_ttc,
      tiroir_id: l.tiroir_id,
    }));
    await supabase.from("caisse_ticket_lignes").insert(ticketLignes);

    if (modePaiement === "especes") ouvrirTiroirCaisse();

    alert(`✅ Ticket ${numero} validé\nMontant : ${totaux.ttc.toFixed(2)} €`);
    setLignes([]); setClient(null); setMontantRecu("");
  }

  if (tableMissing) {
    return (
      <>
        <TopBar />
        <PageShell color={COLOR} icon="ti-cash-register" title="Caisse" subtitle="Module non installé">
          <ModernCard color={COLOR} variant="accent" icon="ti-alert-triangle" title="Tables manquantes">
            <p style={{ color: "rgba(255,255,255,.8)" }}>Exécute <strong>aveho-MODULE-rayons-caisse.sql</strong> dans Supabase.</p>
          </ModernCard>
        </PageShell>
      </>
    );
  }
  
  if (!terminal) {
    return (
      <>
        <TopBar />
        <PageShell color={COLOR} icon="ti-cash-register" title="Caisse" subtitle="Aucune caisse configurée">
          <ModernCard color={COLOR} variant="accent" icon="ti-info-circle" title="Caisse non configurée">
            <p style={{ color: "rgba(255,255,255,.7)" }}>Crée d'abord une caisse rattachée à ta pharmacie depuis la table <code>caisse_terminals</code>.</p>
          </ModernCard>
        </PageShell>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <PageShell
        color={COLOR}
        icon="ti-cash-register"
        title={terminal?.nom || "Caisse"}
        subtitle={session ? `Session ${session.numero} ouverte` : "Session fermée"}
        badge={session ? `${totaux.ttc.toFixed(2)} €` : "—"}
        actions={
          !session ? (
            <button onClick={ouvrirSession} style={btnPrim("#5aa05a")}>
              <i className="ti ti-lock-open" /> Ouvrir session
            </button>
          ) : (
            <>
              <button onClick={ouvrirTiroirCaisse} style={btnSec}>
                <i className="ti ti-cash" /> Tiroir caisse
              </button>
              <button onClick={cloturerSession} style={btnPrim("#D45E5E")}>
                <i className="ti ti-lock" /> Clôturer Z
              </button>
            </>
          )
        }
      >
        {session && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 }}>
            {/* COLONNE GAUCHE : panier */}
            <div>
              {/* Scanner code-barres */}
              <ModernCard color="#185FA5" variant="default" padding={14} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <HiTechIconBox name="ti-barcode" color="#185FA5" variant="gradient" size={42} pulse />
                  <input
                    ref={scanRef}
                    autoFocus
                    placeholder="Scanner code-barres CIP..."
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={handleScan}
                    style={{
                      flex: 1, padding: "14px 20px", fontSize: 18,
                      borderRadius: 10,
                      background: "rgba(255,255,255,.10)", color: "#fff",
                      border: "1px solid rgba(24,95,165,.50)",
                      fontFamily: "monospace", letterSpacing: 1,
                    }}
                  />
                </div>
                {scanResult && (
                  <div style={{ marginTop: 8, padding: 8, background: "rgba(90,160,90,.20)", borderRadius: 8, color: "#5aa05a", fontSize: 12, fontWeight: 700 }}>
                    <i className="ti ti-lock-open" /> Tiroir ouvert via IoT
                  </div>
                )}
              </ModernCard>

              {/* Panier */}
              <ModernCard color={COLOR} variant="default" padding={0}>
                <div style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h3 style={{ color: "#fff", margin: 0, fontSize: 15, fontWeight: 800 }}>
                    <i className="ti ti-shopping-cart" /> Panier ({totaux.nb})
                  </h3>
                  {lignes.length > 0 && (
                    <button onClick={() => setLignes([])} style={{ background: "transparent", color: "#D45E5E", border: "1px solid #D45E5E50", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Quicksand" }}>
                      <i className="ti ti-trash" /> Vider
                    </button>
                  )}
                </div>
                {lignes.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.4)" }}>
                    <i className="ti ti-barcode-off" style={{ fontSize: 48, opacity: 0.3, display: "block", marginBottom: 10 }} />
                    Scanne un article pour démarrer
                  </div>
                ) : (
                  <div style={{ maxHeight: 420, overflowY: "auto" }}>
                    {lignes.map(l => (
                      <div key={l.uid} style={{
                        padding: 12, borderBottom: "1px solid rgba(255,255,255,.05)",
                        display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 10, alignItems: "center",
                      }}>
                        <div>
                          <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{l.designation}</div>
                          <div style={{ color: "rgba(255,255,255,.5)", fontSize: 11, fontFamily: "monospace" }}>
                            {l.code_cip} {l.tiroir_code && `· 🔓 ${l.tiroir_code}`}
                          </div>
                        </div>
                        <button onClick={() => updateLigne(l.uid, Math.max(1, l.quantite - 1))} style={qBtn}>−</button>
                        <span style={{ color: "#fff", fontSize: 16, fontWeight: 800, minWidth: 30, textAlign: "center" }}>{l.quantite}</span>
                        <button onClick={() => updateLigne(l.uid, l.quantite + 1)} style={qBtn}>+</button>
                        <div style={{ color: "#fff", fontWeight: 800, fontFamily: "monospace", minWidth: 80, textAlign: "right" }}>{l.montant_ttc.toFixed(2)} €</div>
                        <button onClick={() => delLigne(l.uid)} style={{ background: "transparent", color: "#D45E5E", border: "none", cursor: "pointer", fontSize: 18 }}>
                          <i className="ti ti-x" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </ModernCard>
            </div>

            {/* COLONNE DROITE : totaux + paiement */}
            <div>
              {/* Totaux */}
              <ModernCard color={COLOR} variant="accent" padding={18} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Row label="HT" value={`${totaux.ht.toFixed(2)} €`} />
                  <Row label="TVA" value={`${totaux.tva.toFixed(2)} €`} />
                  <div style={{ height: 1, background: "rgba(255,255,255,.10)", margin: "6px 0" }} />
                  <Row label="TTC" value={`${totaux.ttc.toFixed(2)} €`} big />
                </div>
              </ModernCard>

              {/* Modes de paiement gros boutons tactiles */}
              <ModernCard color="#5aa05a" variant="default" padding={14}>
                <div style={{ color: "rgba(255,255,255,.6)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Mode paiement</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {[
                    { k: "cb",       l: "CB",       ic: "ti-credit-card", c: "#185FA5" },
                    { k: "especes",  l: "Espèces",  ic: "ti-cash",        c: "#5aa05a" },
                    { k: "cheque",   l: "Chèque",   ic: "ti-receipt",     c: "#7CC8C8" },
                    { k: "tiers_payant", l: "Tiers payant", ic: "ti-shield", c: "#7a6fb0" },
                  ].map(m => (
                    <button key={m.k} onClick={() => setModePaiement(m.k)} style={{
                      padding: 14, borderRadius: 10,
                      background: modePaiement === m.k ? `linear-gradient(135deg, ${m.c}, ${m.c}cc)` : "rgba(255,255,255,.05)",
                      color: "#fff", border: `1px solid ${modePaiement === m.k ? m.c : "rgba(255,255,255,.10)"}`,
                      fontFamily: "Quicksand", fontWeight: 700, fontSize: 13, cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minHeight: 56,
                    }}>
                      <i className={`ti ${m.ic}`} style={{ fontSize: 20 }} />
                      {m.l}
                    </button>
                  ))}
                </div>

                <button onClick={validerTicket} disabled={lignes.length === 0} style={{
                  marginTop: 14, width: "100%", padding: 18,
                  background: lignes.length > 0 ? "linear-gradient(135deg, #5aa05a, #4a8a4a)" : "rgba(255,255,255,.05)",
                  color: "#fff", border: "none",
                  borderRadius: 12, fontFamily: "Quicksand", fontWeight: 800, fontSize: 18,
                  cursor: lignes.length > 0 ? "pointer" : "not-allowed",
                  boxShadow: lignes.length > 0 ? "0 6px 20px rgba(90,160,90,.4)" : "none",
                }}>
                  <i className="ti ti-check" /> ENCAISSER {totaux.ttc.toFixed(2)} €
                </button>
              </ModernCard>
            </div>
          </div>
        )}
      </PageShell>
    </>
  );
}

const qBtn = { width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,.08)", color: "#fff", border: "1px solid rgba(255,255,255,.15)", fontSize: 20, fontWeight: 800, cursor: "pointer" };

const btnPrim = (c) => ({
  padding: "10px 18px", borderRadius: 10,
  background: `linear-gradient(135deg, ${c}, ${c}cc)`,
  color: "#fff", border: "none",
  fontFamily: "Quicksand", fontWeight: 700, fontSize: 13,
  cursor: "pointer", boxShadow: `0 4px 12px ${c}50`,
});

const btnSec = {
  padding: "10px 16px", borderRadius: 10,
  background: "rgba(255,255,255,.10)", color: "#fff",
  border: "1px solid rgba(255,255,255,.20)",
  fontFamily: "Quicksand", fontWeight: 700, fontSize: 12,
  cursor: "pointer", marginRight: 8,
};

function Row({ label, value, big }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: "rgba(255,255,255,.6)", fontSize: big ? 14 : 12, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>{label}</span>
      <span style={{ color: "#fff", fontSize: big ? 28 : 16, fontWeight: 800, fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}
