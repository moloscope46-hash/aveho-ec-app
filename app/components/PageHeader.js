"use client";
// =============================================================
//  PageHeader — Bandeau standard de toutes les pages
//  Bouton retour + nom + 3 raccourcis (panier, notifs, profil)
//  Compact desktop, full mobile avec popup raccourcis au milieu
// =============================================================
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PageHeader({ title, subtitle, icon = "ti-folder", color = "#185FA5", backTo = null, actions, sticky = true }) {
  const router = useRouter();
  const [popupOpen, setPopupOpen] = useState(false);

  return (
    <>
      <div style={{
        position: sticky ? "sticky" : "relative",
        top: sticky ? 0 : "auto", zIndex: 80,
        padding: "10px 16px",
        background: "linear-gradient(180deg, rgba(255,255,255,.96), rgba(255,255,255,.88))",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #e1e6eb",
        display: "flex", alignItems: "center", gap: 10,
        fontFamily: "Quicksand, sans-serif",
      }}>
        <button onClick={() => backTo ? router.push(backTo) : router.back()} title="Retour" style={{
          width: 38, height: 38, borderRadius: 10,
          background: "#fff", color: "#142131",
          border: "1px solid #e1e6eb", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          flexShrink: 0,
        }}>
          <i className="ti ti-arrow-left" />
        </button>

        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          boxShadow: `0 4px 12px ${color}40`,
          flexShrink: 0,
        }}>
          <i className={`ti ${icon}`} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#142131", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: "#5a6878", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</div>}
        </div>

        {actions && <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>{actions}</div>}

        {/* Bouton 3 raccourcis → popup mobile */}
        <button onClick={() => setPopupOpen(true)} title="Raccourcis" style={{
          width: 38, height: 38, borderRadius: 10,
          background: "#fff", color: "#142131",
          border: "1px solid #e1e6eb", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          flexShrink: 0,
        }}>
          <i className="ti ti-dots-vertical" />
        </button>
      </div>

      {/* POPUP AU MILIEU DE L'ECRAN (mobile-first, centré aussi en desktop) */}
      {popupOpen && (
        <div onClick={() => setPopupOpen(false)} style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(20,33,49,.55)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20, animation: "av-pop-fade 180ms ease",
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "#fff", borderRadius: 20, padding: 20,
            width: "100%", maxWidth: 380,
            boxShadow: "0 24px 60px rgba(0,0,0,.3)",
            animation: "av-pop-scale 220ms cubic-bezier(.2,.7,.3,1)",
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#142131", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span><i className="ti ti-bolt" style={{ color: "#EF9F27" }} /> Raccourcis</span>
              <button onClick={() => setPopupOpen(false)} style={{ width: 32, height: 32, borderRadius: 8, background: "#f0f4f8", border: "none", cursor: "pointer", fontSize: 16, color: "#5a6878" }}>
                <i className="ti ti-x" />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <RaccourciTile ic="ti-shopping-cart" lbl="Panier" c="#185FA5" onClick={() => { setPopupOpen(false); router.push("/panier"); }} />
              <RaccourciTile ic="ti-bell" lbl="Notifications" c="#EF9F27" onClick={() => { setPopupOpen(false); router.push("/notifications"); }} />
              <RaccourciTile ic="ti-user-circle" lbl="Profil" c="#7a6fb0" onClick={() => { setPopupOpen(false); router.push("/profil"); }} />
              <RaccourciTile ic="ti-home" lbl="Accueil" c="#7CC8C8" onClick={() => { setPopupOpen(false); router.push("/"); }} />
              <RaccourciTile ic="ti-search" lbl="Recherche" c="#C9867F" onClick={() => { setPopupOpen(false); router.push("/recherche"); }} />
              <RaccourciTile ic="ti-settings" lbl="Paramètres" c="#5e4a8c" onClick={() => { setPopupOpen(false); router.push("/parametres"); }} />
            </div>
          </div>
          <style jsx global>{`
            @keyframes av-pop-fade { from { opacity: 0; } to { opacity: 1; } }
            @keyframes av-pop-scale { from { transform: scale(.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          `}</style>
        </div>
      )}
    </>
  );
}

function RaccourciTile({ ic, lbl, c, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: 14, borderRadius: 14,
      background: `linear-gradient(135deg, ${c}15, ${c}05)`,
      border: `1px solid ${c}40`,
      cursor: "pointer",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      fontFamily: "Quicksand",
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${c}, ${c}cc)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#fff", boxShadow: `0 4px 12px ${c}40` }}>
        <i className={`ti ${ic}`} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#142131", textAlign: "center" }}>{lbl}</div>
    </button>
  );
}
