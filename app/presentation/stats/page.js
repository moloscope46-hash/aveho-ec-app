"use client";
// =============================================================
//  /presentation/stats (0.64.0)
//  Mode TV : activité temps réel - mini-feed live + counters animés
// =============================================================
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TVScreenNav from "../../components/TVScreenNav";
import TVMagasinFilter, { getTVMagasinId } from "../../components/TVMagasinFilter";  /* 0.65.0 */
import TVFiltersBar, { getTVFilters } from "../../components/TVFiltersBar";  /* 0.65.3 */
import { fmtDate } from "../../../lib/format";

export default function PresentationStatsPage() {
  return (
    <Suspense fallback={<div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#142131", color: "#bfe6e6", fontSize: 18 }}>Chargement…</div>}>
      <PresentationStats />
    </Suspense>
  );
}

function PresentationStats() {
  const supabase = createClient();
  const auth = useAuth();
  const params = useSearchParams();
  const refreshSec = parseInt(params.get("refresh") || "30", 10);

  const [feed, setFeed] = useState([]);
  const [counters, setCounters] = useState({ today: 0, hour: 0, online: 0 });
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [magasinId, setMagasinId] = useState(() => getTVMagasinId(params));  /* 0.65.0 */
  const timerRef = useRef(null);
  const clockRef = useRef(null);

  async function load() {
    if (!auth.structureId) return;
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const hourAgo = new Date(Date.now() - 3600000).toISOString();

    const [diRecent, sigRecent, savRecent, today, hour] = await Promise.all([
      tryFetch(supabase.from("interventions").select("id, numero, type, urgence, created_at, patients(nom, prenom)").eq("structure_id", auth.structureId).order("created_at", { ascending: false }).limit(15)),
      tryFetch(supabase.from("signalements").select("id, titre, criticite, created_at").eq("structure_id", auth.structureId).order("created_at", { ascending: false }).limit(10)),
      tryFetch(supabase.from("bilans_sav").select("id, numero, statut, created_at").eq("structure_id", auth.structureId).order("created_at", { ascending: false }).limit(10)),
      tryFetch(supabase.from("interventions").select("id").eq("structure_id", auth.structureId).gte("created_at", todayStart.toISOString())),
      tryFetch(supabase.from("interventions").select("id").eq("structure_id", auth.structureId).gte("created_at", hourAgo)),
    ]);

    // Construire feed unifié
    const items = [];
    diRecent.forEach(d => items.push({
      id: "di-" + d.id,
      type: "intervention",
      icon: "ti-clipboard-list",
      col: d.urgence === "Urgent" ? "#e35d5b" : "#EF9F27",
      title: `DI ${d.numero}`,
      sub: `${d.type}${d.patients ? " · " + d.patients.nom : ""}`,
      urgent: d.urgence === "Urgent",
      ts: new Date(d.created_at).getTime(),
    }));
    sigRecent.forEach(s => items.push({
      id: "sig-" + s.id,
      type: "signalement",
      icon: "ti-alert-circle",
      col: s.criticite === "Critique" ? "#e35d5b" : "#7a6fb0",
      title: `Signalement`,
      sub: s.titre || "—",
      urgent: s.criticite === "Critique",
      ts: new Date(s.created_at).getTime(),
    }));
    savRecent.forEach(b => items.push({
      id: "sav-" + b.id,
      type: "bilan_sav",
      icon: "ti-tools",
      col: "#5e4a8c",
      title: `Bilan SAV ${b.numero || ""}`,
      sub: b.statut || "",
      ts: new Date(b.created_at).getTime(),
    }));

    items.sort((a, b) => b.ts - a.ts);
    setFeed(items.slice(0, 20));
    setCounters({
      today: today.length,
      hour: hour.length,
      online: feed.length,
    });
    setLoading(false);
  }

  useEffect(() => {
    if (!auth.ready) return;
    load();
    timerRef.current = setInterval(load, refreshSec * 1000);
    return () => clearInterval(timerRef.current);
  }, [auth.ready, auth.structureId, refreshSec]);

  useEffect(() => {
    clockRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockRef.current);
  }, []);

  function tryFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
  }

  if (auth.ready && !auth.structureId) {
    return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#142131", color: "#fff", fontSize: 24 }}>Authentification requise</div>;
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #142131 0%, #1c5454 100%)",
      color: "#fff",
      fontFamily: "Segoe UI, Quicksand, Helvetica, Arial, sans-serif",
      padding: "24px 110px",
      overflow: "auto",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
        <div>
          <div style={{ fontSize: 14, letterSpacing: 3, color: "#7CC8C8", fontWeight: 700 }}>
            AVEHO — TV DE SERVICE
            <span style={{
              marginLeft: 12, padding: "2px 9px",
              background: "rgba(90,160,90,.25)",
              color: "#5aa05a",
              borderRadius: 10,
              fontSize: 10, fontWeight: 800, letterSpacing: 0.4,
            }}>● LIVE</span>
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: 32, fontWeight: 700, letterSpacing: 1 }}>Activité temps réel</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#7CC8C8", fontFamily: "Consolas, monospace", letterSpacing: 2 }}>
            {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <div style={{ fontSize: 14, color: "#bfe6e6", marginTop: 2 }}>
            {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
      </div>

      {/* Big counters */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginBottom: 24 }}>
        <BigCounter v={counters.today} lbl="DI aujourd'hui" icon="ti-calendar-event" col="#EF9F27" />
        <BigCounter v={counters.hour} lbl="DI cette heure" icon="ti-clock" col="#e35d5b" pulse />
        <BigCounter v={feed.length} lbl="Activité récente" icon="ti-activity" col="#5aa05a" />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 80, fontSize: 20, color: "#bfe6e6" }}>Chargement…</div>
      ) : feed.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80 }}>
          <i className="ti ti-mood-empty" style={{ fontSize: 80, color: "#7CC8C8" }} />
          <div style={{ fontSize: 26, color: "#bfe6e6", marginTop: 16 }}>Aucune activité récente</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {feed.map((it, i) => {
            const ageMs = Date.now() - it.ts;
            const ageStr = ageMs < 60000 ? "à l'instant" : ageMs < 3600000 ? `il y a ${Math.floor(ageMs/60000)} min` : ageMs < 86400000 ? `il y a ${Math.floor(ageMs/3600000)} h` : fmtDate(new Date(it.ts).toISOString());
            return (
              <div key={it.id} style={{
                background: it.urgent ? `linear-gradient(135deg, ${it.col}33, ${it.col}11)` : "rgba(255,255,255,.05)",
                border: `1.5px solid ${it.urgent ? it.col + "55" : "rgba(255,255,255,.12)"}`,
                borderLeft: `5px solid ${it.col}`,
                borderRadius: 10,
                padding: "12px 14px",
                display: "flex", alignItems: "center", gap: 12,
                animation: it.urgent ? "pulse-urgent 2.5s ease-in-out infinite" : "fade-in 600ms",
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: `linear-gradient(135deg, ${it.col}, ${it.col}cc)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, flexShrink: 0,
                }}>
                  <i className={`ti ${it.icon}`} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{it.title}{it.urgent && <span style={{ marginLeft: 8, padding: "1px 8px", background: "#e35d5b", color: "#fff", borderRadius: 8, fontSize: 10, fontWeight: 800 }}>URGENT</span>}</div>
                  <div style={{ fontSize: 12.5, color: "#bfe6e6", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.sub}</div>
                </div>
                <div style={{ fontSize: 10, color: "#9bb5b5", fontStyle: "italic", flexShrink: 0 }}>{ageStr}</div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ position: "fixed", bottom: 8, right: 12, fontSize: 11, color: "rgba(191,230,230,0.5)" }}>
        <button onClick={tryFullscreen} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>
          <i className="ti ti-maximize" /> Plein écran
        </button>
        {" · "}Refresh {refreshSec}s
      </div>

      <style>{`
        @keyframes pulse-urgent {
          0%, 100% { box-shadow: 0 0 0 0 rgba(227,93,91,.4); }
          50% { box-shadow: 0 0 0 8px rgba(227,93,91,0); }
        }
        @keyframes fade-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-counter {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.03); }
        }
      `}</style>

      <TVScreenNav currentScreen="/presentation/stats" />
    </div>
  );
}

function BigCounter({ v, lbl, icon, col, pulse = false }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${col}33, ${col}11)`,
      border: `1px solid ${col}55`,
      borderRadius: 14,
      padding: "20px 24px",
      display: "flex", alignItems: "center", gap: 18,
      boxShadow: `0 6px 24px ${col}22`,
      animation: pulse ? "pulse-counter 2s ease-in-out infinite" : "none",
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 14,
        background: `linear-gradient(135deg, ${col}, ${col}cc)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 32,
      }}>
        <i className={`ti ${icon}`} />
      </div>
      <div>
        <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1, color: "#fff", fontFamily: "Consolas, monospace" }}>{v}</div>
        <div style={{ fontSize: 13, color: "#bfe6e6", textTransform: "uppercase", letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>{lbl}</div>
      </div>
    </div>
  );
}
