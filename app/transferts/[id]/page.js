"use client";
// =============================================================
//  /transferts/[id] (0.63.0)
// =============================================================
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import ResourceDetailLayout, { InfoBlock } from "../../components/ResourceDetailLayout";

export default function TransfertDetailPage() {
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
        .from("transferts")
        .select("*")
        .eq("id", params.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) { setErr("Transfert introuvable"); return; }
      setItem(data);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [params?.id, auth?.structureId]);

  if (!item) return <ResourceDetailLayout auth={auth} loading={loading} error={err} backHref="/transferts" resourceType="transfert" />;

  return (
    <ResourceDetailLayout
      resourceType="transfert"
      resourceId={item.id}
      icon="ti-transfer"
      iconColor="#5a8f8f"
      title={item.numero || `Transfert #${item.id.slice(0, 8)}`}
      subtitle={`Créé le ${new Date(item.created_at).toLocaleDateString("fr-FR")}`}
      backHref="/transferts"
      auth={auth}
      onWorkflowChange={load}
      badges={[
        { label: item.statut || "—", color: "#185FA5", icon: "ti-flag" },
      ]}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <InfoBlock label="Origine" value={item.depot_origine_id || "—"} icon="ti-building-warehouse" color="#185FA5" />
        <InfoBlock label="Destination" value={item.depot_destination_id || "—"} icon="ti-map-pin" color="#5a8f8f" />
        {item.motif && <InfoBlock label="Motif" value={item.motif} icon="ti-info-circle" color="#7CC8C8" />}
      </div>
      {item.commentaire && (
        <div style={{ marginTop: 14, padding: 14, background: "#fafbfc", borderRadius: 10, fontSize: 13, color: "#142131", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
          <strong style={{ color: "#5a6878", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3, display: "block", marginBottom: 6 }}>Commentaire</strong>
          {item.commentaire}
        </div>
      )}
    </ResourceDetailLayout>
  );
}
