"use client";
// =============================================================
//  /signalements/[id] (0.63.0)
//  Page détail signalement avec workflow + PJ + audit
// =============================================================
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import ResourceDetailLayout, { InfoBlock } from "../../components/ResourceDetailLayout";

const STATUTS = {
  Nouveau: { col: "#185FA5" },
  "En cours": { col: "#EF9F27" },
  Résolu: { col: "#5aa05a" },
  Refusé: { col: "#e35d5b" },
};

const CRITICITES = {
  Critique: { col: "#e35d5b", ic: "ti-flame" },
  Haute: { col: "#EF9F27", ic: "ti-alert-triangle" },
  Moyenne: { col: "#7CC8C8", ic: "ti-circle-dot" },
  Basse: { col: "#8a98a8", ic: "ti-circle" },
};

export default function SignalementDetailPage() {
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
      const { data, error } = await supabase.from("signalements").select("*").eq("id", params.id).maybeSingle();
      if (error) throw error;
      if (!data) { setErr("Signalement introuvable"); return; }
      setItem(data);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [params?.id, auth?.structureId]);

  if (!item) return <ResourceDetailLayout auth={auth} loading={loading} error={err} backHref="/signalements" resourceType="signalement" />;

  const statutMeta = STATUTS[item.statut] || { col: "#8a98a8" };
  const critMeta = CRITICITES[item.criticite] || { col: "#8a98a8", ic: "ti-circle" };

  return (
    <ResourceDetailLayout
      resourceType="signalement"
      resourceId={item.id}
      icon="ti-alert-circle"
      iconColor="#EF9F27"
      title={item.titre || "Signalement"}
      subtitle={`${item.type || "—"} · Créé le ${new Date(item.created_at).toLocaleDateString("fr-FR")}`}
      backHref="/signalements"
      auth={auth}
      onWorkflowChange={load}
      badges={[
        { label: item.statut || "—", color: statutMeta.col, icon: "ti-flag" },
        { label: item.criticite || "—", color: critMeta.col, icon: critMeta.ic },
      ]}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 14 }}>
        <InfoBlock label="Catégorie" value={item.categorie || "—"} icon="ti-category" color="#7CC8C8" />
        <InfoBlock label="Auteur" value={item.signature || "Anonyme"} icon="ti-user" color="#185FA5" />
        {item.equipe_id && <InfoBlock label="Équipe en charge" value={item.equipe_id} icon="ti-users-group" color="#7a6fb0" />}
      </div>

      <div style={{ padding: 14, background: "#fafbfc", borderRadius: 10, fontSize: 13, color: "#142131", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
        <strong style={{ color: "#5a6878", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3, display: "block", marginBottom: 6 }}>Description</strong>
        {item.description || <em style={{ color: "#8a98a8" }}>Aucune description</em>}
      </div>

      {item.reponse && (
        <div style={{ marginTop: 12, padding: 14, background: "linear-gradient(135deg, rgba(124,200,200,.08), #fff)", border: "1px solid rgba(124,200,200,.3)", borderRadius: 10, fontSize: 13, color: "#142131", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
          <strong style={{ color: "#1c5454", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3, display: "block", marginBottom: 6 }}>
            <i className="ti ti-message-circle" /> Réponse de l'administration
          </strong>
          {item.reponse}
          {item.reponse_par && (
            <div style={{ marginTop: 6, fontSize: 10.5, color: "#5a6878" }}>
              — {item.reponse_par} · {new Date(item.reponse_le).toLocaleString("fr-FR")}
            </div>
          )}
        </div>
      )}
    </ResourceDetailLayout>
  );
}
