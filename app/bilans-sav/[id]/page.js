"use client";
// =============================================================
//  /bilans-sav/[id] (0.63.0)
// =============================================================
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import ResourceDetailLayout, { InfoBlock } from "../../components/ResourceDetailLayout";

export default function BilanSavDetailPage() {
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
        .from("bilans_sav")
        .select("*, materiels(libelle, code)")
        .eq("id", params.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) { setErr("Bilan SAV introuvable"); return; }
      setItem(data);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [params?.id, auth?.structureId]);

  if (!item) return <ResourceDetailLayout auth={auth} loading={loading} error={err} backHref="/bilans-sav" resourceType="bilan_sav" />;

  return (
    <ResourceDetailLayout
      resourceType="bilan_sav"
      resourceId={item.id}
      icon="ti-clipboard-check"
      iconColor="#5e4a8c"
      title={item.numero || `Bilan SAV #${item.id.slice(0, 8)}`}
      subtitle={`${item.materiels?.libelle || "Matériel"} · ${new Date(item.created_at).toLocaleDateString("fr-FR")}`}
      backHref="/bilans-sav"
      auth={auth}
      onWorkflowChange={load}
      badges={[
        { label: item.statut || "—", color: "#185FA5", icon: "ti-flag" },
      ]}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <InfoBlock label="Matériel" value={item.materiels?.libelle || "—"} icon="ti-package" color="#185FA5" />
        {item.technicien_nom && <InfoBlock label="Technicien" value={item.technicien_nom} icon="ti-user" color="#5aa05a" />}
        {item.cout_total && <InfoBlock label="Coût total" value={`${item.cout_total} €`} icon="ti-currency-euro" color="#EF9F27" highlight />}
        {item.duree_min && <InfoBlock label="Durée" value={`${item.duree_min} min`} icon="ti-clock" color="#7CC8C8" />}
      </div>

      {item.diagnostic && (
        <div style={{ marginTop: 14, padding: 14, background: "#fafbfc", borderRadius: 10, fontSize: 13, color: "#142131", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
          <strong style={{ color: "#5a6878", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3, display: "block", marginBottom: 6 }}>Diagnostic</strong>
          {item.diagnostic}
        </div>
      )}

      {item.reparation && (
        <div style={{ marginTop: 10, padding: 14, background: "linear-gradient(135deg, rgba(90,160,90,.08), #fff)", border: "1px solid rgba(90,160,90,.3)", borderRadius: 10, fontSize: 13, color: "#142131", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
          <strong style={{ color: "#3d7a3d", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3, display: "block", marginBottom: 6 }}>
            <i className="ti ti-tools" /> Travaux réalisés
          </strong>
          {item.reparation}
        </div>
      )}
    </ResourceDetailLayout>
  );
}
