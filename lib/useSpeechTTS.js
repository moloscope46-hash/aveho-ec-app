"use client";
import { useCallback } from "react";

export function useSpeechTTS({ lang = "fr-FR", rate = 1.0, voice = null, enabled = true } = {}) {
  return useCallback((text) => {
    if (!enabled || typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = rate;
      if (voice) {
        const v = window.speechSynthesis.getVoices().find(x => x.name === voice || x.lang === voice);
        if (v) u.voice = v;
      }
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }, [lang, rate, voice, enabled]);
}
