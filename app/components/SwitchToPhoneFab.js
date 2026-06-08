"use client";
// =============================================================
//  SwitchToPhoneFab — Bouton flottant pour passer du PC au téléphone
//  Affiche un QR code de l'URL courante + numéro de téléphone si renseigné
//  Le numéro est stocké dans auth.user.user_metadata.telephone_perso
// =============================================================
import { useState, useEffect } from "react";
import { useAuth } from "../../lib/useAuth";
import { usePathname } from "next/navigation";

export default function SwitchToPhoneFab() {
  const auth = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(`${window.location.origin}${pathname}${window.location.search || ""}`);
    }
  }, [pathname, open]);

  // Cache le bouton sur certaines pages (login, choix-mode, pages d'impression)
  const hideOn = ["/login", "/choix-mode", "/connexion"];
  const isPrintPage = pathname?.includes("/qr") || pathname?.endsWith("/print");
  if (hideOn.some(p => pathname?.startsWith(p)) || isPrintPage) return null;
  if (!auth.ready || !auth.user) return null;

  const telephone = auth.user?.user_metadata?.telephone_perso || "";
  const qrUrl = currentUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=12&format=png&data=${encodeURIComponent(currentUrl)}`
    : "";

  return (
    <>
      {/* FAB en HAUT-DROITE (0.65.20 : était bas-droite, déplacé en haut) */}
      <button onClick={() => setOpen(true)} aria-label="Continuer sur mon téléphone" title="Continuer sur mon téléphone"
        className="av-switch-phone-fab"
        style={{
          position: "fixed",
          top: "calc(70px + env(safe-area-inset-top, 0px))",  /* Sous la topbar */
          right: 16,
          zIndex: 9998,
          width: 44, height: 44, borderRadius: "50%",
          background: "linear-gradient(135deg, #7CC8C8, #5db5b5)",
          color: "#142131", border: "1.5px solid rgba(255,255,255,0.3)", cursor: "pointer",
          boxShadow: "0 6px 20px rgba(124,200,200,.45), 0 0 0 1px rgba(20,33,49,.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "inherit", transition: "all .15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = "0 10px 26px rgba(124,200,200,.6)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(124,200,200,.45), 0 0 0 1px rgba(20,33,49,.08)"; }}
      >
        <i className="ti ti-device-mobile" style={{ fontSize: 22 }} />
      </button>

      {/* Modal */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(5,10,20,.78)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20, fontFamily: "Quicksand, sans-serif",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(180deg, #1c2940 0%, #142131 100%)",
              border: "1px solid rgba(124,200,200,.30)",
              borderRadius: 22, padding: "28px 26px",
              maxWidth: 440, width: "100%",
              boxShadow: "0 30px 80px rgba(0,0,0,.5)",
              color: "#fff",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "linear-gradient(135deg, rgba(124,200,200,.30), rgba(124,200,200,.10))",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px solid rgba(124,200,200,.40)",
              }}>
                <i className="ti ti-device-mobile" style={{ fontSize: 24, color: "#7CC8C8" }} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Continuer sur le téléphone ?</h2>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#bfe6e6" }}>Scanne ce QR avec ton téléphone</p>
              </div>
              <button onClick={() => setOpen(false)} style={{
                background: "rgba(255,255,255,.08)", color: "#fff",
                border: "1px solid rgba(255,255,255,.16)",
                width: 32, height: 32, borderRadius: 8, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "inherit",
              }}>
                <i className="ti ti-x" />
              </button>
            </div>

            {/* QR code */}
            <div style={{
              background: "#fff", borderRadius: 14, padding: 14,
              display: "flex", justifyContent: "center", marginBottom: 14,
            }}>
              {qrUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={qrUrl} alt="QR code de la page actuelle" width={300} height={300} style={{ display: "block" }} />
              ) : (
                <div style={{ width: 300, height: 300, background: "#f0f3f6", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#8a98a8" }}>
                  Génération...
                </div>
              )}
            </div>

            {/* URL en clair */}
            <div style={{
              background: "rgba(255,255,255,.04)", borderRadius: 10,
              padding: "10px 12px", fontSize: 11, color: "#bfe6e6",
              fontFamily: "Consolas, monospace", wordBreak: "break-all",
              marginBottom: 14,
              border: "1px solid rgba(255,255,255,.10)",
            }}>
              <div style={{ fontSize: 9, color: "#8a98a8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontFamily: "Quicksand, sans-serif" }}>
                <i className="ti ti-link" /> URL de la page
              </div>
              {currentUrl || "—"}
            </div>

            {/* Téléphone enregistré */}
            {telephone ? (
              <div style={{
                background: "rgba(90,160,90,.12)", borderRadius: 10,
                padding: "12px 14px", marginBottom: 14,
                border: "1px solid rgba(90,160,90,.30)",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <i className="ti ti-phone-check" style={{ color: "#5aa05a", fontSize: 24 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#8acc8a", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginBottom: 2 }}>
                    Téléphone enregistré
                  </div>
                  <div style={{ fontSize: 15, color: "#fff", fontWeight: 600, fontFamily: "Consolas, monospace" }}>
                    {telephone}
                  </div>
                </div>
                <a href={`tel:${telephone}`} style={{
                  background: "rgba(90,160,90,.20)",
                  color: "#8acc8a",
                  border: "1px solid rgba(90,160,90,.40)",
                  padding: "7px 12px", borderRadius: 8,
                  fontFamily: "inherit", fontSize: 11, fontWeight: 600,
                  textDecoration: "none",
                }}>
                  <i className="ti ti-phone-outgoing" /> Appeler
                </a>
              </div>
            ) : (
              <div style={{
                background: "rgba(239,159,39,.10)", borderRadius: 10,
                padding: "12px 14px", marginBottom: 14,
                border: "1px solid rgba(239,159,39,.30)",
                fontSize: 12, color: "#fdd9a8",
              }}>
                <i className="ti ti-info-circle" style={{ color: "#EF9F27" }} /> Aucun téléphone enregistré.
                Va dans <a href="/profil" style={{ color: "#EF9F27", fontWeight: 700 }}>ton profil</a> pour ajouter ton numéro perso.
              </div>
            )}

            {/* Action */}
            <button onClick={() => setOpen(false)} style={{
              width: "100%",
              background: "rgba(255,255,255,.06)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,.16)",
              padding: "12px",
              borderRadius: 10,
              fontFamily: "inherit", fontSize: 13, fontWeight: 600,
              cursor: "pointer",
            }}>
              Fermer
            </button>

            <div style={{ marginTop: 12, fontSize: 10.5, color: "#8a98a8", textAlign: "center" }}>
              <i className="ti ti-info-circle" /> Le QR ouvre la page actuelle sur ton téléphone (connexion requise).
            </div>
          </div>
        </div>
      )}
    </>
  );
}
