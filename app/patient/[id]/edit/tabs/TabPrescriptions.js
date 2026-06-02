"use client";
// app/patient/[id]/edit/tabs/TabPrescriptions.js — extrait depuis page.js en 0.57.1

import React, { useState, useEffect } from "react";
import { Panel} from "../../../../ui";
// 0.57.10 : imports retirés (logger non utilisés)

import { useRouter } from "next/navigation";
import { createClient } from "../../../../../lib/supabase";
// 0.57.10 : imports retirés (fmtDate non utilisés)

function TabPrescriptions({ pat }) {
  const supabase = createClient();
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [lignesById, setLignesById] = useState({});

  useEffect(() => {
    if (!pat.id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("patient_id", pat.id)
        .order("date_prescription", { ascending: false, nullsLast: true });
      setPrescriptions(data || []);
      setLoading(false);
    })();
  }, [pat.id]);

  async function loadLignes(prescriptionId) {
    if (lignesById[prescriptionId]) return;
    const { data } = await supabase
      .from("prescriptions_lignes")
      .select("*")
      .eq("prescription_id", prescriptionId)
      .order("ordre");
    setLignesById(prev => ({ ...prev, [prescriptionId]: data || [] }));
  }

  function toggleExpand(id) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      loadLignes(id);
    }
  }

  return (
    <>
      <Panel style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: 15, flex: 1 }}>
            <i className="ti ti-prescription" style={{ color: "#5a4a90", marginRight: 6 }} /> Prescriptions
            <span style={{ marginLeft: 8, fontSize: 11, color: "#5a4a90", fontWeight: 700, background: "#f3effa", padding: "2px 8px", borderRadius: 8 }}>
              {prescriptions.length}
            </span>
          </h3>
          <button
            onClick={() => router.push(`/scan/prescription?patient_id=${pat.id}`)}
            style={{ background: "#5a4a90", color: "#fff", border: "none", padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            <i className="ti ti-camera" /> Scanner une ordonnance
          </button>
        </div>
      </Panel>

      {loading && (
        <Panel><p style={{ fontSize: 12, color: "#6c7a89" }}><i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> Chargement…</p></Panel>
      )}

      {!loading && prescriptions.length === 0 && (
        <Panel style={{ textAlign: "center", padding: 30 }}>
          <i className="ti ti-prescription" style={{ fontSize: 40, color: "#a0aeb9" }} />
          <p style={{ marginTop: 10, color: "#6c7a89", fontSize: 13 }}>
            Aucune prescription enregistrée.<br />
            <button onClick={() => router.push(`/scan/prescription?patient_id=${pat.id}`)} style={{ marginTop: 10, background: "#5a4a90", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              <i className="ti ti-camera" /> Scanner une ordonnance
            </button>
          </p>
        </Panel>
      )}

      {!loading && prescriptions.map(p => {
        const isOpen = expandedId === p.id;
        const lignes = lignesById[p.id] || [];
        return (
          <Panel key={p.id} style={{ marginBottom: 8, borderLeft: `4px solid ${p.statut === "active" ? "#5aa05a" : "#a0aeb9"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", cursor: "pointer" }} onClick={() => toggleExpand(p.id)}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <b style={{ fontSize: 13 }}>
                    {p.date_prescription ? new Date(p.date_prescription).toLocaleDateString() : "Date inconnue"}
                  </b>
                  {p.prescripteur_nom && (
                    <span style={{ fontSize: 12, color: "#6c7a89" }}>
                      Dr {p.prescripteur_nom} {p.prescripteur_prenom}
                      {p.prescripteur_specialite && <span style={{ marginLeft: 4 }}>· {p.prescripteur_specialite}</span>}
                    </span>
                  )}
                  <span style={{ background: p.statut === "active" ? "#dff5e0" : "#f4f7fa", color: p.statut === "active" ? "#2e6f33" : "#6c7a89", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>
                    {p.statut}
                  </span>
                  {p.type_prescription && p.type_prescription !== "ordonnance" && (
                    <span style={{ background: "#f3effa", color: "#5a4a90", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>
                      {p.type_prescription}
                    </span>
                  )}
                  {p.source_creation === "ocr" && (
                    <span style={{ background: "#dbe7f5", color: "#185FA5", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>
                      <i className="ti ti-wand" /> OCR
                    </span>
                  )}
                </div>
                {p.duree_traitement && (
                  <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 3 }}>
                    Durée : {p.duree_traitement}{p.est_renouvelable && ` · renouvelable ${p.nb_renouvellements || 0}×`}
                  </div>
                )}
              </div>
              <i className={`ti ${isOpen ? "ti-chevron-up" : "ti-chevron-down"}`} style={{ color: "#a0aeb9", fontSize: 18 }} />
            </div>

            {isOpen && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e3e9ee" }}>
                {lignes.length === 0 ? (
                  <p style={{ fontSize: 11, color: "#a0aeb9" }}>Aucun médicament enregistré sur cette prescription.</p>
                ) : (
                  <div>
                    <div style={{ fontSize: 11, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700, marginBottom: 6 }}>
                      <i className="ti ti-pill" /> {lignes.length} médicament(s)
                    </div>
                    {lignes.map((m, i) => (
                      <div key={m.id} style={{ background: "#f4f7fa", padding: 10, borderRadius: 6, marginBottom: 6, fontSize: 12 }}>
                        <b>{m.medicament_nom}</b>
                        {m.dosage && <span style={{ marginLeft: 6, fontFamily: "Consolas, monospace", color: "#5a4a90" }}>{m.dosage}</span>}
                        {m.forme && <span style={{ marginLeft: 6, color: "#6c7a89" }}>· {m.forme}</span>}
                        {m.posologie_libre && (
                          <div style={{ marginTop: 4, fontSize: 11, color: "#445566", fontStyle: "italic" }}>
                            <i className="ti ti-info-circle" /> {m.posologie_libre}
                          </div>
                        )}
                        {m.commentaire && (
                          <div style={{ marginTop: 4, fontSize: 11, color: "#7a4f15", background: "#fff8ec", padding: "3px 6px", borderRadius: 4, display: "inline-block" }}>
                            {m.commentaire}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {p.fichier_path && (
                  <div style={{ marginTop: 10, fontSize: 11 }}>
                    <PrescriptionFileLink path={p.fichier_path} mime={p.fichier_mime} />
                  </div>
                )}
              </div>
            )}
          </Panel>
        );
      })}
    </>
  );
}

function PrescriptionFileLink({ path, mime }) {
  const supabase = createClient();
  const [url, setUrl] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const { getSignedUrl } = await import("../../../../../lib/prescriptionsStorage");
        const u = await getSignedUrl(supabase, path, 3600);
        setUrl(u);
      } catch (e) { /* silent */ }
    })();
  }, [path]);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#185FA5", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
      <i className="ti ti-archive" /> Voir l'ordonnance scannée originale
    </a>
  );
}

export default TabPrescriptions;
