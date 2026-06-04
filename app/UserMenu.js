"use client";
// =============================================================
//  UserMenu — bloc utilisateur dans la TopBar avec sous-volet
//  Desktop : avatar + nom + chevron → popover
//  Mobile  : pastille seule → bottom sheet
//  Alpha 0.16.0
// =============================================================
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase";
// 0.58.5 : Avatar premium remplace les um-avatar custom
import { Avatar } from "./components/ui-premium";

// Couleurs déterministes à partir d'un user_id ou d'un nom
const PALETTE = ["#7CC8C8", "#185FA5", "#C9867F", "#7a6fb0", "#5aa05a", "#EF9F27", "#5a8f8f", "#e35d5b"];
function colorFor(seed) {
  let h = 0;
  for (let i = 0; i < (seed || "").length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}
function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function UserMenu({ auth }) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [iosCanInstall, setIosCanInstall] = useState(false);
  // Alpha 0.49.5 : modal d'instructions d'installation manuelle (Chrome desktop)
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const ref = useRef(null);

  // PWA install detection
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    if (standalone) { setInstalled(true); return; }
    const onPrompt = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);
    if (isIOS && isSafari) setIosCanInstall(true);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  // Fermer au clic extérieur
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onEsc(e) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  function go(p) { setOpen(false); router.push(p); }

  // 0.57.35 : purge données user-spécifiques AVANT signOut
  // Critique sur devices partagés (poste de soin) — empêche user B
  // de voir search-history, cart, dashboard config, caches photos
  // et données API mises en cache par le SW
  async function logout() {
    setOpen(false);
    try {
      const { clearUserData } = await import("../lib/clearUserData");
      await clearUserData();
    } catch {
      // En cas d'erreur, on continue le logout : mieux vaut être déconnecté
      // avec localStorage pollué que rester connecté
    }
    await supabase.auth.signOut();
    router.push("/login");
  }
  async function installApp() {
    if (installPrompt) {
      // Cas idéal : Chrome a fourni un prompt natif → on l'utilise
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") { setInstallPrompt(null); setInstalled(true); }
      setOpen(false);
    } else {
      // Alpha 0.49.5 : pas de prompt natif → on affiche des instructions manuelles
      setOpen(false);
      setShowInstallHelp(true);
    }
  }

  // Détection navigateur pour l'aide manuelle
  function detectBrowser() {
    if (typeof window === "undefined") return "other";
    const ua = window.navigator.userAgent;
    if (/Edg\//.test(ua)) return "edge";
    if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return "chrome";
    if (/Firefox\//.test(ua)) return "firefox";
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "safari";
    return "other";
  }

  const displayName = auth?.user?.user_metadata?.nom_affiche
    || auth?.role?.nom_affiche
    || auth?.user?.email?.split("@")[0]
    || "Utilisateur";
  const userEmail = auth?.user?.email || "";
  const roleNom = auth?.role?.nom || "—";
  const seedColor = auth?.user?.id || displayName;
  const ini = initials(displayName);
  const col = colorFor(seedColor);

  // Alpha 0.49.5 : bouton install affiché tant que pas installé.
  // Si Chrome n'a pas fourni de prompt natif → on affiche une modale d'aide manuelle.
  const canInstall = !installed;

  return (
    <div className="um-root" ref={ref}>
      <button className={`um-btn${open ? " open" : ""}`} onClick={() => setOpen(!open)} aria-label="Menu utilisateur">
        {/* 0.58.5 : Avatar premium (gradient déterministe par nom) */}
        <Avatar name={displayName} size={30} />
        <span className="um-name">{displayName}</span>
        <i className="ti ti-chevron-down um-chev" />
      </button>

      {open && (
        <>
          <div className="um-backdrop" onClick={() => setOpen(false)} />
          <div className="um-sheet">
            <div className="um-head">
              {/* 0.58.5 : Avatar XL avec halo glow dans le header du menu */}
              <Avatar name={displayName} size={52} ring />
              <div className="um-id">
                <div className="um-id-name">{displayName}</div>
                <div className="um-id-mail">{userEmail}</div>
                <div className="um-id-role"><i className="ti ti-shield-check" /> {roleNom}</div>
              </div>
            </div>

            <div className="um-divider" />

            <button className="um-item" onClick={() => go("/profil")}>
              <i className="ti ti-user-circle" /> <span>Mon profil</span>
            </button>
            <button className="um-item" onClick={() => go("/collectivite")}>
              <i className="ti ti-building-community" /> <span>Mon établissement</span>
            </button>
            <button className="um-item" onClick={() => go("/parametres")}>
              <i className="ti ti-settings" /> <span>Paramètres</span>
            </button>

            {canInstall && (
              <button className="um-item highlight" onClick={installApp}>
                <i className="ti ti-download" />
                <span>Télécharger l'appli</span>
                {iosCanInstall && !installPrompt && <span className="um-hint">(iOS)</span>}
              </button>
            )}
            {iosCanInstall && !installPrompt && open && (
              <div className="um-ios-hint">
                Touchez <i className="ti ti-share" /> puis « Sur l'écran d'accueil ».
              </div>
            )}

            <div className="um-divider" />

            <button className="um-item logout" onClick={logout}>
              <i className="ti ti-logout" /> <span>Déconnexion</span>
            </button>
          </div>
        </>
      )}

      {/* Alpha 0.49.5 : modal d'aide installation manuelle */}
      {showInstallHelp && (
        <InstallHelpModal browser={detectBrowser()} onClose={() => setShowInstallHelp(false)} />
      )}
    </div>
  );
}

// =============================================================
//  Modal d'aide installation (Alpha 0.49.5)
//  Affichée si Chrome n'a pas fourni de prompt natif
//  (souvent après modifs du SW ou en mode dev)
// =============================================================
function InstallHelpModal({ browser, onClose }) {
  const tips = {
    chrome: {
      title: "Installer sur Chrome",
      steps: [
        "Clique sur l'icône d'installation à droite de la barre d'adresse (un écran avec une flèche vers le bas)",
        "Si elle n'apparaît pas : menu ⋮ (3 points) en haut à droite → « Installer Aveho EC… »",
        "Confirme l'installation",
      ],
    },
    edge: {
      title: "Installer sur Edge",
      steps: [
        "Menu ⋯ (3 points) en haut à droite",
        "« Applications » → « Installer cette page en tant qu'application »",
        "Confirme l'installation",
      ],
    },
    firefox: {
      title: "Firefox — PWA non supporté",
      steps: [
        "Firefox desktop ne supporte pas l'installation des PWA.",
        "Tu peux utiliser Chrome ou Edge pour installer l'app sur ton bureau.",
        "Sur Firefox Android, le menu propose « Ajouter à l'écran d'accueil ».",
      ],
    },
    safari: {
      title: "Installer sur Safari",
      steps: [
        "Bouton Partager (carré avec flèche)",
        "« Sur l'écran d'accueil » (iOS) ou « Ajouter au Dock » (macOS Sonoma+)",
      ],
    },
    other: {
      title: "Installation de l'app",
      steps: [
        "Cherche dans le menu de ton navigateur l'option « Installer cette application » ou « Ajouter à l'écran d'accueil ».",
        "Sur les navigateurs récents (Chrome, Edge, Safari), cette option est généralement dans le menu ⋮ ou ⋯.",
      ],
    },
  };
  const tip = tips[browser] || tips.other;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(20,33,49,0.5)",
          zIndex: 99, animation: "fadeIn .15s ease-out",
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-help-title"
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "calc(100% - 32px)", maxWidth: 460,
          background: "#fff", borderRadius: 14,
          boxShadow: "0 20px 50px rgba(20,33,49,0.35)",
          zIndex: 100, padding: 24,
          animation: "fadeIn .2s ease-out",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <h3 id="install-help-title" style={{ margin: 0, fontSize: 18, color: "#142131", fontWeight: 700 }}>
            <i className="ti ti-download" style={{ color: "#185FA5", marginRight: 8 }} aria-hidden="true" />
            {tip.title}
          </h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#8a98a8", fontSize: 20, padding: 4 }}
            aria-label="Fermer"
          >
            <i className="ti ti-x" />
          </button>
        </div>
        <p style={{ fontSize: 13, color: "#6c7a89", margin: "0 0 14px" }}>
          Installer Aveho EC permet d'y accéder en plein écran, plus rapidement et hors connexion.
        </p>
        <ol style={{ margin: 0, paddingLeft: 22, fontSize: 13.5, color: "#2a3a48", lineHeight: 1.7 }}>
          {tip.steps.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
        </ol>
        <div style={{ marginTop: 18, padding: "10px 12px", background: "#f4f7fa", borderRadius: 8, fontSize: 11.5, color: "#6c7a89" }}>
          <i className="ti ti-info-circle" aria-hidden="true" /> Astuce : sur certains navigateurs, il faut visiter le site quelques fois avant que l'option apparaisse.
        </div>
        <div style={{ marginTop: 16, textAlign: "right" }}>
          <button
            onClick={onClose}
            style={{ background: "#185FA5", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Compris
          </button>
        </div>
      </div>
    </>
  );
}
