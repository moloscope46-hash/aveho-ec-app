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
import { useAuth } from "../../lib/useAuth";
import { useCarMode, useForceLandscape } from "../../lib/useCarMode";

const CATEGORIES = [
  { key: "patients",      l: "Patients",       ic: "ti-user",            c: "#7a6fb0" },
  { key: "etablissements",l: "Établissements", ic: "ti-building-hospital", c: "#C9867F" },
  { key: "magasins",      l: "Magasins",       ic: "ti-building-store",  c: "#185FA5" },
  { key: "pharmacies",    l: "Pharmacies",     ic: "ti-medical-cross",   c: "#5aa05a" },
  { key: "rpps",          l: "Partenaires RPPS",ic: "ti-stethoscope",    c: "#C9867F" },
  { key: "fournisseurs",  l: "Fournisseurs",   ic: "ti-truck",           c: "#5e4a8c" },
  { key: "had",           l: "Patients HAD",   ic: "ti-home-heart",      c: "#185FA5" },
  { key: "tournee",       l: "Tournée en cours",ic: "ti-route",          c: "#EF9F27" },
  { key: "tournees_jour", l: "Tournées du jour", ic: "ti-calendar-route", c: "#185FA5" },
  { key: "di_urgentes",   l: "DI urgentes",     ic: "ti-bell-ringing",    c: "#D45E5E" },
];

export default function ModeVoiturePage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const [category, setCategory] = useState("patients");
  const [data, setData] = useState({ patients: [], etablissements: [], magasins: [], pharmacies: [], rpps: [], fournisseurs: [], had: [], tournee: [], tournees_jour: [], di_urgentes: [] });
  const [wakeLock, setWakeLock] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [lastAnnouncedStop, setLastAnnouncedStop] = useState(null);
  const [search, setSearch] = useState("");
  const [time, setTime] = useState(new Date());
  const [isInCar, setIsInCar] = useState(false);

  // 0.65.45 : Détection auto Android Auto / CarPlay + force landscape
  const carMode = useCarMode();
  useForceLandscape(carMode.isCarMode);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent.toLowerCase();
    // Android Auto = pas de UA spécifique mais l'utilisateur peut le déclencher manuellement
    // CarPlay = idem
    // Détection screen ratio + landscape forcé + grand DPR
    setIsInCar(carMode.isCarMode);
  }, []);

  // Horloge live
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (auth.ready) load(); }, [auth.ready, auth.etabId]);


  // 0.65.46 : Wake-lock
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.wakeLock) return;
    let lock = null;
    async function reqLock() {
      try { lock = await navigator.wakeLock.request("screen"); setWakeLock(lock); }
      catch (e) { console.warn("Wake-lock", e); }
    }
    reqLock();
    function onVis() { if (document.visibilityState === "visible" && !lock) reqLock(); }
    document.addEventListener("visibilitychange", onVis);
    return () => { try { lock?.release(); } catch (e) {} document.removeEventListener("visibilitychange", onVis); };
  }, []);

  // 0.65.46 : TTS prochain arrêt
  useEffect(() => {
    if (!ttsEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    const arret = (data.tournee || [])[0];
    if (!arret || arret.id === lastAnnouncedStop) return;
    setLastAnnouncedStop(arret.id);
    const msg = new SpeechSynthesisUtterance(`Prochain arrêt : ${arret.nom}${arret.ville ? ", " + arret.ville : ""}`);
    msg.lang = "fr-FR"; msg.rate = 0.95;
    window.speechSynthesis.speak(msg);
  }, [ttsEnabled, data.tournee, lastAnnouncedStop]);

  async function load() {
    const sid = auth.structureId;
    const [pa, et, mg, ph, rp, fn, had, tourneeEnCours, tJour, diUrg] = await Promise.all([
      supabase.from("patients").select("id, nom, prenom, telephone, ville, latitude, longitude, adresse").eq("structure_id", sid).order("nom").limit(200),
      supabase.from("etablissements").select("id, nom, code, telephone, ville, latitude, longitude, adresse").eq("structure_id", sid).order("nom").limit(50),
      supabase.from("magasins").select("id, nom, code, telephone, ville, adresse").eq("structure_id", sid).order("nom").limit(50),
      supabase.from("pharmacies").select("id, nom, telephone, ville, adresse").eq("structure_id", sid).order("nom").limit(50),
      supabase.from("partenaires_rpps").select("id, nom, prenom, telephone, mobile, ville, profession, adresse").eq("structure_id", sid).order("nom").limit(200),
      supabase.from("fournisseurs").select("id, nom, telephone, ville, adresse").eq("structure_id", sid).order("nom").limit(100),
      // Patients HAD (had isolés)
      supabase.from("patients").select("id, nom, prenom, telephone, ville, latitude, longitude, adresse").eq("structure_id", sid).eq("est_had", true).order("nom").limit(200),
      // Étapes de la tournée en cours (statut en_cours)
      supabase.from("tournees_etapes").select("id, libelle, latitude, longitude, ordre, statut, patient:patient_id(nom, prenom, telephone, ville)").eq("structure_id", sid).order("ordre").limit(50),
      supabase.from("tournees").select("id, nom, statut, distance_km, duree_minutes, chauffeur_nom, date_planifiee").eq("structure_id", sid).gte("date_planifiee", new Date().toISOString().substring(0,10) + "T00:00:00").lt("date_planifiee", new Date().toISOString().substring(0,10) + "T23:59:59").order("date_planifiee").limit(20),
      supabase.from("interventions").select("id, numero, type, urgence, statut, description, created_at, patient:patient_id(nom, prenom, telephone, ville, latitude, longitude, adresse)").eq("structure_id", sid).in("urgence", ["Urgent","Prioritaire","critique","haute"]).neq("statut", "Clôturée").neq("statut", "Refusée").order("created_at", { ascending: false }).limit(30),
    ]);
    setData({
      patients: pa.data || [],
      etablissements: et.data || [],
      magasins: mg.data || [],
      pharmacies: ph.data || [],
      rpps: rp.data || [],
      fournisseurs: fn.data || [],
      had: had?.data || [],
      // Tournée en cours : on remappe les étapes au format contact
      tournees_jour: (tJour?.data || []).map(t => ({
        id: t.id,
        nom: t.nom || `Tournée ${t.id.substring(0,6)}`,
        prenom: t.chauffeur_nom || "",
        telephone: null,
        ville: `${t.statut || ""} · ${(t.distance_km || 0).toFixed(0)}km`,
        latitude: null, longitude: null,
        profession: `${(t.distance_km || 0).toFixed(0)} km · ${t.duree_minutes || 0} min`,
      })),
      di_urgentes: (diUrg?.data || []).map(i => ({
        id: i.id,
        nom: i.numero || "DI",
        prenom: i.patient ? `${i.patient.prenom} ${i.patient.nom}` : "",
        telephone: i.patient?.telephone,
        ville: i.patient?.ville,
        latitude: i.patient?.latitude,
        longitude: i.patient?.longitude,
        profession: `${i.type || "Intervention"} · ${i.urgence || ""}`,
      })),
      tournee: (tourneeEnCours?.data || []).map(e => ({
        id: e.id,
        nom: e.libelle || (e.patient ? `${e.patient.nom} ${e.patient.prenom}` : "—"),
        prenom: "",
        telephone: e.patient?.telephone,
        ville: e.patient?.ville,
        latitude: e.latitude,
        longitude: e.longitude,
        profession: `Arrêt #${e.ordre} · ${e.statut || "a_venir"}`,
      })),
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

        {/* 0.65.45 : Badge mode voiture détecté + Horloge */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <button onClick={() => setTtsEnabled(!ttsEnabled)} title="Annonces vocales tournée" style={{ width: 50, height: 50, borderRadius: 12, background: ttsEnabled ? "rgba(90,160,90,.20)" : "rgba(255,255,255,.06)", color: ttsEnabled ? "#5aa05a" : "rgba(255,255,255,.5)", border: `1px solid ${ttsEnabled ? "#5aa05a50" : "rgba(255,255,255,.10)"}`, cursor: "pointer", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className={`ti ti-${ttsEnabled ? "volume" : "volume-off"}`} />
          </button>
          {wakeLock && (
            <div title="Écran maintenu allumé" style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(239,159,39,.15)", color: "#EF9F27", border: "1px solid #EF9F2740", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <i className="ti ti-bulb-filled" /> ÉCRAN ON
            </div>
          )}
          {carMode.isCarMode && (
            <div style={{
              padding: "8px 14px", borderRadius: 10,
              background: "rgba(90,160,90,.20)", color: "#5aa05a",
              border: "1px solid #5aa05a50",
              fontSize: 12, fontWeight: 800,
              display: "inline-flex", alignItems: "center", gap: 6,
              animation: "av-tv-pulse 2s ease-in-out infinite",
            }}>
              <i className="ti ti-circle-dot" />
              {carMode.type === "android_auto" ? "ANDROID AUTO" : carMode.type === "carplay" ? "CARPLAY" : "MODE MIROIR"}
            </div>
          )}
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
          placeholder="🔍 Rechercher..."
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
