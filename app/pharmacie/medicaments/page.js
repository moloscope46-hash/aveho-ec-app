"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { PageShell, ModernCard, ModernModal, ModalBtn, HiTechIconBox } from "../../components/ui-premium";
import PermissionGate from "../../../components/PermissionGate";

const COLOR = "#7a6fb0";

export default function MedicamentsPage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const [meds, setMeds] = useState([]);
  const [stocks, setStocks] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fStupef, setFStupef] = useState("");
  const [fThermo, setFThermo] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => { if (auth.ready) reload(); }, [auth.ready]);

  async function reload() {
    setLoading(true);
    const [m, s] = await Promise.all([
      supabase.from("medicaments").select("*").eq("structure_id", auth.structureId).order("nom_commercial"),
      supabase.from("pharmacie_stock").select("medicament_id, quantite, date_peremption").eq("structure_id", auth.structureId),
    ]);
    setMeds(m.data || []);
    // Agréger les stocks
    const agg = {};
    (s.data || []).forEach(row => {
      if (!agg[row.medicament_id]) agg[row.medicament_id] = { total: 0, perimes: 0, plus_proche: null };
      agg[row.medicament_id].total += row.quantite;
      if (row.date_peremption) {
        const days = (new Date(row.date_peremption) - new Date()) / 86400000;
        if (days < 30) agg[row.medicament_id].perimes += row.quantite;
        if (!agg[row.medicament_id].plus_proche || new Date(row.date_peremption) < new Date(agg[row.medicament_id].plus_proche)) {
          agg[row.medicament_id].plus_proche = row.date_peremption;
        }
      }
    });
    setStocks(agg);
    setLoading(false);
  }

  async function saveMed() {
    const payload = {
      structure_id: auth.structureId,
      code_cip: form.code_cip,
      nom_commercial: form.nom_commercial,
      dci: form.dci,
      dosage: form.dosage,
      forme: form.forme,
      laboratoire: form.laboratoire,
      classe_atc: form.classe_atc,
      conditionnement: form.conditionnement,
      prix_unitaire: parseFloat(form.prix_unitaire) || null,
      est_stupefiant: !!form.est_stupefiant,
      est_thermosensible: !!form.est_thermosensible,
      temperature_conservation_min: form.temperature_conservation_min || null,
      temperature_conservation_max: form.temperature_conservation_max || null,
      alerte_seuil_min: parseInt(form.alerte_seuil_min) || 0,
      notes: form.notes,
      actif: true,
    };
    if (form.id) await supabase.from("medicaments").update(payload).eq("id", form.id);
    else await supabase.from("medicaments").insert(payload);
    setModal(null);
    setForm({});
    reload();
  }

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return meds.filter(m => {
      if (s && !((m.nom_commercial || "").toLowerCase().includes(s) || (m.dci || "").toLowerCase().includes(s) || (m.code_cip || "").includes(s) || (m.laboratoire || "").toLowerCase().includes(s))) return false;
      if (fStupef === "oui" && !m.est_stupefiant) return false;
      if (fStupef === "non" && m.est_stupefiant) return false;
      if (fThermo === "oui" && !m.est_thermosensible) return false;
      return true;
    });
  }, [meds, search, fStupef, fThermo]);

  return (
    <>
      <TopBar />
      <PageShell
        color={COLOR}
        icon="ti-pill"
        title="Catalogue médicaments"
        subtitle="Référentiel des médicaments — CIP, DCI, dosage, conservation"
        badge={`${meds.length}`}
        actions={
          <button onClick={() => { setForm({}); setModal("new"); }} style={{
            padding: "10px 18px", borderRadius: 10,
            background: `linear-gradient(135deg, ${COLOR} 0%, ${COLOR}dd 100%)`,
            color: "#fff", border: "none", fontFamily: "Quicksand", fontWeight: 700, fontSize: 13,
            cursor: "pointer", boxShadow: `0 4px 12px ${COLOR}50`,
          }}>
            <i className="ti ti-plus" /> Nouveau médicament
          </button>
        }
      >
        {/* Filtres */}
        <ModernCard color={COLOR} variant="default" padding={14} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input placeholder="Rechercher (nom, DCI, CIP, labo)..." value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 250, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.15)", color: "#fff" }} />
            <select value={fStupef} onChange={(e) => setFStupef(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.15)", color: "#fff" }}>
              <option value="">Tous</option>
              <option value="oui">Stupéfiants uniquement</option>
              <option value="non">Hors stupéfiants</option>
            </select>
            <select value={fThermo} onChange={(e) => setFThermo(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.15)", color: "#fff" }}>
              <option value="">Tous</option>
              <option value="oui">Thermosensibles</option>
            </select>
          </div>
        </ModernCard>

        {/* Liste */}
        {loading ? (
          <ModernCard color={COLOR}><p style={{ color: "rgba(255,255,255,.7)", margin: 0 }}>Chargement...</p></ModernCard>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {filtered.map(m => {
              const stock = stocks[m.id] || { total: 0, perimes: 0, plus_proche: null };
              const enRupture = stock.total <= (m.alerte_seuil_min || 0);
              return (
                <ModernCard
                  key={m.id}
                  color={m.est_stupefiant ? "#D45E5E" : COLOR}
                  variant="default"
                  hoverable
                  onClick={() => { setForm(m); setModal("edit"); }}
                  padding={14}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <HiTechIconBox name={m.est_stupefiant ? "ti-shield-lock" : m.est_thermosensible ? "ti-snowflake" : "ti-pill"} color={m.est_stupefiant ? "#D45E5E" : COLOR} variant="gradient" size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#fff", fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>{m.nom_commercial}</div>
                      <div style={{ color: "rgba(255,255,255,.65)", fontSize: 11, marginTop: 2 }}>
                        {m.dci} {m.dosage && `· ${m.dosage}`} {m.forme && `· ${m.forme}`}
                      </div>
                      {m.code_cip && <div style={{ color: "rgba(255,255,255,.4)", fontSize: 10, marginTop: 2, fontFamily: "monospace" }}>CIP {m.code_cip}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    {m.est_stupefiant && <Tag color="#D45E5E" icon="ti-shield-lock">Stupéfiant</Tag>}
                    {m.est_thermosensible && <Tag color="#185FA5" icon="ti-snowflake">Thermosensible</Tag>}
                    {m.classe_atc && <Tag color="rgba(255,255,255,.10)" icon="ti-tag">{m.classe_atc}</Tag>}
                  </div>
                  {/* Stock + alerte */}
                  <div style={{ marginTop: 10, padding: "10px 0 0", borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", textTransform: "uppercase" }}>Stock</div>
                      <div style={{ color: enRupture ? "#D45E5E" : "#fff", fontWeight: 800, fontSize: 18 }}>{stock.total}</div>
                    </div>
                    {stock.perimes > 0 && (
                      <Tag color="#EF9F27" icon="ti-alert-triangle">{stock.perimes} périmant 30j</Tag>
                    )}
                    {enRupture && <Tag color="#D45E5E" icon="ti-arrow-down">Rupture</Tag>}
                    {m.prix_unitaire && <div style={{ color: "rgba(255,255,255,.7)", fontSize: 12 }}>{m.prix_unitaire.toFixed(2)} €</div>}
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
          icon="ti-pill"
          title={modal === "edit" ? "Modifier médicament" : "Nouveau médicament"}
          size="lg"
          actions={
            <>
              <ModalBtn variant="secondary" onClick={() => { setModal(null); setForm({}); }}>Annuler</ModalBtn>
              <ModalBtn variant="primary" color={COLOR} icon="ti-check" onClick={saveMed} disabled={!form.nom_commercial}>
                {modal === "edit" ? "Enregistrer" : "Créer"}
              </ModalBtn>
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FieldM label="Nom commercial *" full><input value={form.nom_commercial || ""} onChange={(e) => setForm({ ...form, nom_commercial: e.target.value })} /></FieldM>
            <FieldM label="DCI"><input value={form.dci || ""} onChange={(e) => setForm({ ...form, dci: e.target.value })} placeholder="Paracétamol" /></FieldM>
            <FieldM label="Dosage"><input value={form.dosage || ""} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="1000mg" /></FieldM>
            <FieldM label="Forme"><input value={form.forme || ""} onChange={(e) => setForm({ ...form, forme: e.target.value })} placeholder="Comprimé" /></FieldM>
            <FieldM label="Code CIP"><input value={form.code_cip || ""} onChange={(e) => setForm({ ...form, code_cip: e.target.value })} placeholder="13 chiffres" /></FieldM>
            <FieldM label="Laboratoire"><input value={form.laboratoire || ""} onChange={(e) => setForm({ ...form, laboratoire: e.target.value })} /></FieldM>
            <FieldM label="Classe ATC"><input value={form.classe_atc || ""} onChange={(e) => setForm({ ...form, classe_atc: e.target.value })} placeholder="N02BE01" /></FieldM>
            <FieldM label="Conditionnement"><input value={form.conditionnement || ""} onChange={(e) => setForm({ ...form, conditionnement: e.target.value })} placeholder="Boîte de 8" /></FieldM>
            <FieldM label="Prix unitaire (€)"><input type="number" step="0.01" value={form.prix_unitaire || ""} onChange={(e) => setForm({ ...form, prix_unitaire: e.target.value })} /></FieldM>
            <FieldM label="Seuil alerte rupture"><input type="number" value={form.alerte_seuil_min || ""} onChange={(e) => setForm({ ...form, alerte_seuil_min: e.target.value })} /></FieldM>
            <FieldM label="Flags" full>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginRight: 18, color: "#142131" }}>
                <input type="checkbox" checked={!!form.est_stupefiant} onChange={(e) => setForm({ ...form, est_stupefiant: e.target.checked })} />
                <i className="ti ti-shield-lock" style={{ color: "#D45E5E" }} /> Stupéfiant
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#142131" }}>
                <input type="checkbox" checked={!!form.est_thermosensible} onChange={(e) => setForm({ ...form, est_thermosensible: e.target.checked })} />
                <i className="ti ti-snowflake" style={{ color: "#185FA5" }} /> Thermosensible
              </label>
            </FieldM>
            {form.est_thermosensible && (
              <>
                <FieldM label="Température min (°C)"><input type="number" value={form.temperature_conservation_min || ""} onChange={(e) => setForm({ ...form, temperature_conservation_min: e.target.value })} /></FieldM>
                <FieldM label="Température max (°C)"><input type="number" value={form.temperature_conservation_max || ""} onChange={(e) => setForm({ ...form, temperature_conservation_max: e.target.value })} /></FieldM>
              </>
            )}
            <FieldM label="Notes" full><textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></FieldM>
          </div>
        </ModernModal>
      </PageShell>
    </>
  );
}

function Tag({ color, icon, children }) {
  return <span style={{ background: `${color}25`, color: "#fff", border: `1px solid ${color}40`, padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
    <i className={`ti ${icon}`} /> {children}
  </span>;
}

function FieldM({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}
