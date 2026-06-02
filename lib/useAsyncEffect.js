"use client";
// =============================================================
//  lib/useAsyncEffect.js (Alpha 0.57.5)
//
//  Hook helper qui wrap proprement un useEffect async :
//   - try/catch automatique (pas d'UnhandledPromiseRejection)
//   - flag isMounted pour annuler les setState après démontage
//   - logging unifié via lib/logger en cas d'erreur
//
//  Usage :
//    useAsyncEffect(async ({ signal, isMounted }) => {
//      const data = await fetchSomething();
//      if (!isMounted()) return;  // composant démonté, on stop
//      setData(data);
//    }, [deps]);
//
//  À utiliser pour tous les useEffect qui font (async () => { ... })()
//  ou autre logique asynchrone susceptible de rejeter.
// =============================================================

import { useEffect} from "react";
import { logger } from "./logger";

export function useAsyncEffect(asyncFn, deps, options = {}) {
  const { errorLabel = "[useAsyncEffect]" } = options;

  useEffect(() => {
    let mounted = true;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const ctx = {
      isMounted: () => mounted,
      signal: controller?.signal,
    };

    (async () => {
      try {
        await asyncFn(ctx);
      } catch (e) {
        if (!mounted) return;  // composant démonté entre temps → ignore
        // 0.57.5 : log l'erreur sans crasher l'app
        logger.error(`${errorLabel} :`, e);
      }
    })();

    return () => {
      mounted = false;
      try { controller?.abort(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
