"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";

export default function FECPage() {
  const supabase = createClient();
  const auth = useAuth();
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function exporter() {
    setBusy(true);
    try {
      const debut = `${annee}-01-01`;
      const fin = `${annee}-12-31`;
      // Récupérer toutes les écritures comptables
      const r = await supabase.from("ecritures_comptables")
        .select("*")
        .gte("date_ecriture", debut)
        .lte("date_ecriture", fin)
        .order("date_ecriture");
      
      const ecritures = r.data || [];
      // Construire FEC = TXT séparé par tabulations (norme française)
      const header = "JournalCode\tJournalLib\tEcritureNum\tEcritureDate\tCompteNum\tCompteLib\tCompAuxNum\tCompAuxLib\tPieceRef\tPieceDate\tEcritureLib\tDebit\tCredit\tEcritureLet\tDateLet\tValidDate\tMontantdevise\tIdevise\n";
      const lignes = ecritures.map(e => [
        e.journal_code || "VTE", e.journal_lib || "Ventes",
        e.numero || "", e.date_ecriture || "",
        e.compte_num || "411000", e.compte_lib || "Clients",
        e.aux_num || "", e.aux_lib || "",
        e.piece_ref || "", e.piece_date || "",
        (e.libelle || "").replace(/\t/g, " "),
        (e.debit || 0).toFixed(2).replace(".", ","),
        (e.credit || 0).toFixed(2).replace(".", ","),
        "", "", "", "", ""
      ].join("\t")).join("\n");
      
      const fec = header + lignes;
      const blob = new Blob([fec], { type: "text/plain;charset=iso-8859-1" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const siren = auth?.structure?.siren || "000000000";
      a.href = url;
      a.download = `${siren}FEC${annee}1231.txt`;
      a.click();
      URL.revokeObjectURL(url);
      setResult({ nb: ecritures.length, ok: true });
    } catch (e) {
      setResult({ ok: false, error: e.message });
    }
    setBusy(false);
  }

  return (
    <>
      <TopBar />
      <div style={{ padding: 24, color: "#fff", fontFamily: "Quicksand, sans-serif", minHeight: "calc(100vh - 60px)", background: "linear-gradient(180deg, #0e1a2a, #142131)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, #EF9F27, #d28818)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}><i className="ti ti-file-spreadsheet" /></div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Export FEC</h1>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)" }}>Fichier des Écritures Comptables - norme française expert-comptable</div>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid #EF9F2740", borderRadius: 12, padding: 20, maxWidth: 600 }}>
          <label style={{ fontSize: 12, color: "rgba(255,255,255,.6)", fontWeight: 700, textTransform: "uppercase", marginBottom: 6, display: "block" }}>Exercice annuel</label>
          <input type="number" value={annee} onChange={(e) => setAnnee(parseInt(e.target.value))} min={2020} max={new Date().getFullYear() + 1}
            style={{ width: "100%", padding: 10, background: "rgba(255,255,255,.08)", color: "#fff", border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, fontFamily: "Quicksand", fontSize: 14, marginBottom: 16 }} />
          <button onClick={exporter} disabled={busy} style={{ padding: "12px 20px", background: busy ? "rgba(255,255,255,.10)" : "linear-gradient(135deg, #EF9F27, #d28818)", color: "#fff", border: "none", borderRadius: 10, fontFamily: "Quicksand", fontWeight: 700, cursor: busy ? "wait" : "pointer", width: "100%" }}>
            <i className="ti ti-download" /> {busy ? "Génération..." : `Télécharger FEC ${annee}`}
          </button>
          {result && (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: result.ok ? "rgba(90,160,90,.15)" : "rgba(212,94,94,.15)", border: `1px solid ${result.ok ? "#5aa05a40" : "#D45E5E40"}`, fontSize: 13 }}>
              {result.ok ? `✓ ${result.nb} écritures exportées` : `✗ Erreur : ${result.error}`}
            </div>
          )}
          <div style={{ marginTop: 20, fontSize: 11, color: "rgba(255,255,255,.5)", lineHeight: 1.6 }}>
            <i className="ti ti-info-circle" style={{ color: "#7CC8C8" }} /> Le fichier est nommé selon la norme : <code>{`{SIREN}FEC{ANNEE}1231.txt`}</code><br/>
            Encodage ISO-8859-1, séparateur tabulation, 18 colonnes obligatoires (article A47 A-1 du LPF)
          </div>
        </div>
      </div>
    </>
  );
}
