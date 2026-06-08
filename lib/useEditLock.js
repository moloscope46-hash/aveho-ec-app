// =============================================================
//  lib/useEditLock.js (0.62.118)
//
//  Hook pour verrouiller une ressource pendant son édition.
//  Empêche 2 utilisateurs d'éditer la même chose en même temps.
//
//  Système : table `edit_locks` (resource_type, resource_id, user_id, locked_at)
//  - Tentative de lock à l'ouverture de l'édition
//  - Refresh toutes les 30s tant que la modal est ouverte
//  - Release au unmount ou save
//  - Auto-expire après 2 min sans refresh
//
//  Usage :
//    const { locked, lockedBy, takeover } = useEditLock("patient", patientId);
//    if (locked) return <LockedBanner lockedBy={lockedBy} onTakeover={takeover} />;
// =============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "./supabase";
import { useAuth } from "./useAuth";

const LOCK_REFRESH_INTERVAL = 30 * 1000; // 30s
const LOCK_EXPIRY_SECONDS = 120; // 2 min

export function useEditLock(resourceType, resourceId, enabled = true) {
  const supabase = createClient();
  const auth = useAuth();
  const [locked, setLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState(null);
  const [checking, setChecking] = useState(true);
  const [ownLock, setOwnLock] = useState(false);
  // 0.62.125 : ref pour détecter la perte de lock (warning toast)
  const prevOwnLockRef = useRef(false);

  const tryAcquireLock = useCallback(async () => {
    if (!enabled || !resourceType || !resourceId || !auth?.user?.id) return false;
    try {
      // Vérifier si la table existe (best-effort)
      const { data: existingLocks } = await supabase
        .from("edit_locks")
        .select("*")
        .eq("resource_type", resourceType)
        .eq("resource_id", resourceId)
        .gte("locked_at", new Date(Date.now() - LOCK_EXPIRY_SECONDS * 1000).toISOString());

      if (existingLocks && existingLocks.length > 0) {
        const existing = existingLocks[0];
        if (existing.user_id !== auth.user.id) {
          // 0.62.125 : détection de perte de lock (lock repris par un autre)
          if (prevOwnLockRef.current) {
            // J'avais le lock, je l'ai perdu : toast warning
            try {
              const { toast } = await import("../app/components/ui-premium");
              toast?.warn?.(`⚠️ Votre verrou d'édition a été repris par ${existing.user_nom || "un autre utilisateur"}. Vos modifications non sauvegardées pourraient être écrasées.`);
            } catch {}
          }
          // Verrouillé par un autre user
          setLocked(true);
          setLockedBy({
            id: existing.user_id,
            nom: existing.user_nom || "Un autre utilisateur",
            locked_at: existing.locked_at,
          });
          setOwnLock(false);
          prevOwnLockRef.current = false;
          return false;
        }
        // C'est mon propre lock (refresh)
        setOwnLock(true);
        prevOwnLockRef.current = true;
      } else {
        // Pas de lock existant : on tente d'en créer un
        const { error } = await supabase.from("edit_locks").upsert({
          resource_type: resourceType,
          resource_id: resourceId,
          user_id: auth.user.id,
          user_nom: auth.user.email || "Utilisateur",
          locked_at: new Date().toISOString(),
        }, { onConflict: "resource_type,resource_id" });

        if (error) {
          // Table absente ou erreur : on continue sans lock (mode dégradé)
          setLocked(false);
          setOwnLock(false);
          prevOwnLockRef.current = false;
          return false;
        }
        setOwnLock(true);
        prevOwnLockRef.current = true;
      }

      setLocked(false);
      setLockedBy(null);
      return true;
    } catch (e) {
      // Erreur silencieuse : table peut ne pas exister
      setLocked(false);
      return false;
    } finally {
      setChecking(false);
    }
  }, [enabled, resourceType, resourceId, auth?.user?.id, supabase]);

  const releaseLock = useCallback(async () => {
    if (!ownLock || !resourceType || !resourceId || !auth?.user?.id) return;
    try {
      await supabase.from("edit_locks")
        .delete()
        .eq("resource_type", resourceType)
        .eq("resource_id", resourceId)
        .eq("user_id", auth.user.id);
    } catch {}
  }, [ownLock, resourceType, resourceId, auth?.user?.id, supabase]);

  const takeover = useCallback(async () => {
    if (!resourceType || !resourceId || !auth?.user?.id) return;
    try {
      // Forcer la prise de contrôle
      await supabase.from("edit_locks")
        .delete()
        .eq("resource_type", resourceType)
        .eq("resource_id", resourceId);
      // Reprendre le lock
      await tryAcquireLock();
    } catch {}
  }, [resourceType, resourceId, auth?.user?.id, supabase, tryAcquireLock]);

  useEffect(() => {
    if (!enabled || !resourceType || !resourceId) {
      setChecking(false);
      return;
    }
    tryAcquireLock();
    // Refresh périodique
    const interval = setInterval(tryAcquireLock, LOCK_REFRESH_INTERVAL);
    // Release au unmount + beforeunload
    const onBeforeUnload = () => releaseLock();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", onBeforeUnload);
      releaseLock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, resourceType, resourceId, auth?.user?.id]);

  return { locked, lockedBy, checking, takeover, ownLock };
}
