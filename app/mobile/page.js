"use client";
// =============================================================
//  /mobile — Mode Action Mobile : menu principal tactile
//  Grandes tuiles d'action pour le terrain
// =============================================================
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/useAuth";
import { useEffect, useState } from "react";

const ACTIONS = [
  {
    key: "transfert", color: "#7a6fb0", icon: "ti-arrows-right-left",
    label: "Transfert", subtitle: "Direct · Demande · Récupération",
    route: "/mobile/transfert"
  },
  {
    key: "inventaire", color: "#EF9F27", icon: "ti-clipboard-check",
    label: "Inventaire", subtitle: "Scan + comptage + écarts",
    route: "/mobile/inventaire"
  },
  {
    key: "di", color: "#e35d5b", icon: "ti-tools",
    label: "Demande d'intervention", subtitle: "Maintenance · Désinfection · Retour · Rebut",
    route: "/mobile/di"
  },
  {
    key: "scan-ordo", color: "#5aa05a", icon: "ti-file-text",
    label: "Scan ordonnance", subtitle: "Reconnaissance + création matériel",
    route: "/mobile/scan-ordo"
  },
  {
    key: "scan-bs", color: "#185FA5", icon: "ti-file-certificate",
    label: "Scan bulletin de situation", subtitle: "Importer données patient",
    route: "/mobile/scan-bs"
  },
  {
    key: "patient", color: "#C9867F", icon: "ti-user-plus",
    label: "Création patient", subtitle: "Assistant guidé étape par étape",
    route: "/mobile/patient/new"
  },
  {
    key: "cuve", color: "#EF9F27", icon: "ti-flame",
    label: "Remplissage cuve O₂", subtitle: "Procédure 4 étapes avec traçabilité lot",
    route: "/mobile/cuve/remplissage"
  },
];

export default function MobileHomePage() {
  const router = useRouter();
  const auth = useAuth();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (auth.ready && !auth.user) router.push("/login");
    if (auth.user?.email) setUserName(auth.user.email.split("@")[0]);
  }, [auth.ready, auth.user]);

  function backToDesktop() {
    try { localStorage.setItem("av-launch-mode", "desktop"); } catch {}
    router.push("/accueil");
  }

  if (!auth.ready) return null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #142131 0%, #050a14 100%)",
      fontFamily: "Quicksand, sans-serif",
      paddingBottom: 80,
    }}>
      {/* Header simple */}
      <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ width: 42, height: 42, background: "linear-gradient(135deg, #EF9F27, #d48820)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className="ti ti-scan" style={{ color: "#fff", fontSize: 24 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>Action mobile</div>
          <div style={{ color: "#bfe6e6", fontSize: 11.5 }}>{userName}</div>
        </div>
        <button onClick={backToDesktop} style={{
          background: "rgba(255,255,255,.08)", color: "#fff",
          border: "1px solid rgba(255,255,255,.16)",
          padding: "7px 12px", borderRadius: 8, cursor: "pointer",
          fontFamily: "inherit", fontSize: 12,
        }}>
          <i className="ti ti-device-desktop" /> Logiciel
        </button>
      </div>

      {/* Quick scan tactile */}
      <div style={{ padding: "20px 16px 12px" }}>
        <button onClick={() => router.push("/scan/quick")} style={{
          width: "100%", background: "linear-gradient(135deg, #7CC8C8, #5db5b5)",
          color: "#142131", border: "none", borderRadius: 18,
          padding: "22px 20px", display: "flex", alignItems: "center", gap: 14,
          cursor: "pointer", fontFamily: "inherit",
          boxShadow: "0 12px 32px rgba(124,200,200,.30)",
        }}>
          <div style={{ width: 50, height: 50, background: "rgba(20,33,49,.18)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="ti ti-camera" style={{ fontSize: 28, color: "#142131" }} />
          </div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>📸 Scan rapide</div>
            <div style={{ fontSize: 12.5, opacity: 0.75 }}>QR dépôt · Bracelet patient · Code-barre matériel</div>
          </div>
          <i className="ti ti-chevron-right" style={{ fontSize: 24, color: "#142131" }} />
        </button>
      </div>

      {/* 6 grandes actions */}
      <div style={{ padding: "8px 16px 20px", display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
        {ACTIONS.map(a => (
          <button key={a.key} onClick={() => router.push(a.route)} style={{
            background: "rgba(255,255,255,.05)",
            border: `2px solid ${a.color}33`,
            borderLeft: `5px solid ${a.color}`,
            borderRadius: 14, padding: "18px 18px",
            display: "flex", alignItems: "center", gap: 14,
            cursor: "pointer", fontFamily: "inherit",
            transition: "all .15s",
            backdropFilter: "blur(8px)",
          }}
          onTouchStart={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
          onTouchEnd={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            <div style={{ width: 52, height: 52, background: `${a.color}22`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <i className={`ti ${a.icon}`} style={{ color: a.color, fontSize: 28 }} />
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ color: "#fff", fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{a.label}</div>
              <div style={{ color: "#bfe6e6", fontSize: 11.5 }}>{a.subtitle}</div>
            </div>
            <i className="ti ti-chevron-right" style={{ fontSize: 22, color: a.color, opacity: 0.6 }} />
          </button>
        ))}
      </div>

      {/* Footer mode */}
      <div style={{ textAlign: "center", fontSize: 10, color: "#5a6878", padding: "20px 16px 0" }}>
        Mode Action Mobile · Aveho EC · v0.58.82
      </div>
    </div>
  );
}
