"use client";
// =============================================================
//  app/scan/qr/page.js (Alpha 0.55.51) — placeholder
//
//  Scan de QR code (carte Vitale, étiquettes RFID, etc.)
//  L'implémentation viendra avec un lecteur (html5-qrcode ou similar)
// =============================================================

import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel } from "../../ui";

export default function ScanQrPage() {
  const auth = useAuth();
  const cart = useCart();
  if (!auth.ready) return null;
  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="OUTILS SCAN · QR"
          icon="ti-qrcode"
          title="Scan QR code"
          accent="(Vitale, étiquettes, étabs…)"
          sub="Scanner un QR code pour récupérer instantanément les informations associées"
        />

        <Panel style={{ background: "linear-gradient(135deg, #dbe7f5 0%, #fff 100%)", borderColor: "#a3c7e8", textAlign: "center", padding: 28 }}>
          <div style={{ fontSize: 60, marginBottom: 12 }}>🔲</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 18, color: "#185FA5" }}>Bientôt disponible</h2>
          <p style={{ fontSize: 13, color: "#6c7a89", margin: 0 }}>
            Cette page permettra de scanner :
          </p>
          <ul style={{ textAlign: "left", maxWidth: 380, margin: "10px auto", fontSize: 12.5, color: "#142131", lineHeight: 1.7 }}>
            <li><b>QR cartes Vitale</b> (CPS/CPF, attestation tiers payant)</li>
            <li><b>Étiquettes patient</b> (bracelet hôpital)</li>
            <li><b>QR matériel</b> (étiquettes Aveho EC sur DM)</li>
            <li><b>QR adresse</b> (pour pré-remplir une livraison)</li>
          </ul>
          <div style={{ marginTop: 14, padding: "8px 12px", background: "#fff", border: "1px solid #a3c7e8", borderRadius: 8, fontSize: 11.5, color: "#6c7a89", display: "inline-block" }}>
            <i className="ti ti-tools" /> Stack prévue : html5-qrcode + caméra native
          </div>
        </Panel>
      </div>
    </div>
  );
}
