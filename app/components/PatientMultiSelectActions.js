"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";

export default function PatientMultiSelectActions({ selectedIds, patients, onClose, onActionDone, auth }) {
  const supabase = createClient();
  const router = useRouter();
  const selectedPatients = patients.filter(p => selectedIds.includes(p.id));
  const count = selectedPatients.length;
  if (count === 0) return null;

  async function createDIBatch(type) {
    const payloads = selectedPatients.map(p => ({
      structure_id: auth.structureId, etablissement_id: p.etablissement_id || auth.etabId,
      patient_id: p.id, type, statut: "Nouvelle", urgence: "Normale",
      description: `Demande ${type} groupée (lot de ${count})`, created_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("interventions").insert(payloads);
    if (error) { alert(error.message); return; }
    alert(`✅ ${count} DI "${type}" créées`);
    onActionDone?.(); onClose();
  }

  async function createTournee() {
    const geo = selectedPatients.filter(p => p.latitude && p.longitude);
    if (geo.length < 2) { alert("Il faut au moins 2 patients géolocalisés"); return; }
    const { data: t, error } = await supabase.from("tournees").insert({
      structure_id: auth.structureId, nom: `Tournée ${new Date().toLocaleDateString("fr-FR")} - ${count}`,
      type_tournee: "livraison", date_planifiee: new Date().toISOString(), statut: "planifiee",
    }).select().single();
    if (error) { alert(error.message); return; }
    const etapes = geo.map((p, idx) => ({
      structure_id: auth.structureId, tournee_id: t.id, ordre: idx + 1,
      patient_id: p.id, latitude: p.latitude, longitude: p.longitude,
      libelle: `${p.nom} ${p.prenom}`, type_arret: "livraison_patient", statut: "a_venir",
    }));
    await supabase.from("tournees_etapes").insert(etapes);
    alert(`✅ Tournée créée avec ${etapes.length} arrêts`);
    router.push(`/carte-v2?tournee=${t.id}`);
  }

  function exportEmails() {
    const emails = selectedPatients.map(p => p.email).filter(Boolean);
    if (emails.length === 0) { alert("Aucun email"); return; }
    window.open(`mailto:?bcc=${emails.join(",")}&subject=${encodeURIComponent("Information")}`);
  }

  function exportGPS() {
    const stops = selectedPatients.filter(p => p.latitude && p.longitude);
    if (stops.length === 0) { alert("Aucun patient géolocalisé"); return; }
    const origin = `${stops[0].latitude},${stops[0].longitude}`;
    const destination = `${stops[stops.length-1].latitude},${stops[stops.length-1].longitude}`;
    const waypoints = stops.slice(1, -1).map(p => `${p.latitude},${p.longitude}`).join("|");
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`, "_blank");
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(12,22,34,.65)", backdropFilter: "blur(8px)", zIndex: 9990, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 720, width: "100%", fontFamily: "Quicksand", maxHeight: "90vh", overflowY: "auto" }}>
        <h3 style={{ margin: "0 0 14px", color: "#142131", fontSize: 18 }}>
          <i className="ti ti-checkbox" /> Actions sur {count} patient{count > 1 ? "s" : ""}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          <Tile ic="ti-arrow-back-up" c="#EF9F27" l="Retour location" d="Récupérer matériels" on={() => createDIBatch("Retour location")} />
          <Tile ic="ti-arrows-exchange" c="#7CC8C8" l="Échange matériel" d="Remplacer" on={() => createDIBatch("Échange")} />
          <Tile ic="ti-tool" c="#e35d5b" l="Demande SAV" d="Intervention SAV" on={() => createDIBatch("SAV")} />
          <Tile ic="ti-clipboard-check" c="#5e4a8c" l="Demande bilan" d="Évaluation" on={() => createDIBatch("Bilan")} />
          <Tile ic="ti-route" c="#185FA5" l="Créer tournée" d="Planifier" on={createTournee} highlight />
          <Tile ic="ti-map-pin" c="#5aa05a" l="GPS multi-stops" d="Google Maps" on={exportGPS} />
          <Tile ic="ti-mail" c="#C9867F" l="Email groupé" d={`${selectedPatients.filter(p => p.email).length} emails`} on={exportEmails} />
        </div>
        <button onClick={onClose} style={{ marginTop: 18, padding: "10px 16px", borderRadius: 8, background: "#142131", color: "#fff", border: "none", fontFamily: "Quicksand", fontWeight: 700, cursor: "pointer", width: "100%" }}>
          Fermer
        </button>
      </div>
    </div>
  );
}

function Tile({ ic, c, l, d, on, disabled, highlight }) {
  return (
    <button onClick={on} disabled={disabled} style={{
      padding: 14, borderRadius: 12, cursor: disabled ? "not-allowed" : "pointer",
      background: highlight ? `linear-gradient(135deg, ${c}25, ${c}10)` : "#f4f7fa",
      border: highlight ? `2px solid ${c}50` : "1px solid #e3e9ee",
      opacity: disabled ? 0.5 : 1, textAlign: "left", fontFamily: "Quicksand",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${c}, ${c}cc)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
        <i className={`ti ${ic}`} />
      </div>
      <div style={{ color: "#142131", fontWeight: 700, fontSize: 13 }}>{l}</div>
      <div style={{ color: "#5a6878", fontSize: 11 }}>{d}</div>
    </button>
  );
}

export function FloatingSelectionBar({ count, onClear, onAction, color = "#7a6fb0" }) {
  if (count === 0) return null;
  return (
    <div style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
      background: `linear-gradient(135deg, ${color}, ${color}dd)`, color: "#fff",
      padding: "12px 20px", borderRadius: 30,
      boxShadow: `0 12px 32px ${color}60`,
      display: "flex", alignItems: "center", gap: 16, fontFamily: "Quicksand", zIndex: 9000,
    }}>
      <span style={{ fontWeight: 700, fontSize: 14 }}>
        <i className="ti ti-checks" /> {count} sélectionné{count > 1 ? "s" : ""}
      </span>
      <button onClick={onClear} style={{ background: "rgba(255,255,255,.18)", color: "#fff", border: "1px solid rgba(255,255,255,.25)", padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Quicksand" }}>
        <i className="ti ti-x" /> Désélectionner
      </button>
      <button onClick={onAction} style={{ background: "#fff", color, border: "none", padding: "8px 16px", borderRadius: 20, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "Quicksand" }}>
        <i className="ti ti-bolt" /> Actions
      </button>
    </div>
  );
}
