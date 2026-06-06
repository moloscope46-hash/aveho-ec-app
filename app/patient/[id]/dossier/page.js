"use client";
// =============================================================
//  /patient/[id]/dossier — Dossier médical premium (0.59.3)
//  UI riche : antécédents, allergies, traitements, notes, documents
// =============================================================
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/useAuth";
import TopBar from "../../../TopBar";
import { useCart } from "../../../useCart";
import { Panel, Btn } from "../../../ui";
import BackButton from "../../../components/BackButton";

const SECTIONS = [
  { id: "synthese",    icon: "ti-clipboard-pulse",  lbl: "Synthèse",    col: "#185FA5" },
  { id: "antecedents", icon: "ti-history",          lbl: "Antécédents", col: "#7a6fb0" },
  { id: "allergies",   icon: "ti-alert-triangle",   lbl: "Allergies",   col: "#e35d5b" },
  { id: "traitements", icon: "ti-pill",             lbl: "Traitements", col: "#5aa05a" },
  { id: "pathologie",  icon: "ti-stethoscope",      lbl: "Pathologie",  col: "#C9867F" },
  { id: "notes",       icon: "ti-notebook",         lbl: "Notes",       col: "#EF9F27" },
  { id: "interventions", icon: "ti-tools",          lbl: "Interventions", col: "#7CC8C8" },
];

export default function DossierMedicalPage() {
  const router = useRouter();
  const { id } = useParams();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [pat, setPat] = useState(null);
  const [pathologie, setPathologie] = useState(null);
  const [collaborateur, setCollaborateur] = useState(null);
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("synthese");
  const [editing, setEditing] = useState(null); // section being edited
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id || !auth.ready) return;
    (async () => {
      try {
        const tryFetch = async (q) => { try { const r = await q; return r.data; } catch { return null; } };

        const [p, intervs] = await Promise.all([
          tryFetch(supabase.from("patients").select("*").eq("id", id).single()),
          tryFetch(supabase.from("interventions").select("id, type, statut, date_prevue, created_at").eq("patient_id", id).order("created_at", { ascending: false }).limit(20)),
        ]);
        setPat(p);
        setInterventions(intervs || []);

        if (p?.pathologie_id) {
          const rp = await tryFetch(supabase.from("pathologies").select("*").eq("id", p.pathologie_id).single());
          setPathologie(rp);
        }
        if (p?.collaborateur_id) {
          const rc = await tryFetch(supabase.from("v_collaborateurs").select("*").eq("user_id", p.collaborateur_id).single());
          setCollaborateur(rc);
        }
      } finally { setLoading(false); }
    })();
  }, [id, auth.ready]);

  async function saveField(field, value) {
    if (!pat) return;
    setSaving(true);
    try {
      const r = await supabase.from("patients").update({ [field]: value }).eq("id", id);
      if (r.error) throw r.error;
      setPat({ ...pat, [field]: value });
      setEditing(null);
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Chargement...</div>;
  if (!pat) return <div style={{ padding: 40, textAlign: "center" }}>Patient introuvable</div>;

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content">
        <BackButton />

        {/* Header patient */}
        <div style={{
          background: `linear-gradient(135deg, ${pathologie?.couleur || "#185FA5"}22, ${pathologie?.couleur || "#185FA5"}08)`,
          borderLeft: `4px solid ${pathologie?.couleur || "#185FA5"}`,
          borderRadius: 14, padding: 20, marginBottom: 18,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: `${pathologie?.couleur || "#185FA5"}33`, color: pathologie?.couleur || "#185FA5",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700,
            }}>
              {(pat.prenom?.[0] || "") + (pat.nom?.[0] || "?")}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h1 style={{ margin: "0 0 4px", fontSize: 22, color: "#142131" }}>
                {pat.prenom} {pat.nom}
              </h1>
              <div style={{ fontSize: 12.5, color: "#5a6878", display: "flex", gap: 12, flexWrap: "wrap" }}>
                {pat.date_naissance && <span><i className="ti ti-cake" /> {new Date(pat.date_naissance).toLocaleDateString("fr-FR")}</span>}
                {pat.numero_secu && <span style={{ fontFamily: "Consolas,monospace" }}><i className="ti ti-shield" /> {pat.numero_secu.substring(0, 13)}</span>}
                {pathologie && <span style={{ color: pathologie.couleur, fontWeight: 700 }}><i className={`ti ${pathologie.icone}`} /> {pathologie.nom}</span>}
              </div>
            </div>
            <Btn variant="primary" icon="ti-edit" onClick={() => router.push(`/patient/${id}/edit`)}>Éditer la fiche</Btn>
            <Btn variant="ghost" icon="ti-qrcode" onClick={() => router.push(`/patients/${id}/qr`)}>QR / Bracelet</Btn>
          </div>
        </div>

        {/* Onglets sections */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
              padding: "8px 14px", border: "none", borderRadius: 8,
              background: activeSection === s.id ? `${s.col}22` : "transparent",
              borderBottom: activeSection === s.id ? `3px solid ${s.col}` : "3px solid transparent",
              color: activeSection === s.id ? s.col : "#5a6878",
              fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
            }}>
              <i className={`ti ${s.icon}`} /> {s.lbl}
            </button>
          ))}
        </div>

        {/* === SYNTHÈSE === */}
        {activeSection === "synthese" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            <SyntheseCard color="#185FA5" icon="ti-stethoscope" title="Pathologie principale"
              value={pathologie ? <><span style={{ color: pathologie.couleur }}>{pathologie.nom}</span>{pathologie.code && <code style={{ marginLeft: 6, fontSize: 11, color: "#8a98a8" }}>{pathologie.code}</code>}</> : <em style={{ color: "#8a98a8" }}>Non définie</em>}
            />
            <SyntheseCard color="#7CC8C8" icon="ti-user-heart" title="Référent"
              value={collaborateur ? `${collaborateur.prenom || ""} ${collaborateur.nom || ""}`.trim() + (collaborateur.role_professionnel ? ` (${collaborateur.role_professionnel})` : "") : <em style={{ color: "#8a98a8" }}>Non défini</em>}
            />
            <SyntheseCard color="#e35d5b" icon="ti-alert-triangle" title="Allergies" warning={!!pat.allergies}
              value={pat.allergies || <em style={{ color: "#8a98a8" }}>Aucune renseignée</em>}
            />
            <SyntheseCard color="#5aa05a" icon="ti-pill" title="Traitements"
              value={pat.traitements || pat.medicaments_actifs || <em style={{ color: "#8a98a8" }}>Aucun renseigné</em>}
            />
            <SyntheseCard color="#7a6fb0" icon="ti-activity" title="GIR"
              value={pat.gir ? `GIR ${pat.gir}` : <em style={{ color: "#8a98a8" }}>Non évalué</em>}
            />
            <SyntheseCard color="#EF9F27" icon="ti-tools" title="Interventions"
              value={`${interventions.length} intervention${interventions.length > 1 ? "s" : ""}`}
            />
          </div>
        )}

        {/* === ANTÉCÉDENTS === */}
        {activeSection === "antecedents" && (
          <EditableSection title="Antécédents médicaux" icon="ti-history" color="#7a6fb0"
            value={pat.antecedents} editing={editing === "antecedents"} saving={saving}
            onEdit={() => setEditing("antecedents")} onCancel={() => setEditing(null)}
            onSave={(v) => saveField("antecedents", v)}
            placeholder="HTA depuis 2018, diabète type II, fracture col fémoral 2022..."
            help="Antécédents médicaux, chirurgicaux, familiaux importants pour le suivi"
          />
        )}

        {/* === ALLERGIES === */}
        {activeSection === "allergies" && (
          <EditableSection title="Allergies & intolérances" icon="ti-alert-triangle" color="#e35d5b"
            value={pat.allergies} editing={editing === "allergies"} saving={saving}
            onEdit={() => setEditing("allergies")} onCancel={() => setEditing(null)}
            onSave={(v) => saveField("allergies", v)}
            placeholder="Pénicilline (réaction cutanée), arachides..."
            help="⚠ Information critique - sera affichée en alerte rouge dans les fiches"
          />
        )}

        {/* === TRAITEMENTS === */}
        {activeSection === "traitements" && (
          <EditableSection title="Traitements en cours" icon="ti-pill" color="#5aa05a"
            value={pat.traitements || pat.medicaments_actifs} editing={editing === "traitements"} saving={saving}
            onEdit={() => setEditing("traitements")} onCancel={() => setEditing(null)}
            onSave={(v) => saveField("traitements", v)}
            placeholder="Doliprane 1g x3/jour si douleur, Metformine 850mg matin et soir..."
            help="Posologies, fréquences, durées des traitements en cours"
          />
        )}

        {/* === PATHOLOGIE === */}
        {activeSection === "pathologie" && (
          <Panel>
            {pathologie ? (
              <>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                  <div style={{ width: 48, height: 48, background: `${pathologie.couleur}22`, color: pathologie.couleur, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                    <i className={`ti ${pathologie.icone}`} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, color: "#142131" }}>{pathologie.nom}</h2>
                    {pathologie.code && <div style={{ fontFamily: "Consolas,monospace", fontSize: 11, color: "#8a98a8" }}>{pathologie.code}</div>}
                  </div>
                </div>
                {pathologie.description && (
                  <div style={{ marginBottom: 12, color: "#5a6878", fontSize: 13 }}>{pathologie.description}</div>
                )}
                {pathologie.protocole_court && (
                  <div style={{ background: `${pathologie.couleur}11`, borderLeft: `3px solid ${pathologie.couleur}`, padding: 12, borderRadius: 6, marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: pathologie.couleur, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Protocole</div>
                    <div style={{ fontSize: 13, color: "#142131" }}>{pathologie.protocole_court}</div>
                  </div>
                )}
                {pathologie.protocole_detail && (
                  <details style={{ marginBottom: 10 }}>
                    <summary style={{ cursor: "pointer", color: "#185FA5", fontSize: 12, fontWeight: 600 }}>Voir protocole détaillé</summary>
                    <div style={{ fontSize: 12.5, color: "#142131", padding: 10, background: "#fafbfc", borderRadius: 6, marginTop: 6, whiteSpace: "pre-wrap" }}>{pathologie.protocole_detail}</div>
                  </details>
                )}
                {pathologie.alertes && (
                  <div style={{ background: "rgba(227,93,91,.10)", borderLeft: "3px solid #e35d5b", padding: 12, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#e35d5b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>⚠ Alertes</div>
                    <div style={{ fontSize: 13, color: "#c0392b", fontWeight: 600 }}>{pathologie.alertes}</div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: 30, textAlign: "center", color: "#5a6878" }}>
                <i className="ti ti-stethoscope" style={{ fontSize: 40, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
                Aucune pathologie associée. Édite la fiche patient pour en assigner une.
              </div>
            )}
          </Panel>
        )}

        {/* === NOTES === */}
        {activeSection === "notes" && (
          <EditableSection title="Notes libres" icon="ti-notebook" color="#EF9F27"
            value={pat.notes} editing={editing === "notes"} saving={saving}
            onEdit={() => setEditing("notes")} onCancel={() => setEditing(null)}
            onSave={(v) => saveField("notes", v)}
            placeholder="Observations, remarques, particularités..."
            help="Notes libres visibles pour toute l'équipe soignante"
            rows={8}
          />
        )}

        {/* === INTERVENTIONS === */}
        {activeSection === "interventions" && (
          <Panel>
            <h3 style={{ margin: "0 0 12px", color: "#7CC8C8", display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-tools" /> Interventions ({interventions.length})
            </h3>
            {interventions.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>Aucune intervention enregistrée.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {interventions.map(iv => (
                  <div key={iv.id} onClick={() => router.push(`/interventions/${iv.id}`)} style={{
                    background: "#fff", border: "1px solid #e3e9ee", borderLeft: "3px solid #7CC8C8",
                    borderRadius: 8, padding: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <i className="ti ti-tool" style={{ color: "#7CC8C8", fontSize: 20 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: "#142131" }}>{iv.type || "Intervention"}</div>
                      <div style={{ fontSize: 11, color: "#8a98a8" }}>
                        {iv.date_prevue ? new Date(iv.date_prevue).toLocaleDateString("fr-FR") : new Date(iv.created_at).toLocaleDateString("fr-FR")}
                        {iv.statut && <span style={{ marginLeft: 8, color: "#5a6878" }}>· {iv.statut}</span>}
                      </div>
                    </div>
                    <i className="ti ti-chevron-right" style={{ color: "#8a98a8" }} />
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}

function SyntheseCard({ color, icon, title, value, warning }) {
  return (
    <div style={{
      background: warning ? "rgba(227,93,91,.06)" : "#fff",
      border: `1px solid ${warning ? "#e35d5b33" : "#e3e9ee"}`,
      borderLeft: `4px solid ${color}`,
      borderRadius: 10, padding: 14,
    }}>
      <div style={{ fontSize: 11, color: "#8a98a8", textTransform: "uppercase", fontWeight: 700, letterSpacing: 1, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
        <i className={`ti ${icon}`} style={{ color }} /> {title}
      </div>
      <div style={{ fontSize: 13.5, color: "#142131", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function EditableSection({ title, icon, color, value, editing, saving, onEdit, onCancel, onSave, placeholder, help, rows = 5 }) {
  const [draft, setDraft] = useState(value || "");
  useEffect(() => { setDraft(value || ""); }, [value]);

  return (
    <Panel>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h3 style={{ margin: 0, color, display: "flex", alignItems: "center", gap: 8 }}>
          <i className={`ti ${icon}`} /> {title}
        </h3>
        {!editing ? (
          <Btn variant="ghost" icon="ti-pencil" onClick={onEdit}>Éditer</Btn>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <Btn variant="ghost" onClick={onCancel}>Annuler</Btn>
            <Btn variant="primary" icon="ti-device-floppy" onClick={() => onSave(draft)}>{saving ? "..." : "Enregistrer"}</Btn>
          </div>
        )}
      </div>
      {help && <div style={{ fontSize: 11.5, color: "#8a98a8", marginBottom: 8 }}>{help}</div>}
      {editing ? (
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={rows} autoFocus placeholder={placeholder}
          style={{ width: "100%", padding: "10px 12px", background: "#fafbfc", border: `2px solid ${color}33`, borderRadius: 8, fontFamily: "inherit", fontSize: 13.5, color: "#142131" }} />
      ) : value ? (
        <div style={{ background: `${color}08`, padding: 14, borderRadius: 8, color: "#142131", fontSize: 13.5, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{value}</div>
      ) : (
        <div style={{ padding: 20, textAlign: "center", color: "#8a98a8", fontSize: 13, fontStyle: "italic" }}>
          Rien de renseigné. Click sur "Éditer" pour ajouter.
        </div>
      )}
    </Panel>
  );
}
