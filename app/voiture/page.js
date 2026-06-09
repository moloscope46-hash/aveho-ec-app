"use client";
// =============================================================
//  /voiture — Mode VOITURE (Android Auto / Apple CarPlay)
//  Interface ultra-épurée, gros boutons tactiles 60px+
//  Sécurité conducteur : grand contraste, peu de texte
//  Détecte connexion miroir d'écran auto via user-agent
// =============================================================
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useWakeLock } from "../../lib/useWakeLock";
import { useSpeechTTS } from "../../lib/useSpeechTTS";
import { useAndroidAuto } from "../../lib/useAndroidAuto";
import { useAuth } from "../../lib/useAuth";

const CATEGORIES = [
  { key: "patients",      l: "Patients",       ic: "ti-user",            c: "#7a6fb0" },
  { key: "etablissements",l: "Établissements", ic: "ti-building-hospital", c: "#C9867F" },
  { key: "magasins",      l: "Magasins",       ic: "ti-building-store",  c: "#185FA5" },
  { key: "pharmacies",    l: "Pharmacies",     ic: "ti-medical-cross",   c: "#5aa05a" },
  { key: "rpps",          l: "Partenaires RPPS",ic: "ti-stethoscope",    c: "#C9867F" },
  { key: "fournisseurs",  l: "Fournisseurs",   ic: "ti-truck",           c: "#5e4a8c" },
];

export default function ModeVoiturePage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  useWakeLock(true);
  const carDetect = useAndroidAuto();
  const speak = useSpeechTTS({ lang: "fr-FR" });
  const [category, setCategory] = useState("patients");
  const [data, setData] = useState({ patients: [], etablissements: [], magasins: [], pharmacies: [], rpps: [], fournisseurs: [] });
  const [search, setSearch] = useState("");
  const [time, setTime] = useState(new Date());
  const [isInCar, setIsInCar] = useState(false);

  // Détection miroir véhicule
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent.toLowerCase();
    // Android Auto = pas de UA spécifique mais l'utilisateur peut le déclencher manuellement
    // CarPlay = idem
    // Détection screen ratio + landscape forcé + grand DPR
    const isLandscapeBigScreen = window.innerWidth > window.innerHeight && window.innerWidth >= 800;
    setIsInCar(isLandscapeBigScreen);
  }, []);

  // Horloge live
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (auth.ready) load(); }, [auth.ready, auth.etabId]);

  async function load() {
    const sid = auth.structureId;
    const [pa, et, mg, ph, rp, fn] = await Promise.all([
      supabase.from("patients").select("id, nom, prenom, telephone, ville, latitude, longitude, adresse").eq("structure_id", sid).order("nom").limit(200),
      supabase.from("etablissements").select("id, nom, code, telephone, ville, latitude, longitude, adresse").eq("structure_id", sid).order("nom").limit(50),
      supabase.from("magasins").select("id, nom, code, telephone, ville, adresse").eq("structure_id", sid).order("nom").limit(50),
      supabase.from("pharmacies").select("id, nom, telephone, ville, adresse").eq("structure_id", sid).order("nom").limit(50),
      supabase.from("partenaires_rpps").select("id, nom, prenom, telephone, mobile, ville, profession, adresse").eq("structure_id", sid).order("nom").limit(200),
      supabase.from("fournisseurs").select("id, nom, telephone, ville, adresse").eq("structure_id", sid).order("nom").limit(100),
    ]);
    setData({
      patients: pa.data || [],
      etablissements: et.data || [],
      magasins: mg.data || [],
      pharmacies: ph.data || [],
      rpps: rp.data || [],
      fournisseurs: fn.data || [],
    });
  }

  const items = data[category] || [];
  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return items;
    return items.filter(it => 
      (`${it.nom || ""} ${it.prenom || ""} ${it.ville || ""}`).toLowerCase().includes(s)
    );
  }, [items, search, category]);

  const catCfg = CATEGORIES.find(c => c.key === category);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0c1726 0%, #142131 100%)",
      color: "#fff",
      fontFamily: "Quicksand, sans-serif",
      display: "flex", flexDirection: "column",
    }}>
      {/* HEADER VOITURE */}
      <header style={{
        padding: "20px 32px",
        background: `linear-gradient(135deg, ${catCfg?.c}30, ${catCfg?.c}10)`,
        borderBottom: `2px solid ${catCfg?.c}50`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: `linear-gradient(135deg, ${catCfg?.c}, ${catCfg?.c}cc)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 8px 24px ${catCfg?.c}60`,
          }}>
            <i className={`ti ${catCfg?.ic}`} style={{ fontSize: 36 }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em" }}>
              <i className="ti ti-steering-wheel" style={{ marginRight: 10 }} />
              Mode Voiture
            </h1>
            <div style={{ fontSize: 18, color: "rgba(255,255,255,.75)", marginTop: 4 }}>
              {catCfg?.l} · {filtered.length} contact{filtered.length > 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Horloge + sortie */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 32, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
              {time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)" }}>
              {time.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
            </div>
          </div>
          <button onClick={() => router.push("/")} style={{
            width: 60, height: 60, borderRadius: "50%",
            background: "rgba(212,94,94,.20)", color: "#D45E5E",
            border: "2px solid #D45E5E60",
            cursor: "pointer", fontSize: 24,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="ti ti-x" />
          </button>
        </div>
      </header>

      {/* CATÉGORIES en gros boutons */}
      <div style={{
        padding: "16px 32px",
        display: "flex", gap: 12, overflowX: "auto",
        background: "rgba(0,0,0,.20)",
        borderBottom: "1px solid rgba(255,255,255,.06)",
      }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            style={{
              padding: "16px 24px",
              borderRadius: 14,
              background: category === cat.key ? `linear-gradient(135deg, ${cat.c}, ${cat.c}dd)` : "rgba(255,255,255,.06)",
              color: "#fff",
              border: category === cat.key ? `2px solid ${cat.c}` : "2px solid transparent",
              fontWeight: 800, fontSize: 18,
              fontFamily: "Quicksand, sans-serif",
              cursor: "pointer",
              minHeight: 64,
              whiteSpace: "nowrap",
              display: "inline-flex", alignItems: "center", gap: 10,
              boxShadow: category === cat.key ? `0 6px 16px ${cat.c}60` : "none",
              transition: "all 200ms",
            }}
          >
            <i className={`ti ${cat.ic}`} style={{ fontSize: 24 }} />
            {cat.l}
            <span style={{ background: "rgba(255,255,255,.20)", padding: "2px 10px", borderRadius: 10, fontSize: 13, fontWeight: 800 }}>
              {data[cat.key]?.length || 0}
            </span>
          </button>
        ))}
      </div>

      {/* RECHERCHE GRANDE */}
      <div style={{ padding: "16px 32px", flexShrink: 0 }}>
        <input
          type="search"
          placeholder="?? Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "18px 24px",
            fontSize: 22,
            borderRadius: 16,
            background: "rgba(255,255,255,.08)",
            color: "#fff",
            border: "2px solid rgba(255,255,255,.15)",
            fontFamily: "Quicksand, sans-serif",
            outline: "none",
          }}
        />
      </div>

      {/* LISTE CONTACTS - cards XXL */}
      <div style={{ flex: 1, padding: "0 32px 24px", overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "rgba(255,255,255,.4)", fontSize: 20 }}>
            <i className="ti ti-search-off" style={{ fontSize: 48, opacity: 0.4, display: "block", marginBottom: 12 }} />
            Aucun contact
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 14 }}>
            {filtered.map(it => (
              <ContactCard key={it.id} item={it} category={category} color={catCfg?.c} icon={catCfg?.ic} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ CARD CONTACT — gros boutons tactiles ============
function ContactCard({ item, category, color, icon }) {
  const nom = item.nom + (item.prenom ? ` ${item.prenom}` : "");
  const tel = item.telephone || item.mobile;
  const adresse = [item.adresse, item.ville].filter(Boolean).join(", ");
  const gpsHref = item.latitude && item.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}&travelmode=driving`
    : adresse
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}&travelmode=driving`
    : null;

  return (
    <div style={{
      padding: 18,
      borderRadius: 16,
      background: "rgba(255,255,255,.06)",
      border: `1px solid ${color}30`,
      display: "flex", flexDirection: "column", gap: 14,
      boxShadow: `0 4px 12px rgba(0,0,0,.20)`,
    }}>
      {/* Tête */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: `linear-gradient(135deg, ${color}, ${color}cc)`,
          color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, flexShrink: 0,
          boxShadow: `0 4px 12px ${color}50`,
        }}>
          <i className={`ti ${icon}`} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>{nom}</div>
          {item.profession && <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)", marginTop: 2 }}>{item.profession}</div>}
          {item.ville && <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", marginTop: 2 }}><i className="ti ti-map-pin" /> {item.ville}</div>}
        </div>
      </div>

      {/* Boutons XXL touch-friendly */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        <ActionBtn
          icon="ti-phone-call"
          label="Appeler"
          color="#5aa05a"
          disabled={!tel}
          onClick={() => tel && window.open(`tel:${tel}`)}
        />
        <ActionBtn
          icon="ti-map-pin"
          label="GPS"
          color="#185FA5"
          disabled={!gpsHref}
          onClick={() => gpsHref && window.open(gpsHref, "_blank")}
        />
        <ActionBtn
          icon="ti-message-circle"
          label="SMS"
          color="#7CC8C8"
          disabled={!tel}
          onClick={() => tel && window.open(`sms:${tel}`)}
        />
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, color, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "14px 8px",
        borderRadius: 12,
        background: disabled ? "rgba(255,255,255,.04)" : `linear-gradient(135deg, ${color}25, ${color}10)`,
        color: disabled ? "rgba(255,255,255,.3)" : "#fff",
        border: `1px solid ${disabled ? "rgba(255,255,255,.06)" : color}40`,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 14, fontWeight: 700,
        fontFamily: "Quicksand, sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        minHeight: 56,
        transition: "all 150ms",
      }}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 22, color: disabled ? "rgba(255,255,255,.3)" : color, filter: disabled ? "none" : `drop-shadow(0 0 4px ${color})` }} />
      {label}
    </button>
  );
}
