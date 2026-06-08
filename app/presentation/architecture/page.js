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
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TVScreenNav from "../../components/TVScreenNav";
import TVCastButton from "../../components/TVCastButton";
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
  const router = useRouter();
  const params = useSearchParams();
  const refreshSec = parseInt(params.get("refresh") || "60", 10);

  const [batiments, setBatiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [magasinId, setMagasinId] = useState(() => getTVMagasinId(params));
  const [advFilters, setAdvFilters] = useState(() => getTVFilters("architecture") || {});
  // 0.65.9 : modal transfert patient
  const [transferModal, setTransferModal] = useState(null);
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

    // 2. Pour chaque bâtiment, charger : services + matériels + DI + dépôts + équipes + lits surplus
    // 0.65.24 : globalQueries d'abord (1 fois), puis filtrage JS par bâtiment
    // materiels n'a PAS batiment_id, on remonte via depot.batiment_id
    const [allServices, allMateriels, allDis, allDepots, allMaintenances, allPatients] = await Promise.all([
      tryFetch(supabase.from("services").select("id, nom, batiment_id").eq("structure_id", auth.structureId)),
      tryFetch(supabase.from("materiels").select("id, libelle, num_parc, etat, depot_id, etablissement_id").eq("structure_id", auth.structureId).limit(1000)),
      tryFetch(supabase.from("interventions").select("id, statut, urgence, batiment_id, service_id").eq("structure_id", auth.structureId).neq("statut", "Clôturée").neq("statut", "Refusée")),
      tryFetch(supabase.from("depots").select("id, nom, etablissement_id, batiment_id").eq("structure_id", auth.structureId)),
      tryFetch(supabase.from("maintenances").select("id, libelle, statut, date_prevue, type").eq("structure_id", auth.structureId).gte("date_prevue", new Date().toISOString().slice(0, 10)).order("date_prevue").limit(100)),
      tryFetch(supabase.from("patients").select("id, nom, prenom, batiment_id, service_id, chambre_id").eq("structure_id", auth.structureId).limit(500)),
    ]);

    // Index : depot_id → batiment_id (pour remonter le batiment d'un matériel)
    const depotsByBat = {};
    (allDepots || []).forEach(d => {
      if (d.batiment_id) {
        if (!depotsByBat[d.batiment_id]) depotsByBat[d.batiment_id] = [];
        depotsByBat[d.batiment_id].push(d.id);
      }
    });

    const enriched = await Promise.all(bats.map(async (b) => {
      // Filtrage JS uniquement
      const services = (allServices || []).filter(s => s.batiment_id === b.id);
      const depotIdsForBat = depotsByBat[b.id] || [];
      // Matériels du bât = ceux dans un dépôt du bât
      const materiels = (allMateriels || []).filter(m => depotIdsForBat.includes(m.depot_id));
      const dis = (allDis || []).filter(d => d.batiment_id === b.id);
      const depots = (allDepots || []).filter(d => d.batiment_id === b.id);
      const maintenances = allMaintenances || [];
      const patients = (allPatients || []).filter(p => p.batiment_id === b.id);
      const collabs = [];

      // Regrouper services par étage
      const servicesByEtage = {};
      services.forEach(s => {
        const etage = s.etage ?? 0;
        if (!servicesByEtage[etage]) servicesByEtage[etage] = [];
        servicesByEtage[etage].push(s);
      });
      // Pour chaque service : compter matériels + DI + patients
      Object.values(servicesByEtage).flat().forEach(s => {
        s._nbMat = materiels.filter(m => m.service_id === s.id).length;
        s._nbDi = dis.filter(d => d.service_id === s.id).length;
        s._nbPatients = patients.filter(p => p.service_id === s.id).length;
      });

      // 0.65.9 : Lits de surplus = matériels rattachés au bâtiment SANS service/chambre, avec étage_surplus
      const litsSurplus = materiels.filter(m =>
        !m.service_id && !m.chambre_id && (
          (m.libelle?.toLowerCase().includes("lit") || m.libelle?.toLowerCase().includes("matelas")) ||
          false
        )
      );
      // Regrouper par étage
      const litsSurplusByEtage = {};
      litsSurplus.forEach(l => {
        const etage = "?";
        if (!litsSurplusByEtage[etage]) litsSurplusByEtage[etage] = [];
        litsSurplusByEtage[etage].push(l);
      });

      return {
        ...b,
        _services: services,
        _servicesByEtage: servicesByEtage,
        _materiels: materiels,
        _dis: dis,
        _depots: depots,
        _maintenances: maintenances,
        _patients: patients,
        _litsSurplus: litsSurplus,
        _litsSurplusByEtage: litsSurplusByEtage,
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
            <TVCastButton refreshSec={refreshSec} />
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
          {batiments.map(b => <BatimentColumn key={b.id} b={b} router={router} onTransferOpen={setTransferModal} />)}
        </div>
      )}

      {/* 0.65.9 : Modal de transfert patient */}
      {transferModal && (
        <TransferPatientModal
          patient={transferModal}
          batiments={batiments}
          supabase={supabase}
          structureId={auth.structureId}
          onClose={() => setTransferModal(null)}
          onSaved={() => { setTransferModal(null); load(); }}
        />
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

function BatimentColumn({ b, router, onTransferOpen }) {
  const etages = Object.keys(b._servicesByEtage || {}).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
  const litsSurplusEtages = Object.keys(b._litsSurplusByEtage || {}).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
  const nbMat = b._materiels.length;
  const nbDi = b._dis.length;
  const nbDiUrg = b._diUrgentes;
  const nbMaint = b._maintenances.length;
  const nbDep = b._depots.length;
  const nbPatients = b._patients?.length || 0;
  const nbLitsSurplus = b._litsSurplus?.length || 0;

  function addPatientQuick() {
    // Redirige vers /patients?new=1 avec préremplissage du bâtiment
    router?.push(`/patients?new=1&etab=${b.etablissement_id}&bat=${b.id}`);
  }

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
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
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
        {/* 0.65.9 : Bouton + Patient rapide */}
        <button onClick={addPatientQuick}
          title="Ajouter un patient à ce bâtiment"
          style={{
            background: "linear-gradient(135deg, #5aa05a, #4a8a4a)",
            color: "#fff", border: "none", borderRadius: 8,
            width: 32, height: 32, cursor: "pointer", fontSize: 18,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontFamily: "inherit",
            boxShadow: "0 4px 12px rgba(90,160,90,.4)",
            flexShrink: 0,
          }}>
          <i className="ti ti-user-plus" />
        </button>
      </div>

      {/* Mini-stats du bâtiment */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
        {[
          { ic: "ti-users", v: nbPatients, col: "#5aa05a", lbl: "Patients" },
          { ic: "ti-clipboard-list", v: nbDi, col: "#EF9F27", lbl: "DI", pulse: nbDiUrg > 0 },
          { ic: "ti-alert-triangle", v: nbDiUrg, col: "#e35d5b", lbl: "Urgences", hide: nbDiUrg === 0 },
          { ic: "ti-package", v: nbMat, col: "#185FA5", lbl: "Matériels" },
          { ic: "ti-bed", v: nbLitsSurplus, col: "#C9867F", lbl: "Lits surplus", hide: nbLitsSurplus === 0 },
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

      {/* Étages → services + lits surplus */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: "calc(100vh - 410px)", overflowY: "auto" }}>
        {etages.length === 0 && litsSurplusEtages.length === 0 ? (
          <div style={{ fontSize: 11, color: "#9bb5b5", textAlign: "center", padding: 14, fontStyle: "italic" }}>
            Aucun service
          </div>
        ) : (
          <>
            {etages.map(et => (
              <div key={"svc-" + et}>
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
                      {s._nbPatients > 0 && (
                        <span style={{ fontSize: 9, padding: "1px 5px", background: "rgba(90,160,90,.3)", color: "#5aa05a", borderRadius: 6, fontWeight: 700 }}>
                          <i className="ti ti-users" /> {s._nbPatients}
                        </span>
                      )}
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
                  {/* 0.65.9 : Lits surplus rattachés à cet étage */}
                  {b._litsSurplusByEtage?.[et]?.length > 0 && (
                    <div style={{
                      padding: "4px 8px",
                      background: "rgba(201,134,127,.10)",
                      border: "1px dashed rgba(201,134,127,.4)",
                      borderRadius: 6,
                      fontSize: 10.5,
                      color: "#C9867F",
                      display: "flex", alignItems: "center", gap: 5,
                    }}>
                      <i className="ti ti-bed-flat" style={{ fontSize: 12 }} />
                      <span style={{ flex: 1, fontWeight: 700 }}>
                        {b._litsSurplusByEtage[et].length} lit{b._litsSurplusByEtage[et].length > 1 ? "s" : ""} de surplus
                      </span>
                      <span style={{ fontSize: 9, color: "#bfe6e6" }}>
                        {b._litsSurplusByEtage[et].slice(0, 2).map(l => l.num_parc).join(", ")}
                        {b._litsSurplusByEtage[et].length > 2 && " +" + (b._litsSurplusByEtage[et].length - 2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Lits surplus sur étages SANS services */}
            {litsSurplusEtages.filter(et => !etages.includes(et)).map(et => (
              <div key={"surplus-" + et}>
                <div style={{
                  fontSize: 9.5, color: "#C9867F", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: 1,
                  padding: "3px 8px",
                  background: "rgba(201,134,127,.10)",
                  borderRadius: 6,
                  marginBottom: 4,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <i className="ti ti-stairs" style={{ fontSize: 11 }} />
                  Étage {et} (réserve)
                </div>
                <div style={{
                  padding: "4px 8px",
                  background: "rgba(201,134,127,.10)",
                  border: "1px dashed rgba(201,134,127,.4)",
                  borderRadius: 6,
                  fontSize: 10.5,
                  color: "#C9867F",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <i className="ti ti-bed-flat" style={{ fontSize: 12 }} />
                  <span style={{ flex: 1, fontWeight: 700 }}>
                    {b._litsSurplusByEtage[et].length} lit{b._litsSurplusByEtage[et].length > 1 ? "s" : ""} de surplus
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Patients du bâtiment avec bouton transfert */}
      {b._patients?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: "#5aa05a", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
            <i className="ti ti-users" /> Patients ({b._patients.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 120, overflowY: "auto" }}>
            {b._patients.slice(0, 8).map(p => (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "2px 6px",
                fontSize: 10.5, color: "#bfe6e6",
              }}>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.nom} {p.prenom}{p.chambre ? ` · Ch.${p.chambre}` : ""}
                </span>
                <button onClick={() => onTransferOpen?.(p)}
                  title="Transférer ce patient"
                  style={{
                    background: "rgba(124,200,200,.2)", color: "#7CC8C8",
                    border: "1px solid rgba(124,200,200,.3)", borderRadius: 4,
                    cursor: "pointer", padding: "0 4px", fontSize: 10,
                    fontFamily: "inherit", flexShrink: 0,
                  }}>
                  <i className="ti ti-arrows-right-left" />
                </button>
              </div>
            ))}
            {b._patients.length > 8 && (
              <div style={{ fontSize: 9.5, color: "#9bb5b5", textAlign: "center" }}>
                +{b._patients.length - 8} autres
              </div>
            )}
          </div>
        </div>
      )}

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

// 0.65.9 : Modal de transfert patient
function TransferPatientModal({ patient, batiments, supabase, structureId, onClose, onSaved }) {
  const [targetBatId, setTargetBatId] = useState(patient.batiment_id || "");
  const [targetSvcId, setTargetSvcId] = useState(patient.service_id || "");
  const [targetChambreId, setTargetChambreId] = useState(patient.chambre_id || "");
  const [services, setServices] = useState([]);
  const [chambres, setChambres] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  // Charger services quand bâtiment change
  useEffect(() => {
    if (!targetBatId) { setServices([]); return; }
    (async () => {
      const { data } = await supabase.from("services").select("id, nom, etage").eq("batiment_id", targetBatId).order("nom");
      setServices(data || []);
    })();
  }, [targetBatId]);

  // Charger chambres quand service change
  useEffect(() => {
    if (!targetSvcId) { setChambres([]); return; }
    (async () => {
      const { data } = await supabase.from("chambres").select("id, libelle, numero").eq("service_id", targetSvcId).order("numero");
      setChambres(data || []);
    })();
  }, [targetSvcId]);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        batiment_id: targetBatId || null,
        service_id: targetSvcId || null,
        chambre_id: targetChambreId || null,
      };
      const { error } = await supabase.from("patients").update(payload).eq("id", patient.id);
      if (error) throw error;
      onSaved?.();
    } catch (e) {
      setErr(e.message || "Erreur de transfert");
      setSaving(false);
    }
  }

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 999999,
        background: "rgba(20,33,49,.8)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}>
      <div style={{
        background: "#fff", color: "#142131",
        borderRadius: 16,
        maxWidth: 480, width: "100%",
        boxShadow: "0 30px 80px rgba(0,0,0,.5)",
        fontFamily: "Quicksand, sans-serif",
        overflow: "hidden",
      }}>
        <div style={{
          padding: "14px 18px",
          background: "linear-gradient(135deg, #7CC8C8, #5db5b5)",
          color: "#fff",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <i className="ti ti-arrows-right-left" style={{ fontSize: 22 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Transférer le patient</div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>{patient.nom} {patient.prenom}</div>
          </div>
          <button onClick={onClose}
            style={{ background: "rgba(255,255,255,.2)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontFamily: "inherit", fontSize: 16 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: "#185FA5", fontWeight: 700, textTransform: "uppercase", marginBottom: 4, display: "block" }}>
              <i className="ti ti-building" /> Bâtiment de destination
            </label>
            <select value={targetBatId} onChange={(e) => { setTargetBatId(e.target.value); setTargetSvcId(""); setTargetChambreId(""); }}
              style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e3e9ee", borderRadius: 10, fontSize: 13, fontFamily: "inherit" }}>
              <option value="">— Aucun (HAD/domicile) —</option>
              {batiments.map(b => (
                <option key={b.id} value={b.id}>{b.nom} {b.etablissements?.nom ? `(${b.etablissements.nom})` : ""}</option>
              ))}
            </select>
          </div>

          {targetBatId && services.length > 0 && (
            <div>
              <label style={{ fontSize: 11, color: "#7a6fb0", fontWeight: 700, textTransform: "uppercase", marginBottom: 4, display: "block" }}>
                <i className="ti ti-stethoscope" /> Service
              </label>
              <select value={targetSvcId} onChange={(e) => { setTargetSvcId(e.target.value); setTargetChambreId(""); }}
                style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e3e9ee", borderRadius: 10, fontSize: 13, fontFamily: "inherit" }}>
                <option value="">— Pas de service spécifique —</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.nom}{s.etage !== null ? ` · Étage ${s.etage}` : ""}</option>
                ))}
              </select>
            </div>
          )}

          {targetSvcId && chambres.length > 0 && (
            <div>
              <label style={{ fontSize: 11, color: "#5a8f8f", fontWeight: 700, textTransform: "uppercase", marginBottom: 4, display: "block" }}>
                <i className="ti ti-bed" /> Chambre
              </label>
              <select value={targetChambreId} onChange={(e) => setTargetChambreId(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e3e9ee", borderRadius: 10, fontSize: 13, fontFamily: "inherit" }}>
                <option value="">— Aucune chambre spécifique —</option>
                {chambres.map(c => (
                  <option key={c.id} value={c.id}>{c.libelle || `Ch. ${c.numero}`}</option>
                ))}
              </select>
            </div>
          )}

          {err && (
            <div style={{ background: "rgba(227,93,91,.1)", color: "#e35d5b", padding: "8px 12px", borderRadius: 8, fontSize: 12, border: "1px solid rgba(227,93,91,.3)" }}>
              {err}
            </div>
          )}
        </div>

        <div style={{ padding: "12px 18px", borderTop: "1px solid #e3e9ee", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} disabled={saving}
            style={{ padding: "8px 14px", background: "#fafbfc", color: "#5a6878", border: "1.5px solid #e3e9ee", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>
            Annuler
          </button>
          <button onClick={save} disabled={saving}
            style={{ padding: "8px 18px", background: "linear-gradient(135deg, #185FA5, #7CC8C8)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
            <i className="ti ti-check" /> {saving ? "Transfert…" : "Transférer"}
          </button>
        </div>
      </div>
    </div>
  );
}
