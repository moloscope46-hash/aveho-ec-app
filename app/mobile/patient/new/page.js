"use client";
// =============================================================
//  /mobile/patient/new â€” Assistant crÃ©ation patient (3 Ã©tapes)
// =============================================================
import { useState, useEffect } from "react";
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
    etat: "PrÃ©sent",
    statut_sejour: "En cours",
    // 0.58.85 : affectation
    etablissement_id: "",
    batiment_id: "",
    service_id: "",
    chambre_id: "",
  });

  // 0.58.85 : refs pour sÃ©lecteurs cascade
  const [etablissements, setEtablissements] = useState([]);
  const [batiments, setBatiments] = useState([]);
  const [services, setServices] = useState([]);
  const [chambres, setChambres] = useState([]);

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    (async () => {
      const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
      const [etabs, bats, svcs, chs] = await Promise.all([
        tryFetch(supabase.from("etablissements").select("id, nom").eq("structure_id", auth.structureId)),
        tryFetch(supabase.from("batiments").select("id, nom, etablissement_id").eq("structure_id", auth.structureId)),
        tryFetch(supabase.from("services").select("id, nom").eq("structure_id", auth.structureId)),
        tryFetch(supabase.from("chambres").select("id, nom, service_id").eq("structure_id", auth.structureId).limit(500)),
      ]);
      setEtablissements(etabs);
      setBatiments(bats);
      setServices(svcs);
      setChambres(chs);
      // PrÃ©-remplissage avec l'Ã©tablissement courant si l'utilisateur n'a accÃ¨s qu'Ã  un seul
      if (etabs.length === 1) {
        setForm(f => ({ ...f, etablissement_id: etabs[0].id }));
      } else if (auth.etabId) {
        setForm(f => ({ ...f, etablissement_id: auth.etabId }));
      }
    })();
  }, [auth.ready, auth.structureId, auth.etabId]);

  // Filtres cascade
  const filteredBatiments = form.etablissement_id
    ? batiments.filter(b => b.etablissement_id === form.etablissement_id)
    : batiments;
  const filteredServices = form.batiment_id
    ? services.filter(s => s.batiment_id === form.batiment_id || s.batiment_id == null)
    : services;
  const filteredChambres = form.service_id
    ? chambres.filter(c => c.service_id === form.service_id)
    : chambres;

  function next() { setStep(Math.min(step + 1, 4)); }
  function prev() { setStep(Math.max(step - 1, 1)); }

  async function save() {
    if (!form.nom?.trim()) { alert("Le nom est obligatoire"); return; }
    setBusy(true);
    try {
      const payload = {
        structure_id: auth.structureId,
        etablissement_id: form.etablissement_id || auth.etabId || null,
        chambre_id: form.chambre_id || null,
        ...form,
        gir: form.gir ? parseInt(form.gir, 10) : null,
        created_by: auth.user?.id,
      };
      // Retire les clÃ©s UI seulement
      delete payload.batiment_id;
      delete payload.service_id;
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
          Ã‰tape {step} / 4 Â· {step === 1 ? "IdentitÃ©" : step === 2 ? "CoordonnÃ©es + Urgence" : step === 3 ? "MÃ©dical" : "Validation"}
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* Ã‰TAPE 1 â€” IDENTITÃ‰ */}
        {step === 1 && (
          <Section title="IdentitÃ©" icon="ti-id" color="#C9867F">
            <Field label="CivilitÃ©">
              <div style={{ display: "flex", gap: 6 }}>
                {["M.", "Mme", "Dr"].map(c => (
                  <button key={c} type="button" onClick={() => setForm({ ...form, civilite: c })} style={btnRadio(form.civilite === c, "#C9867F")}>{c}</button>
                ))}
              </div>
            </Field>
            <Field label="Nom *" required>
              <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value.toUpperCase() })} placeholder="DUPONT" style={inputStyle} autoFocus />
            </Field>
            <Field label="PrÃ©nom">
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

        {/* Ã‰TAPE 1bis dans Ã©tape 1 : Affectation */}
        {step === 1 && (
          <Section title="Affectation" icon="ti-building" color="#185FA5">
            {etablissements.length > 1 && (
              <Field label="Ã‰tablissement">
                <select value={form.etablissement_id} onChange={e => setForm({ ...form, etablissement_id: e.target.value, batiment_id: "", service_id: "", chambre_id: "" })} style={inputStyle}>
                  <option value="">â€” SÃ©lectionner â€”</option>
                  {etablissements.map(et => <option key={et.id} value={et.id}>{et.nom}</option>)}
                </select>
              </Field>
            )}
            {filteredBatiments.length > 0 && (
              <Field label="BÃ¢timent">
                <select value={form.batiment_id} onChange={e => setForm({ ...form, batiment_id: e.target.value, service_id: "", chambre_id: "" })} style={inputStyle}>
                  <option value="">â€” Aucun â€”</option>
                  {filteredBatiments.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
                </select>
              </Field>
            )}
            {filteredServices.length > 0 && (
              <Field label="Service">
                <select value={form.service_id} onChange={e => setForm({ ...form, service_id: e.target.value, chambre_id: "" })} style={inputStyle}>
                  <option value="">â€” Aucun â€”</option>
                  {filteredServices.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </Field>
            )}
            {filteredChambres.length > 0 && (
              <Field label="Chambre">
                <select value={form.chambre_id} onChange={e => setForm({ ...form, chambre_id: e.target.value })} style={inputStyle}>
                  <option value="">â€” Aucune â€”</option>
                  {filteredChambres.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </Field>
            )}
          </Section>
        )}

        {/* Ã‰TAPE 2 â€” COORDONNÃ‰ES */}
        {step === 2 && (
          <>
            <Section title="CoordonnÃ©es" icon="ti-phone" color="#5aa05a">
              <Field label="TÃ©lÃ©phone personnel">
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
              <Field label="TÃ©lÃ©phone">
                <input type="tel" value={form.contact_urgence_telephone} onChange={e => setForm({ ...form, contact_urgence_telephone: e.target.value })} placeholder="06 12 34 56 78" style={inputStyle} />
              </Field>
              <Field label="Lien">
                <select value={form.contact_urgence_lien} onChange={e => setForm({ ...form, contact_urgence_lien: e.target.value })} style={inputStyle}>
                  <option value="">â€”</option>
                  <option>Conjoint</option><option>Enfant</option><option>Parent</option>
                  <option>FrÃ¨re/SÅ“ur</option><option>Tuteur</option><option>Autre</option>
                </select>
              </Field>
            </Section>
          </>
        )}

        {/* Ã‰TAPE 3 â€” MÃ‰DICAL */}
        {step === 3 && (
          <Section title="Informations mÃ©dicales" icon="ti-stethoscope" color="#7a6fb0">
            <Field label="MÃ©decin traitant">
              <input value={form.medecin_traitant} onChange={e => setForm({ ...form, medecin_traitant: e.target.value })} placeholder="Dr Lambert" style={inputStyle} />
            </Field>
            <Field label="TÃ©lÃ©phone mÃ©decin">
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
            <Field label="MobilitÃ©">
              <select value={form.mobilite} onChange={e => setForm({ ...form, mobilite: e.target.value })} style={inputStyle}>
                <option value="">â€”</option>
                <option>Autonome</option><option>Assistance</option>
                <option>Fauteuil</option><option>AlitÃ©</option>
              </select>
            </Field>
            <Field label="Allergies">
              <input value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} placeholder="PÃ©nicilline, latex..." style={inputStyle} />
            </Field>
            <Field label="RÃ©gime alimentaire">
              <input value={form.regime_alimentaire} onChange={e => setForm({ ...form, regime_alimentaire: e.target.value })} placeholder="Sans sel, mixÃ©..." style={inputStyle} />
            </Field>
          </Section>
        )}

        {/* Ã‰TAPE 4 â€” RÃ‰CAP & VALIDATION */}
        {step === 4 && (
          <Section title="RÃ©capitulatif" icon="ti-check" color="#5aa05a">
            <div style={{ background: "rgba(255,255,255,.04)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div style={{ color: "#bfe6e6", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Patient Ã  crÃ©er</div>
              <div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>
                {form.civilite && <span>{form.civilite} </span>}
                {form.nom} {form.prenom}
              </div>
              {form.nom_jeune_fille && <div style={{ color: "#bfe6e6", fontSize: 12 }}>nÃ©e {form.nom_jeune_fille}</div>}
              {form.date_naissance && <div style={{ color: "#bfe6e6", fontSize: 12, marginTop: 4 }}>ðŸ“… {form.date_naissance}</div>}
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {form.telephone && <Badge color="#5aa05a">â˜Ž {form.telephone}</Badge>}
                {form.contact_urgence_telephone && <Badge color="#e35d5b">ðŸš¨ Urgence</Badge>}
                {form.gir && <Badge color="#7a6fb0">GIR {form.gir}</Badge>}
                {form.allergies && <Badge color="#c0392b">âš  Allergies</Badge>}
              </div>
            </div>
            <div style={{ background: "rgba(124,200,200,.08)", borderRadius: 10, padding: 14, fontSize: 12, color: "#bfe6e6", lineHeight: 1.5 }}>
              <i className="ti ti-info-circle" /> AprÃ¨s crÃ©ation, tu seras redirigÃ© vers la page <b>QR bracelet</b> pour imprimer le bracelet d'identification du patient (formats A4 fiche ou A6 bracelet).
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
            {busy ? "CrÃ©ation..." : <>âœ“ CrÃ©er & imprimer bracelet</>}
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
