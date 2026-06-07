"use client";
// =============================================================
//  /presentation/interventions — Mode TV de service
//  Alpha 0.42.0
//
//  Vue plein écran, gros caractères, auto-refresh 60s.
//  Pas de TopBar ni de navigation, pour affichage sur un écran
//  fixe dans un couloir ou une salle de garde.
//
//  Paramètres URL :
//   - ?etab=<uuid>  → filtre établissement (optionnel)
//   - ?refresh=30   → intervalle de refresh en secondes (défaut 60)
// =============================================================
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { fmtDate } from "../../../lib/format";

const COULEUR_STATUT = {
  "Nouvelle": "#185FA5",
  "En cours": "#EF9F27",
  "Validée": "#5aa05a",
  "Refusée": "#c0392b",
  "Clôturée": "#5a6171",
};

export default function PresentationInterventionsPage() {
  return (
    <Suspense fallback={
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#142131", color: "#bfe6e6", fontSize: 18 }}>
        Chargement…
      </div>
    }>
      <PresentationInterventions />
    </Suspense>
  );
}

function PresentationInterventions() {
  const supabase = createClient();
  const auth = useAuth();
  const params = useSearchParams();
  const etabId = params.get("etab");
  const refreshSec = parseInt(params.get("refresh") || "60", 10);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [now, setNow] = useState(new Date());
  // 0.62.93 : compteurs récents activité globale
  const [stats, setStats] = useState({ di: 0, sav: 0, livraisons: 0, maintenances: 0, patients: 0, commandes: 0 });
  const timerRef = useRef(null);
  const clockRef = useRef(null);

  async function load() {
    if (!auth.structureId) return;
    let q = supabase
      .from("interventions")
      .select("id, numero, type, urgence, statut, created_at, materiels(libelle), patients(nom, prenom, chambre)")
      .eq("structure_id", auth.structureId)
      .not("statut", "in", '("Clôturée","Refusée")')
      .order("urgence", { ascending: false }) // Urgent en premier
      .order("created_at", { ascending: false })
      .limit(30);
    if (etabId) q = q.eq("etablissement_id", etabId);
    const { data } = await q;
    setRows(data || []);
    setLastUpdate(new Date());
    setLoading(false);

    // 0.62.93 : compteurs activité globale (en parallèle, défensifs)
    const tryCount = async (table, filters = {}) => {
      try {
        let qq = supabase.from(table).select("id", { count: "exact", head: true }).eq("structure_id", auth.structureId);
        Object.entries(filters).forEach(([k, v]) => { qq = qq.eq(k, v); });
        const { count } = await qq;
        return count || 0;
      } catch { return 0; }
    };
    const [di, sav, livraisons, maintenances, patients, commandes] = await Promise.all([
      tryCount("demandes_internes", { statut: "nouvelle" }),
      tryCount("signalements", { traite: false }),
      tryCount("tournees", { statut: "en_cours" }),
      tryCount("maintenances", { statut: "planifiee" }),
      tryCount("patients"),
      tryCount("commandes", { statut: "en_attente_validation" }),
    ]);
    setStats({ di, sav, livraisons, maintenances, patients, commandes });
  }

  // Polling auto-refresh
  useEffect(() => {
    if (!auth.ready) return;
    load();
    timerRef.current = setInterval(load, refreshSec * 1000);
    return () => clearInterval(timerRef.current);
  }, [auth.ready, auth.structureId, etabId, refreshSec]);

  // Horloge live (1s)
  useEffect(() => {
    clockRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockRef.current);
  }, []);

  // Auto-fullscreen au click
  function tryFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }

  // Permissions : tout user authentifié de la structure peut voir
  if (auth.ready && !auth.structureId) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#142131", color: "#fff", fontSize: 24 }}>
        Authentification requise
      </div>
    );
  }

  const urgents = rows.filter(r => r.urgence === "Urgent");
  const autres = rows.filter(r => r.urgence !== "Urgent");

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #142131 0%, #1c5454 100%)",
      color: "#fff",
      fontFamily: "Segoe UI, Quicksand, Helvetica, Arial, sans-serif",
      padding: "24px 32px",
      overflow: "auto",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24,
        paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.15)",
      }}>
        <div>
          <div style={{ fontSize: 14, letterSpacing: 3, color: "#7CC8C8", fontWeight: 700 }}>AVEHO — TV DE SERVICE</div>
          <h1 style={{ margin: "4px 0 0", fontSize: 32, fontWeight: 700, letterSpacing: 1 }}>
            Demandes d'intervention en cours
          </h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#7CC8C8", fontFamily: "Consolas, monospace", letterSpacing: 2 }}>
            {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div style={{ fontSize: 14, color: "#bfe6e6", marginTop: 2 }}>
            {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          {lastUpdate && (
            <div style={{ fontSize: 11, color: "#7CC8C8", marginTop: 4 }}>
              <i className="ti ti-refresh" style={{ animation: "spin 8s linear infinite" }} /> {fmtDate(lastUpdate)} {lastUpdate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>
      </div>

      {/* 0.62.93 : Bandeau stats globales (gros chiffres) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: 12,
        marginBottom: 24,
      }}>
        {[
          { k: "di",           lbl: "DI nouvelles",        v: stats.di,           col: "#EF9F27", ic: "ti-clipboard-list" },
          { k: "sav",          lbl: "SAV à traiter",       v: stats.sav,          col: "#e35d5b", ic: "ti-alert-triangle" },
          { k: "livraisons",   lbl: "Tournées en cours",   v: stats.livraisons,   col: "#C9867F", ic: "ti-truck-delivery" },
          { k: "maintenances", lbl: "Maintenances",        v: stats.maintenances, col: "#7a6fb0", ic: "ti-tools" },
          { k: "patients",     lbl: "Patients",            v: stats.patients,     col: "#7CC8C8", ic: "ti-users" },
          { k: "commandes",    lbl: "CMD à valider",       v: stats.commandes,    col: "#5aa05a", ic: "ti-shopping-bag" },
        ].map(s => (
          <div key={s.k} style={{
            background: `linear-gradient(135deg, ${s.col}33, ${s.col}11)`,
            border: `1px solid ${s.col}55`,
            borderRadius: 14,
            padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 12,
            boxShadow: `0 4px 16px ${s.col}22`,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: `linear-gradient(135deg, ${s.col}, ${s.col}cc)`,
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24,
            }}>
              <i className={`ti ${s.ic}`} />
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#fff", lineHeight: 1, fontFamily: "Consolas, monospace" }}>
                {s.v}
              </div>
              <div style={{ fontSize: 11, color: "#bfe6e6", textTransform: "uppercase", letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>
                {s.lbl}
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 80, fontSize: 20, color: "#bfe6e6" }}>Chargement…</div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80 }}>
          <i className="ti ti-check" style={{ fontSize: 80, color: "#5aa05a" }} />
          <div style={{ fontSize: 32, color: "#cfeacb", marginTop: 16, fontWeight: 600 }}>Aucune DI en cours</div>
          <div style={{ fontSize: 16, color: "#9bbf9b", marginTop: 8 }}>Tout est traité 👍</div>
        </div>
      ) : (
        <>
          {/* Urgents en premier */}
          {urgents.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, color: "#ff8b80", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>
                <i className="ti ti-alert-triangle" /> URGENT — {urgents.length}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
                {urgents.map((r) => <Card key={r.id} r={r} urgent />)}
              </div>
            </div>
          )}

          {/* Autres */}
          {autres.length > 0 && (
            <div>
              <h2 style={{ fontSize: 18, color: "#bfe6e6", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>
                <i className="ti ti-list" /> En cours — {autres.length}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
                {autres.map((r) => <Card key={r.id} r={r} />)}
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer discret avec hint fullscreen */}
      <div style={{
        position: "fixed", bottom: 8, right: 12,
        fontSize: 11, color: "rgba(191,230,230,0.5)",
      }}>
        <button onClick={tryFullscreen} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>
          <i className="ti ti-maximize" /> Plein écran
        </button>
        {" · "}
        Refresh {refreshSec}s
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-urgent {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,139,128,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(255,139,128,0); }
        }
      `}</style>
    </div>
  );
}

function Card({ r, urgent = false }) {
  return (
    <div style={{
      background: urgent ? "rgba(255,139,128,0.12)" : "rgba(255,255,255,0.07)",
      border: urgent ? "2px solid #ff8b80" : "1px solid rgba(255,255,255,0.18)",
      borderRadius: 12, padding: "14px 16px",
      animation: urgent ? "pulse-urgent 2.5s ease-in-out infinite" : "none",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: 0.5 }}>{r.numero}</div>
        <span style={{
          background: (COULEUR_STATUT[r.statut] || "#8a98a8") + "33",
          color: COULEUR_STATUT[r.statut] || "#bfe6e6",
          border: `1.5px solid ${COULEUR_STATUT[r.statut] || "#bfe6e6"}`,
          padding: "3px 10px", borderRadius: 14,
          fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
        }}>{r.statut}</span>
      </div>
      {r.patients && (
        <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
          <i className="ti ti-user" style={{ color: "#7CC8C8", marginRight: 6 }} />
          {r.patients.nom} {r.patients.prenom || ""}
          {r.patients.chambre && <span style={{ color: "#bfe6e6", fontSize: 14, marginLeft: 6 }}>Ch. {r.patients.chambre}</span>}
        </div>
      )}
      {r.materiels && (
        <div style={{ fontSize: 14, color: "#bfe6e6", marginBottom: 4 }}>
          <i className="ti ti-armchair-2" style={{ marginRight: 6 }} />
          {r.materiels.libelle}
        </div>
      )}
      <div style={{ fontSize: 13, color: "#9bb5b5", marginTop: 6 }}>
        <i className="ti ti-tag" /> {r.type}
        <span style={{ marginLeft: 12 }}>
          <i className="ti ti-clock" /> {fmtDate(r.created_at)}
        </span>
      </div>
    </div>
  );
}
