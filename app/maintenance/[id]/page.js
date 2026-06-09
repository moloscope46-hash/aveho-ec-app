"use client";
// =============================================================
//  /maintenance/[id] (0.65.1)
//  Page détail maintenance avec workflow + PJ
//  Cohérent avec les 7 autres pages détail [id]
// =============================================================
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import ResourceDetailLayout, { InfoBlock } from "../../components/ResourceDetailLayout";

const STATUTS = {
  Planifiée: { col: "#185FA5", ic: "ti-calendar" },
  "En cours": { col: "#EF9F27", ic: "ti-loader-2" },
  Faite: { col: "#5aa05a", ic: "ti-check" },
  "En retard": { col: "#e35d5b", ic: "ti-alert-triangle" },
  Annulée: { col: "#8a98a8", ic: "ti-ban" },
};

export default function MaintenanceDetailPage() {
  const params = useParams();
  const supabase = createClient();
  const auth = useAuth();
  const [item, setItem] = useState(null);
  const [recurrence, setRecurrence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  async function load() {
    if (!params?.id || !auth?.structureId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("maintenances")
        .select("*, materiels(libelle, code, marque, modele)")
        .eq("id", params.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) { setErr("Maintenance introuvable"); return; }
      setItem(data);
      // Si rattachée à une récurrence, la charger
      if (data.recurrence_id) {
        const { data: rec } = await supabase.from("maintenances_recurrences")
          .select("*").eq("id", data.recurrence_id).maybeSingle();
        setRecurrence(rec);
      }
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [params?.id, auth?.structureId]);

  if (!item) return <ResourceDetailLayout auth={auth} loading={loading} error={err} backHref="/maintenance" resourceType="maintenance" />;

  // Détection statut effectif
  const todayStr = new Date().toISOString().slice(0, 10);
  const isOverdue = item.date_prevue && item.date_prevue < todayStr && !["Faite", "Annulée"].includes(item.statut);
  const effectiveStatut = isOverdue ? "En retard" : (item.statut || "Planifiée");
  const statutMeta = STATUTS[effectiveStatut] || { col: "#8a98a8", ic: "ti-circle" };

  const badges = [
    { label: effectiveStatut, color: statutMeta.col, icon: statutMeta.ic },
    ...(item.type ? [{ label: item.type, color: "#7a6fb0", icon: "ti-tool" }] : []),
    ...(recurrence ? [{ label: "Récurrence active", color: "#7CC8C8", icon: "ti-repeat" }] : []),
  ];

  return (
    <ResourceDetailLayout
      resourceType="maintenance"
      resourceId={item.id}
      icon="ti-tool"
      iconColor="#7a6fb0"
      title={item.libelle || `Maintenance ${item.type || ""}`}
      subtitle={`${item.materiels?.libelle || "Matériel"}${item.materiels?.code ? ` · ${item.materiels.code}` : ""} · ${item.date_prevue ? "Prévue le " + new Date(item.date_prevue).toLocaleDateString("fr-FR") : "Sans date"}`}
      backHref="/maintenance"
      auth={auth}
      onWorkflowChange={load}
      badges={badges}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 14 }}>
        <InfoBlock label="Matériel" value={item.materiels?.libelle || "—"} icon="ti-package" color="#185FA5" />
        {item.materiels?.marque && <InfoBlock label="Marque · Modèle" value={`${item.materiels.marque || ""} ${item.materiels.modele || ""}`.trim()} icon="ti-tag" color="#7CC8C8" />}
        {item.intervenant && <InfoBlock label="Intervenant" value={item.intervenant} icon="ti-user" color="#5aa05a" />}
        {item.date_prevue && <InfoBlock label="Date prévue" value={new Date(item.date_prevue).toLocaleDateString("fr-FR")} icon="ti-calendar" color={isOverdue ? "#e35d5b" : "#185FA5"} highlight={isOverdue} />}
        {item.date_realisation && <InfoBlock label="Date réalisation" value={new Date(item.date_realisation).toLocaleDateString("fr-FR")} icon="ti-check" color="#5aa05a" />}
        {item.duree_min && <InfoBlock label="Durée prévue" value={`${item.duree_min} min`} icon="ti-clock" color="#EF9F27" />}
        {item.cout_ht && <InfoBlock label="Coût HT" value={`${item.cout_ht} €`} icon="ti-currency-euro" color="#EF9F27" highlight />}
      </div>

      {/* Récurrence si applicable */}
      {recurrence && (
        <div style={{ marginBottom: 12, padding: 12, background: "linear-gradient(135deg, rgba(124,200,200,.08), #fff)", border: "1px solid rgba(124,200,200,.3)", borderRadius: 10, fontSize: 12 }}>
          <strong style={{ color: "#1c5454", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3, display: "block", marginBottom: 4 }}>
            <i className="ti ti-repeat" /> Récurrence automatique
          </strong>
          <div style={{ color: "#5a6878" }}>
            Type : <b>{recurrence.type}</b> · Fréquence : <b>{recurrence.frequence_jours || "?"} jours</b>
            {recurrence.intervenant && <> · Intervenant : <b>{recurrence.intervenant}</b></>}
          </div>
        </div>
      )}

      {/* Description / Notes */}
      {item.notes && (
        <div style={{ padding: 14, background: "#fafbfc", borderRadius: 10, fontSize: 13, color: "#142131", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
          <strong style={{ color: "#5a6878", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3, display: "block", marginBottom: 6 }}>Notes</strong>
          {item.notes}
        </div>
      )}

      {/* Compte-rendu si réalisée */}
      {item.compte_rendu && (
        <div style={{ marginTop: 12, padding: 14, background: "linear-gradient(135deg, rgba(90,160,90,.08), #fff)", border: "1px solid rgba(90,160,90,.3)", borderRadius: 10, fontSize: 13, color: "#142131", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
          <strong style={{ color: "#3d7a3d", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3, display: "block", marginBottom: 6 }}>
            <i className="ti ti-clipboard-check" /> Compte-rendu
          </strong>
          {item.compte_rendu}
          {item.date_realisation && <div style={{ marginTop: 6, fontSize: 10.5, color: "#5a6878" }}>Réalisée le {new Date(item.date_realisation).toLocaleString("fr-FR")}</div>}
        </div>
      )}

      {/* Lien DI éventuelle */}
      {item.di_id && (
        <div style={{ marginTop: 12, padding: 10, background: "rgba(239,159,39,.08)", border: "1px solid rgba(239,159,39,.3)", borderRadius: 8, fontSize: 12 }}>
          <i className="ti ti-link" style={{ color: "#EF9F27" }} /> Liée à une demande d'intervention :{" "}
          <a href={`/interventions/${item.di_id}`} style={{ color: "#185FA5", fontWeight: 700, textDecoration: "none" }}>
            voir la DI #{String(item.di_id).slice(0, 8)} →
          </a>
        </div>
      )}
    </ResourceDetailLayout>
  );
}
