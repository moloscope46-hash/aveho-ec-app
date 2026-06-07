"use client";
// =============================================================
//  /bons-reception — Liste des bons de réception générés (0.62.22)
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn } from "../ui";
import BackButton from "../components/BackButton";

export default function BonsReceptionPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [bons, setBons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    reload();
  }, [auth.ready, auth.structureId]);

  async function reload() {
    setLoading(true);
    try {
      const r = await supabase.from("bons_reception").select("*").eq("structure_id", auth.structureId).order("receptionne_le", { ascending: false }).limit(100);
      if (r.error) {
        if (r.error.code === "42P01") setTableMissing(true);
        setBons([]);
      } else {
        setBons(r.data || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content" style={{ padding: "20px 24px" }}>
        <BackButton />
        <PageHead icon="ti-receipt" title="Bons de réception" subtitle="Historique des livraisons validées" />

        {tableMissing && (
          <Panel style={{ marginTop: 12, borderLeft: "4px solid #e35d5b", background: "rgba(227,93,91,.06)" }}>
            <div style={{ color: "#c0392b", fontSize: 13 }}>
              ⚠ Table <code>bons_reception</code> manquante. Applique <a href="/sql/migration-0.62.22-livraisons-bons-reception.sql" target="_blank" style={{ color: "#185FA5", fontWeight: 700 }}>migration-0.62.22-livraisons-bons-reception.sql</a>.
            </div>
          </Panel>
        )}

        <Panel style={{ marginTop: 12 }}>
          {loading ? <div style={{ padding: 30, textAlign: "center" }}>Chargement…</div>
            : bons.length === 0 && !tableMissing ? (
            <div style={{ padding: 40, textAlign: "center", color: "#8a98a8" }}>
              <i className="ti ti-receipt-off" style={{ fontSize: 40, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
              Aucun bon de réception. Valide une livraison sur <a href="/livraisons-planifiees" style={{ color: "#185FA5", fontWeight: 700 }}>/livraisons-planifiees</a>.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {bons.map(b => {
                const statCol = b.statut === "valide" ? "#5aa05a" : b.statut === "litige" ? "#EF9F27" : "#e35d5b";
                return (
                  <div key={b.id} style={{
                    background: "#fff", border: "1px solid #e3e9ee",
                    borderLeft: `4px solid ${statCol}`,
                    borderRadius: 8, padding: 12,
                    display: "grid", gridTemplateColumns: "auto 120px 1fr 110px 100px", gap: 10, alignItems: "center",
                  }}>
                    <i className="ti ti-receipt" style={{ color: statCol, fontSize: 22 }} />
                    <div style={{ fontFamily: "Consolas,monospace", fontWeight: 700, fontSize: 12 }}>{b.numero}</div>
                    <div>
                      <div style={{ fontSize: 12, color: "#142131" }}>
                        Source : <b>{b.type_source}</b> ({b.source_id?.substring(0, 8)})
                      </div>
                      {b.signataire_email && <div style={{ fontSize: 10.5, color: "#8a98a8" }}>Signataire : {b.signataire_email}</div>}
                      {b.anomalies && <div style={{ fontSize: 10.5, color: "#e35d5b", fontStyle: "italic" }}>⚠ {b.anomalies}</div>}
                      {b.commentaire && <div style={{ fontSize: 10.5, color: "#5a6878", fontStyle: "italic" }}>{b.commentaire}</div>}
                    </div>
                    <div style={{ fontSize: 11, color: "#5a6878" }}>{b.receptionne_le ? new Date(b.receptionne_le).toLocaleString("fr-FR") : "—"}</div>
                    <span style={{ padding: "3px 8px", borderRadius: 6, background: `${statCol}1A`, color: statCol, border: `1px solid ${statCol}40`, fontSize: 11, fontWeight: 700, textAlign: "center" }}>
                      {b.conforme ? "✓ Conforme" : "⚠ Litige"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
