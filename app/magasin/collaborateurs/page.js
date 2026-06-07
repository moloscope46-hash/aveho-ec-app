"use client";
// =============================================================
//  /magasin/collaborateurs — Collaborateurs côté magasin (0.62.18)
//  Voir tous les collab étab + créer des users dédiés magasin
//  Types DI gérés (auto-attribution dans création tournée)
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { useMagasinContext } from "../../../lib/useMagasinContext";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn, Modal } from "../../ui";
import { MagasinSidebar } from "../../components/MagasinSidebar";

const ROLES_MAGASIN = [
  { v: "chauffeur_livreur",   l: "🚛 Chauffeur-livreur",     col: "#185FA5" },
  { v: "technicien_sav",      l: "🛠 Technicien SAV",        col: "#e35d5b" },
  { v: "technicien_maint",    l: "🔧 Technicien maintenance", col: "#EF9F27" },
  { v: "preparateur",         l: "📦 Préparateur de commandes", col: "#7CC8C8" },
  { v: "responsable_magasin", l: "👔 Responsable magasin",   col: "#5a4a90" },
  { v: "commercial",          l: "💼 Commercial",            col: "#5aa05a" },
  { v: "logisticien",         l: "📊 Logisticien",           col: "#7a6fb0" },
  { v: "administratif",       l: "📋 Administratif",         col: "#5a6878" },
];

const TYPES_DI = [
  { v: "livraison",    l: "📦 Livraison" },
  { v: "transfert",    l: "🔄 Transfert" },
  { v: "sav",          l: "🛠 SAV" },
  { v: "maintenance",  l: "🔧 Maintenance" },
  { v: "retour",       l: "↩ Retour" },
  { v: "bilan",        l: "📋 Bilan" },
  { v: "depannage",    l: "⚡ Dépannage" },
];

export default function MagasinCollaborateursPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();

  const [collabs, setCollabs] = useState([]);
  const [filter, setFilter] = useState("tous");  // tous | magasin | etab
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalCreate, setModalCreate] = useState(false);
  const [form, setForm] = useState({});
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!auth.ready || magasinCtx.loading) return;
    reload();
  }, [auth.ready, magasinCtx.loading, magasinCtx.magasinId]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    const r = await tryFetch(supabase.from("membres_structure").select("*").order("nom"));
    setCollabs(r);
    setLoading(false);
  }

  function openCreate() {
    setForm({
      email: "", prenom: "", nom: "",
      role_magasin: "chauffeur_livreur",
      magasin_fournisseur_id: magasinCtx.magasinId || "",
      types_di_geres: [],
      telephone: "", fonction_detail: "",
    });
    setErr("");
    setModalCreate(true);
  }

  async function inviter() {
    setErr("");
    if (!form.email?.trim()) { setErr("Email obligatoire"); return; }
    if (!form.magasin_fournisseur_id) { setErr("Magasin obligatoire"); return; }
    setCreating(true);
    try {
      // Crée une invitation simple
      const payload = {
        structure_id: auth.structureId,
        email: form.email.trim(),
        nom_affiche: `${form.prenom || ""} ${form.nom || ""}`.trim() || form.email,
        prenom: form.prenom || null,
        telephone: form.telephone || null,
        fonction_detail: form.fonction_detail || null,
        role_professionnel: "utilisateur_magasin",
        magasin_fournisseur_id: form.magasin_fournisseur_id,
        notes_admin: `[ROLE_MAGASIN:${form.role_magasin}][TYPES_DI:${(form.types_di_geres || []).join(",")}]`,
      };
      // Fallback si colonnes pas créées
      let r = await supabase.from("invitations").insert(payload);
      if (r.error && /role_professionnel|magasin_fournisseur_id/i.test(r.error.message || "")) {
        delete payload.role_professionnel;
        delete payload.magasin_fournisseur_id;
        r = await supabase.from("invitations").insert(payload);
      }
      if (r.error) throw r.error;
      setModalCreate(false);
      alert(`✓ Invitation envoyée à ${form.email}`);
      await reload();
    } catch (e) {
      console.error("[invite collab magasin]", e);
      setErr(e.message || JSON.stringify(e));
    } finally { setCreating(false); }
  }

  // Filtre + recherche
  const filtered = collabs.filter(c => {
    if (filter === "magasin" && c.role_professionnel !== "utilisateur_magasin") return false;
    if (filter === "etab" && c.role_professionnel === "utilisateur_magasin") return false;
    if (search.trim()) {
      const t = `${c.nom || ""} ${c.prenom || ""} ${c.email || ""} ${c.fonction_detail || ""}`.toLowerCase();
      if (!t.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  function toggleType(t) {
    const arr = form.types_di_geres || [];
    setForm({ ...form, types_di_geres: arr.includes(t) ? arr.filter(x => x !== t) : [...arr, t] });
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <MagasinSidebar />
        <div className="page-content" style={{ flex: 1, padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <PageHead icon="ti-users" title="Collaborateurs" subtitle="Côté magasin — voir tous les collab + créer des users dédiés" />
            <Btn variant="primary" icon="ti-plus" onClick={openCreate}>Nouveau collab magasin</Btn>
            <Btn variant="ghost" icon="ti-user-shield" onClick={() => router.push("/utilisateurs/creer-direct")}>Créer direct (sans mail)</Btn>
          </div>

          {/* Filtres */}
          <Panel style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 4, border: "1px solid #cfd8e0", borderRadius: 6, overflow: "hidden" }}>
                {["tous", "magasin", "etab"].map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    padding: "6px 14px", background: filter === f ? "#5a8f8f" : "#fff",
                    color: filter === f ? "#fff" : "#5a6878", border: "none",
                    fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}>
                    {f === "tous" ? "Tous" : f === "magasin" ? "🏬 Magasin" : "🏥 Étab"}
                  </button>
                ))}
              </div>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Recherche nom, email, fonction…" style={{ flex: 1, minWidth: 200, padding: "6px 10px", border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 12.5 }} />
              <span style={{ fontSize: 12, color: "#5a6878" }}><b>{filtered.length}</b> collab</span>
            </div>
          </Panel>

          <Panel style={{ marginTop: 12 }}>
            {loading ? <div style={{ padding: 30, textAlign: "center" }}>Chargement…</div>
              : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#8a98a8" }}>
                <i className="ti ti-users-off" style={{ fontSize: 40, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
                Aucun collaborateur.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
                {filtered.map(c => {
                  const isMagasin = c.role_professionnel === "utilisateur_magasin";
                  const col = isMagasin ? "#5a8f8f" : "#185FA5";
                  const nom = `${c.prenom || ""} ${c.nom || ""}`.trim() || c.email || "—";
                  const typesDi = c.notes_admin?.match(/\[TYPES_DI:([^\]]+)\]/)?.[1]?.split(",").filter(Boolean) || [];
                  return (
                    <div key={c.id || c.user_id} style={{
                      background: "#fff", border: `1px solid ${col}33`,
                      borderLeft: `4px solid ${col}`,
                      borderRadius: 10, padding: 12,
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ width: 38, height: 38, background: `${col}22`, color: col, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                          <i className={isMagasin ? "ti ti-building-warehouse" : "ti ti-user"} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#142131" }}>{nom}</div>
                          <div style={{ fontSize: 11, color: col, fontWeight: 600 }}>
                            {isMagasin ? "🏬 Utilisateur Magasin" : (c.role_professionnel || "Étab")}
                          </div>
                          {c.fonction_detail && <div style={{ fontSize: 11, color: "#5a6878", marginTop: 2 }}>📋 {c.fonction_detail}</div>}
                          {c.email && <div style={{ fontSize: 10.5, color: "#5a6878", marginTop: 2 }}>✉ {c.email}</div>}
                          {c.telephone && <div style={{ fontSize: 10.5, color: "#5a6878" }}>📞 {c.telephone}</div>}
                          {typesDi.length > 0 && (
                            <div style={{ marginTop: 5, display: "flex", gap: 3, flexWrap: "wrap" }}>
                              {typesDi.map(t => {
                                const meta = TYPES_DI.find(x => x.v === t);
                                return <span key={t} style={{ padding: "1px 6px", background: "rgba(122,111,176,.15)", color: "#7a6fb0", borderRadius: 3, fontSize: 9.5, fontWeight: 700 }}>{meta?.l || t}</span>;
                              })}
                            </div>
                          )}
                          {(c.email || c.telephone) && (
                            <div style={{ display: "flex", gap: 4, marginTop: 6, paddingTop: 6, borderTop: "1px solid #f0f3f6" }}>
                              {c.email && <a href={`mailto:${c.email}`} style={{ flex: 1, textAlign: "center", padding: "3px 6px", background: "rgba(24,95,165,.10)", color: "#185FA5", border: "1px solid rgba(24,95,165,.25)", borderRadius: 4, fontSize: 10, fontWeight: 700, textDecoration: "none" }}><i className="ti ti-mail" /> Email</a>}
                              {c.telephone && <a href={`tel:${c.telephone.replace(/\s/g, "")}`} style={{ flex: 1, textAlign: "center", padding: "3px 6px", background: "rgba(94,160,90,.10)", color: "#5aa05a", border: "1px solid rgba(94,160,90,.25)", borderRadius: 4, fontSize: 10, fontWeight: 700, textDecoration: "none" }}><i className="ti ti-phone" /> Appel</a>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* Modal création collab magasin */}
          {modalCreate && (
            <Modal open={modalCreate} onClose={() => setModalCreate(false)} kind="patient"
              title="Nouveau collaborateur magasin"
              actions={
                <>
                  <Btn variant="ghost" onClick={() => setModalCreate(false)}>Annuler</Btn>
                  <Btn variant="primary" onClick={inviter} disabled={creating}>{creating ? "Envoi…" : "Inviter"}</Btn>
                </>
              }>
              {err && <div style={{ padding: 10, background: "rgba(227,93,91,.10)", borderLeft: "3px solid #e35d5b", borderRadius: 6, color: "#e35d5b", fontSize: 12, marginBottom: 12 }}>❌ {err}</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={{ fontSize: 12, color: "#5a6878" }}>Prénom
                    <input value={form.prenom || ""} onChange={(e) => setForm({ ...form, prenom: e.target.value })} style={inp} />
                  </label>
                  <label style={{ fontSize: 12, color: "#5a6878" }}>Nom
                    <input value={form.nom || ""} onChange={(e) => setForm({ ...form, nom: e.target.value })} style={inp} />
                  </label>
                </div>
                <label style={{ fontSize: 12, color: "#5a6878" }}><b>Email *</b>
                  <input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="chauffeur@magasin.fr" style={inp} />
                </label>
                <label style={{ fontSize: 12, color: "#5a6878" }}>Téléphone
                  <input value={form.telephone || ""} onChange={(e) => setForm({ ...form, telephone: e.target.value })} placeholder="06 12 34 56 78" style={inp} />
                </label>
                <label style={{ fontSize: 12, color: "#5a6878" }}>Fonction détaillée
                  <input value={form.fonction_detail || ""} onChange={(e) => setForm({ ...form, fonction_detail: e.target.value })} placeholder="Chauffeur PL secteur Lot" style={inp} />
                </label>
                <label style={{ fontSize: 12, color: "#5a6878" }}><b>🏬 Rôle magasin *</b>
                  <select value={form.role_magasin || ""} onChange={(e) => setForm({ ...form, role_magasin: e.target.value })} style={inp}>
                    {ROLES_MAGASIN.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                  </select>
                </label>
                <div style={{ fontSize: 12, color: "#5a6878" }}><b>Types de DI/demandes gérés</b>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    {TYPES_DI.map(t => {
                      const sel = (form.types_di_geres || []).includes(t.v);
                      return (
                        <button key={t.v} type="button" onClick={() => toggleType(t.v)} style={{
                          padding: "4px 10px", borderRadius: 6,
                          background: sel ? "#7a6fb0" : "#fff",
                          color: sel ? "#fff" : "#7a6fb0",
                          border: `1px solid #7a6fb040`,
                          fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                        }}>{t.l}</button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 10.5, color: "#8a98a8", marginTop: 4, fontStyle: "italic" }}>Permettra d'auto-attribuer les demandes lors de la création de tournée</div>
                </div>
                <div style={{ padding: 10, background: "rgba(94,143,143,.08)", borderLeft: "3px solid #5a8f8f", borderRadius: 6, fontSize: 11.5, color: "#5a6878" }}>
                  ℹ Un mail d'invitation sera envoyé. À l'inscription, le user sera automatiquement créé avec son rôle magasin et son rattachement.
                </div>
              </div>
            </Modal>
          )}
        </div>
      </div>
    </div>
  );
}

const inp = {
  width: "100%", padding: "8px 10px", marginTop: 4,
  border: "1px solid #cfd8e0", borderRadius: 6,
  fontFamily: "inherit", fontSize: 13,
};
