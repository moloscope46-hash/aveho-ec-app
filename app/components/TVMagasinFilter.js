"use client";
// =============================================================
//  components/TVMagasinFilter.js (0.65.0)
//
//  Sélecteur fournisseur/magasin pour les pages TV.
//  - Si l'utilisateur n'a qu'1 magasin, pas affiché
//  - Sinon dropdown discret avec localStorage persistant
//
//  Param URL ?mag=<uuid> override le localStorage
// =============================================================

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";

const STORAGE_KEY = "av-tv-magasin-id";

export default function TVMagasinFilter({ onChange }) {
  const supabase = createClient();
  const auth = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const urlMag = params.get("mag");

  const [magasins, setMagasins] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!auth?.structureId) return;
    (async () => {
      try {
        const { data } = await supabase.from("magasins")
          .select("id, nom")
          .eq("structure_id", auth.structureId)
          .order("nom");
        setMagasins(data || []);
        let initial = urlMag || (typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null);
        if (initial && data?.find(m => m.id === initial)) {
          setSelected(initial);
          onChange?.(initial);
        }
        setLoaded(true);
      } catch (e) {
        console.warn("[TVMagasinFilter] load error:", e);
        setLoaded(true);
      }
    })();
  }, [auth?.structureId, urlMag]);

  function change(id) {
    setSelected(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
    onChange?.(id);
    // Mettre à jour URL aussi
    const next = new URLSearchParams(params);
    if (id) next.set("mag", id); else next.delete("mag");
    router.replace(`?${next.toString()}`, { scroll: false });
  }

  // Si pas chargé OU 1 seul magasin OU rien → ne pas afficher
  if (!loaded || magasins.length <= 1) return null;

  const cur = magasins.find(m => m.id === selected);

  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "5px 10px",
      background: "rgba(124, 200, 200, .12)",
      border: "1px solid rgba(124, 200, 200, .3)",
      borderRadius: 8,
      fontSize: 12,
    }}>
      <i className="ti ti-building-store" style={{ color: "#7CC8C8", fontSize: 14 }} />
      <select
        value={selected || ""}
        onChange={(e) => change(e.target.value || null)}
        style={{
          background: "transparent",
          color: "#fff",
          border: "none",
          fontFamily: "inherit",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          outline: "none",
          padding: "2px 4px",
        }}>
        <option value="" style={{ color: "#142131", background: "#fff" }}>Tous magasins</option>
        {magasins.map(m => (
          <option key={m.id} value={m.id} style={{ color: "#142131", background: "#fff" }}>
            {m.nom}{m.fournisseurs?.nom ? ` (${m.fournisseurs.nom})` : ""}
          </option>
        ))}
      </select>
      {cur && (
        <span style={{ color: "#7CC8C8", fontSize: 10, fontWeight: 700, marginLeft: 2 }}>
          ●
        </span>
      )}
    </div>
  );
}

// Helper pour récupérer le magasin courant côté pages TV
export function getTVMagasinId(params) {
  const fromUrl = params?.get?.("mag");
  if (fromUrl) return fromUrl;
  if (typeof window !== "undefined") {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch { return null; }
  }
  return null;
}
