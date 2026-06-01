"use client";
// =============================================================
//  app/patient/[id]/dashboard/page.js (Alpha 0.56.10)
//
//  Dashboard patient santé : vue d'ensemble consolidée
//  (prescriptions actives, médecins, ALD, droits sécu/mutuelle,
//  alertes contextuelles).
// =============================================================

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/useAuth";
import TopBar from "../../../TopBar";
import { useCart } from "../../../useCart";
import ContactActions from "../../../ContactActions";
import { PageHead, Panel, StateMsg } from "../../../ui";

export default function PatientDashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const auth = useAuth();
  const cart = useCart();
  const [patient, setPatient] = useState(null);
  const [summary, setSummary] = useState(null);
  const [medicaments, setMedicaments] = useState([]);
  const [medecins, setMedecins] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.ready || !params?.id) return;
    loadAll();
  }, [auth.ready, params?.id]);

  async function loadAll() {
    setLoading(true);
    const { data: p } = await supabase.from("patients").select("*").eq("id", params.id).single();
    setPatient(p);

    const [{ data: s }, { data: m }, { data: med }, { data: a }] = await Promise.all([
      supabase.rpc("patient_dashboard_summary", { p_patient_id: params.id }),
      supabase.rpc("patient_dashboard_medicaments_actifs", { p_patient_id: params.id }),
      supabase.rpc("patient_dashboard_medecins", { p_patient_id: params.id }),
      supabase.rpc("patient_dashboard_alertes", { p_patient_id: params.id }),
    ]);
    setSummary((s && s[0]) || null);
    setMedicaments(m || []);
    setMedecins(med || []);
    setAlertes(a || []);
    setLoading(false);
  }

  if (!auth.ready) return null;

  if (loading) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap"><StateMsg type="loading">Chargement du dashboard…</StateMsg></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap"><StateMsg type="empty">Patient introuvable</StateMsg></div>
      </div>
    );
  }

  const age = patient.date_naissance
    ? Math.floor((new Date() - new Date(patient.date_naissance)) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        {/* Header patient avec retour fiche */}
        <Panel style={{ marginBottom: 12, background: "linear-gradient(135deg, #142131, #185FA5)", color: "#fff", borderColor: "transparent" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "rgba(255,255,255,.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 700,
            }}>
              {(patient.prenom?.[0] || "") + (patient.nom?.[0] || "")}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {patient.nom} {patient.prenom}
                {age !== null && <span style={{ marginLeft: 8, fontSize: 14, opacity: 0.8, fontWeight: 400 }}>{age} ans</span>}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                {patient.numero_dossier && <span><i className="ti ti-hash" /> N° {patient.numero_dossier}</span>}
                {patient.date_naissance && <span><i className="ti ti-cake" /> {new Date(patient.date_naissance).toLocaleDateString()}</span>}
                {patient.sexe && <span><i className={`ti ti-gender-${patient.sexe === "M" ? "male" : "female"}`} /> {patient.sexe}</span>}
                {patient.numero_secu && <span style={{ fontFamily: "Consolas, monospace" }}>{patient.numero_secu}</span>}
              </div>
            </div>
            <button
              onClick={() => router.push(`/patient/${params.id}/edit`)}
              style={{ background: "rgba(255,255,255,.2)", color: "#fff", border: "1px solid rgba(255,255,255,.3)", padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              <i className="ti ti-edit" /> Éditer la fiche
            </button>
            <button
              onClick={() => router.push(`/patient/${params.id}`)}
              style={{ background: "rgba(255,255,255,.1)", color: "#fff", border: "1px solid rgba(255,255,255,.2)", padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              <i className="ti ti-list" /> Vue matériel
            </button>
          </div>
        </Panel>

        <PageHead
          eyebrow="DASHBOARD SANTÉ"
          icon="ti-clipboard-heart"
          title="Vue d'ensemble santé"
          accent="(prescriptions · médecins · droits)"
          sub="Consolidation de toutes les informations santé administratives — généré automatiquement depuis l'historique des prescriptions"
        />

        {/* Alertes contextuelles */}
        {alertes.length > 0 && (
          <Panel style={{ marginBottom: 12, background: "#fff8ec", borderColor: "#f0d59f" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 14, color: "#7a4f15" }}>
              <i className="ti ti-bell-ringing" /> Alertes ({alertes.length})
            </h3>
            <div style={{ display: "grid", gap: 6 }}>
              {alertes.map((a, i) => <AlerteRow key={i} alerte={a} />)}
            </div>
          </Panel>
        )}

        {/* KPI principaux */}
        {summary && (
          <Panel style={{ marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              <Kpi label="Prescriptions" value={Number(summary.total_prescriptions).toLocaleString()} sub={`${summary.prescriptions_actives} active(s)`} color="#5a4a90" icon="ti-prescription" big />
              <Kpi label="Médicaments" value={Number(summary.medicaments_uniques).toLocaleString()} sub={`${summary.total_medicaments} ligne(s)`} color="#185FA5" icon="ti-pill" />
              <Kpi label="Médecins" value={Number(summary.total_medecins).toLocaleString()} sub="prescripteurs distincts" color="#7a6fb0" icon="ti-stethoscope" />
              <Kpi label="Renouvelables" value={Number(summary.prescription_renouvelable_count).toLocaleString()} sub="ordonnances actives" color="#5aa05a" icon="ti-refresh" />
              {summary.derniere_prescription_date && (
                <Kpi label="Dernière ordo" value={new Date(summary.derniere_prescription_date).toLocaleDateString()} sub="" color="#EF9F27" icon="ti-calendar" />
              )}
            </div>
          </Panel>
        )}

        {/* Statut administratif */}
        {summary && (
          <Panel style={{ marginBottom: 12 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>
              <i className="ti ti-shield-check" /> Statut administratif
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              {/* Caisse */}
              <StatutCard
                icon="ti-shield-check"
                color="#185FA5"
                title="Caisse d'affiliation"
                main={summary.caisse_nom || "Non renseignée"}
                sub={summary.caisse_type}
                badge={summary.caisse_nom ? null : { label: "MANQUANT", color: "#c0392b" }}
                date={summary.droits_secu_fin}
                jours={summary.jours_avant_fin_secu}
              />

              {/* Mutuelle */}
              <StatutCard
                icon="ti-heart-handshake"
                color="#7a6fb0"
                title="Mutuelle"
                main={summary.mutuelle_nom || "Non renseignée"}
                sub={summary.tiers_payant_actif ? "Tiers payant actif" : null}
                badge={summary.mutuelle_nom ? null : { label: "—", color: "#a0aeb9" }}
                date={summary.droits_mutuelle_fin}
                jours={summary.jours_avant_fin_mutuelle}
              />

              {/* ALD / C2S / AME */}
              <div style={{ background: "#f4f7fa", borderRadius: 8, padding: 12, borderLeft: "3px solid #c0392b" }}>
                <div style={{ fontSize: 10, color: "#6c7a89", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.4, marginBottom: 6 }}>
                  <i className="ti ti-medical-cross" /> Régimes spéciaux
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {summary.est_ald && <Pill label="ALD" color="#c0392b" />}
                  {summary.est_c2s && <Pill label="C2S" color="#EF9F27" />}
                  {summary.est_ame && <Pill label="AME" color="#7a6fb0" />}
                  {!summary.est_ald && !summary.est_c2s && !summary.est_ame && (
                    <span style={{ fontSize: 11, color: "#a0aeb9", fontStyle: "italic" }}>Aucun régime spécial</span>
                  )}
                </div>
                {summary.est_ald && summary.ald_commentaire && (
                  <p style={{ marginTop: 6, fontSize: 11, color: "#7a2d23", fontStyle: "italic" }}>« {summary.ald_commentaire} »</p>
                )}
              </div>
            </div>
          </Panel>
        )}

        {/* Médicaments actifs */}
        <Panel style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 14, flex: 1 }}>
              <i className="ti ti-pill" style={{ color: "#185FA5" }} /> Médicaments actuellement prescrits ({medicaments.length})
            </h3>
            <button
              onClick={() => router.push(`/scan/prescription?patient_id=${params.id}`)}
              style={{ background: "#5a4a90", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              <i className="ti ti-camera" /> Scanner une ordonnance
            </button>
          </div>
          {medicaments.length === 0 && (
            <p style={{ fontSize: 12, color: "#a0aeb9", fontStyle: "italic", textAlign: "center", padding: 20 }}>
              Aucun médicament actif. Les médicaments apparaîtront ici dès qu'une ordonnance sera enregistrée.
            </p>
          )}
          {medicaments.length > 0 && (
            <div style={{ display: "grid", gap: 6 }}>
              {medicaments.map((m, i) => <MedicamentRow key={i} m={m} />)}
            </div>
          )}
        </Panel>

        {/* Médecins prescripteurs */}
        <Panel style={{ marginBottom: 12 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>
            <i className="ti ti-stethoscope" style={{ color: "#7a6fb0" }} /> Médecins prescripteurs ({medecins.length})
          </h3>
          {medecins.length === 0 && (
            <p style={{ fontSize: 12, color: "#a0aeb9", fontStyle: "italic", textAlign: "center", padding: 20 }}>
              Aucun médecin connu pour ce patient
            </p>
          )}
          {medecins.length > 0 && (
            <div style={{ display: "grid", gap: 6 }}>
              {medecins.map((m, i) => <MedecinRow key={i} m={m} />)}
            </div>
          )}
        </Panel>

        {/* Lien rapide vers fiche */}
        <Panel style={{ marginTop: 14, textAlign: "center" }}>
          <button
            onClick={() => router.push(`/patient/${params.id}/edit?tab=prescriptions`)}
            style={{ background: "#5a4a90", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            <i className="ti ti-list-details" /> Voir toutes les prescriptions
          </button>
        </Panel>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, color, icon, big }) {
  return (
    <div style={{
      background: big ? `${color}11` : "#f4f7fa", borderRadius: 8, padding: "12px 14px",
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#6c7a89", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 11 }} /> {label}
      </div>
      <div style={{ fontSize: big ? 24 : 18, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: "#6c7a89", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Pill({ label, color }) {
  return (
    <span style={{
      background: color, color: "#fff", fontSize: 11, fontWeight: 700,
      padding: "3px 10px", borderRadius: 12, textTransform: "uppercase", letterSpacing: 0.4,
    }}>{label}</span>
  );
}

function StatutCard({ icon, color, title, main, sub, badge, date, jours }) {
  const expColor = jours === null || jours === undefined ? null
    : jours < 0 ? "#c0392b"
    : jours <= 30 ? "#EF9F27"
    : "#5aa05a";
  return (
    <div style={{ background: "#f4f7fa", borderRadius: 8, padding: 12, borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 10, color: "#6c7a89", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.4, marginBottom: 6 }}>
        <i className={`ti ${icon}`} style={{ color, marginRight: 4 }} /> {title}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <b style={{ fontSize: 13, color: "#142131", flex: 1 }}>{main}</b>
        {badge && (
          <span style={{ background: badge.color, color: "#fff", fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4 }}>{badge.label}</span>
        )}
      </div>
      {sub && <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 2 }}>{sub}</div>}
      {date && (
        <div style={{ fontSize: 11, marginTop: 5, color: expColor || "#6c7a89", fontWeight: 600 }}>
          <i className="ti ti-clock" /> Droits jusqu'au {new Date(date).toLocaleDateString()}
          {jours !== null && jours !== undefined && (
            <span style={{ marginLeft: 4, fontWeight: 700 }}>
              ({jours < 0 ? `expirés il y a ${-jours}j` : jours === 0 ? "expirent aujourd'hui" : `dans ${jours}j`})
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function AlerteRow({ alerte }) {
  const cfg = {
    critique: { bg: "#fce5e0", border: "#f0c4be", color: "#7a2d23", icon: "ti-alert-octagon" },
    warning: { bg: "#fff8ec", border: "#f0d59f", color: "#7a4f15", icon: "ti-alert-triangle" },
    info: { bg: "#dbe7f5", border: "#bdd2eb", color: "#185FA5", icon: "ti-info-circle" },
  }[alerte.severite] || { bg: "#f4f7fa", border: "#e3e9ee", color: "#6c7a89", icon: "ti-info-circle" };

  return (
    <div style={{
      padding: 10, background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 6, display: "flex", alignItems: "center", gap: 8,
    }}>
      <i className={`ti ${cfg.icon}`} style={{ color: cfg.color, fontSize: 16 }} />
      <span style={{ fontSize: 12, color: cfg.color, fontWeight: 600, flex: 1 }}>
        {alerte.message}
      </span>
      <span style={{ background: cfg.color, color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, textTransform: "uppercase" }}>
        {alerte.severite}
      </span>
    </div>
  );
}

function MedicamentRow({ m }) {
  return (
    <div style={{ padding: 10, background: "#f4f7fa", borderRadius: 6, borderLeft: "3px solid #185FA5" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <b style={{ fontSize: 13, color: "#142131" }}>{m.medicament}</b>
        {m.est_dci_fournie && <span style={{ background: "#dff5e0", color: "#2e6f33", fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4 }}>DCI</span>}
        {m.derniere_dosage && <code style={{ fontFamily: "Consolas, monospace", color: "#5a4a90", fontSize: 11.5, fontWeight: 700 }}>{m.derniere_dosage}</code>}
        {m.forme && <span style={{ fontSize: 11, color: "#6c7a89" }}>· {m.forme}</span>}
        {m.est_renouvelable && (
          <span style={{ background: "#dff5e0", color: "#2e6f33", fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4 }}>
            <i className="ti ti-refresh" /> Renouvelable
          </span>
        )}
        {Number(m.nb_prescriptions) > 1 && (
          <span style={{ background: "#dbe7f5", color: "#185FA5", fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4 }}>
            ×{m.nb_prescriptions}
          </span>
        )}
        {m.derniere_date && (
          <span style={{ fontSize: 11, color: "#6c7a89", marginLeft: "auto" }}>
            <i className="ti ti-calendar" /> {new Date(m.derniere_date).toLocaleDateString()}
          </span>
        )}
      </div>
      {m.derniere_posologie && (
        <div style={{ fontSize: 11, color: "#445566", fontStyle: "italic", marginTop: 3 }}>
          <i className="ti ti-info-circle" /> {m.derniere_posologie}
        </div>
      )}
      {m.commentaire && (
        <div style={{ marginTop: 4, fontSize: 10.5, color: "#7a4f15", background: "#fff8ec", padding: "2px 6px", borderRadius: 4, display: "inline-block" }}>
          {m.commentaire}
        </div>
      )}
    </div>
  );
}

function MedecinRow({ m }) {
  return (
    <div style={{ padding: 10, background: "#f4f7fa", borderRadius: 6, borderLeft: "3px solid #7a6fb0" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <b style={{ fontSize: 13, color: "#142131" }}>Dr {m.nom} {m.prenom || ""}</b>
            {m.est_verifie && (
              <span style={{ background: "#dff5e0", color: "#2e6f33", fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4 }}>
                <i className="ti ti-shield-check" /> Vérifié
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {m.rpps && <span><i className="ti ti-hash" /><code style={{ fontFamily: "Consolas, monospace", marginLeft: 2 }}>{m.rpps}</code></span>}
            {m.specialite && <span style={{ background: "#f3effa", color: "#5a4a90", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>{m.specialite}</span>}
            {m.ville && <span><i className="ti ti-map-pin" /> {m.ville}</span>}
            <span><i className="ti ti-prescription" /> {Number(m.nb_prescriptions)} ordo</span>
            {m.derniere_date && (
              <span>Dernière : {new Date(m.derniere_date).toLocaleDateString()}</span>
            )}
          </div>
          {(m.telephone || m.email) && (
            <div style={{ marginTop: 6 }}>
              <ContactActions entity={m} size="sm" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
