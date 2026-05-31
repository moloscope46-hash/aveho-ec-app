"use client";
// Page Articles — Référentiel des articles vendus / consommables (CRUD)
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead } from "../ui";
import Crud from "../crud";

export default function Articles() {
  const auth = useAuth();
  const cart = useCart();
  if (!auth.ready) return null;
  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead small title="Articles" sub="Référentiel catalogue de votre établissement" />
        <Crud
          structureId={auth.structureId}
          etabId={auth.etabId}
          canWrite={auth.can("ecrire")}
          canDelete={auth.can("supprimer")}
          table="articles"
          title="Nouvel article"
          columns={[
            { key: "reference", label: "Référence" },
            { key: "libelle", label: "Libellé" },
            { key: "famille", label: "Famille" },
          ]}
          fields={[
            { key: "reference", label: "Référence / LPP" },
            { key: "libelle", label: "Libellé", required: true },
            { key: "famille", label: "Famille" },
          ]}
          filterFields={[
            { key: "q", label: "Recherche", type: "text", searchKeys: ["reference", "libelle"], placeholder: "Référence ou libellé…" },
            { key: "famille", label: "Famille", type: "select", options: ["Consommables", "Matériel médical", "Hygiène", "Pansements", "Perfusion", "Respiratoire"] },
          ]}
        />
      </div>
    </div>
  );
}
