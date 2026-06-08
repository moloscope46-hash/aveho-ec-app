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
import TVScreenNav from "../../components/TVScreenNav";  /* 0.64.0 */
import TVMagasinFilter, { getTVMagasinId } from "../../components/TVMagasinFilter";  /* 0.65.0 */
import TVFiltersBar, { getTVFilters } from "../../components/TVFiltersBar";  /* 0.65.3 */
import TVCastButton from "../../components/TVCastButton";  /* 0.65.10 */

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
  // 0.65.0 : filtre magasin TV
  const [magasinId, setMagasinId] = useState(() => getTVMagasinId(params));
  // 0.65.3 : Filtres avancés (étab/bât/svc/chambre/patient/garage/dépôt/search)
  const [advFilters, setAdvFilters] = useState(() => getTVFilters("interventions") || {});
  // 0.62.93 : compteurs récents activité globale
  const [stats, setStats] = useState({ di: 0, sav: 0, livraisons: 0, maintenances: 0, patients: 0, commandes: 0 });
  const timerRef = useRef(null);
  const clockRef = useRef(null);

  async function load() {
    if (!auth.structureId) return;
    let q = supabase
      .from("interventions")
      .select("id, numero, type, urgence, statut, description, created_at, equipe_id, technicien_nom, date_planifiee, batiment_id, service_id, chambre_id, patient_id, etablissement_id, materiels(libelle, num_parc), patients(nom, prenom, chambre, ville), etablissements(nom, ville), batiments(nom), services(nom, etage), equipes(nom, couleur)")
      .eq("structure_id", auth.structureId)
      .not("statut", "in", '("Clôturée","Refusée")')
      .order("urgence", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30);
    if (etabId) q = q.eq("etablissement_id", etabId);
    // 0.65.3 : filtres avancés
    if (advFilters.etabId) q = q.eq("etablissement_id", advFilters.etabId);
    if (advFilters.batId)     q = q.eq("batiment_id", advFilters.batId);
    if (advFilters.svcId)     q = q.eq("service_id", advFilters.svcId);
    if (advFilters.chambreId) q = q.eq("chambre_id", advFilters.chambreId);
    if (advFilters.patientId) q = q.eq("patient_id", advFilters.patientId);
    const { data } = await q;

    // 0.65.3 : filtre par recherche libre (côté client) - sur numéro/type/description/patient
    let filteredData = data || [];
    if (advFilters.search?.trim()) {
      const s = advFilters.search.toLowerCase().trim();
      filteredData = filteredData.filter(d =>
        (d.numero || "").toLowerCase().includes(s) ||
        (d.type || "").toLowerCase().includes(s) ||
        (d.description || "").toLowerCase().includes(s) ||
        (d.technicien_nom || "").toLowerCase().includes(s) ||
        (d.materiels?.libelle || "").toLowerCase().includes(s) ||
        (d.materiels?.code || "").toLowerCase().includes(s) ||
        (d.patients?.nom || "").toLowerCase().includes(s) ||
        (d.patients?.prenom || "").toLowerCase().includes(s) ||
        (d.patients?.ville || "").toLowerCase().includes(s) ||
        (d.patients?.chambre || "").toLowerCase().includes(s)
      );
    }

    // 0.64.0 : enrichir avec compteurs PJ + workflow pour les top urgences
    const enriched = await Promise.all(filteredData.map(async (di) => {
      try {
        const [pj, wf] = await Promise.all([
          supabase.from("pieces_jointes").select("id", { count: "exact", head: true }).eq("resource_type", "intervention").eq("resource_id", di.id),
          supabase.from("workflow_steps").select("status").eq("resource_type", "intervention").eq("resource_id", di.id),
        ]);
        return {
          ...di,
          _nbPJ: pj.count || 0,
          _wfSteps: wf.data || [],
        };
      } catch { return { ...di, _nbPJ: 0, _wfSteps: [] }; }
    }));
    setRows(enriched);
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
      tryCount("signalements", { statut: "Nouveau" }),
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
  }, [auth.ready, auth.structureId, etabId, refreshSec, magasinId, advFilters]);

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
          <div style={{ fontSize: 14, letterSpacing: 3, color: "#7CC8C8", fontWeight: 700, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            AVEHO — TV DE SERVICE
            <TVMagasinFilter onChange={setMagasinId} />
            <TVFiltersBar pageKey="interventions" onChange={setAdvFilters} />
            <TVCastButton refreshSec={refreshSec} />
          </div>
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

      {/* 0.64.0 : Navigation flèches multi-écrans */}
      <TVScreenNav currentScreen="/presentation/interventions" />
    </div>
  );
}

function Card({ r, urgent = false }) {
  // 0.64.0 : durée écoulée formatée
  const ageMs = r.created_at ? Date.now() - new Date(r.created_at).getTime() : 0;
  const ageHours = Math.floor(ageMs / 3600000);
  const ageDays = Math.floor(ageHours / 24);
  const ageStr = ageDays > 0 ? `${ageDays}j` : `${ageHours}h`;
  const isStale = ageHours > 24;
  // Workflow status
  const wfPending = (r._wfSteps || []).filter(s => s.status === "pending").length;
  const wfDone = (r._wfSteps || []).filter(s => s.status === "approved").length;
  const wfTotal = (r._wfSteps || []).length;

  return (
    <div style={{
      background: urgent ? "rgba(255,139,128,0.12)" : "rgba(255,255,255,0.07)",
      border: urgent ? "2px solid #ff8b80" : "1px solid rgba(255,255,255,0.18)",
      borderRadius: 12, padding: "14px 16px",
      animation: urgent ? "pulse-urgent 2.5s ease-in-out infinite" : "none",
      position: "relative",
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
      {/* 0.65.12 : Établissement + bâtiment + service */}
      {(r.etablissements || r.batiments || r.services) && (
        <div style={{ fontSize: 11.5, color: "#bfe6e6", marginBottom: 4, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {r.etablissements && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <i className="ti ti-building-hospital" style={{ color: "#185FA5" }} />
              <span style={{ color: "#fff", fontWeight: 700 }}>{r.etablissements.nom}</span>
              {r.etablissements.ville && <span style={{ opacity: 0.7 }}>· {r.etablissements.ville}</span>}
            </span>
          )}
          {r.batiments && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <i className="ti ti-building" style={{ color: "#7CC8C8" }} />
              {r.batiments.nom}
            </span>
          )}
          {r.services && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <i className="ti ti-stethoscope" style={{ color: "#7a6fb0" }} />
              {r.services.nom}{r.services.etage != null && ` · Ét.${r.services.etage}`}
            </span>
          )}
        </div>
      )}
      {r.materiels && (
        <div style={{ fontSize: 14, color: "#bfe6e6", marginBottom: 4 }}>
          <i className="ti ti-armchair-2" style={{ marginRight: 6 }} />
          {r.materiels.libelle}
          {r.materiels.num_parc && <span style={{ color: "#7CC8C8", fontSize: 11, marginLeft: 6, fontFamily: "Consolas, monospace" }}>{r.materiels.num_parc}</span>}
        </div>
      )}
      {/* 0.65.12 : Équipe assignée */}
      {r.equipes && (
        <div style={{ fontSize: 11.5, marginTop: 4 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "2px 8px",
            background: (r.equipes.couleur || "#5aa05a") + "30",
            color: r.equipes.couleur || "#5aa05a",
            border: `1px solid ${(r.equipes.couleur || "#5aa05a")}50`,
            borderRadius: 6,
            fontWeight: 700,
          }}>
            <i className="ti ti-users-group" /> {r.equipes.nom}
          </span>
        </div>
      )}

      {/* 0.64.0 : Description courte si présente */}
      {r.description && (
        <div style={{ fontSize: 12, color: "#9bb5b5", marginTop: 6, fontStyle: "italic", lineHeight: 1.4, maxHeight: 36, overflow: "hidden" }}>
          « {r.description.slice(0, 100)}{r.description.length > 100 ? "…" : ""} »
        </div>
      )}

      {/* 0.64.0 : Technicien assigné si planifié */}
      {r.technicien_nom && (
        <div style={{ fontSize: 12, color: "#7CC8C8", marginTop: 6 }}>
          <i className="ti ti-user-check" /> {r.technicien_nom}
          {r.date_planifiee && <span style={{ marginLeft: 6, color: "#9bb5b5" }}>· {new Date(r.date_planifiee).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>}
        </div>
      )}

      {/* 0.64.0 : Footer enrichi - type + âge + badges */}
      <div style={{ fontSize: 13, color: "#9bb5b5", marginTop: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span><i className="ti ti-tag" /> {r.type}</span>
        <span style={{ color: isStale ? "#ff8b80" : "#9bb5b5" }}>
          <i className="ti ti-clock" /> {ageStr}
          {isStale && <i className="ti ti-alert-circle" style={{ marginLeft: 3, color: "#ff8b80" }} />}
        </span>
        {r._nbPJ > 0 && (
          <span style={{
            background: "rgba(124,200,200,.2)",
            color: "#7CC8C8",
            padding: "1px 7px",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 700,
          }}>
            <i className="ti ti-paperclip" /> {r._nbPJ}
          </span>
        )}
        {wfTotal > 0 && (
          <span style={{
            background: wfPending > 0 ? "rgba(239,159,39,.22)" : "rgba(90,160,90,.22)",
            color: wfPending > 0 ? "#EF9F27" : "#5aa05a",
            padding: "1px 7px",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 700,
          }}>
            <i className={`ti ${wfPending > 0 ? "ti-hourglass" : "ti-checks"}`} /> {wfDone}/{wfTotal}
          </span>
        )}
      </div>
    </div>
  );
}
