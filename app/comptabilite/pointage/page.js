"use client";
// =============================================================
//  /comptabilite/pointage — Pointage factures côté ÉTABLISSEMENT
//  L'établissement réceptionne, vérifie, valide pour paiement
// =============================================================
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { PageShell, ModernCard, ModernModal, ModalBtn, HiTechIconBox } from "../../components/ui-premium";

const COLOR = "#C9867F";

const POINTAGE_CONFIG = {
  a_pointer:          { c: "#EF9F27", ic: "ti-clipboard",      l: "À pointer" },
  pointee:            { c: "#7CC8C8", ic: "ti-eye-check",      l: "Pointée" },
  contestee:          { c: "#D45E5E", ic: "ti-alert-octagon",  l: "Contestée" },
  validee_paiement:   { c: "#185FA5", ic: "ti-check",          l: "Validée paiement" },
  payee:              { c: "#5aa05a", ic: "ti-check-circle",   l: "Payée" },
};

export default function PointageFacturesPage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();

  const [factures, setFactures] = useState([]);
  const [pointages, setPointages] = useState({});  // facture_id -> pointage
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fStatut, setFStatut] = useState("");
  const [modal, setModal] = useState(null);
  const [pointageEdit, setPointageEdit] = useState({});

  useEffect(() => { if (auth.ready) reload(); }, [auth.ready, auth.etabId]);

  async function reload() {
    setLoading(true);
    try {
      // Factures qui concernent cet établissement (ou tous si "Tous")
      let q = supabase.from("v_factures_complete").select("*").eq("structure_id", auth.structureId).in("statut", ["envoyee", "validee", "partiellement_payee", "payee", "en_retard"]);
      if (auth.etabId) q = q.eq("etablissement_id", auth.etabId);
      const r = await q.order("date_facture", { ascending: false }).limit(200);
      setFactures(r.data || []);

      // Pointages associés
      const ids = (r.data || []).map(f => f.id);
      if (ids.length > 0) {
        const p = await supabase.from("factures_pointage").select("*").in("facture_id", ids);
        const map = {};
        (p.data || []).forEach(pt => { map[pt.facture_id] = pt; });
        setPointages(map);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function savePointage() {
    const facture = factures.find(f => f.id === pointageEdit.facture_id);
    if (!facture) return;

    const existing = pointages[facture.id];

    if (existing) {
      await supabase.from("factures_pointage").update({
        statut_pointage: pointageEdit.statut_pointage,
        conformite_quantites: pointageEdit.conformite_quantites,
        conformite_prix: pointageEdit.conformite_prix,
        conformite_lpp: pointageEdit.conformite_lpp,
        motif_contestation: pointageEdit.motif_contestation,
        commentaire: pointageEdit.commentaire,
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await supabase.from("factures_pointage").insert({
        structure_id: auth.structureId,
        facture_id: facture.id,
        etablissement_id: facture.etablissement_id,
        date_reception: new Date().toISOString().substring(0, 10),
        statut_pointage: pointageEdit.statut_pointage || "pointee",
        conformite_quantites: pointageEdit.conformite_quantites,
        conformite_prix: pointageEdit.conformite_prix,
        conformite_lpp: pointageEdit.conformite_lpp,
        motif_contestation: pointageEdit.motif_contestation,
        commentaire: pointageEdit.commentaire,
      });
    }

    setModal(null);
    setPointageEdit({});
    reload();
  }

  function openPointage(facture) {
    const existing = pointages[facture.id] || {};
    setPointageEdit({
      facture_id: facture.id,
      statut_pointage: existing.statut_pointage || "pointee",
      conformite_quantites: existing.conformite_quantites,
      conformite_prix: existing.conformite_prix,
      conformite_lpp: existing.conformite_lpp,
      motif_contestation: existing.motif_contestation || "",
      commentaire: existing.commentaire || "",
    });
    setModal("pointer");
  }

  const stats = useMemo(() => {
    const aPointer = factures.filter(f => !pointages[f.id] || pointages[f.id].statut_pointage === "a_pointer").length;
    const contestees = factures.filter(f => pointages[f.id]?.statut_pointage === "contestee").length;
    const total = factures.reduce((a, f) => a + (f.montant_ttc || 0), 0);
    const restant = factures.reduce((a, f) => a + (f.reste_a_payer || 0), 0);
    return { total: factures.length, aPointer, contestees, montantTotal: total, restant };
  }, [factures, pointages]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return factures.filter(f => {
      if (s && !((f.numero || "").toLowerCase().includes(s) || (f.magasin_nom || "").toLowerCase().includes(s))) return false;
      if (fStatut) {
        const pt = pointages[f.id]?.statut_pointage || "a_pointer";
        if (pt !== fStatut) return false;
      }
      return true;
    });
  }, [factures, pointages, search, fStatut]);

  return (
    <>
      <TopBar />
      <PageShell
        color={COLOR}
        icon="ti-clipboard-check"
        title="Pointage factures fournisseurs"
        subtitle="Réception et validation factures du magasin"
        badge={stats.aPointer > 0 ? `${stats.aPointer} à pointer` : null}
      >
        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 18 }}>
          <Kpi icon="ti-receipt" color={COLOR} label="Factures reçues" value={stats.total} />
          <Kpi icon="ti-clipboard" color="#EF9F27" label="À pointer" value={stats.aPointer} />
          <Kpi icon="ti-alert-octagon" color={stats.contestees > 0 ? "#D45E5E" : "#888"} label="Contestées" value={stats.contestees} />
          <Kpi icon="ti-currency-euro" color="#5aa05a" label="Montant total TTC" value={`${stats.montantTotal.toFixed(0)} €`} />
          <Kpi icon="ti-clock" color="#EF9F27" label="Restant à payer" value={`${stats.restant.toFixed(0)} €`} />
        </div>

        {/* Filtres */}
        <ModernCard color={COLOR} variant="default" padding={14} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input placeholder="N° facture, fournisseur..." value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", color: "#fff", border: "1px solid rgba(255,255,255,.15)", fontFamily: "Quicksand", fontSize: 13 }} />
            <select value={fStatut} onChange={(e) => setFStatut(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", color: "#fff", border: "1px solid rgba(255,255,255,.15)", fontFamily: "Quicksand", fontSize: 13 }}>
              <option value="">Tous statuts pointage</option>
              {Object.entries(POINTAGE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
            </select>
          </div>
        </ModernCard>

        {/* Liste */}
        {loading ? <p style={{ color: "rgba(255,255,255,.6)" }}>Chargement...</p> : filtered.length === 0 ? (
          <ModernCard color={COLOR} variant="accent" icon="ti-info-circle" title="Aucune facture"><p style={{ color: "rgba(255,255,255,.7)", margin: 0 }}>Pas de facture à pointer pour cet établissement.</p></ModernCard>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map(f => {
              const pt = pointages[f.id];
              const cfg = POINTAGE_CONFIG[pt?.statut_pointage || "a_pointer"];
              return (
                <ModernCard key={f.id} color={cfg.c} variant="default" padding={0} hoverable
                  onClick={() => openPointage(f)}>
                  <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr auto", gap: 12, alignItems: "center" }}>
                    <HiTechIconBox name={cfg.ic} color={cfg.c} variant="gradient" size={36} pulse={cfg.l === "À pointer"} />
                    <div>
                      <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>{f.numero}</div>
                      <div style={{ color: "rgba(255,255,255,.55)", fontSize: 11 }}>de {f.magasin_nom} · {f.date_facture ? new Date(f.date_facture).toLocaleDateString("fr-FR") : "—"}</div>
                    </div>
                    <div>
                      <div style={{ color: "#fff", fontWeight: 800, fontSize: 14, fontFamily: "monospace" }}>{(f.montant_ttc || 0).toFixed(2)} €</div>
                      <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10 }}>HT {(f.montant_ht || 0).toFixed(2)} · TVA {(f.montant_tva || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      {pt && (
                        <div style={{ display: "flex", gap: 4 }}>
                          {pt.conformite_quantites != null && <Conformite ok={pt.conformite_quantites} label="Qté" />}
                          {pt.conformite_prix != null && <Conformite ok={pt.conformite_prix} label="Prix" />}
                          {pt.conformite_lpp != null && <Conformite ok={pt.conformite_lpp} label="LPP" />}
                        </div>
                      )}
                    </div>
                    <span style={{ background: `${cfg.c}30`, color: cfg.c, border: `1px solid ${cfg.c}60`, padding: "4px 10px", borderRadius: 10, fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{cfg.l}</span>
                  </div>
                </ModernCard>
              );
            })}
          </div>
        )}

        {/* MODAL pointage */}
        <ModernModal
          open={modal === "pointer"}
          onClose={() => { setModal(null); setPointageEdit({}); }}
          color={COLOR} icon="ti-clipboard-check"
          title="Pointage de facture"
          size="lg"
          actions={
            <>
              <ModalBtn variant="secondary" onClick={() => { setModal(null); setPointageEdit({}); }}>Annuler</ModalBtn>
              <ModalBtn variant="primary" color={COLOR} icon="ti-check" onClick={savePointage}>Enregistrer</ModalBtn>
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Statut pointage *" full>
              <select value={pointageEdit.statut_pointage || "pointee"} onChange={(e) => setPointageEdit({ ...pointageEdit, statut_pointage: e.target.value })}>
                {Object.entries(POINTAGE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
              </select>
            </Field>

            <Field label="Conformité quantités">
              <select value={pointageEdit.conformite_quantites == null ? "" : String(pointageEdit.conformite_quantites)} onChange={(e) => setPointageEdit({ ...pointageEdit, conformite_quantites: e.target.value === "" ? null : e.target.value === "true" })}>
                <option value="">— Non vérifié —</option>
                <option value="true">✓ Conforme</option>
                <option value="false">✗ Non conforme</option>
              </select>
            </Field>
            <Field label="Conformité prix">
              <select value={pointageEdit.conformite_prix == null ? "" : String(pointageEdit.conformite_prix)} onChange={(e) => setPointageEdit({ ...pointageEdit, conformite_prix: e.target.value === "" ? null : e.target.value === "true" })}>
                <option value="">— Non vérifié —</option>
                <option value="true">✓ Conforme</option>
                <option value="false">✗ Non conforme</option>
              </select>
            </Field>
            <Field label="Conformité LPP/LPPR" full>
              <select value={pointageEdit.conformite_lpp == null ? "" : String(pointageEdit.conformite_lpp)} onChange={(e) => setPointageEdit({ ...pointageEdit, conformite_lpp: e.target.value === "" ? null : e.target.value === "true" })}>
                <option value="">— Non vérifié —</option>
                <option value="true">✓ Conforme</option>
                <option value="false">✗ Non conforme</option>
              </select>
            </Field>

            {pointageEdit.statut_pointage === "contestee" && (
              <Field label="Motif contestation *" full>
                <textarea value={pointageEdit.motif_contestation || ""} onChange={(e) => setPointageEdit({ ...pointageEdit, motif_contestation: e.target.value })} rows={3} placeholder="Décrivez le motif de contestation..." />
              </Field>
            )}

            <Field label="Commentaire" full>
              <textarea value={pointageEdit.commentaire || ""} onChange={(e) => setPointageEdit({ ...pointageEdit, commentaire: e.target.value })} rows={2} />
            </Field>
          </div>
        </ModernModal>
      </PageShell>
    </>
  );
}

function Conformite({ ok, label }) {
  return (
    <span style={{
      background: ok ? "rgba(90,160,90,.20)" : "rgba(212,94,94,.20)",
      color: ok ? "#5aa05a" : "#D45E5E",
      border: `1px solid ${ok ? "#5aa05a" : "#D45E5E"}50`,
      padding: "2px 6px", borderRadius: 6, fontSize: 9, fontWeight: 800,
      display: "inline-flex", alignItems: "center", gap: 2,
    }}>
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}

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

function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}
