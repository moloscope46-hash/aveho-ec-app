"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import MobileSubHeader from "../../components/MobileSubHeader";

export default function MobileInventairePage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const [depots, setDepots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("depots")
          .select("id, nom, code, couleur, icone, inventaire_dernier, inventaire_ecarts_count")
          .eq("structure_id", auth.structureId)
          .eq("actif", true)
          .order("nom");
        setDepots(data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [auth.ready, auth.structureId]);

  if (!auth.ready) return null;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #142131 0%, #050a14 100%)", fontFamily: "Quicksand, sans-serif", paddingBottom: 40 }}>
      <MobileSubHeader title="Inventaire" icon="ti-clipboard-check" color="#EF9F27" />
      <div style={{ padding: "12px 16px", color: "#bfe6e6", fontSize: 12.5 }}>
        Choisis le dépôt à inventorier, ou scanne directement son QR.
      </div>
      <div style={{ padding: "0 16px 16px" }}>
        <button onClick={() => router.push("/scan/quick?mode=inventaire")} style={{
          width: "100%", background: "linear-gradient(135deg, #EF9F27, #d48820)",
          color: "#fff", border: "none", borderRadius: 14, padding: "16px",
          display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
          fontFamily: "inherit", marginBottom: 10,
          boxShadow: "0 8px 22px rgba(239,159,39,.30)",
        }}>
          <i className="ti ti-camera" style={{ fontSize: 24 }} />
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>📸 Scanner le QR d'un dépôt</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Lance l'inventaire directement</div>
          </div>
        </button>
      </div>
      <div style={{ padding: "0 16px", display: "grid", gap: 8 }}>
        {loading ? (
          <div style={{ color: "#bfe6e6", textAlign: "center", padding: 20 }}>Chargement...</div>
        ) : depots.length === 0 ? (
          <div style={{ color: "#8a98a8", textAlign: "center", padding: 20, fontSize: 13 }}>Aucun dépôt</div>
        ) : depots.map(d => (
          <button key={d.id} onClick={() => router.push(`/inventaire/${d.id}`)} style={{
            background: "rgba(255,255,255,.05)",
            border: `1px solid ${d.couleur || "#7CC8C8"}33`,
            borderLeft: `4px solid ${d.couleur || "#7CC8C8"}`,
            borderRadius: 12, padding: "14px",
            display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
            fontFamily: "inherit", textAlign: "left",
          }}>
            <div style={{ width: 40, height: 40, background: `${d.couleur || "#7CC8C8"}22`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className={`ti ${d.icone || "ti-building-warehouse"}`} style={{ color: d.couleur || "#7CC8C8", fontSize: 20 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{d.nom}</div>
              {d.inventaire_dernier && (
                <div style={{ color: "#bfe6e6", fontSize: 10.5 }}>
                  Dernier inv. : {new Date(d.inventaire_dernier).toLocaleDateString()}
                  {d.inventaire_ecarts_count > 0 && <span style={{ color: "#e35d5b" }}> · {d.inventaire_ecarts_count} écarts</span>}
                </div>
              )}
            </div>
            <i className="ti ti-chevron-right" style={{ color: "#bfe6e6" }} />
          </button>
        ))}
      </div>
    </div>
  );
}
