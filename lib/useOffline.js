"use client";
// =============================================================
//  useOffline — Hook React pour gérer le mode hors-ligne
//  Alpha 0.25.0
//
//  Expose :
//   - online : boolean
//   - queueCount : nombre d'opérations en attente
//   - syncing : boolean (rejeu en cours)
//   - lastSync : timestamp dernière sync réussie
//   - syncNow() : forcer un rejeu manuel
//   - clearAll() : vider la queue (DANGER)
// =============================================================
import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "./supabase";
import { logger } from "./logger";
import {
  isOnline as isOnlineHelper,
  countQueue,
  replayQueue,
  clearQueue,
  listQueue,
} from "./offlineQueue";

export function useOffline(userId) {
  const supabase = createClient();
  const [online, setOnline] = useState(isOnlineHelper());
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const replayInProgressRef = useRef(false);

  // Recompte la queue
  const refreshCount = useCallback(async () => {
    if (!userId) return;
    try {
      const n = await countQueue(userId);
      setQueueCount(n);
    } catch (e) {
      logger.warn("useOffline.refreshCount:", e);
    }
  }, [userId]);

  // Rejouer la queue
  const syncNow = useCallback(async () => {
    if (!userId || !isOnlineHelper() || replayInProgressRef.current) return null;
    replayInProgressRef.current = true;
    setSyncing(true);
    try {
      const result = await replayQueue(supabase, userId);
      setLastSync(Date.now());
      setLastResult(result);
      await refreshCount();
      return result;
    } catch (e) {
      logger.warn("useOffline.syncNow:", e);
      return { error: e.message };
    } finally {
      replayInProgressRef.current = false;
      setSyncing(false);
    }
  }, [userId, supabase, refreshCount]);

  // Vider toute la queue (action manuelle uniquement)
  const clearAll = useCallback(async () => {
    if (!userId) return 0;
    const n = await clearQueue(userId);
    await refreshCount();
    return n;
  }, [userId, refreshCount]);

  // Liste détaillée pour UI (modale par exemple)
  const getQueueItems = useCallback(async () => {
    if (!userId) return [];
    return listQueue(userId);
  }, [userId]);

  // Écoute online/offline events
  useEffect(() => {
    function handleOnline() {
      setOnline(true);
      // Auto-sync quand on revient en ligne (avec délai pour laisser la connexion stabiliser)
      setTimeout(() => { syncNow(); }, 1500);
    }
    function handleOffline() {
      setOnline(false);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, [syncNow]);

  // Refresh count au montage et toutes les 10s (capturer les ajouts queue par d'autres parties de l'app)
  useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, 10000);
    return () => clearInterval(id);
  }, [refreshCount]);

  return {
    online,
    queueCount,
    syncing,
    lastSync,
    lastResult,
    syncNow,
    clearAll,
    getQueueItems,
    refreshCount,
  };
}
