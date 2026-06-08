"use client";
// =============================================================
//  /commandes-validation/[id] (0.63.0)
// =============================================================
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import ResourceDetailLayout, { InfoBlock } from "../../components/ResourceDetailLayout";

export default function CommandeValidationDetailPage() {
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
      // On utilise la table commandes avec un filtre validation
      const { data, error } = await supabase
        .from("commandes")
        .select("*, magasins(nom)")
        .eq("id", params.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) { setErr("Commande introuvable"); return; }
      setItem(data);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [params?.id, auth?.structureId]);

  if (!item) return <ResourceDetailLayout auth={auth} loading={loading} error={err} backHref="/commandes-validation" resourceType="commande" />;

  return (
    <ResourceDetailLayout
      resourceType="commande"
      resourceId={item.id}
      icon="ti-checks"
      iconColor="#5aa05a"
      title={`Validation : ${item.numero || "Commande"}`}
      subtitle={`${item.magasins?.nom || ""} · ${new Date(item.created_at).toLocaleDateString("fr-FR")}`}
      backHref="/commandes-validation"
      auth={auth}
      onWorkflowChange={load}
      badges={[
        { label: item.statut || "À valider", color: "#EF9F27", icon: "ti-flag" },
      ]}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <InfoBlock label="Magasin" value={item.magasins?.nom || "—"} icon="ti-building-store" color="#185FA5" />
        {item.fournisseur && <InfoBlock label="Fournisseur" value={item.fournisseur} icon="ti-building-warehouse" color="#7CC8C8" />}
        {item.total && <InfoBlock label="Total" value={`${item.total} €`} icon="ti-currency-euro" color="#EF9F27" highlight />}
      </div>
      {item.motif && (
        <div style={{ marginTop: 14, padding: 14, background: "#fafbfc", borderRadius: 10, fontSize: 13, color: "#142131", whiteSpace: "pre-wrap" }}>
          <strong style={{ color: "#5a6878", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3, display: "block", marginBottom: 6 }}>Motif</strong>
          {item.motif}
        </div>
      )}
    </ResourceDetailLayout>
  );
}
