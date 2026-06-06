"use client";
// =============================================================
//  /choix-mode — Choix entre logiciel complet ou Action Mobile
//  Page affichée juste après login
// =============================================================
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/useAuth";

export default function ChoixModePage() {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth.ready && !auth.user) {
      router.push("/login");
    }
  }, [auth.ready, auth.user]);

  function choose(mode) {
    try { localStorage.setItem("av-launch-mode", mode); } catch {}
    if (mode === "mobile") router.push("/mobile");
    else router.push("/accueil");
  }

  if (!auth.ready) return null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(1200px 800px at 50% 0%, #1c4256 0%, #142131 60%, #050a14 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "30px 20px", fontFamily: "Quicksand, sans-serif",
    }}>
      <div style={{ maxWidth: 760, width: "100%", textAlign: "center" }}>
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 42, fontWeight: 600, letterSpacing: 3, color: "#fff" }}>
            a<span style={{ color: "#7CC8C8", textShadow: "0 0 14px rgba(124,200,200,.7)" }}>v</span>eho
          </div>
          <div style={{ fontSize: 11, color: "#bfe6e6", letterSpacing: 2, marginTop: 4, textTransform: "uppercase" }}>Espace Collectivité</div>
        </div>

        <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Bonjour {auth.user?.email?.split("@")[0]} 👋</h1>
        <p style={{ color: "#bfe6e6", fontSize: 14.5, marginBottom: 38 }}>
          Que voulez-vous faire ?
        </p>

        {/* 2 cartes */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          {/* Logiciel complet */}
          <button onClick={() => choose("desktop")} style={{
            background: "rgba(255,255,255,.05)",
            border: "2px solid rgba(124,200,200,.30)",
            borderRadius: 18, padding: "36px 24px",
            cursor: "pointer", fontFamily: "inherit",
            transition: "all .2s",
            backdropFilter: "blur(10px)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.borderColor = "#7CC8C8";
            e.currentTarget.style.boxShadow = "0 20px 60px rgba(124,200,200,.30)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.borderColor = "rgba(124,200,200,.30)";
            e.currentTarget.style.boxShadow = "none";
          }}>
            <div style={{
              width: 80, height: 80, margin: "0 auto 18px",
              background: "linear-gradient(135deg, rgba(124,200,200,.20), rgba(124,200,200,.05))",
              borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid rgba(124,200,200,.30)",
            }}>
              <i className="ti ti-device-desktop" style={{ fontSize: 42, color: "#7CC8C8" }} />
            </div>
            <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Accéder au logiciel</h2>
            <p style={{ color: "#bfe6e6", fontSize: 12.5, margin: 0, lineHeight: 1.5 }}>
              Interface complète bureau<br />Patients · Stock · Compta · Réglages
            </p>
            <div style={{ marginTop: 18, color: "#7CC8C8", fontSize: 11.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
              Entrer →
            </div>
          </button>

          {/* Action mobile */}
          <button onClick={() => choose("mobile")} style={{
            background: "rgba(255,255,255,.05)",
            border: "2px solid rgba(239,159,39,.30)",
            borderRadius: 18, padding: "36px 24px",
            cursor: "pointer", fontFamily: "inherit",
            transition: "all .2s",
            backdropFilter: "blur(10px)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.borderColor = "#EF9F27";
            e.currentTarget.style.boxShadow = "0 20px 60px rgba(239,159,39,.30)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.borderColor = "rgba(239,159,39,.30)";
            e.currentTarget.style.boxShadow = "none";
          }}>
            <div style={{
              width: 80, height: 80, margin: "0 auto 18px",
              background: "linear-gradient(135deg, rgba(239,159,39,.20), rgba(239,159,39,.05))",
              borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid rgba(239,159,39,.30)",
            }}>
              <i className="ti ti-scan" style={{ fontSize: 42, color: "#EF9F27" }} />
            </div>
            <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Action mobile 📱</h2>
            <p style={{ color: "#bfe6e6", fontSize: 12.5, margin: 0, lineHeight: 1.5 }}>
              Mode terrain simplifié<br />Scan QR · Transferts · DI · Inventaire
            </p>
            <div style={{ marginTop: 18, color: "#EF9F27", fontSize: 11.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
              Aller sur le terrain →
            </div>
          </button>
        </div>

        <div style={{ marginTop: 24, fontSize: 11, color: "#8a98a8" }}>
          Ton choix sera mémorisé. Tu peux changer à tout moment depuis le menu.
        </div>
      </div>
    </div>
  );
}
