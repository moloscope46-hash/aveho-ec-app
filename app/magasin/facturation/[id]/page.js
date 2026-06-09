"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/useAuth";
import TopBar from "../../../TopBar";

export default function FactureDetailPage() {
  const supabase = createClient();
  const auth = useAuth();
  const params = useParams();
  const router = useRouter();
  const [facture, setFacture] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;
    (async () => {
      const r1 = await supabase.from("factures").select("*").eq("id", params.id).maybeSingle();
      const r2 = await supabase.from("factures_lignes").select("*").eq("facture_id", params.id);
      setFacture(r1.data);
      setLignes(r2.data || []);
      setLoading(false);
    })();
  }, [params?.id]);

  function genererPDF() {
    // PDF basique via window.print stylé
    const w = window.open("", "_blank");
    if (!w) return;
    const total = lignes.reduce((s, l) => s + (l.montant_ht || 0), 0);
    w.document.write(`
<!DOCTYPE html><html><head><title>Facture ${facture?.numero || ""}</title>
<style>body{font-family:Arial,sans-serif;padding:40px;color:#222} h1{color:#185FA5} table{width:100%;border-collapse:collapse;margin-top:20px} th,td{padding:8px;border:1px solid #ddd;text-align:left} th{background:#f0f0f0} .total{font-weight:bold;background:#f5f8fc} @media print{button{display:none}}</style>
</head><body>
<h1>FACTURE ${facture?.numero || ""}</h1>
<p><strong>Date :</strong> ${facture?.date_facture || ""}</p>
<p><strong>Client :</strong> ${facture?.client_nom || facture?.etablissement_id || ""}</p>
<table>
  <thead><tr><th>Désignation</th><th>Qté</th><th>PU HT</th><th>Total HT</th></tr></thead>
  <tbody>
    ${lignes.map(l => `<tr><td>${l.libelle || l.designation || "-"}</td><td>${l.quantite || 1}</td><td>${(l.prix_unitaire_ht || 0).toFixed(2)} €</td><td>${(l.montant_ht || 0).toFixed(2)} €</td></tr>`).join("")}
  </tbody>
  <tfoot><tr class="total"><td colspan="3">Total HT</td><td>${total.toFixed(2)} €</td></tr></tfoot>
</table>
<button onclick="window.print()" style="margin-top:30px;padding:10px 20px;background:#185FA5;color:#fff;border:none;border-radius:6px;cursor:pointer">Imprimer / PDF</button>
</body></html>`);
    w.document.close();
  }

  if (loading) return <><TopBar /><div style={{ padding: 40, textAlign: "center", color: "#fff" }}>Chargement...</div></>;
  if (!facture) return <><TopBar /><div style={{ padding: 40, textAlign: "center", color: "#fff" }}>Facture introuvable</div></>;

  return (
    <>
      <TopBar />
      <div style={{ padding: 24, fontFamily: "Quicksand, sans-serif", color: "#fff", minHeight: "calc(100vh - 60px)", background: "linear-gradient(180deg, #0e1a2a, #142131)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,.06)", color: "#fff", border: "1px solid rgba(255,255,255,.10)", cursor: "pointer", fontSize: 18 }}>
            <i className="ti ti-arrow-left" />
          </button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Facture {facture.numero}</h1>
          <button onClick={genererPDF} style={{ marginLeft: "auto", padding: "10px 16px", background: "linear-gradient(135deg, #185FA5, #134e87)", color: "#fff", border: "none", borderRadius: 10, fontFamily: "Quicksand", fontWeight: 700, cursor: "pointer" }}>
            <i className="ti ti-file-export" /> Générer PDF
          </button>
        </div>
        <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
            <Info label="Date facture" v={facture.date_facture} />
            <Info label="Échéance" v={facture.date_echeance} />
            <Info label="Statut" v={facture.statut} />
            <Info label="Montant TTC" v={`${(facture.montant_ttc || 0).toFixed(2)} €`} c="#5aa05a" />
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: "#7CC8C8", marginBottom: 10 }}>Lignes ({lignes.length})</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,.10)" }}>
              <th style={{ textAlign: "left", padding: 8, color: "rgba(255,255,255,.6)", fontSize: 11, textTransform: "uppercase" }}>Désignation</th>
              <th style={{ textAlign: "right", padding: 8, color: "rgba(255,255,255,.6)", fontSize: 11, textTransform: "uppercase" }}>Qté</th>
              <th style={{ textAlign: "right", padding: 8, color: "rgba(255,255,255,.6)", fontSize: 11, textTransform: "uppercase" }}>PU HT</th>
              <th style={{ textAlign: "right", padding: 8, color: "rgba(255,255,255,.6)", fontSize: 11, textTransform: "uppercase" }}>Total HT</th>
            </tr></thead>
            <tbody>
              {lignes.map(l => (
                <tr key={l.id} style={{ borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                  <td style={{ padding: 8 }}>{l.libelle || l.designation || "—"}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>{l.quantite || 1}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>{(l.prix_unitaire_ht || 0).toFixed(2)} €</td>
                  <td style={{ padding: 8, textAlign: "right", fontWeight: 700 }}>{(l.montant_ht || 0).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Info({ label, v, c = "#fff" }) {
  return (
    <div style={{ padding: 12, background: "rgba(255,255,255,.04)", borderRadius: 8 }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,.5)", textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: c }}>{v || "—"}</div>
    </div>
  );
}
