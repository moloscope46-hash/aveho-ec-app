"use client";
// =============================================================
//  /interventions/[id] (0.63.0)
//  Page détail demande d'intervention avec workflow + PJ
// =============================================================
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import ResourceDetailLayout, { InfoBlock } from "../../components/ResourceDetailLayout";

const URGENCES = {
  Critique: { col: "#e35d5b", ic: "ti-flame" },
  "Élevée": { col: "#EF9F27", ic: "ti-alert-triangle" },
  Normale: { col: "#185FA5", ic: "ti-circle-dot" },
  Faible: { col: "#5aa05a", ic: "ti-circle" },
};

const ETATS = {
  Nouvelle: { col: "#185FA5" },
  Planifiée: { col: "#7a6fb0" },
  "En cours": { col: "#EF9F27" },
  Résolue: { col: "#5aa05a" },
  Annulée: { col: "#8a98a8" },
};

export default function InterventionDetailPage() {
  const params = useParams();
  const supabase = createClient();
  const auth = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  async function load() {
    if (!params?.id || !auth?.structureId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("interventions")
        .select("*, materiels(libelle, num_parc)")
        .eq("id", params.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) { setErr("Intervention introuvable"); return; }
      setItem(data);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [params?.id, auth?.structureId]);

  if (!item) return <ResourceDetailLayout auth={auth} loading={loading} error={err} backHref="/interventions" resourceType="intervention" />;

  const urgMeta = URGENCES[item.urgence] || { col: "#8a98a8", ic: "ti-circle" };
  const etatMeta = ETATS[item.etat] || { col: "#8a98a8" };

  return (
    <ResourceDetailLayout
      resourceType="intervention"
      resourceId={item.id}
      icon="ti-tools"
      iconColor="#EF9F27"
      title={item.numero || `DI #${item.id.slice(0, 8)}`}
      subtitle={`${item.type || "Intervention"} · Créée le ${new Date(item.created_at).toLocaleDateString("fr-FR")}`}
      backHref="/interventions"
      auth={auth}
      onWorkflowChange={load}
      badges={[
        { label: item.etat || "—", color: etatMeta.col, icon: "ti-flag" },
        { label: item.urgence || "—", color: urgMeta.col, icon: urgMeta.ic },
      ]}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 14 }}>
        <InfoBlock label="Matériel" value={item.materiels?.libelle || item.materiel_code || "—"} icon="ti-package" color="#185FA5" />
        <InfoBlock label="Emplacement" value={item.emplacement || "—"} icon="ti-map-pin" color="#7CC8C8" />
        {item.date_planifiee && <InfoBlock label="Date planifiée" value={new Date(item.date_planifiee).toLocaleDateString("fr-FR")} icon="ti-calendar" color="#7a6fb0" />}
        {item.assignee_email && <InfoBlock label="Technicien" value={item.assignee_email} icon="ti-user" color="#5aa05a" />}
        {item.duree_estimee_min && <InfoBlock label="Durée estimée" value={`${item.duree_estimee_min} min`} icon="ti-clock" color="#EF9F27" />}
      </div>

      <div style={{ padding: 14, background: "#fafbfc", borderRadius: 10, fontSize: 13, color: "#142131", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
        <strong style={{ color: "#5a6878", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3, display: "block", marginBottom: 6 }}>Description du problème</strong>
        {item.description || <em style={{ color: "#8a98a8" }}>Aucune description</em>}
      </div>

      {item.resolution && (
        <div style={{ marginTop: 12, padding: 14, background: "linear-gradient(135deg, rgba(90,160,90,.08), #fff)", border: "1px solid rgba(90,160,90,.3)", borderRadius: 10, fontSize: 13, color: "#142131", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
          <strong style={{ color: "#3d7a3d", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3, display: "block", marginBottom: 6 }}>
            <i className="ti ti-circle-check" /> Résolution
          </strong>
          {item.resolution}
          {item.date_resolution && (
            <div style={{ marginTop: 6, fontSize: 10.5, color: "#5a6878" }}>
              Le {new Date(item.date_resolution).toLocaleString("fr-FR")}
            </div>
          )}
        </div>
      )}
    </ResourceDetailLayout>
  );
}
