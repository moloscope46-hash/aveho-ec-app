"use client";
// =============================================================
//  /presentation/had-list (0.65.5)
//
//  Vue HAD type liste/dossier patient à domicile :
//   - Liste verticale des patients HAD
//   - Pour chaque patient : DI en cours + livraisons à venir + maintenances + forfaits + dernière visite
//   - Anticipation 7 jours
//   - Compteurs en haut (en cours / à venir / en retard)
// =============================================================
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TVScreenNav from "../../components/TVScreenNav";
import TVCastButton from "../../components/TVCastButton";
import TVMagasinFilter, { getTVMagasinId } from "../../components/TVMagasinFilter";
import TVFiltersBar, { getTVFilters } from "../../components/TVFiltersBar";

export default function PresentationHadListPage() {
  return (
    <Suspense fallback={<Loading />}><PresentationHadList /></Suspense>
  );
}

function Loading() {
  return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#142131", color: "#bfe6e6", fontSize: 18 }}>Chargement…</div>;
}

function PresentationHadList() {
  const supabase = createClient();
  const auth = useAuth();
  const params = useSearchParams();
  const refreshSec = parseInt(params.get("refresh") || "90", 10);

  const [patients, setPatients] = useState([]);
  const [globals, setGlobals] = useState({ enCours: 0, aVenir: 0, enRetard: 0, livraisons7j: 0 });
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [magasinId, setMagasinId] = useState(() => getTVMagasinId(params));
  const [advFilters, setAdvFilters] = useState(() => getTVFilters("had-list") || {});
  const timerRef = useRef(null);
  const clockRef = useRef(null);

  async function load() {
    if (!auth.structureId) return;
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in7days = new Date(today); in7days.setDate(in7days.getDate() + 7);

    // 1. Patients HAD/domicile - 0.65.12 : ENLEVER notion chambre/lit (que domicile)
    let qPat = supabase.from("patients")
      .select("id, nom, prenom, ville, code_postal, telephone, mode_residence, etablissement_id, latitude, longitude, adresse, date_naissance, sexe, gir, mobilite, allergies, medecin_traitant, medecin_traitant_telephone, regime_alimentaire, date_entree, prescripteur_id, contact_urgence_nom, contact_urgence_telephone, contact_urgence_lien")
      .eq("structure_id", auth.structureId)
      .limit(100);
    if (advFilters.etabId) qPat = qPat.eq("etablissement_id", advFilters.etabId);
    if (advFilters.patientId) qPat = qPat.eq("id", advFilters.patientId);
    const allPats = await tryFetch(qPat);
    // Patients HAD = domicile uniquement (mode_residence absent OU contient "domicile" / "HAD")
    let hadPats = allPats.filter(p =>
      !p.mode_residence ||
      /domicile|HAD/i.test(p.mode_residence || "")
    );

    // Recherche libre
    if (advFilters.search?.trim()) {
      const s = advFilters.search.toLowerCase().trim();
      hadPats = hadPats.filter(p =>
        (p.nom || "").toLowerCase().includes(s) ||
        (p.prenom || "").toLowerCase().includes(s) ||
        (p.ville || "").toLowerCase().includes(s)
      );
    }

    // 2. Enrichir avec DI + livraisons + maintenances + TRAITEMENTS HAD + médecin/IDE/pharmacie par patient
    const enriched = await Promise.all(hadPats.slice(0, 30).map(async (p) => {
      const [dis, livraisons, maintenances, traitements] = await Promise.all([
        tryFetch(supabase.from("interventions")
          .select("id, numero, type, statut, urgence, created_at, date_planifiee, materiels(libelle, num_parc)")
          .eq("structure_id", auth.structureId)
          .eq("patient_id", p.id)
          .neq("statut", "Clôturée").neq("statut", "Refusée")
          .order("created_at", { ascending: false })
          .limit(10)),
        tryFetch(supabase.from("tournees_etapes")
          .select("id, label, type_etape, statut, ordre, tournees(date_tournee, statut, nom)")
          .ilike("type_etape", "%livraison%")
          .limit(20)),
        tryFetch(supabase.from("maintenances")
          .select("id, libelle, date_prevue, statut, type, materiels(libelle)")
          .eq("structure_id", auth.structureId)
          .gte("date_prevue", today.toISOString().slice(0, 10))
          .lte("date_prevue", in7days.toISOString().slice(0, 10))
          .order("date_prevue")
          .limit(10)),
        // 0.65.12 : Traitements HAD actifs avec IDE et pharmacie
        tryFetch(supabase.from("had")
          .select("id, type_traitement, statut, date_debut, observations, prescripteur:prescripteur_id(nom, prenom, specialite), infirmiere:infirmiere_id(nom, prenom, telephone), pharmacie:pharmacie_id(nom, telephone)")
          .eq("structure_id", auth.structureId)
          .eq("patient_id", p.id)
          .eq("statut", "Actif")
          .limit(5)),
      ]);

      // Filtre client-side livraisons : contient nom du patient dans label
      const patName = `${p.nom} ${p.prenom || ""}`.toLowerCase().trim();
      const myLivraisons = livraisons.filter(l =>
        (l.label || "").toLowerCase().includes(patName) ||
        (l.label || "").toLowerCase().includes(p.nom?.toLowerCase() || "")
      );

      // DI catégorisées
      const enCours = dis.filter(d => d.statut !== "Clôturée" && d.statut !== "Refusée");
      const enRetard = dis.filter(d => d.urgence === "Urgent" && d.statut === "Nouvelle" &&
        new Date(d.created_at) < new Date(Date.now() - 24 * 3600 * 1000));

      return {
        ...p,
        _dis: enCours,
        _livraisons: myLivraisons,
        _maintenances: maintenances,
        _traitements: traitements,  // 0.65.12 : traitements HAD actifs
        _enRetard: enRetard.length > 0,
        _urgent: enCours.some(d => d.urgence === "Urgent"),
        _nextDate: getNextEventDate(enCours, myLivraisons, maintenances),
      };
    }));

    // Tri : urgent en premier
    enriched.sort((a, b) => {
      if (a._urgent && !b._urgent) return -1;
      if (!a._urgent && b._urgent) return 1;
      if (a._enRetard && !b._enRetard) return -1;
      if (!a._enRetard && b._enRetard) return 1;
      return (b._dis.length + b._livraisons.length) - (a._dis.length + a._livraisons.length);
    });

    setPatients(enriched);

    // Globals
    let totEnCours = 0, totAVenir = 0, totEnRetard = 0, totLivr7j = 0;
    enriched.forEach(p => {
      totEnCours += p._dis.length;
      totAVenir += p._maintenances.length;
      if (p._enRetard) totEnRetard++;
      totLivr7j += p._livraisons.length;
    });
    setGlobals({ enCours: totEnCours, aVenir: totAVenir, enRetard: totEnRetard, livraisons7j: totLivr7j });
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
          <div style={{ fontSize: 13, letterSpacing: 3, color: "#5aa05a", fontWeight: 700, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <i className="ti ti-home-heart" /> AVEHO — HAD & DOMICILE
            <TVMagasinFilter onChange={setMagasinId} />
            <TVFiltersBar pageKey="had-list" onChange={setAdvFilters} />
            <TVCastButton refreshSec={refreshSec} />
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>
            Patients à domicile {patients.length > 0 ? `· ${patients.length}` : ""}
          </h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 44, fontWeight: 700, color: "#5aa05a", fontFamily: "Consolas, monospace", letterSpacing: 2 }}>{now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
          <div style={{ fontSize: 12, color: "#bfe6e6", marginTop: 2 }}>{now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { lbl: "DI en cours", v: globals.enCours, col: "#EF9F27", ic: "ti-clipboard-list" },
          { lbl: "Patients en retard", v: globals.enRetard, col: "#e35d5b", ic: "ti-alert-triangle", pulse: globals.enRetard > 0 },
          { lbl: "Livraisons 7j", v: globals.livraisons7j, col: "#C9867F", ic: "ti-truck-delivery" },
          { lbl: "Maintenances 7j", v: globals.aVenir, col: "#7a6fb0", ic: "ti-tool" },
        ].map(s => (
          <div key={s.lbl} style={{
            background: `linear-gradient(135deg, ${s.col}33, ${s.col}11)`,
            border: `1px solid ${s.col}55`,
            borderRadius: 14,
            padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 12,
            animation: s.pulse ? "pulse-kpi 1.8s ease-in-out infinite" : "none",
          }}>
            <div style={{ width: 50, height: 50, borderRadius: 11, background: `linear-gradient(135deg, ${s.col}, ${s.col}cc)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
              <i className={`ti ${s.ic}`} />
            </div>
            <div>
              <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, fontFamily: "Consolas, monospace" }}>{s.v}</div>
              <div style={{ fontSize: 10, color: "#bfe6e6", textTransform: "uppercase", letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>{s.lbl}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 80, fontSize: 20, color: "#bfe6e6" }}>Chargement…</div>
      ) : patients.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80 }}>
          <i className="ti ti-home-off" style={{ fontSize: 70, color: "#5aa05a" }} />
          <div style={{ fontSize: 24, color: "#bfe6e6", marginTop: 16, fontWeight: 600 }}>Aucun patient HAD trouvé</div>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
          gap: 12,
        }}>
          {patients.map(p => <PatientCard key={p.id} p={p} />)}
        </div>
      )}

      <div style={{ position: "fixed", bottom: 8, right: 12, fontSize: 11, color: "rgba(191,230,230,0.5)" }}>
        <button onClick={tryFullscreen} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>
          <i className="ti ti-maximize" /> Plein écran
        </button>
        {" · "}Refresh {refreshSec}s
      </div>

      <style>{`
        @keyframes pulse-kpi {
          0%, 100% { box-shadow: 0 4px 16px rgba(227,93,91,.22); transform: scale(1); }
          50%      { box-shadow: 0 4px 28px rgba(227,93,91,.55); transform: scale(1.02); }
        }
      `}</style>

      <TVScreenNav currentScreen="/presentation/had-list" />
    </div>
  );
}

function PatientCard({ p }) {
  return (
    <div style={{
      background: "rgba(255,255,255,.05)",
      border: `1.5px solid ${p._urgent ? "#e35d5b66" : p._enRetard ? "#EF9F2755" : "rgba(255,255,255,.12)"}`,
      borderLeft: `5px solid ${p._urgent ? "#e35d5b" : p._enRetard ? "#EF9F27" : "#5aa05a"}`,
      borderRadius: 12,
      padding: "12px 14px",
      animation: p._urgent ? "pulse-urgent 2.5s ease-in-out infinite" : "none",
    }}>
      {/* Header patient */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <i className="ti ti-home-heart" style={{ color: "#5aa05a", fontSize: 16 }} />
            <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{p.nom} {p.prenom || ""}</span>
            {p._urgent && (
              <span style={{ fontSize: 9, background: "#e35d5b", color: "#fff", padding: "1px 6px", borderRadius: 8, fontWeight: 800, letterSpacing: 0.5 }}>
                URGENT
              </span>
            )}
            {p._enRetard && !p._urgent && (
              <span style={{ fontSize: 9, background: "#EF9F27", color: "#fff", padding: "1px 6px", borderRadius: 8, fontWeight: 800, letterSpacing: 0.5 }}>
                EN RETARD
              </span>
            )}
          </div>
          {(p.ville || p.code_postal) && (
            <div style={{ fontSize: 11, color: "#bfe6e6" }}>
              <i className="ti ti-map-pin" /> {p.adresse ? `${p.adresse}, ` : ""}{p.ville || ""}{p.code_postal ? ` (${p.code_postal})` : ""}
            </div>
          )}
          {/* 0.65.12 : Infos sup patient HAD */}
          <div style={{ fontSize: 10, color: "#9bb5b5", marginTop: 2, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {p.date_naissance && (
              <span><i className="ti ti-cake" /> {new Date(p.date_naissance).toLocaleDateString("fr-FR")} ({Math.floor((Date.now() - new Date(p.date_naissance).getTime()) / (365.25 * 24 * 3600 * 1000))} ans)</span>
            )}
            {p.sexe && <span>{p.sexe === "F" ? "♀" : "♂"}</span>}
            {p.gir && <span style={{ color: p.gir <= 2 ? "#e35d5b" : "#7CC8C8" }}><i className="ti ti-heart" /> GIR {p.gir}</span>}
            {p.mobilite && <span><i className="ti ti-walk" /> {p.mobilite}</span>}
          </div>
        </div>
        {p._nextDate && (
          <div style={{
            background: "rgba(124,200,200,.15)",
            border: "1px solid rgba(124,200,200,.3)",
            borderRadius: 8,
            padding: "3px 8px",
            fontSize: 10,
            color: "#7CC8C8",
            fontWeight: 700,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}>
            <i className="ti ti-calendar" /> {p._nextDate}
          </div>
        )}
      </div>

      {/* 0.65.12 : Traitements HAD actifs (cœur du dossier patient) */}
      {p._traitements?.length > 0 && (
        <div style={{ marginBottom: 6, padding: "6px 8px", background: "rgba(122,111,176,.08)", borderRadius: 6, border: "1px solid rgba(122,111,176,.2)" }}>
          <div style={{ fontSize: 9.5, color: "#7a6fb0", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
            <i className="ti ti-pill" /> Traitements HAD ({p._traitements.length})
          </div>
          {p._traitements.map(t => (
            <div key={t.id} style={{ fontSize: 10.5, marginBottom: 2 }}>
              <span style={{ color: "#fff", fontWeight: 700 }}>{t.type_traitement}</span>
              {t.observations && <span style={{ color: "#9bb5b5", fontStyle: "italic", marginLeft: 4 }}>· {t.observations}</span>}
            </div>
          ))}
        </div>
      )}

      {/* 0.65.12 : Équipe médicale (médecin traitant + IDE + pharmacie) */}
      {(p.medecin_traitant || p._traitements?.[0]?.infirmiere || p._traitements?.[0]?.pharmacie) && (
        <div style={{ marginBottom: 6, padding: "6px 8px", background: "rgba(124,200,200,.06)", borderRadius: 6, border: "1px solid rgba(124,200,200,.15)" }}>
          <div style={{ fontSize: 9.5, color: "#7CC8C8", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
            <i className="ti ti-stethoscope" /> Équipe médicale
          </div>
          {p.medecin_traitant && (
            <div style={{ fontSize: 10.5, color: "#bfe6e6", marginBottom: 1 }}>
              <i className="ti ti-user-circle" style={{ color: "#185FA5" }} /> Médecin : <span style={{ color: "#fff", fontWeight: 700 }}>{p.medecin_traitant}</span>
              {p.medecin_traitant_telephone && <span style={{ color: "#9bb5b5", marginLeft: 4 }}>· {p.medecin_traitant_telephone}</span>}
            </div>
          )}
          {p._traitements?.[0]?.infirmiere && (
            <div style={{ fontSize: 10.5, color: "#bfe6e6", marginBottom: 1 }}>
              <i className="ti ti-nurse" style={{ color: "#5aa05a" }} /> IDE : <span style={{ color: "#fff", fontWeight: 700 }}>{p._traitements[0].infirmiere.nom} {p._traitements[0].infirmiere.prenom}</span>
              {p._traitements[0].infirmiere.telephone && <span style={{ color: "#9bb5b5", marginLeft: 4 }}>· {p._traitements[0].infirmiere.telephone}</span>}
            </div>
          )}
          {p._traitements?.[0]?.pharmacie && (
            <div style={{ fontSize: 10.5, color: "#bfe6e6", marginBottom: 1 }}>
              <i className="ti ti-cross" style={{ color: "#e35d5b" }} /> Pharmacie : <span style={{ color: "#fff", fontWeight: 700 }}>{p._traitements[0].pharmacie.nom}</span>
              {p._traitements[0].pharmacie.telephone && <span style={{ color: "#9bb5b5", marginLeft: 4 }}>· {p._traitements[0].pharmacie.telephone}</span>}
            </div>
          )}
          {p.contact_urgence_nom && (
            <div style={{ fontSize: 10.5, color: "#bfe6e6", marginTop: 2 }}>
              <i className="ti ti-phone-call" style={{ color: "#EF9F27" }} /> Urgence : <span style={{ color: "#fff" }}>{p.contact_urgence_nom}</span>
              {p.contact_urgence_telephone && <span style={{ color: "#9bb5b5", marginLeft: 4 }}>· {p.contact_urgence_telephone}</span>}
            </div>
          )}
        </div>
      )}

      {/* DI en cours */}
      {p._dis.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 9.5, color: "#EF9F27", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
            <i className="ti ti-clipboard-list" /> {p._dis.length} demande{p._dis.length > 1 ? "s" : ""} d'intervention
          </div>
          {p._dis.slice(0, 3).map(d => (
            <div key={d.id} style={{
              fontSize: 10.5,
              padding: "3px 8px",
              background: d.urgence === "Urgent" ? "rgba(227,93,91,.12)" : "rgba(239,159,39,.08)",
              borderLeft: `2px solid ${d.urgence === "Urgent" ? "#e35d5b" : "#EF9F27"}`,
              borderRadius: 4,
              marginBottom: 2,
              display: "flex", justifyContent: "space-between", gap: 6,
            }}>
              <span style={{ flex: 1, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {d.numero} · {d.materiels?.libelle || d.type}
              </span>
              <span style={{ color: "#bfe6e6", fontSize: 9.5, flexShrink: 0 }}>{d.statut}</span>
            </div>
          ))}
        </div>
      )}

      {/* Livraisons à venir */}
      {p._livraisons.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 9.5, color: "#C9867F", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
            <i className="ti ti-truck-delivery" /> {p._livraisons.length} livraison{p._livraisons.length > 1 ? "s" : ""} prévue{p._livraisons.length > 1 ? "s" : ""}
          </div>
          {p._livraisons.slice(0, 2).map(l => (
            <div key={l.id} style={{ fontSize: 10.5, padding: "2px 8px", color: "#bfe6e6", display: "flex", justifyContent: "space-between" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{l.label || "Livraison"}</span>
              <span style={{ color: "#7CC8C8", fontFamily: "Consolas, monospace", flexShrink: 0, marginLeft: 4 }}>
                {l.tournees?.date_tournee ? new Date(l.tournees.date_tournee).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Maintenances à venir */}
      {p._maintenances.length > 0 && (
        <div>
          <div style={{ fontSize: 9.5, color: "#7a6fb0", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
            <i className="ti ti-tool" /> {p._maintenances.length} maintenance{p._maintenances.length > 1 ? "s" : ""} 7j
          </div>
          {p._maintenances.slice(0, 2).map(m => (
            <div key={m.id} style={{ fontSize: 10.5, padding: "2px 8px", color: "#bfe6e6", display: "flex", justifyContent: "space-between" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{m.libelle || m.type}</span>
              <span style={{ color: "#7CC8C8", fontFamily: "Consolas, monospace", flexShrink: 0, marginLeft: 4 }}>
                {new Date(m.date_prevue).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}

      {p._dis.length === 0 && p._livraisons.length === 0 && p._maintenances.length === 0 && (
        <div style={{ fontSize: 11, color: "#9bb5b5", fontStyle: "italic", textAlign: "center", padding: 6 }}>
          Aucun événement en cours ou prévu
        </div>
      )}
    </div>
  );
}

function getNextEventDate(dis, livraisons, maintenances) {
  const dates = [];
  dis.forEach(d => { if (d.date_planifiee) dates.push(new Date(d.date_planifiee)); });
  livraisons.forEach(l => { if (l.tournees?.date_tournee) dates.push(new Date(l.tournees.date_tournee)); });
  maintenances.forEach(m => { if (m.date_prevue) dates.push(new Date(m.date_prevue)); });
  if (dates.length === 0) return null;
  const next = dates.sort((a, b) => a - b)[0];
  if (next < new Date()) return null;
  return next.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}
