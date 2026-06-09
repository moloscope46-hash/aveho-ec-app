"use client";
// =============================================================
//  /bilans-sav — Liste + création de bilans SAV (0.62.32)
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn, Modal } from "../ui";
import BackButton from "../components/BackButton";

const STATUT_META = {
  en_cours:   { col: "#185FA5", lbl: "🔧 En cours" },
  termine:    { col: "#EF9F27", lbl: "⏳ À valider" },
  valide_ec:  { col: "#5aa05a", lbl: "✅ Validé" },
  refuse_ec:  { col: "#e35d5b", lbl: "⊘ Refusé" },
};

const RESULT_META = {
  conforme:     { col: "#5aa05a", lbl: "✅ Conforme" },
  reparable:    { col: "#EF9F27", lbl: "🔧 Réparable" },
  non_conforme: { col: "#e35d5b", lbl: "⚠ Non conforme" },
  a_remplacer:  { col: "#c0392b", lbl: "♻ À remplacer" },
};

export default function BilansSAVPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [bilans, setBilans] = useState([]);
  const [savs, setSavs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [filter, setFilter] = useState("tous");
  const [newModal, setNewModal] = useState(false);
  const [form, setForm] = useState({});
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    reload();
  }, [auth.ready, auth.structureId]);

  async function reload() {
    setLoading(true);
    try {
      const r = await supabase.from("bilans_sav").select("*").eq("structure_id", auth.structureId).order("created_at", { ascending: false }).limit(100);
      if (r.error?.code === "42P01") { setTableMissing(true); setLoading(false); return; }
      setBilans(r.data || []);
      // Charge les SAV sans bilan pour le formulaire de création
      const savData = await supabase.from("demandes_internes").select("id, numero, description, materiel_id").eq("structure_id", auth.structureId).eq("type", "sav").order("created_at", { ascending: false }).limit(50);
      setSavs(savData.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function startBilan() {
    setCreating(true);
    try {
      const numero = `BSAV-${Date.now().toString(36).toUpperCase()}`;
      const r = await supabase.from("bilans_sav").insert({
        numero,
        structure_id: auth.structureId,
        sav_id: form.sav_id || null,
        materiel_id: form.materiel_id || null,
        article_id: form.article_id || null,
        technicien_user_id: auth.user?.id,
        technicien_nom: form.technicien_nom || auth.user?.email || "—",
        statut: "en_cours",
        date_debut: new Date().toISOString(),
        points: [
          { n: 1, libelle: "Aspect général", description: "État visuel, propreté, signes d'usure", conforme: null, commentaire: "" },
          { n: 2, libelle: "Fonctionnement principal", description: "Mise en marche, cycles, performance", conforme: null, commentaire: "" },
          { n: 3, libelle: "Sécurité électrique / mécanique", description: "Câbles, fixations, alarmes", conforme: null, commentaire: "" },
          { n: 4, libelle: "Conformité normes", description: "Étiquettes, marquages, mises à jour", conforme: null, commentaire: "" },
          { n: 5, libelle: "Accessoires & consommables", description: "Pièces fournies, niveau, état", conforme: null, commentaire: "" },
        ],
        // 0.62.58 : pièces détachées utilisées pour la réparation (TODO récurrente)
        pieces_detachees: [],          // [{ designation, ref, quantite, prix_unitaire, fournisseur, num_commande }]
        cout_pieces_total: 0,           // total HT calculé
        duree_intervention_min: null,   // durée en minutes
        cout_main_doeuvre: null,        // coût main d'œuvre HT
      }).select().maybeSingle();
      if (r.error) throw r.error;
      // Redirige vers le bilan
      router.push(`/bilan-sav/${r.data.id}`);
    } catch (e) { alert("Erreur : " + e.message); setCreating(false); }
  }

  const filtered = filter === "tous" ? bilans : bilans.filter(b => b.statut === filter);
  const counts = bilans.reduce((acc, b) => { acc[b.statut] = (acc[b.statut] || 0) + 1; return acc; }, {});

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content" style={{ padding: "20px 24px" }}>
        <BackButton />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <PageHead icon="ti-clipboard-check" title="Bilans SAV" subtitle="5 points de contrôle · Photos · Signature" />
          <Btn variant="primary" icon="ti-plus" onClick={() => { setForm({ technicien_nom: auth.user?.email || "" }); setNewModal(true); }} disabled={tableMissing}>Démarrer un bilan</Btn>
        </div>

        {tableMissing && (
          <Panel style={{ marginTop: 12, borderLeft: "4px solid #e35d5b", background: "rgba(227,93,91,.06)" }}>
            <div style={{ color: "#c0392b", fontSize: 13 }}>
              ⚠ Table <code>bilans_sav</code> manquante. Applique <a href="/sql/migration-0.62.32-bilans-sav.sql" target="_blank" style={{ color: "#185FA5", fontWeight: 700 }}>migration-0.62.32-bilans-sav.sql</a>.
            </div>
          </Panel>
        )}

        {/* Filtres statut */}
        <Panel style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <button onClick={() => setFilter("tous")} style={{
              padding: "6px 12px", border: filter === "tous" ? "none" : "1px solid #cfd8e0",
              background: filter === "tous" ? "#185FA5" : "#fff",
              color: filter === "tous" ? "#fff" : "#5a6878",
              borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>Tous ({bilans.length})</button>
            {Object.entries(STATUT_META).map(([k, m]) => {
              const n = counts[k] || 0;
              return (
                <button key={k} onClick={() => setFilter(k)} style={{
                  padding: "6px 12px", border: filter === k ? "none" : `1px solid ${m.col}40`,
                  background: filter === k ? m.col : "#fff",
                  color: filter === k ? "#fff" : m.col,
                  borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}>{m.lbl} ({n})</button>
              );
            })}
          </div>
        </Panel>

        {/* Liste */}
        <Panel style={{ marginTop: 12 }}>
          {loading ? <div style={{ padding: 30, textAlign: "center" }}>Chargement…</div>
            : filtered.length === 0 && !tableMissing ? (
            <div style={{ padding: 40, textAlign: "center", color: "#8a98a8" }}>
              <i className="ti ti-clipboard-off" style={{ fontSize: 40, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
              Aucun bilan SAV pour ce filtre.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filtered.map(b => {
                const sM = STATUT_META[b.statut] || { col: "#8a98a8", lbl: b.statut };
                const rM = RESULT_META[b.resultat] || null;
                return (
                  <div key={b.id} onClick={() => router.push(`/bilan-sav/${b.id}`)} style={{
                    background: "#fff", border: "1px solid #e3e9ee",
                    borderLeft: `4px solid ${sM.col}`,
                    borderRadius: 8, padding: 12,
                    cursor: "pointer",
                    display: "grid", gridTemplateColumns: "140px 1fr 100px 130px 110px", gap: 10, alignItems: "center",
                  }}>
                    <div style={{ fontFamily: "Consolas,monospace", fontSize: 12, fontWeight: 700, color: "#142131" }}>{b.numero}</div>
                    <div>
                      <div style={{ fontSize: 12.5, color: "#142131" }}>
                        🔧 <b>{b.technicien_nom || "—"}</b>
                      </div>
                      {b.diagnostic && <div style={{ fontSize: 11, color: "#5a6878", fontStyle: "italic", marginTop: 2 }}>{b.diagnostic.substring(0, 80)}{b.diagnostic.length > 80 ? "…" : ""}</div>}
                      {b.motif_refus && <div style={{ fontSize: 11, color: "#e35d5b", fontStyle: "italic", marginTop: 2 }}>⊘ {b.motif_refus.substring(0, 80)}</div>}
                    </div>
                    <div style={{ fontSize: 11, color: "#5a6878" }}>{b.date_debut ? new Date(b.date_debut).toLocaleDateString("fr-FR") : "—"}</div>
                    <span style={{ padding: "3px 8px", borderRadius: 6, background: `${sM.col}1A`, color: sM.col, border: `1px solid ${sM.col}40`, fontSize: 11, fontWeight: 700, textAlign: "center" }}>{sM.lbl}</span>
                    {rM ? (
                      <span style={{ padding: "3px 8px", borderRadius: 6, background: `${rM.col}1A`, color: rM.col, border: `1px solid ${rM.col}40`, fontSize: 10.5, fontWeight: 700, textAlign: "center" }}>{rM.lbl}</span>
                    ) : <span style={{ fontSize: 10, color: "#8a98a8" }}>—</span>}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Modal création */}
        {newModal && (
          <Modal open={newModal} onClose={() => setNewModal(false)} kind="patient"
            title="Démarrer un nouveau bilan SAV"
            actions={
              <>
                <Btn variant="ghost" onClick={() => setNewModal(false)}>Annuler</Btn>
                <Btn variant="primary" icon="ti-clipboard-check" onClick={startBilan} disabled={creating}>{creating ? "..." : "Démarrer"}</Btn>
              </>
            }>
            <label style={{ fontSize: 12, color: "#5a6878" }}><b>Technicien</b>
              <input value={form.technicien_nom || ""} onChange={(e) => setForm({ ...form, technicien_nom: e.target.value })} placeholder="Nom du technicien" style={{ width: "100%", padding: "8px 10px", marginTop: 4, border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 13 }} />
            </label>
            <label style={{ fontSize: 12, color: "#5a6878", display: "block", marginTop: 12 }}><b>SAV d'origine (optionnel)</b>
              <select value={form.sav_id || ""} onChange={(e) => setForm({ ...form, sav_id: e.target.value || null })} style={{ width: "100%", padding: "8px 10px", marginTop: 4, border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 13 }}>
                <option value="">— Aucun (bilan libre) —</option>
                {savs.map(s => <option key={s.id} value={s.id}>{s.numero} — {(s.description || "").substring(0, 50)}</option>)}
              </select>
            </label>
            <div style={{ marginTop: 14, padding: 10, background: "rgba(94,160,90,.08)", borderLeft: "3px solid #5aa05a", borderRadius: 6, fontSize: 12, color: "#5a6878" }}>
              ✓ Un bilan sera créé en statut <b>en_cours</b> avec les <b>5 points de contrôle standards</b>. Tu seras redirigé vers la page d'exécution pour remplir les points + photos + signature.
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
