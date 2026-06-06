"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/useAuth";
import MobileSubHeader from "../../../components/MobileSubHeader";

export default function MobileTransfertPickupPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      try {
        // 0.58.94 : SELECT défensif — la jointure FK depot_source:depot_source_id peut échouer si FK absente
        let rows = [];
        try {
          const r = await supabase
            .from("transferts")
            .select("*, depot_source:depot_source_id(nom, couleur), depot_destination:depot_destination_id(nom, couleur)")
            .eq("structure_id", auth.structureId)
            .eq("statut", "Demandé")
            .order("created_at", { ascending: false })
            .limit(100);
          if (r.error) throw r.error;
          rows = r.data || [];
        } catch (e1) {
          console.warn("[Pickup] Jointure FK échouée, fallback simple:", e1?.message);
          // Fallback : récupère sans jointure puis enrichi côté JS
          const r2 = await supabase
            .from("transferts")
            .select("*")
            .eq("structure_id", auth.structureId)
            .eq("statut", "Demandé")
            .order("created_at", { ascending: false })
            .limit(100);
          if (r2.error) {
            console.error("[Pickup] Erreur transferts:", r2.error);
            rows = [];
          } else {
            const ts = r2.data || [];
            // Enrichi avec les noms de dépôts
            const depotIds = [...new Set(ts.flatMap(t => [t.depot_source_id, t.depot_destination_id]).filter(Boolean))];
            let depotsMap = {};
            if (depotIds.length > 0) {
              try {
                const rd = await supabase.from("depots").select("id, nom, couleur").in("id", depotIds);
                (rd.data || []).forEach(d => { depotsMap[d.id] = d; });
              } catch {}
            }
            rows = ts.map(t => ({
              ...t,
              depot_source: depotsMap[t.depot_source_id] || { nom: "?" },
              depot_destination: depotsMap[t.depot_destination_id] || { nom: "?" },
            }));
          }
        }
        setRows(rows);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [auth.ready, auth.structureId]);

  async function take(t) {
    if (!confirm(`Prendre en charge ce transfert ?\n${t.depot_source?.nom} → ${t.depot_destination?.nom}`)) return;
    try {
      const { error } = await supabase
        .from("transferts")
        .update({ statut: "En cours", valide_par: auth.user?.id, date_validation: new Date().toISOString() })
        .eq("id", t.id);
      if (error) throw error;
      router.push(`/transferts`);
    } catch (e) { alert("Erreur : " + e.message); }
  }

  if (!auth.ready) return null;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #142131 0%, #050a14 100%)", fontFamily: "Quicksand, sans-serif", paddingBottom: 40, color: "#fff" }}>
      <MobileSubHeader title="Récupérer dans la liste" icon="ti-package-import" color="#7a6fb0" backTo="/mobile/transfert" />

      <div style={{ padding: 16 }}>
        <div style={{ background: "rgba(122,111,176,.10)", borderLeft: "4px solid #7a6fb0", borderRadius: 10, padding: 12, fontSize: 12, color: "#bfe6e6", marginBottom: 14 }}>
          <i className="ti ti-info-circle" /> Transferts en attente — tape sur l'un d'eux pour le prendre en charge. Statut → <b>En cours</b>.
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "#bfe6e6", padding: 30 }}>Chargement...</div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: "center", color: "#8a98a8", padding: 30 }}>
            <i className="ti ti-checks" style={{ fontSize: 40, color: "#5aa05a", display: "block", marginBottom: 8 }} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>Aucune demande en attente</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map(t => {
              const prioColor = t.priorite === "critique" ? "#e35d5b" : t.priorite === "urgente" ? "#EF9F27" : "#5a6878";
              return (
                <button key={t.id} onClick={() => take(t)} style={{
                  background: "rgba(255,255,255,.05)", border: "1px solid rgba(122,111,176,.30)",
                  borderLeft: `4px solid ${prioColor}`, borderRadius: 12, padding: "14px",
                  cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ background: `${prioColor}22`, color: prioColor, padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                      {t.priorite || "normale"}
                    </span>
                    {t.numero && <span style={{ fontFamily: "Consolas, monospace", color: "#bfe6e6", fontSize: 11 }}>{t.numero}</span>}
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "#8a98a8" }}>{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff", fontSize: 14, marginBottom: 4 }}>
                    <span style={{ color: t.depot_source?.couleur || "#7CC8C8", fontWeight: 600 }}>{t.depot_source?.nom || "?"}</span>
                    <i className="ti ti-arrow-right" style={{ color: "#7a6fb0" }} />
                    <span style={{ color: t.depot_destination?.couleur || "#7CC8C8", fontWeight: 600 }}>{t.depot_destination?.nom || "?"}</span>
                  </div>
                  {t.motif && <div style={{ color: "#bfe6e6", fontSize: 11.5, lineHeight: 1.4 }}>{t.motif}</div>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
