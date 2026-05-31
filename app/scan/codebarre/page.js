"use client";
// =============================================================
//  app/scan/codebarre/page.js (Alpha 0.55.51) — placeholder
//  Scan code-barre GS1/UDI matériel médical, LPP, EAN-13…
// =============================================================

import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel } from "../../ui";

export default function ScanCodebarrePage() {
  const auth = useAuth();
  const cart = useCart();
  if (!auth.ready) return null;
  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="OUTILS SCAN · BARRE"
          icon="ti-barcode"
          title="Scan code-barre"
          accent="(GS1/UDI, LPP, EAN-13)"
          sub="Identifier instantanément un matériel médical par son code-barre"
        />

        <Panel style={{ background: "linear-gradient(135deg, #f3effa 0%, #fff 100%)", borderColor: "#d6c9ec", textAlign: "center", padding: 28 }}>
          <div style={{ fontSize: 60, marginBottom: 12 }}>📊</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 18, color: "#7a6fb0" }}>Bientôt disponible</h2>
          <p style={{ fontSize: 13, color: "#6c7a89", margin: 0 }}>
            Cette page permettra de scanner :
          </p>
          <ul style={{ textAlign: "left", maxWidth: 420, margin: "10px auto", fontSize: 12.5, color: "#142131", lineHeight: 1.7 }}>
            <li><b>GS1/UDI</b> sur dispositifs médicaux (numéro de série, lot, date péremption)</li>
            <li><b>EAN-13</b> sur produits commerciaux</li>
            <li><b>LPP</b> (Liste des Produits et Prestations remboursables)</li>
            <li><b>Code Aveho EC</b> (étiquettes parc interne)</li>
          </ul>
          <div style={{ marginTop: 14, padding: "8px 12px", background: "#fff", border: "1px solid #d6c9ec", borderRadius: 8, fontSize: 11.5, color: "#6c7a89", display: "inline-block" }}>
            <i className="ti ti-tools" /> Stack prévue : ZXing + parser GS1 (Application Identifiers)
          </div>
        </Panel>
      </div>
    </div>
  );
}
