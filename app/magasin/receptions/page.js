"use client";
// =============================================================
//  /magasin/receptions — Réception universelle (0.62.64)
//  3 sources : Fournisseurs / Transferts magasin / Demandes transfert
// =============================================================
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn, Modal } from "../../ui";
import { EmptyState } from "../../components/PremiumKpi";
import PageToolbar from "../../components/PageToolbar";
import BackButton from "../../components/BackButton";

const SOURCES = [
  { v: "fournisseur", l: "Fournisseur",         c: "#185FA5", ic: "ti-truck", desc: "BL d'un fournisseur externe" },
  { v: "transfert",   l: "Transfert magasin",   c: "#7a6fb0", ic: "ti-arrows-exchange", desc: "Transfert d'un autre magasin" },
  { v: "demande_int", l: "Demande interne",     c: "#5aa05a", ic: "ti-package", desc: "Retour matériel d'une DI" },
];

const STATUTS = [
  { v: "en_attente", l: "📦 En attente", c: "#EF9F27" },
  { v: "en_cours",   l: "🔧 En cours",   c: "#185FA5" },
  { v: "recu",       l: "✓ Reçu",        c: "#5aa05a" },
  { v: "anomalie",   l: "⚠ Anomalie",    c: "#e35d5b" },
];

export default function ReceptionsPage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [receptions, setReceptions] = useState({ fournisseur: [], transfert: [], demande: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fSource, setFSource] = useState("");
  const [fStatut, setFStatut] = useState("");

  const [scanModal, setScanModal] = useState(null);
  const [scanForm, setScanForm] = useState({});

  useEffect(() => { if (auth.ready) reload(); }, [auth.ready]);

  async function reload() {
    setLoading(true);
    try {
      // 1. BL fournisseurs en attente (commande envoyée non encore reçue)
      const fournR = await supabase.from("commandes_fournisseurs")
        .select("id, numero, date_commande, date_livraison_prevue, statut, fournisseur_id")
        .in("statut", ["envoyee", "confirmee", "partiellement_recue"])
        .order("date_livraison_prevue", { ascending: true });

      // 2. Transferts entrants en attente (vers ce magasin)
      const transR = await supabase.from("transferts")
        .select("id, numero, motif, priorite, statut, depot_destination_id, created_at")
        .in("statut", ["valide", "en_transit"])
        .order("created_at", { ascending: false });

      // 3. Demandes internes avec retour matériel
      const diR = await supabase.from("demandes_internes")
        .select("id, numero, type, statut, description, created_at")
        .eq("type", "retour")
        .in("statut", ["validee", "planifiee"])
        .order("created_at", { ascending: false })
        .limit(50);

      setReceptions({
        fournisseur: fournR.data || [],
        transfert: transR.data || [],
        demande: diR.data || [],
      });
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const allRows = useMemo(() => {
    const flat = [];
    receptions.fournisseur.forEach(r => flat.push({
      ...r, _source: "fournisseur", _label: `BC ${r.numero}`, _sub: "Commande fournisseur",
      _date: r.date_livraison_prevue, _statut: r.statut === "envoyee" ? "en_attente" : (r.statut === "partiellement_recue" ? "en_cours" : "en_attente"),
    }));
    receptions.transfert.forEach(r => flat.push({
      ...r, _source: "transfert", _label: `Transfert ${r.numero}`, _sub: r.motif || "Transfert magasin",
      _date: r.created_at, _statut: r.statut === "valide" ? "en_attente" : "en_cours",
    }));
    receptions.demande.forEach(r => flat.push({
      ...r, _source: "demande_int", _label: `DI ${r.numero}`, _sub: r.description || "Retour DI",
      _date: r.created_at, _statut: r.statut === "validee" ? "en_attente" : "en_cours",
    }));
    return flat;
  }, [receptions]);

  const filtered = useMemo(() => allRows.filter(r => {
    if (fSource && r._source !== fSource) return false;
    if (fStatut && r._statut !== fStatut) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = `${r._label} ${r._sub}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [allRows, search, fSource, fStatut]);

  const stats = useMemo(() => ({
    fournisseur: receptions.fournisseur.length,
    transfert: receptions.transfert.length,
    demande: receptions.demande.length,
    total: allRows.length,
  }), [receptions, allRows]);

  function openReception(row) {
    setScanForm({
      source: row._source,
      source_id: row.id,
      numero_bl: "",
      conforme: true,
      anomalies: "",
      lignes: [],
    });
    setScanModal(row);
  }

  async function saveReception() {
    if (!scanForm.numero_bl?.trim()) { alert("N° BL requis"); return; }
    try {
      if (scanForm.source === "fournisseur") {
        // Créer le BL fournisseur
        await supabase.from("bons_livraison_fournisseurs").insert({
          numero_bl: scanForm.numero_bl,
          commande_id: scanForm.source_id,
          recu_par: auth.user?.id,
          conforme: scanForm.conforme,
          anomalies: scanForm.anomalies || null,
          notes: scanForm.notes || null,
        });
        // Marquer la commande comme reçue
        await supabase.from("commandes_fournisseurs").update({
          statut: scanForm.conforme ? "recue" : "partiellement_recue",
          date_livraison_effective: new Date().toISOString().split("T")[0],
        }).eq("id", scanForm.source_id);
      } else if (scanForm.source === "transfert") {
        // Marquer le transfert comme reçu
        await supabase.from("transferts").update({
          statut: scanForm.conforme ? "recu" : "anomalie",
          date_reception: new Date().toISOString(),
          recu_par: auth.user?.id,
        }).eq("id", scanForm.source_id);
      } else if (scanForm.source === "demande_int") {
        // Marquer la DI comme terminée
        await supabase.from("demandes_internes").update({
          statut: "terminee",
        }).eq("id", scanForm.source_id);
      }
      setScanModal(null);
      await reload();
      alert("Réception enregistrée ✓");
    } catch (e) { alert("Erreur : " + e.message); }
  }

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content" style={{ padding: "20px 24px", maxWidth: 1200 }}>
        <BackButton />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <PageHead icon="ti-package-import" title="Réceptions" subtitle="Centralise les BL fournisseurs + transferts magasin + retours DI"
            color="#185FA5" />
          <Btn variant="primary" icon="ti-scan" onClick={() => router.push("/scan/quick?context=reception")}>Scanner colis</Btn>
        </div>

        {/* KPIs par source */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 12, marginBottom: 12 }}>
          <KpiTile label="Total à recevoir" value={stats.total} color="#142131" icon="ti-package-import" active={!fSource} onClick={() => setFSource("")} />
          {SOURCES.map(s => (
            <KpiTile key={s.v} label={s.l} value={stats[s.v === "demande_int" ? "demande" : s.v]} color={s.c} icon={s.ic}
              active={fSource === s.v} onClick={() => setFSource(fSource === s.v ? "" : s.v)} />
          ))}
        </div>

        <PageToolbar
          search={search} onSearch={setSearch}
          placeholder="Numéro, motif, description..."
          totalCount={allRows.length} filteredCount={filtered.length}
          accentColor="#185FA5"
          filters={[
            { key: "statut", label: "Statut", value: fStatut, onChange: setFStatut, type: "buttongroup",
              options: STATUTS.map(s => ({ v: s.v, l: s.l })) },
          ]}
          onReset={() => { setSearch(""); setFSource(""); setFStatut(""); }}
        />

        {loading ? (
          <Panel><div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>Chargement…</div></Panel>
        ) : filtered.length === 0 ? (
          <EmptyState icon="ti-package-off" title="Aucune réception en attente" desc="Pas de commande fournisseur, transfert ou retour DI à traiter." />
        ) : (
          <div className="av-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
            {filtered.map(r => {
              const source = SOURCES.find(s => s.v === r._source);
              const statut = STATUTS.find(st => st.v === r._statut) || STATUTS[0];
              return (
                <div key={`${r._source}-${r.id}`} data-3d="true" style={{
                  background: "#fff", border: "1px solid #eef1f4",
                  borderLeft: `4px solid ${source.c}`,
                  borderRadius: 12, padding: 14,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <span style={{
                      background: `${source.c}1A`, color: source.c,
                      padding: "3px 9px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                      display: "inline-flex", alignItems: "center", gap: 4,
                    }}>
                      <i className={`ti ${source.ic}`} /> {source.l.toUpperCase()}
                    </span>
                    <span style={{
                      background: `${statut.c}1A`, color: statut.c,
                      padding: "3px 9px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                    }}>
                      {statut.l}
                    </span>
                  </div>
                  <h3 style={{ margin: "6px 0", fontSize: 15, color: "#142131", fontWeight: 700 }}>{r._label}</h3>
                  <div style={{ fontSize: 12, color: "#5a6878", lineHeight: 1.4 }}>{r._sub}</div>
                  {r._date && (
                    <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 6 }}>
                      <i className="ti ti-calendar" /> {new Date(r._date).toLocaleDateString("fr-FR")}
                      {r._source === "fournisseur" && r._date && new Date(r._date) < new Date() && (
                        <span style={{ color: "#e35d5b", fontWeight: 700, marginLeft: 6 }}>⚠ En retard</span>
                      )}
                    </div>
                  )}
                  <button onClick={() => openReception(r)} style={{
                    marginTop: 10, width: "100%",
                    background: `linear-gradient(135deg, ${source.c}, ${source.c}dd)`,
                    color: "#fff", border: "none", padding: "8px 12px",
                    borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 6,
                  }}>
                    <i className="ti ti-package-import" /> Réceptionner
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal réception */}
        {scanModal && (
          <Modal open={true} onClose={() => setScanModal(null)} title={`Réceptionner — ${scanModal._label}`} kind="default" size="md"
            footer={<>
              <Btn variant="ghost" onClick={() => setScanModal(null)}>Annuler</Btn>
              <Btn variant="primary" onClick={saveReception}><i className="ti ti-check" /> Valider la réception</Btn>
            </>}>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ padding: 10, background: "#f4f7fa", borderRadius: 8, fontSize: 12 }}>
                <i className="ti ti-info-circle" /> Source : <b>{SOURCES.find(s => s.v === scanForm.source)?.l}</b> · {scanModal._sub}
              </div>
              {scanForm.source === "fournisseur" && (
                <label>N° BL fournisseur *
                  <input value={scanForm.numero_bl || ""} onChange={(e) => setScanForm({ ...scanForm, numero_bl: e.target.value })}
                    placeholder="BL-2026-001234"
                    style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "Consolas, monospace", marginTop: 4 }} />
                </label>
              )}
              {scanForm.source !== "fournisseur" && (
                <label>Référence interne (optionnel)
                  <input value={scanForm.numero_bl || ""} onChange={(e) => setScanForm({ ...scanForm, numero_bl: e.target.value || scanModal._label })}
                    placeholder={scanModal._label}
                    style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 }} />
                </label>
              )}
              <label style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, background: scanForm.conforme ? "rgba(94,160,90,.08)" : "rgba(227,93,91,.08)", borderRadius: 6 }}>
                <input type="checkbox" checked={!!scanForm.conforme} onChange={(e) => setScanForm({ ...scanForm, conforme: e.target.checked })} />
                <span style={{ fontWeight: 600, color: scanForm.conforme ? "#5aa05a" : "#e35d5b" }}>
                  {scanForm.conforme ? "✓ Conforme - tout est OK" : "⚠ Anomalie détectée"}
                </span>
              </label>
              {!scanForm.conforme && (
                <label>Description anomalies
                  <textarea value={scanForm.anomalies || ""} onChange={(e) => setScanForm({ ...scanForm, anomalies: e.target.value })}
                    rows={3} placeholder="Détailler ce qui pose problème (manque, casse, mauvaise référence...)"
                    style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 }} />
                </label>
              )}
              <label>Notes complémentaires
                <textarea value={scanForm.notes || ""} onChange={(e) => setScanForm({ ...scanForm, notes: e.target.value })}
                  rows={2} placeholder="Optionnel..."
                  style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 }} />
              </label>
              <div style={{ padding: 10, background: "rgba(24,95,165,.08)", border: "1px solid rgba(24,95,165,.2)", borderRadius: 8, fontSize: 11.5, color: "#185FA5" }}>
                💡 La saisie ligne par ligne avec lot/série/conformité est disponible dans <code>/magasin/receptions/{scanModal.id}</code> (à implémenter en 0.62.65)
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

function KpiTile({ label, value, color, icon, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "12px 14px",
      background: active ? `${color}1A` : "#fff",
      border: `1px solid ${active ? color : "#eef1f4"}`,
      borderLeft: `4px solid ${color}`,
      borderRadius: 12,
      cursor: "pointer", textAlign: "left",
      transition: "all 200ms",
      transform: active ? "scale(1.02)" : "scale(1)",
      boxShadow: active ? `0 4px 12px ${color}20` : "none",
      fontFamily: "inherit",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 22 }} />
        <div>
          <div style={{ fontSize: 11, color, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#142131", lineHeight: 1 }}>{value}</div>
        </div>
      </div>
    </button>
  );
}
