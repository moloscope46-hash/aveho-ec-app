"use client";
import { useEffect, useState } from "react";

export function useCarMode() {
  const [carMode, setCarMode] = useState({ isCarMode: false, type: null, isLandscape: false, isLargeScreen: false });
  useEffect(() => {
    if (typeof window === "undefined") return;
    function detect() {
      const ua = navigator.userAgent.toLowerCase();
      const w = window.innerWidth, h = window.innerHeight;
      const isAndroidAuto = /android.*auto/i.test(ua) || /aauto/.test(ua);
      const isCarPlay = /carplay/i.test(ua) || /apple.*car/i.test(ua);
      const ratio = w / h;
      const isLandscape = w > h;
      const isLargeScreen = w >= 800;
      const isMirrorLikely = isLandscape && isLargeScreen && ratio > 1.4 && ratio < 2.5;
      const isTouchDevice = "ontouchstart" in window;
      const probableMirror = isMirrorLikely && (isTouchDevice || isAndroidAuto || isCarPlay);
      setCarMode({
        isCarMode: isAndroidAuto || isCarPlay || probableMirror,
        type: isAndroidAuto ? "android_auto" : isCarPlay ? "carplay" : probableMirror ? "mirror" : null,
        isLandscape, isLargeScreen,
      });
    }
    detect();
    window.addEventListener("resize", detect);
    window.addEventListener("orientationchange", detect);
    return () => { window.removeEventListener("resize", detect); window.removeEventListener("orientationchange", detect); };
  }, []);
  return carMode;
}

export function useForceLandscape(enabled = false) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (screen.orientation?.lock) {
      try { screen.orientation.lock("landscape").catch(() => {}); } catch (e) {}
    }
    document.body.classList.add("av-force-landscape");
    return () => {
      document.body.classList.remove("av-force-landscape");
      if (screen.orientation?.unlock) { try { screen.orientation.unlock(); } catch (e) {} }
    };
  }, [enabled]);
}
