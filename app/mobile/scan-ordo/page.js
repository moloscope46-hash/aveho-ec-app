"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/useAuth";
import MobileSubHeader from "../../components/MobileSubHeader";

export default function MobileScanOrdoPage() {
  const router = useRouter();
  const auth = useAuth();
  if (!auth.ready) return null;
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #142131 0%, #050a14 100%)", fontFamily: "Quicksand, sans-serif" }}>
      <MobileSubHeader title="Scan ordonnance" icon="ti-file-text" color="#5aa05a" />
      <div style={{ padding: 20, color: "#fff" }}>
        <div style={{
          background: "rgba(90,160,90,.10)", border: "1px solid #5aa05a",
          borderRadius: 14, padding: 24, textAlign: "center",
        }}>
          <i className="ti ti-file-text" style={{ fontSize: 56, color: "#5aa05a" }} />
          <h2 style={{ margin: "12px 0 6px", fontSize: 18 }}>Scan ordonnance</h2>
          <p style={{ fontSize: 13, color: "#bfe6e6", margin: "0 0 18px" }}>
            Photographie l'ordonnance papier. Le système OCR extraira automatiquement :
          </p>
          <ul style={{ textAlign: "left", display: "inline-block", color: "#bfe6e6", fontSize: 12.5, lineHeight: 1.8 }}>
            <li>Prescripteur (RPPS)</li>
            <li>Patient (nom, prénom, date de naissance)</li>
            <li>Matériels / médicaments prescrits</li>
            <li>Posologie et durée</li>
          </ul>
          <button onClick={() => router.push("/scan/quick?mode=ordo")} style={{
            marginTop: 20, background: "linear-gradient(135deg, #5aa05a, #4a8a4a)",
            color: "#fff", border: "none", padding: "14px 28px", borderRadius: 12,
            fontFamily: "inherit", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}>
            📸 Démarrer la prise de vue
          </button>
          <div style={{ marginTop: 14, fontSize: 11, color: "#8a98a8", fontStyle: "italic" }}>
            Cette feature est en bêta. La reconnaissance OCR sera affinée en 0.59.x.
          </div>
        </div>
      </div>
    </div>
  );
}
