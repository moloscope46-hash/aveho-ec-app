"use client";
// =============================================================
//  useStickyState — useState persisté dans localStorage par utilisateur
//  Alpha 0.29.0
//
//  Drop-in replacement de useState. La valeur est sauvegardée dans
//  localStorage et restaurée au mount. Scopée par utilisateur pour
//  éviter qu'un user voie les filtres d'un autre sur le même appareil.
//
//  Usage :
//   const [fStatut, setFStatut] = useStickyState("", "interventions:fStatut");
//   const [filters, setFilters] = useStickyState({}, "achats:advFilters");
//
//  Clé finale en localStorage : "aveho:{userId}:{key}"
//  Ou "aveho:anon:{key}" si pas de userId.
// =============================================================
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./useAuth";

const PREFIX = "aveho:";

/**
 * @param {*} initial — valeur initiale si rien en localStorage
 * @param {string} key — clé unique (ex: "interventions:fStatut")
 * @param {object} opts { json: true (default), scope: "user"|"global" }
 *   scope: "user" (défaut) → scopé par userId
 *   scope: "global" → partagé entre utilisateurs du même appareil
 */
export function useStickyState(initial, key, opts = {}) {
  const auth = useAuth();
  const json = opts.json !== false;
  const scope = opts.scope || "user";

  // Construit la clé finale (impossible à utiliser tant qu'auth pas prêt si scope user)
  const userId = scope === "global" ? "global" : (auth?.user?.id || "anon");
  const fullKey = `${PREFIX}${userId}:${key}`;

  // State avec lazy init : on lit localStorage au premier render
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(fullKey);
      if (raw === null) return initial;
      return json ? JSON.parse(raw) : raw;
    } catch {
      return initial;
    }
  });

  // Sauvegarde à chaque changement
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      // Si valeur "vide" pour le type → on retire l'entrée plutôt que de stocker
      const isEmpty = value === "" || value === null || value === undefined
        || (Array.isArray(value) && value.length === 0)
        || (typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length === 0);
      if (isEmpty) {
        window.localStorage.removeItem(fullKey);
      } else {
        const toStore = json ? JSON.stringify(value) : String(value);
        window.localStorage.setItem(fullKey, toStore);
      }
    } catch {
      // Quota dépassé ou autre : on ignore silencieusement
    }
  }, [fullKey, value, json]);

  // Re-charge si la clé change (changement d'utilisateur)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(fullKey);
      if (raw === null) {
        setValue(initial);
      } else {
        setValue(json ? JSON.parse(raw) : raw);
      }
    } catch {
      setValue(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullKey]);

  // Reset à la valeur initiale + purge localStorage
  const reset = useCallback(() => {
    setValue(initial);
    if (typeof window !== "undefined") {
      try { window.localStorage.removeItem(fullKey); } catch {}
    }
  }, [fullKey, initial]);

  return [value, setValue, reset];
}

/**
 * Helper pour purger toutes les clés sticky d'un utilisateur (sur logout par ex)
 */
export function clearStickyStateForUser(userId) {
  if (typeof window === "undefined") return 0;
  const prefix = `${PREFIX}${userId || "anon"}:`;
  let count = 0;
  try {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    keys.forEach((k) => { window.localStorage.removeItem(k); count += 1; });
  } catch {}
  return count;
}
