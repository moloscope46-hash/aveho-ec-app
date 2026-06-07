"use client";
// =============================================================
//  /transferts/nouvelle — Demande de transfert via magasin (0.60.4)
//  EC demande un transfert d'articles depuis un dépôt source
//  vers un dépôt destination, via le magasin qui a droit_transfert
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn } from "../../ui";
import BackButton from "../../components/BackButton";

const PRIORITES = [
  { v: "normale", l: "Normale", col: "#185FA5" },
  { v: "urgente", l: "🔥 Urgente", col: "#e35d5b" },
];

export default function NouveauTransfertPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();

  const [form, setForm] = useState({
    depot_source_id: "",
    depot_destination_id: "",
    magasin_id: "",
    priorite: "normale",
    commentaire: "",
  });
  const [depots, setDepots] = useState([]);
  const [magasins, setMagasins] = useState([]);
  const [magasinsDroits, setMagasinsDroits] = useState([]);  // magasins qui ont droit_transfert pour notre struct
  const [lignes, setLignes] = useState([{ libelle: "", quantite_demandee: 1, unite: "unité" }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    (async () => {
      const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
      const [dep, mag, droits] = await Promise.all([
        tryFetch(supabase.from("depots").select("id, nom, etablissement_id").eq("structure_id", auth.structureId).order("nom")),
        tryFetch(supabase.from("magasins").select("id, nom, ville").eq("structure_id", auth.structureId).order("nom")),
        tryFetch(supabase.from("etablissements_magasins_droits").select("magasin_id, droit_transfert").eq("structure_id", auth.structureId)),
      ]);
      setDepots(dep);
      setMagasins(mag);
      // Magasins qui ont droit_transfert
      const magasinsAvecDroit = new Set(droits.filter(d => d.droit_transfert).map(d => d.magasin_id));
      setMagasinsDroits(mag.filter(m => magasinsAvecDroit.has(m.id)));
    })();
  }, [auth.ready, auth.structureId]);

  function addLigne() { setLignes([...lignes, { libelle: "", quantite_demandee: 1, unite: "unité" }]); }
  function removeLigne(i) { setLignes(lignes.filter((_, idx) => idx !== i)); }
  function updateLigne(i, key, val) {
    const newL = [...lignes];
    newL[i] = { ...newL[i], [key]: val };
    setLignes(newL);
  }

  async function submit() {
    setError("");
    if (!form.depot_source_id) { setError("⚠ Sélectionne le dépôt source"); return; }
    if (!form.depot_destination_id) { setError("⚠ Sélectionne le dépôt destination"); return; }
    if (form.depot_source_id === form.depot_destination_id) { setError("⚠ Les dépôts source et destination doivent être différents"); return; }
    if (!form.magasin_id) { setError("⚠ Sélectionne le magasin de transit"); return; }
    const lignesValides = lignes.filter(l => l.libelle?.trim() && parseFloat(l.quantite_demandee) > 0);
    if (lignesValides.length === 0) { setError("⚠ Au moins une ligne d'article est nécessaire"); return; }

    setSaving(true);
    try {
      const numero = `TRF-${new Date().toISOString().slice(0,10).replace(/-/g, "")}-${Math.floor(Math.random() * 1000)}`;
      const di = await supabase.from("demandes_internes").insert({
        structure_id: auth.structureId,
        type_demande: "transfert",
        numero,
        statut: "nouvelle",
        priorite: form.priorite,
        depot_source_id: form.depot_source_id,
        depot_destination_id: form.depot_destination_id,
        magasin_id: form.magasin_id,
        commentaire: form.commentaire?.trim() || null,
        created_by: auth.user?.id,
      }).select("id").single();

      if (di.error) throw di.error;

      // Insère les lignes
      const lignesPayload = lignesValides.map(l => ({
        demande_id: di.data.id,
        libelle: l.libelle.trim(),
        quantite_demandee: parseFloat(l.quantite_demandee),
        unite: l.unite || "unité",
      }));
      await supabase.from("demandes_internes_lignes").insert(lignesPayload);

      alert(`✓ Demande de transfert ${numero} envoyée au magasin.`);
      router.push(`/demandes-internes/${di.data.id}`);
    } catch (e) {
      setError(`${e.message} (code: ${e.code || "?"})`);
    } finally { setSaving(false); }
  }

  const magasinsDisponibles = magasinsDroits.length > 0 ? magasinsDroits : magasins;
  const depotSource = depots.find(d => d.id === form.depot_source_id);
  const depotDest = depots.find(d => d.id === form.depot_destination_id);

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content">
        <BackButton />
        <PageHead icon="ti-transfer" title="Nouvelle demande de transfert" subtitle="Transfert d'articles entre dépôts, via un magasin habilité" />

        {error && (
          <Panel style={{ background: "rgba(227,93,91,.10)", borderLeft: "4px solid #e35d5b" }}>
            <div style={{ color: "#c0392b", fontWeight: 600 }}>
              <i className="ti ti-alert-triangle" /> {error}
            </div>
          </Panel>
        )}

        {magasinsDroits.length === 0 && magasins.length > 0 && (
          <Panel style={{ background: "rgba(239,159,39,.10)", borderLeft: "4px solid #EF9F27" }}>
            <div style={{ color: "#d48820", fontSize: 13 }}>
              <i className="ti ti-info-circle" /> Aucun magasin n'a explicitement le droit de transfert pour ta structure. Tous les magasins sont proposés à titre informatif.
              <br/><span style={{ fontSize: 11, fontStyle: "italic" }}>Demande à un admin de configurer les droits dans /magasin/droits.</span>
            </div>
          </Panel>
        )}

        <Panel>
          <h3 style={{ margin: "0 0 12px", color: "#7a6fb0" }}>1. Trajet du transfert</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center" }}>
            <div className="fld">
              <label>📦 Dépôt source *</label>
              <select value={form.depot_source_id} onChange={(e) => setForm({ ...form, depot_source_id: e.target.value })}>
                <option value="">— Choisir —</option>
                {depots.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
              </select>
            </div>
            <div style={{ paddingTop: 22, color: "#7a6fb0", fontSize: 28 }}><i className="ti ti-arrow-right" /></div>
            <div className="fld">
              <label>🎯 Dépôt destination *</label>
              <select value={form.depot_destination_id} onChange={(e) => setForm({ ...form, depot_destination_id: e.target.value })}>
                <option value="">— Choisir —</option>
                {depots.filter(d => d.id !== form.depot_source_id).map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
              </select>
            </div>
          </div>

          {depotSource && depotDest && (
            <div style={{ marginTop: 12, padding: 10, background: "rgba(122,111,176,.08)", borderRadius: 8, fontSize: 12, color: "#7a6fb0" }}>
              <i className="ti ti-info-circle" /> Transfert prévu : <b>{depotSource.nom}</b> → <b>{depotDest.nom}</b>
            </div>
          )}
        </Panel>

        <Panel style={{ marginTop: 12 }}>
          <h3 style={{ margin: "0 0 12px", color: "#5a8f8f" }}>2. Magasin de transit *</h3>
          {magasinsDisponibles.length === 0 ? (
            <div style={{ padding: 20, color: "#8a98a8", textAlign: "center" }}>
              Aucun magasin disponible. Crée d'abord un magasin dans /magasins/nouveau.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,300px))", gap: 8, justifyContent: "start" }}>
              {magasinsDisponibles.map(m => {
                const selected = form.magasin_id === m.id;
                return (
                  <div key={m.id} onClick={() => setForm({ ...form, magasin_id: m.id })} style={{
                    padding: 12,
                    background: selected ? "rgba(94,143,143,.15)" : "#fff",
                    border: `2px solid ${selected ? "#5a8f8f" : "#e3e9ee"}`,
                    borderRadius: 10, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <i className="ti ti-building-warehouse" style={{ color: "#5a8f8f", fontSize: 22 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: "#142131", fontSize: 13 }}>{m.nom}</div>
                      {m.ville && <div style={{ fontSize: 11, color: "#5a6878" }}>{m.ville}</div>}
                    </div>
                    {selected && <i className="ti ti-check" style={{ color: "#5a8f8f", fontSize: 18 }} />}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ margin: 0, color: "#185FA5" }}>3. Articles à transférer ({lignes.length})</h3>
            <Btn variant="ghost" icon="ti-plus" onClick={addLigne}>Ajouter ligne</Btn>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {lignes.map((l, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 100px 110px 36px", gap: 8, alignItems: "center" }}>
                <input value={l.libelle} onChange={(e) => updateLigne(i, "libelle", e.target.value)} placeholder="Libellé article..." style={{ padding: "8px 10px", border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 13 }} />
                <input type="number" min="1" value={l.quantite_demandee} onChange={(e) => updateLigne(i, "quantite_demandee", e.target.value)} placeholder="Qté" style={{ padding: "8px 10px", border: "1px solid #cfd8e0", borderRadius: 6, fontSize: 13, fontFamily: "Consolas,monospace" }} />
                <select value={l.unite} onChange={(e) => updateLigne(i, "unite", e.target.value)} style={{ padding: "8px 10px", border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 13 }}>
                  <option value="unité">Unité</option>
                  <option value="boîte">Boîte</option>
                  <option value="lot">Lot</option>
                  <option value="paquet">Paquet</option>
                </select>
                <button type="button" onClick={() => removeLigne(i)} disabled={lignes.length === 1} style={{ background: "transparent", border: "none", color: "#e35d5b", cursor: "pointer", fontSize: 18 }}>×</button>
              </div>
            ))}
          </div>
        </Panel>

        <Panel style={{ marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <h3 style={{ margin: "0 0 8px", color: "#EF9F27" }}>Priorité</h3>
              <div style={{ display: "flex", gap: 6 }}>
                {PRIORITES.map(p => (
                  <button key={p.v} onClick={() => setForm({ ...form, priorite: p.v })} style={{
                    flex: 1, padding: "8px 12px",
                    background: form.priorite === p.v ? p.col : "#fff",
                    color: form.priorite === p.v ? "#fff" : "#5a6878",
                    border: `2px solid ${form.priorite === p.v ? p.col : "#e3e9ee"}`,
                    borderRadius: 8, fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                  }}>{p.l}</button>
                ))}
              </div>
            </div>
            <div>
              <h3 style={{ margin: "0 0 8px", color: "#5a6878", fontSize: 14 }}>Commentaire</h3>
              <textarea value={form.commentaire} onChange={(e) => setForm({ ...form, commentaire: e.target.value })} rows={2} placeholder="Précisions sur le transfert..." style={{ width: "100%", padding: "8px 12px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 13, resize: "vertical" }} />
            </div>
          </div>
        </Panel>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, gap: 10 }}>
          <Btn variant="ghost" onClick={() => router.back()}>Annuler</Btn>
          <Btn variant="primary" icon="ti-send" onClick={submit} disabled={saving}>{saving ? "Envoi..." : "Envoyer la demande de transfert"}</Btn>
        </div>
      </div>
    </div>
  );
}
