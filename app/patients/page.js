"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/useAuth";
import { fmtDate } from "../../lib/format";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead } from "../ui";
import Crud from "../crud";

export default function Patients() {
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  if (!auth.ready) return null;
  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <PageHead small title="Patients finaux" sub={auth.structureNom ? `${auth.structureNom}` : "—"} />
          <button className="btn-etab" onClick={() => router.push("/etablissement")}><i className="ti ti-building-hospital" /> Mon établissement</button>
        </div>
        <Crud
          structureId={auth.structureId}
          etabId={auth.etabId}
          table="patients"
          title="Nouveau patient"
          columns={[
            { key: "nom", label: "Nom", render: (r) => `${r.nom} ${r.prenom || ""}` },
            { key: "batiment", label: "Bâtiment" },
            { key: "chambre", label: "Chambre" },
            { key: "date_entree", label: "Entrée", render: (r) => fmtDate(r.date_entree) },
          ]}
          fields={[
            { key: "nom", label: "Nom", required: true },
            { key: "prenom", label: "Prénom" },
            { key: "batiment", label: "Bâtiment" },
            { key: "chambre", label: "Chambre" },
            { key: "date_entree", label: "Date d'entrée", type: "date" },
          ]}
        />
      </div>
    </div>
  );
}
