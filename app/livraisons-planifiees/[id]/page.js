"use client";
// =============================================================
//  /livraisons-planifiees/[id] (0.63.0)
// =============================================================
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import ResourceDetailLayout, { InfoBlock } from "../../components/ResourceDetailLayout";

export default function LivraisonDetailPage() {
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
        .from("livraisons_planifiees")
        .select("*")
        .eq("id", params.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) { setErr("Livraison introuvable"); return; }
      setItem(data);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [params?.id, auth?.structureId]);

  if (!item) return <ResourceDetailLayout auth={auth} loading={loading} error={err} backHref="/livraisons-planifiees" resourceType="livraison" />;

  return (
    <ResourceDetailLayout
      resourceType="livraison"
      resourceId={item.id}
      icon="ti-truck-delivery"
      iconColor="#EF9F27"
      title={item.numero || `Livraison #${item.id.slice(0, 8)}`}
      subtitle={item.date_planifiee ? `Prévue le ${new Date(item.date_planifiee).toLocaleDateString("fr-FR")}` : "Non planifiée"}
      backHref="/livraisons-planifiees"
      auth={auth}
      onWorkflowChange={load}
      badges={[
        { label: item.statut || "À livrer", color: "#EF9F27", icon: "ti-flag" },
      ]}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {item.adresse_livraison && <InfoBlock label="Adresse" value={item.adresse_livraison} icon="ti-map-pin" color="#5a8f8f" />}
        {item.chauffeur_nom && <InfoBlock label="Chauffeur" value={item.chauffeur_nom} icon="ti-user" color="#5aa05a" />}
        {item.creneau && <InfoBlock label="Créneau" value={item.creneau} icon="ti-clock" color="#7CC8C8" />}
      </div>
      {item.notes && (
        <div style={{ marginTop: 14, padding: 14, background: "#fafbfc", borderRadius: 10, fontSize: 13, color: "#142131", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
          <strong style={{ color: "#5a6878", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3, display: "block", marginBottom: 6 }}>Notes</strong>
          {item.notes}
        </div>
      )}
    </ResourceDetailLayout>
  );
}
