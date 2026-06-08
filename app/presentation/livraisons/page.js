"use client";
// =============================================================
//  /presentation/livraisons (0.65.0)
//  Mode TV : livraisons prévues du jour + livraisons en cours
//  Inclut : tournees du jour + leurs etapes (livraison/transfert/sav)
//          + bons_livraison à venir
//          + filtre par magasin
// =============================================================
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TVScreenNav from "../../components/TVScreenNav";
import TVMagasinFilter, { getTVMagasinId } from "../../components/TVMagasinFilter";

const STATUT_TOURNEE = {
  planifiee: { col: "#EF9F27", lbl: "PLANIFIÉE", ic: "ti-calendar" },
  en_cours:  { col: "#185FA5", lbl: "EN COURS",  ic: "ti-truck" },
  terminee:  { col: "#5aa05a", lbl: "TERMINÉE",  ic: "ti-check" },
  a_faire:   { col: "#7a6fb0", lbl: "À FAIRE",   ic: "ti-hourglass" },
  annulee:   { col: "#8a98a8", lbl: "ANNULÉE",   ic: "ti-ban" },
};

const STATUT_ETAPE = {
  a_faire:  { col: "#8a98a8", ic: "ti-circle" },
  en_cours: { col: "#EF9F27", ic: "ti-truck-loading" },
  terminee: { col: "#5aa05a", ic: "ti-circle-check" },
  echec:    { col: "#e35d5b", ic: "ti-circle-x" },
};

export default function PresentationLivraisonsPage() {
  return (
    <Suspense fallback={<div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#142131", color: "#bfe6e6", fontSize: 18 }}>Chargement…</div>}>
      <PresentationLivraisons />
    </Suspense>
  );
}

function PresentationLivraisons() {
  const supabase = createClient();
  const auth = useAuth();
  const params = useSearchParams();
  const refreshSec = parseInt(params.get("refresh") || "60", 10);

  const [tournees, setTournees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [magasinId, setMagasinId] = useState(() => getTVMagasinId(params));
  const timerRef = useRef(null);
  const clockRef = useRef(null);

  async function load() {
    if (!auth.structureId) return;
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    const today = new Date().toISOString().slice(0, 10);

    let q = supabase.from("tournees")
      .select("id, numero, nom, statut, date_tournee, heure_depart, heure_retour_prevue, nb_etapes, nb_completees, chauffeur_user_id, vehicule_id, magasin_id")
      .eq("structure_id", auth.structureId)
      .eq("date_tournee", today)
      .order("heure_depart", { nullsFirst: false })
      .limit(20);
    if (magasinId) q = q.eq("magasin_id", magasinId);

    const trList = await tryFetch(q);
    // Enrichir avec étapes + chauffeur
    const enrichies = await Promise.all(trList.map(async (t) => {
      const [etapes, chauffeur, vehicule] = await Promise.all([
        tryFetch(supabase.from("tournees_etapes")
          .select("id, ordre, type_etape, label, ville, statut, duree_estimee_min")
          .eq("tournee_id", t.id).order("ordre")),
        t.chauffeur_user_id ? tryFetch(supabase.from("membres_structure")
          .select("prenom, nom").eq("user_id", t.chauffeur_user_id).limit(1)) : Promise.resolve([]),
        t.vehicule_id ? tryFetch(supabase.from("vehicules")
          .select("immatriculation, modele, marque").eq("id", t.vehicule_id).limit(1)) : Promise.resolve([]),
      ]);
      return { ...t, _etapes: etapes, _chauffeur: chauffeur[0], _vehicule: vehicule[0] };
    }));
    setTournees(enrichies);
    setLoading(false);
  }

  useEffect(() => { if (!auth.ready) return; load(); timerRef.current = setInterval(load, refreshSec * 1000); return () => clearInterval(timerRef.current); }, [auth.ready, auth.structureId, refreshSec, magasinId]);
  useEffect(() => { clockRef.current = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(clockRef.current); }, []);

  function tryFullscreen() { const el = document.documentElement; if (el.requestFullscreen) el.requestFullscreen(); }

  if (auth.ready && !auth.structureId) {
    return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#142131", color: "#fff", fontSize: 24 }}>Authentification requise</div>;
  }

  // Compteurs
  const enCours = tournees.filter(t => t.statut === "en_cours").length;
  const planifiees = tournees.filter(t => t.statut === "planifiee" || t.statut === "a_faire").length;
  const terminees = tournees.filter(t => t.statut === "terminee").length;
  const totalEtapes = tournees.reduce((s, t) => s + (t.nb_etapes || 0), 0);
  const completees = tournees.reduce((s, t) => s + (t.nb_completees || 0), 0);
  const tauxComplet = totalEtapes > 0 ? Math.round((completees / totalEtapes) * 100) : 0;

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
          <div style={{ fontSize: 14, letterSpacing: 3, color: "#7CC8C8", fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
            AVEHO — TV DE SERVICE
            <TVMagasinFilter onChange={setMagasinId} />
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: 32, fontWeight: 700, letterSpacing: 1 }}>Livraisons prévues du jour</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#7CC8C8", fontFamily: "Consolas, monospace", letterSpacing: 2 }}>{now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
          <div style={{ fontSize: 14, color: "#bfe6e6", marginTop: 2 }}>{now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>
      </div>

      {/* Bandeau KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { lbl: "Tournées planifiées", v: planifiees, col: "#EF9F27", ic: "ti-calendar" },
          { lbl: "En cours",            v: enCours,    col: "#185FA5", ic: "ti-truck", pulse: enCours > 0 },
          { lbl: "Terminées",           v: terminees,  col: "#5aa05a", ic: "ti-check" },
          { lbl: "Étapes / Total",      v: `${completees}/${totalEtapes}`, col: "#C9867F", ic: "ti-package" },
          { lbl: "Avancement",          v: `${tauxComplet}%`, col: "#7CC8C8", ic: "ti-progress" },
        ].map(s => (
          <div key={s.lbl} style={{
            background: `linear-gradient(135deg, ${s.col}33, ${s.col}11)`,
            border: `1px solid ${s.col}55`,
            borderRadius: 14,
            padding: "16px 18px",
            display: "flex", alignItems: "center", gap: 14,
            boxShadow: `0 4px 16px ${s.col}22`,
            animation: s.pulse ? "tv-counter-pulse 1.8s ease-in-out infinite" : "none",
          }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: `linear-gradient(135deg, ${s.col}, ${s.col}cc)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
              <i className={`ti ${s.ic}`} />
            </div>
            <div>
              <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, fontFamily: "Consolas, monospace" }}>{s.v}</div>
              <div style={{ fontSize: 10.5, color: "#bfe6e6", textTransform: "uppercase", letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>{s.lbl}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 80, fontSize: 20, color: "#bfe6e6" }}>Chargement…</div>
      ) : tournees.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80 }}>
          <i className="ti ti-truck-off" style={{ fontSize: 80, color: "#7CC8C8" }} />
          <div style={{ fontSize: 28, color: "#bfe6e6", marginTop: 16, fontWeight: 600 }}>Aucune tournée prévue aujourd'hui</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 14 }}>
          {tournees.map(t => <TourneeCard key={t.id} t={t} />)}
        </div>
      )}

      <div style={{ position: "fixed", bottom: 8, right: 12, fontSize: 11, color: "rgba(191,230,230,0.5)" }}>
        <button onClick={tryFullscreen} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>
          <i className="ti ti-maximize" /> Plein écran
        </button>
        {" · "}Refresh {refreshSec}s
      </div>

      <style>{`
        @keyframes tv-counter-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 16px rgba(24,95,165,.22); }
          50%      { transform: scale(1.02); box-shadow: 0 4px 24px rgba(24,95,165,.4); }
        }
      `}</style>

      <TVScreenNav currentScreen="/presentation/livraisons" />
    </div>
  );
}

function TourneeCard({ t }) {
  const meta = STATUT_TOURNEE[t.statut] || STATUT_TOURNEE.planifiee;
  const isLive = t.statut === "en_cours";
  const pct = (t.nb_etapes || 0) > 0 ? Math.round(((t.nb_completees || 0) / t.nb_etapes) * 100) : 0;
  const etapes = t._etapes || [];

  return (
    <div style={{
      background: isLive ? `linear-gradient(135deg, ${meta.col}22, ${meta.col}08)` : "rgba(255,255,255,.05)",
      border: `1.5px solid ${isLive ? meta.col + "66" : "rgba(255,255,255,.12)"}`,
      borderLeft: `5px solid ${meta.col}`,
      borderRadius: 12,
      padding: "14px 16px",
      animation: isLive ? "pulse-live 2.5s ease-in-out infinite" : "none",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{t.nom || t.numero}</div>
          <div style={{ fontSize: 11, color: "#bfe6e6", marginTop: 2 }}>
            {t._chauffeur && <><i className="ti ti-user" /> {t._chauffeur.prenom} {t._chauffeur.nom}</>}
            {t._vehicule && <span style={{ marginLeft: 10 }}><i className="ti ti-truck" /> {t._vehicule.marque} {t._vehicule.modele} <span style={{ fontFamily: "Consolas, monospace", color: "#7CC8C8" }}>{t._vehicule.immatriculation}</span></span>}
          </div>
        </div>
        <span style={{
          padding: "3px 9px",
          background: meta.col + "22",
          color: meta.col,
          border: `1.5px solid ${meta.col}`,
          borderRadius: 12,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 0.5,
          display: "inline-flex", alignItems: "center", gap: 3,
        }}>
          <i className={`ti ${meta.ic}`} />
          {meta.lbl}
        </span>
      </div>

      {/* Horaire + nb étapes */}
      <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap", fontSize: 12, color: "#bfe6e6" }}>
        {t.heure_depart && <span><i className="ti ti-clock" /> {t.heure_depart.slice(0, 5)}{t.heure_retour_prevue ? ` → ${t.heure_retour_prevue.slice(0, 5)}` : ""}</span>}
        <span><i className="ti ti-route-2" /> {t.nb_completees || 0}/{t.nb_etapes || 0} étapes</span>
      </div>

      {/* Barre progression */}
      <div style={{ height: 6, background: "rgba(255,255,255,.1)", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${meta.col}, ${meta.col}aa)`,
          borderRadius: 3,
          transition: "width 600ms",
          boxShadow: isLive ? `0 0 8px ${meta.col}88` : "none",
        }} />
      </div>

      {/* Liste compacte des étapes */}
      {etapes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto" }}>
          {etapes.slice(0, 8).map(e => {
            const em = STATUT_ETAPE[e.statut] || STATUT_ETAPE.a_faire;
            return (
              <div key={e.id} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "5px 9px",
                background: "rgba(255,255,255,.04)",
                borderLeft: `3px solid ${em.col}`,
                borderRadius: 5,
                fontSize: 12,
              }}>
                <i className={`ti ${em.ic}`} style={{ color: em.col, fontSize: 13 }} />
                <span style={{ minWidth: 22, color: em.col, fontWeight: 800, fontFamily: "Consolas, monospace" }}>#{e.ordre}</span>
                <span style={{ flex: 1, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.label || "—"}</span>
                {e.ville && <span style={{ color: "#9bb5b5", fontSize: 10 }}>{e.ville}</span>}
                <span style={{
                  fontSize: 9,
                  padding: "1px 5px",
                  background: em.col + "22",
                  color: em.col,
                  borderRadius: 6,
                  textTransform: "uppercase",
                  fontWeight: 700,
                  letterSpacing: 0.3,
                }}>{e.type_etape || "?"}</span>
              </div>
            );
          })}
          {etapes.length > 8 && (
            <div style={{ fontSize: 11, color: "#9bb5b5", textAlign: "center", fontStyle: "italic", padding: 4 }}>
              + {etapes.length - 8} autres étapes
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse-live {
          0%, 100% { box-shadow: 0 0 0 0 rgba(24,95,165,.4); }
          50%      { box-shadow: 0 0 0 6px rgba(24,95,165,0); }
        }
      `}</style>
    </div>
  );
}
