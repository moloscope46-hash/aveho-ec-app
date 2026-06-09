"use client";
export const dynamic = "force-dynamic";
// =============================================================
//  /infirmieres/bsi — Bilans Soins Infirmiers (DSI/BSI/BSA)
//  Démarche de soins selon 14 besoins Virginia Henderson
// =============================================================
import { useEffect, useState, useMemo } from "react";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { PageShell, ModernCard, ModernModal, ModalBtn, HiTechIconBox } from "../../components/ui-premium";
import PermissionGate from "../../components/PermissionGate";

const COLOR = "#5e4a8c";

const TYPES_BILAN = {
  BSI: { c: "#5e4a8c", l: "BSI (Démarche initiale)",     ic: "ti-clipboard-check", tarif: 25 },
  BSA: { c: "#7a6fb0", l: "BSA (Bilan actif)",            ic: "ti-refresh",         tarif: 12 },
  BSB: { c: "#C9867F", l: "BSB (Bilan bilanté)",          ic: "ti-clipboard-data",  tarif: 14 },
};

// 14 Besoins fondamentaux selon Virginia Henderson
const AXES_HENDERSON = [
  { k: "respirer",       l: "Respirer",                   ic: "ti-lungs" },
  { k: "boire_manger",   l: "Boire et manger",            ic: "ti-glass-full" },
  { k: "eliminer",       l: "Éliminer",                   ic: "ti-droplet" },
  { k: "mouvoir",        l: "Se mouvoir, bonne posture",  ic: "ti-walk" },
  { k: "dormir",         l: "Dormir, se reposer",         ic: "ti-zzz" },
  { k: "vetir",          l: "Se vêtir, se dévêtir",       ic: "ti-shirt" },
  { k: "temperature",    l: "Maintenir température",      ic: "ti-temperature" },
  { k: "hygiene",        l: "Être propre, soigné",        ic: "ti-bath" },
  { k: "securite",       l: "Éviter les dangers",         ic: "ti-shield" },
  { k: "communiquer",    l: "Communiquer",                ic: "ti-message" },
  { k: "valeurs",        l: "Agir selon ses valeurs",     ic: "ti-heart" },
  { k: "occuper",        l: "S'occuper, se réaliser",     ic: "ti-briefcase" },
  { k: "apprendre",      l: "Apprendre",                  ic: "ti-school" },
  { k: "recreatives",    l: "Activités récréatives",      ic: "ti-music" },
];

const NIVEAUX_DEPENDANCE = {
  0: { l: "Autonome",      c: "#5aa05a" },
  1: { l: "Aide minime",   c: "#7CC8C8" },
  2: { l: "Aide partielle",c: "#EF9F27" },
  3: { l: "Aide totale",   c: "#D45E5E" },
  4: { l: "Suppléance",    c: "#142131" },
};

export default function BSIPage() {
  const supabase = createClient();
  const auth = useAuth();
  const [bilans, setBilans] = useState([]);
  const [patients, setPatients] = useState([]);
  const [infirmieres, setInfirmieres] = useState([]);
  const [tableMissing, setTableMissing] = useState(false);
  const [search, setSearch] = useState("");
  const [fType, setFType] = useState("");
  const [modal, setModal] = useState(null);
  const [bilan, setBilan] = useState({});
  const [axes, setAxes] = useState({});  // {axe_key: {niveau, observations, actions, objectifs}}

  useEffect(() => { if (auth.ready) reload(); }, [auth.ready]);

  async function reload() {
    const r = await supabase.from("bilans_bsi").select("*").eq("structure_id", auth.structureId).order("date_bilan", { ascending: false });
    if (r.error?.code === "42P01") { setTableMissing(true); return; }
    setBilans(r.data || []);

    const [pa, i] = await Promise.all([
      supabase.from("patients").select("id, nom, prenom, date_naissance").eq("structure_id", auth.structureId).order("nom"),
      supabase.from("infirmieres").select("id, nom, prenom").eq("structure_id", auth.structureId),
    ]);
    setPatients(pa.data || []);
    setInfirmieres(i.data || []);
  }

  function openNew() {
    setBilan({
      type_bilan: "BSI",
      date_bilan: new Date().toISOString().substring(0, 10),
      statut: "brouillon",
    });
    setAxes(AXES_HENDERSON.reduce((acc, a) => ({ ...acc, [a.k]: { niveau: 0 } }), {}));
    setModal("new");
  }

  async function openEdit(b) {
    setBilan(b);
    // Charger les axes
    const r = await supabase.from("bilans_bsi_axes").select("*").eq("bilan_id", b.id);
    const map = {};
    AXES_HENDERSON.forEach(a => { map[a.k] = { niveau: 0 }; });
    (r.data || []).forEach(ax => {
      map[ax.axe] = { niveau: ax.niveau_dependance, observations: ax.observations, actions: ax.actions_ide, objectifs: ax.objectifs };
    });
    setAxes(map);
    setModal("new");
  }

  async function saveBSI() {
    const tarif = TYPES_BILAN[bilan.type_bilan]?.tarif || 0;
    const payload = {
      structure_id: auth.structureId,
      patient_id: bilan.patient_id,
      infirmiere_id: bilan.infirmiere_id,
      type_bilan: bilan.type_bilan,
      numero: bilan.numero || `BSI-${Date.now()}`,
      date_bilan: bilan.date_bilan,
      age_patient: bilan.age_patient ? parseInt(bilan.age_patient) : null,
      gir_evalue: bilan.gir_evalue ? parseInt(bilan.gir_evalue) : null,
      poids_kg: bilan.poids_kg ? parseFloat(bilan.poids_kg) : null,
      taille_cm: bilan.taille_cm ? parseInt(bilan.taille_cm) : null,
      autonomie_globale: bilan.autonomie_globale,
      douleur_evaluation_eva: bilan.douleur_evaluation_eva ? parseInt(bilan.douleur_evaluation_eva) : null,
      risque_chute: !!bilan.risque_chute,
      risque_escarres: !!bilan.risque_escarres,
      risque_denutrition: !!bilan.risque_denutrition,
      risque_deshydratation: !!bilan.risque_deshydratation,
      risque_iatrogene: !!bilan.risque_iatrogene,
      risque_isolement: !!bilan.risque_isolement,
      diagnostic_ide_principal: bilan.diagnostic_ide_principal,
      objectifs_court_terme: bilan.objectifs_court_terme,
      conclusion: bilan.conclusion,
      cote_bsi: tarif,
      statut: bilan.statut || "brouillon",
    };
    let bid = bilan.id;
    if (bid) {
      await supabase.from("bilans_bsi").update(payload).eq("id", bid);
    } else {
      const r = await supabase.from("bilans_bsi").insert(payload).select().single();
      bid = r.data?.id;
    }

    // Sauvegarder les axes
    if (bid) {
      await supabase.from("bilans_bsi_axes").delete().eq("bilan_id", bid);
      const axePayloads = AXES_HENDERSON.map(a => {
        const ax = axes[a.k] || {};
        return {
          structure_id: auth.structureId,
          bilan_id: bid,
          axe: a.k,
          niveau_dependance: ax.niveau || 0,
          observations: ax.observations,
          actions_ide: ax.actions,
          objectifs: ax.objectifs,
        };
      });
      await supabase.from("bilans_bsi_axes").insert(axePayloads);
    }

    setModal(null); setBilan({}); setAxes({}); reload();
  }

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return bilans.filter(b => {
      if (s && !(`${b.numero || ""} ${b.diagnostic_ide_principal || ""}`).toLowerCase().includes(s)) return false;
      if (fType && b.type_bilan !== fType) return false;
      return true;
    });
  }, [bilans, search, fType]);

  if (tableMissing) {
    return (
      <>
        <TopBar />
        <PageShell color={COLOR} icon="ti-clipboard-check" title="BSI / DSI" subtitle="Module non installé">
          <ModernCard color={COLOR} variant="accent" icon="ti-alert-triangle" title="Table manquante">
            <p style={{ color: "rgba(255,255,255,.8)" }}>Exécute <strong>aveho-MODULE-infirmieres-erp.sql</strong>.</p>
          </ModernCard>
        </PageShell>
      </>
    );
  }

  return (
    <PermissionGate require="bsi_lire">
      <TopBar />
      <PageShell
        color={COLOR}
        icon="ti-clipboard-check"
        title="Bilans de Soins Infirmiers"
        subtitle="Démarche de soins (BSI / BSA / BSB) selon 14 besoins Henderson"
        badge={`${bilans.length} bilans`}
        actions={
          <button onClick={openNew} style={btnPrim}>
            <i className="ti ti-plus" /> Nouveau BSI
          </button>
        }
      >
        <ModernCard color={COLOR} variant="default" padding={14} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input placeholder="Numéro, diagnostic..." value={search} onChange={(e) => setSearch(e.target.value)} style={inp} />
            <select value={fType} onChange={(e) => setFType(e.target.value)} style={inp}>
              <option value="">Tous types</option>
              {Object.entries(TYPES_BILAN).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
            </select>
          </div>
        </ModernCard>

        {filtered.length === 0 ? (
          <ModernCard color={COLOR} variant="accent" icon="ti-info-circle" title="Aucun BSI">
            <p style={{ color: "rgba(255,255,255,.7)", margin: 0 }}>Crée un premier BSI.</p>
          </ModernCard>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 12 }}>
            {filtered.map(b => {
              const t = TYPES_BILAN[b.type_bilan] || TYPES_BILAN.BSI;
              const pa = patients.find(p => p.id === b.patient_id);
              const i = infirmieres.find(x => x.id === b.infirmiere_id);
              const risques = [
                b.risque_chute && "chute",
                b.risque_escarres && "escarres",
                b.risque_denutrition && "dénutrition",
                b.risque_deshydratation && "déshydratation",
                b.risque_iatrogene && "iatrogène",
                b.risque_isolement && "isolement",
              ].filter(Boolean);
              return (
                <ModernCard key={b.id} color={t.c} variant="default" padding={0} hoverable onClick={() => openEdit(b)}>
                  <div style={{ padding: "12px 14px", borderBottom: `1px solid ${t.c}30`, display: "flex", alignItems: "center", gap: 10 }}>
                    <HiTechIconBox name={t.ic} color={t.c} variant="gradient" size={36} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>{b.numero}</div>
                      <div style={{ color: "rgba(255,255,255,.55)", fontSize: 11 }}>{t.l} · {pa?.nom} {pa?.prenom}</div>
                    </div>
                    <span style={{ background: `${t.c}30`, color: t.c, padding: "3px 8px", borderRadius: 8, fontSize: 10, fontWeight: 800 }}>{t.tarif}€</span>
                  </div>
                  <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
                    <Detail l="IDE" v={i ? `${i.nom} ${i.prenom}` : "—"} />
                    <Detail l="Date" v={b.date_bilan ? new Date(b.date_bilan).toLocaleDateString("fr-FR") : "—"} />
                    {b.gir_evalue && <Detail l="GIR" v={b.gir_evalue} />}
                    {b.douleur_evaluation_eva !== null && <Detail l="EVA" v={`${b.douleur_evaluation_eva}/10`} />}
                  </div>
                  {risques.length > 0 && (
                    <div style={{ padding: "8px 12px", borderTop: `1px solid ${t.c}20`, display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {risques.map(r => (
                        <span key={r} style={{ background: "rgba(212,94,94,.20)", color: "#D45E5E", border: "1px solid #D45E5E50", padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>
                          <i className="ti ti-alert-triangle" /> {r}
                        </span>
                      ))}
                    </div>
                  )}
                </ModernCard>
              );
            })}
          </div>
        )}

        {/* MODAL création/édition */}
        <ModernModal
          open={modal === "new"}
          onClose={() => { setModal(null); setBilan({}); setAxes({}); }}
          color={COLOR} icon="ti-clipboard-check"
          title={bilan.id ? "Modifier BSI" : "Nouveau BSI"}
          subtitle="14 besoins fondamentaux Virginia Henderson"
          size="xl"
          actions={
            <>
              <ModalBtn variant="secondary" onClick={() => { setModal(null); setBilan({}); setAxes({}); }}>Annuler</ModalBtn>
              <ModalBtn variant="primary" color={COLOR} icon="ti-check" onClick={saveBSI} disabled={!bilan.patient_id || !bilan.infirmiere_id}>
                Enregistrer
              </ModalBtn>
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 18 }}>
            <Field label="Type *">
              <select value={bilan.type_bilan || "BSI"} onChange={(e) => setBilan({ ...bilan, type_bilan: e.target.value })}>
                {Object.entries(TYPES_BILAN).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
              </select>
            </Field>
            <Field label="Patient *">
              <select value={bilan.patient_id || ""} onChange={(e) => setBilan({ ...bilan, patient_id: e.target.value })}>
                <option value="">—</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
              </select>
            </Field>
            <Field label="IDE *">
              <select value={bilan.infirmiere_id || ""} onChange={(e) => setBilan({ ...bilan, infirmiere_id: e.target.value })}>
                <option value="">—</option>
                {infirmieres.map(i => <option key={i.id} value={i.id}>{i.nom} {i.prenom}</option>)}
              </select>
            </Field>
            <Field label="Date"><input type="date" value={bilan.date_bilan || ""} onChange={(e) => setBilan({ ...bilan, date_bilan: e.target.value })} /></Field>
            <Field label="Âge"><input type="number" value={bilan.age_patient || ""} onChange={(e) => setBilan({ ...bilan, age_patient: e.target.value })} /></Field>
            <Field label="GIR (1-6)">
              <select value={bilan.gir_evalue || ""} onChange={(e) => setBilan({ ...bilan, gir_evalue: e.target.value })}>
                <option value="">—</option>
                {[1,2,3,4,5,6].map(g => <option key={g} value={g}>GIR {g}</option>)}
              </select>
            </Field>
            <Field label="Poids (kg)"><input type="number" step="0.1" value={bilan.poids_kg || ""} onChange={(e) => setBilan({ ...bilan, poids_kg: e.target.value })} /></Field>
            <Field label="Taille (cm)"><input type="number" value={bilan.taille_cm || ""} onChange={(e) => setBilan({ ...bilan, taille_cm: e.target.value })} /></Field>
            <Field label="EVA douleur (0-10)"><input type="number" min={0} max={10} value={bilan.douleur_evaluation_eva || ""} onChange={(e) => setBilan({ ...bilan, douleur_evaluation_eva: e.target.value })} /></Field>
          </div>

          {/* Risques détectés */}
          <div style={{ marginBottom: 18, padding: 12, background: "#fff5f0", borderRadius: 10, border: "1px solid #ffd9c5" }}>
            <h4 style={{ margin: "0 0 8px", color: "#D45E5E", fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>
              <i className="ti ti-alert-triangle" /> Risques détectés
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {[
                { k: "risque_chute", l: "Chute" },
                { k: "risque_escarres", l: "Escarres" },
                { k: "risque_denutrition", l: "Dénutrition" },
                { k: "risque_deshydratation", l: "Déshydratation" },
                { k: "risque_iatrogene", l: "Iatrogène" },
                { k: "risque_isolement", l: "Isolement" },
              ].map(r => (
                <label key={r.k} style={{ display: "flex", alignItems: "center", gap: 6, padding: 6, background: bilan[r.k] ? "#ffe4d6" : "#fff", borderRadius: 6, fontSize: 12, color: "#142131", cursor: "pointer" }}>
                  <input type="checkbox" checked={!!bilan[r.k]} onChange={(e) => setBilan({ ...bilan, [r.k]: e.target.checked })} style={{ accentColor: "#D45E5E" }} />
                  {r.l}
                </label>
              ))}
            </div>
          </div>

          {/* 14 axes Henderson */}
          <h4 style={{ color: "#142131", margin: "0 0 10px", fontSize: 13, fontWeight: 800 }}>
            <i className="ti ti-list-check" /> Évaluation des 14 besoins fondamentaux (Virginia Henderson)
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
            {AXES_HENDERSON.map(a => {
              const ax = axes[a.k] || { niveau: 0 };
              const nCfg = NIVEAUX_DEPENDANCE[ax.niveau] || NIVEAUX_DEPENDANCE[0];
              return (
                <div key={a.k} style={{ padding: 10, background: "#f4f7fa", borderRadius: 8, border: "1px solid #e3e9ee" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center" }}>
                    <i className={`ti ${a.ic}`} style={{ fontSize: 20, color: COLOR }} />
                    <div style={{ color: "#142131", fontWeight: 600, fontSize: 12 }}>{a.l}</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {Object.entries(NIVEAUX_DEPENDANCE).map(([n, cfg]) => (
                        <button key={n} onClick={() => setAxes({ ...axes, [a.k]: { ...ax, niveau: parseInt(n) } })} style={{
                          padding: "4px 10px",
                          background: ax.niveau === parseInt(n) ? cfg.c : "transparent",
                          color: ax.niveau === parseInt(n) ? "#fff" : cfg.c,
                          border: `1px solid ${cfg.c}50`,
                          borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                          fontFamily: "Quicksand",
                        }} title={cfg.l}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  {ax.niveau > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <input value={ax.observations || ""} onChange={(e) => setAxes({ ...axes, [a.k]: { ...ax, observations: e.target.value } })}
                        placeholder="Observations / actions IDE..." style={{ width: "100%", padding: "4px 8px", fontSize: 11, borderRadius: 6, border: "1px solid #d3dce5" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Field label="Diagnostic IDE principal" full>
            <textarea value={bilan.diagnostic_ide_principal || ""} onChange={(e) => setBilan({ ...bilan, diagnostic_ide_principal: e.target.value })} rows={2} />
          </Field>
          <Field label="Objectifs court terme" full>
            <textarea value={bilan.objectifs_court_terme || ""} onChange={(e) => setBilan({ ...bilan, objectifs_court_terme: e.target.value })} rows={2} />
          </Field>
          <Field label="Conclusion" full>
            <textarea value={bilan.conclusion || ""} onChange={(e) => setBilan({ ...bilan, conclusion: e.target.value })} rows={2} />
          </Field>
        </ModernModal>
      </PageShell>
    </PermissionGate>
  );
}

const btnPrim = { padding: "10px 18px", borderRadius: 10, background: `linear-gradient(135deg, ${COLOR}, ${COLOR}cc)`, color: "#fff", border: "none", fontFamily: "Quicksand", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: `0 4px 12px ${COLOR}50` };
const inp = { padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", color: "#fff", border: "1px solid rgba(255,255,255,.15)", fontFamily: "Quicksand", fontSize: 13, minWidth: 180 };

function Detail({ l, v }) {
  return <div><div style={{ color: "rgba(255,255,255,.4)", fontSize: 9, textTransform: "uppercase" }}>{l}</div><div style={{ color: "#fff" }}>{v}</div></div>;
}
function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined, marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}
