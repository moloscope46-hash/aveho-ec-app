"use client";
// =============================================================
//  /mobile/transfert — Hub transferts mobile (3 modes)
// =============================================================
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/useAuth";
import MobileSubHeader from "../../components/MobileSubHeader";

const MODES = [
  {
    key: "demande",
    color: "#EF9F27",
    icon: "ti-clipboard-list",
    label: "Faire une demande",
    subtitle: "Tombe dans la liste · à valider par un responsable",
    detail: "Crée un transfert en statut 'Demandé'. Un gestionnaire validera plus tard.",
    route: "/mobile/transfert/demande"
  },
  {
    key: "direct",
    color: "#5aa05a",
    icon: "ti-bolt",
    label: "Transfert direct",
    subtitle: "Scan source · scan destination · validé immédiatement",
    detail: "Workflow 2-scan : QR dépôt source → QR dépôt destination = transfert créé et validé.",
    route: "/scan/quick?mode=transfert-direct"
  },
  {
    key: "pickup",
    color: "#7a6fb0",
    icon: "ti-package-import",
    label: "Récupérer dans la liste",
    subtitle: "Prendre en charge un transfert demandé",
    detail: "Affiche les transferts en statut 'Demandé', tu en choisis un et tu deviens responsable.",
    route: "/mobile/transfert/pickup"
  },
];

export default function MobileTransfertPage() {
  const router = useRouter();
  const auth = useAuth();
  if (!auth.ready) return null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #142131 0%, #050a14 100%)",
      fontFamily: "Quicksand, sans-serif",
      paddingBottom: 60,
    }}>
      <MobileSubHeader title="Transfert" icon="ti-arrows-right-left" color="#7a6fb0" />

      <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        {MODES.map(m => (
          <button key={m.key} onClick={() => router.push(m.route)} style={{
            background: "rgba(255,255,255,.05)",
            border: `2px solid ${m.color}33`,
            borderLeft: `5px solid ${m.color}`,
            borderRadius: 14, padding: "20px",
            display: "flex", flexDirection: "column", gap: 10,
            cursor: "pointer", fontFamily: "inherit",
            transition: "all .15s",
            backdropFilter: "blur(8px)",
          }}
          onTouchStart={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
          onTouchEnd={(e) => { e.currentTarget.style.transform = "scale(1)"; }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 50, height: 50, background: `${m.color}22`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${m.icon}`} style={{ color: m.color, fontSize: 26 }} />
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ color: "#fff", fontSize: 17, fontWeight: 700, marginBottom: 2 }}>{m.label}</div>
                <div style={{ color: "#bfe6e6", fontSize: 12 }}>{m.subtitle}</div>
              </div>
            </div>
            <div style={{ fontSize: 11.5, color: "#8a98a8", lineHeight: 1.5, paddingLeft: 62 }}>
              <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
              {m.detail}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
