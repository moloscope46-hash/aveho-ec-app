"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      router.replace(data.session ? "/vue-globale" : "/login");
    });
  }, [router]);
  return <div className="bg-dark" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#9fb6c2" }}>Chargement…</div>;
}
