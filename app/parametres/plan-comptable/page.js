"use client";
// =============================================================
//  /parametres/plan-comptable — Plan comptable + journaux
// =============================================================
import { useEffect, useState, useMemo } from "react";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { PageShell, ModernCard, ModernModal, ModalBtn, HiTechIconBox } from "../../components/ui-premium";

const COLOR = "#5e4a8c";

const CLASSES = {
  1: { l: "Capital", c: "#7a6fb0" },
  2: { l: "Immobilisations", c: "#5e4a8c" },
  3: { l: "Stocks", c: "#EF9F27" },
  4: { l: "Tiers", c: "#7CC8C8" },
  5: { l: "Financier", c: "#185FA5" },
  6: { l: "Charges", c: "#D45E5E" },
  7: { l: "Produits", c: "#5aa05a" },
};

export default function PlanComptablePage() {
  const supabase = createClient();
  const auth = useAuth();
  const [comptes, setComptes] = useState([]);
  const [journaux, setJournaux] = useState([]);
  const [tab, setTab] = useState("comptes");
  const [tableMissing, setTableMissing] = useState(false);
  const [search, setSearch] = useState("");
  const [fClasse, setFClasse] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => { if (auth.ready) reload(); }, [auth.ready]);

  async function reload() {
    const [c, j] = await Promise.all([
      supabase.from("plans_comptables").select("*").eq("structure_id", auth.structureId).order("numero_compte"),
      supabase.from("journaux_compta").select("*").eq("structure_id", auth.structureId).order("code"),
    ]);
    if (c.error?.code === "42P01") { setTableMissing(true); return; }
    setComptes(c.data || []);
    setJournaux(j.data || []);
  }

  async function saveCompte() {
    const payload = {
      structure_id: auth.structureId,
      numero_compte: form.numero_compte,
      libelle: form.libelle,
      classe: parseInt(form.classe) || parseInt(form.numero_compte?.[0]) || null,
      type_compte: form.type_compte,
      sens_normal: form.sens_normal || "debit",
      lettrable: !!form.lettrable,
      collectif: !!form.collectif,
      actif: true,
    };
    if (form.id) {
      await supabase.from("plans_comptables").update(payload).eq("id", form.id);
    } else {
      await supabase.from("plans_comptables").insert(payload);
    }
    setModal(null); setForm({}); reload();
  }

  async function saveJournal() {
    const payload = {
      structure_id: auth.structureId,
      code: form.code,
      libelle: form.libelle,
      type_journal: form.type_journal,
      compte_contrepartie: form.compte_contrepartie,
      actif: true,
    };
    if (form.id) await supabase.from("journaux_compta").update(payload).eq("id", form.id);
    else await supabase.from("journaux_compta").insert(payload);
    setModal(null); setForm({}); reload();
  }

  const filteredComptes = useMemo(() => {
    const s = search.toLowerCase().trim();
    return comptes.filter(c => {
      if (s && !((c.numero_compte || "").includes(s) || (c.libelle || "").toLowerCase().includes(s))) return false;
      if (fClasse && c.classe !== parseInt(fClasse)) return false;
      return true;
    });
  }, [comptes, search, fClasse]);

  if (tableMissing) {
    return (
      <>
        <TopBar />
        <PageShell color={COLOR} icon="ti-book-2" title="Plan comptable" subtitle="Module non installé">
          <ModernCard color={COLOR} variant="accent" icon="ti-alert" title="Tables manquantes">
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
        icon="ti-book-2"
        title="Plan comptable"
        subtitle="Comptes et journaux comptables"
        badge={`${comptes.length} comptes · ${journaux.length} journaux`}
      >
        {/* Tabs */}
        <ModernCard color={COLOR} variant="default" padding={0} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
            <TabBtn active={tab === "comptes"} onClick={() => setTab("comptes")} color={COLOR}>
              <i className="ti ti-book-2" /> Comptes ({comptes.length})
            </TabBtn>
            <TabBtn active={tab === "journaux"} onClick={() => setTab("journaux")} color={COLOR}>
              <i className="ti ti-notebook" /> Journaux ({journaux.length})
            </TabBtn>
          </div>
        </ModernCard>

        {tab === "comptes" && (
          <>
            <ModernCard color={COLOR} variant="default" padding={14} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input placeholder="Numéro, libellé..." value={search} onChange={(e) => setSearch(e.target.value)}
                  style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", color: "#fff", border: "1px solid rgba(255,255,255,.15)", fontFamily: "Quicksand", fontSize: 13 }} />
                <select value={fClasse} onChange={(e) => setFClasse(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", color: "#fff", border: "1px solid rgba(255,255,255,.15)" }}>
                  <option value="">Toutes classes</option>
                  {Object.entries(CLASSES).map(([k, v]) => <option key={k} value={k}>{k} - {v.l}</option>)}
                </select>
                <button onClick={() => { setForm({}); setModal("compte"); }} style={btnPrim(COLOR)}>
                  <i className="ti ti-plus" /> Compte
                </button>
              </div>
            </ModernCard>

            {Object.entries(CLASSES).map(([cls, cfg]) => {
              const items = filteredComptes.filter(c => c.classe === parseInt(cls));
              if (items.length === 0) return null;
              return (
                <div key={cls} style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${cfg.c}30`, color: cfg.c, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>{cls}</div>
                    <h3 style={{ color: "#fff", margin: 0, fontSize: 14 }}>Classe {cls} — {cfg.l}</h3>
                    <span style={{ color: "rgba(255,255,255,.5)", fontSize: 11 }}>{items.length} compte{items.length > 1 ? "s" : ""}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
                    {items.map(c => (
                      <ModernCard key={c.id} color={cfg.c} variant="default" padding={12} hoverable onClick={() => { setForm(c); setModal("compte"); }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ fontFamily: "monospace", color: cfg.c, fontSize: 14, fontWeight: 800, minWidth: 80 }}>{c.numero_compte}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: "#fff", fontWeight: 600, fontSize: 12 }}>{c.libelle}</div>
                            <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10 }}>{c.type_compte} · {c.sens_normal}</div>
                          </div>
                          {c.lettrable && <i className="ti ti-link" style={{ color: cfg.c, fontSize: 14 }} title="Lettrable" />}
                          {c.collectif && <i className="ti ti-stack-2" style={{ color: "#EF9F27", fontSize: 14 }} title="Collectif" />}
                        </div>
                      </ModernCard>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {tab === "journaux" && (
          <>
            <div style={{ marginBottom: 14, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => { setForm({}); setModal("journal"); }} style={btnPrim(COLOR)}>
                <i className="ti ti-plus" /> Journal
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
              {journaux.map(j => (
                <ModernCard key={j.id} color={COLOR} variant="default" padding={14} hoverable onClick={() => { setForm(j); setModal("journal"); }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${COLOR}30`, color: COLOR, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18 }}>{j.code}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{j.libelle}</div>
                      <div style={{ color: "rgba(255,255,255,.55)", fontSize: 11 }}>{j.type_journal}</div>
                      {j.compte_contrepartie && <div style={{ color: "rgba(255,255,255,.4)", fontSize: 10, fontFamily: "monospace", marginTop: 2 }}>↔ {j.compte_contrepartie}</div>}
                    </div>
                  </div>
                </ModernCard>
              ))}
            </div>
          </>
        )}

        {/* MODAL Compte */}
        <ModernModal
          open={modal === "compte"}
          onClose={() => { setModal(null); setForm({}); }}
          color={COLOR} icon="ti-book-2"
          title={form.id ? "Modifier compte" : "Nouveau compte comptable"}
          actions={
            <>
              <ModalBtn variant="secondary" onClick={() => { setModal(null); setForm({}); }}>Annuler</ModalBtn>
              <ModalBtn variant="primary" color={COLOR} icon="ti-check" onClick={saveCompte} disabled={!form.numero_compte || !form.libelle}>Enregistrer</ModalBtn>
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Numéro compte *"><input value={form.numero_compte || ""} onChange={(e) => setForm({ ...form, numero_compte: e.target.value })} placeholder="411000" /></Field>
            <Field label="Libellé *"><input value={form.libelle || ""} onChange={(e) => setForm({ ...form, libelle: e.target.value })} /></Field>
            <Field label="Classe">
              <select value={form.classe || ""} onChange={(e) => setForm({ ...form, classe: e.target.value })}>
                <option value="">— Auto —</option>
                {Object.entries(CLASSES).map(([k, v]) => <option key={k} value={k}>{k} - {v.l}</option>)}
              </select>
            </Field>
            <Field label="Type">
              <select value={form.type_compte || ""} onChange={(e) => setForm({ ...form, type_compte: e.target.value })}>
                <option value="">—</option>
                <option value="client">Client</option>
                <option value="fournisseur">Fournisseur</option>
                <option value="vente">Vente</option>
                <option value="achat">Achat</option>
                <option value="tva">TVA</option>
                <option value="banque">Banque</option>
                <option value="caisse">Caisse</option>
                <option value="divers">Divers</option>
              </select>
            </Field>
            <Field label="Sens normal">
              <select value={form.sens_normal || "debit"} onChange={(e) => setForm({ ...form, sens_normal: e.target.value })}>
                <option value="debit">Débit</option>
                <option value="credit">Crédit</option>
              </select>
            </Field>
            <Field label="Options">
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#142131", padding: 4 }}>
                <input type="checkbox" checked={!!form.lettrable} onChange={(e) => setForm({ ...form, lettrable: e.target.checked })} /> Lettrable
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#142131", padding: 4 }}>
                <input type="checkbox" checked={!!form.collectif} onChange={(e) => setForm({ ...form, collectif: e.target.checked })} /> Collectif (Auxiliaires)
              </label>
            </Field>
          </div>
        </ModernModal>

        {/* MODAL Journal */}
        <ModernModal
          open={modal === "journal"}
          onClose={() => { setModal(null); setForm({}); }}
          color={COLOR} icon="ti-notebook"
          title={form.id ? "Modifier journal" : "Nouveau journal"}
          actions={
            <>
              <ModalBtn variant="secondary" onClick={() => { setModal(null); setForm({}); }}>Annuler</ModalBtn>
              <ModalBtn variant="primary" color={COLOR} icon="ti-check" onClick={saveJournal} disabled={!form.code || !form.libelle}>Enregistrer</ModalBtn>
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Code *"><input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="VE, AC, BQ..." /></Field>
            <Field label="Type">
              <select value={form.type_journal || ""} onChange={(e) => setForm({ ...form, type_journal: e.target.value })}>
                <option value="">—</option>
                <option value="ventes">Ventes</option>
                <option value="achats">Achats</option>
                <option value="banque">Banque</option>
                <option value="caisse">Caisse</option>
                <option value="OD">OD (divers)</option>
              </select>
            </Field>
            <Field label="Libellé *" full><input value={form.libelle || ""} onChange={(e) => setForm({ ...form, libelle: e.target.value })} /></Field>
            <Field label="Compte contrepartie" full><input value={form.compte_contrepartie || ""} onChange={(e) => setForm({ ...form, compte_contrepartie: e.target.value })} placeholder="411000, 512000..." /></Field>
          </div>
        </ModernModal>
      </PageShell>
    </>
  );
}

function TabBtn({ active, onClick, color, children }) {
  return (
    <button onClick={onClick} style={{
      padding: "12px 18px", background: active ? `${color}25` : "transparent",
      border: "none", borderBottom: active ? `2px solid ${color}` : "2px solid transparent",
      color: active ? "#fff" : "rgba(255,255,255,.55)",
      fontSize: 13, fontWeight: 700, cursor: "pointer",
      fontFamily: "Quicksand", display: "inline-flex", alignItems: "center", gap: 8,
    }}>{children}</button>
  );
}

function btnPrim(color) {
  return {
    padding: "8px 14px", borderRadius: 10,
    background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
    color: "#fff", border: "none",
    fontFamily: "Quicksand", fontWeight: 700, fontSize: 12,
    cursor: "pointer", boxShadow: `0 4px 12px ${color}50`,
    display: "inline-flex", alignItems: "center", gap: 6,
  };
}

function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}
