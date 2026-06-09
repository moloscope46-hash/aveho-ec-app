"use client";
// =============================================================
//  /magasin/facturation — Facturation côté MAGASIN
//  Le magasin facture les établissements (clients)
// =============================================================
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { PageShell, ModernCard, ModernModal, ModalBtn, HiTechIconBox } from "../../components/ui-premium";

const COLOR = "#185FA5";

const STATUT_CONFIG = {
  brouillon:            { c: "#888",    ic: "ti-edit",          l: "Brouillon" },
  validee:              { c: "#7CC8C8", ic: "ti-check",         l: "Validée" },
  envoyee:              { c: "#185FA5", ic: "ti-send",          l: "Envoyée" },
  partiellement_payee:  { c: "#EF9F27", ic: "ti-coins",         l: "Partielle" },
  payee:                { c: "#5aa05a", ic: "ti-check-circle",  l: "Payée" },
  en_retard:            { c: "#D45E5E", ic: "ti-alert-octagon", l: "En retard" },
  echeance_proche:      { c: "#EF9F27", ic: "ti-clock",         l: "Échéance proche" },
  annulee:              { c: "#888",    ic: "ti-x",             l: "Annulée" },
};

export default function FacturationMagasinPage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();

  const [factures, setFactures] = useState([]);
  const [magasins, setMagasins] = useState([]);
  const [etablissements, setEtablissements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [search, setSearch] = useState("");
  const [fStatut, setFStatut] = useState("");
  const [fEtab, setFEtab] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  // KPIs
  const stats = useMemo(() => {
    const total = factures.reduce((a, f) => a + (f.montant_ttc || 0), 0);
    const paye = factures.reduce((a, f) => a + (f.montant_paye || 0), 0);
    const enRetard = factures.filter(f => f.statut_calcule === "en_retard");
    return {
      total: factures.length,
      ca: total,
      paye,
      restant: total - paye,
      enRetard: enRetard.length,
      montantRetard: enRetard.reduce((a, f) => a + (f.reste_a_payer || 0), 0),
    };
  }, [factures]);

  useEffect(() => { if (auth.ready) reload(); }, [auth.ready]);

  async function reload() {
    setLoading(true);
    try {
      const r = await supabase.from("v_factures_complete").select("*").eq("structure_id", auth.structureId).order("date_facture", { ascending: false }).limit(200);
      if (r.error?.code === "42P01") { setTableMissing(true); setLoading(false); return; }
      setFactures(r.data || []);

      const [m, e] = await Promise.all([
        supabase.from("magasins").select("id, nom").eq("structure_id", auth.structureId),
        supabase.from("etablissements").select("id, nom, code, siret, adresse").eq("structure_id", auth.structureId).order("nom"),
      ]);
      setMagasins(m.data || []);
      setEtablissements(e.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function createFacture() {
    const etab = etablissements.find(e => e.id === form.etablissement_id);
    const mag = magasins.find(m => m.id === form.magasin_id);

    // Génère numéro auto via RPC
    const { data: numero } = await supabase.rpc("next_facture_numero", {
      p_structure_id: auth.structureId,
      p_magasin_id: form.magasin_id,
      p_type: form.type_doc || "facture",
    });

    const echeance = new Date();
    echeance.setDate(echeance.getDate() + (parseInt(form.delai_paiement) || 30));

    const { data, error } = await supabase.from("factures").insert({
      structure_id: auth.structureId,
      magasin_id: form.magasin_id,
      etablissement_id: form.etablissement_id,
      emetteur_nom: mag?.nom,
      client_nom: etab?.nom,
      client_siret: etab?.siret,
      client_adresse: etab?.adresse,
      numero: numero || `FA-DRAFT-${Date.now()}`,
      type_doc: form.type_doc || "facture",
      date_facture: form.date_facture || new Date().toISOString().substring(0, 10),
      date_echeance: echeance.toISOString().substring(0, 10),
      delai_paiement: parseInt(form.delai_paiement) || 30,
      mode_paiement: form.mode_paiement || "virement",
      commentaire: form.commentaire,
      statut: "brouillon",
    }).select().single();

    if (error) { alert(error.message); return; }
    setModal(null);
    setForm({});
    router.push(`/magasin/facturation/${data.id}`);
  }

  async function changeStatut(facture, newStatut) {
    const updates = { statut: newStatut };
    if (newStatut === "validee") {
      updates.est_validee = true;
      updates.date_validation = new Date().toISOString();
    }
    if (newStatut === "envoyee") {
      updates.est_envoyee = true;
      updates.date_envoi = new Date().toISOString();
    }
    await supabase.from("factures").update(updates).eq("id", facture.id);
    reload();
  }

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return factures.filter(f => {
      if (s && !((f.numero || "").toLowerCase().includes(s) || (f.etablissement_nom || "").toLowerCase().includes(s) || (f.magasin_nom || "").toLowerCase().includes(s))) return false;
      if (fStatut && f.statut_calcule !== fStatut) return false;
      if (fEtab && f.etablissement_id !== fEtab) return false;
      return true;
    });
  }, [factures, search, fStatut, fEtab]);

  if (tableMissing) {
    return (
      <>
        <TopBar />
        <PageShell color={COLOR} icon="ti-receipt" title="Facturation magasin" subtitle="Module non installé">
          <ModernCard color={COLOR} variant="accent" icon="ti-alert-triangle" title="Tables manquantes">
            <p style={{ color: "rgba(255,255,255,.8)" }}>Exécute <strong>aveho-MODULE-facturation.sql</strong> dans Supabase.</p>
          </ModernCard>
        </PageShell>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <PageShell
        color={COLOR}
        icon="ti-receipt"
        title="Facturation magasin"
        subtitle="Émission factures clients (établissements)"
        badge={`${factures.length}`}
        actions={
          <button onClick={() => { setForm({ magasin_id: magasins[0]?.id, type_doc: "facture", date_facture: new Date().toISOString().substring(0, 10), delai_paiement: 30, mode_paiement: "virement" }); setModal("new"); }} style={{
            padding: "10px 18px", borderRadius: 10,
            background: `linear-gradient(135deg, ${COLOR} 0%, ${COLOR}cc 100%)`,
            color: "#fff", border: "none",
            fontFamily: "Quicksand", fontWeight: 700, fontSize: 13,
            cursor: "pointer", boxShadow: `0 4px 12px ${COLOR}50`,
          }}>
            <i className="ti ti-plus" /> Nouvelle facture
          </button>
        }
      >
        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 18 }}>
          <Kpi icon="ti-receipt" color={COLOR} label="Factures" value={stats.total} />
          <Kpi icon="ti-currency-euro" color="#5aa05a" label="CA total HT" value={`${stats.ca.toFixed(0)} €`} />
          <Kpi icon="ti-cash" color="#7CC8C8" label="Encaissé" value={`${stats.paye.toFixed(0)} €`} />
          <Kpi icon="ti-clock" color="#EF9F27" label="Restant dû" value={`${stats.restant.toFixed(0)} €`} />
          <Kpi icon="ti-alert-octagon" color={stats.enRetard > 0 ? "#D45E5E" : "#888"} label="En retard" value={`${stats.enRetard} (${stats.montantRetard.toFixed(0)}€)`} />
        </div>

        {/* Filtres */}
        <ModernCard color={COLOR} variant="default" padding={14} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input placeholder="N° facture, client, magasin..." value={search} onChange={(e) => setSearch(e.target.value)}
              style={inpDark} />
            <select value={fStatut} onChange={(e) => setFStatut(e.target.value)} style={inpDark}>
              <option value="">Tous statuts</option>
              {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
            </select>
            <select value={fEtab} onChange={(e) => setFEtab(e.target.value)} style={inpDark}>
              <option value="">Tous établissements</option>
              {etablissements.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
          </div>
        </ModernCard>

        {/* Liste */}
        {loading ? <Loader /> : filtered.length === 0 ? (
          <ModernCard color={COLOR} variant="accent" icon="ti-info-circle" title="Aucune facture"><p style={{ color: "rgba(255,255,255,.7)", margin: 0 }}>Crée ta première facture.</p></ModernCard>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map(f => {
              const stat = STATUT_CONFIG[f.statut_calcule] || STATUT_CONFIG.brouillon;
              return (
                <ModernCard key={f.id} color={stat.c} variant="default" padding={0} hoverable
                  onClick={() => router.push(`/magasin/facturation/${f.id}`)}>
                  <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr auto auto", gap: 12, alignItems: "center" }}>
                    <HiTechIconBox name={stat.ic} color={stat.c} variant="gradient" size={36} pulse={f.statut_calcule === "en_retard"} />
                    <div>
                      <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>{f.numero}</div>
                      <div style={{ color: "rgba(255,255,255,.55)", fontSize: 11 }}>{f.type_doc} · {f.date_facture ? new Date(f.date_facture).toLocaleDateString("fr-FR") : "—"}</div>
                    </div>
                    <div>
                      <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{f.etablissement_nom || "—"}</div>
                      <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10 }}>par {f.magasin_nom || "—"}</div>
                    </div>
                    <div>
                      <div style={{ color: "#fff", fontWeight: 800, fontSize: 14, fontFamily: "monospace" }}>{(f.montant_ttc || 0).toFixed(2)} €</div>
                      <div style={{ color: f.reste_a_payer > 0 ? "#EF9F27" : "#5aa05a", fontSize: 10 }}>
                        Reste : {(f.reste_a_payer || 0).toFixed(2)} €
                      </div>
                    </div>
                    <span style={{ background: `${stat.c}30`, color: stat.c, border: `1px solid ${stat.c}60`, padding: "4px 10px", borderRadius: 10, fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{stat.l}</span>
                    {f.statut_pointage_etab && (
                      <span style={{ background: "rgba(122,111,176,.20)", color: "#7a6fb0", border: "1px solid rgba(122,111,176,.40)", padding: "3px 8px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>
                        <i className="ti ti-check" /> {f.statut_pointage_etab}
                      </span>
                    )}
                  </div>
                </ModernCard>
              );
            })}
          </div>
        )}

        {/* MODAL Nouvelle */}
        <ModernModal
          open={modal === "new"}
          onClose={() => { setModal(null); setForm({}); }}
          color={COLOR} icon="ti-receipt"
          title="Nouvelle facture"
          actions={
            <>
              <ModalBtn variant="secondary" onClick={() => { setModal(null); setForm({}); }}>Annuler</ModalBtn>
              <ModalBtn variant="primary" color={COLOR} icon="ti-check" onClick={createFacture} disabled={!form.magasin_id || !form.etablissement_id}>Créer</ModalBtn>
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Magasin émetteur *" full>
              <select value={form.magasin_id || ""} onChange={(e) => setForm({ ...form, magasin_id: e.target.value })}>
                <option value="">—</option>
                {magasins.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
            </Field>
            <Field label="Client (établissement) *" full>
              <select value={form.etablissement_id || ""} onChange={(e) => setForm({ ...form, etablissement_id: e.target.value })}>
                <option value="">—</option>
                {etablissements.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </Field>
            <Field label="Type">
              <select value={form.type_doc || "facture"} onChange={(e) => setForm({ ...form, type_doc: e.target.value })}>
                <option value="facture">Facture</option>
                <option value="avoir">Avoir</option>
                <option value="proforma">Proforma</option>
                <option value="devis">Devis</option>
              </select>
            </Field>
            <Field label="Date facture">
              <input type="date" value={form.date_facture || ""} onChange={(e) => setForm({ ...form, date_facture: e.target.value })} />
            </Field>
            <Field label="Délai paiement (j)">
              <input type="number" value={form.delai_paiement || 30} onChange={(e) => setForm({ ...form, delai_paiement: e.target.value })} />
            </Field>
            <Field label="Mode paiement">
              <select value={form.mode_paiement || "virement"} onChange={(e) => setForm({ ...form, mode_paiement: e.target.value })}>
                <option value="virement">Virement</option>
                <option value="cheque">Chèque</option>
                <option value="cb">CB</option>
                <option value="prelevement">Prélèvement</option>
              </select>
            </Field>
            <Field label="Commentaire" full>
              <textarea value={form.commentaire || ""} onChange={(e) => setForm({ ...form, commentaire: e.target.value })} rows={2} />
            </Field>
          </div>
        </ModernModal>
      </PageShell>
    </>
  );
}

const inpDark = { flex: 1, minWidth: 180, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", color: "#fff", border: "1px solid rgba(255,255,255,.15)", fontFamily: "Quicksand", fontSize: 13 };

function Kpi({ icon, color, value, label }) {
  return (
    <ModernCard color={color} variant="accent" padding={14}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <HiTechIconBox name={icon} color={color} variant="gradient" size={38} />
        <div>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
          <div style={{ color: "rgba(255,255,255,.55)", fontSize: 10, marginTop: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
        </div>
      </div>
    </ModernCard>
  );
}

function Loader() { return <p style={{ color: "rgba(255,255,255,.6)" }}>Chargement...</p>; }

function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}
