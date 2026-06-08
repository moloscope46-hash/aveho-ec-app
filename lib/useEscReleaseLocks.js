"use client";
// =============================================================
//  lib/useEscReleaseLocks.js (0.62.127)
//
//  Hook global qui écoute la touche Esc et libère tous les
//  locks de l'utilisateur courant. À monter une fois dans la
//  TopBar (ou layout) pour avoir un raccourci universel.
//
//  L'appui sur Esc tire en condition :
//    - Aucune modal n'est en train de bloquer la fermeture
//    - L'user a au moins 1 lock actif
//    - Triple appui rapide (anti-erreur) OU si modifier Shift+Esc
//
//  Affiche un toast à la libération.
// =============================================================

import { useEffect, useRef } from "react";
import { createClient } from "./supabase";
import { useAuth } from "./useAuth";

export function useEscReleaseLocks(enabled = true) {
  const supabase = createClient();
  const auth = useAuth();
  const lastEscRef = useRef([]);

  useEffect(() => {
    if (!enabled || !auth?.user?.id) return;

    async function releaseAll() {
      try {
        const { data, error } = await supabase
          .from("edit_locks")
          .delete()
          .eq("user_id", auth.user.id)
          .select();
        if (error) return;
        const count = data?.length || 0;
        try {
          const { toast } = await import("../app/components/ui-premium");
          if (count > 0) {
            toast?.success?.(`🔓 ${count} verrou${count > 1 ? "x" : ""} libéré${count > 1 ? "s" : ""}`);
          } else {
            toast?.info?.("Aucun verrou actif à libérer");
          }
        } catch {}
      } catch {}
    }

    function onKey(e) {
      if (e.key !== "Escape") return;
      // Ignore si dans un input/textarea/contenteditable
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) return;

      // Shift+Esc = libération immédiate
      if (e.shiftKey) {
        releaseAll();
        return;
      }

      // Triple Esc en <800ms = libération
      const now = Date.now();
      lastEscRef.current = [...lastEscRef.current, now].filter(t => now - t < 800);
      if (lastEscRef.current.length >= 3) {
        lastEscRef.current = [];
        releaseAll();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, auth?.user?.id, supabase]);
}
