"use client";
import { useEffect, useRef } from "react";

export function useWakeLock(enabled = true) {
  const ref = useRef(null);
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let canceled = false;
    async function acquire() {
      try {
        ref.current = await navigator.wakeLock.request("screen");
      } catch (e) { /* refused */ }
    }
    acquire();
    function onVis() { if (document.visibilityState === "visible" && enabled && !ref.current) acquire(); }
    document.addEventListener("visibilitychange", onVis);
    return () => {
      canceled = true;
      document.removeEventListener("visibilitychange", onVis);
      ref.current?.release?.().catch(() => {});
      ref.current = null;
    };
  }, [enabled]);
}
