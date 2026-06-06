"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/useAuth";
import MobileSubHeader from "../../components/MobileSubHeader";

export default function MobileScanBSPage() {
  const router = useRouter();
  const auth = useAuth();
  if (!auth.ready) return null;
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #142131 0%, #050a14 100%)", fontFamily: "Quicksand, sans-serif" }}>
      <MobileSubHeader title="Scan bulletin de situation" icon="ti-file-certificate" color="#185FA5" />
      <div style={{ padding: 20, color: "#fff" }}>
        <div style={{
          background: "rgba(24,95,165,.10)", border: "1px solid #185FA5",
          borderRadius: 14, padding: 24, textAlign: "center",
        }}>
          <i className="ti ti-file-certificate" style={{ fontSize: 56, color: "#185FA5" }} />
          <h2 style={{ margin: "12px 0 6px", fontSize: 18 }}>Scan bulletin de situation</h2>
          <p style={{ fontSize: 13, color: "#bfe6e6", margin: "0 0 18px" }}>
            Photographie le bulletin de situation. Extraction automatique :
          </p>
          <ul style={{ textAlign: "left", display: "inline-block", color: "#bfe6e6", fontSize: 12.5, lineHeight: 1.8 }}>
            <li>Identité patient complète</li>
            <li>N° sécu (NIR) + clé</li>
            <li>Régime + organisme</li>
            <li>Mutuelle / Couverture sociale</li>
            <li>Date d'effet / Date de fin</li>
          </ul>
          <button onClick={() => router.push("/scan/quick?mode=bs")} style={{
            marginTop: 20, background: "linear-gradient(135deg, #185FA5, #144a8a)",
            color: "#fff", border: "none", padding: "14px 28px", borderRadius: 12,
            fontFamily: "inherit", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}>
            📸 Démarrer la prise de vue
          </button>
          <div style={{ marginTop: 14, fontSize: 11, color: "#8a98a8", fontStyle: "italic" }}>
            Feature en bêta · OCR affiné en 0.59.x. Compatible bulletins ACOSS / CPAM.
          </div>
        </div>
      </div>
    </div>
  );
}
