"use client";
// =============================================================
//  components/StructureLogo.js (0.62.69)
//
//  Mini-logo de la structure dans TopBar.
//  Cache localStorage pour éviter le re-fetch à chaque render.
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";

export default function StructureLogo({ structureId, size = 28 }) {
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    if (!structureId) return;
    // Check cache localStorage
    const cacheKey = `av-struct-logo-${structureId}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { url, ts } = JSON.parse(cached);
        if (Date.now() - ts < 5 * 60 * 1000) { // 5 min cache
          setLogoUrl(url);
          return;
        }
      }
    } catch {}

    // Fetch from DB
    const supabase = createClient();
    supabase.from("structures").select("logo_url").eq("id", structureId).maybeSingle()
      .then(({ data }) => {
        const url = data?.logo_url || null;
        setLogoUrl(url);
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ url, ts: Date.now() }));
        } catch {}
      })
      .catch(() => {});
  }, [structureId]);

  if (!logoUrl) return null;

  return (
    <img src={logoUrl} alt="Logo" style={{
      width: size, height: size, borderRadius: 6, objectFit: "contain",
      background: "rgba(255,255,255,.95)", padding: 2,
      marginLeft: 6,
      boxShadow: "0 2px 6px rgba(0,0,0,.15)",
    }} />
  );
}
