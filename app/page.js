"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase";
import { logger } from "../lib/logger";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    // 0.56.22 : try/catch pour gérer les pertes de réseau au démarrage
    supabase.auth.getSession()
      .then(({ data }) => {
        router.replace(data.session ? "/vue-globale" : "/login");
      })
      .catch((e) => {
        logger.error("[Home] getSession failed:", e);
        // Si Supabase ne répond pas, on tente quand même /login (fallback safe)
        router.replace("/login");
      });
  }, [router]);
  return <div className="bg-dark" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#9fb6c2" }}>Chargement…</div>;
}
