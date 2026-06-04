"use client";
// Page Calendrier — Vue mensuelle des interventions (DI) avec navigation par mois.
// Les DI sont positionnées sur leur date de création (à défaut leur due_date si présente).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Btn } from "../ui";
import { PageHero } from "../components/ui-premium";
import { logger } from "../../lib/logger";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// Couleurs par statut DI
const COULEUR_STATUT = {
  "Nouvelle": "#e35d5b",
  "En cours": "#EF9F27",
  "Résolue": "#5aa05a",
  "Annulée": "#8a98a8",
};

export default function CalendrierInterventions() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [interventions, setInterventions] = useState([]);
  // Alpha 0.11 : intégration maintenances dans le calendrier
  const [maintenances, setMaintenances] = useState([]);
  const [showMaint, setShowMaint] = useState(true);
  const [loading, setLoading] = useState(true);
  // Mois affiché : Date pointant sur le 1er du mois
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  // Alpha 0.10 : vue mois ou semaine
  const [vue, setVue] = useState("mois");   // "mois" | "semaine"

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    (async () => {
      try {
        setLoading(true);
        // On charge les interventions du mois affiché ± 1 mois pour navigation fluide
        const debut = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1).toISOString();
        const fin = new Date(cursor.getFullYear(), cursor.getMonth() + 2, 1).toISOString();
        const debutD = debut.slice(0, 10);
        const finD = fin.slice(0, 10);
        // Alpha 0.16.1 : due_date rétabli (ALTER TABLE appliqué côté base)
        let qDi = supabase.from("interventions")
          .select("id, numero, type, statut, urgence, created_at, due_date, materiels(libelle), patients(nom, prenom)")
          .gte("created_at", debut).lte("created_at", fin);
        let qMnt = supabase.from("maintenances")
          .select("id, type, statut, date_prevue, materiels(libelle)")
          .gte("date_prevue", debutD).lte("date_prevue", finD);
        if (auth.etabId) {
          qDi = qDi.eq("etablissement_id", auth.etabId);
          qMnt = qMnt.eq("etablissement_id", auth.etabId);
        }
        const [{ data: di }, { data: mnt }] = await Promise.all([qDi, qMnt]);
        setInterventions(di || []);
        setMaintenances(mnt || []);
      } catch (e) {
        // 0.57.5 : try/catch englobant pour pas crasher la page
        logger.error("[Calendrier] load failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [auth.ready, auth.structureId, auth.etabId, cursor]);

  // Construire la grille du mois (matrice 6 lignes x 7 colonnes, jour de la semaine en haut)
  const annee = cursor.getFullYear();
  const mois = cursor.getMonth();
  const premierJour = new Date(annee, mois, 1);
  // Lundi = 0 en logique métier
  const offsetDebut = (premierJour.getDay() + 6) % 7;
  const dernierJourMois = new Date(annee, mois + 1, 0).getDate();
  const totalCases = Math.ceil((offsetDebut + dernierJourMois) / 7) * 7;

  const cases = [];
  for (let i = 0; i < totalCases; i++) {
    const dayNum = i - offsetDebut + 1;
    const out = dayNum < 1 || dayNum > dernierJourMois;
    const d = out ? null : new Date(annee, mois, dayNum);
    cases.push({ day: dayNum, out, date: d });
  }

  // Indexer les DI par date "YYYY-MM-DD"
  // Alpha 0.11 : on intègre aussi les maintenances si showMaint=true.
  // Chaque événement a un champ _kind = "di" | "maint" pour différencier le rendu.
  const byDate = {};
  interventions.forEach((it) => {
    const ref = it.due_date || it.created_at;
    if (!ref) return;
    const key = ref.slice(0, 10);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push({ ...it, _kind: "di" });
  });
  if (showMaint) {
    maintenances.forEach((m) => {
      if (!m.date_prevue) return;
      const key = m.date_prevue;
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push({ ...m, _kind: "maint", numero: `MNT-${(m.id || "").slice(0, 6)}` });
    });
  }

  const today = new Date(); const todayKey = today.toISOString().slice(0, 10);

  function prevMonth() {
    if (vue === "semaine") setCursor(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7));
    else setCursor(new Date(annee, mois - 1, 1));
  }
  function nextMonth() {
    if (vue === "semaine") setCursor(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7));
    else setCursor(new Date(annee, mois + 1, 1));
  }
  function today_() {
    const d = new Date();
    if (vue === "semaine") setCursor(d);
    else setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
  }
  // Calcul du lundi de la semaine du curseur (pour la vue semaine)
  function getLundiSemaine(d) {
    const lundi = new Date(d);
    const day = (d.getDay() + 6) % 7; // lundi=0
    lundi.setDate(d.getDate() - day);
    lundi.setHours(0, 0, 0, 0);
    return lundi;
  }
  const lundiSemaine = getLundiSemaine(cursor);
  // Cases vue semaine = 7 jours à partir du lundi
  const casesSemaine = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lundiSemaine);
    d.setDate(lundiSemaine.getDate() + i);
    casesSemaine.push({ date: d, day: d.getDate() });
  }
  // Titre adapté à la vue
  const titre = vue === "mois" ? `${MOIS[mois]} ${annee}`
    : `Semaine du ${lundiSemaine.getDate()} ${MOIS[lundiSemaine.getMonth()]} au ${casesSemaine[6].date.getDate()} ${MOIS[casesSemaine[6].date.getMonth()]} ${casesSemaine[6].date.getFullYear()}`;

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        {/* 0.58.4 : PageHero premium */}
        <PageHero
          icon="ti-calendar"
          eyebrow="PLANNING"
          title="Calendrier des interventions"
          subtitle="Vue mensuelle des DI — positionnées sur leur date d'échéance ou de création"
          variant="violet"
          breadcrumbs={[
            { label: "Accueil", href: "/accueil" },
            { label: "Calendrier" },
          ]}
        />
        <Panel>
          {/* Toolbar navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Btn variant="ghost" icon="ti-chevron-left" onClick={prevMonth}>{vue === "semaine" ? "Sem. précédente" : "Mois précédent"}</Btn>
              <h2 style={{ margin: 0, fontSize: 17 }}>{titre}</h2>
              <Btn variant="ghost" icon="ti-chevron-right" onClick={nextMonth}>{vue === "semaine" ? "Sem. suivante" : "Mois suivant"}</Btn>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Alpha 0.10 : toggle vue mois/semaine */}
              <div style={{ display: "inline-flex", border: "1px solid #e3e9ee", borderRadius: 8, overflow: "hidden" }}>
                <button onClick={() => setVue("mois")} style={{
                  padding: "6px 14px", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: vue === "mois" ? "#142131" : "#fff", color: vue === "mois" ? "#fff" : "#142131",
                  border: "none",
                }}>Mois</button>
                <button onClick={() => setVue("semaine")} style={{
                  padding: "6px 14px", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: vue === "semaine" ? "#142131" : "#fff", color: vue === "semaine" ? "#fff" : "#142131",
                  border: "none",
                }}>Semaine</button>
              </div>
              <Btn variant="ghost" icon="ti-calendar-event" onClick={today_}>Aujourd'hui</Btn>
            </div>
          </div>
          {/* Alpha 0.11 : toggle pour montrer ou cacher les maintenances */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", color: "#6c7a89" }}>
              <input type="checkbox" checked={showMaint} onChange={(e) => setShowMaint(e.target.checked)} />
              <i className="ti ti-tool" style={{ color: "#5a8f8f" }} /> Afficher les maintenances ({maintenances.length})
            </label>
          </div>

          {loading ? <StateMsg>Chargement…</StateMsg> : (
            <>
              {vue === "mois" ? (
                <div className="cal-grid">
                  {JOURS.map((j) => <div key={j} className="cal-h">{j}</div>)}
                  {cases.map((c, i) => {
                    if (c.out) return <div key={i} className="cal-c out" />;
                    const key = c.date.toISOString().slice(0, 10);
                    const isToday = key === todayKey;
                    const events = byDate[key] || [];
                    const visible = events.slice(0, 3);
                    const more = events.length - visible.length;
                    return (
                      <div key={i} className={`cal-c${isToday ? " today" : ""}`}>
                        <div className="cal-c-day">{c.day}</div>
                        {visible.map((e) => {
                          const isMaint = e._kind === "maint";
                          const color = isMaint ? "#5a8f8f" : (COULEUR_STATUT[e.statut] || "#185FA5");
                          const target = e.materiels?.libelle || (e.patients ? `${e.patients.nom} ${e.patients.prenom || ""}` : "");
                          const ic = isMaint ? "ti-tool" : "ti-tools";
                          return (
                            <div key={`${e._kind}-${e.id}`} className="cal-evt" style={{ background: color }}
                              title={`${isMaint ? "Maintenance" : e.numero} — ${e.type} (${e.statut})${target ? "\n" + target : ""}`}
                              onClick={() => router.push(isMaint ? "/maintenance" : "/interventions")}>
                              <i className={`ti ${ic}`} style={{ marginRight: 3, fontSize: 9 }} />
                              {isMaint ? e.type.slice(0, 16) : e.numero}{!isMaint && target ? ` · ${target.slice(0, 16)}` : ""}
                            </div>
                          );
                        })}
                        {more > 0 && <div className="cal-more">+{more} autre(s)</div>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Alpha 0.10 : vue semaine — cases plus grandes, toutes les DI affichées */
                <div className="cal-grid cal-grid-sem">
                  {JOURS.map((j, i) => {
                    const d = casesSemaine[i].date;
                    return <div key={j} className="cal-h">{j} {d.getDate()}/{d.getMonth() + 1}</div>;
                  })}
                  {casesSemaine.map((c, i) => {
                    const key = c.date.toISOString().slice(0, 10);
                    const isToday = key === todayKey;
                    const events = byDate[key] || [];
                    return (
                      <div key={i} className={`cal-c cal-c-sem${isToday ? " today" : ""}`}>
                        <div className="cal-c-day">{c.day}</div>
                        {events.map((e) => {
                          const isMaint = e._kind === "maint";
                          const color = isMaint ? "#5a8f8f" : (COULEUR_STATUT[e.statut] || "#185FA5");
                          const target = e.materiels?.libelle || (e.patients ? `${e.patients.nom} ${e.patients.prenom || ""}` : "");
                          const ic = isMaint ? "ti-tool" : "ti-tools";
                          return (
                            <div key={`${e._kind}-${e.id}`} className="cal-evt cal-evt-sem" style={{ background: color }}
                              title={`${isMaint ? "Maintenance" : e.numero} — ${e.type} (${e.statut})${target ? "\n" + target : ""}`}
                              onClick={() => router.push(isMaint ? "/maintenance" : "/interventions")}>
                              <b><i className={`ti ${ic}`} style={{ marginRight: 3, fontSize: 11 }} />{isMaint ? "Maintenance" : e.numero}</b>
                              <div style={{ fontSize: 10, fontWeight: 400, opacity: .9 }}>{e.type}</div>
                              {target && <div style={{ fontSize: 10, opacity: .85, marginTop: 2 }}>{target.slice(0, 28)}</div>}
                            </div>
                          );
                        })}
                        {events.length === 0 && <div style={{ fontSize: 11, color: "#cfd5db", textAlign: "center", marginTop: 12 }}>—</div>}
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Légende */}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16, justifyContent: "center", fontSize: 12 }}>
                {Object.entries(COULEUR_STATUT).map(([s, c]) => (
                  <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: c, display: "inline-block" }} />
                    <span style={{ color: "#6c7a89" }}>{s}</span>
                  </span>
                ))}
                {showMaint && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: "#5a8f8f", display: "inline-block" }} />
                    <span style={{ color: "#6c7a89" }}><i className="ti ti-tool" /> Maintenance</span>
                  </span>
                )}
              </div>
              {interventions.length === 0 && maintenances.length === 0 && (
                <StateMsg>Aucun évènement sur la période affichée.</StateMsg>
              )}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
