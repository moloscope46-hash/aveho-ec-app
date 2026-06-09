"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";

const TYPE_LABELS = {
  intervention: "DI", livraison: "Livraison", bilan: "Bilan",
  maintenance: "Maintenance", prise_en_charge: "Prise en charge", deces: "Décès",
};

export default function TimelinePatient({ patientId, structureId, compact = false, maxItems = null }) {
  const supabase = createClient();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    (async () => {
      setLoading(true);
      try {
        let q = supabase.from("v_timeline_patient").select("*").eq("patient_id", patientId);
        if (structureId) q = q.eq("structure_id", structureId);
        q = q.order("event_date", { ascending: false });
        if (maxItems) q = q.limit(maxItems);
        const r = await q;
        setEvents(r.data || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [patientId, structureId]);

  if (loading) return <div style={{ color: "rgba(255,255,255,.4)", fontSize: 11, padding: 8 }}>Chargement...</div>;
  if (events.length === 0) return <div style={{ color: "rgba(255,255,255,.4)", fontSize: 11, padding: 8 }}>Aucun événement</div>;

  if (compact) {
    const counts = events.reduce((acc, e) => { acc[e.event_type] = (acc[e.event_type] || 0) + 1; return acc; }, {});
    return (
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {Object.entries(counts).map(([type, n]) => {
          const sample = events.find(e => e.event_type === type);
          return (
            <span key={type} style={{
              background: `${sample?.event_color || "#888"}25`, color: sample?.event_color || "#888",
              border: `1px solid ${sample?.event_color || "#888"}50`,
              padding: "2px 6px", borderRadius: 6, fontSize: 10, fontWeight: 800,
              display: "inline-flex", alignItems: "center", gap: 3,
            }} title={`${n} ${TYPE_LABELS[type] || type}`}>
              <i className={`ti ${sample?.event_icon || "ti-point"}`} /> {n}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ position: "relative", paddingLeft: 22 }}>
      <div style={{ position: "absolute", left: 8, top: 8, bottom: 8, width: 1, background: "rgba(255,255,255,.10)" }} />
      {events.map((e, i) => (
        <div key={`${e.event_type}-${e.event_id}-${i}`} style={{ position: "relative", marginBottom: 12 }}>
          <div style={{ position: "absolute", left: -19, top: 3, width: 12, height: 12, borderRadius: "50%",
            background: e.event_color, boxShadow: `0 0 8px ${e.event_color}, 0 0 0 2px rgba(20,33,49,.95)` }} />
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.5)", marginBottom: 2 }}>
            <i className={`ti ${e.event_icon}`} style={{ color: e.event_color }} />{" "}
            {new Date(e.event_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}{" "}
            <span style={{ color: e.event_color, fontWeight: 700 }}>· {TYPE_LABELS[e.event_type] || e.event_type}</span>
          </div>
          <div style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>{e.reference || "—"}</div>
          {e.description && <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginTop: 2 }}>{e.description.substring(0, 100)}</div>}
        </div>
      ))}
    </div>
  );
}

export function TimelinePatientMini({ patientId, structureId }) {
  return <TimelinePatient patientId={patientId} structureId={structureId} compact />;
}
