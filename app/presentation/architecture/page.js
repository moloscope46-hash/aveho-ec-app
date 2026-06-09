"use client";
// =============================================================
//  /presentation/architecture (0.65.5)
//
//  Vue TV éclatée par bâtiment :
//   - Filtre par établissement (ou tous)
//   - Écran divisé en N colonnes (1 par bâtiment)
//   - Pour chaque bâtiment : étages → services → chambres
//   - Compteurs : DI, stocks, matériels, maintenances
//   - Collaborateurs rattachés, équipes
//   - Dépôts rattachés
// =============================================================
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TVScreenNav from "../../components/TVScreenNav";
import TVMagasinFilter, { getTVMagasinId } from "../../components/TVMagasinFilter";
import TVFiltersBar, { getTVFilters } from "../../components/TVFiltersBar";

export default function PresentationArchitecturePage() {
  return (
    <Suspense fallback={<Loading />}><PresentationArchitecture /></Suspense>
  );
}

function Loading() {
  return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#142131", color: "#bfe6e6", fontSize: 18 }}>Chargement…</div>;
}

function PresentationArchitecture() {
  const supabase = createClient();
  const auth = useAuth();
  const params = useSearchParams();
  const refreshSec = parseInt(params.get("refresh") || "60", 10);

  const [batiments, setBatiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [magasinId, setMagasinId] = useState(() => getTVMagasinId(params));
  const [advFilters, setAdvFilters] = useState(() => getTVFilters("architecture") || {});
  const timerRef = useRef(null);
  const clockRef = useRef(null);

  async function load() {
    if (!auth.structureId) return;
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };

    // 1. Bâtiments filtrés par étab
    let qBat = supabase.from("batiments")
      .select("id, nom, etablissement_id, etablissements(nom, ville)")
      .order("nom");
    if (advFilters.etabId) qBat = qBat.eq("etablissement_id", advFilters.etabId);
    let bats = await tryFetch(qBat);
    if (!advFilters.etabId) {
      // Filtrer par les étabs accessibles à l'user (cf droits)
      const accessibleEtabIds = (auth.etablissements || []).map(e => e.id);
      if (accessibleEtabIds.length > 0) {
        bats = bats.filter(b => accessibleEtabIds.includes(b.etablissement_id));
      }
    }
    // Limite affichage 4 bâtiments max (sinon écran illisible)
    bats = bats.slice(0, 4);

    // 2. Pour chaque bâtiment, charger : services + matériels + DI + dépôts + équipes
    const enriched = await Promise.all(bats.map(async (b) => {
      const [services, materiels, dis, depots, maintenances, collabs] = await Promise.all([
        tryFetch(supabase.from("services")
          .select("id, nom, batiment_id, etage")
          .eq("batiment_id", b.id)
          .order("etage", { ascending: false }).order("nom")),
        tryFetch(supabase.from("materiels")
          .select("id, libelle, code, statut, batiment_id, service_id, chambre_id")
          .eq("structure_id", auth.structureId)
          .eq("batiment_id", b.id)
          .limit(200)),
        tryFetch(supabase.from("interventions")
          .select("id, statut, urgence, batiment_id, service_id")
          .eq("structure_id", auth.structureId)
          .eq("batiment_id", b.id)
          .not("statut", "in", '("Clôturée","Refusée")')),
        tryFetch(supabase.from("depots")
          .select("id, nom, etablissement_id, batiment_id")
          .eq("structure_id", auth.structureId)
          .eq("batiment_id", b.id)),
        tryFetch(supabase.from("maintenances")
          .select("id, libelle, statut, date_prevue, type, batiment_id")
          .eq("structure_id", auth.structureId)
          .eq("batiment_id", b.id)
          .gte("date_prevue", new Date().toISOString().slice(0, 10))
          .order("date_prevue")
          .limit(20)),
        tryFetch(supabase.from("membres_etablissements")
          .select("user_id, role, membres_structure(prenom, nom)")
          .eq("etablissement_id", b.etablissement_id)
          .limit(20)),
      ]);

      // Regrouper services par étage
      const servicesByEtage = {};
      services.forEach(s => {
        const etage = s.etage ?? 0;
        if (!servicesByEtage[etage]) servicesByEtage[etage] = [];
        servicesByEtage[etage].push(s);
      });
      // Pour chaque service : compter matériels + DI
      Object.values(servicesByEtage).flat().forEach(s => {
        s._nbMat = materiels.filter(m => m.service_id === s.id).length;
        s._nbDi = dis.filter(d => d.service_id === s.id).length;
      });

      return {
        ...b,
        _services: services,
        _servicesByEtage: servicesByEtage,
        _materiels: materiels,
        _dis: dis,
        _depots: depots,
        _maintenances: maintenances,
        _collabs: collabs.map(c => ({
          nom: c.membres_structure?.nom || "?",
          prenom: c.membres_structure?.prenom || "",
          role: c.role,
        })),
        _diUrgentes: dis.filter(d => d.urgence === "Urgent").length,
      };
    }));

    setBatiments(enriched);
    setLoading(false);
  }

  useEffect(() => { if (!auth.ready) return; load(); timerRef.current = setInterval(load, refreshSec * 1000); return () => clearInterval(timerRef.current); }, [auth.ready, auth.structureId, refreshSec, magasinId, advFilters]);
  useEffect(() => { clockRef.current = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(clockRef.current); }, []);

  function tryFullscreen() { const el = document.documentElement; if (el.requestFullscreen) el.requestFullscreen(); }

  if (auth.ready && !auth.structureId) {
    return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#142131", color: "#fff", fontSize: 24 }}>Authentification requise</div>;
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #142131 0%, #1c5454 100%)",
      color: "#fff",
      fontFamily: "Segoe UI, Quicksand, Helvetica, Arial, sans-serif",
      padding: "20px 110px",
      overflow: "auto",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
        <div>
          <div style={{ fontSize: 13, letterSpacing: 3, color: "#7CC8C8", fontWeight: 700, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            AVEHO — TV DE SERVICE
            <TVMagasinFilter onChange={setMagasinId} />
            <TVFiltersBar pageKey="architecture" onChange={setAdvFilters} />
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>
            Architecture {batiments.length > 0 ? `· ${batiments.length} bâtiment${batiments.length > 1 ? "s" : ""}` : ""}
          </h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 44, fontWeight: 700, color: "#7CC8C8", fontFamily: "Consolas, monospace", letterSpacing: 2 }}>{now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
          <div style={{ fontSize: 12, color: "#bfe6e6", marginTop: 2 }}>{now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 80, fontSize: 20, color: "#bfe6e6" }}>Chargement…</div>
      ) : batiments.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80 }}>
          <i className="ti ti-building-off" style={{ fontSize: 70, color: "#7CC8C8" }} />
          <div style={{ fontSize: 24, color: "#bfe6e6", marginTop: 16, fontWeight: 600 }}>
            Aucun bâtiment trouvé{advFilters.etabId ? " pour ce filtre" : ""}
          </div>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(batiments.length, 4)}, 1fr)`,
          gap: 14,
        }}>
          {batiments.map(b => <BatimentColumn key={b.id} b={b} />)}
        </div>
      )}

      <div style={{ position: "fixed", bottom: 8, right: 12, fontSize: 11, color: "rgba(191,230,230,0.5)" }}>
        <button onClick={tryFullscreen} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>
          <i className="ti ti-maximize" /> Plein écran
        </button>
        {" · "}Refresh {refreshSec}s
      </div>

      <TVScreenNav currentScreen="/presentation/architecture" />
    </div>
  );
}

function BatimentColumn({ b }) {
  const etages = Object.keys(b._servicesByEtage || {}).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
  const nbMat = b._materiels.length;
  const nbDi = b._dis.length;
  const nbDiUrg = b._diUrgentes;
  const nbMaint = b._maintenances.length;
  const nbDep = b._depots.length;

  return (
    <div style={{
      background: "rgba(255,255,255,.05)",
      border: "1px solid rgba(124,200,200,.25)",
      borderRadius: 14,
      padding: 12,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      {/* Header bâtiment */}
      <div style={{
        background: "linear-gradient(135deg, rgba(24,95,165,.4), rgba(124,200,200,.2))",
        padding: "10px 12px",
        borderRadius: 10,
        borderLeft: "5px solid #7CC8C8",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i className="ti ti-building" style={{ fontSize: 22, color: "#7CC8C8" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", overflow: "hidden", textOverflow: "ellipsis" }}>{b.nom}</div>
            {b.etablissements && (
              <div style={{ fontSize: 11, color: "#bfe6e6", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <i className="ti ti-building-hospital" /> {b.etablissements.nom}
                {b.etablissements.ville && <span style={{ color: "#9bb5b5" }}> · {b.etablissements.ville}</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mini-stats du bâtiment */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 }}>
        {[
          { ic: "ti-clipboard-list", v: nbDi, col: "#EF9F27", lbl: "DI", pulse: nbDiUrg > 0 },
          { ic: "ti-alert-triangle", v: nbDiUrg, col: "#e35d5b", lbl: "Urgentes", hide: nbDiUrg === 0 },
          { ic: "ti-package", v: nbMat, col: "#185FA5", lbl: "Matériels" },
          { ic: "ti-tool", v: nbMaint, col: "#7a6fb0", lbl: "Maint." },
          { ic: "ti-building-warehouse", v: nbDep, col: "#5e4a8c", lbl: "Dépôts" },
        ].filter(s => !s.hide).map(s => (
          <div key={s.lbl} style={{
            background: `${s.col}15`,
            border: `1px solid ${s.col}33`,
            borderRadius: 8,
            padding: "6px 4px",
            textAlign: "center",
            animation: s.pulse ? "pulse-stat 2s ease-in-out infinite" : "none",
          }}>
            <i className={`ti ${s.ic}`} style={{ color: s.col, fontSize: 13 }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", lineHeight: 1, fontFamily: "Consolas, monospace", marginTop: 2 }}>{s.v}</div>
            <div style={{ fontSize: 8, color: "#bfe6e6", textTransform: "uppercase", letterSpacing: 0.3, marginTop: 2 }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Étages → services */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: "calc(100vh - 410px)", overflowY: "auto" }}>
        {etages.length === 0 ? (
          <div style={{ fontSize: 11, color: "#9bb5b5", textAlign: "center", padding: 14, fontStyle: "italic" }}>
            Aucun service
          </div>
        ) : etages.map(et => (
          <div key={et}>
            <div style={{
              fontSize: 9.5, color: "#7CC8C8", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: 1,
              padding: "3px 8px",
              background: "rgba(124,200,200,.08)",
              borderRadius: 6,
              marginBottom: 4,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <i className="ti ti-stairs" style={{ fontSize: 11 }} />
              Étage {et}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {b._servicesByEtage[et].map(s => (
                <div key={s.id} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "4px 8px",
                  background: "rgba(255,255,255,.04)",
                  borderRadius: 6,
                  fontSize: 11.5,
                  borderLeft: s._nbDi > 0 ? "2px solid #EF9F27" : "2px solid transparent",
                }}>
                  <i className="ti ti-stethoscope" style={{ color: "#7a6fb0", fontSize: 12, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.nom}</span>
                  {s._nbDi > 0 && (
                    <span style={{ fontSize: 9, padding: "1px 5px", background: "#EF9F27", color: "#fff", borderRadius: 6, fontWeight: 800 }}>
                      {s._nbDi} DI
                    </span>
                  )}
                  {s._nbMat > 0 && (
                    <span style={{ fontSize: 9, color: "#7CC8C8", fontWeight: 700 }}>
                      <i className="ti ti-package" /> {s._nbMat}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Dépôts */}
      {b._depots.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: "#5e4a8c", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
            <i className="ti ti-building-warehouse" /> Dépôts ({b._depots.length})
          </div>
          {b._depots.slice(0, 3).map(d => (
            <div key={d.id} style={{ fontSize: 11, color: "#bfe6e6", padding: "3px 6px", marginBottom: 2 }}>
              · {d.nom}
            </div>
          ))}
        </div>
      )}

      {/* Maintenances à venir */}
      {b._maintenances.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: "#7a6fb0", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
            <i className="ti ti-tool" /> Maintenances ({b._maintenances.length})
          </div>
          {b._maintenances.slice(0, 3).map(m => (
            <div key={m.id} style={{ fontSize: 10.5, color: "#bfe6e6", padding: "2px 6px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.libelle || m.type}</span>
              <span style={{ color: "#7CC8C8", fontFamily: "Consolas, monospace", flexShrink: 0, marginLeft: 4 }}>
                {new Date(m.date_prevue).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Collaborateurs */}
      {b._collabs.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: "#5aa05a", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
            <i className="ti ti-users" /> Équipe ({b._collabs.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            {b._collabs.slice(0, 8).map((c, i) => (
              <span key={i} style={{
                fontSize: 9.5, padding: "1px 5px",
                background: "rgba(90,160,90,.15)",
                color: "#7CC8C8",
                borderRadius: 6,
                fontWeight: 700,
              }}>
                {c.prenom?.[0]}{c.nom?.[0]}
              </span>
            ))}
            {b._collabs.length > 8 && (
              <span style={{ fontSize: 9.5, color: "#9bb5b5" }}>+{b._collabs.length - 8}</span>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-stat {
          0%, 100% { box-shadow: 0 0 0 0 rgba(227, 93, 91, .4); }
          50%      { box-shadow: 0 0 0 4px rgba(227, 93, 91, 0); }
        }
      `}</style>
    </div>
  );
}
