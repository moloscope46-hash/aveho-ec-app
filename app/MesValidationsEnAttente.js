"use client";
// =============================================================
//  MesValidationsEnAttente — Widget accueil
//  Alpha 0.51.0
//
//  Liste les achats que l'user courant peut/doit valider à chaque étape :
//   - Statut "À valider" et user a permission valider_achat
//   - Statut "Validée (1/2)" et user ≠ premier valideur (séparation pouvoirs)
//
//  Utilise la vue v_achats_a_valider (créée en 0.50).
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase";
import { logger } from "../lib/logger";

export default function MesValidationsEnAttente({ auth }) {
  const supabase = createClient();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const isManager = auth?.can?.("valider_achat") || auth?.role?.nom === "Administrateur";

  useEffect(() => {
    if (!auth?.ready || !isManager || !auth.structureId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        // 1) Achats à valider en première lecture
        const { data: prem } = await supabase
          .from("achats")
          .select("id, numero, fournisseur, motif, budget_estime, statut, valideur_id, seuil_double_validation, created_at, demandeur_id")
          .eq("structure_id", auth.structureId)
          .in("statut", ["À valider", "En attente"])
          .order("created_at", { ascending: true });

        // 2) Achats en attente de 2nde validation (et l'user n'est pas le 1er valideur)
        const { data: deux } = await supabase
          .from("achats")
          .select("id, numero, fournisseur, motif, budget_estime, statut, valideur_id, seuil_double_validation, created_at, demandeur_id")
          .eq("structure_id", auth.structureId)
          .eq("statut", "Validée (1/2)")
          .neq("valideur_id", auth.user.id)
          .order("created_at", { ascending: true });

        // Marquer chaque item avec son étape
        const merged = [
          ...(prem || []).map(a => ({ ...a, etape: "1ère validation" })),
          ...(deux || []).map(a => ({ ...a, etape: "2nde validation" })),
        ];
        setItems(merged);
      } catch (e) {
        // 0.57.5 : try/catch englobant pour pas crasher la page
        logger.error("[MesValidationsEnAttente] load failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [auth?.ready, auth?.user?.id, auth?.structureId, isManager]);

  if (!isManager) return null;
  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div style={{
      background: "linear-gradient(135deg, #fff8ec 0%, #fff 100%)",
      border: "1px solid #f0d59f",
      borderLeft: "4px solid #EF9F27",
      borderRadius: 12,
      padding: "16px 18px",
      marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#142131" }}>
          <i className="ti ti-checks" style={{ color: "#EF9F27", marginRight: 6 }} aria-hidden="true" />
          Mes validations en attente
          <span style={{ marginLeft: 8, background: "#EF9F27", color: "#fff", fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>
            {items.length}
          </span>
        </h3>
        <button
          onClick={() => router.push("/achats")}
          style={{ background: "transparent", border: "1px solid #EF9F27", color: "#7a4f15", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          aria-label="Voir toutes les commandes"
        >
          Voir tout →
        </button>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        {items.slice(0, 5).map((a) => (
          <button
            key={a.id}
            onClick={() => router.push("/achats")}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 12px",
              background: "#fff",
              border: "1px solid #e3e9ee",
              borderRadius: 8,
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              width: "100%",
            }}
            aria-label={`Achat ${a.numero} - ${a.etape}`}
          >
            <span style={{ 
              background: a.etape === "2nde validation" ? "#7a6fb022" : "#EF9F2722",
              color: a.etape === "2nde validation" ? "#7a6fb0" : "#EF9F27",
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8, letterSpacing: ".3px",
              flexShrink: 0,
            }}>
              {a.etape}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#142131" }}>
                {a.numero}
                {a.fournisseur && <span style={{ marginLeft: 6, fontSize: 12, color: "#6c7a89", fontWeight: 400 }}>· {a.fournisseur}</span>}
              </div>
              <div style={{ fontSize: 11.5, color: "#8a98a8", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                {a.motif}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              {a.budget_estime != null && (
                <div style={{ fontSize: 13, fontWeight: 700, color: "#142131" }}>
                  {Number(a.budget_estime).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                </div>
              )}
              {a.seuil_double_validation != null && a.budget_estime > a.seuil_double_validation && (
                <div style={{ fontSize: 10, color: "#7a4f15", marginTop: 2 }}>
                  <i className="ti ti-shield-half" /> Double valid.
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {items.length > 5 && (
        <p style={{ fontSize: 11.5, color: "#8a98a8", marginTop: 8, marginBottom: 0, textAlign: "center" }}>
          + {items.length - 5} autre{items.length - 5 > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
