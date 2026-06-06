"use client";
// =============================================================
//  /mobile/patient/new — Assistant création patient (3 étapes)
// =============================================================
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/useAuth";
import MobileSubHeader from "../../../components/MobileSubHeader";

export default function MobileNewPatientPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    civilite: "",
    nom: "",
    prenom: "",
    nom_jeune_fille: "",
    date_naissance: "",
    lieu_naissance: "",
    telephone: "",
    email: "",
    adresse: "",
    code_postal: "",
    ville: "",
    contact_urgence_nom: "",
    contact_urgence_telephone: "",
    contact_urgence_lien: "",
    medecin_traitant: "",
    medecin_traitant_telephone: "",
    allergies: "",
    regime_alimentaire: "",
    gir: "",
    mobilite: "",
    etat: "Présent",
    statut_sejour: "En cours",
  });

  function next() { setStep(Math.min(step + 1, 4)); }
  function prev() { setStep(Math.max(step - 1, 1)); }

  async function save() {
    if (!form.nom?.trim()) { alert("Le nom est obligatoire"); return; }
    setBusy(true);
    try {
      const payload = {
        structure_id: auth.structureId,
        etablissement_id: auth.etabId || null,
        ...form,
        gir: form.gir ? parseInt(form.gir, 10) : null,
        created_by: auth.user?.id,
      };
      const { data, error } = await supabase.from("patients").insert(payload).select("id").single();
      if (error) throw error;
      // Redirection vers QR/bracelet du nouveau patient
      router.push(`/patients/${data.id}/qr`);
    } catch (e) {
      alert("Erreur : " + e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!auth.ready) return null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #142131 0%, #050a14 100%)",
      fontFamily: "Quicksand, sans-serif",
      paddingBottom: 100,
      color: "#fff",
    }}>
      <MobileSubHeader title="Nouveau patient" icon="ti-user-plus" color="#C9867F" />

      {/* Progression */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {[1, 2, 3, 4].map(n => (
            <div key={n} style={{
              flex: 1, height: 5, borderRadius: 3,
              background: step >= n ? "#C9867F" : "rgba(255,255,255,.10)",
              transition: "background .2s",
            }} />
          ))}
        </div>
        <div style={{ color: "#bfe6e6", fontSize: 12.5, marginBottom: 14 }}>
          Étape {step} / 4 · {step === 1 ? "Identité" : step === 2 ? "Coordonnées + Urgence" : step === 3 ? "Médical" : "Validation"}
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* ÉTAPE 1 — IDENTITÉ */}
        {step === 1 && (
          <Section title="Identité" icon="ti-id" color="#C9867F">
            <Field label="Civilité">
              <div style={{ display: "flex", gap: 6 }}>
                {["M.", "Mme", "Dr"].map(c => (
                  <button key={c} type="button" onClick={() => setForm({ ...form, civilite: c })} style={btnRadio(form.civilite === c, "#C9867F")}>{c}</button>
                ))}
              </div>
            </Field>
            <Field label="Nom *" required>
              <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value.toUpperCase() })} placeholder="DUPONT" style={inputStyle} autoFocus />
            </Field>
            <Field label="Prénom">
              <input value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} placeholder="Marie" style={inputStyle} />
            </Field>
            <Field label="Nom de jeune fille">
              <input value={form.nom_jeune_fille} onChange={e => setForm({ ...form, nom_jeune_fille: e.target.value.toUpperCase() })} placeholder="MARTIN" style={inputStyle} />
            </Field>
            <Field label="Date de naissance">
              <input type="date" value={form.date_naissance} onChange={e => setForm({ ...form, date_naissance: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Lieu de naissance">
              <input value={form.lieu_naissance} onChange={e => setForm({ ...form, lieu_naissance: e.target.value })} placeholder="Paris" style={inputStyle} />
            </Field>
          </Section>
        )}

        {/* ÉTAPE 2 — COORDONNÉES */}
        {step === 2 && (
          <>
            <Section title="Coordonnées" icon="ti-phone" color="#5aa05a">
              <Field label="Téléphone personnel">
                <input type="tel" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} placeholder="06 12 34 56 78" style={inputStyle} />
              </Field>
              <Field label="Email">
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemple.fr" style={inputStyle} />
              </Field>
              <Field label="Adresse">
                <input value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} placeholder="12 rue de la Paix" style={inputStyle} />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
                <Field label="CP">
                  <input value={form.code_postal} onChange={e => setForm({ ...form, code_postal: e.target.value })} placeholder="75011" style={{ ...inputStyle, fontFamily: "Consolas, monospace" }} />
                </Field>
                <Field label="Ville">
                  <input value={form.ville} onChange={e => setForm({ ...form, ville: e.target.value })} placeholder="Paris" style={inputStyle} />
                </Field>
              </div>
            </Section>
            <Section title="Contact d'urgence" icon="ti-alert-triangle" color="#e35d5b">
              <Field label="Nom contact">
                <input value={form.contact_urgence_nom} onChange={e => setForm({ ...form, contact_urgence_nom: e.target.value })} placeholder="DUPONT Pierre" style={inputStyle} />
              </Field>
              <Field label="Téléphone">
                <input type="tel" value={form.contact_urgence_telephone} onChange={e => setForm({ ...form, contact_urgence_telephone: e.target.value })} placeholder="06 12 34 56 78" style={inputStyle} />
              </Field>
              <Field label="Lien">
                <select value={form.contact_urgence_lien} onChange={e => setForm({ ...form, contact_urgence_lien: e.target.value })} style={inputStyle}>
                  <option value="">—</option>
                  <option>Conjoint</option><option>Enfant</option><option>Parent</option>
                  <option>Frère/Sœur</option><option>Tuteur</option><option>Autre</option>
                </select>
              </Field>
            </Section>
          </>
        )}

        {/* ÉTAPE 3 — MÉDICAL */}
        {step === 3 && (
          <Section title="Informations médicales" icon="ti-stethoscope" color="#7a6fb0">
            <Field label="Médecin traitant">
              <input value={form.medecin_traitant} onChange={e => setForm({ ...form, medecin_traitant: e.target.value })} placeholder="Dr Lambert" style={inputStyle} />
            </Field>
            <Field label="Téléphone médecin">
              <input type="tel" value={form.medecin_traitant_telephone} onChange={e => setForm({ ...form, medecin_traitant_telephone: e.target.value })} placeholder="01 23 45 67 89" style={inputStyle} />
            </Field>
            <Field label="GIR (1-6)">
              <div style={{ display: "flex", gap: 4 }}>
                {[1,2,3,4,5,6].map(n => (
                  <button key={n} type="button" onClick={() => setForm({ ...form, gir: n })} style={{
                    ...btnRadio(form.gir === n, "#7a6fb0"),
                    width: 40, padding: "8px 0",
                  }}>{n}</button>
                ))}
              </div>
            </Field>
            <Field label="Mobilité">
              <select value={form.mobilite} onChange={e => setForm({ ...form, mobilite: e.target.value })} style={inputStyle}>
                <option value="">—</option>
                <option>Autonome</option><option>Assistance</option>
                <option>Fauteuil</option><option>Alité</option>
              </select>
            </Field>
            <Field label="Allergies">
              <input value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} placeholder="Pénicilline, latex..." style={inputStyle} />
            </Field>
            <Field label="Régime alimentaire">
              <input value={form.regime_alimentaire} onChange={e => setForm({ ...form, regime_alimentaire: e.target.value })} placeholder="Sans sel, mixé..." style={inputStyle} />
            </Field>
          </Section>
        )}

        {/* ÉTAPE 4 — RÉCAP & VALIDATION */}
        {step === 4 && (
          <Section title="Récapitulatif" icon="ti-check" color="#5aa05a">
            <div style={{ background: "rgba(255,255,255,.04)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div style={{ color: "#bfe6e6", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Patient à créer</div>
              <div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>
                {form.civilite && <span>{form.civilite} </span>}
                {form.nom} {form.prenom}
              </div>
              {form.nom_jeune_fille && <div style={{ color: "#bfe6e6", fontSize: 12 }}>née {form.nom_jeune_fille}</div>}
              {form.date_naissance && <div style={{ color: "#bfe6e6", fontSize: 12, marginTop: 4 }}>📅 {form.date_naissance}</div>}
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {form.telephone && <Badge color="#5aa05a">☎ {form.telephone}</Badge>}
                {form.contact_urgence_telephone && <Badge color="#e35d5b">🚨 Urgence</Badge>}
                {form.gir && <Badge color="#7a6fb0">GIR {form.gir}</Badge>}
                {form.allergies && <Badge color="#c0392b">⚠ Allergies</Badge>}
              </div>
            </div>
            <div style={{ background: "rgba(124,200,200,.08)", borderRadius: 10, padding: 14, fontSize: 12, color: "#bfe6e6", lineHeight: 1.5 }}>
              <i className="ti ti-info-circle" /> Après création, tu seras redirigé vers la page <b>QR bracelet</b> pour imprimer le bracelet d'identification du patient (formats A4 fiche ou A6 bracelet).
            </div>
          </Section>
        )}
      </div>

      {/* Footer navigation */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(20,33,49,.95)", backdropFilter: "blur(14px)",
        borderTop: "1px solid rgba(255,255,255,.08)",
        padding: "12px 16px", display: "flex", gap: 10,
      }}>
        <button onClick={prev} disabled={step === 1} style={{
          background: "rgba(255,255,255,.08)", color: "#fff",
          border: "1px solid rgba(255,255,255,.16)",
          padding: "12px 18px", borderRadius: 10, cursor: step === 1 ? "default" : "pointer",
          fontFamily: "inherit", fontSize: 13, fontWeight: 600,
          opacity: step === 1 ? 0.4 : 1,
        }}>
          <i className="ti ti-chevron-left" /> Retour
        </button>
        {step < 4 ? (
          <button onClick={next} style={{
            flex: 1, background: "linear-gradient(135deg, #C9867F, #b3756e)",
            color: "#fff", border: "none",
            padding: "12px 18px", borderRadius: 10, cursor: "pointer",
            fontFamily: "inherit", fontSize: 14, fontWeight: 700,
          }}>
            Suivant <i className="ti ti-chevron-right" />
          </button>
        ) : (
          <button onClick={save} disabled={busy || !form.nom} style={{
            flex: 1, background: "linear-gradient(135deg, #5aa05a, #4a8a4a)",
            color: "#fff", border: "none",
            padding: "12px 18px", borderRadius: 10, cursor: busy ? "wait" : "pointer",
            fontFamily: "inherit", fontSize: 14, fontWeight: 700,
            opacity: (busy || !form.nom) ? 0.6 : 1,
          }}>
            {busy ? "Création..." : <>✓ Créer & imprimer bracelet</>}
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon, color, children }) {
  return (
    <div style={{
      background: "rgba(255,255,255,.04)", borderRadius: 14,
      padding: "16px 16px", marginBottom: 12,
      borderLeft: `4px solid ${color}`,
    }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 13, color, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
        <i className={`ti ${icon}`} /> {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 11, color: "#bfe6e6", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
        {label} {required && <span style={{ color: "#e35d5b" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Badge({ color, children }) {
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600,
      background: `${color}22`, color, border: `1px solid ${color}44`,
    }}>{children}</span>
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

function btnRadio(active, color) {
  return {
    padding: "8px 14px",
    background: active ? color : "rgba(255,255,255,.06)",
    color: active ? "#fff" : "#bfe6e6",
    border: `1px solid ${active ? color : "rgba(255,255,255,.14)"}`,
    borderRadius: 10,
    fontFamily: "inherit",
    fontSize: 13, fontWeight: 600,
    cursor: "pointer",
  };
}
