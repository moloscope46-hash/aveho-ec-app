"use client";
// =============================================================
//  /magasin/recyclage — Circuit retour + reconditionnement + revente (0.62.63)
// =============================================================
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn, Modal } from "../../ui";
import { EmptyState } from "../../components/PremiumKpi";
import PageToolbar from "../../components/PageToolbar";
import BackButton from "../../components/BackButton";

const STATUTS_RETOUR = [
  { v: "recu", l: "📦 Reçu", c: "#185FA5" },
  { v: "en_reconditionnement", l: "🔧 En reconditionnement", c: "#EF9F27" },
  { v: "reconditionne", l: "✨ Reconditionné", c: "#5aa05a" },
  { v: "en_revente", l: "🏷 En revente", c: "#7a6fb0" },
  { v: "vendu", l: "💰 Vendu", c: "#5e4a8c" },
  { v: "detruit", l: "🗑 Détruit", c: "#8a98a8" },
];

const ETATS = [
  { v: "excellent", l: "Excellent", c: "#5aa05a" },
  { v: "bon", l: "Bon", c: "#185FA5" },
  { v: "moyen", l: "Moyen", c: "#EF9F27" },
  { v: "mauvais", l: "Mauvais", c: "#e35d5b" },
  { v: "epave", l: "Épave", c: "#8a98a8" },
];

const MOTIFS = [
  { v: "fin_traitement", l: "Fin de traitement" },
  { v: "changement_pdc", l: "Changement prise en charge" },
  { v: "panne", l: "Panne" },
  { v: "deces", l: "Décès patient" },
  { v: "autre", l: "Autre" },
];

export default function RecyclagePage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  const [search, setSearch] = useState("");
  const [fStatut, setFStatut] = useState("");
  const [fEtat, setFEtat] = useState("");

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (auth.ready) reload(); }, [auth.ready]);

  async function reload() {
    setLoading(true);
    try {
      const r = await supabase.from("materiels_retour")
        .select("*")
        .order("date_retour", { ascending: false })
        .limit(200);
      if (r.error?.code === "42P01") setTableMissing(true);
      setRows(r.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const filtered = useMemo(() => rows.filter(r => {
    if (fStatut && r.statut !== fStatut) return false;
    if (fEtat && r.etat_visuel !== fEtat) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = `${r.numero || ""} ${r.notes || ""} ${r.motif || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [rows, search, fStatut, fEtat]);

  const stats = useMemo(() => {
    const s = {};
    STATUTS_RETOUR.forEach(st => s[st.v] = 0);
    rows.forEach(r => { if (s[r.statut] != null) s[r.statut]++; });
    return s;
  }, [rows]);

  function openNew() {
    setForm({
      motif: "fin_traitement",
      etat_visuel: "bon",
      fonctionnel: true,
      necessite_reconditionnement: false,
      necessite_destruction: false,
      date_retour: new Date().toISOString().split("T")[0],
    });
    setModal("new");
  }

  async function save() {
    setBusy(true);
    try {
      const numero = `RET-${Date.now().toString(36).toUpperCase()}`;
      await supabase.from("materiels_retour").insert({
        numero,
        structure_id: auth.structureId,
        date_retour: form.date_retour,
        motif: form.motif,
        etat_visuel: form.etat_visuel,
        fonctionnel: form.fonctionnel,
        necessite_reconditionnement: form.necessite_reconditionnement,
        necessite_destruction: form.necessite_destruction,
        notes: form.notes,
        statut: form.necessite_destruction ? "detruit" : "recu",
        recu_par: auth.user?.id,
      });
      setModal(null);
      await reload();
    } catch (e) { alert("Erreur : " + e.message); }
    setBusy(false);
  }

  async function avancerStatut(r) {
    const flow = {
      recu: r.necessite_reconditionnement ? "en_reconditionnement" : "reconditionne",
      en_reconditionnement: "reconditionne",
      reconditionne: "en_revente",
      en_revente: "vendu",
    };
    const next = flow[r.statut];
    if (!next) return;
    await supabase.from("materiels_retour").update({ statut: next }).eq("id", r.id);
    await reload();
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content" style={{ padding: "20px 24px", maxWidth: 1300 }}>
        <BackButton />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <PageHead icon="ti-recycle" title="Recyclage & valorisation" subtitle="Circuit retour → reconditionnement → revente" color="#5aa05a" />
          <Btn variant="primary" icon="ti-plus" onClick={openNew}>Enregistrer un retour</Btn>
        </div>

        {tableMissing && (
          <Panel style={{ borderLeft: "4px solid #e35d5b", background: "rgba(227,93,91,.06)" }}>
            <div style={{ color: "#c0392b", fontSize: 13 }}>⚠ Applique <code>migration-0.62.63-pack-modules-magasin-avances.sql</code></div>
          </Panel>
        )}

        {/* KpiRow workflow */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginTop: 12, marginBottom: 12 }}>
          {STATUTS_RETOUR.map(s => (
            <button key={s.v} onClick={() => setFStatut(fStatut === s.v ? "" : s.v)} style={{
              padding: "12px 14px",
              background: fStatut === s.v ? `${s.c}1A` : "#fff",
              border: `1px solid ${fStatut === s.v ? s.c : "#eef1f4"}`,
              borderLeft: `4px solid ${s.c}`,
              borderRadius: 12,
              cursor: "pointer", textAlign: "left",
              transition: "all 200ms",
              transform: fStatut === s.v ? "scale(1.02)" : "scale(1)",
              fontFamily: "inherit",
            }}>
              <div style={{ fontSize: 11, color: s.c, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{s.l}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#142131", marginTop: 4 }}>{stats[s.v] || 0}</div>
            </button>
          ))}
        </div>

        <PageToolbar
          search={search} onSearch={setSearch}
          placeholder="Numéro, motif, notes..."
          totalCount={rows.length} filteredCount={filtered.length}
          accentColor="#5aa05a"
          filters={[
            { key: "etat", label: "État", value: fEtat, onChange: setFEtat,
              options: ETATS.map(e => ({ v: e.v, l: e.l })) },
          ]}
          onReset={() => { setSearch(""); setFStatut(""); setFEtat(""); }}
        />

        {loading ? (
          <Panel><div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>Chargement…</div></Panel>
        ) : filtered.length === 0 ? (
          <EmptyState icon="ti-recycle-off" title="Aucun retour" desc="Enregistre le premier retour matériel." />
        ) : (
          <div className="av-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
            {filtered.map(r => {
              const statut = STATUTS_RETOUR.find(s => s.v === r.statut) || STATUTS_RETOUR[0];
              const etat = ETATS.find(e => e.v === r.etat_visuel) || ETATS[1];
              return (
                <div key={r.id} data-3d="true" style={{
                  background: "#fff", border: "1px solid #eef1f4",
                  borderLeft: `4px solid ${statut.c}`,
                  borderRadius: 12, padding: 14,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <span style={{ fontFamily: "Consolas, monospace", fontSize: 11.5, color: "#8a98a8" }}>{r.numero}</span>
                    <span style={{
                      background: `${statut.c}1A`, color: statut.c,
                      padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                    }}>
                      {statut.l}
                    </span>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <span style={{
                      background: `${etat.c}1A`, color: etat.c,
                      padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                    }}>État : {etat.l}</span>
                    {r.fonctionnel != null && (
                      <span style={{ marginLeft: 6, color: r.fonctionnel ? "#5aa05a" : "#e35d5b", fontSize: 12, fontWeight: 600 }}>
                        {r.fonctionnel ? "✓ Fonctionnel" : "✗ HS"}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#5a6878", marginTop: 4 }}>
                    <i className="ti ti-calendar" /> {new Date(r.date_retour).toLocaleDateString("fr-FR")}
                    {" · "}
                    {MOTIFS.find(m => m.v === r.motif)?.l || r.motif}
                  </div>
                  {r.notes && <div style={{ fontSize: 11.5, color: "#8a98a8", marginTop: 4 }}>{r.notes}</div>}
                  {r.statut !== "vendu" && r.statut !== "detruit" && (
                    <button onClick={() => avancerStatut(r)} style={{
                      marginTop: 10, width: "100%",
                      background: `linear-gradient(135deg, ${statut.c}, ${statut.c}dd)`,
                      color: "#fff", border: "none", padding: "7px 12px",
                      borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    }}>
                      <i className="ti ti-arrow-right" /> Avancer au statut suivant
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Modal open={modal === "new"} onClose={() => setModal(null)} title="Nouveau retour matériel" kind="default" size="md"
          footer={<>
            <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
            <Btn variant="primary" onClick={save} disabled={busy}>{busy ? "Enregistrement..." : "Enregistrer"}</Btn>
          </>}>
          <div style={{ display: "grid", gap: 10 }}>
            <label>Date retour
              <input type="date" value={form.date_retour || ""} onChange={(e) => setForm({ ...form, date_retour: e.target.value })} style={inputStyle()} />
            </label>
            <label>Motif
              <select value={form.motif || ""} onChange={(e) => setForm({ ...form, motif: e.target.value })} style={inputStyle()}>
                {MOTIFS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
            </label>
            <label>État visuel
              <select value={form.etat_visuel || ""} onChange={(e) => setForm({ ...form, etat_visuel: e.target.value })} style={inputStyle()}>
                {ETATS.map(e => <option key={e.v} value={e.v}>{e.l}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={!!form.fonctionnel} onChange={(e) => setForm({ ...form, fonctionnel: e.target.checked })} />
              <span>Fonctionnel</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={!!form.necessite_reconditionnement} onChange={(e) => setForm({ ...form, necessite_reconditionnement: e.target.checked })} />
              <span>Nécessite reconditionnement</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, background: form.necessite_destruction ? "rgba(227,93,91,.1)" : "#f4f7fa", borderRadius: 6 }}>
              <input type="checkbox" checked={!!form.necessite_destruction} onChange={(e) => setForm({ ...form, necessite_destruction: e.target.checked })} />
              <span style={{ color: form.necessite_destruction ? "#e35d5b" : "#5a6878", fontWeight: 600 }}>🗑 Destruction immédiate (épave)</span>
            </label>
            <label>Notes <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={inputStyle()} /></label>
          </div>
        </Modal>
      </div>
    </div>
  );
}

function inputStyle() {
  return { width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 };
}
