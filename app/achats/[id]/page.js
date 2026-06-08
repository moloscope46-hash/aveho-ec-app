"use client";
// =============================================================
//  /achats/[id] (0.63.0)
//  Page détail demande d'achat avec workflow + PJ
// =============================================================
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import ResourceDetailLayout, { InfoBlock } from "../../components/ResourceDetailLayout";

const STATUTS = {
  brouillon: { l: "Brouillon", col: "#8a98a8" },
  soumis: { l: "Soumis", col: "#185FA5" },
  approuve: { l: "Approuvé", col: "#5aa05a" },
  refuse: { l: "Refusé", col: "#e35d5b" },
  recu: { l: "Réceptionné", col: "#7a6fb0" },
};

export default function AchatDetailPage() {
  const params = useParams();
  const supabase = createClient();
  const auth = useAuth();
  const [item, setItem] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  async function load() {
    if (!params?.id || !auth?.structureId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from("achats").select("*").eq("id", params.id).maybeSingle();
      if (error) throw error;
      if (!data) { setErr("Demande d'achat introuvable"); return; }
      setItem(data);
      const { data: lg } = await supabase.from("achats_lignes").select("*").eq("achat_id", params.id).order("created_at");
      setLignes(lg || []);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [params?.id, auth?.structureId]);

  if (!item) return <ResourceDetailLayout auth={auth} loading={loading} error={err} backHref="/achats" resourceType="achat" />;

  const statut = STATUTS[item.statut] || { l: item.statut, col: "#8a98a8" };
  const total = lignes.reduce((s, l) => s + ((l.quantite || 1) * (l.prix_unitaire || 0)), 0);

  return (
    <ResourceDetailLayout
      resourceType="achat"
      resourceId={item.id}
      icon="ti-shopping-cart"
      iconColor="#EF9F27"
      title={item.numero || "Demande d'achat"}
      subtitle={`${item.fournisseur || "Fournisseur n/a"} · ${lignes.length} ligne${lignes.length > 1 ? "s" : ""}`}
      backHref="/achats"
      auth={auth}
      onWorkflowChange={load}
      badges={[
        { label: statut.l, color: statut.col, icon: "ti-flag" },
        ...(item.urgent ? [{ label: "URGENT", color: "#e35d5b", icon: "ti-alert-triangle" }] : []),
      ]}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 14 }}>
        <InfoBlock label="Fournisseur" value={item.fournisseur || "—"} icon="ti-building-warehouse" color="#7CC8C8" />
        <InfoBlock label="Catégorie" value={item.categorie || "—"} icon="ti-category" color="#185FA5" />
        {item.prescripteur && <InfoBlock label="Prescripteur" value={item.prescripteur} icon="ti-prescription" color="#7a6fb0" />}
        <InfoBlock label="Montant total" value={`${total.toFixed(2)} €`} icon="ti-currency-euro" color="#EF9F27" highlight />
      </div>

      {item.motif && (
        <div style={{ padding: 14, background: "#fafbfc", borderRadius: 10, fontSize: 13, color: "#142131", lineHeight: 1.5, marginBottom: 14, whiteSpace: "pre-wrap" }}>
          <strong style={{ color: "#5a6878", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3, display: "block", marginBottom: 6 }}>Motif</strong>
          {item.motif}
        </div>
      )}

      <h3 style={{ margin: "0 0 10px", fontSize: 14, color: "#142131" }}>
        <i className="ti ti-list" style={{ color: "#185FA5", marginRight: 4 }} /> Lignes ({lignes.length})
      </h3>
      {lignes.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center", color: "#8a98a8", fontSize: 12, background: "#fafbfc", borderRadius: 8 }}>
          Aucune ligne dans cette demande
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e3e9ee" }}>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, color: "#5a6878", textTransform: "uppercase" }}>Désignation</th>
                <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11, color: "#5a6878" }}>Qté</th>
                <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11, color: "#5a6878" }}>PU</th>
                <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11, color: "#5a6878" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map(l => (
                <tr key={l.id} style={{ borderBottom: "1px solid #f0f3f6" }}>
                  <td style={{ padding: "8px 10px", fontSize: 13, color: "#142131", fontWeight: 500 }}>
                    {l.designation}
                    {l.notes && <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 2 }}>{l.notes}</div>}
                  </td>
                  <td style={{ padding: "8px 10px", fontSize: 13, color: "#5a6878", textAlign: "right" }}>{l.quantite || 1}</td>
                  <td style={{ padding: "8px 10px", fontSize: 13, color: "#5a6878", textAlign: "right" }}>{(l.prix_unitaire || 0).toFixed(2)} €</td>
                  <td style={{ padding: "8px 10px", fontSize: 13, color: "#185FA5", textAlign: "right", fontWeight: 700 }}>
                    {((l.quantite || 1) * (l.prix_unitaire || 0)).toFixed(2)} €
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid #e3e9ee" }}>
                <td colSpan={3} style={{ padding: "10px", fontSize: 13, color: "#5a6878", fontWeight: 700, textAlign: "right" }}>TOTAL</td>
                <td style={{ padding: "10px", fontSize: 15, color: "#EF9F27", textAlign: "right", fontWeight: 800 }}>{total.toFixed(2)} €</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </ResourceDetailLayout>
  );
}
