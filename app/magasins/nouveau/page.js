"use client";
// =============================================================
//  /magasins/nouveau — Création / liste magasins depuis l'EC (0.60.1)
//  EC crée des magasins (entités fournisseurs) + rattache à une agence
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn, Modal } from "../../ui";
import BackButton from "../../components/BackButton";

const emptyMagasin = {
  nom: "", code: "", adresse: "", code_postal: "", ville: "",
  telephone: "", email: "", responsable: "",
  etablissement_rattache_id: "",
  favori: false, actif: true,
};

export default function MagasinsCRUDPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [magasins, setMagasins] = useState([]);
  const [etabs, setEtabs] = useState([]);
  const [magasinsRattachesEtabs, setMagasinsRattachesEtabs] = useState(new Map()); // etab_id → magasin_id
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyMagasin);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    reload();
  }, [auth.ready, auth.structureId]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    const [mags, ets] = await Promise.all([
      tryFetch(supabase.from("magasins").select("*").eq("structure_id", auth.structureId).order("nom")),
      tryFetch(supabase.from("etablissements").select("id, nom, ville").eq("structure_id", auth.structureId).order("nom")),
    ]);
    setMagasins(mags);
    setEtabs(ets);
    // Map etab_id → magasin rattaché (pour gérer le grisé)
    const map = new Map();
    mags.forEach(m => { if (m.etablissement_rattache_id) map.set(m.etablissement_rattache_id, m); });
    setMagasinsRattachesEtabs(map);
    setLoading(false);
  }

  function openCreate() {
    setForm({ ...emptyMagasin });
    setEditing({ mode: "create" });
  }

  function openEdit(m) {
    setForm({
      nom: m.nom || "", code: m.code || "",
      adresse: m.adresse || "", code_postal: m.code_postal || "", ville: m.ville || "",
      telephone: m.telephone || "", email: m.email || "", responsable: m.responsable || "",
      etablissement_rattache_id: m.etablissement_rattache_id || "",
      favori: !!m.favori, actif: m.actif !== false,
    });
    setEditing({ mode: "edit", data: m });
  }

  async function save() {
    if (!form.nom.trim()) { alert("Le nom du magasin est obligatoire"); return; }
    setSaving(true);
    try {
      const payload = {
        structure_id: auth.structureId,
        nom: form.nom.trim(),
        code: form.code?.trim() || null,
        adresse: form.adresse?.trim() || null,
        code_postal: form.code_postal?.trim() || null,
        ville: form.ville?.trim() || null,
        telephone: form.telephone?.trim() || null,
        email: form.email?.trim() || null,
        responsable: form.responsable?.trim() || null,
        etablissement_rattache_id: form.etablissement_rattache_id || null,
        favori: !!form.favori,
        actif: form.actif !== false,
      };
      if (editing.mode === "create") {
        const r = await supabase.from("magasins").insert(payload);
        if (r.error) throw r.error;
      } else {
        const r = await supabase.from("magasins").update(payload).eq("id", editing.data.id);
        if (r.error) throw r.error;
      }
      setEditing(null);
      await reload();
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setSaving(false); }
  }

  async function del(m) {
    if (!confirm(`Supprimer le magasin "${m.nom}" ?`)) return;
    try {
      await supabase.from("magasins").delete().eq("id", m.id);
      await reload();
    } catch (e) { alert("Erreur : " + e.message); }
  }

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content">
        <BackButton />
        <PageHead icon="ti-building-warehouse" title="Magasins" subtitle="Entités fournisseurs · 1 magasin = 1 agence rattachée maximum" />

        <Panel>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, color: "#5a8f8f" }}>Mes magasins ({magasins.length})</h3>
            <Btn variant="primary" icon="ti-plus" onClick={openCreate}>Nouveau magasin</Btn>
          </div>

          {loading ? (
            <div style={{ padding: 30, textAlign: "center" }}>Chargement...</div>
          ) : magasins.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#8a98a8" }}>
              <i className="ti ti-building-warehouse" style={{ fontSize: 48, color: "#e3e9ee", display: "block", marginBottom: 10 }} />
              Aucun magasin créé.<br/>
              <span style={{ fontSize: 12 }}>Crée ton premier magasin (entité fournisseur Aveho) pour commencer.</span>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,320px))", gap: 12, justifyContent: "start" }}>
              {magasins.map(m => {
                const etab = etabs.find(e => e.id === m.etablissement_rattache_id);
                return (
                  <div key={m.id} onClick={() => openEdit(m)} style={{
                    background: "#fff",
                    border: m.etablissement_rattache_id ? "2px solid #5a8f8f" : "1px solid #e3e9ee",
                    borderLeft: "4px solid #5a8f8f",
                    borderRadius: 10, padding: 14, cursor: "pointer",
                    opacity: m.actif === false ? 0.5 : 1,
                  }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ width: 40, height: 40, background: "rgba(94,143,143,.22)", color: "#5a8f8f", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                        <i className="ti ti-building-warehouse" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: "#142131" }}>
                          {m.favori && "⭐ "}{m.nom}
                        </div>
                        {m.ville && <div style={{ fontSize: 11, color: "#5a6878" }}>{m.ville}{m.code_postal && ` · ${m.code_postal}`}</div>}
                        {m.code && <div style={{ fontFamily: "Consolas,monospace", fontSize: 10.5, color: "#8a98a8" }}>{m.code}</div>}
                      </div>
                    </div>
                    {etab && (
                      <div style={{ marginTop: 8, padding: 6, background: "rgba(94,143,143,.10)", borderRadius: 6, fontSize: 11, color: "#5a8f8f" }}>
                        <i className="ti ti-link" /> Rattaché à : <b>{etab.nom}</b>
                      </div>
                    )}
                    {!m.etablissement_rattache_id && (
                      <div style={{ marginTop: 8, padding: 6, background: "rgba(239,159,39,.10)", borderRadius: 6, fontSize: 11, color: "#d48820", fontStyle: "italic" }}>
                        ⚠ Pas encore rattaché à une agence
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {editing && (
          <Modal open={true} title={editing.mode === "create" ? "Nouveau magasin" : `Éditer ${form.nom}`}
            onClose={() => setEditing(null)}
            footer={<>
              <Btn variant="ghost" onClick={() => setEditing(null)}>Annuler</Btn>
              {editing.mode === "edit" && <Btn variant="ghost" icon="ti-trash" onClick={() => del(editing.data)} style={{ color: "#e35d5b" }}>Supprimer</Btn>}
              <Btn variant="primary" icon="ti-device-floppy" onClick={save}>{saving ? "..." : "Enregistrer"}</Btn>
            </>}>
            <div className="fld">
              <label>Nom du magasin *</label>
              <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} autoFocus placeholder="Magasin Aveho Lyon..." />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="fld"><label>Code interne</label><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="MAG-LYON-01" style={{ fontFamily: "Consolas,monospace" }} /></div>
              <div className="fld"><label>Responsable</label><input value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} placeholder="Nom du responsable" /></div>
            </div>

            <div className="fld">
              <label><i className="ti ti-link" style={{ color: "#5a8f8f" }} /> Agence rattachée (1 magasin = 1 agence max)</label>
              <select value={form.etablissement_rattache_id} onChange={(e) => setForm({ ...form, etablissement_rattache_id: e.target.value })}>
                <option value="">— Aucune (rattachement plus tard) —</option>
                {etabs.map(e => {
                  // Lock : agence déjà rattachée à un AUTRE magasin
                  const ratt = magasinsRattachesEtabs.get(e.id);
                  const isLockedForMe = ratt && ratt.id !== editing?.data?.id;
                  return (
                    <option key={e.id} value={e.id} disabled={isLockedForMe}>
                      {e.nom}{e.ville ? ` (${e.ville})` : ""}{isLockedForMe ? ` 🔒 déjà rattachée à ${ratt.nom}` : ""}
                    </option>
                  );
                })}
              </select>
              <div style={{ fontSize: 11, color: "#5a6878", marginTop: 4 }}>
                🔒 = agence déjà rattachée à un autre magasin (1 magasin par agence maximum)
              </div>
            </div>

            <h4 style={{ color: "#5a6878", fontSize: 13, marginTop: 16, marginBottom: 6 }}>Coordonnées</h4>
            <div className="fld"><label>Adresse</label><input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
              <div className="fld"><label>Code postal</label><input value={form.code_postal} onChange={(e) => setForm({ ...form, code_postal: e.target.value })} /></div>
              <div className="fld"><label>Ville</label><input value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="fld"><label>Téléphone</label><input type="tel" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></div>
              <div className="fld"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>

            <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, cursor: "pointer" }}>
                <input type="checkbox" checked={form.actif !== false} onChange={(e) => setForm({ ...form, actif: e.target.checked })} /> Actif
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, cursor: "pointer" }}>
                <input type="checkbox" checked={!!form.favori} onChange={(e) => setForm({ ...form, favori: e.target.checked })} /> ⭐ Favori
              </label>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
