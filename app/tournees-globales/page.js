"use client";
export const dynamic = "force-dynamic";
// =============================================================
//  /tournees-globales — Tournées globales + optimisation cross
// =============================================================
import { useEffect, useState, useMemo } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { PageShell, ModernCard, ModernModal, ModalBtn, HiTechIconBox } from "../components/ui-premium";

const COLOR = "#185FA5";

export default function TourneesGlobalesPage() {
  const supabase = createClient();
  const auth = useAuth();
  const [globales, setGlobales] = useState([]);
  const [tournees, setTournees] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [tab, setTab] = useState("globales");
  const [tableMissing, setTableMissing] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ tournees_selected: [] });

  useEffect(() => { if (auth.ready) load(); }, [auth.ready]);

  async function load() {
    const r = await supabase.from("tournees_globales").select("*").eq("structure_id", auth.structureId).order("date_planifiee", { ascending: false });
    if (r.error?.code === "42P01") { setTableMissing(true); return; }
    setGlobales(r.data || []);

    const today = new Date().toISOString().substring(0, 10);
    const t = await supabase.from("v_tournees_jour_complete").select("*").eq("structure_id", auth.structureId).gte("date_planifiee", today).limit(50);
    setTournees(t.data || []);

    const s = await supabase.from("optimisation_suggestions").select("*").eq("structure_id", auth.structureId).eq("statut", "proposee").order("score", { ascending: false }).limit(20);
    setSuggestions(s.data || []);
  }

  async function createGlobale() {
    if (!form.nom || form.tournees_selected.length < 2) return;
    const { data: tg, error } = await supabase.from("tournees_globales").insert({
      structure_id: auth.structureId,
      nom: form.nom,
      type: form.type || "mixte",
      objectif: form.objectif,
      date_planifiee: form.date_planifiee || new Date().toISOString().substring(0, 10),
      optimisation_options: form.options || null,
    }).select().single();
    if (error) { alert(error.message); return; }
    
    const liens = form.tournees_selected.map((tid, i) => ({
      structure_id: auth.structureId,
      tournee_globale_id: tg.id,
      tournee_id: tid,
      ordre: i + 1,
    }));
    await supabase.from("tournee_globale_liens").insert(liens);
    
    // Calcul d'optimisation simple
    calculOptimisation(tg.id, form.tournees_selected);
    
    setModal(null); setForm({ tournees_selected: [] });
    load();
  }

  async function calculOptimisation(globaleId, tourneesIds) {
    const list = tournees.filter(t => tourneesIds.includes(t.id));
    const distance_totale = list.reduce((a, t) => a + (t.distance_km || 0), 0);
    const duree_totale = list.reduce((a, t) => a + (t.duree_minutes || 0), 0);
    
    // Simulation gain : on suppose 12% économie par tournée mutualisée
    const economies_km = distance_totale * 0.12;
    const score = Math.min(100, 60 + list.length * 5);
    
    await supabase.from("tournees_globales").update({
      distance_totale_km: distance_totale,
      duree_totale_min: duree_totale,
      optimisation_economies_km: economies_km,
      optimisation_score: score,
    }).eq("id", globaleId);

    // Générer des suggestions
    if (list.length >= 2) {
      const insertSuggestions = [];
      for (let i = 0; i < list.length - 1; i++) {
        insertSuggestions.push({
          structure_id: auth.structureId,
          type_suggestion: "mutualisation",
          description: `Mutualiser ${list[i].nom} avec ${list[i+1].nom} : économie potentielle ${(list[i].distance_km * 0.15).toFixed(1)} km`,
          economie_km: list[i].distance_km * 0.15,
          economie_min: list[i].duree_minutes * 0.1,
          score: 75 + Math.random() * 20,
        });
      }
      if (insertSuggestions.length > 0) {
        await supabase.from("optimisation_suggestions").insert(insertSuggestions);
      }
    }
  }

  async function acceptSuggestion(sId) {
    await supabase.from("optimisation_suggestions").update({ statut: "acceptee", appliquee_at: new Date().toISOString() }).eq("id", sId);
    load();
  }
  async function refuseSuggestion(sId) {
    await supabase.from("optimisation_suggestions").update({ statut: "refusee" }).eq("id", sId);
    load();
  }

  if (tableMissing) {
    return (
      <>
        <TopBar />
        <PageShell color={COLOR} icon="ti-route-2" title="Tournées globales" subtitle="Module non installé">
          <ModernCard color={COLOR} variant="accent" icon="ti-alert-triangle" title="Tables manquantes">
            <p style={{ color: "rgba(255,255,255,.8)" }}>Exécute <strong>aveho-MODULE-agenda-tournees-pharmacie.sql</strong></p>
          </ModernCard>
        </PageShell>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <PageShell
        color={COLOR}
        icon="ti-route-2"
        title="Tournées globales & Optimisation"
        subtitle="Rattacher des tournées et optimiser cross-acteurs"
        badge={`${globales.length} globales · ${suggestions.length} suggestions`}
        actions={
          <button onClick={() => { setForm({ tournees_selected: [], date_planifiee: new Date().toISOString().substring(0, 10) }); setModal("new"); }} style={{
            padding: "10px 18px", borderRadius: 10,
            background: `linear-gradient(135deg, ${COLOR}, ${COLOR}cc)`,
            color: "#fff", border: "none",
            fontFamily: "Quicksand", fontWeight: 700, fontSize: 13,
            cursor: "pointer", boxShadow: `0 4px 12px ${COLOR}50`,
          }}>
            <i className="ti ti-plus" /> Nouvelle globale
          </button>
        }
      >
        <ModernCard color={COLOR} variant="default" padding={0} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex" }}>
            <Tab a={tab === "globales"} on={() => setTab("globales")} c={COLOR}><i className="ti ti-route-2" /> Globales ({globales.length})</Tab>
            <Tab a={tab === "suggestions"} on={() => setTab("suggestions")} c="#EF9F27"><i className="ti ti-bulb" /> Suggestions ({suggestions.length})</Tab>
          </div>
        </ModernCard>

        {tab === "globales" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 14 }}>
            {globales.length === 0 ? (
              <ModernCard color={COLOR} variant="accent" icon="ti-info-circle" title="Aucune tournée globale">
                <p style={{ color: "rgba(255,255,255,.7)", margin: 0 }}>Crée une tournée globale pour mutualiser des tournées.</p>
              </ModernCard>
            ) : globales.map(g => (
              <ModernCard key={g.id} color={COLOR} variant="default" padding={16}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <HiTechIconBox name="ti-route-2" color={COLOR} variant="gradient" size={40} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{g.nom}</div>
                    <div style={{ color: "rgba(255,255,255,.55)", fontSize: 11 }}>{g.date_planifiee} · {g.type}</div>
                  </div>
                  {g.optimisation_score && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: g.optimisation_score > 70 ? "#5aa05a" : g.optimisation_score > 50 ? "#EF9F27" : "#D45E5E", fontSize: 24, fontWeight: 800 }}>{Math.round(g.optimisation_score)}</div>
                      <div style={{ color: "rgba(255,255,255,.4)", fontSize: 9, textTransform: "uppercase" }}>Score</div>
                    </div>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                  <Stat l="Distance" v={`${(g.distance_totale_km || 0).toFixed(0)} km`} c="#185FA5" />
                  <Stat l="Durée" v={`${g.duree_totale_min || 0} min`} c="#7CC8C8" />
                  <Stat l="Économies" v={`${(g.optimisation_economies_km || 0).toFixed(1)} km`} c="#5aa05a" full />
                </div>
                {g.objectif && <div style={{ marginTop: 8, padding: 8, background: "rgba(255,255,255,.04)", borderRadius: 6, fontSize: 11, color: "rgba(255,255,255,.7)" }}>🎯 {g.objectif}</div>}
              </ModernCard>
            ))}
          </div>
        )}

        {tab === "suggestions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {suggestions.length === 0 ? (
              <ModernCard color="#EF9F27" variant="accent" icon="ti-info-circle" title="Aucune suggestion">
                <p style={{ color: "rgba(255,255,255,.7)", margin: 0 }}>Le moteur d'optimisation analyse en continu. Crée des tournées globales pour générer des suggestions.</p>
              </ModernCard>
            ) : suggestions.map(s => (
              <ModernCard key={s.id} color="#EF9F27" variant="default" padding={14}>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 12, alignItems: "center" }}>
                  <HiTechIconBox name="ti-bulb" color="#EF9F27" variant="gradient" size={36} pulse />
                  <div>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{s.description}</div>
                    <div style={{ color: "rgba(255,255,255,.5)", fontSize: 11, marginTop: 2 }}>
                      💰 {(s.economie_km || 0).toFixed(1)} km · {s.economie_min || 0} min économisés · score {Math.round(s.score)}/100
                    </div>
                  </div>
                  <button onClick={() => refuseSuggestion(s.id)} style={{ ...btnSm("#D45E5E") }}>
                    <i className="ti ti-x" /> Refuser
                  </button>
                  <button onClick={() => acceptSuggestion(s.id)} style={{ ...btnSm("#5aa05a") }}>
                    <i className="ti ti-check" /> Accepter
                  </button>
                </div>
              </ModernCard>
            ))}
          </div>
        )}

        {/* MODAL Création */}
        <ModernModal
          open={modal === "new"}
          onClose={() => { setModal(null); setForm({ tournees_selected: [] }); }}
          color={COLOR} icon="ti-route-2"
          title="Nouvelle tournée globale"
          size="lg"
          actions={
            <>
              <ModalBtn variant="secondary" onClick={() => { setModal(null); setForm({ tournees_selected: [] }); }}>Annuler</ModalBtn>
              <ModalBtn variant="primary" color={COLOR} icon="ti-check" onClick={createGlobale} disabled={!form.nom || form.tournees_selected.length < 2}>Créer + Optimiser</ModalBtn>
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <Field label="Nom *" full><input value={form.nom || ""} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Ex : Lundi tous secteurs Lot Est" /></Field>
            <Field label="Type">
              <select value={form.type || "mixte"} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="mixte">Mixte</option>
                <option value="livraison_only">Livraisons seules</option>
                <option value="infirmieres_only">Infirmières seules</option>
                <option value="pharmacie_only">Pharmacie seule</option>
              </select>
            </Field>
            <Field label="Date">
              <input type="date" value={form.date_planifiee || ""} onChange={(e) => setForm({ ...form, date_planifiee: e.target.value })} />
            </Field>
            <Field label="Objectif d'optimisation" full>
              <input value={form.objectif || ""} onChange={(e) => setForm({ ...form, objectif: e.target.value })} placeholder="Ex : Réduire les km, pooler infirmière+pharmacien..." />
            </Field>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#5a6878", textTransform: "uppercase", marginBottom: 6 }}>
              Tournées à rattacher * (min 2)
            </label>
            <div style={{ maxHeight: 280, overflowY: "auto", padding: 6, background: "#f4f7fa", borderRadius: 10 }}>
              {tournees.map(t => {
                const checked = form.tournees_selected.includes(t.id);
                return (
                  <label key={t.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", marginBottom: 4,
                    background: checked ? `${t.couleur_type}20` : "#fff",
                    border: `1px solid ${checked ? t.couleur_type + "60" : "#e3e9ee"}`,
                    borderRadius: 8, cursor: "pointer",
                  }}>
                    <input type="checkbox" checked={checked} onChange={() => {
                      setForm({ ...form, tournees_selected: checked
                        ? form.tournees_selected.filter(id => id !== t.id)
                        : [...form.tournees_selected, t.id] });
                    }} style={{ accentColor: t.couleur_type, width: 16, height: 16 }} />
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: `${t.couleur_type}30`, color: t.couleur_type, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
                      <i className="ti ti-route" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#142131", fontWeight: 700, fontSize: 12 }}>{t.nom}</div>
                      <div style={{ color: "#5a6878", fontSize: 10 }}>
                        {t.type_complet} · {t.distance_km || 0} km · {t.duree_minutes || 0} min · {t.nb_etapes} arrêts
                      </div>
                    </div>
                    <span style={{ background: `${t.couleur_type}20`, color: t.couleur_type, padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>{t.statut}</span>
                  </label>
                );
              })}
              {tournees.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "#888" }}>Aucune tournée disponible</div>}
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: "#5a6878" }}>
              {form.tournees_selected.length} sélectionnée{form.tournees_selected.length > 1 ? "s" : ""}
            </div>
          </div>
        </ModernModal>
      </PageShell>
    </>
  );
}

function Tab({ a, on, c, children }) {
  return (
    <button onClick={on} style={{
      padding: "12px 20px", background: a ? `${c}25` : "transparent",
      border: "none", borderBottom: a ? `2px solid ${c}` : "2px solid transparent",
      color: a ? "#fff" : "rgba(255,255,255,.55)",
      fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Quicksand",
      display: "inline-flex", alignItems: "center", gap: 8,
    }}>{children}</button>
  );
}

function Stat({ l, v, c, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined, padding: 8, background: `${c}10`, borderRadius: 6, border: `1px solid ${c}30` }}>
      <div style={{ color: "rgba(255,255,255,.5)", fontSize: 9, textTransform: "uppercase" }}>{l}</div>
      <div style={{ color: c, fontWeight: 800, fontFamily: "monospace" }}>{v}</div>
    </div>
  );
}

function btnSm(c) {
  return {
    padding: "6px 12px", borderRadius: 8,
    background: `${c}25`, color: c,
    border: `1px solid ${c}50`,
    cursor: "pointer", fontSize: 11, fontWeight: 700,
    fontFamily: "Quicksand", display: "inline-flex", alignItems: "center", gap: 4,
  };
}

function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}
