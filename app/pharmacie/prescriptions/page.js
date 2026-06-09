"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { PageShell, ModernCard, ModernModal, ModalBtn, HiTechIconBox } from "../../components/ui-premium";
import PermissionGate from "../../components/PermissionGate";

const COLOR = "#7a6fb0";

const STATUT_CONFIG = {
  "active":          { c: "#5aa05a", ic: "ti-check-circle",  l: "Active" },
  "expire-bientot":  { c: "#EF9F27", ic: "ti-alert-triangle",l: "Expire bientôt" },
  "expirée":         { c: "#D45E5E", ic: "ti-clock",         l: "Expirée" },
  "suspendue":       { c: "#888",    ic: "ti-pause",         l: "Suspendue" },
  "terminee":        { c: "#7CC8C8", ic: "ti-check",         l: "Terminée" },
  "annulee":         { c: "#888",    ic: "ti-x",             l: "Annulée" },
};

export default function PrescriptionsPage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();

  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [medicaments, setMedicaments] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [search, setSearch] = useState("");
  const [fStatut, setFStatut] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ lignes: [{}] });

  useEffect(() => { if (auth.ready) reload(); }, [auth.ready]);

  async function reload() {
    setLoading(true);
    try {
      const r = await supabase.from("v_prescriptions_complete").select("*").eq("structure_id", auth.structureId).order("date_prescription", { ascending: false });
      if (r.error?.code === "42P01") { setTableMissing(true); setLoading(false); return; }
      setPrescriptions(r.data || []);

      const [pa, m, ph] = await Promise.all([
        supabase.from("patients").select("id, nom, prenom").eq("structure_id", auth.structureId).order("nom"),
        supabase.from("medicaments").select("id, nom_commercial, dosage, dci").eq("structure_id", auth.structureId).order("nom_commercial"),
        supabase.from("pharmacies").select("id, nom").eq("structure_id", auth.structureId),
      ]);
      setPatients(pa.data || []);
      setMedicaments(m.data || []);
      setPharmacies(ph.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function savePrescription() {
    if (!form.patient_id || !form.numero_ordonnance) return;
    const numero = form.numero_ordonnance;

    // Création prescription
    const { data: p, error } = await supabase.from("prescriptions").insert({
      structure_id: auth.structureId,
      patient_id: form.patient_id,
      pharmacie_id: form.pharmacie_id || pharmacies[0]?.id,
      prescripteur_nom: form.prescripteur_nom,
      prescripteur_rpps: form.prescripteur_rpps,
      numero_ordonnance: numero,
      date_prescription: form.date_prescription || new Date().toISOString().substring(0, 10),
      date_debut_traitement: form.date_debut_traitement || new Date().toISOString().substring(0, 10),
      duree_jours: parseInt(form.duree_jours) || 30,
      date_fin_traitement: form.date_fin_traitement,
      est_renouvelable: !!form.est_renouvelable,
      statut: "active",
      notes: form.notes,
    }).select().single();

    if (error) { alert(error.message); return; }

    // Insérer les lignes
    const lignes = (form.lignes || []).filter(l => l.medicament_id || l.designation).map(l => ({
      structure_id: auth.structureId,
      prescription_id: p.id,
      medicament_id: l.medicament_id,
      designation: l.designation,
      posologie: l.posologie,
      quantite_prescrite: parseInt(l.quantite_prescrite) || null,
      nb_prises_jour: parseInt(l.nb_prises_jour) || null,
      moment_prise: l.moment_prise,
      duree_jours: parseInt(l.duree_jours) || null,
    }));
    if (lignes.length > 0) {
      await supabase.from("prescription_lignes").insert(lignes);
    }

    setModal(null);
    setForm({ lignes: [{}] });
    reload();
  }

  async function renouveler(prescId) {
    if (!confirm("Renouveler cette prescription ?")) return;
    const { data, error } = await supabase.rpc("renouveler_prescription", { p_prescription_id: prescId });
    if (error) { alert("Erreur : " + error.message); return; }
    alert("Prescription renouvelée avec succès");
    reload();
  }

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return prescriptions.filter(p => {
      if (s && !((p.numero_ordonnance || "").toLowerCase().includes(s) || (p.patient_nom || "").toLowerCase().includes(s) || (p.prescripteur_nom || "").toLowerCase().includes(s))) return false;
      if (fStatut && p.statut_calcule !== fStatut) return false;
      return true;
    });
  }, [prescriptions, search, fStatut]);

  if (tableMissing) {
    return (
      <>
        <TopBar />
        <PageShell color={COLOR} icon="ti-prescription" title="Prescriptions" subtitle="Module non installé">
          <ModernCard color={COLOR} variant="accent" icon="ti-alert-triangle" title="Tables non installées">
            <p style={{ color: "rgba(255,255,255,.8)" }}>Exécute le SQL <strong>aveho-MODULE-pharmacie-phase2.sql</strong> dans Supabase.</p>
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
        icon="ti-prescription"
        title="Prescriptions"
        subtitle="Ordonnances et renouvellements"
        badge={`${prescriptions.length}`}
        actions={
          <button onClick={() => { setForm({ lignes: [{}], date_prescription: new Date().toISOString().substring(0, 10), duree_jours: 30 }); setModal("new"); }} style={{
            padding: "10px 18px", borderRadius: 10,
            background: `linear-gradient(135deg, ${COLOR} 0%, ${COLOR}dd 100%)`,
            color: "#fff", border: "none",
            fontFamily: "Quicksand", fontWeight: 700, fontSize: 13,
            cursor: "pointer", boxShadow: `0 4px 12px ${COLOR}50`,
          }}>
            <i className="ti ti-plus" /> Nouvelle prescription
          </button>
        }
      >
        {/* Filtres */}
        <ModernCard color={COLOR} variant="default" padding={14} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              placeholder="Rechercher numéro, patient, prescripteur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 250, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", color: "#fff", border: "1px solid rgba(255,255,255,.15)" }}
            />
            <select value={fStatut} onChange={(e) => setFStatut(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", color: "#fff", border: "1px solid rgba(255,255,255,.15)" }}>
              <option value="">Tous statuts</option>
              {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
            </select>
          </div>
        </ModernCard>

        {/* Liste */}
        {loading ? (
          <ModernCard color={COLOR}><p style={{ color: "rgba(255,255,255,.7)", margin: 0 }}>Chargement...</p></ModernCard>
        ) : filtered.length === 0 ? (
          <ModernCard color={COLOR} variant="accent" icon="ti-info-circle" title="Aucune prescription">
            <p style={{ color: "rgba(255,255,255,.7)", margin: 0 }}>Crée une première ordonnance.</p>
          </ModernCard>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 14 }}>
            {filtered.map(p => {
              const stat = STATUT_CONFIG[p.statut_calcule] || STATUT_CONFIG.active;
              return (
                <ModernCard key={p.id} color={stat.c} variant="default" padding={0} hoverable>
                  <div style={{ padding: "12px 16px", background: `linear-gradient(135deg, ${stat.c}25 0%, ${stat.c}10 100%)`, borderBottom: `1px solid ${stat.c}30`, display: "flex", alignItems: "center", gap: 12 }}>
                    <HiTechIconBox name={stat.ic} color={stat.c} variant="gradient" size={40} pulse={p.statut_calcule === "expire-bientot"} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>{p.numero_ordonnance}</div>
                      <div style={{ color: "rgba(255,255,255,.55)", fontSize: 11 }}>{p.patient_prenom} {p.patient_nom}</div>
                    </div>
                    <span style={{ background: `${stat.c}30`, color: stat.c, border: `1px solid ${stat.c}60`, padding: "3px 10px", borderRadius: 10, fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{stat.l}</span>
                  </div>
                  <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                    <Detail label="Prescripteur" value={p.prescripteur_nom || "—"} />
                    <Detail label="Date" value={p.date_prescription ? new Date(p.date_prescription).toLocaleDateString("fr-FR") : "—"} />
                    <Detail label="Lignes" value={p.nb_lignes || 0} />
                    <Detail label="Dispensations" value={p.nb_dispensations || 0} />
                    {p.jours_restants > 0 && <Detail label="Jours restants" value={`${p.jours_restants}j`} full />}
                  </div>
                  {p.est_renouvelable && p.statut_calcule !== "expirée" && (
                    <div style={{ padding: "10px 14px", borderTop: `1px solid ${stat.c}20`, display: "flex", gap: 8 }}>
                      <button onClick={(e) => { e.stopPropagation(); renouveler(p.id); }} style={{
                        flex: 1, padding: "6px 12px", borderRadius: 8,
                        background: `${COLOR}25`, color: "#fff", border: `1px solid ${COLOR}50`,
                        fontFamily: "Quicksand", fontWeight: 700, fontSize: 11, cursor: "pointer",
                      }}>
                        <i className="ti ti-refresh" /> Renouveler ({p.nb_renouvellements})
                      </button>
                    </div>
                  )}
                </ModernCard>
              );
            })}
          </div>
        )}

        {/* MODAL Nouvelle prescription */}
        <ModernModal
          open={modal === "new"}
          onClose={() => { setModal(null); setForm({ lignes: [{}] }); }}
          color={COLOR} icon="ti-prescription"
          title="Nouvelle prescription"
          size="lg"
          actions={
            <>
              <ModalBtn variant="secondary" onClick={() => { setModal(null); setForm({ lignes: [{}] }); }}>Annuler</ModalBtn>
              <ModalBtn variant="primary" color={COLOR} icon="ti-check" onClick={savePrescription} disabled={!form.patient_id || !form.numero_ordonnance}>Créer</ModalBtn>
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <FieldM label="N° ordonnance *"><input value={form.numero_ordonnance || ""} onChange={(e) => setForm({ ...form, numero_ordonnance: e.target.value })} placeholder="ORD-2026-001" /></FieldM>
            <FieldM label="Date prescription"><input type="date" value={form.date_prescription || ""} onChange={(e) => setForm({ ...form, date_prescription: e.target.value })} /></FieldM>
            <FieldM label="Patient *" full>
              <select value={form.patient_id || ""} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
                <option value="">— Sélectionner —</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
              </select>
            </FieldM>
            <FieldM label="Prescripteur"><input value={form.prescripteur_nom || ""} onChange={(e) => setForm({ ...form, prescripteur_nom: e.target.value })} placeholder="Dr. Martin DUBOIS" /></FieldM>
            <FieldM label="RPPS prescripteur"><input value={form.prescripteur_rpps || ""} onChange={(e) => setForm({ ...form, prescripteur_rpps: e.target.value })} /></FieldM>
            <FieldM label="Durée (jours)"><input type="number" value={form.duree_jours || 30} onChange={(e) => setForm({ ...form, duree_jours: e.target.value })} /></FieldM>
            <FieldM label="Renouvelable">
              <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#142131", padding: "8px 0" }}>
                <input type="checkbox" checked={!!form.est_renouvelable} onChange={(e) => setForm({ ...form, est_renouvelable: e.target.checked })} />
                Oui, peut être renouvelée
              </label>
            </FieldM>
          </div>

          {/* Lignes médicaments */}
          <div style={{ marginTop: 6, marginBottom: 8 }}>
            <h4 style={{ color: "#142131", margin: "0 0 8px", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>Médicaments prescrits</h4>
            {(form.lignes || []).map((l, idx) => (
              <div key={idx} style={{ padding: 10, background: "#f4f7fa", borderRadius: 10, marginBottom: 6, display: "grid", gridTemplateColumns: "2fr 1fr 80px 80px 40px", gap: 8, alignItems: "end" }}>
                <FieldM label="Médicament">
                  <select value={l.medicament_id || ""} onChange={(e) => {
                    const lignes = [...(form.lignes || [])];
                    lignes[idx] = { ...lignes[idx], medicament_id: e.target.value };
                    setForm({ ...form, lignes });
                  }}>
                    <option value="">— Choisir —</option>
                    {medicaments.map(m => <option key={m.id} value={m.id}>{m.nom_commercial} {m.dosage}</option>)}
                  </select>
                </FieldM>
                <FieldM label="Posologie">
                  <input value={l.posologie || ""} onChange={(e) => {
                    const lignes = [...form.lignes];
                    lignes[idx] = { ...lignes[idx], posologie: e.target.value };
                    setForm({ ...form, lignes });
                  }} placeholder="1cp matin midi soir" />
                </FieldM>
                <FieldM label="Quantité">
                  <input type="number" value={l.quantite_prescrite || ""} onChange={(e) => {
                    const lignes = [...form.lignes];
                    lignes[idx] = { ...lignes[idx], quantite_prescrite: e.target.value };
                    setForm({ ...form, lignes });
                  }} />
                </FieldM>
                <FieldM label="Prises/j">
                  <input type="number" value={l.nb_prises_jour || ""} onChange={(e) => {
                    const lignes = [...form.lignes];
                    lignes[idx] = { ...lignes[idx], nb_prises_jour: e.target.value };
                    setForm({ ...form, lignes });
                  }} />
                </FieldM>
                <button onClick={() => setForm({ ...form, lignes: form.lignes.filter((_, i) => i !== idx) })} style={{ padding: 6, background: "transparent", border: "none", color: "#D45E5E", cursor: "pointer", fontSize: 18 }}>
                  <i className="ti ti-trash" />
                </button>
              </div>
            ))}
            <button onClick={() => setForm({ ...form, lignes: [...(form.lignes || []), {}] })} style={{
              padding: "8px 14px", borderRadius: 8, background: "#7a6fb0", color: "#fff", border: "none",
              fontFamily: "Quicksand", fontWeight: 700, fontSize: 12, cursor: "pointer", marginTop: 4,
            }}>
              <i className="ti ti-plus" /> Ajouter un médicament
            </button>
          </div>
        </ModernModal>
      </PageShell>
    </>
  );
}

function Detail({ label, value, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <div style={{ color: "rgba(255,255,255,.45)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
      <div style={{ color: "#fff", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function FieldM({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}
