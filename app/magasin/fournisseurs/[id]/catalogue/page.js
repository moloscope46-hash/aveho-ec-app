"use client";
// =============================================================
//  /magasin/fournisseurs/[id]/catalogue — Catalogue articles fournisseur (0.62.65)
// =============================================================
import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../../lib/supabase";
import { useAuth } from "../../../../../lib/useAuth";
import TopBar from "../../../../TopBar";
import { useCart } from "../../../../useCart";
import { PageHead, Panel, Btn, Modal } from "../../../../ui";
import { EmptyState } from "../../../../components/PremiumKpi";
import PageToolbar from "../../../../components/PageToolbar";
import BackButton from "../../../../components/BackButton";

export default function FournisseurCataloguePage() {
  const params = useParams();
  const fournisseurId = params?.id;
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();

  const [fournisseur, setFournisseur] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fActif, setFActif] = useState(true);

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (auth.ready && fournisseurId) reload(); }, [auth.ready, fournisseurId]);

  async function reload() {
    setLoading(true);
    try {
      const [fRes, cRes] = await Promise.all([
        supabase.from("fournisseurs").select("*").eq("id", fournisseurId).maybeSingle(),
        supabase.from("fournisseurs_catalogue").select("*").eq("fournisseur_id", fournisseurId).order("designation"),
      ]);
      setFournisseur(fRes.data);
      setRows(cRes.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const filtered = useMemo(() => rows.filter(r => {
    if (fActif !== null && r.actif !== fActif) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = `${r.designation || ""} ${r.reference_fournisseur || ""} ${r.ean13 || ""} ${r.lpp_code || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [rows, search, fActif]);

  const stats = useMemo(() => ({
    total: rows.length,
    actifs: rows.filter(r => r.actif).length,
    avecLpp: rows.filter(r => r.lpp_code).length,
    prixMoyen: rows.length ? (rows.reduce((s, r) => s + (Number(r.prix_unitaire_ht) || 0), 0) / rows.length).toFixed(2) : 0,
  }), [rows]);

  function openNew() {
    setForm({
      reference_fournisseur: "", designation: "",
      prix_unitaire_ht: "", tva_pct: 5.5, unite: "pièce",
      qte_min_commande: 1, conditionnement: 1,
      delai_specifique_jours: null, lpp_code: "", ean13: "",
      notes: "", actif: true,
    });
    setModal("new");
  }

  function openEdit(r) {
    setForm({ ...r });
    setModal("edit");
  }

  async function save() {
    if (!form.designation?.trim() || !form.reference_fournisseur?.trim()) {
      alert("Désignation et référence fournisseur requises"); return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        fournisseur_id: fournisseurId,
        designation: form.designation.trim(),
        reference_fournisseur: form.reference_fournisseur.trim(),
        prix_unitaire_ht: form.prix_unitaire_ht ? parseFloat(form.prix_unitaire_ht) : null,
        tva_pct: form.tva_pct ? parseFloat(form.tva_pct) : null,
        qte_min_commande: parseInt(form.qte_min_commande) || 1,
        conditionnement: parseInt(form.conditionnement) || 1,
        delai_specifique_jours: form.delai_specifique_jours ? parseInt(form.delai_specifique_jours) : null,
      };
      delete payload.id;
      delete payload.cree_le;
      if (modal === "edit") {
        await supabase.from("fournisseurs_catalogue").update(payload).eq("id", form.id);
      } else {
        await supabase.from("fournisseurs_catalogue").insert(payload);
      }
      setModal(null);
      await reload();
    } catch (e) { alert("Erreur : " + e.message); }
    setBusy(false);
  }

  async function toggleActif(r) {
    await supabase.from("fournisseurs_catalogue").update({ actif: !r.actif }).eq("id", r.id);
    await reload();
  }

  async function remove(r) {
    if (!confirm(`Supprimer "${r.designation}" du catalogue ?`)) return;
    await supabase.from("fournisseurs_catalogue").delete().eq("id", r.id);
    await reload();
  }

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content" style={{ padding: "20px 24px", maxWidth: 1300 }}>
        <BackButton />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <PageHead icon="ti-list-details" title={`Catalogue — ${fournisseur?.raison_sociale || "Fournisseur"}`}
            subtitle={`${stats.total} article${stats.total > 1 ? "s" : ""} · ${stats.actifs} actif${stats.actifs > 1 ? "s" : ""} · ${stats.avecLpp} avec LPP`}
            color="#185FA5" />
          <Btn variant="primary" icon="ti-plus" onClick={openNew}>Ajouter un article</Btn>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 12, marginBottom: 12 }}>
          <KpiSmall label="Articles totaux" value={stats.total} color="#185FA5" icon="ti-list" />
          <KpiSmall label="Actifs" value={stats.actifs} color="#5aa05a" icon="ti-check" />
          <KpiSmall label="Avec code LPP" value={stats.avecLpp} color="#7a6fb0" icon="ti-medical-cross" />
          <KpiSmall label="Prix moyen HT" value={`${stats.prixMoyen} €`} color="#EF9F27" icon="ti-cash" />
        </div>

        <PageToolbar
          search={search} onSearch={setSearch}
          placeholder="Désignation, référence, EAN13, LPP..."
          totalCount={rows.length} filteredCount={filtered.length}
          accentColor="#185FA5"
          filters={[
            { key: "actif", label: "Actifs", value: fActif === true, onChange: () => setFActif(fActif === true ? false : true), type: "toggle", color: "#5aa05a", icon: "ti-check" },
          ]}
          onReset={() => { setSearch(""); setFActif(true); }}
        />

        {loading ? (
          <Panel><div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>Chargement…</div></Panel>
        ) : filtered.length === 0 ? (
          <EmptyState icon="ti-list-search" title="Catalogue vide" desc="Ajoute des articles à ce catalogue fournisseur pour démarrer." />
        ) : (
          <Panel style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "10px 12px" }}>Référence</th>
                    <th style={{ textAlign: "left", padding: "10px 12px" }}>Désignation</th>
                    <th style={{ textAlign: "right", padding: "10px 12px" }}>Prix HT</th>
                    <th style={{ textAlign: "center", padding: "10px 12px" }}>TVA</th>
                    <th style={{ textAlign: "center", padding: "10px 12px" }}>Qté min / Cond.</th>
                    <th style={{ textAlign: "center", padding: "10px 12px" }}>LPP</th>
                    <th style={{ textAlign: "center", padding: "10px 12px" }}>Délai</th>
                    <th style={{ textAlign: "right", padding: "10px 12px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} style={{ opacity: r.actif ? 1 : 0.6 }}>
                      <td style={{ padding: "10px 12px", fontFamily: "Consolas, monospace", fontSize: 12 }}>{r.reference_fournisseur}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: 600 }}>{r.designation}</div>
                        {r.ean13 && <div style={{ fontSize: 10.5, color: "#8a98a8", fontFamily: "Consolas, monospace" }}>EAN: {r.ean13}</div>}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#185FA5" }}>
                        {r.prix_unitaire_ht ? `${Number(r.prix_unitaire_ht).toFixed(2)} €` : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 11 }}>{r.tva_pct}%</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, color: "#5a6878" }}>
                        {r.qte_min_commande} / {r.conditionnement}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        {r.lpp_code ? <span style={{ background: "rgba(122,111,176,.15)", color: "#7a6fb0", padding: "2px 6px", borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>{r.lpp_code}</span> : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 11.5 }}>
                        {r.delai_specifique_jours != null ? `${r.delai_specifique_jours}j` : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        <button onClick={() => openEdit(r)} style={iconBtn("#185FA5")}><i className="ti ti-edit" /></button>
                        <button onClick={() => toggleActif(r)} style={iconBtn(r.actif ? "#e35d5b" : "#5aa05a")}><i className={`ti ${r.actif ? "ti-eye-off" : "ti-eye"}`} /></button>
                        <button onClick={() => remove(r)} style={iconBtn("#c0392b")}><i className="ti ti-trash" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        <Modal open={modal === "new" || modal === "edit"} onClose={() => setModal(null)}
          title={modal === "edit" ? "Modifier l'article" : "Nouvel article catalogue"} kind="default" size="md"
          footer={<>
            <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
            <Btn variant="primary" onClick={save} disabled={busy}>{busy ? "..." : "Enregistrer"}</Btn>
          </>}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label>Référence fournisseur *
                <input value={form.reference_fournisseur || ""} onChange={(e) => setForm({ ...form, reference_fournisseur: e.target.value })}
                  style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "Consolas, monospace", marginTop: 4 }} />
              </label>
              <label>EAN13 / Code-barres
                <input value={form.ean13 || ""} onChange={(e) => setForm({ ...form, ean13: e.target.value })}
                  style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "Consolas, monospace", marginTop: 4 }} />
              </label>
            </div>
            <label>Désignation *
              <input value={form.designation || ""} onChange={(e) => setForm({ ...form, designation: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 }} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <label>Prix unitaire HT €
                <input type="number" step="0.01" value={form.prix_unitaire_ht || ""} onChange={(e) => setForm({ ...form, prix_unitaire_ht: e.target.value })}
                  style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 }} />
              </label>
              <label>TVA %
                <input type="number" step="0.01" value={form.tva_pct || ""} onChange={(e) => setForm({ ...form, tva_pct: e.target.value })}
                  style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 }} />
              </label>
              <label>Unité
                <input value={form.unite || ""} onChange={(e) => setForm({ ...form, unite: e.target.value })}
                  placeholder="pièce, ml, kg..."
                  style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 }} />
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <label>Qté min commande
                <input type="number" value={form.qte_min_commande || 1} onChange={(e) => setForm({ ...form, qte_min_commande: e.target.value })}
                  style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 }} />
              </label>
              <label>Conditionnement
                <input type="number" value={form.conditionnement || 1} onChange={(e) => setForm({ ...form, conditionnement: e.target.value })}
                  style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 }} />
              </label>
              <label>Délai spécifique (j)
                <input type="number" value={form.delai_specifique_jours || ""} onChange={(e) => setForm({ ...form, delai_specifique_jours: e.target.value })}
                  placeholder="(optionnel)"
                  style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 }} />
              </label>
            </div>
            <label>Code LPP (si applicable)
              <input value={form.lpp_code || ""} onChange={(e) => setForm({ ...form, lpp_code: e.target.value })}
                placeholder="1126791..."
                style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "Consolas, monospace", marginTop: 4 }} />
            </label>
            <label>Notes
              <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 }} />
            </label>
          </div>
        </Modal>
      </div>
    </div>
  );
}

function iconBtn(color) {
  return {
    padding: 6, marginLeft: 4,
    background: `${color}12`, color, border: `1px solid ${color}30`,
    borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
  };
}

function KpiSmall({ label, value, color, icon }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${color}30`, borderLeft: `4px solid ${color}`,
      borderRadius: 10, padding: "8px 12px",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <i className={`ti ${icon}`} style={{ color, fontSize: 20 }} />
      <div>
        <div style={{ fontSize: 10, color: "#8a98a8", fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      </div>
    </div>
  );
}
