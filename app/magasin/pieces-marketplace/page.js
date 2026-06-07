"use client";
// =============================================================
//  /magasin/pieces-marketplace — Marketplace pièces détachées (0.62.59)
//  Marketplace inter-magasins : offres + demandes + mode urgent
// =============================================================
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { useMagasinContext } from "../../../lib/useMagasinContext";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn, Modal } from "../../ui";
import { EmptyState } from "../../components/PremiumKpi";
import PageToolbar from "../../components/PageToolbar";
import BackButton from "../../components/BackButton";

const ETAT_META = {
  neuf: { c: "#5aa05a", l: "Neuf" },
  occasion: { c: "#EF9F27", l: "Occasion" },
  reconditionne: { c: "#185FA5", l: "Reconditionné" },
};

export default function PiecesMarketplacePage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  const [search, setSearch] = useState("");
  const [fType, setFType] = useState("");        // 'offre' | 'demande'
  const [fEtat, setFEtat] = useState("");
  const [fUrgent, setFUrgent] = useState(false);

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!auth.ready) return;
    reload();
  }, [auth.ready]);

  async function reload() {
    setLoading(true);
    try {
      const r = await supabase.from("v_pieces_marketplace_actives")
        .select("*")
        .order("urgent", { ascending: false })
        .order("cree_le", { ascending: false })
        .limit(200);
      if (r.error?.code === "42P01") setTableMissing(true);
      setRows(r.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const filtered = useMemo(() => rows.filter(r => {
    if (fType && r.type !== fType) return false;
    if (fEtat && r.etat !== fEtat) return false;
    if (fUrgent && !r.urgent) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = `${r.designation || ""} ${r.reference || ""} ${r.marque || ""} ${r.modele_compat || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [rows, search, fType, fEtat, fUrgent]);

  const stats = useMemo(() => ({
    offres: rows.filter(r => r.type === "offre").length,
    demandes: rows.filter(r => r.type === "demande").length,
    urgent: rows.filter(r => r.urgent).length,
  }), [rows]);

  function openNew(type = "offre") {
    setForm({
      type, designation: "", reference: "", marque: "", modele_compat: "",
      quantite: 1, etat: "neuf", prix_unitaire: null, urgent: false,
      description: "", date_dispo: "", date_besoin: "",
      contact_nom: auth.user?.email || "", contact_email: auth.user?.email || "", contact_telephone: "",
    });
    setModal("new");
  }

  async function save() {
    if (!form.designation?.trim()) { alert("Désignation requise"); return; }
    setBusy(true);
    try {
      const payload = {
        magasin_id: magasinCtx.magasinId || null,
        structure_id: auth.structureId,
        type: form.type,
        designation: form.designation.trim(),
        reference: form.reference?.trim() || null,
        marque: form.marque?.trim() || null,
        modele_compat: form.modele_compat?.trim() || null,
        quantite: parseInt(form.quantite || 1),
        etat: form.etat,
        prix_unitaire: form.prix_unitaire ? parseFloat(form.prix_unitaire) : null,
        urgent: !!form.urgent,
        description: form.description?.trim() || null,
        date_dispo: form.date_dispo || null,
        date_besoin: form.date_besoin || null,
        contact_nom: form.contact_nom?.trim() || null,
        contact_email: form.contact_email?.trim() || null,
        contact_telephone: form.contact_telephone?.trim() || null,
        cree_par: auth.user?.id,
      };
      const r = await supabase.from("pieces_marketplace").insert(payload);
      if (r.error) throw r.error;
      setModal(null);
      await reload();
    } catch (e) { alert("Erreur : " + e.message); }
    setBusy(false);
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content" style={{ padding: "20px 24px", maxWidth: 1200 }}>
        <BackButton />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <PageHead icon="ti-shopping-cart-plus" title="Marketplace pièces détachées"
            subtitle={`${stats.offres} offres · ${stats.demandes} demandes · ${stats.urgent} urgent${stats.urgent > 1 ? "s" : ""}`}
            color="#EF9F27" />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => openNew("offre")} style={{
              background: "linear-gradient(135deg, #5aa05a, #4a8a4a)", color: "#fff",
              border: "none", padding: "10px 16px", borderRadius: 10,
              fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <i className="ti ti-package-export" /> Proposer pièce
            </button>
            <button onClick={() => openNew("demande")} style={{
              background: "linear-gradient(135deg, #EF9F27, #d88a18)", color: "#fff",
              border: "none", padding: "10px 16px", borderRadius: 10,
              fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <i className="ti ti-search" /> Chercher pièce
            </button>
          </div>
        </div>

        {tableMissing && (
          <Panel style={{ marginTop: 12, borderLeft: "4px solid #e35d5b", background: "rgba(227,93,91,.06)" }}>
            <div style={{ color: "#c0392b", fontSize: 13 }}>
              ⚠ Tables manquantes. Applique <code>migration-0.62.59-pieces-marketplace.sql</code>
            </div>
          </Panel>
        )}

        <PageToolbar
          search={search}
          onSearch={setSearch}
          placeholder="Désignation, référence, marque, modèle..."
          totalCount={rows.length}
          filteredCount={filtered.length}
          accentColor="#EF9F27"
          filters={[
            { key: "type", label: "Type", value: fType, onChange: setFType, type: "buttongroup",
              options: [
                { v: "offre", l: "Offres", c: "#5aa05a", ic: "ti-package-export", count: stats.offres },
                { v: "demande", l: "Demandes", c: "#EF9F27", ic: "ti-search", count: stats.demandes },
              ]
            },
            { key: "etat", label: "État", value: fEtat, onChange: setFEtat,
              options: Object.entries(ETAT_META).map(([k, m]) => ({ v: k, l: m.l })) },
            { key: "urgent", label: "Urgent uniquement 🔥", value: fUrgent, onChange: setFUrgent, type: "toggle", color: "#e35d5b", icon: "ti-flame" },
          ]}
          onReset={() => { setSearch(""); setFType(""); setFEtat(""); setFUrgent(false); }}
        />

        {/* Liste */}
        {loading ? (
          <Panel><div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>Chargement…</div></Panel>
        ) : filtered.length === 0 ? (
          <EmptyState icon="ti-package-off" title="Aucune annonce" desc={search || fType || fEtat || fUrgent ? "Aucun résultat pour ces filtres" : "Sois le premier à proposer ou chercher une pièce !"} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
            {filtered.map(r => {
              const etat = ETAT_META[r.etat] || ETAT_META.neuf;
              return (
                <div key={r.id} style={{
                  background: "#fff",
                  border: `1px solid ${r.urgent ? "#e35d5b" : "#eef1f4"}`,
                  borderRadius: 12,
                  padding: 14,
                  position: "relative",
                  boxShadow: r.urgent ? "0 4px 12px rgba(227,93,91,.2)" : "0 2px 4px rgba(20,33,49,.06)",
                  transition: "all 200ms",
                }}>
                  {r.urgent && (
                    <span style={{
                      position: "absolute", top: -8, right: 12,
                      background: "linear-gradient(135deg, #e35d5b, #c0392b)", color: "#fff",
                      padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                      boxShadow: "0 2px 8px rgba(227,93,91,.4)",
                    }}>
                      🔥 URGENT
                    </span>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{
                      background: r.type === "offre" ? "rgba(94,160,90,.12)" : "rgba(239,159,39,.12)",
                      color: r.type === "offre" ? "#5aa05a" : "#EF9F27",
                      padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                      display: "inline-flex", alignItems: "center", gap: 4,
                    }}>
                      <i className={`ti ${r.type === "offre" ? "ti-package-export" : "ti-search"}`} />
                      {r.type === "offre" ? "OFFRE" : "DEMANDE"}
                    </span>
                    <span style={{ background: `${etat.c}1A`, color: etat.c, padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                      {etat.l}
                    </span>
                  </div>
                  <h3 style={{ margin: "4px 0 6px", fontSize: 15, color: "#142131", fontWeight: 700 }}>{r.designation}</h3>
                  {r.reference && <div style={{ fontSize: 12, color: "#8a98a8", fontFamily: "Consolas, monospace" }}>Réf: {r.reference}</div>}
                  {(r.marque || r.modele_compat) && (
                    <div style={{ fontSize: 12, color: "#5a6878", marginTop: 4 }}>
                      {r.marque}{r.marque && r.modele_compat ? " · " : ""}{r.modele_compat}
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, padding: "10px 0 0", borderTop: "1px solid #f4f7fa" }}>
                    <div>
                      {r.prix_unitaire != null && (
                        <span style={{ fontSize: 16, fontWeight: 700, color: "#185FA5" }}>
                          {Number(r.prix_unitaire).toFixed(2)} €
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: "#8a98a8", marginLeft: 6 }}>× {r.quantite}</span>
                    </div>
                    <span style={{ fontSize: 11, color: "#8a98a8" }}>
                      <i className="ti ti-clock" /> {r.jours_restants}j restant{r.jours_restants > 1 ? "s" : ""}
                    </span>
                  </div>
                  {r.description && (
                    <p style={{ margin: "8px 0 0", fontSize: 12, color: "#5a6878", lineHeight: 1.4, maxHeight: 60, overflow: "hidden" }}>
                      {r.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal nouvelle annonce */}
        <Modal open={modal === "new"} onClose={() => setModal(null)} title={form.type === "offre" ? "Proposer une pièce" : "Chercher une pièce"} kind="default" size="md"
          footer={<>
            <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
            <Btn variant="primary" onClick={save} disabled={busy}>{busy ? "Enregistrement..." : "Publier"}</Btn>
          </>}>
          <div style={{ display: "grid", gap: 12 }}>
            <label>Désignation *
              <input value={form.designation || ""} onChange={(e) => setForm({ ...form, designation: e.target.value })}
                placeholder="ex: Joint torique D45 silicone"
                style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 }} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label>Référence
                <input value={form.reference || ""} onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  placeholder="ex: AB-123-45"
                  style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 }} />
              </label>
              <label>Marque
                <input value={form.marque || ""} onChange={(e) => setForm({ ...form, marque: e.target.value })}
                  placeholder="ex: Resmed, Philips..."
                  style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 }} />
              </label>
            </div>
            <label>Modèle compatible
              <input value={form.modele_compat || ""} onChange={(e) => setForm({ ...form, modele_compat: e.target.value })}
                placeholder="ex: AirSense 10, S9..."
                style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 }} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <label>Quantité
                <input type="number" min="1" value={form.quantite || 1} onChange={(e) => setForm({ ...form, quantite: e.target.value })}
                  style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 }} />
              </label>
              <label>État
                <select value={form.etat || "neuf"} onChange={(e) => setForm({ ...form, etat: e.target.value })}
                  style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 }}>
                  {Object.entries(ETAT_META).map(([k, m]) => <option key={k} value={k}>{m.l}</option>)}
                </select>
              </label>
              <label>Prix unitaire €
                <input type="number" step="0.01" value={form.prix_unitaire || ""} onChange={(e) => setForm({ ...form, prix_unitaire: e.target.value })}
                  placeholder="optionnel"
                  style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 }} />
              </label>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, background: form.urgent ? "rgba(227,93,91,.08)" : "#f4f7fa", borderRadius: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={!!form.urgent} onChange={(e) => setForm({ ...form, urgent: e.target.checked })} />
              <span style={{ fontWeight: 600, color: form.urgent ? "#e35d5b" : "#5a6878" }}>🔥 Annonce urgente (mise en avant)</span>
            </label>
            <label>Description
              <textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3} placeholder="Détails supplémentaires..."
                style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 }} />
            </label>
          </div>
        </Modal>
      </div>
    </div>
  );
}
