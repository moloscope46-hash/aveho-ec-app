"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { PageShell, ModernCard, ModernModal, ModalBtn, HiTechIconBox } from "../../components/ui-premium";
import PermissionGate from "../../components/PermissionGate";

const COLOR = "#185FA5";

const STATUTS = [
  { v: "brouillon",      l: "Brouillon",      c: "#888",     ic: "ti-edit" },
  { v: "envoyee",        l: "Envoyée",        c: "#185FA5",  ic: "ti-send" },
  { v: "en_preparation", l: "En préparation", c: "#EF9F27",  ic: "ti-package" },
  { v: "expediee",       l: "Expédiée",       c: "#7CC8C8",  ic: "ti-truck" },
  { v: "livree",         l: "Livrée",         c: "#5aa05a",  ic: "ti-check" },
  { v: "annulee",        l: "Annulée",        c: "#D45E5E",  ic: "ti-x" },
];

const URGENCES = [
  { v: "normale",  l: "Normale",  c: "#7CC8C8" },
  { v: "haute",    l: "Haute",    c: "#EF9F27" },
  { v: "critique", l: "Critique", c: "#D45E5E" },
];

export default function CommandesPharmaciePage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const [commandes, setCommandes] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [magasins, setMagasins] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fStatut, setFStatut] = useState("");
  const [fType, setFType] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => { if (auth.ready) reload(); }, [auth.ready]);

  async function reload() {
    setLoading(true);
    const [c, p, m, f] = await Promise.all([
      supabase.from("pharmacie_commandes").select("*, pharmacie:pharmacie_id(nom)").eq("structure_id", auth.structureId).order("date_commande", { ascending: false }),
      supabase.from("pharmacies").select("id, nom").eq("structure_id", auth.structureId),
      supabase.from("magasins").select("id, nom").eq("structure_id", auth.structureId),
      supabase.from("fournisseurs").select("id, nom").eq("structure_id", auth.structureId),
    ]);
    setCommandes(c.data || []);
    setPharmacies(p.data || []);
    setMagasins(m.data || []);
    setFournisseurs(f.data || []);
    setLoading(false);
  }

  async function saveCommande() {
    const numero = `CMD-PHARM-${Date.now().toString(36).toUpperCase()}`;
    const payload = {
      structure_id: auth.structureId,
      pharmacie_id: form.pharmacie_id,
      numero,
      type_commande: form.type_commande || "magasin",
      magasin_id: form.type_commande === "magasin" ? form.magasin_id : null,
      fournisseur_id: form.type_commande === "fournisseur" ? form.fournisseur_id : null,
      statut: "brouillon",
      urgence: form.urgence || "normale",
      date_livraison_souhaitee: form.date_livraison_souhaitee || null,
      commentaire: form.commentaire,
    };
    await supabase.from("pharmacie_commandes").insert(payload);
    setModal(null);
    setForm({});
    reload();
  }

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return commandes.filter(c => {
      if (s && !((c.numero || "").toLowerCase().includes(s) || (c.pharmacie?.nom || "").toLowerCase().includes(s))) return false;
      if (fStatut && c.statut !== fStatut) return false;
      if (fType && c.type_commande !== fType) return false;
      return true;
    });
  }, [commandes, search, fStatut, fType]);

  return (
    <>
      <TopBar />
      <PageShell
        color={COLOR}
        icon="ti-shopping-bag"
        title="Commandes pharmacie"
        subtitle="Vers magasin ou fournisseur direct"
        badge={`${commandes.length}`}
        actions={
          <button onClick={() => { setForm({ pharmacie_id: pharmacies[0]?.id, type_commande: "magasin", urgence: "normale" }); setModal("new"); }} style={{
            padding: "10px 18px", borderRadius: 10,
            background: `linear-gradient(135deg, ${COLOR} 0%, ${COLOR}dd 100%)`,
            color: "#fff", border: "none", fontFamily: "Quicksand", fontWeight: 700, fontSize: 13,
            cursor: "pointer", boxShadow: `0 4px 12px ${COLOR}50`,
          }}>
            <i className="ti ti-plus" /> Nouvelle commande
          </button>
        }
      >
        {/* Filtres */}
        <ModernCard color={COLOR} variant="default" padding={14} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input placeholder="Rechercher numéro/pharmacie..." value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.15)", color: "#fff" }} />
            <select value={fStatut} onChange={(e) => setFStatut(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.15)", color: "#fff" }}>
              <option value="">Tous statuts</option>
              {STATUTS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
            <select value={fType} onChange={(e) => setFType(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.15)", color: "#fff" }}>
              <option value="">Tous types</option>
              <option value="magasin">Magasin</option>
              <option value="fournisseur">Fournisseur direct</option>
            </select>
          </div>
        </ModernCard>

        {/* Liste */}
        {loading ? (
          <ModernCard color={COLOR}><p style={{ color: "rgba(255,255,255,.7)", margin: 0 }}>Chargement...</p></ModernCard>
        ) : filtered.length === 0 ? (
          <ModernCard color={COLOR} variant="accent" icon="ti-info-circle" title="Aucune commande">
            <p style={{ color: "rgba(255,255,255,.7)", margin: 0 }}>Crée ta première commande pharmacie.</p>
          </ModernCard>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 14 }}>
            {filtered.map(c => {
              const stat = STATUTS.find(s => s.v === c.statut) || STATUTS[0];
              const urg = URGENCES.find(u => u.v === c.urgence) || URGENCES[0];
              return (
                <ModernCard key={c.id} color={stat.c} variant="default" hoverable onClick={() => router.push(`/pharmacie/commandes/${c.id}`)} padding={0}>
                  <div style={{ padding: "12px 16px", background: `linear-gradient(135deg, ${stat.c}30 0%, ${stat.c}15 100%)`, borderBottom: `1px solid ${stat.c}30`, display: "flex", alignItems: "center", gap: 12 }}>
                    <HiTechIconBox name={stat.ic} color={stat.c} variant="gradient" size={40} pulse={c.statut === "en_preparation"} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#fff", fontWeight: 800, fontSize: 13, lineHeight: 1.2 }}>{c.numero}</div>
                      <div style={{ color: "rgba(255,255,255,.55)", fontSize: 11, marginTop: 2 }}>{c.pharmacie?.nom}</div>
                    </div>
                    <span style={{ background: `${stat.c}30`, color: stat.c, border: `1px solid ${stat.c}60`, padding: "3px 10px", borderRadius: 10, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{stat.l}</span>
                  </div>
                  <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                    <Detail label="Type" value={c.type_commande === "magasin" ? "?? Magasin" : "?? Fournisseur"} />
                    <Detail label="Urgence" value={<span style={{ color: urg.c, fontWeight: 700 }}>{urg.l}</span>} />
                    <Detail label="Commandée" value={c.date_commande ? new Date(c.date_commande).toLocaleDateString("fr-FR") : "—"} />
                    <Detail label="Livraison" value={c.date_livraison_souhaitee ? new Date(c.date_livraison_souhaitee).toLocaleDateString("fr-FR") : "—"} />
                    {c.montant_total_ttc > 0 && <Detail label="Total TTC" value={`${c.montant_total_ttc.toFixed(2)} €`} full />}
                  </div>
                </ModernCard>
              );
            })}
          </div>
        )}

        {/* MODAL CRÉATION */}
        <ModernModal
          open={modal === "new"}
          onClose={() => { setModal(null); setForm({}); }}
          color={COLOR}
          icon="ti-shopping-bag"
          title="Nouvelle commande pharmacie"
          actions={
            <>
              <ModalBtn variant="secondary" onClick={() => { setModal(null); setForm({}); }}>Annuler</ModalBtn>
              <ModalBtn variant="primary" color={COLOR} icon="ti-check" onClick={saveCommande} disabled={!form.pharmacie_id || (form.type_commande === "magasin" && !form.magasin_id) || (form.type_commande === "fournisseur" && !form.fournisseur_id)}>
                Créer
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
            <FieldM label="Type de commande *" full>
              <select value={form.type_commande || "magasin"} onChange={(e) => setForm({ ...form, type_commande: e.target.value })}>
                <option value="magasin">?? Vers magasin</option>
                <option value="fournisseur">?? Vers fournisseur direct</option>
              </select>
            </FieldM>
            {form.type_commande === "magasin" && (
              <FieldM label="Magasin *" full>
                <select value={form.magasin_id || ""} onChange={(e) => setForm({ ...form, magasin_id: e.target.value })}>
                  <option value="">— Sélectionner —</option>
                  {magasins.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </select>
              </FieldM>
            )}
            {form.type_commande === "fournisseur" && (
              <FieldM label="Fournisseur *" full>
                <select value={form.fournisseur_id || ""} onChange={(e) => setForm({ ...form, fournisseur_id: e.target.value })}>
                  <option value="">— Sélectionner —</option>
                  {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                </select>
              </FieldM>
            )}
            <FieldM label="Urgence">
              <select value={form.urgence || "normale"} onChange={(e) => setForm({ ...form, urgence: e.target.value })}>
                {URGENCES.map(u => <option key={u.v} value={u.v}>{u.l}</option>)}
              </select>
            </FieldM>
            <FieldM label="Livraison souhaitée">
              <input type="date" value={form.date_livraison_souhaitee || ""} onChange={(e) => setForm({ ...form, date_livraison_souhaitee: e.target.value })} />
            </FieldM>
            <FieldM label="Commentaire" full>
              <textarea value={form.commentaire || ""} onChange={(e) => setForm({ ...form, commentaire: e.target.value })} rows={2} />
            </FieldM>
          </div>
        </ModernModal>
      </PageShell>
    </>
  );
}

function Detail({ label, value, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <div style={{ color: "rgba(255,255,255,.45)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
      <div style={{ color: "#fff", fontWeight: 600 }}>{value}</div>
    </div>
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
