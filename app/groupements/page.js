"use client";
// =============================================================
//  /groupements — Liste + CRUD groupements (0.58.75)
//
//  Groupements = EHPAD, hôpitaux, cliniques, réseaux de santé.
//  Permet de gérer la structure juridique et les rattachements
//  d'établissements.
// =============================================================

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn, IconButton, Modal } from "../ui";
import { EmptyState, SkeletonRow, toast } from "../components/ui-premium";
import BackButton from "../components/BackButton";
import { safeInsert, safeUpdate } from "../../lib/safeWrite";

const TYPES_GROUPEMENT = [
  { value: "ehpad", lbl: "EHPAD", icon: "ti-building-hospital", color: "#7CC8C8" },
  { value: "hopital", lbl: "Hôpital", icon: "ti-stethoscope", color: "#185FA5" },
  { value: "clinique", lbl: "Clinique", icon: "ti-medical-cross", color: "#7a6fb0" },
  { value: "reseau", lbl: "Réseau de santé", icon: "ti-network", color: "#5aa05a" },
  { value: "maison_sante", lbl: "Maison de santé", icon: "ti-home-2", color: "#EF9F27" },
  { value: "autre", lbl: "Autre", icon: "ti-dots", color: "#8a98a8" },
];

const COULEURS = ["#7a6fb0", "#7CC8C8", "#185FA5", "#5aa05a", "#EF9F27", "#C9867F", "#D45E5E", "#142131"];

function typeMeta(t) {
  return TYPES_GROUPEMENT.find(x => x.value === t) || TYPES_GROUPEMENT[5];
}

export default function GroupementsPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [rows, setRows] = useState([]);
  const [etabsCount, setEtabsCount] = useState({});  // groupement_id → nb etabs
  const [depotsCount, setDepotsCount] = useState({});  // groupement_id → nb depots
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  async function loadAll() {
    if (!auth.ready || !auth.structureId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("groupements")
        .select("*")
        .eq("structure_id", auth.structureId)
        .order("nom");
      if (error && error.code !== "42P01") throw error;
      setRows(data || []);

      // Compter les établissements et dépôts rattachés
      try {
        const { data: links } = await supabase.from("groupement_etablissements").select("groupement_id");
        const ec = {};
        (links || []).forEach(l => { ec[l.groupement_id] = (ec[l.groupement_id] || 0) + 1; });
        setEtabsCount(ec);
      } catch { /* table absente */ }

      try {
        const { data: deps } = await supabase.from("depots").select("groupement_id").not("groupement_id", "is", null);
        const dc = {};
        (deps || []).forEach(d => { dc[d.groupement_id] = (dc[d.groupement_id] || 0) + 1; });
        setDepotsCount(dc);
      } catch { /* colonne absente */ }
    } catch (e) {
      console.error("[groupements] load:", e);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadAll(); }, [auth.ready, auth.structureId]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (filterType && r.type !== filterType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${r.nom || ""} ${r.code || ""} ${r.raison_sociale || ""} ${r.ville || ""} ${r.siret || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, filterType]);

  function openNew() {
    setForm({
      type: "ehpad",
      couleur: COULEURS[Math.floor(Math.random() * COULEURS.length)],
      icone: "ti-building-community",
      actif: true,
      pays: "France",
    });
    setModal({ mode: "new" });
  }

  function openEdit(g) {
    setForm({ ...g });
    setModal({ mode: "edit", id: g.id });
  }

  async function save() {
    if (!form.nom?.trim()) { toast.error("Nom obligatoire"); return; }
    setBusy(true);
    try {
      const payload = {
        structure_id: auth.structureId,
        nom: form.nom.trim(),
        code: form.code || null,
        type: form.type || "autre",
        description: form.description || null,
        siret: form.siret || null,
        finess_juridique: form.finess_juridique || null,
        raison_sociale: form.raison_sociale || null,
        adresse: form.adresse || null,
        code_postal: form.code_postal || null,
        ville: form.ville || null,
        pays: form.pays || "France",
        contact_nom: form.contact_nom || null,
        contact_email: form.contact_email || null,
        contact_telephone: form.contact_telephone || null,
        couleur: form.couleur || "#7a6fb0",
        icone: form.icone || typeMeta(form.type).icon,
        notes: form.notes || null,
        actif: form.actif !== false,
      };
      const userId = auth.user?.id;
      if (modal?.id) {
        const { error } = await safeUpdate(supabase, "groupements", payload, { id: modal.id }, { userId });
        if (error) throw error;
        toast.success(`Groupement "${form.nom}" mis à jour`);
      } else {
        const { error } = await safeInsert(supabase, "groupements", payload, { userId });
        if (error) throw error;
        toast.success(`Groupement "${form.nom}" créé`);
      }
      setModal(null);
      await loadAll();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <div style={{ marginBottom: 8 }}><BackButton /></div>
        <PageHead
          eyebrow="STRUCTURES"
          icon="ti-building-community"
          title="Groupements"
          accent={`${rows.length} actif${rows.length > 1 ? "s" : ""}`}
          sub="EHPAD, hôpitaux, cliniques, réseaux de santé · Gestion juridique + rattachements d'établissements"
        />

        {/* Stats par type */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
          {TYPES_GROUPEMENT.slice(0, 5).map(t => {
            const count = rows.filter(r => r.type === t.value).length;
            return (
              <div key={t.value} style={{
                padding: "12px 14px", background: `${t.color}10`, border: `1px solid ${t.color}30`,
                borderRadius: 10, borderLeft: `3px solid ${t.color}`, cursor: "pointer",
                opacity: filterType === t.value ? 1 : 0.85, transform: filterType === t.value ? "scale(1.02)" : "none",
                transition: "all .15s",
              }} onClick={() => setFilterType(filterType === t.value ? "" : t.value)}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <i className={`ti ${t.icon}`} style={{ color: t.color, fontSize: 22 }} />
                  <div>
                    <div style={{ fontSize: 11, color: t.color, textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 700 }}>{t.lbl}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#142131" }}>{count}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Search + actions */}
        <Panel style={{ marginBottom: 14, padding: "12px 14px" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="search"
              placeholder="🔍 Rechercher (nom, code, SIRET, ville...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 240, padding: "8px 14px", border: "1px solid #e3e9ee", borderRadius: 18, fontSize: 13, fontFamily: "inherit" }}
            />
            {filterType && (
              <button onClick={() => setFilterType("")} style={{ background: "transparent", border: "none", color: "#c0392b", padding: "5px 8px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                <i className="ti ti-x" /> Filtre type
              </button>
            )}
            <Btn variant="primary" icon="ti-plus" onClick={openNew}>Nouveau groupement</Btn>
          </div>
        </Panel>

        {/* Liste */}
        {loading ? (
          <Panel><SkeletonRow count={5} /></Panel>
        ) : filtered.length === 0 ? (
          <EmptyState
            illustration="building"
            title={rows.length === 0 ? "Aucun groupement" : "Aucun résultat"}
            message={rows.length === 0 ? "Crée ton premier groupement pour organiser tes établissements." : "Essaie d'élargir tes filtres."}
            actionLabel={rows.length === 0 ? "Créer un groupement" : null}
            onAction={rows.length === 0 ? openNew : null}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
            {filtered.map(g => {
              const meta = typeMeta(g.type);
              return (
                <div key={g.id} style={{
                  background: "#fff", border: "1px solid #e3e9ee", borderRadius: 12,
                  borderLeft: `4px solid ${g.couleur || meta.color}`,
                  padding: "14px 16px",
                  cursor: "pointer", transition: "all .15s",
                  opacity: g.actif === false ? 0.6 : 1,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(20,33,49,.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                onClick={() => openEdit(g)}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: `${g.couleur || meta.color}22`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <i className={`ti ${g.icone || meta.icon}`} style={{ color: g.couleur || meta.color, fontSize: 22 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#142131", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.nom}</h3>
                      <div style={{ fontSize: 11, color: meta.color, fontWeight: 700, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>{meta.lbl}</div>
                      {g.code && <div style={{ fontSize: 10.5, color: "#5a6878", fontFamily: "Consolas, monospace" }}>{g.code}</div>}
                    </div>
                    {g.actif === false && (
                      <span style={{ background: "#f0f3f6", color: "#5a6878", padding: "2px 7px", borderRadius: 4, fontSize: 9.5, fontWeight: 700 }}>INACTIF</span>
                    )}
                  </div>

                  {(g.ville || g.code_postal) && (
                    <div style={{ fontSize: 11.5, color: "#5a6878", marginBottom: 4 }}>
                      <i className="ti ti-map-pin" /> {[g.code_postal, g.ville].filter(Boolean).join(" ")}
                    </div>
                  )}
                  {g.siret && (
                    <div style={{ fontSize: 10.5, color: "#5a6878", fontFamily: "Consolas, monospace", marginBottom: 4 }}>
                      SIRET {g.siret}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {etabsCount[g.id] > 0 && (
                      <span style={{ background: "rgba(124,200,200,.15)", color: "#1c5454", padding: "2px 8px", borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>
                        🏢 {etabsCount[g.id]} étab.
                      </span>
                    )}
                    {depotsCount[g.id] > 0 && (
                      <span style={{ background: "rgba(122,111,176,.15)", color: "#5a4a90", padding: "2px 8px", borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>
                        📦 {depotsCount[g.id]} dépôt.
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal édition */}
        {modal && (
          <Modal open={!!modal} onClose={() => setModal(null)} kind="patient"
            title={modal.mode === "new" ? "Nouveau groupement" : `Édition · ${form.nom || ""}`}
            footer={
              <>
                <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
                <Btn variant="primary" icon="ti-check" onClick={save} disabled={busy}>{busy ? "..." : "Enregistrer"}</Btn>
              </>
            }>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="fld" style={{ gridColumn: "span 2" }}>
                <label>Nom du groupement *</label>
                <input value={form.nom || ""} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Ex: EHPAD Les Tilleuls" />
              </div>
              <div className="fld">
                <label>Code interne</label>
                <input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="GRP-001" style={{ fontFamily: "Consolas, monospace" }} />
              </div>
              <div className="fld">
                <label>Type *</label>
                <select value={form.type || "ehpad"} onChange={(e) => setForm({ ...form, type: e.target.value, icone: typeMeta(e.target.value).icon })}>
                  {TYPES_GROUPEMENT.map(t => <option key={t.value} value={t.value}>{t.lbl}</option>)}
                </select>
              </div>
              <div className="fld" style={{ gridColumn: "span 2" }}>
                <label>Description</label>
                <textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
            </div>

            <h4 style={{ margin: "14px 0 8px", fontSize: 12, color: "#7a6fb0", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #f0d59f", paddingBottom: 4 }}>
              <i className="ti ti-id" /> Coordonnées juridiques
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="fld">
                <label>Raison sociale</label>
                <input value={form.raison_sociale || ""} onChange={(e) => setForm({ ...form, raison_sociale: e.target.value })} />
              </div>
              <div className="fld">
                <label>SIRET</label>
                <input value={form.siret || ""} onChange={(e) => setForm({ ...form, siret: e.target.value })} maxLength={14} style={{ fontFamily: "Consolas, monospace" }} />
              </div>
              <div className="fld">
                <label>FINESS juridique (EJ)</label>
                <input value={form.finess_juridique || ""} onChange={(e) => setForm({ ...form, finess_juridique: e.target.value })} maxLength={9} style={{ fontFamily: "Consolas, monospace" }} />
              </div>
              <div className="fld">
                <label>Adresse</label>
                <input value={form.adresse || ""} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
              </div>
              <div className="fld">
                <label>Code postal</label>
                <input value={form.code_postal || ""} onChange={(e) => setForm({ ...form, code_postal: e.target.value })} maxLength={5} />
              </div>
              <div className="fld">
                <label>Ville</label>
                <input value={form.ville || ""} onChange={(e) => setForm({ ...form, ville: e.target.value })} />
              </div>
            </div>

            <h4 style={{ margin: "14px 0 8px", fontSize: 12, color: "#7CC8C8", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #cfeaea", paddingBottom: 4 }}>
              <i className="ti ti-phone" /> Contact
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div className="fld">
                <label>Nom du contact</label>
                <input value={form.contact_nom || ""} onChange={(e) => setForm({ ...form, contact_nom: e.target.value })} />
              </div>
              <div className="fld">
                <label>Email</label>
                <input type="email" value={form.contact_email || ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
              </div>
              <div className="fld">
                <label>Téléphone</label>
                <input type="tel" value={form.contact_telephone || ""} onChange={(e) => setForm({ ...form, contact_telephone: e.target.value })} />
              </div>
            </div>

            <h4 style={{ margin: "14px 0 8px", fontSize: 12, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #e3e9ee", paddingBottom: 4 }}>
              <i className="ti ti-palette" /> Personnalisation
            </h4>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {COULEURS.map(c => (
                <button key={c} type="button" onClick={() => setForm({ ...form, couleur: c })}
                  style={{
                    width: 28, height: 28, borderRadius: "50%", background: c,
                    border: form.couleur === c ? `3px solid #142131` : `1px solid #e3e9ee`,
                    cursor: "pointer",
                  }} />
              ))}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, marginTop: 8 }}>
              <input type="checkbox" checked={form.actif !== false} onChange={(e) => setForm({ ...form, actif: e.target.checked })} />
              <span>Actif</span>
            </label>
          </Modal>
        )}
      </div>
    </div>
  );
}
