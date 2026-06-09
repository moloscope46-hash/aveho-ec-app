"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { fmtDate } from "../../lib/format";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg } from "../ui";
import { KpiRow } from "../kpis";

const STATUTS = ["Demandé", "Validé", "Reçu"];
const MOTIFS = ["Réapprovisionnement", "Retour", "Prêt", "Régularisation"];
const next = (s) => STATUTS[STATUTS.indexOf(s) + 1] || null;
const stClass = (s) => s === "Reçu" ? "s-livree" : s === "Validé" ? "s-validee" : "s-encours";

export default function Transferts() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refs, setRefs] = useState({ magasins: [], depots: [], zones: [], chambres: [], articles: [], materiels: [] });
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ motif: "Réapprovisionnement", contenu: "article", quantite: 1 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    const { data } = await supabase.from("transferts").select("*").order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  }
  async function loadRefs() {
    const [mg, dp, zn, pa, ar, ma] = await Promise.all([
      supabase.from("magasins").select("id,nom"),
      supabase.from("depots").select("id,nom"),
      supabase.from("zones").select("id,nom"),
      supabase.from("patients").select("id,nom,prenom,chambre"),
      supabase.from("articles").select("id,libelle"),
      supabase.from("materiels").select("id,libelle,num_serie"),
    ]);
    setRefs({
      magasins: (mg.data || []).map((x) => ({ value: x.id, label: x.nom })),
      depots: (dp.data || []).map((x) => ({ value: x.id, label: x.nom })),
      zones: (zn.data || []).map((x) => ({ value: x.id, label: x.nom })),
      chambres: (pa.data || []).map((x) => ({ value: x.id, label: `Ch. ${x.chambre || "?"} — ${x.nom} ${x.prenom || ""}` })),
      articles: (ar.data || []).map((x) => ({ value: x.id, label: x.libelle })),
      materiels: (ma.data || []).map((x) => ({ value: x.id, label: `${x.libelle}${x.num_serie ? ` (${x.num_serie})` : ""}` })),
    });
  }
  useEffect(() => { if (auth.ready) { load(); loadRefs(); } }, [auth.ready]);

  // options d'emplacement selon le type choisi
  const locOptions = (type) => ({
    magasin: refs.magasins, depot: refs.depots, zone: refs.zones, chambre: refs.chambres,
  }[type] || []);
  const locLabel = (type, id) => (locOptions(type).find((o) => o.value === id)?.label) || "—";

  async function save() {
    setErr("");
    if (!form.src_type || !form.src_id) { setErr("Source incomplète."); return; }
    if (!form.dst_type || !form.dst_id) { setErr("Destination incomplète."); return; }
    const item = form.contenu === "article" ? form.article_id : form.materiel_id;
    if (!item) { setErr("Sélectionnez l'article ou le matériel à transférer."); return; }
    setBusy(true);
    try {
      const libelle = form.contenu === "article"
        ? refs.articles.find((a) => a.value === form.article_id)?.label
        : refs.materiels.find((m) => m.value === form.materiel_id)?.label;
      const numero = "TRF-" + Math.floor(1000 + Math.random() * 9000);
      const { error } = await supabase.from("transferts").insert({
        structure_id: auth.structureId, numero, motif: form.motif, statut: "Demandé",
        src_type: form.src_type, src_id: form.src_id, src_label: locLabel(form.src_type, form.src_id),
        dst_type: form.dst_type, dst_id: form.dst_id, dst_label: locLabel(form.dst_type, form.dst_id),
        contenu: form.contenu, article_id: form.contenu === "article" ? form.article_id : null,
        materiel_id: form.contenu === "materiel" ? form.materiel_id : null,
        libelle, quantite: form.contenu === "article" ? Number(form.quantite || 1) : 1,
        created_by: auth.user.id,
      });
      if (error) throw error;
      setModal(false); setForm({ motif: "Réapprovisionnement", contenu: "article", quantite: 1 }); await load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function advance(r) {
    const n = next(r.statut); if (!n) return;
    await supabase.from("transferts").update({ statut: n }).eq("id", r.id);
    await load();
  }

  if (!auth.ready) return null;

  const TYPES = [
    { value: "magasin", label: "Magasin" },
    { value: "depot", label: "Dépôt" },
    { value: "zone", label: "Zone" },
    { value: "chambre", label: "Chambre (patient)" },
  ];

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead small title="Transferts de stock" sub="Magasin ↔ dépôt déporté · chambre ↔ dépôt — suivi par statut" />
        <KpiRow tiles={[
          { label: "Transferts", value: rows.length, icon: "ti-transfer", color: "#7a6fb0" },
          { label: "Demandés", value: rows.filter((r) => r.statut === "Demandé").length, icon: "ti-clock", color: "#EF9F27" },
          { label: "Validés", value: rows.filter((r) => r.statut === "Validé").length, icon: "ti-checks", color: "#185FA5" },
          { label: "Reçus", value: rows.filter((r) => r.statut === "Reçu").length, icon: "ti-package-import", color: "#5aa05a" },
        ]} />
        <Panel>
          <div className="di-toolbar">
            <button className="btn-new" onClick={() => { setErr(""); setModal(true); }} disabled={!auth.structureId}><i className="ti ti-plus" /> Nouveau transfert</button>
          </div>

          {loading ? <StateMsg>Chargement…</StateMsg>
            : rows.length === 0 ? <StateMsg>Aucun transfert. <a style={{ color: "#2a5a5a", fontWeight: 600 }} onClick={() => setModal(true)}>Créer le premier</a></StateMsg>
            : (
              <table>
                <thead><tr><th>N°</th><th>Date</th><th>De</th><th>Vers</th><th>Contenu</th><th>Motif</th><th>Statut</th><th></th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.numero}</td>
                      <td>{fmtDate(r.created_at)}</td>
                      <td style={{ fontSize: 12 }}>{r.src_label}</td>
                      <td style={{ fontSize: 12 }}>{r.dst_label}</td>
                      <td style={{ fontSize: 12 }}>{r.libelle}{r.contenu === "article" ? ` ×${r.quantite}` : ""}</td>
                      <td><span className="tag-type">{r.motif}</span></td>
                      <td><span className={`statut ${stClass(r.statut)}`}>{r.statut}</span></td>
                      <td style={{ textAlign: "right" }}>
                        {next(r.statut) && (
                          <button className="btn-mini" onClick={() => advance(r)} title={`Passer à « ${next(r.statut)} »`}>
                            <i className="ti ti-arrow-right" /> {next(r.statut)}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </Panel>
      </div>

      {modal && (
        <div className="modal-bg" onClick={(e) => e.target.classList.contains("modal-bg") && setModal(false)}>
          <div className="modal">
            <div className="modal-head">Nouveau transfert <i className="ti ti-x" style={{ cursor: "pointer" }} onClick={() => setModal(false)} /></div>
            <div className="modal-body">
              {err && <div className="err">{err}</div>}

              <div className="fld"><label>Motif</label>
                <select value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })}>
                  {MOTIFS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>

              <div className="fld"><label>Source</label>
                <div className="fld-row">
                  <select value={form.src_type || ""} onChange={(e) => setForm({ ...form, src_type: e.target.value, src_id: "" })}>
                    <option value="">— Type —</option>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <select value={form.src_id || ""} onChange={(e) => setForm({ ...form, src_id: e.target.value })} disabled={!form.src_type}>
                    <option value="">— Emplacement —</option>{locOptions(form.src_type).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="fld"><label>Destination</label>
                <div className="fld-row">
                  <select value={form.dst_type || ""} onChange={(e) => setForm({ ...form, dst_type: e.target.value, dst_id: "" })}>
                    <option value="">— Type —</option>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <select value={form.dst_id || ""} onChange={(e) => setForm({ ...form, dst_id: e.target.value })} disabled={!form.dst_type}>
                    <option value="">— Emplacement —</option>{locOptions(form.dst_type).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="fld"><label>Contenu</label>
                <div className="seg">
                  <button className={form.contenu === "article" ? "on" : ""} onClick={() => setForm({ ...form, contenu: "article" })}>Article (qté)</button>
                  <button className={form.contenu === "materiel" ? "on" : ""} onClick={() => setForm({ ...form, contenu: "materiel" })}>Matériel (unité)</button>
                </div>
              </div>

              {form.contenu === "article" ? (
                <div className="fld-row">
                  <div className="fld"><label>Article</label>
                    <select value={form.article_id || ""} onChange={(e) => setForm({ ...form, article_id: e.target.value })}>
                      <option value="">— Choisir —</option>{refs.articles.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </div>
                  <div className="fld"><label>Quantité</label>
                    <input type="number" min="1" value={form.quantite} onChange={(e) => setForm({ ...form, quantite: e.target.value })} />
                  </div>
                </div>
              ) : (
                <div className="fld"><label>Matériel</label>
                  <select value={form.materiel_id || ""} onChange={(e) => setForm({ ...form, materiel_id: e.target.value })}>
                    <option value="">— Choisir —</option>{refs.materiels.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => setModal(false)}>Annuler</button>
              <button className="btn-save" onClick={save} disabled={busy}>{busy ? "…" : "Créer le transfert"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
