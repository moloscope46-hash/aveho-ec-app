"use client";
// =============================================================
//  app/StatusIcons.js (Alpha 0.55.21)
//
//  Indicateurs de statut dans la TopBar :
//   - Desktop (>768px) : 7 icônes en ligne, popover individuel au clic
//   - Mobile (≤768px) : 1 seul bouton "bouclier" qui ouvre une
//     modale plein écran avec toutes les features
//
//  Code couleur : vert (OK) · rouge (refusé) · gris (non config)
// =============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logger } from "../lib/logger";
import {
  isWebAuthnSupported, isPlatformAuthenticatorAvailable, getAvailableMethods} from "../lib/webauthn";
const COLOR = {
  ok: "#5aa05a",
  ko: "#c0392b",
  warn: "#EF9F27",
  unknown: "#8a98a8",
};

// Hook simple pour détecter mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

export default function StatusIcons({ auth }) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(null);          // id popover individuel (desktop)
  const [modalOpen, setModalOpen] = useState(false); // modale plein écran (mobile)
  const [status, setStatus] = useState({
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    notif: "unknown",
    geoloc: "unknown",
    pwa: false,
    sw: false,
    bioEmpreinte: false,
    bioFace: false,
    bioSupported: false,
  });

  useEffect(() => {
    refreshAll();
    const onOnline = () => setStatus((s) => ({ ...s, online: true }));
    const onOffline = () => setStatus((s) => ({ ...s, online: false }));
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [auth?.user?.email]);

  async function refreshAll() {
    const s = { online: navigator.onLine };

    if ("Notification" in window) {
      s.notif = Notification.permission;
    } else {
      s.notif = "unsupported";
    }

    if ("geolocation" in navigator && "permissions" in navigator) {
      try {
        const p = await navigator.permissions.query({ name: "geolocation" });
        s.geoloc = p.state;
      } catch {
        s.geoloc = "unknown";
      }
    } else {
      s.geoloc = "unsupported";
    }

    s.pwa = window.matchMedia?.("(display-mode: standalone)")?.matches
         || window.navigator.standalone === true;

    s.sw = !!navigator.serviceWorker?.controller;

    s.bioSupported = isWebAuthnSupported() && await isPlatformAuthenticatorAvailable();
    if (auth?.user?.email) {
      const methods = await getAvailableMethods(auth.user.email);
      s.bioEmpreinte = methods.includes("empreinte");
      s.bioFace = methods.includes("face");
    }

    setStatus(s);
  }

  // 0.55.23 : message de feedback temporaire après une action
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'warning'|'error', text }

  function showFeedback(type, text, duration = 5000) {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), duration);
  }

  async function requestNotif() {
    if (!("Notification" in window)) {
      showFeedback("error", "Notifications non supportées par ce navigateur");
      return;
    }
    try {
      const result = await Notification.requestPermission();
      await refreshAll();
      if (result === "granted") {
        showFeedback("success", "Notifications autorisées !");
        // Notif de test immédiate
        try {
          new Notification("Aveho EC", {
            body: "Vous recevrez désormais les alertes importantes ici",
            icon: "/icons/icon-192.png",
            silent: false,
          });
        } catch (e) {
          logger.warn("[StatusIcons] notif test fail:", e);
        }
      } else if (result === "denied") {
        showFeedback("error",
          "Notifications bloquées par le navigateur. Cliquez sur l'icône de cadenas/info dans la barre d'adresse → Permissions → Notifications → Autoriser.",
          10000
        );
      } else {
        // "default" → navigateur en mode silencieux (Edge Quiet, etc.)
        showFeedback("warning",
          "Le navigateur a bloqué la demande. Cliquez sur l'icône cloche ou cadenas dans la barre d'adresse pour autoriser manuellement.",
          10000
        );
      }
    } catch (e) {
      showFeedback("error", e.message || "Erreur");
    }
  }
  function requestGeoloc() {
    if (!navigator.geolocation) {
      showFeedback("error", "Géolocalisation non supportée");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async () => {
        await refreshAll();
        showFeedback("success", "Position autorisée !");
      },
      async (err) => {
        await refreshAll();
        if (err.code === 1) {
          showFeedback("error",
            "Position refusée. Pour autoriser, cliquez sur le cadenas dans la barre d'adresse → Permissions → Position.",
            10000
          );
        } else {
          showFeedback("warning", "Impossible d'obtenir la position : " + (err.message || "erreur"));
        }
      },
      { timeout: 8000 }
    );
  }

  // Naviguer vers /profil — utile pour les boutons "Gérer"
  function gotoProfil() {
    setOpen(null);
    setModalOpen(false);
    // Petit timeout pour laisser le state se mettre à jour avant la navigation
    setTimeout(() => router.push("/profil"), 50);
  }

  // Construction des features
  const features = [
    {
      id: "online",
      icon: status.online ? "ti-wifi" : "ti-wifi-off",
      label: "Réseau",
      ok: status.online,
      ko: !status.online,
      desc: status.online ? "Connecté à internet" : "Hors-ligne (mode dégradé)",
    },
    {
      id: "notif",
      icon: status.notif === "granted" ? "ti-bell" : "ti-bell-off",
      label: "Notifications",
      ok: status.notif === "granted",
      ko: status.notif === "denied",
      desc: status.notif === "granted" ? "Notifications autorisées"
          : status.notif === "denied" ? "Notifications bloquées (réglages navigateur)"
          : status.notif === "unsupported" ? "Non supporté par ce navigateur"
          : "Notifications non demandées",
      action: status.notif === "default" ? { label: "Autoriser", fn: async () => { await requestNotif(); } } : null,
    },
    {
      id: "geoloc",
      icon: status.geoloc === "granted" ? "ti-map-pin" : "ti-map-pin-off",
      label: "Géolocalisation",
      ok: status.geoloc === "granted",
      ko: status.geoloc === "denied",
      desc: status.geoloc === "granted" ? "Position autorisée"
          : status.geoloc === "denied" ? "Position refusée (réglages navigateur)"
          : status.geoloc === "unsupported" ? "Non supporté"
          : "Position non demandée",
      action: status.geoloc === "prompt" ? { label: "Autoriser", fn: () => requestGeoloc() } : null,
    },
    {
      id: "pwa",
      icon: status.pwa ? "ti-device-mobile-check" : "ti-device-mobile",
      label: "Application installée (PWA)",
      ok: status.pwa,
      desc: status.pwa ? "Installée en tant qu'app" : "Mode navigateur — installation possible",
    },
    {
      id: "sw",
      icon: status.sw ? "ti-cloud-check" : "ti-cloud-off",
      label: "Service Worker (offline)",
      ok: status.sw,
      desc: status.sw ? "Cache offline actif" : "Service Worker pas encore chargé",
    },
    ...(status.bioSupported ? [
      {
        id: "bioEmpreinte",
        icon: "ti-fingerprint",
        label: "Empreinte digitale",
        ok: status.bioEmpreinte,
        desc: status.bioEmpreinte ? "Activée sur cet appareil" : "Non activée sur cet appareil",
        action: !status.bioEmpreinte ? { label: "Gérer dans Profil", fn: gotoProfil } : null,
      },
      {
        id: "bioFace",
        icon: "ti-face-id",
        label: "Détection faciale",
        ok: status.bioFace,
        desc: status.bioFace ? "Activée sur cet appareil" : "Non activée sur cet appareil",
        action: !status.bioFace ? { label: "Gérer dans Profil", fn: gotoProfil } : null,
      },
    ] : []),
  ];

  function colorFor(f) {
    if (f.ok) return COLOR.ok;
    if (f.ko) return COLOR.ko;
    return COLOR.unknown;
  }

  // Compteurs pour badge mobile
  const koCount = features.filter(f => f.ko).length;
  const unknownCount = features.filter(f => !f.ok && !f.ko).length;
  const badgeColor = koCount > 0 ? COLOR.ko : unknownCount > 0 ? COLOR.warn : COLOR.ok;

  // ============== MODE MOBILE : 1 bouton + modale ==============
  if (isMobile) {
    return (
      <>
        <button
          className="tb-icon status-mobile-btn"
          onClick={() => setModalOpen(true)}
          title="État des permissions et fonctionnalités"
          aria-label="Statut système"
          style={{ position: "relative" }}
        >
          <i className="ti ti-shield-check" />
          <span
            className="status-mobile-badge"
            style={{ background: badgeColor }}
          />
        </button>

        {modalOpen && (
          <div
            onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(20,33,49,.7)",
              zIndex: 9991,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              padding: 0,
              animation: "fadeIn .2s",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#fff",
                borderRadius: "16px 16px 0 0",
                width: "100%",
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
                animation: "slideUp .25s cubic-bezier(.2,.8,.2,1)",
              }}
            >
              {/* Header */}
              <div style={{
                background: "linear-gradient(135deg, #142131 0%, #185FA5 100%)",
                color: "#fff",
                padding: "14px 18px",
                borderRadius: "16px 16px 0 0",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}>
                <i className="ti ti-shield-check" style={{ fontSize: 22, color: "#7CC8C8" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, letterSpacing: 1.5, color: "#cfe4f5", fontWeight: 700 }}>
                    STATUT SYSTÈME
                  </div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>
                    {features.filter(f => f.ok).length}/{features.length} actifs
                  </div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  style={{
                    background: "transparent",
                    color: "#fff",
                    border: "none",
                    padding: 6,
                    cursor: "pointer",
                    fontSize: 22,
                  }}
                  aria-label="Fermer"
                >
                  <i className="ti ti-x" />
                </button>
              </div>

              {/* 0.55.23 : feedback de la dernière action */}
              {feedback && (
                <div style={{
                  padding: "10px 16px",
                  fontSize: 12.5,
                  lineHeight: 1.4,
                  background: feedback.type === "success" ? "#dff5e0"
                    : feedback.type === "warning" ? "#fff4d6"
                    : "#fce5e0",
                  color: feedback.type === "success" ? "#2e6f33"
                    : feedback.type === "warning" ? "#7a4f15"
                    : "#7a1f15",
                  borderBottom: "1px solid #e3e9ee",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}>
                  <i className={`ti ${feedback.type === "success" ? "ti-circle-check" : feedback.type === "warning" ? "ti-alert-triangle" : "ti-circle-x"}`}
                    style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }} />
                  <span>{feedback.text}</span>
                </div>
              )}

              {/* Liste features */}
              <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
                {features.map((f) => {
                  const color = colorFor(f);
                  return (
                    <div
                      key={f.id}
                      style={{
                        padding: "12px 18px",
                        borderBottom: "1px solid #f4f7fa",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{
                        width: 42, height: 42, borderRadius: 10,
                        background: color + "18",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <i className={`ti ${f.icon}`} style={{ fontSize: 22, color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#142131", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          {f.label}
                          <span style={{
                            background: color + "22",
                            color: color,
                            padding: "1px 8px",
                            borderRadius: 8,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: 0.3,
                          }}>
                            {f.ok ? "ACTIF" : f.ko ? "REFUSÉ" : "INACTIF"}
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: "#6c7a89", marginTop: 2 }}>
                          {f.desc}
                        </div>
                      </div>
                      {f.action && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            f.action.fn();
                          }}
                          style={{
                            background: `linear-gradient(135deg, #142131, ${color})`,
                            color: "#fff",
                            border: "none",
                            padding: "8px 14px",
                            borderRadius: 8,
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            minHeight: 36,
                            flexShrink: 0,
                          }}
                        >
                          {f.action.label}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div style={{
                padding: "12px 18px",
                background: "#f4f7fa",
                borderTop: "1px solid #e3e9ee",
                fontSize: 11,
                color: "#8a98a8",
                textAlign: "center",
              }}>
                <i className="ti ti-info-circle" /> Tout est géré par votre navigateur · paramètres dans les réglages OS pour les permissions refusées
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          .status-mobile-btn { position: relative; }
          .status-mobile-badge {
            position: absolute;
            top: 5px;
            right: 5px;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            border: 1.5px solid #142131;
          }
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>
      </>
    );
  }

  // ============== MODE DESKTOP : icônes inline + popover individuel ==============
  return (
    <>
      <div className="status-icons">
        {features.map((f) => {
          const color = colorFor(f);
          return (
            <button
              key={f.id}
              className="status-icon-btn"
              onClick={() => setOpen(open === f.id ? null : f.id)}
              title={`${f.label} — ${f.desc}`}
              aria-label={f.label}
              style={{
                background: open === f.id ? color + "22" : "transparent",
                border: `1px solid ${open === f.id ? color : "transparent"}`,
              }}
            >
              <i className={`ti ${f.icon}`} style={{ color, fontSize: 16 }} />
              <span className="status-dot" style={{ background: color }} />
            </button>
          );
        })}
      </div>

      {open && (() => {
        const f = features.find((x) => x.id === open);
        if (!f) return null;
        const color = colorFor(f);
        return (
          <>
            <div className="status-backdrop" onClick={() => setOpen(null)} />
            <div className="status-popover">
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 14px",
                background: color + "10",
                borderBottom: `2px solid ${color}`,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: color + "20",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <i className={`ti ${f.icon}`} style={{ color, fontSize: 22 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#142131" }}>{f.label}</div>
                  <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 1 }}>
                    {f.ok ? "✓ Activé" : f.ko ? "✗ Refusé" : "○ Non configuré"}
                  </div>
                </div>
              </div>
              <div style={{ padding: "12px 14px", fontSize: 12.5, color: "#2a3a48", lineHeight: 1.55 }}>
                {f.desc}
              </div>
              {/* 0.55.23 : feedback inline dans le popover desktop */}
              {feedback && open && (
                <div style={{
                  margin: "0 14px 12px",
                  padding: "8px 10px",
                  borderRadius: 6,
                  fontSize: 11.5,
                  lineHeight: 1.4,
                  background: feedback.type === "success" ? "#dff5e0"
                    : feedback.type === "warning" ? "#fff4d6"
                    : "#fce5e0",
                  color: feedback.type === "success" ? "#2e6f33"
                    : feedback.type === "warning" ? "#7a4f15"
                    : "#7a1f15",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 6,
                }}>
                  <i className={`ti ${feedback.type === "success" ? "ti-circle-check" : feedback.type === "warning" ? "ti-alert-triangle" : "ti-circle-x"}`}
                    style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }} />
                  <span>{feedback.text}</span>
                </div>
              )}
              {f.action && (
                <div style={{ padding: "0 14px 14px" }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      f.action.fn();
                    }}
                    style={{
                      width: "100%",
                      background: `linear-gradient(135deg, #142131, ${color})`,
                      color: "#fff",
                      border: "none",
                      padding: "9px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      minHeight: 38,
                    }}
                  >
                    {f.action.label}
                  </button>
                </div>
              )}
            </div>
          </>
        );
      })()}

      <style jsx>{`
        .status-icons {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 0 4px;
        }
        .status-icon-btn {
          position: relative;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 8px;
          width: 30px;
          height: 30px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: background 0.15s, border-color 0.15s;
        }
        .status-icon-btn:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .status-dot {
          position: absolute;
          bottom: 3px;
          right: 3px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          border: 1.5px solid #142131;
        }
        .status-backdrop {
          position: fixed;
          inset: 0;
          background: transparent;
          z-index: 48;
        }
        .status-popover {
          position: absolute;
          top: calc(100% + 6px);
          right: 8px;
          width: 280px;
          background: #fff;
          border: 1px solid #d3d9e0;
          border-radius: 12px;
          box-shadow: 0 14px 40px rgba(20, 33, 49, 0.22);
          overflow: hidden;
          z-index: 49;
          animation: status-pop 0.15s ease-out;
        }
        @keyframes status-pop {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
