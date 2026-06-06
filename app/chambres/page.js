"use client";
// =============================================================
//  /chambres — Gestion légère des chambres (0.58.81)
//  Permet d'ajouter le téléphone à chaque chambre + équipements
//  Pour création/édition complète : aller dans /etablissement/edition
// =============================================================
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn, Modal } from "../ui";
import { EmptyState, SkeletonRow, toast } from "../components/ui-premium";
import BackButton from "../components/BackButton";
import { safeUpdate } from "../../lib/safeWrite";

const TYPES_CHAMBRE = [
  { value: "simple",     lbl: "Simple",      icon: "ti-bed", color: "#7CC8C8" },
  { value: "double",     lbl: "Double",      icon: "ti-bed-flat", color: "#185FA5" },
  { value: "medical",    lbl: "Médicalisée", icon: "ti-stethoscope", color: "#5aa05a" },
  { value: "isolement",  lbl: "Isolement",   icon: "ti-shield-lock", color: "#e35d5b" },
];

export default function ChambresPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();

  const [chambres, setChambres] = useState([]);
  const [services, setServices] = useState([]);
  const [batiments, setBatiments] = useState([]);
  const [patients, setPatients] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterBatiment, setFilterBatiment] = useState("");
  const [filterService, setFilterService] = useState("");

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  async function loadAll() {
    if (!auth.ready || !auth.structureId) return;
    setLoading(true);
    const tryFetch = async (q) => {
      try { const r = await q; return r.data || []; }
      catch (e) {
        if (e.code === "42P01" || e.code === "42703") return [];
        throw e;
      }
    };
    try {
      const [c, s, b, p] = await Promise.all([
        tryFetch(supabase.from("chambres").select("*").eq("structure_id", auth.structureId).order("nom").limit(500)),
        tryFetch(supabase.from("services").select("id, nom, batiment_id").eq("structure_id", auth.structureId)),
        tryFetch(supabase.from("batiments").select("id, nom, couleur").eq("structure_id", auth.structureId)),
        tryFetch(supabase.from("patients").select("id, nom, prenom, chambre_id, telephone, etat").eq("structure_id", auth.structureId).neq("etat", "Sorti")),
      ]);
      setChambres(c); setServices(s); setBatiments(b);
      // Index patients par chambre_id
      const byChambre = {};
      p.forEach(pat => {
        if (pat.chambre_id) {
          if (!byChambre[pat.chambre_id]) byChambre[pat.chambre_id] = [];
          byChambre[pat.chambre_id].push(pat);
        }
      });
      setPatients(byChambre);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadAll(); }, [auth.ready, auth.structureId]);

  const filtered = useMemo(() => {
    return chambres.filter(c => {
      const svc = services.find(s => s.id === c.service_id);
      if (filterBatiment && svc?.batiment_id !== filterBatiment) return false;
      if (filterService && c.service_id !== filterService) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!`${c.nom || ""} ${c.telephone || ""} ${c.code_acces || ""}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [chambres, services, search, filterBatiment, filterService]);

  function openEdit(c) {
    setForm({ ...c });
    setModal({ id: c.id });
  }

  async function save() {
    setBusy(true);
    try {
      const payload = {
        telephone: form.telephone || null,
        code_acces: form.code_acces || null,
        type_chambre: form.type_chambre || null,
        lits_max: form.lits_max ? parseInt(form.lits_max, 10) : 1,
        notes: form.notes || null,
      };
      const { error } = await safeUpdate(supabase, "chambres", payload, { id: modal.id }, { userId: auth.user?.id });
      if (error) throw error;
      toast.success(`${form.nom} mis à jour`);
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
        <BackButton />
        <PageHead
          eyebrow="ÉTABLISSEMENT · CHAMBRES"
          icon="ti-bed"
          title="Chambres"
          accent={`${chambres.length} chambre${chambres.length > 1 ? "s" : ""}`}
          sub="Téléphone direct, code d'accès, type — les patients sont gérés depuis /patients"
        />

        <Panel style={{ marginBottom: 14, padding: "12px 14px" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="search"
              placeholder="🔍 Rechercher (n°, téléphone…)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 220, padding: "8px 14px", border: "1px solid #e3e9ee", borderRadius: 18, fontSize: 13, fontFamily: "inherit" }}
            />
            {batiments.length > 0 && (
              <select value={filterBatiment} onChange={(e) => { setFilterBatiment(e.target.value); setFilterService(""); }} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e3e9ee", fontSize: 12.5 }}>
                <option value="">Tous bâtiments</option>
                {batiments.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
              </select>
            )}
            {services.length > 0 && (
              <select value={filterService} onChange={(e) => setFilterService(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e3e9ee", fontSize: 12.5 }}>
                <option value="">Tous services</option>
                {services.filter(s => !filterBatiment || s.batiment_id === filterBatiment).map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            )}
            <Btn variant="ghost" icon="ti-edit" onClick={() => router.push("/etablissement/edition")}>Créer/structurer</Btn>
          </div>
        </Panel>

        {loading ? (
          <Panel><SkeletonRow count={6} /></Panel>
        ) : filtered.length === 0 ? (
          <EmptyState
            illustration="folder"
            title={chambres.length === 0 ? "Aucune chambre" : "Aucun résultat"}
            message={chambres.length === 0 ? "Crée tes chambres depuis /etablissement/edition." : "Essaie d'élargir tes filtres."}
            actionLabel={chambres.length === 0 ? "Aller à édition" : null}
            onAction={chambres.length === 0 ? () => router.push("/etablissement/edition") : null}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
            {filtered.map(c => {
              const svc = services.find(s => s.id === c.service_id);
              const bat = svc ? batiments.find(b => b.id === svc.batiment_id) : null;
              const type = TYPES_CHAMBRE.find(t => t.value === c.type_chambre) || TYPES_CHAMBRE[0];
              const pats = patients[c.id] || [];
              return (
                <div key={c.id} onClick={() => openEdit(c)} style={{
                  background: "#fff", border: "1px solid #e3e9ee", borderRadius: 12,
                  borderLeft: `4px solid ${type.color}`,
                  padding: "14px 16px", cursor: "pointer", transition: "all .15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 6px 16px ${type.color}33`; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `${type.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className={`ti ${type.icon}`} style={{ color: type.color, fontSize: 20 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#142131" }}>{c.nom}</h3>
                      <div style={{ fontSize: 10.5, color: "#5a6878", marginTop: 2 }}>
                        {bat && <span style={{ color: bat.couleur }}>● {bat.nom}</span>}
                        {svc && <> · {svc.nom}</>}
                      </div>
                    </div>
                  </div>

                  {/* Téléphone chambre */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "3px 8px", borderRadius: 6, fontSize: 11.5, fontWeight: 600,
                      background: c.telephone ? "#eef9ef" : "#fef0ee",
                      color: c.telephone ? "#5aa05a" : "#c0392b",
                      border: `1px solid ${c.telephone ? "#bfe2bf" : "#f0c4be"}`,
                    }}>
                      <i className="ti ti-phone" /> {c.telephone || "Pas de tél"}
                    </span>
                    {c.code_acces && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, fontSize: 11.5, fontWeight: 600, background: "#fff4e1", color: "#EF9F27", border: "1px solid #f0d59f" }}>
                        <i className="ti ti-key" /> {c.code_acces}
                      </span>
                    )}
                    {c.lits_max > 1 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, fontSize: 11.5, fontWeight: 600, background: "#eef5fc", color: "#185FA5", border: "1px solid #cfe1f5" }}>
                        <i className="ti ti-bed" /> {c.lits_max} lits
                      </span>
                    )}
                  </div>

                  {/* Patients de la chambre */}
                  {pats.length > 0 && (
                    <div style={{ padding: "6px 8px", background: "#fafbfc", borderRadius: 6, fontSize: 11.5 }}>
                      <div style={{ fontSize: 9.5, color: "#5a6878", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
                        <i className="ti ti-users" /> {pats.length} patient{pats.length > 1 ? "s" : ""}
                      </div>
                      {pats.map(p => (
                        <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                          <span style={{ color: "#142131", fontWeight: 600 }}>{p.nom} {p.prenom || ""}</span>
                          {p.telephone && (
                            <a href={`tel:${p.telephone}`} onClick={(e) => e.stopPropagation()} style={{ color: "#5aa05a", textDecoration: "none", fontSize: 10 }}>
                              <i className="ti ti-phone" /> {p.telephone}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal édition téléphone + équipements */}
        {modal && (
          <Modal open={!!modal} onClose={() => setModal(null)} kind="patient"
            title={`Chambre ${form.nom || ""}`}
            footer={
              <>
                <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
                <Btn variant="primary" icon="ti-check" onClick={save} disabled={busy}>{busy ? "..." : "Enregistrer"}</Btn>
              </>
            }>
            <div className="fld">
              <label><i className="ti ti-phone" style={{ color: "#5aa05a" }} /> Téléphone de la chambre</label>
              <input type="tel" value={form.telephone || ""} onChange={(e) => setForm({ ...form, telephone: e.target.value })} placeholder="01 23 45 67 89" />
              <small style={{ color: "#8a98a8", fontSize: 12 }}>Apparaît avec icône verte ☎ dans la liste patients</small>
            </div>
            <div className="row-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              <div className="fld">
                <label>Code d'accès / digicode</label>
                <input value={form.code_acces || ""} onChange={(e) => setForm({ ...form, code_acces: e.target.value })} placeholder="A12B34" style={{ fontFamily: "Consolas, monospace" }} />
              </div>
              <div className="fld">
                <label>Type de chambre</label>
                <select value={form.type_chambre || ""} onChange={(e) => setForm({ ...form, type_chambre: e.target.value })}>
                  <option value="">—</option>
                  {TYPES_CHAMBRE.map(t => <option key={t.value} value={t.value}>{t.lbl}</option>)}
                </select>
              </div>
              <div className="fld">
                <label>Nombre de lits</label>
                <input type="number" min="1" max="6" value={form.lits_max || 1} onChange={(e) => setForm({ ...form, lits_max: e.target.value })} />
              </div>
            </div>
            <div className="fld" style={{ marginTop: 10 }}>
              <label>Notes</label>
              <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 12.5, fontFamily: "inherit" }} />
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
