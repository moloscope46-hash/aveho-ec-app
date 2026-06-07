"use client";
// =============================================================
//  /magasin/flotte — Gestion flotte véhicules (0.61.3)
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

const TYPES = [
  { v: "utilitaire", l: "🚐 Utilitaire", col: "#185FA5" },
  { v: "camion", l: "🚚 Camion", col: "#7a6fb0" },
  { v: "voiture", l: "🚗 Voiture", col: "#5a8f8f" },
  { v: "scooter", l: "🛵 Scooter", col: "#EF9F27" },
  { v: "velo", l: "🚲 Vélo", col: "#5aa05a" },
];

const STATUTS = {
  disponible: { lbl: "✓ Disponible", col: "#5aa05a" },
  en_tournee: { lbl: "🚛 En tournée", col: "#185FA5" },
  maintenance: { lbl: "🔧 Maintenance", col: "#EF9F27" },
  hors_service: { lbl: "⊘ Hors service", col: "#e35d5b" },
};

const empty = {
  immatriculation: "", marque: "", modele: "", type_vehicule: "utilitaire",
  capacite_kg: "", capacite_m3: "", carburant: "diesel", kilometrage: "",
  date_mise_en_circulation: "", prochain_entretien_date: "", prochain_ct: "",
  assurance_compagnie: "", assurance_date_fin: "",
  chauffeur_principal_user_id: "",
  statut: "disponible", couleur: "", notes: "", actif: true,
};

export default function FlottePage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();

  const [vehicules, setVehicules] = useState([]);
  const [chauffeurs, setChauffeurs] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.ready || magasinCtx.loading) return;
    reload();
  }, [auth.ready, magasinCtx.loading, magasinCtx.magasinId]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    let q = supabase.from("vehicules_magasin").select("*").order("immatriculation");
    if (magasinCtx.isUserMagasin && magasinCtx.magasinId) q = q.eq("magasin_id", magasinCtx.magasinId);
    const [veh, ch] = await Promise.all([
      tryFetch(q),
      tryFetch(supabase.from("membres_structure").select("user_id, prenom, nom, email").eq("role_professionnel", "utilisateur_magasin")),
    ]);
    setVehicules(veh);
    setChauffeurs(ch);
    setLoading(false);
  }

  function openCreate() { setForm({ ...empty }); setEditing({ mode: "create" }); }
  function openEdit(v) { setForm({ ...empty, ...v }); setEditing({ mode: "edit", data: v }); }

  async function save() {
    if (!form.immatriculation.trim()) { alert("Immatriculation obligatoire"); return; }
    setSaving(true);
    try {
      const payload = {
        magasin_id: magasinCtx.magasinId || null,
        structure_id: auth.structureId,
        immatriculation: form.immatriculation.trim().toUpperCase(),
        marque: form.marque?.trim() || null,
        modele: form.modele?.trim() || null,
        type_vehicule: form.type_vehicule,
        capacite_kg: form.capacite_kg ? parseFloat(form.capacite_kg) : null,
        capacite_m3: form.capacite_m3 ? parseFloat(form.capacite_m3) : null,
        carburant: form.carburant,
        kilometrage: form.kilometrage ? parseFloat(form.kilometrage) : null,
        date_mise_en_circulation: form.date_mise_en_circulation || null,
        prochain_entretien_date: form.prochain_entretien_date || null,
        prochain_ct: form.prochain_ct || null,
        assurance_compagnie: form.assurance_compagnie?.trim() || null,
        assurance_date_fin: form.assurance_date_fin || null,
        chauffeur_principal_user_id: form.chauffeur_principal_user_id || null,
        statut: form.statut,
        couleur: form.couleur?.trim() || null,
        notes: form.notes?.trim() || null,
        actif: form.actif !== false,
        updated_at: new Date().toISOString(),
      };
      if (editing.mode === "create") {
        payload.created_by = auth.user?.id;
        const r = await supabase.from("vehicules_magasin").insert(payload);
        if (r.error) throw r.error;
      } else {
        const r = await supabase.from("vehicules_magasin").update(payload).eq("id", editing.data.id);
        if (r.error) throw r.error;
      }
      setEditing(null);
      await reload();
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setSaving(false); }
  }

  async function del(v) {
    if (!confirm(`Supprimer le véhicule ${v.immatriculation} ?`)) return;
    await supabase.from("vehicules_magasin").delete().eq("id", v.id);
    await reload();
  }

  const stats = {
    total: vehicules.length,
    disponibles: vehicules.filter(v => v.statut === "disponible").length,
    en_tournee: vehicules.filter(v => v.statut === "en_tournee").length,
    maintenance: vehicules.filter(v => v.statut === "maintenance").length,
  };

  // Alertes : CT/entretien/assurance < 30 jours
  const aujourdhui = new Date();
  const dans30j = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  const alertes = vehicules.flatMap(v => {
    const a = [];
    if (v.prochain_ct && new Date(v.prochain_ct) < dans30j) a.push({ veh: v, type: "CT", date: v.prochain_ct });
    if (v.prochain_entretien_date && new Date(v.prochain_entretien_date) < dans30j) a.push({ veh: v, type: "Entretien", date: v.prochain_entretien_date });
    if (v.assurance_date_fin && new Date(v.assurance_date_fin) < dans30j) a.push({ veh: v, type: "Assurance", date: v.assurance_date_fin });
    return a;
  });

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <MagasinSidebar />
        <div className="page-content" style={{ flex: 1, padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <PageHead icon="ti-truck-delivery" title="Flotte de véhicules" subtitle={`${vehicules.length} véhicule(s) · ${stats.disponibles} disponibles`} />
            <Btn variant="primary" icon="ti-plus" onClick={openCreate}>Nouveau véhicule</Btn>
          </div>

          {/* Alertes */}
          {alertes.length > 0 && (
            <Panel style={{ background: "rgba(239,159,39,.08)", borderLeft: "4px solid #EF9F27" }}>
              <h3 style={{ margin: "0 0 8px", color: "#d48820" }}>⚠ {alertes.length} alerte(s) dans les 30 jours</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {alertes.slice(0, 5).map((a, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#5a6878" }}>
                    <b>{a.veh.immatriculation}</b> ({a.veh.marque} {a.veh.modele}) — <span style={{ color: "#d48820", fontWeight: 600 }}>{a.type}</span> le {new Date(a.date).toLocaleDateString("fr-FR")}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 220px))", gap: 10, marginTop: 12, justifyContent: "start" }}>
            <StatTile color="#5a8f8f" icon="ti-truck-delivery" lbl="Total flotte" val={stats.total} />
            <StatTile color="#5aa05a" icon="ti-check" lbl="Disponibles" val={stats.disponibles} />
            <StatTile color="#185FA5" icon="ti-route" lbl="En tournée" val={stats.en_tournee} />
            <StatTile color="#EF9F27" icon="ti-tool" lbl="Maintenance" val={stats.maintenance} />
          </div>

          {/* Liste véhicules */}
          <Panel style={{ marginTop: 12 }}>
            <h3 style={{ margin: "0 0 12px", color: "#5a8f8f" }}>🚛 Véhicules</h3>
            {loading ? <div style={{ padding: 30, textAlign: "center" }}>Chargement...</div>
            : vehicules.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#8a98a8" }}>
                <i className="ti ti-truck-off" style={{ fontSize: 48, color: "#e3e9ee", display: "block", marginBottom: 10 }} />
                Aucun véhicule. Ajoute ton premier véhicule pour démarrer les tournées.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,340px))", gap: 12, justifyContent: "start" }}>
                {vehicules.map(v => {
                  const type = TYPES.find(t => t.v === v.type_vehicule) || TYPES[0];
                  const st = STATUTS[v.statut] || STATUTS.disponible;
                  const ch = chauffeurs.find(c => c.user_id === v.chauffeur_principal_user_id);
                  return (
                    <div key={v.id} onClick={() => openEdit(v)} style={{
                      background: "#fff", border: `1px solid ${type.col}33`, borderLeft: `4px solid ${type.col}`,
                      borderRadius: 10, padding: 14, cursor: "pointer",
                    }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ width: 48, height: 48, background: `${type.col}22`, color: type.col, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                          {type.l.split(" ")[0]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "Consolas,monospace", fontWeight: 700, color: "#142131", fontSize: 14, letterSpacing: 1 }}>{v.immatriculation}</div>
                          <div style={{ fontSize: 12, color: "#5a6878" }}>{v.marque} {v.modele}</div>
                          {ch && <div style={{ fontSize: 11, color: "#8a98a8" }}>👤 {ch.prenom} {ch.nom}</div>}
                        </div>
                        <span style={{ padding: "2px 8px", borderRadius: 4, background: `${st.col}15`, color: st.col, fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap" }}>{st.lbl}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10, padding: 6, background: "#fafbfc", borderRadius: 6, fontSize: 11, color: "#5a6878" }}>
                        {v.capacite_kg && <div>📦 {v.capacite_kg} kg</div>}
                        {v.capacite_m3 && <div>📐 {v.capacite_m3} m³</div>}
                        {v.kilometrage && <div>🛣 {Math.round(v.kilometrage).toLocaleString("fr-FR")} km</div>}
                        {v.carburant && <div>⛽ {v.carburant}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {editing && (
            <Modal title={editing.mode === "create" ? "Nouveau véhicule" : `Éditer ${form.immatriculation}`}
              onClose={() => setEditing(null)}
              footer={<>
                {editing.mode === "edit" && <Btn variant="ghost" icon="ti-trash" onClick={() => { del(editing.data); setEditing(null); }} style={{ color: "#e35d5b" }}>Supprimer</Btn>}
                <Btn variant="ghost" onClick={() => setEditing(null)}>Annuler</Btn>
                <Btn variant="primary" icon="ti-device-floppy" onClick={save}>{saving ? "..." : "Enregistrer"}</Btn>
              </>}>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="fld"><label>Immatriculation *</label><input value={form.immatriculation} onChange={(e) => setForm({...form, immatriculation: e.target.value.toUpperCase()})} autoFocus style={{ fontFamily: "Consolas,monospace", textTransform: "uppercase" }} /></div>
                <div className="fld"><label>Statut</label><select value={form.statut} onChange={(e) => setForm({...form, statut: e.target.value})}>{Object.entries(STATUTS).map(([v, s]) => <option key={v} value={v}>{s.lbl}</option>)}</select></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="fld"><label>Marque</label><input value={form.marque} onChange={(e) => setForm({...form, marque: e.target.value})} /></div>
                <div className="fld"><label>Modèle</label><input value={form.modele} onChange={(e) => setForm({...form, modele: e.target.value})} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div className="fld"><label>Type</label><select value={form.type_vehicule} onChange={(e) => setForm({...form, type_vehicule: e.target.value})}>{TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}</select></div>
                <div className="fld"><label>Carburant</label><select value={form.carburant} onChange={(e) => setForm({...form, carburant: e.target.value})}><option value="diesel">Diesel</option><option value="essence">Essence</option><option value="electrique">Électrique</option><option value="hybride">Hybride</option><option value="gpl">GPL</option></select></div>
                <div className="fld"><label>Couleur</label><input value={form.couleur} onChange={(e) => setForm({...form, couleur: e.target.value})} /></div>
              </div>

              <h4 style={{ color: "#5a8f8f", margin: "16px 0 8px", fontSize: 13 }}>📦 Capacités</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div className="fld"><label>Capacité kg</label><input type="number" value={form.capacite_kg} onChange={(e) => setForm({...form, capacite_kg: e.target.value})} /></div>
                <div className="fld"><label>Capacité m³</label><input type="number" step="0.01" value={form.capacite_m3} onChange={(e) => setForm({...form, capacite_m3: e.target.value})} /></div>
                <div className="fld"><label>Kilométrage</label><input type="number" value={form.kilometrage} onChange={(e) => setForm({...form, kilometrage: e.target.value})} /></div>
              </div>

              <h4 style={{ color: "#5a8f8f", margin: "16px 0 8px", fontSize: 13 }}>📅 Échéances</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div className="fld"><label>Mise en circulation</label><input type="date" value={form.date_mise_en_circulation} onChange={(e) => setForm({...form, date_mise_en_circulation: e.target.value})} /></div>
                <div className="fld"><label>Prochain entretien</label><input type="date" value={form.prochain_entretien_date} onChange={(e) => setForm({...form, prochain_entretien_date: e.target.value})} /></div>
                <div className="fld"><label>Prochain CT</label><input type="date" value={form.prochain_ct} onChange={(e) => setForm({...form, prochain_ct: e.target.value})} /></div>
              </div>

              <h4 style={{ color: "#5a8f8f", margin: "16px 0 8px", fontSize: 13 }}>🛡 Assurance & Chauffeur</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="fld"><label>Compagnie assurance</label><input value={form.assurance_compagnie} onChange={(e) => setForm({...form, assurance_compagnie: e.target.value})} /></div>
                <div className="fld"><label>Fin assurance</label><input type="date" value={form.assurance_date_fin} onChange={(e) => setForm({...form, assurance_date_fin: e.target.value})} /></div>
              </div>
              <div className="fld">
                <label>Chauffeur principal</label>
                <select value={form.chauffeur_principal_user_id} onChange={(e) => setForm({...form, chauffeur_principal_user_id: e.target.value})}>
                  <option value="">— Aucun assigné —</option>
                  {chauffeurs.map(c => <option key={c.user_id} value={c.user_id}>{c.prenom} {c.nom}</option>)}
                </select>
              </div>
              <div className="fld"><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} /></div>
            </Modal>
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({ color, icon, lbl, val }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`, borderRadius: 10, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
      <i className={`ti ${icon}`} style={{ color, fontSize: 24 }} />
      <div>
        <div style={{ fontSize: 10, color, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 }}>{lbl}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#142131", fontFamily: "Consolas,monospace" }}>{val}</div>
      </div>
    </div>
  );
}
