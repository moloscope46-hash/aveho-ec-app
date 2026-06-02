"use client";
// =============================================================
//  Page Édition de l'établissement — Alpha 0.2
//  Permet de créer/modifier/supprimer toute la hiérarchie depuis l'UI :
//    Bâtiments → Étages → Services → Chambres → Lits
//  Plus besoin de passer par SQL Editor pour cette gestion.
//  L'accès nécessite la permission "editer_hierarchie" (helper auth.can).
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, StateMsg, Modal, Btn, EntityIcon} from "../../ui";
import { dialogs } from "../../dialogs";
export default function EditionEtablissement() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();

  // Données chargées : on stocke à plat (chaque table à part)
  const [bats, setBats] = useState([]);
  const [etages, setEtages] = useState([]);
  const [services, setServices] = useState([]);
  const [chambres, setChambres] = useState([]);
  const [lits, setLits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modale d'édition : { kind: "batiment"|"etage"|... , row: {} | existant , parentId? }
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    if (!auth.etabId) { setLoading(false); return; }
    const [b, e, s, c, l] = await Promise.all([
      supabase.from("batiments").select("*").eq("etablissement_id", auth.etabId).order("nom"),
      supabase.from("etages").select("*").order("nom"),
      supabase.from("services").select("*").order("nom"),
      supabase.from("chambres").select("*").order("nom"),
      supabase.from("lits").select("*").order("nom"),
    ]);
    // on filtre côté JS pour ne garder que les sous-éléments rattachés à mon établissement
    const batIds = new Set((b.data || []).map((x) => x.id));
    const eFil = (e.data || []).filter((x) => batIds.has(x.batiment_id));
    const etgIds = new Set(eFil.map((x) => x.id));
    const sFil = (s.data || []).filter((x) => etgIds.has(x.etage_id));
    const svcIds = new Set(sFil.map((x) => x.id));
    const cFil = (c.data || []).filter((x) => svcIds.has(x.service_id));
    const chIds = new Set(cFil.map((x) => x.id));
    const lFil = (l.data || []).filter((x) => chIds.has(x.chambre_id));
    setBats(b.data || []); setEtages(eFil); setServices(sFil); setChambres(cFil); setLits(lFil);
    setLoading(false);
  }
  useEffect(() => { if (auth.ready) load(); }, [auth.ready, auth.etabId]);

  // ----- ouvrir la modale d'édition / création -----
  function openNew(kind, parentId) {
    setForm({}); setModal({ kind, row: null, parentId }); setErr("");
  }
  function openEdit(kind, row) {
    setForm({ ...row }); setModal({ kind, row, parentId: null }); setErr("");
  }

  // ----- enregistrer (création ou modification) -----
  async function save() {
    setErr("");
    const k = modal.kind;
    if (!form.nom) { setErr("Le nom est obligatoire."); return; }
    setBusy(true);
    try {
      const tables = { batiment: "batiments", etage: "etages", service: "services", chambre: "chambres", lit: "lits" };
      const fkField = { etage: "batiment_id", service: "etage_id", chambre: "service_id", lit: "chambre_id" };
      const table = tables[k];
      let payload = { nom: form.nom };
      // Alpha 0.15.3 : ajout systématique de structure_id pour passer la RLS
      // (les policies exigent structure_id IN mes_structures())
      payload.structure_id = auth.structureId;
      // Alpha 0.15.6 : colonne services.type rétablie (ajoutée via alter table)
      if (k === "service") payload.type = form.type || null;
      if (k === "batiment") {
        payload.etablissement_id = auth.etabId;
      } else if (modal.parentId) {
        payload[fkField[k]] = modal.parentId;
      }
      if (modal.row?.id) {
        const { error } = await supabase.from(table).update(payload).eq("id", modal.row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert(payload);
        if (error) throw error;
      }
      setModal(null); await load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  // ----- supprimer (avec confirmation) -----
  async function del(kind, row) {
    if (!await dialogs.confirm({ title: `Supprimer ${kind} "${row.nom}" et tous ses sous-éléments ?`, variant: "danger" })) return;
    const tables = { batiment: "batiments", etage: "etages", service: "services", chambre: "chambres", lit: "lits" };
    await supabase.from(tables[kind]).delete().eq("id", row.id);
    await load();
  }

  if (!auth.ready) return null;
  if (!auth.can("editer_hierarchie")) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap">
          <PageHead small title="Édition de l'établissement" sub="Accès refusé" />
          <Panel><StateMsg>Ton rôle n'autorise pas la gestion de la hiérarchie. Demande à un administrateur.</StateMsg></Panel>
        </div>
      </div>
    );
  }

  // ----- rendu d'une ligne (générique pour tous les niveaux) -----
  const row = (kind, item, childCount, onAddChild) => (
    <div key={kind + ":" + item.id} className="hier-row">
      <div className="hier-info">
        <EntityIcon kind={kind} size={32} />
        <div>
          <b>{item.nom}</b>
          {kind === "etage" && item.niveau != null && false && <span style={{ color: "#8a98a8", marginLeft: 6, fontSize: 12 }}>Niveau {item.niveau}</span>}
          {kind === "service" && item.type && <span style={{ color: "#8a98a8", marginLeft: 6, fontSize: 12 }}>{item.type}</span>}
          {childCount != null && <span style={{ color: "#8a98a8", marginLeft: 8, fontSize: 12 }}>· {childCount} élément(s)</span>}
        </div>
      </div>
      <div className="hier-actions">
        {onAddChild && <Btn variant="ghost" icon="ti-plus" onClick={onAddChild}>Ajouter</Btn>}
        <i className="ti ti-edit" style={{ color: "#2a5a5a", cursor: "pointer", fontSize: 18 }} onClick={() => openEdit(kind, item)} title="Modifier" />
        <i className="ti ti-trash" style={{ color: "#C9867F", cursor: "pointer", fontSize: 18 }} onClick={() => del(kind, item)} title="Supprimer" />
      </div>
    </div>
  );

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <PageHead eyebrow="GESTION" icon="ti-edit" title="Édition de l'établissement" accent={auth.etabNom} sub="Créez et organisez bâtiments, étages, services, chambres et lits" />
          <Btn variant="ghost" icon="ti-arrow-back-up" onClick={() => router.push("/etablissement")}>Retour au plan</Btn>
        </div>

        {loading ? <Panel><StateMsg>Chargement…</StateMsg></Panel> : (
          <Panel>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <h3 style={{ margin: 0 }}>Hiérarchie complète</h3>
              <Btn variant="new" icon="ti-plus" onClick={() => openNew("batiment")}>Nouveau bâtiment</Btn>
            </div>

            {bats.length === 0
              ? <StateMsg>Aucun bâtiment. <a style={{ color: "#2a5a5a", fontWeight: 600, cursor: "pointer" }} onClick={() => openNew("batiment")}>Créer le premier</a></StateMsg>
              : bats.map((b) => {
                  const etgs = etages.filter((e) => e.batiment_id === b.id);
                  return (
                    <div key={b.id} className="hier-block">
                      {row("batiment", b, etgs.length, () => openNew("etage", b.id))}
                      <div className="hier-children">
                        {etgs.map((e) => {
                          const svs = services.filter((s) => s.etage_id === e.id);
                          return (
                            <div key={e.id}>
                              {row("etage", e, svs.length, () => openNew("service", e.id))}
                              <div className="hier-children">
                                {svs.map((s) => {
                                  const chs = chambres.filter((c) => c.service_id === s.id);
                                  return (
                                    <div key={s.id}>
                                      {row("service", s, chs.length, () => openNew("chambre", s.id))}
                                      <div className="hier-children">
                                        {chs.map((c) => {
                                          const lts = lits.filter((l) => l.chambre_id === c.id);
                                          return (
                                            <div key={c.id}>
                                              {row("chambre", c, lts.length, () => openNew("lit", c.id))}
                                              <div className="hier-children">
                                                {lts.map((l) => row("lit", l, null, null))}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
          </Panel>
        )}
      </div>

      {/* Modale unifiée */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        kind={modal?.kind}
        title={(modal?.row ? "Modifier " : "Nouveau ") + (modal?.kind || "")}
        footer={<>
          <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
          <Btn variant="primary" onClick={save} disabled={busy}>{busy ? "…" : "Enregistrer"}</Btn>
        </>}
      >
        {err && <div className="err">{err}</div>}
        <div className="fld">
          <label>Nom *</label>
          <input value={form.nom || ""} onChange={(e) => setForm({ ...form, nom: e.target.value })} autoFocus />
        </div>
        {modal?.kind === "etage" && (
          <div style={{ background: "#eaf7f7", padding: "8px 12px", borderRadius: 6, fontSize: 12, color: "#2a5a5a", marginBottom: 8 }}>
            <i className="ti ti-info-circle" /> Astuce : nomme les étages dans l'ordre alphabétique pour qu'ils s'affichent dans le bon sens (ex. R-2, R-1, RDC, R+1, R+2).
          </div>
        )}
        {modal?.kind === "service" && (
          <div className="fld">
            <label>Type</label>
            <select value={form.type || ""} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="">—</option>
              <option value="Médecine">Médecine</option>
              <option value="Chirurgie">Chirurgie</option>
              <option value="Soins de suite">Soins de suite</option>
              <option value="EHPAD">EHPAD</option>
              <option value="Urgences">Urgences</option>
              <option value="Maternité">Maternité</option>
              <option value="Pédiatrie">Pédiatrie</option>
              <option value="Réanimation">Réanimation</option>
            </select>
          </div>
        )}
      </Modal>
    </div>
  );
}
