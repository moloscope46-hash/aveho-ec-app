"use client";
// =============================================================
//  app/StatusIcons.js (Alpha 0.55.19)
//
//  Petite barre d'icônes de statut dans la TopBar, à côté
//  des "3 points" (UserMenu).
//
//  Affiche pour chaque feature : icône colorée
//   - vert = activé / OK / autorisé
//   - rouge = bloqué / refusé / inactif
//   - gris = inconnu / non applicable
//
//  Au clic sur une icône → popover avec détails et action
//  (activer, ouvrir paramètres navigateur, etc.)
// =============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  getAvailableMethods,
  METHOD_LABEL,
  METHOD_ICON,
} from "../lib/webauthn";

// Helper : renvoie la couleur selon l'état
const COLOR = {
  ok: "#5aa05a",        // vert
  ko: "#c0392b",        // rouge
  warn: "#EF9F27",      // ambre
  unknown: "#8a98a8",   // gris
};

export default function StatusIcons({ auth }) {
  const router = useRouter();
  const [open, setOpen] = useState(null); // 'feature-id' actuellement déplié
  const [status, setStatus] = useState({
    online: navigator.onLine,
    notif: "unknown",      // 'granted' | 'denied' | 'default' | 'unsupported'
    geoloc: "unknown",     // idem
    pwa: false,            // installée ?
    sw: false,             // SW actif ?
    bioEmpreinte: false,
    bioFace: false,
    bioSupported: false,
  });

  useEffect(() => {
    refreshAll();
    // Écouter online/offline
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

    // Notifications
    if ("Notification" in window) {
      s.notif = Notification.permission; // 'granted' | 'denied' | 'default'
    } else {
      s.notif = "unsupported";
    }

    // Géoloc
    if ("geolocation" in navigator && "permissions" in navigator) {
      try {
        const p = await navigator.permissions.query({ name: "geolocation" });
        s.geoloc = p.state; // 'granted' | 'denied' | 'prompt'
      } catch {
        s.geoloc = "unknown";
      }
    } else {
      s.geoloc = "unsupported";
    }

    // PWA installée (display-mode)
    s.pwa = window.matchMedia?.("(display-mode: standalone)")?.matches
         || window.navigator.standalone === true;

    // Service Worker actif
    s.sw = !!navigator.serviceWorker?.controller;

    // Biométrie supportée + méthodes activées
    s.bioSupported = isWebAuthnSupported() && await isPlatformAuthenticatorAvailable();
    if (auth?.user?.email) {
      const methods = await getAvailableMethods(auth.user.email);
      s.bioEmpreinte = methods.includes("empreinte");
      s.bioFace = methods.includes("face");
    }

    setStatus(s);
  }

  function togglePopover(id) {
    setOpen(open === id ? null : id);
  }

  function closePopover() {
    setOpen(null);
  }

  // Demander une permission
  async function requestNotif() {
    if (!("Notification" in window)) return;
    try {
      await Notification.requestPermission();
      await refreshAll();
      closePopover();
    } catch {}
  }
  async function requestGeoloc() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async () => { await refreshAll(); closePopover(); },
      async () => { await refreshAll(); closePopover(); },
      { timeout: 5000 }
    );
  }

  // Liste des features à afficher dans l'ordre
  const features = [
    {
      id: "online",
      icon: status.online ? "ti-wifi" : "ti-wifi-off",
      label: "Réseau",
      ok: status.online,
      desc: status.online ? "Connecté à internet" : "Hors-ligne (mode dégradé)",
      action: null,
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
      action: status.notif === "default" ? { label: "Autoriser", fn: requestNotif } : null,
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
      action: status.geoloc === "prompt" ? { label: "Autoriser", fn: requestGeoloc } : null,
    },
    {
      id: "pwa",
      icon: status.pwa ? "ti-device-mobile-check" : "ti-device-mobile",
      label: "Application installée (PWA)",
      ok: status.pwa,
      desc: status.pwa ? "Installée en tant qu'app" : "Mode navigateur · l'installation est possible",
      action: null,
    },
    {
      id: "sw",
      icon: status.sw ? "ti-cloud-check" : "ti-cloud-off",
      label: "Service Worker (offline / cache)",
      ok: status.sw,
      desc: status.sw ? "Cache offline actif" : "Service Worker pas encore chargé",
      action: null,
    },
    ...(status.bioSupported ? [
      {
        id: "bioEmpreinte",
        icon: "ti-fingerprint",
        label: "Empreinte digitale",
        ok: status.bioEmpreinte,
        desc: status.bioEmpreinte ? "Activée sur cet appareil" : "Non activée sur cet appareil",
        action: !status.bioEmpreinte ? { label: "Gérer", fn: () => router.push("/profil") } : null,
      },
      {
        id: "bioFace",
        icon: "ti-face-id",
        label: "Détection faciale",
        ok: status.bioFace,
        desc: status.bioFace ? "Activée sur cet appareil" : "Non activée sur cet appareil",
        action: !status.bioFace ? { label: "Gérer", fn: () => router.push("/profil") } : null,
      },
    ] : []),
  ];

  // Calcul de la couleur d'une feature
  function colorFor(f) {
    if (f.ok) return COLOR.ok;
    if (f.ko) return COLOR.ko;
    return COLOR.unknown;
  }

  return (
    <>
      <div className="status-icons">
        {features.map((f) => {
          const color = colorFor(f);
          return (
            <button
              key={f.id}
              className="status-icon-btn"
              onClick={() => togglePopover(f.id)}
              title={`${f.label} — ${f.desc}`}
              aria-label={f.label}
              style={{
                background: open === f.id ? color + "22" : "transparent",
                border: `1px solid ${open === f.id ? color : "transparent"}`,
              }}
            >
              <i className={`ti ${f.icon}`} style={{ color, fontSize: 16 }} />
              <span
                className="status-dot"
                style={{ background: color }}
              />
            </button>
          );
        })}
      </div>

      {/* Popover ouvert */}
      {open && (() => {
        const f = features.find((x) => x.id === open);
        if (!f) return null;
        const color = colorFor(f);
        return (
          <>
            <div className="status-backdrop" onClick={closePopover} />
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
              {f.action && (
                <div style={{ padding: "0 14px 14px" }}>
                  <button
                    onClick={() => { f.action.fn(); }}
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
        /* Mobile : cache les icônes secondaires si écran trop petit */
        @media (max-width: 520px) {
          .status-icons :global(.status-icon-btn:nth-child(n+5)) {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
