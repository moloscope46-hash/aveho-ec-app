"use client";
// =============================================================
//  /magasin/tournees/calendrier — Vue calendrier des tournées (0.62.13)
//  Vue semaine + vue mois
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/useAuth";
import { useMagasinContext } from "../../../../lib/useMagasinContext";
import TopBar from "../../../TopBar";
import { useCart } from "../../../useCart";
import { PageHead, Panel, Btn } from "../../../ui";
import { MagasinSidebar } from "../../../components/MagasinSidebar";

// 0.62.26 : Statuts enrichis avec plus de granularité
const STATUT_META = {
  planifiee:    { col: "#EF9F27", lbl: "📅 Planifiée", icon: "📅", bgLight: "rgba(239,159,39,.12)", desc: "Tournée prévue, pas encore démarrée" },
  preparation:  { col: "#c97a2a", lbl: "📦 En préparation", icon: "📦", bgLight: "rgba(201,122,42,.12)", desc: "Chargement véhicule en cours" },
  a_faire:      { col: "#7a6fb0", lbl: "⏳ À démarrer", icon: "⏳", bgLight: "rgba(122,111,176,.12)", desc: "Prête au départ" },
  en_cours:     { col: "#185FA5", lbl: "🚛 En cours", icon: "🚛", bgLight: "rgba(24,95,165,.12)", desc: "Chauffeur en route" },
  en_livraison: { col: "#5e4a8c", lbl: "📍 Sur place", icon: "📍", bgLight: "rgba(94,74,140,.12)", desc: "Étape en cours" },
  livree:       { col: "#5a8f8f", lbl: "✓ Livrée", icon: "✓", bgLight: "rgba(94,143,143,.12)", desc: "Étapes terminées, à valider côté étab" },
  receptionnee: { col: "#5aa05a", lbl: "✅ Réceptionnée", icon: "✅", bgLight: "rgba(94,160,90,.12)", desc: "Validation étab OK" },
  terminee:     { col: "#5aa05a", lbl: "🏁 Terminée", icon: "🏁", bgLight: "rgba(94,160,90,.12)", desc: "Cycle complet OK" },
  retard:       { col: "#e35d5b", lbl: "⚠ En retard", icon: "⚠", bgLight: "rgba(227,93,91,.12)", desc: "Retard de plus d'1h" },
  annulee:      { col: "#8a98a8", lbl: "⊘ Annulée", icon: "⊘", bgLight: "rgba(138,152,168,.12)", desc: "Tournée annulée" },
  litige:       { col: "#c0392b", lbl: "❌ Litige", icon: "❌", bgLight: "rgba(192,57,43,.12)", desc: "Anomalie réception, en attente" },
};

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay() || 7;  // dimanche = 7
  if (day !== 1) date.setHours(-24 * (day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

function fmtISO(d) { return new Date(d).toISOString().slice(0, 10); }

export default function CalendrierTourneesPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();

  const [view, setView] = useState("semaine");      // semaine | mois
  const [refDate, setRefDate] = useState(new Date());
  const [tournees, setTournees] = useState([]);
  const [chauffeurs, setChauffeurs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.ready || magasinCtx.loading) return;
    reload();
  }, [auth.ready, magasinCtx.loading, magasinCtx.magasinId, refDate, view]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    let dStart, dEnd;
    if (view === "semaine") {
      dStart = startOfWeek(refDate);
      dEnd = new Date(dStart); dEnd.setDate(dEnd.getDate() + 7);
    } else {
      dStart = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
      dEnd = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1);
    }
    let q = supabase.from("tournees")
      .select("*, vehicules_magasin(immatriculation)")
      .gte("date_tournee", fmtISO(dStart))
      .lt("date_tournee", fmtISO(dEnd))
      .order("date_tournee").order("heure_depart");
    if (magasinCtx.isUserMagasin && magasinCtx.magasinId) q = q.eq("magasin_id", magasinCtx.magasinId);
    const list = await tryFetch(q);
    setTournees(list);
    // Charge chauffeurs
    const ids = [...new Set(list.map(t => t.chauffeur_user_id).filter(Boolean))];
    if (ids.length > 0) {
      const r = await tryFetch(supabase.from("membres_structure").select("user_id, prenom, nom").in("user_id", ids));
      setChauffeurs(Object.fromEntries((r || []).map(c => [c.user_id, `${c.prenom || ""} ${c.nom || ""}`.trim()])));
    }
    setLoading(false);
  }

  // Génère les jours
  function getJours() {
    if (view === "semaine") {
      const start = startOfWeek(refDate);
      return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
    } else {
      const first = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
      const lastDay = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0).getDate();
      // Padding début (jusqu'au lundi)
      const padStart = (first.getDay() || 7) - 1;
      const days = [];
      for (let i = padStart; i > 0; i--) {
        const d = new Date(first); d.setDate(d.getDate() - i); days.push({ d, pad: true });
      }
      for (let i = 0; i < lastDay; i++) {
        const d = new Date(first); d.setDate(d.getDate() + i); days.push({ d, pad: false });
      }
      // Padding fin
      while (days.length % 7 !== 0) {
        const last = days[days.length - 1].d;
        const d = new Date(last); d.setDate(d.getDate() + 1); days.push({ d, pad: true });
      }
      return days;
    }
  }

  function changerPeriode(delta) {
    const d = new Date(refDate);
    if (view === "semaine") d.setDate(d.getDate() + delta * 7);
    else d.setMonth(d.getMonth() + delta);
    setRefDate(d);
  }

  const tourneesByDate = tournees.reduce((acc, t) => {
    const k = t.date_tournee;
    if (!acc[k]) acc[k] = [];
    acc[k].push(t);
    return acc;
  }, {});

  const jours = getJours();
  const titrePeriode = view === "semaine"
    ? `Semaine du ${jours[0].toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}`
    : `${MOIS[refDate.getMonth()]} ${refDate.getFullYear()}`;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <MagasinSidebar />
        <div className="page-content" style={{ flex: 1, padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <PageHead icon="ti-calendar" title="Calendrier des tournées" subtitle={titrePeriode} />
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", border: "1px solid #cfd8e0", borderRadius: 6, overflow: "hidden" }}>
                <button onClick={() => setView("semaine")} style={{ padding: "6px 14px", background: view === "semaine" ? "#185FA5" : "#fff", color: view === "semaine" ? "#fff" : "#5a6878", border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Semaine</button>
                <button onClick={() => setView("mois")} style={{ padding: "6px 14px", background: view === "mois" ? "#185FA5" : "#fff", color: view === "mois" ? "#fff" : "#5a6878", border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Mois</button>
              </div>
              <Btn variant="ghost" icon="ti-chevron-left" onClick={() => changerPeriode(-1)}>Préc.</Btn>
              <Btn variant="ghost" onClick={() => setRefDate(new Date())}>Aujourd'hui</Btn>
              <Btn variant="ghost" icon="ti-chevron-right" onClick={() => changerPeriode(1)}>Suiv.</Btn>
              <Btn variant="primary" icon="ti-plus" onClick={() => router.push("/magasin/tournees/nouvelle")}>Nouvelle</Btn>
            </div>
          </div>

          {/* 0.62.26 : Légende des statuts */}
          <Panel style={{ marginBottom: 12, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#5a6878", letterSpacing: 1, marginBottom: 8 }}>📊 Légende des statuts</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(STATUT_META).map(([k, m]) => (
                <span key={k} title={m.desc} style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 8px", borderRadius: 4,
                  background: m.bgLight, color: m.col,
                  border: `1px solid ${m.col}40`,
                  fontSize: 10.5, fontWeight: 700,
                  cursor: "help",
                }}>
                  <span>{m.icon}</span>
                  <span>{m.lbl.replace(m.icon + " ", "")}</span>
                </span>
              ))}
            </div>
          </Panel>

          {loading ? <Panel><div style={{ padding: 40, textAlign: "center" }}>Chargement…</div></Panel> : (
            <Panel style={{ padding: 0, overflow: "hidden" }}>
              {/* Header jours */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#142131", color: "#fff" }}>
                {JOURS.map(j => <div key={j} style={{ padding: "10px 8px", textAlign: "center", fontSize: 11.5, fontWeight: 700, letterSpacing: 1 }}>{j}</div>)}
              </div>
              {/* Grille jours */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#f4f7fa", gap: 1 }}>
                {(view === "semaine" ? jours.map(d => ({ d, pad: false })) : jours).map((j, i) => {
                  const dISO = fmtISO(j.d);
                  const dayTrs = tourneesByDate[dISO] || [];
                  const isToday = dISO === fmtISO(new Date());
                  const heightVal = view === "semaine" ? "calc(100vh - 220px)" : 110;
                  return (
                    <div key={i} style={{
                      background: j.pad ? "#fafbfc" : "#fff",
                      minHeight: heightVal, maxHeight: heightVal,
                      padding: 6,
                      opacity: j.pad ? 0.5 : 1,
                      borderTop: isToday ? "3px solid #EF9F27" : "none",
                      overflowY: "auto",
                      position: "relative",
                    }}>
                      <div style={{
                        fontWeight: 700, fontSize: 11.5,
                        color: isToday ? "#EF9F27" : "#5a6878", marginBottom: 4,
                      }}>
                        {j.d.getDate()}
                        {view === "semaine" && <span style={{ marginLeft: 4, fontWeight: 400, fontSize: 10 }}>{JOURS[j.d.getDay() === 0 ? 6 : j.d.getDay() - 1]}</span>}
                      </div>
                      {dayTrs.map(t => {
                        const meta = STATUT_META[t.statut] || STATUT_META.planifiee;
                        return (
                          <div key={t.id} onClick={() => router.push(`/magasin/tournees/${t.id}`)} style={{
                            padding: "5px 7px", marginBottom: 4,
                            background: meta.bgLight,
                            borderLeft: `3px solid ${meta.col}`,
                            borderRadius: 4, cursor: "pointer",
                            fontSize: 10.5, color: "#142131",
                          }}>
                            <div style={{ fontWeight: 700, fontSize: 11 }}>
                              {meta.icon} {t.heure_depart || ""} {t.numero || t.nom || "T-" + t.id.substring(0, 6)}
                            </div>
                            <div style={{ fontSize: 9.5, color: "#5a6878" }}>
                              {t.vehicules_magasin?.immatriculation || "—"} · {chauffeurs[t.chauffeur_user_id] || "—"}
                            </div>
                          </div>
                        );
                      })}
                      {dayTrs.length === 0 && !j.pad && (
                        <div onClick={() => router.push(`/magasin/tournees/nouvelle?date=${dISO}`)} style={{
                          marginTop: 6, padding: "4px 6px",
                          textAlign: "center", color: "#cfd8e0", fontSize: 10,
                          cursor: "pointer", border: "1px dashed #e3e9ee", borderRadius: 4,
                        }} title="Créer une tournée ce jour">
                          + Ajouter
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          {/* Légende */}
          <Panel style={{ marginTop: 12, padding: "8px 14px" }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11 }}>
              {Object.entries(STATUT_META).map(([k, m]) => (
                <span key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 10, height: 10, background: m.col, borderRadius: 2, display: "inline-block" }} />
                  {m.lbl} {k}
                </span>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
