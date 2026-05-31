"use client";
// =============================================================
//  VersionCheck — Vérifie périodiquement si une nouvelle version
//                 du bundle est dispo et affiche un toast invitant
//                 au reload.
//  Alpha 0.48.0
//
//  Stratégie :
//   1. À l'init, lit la version actuelle via /api/version
//   2. La stocke en localStorage si pas encore présente
//   3. Toutes les 5 minutes, refait un fetch /api/version
//   4. Si version changée → affiche un toast persistant en bas
//   5. L'user peut cliquer "Recharger" ou "Plus tard" (snooze 1h)
// =============================================================
import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "aveho_app_version";
const SNOOZE_KEY = "aveho_version_snooze_until";
const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes
const SNOOZE_DURATION = 60 * 60 * 1000; // 1h

export default function VersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState(null);

  const check = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      const r = await fetch("/api/version", { cache: "no-store" });
      if (!r.ok) return;
      const data = await r.json();
      const stored = localStorage.getItem(STORAGE_KEY);
      const snoozedUntil = parseInt(localStorage.getItem(SNOOZE_KEY) || "0");

      if (!stored) {
        // Premier passage : enregistrer sans afficher
        localStorage.setItem(STORAGE_KEY, data.version);
        return;
      }

      if (stored !== data.version) {
        // Version changée
        if (snoozedUntil > Date.now()) return; // user a snoozé
        setNewVersion(data.version);
        setUpdateAvailable(true);
      }
    } catch (e) {
      // Network error : on ignore silencieusement
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Premier check après 10s (laisser le temps à l'UI de se monter)
    const t0 = setTimeout(check, 10000);
    const id = setInterval(check, POLL_INTERVAL);
    return () => {
      clearTimeout(t0);
      clearInterval(id);
    };
  }, [check]);

  async function reload() {
    if (typeof window === "undefined") return;
    // Alpha 0.49.3 : pour vraiment forcer le chargement de la nouvelle version,
    // il faut unregister tous les Service Workers + clear les caches, sinon
    // le SW continue de servir l'ancienne version cachée.
    try {
      // 1) Unregister tous les Service Workers
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      // 2) Effacer tous les caches CacheStorage (chunks + pages + assets)
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch (e) {
      // Best-effort, on continue même si ça plante
      console.warn("Cleanup SW/caches:", e?.message);
    }
    // 3) Effacer la version stockée pour que la nouvelle s'écrive au prochain load
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SNOOZE_KEY);
    } catch {}
    // 4) Hard reload (bypass cache navigateur si possible)
    window.location.reload();
  }

  function snooze() {
    if (typeof window !== "undefined") {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DURATION));
    }
    setUpdateAvailable(false);
  }

  if (!updateAvailable) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        maxWidth: 380,
        background: "linear-gradient(135deg, #5aa05a 0%, #2e6f33 100%)",
        color: "#fff",
        borderRadius: 12,
        boxShadow: "0 12px 32px rgba(20,33,49,.35)",
        padding: "16px 18px",
        zIndex: 9991,
        fontSize: 13.5,
        lineHeight: 1.5,
        animation: "aveho-version-slideup .35s ease-out",
      }}
    >
      <style>{`
        @keyframes aveho-version-slideup {
          from { transform: translateY(120%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <i className="ti ti-sparkles" style={{ fontSize: 22, color: "#bfe6e6" }} aria-hidden="true" />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Mise à jour disponible</div>
          <div style={{ fontSize: 11.5, color: "#cfeacb" }}>Version {newVersion}</div>
        </div>
      </div>
      <p style={{ margin: "0 0 12px", color: "#e3f5e1", fontSize: 12.5 }}>
        Recharge la page pour bénéficier des dernières améliorations.
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={snooze}
          style={{
            background: "transparent",
            color: "#cfeacb",
            border: "1px solid rgba(255,255,255,.25)",
            padding: "6px 12px",
            borderRadius: 6,
            fontFamily: "inherit",
            fontSize: 12,
            cursor: "pointer",
          }}
          aria-label="Reporter d'une heure"
        >
          Plus tard
        </button>
        <button
          onClick={reload}
          style={{
            background: "#fff",
            color: "#2e6f33",
            border: "none",
            padding: "6px 14px",
            borderRadius: 6,
            fontFamily: "inherit",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
          aria-label="Recharger la page maintenant"
        >
          <i className="ti ti-refresh" aria-hidden="true" /> Recharger
        </button>
      </div>
    </div>
  );
}
