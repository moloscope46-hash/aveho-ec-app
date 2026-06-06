"use client";
// Page Stock — État du stock par dépôt avec alertes de seuil
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { useLibelles } from "../../lib/useLibelles";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead} from "../ui";
import { KpiRow } from "../kpis";
import Crud from "../crud";

export default function Stock() {
  const supabase = createClient();
  const auth = useAuth();
  const { lbl } = useLibelles(auth.structureId);
  const cart = useCart();
  const [depots, setDepots] = useState([]);
  const [zones, setZones] = useState([]);
  const [articles, setArticles] = useState([]);
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState([]);

  async function loadRefs() {
    const [{ data: dp }, { data: zn }, { data: ar }] = await Promise.all([
      supabase.from("depots").select("id,nom"),
      supabase.from("zones").select("id,nom"),
      supabase.from("articles").select("id,libelle"),
    ]);
    setDepots(dp || []); setZones(zn || []); setArticles(ar || []);
    setReady(true);
  }
  useEffect(() => { if (auth.ready) loadRefs(); }, [auth.ready]);
  if (!auth.ready || !ready) return null;

  const dName = (id) => depots.find((d) => d.id === id)?.nom || "—";
  const zName = (id) => zones.find((z) => z.id === id)?.nom || "—";
  const aName = (id) => articles.find((a) => a.id === id)?.libelle || "—";

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead small title="Stock — articles" sub="Quantités par dépôt et zone (avec seuil d'alerte)" />
        <KpiRow tiles={[
          { label: "Lignes de stock", value: items.length, icon: "ti-stack-2", color: "#c97a2a" },
          { label: "Quantité totale", value: items.reduce((s2, x) => s2 + (x.quantite || 0), 0), icon: "ti-sum", color: "#185FA5" },
          { label: "Sous le seuil", value: items.filter((x) => x.seuil_alerte != null && x.quantite <= x.seuil_alerte).length, icon: "ti-alert-triangle", color: "#c0392b" },
        ]} />
        <Crud
          structureId={auth.structureId}
          etabId={auth.etabId}
          canWrite={auth.can("ecrire")}
          canDelete={auth.can("supprimer")}
          onData={setItems}
          table="stock_articles"
          title="Ajouter du stock"
          relations={{
            article_id: articles.map((a) => ({ value: a.id, label: a.libelle })),
            depot_id: depots.map((d) => ({ value: d.id, label: d.nom })),
            zone_id: zones.map((z) => ({ value: z.id, label: z.nom })),
          }}
          columns={[
            { key: "article_id", label: "Article", render: (r) => aName(r.article_id) },
            { key: "depot_id", label: "Dépôt", render: (r) => dName(r.depot_id) },
            { key: "zone_id", label: "Zone", render: (r) => r.zone_id ? zName(r.zone_id) : "—" },
            { key: "quantite", label: "Qté", render: (r) => {
              const alerte = r.seuil_alerte != null && r.quantite <= r.seuil_alerte;
              return <span style={{ fontWeight: 700, color: alerte ? "#c0392b" : "#142131" }}>
                {r.quantite}{alerte && <i className="ti ti-alert-triangle" style={{ marginLeft: 6 }} title="Sous le seuil" />}
              </span>;
            } },
            { key: "seuil_alerte", label: "Seuil" },
          ]}
          fields={[
            { key: "article_id", label: "Article", type: "select", required: true },
            { key: "depot_id", label: "Dépôt", type: "select", required: true },
            { key: "zone_id", label: "Zone (optionnel)", type: "select" },
            { key: "quantite", label: "Quantité", type: "number", required: true },
            { key: "seuil_alerte", label: "Seuil d'alerte", type: "number" },
          ]}
        />
      </div>
    </div>
  );
}
