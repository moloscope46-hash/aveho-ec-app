"use client";
export const dynamic = "force-dynamic";
// =============================================================
//  /infirmieres — Liste infirmières + visites
// =============================================================
import { useEffect, useState, useMemo } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { PageShell, ModernCard, ModernModal, ModalBtn, HiTechIconBox } from "../components/ui-premium";

const COLOR = "#C9867F";

const TYPES_INF = {
  IDEL: { l: "IDE Libérale",       c: "#C9867F", ic: "ti-stethoscope" },
  IDEC: { l: "IDE Coordinatrice",  c: "#7a6fb0", ic: "ti-stethoscope" },
  IDE:  { l: "IDE Salariée",       c: "#185FA5", ic: "ti-stethoscope" },
  IPA:  { l: "Infirmière en Pratique Avancée", c: "#5e4a8c", ic: "ti-stethoscope" },
};

const TYPES_VISITE = {
  soins:        { l: "Soins",        c: "#5aa05a", ic: "ti-medical-cross" },
  surveillance: { l: "Surveillance", c: "#7CC8C8", ic: "ti-eye" },
  prelevement:  { l: "Prélèvement",  c: "#EF9F27", ic: "ti-test-pipe" },
  pansement:    { l: "Pansement",    c: "#C9867F", ic: "ti-bandage" },
  injection:    { l: "Injection",    c: "#D45E5E", ic: "ti-needle" },
  sondage:      { l: "Sondage",      c: "#5e4a8c", ic: "ti-droplet" },
};

export default function InfirmieresPage() {
  const supabase = createClient();
  const auth = useAuth();
  const [tab, setTab] = useState("infirmieres");  // infirmieres / visites
  const [infs, setInfs] = useState([]);
  const [visites, setVisites] = useState([]);
  const [tableMissing, setTableMissing] = useState(false);
  const [search, setSearch] = useState("");
  const [fType, setFType] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => { if (auth.ready) reload(); }, [auth.ready]);

  async function reload() {
    const r = await supabase.from("infirmieres").select("*").eq("structure_id", auth.structureId).order("nom");
    if (r.error?.code === "42P01") { setTableMissing(true); return; }
    setInfs(r.data || []);

    const v = await supabase.from("v_visites_infirmieres_complete").select("*").eq("structure_id", auth.structureId).order("date_visite", { ascending: false }).limit(100);
    setVisites(v.data || []);
  }

  async function saveInfirmiere() {
    const payload = { ...form, structure_id: auth.structureId };
    if (form.id) await supabase.from("infirmieres").update(payload).eq("id", form.id);
    else await supabase.from("infirmieres").insert(payload);
    setModal(null); setForm({}); reload();
  }

  const filteredInfs = useMemo(() => {
    const s = search.toLowerCase().trim();
    return infs.filter(i => {
      if (s && !((i.nom + " " + i.prenom + " " + (i.ville || "")).toLowerCase().includes(s))) return false;
      if (fType && i.type_infirmiere !== fType) return false;
      return true;
    });
  }, [infs, search, fType]);

  if (tableMissing) {
    return (
      <>
        <TopBar />
        <PageShell color={COLOR} icon="ti-stethoscope" title="Infirmières" subtitle="Module non installé">
          <ModernCard color={COLOR} variant="accent" icon="ti-alert-triangle" title="Tables manquantes">
            <p style={{ color: "rgba(255,255,255,.8)" }}>Exécute <strong>aveho-MODULE-infirmieres-carplay.sql</strong> dans Supabase.</p>
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
        icon="ti-stethoscope"
        title="Infirmières & Visites"
        subtitle="IDEL / IDEC / IDE / IPA + Visites à domicile et en chambre"
        badge={`${infs.length} infirmières · ${visites.length} visites`}
        actions={
          <button onClick={() => { setForm({ type_infirmiere: "IDEL", est_externe: true, actif: true }); setModal("inf"); }} style={{
            padding: "10px 18px", borderRadius: 10,
            background: `linear-gradient(135deg, ${COLOR}, ${COLOR}cc)`,
            color: "#fff", border: "none",
            fontFamily: "Quicksand", fontWeight: 700, fontSize: 13,
            cursor: "pointer", boxShadow: `0 4px 12px ${COLOR}50`,
          }}>
            <i className="ti ti-plus" /> Nouvelle infirmière
          </button>
        }
      >
        {/* Tabs */}
        <ModernCard color={COLOR} variant="default" padding={0} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
            <TabBtn active={tab === "infirmieres"} onClick={() => setTab("infirmieres")} color={COLOR}>
              <i className="ti ti-stethoscope" /> Infirmières ({infs.length})
            </TabBtn>
            <TabBtn active={tab === "visites"} onClick={() => setTab("visites")} color={COLOR}>
              <i className="ti ti-clipboard-pulse" /> Visites ({visites.length})
            </TabBtn>
          </div>
        </ModernCard>

        {tab === "infirmieres" && (
          <>
            <ModernCard color={COLOR} variant="default" padding={14} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input placeholder="Rechercher nom, ville..." value={search} onChange={(e) => setSearch(e.target.value)}
                  style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", color: "#fff", border: "1px solid rgba(255,255,255,.15)", fontFamily: "Quicksand", fontSize: 13 }} />
                <select value={fType} onChange={(e) => setFType(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", color: "#fff", border: "1px solid rgba(255,255,255,.15)" }}>
                  <option value="">Tous types</option>
                  {Object.entries(TYPES_INF).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
                </select>
              </div>
            </ModernCard>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
              {filteredInfs.map(i => {
                const t = TYPES_INF[i.type_infirmiere] || TYPES_INF.IDEL;
                return (
                  <ModernCard key={i.id} color={t.c} variant="default" padding={0} hoverable
                    onClick={() => { setForm(i); setModal("inf"); }}>
                    <div style={{ padding: 14, display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${t.c}20` }}>
                      <HiTechIconBox name={t.ic} color={t.c} variant="gradient" size={40} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>{i.prenom} {i.nom}</div>
                        <div style={{ color: "rgba(255,255,255,.55)", fontSize: 11 }}>{t.l}</div>
                      </div>
                      <span style={{ background: i.est_interne ? "rgba(90,160,90,.20)" : "rgba(239,159,39,.20)", color: i.est_interne ? "#5aa05a" : "#EF9F27", border: `1px solid ${i.est_interne ? "#5aa05a" : "#EF9F27"}50`, padding: "2px 8px", borderRadius: 8, fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>
                        {i.est_interne ? "Interne" : "Externe"}
                      </span>
                    </div>
                    <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 11 }}>
                      <div>
                        <div style={{ color: "rgba(255,255,255,.4)", fontSize: 9, textTransform: "uppercase" }}>Téléphone</div>
                        <div style={{ color: "#fff" }}>{i.telephone || i.mobile || "—"}</div>
                      </div>
                      <div>
                        <div style={{ color: "rgba(255,255,255,.4)", fontSize: 9, textTransform: "uppercase" }}>Ville</div>
                        <div style={{ color: "#fff" }}>{i.ville || "—"}</div>
                      </div>
                      {i.numero_rpps && (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <div style={{ color: "rgba(255,255,255,.4)", fontSize: 9, textTransform: "uppercase" }}>RPPS</div>
                          <div style={{ color: "#fff", fontFamily: "monospace" }}>{i.numero_rpps}</div>
                        </div>
                      )}
                    </div>
                  </ModernCard>
                );
              })}
            </div>
          </>
        )}

        {tab === "visites" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {visites.length === 0 ? (
              <ModernCard color={COLOR} variant="accent" icon="ti-info-circle" title="Aucune visite">
                <p style={{ color: "rgba(255,255,255,.7)", margin: 0 }}>Pas de visite enregistrée.</p>
              </ModernCard>
            ) : visites.map(v => {
              const t = TYPES_VISITE[v.type_visite] || TYPES_VISITE.soins;
              return (
                <ModernCard key={v.id} color={t.c} variant="default" padding={14}>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr auto", gap: 12, alignItems: "center" }}>
                    <HiTechIconBox name={t.ic} color={t.c} variant="gradient" size={36} />
                    <div>
                      <div style={{ color: "#fff", fontWeight: 700 }}>{v.patient_prenom} {v.patient_nom}</div>
                      <div style={{ color: "rgba(255,255,255,.5)", fontSize: 11 }}>{t.l} · {v.type_lieu}</div>
                    </div>
                    <div>
                      <div style={{ color: "#fff", fontSize: 12 }}>{v.infirmiere_prenom} {v.infirmiere_nom}</div>
                      <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10 }}>{v.type_infirmiere}</div>
                    </div>
                    <div>
                      <div style={{ color: "#fff", fontSize: 12 }}>{v.date_visite ? new Date(v.date_visite).toLocaleDateString("fr-FR") : "—"}</div>
                      <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10 }}>{v.cotation_ngap || ""}</div>
                    </div>
                    <span style={{ background: `${t.c}30`, color: t.c, border: `1px solid ${t.c}60`, padding: "3px 10px", borderRadius: 8, fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{v.statut}</span>
                  </div>
                </ModernCard>
              );
            })}
          </div>
        )}

        {/* MODAL Infirmière */}
        <ModernModal
          open={modal === "inf"}
          onClose={() => { setModal(null); setForm({}); }}
          color={COLOR} icon="ti-stethoscope"
          title={form.id ? "Modifier infirmière" : "Nouvelle infirmière"}
          actions={
            <>
              <ModalBtn variant="secondary" onClick={() => { setModal(null); setForm({}); }}>Annuler</ModalBtn>
              <ModalBtn variant="primary" color={COLOR} icon="ti-check" onClick={saveInfirmiere} disabled={!form.nom}>Enregistrer</ModalBtn>
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Nom *"><input value={form.nom || ""} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></Field>
            <Field label="Prénom"><input value={form.prenom || ""} onChange={(e) => setForm({ ...form, prenom: e.target.value })} /></Field>
            <Field label="Type">
              <select value={form.type_infirmiere || "IDEL"} onChange={(e) => setForm({ ...form, type_infirmiere: e.target.value })}>
                {Object.entries(TYPES_INF).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
              </select>
            </Field>
            <Field label="N° RPPS"><input value={form.numero_rpps || ""} onChange={(e) => setForm({ ...form, numero_rpps: e.target.value })} /></Field>
            <Field label="Téléphone"><input value={form.telephone || ""} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></Field>
            <Field label="Mobile"><input value={form.mobile || ""} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></Field>
            <Field label="Email" full><input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Adresse" full><input value={form.adresse || ""} onChange={(e) => setForm({ ...form, adresse: e.target.value })} /></Field>
            <Field label="Ville"><input value={form.ville || ""} onChange={(e) => setForm({ ...form, ville: e.target.value })} /></Field>
            <Field label="Code postal"><input value={form.code_postal || ""} onChange={(e) => setForm({ ...form, code_postal: e.target.value })} /></Field>
            <Field label="Statut" full>
              <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#142131", padding: 4 }}>
                <input type="checkbox" checked={!!form.est_interne} onChange={(e) => setForm({ ...form, est_interne: e.target.checked, est_externe: !e.target.checked })} />
                Interne à l'établissement (sinon externe / libérale)
              </label>
            </Field>
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

function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}
