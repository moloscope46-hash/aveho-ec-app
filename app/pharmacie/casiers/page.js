"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { PageShell, ModernCard, ModernModal, ModalBtn, HiTechIconBox } from "../../components/ui-premium";
import PermissionGate from "../../components/PermissionGate";

const COLOR = "#7CC8C8";

const TYPE_CASIER = [
  { v: "standard",   l: "Standard",   c: "#7CC8C8", ic: "ti-box" },
  { v: "refrigere",  l: "Réfrigéré",  c: "#185FA5", ic: "ti-snowflake" },
  { v: "securise",   l: "Coffre",     c: "#D45E5E", ic: "ti-lock" },
  { v: "ambient",    l: "Température ambiante", c: "#EF9F27", ic: "ti-temperature" },
];

export default function CasiersPharmaciePage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const [casiers, setCasiers] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fType, setFType] = useState("");
  const [fPharmacie, setFPharmacie] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => { if (auth.ready) reload(); }, [auth.ready]);

  async function reload() {
    setLoading(true);
    const [c, p] = await Promise.all([
      supabase.from("pharmacie_casiers").select("*, pharmacie:pharmacie_id(nom)").eq("structure_id", auth.structureId).order("code"),
      supabase.from("pharmacies").select("id, nom").eq("structure_id", auth.structureId).order("nom"),
    ]);
    setCasiers(c.data || []);
    setPharmacies(p.data || []);
    setLoading(false);
  }

  async function saveCasier() {
    const payload = {
      structure_id: auth.structureId,
      pharmacie_id: form.pharmacie_id,
      code: form.code,
      libelle: form.libelle,
      zone: form.zone,
      type_casier: form.type_casier || "standard",
      categorie: form.categorie,
      est_refrigere: form.type_casier === "refrigere",
      est_securise: form.type_casier === "securise",
      temperature_min: form.temperature_min || null,
      temperature_max: form.temperature_max || null,
      capacite_max: form.capacite_max || null,
      notes: form.notes,
      actif: true,
    };
    if (form.id) await supabase.from("pharmacie_casiers").update(payload).eq("id", form.id);
    else await supabase.from("pharmacie_casiers").insert(payload);
    setModal(null);
    setForm({});
    reload();
  }

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return casiers.filter(c => {
      if (s && !((c.code || "").toLowerCase().includes(s) || (c.libelle || "").toLowerCase().includes(s) || (c.categorie || "").toLowerCase().includes(s))) return false;
      if (fType && c.type_casier !== fType) return false;
      if (fPharmacie && c.pharmacie_id !== fPharmacie) return false;
      return true;
    });
  }, [casiers, search, fType, fPharmacie]);

  return (
    <>
      <TopBar />
      <PageShell
        color={COLOR}
        icon="ti-box-multiple"
        title="Casiers pharmacie"
        subtitle="Logistique de rangement physique"
        badge={`${casiers.length}`}
        actions={
          <button onClick={() => { setForm({ pharmacie_id: pharmacies[0]?.id }); setModal("new"); }} style={{
            padding: "10px 18px", borderRadius: 10,
            background: `linear-gradient(135deg, ${COLOR} 0%, ${COLOR}dd 100%)`,
            color: "#fff", border: "none", fontFamily: "Quicksand", fontWeight: 700, fontSize: 13,
            cursor: "pointer", boxShadow: `0 4px 12px ${COLOR}50`,
          }}>
            <i className="ti ti-plus" /> Nouveau casier
          </button>
        }
      >
        {/* Filtres */}
        <ModernCard color={COLOR} variant="default" padding={14} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.15)", color: "#fff", fontFamily: "Quicksand" }} />
            <select value={fType} onChange={(e) => setFType(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.15)", color: "#fff", fontFamily: "Quicksand" }}>
              <option value="">Tous types</option>
              {TYPE_CASIER.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
            <select value={fPharmacie} onChange={(e) => setFPharmacie(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.15)", color: "#fff", fontFamily: "Quicksand" }}>
              <option value="">Toutes pharmacies</option>
              {pharmacies.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </div>
        </ModernCard>

        {/* Grille casiers */}
        {loading ? (
          <ModernCard color={COLOR}><p style={{ color: "rgba(255,255,255,.7)", margin: 0 }}>Chargement...</p></ModernCard>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {filtered.map(c => {
              const typ = TYPE_CASIER.find(t => t.v === c.type_casier) || TYPE_CASIER[0];
              const isFull = c.capacite_max && c.capacite_actuelle >= c.capacite_max * 0.9;
              return (
                <ModernCard
                  key={c.id}
                  color={typ.c}
                  variant="accent"
                  hoverable
                  onClick={() => { setForm(c); setModal("edit"); }}
                  padding={14}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <HiTechIconBox name={typ.ic} color={typ.c} variant="gradient" size={40} pulse={c.est_securise} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>{c.code}</div>
                      <div style={{ color: "rgba(255,255,255,.55)", fontSize: 11 }}>{c.libelle}</div>
                    </div>
                    {isFull && <span style={{ background: "#D45E5E25", color: "#D45E5E", padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>SATURÉ</span>}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11 }}>
                    <Tag color={typ.c} icon={typ.ic}>{typ.l}</Tag>
                    {c.categorie && <Tag color="rgba(255,255,255,.10)" icon="ti-tag">{c.categorie}</Tag>}
                    {c.est_refrigere && c.temperature_min != null && <Tag color="#185FA5" icon="ti-temperature-snow">{c.temperature_min}–{c.temperature_max}°C</Tag>}
                  </div>
                  <div style={{ marginTop: 10, padding: "8px 0 0", borderTop: "1px solid rgba(255,255,255,.06)", fontSize: 11, color: "rgba(255,255,255,.5)" }}>
                    <i className="ti ti-medical-cross" /> {c.pharmacie?.nom || "—"}
                  </div>
                </ModernCard>
              );
            })}
          </div>
        )}

        {/* MODAL */}
        <ModernModal
          open={!!modal}
          onClose={() => { setModal(null); setForm({}); }}
          color={COLOR}
          icon="ti-box-multiple"
          title={modal === "edit" ? "Modifier casier" : "Nouveau casier"}
          subtitle="Logistique pharmacie"
          actions={
            <>
              <ModalBtn variant="secondary" onClick={() => { setModal(null); setForm({}); }}>Annuler</ModalBtn>
              <ModalBtn variant="primary" color={COLOR} icon="ti-check" onClick={saveCasier} disabled={!form.code || !form.pharmacie_id}>
                {modal === "edit" ? "Enregistrer" : "Créer"}
              </ModalBtn>
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FieldM label="Pharmacie *" full>
              <select value={form.pharmacie_id || ""} onChange={(e) => setForm({ ...form, pharmacie_id: e.target.value })}>
                <option value="">— Sélectionner —</option>
                {pharmacies.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </FieldM>
            <FieldM label="Code *"><input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="A1, R2..." /></FieldM>
            <FieldM label="Libellé"><input value={form.libelle || ""} onChange={(e) => setForm({ ...form, libelle: e.target.value })} placeholder="Casier antalgiques..." /></FieldM>
            <FieldM label="Zone"><input value={form.zone || ""} onChange={(e) => setForm({ ...form, zone: e.target.value })} placeholder="A, R, S..." /></FieldM>
            <FieldM label="Catégorie"><input value={form.categorie || ""} onChange={(e) => setForm({ ...form, categorie: e.target.value })} placeholder="antalgiques, antibiotiques..." /></FieldM>
            <FieldM label="Type" full>
              <select value={form.type_casier || "standard"} onChange={(e) => setForm({ ...form, type_casier: e.target.value })}>
                {TYPE_CASIER.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </FieldM>
            {form.type_casier === "refrigere" && (
              <>
                <FieldM label="Température min (°C)"><input type="number" value={form.temperature_min || ""} onChange={(e) => setForm({ ...form, temperature_min: e.target.value })} /></FieldM>
                <FieldM label="Température max (°C)"><input type="number" value={form.temperature_max || ""} onChange={(e) => setForm({ ...form, temperature_max: e.target.value })} /></FieldM>
              </>
            )}
            <FieldM label="Capacité max" full><input type="number" value={form.capacite_max || ""} onChange={(e) => setForm({ ...form, capacite_max: e.target.value })} /></FieldM>
            <FieldM label="Notes" full><textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></FieldM>
          </div>
        </ModernModal>
      </PageShell>
    </>
  );
}

function Tag({ color, icon, children }) {
  return (
    <span style={{
      background: `${color}25`, color: "#fff",
      border: `1px solid ${color}40`, padding: "3px 8px",
      borderRadius: 8, fontSize: 11, fontWeight: 700,
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      <i className={`ti ${icon}`} /> {children}
    </span>
  );
}

function FieldM({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}
