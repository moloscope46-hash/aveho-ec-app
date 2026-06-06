"use client";
// =============================================================
//  /mobile/cuve/remplissage — Procédure remplissage cuve ultra-pro
//  4 étapes guidées : Scan cuve · Mesures avant · Mesures après · Validation
// =============================================================
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/useAuth";
import MobileSubHeader from "../../../components/MobileSubHeader";

export default function MobileCuveRemplissagePage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const [step, setStep] = useState(1);
  const [cuves, setCuves] = useState([]);
  const [cuve, setCuve] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    niveau_avant_pct: "",
    pression_avant_bar: "",
    niveau_apres_pct: 100,
    pression_apres_bar: "",
    volume_ajoute_l: "",
    num_lot: "",
    fournisseur: "",
    notes: "",
  });

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      const { data } = await supabase
        .from("cuves_oxygene")
        .select("id, num_serie, marque, modele, type_gaz, statut, niveau_actuel_pct, pression_actuelle_bar, capacite_litres")
        .eq("structure_id", auth.structureId)
        .eq("actif", true)
        .order("num_serie");
      setCuves(data || []);
    })();
  }, [auth.ready, auth.structureId]);

  function selectCuve(c) {
    setCuve(c);
    setForm(f => ({
      ...f,
      niveau_avant_pct: c.niveau_actuel_pct ?? "",
      pression_avant_bar: c.pression_actuelle_bar ?? "",
    }));
    setStep(2);
  }

  async function valider() {
    if (!cuve) return;
    setBusy(true);
    try {
      // Calcul du nouveau statut selon le niveau final
      const niveauApres = parseInt(form.niveau_apres_pct, 10) || 0;
      let newStatut = "partielle";
      if (niveauApres >= 95) newStatut = "pleine";
      else if (niveauApres <= 5) newStatut = "vide";

      // 1. Insert historique remplissage
      const { error: err1 } = await supabase.from("cuves_remplissages").insert({
        structure_id: auth.structureId,
        cuve_id: cuve.id,
        date_remplissage: new Date().toISOString(),
        niveau_avant_pct: form.niveau_avant_pct ? parseInt(form.niveau_avant_pct, 10) : null,
        niveau_apres_pct: niveauApres,
        pression_avant_bar: form.pression_avant_bar ? parseFloat(form.pression_avant_bar) : null,
        pression_apres_bar: form.pression_apres_bar ? parseFloat(form.pression_apres_bar) : null,
        volume_ajoute_l: form.volume_ajoute_l ? parseFloat(form.volume_ajoute_l) : null,
        num_lot: form.num_lot || null,
        fournisseur: form.fournisseur || null,
        technicien_id: auth.user?.id || null,
        notes: form.notes || null,
        cree_par_scan: true,
      });
      if (err1) throw err1;

      // 2. Update cuve avec nouveau niveau + statut + date
      const { error: err2 } = await supabase.from("cuves_oxygene").update({
        niveau_actuel_pct: niveauApres,
        pression_actuelle_bar: form.pression_apres_bar ? parseFloat(form.pression_apres_bar) : null,
        statut: newStatut,
        date_dernier_remplissage: new Date().toISOString(),
        num_lot_remplissage: form.num_lot || null,
        fournisseur_remplissage: form.fournisseur || null,
      }).eq("id", cuve.id);
      if (err2) throw err2;

      setStep(4);
    } catch (e) {
      alert("Erreur : " + e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!auth.ready) return null;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #142131 0%, #050a14 100%)", fontFamily: "Quicksand, sans-serif", paddingBottom: 100, color: "#fff" }}>
      <MobileSubHeader title="Remplissage cuve O₂" icon="ti-flame" color="#EF9F27" />

      {/* Progression */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {[1,2,3,4].map(n => (
            <div key={n} style={{
              flex: 1, height: 5, borderRadius: 3,
              background: step >= n ? "#EF9F27" : "rgba(255,255,255,.10)",
              transition: "background .2s",
            }} />
          ))}
        </div>
        <div style={{ color: "#fdd9a8", fontSize: 12.5, marginBottom: 14 }}>
          Étape {step} / 4 · {step === 1 ? "Sélection cuve" : step === 2 ? "Mesures AVANT" : step === 3 ? "Mesures APRÈS + lot" : "Terminé !"}
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* ========== ÉTAPE 1 : SÉLECTION CUVE ========== */}
        {step === 1 && (
          <>
            <Section title="Sélectionne la cuve à remplir" color="#EF9F27">
              <div style={{ background: "rgba(239,159,39,.10)", borderLeft: "4px solid #EF9F27", padding: 12, borderRadius: 8, fontSize: 12, color: "#fdd9a8", marginBottom: 14 }}>
                <i className="ti ti-info-circle" /> Scanne le QR de la cuve <b>OU</b> sélectionne dans la liste ci-dessous.
              </div>
              <button onClick={() => router.push("/scan/quick?mode=cuve")} style={{
                width: "100%", background: "linear-gradient(135deg, #7CC8C8, #5db5b5)",
                color: "#142131", border: "none", padding: 14, borderRadius: 12,
                fontFamily: "inherit", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 14,
              }}>
                <i className="ti ti-scan" /> Scanner le QR de la cuve
              </button>

              <div style={{ fontSize: 11, color: "#bfe6e6", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>OU choisis dans la liste</div>
              {cuves.length === 0 ? (
                <p style={{ color: "#8a98a8", textAlign: "center", padding: 20, fontSize: 13 }}>Aucune cuve enregistrée. Crée-en une dans /stock onglet Cuves O₂.</p>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {cuves.map(c => {
                    const col = c.statut === "pleine" ? "#5aa05a" : c.statut === "vide" ? "#e35d5b" : "#EF9F27";
                    return (
                      <button key={c.id} onClick={() => selectCuve(c)} style={{
                        background: "rgba(255,255,255,.05)", borderLeft: `4px solid ${col}`,
                        border: "1px solid rgba(255,255,255,.10)", borderRadius: 10,
                        padding: 12, display: "flex", alignItems: "center", gap: 10,
                        cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                      }}>
                        <i className="ti ti-flame" style={{ color: col, fontSize: 22 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{c.num_serie || "Sans n°"}</div>
                          <div style={{ color: "#bfe6e6", fontSize: 11 }}>{c.marque || ""} {c.modele || ""} · {c.type_gaz} · {c.niveau_actuel_pct || 0}%</div>
                        </div>
                        <i className="ti ti-chevron-right" style={{ color: col }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </Section>
          </>
        )}

        {/* ========== ÉTAPE 2 : MESURES AVANT ========== */}
        {step === 2 && cuve && (
          <>
            <Section title="📊 Mesures AVANT remplissage" color="#185FA5">
              <div style={{ background: "rgba(24,95,165,.10)", padding: 12, borderRadius: 8, marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "#bfe6e6", textTransform: "uppercase", letterSpacing: 1 }}>Cuve sélectionnée</div>
                <div style={{ fontSize: 16, color: "#fff", fontWeight: 700 }}>{cuve.num_serie} · {cuve.type_gaz}</div>
                <div style={{ fontSize: 11.5, color: "#bfe6e6" }}>{cuve.marque} {cuve.modele} · Capacité {cuve.capacite_litres || "?"} L</div>
              </div>

              <Field label="🌡 Niveau actuel (%)">
                <input type="number" min="0" max="100" value={form.niveau_avant_pct} onChange={e => setForm({ ...form, niveau_avant_pct: e.target.value })} placeholder="ex: 10" style={inputStyle} />
              </Field>
              <Field label="⚖ Pression actuelle (bar)">
                <input type="number" step="0.1" value={form.pression_avant_bar} onChange={e => setForm({ ...form, pression_avant_bar: e.target.value })} placeholder="ex: 20" style={inputStyle} />
              </Field>

              <div style={{ background: "rgba(239,159,39,.10)", borderLeft: "4px solid #EF9F27", padding: 12, borderRadius: 8, fontSize: 11.5, color: "#fdd9a8", marginTop: 14 }}>
                <i className="ti ti-info-circle" /> <b>Procédure de sécurité :</b><br/>
                1. Vérifier l'intégrité visuelle de la cuve (pas de fissure, rouille)<br/>
                2. Contrôler la date de requalification (cuve périmée = refus)<br/>
                3. Note les valeurs avant de commencer le remplissage<br/>
                4. Mets ton EPI (gants, lunettes)
              </div>
            </Section>
          </>
        )}

        {/* ========== ÉTAPE 3 : MESURES APRÈS + LOT ========== */}
        {step === 3 && cuve && (
          <Section title="✅ Mesures APRÈS + Traçabilité" color="#5aa05a">
            <Field label="🌡 Niveau APRÈS (%)">
              <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                {[25, 50, 75, 100].map(n => (
                  <button key={n} type="button" onClick={() => setForm({ ...form, niveau_apres_pct: n })} style={{
                    flex: 1, padding: "10px 0",
                    background: form.niveau_apres_pct == n ? "#5aa05a" : "rgba(255,255,255,.06)",
                    color: form.niveau_apres_pct == n ? "#fff" : "#bfe6e6",
                    border: `1px solid ${form.niveau_apres_pct == n ? "#5aa05a" : "rgba(255,255,255,.14)"}`,
                    borderRadius: 10, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>{n}%</button>
                ))}
              </div>
              <input type="number" min="0" max="100" value={form.niveau_apres_pct} onChange={e => setForm({ ...form, niveau_apres_pct: e.target.value })} placeholder="ou saisis directement" style={inputStyle} />
            </Field>

            <Field label="⚖ Pression APRÈS (bar)">
              <input type="number" step="0.1" value={form.pression_apres_bar} onChange={e => setForm({ ...form, pression_apres_bar: e.target.value })} placeholder="ex: 200" style={inputStyle} />
            </Field>

            <Field label="📏 Volume ajouté (L)">
              <input type="number" step="0.1" value={form.volume_ajoute_l} onChange={e => setForm({ ...form, volume_ajoute_l: e.target.value })} placeholder="ex: 45" style={inputStyle} />
            </Field>

            <Field label="🏷 N° de lot du remplissage *">
              <input value={form.num_lot} onChange={e => setForm({ ...form, num_lot: e.target.value })} placeholder="ex: LOT-2026-001234" style={{ ...inputStyle, fontFamily: "Consolas, monospace" }} />
            </Field>

            <Field label="🏭 Fournisseur">
              <select value={form.fournisseur} onChange={e => setForm({ ...form, fournisseur: e.target.value })} style={inputStyle}>
                <option value="">—</option>
                <option>Air Liquide Healthcare</option>
                <option>Linde Healthcare</option>
                <option>SOL France</option>
                <option>Messer France</option>
                <option>Autre</option>
              </select>
            </Field>

            <Field label="📝 Notes / Observations">
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Anomalie constatée, conditions particulières..." style={{ ...inputStyle, resize: "vertical" }} />
            </Field>
          </Section>
        )}

        {/* ========== ÉTAPE 4 : SUCCÈS ========== */}
        {step === 4 && cuve && (
          <Section title="✅ Remplissage enregistré" color="#5aa05a">
            <div style={{ background: "rgba(90,160,90,.12)", border: "1px solid #5aa05a", padding: 20, borderRadius: 14, textAlign: "center" }}>
              <i className="ti ti-circle-check" style={{ fontSize: 56, color: "#5aa05a" }} />
              <h2 style={{ margin: "10px 0 6px", color: "#fff", fontSize: 20 }}>Remplissage validé</h2>
              <p style={{ margin: 0, color: "#bfe6e6", fontSize: 13 }}>
                Cuve <b>{cuve.num_serie}</b><br/>
                {form.niveau_avant_pct}% → <b style={{ color: "#5aa05a", fontSize: 16 }}>{form.niveau_apres_pct}%</b><br/>
                Lot {form.num_lot} · {form.fournisseur}
              </p>
            </div>
            <button onClick={() => { setStep(1); setCuve(null); setForm({ niveau_avant_pct: "", pression_avant_bar: "", niveau_apres_pct: 100, pression_apres_bar: "", volume_ajoute_l: "", num_lot: "", fournisseur: "", notes: "" }); }} style={{
              width: "100%", marginTop: 14,
              background: "linear-gradient(135deg, #7CC8C8, #5db5b5)",
              color: "#142131", border: "none", padding: 14, borderRadius: 12,
              fontFamily: "inherit", fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}>
              🔄 Remplir une autre cuve
            </button>
            <button onClick={() => router.push("/mobile")} style={{
              width: "100%", marginTop: 8,
              background: "rgba(255,255,255,.06)",
              color: "#fff", border: "1px solid rgba(255,255,255,.16)", padding: 12, borderRadius: 10,
              fontFamily: "inherit", fontSize: 13, cursor: "pointer",
            }}>
              ← Retour au menu
            </button>
          </Section>
        )}
      </div>

      {/* Footer navigation (pas en étape 4) */}
      {step < 4 && step > 1 && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "rgba(20,33,49,.95)", backdropFilter: "blur(14px)",
          borderTop: "1px solid rgba(255,255,255,.08)",
          padding: "12px 16px", display: "flex", gap: 10,
        }}>
          <button onClick={() => setStep(s => Math.max(s-1, 1))} style={{
            background: "rgba(255,255,255,.08)", color: "#fff",
            border: "1px solid rgba(255,255,255,.16)",
            padding: "12px 18px", borderRadius: 10, cursor: "pointer",
            fontFamily: "inherit", fontSize: 13, fontWeight: 600,
          }}>
            <i className="ti ti-chevron-left" /> Retour
          </button>
          {step === 2 && (
            <button onClick={() => setStep(3)} style={{
              flex: 1, background: "linear-gradient(135deg, #EF9F27, #d48820)",
              color: "#fff", border: "none", padding: "12px 18px", borderRadius: 10, cursor: "pointer",
              fontFamily: "inherit", fontSize: 14, fontWeight: 700,
            }}>
              Suivant <i className="ti ti-chevron-right" />
            </button>
          )}
          {step === 3 && (
            <button onClick={valider} disabled={busy || !form.num_lot} style={{
              flex: 1, background: "linear-gradient(135deg, #5aa05a, #4a8a4a)",
              color: "#fff", border: "none", padding: "12px 18px", borderRadius: 10, cursor: busy ? "wait" : "pointer",
              fontFamily: "inherit", fontSize: 14, fontWeight: 700,
              opacity: (busy || !form.num_lot) ? 0.6 : 1,
            }}>
              {busy ? "Enregistrement..." : "✓ Valider le remplissage"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, color, children }) {
  return (
    <div style={{
      background: "rgba(255,255,255,.04)", borderRadius: 14,
      padding: 16, marginBottom: 12,
      borderLeft: `4px solid ${color}`,
    }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 14, color, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 11.5, color: "#bfe6e6", marginBottom: 5, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "11px 12px",
  background: "rgba(255,255,255,.06)",
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: 10,
  color: "#fff",
  fontFamily: "inherit",
  fontSize: 14,
};
