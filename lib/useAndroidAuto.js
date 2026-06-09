"use client";
import { useEffect, useState } from "react";

export function useAndroidAuto() {
  const [detected, setDetected] = useState({ androidAuto: false, carPlay: false, miroir: false });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || "";
    const aa = /Android Auto|aa-/i.test(ua);
    const cp = /CarPlay/i.test(ua);
    // Détection miroir : grand écran + paysage + touch
    const mirror = window.innerWidth >= 1024 && window.matchMedia("(orientation: landscape)").matches && navigator.maxTouchPoints > 0;
    setDetected({ androidAuto: aa, carPlay: cp, miroir: mirror });
    if (aa || cp) document.documentElement.classList.add("av-car-mode");
  }, []);
  return detected;
}
