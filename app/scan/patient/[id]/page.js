"use client";
// =============================================================
//  /scan/patient/[id] — Landing après scan du bracelet patient
// =============================================================
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/useAuth";
import TopBar from "../../../TopBar";
import { useCart } from "../../../useCart";
import { Panel, Btn } from "../../../ui";
import BackButton from "../../../components/BackButton";
import { fmtDate } from "../../../../lib/format";

export default function ScanPatientLandingPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [patient, setPatient] = useState(null);
  const [chambre, setChambre] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      try {
        const { data } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
        setPatient(data);
        if (data?.chambre_id) {
          const { data: ch } = await supabase.from("chambres").select("*").eq("id", data.chambre_id).maybeSingle();
          setChambre(ch);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [id, auth.ready]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#bfe6e6" }}>Chargement...</div>;
  if (!patient) return (
    <div className="bg-dark"><TopBar auth={auth} cartCount={cart.count} /><div className="wrap"><BackButton /><Panel style={{ textAlign: "center", color: "#c0392b" }}><i className="ti ti-alert-triangle" style={{ fontSize: 32 }} /><br />Patient introuvable</Panel></div></div>
  );

  const ageYears = patient.date_naissance
    ? Math.floor((Date.now() - new Date(patient.date_naissance).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <div className="bg-dark">
      <TopBar auth={auth} cartCount={cart.count} />
      <div className="wrap">
        <BackButton />

        {/* En-tête patient */}
        <div style={{
          background: "linear-gradient(135deg, #185FA5, #142131)",
          color: "#fff", padding: "20px 24px", borderRadius: 14, marginBottom: 14,
          boxShadow: "0 8px 24px rgba(24,95,165,.32)",
        }}>
          <div style={{ fontSize: 11, opacity: 0.85, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
            <i className="ti ti-scan" /> Bracelet scanné
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: -0.3 }}>
            {patient.nom} <span style={{ fontWeight: 500, opacity: 0.92 }}>{patient.prenom || ""}</span>
          </h1>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
            {patient.date_naissance && <>📅 {fmtDate(patient.date_naissance)}{ageYears ? ` (${ageYears} ans)` : ""} · </>}
            {patient.numero_dossier && <>N° {patient.numero_dossier} · </>}
            {patient.etat && <span style={{ background: "rgba(255,255,255,.18)", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{patient.etat}</span>}
          </div>
        </div>

        {/* Alertes critiques */}
        {patient.allergies && (
          <Panel style={{ marginBottom: 12, background: "rgba(227,93,91,.12)", borderColor: "#e35d5b", borderLeftWidth: 4 }}>
            <div style={{ fontSize: 11, color: "#c0392b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              <i className="ti ti-alert-octagon" /> ⚠ ALLERGIES
            </div>
            <div style={{ fontSize: 14, color: "#142131", fontWeight: 600 }}>{patient.allergies}</div>
          </Panel>
        )}

        {/* Infos rapides */}
        <Panel style={{ marginBottom: 12 }}>
          {chambre && <Row icon="ti-bed" color="#EF9F27" label="Chambre" value={chambre.nom} />}
          {chambre?.telephone && <Row icon="ti-phone" color="#5aa05a" label="☎ Chambre" value={chambre.telephone} href={`tel:${chambre.telephone}`} />}
          {patient.telephone && <Row icon="ti-phone" color="#5aa05a" label="☎ Patient" value={patient.telephone} href={`tel:${patient.telephone}`} />}
          {patient.contact_urgence_telephone && (
            <Row icon="ti-alert-triangle" color="#e35d5b" label="🚨 Urgence" value={`${patient.contact_urgence_nom || ""} (${patient.contact_urgence_lien || "?"}) · ${patient.contact_urgence_telephone}`} href={`tel:${patient.contact_urgence_telephone}`} bold />
          )}
          {patient.medecin_traitant_telephone && <Row icon="ti-stethoscope" color="#7a6fb0" label="Médecin" value={`${patient.medecin_traitant || ""} · ${patient.medecin_traitant_telephone}`} href={`tel:${patient.medecin_traitant_telephone}`} />}
          {patient.gir && <Row icon="ti-heartbeat" color="#185FA5" label="GIR" value={`${patient.gir}/6`} />}
          {patient.mobilite && <Row icon="ti-walk" color="#5a6878" label="Mobilité" value={patient.mobilite} />}
        </Panel>

        {/* Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <ActionTile color="#185FA5" icon="ti-user" label="Fiche complète" subtitle="Tous les détails"
            onClick={() => router.push(`/patient/${id}`)} />
          <ActionTile color="#EF9F27" icon="ti-tools" label="Signaler problème" subtitle="DI matériel/chambre"
            onClick={() => router.push(`/interventions?materiel=&depot=${chambre?.id || ""}`)} />
          <ActionTile color="#7a6fb0" icon="ti-package" label="Affecter matériel" subtitle="Scan + assignation"
            onClick={() => router.push(`/scan/quick?mode=assign-patient&patient=${id}`)} />
          <ActionTile color="#5aa05a" icon="ti-clipboard-text" label="Voir matériels" subtitle="Matériels assignés"
            onClick={() => router.push(`/materiels?patient=${id}`)} />
        </div>

        <div style={{ marginTop: 14, textAlign: "center" }}>
          <Btn variant="ghost" icon="ti-printer" onClick={() => router.push(`/patients/${id}/qr`)}>Réimprimer le bracelet</Btn>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, color, label, value, href, bold }) {
  const content = (
    <div style={{ display: "flex", gap: 10, padding: "8px 4px", alignItems: "baseline", borderBottom: "1px solid #f0f3f6" }}>
      <div style={{ minWidth: 100, color: "#8a98a8", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>
        <i className={`ti ${icon}`} style={{ color, marginRight: 4 }} /> {label}
      </div>
      <div style={{ flex: 1, color: "#142131", fontWeight: bold ? 700 : 500, fontSize: 13.5 }}>{value}</div>
    </div>
  );
  return href ? <a href={href} style={{ textDecoration: "none" }}>{content}</a> : content;
}

function ActionTile({ color, icon, label, subtitle, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: "#fff", border: `2px solid ${color}33`, borderRadius: 12,
      padding: "16px 14px", cursor: "pointer", fontFamily: "inherit",
      textAlign: "left", transition: "all .15s",
      borderLeft: `4px solid ${color}`,
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 18px ${color}33`; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{ width: 40, height: 40, background: `${color}1a`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 22 }} />
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#142131", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11, color: "#5a6878" }}>{subtitle}</div>
    </button>
  );
}
