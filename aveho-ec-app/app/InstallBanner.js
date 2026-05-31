"use client";
// =============================================================
//  InstallBanner — Banner contextuel d'installation PWA
//  Alpha 0.36.0
//
//  Affiche un banner discret en bas de l'écran après 30s d'utilisation
//  si le navigateur supporte l'install PWA et que l'app n'est pas déjà
//  installée. L'utilisateur peut :
//   - Cliquer "Installer" → prompt natif du navigateur
//   - Cliquer "Plus tard" → masqué 7 jours
//   - Cliquer × → masqué pour toujours (sauf reset localStorage)
//
//  Détection iOS : Safari ne supporte pas beforeinstallprompt,
//  on affiche des instructions manuelles (icône Partager → Ajouter à l'écran).
// =============================================================
import { useEffect, useState } from "react";

const STORAGE_KEY = "aveho:install-banner";
const DELAY_MS = 30000; // 30 secondes avant 1re apparition
const SNOOZE_DAYS = 7;

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Si déjà installé en standalone → ne pas afficher
    if (window.matchMedia?.("(display-mode: standalone)").matches) return;
    if (window.navigator?.standalone) return; // iOS

    // Vérifier l'état stocké
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const state = JSON.parse(raw);
        if (state.dismissed === "forever") return;
        if (state.snoozedUntil && state.snoozedUntil > Date.now()) return;
      }
    } catch {}

    // Détection iOS
    const ua = navigator.userAgent || "";
    const iosLike = /iphone|ipad|ipod/i.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    setIsIos(iosLike);

    // Écouter beforeinstallprompt (Chrome/Edge/etc.)
    let prompt = null;
    const onPrompt = (e) => {
      e.preventDefault();
      prompt = e;
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // Apparition différée
    const t = setTimeout(() => {
      // Sur iOS : pas de prompt natif mais on affiche quand même les instructions
      if (iosLike || prompt) {
        setShow(true);
      }
    }, DELAY_MS);

    // Si l'app est installée pendant la session, ne plus rien afficher
    const onInstalled = () => {
      setShow(false);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissed: "forever", installedAt: Date.now() }));
      } catch {}
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    installPrompt.prompt();
    try {
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") {
        setShow(false);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissed: "forever", installedAt: Date.now() }));
        } catch {}
      } else {
        // Refusé : snooze 7j
        snooze();
      }
    } catch {
      snooze();
    }
  }

  function snooze() {
    setShow(false);
    try {
      const snoozedUntil = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ snoozedUntil }));
    } catch {}
  }

  function dismissForever() {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissed: "forever" }));
    } catch {}
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Installer l'application Aveho EC"
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        right: 16,
        maxWidth: 420,
        margin: "0 auto",
        background: "linear-gradient(135deg, #142131 0%, #1e4a91 100%)",
        color: "#fff",
        borderRadius: 14,
        boxShadow: "0 12px 40px rgba(20,33,49,.45)",
        zIndex: 9990,
        padding: "14px 16px",
        fontSize: 13,
        lineHeight: 1.45,
        animation: "aveho-install-slideup .3s ease-out",
      }}
    >
      <style>{`
        @keyframes aveho-install-slideup {
          from { transform: translateY(120%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Close X en haut à droite */}
      <button
        onClick={dismissForever}
        aria-label="Ne plus afficher"
        title="Ne plus afficher"
        style={{
          position: "absolute", top: 8, right: 8,
          background: "rgba(255,255,255,.08)", border: "none", color: "#fff",
          width: 26, height: 26, borderRadius: 6, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "inherit", fontSize: 14, padding: 0,
        }}
      >
        <i className="ti ti-x" />
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: "rgba(124, 200, 200, .18)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <i className="ti ti-device-mobile" style={{ fontSize: 22, color: "#7CC8C8" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
            Installer Aveho EC
          </div>
          <div style={{ fontSize: 11.5, color: "#bfe6e6", opacity: 0.9 }}>
            Accès rapide, plein écran, fonctionne hors-ligne
          </div>
        </div>
      </div>

      {/* Alpha 0.47.0 : bénéfices visuels en grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 6,
        marginBottom: 10,
      }}>
        <BenefitChip icon="ti-rocket" label="Plus rapide" />
        <BenefitChip icon="ti-wifi-off" label="Hors-ligne" />
        <BenefitChip icon="ti-bell-ringing" label="Notifs push" />
      </div>

      {isIos ? (
        // iOS : pas de prompt natif possible, on guide manuellement
        <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 8, padding: "10px 12px", fontSize: 11.5, marginBottom: 10 }}>
          Sur iOS, appuie sur <i className="ti ti-share-2" style={{ color: "#7CC8C8" }} /> dans Safari puis sur <b>« Sur l'écran d'accueil »</b>.
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={snooze}
          style={{
            background: "transparent", color: "#bfe6e6",
            border: "1px solid rgba(255,255,255,.18)",
            padding: "7px 14px", borderRadius: 8,
            fontFamily: "inherit", fontSize: 12, fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Plus tard
        </button>
        {!isIos && installPrompt && (
          <button
            onClick={install}
            style={{
              background: "#7CC8C8", color: "#142131",
              border: "none",
              padding: "7px 16px", borderRadius: 8,
              fontFamily: "inherit", fontSize: 12, fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            <i className="ti ti-download" /> Installer
          </button>
        )}
      </div>
    </div>
  );
}

// Alpha 0.47.0 — petit chip de bénéfice PWA
function BenefitChip({ icon, label }) {
  return (
    <div style={{
      background: "rgba(255,255,255,.06)",
      border: "1px solid rgba(255,255,255,.1)",
      borderRadius: 6,
      padding: "6px 4px",
      textAlign: "center",
      fontSize: 10.5,
      color: "#bfe6e6",
    }}>
      <div style={{ fontSize: 16, marginBottom: 2, color: "#7CC8C8" }}>
        <i className={`ti ${icon}`} aria-hidden="true" />
      </div>
      {label}
    </div>
  );
}
