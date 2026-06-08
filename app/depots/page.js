"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg } from "../ui";
import Crud from "../crud";

export default function Depots() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [magasins, setMagasins] = useState([]);
  const [depots, setDepots] = useState([]);
  const [ready, setReady] = useState(false);
  const [zoneOf, setZoneOf] = useState(null); // dépôt sélectionné pour gérer ses zones

  async function loadRefs() {
    const [{ data: mg }, { data: dp }] = await Promise.all([
      supabase.from("magasins").select("id,nom"),
      supabase.from("depots").select("id,nom,type"),
    ]);
    setMagasins((mg || []).map((m) => ({ value: m.id, label: m.nom })));
    setDepots(dp || []);
    setReady(true);
  }
  useEffect(() => { if (auth.ready) loadRefs(); }, [auth.ready]);

  if (!auth.ready || !ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead small title="Dépôts" sub="Dépôt général EHPAD et dépôts déportés (rattachés à un magasin)" />
        <Crud
          structureId={auth.structureId}
          etabId={auth.etabId}
          table="depots"
          title="Nouveau dépôt"
          relations={{ magasin_id: magasins }}
          columns={[
            { key: "nom", label: "Nom" },
            { key: "type", label: "Type", render: (r) => r.type === "deporte"
              ? <span className="tag-type"><i className="ti ti-truck" /> Déporté (magasin)</span>
              : <span className="tag-type"><i className="ti ti-building-warehouse" /> Général EHPAD</span> },
          ]}
          fields={[
            { key: "nom", label: "Nom du dépôt", required: true },
            { key: "type", label: "Type", type: "select", required: true, options: [
              { value: "general", label: "Général EHPAD" },
              { value: "deporte", label: "Déporté (rattaché magasin)" },
            ] },
            { key: "magasin_id", label: "Magasin rattaché (si déporté)", type: "select" },
          ]}
        />

        <div style={{ height: 18 }} />
        <PageHead small title="Zones de stockage" sub="Sous-emplacements à l'intérieur d'un dépôt" />
        <Crud
          structureId={auth.structureId}
          etabId={auth.etabId}
          table="zones"
          title="Nouvelle zone"
          relations={{ depot_id: depots.map((d) => ({ value: d.id, label: d.nom })) }}
          columns={[
            { key: "nom", label: "Zone" },
            { key: "depot_id", label: "Dépôt", render: (r) => depots.find((d) => d.id === r.depot_id)?.nom || "—" },
          ]}
          fields={[
            { key: "nom", label: "Nom de la zone", required: true },
            { key: "depot_id", label: "Dépôt", type: "select", required: true },
          ]}
        />
      </div>
    </div>
  );
}
