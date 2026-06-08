"use client";
// =============================================================
//  /magasin/fournisseurs — Annuaire fournisseurs (0.62.63)
// =============================================================
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { useMagasinContext } from "../../../lib/useMagasinContext";
import TopBar from "../../TopBar";
import { useEditLock } from "../../../lib/useEditLock";  /* 0.62.126 */
import LockBanner from "../../components/LockBanner";  /* 0.62.126 */
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn, Modal } from "../../ui";
import ImageUploader from "../../components/ImageUploader";  /* 0.62.93 */
import AdresseAutocomplete from "../../AdresseAutocomplete";  /* 0.62.124 */
import { EmptyState } from "../../components/PremiumKpi";
import PageToolbar from "../../components/PageToolbar";
import BackButton from "../../components/BackButton";

const TYPES = [
  { v: "materiel",     l: "Matériel",         c: "#185FA5", ic: "ti-armchair-2" },
  { v: "consommable",  l: "Consommables",     c: "#5aa05a", ic: "ti-package" },
  { v: "pieces_detachees", l: "Pièces dét.",  c: "#EF9F27", ic: "ti-tool" },
  { v: "medicament",   l: "Médicaments",      c: "#7a6fb0", ic: "ti-pill" },
];

export default function FournisseursPage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [search, setSearch] = useState("");
  const [fType, setFType] = useState("");
  const [fActif, setFActif] = useState(true);

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  // 0.62.126 : Lock anti-collision sur édition (APRÈS form pour éviter TDZ)
  const fournisseurLock = useEditLock("fournisseur", form?.id, modal === "edit" && !!form?.id);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (auth.ready) reload(); }, [auth.ready]);

  async function reload() {
    setLoading(true);
    try {
      const r = await supabase.from("fournisseurs")
        .select("*")
        .order("raison_sociale");
      if (r.error?.code === "42P01") setTableMissing(true);
      setRows(r.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const filtered = useMemo(() => rows.filter(r => {
    if (fActif !== null && r.actif !== fActif) return false;
    if (fType && !(r.type_fournisseur || []).includes(fType)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = `${r.raison_sociale || ""} ${r.siret || ""} ${r.email || ""} ${r.ville || ""} ${r.contact_nom || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [rows, search, fType, fActif]);

  function openNew() {
    setForm({
      raison_sociale: "", siret: "", email: "", telephone: "",
      adresse: "", cp: "", ville: "", pays: "France",
      contact_nom: "", contact_email: "", contact_telephone: "",
      conditions_paiement: "30j", delai_livraison_jours: 7,
      remise_globale_pct: 0, type_fournisseur: ["materiel"],
      notes: "", actif: true,
    });
    setModal("new");
  }

  function openEdit(r) {
    setForm({ ...r });
    setModal("edit");
  }

  async function save() {
    if (!form.raison_sociale?.trim()) { alert("Raison sociale requise"); return; }
    setBusy(true);
    try {
      const payload = {
        ...form,
        magasin_id: magasinCtx.magasinId || null,
        structure_id: auth.structureId,
        raison_sociale: form.raison_sociale.trim(),
      };
      delete payload.id;
      delete payload.cree_le;
      delete payload.modifie_le;
      if (modal === "edit") {
        await supabase.from("fournisseurs").update(payload).eq("id", form.id);
      } else {
        await supabase.from("fournisseurs").insert(payload);
      }
      setModal(null);
      await reload();
    } catch (e) { alert("Erreur : " + e.message); }
    setBusy(false);
  }

  async function toggleActif(r) {
    await supabase.from("fournisseurs").update({ actif: !r.actif }).eq("id", r.id);
    await reload();
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content" style={{ padding: "20px 24px", maxWidth: 1200 }}>
        <BackButton />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <PageHead icon="ti-truck" title="Fournisseurs" subtitle={`${filtered.length} fournisseur${filtered.length > 1 ? "s" : ""}`} color="#185FA5" />
          <Btn variant="primary" icon="ti-plus" onClick={openNew}>Nouveau fournisseur</Btn>
        </div>

        {tableMissing && (
          <Panel style={{ borderLeft: "4px solid #e35d5b", background: "rgba(227,93,91,.06)" }}>
            <div style={{ color: "#c0392b", fontSize: 13 }}>
              ⚠ Applique <code>migration-0.62.63-pack-modules-magasin-avances.sql</code>
            </div>
          </Panel>
        )}

        <PageToolbar
          search={search} onSearch={setSearch}
          placeholder="Raison sociale, SIRET, email, ville..."
          totalCount={rows.length} filteredCount={filtered.length}
          accentColor="#185FA5"
          filters={[
            { key: "type", label: "Type", value: fType, onChange: setFType, type: "buttongroup",
              options: TYPES.map(t => ({ v: t.v, l: t.l, c: t.c, ic: t.ic })) },
            { key: "actif", label: "Actifs", value: fActif === true, onChange: () => setFActif(fActif === true ? false : true), type: "toggle", color: "#5aa05a", icon: "ti-check" },
          ]}
          onReset={() => { setSearch(""); setFType(""); setFActif(true); }}
        />

        {loading ? (
          <Panel><div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>Chargement…</div></Panel>
        ) : filtered.length === 0 ? (
          <EmptyState icon="ti-truck-off" title="Aucun fournisseur" desc="Crée ton premier fournisseur pour démarrer ton catalogue." />
        ) : (
          <div className="av-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
            {filtered.map(r => (
              <div key={r.id} data-3d="true" style={{
                background: "#fff",
                border: r.actif ? "1px solid #eef1f4" : "1px solid #f4f7fa",
                borderLeft: `4px solid ${r.actif ? "#185FA5" : "#c0d0d8"}`,
                borderRadius: 12, padding: 14,
                opacity: r.actif ? 1 : 0.7,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <h3 style={{ margin: 0, fontSize: 15, color: "#142131", fontWeight: 700 }}>{r.raison_sociale}</h3>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(r.type_fournisseur || []).map(t => {
                      const meta = TYPES.find(x => x.v === t);
                      return meta && (
                        <span key={t} title={meta.l} style={{
                          background: `${meta.c}1A`, color: meta.c,
                          width: 22, height: 22, borderRadius: 5,
                          display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12,
                        }}>
                          <i className={`ti ${meta.ic}`} />
                        </span>
                      );
                    })}
                  </div>
                </div>
                {r.siret && <div style={{ fontSize: 11.5, color: "#8a98a8", fontFamily: "Consolas, monospace", marginBottom: 4 }}>SIRET {r.siret}</div>}
                {(r.email || r.telephone) && (
                  <div style={{ fontSize: 12, color: "#5a6878", marginBottom: 4 }}>
                    {r.email && <><i className="ti ti-mail" /> {r.email}<br /></>}
                    {r.telephone && <><i className="ti ti-phone" /> {r.telephone}</>}
                  </div>
                )}
                {(r.ville || r.cp) && (
                  <div style={{ fontSize: 11.5, color: "#8a98a8" }}>
                    <i className="ti ti-map-pin" /> {[r.cp, r.ville].filter(Boolean).join(" ")}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, marginTop: 10, paddingTop: 10, borderTop: "1px solid #f4f7fa", fontSize: 11 }}>
                  {r.delai_livraison_jours != null && <span><i className="ti ti-clock" /> {r.delai_livraison_jours}j</span>}
                  {r.conditions_paiement && <span><i className="ti ti-receipt" /> {r.conditions_paiement}</span>}
                  {r.remise_globale_pct > 0 && <span style={{ color: "#5aa05a", fontWeight: 700 }}><i className="ti ti-discount" /> -{r.remise_globale_pct}%</span>}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <button onClick={() => router.push(`/magasin/fournisseurs/${r.id}/catalogue`)} style={btnStyle("#185FA5")}>
                    <i className="ti ti-list-details" /> Catalogue
                  </button>
                  <button onClick={() => router.push(`/magasin/commandes-fournisseurs?fournisseur=${r.id}`)} style={btnStyle("#5aa05a")}>
                    <i className="ti ti-shopping-cart" /> Commandes
                  </button>
                  <button onClick={() => openEdit(r)} style={btnStyle("#8a98a8")}>
                    <i className="ti ti-edit" />
                  </button>
                  <button onClick={() => toggleActif(r)} title={r.actif ? "Désactiver" : "Activer"} style={btnStyle(r.actif ? "#e35d5b" : "#5aa05a")}>
                    <i className={`ti ${r.actif ? "ti-eye-off" : "ti-eye"}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal new/edit */}
        <Modal open={modal === "new" || modal === "edit"} onClose={() => setModal(null)}
          title={modal === "edit" ? "Modifier fournisseur" : "Nouveau fournisseur"} kind="default" size="md"
          footer={<>
            <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
            <Btn variant="primary" onClick={save} disabled={busy}>{busy ? "Enregistrement..." : "Enregistrer"}</Btn>
          </>}>
          <div style={{ display: "grid", gap: 10 }}>
            {/* 0.62.126 : LockBanner si édition concurrente */}
            {fournisseurLock?.locked && <LockBanner lockedBy={fournisseurLock.lockedBy} onTakeover={fournisseurLock.takeover} resourceLabel="ce fournisseur" />}
            {/* 0.62.93 : Logo fournisseur */}
            <ImageUploader
              value={form.logo_url}
              onChange={(url) => setForm({ ...form, logo_url: url })}
              bucket="fournisseurs-logos"
              folder={modal?.id || "nouveau"}
              label="Logo fournisseur"
              maxSizeMB={2}
              compact
            />
            <label>Raison sociale *
              <input value={form.raison_sociale || ""} onChange={(e) => setForm({ ...form, raison_sociale: e.target.value })}
                style={inputStyle()} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label>SIRET <input value={form.siret || ""} onChange={(e) => setForm({ ...form, siret: e.target.value })} style={inputStyle()} /></label>
              <label>TVA intra <input value={form.tva_intra || ""} onChange={(e) => setForm({ ...form, tva_intra: e.target.value })} style={inputStyle()} /></label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label>Email <input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle()} /></label>
              <label>Téléphone <input value={form.telephone || ""} onChange={(e) => setForm({ ...form, telephone: e.target.value })} style={inputStyle()} /></label>
            </div>
            {/* 0.62.124 : Adresse avec autocomplete BAN gouv.fr */}
            <label>Adresse
              <AdresseAutocomplete
                value={form.adresse || ""}
                onChange={(v) => setForm({ ...form, adresse: v })}
                onSelect={(a) => setForm({
                  ...form,
                  adresse: a.adresse,
                  cp: a.code_postal,
                  ville: a.ville,
                  code_insee: a.code_insee,
                  latitude: a.latitude,
                  longitude: a.longitude,
                })}
                placeholder="N° + rue (autocomplete activé)"
              />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
              <label>CP <input value={form.cp || ""} onChange={(e) => setForm({ ...form, cp: e.target.value })} style={inputStyle()} /></label>
              <label>Ville <input value={form.ville || ""} onChange={(e) => setForm({ ...form, ville: e.target.value })} style={inputStyle()} /></label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <label>Conditions paiement <input value={form.conditions_paiement || ""} onChange={(e) => setForm({ ...form, conditions_paiement: e.target.value })} placeholder="30j" style={inputStyle()} /></label>
              <label>Délai livraison (j) <input type="number" value={form.delai_livraison_jours || ""} onChange={(e) => setForm({ ...form, delai_livraison_jours: parseInt(e.target.value) || null })} style={inputStyle()} /></label>
              <label>Remise globale % <input type="number" step="0.01" value={form.remise_globale_pct || ""} onChange={(e) => setForm({ ...form, remise_globale_pct: parseFloat(e.target.value) || 0 })} style={inputStyle()} /></label>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "#6c7a89", fontWeight: 600, marginBottom: 4 }}>Type fournisseur (multiple)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {TYPES.map(t => {
                  const checked = (form.type_fournisseur || []).includes(t.v);
                  return (
                    <button key={t.v} type="button" onClick={() => {
                      const current = form.type_fournisseur || [];
                      setForm({ ...form, type_fournisseur: checked ? current.filter(x => x !== t.v) : [...current, t.v] });
                    }} style={{
                      padding: "6px 12px",
                      background: checked ? `linear-gradient(135deg, ${t.c}, ${t.c}cc)` : "#fafbfc",
                      color: checked ? "#fff" : "#5a6878",
                      border: `1px solid ${checked ? t.c : "#e3e9ee"}`,
                      borderRadius: 8, fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      display: "inline-flex", alignItems: "center", gap: 4,
                    }}>
                      <i className={`ti ${t.ic}`} /> {t.l}
                    </button>
                  );
                })}
              </div>
            </div>
            <label>Notes <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={inputStyle()} /></label>
          </div>
        </Modal>
      </div>
    </div>
  );
}

function btnStyle(color) {
  return {
    padding: "5px 10px", background: `${color}12`, color, border: `1px solid ${color}30`,
    borderRadius: 6, fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 4,
  };
}
function inputStyle() {
  return { width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 };
}
