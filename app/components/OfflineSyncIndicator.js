"use client";
// =============================================================
//  components/OfflineSyncIndicator.js (0.62.66)
//
//  Indicateur visuel discret en bas-droite :
//   - Vert "● Online" si connecté
//   - Orange "⚠ Offline" si déconnecté
//   - Violet "🔄 X en attente" si opérations queue à syncer
// =============================================================
import { useEffect, useState } from "react";
import { onConnectivityChange, getPendingCount, setupAutoSync } from "../../lib/offlineSync";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";

export default function OfflineSyncIndicator() {
  const auth = useAuth();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  useEffect(() => {
    // Listener online/offline
    const cleanup1 = onConnectivityChange((isOnline) => {
      setOnline(isOnline);
    });

    // Auto-sync queue dès reconnexion
    if (!auth.user?.id) return cleanup1;
    const supabase = createClient();
    const cleanup2 = setupAutoSync(supabase, {
      userId: auth.user.id,
      deviceId: getDeviceId(),
    });

    // Update pending count régulièrement
    const updatePending = async () => {
      const c = await getPendingCount();
      setPending(c);
    };
    updatePending();
    const interval = setInterval(updatePending, 5000);

    // Listener pour le custom event de fin de sync
    function onSyncComplete(e) {
      setSyncing(false);
      setLastSyncResult(e.detail);
      updatePending();
      setTimeout(() => setLastSyncResult(null), 4000);
    }
    window.addEventListener("av-sync-complete", onSyncComplete);

    return () => {
      cleanup1();
      cleanup2();
      clearInterval(interval);
      window.removeEventListener("av-sync-complete", onSyncComplete);
    };
  }, [auth.user?.id]);

  // Ne rien afficher si rien à signaler
  if (online && pending === 0 && !lastSyncResult) return null;

  let color, icon, label, sub;
  if (!online) {
    color = "#EF9F27";
    icon = "ti-wifi-off";
    label = "Hors ligne";
    sub = pending > 0 ? `${pending} action${pending > 1 ? "s" : ""} en attente` : "Mode local activé";
  } else if (syncing) {
    color = "#185FA5";
    icon = "ti-refresh";
    label = "Synchronisation...";
    sub = `${pending} restant${pending > 1 ? "s" : ""}`;
  } else if (pending > 0) {
    color = "#7a6fb0";
    icon = "ti-cloud-upload";
    label = `${pending} en attente`;
    sub = "Sync au retour en ligne";
  } else if (lastSyncResult) {
    color = "#5aa05a";
    icon = "ti-check";
    label = "Synchronisation OK";
    sub = `${lastSyncResult.synced} action${lastSyncResult.synced > 1 ? "s" : ""} envoyée${lastSyncResult.synced > 1 ? "s" : ""}`;
  } else {
    return null;
  }

  return (
    <div style={{
      position: "fixed", top: 70, right: 12, zIndex: 9000,
      background: "#fff",
      border: `1px solid ${color}40`,
      borderLeft: `4px solid ${color}`,
      borderRadius: 10,
      padding: "8px 12px",
      boxShadow: "0 8px 24px rgba(20,33,49,.15)",
      display: "flex", alignItems: "center", gap: 10,
      maxWidth: 280,
      animation: "av-fade-up 300ms ease-out",
      fontFamily: "Quicksand, sans-serif",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: `${color}1A`, color,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
      }}>
        <i className={`ti ${icon}`} style={{
          animation: syncing ? "av-spin 1s linear infinite" : "none",
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#142131", lineHeight: 1.2 }}>{label}</div>
        <div style={{ fontSize: 10.5, color: "#8a98a8", marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

function getDeviceId() {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem("av-device-id");
  if (!id) {
    id = "dev-" + Math.random().toString(36).slice(2, 11);
    localStorage.setItem("av-device-id", id);
  }
  return id;
}
