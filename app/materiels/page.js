"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Statut } from "../ui";
import { KpiRow } from "../kpis";
import Crud from "../crud";

export default function Materiels() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [rel, setRel] = useState({ article_id: [], patient_id: [] });
  const [relReady, setRelReady] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      const [{ data: arts }, { data: pats }] = await Promise.all([
        supabase.from("articles").select("id,libelle"),
        supabase.from("patients").select("id,nom,prenom,chambre"),
      ]);
      setRel({
        article_id: (arts || []).map((a) => ({ value: a.id, label: a.libelle })),
        patient_id: (pats || []).map((p) => ({ value: p.id, label: `${p.nom} ${p.prenom || ""}${p.chambre ? ` (ch.${p.chambre})` : ""}` })),
      });
      setRelReady(true);
    })();
  }, [auth.ready]);

  if (!auth.ready || !relReady) return null;

  const artLabel = Object.fromEntries(rel.article_id.map((o) => [o.value, o.label]));
  const patLabel = Object.fromEntries(rel.patient_id.map((o) => [o.value, o.label]));

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead small title="Parc matériel" sub="Exemplaires physiques — série, parc, lot" />
        <KpiRow tiles={[
          { label: "Matériels", value: items.length, icon: "ti-armchair-2", color: "#142131" },
          { label: "En location", value: items.filter((m) => m.etat === "En location").length, icon: "ti-home-check", color: "#5aa05a" },
          { label: "Maintenance", value: items.filter((m) => m.etat === "Maintenance").length, icon: "ti-tool", color: "#EF9F27" },
          { label: "Affectés patient", value: items.filter((m) => m.patient_id).length, icon: "ti-user", color: "#7a6fb0" },
        ]} />
        <Crud
          structureId={auth.structureId}
          etabId={auth.etabId}
          onData={setItems}
          table="materiels"
          title="Nouveau matériel"
          relations={rel}
          columns={[
            { key: "libelle", label: "Article" },
            { key: "num_serie", label: "N° série" },
            { key: "num_parc", label: "N° parc" },
            { key: "num_lot", label: "N° lot" },
            { key: "patient_id", label: "Patient", render: (r) => patLabel[r.patient_id] || "—" },
            { key: "etat", label: "État", render: (r) => <Statut value={r.etat} /> },
          ]}
          fields={[
            { key: "libelle", label: "Libellé matériel", required: true },
            { key: "article_id", label: "Article rattaché", type: "select" },
            { key: "num_serie", label: "N° de série" },
            { key: "num_parc", label: "N° de parc" },
            { key: "num_lot", label: "N° de lot" },
            { key: "patient_id", label: "Patient affecté", type: "select" },
            { key: "etat", label: "État", type: "select", options: [
              { value: "Disponible", label: "Disponible" },
              { value: "En location", label: "En location" },
              { value: "Maintenance", label: "Maintenance" },
            ] },
          ]}
        />
      </div>
    </div>
  );
}
