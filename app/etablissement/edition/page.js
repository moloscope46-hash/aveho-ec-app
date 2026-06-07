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
import IconPicker from "../../components/IconPicker";  // 0.58.60
import LogoUploader from "../../components/LogoUploader";  // 0.62.72
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
      Promise.resolve({ data: [] }), // 0.58.85 etages dropped
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
      const tables = { batiment: "batiments", service: "services", chambre: "chambres", lit: "lits" };  // 0.62.35 : etages dropped
      const fkField = { service: "batiment_id", chambre: "service_id", lit: "chambre_id" };  // 0.62.35 : services directement sous bâtiment
      const table = tables[k];
      let payload = { nom: form.nom };
      // Alpha 0.15.3 : ajout systématique de structure_id pour passer la RLS
      payload.structure_id = auth.structureId;
      // Alpha 0.15.6 : colonne services.type rétablie (ajoutée via alter table)
      if (k === "service") payload.type = form.type || null;
      // 0.58.60 : icône optionnelle pour bâtiments et services
      if ((k === "batiment" || k === "service") && form.icone) {
        payload.icone = form.icone;
      }
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
    const tables = { batiment: "batiments", service: "services", chambre: "chambres", lit: "lits" };  // 0.62.35 : etages dropped
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
        {/* 0.58.60 : icône custom si l'utilisateur en a choisi une pour ce bâtiment / service */}
        {(kind === "batiment" || kind === "service") && item.icone ? (
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: kind === "batiment" ? "rgba(124,200,200,.15)" : "rgba(239,159,39,.15)",
            color: kind === "batiment" ? "#185FA5" : "#a06820",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <i className={`ti ti-${item.icone}`} style={{ fontSize: 18 }} />
          </div>
        ) : (
          <EntityIcon kind={kind} size={32} />
        )}
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
        {/* 0.58.60 : sélecteur d'icône pour bâtiments et services */}
        {(modal?.kind === "batiment" || modal?.kind === "service") && (
          <div className="fld">
            <label>Icône (affichée dans le filtre du haut de page)</label>
            <IconPicker
              value={form.icone || ""}
              onChange={(ic) => setForm({ ...form, icone: ic })}
              suggestFor={form.nom}
              color={modal?.kind === "batiment" ? "#7CC8C8" : "#EF9F27"}
            />
          </div>
        )}
        {/* 0.62.72 : LogoUploader pour services (et bâtiments) */}
        {(modal?.kind === "service" || modal?.kind === "batiment") && modal?.row?.id && (
          <div style={{ marginTop: 12, padding: 12, background: "linear-gradient(135deg, rgba(24,95,165,.04), rgba(124,200,200,.04))", border: "1px solid #eef1f4", borderRadius: 10 }}>
            <LogoUploader
              value={form.logo_url}
              onChange={(url) => setForm({ ...form, logo_url: url })}
              pathPrefix={`${modal.kind}s/${modal.row.id}`}
              label={`Logo du ${modal.kind}`}
              size={60}
            />
          </div>
        )}
        {/* 0.59.3 : multi-select pathologies pour un service */}
        {modal?.kind === "service" && modal?.row?.id && (
          <ServicePathologies serviceId={modal.row.id} supabase={supabase} />
        )}
      </Modal>
    </div>
  );
}

// 0.59.3 : Composant rattachement pathologies à un service
function ServicePathologies({ serviceId, supabase }) {
  const [pathologies, setPathologies] = useState([]);
  const [linked, setLinked] = useState(new Set()); // ids des pathologies liées
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!serviceId) return;
    (async () => {
      try {
        const [allP, linkedP] = await Promise.all([
          supabase.from("pathologies").select("id, nom, code, icone, couleur").eq("actif", true).order("nom"),
          supabase.from("services_pathologies").select("pathologie_id").eq("service_id", serviceId),
        ]);
        setPathologies(allP.data || []);
        setLinked(new Set((linkedP.data || []).map(r => r.pathologie_id)));
      } catch (e) {
        console.error("[SvcPath]", e);
      } finally { setLoading(false); }
    })();
  }, [serviceId]);

  async function toggle(pathId) {
    const wasLinked = linked.has(pathId);
    setSaving(true);
    const newSet = new Set(linked);
    try {
      if (wasLinked) {
        await supabase.from("services_pathologies").delete().eq("service_id", serviceId).eq("pathologie_id", pathId);
        newSet.delete(pathId);
      } else {
        await supabase.from("services_pathologies").insert({ service_id: serviceId, pathologie_id: pathId });
        newSet.add(pathId);
      }
      setLinked(newSet);
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <div style={{ color: "#5a6878", fontSize: 12, padding: 8 }}>Chargement pathologies...</div>;
  if (pathologies.length === 0) return (
    <div className="fld" style={{ background: "#fff8ec", padding: 10, borderRadius: 6, fontSize: 12, color: "#7a4f15", borderLeft: "3px solid #EF9F27" }}>
      <i className="ti ti-info-circle" /> Aucune pathologie créée. <a href="/pathologies" style={{ color: "#185FA5" }}>Créer dans /pathologies</a>
    </div>
  );

  return (
    <div className="fld">
      <label>
        Pathologies prises en charge ({linked.size}/{pathologies.length})
        {saving && <span style={{ marginLeft: 8, color: "#7CC8C8", fontSize: 11 }}>Mise à jour…</span>}
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 6, maxHeight: 280, overflowY: "auto", padding: 4, background: "#fafbfc", borderRadius: 8, border: "1px solid #e3e9ee" }}>
        {pathologies.map(p => {
          const isLinked = linked.has(p.id);
          return (
            <button key={p.id} type="button" onClick={() => toggle(p.id)}
              style={{
                padding: "8px 10px",
                background: isLinked ? `${p.couleur}22` : "#fff",
                border: `2px solid ${isLinked ? p.couleur : "#e3e9ee"}`,
                color: isLinked ? p.couleur : "#5a6878",
                borderRadius: 8, fontFamily: "inherit", fontSize: 11.5,
                fontWeight: 600, cursor: "pointer", textAlign: "left",
                display: "flex", alignItems: "center", gap: 6,
              }}>
              <i className={`ti ${p.icone || "ti-stethoscope"}`} />
              <span style={{ flex: 1 }}>
                {p.code && <div style={{ fontSize: 9, fontFamily: "Consolas,monospace", opacity: 0.7 }}>{p.code}</div>}
                {p.nom}
              </span>
              {isLinked && <i className="ti ti-check" />}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 10.5, color: "#8a98a8", marginTop: 4 }}>
        Click pour ajouter/retirer. Les pathologies cochées apparaissent comme suggestions dans la création patient pour ce service.
      </div>
    </div>
  );
}
