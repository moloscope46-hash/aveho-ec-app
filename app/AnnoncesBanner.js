"use client";
// =============================================================
//  AnnoncesBanner — Bannière d'annonces internes
//  Alpha 0.52.3 — Refonte : responsive desktop/mobile + jolie + actions
//
//  Desktop : sticky en haut sous TopBar
//  Mobile (< 768px) : sticky en BAS de page (zone safe-area iOS)
//
//  Fonctions ajoutées :
//   - Carousel si plusieurs annonces (slider avec indicateurs)
//   - Bouton "Plus d'infos" (modal expand)
//   - Bouton "Ne plus afficher" (dismiss définitif)
//   - Bouton "Rappel + tard" (snooze 1h)
//   - Animation slide-in à l'arrivée
//   - Compteur "1/3" si plusieurs annonces
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase";
import { useAuth } from "../lib/useAuth";
import { logger } from "../lib/logger";

const NIVEAUX = {
  info: { 
    bg: "linear-gradient(135deg, #eef5fc 0%, #d6e8f7 100%)",
    border: "#bfd6f0", color: "#185FA5", 
    icon: "ti-info-circle",
    accentColor: "#185FA5",
  },
  warning: { 
    bg: "linear-gradient(135deg, #fff8ec 0%, #fceedb 100%)",
    border: "#f0d59f", color: "#7a4f15", 
    icon: "ti-alert-triangle",
    accentColor: "#EF9F27",
  },
  critique: { 
    bg: "linear-gradient(135deg, #fef0ee 0%, #fcdcd6 100%)",
    border: "#f0c4be", color: "#7a1f15", 
    icon: "ti-alert-octagon",
    accentColor: "#c0392b",
  },
};

// Snooze : on garde en localStorage les annonces dont l'user a demandé "Rappel + tard"
const SNOOZE_KEY = "aveho_annonces_snooze";

function getSnoozed() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(SNOOZE_KEY) || "{}"); }
  catch { return {}; }
}
function setSnoozed(map) {
  localStorage.setItem(SNOOZE_KEY, JSON.stringify(map));
}

export default function AnnoncesBanner() {
  const supabase = createClient();
  const auth = useAuth();
  const [annonces, setAnnonces] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [snoozedMap, setSnoozedMap] = useState({});
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [modalAnnonce, setModalAnnonce] = useState(null);
  const [slidingIn, setSlidingIn] = useState(true);

  useEffect(() => { 
    setMounted(true);
    setSnoozedMap(getSnoozed());
    // Détecte mobile
    function checkMobile() {
      setIsMobile(window.innerWidth < 768);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    // Animation entrée
    setTimeout(() => setSlidingIn(false), 50);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!auth?.ready || !auth.user?.id || !auth.structureId) return;
    (async () => {
      try {
        const now = new Date().toISOString();
        // Alpha 0.50.0 : annonces. Alpha 0.52.5 : filtre par établissement courant
        const { data: ans } = await supabase
          .from("annonces")
          .select("*")
          .eq("structure_id", auth.structureId)
          .eq("active", true)
          .lte("date_debut", now)
          .or(`date_fin.is.null,date_fin.gt.${now}`)
          // Annonce globale (etablissement_id null) OU ciblée sur l'étab courant
          .or(`etablissement_id.is.null${auth.etabId ? `,etablissement_id.eq.${auth.etabId}` : ""}`)
          .order("niveau", { ascending: false })
          .order("date_debut", { ascending: false });

        const { data: dis } = await supabase
          .from("annonces_dismissees")
          .select("annonce_id")
          .eq("user_id", auth.user.id);

        setAnnonces(ans || []);
        setDismissedIds(new Set((dis || []).map(d => d.annonce_id)));
      } catch (e) {
        // 0.57.5 : try/catch englobant pour pas crasher la page
        logger.error("[AnnoncesBanner] load failed:", e);
      }
    })();
  }, [auth?.ready, auth?.user?.id, auth?.structureId, auth?.etabId]);

  async function dismissDefinitif(annonceId) {
    setDismissedIds(prev => new Set([...prev, annonceId]));
    try {
      await supabase
        .from("annonces_dismissees")
        .insert({ user_id: auth.user.id, annonce_id: annonceId });
    } catch (e) {
      setDismissedIds(prev => {
        const next = new Set(prev);
        next.delete(annonceId);
        return next;
      });
    }
  }

  function snooze(annonceId, minutes = 60) {
    const map = { ...snoozedMap };
    map[annonceId] = Date.now() + minutes * 60 * 1000;
    setSnoozedMap(map);
    setSnoozed(map);
  }

  if (!mounted) return null;

  // Filtre : pas dismissé ET pas en snooze
  const now = Date.now();
  const visibles = annonces.filter(a => {
    if (dismissedIds.has(a.id)) return false;
    if (snoozedMap[a.id] && snoozedMap[a.id] > now) return false;
    return true;
  });

  // Alpha 0.52.4 : toggle classe body pour réserver padding-bottom au contenu en mode mobile
  if (typeof window !== "undefined" && document.body) {
    if (isMobile && visibles.length > 0) {
      document.body.classList.add("has-bottom-banner");
    } else {
      document.body.classList.remove("has-bottom-banner");
    }
  }

  if (visibles.length === 0) return null;

  // Si current depasse, reset
  const safeIdx = Math.min(currentIdx, visibles.length - 1);
  const current = visibles[safeIdx];
  const niveau = NIVEAUX[current.niveau] || NIVEAUX.info;

  // Position selon mobile/desktop
  const positionStyle = isMobile ? {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: "env(safe-area-inset-bottom, 0)",  // iOS notch
    transform: slidingIn ? "translateY(100%)" : "translateY(0)",
    transition: "transform .35s cubic-bezier(.4,0,.2,1)",
    zIndex: 30,
  } : {
    position: "sticky",
    top: 58,
    transform: slidingIn ? "translateY(-100%)" : "translateY(0)",
    transition: "transform .35s cubic-bezier(.4,0,.2,1)",
    zIndex: 30,
  };

  return (
    <>
      <div style={positionStyle}>
        <div
          role="alert"
          style={{
            background: niveau.bg,
            borderTop: isMobile ? `3px solid ${niveau.accentColor}` : "none",
            borderBottom: isMobile ? "none" : `1px solid ${niveau.border}`,
            boxShadow: isMobile ? "0 -8px 24px rgba(20,33,49,.12)" : "0 2px 8px rgba(20,33,49,.04)",
            color: niveau.color,
            padding: isMobile ? "8px 12px" : "10px 16px",
            display: "flex", alignItems: "center", gap: isMobile ? 8 : 10,
            fontSize: isMobile ? 12.5 : 13.5,
            position: "relative",
          }}
        >
          {/* Icône + accent */}
          <div style={{ 
            flexShrink: 0, 
            width: isMobile ? 32 : 38, height: isMobile ? 32 : 38, borderRadius: "50%", 
            background: niveau.accentColor + "22",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {/* 0.58.47 : icône custom de l'annonce sinon icône par défaut du niveau */}
            <i className={`ti ${current.icone || niveau.icon}`} style={{ fontSize: isMobile ? 16 : 20, color: niveau.accentColor }} aria-hidden="true" />
          </div>

          {/* Contenu */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <b style={{ fontSize: 14 }}>{current.titre}</b>
              {visibles.length > 1 && (
                <span style={{ 
                  background: niveau.accentColor + "33",
                  color: niveau.color,
                  fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 10,
                  letterSpacing: ".4px",
                }}>
                  {safeIdx + 1}/{visibles.length}
                </span>
              )}
            </div>
            {current.message && (
              <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 2, lineHeight: 1.4, 
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", 
                            maxWidth: "100%" }}>
                {current.message}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            {/* Navigation carousel si plusieurs */}
            {visibles.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentIdx((safeIdx - 1 + visibles.length) % visibles.length)}
                  style={{
                    background: "transparent", border: "none", 
                    color: niveau.color, cursor: "pointer",
                    padding: 6, opacity: 0.7, fontSize: 16,
                    display: "flex", alignItems: "center",
                  }}
                  aria-label="Annonce précédente"
                  title="Précédente"
                >
                  <i className="ti ti-chevron-left" />
                </button>
                <button
                  onClick={() => setCurrentIdx((safeIdx + 1) % visibles.length)}
                  style={{
                    background: "transparent", border: "none", 
                    color: niveau.color, cursor: "pointer",
                    padding: 6, opacity: 0.7, fontSize: 16,
                    display: "flex", alignItems: "center",
                  }}
                  aria-label="Annonce suivante"
                  title="Suivante"
                >
                  <i className="ti ti-chevron-right" />
                </button>
              </>
            )}

            {/* Bouton "Plus d'infos" si message long */}
            {current.message && current.message.length > 80 && (
              <button
                onClick={() => setModalAnnonce(current)}
                style={{
                  background: "transparent", 
                  border: `1px solid ${niveau.color}55`,
                  color: niveau.color, cursor: "pointer",
                  padding: "3px 10px", borderRadius: 14,
                  fontSize: 11, fontWeight: 600,
                  fontFamily: "inherit",
                  display: isMobile ? "none" : "inline-flex",
                  alignItems: "center", gap: 3,
                }}
                aria-label="Voir plus de détails"
                title="Voir plus"
              >
                <i className="ti ti-eye" /> Détails
              </button>
            )}

            {/* Menu options compact */}
            <details style={{ position: "relative" }}>
              <summary style={{
                background: "transparent", border: "none",
                color: niveau.color, cursor: "pointer",
                padding: 6, opacity: 0.7, fontSize: 16,
                listStyle: "none",
                display: "flex", alignItems: "center",
              }} aria-label="Options">
                <i className="ti ti-dots-vertical" />
              </summary>
              <div style={{
                position: "absolute", right: 0, top: "100%",
                background: "#fff", border: `1px solid ${niveau.border}`,
                borderRadius: 8, padding: 4,
                boxShadow: "0 8px 24px rgba(20,33,49,.15)",
                minWidth: 180, zIndex: 50,
                marginTop: 4,
              }}>
                {current.message && current.message.length > 80 && (
                  <button onClick={() => setModalAnnonce(current)} style={menuItem}>
                    <i className="ti ti-eye" /> Voir détails
                  </button>
                )}
                <button onClick={() => { snooze(current.id, 60); }} style={menuItem}>
                  <i className="ti ti-clock" /> Me rappeler dans 1h
                </button>
                <button onClick={() => { snooze(current.id, 24 * 60); }} style={menuItem}>
                  <i className="ti ti-calendar" /> Demain
                </button>
                <hr style={{ margin: "4px 0", border: "none", borderTop: "1px solid #f0f0f0" }} />
                <button onClick={() => dismissDefinitif(current.id)} style={{ ...menuItem, color: "#c0392b" }}>
                  <i className="ti ti-x" /> Ne plus afficher
                </button>
              </div>
            </details>

            {/* Bouton fermer rapide */}
            <button
              onClick={() => dismissDefinitif(current.id)}
              style={{
                background: "transparent", border: "none",
                color: niveau.color, cursor: "pointer",
                padding: 6, opacity: 0.6,
                display: "flex", alignItems: "center",
              }}
              aria-label="Fermer cette annonce définitivement"
              title="Fermer (ne plus afficher)"
            >
              <i className="ti ti-x" style={{ fontSize: 18 }} />
            </button>
          </div>
        </div>

        {/* Indicateurs slider (dots) */}
        {visibles.length > 1 && (
          <div style={{
            background: niveau.bg,
            padding: "0 16px 8px",
            display: "flex", justifyContent: "center", gap: 6,
            borderBottom: isMobile ? "none" : `1px solid ${niveau.border}`,
          }}>
            {visibles.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                aria-label={`Aller à l'annonce ${i + 1}`}
                style={{
                  width: i === safeIdx ? 20 : 6, height: 6, borderRadius: 3,
                  background: i === safeIdx ? niveau.accentColor : niveau.accentColor + "55",
                  border: "none", padding: 0, cursor: "pointer",
                  transition: "all .25s",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal détails */}
      {modalAnnonce && (
        <div className="modal-bg" onClick={(e) => e.target.classList.contains("modal-bg") && setModalAnnonce(null)}>
          <div className="modal" style={{ maxWidth: 540 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ 
                width: 48, height: 48, borderRadius: "50%", 
                background: NIVEAUX[modalAnnonce.niveau].accentColor + "22",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className={`ti ${NIVEAUX[modalAnnonce.niveau].icon}`} style={{ fontSize: 24, color: NIVEAUX[modalAnnonce.niveau].accentColor }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: "#142131" }}>{modalAnnonce.titre}</h3>
                <div style={{ fontSize: 11, color: "#8a98a8", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 700, marginTop: 2 }}>
                  {modalAnnonce.niveau}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 14, color: "#2a3a48", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {modalAnnonce.message}
            </div>
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #e3e9ee", fontSize: 11, color: "#8a98a8" }}>
              Du {new Date(modalAnnonce.date_debut).toLocaleString("fr-FR")} 
              {modalAnnonce.date_fin && <> au {new Date(modalAnnonce.date_fin).toLocaleString("fr-FR")}</>}
              {modalAnnonce.cree_par_email && <> · par {modalAnnonce.cree_par_email}</>}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <button onClick={() => { snooze(modalAnnonce.id, 60); setModalAnnonce(null); }} style={{ background: "#fff", border: "1px solid #e3e9ee", color: "#6c7a89", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                <i className="ti ti-clock" /> Rappel 1h
              </button>
              <button onClick={() => { dismissDefinitif(modalAnnonce.id); setModalAnnonce(null); }} style={{ background: "#c0392b", border: "none", color: "#fff", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                <i className="ti ti-x" /> Ne plus afficher
              </button>
              <button onClick={() => setModalAnnonce(null)} style={{ background: "#185FA5", border: "none", color: "#fff", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const menuItem = {
  display: "flex", alignItems: "center", gap: 8,
  width: "100%", padding: "8px 12px",
  background: "transparent", border: "none",
  color: "#2a3a48", cursor: "pointer",
  fontSize: 12.5, fontFamily: "inherit",
  borderRadius: 4, textAlign: "left",
};
