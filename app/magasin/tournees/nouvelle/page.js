"use client";
// =============================================================
//  /magasin/tournees/nouvelle — Création tournée (0.61.3)
//  Sélection véhicule + chauffeur + DI à livrer
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/useAuth";
import { useMagasinContext } from "../../../../lib/useMagasinContext";
import TopBar from "../../../TopBar";
import { useCart } from "../../../useCart";
import { PageHead, Panel, Btn } from "../../../ui";
import { MagasinSidebar } from "../../../components/MagasinSidebar";

export default function NouvelleTourneePage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    nom: "", date_tournee: today, heure_depart: "08:00", heure_retour_prevue: "17:00",
    vehicule_id: "", chauffeur_user_id: "", notes: "",
    point_depart_label: "Magasin", point_retour_label: "Magasin",
  });
  const [vehicules, setVehicules] = useState([]);
  const [chauffeurs, setChauffeurs] = useState([]);
  const [disALivrer, setDisALivrer] = useState([]);
  const [selectedDis, setSelectedDis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.ready || magasinCtx.loading) return;
    reload();
  }, [auth.ready, magasinCtx.loading, magasinCtx.magasinId]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    let disQ = supabase.from("v_di_a_livrer").select("*");
    if (magasinCtx.isUserMagasin && magasinCtx.magasinId) disQ = disQ.eq("magasin_id", magasinCtx.magasinId);
    let vehQ = supabase.from("vehicules_magasin").select("id, immatriculation, marque, modele, type_vehicule, capacite_kg").eq("statut", "disponible");
    if (magasinCtx.isUserMagasin && magasinCtx.magasinId) vehQ = vehQ.eq("magasin_id", magasinCtx.magasinId);
    const [dis, veh, ch] = await Promise.all([
      tryFetch(disQ),
      tryFetch(vehQ),
      tryFetch(supabase.from("membres_structure").select("user_id, prenom, nom")),
    ]);
    setDisALivrer(dis);
    setVehicules(veh);
    setChauffeurs(ch);
    setLoading(false);
  }

  function toggleDi(di) {
    if (selectedDis.find(d => d.id === di.id)) {
      setSelectedDis(selectedDis.filter(d => d.id !== di.id));
    } else {
      setSelectedDis([...selectedDis, di]);
    }
  }

  async function submit() {
    if (!form.vehicule_id) { alert("Sélectionne un véhicule"); return; }
    if (!form.chauffeur_user_id) { alert("Sélectionne un chauffeur"); return; }
    setSaving(true);
    try {
      const numero = `TRN-${form.date_tournee.replace(/-/g, "")}-${Math.floor(Math.random() * 1000)}`;
      const t = await supabase.from("tournees").insert({
        magasin_id: magasinCtx.magasinId || null,
        structure_id: auth.structureId,
        numero,
        nom: form.nom?.trim() || `Tournée ${new Date(form.date_tournee).toLocaleDateString("fr-FR")}`,
        date_tournee: form.date_tournee,
        heure_depart: form.heure_depart || null,
        heure_retour_prevue: form.heure_retour_prevue || null,
        vehicule_id: form.vehicule_id,
        chauffeur_user_id: form.chauffeur_user_id,
        statut: "planifiee",
        point_depart_label: form.point_depart_label,
        point_retour_label: form.point_retour_label,
        nb_etapes: selectedDis.length,
        nb_completees: 0,
        notes: form.notes?.trim() || null,
        created_by: auth.user?.id,
      }).select("id").single();

      if (t.error) throw t.error;

      // Créer les étapes
      if (selectedDis.length > 0) {
        const etapes = selectedDis.map((d, i) => ({
          tournee_id: t.data.id,
          ordre: i + 1,
          type_etape: d.type_demande === "transfert" ? "transfert" : d.type_demande === "sav" ? "sav" : "livraison",
          demande_id: d.id,
          etablissement_id: d.etablissement_id,
          depot_id: d.depot_destination_id,
          label: d.etablissement_nom || d.depot_nom || "Livraison",
          adresse: d.depot_adresse,
          ville: d.etablissement_ville,
          latitude: d.depot_lat || d.etablissement_lat,
          longitude: d.depot_lng || d.etablissement_lng,
          statut: "a_faire",
          duree_estimee_min: 15,
        }));
        await supabase.from("tournees_etapes").insert(etapes);
      }

      alert(`✓ Tournée ${numero} créée avec ${selectedDis.length} étape(s)`);
      router.push(`/magasin/tournees/${t.data.id}`);
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <MagasinSidebar />
        <div className="page-content" style={{ flex: 1, padding: "20px 24px" }}>
          <PageHead icon="ti-plus" title="Nouvelle tournée" subtitle="Planifie une session de livraison + sélectionne les DI à livrer" />

          {/* Infos générales */}
          <Panel>
            <h3 style={{ margin: "0 0 12px", color: "#185FA5" }}>1. Informations générales</h3>
            <div className="fld"><label>Nom de la tournée</label><input value={form.nom} onChange={(e) => setForm({...form, nom: e.target.value})} placeholder="Ex: Tournée Lyon Nord matin" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div className="fld"><label>Date *</label><input type="date" value={form.date_tournee} onChange={(e) => setForm({...form, date_tournee: e.target.value})} /></div>
              <div className="fld"><label>Heure départ</label><input type="time" value={form.heure_depart} onChange={(e) => setForm({...form, heure_depart: e.target.value})} /></div>
              <div className="fld"><label>Retour prévu</label><input type="time" value={form.heure_retour_prevue} onChange={(e) => setForm({...form, heure_retour_prevue: e.target.value})} /></div>
            </div>
          </Panel>

          {/* Véhicule + chauffeur */}
          <Panel style={{ marginTop: 12 }}>
            <h3 style={{ margin: "0 0 12px", color: "#5a8f8f" }}>2. Véhicule & Chauffeur</h3>
            {vehicules.length === 0 ? (
              <div style={{ padding: 14, background: "rgba(239,159,39,.10)", borderRadius: 8, color: "#d48820" }}>
                ⚠ Aucun véhicule disponible. <a href="/magasin/flotte" style={{ color: "#d48820", fontWeight: 700 }}>Crée un véhicule</a> d'abord.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 8 }}>
                {vehicules.map(v => {
                  const sel = form.vehicule_id === v.id;
                  return (
                    <div key={v.id} onClick={() => setForm({...form, vehicule_id: v.id})} style={{
                      padding: 12, background: sel ? "rgba(94,143,143,.15)" : "#fff",
                      border: `2px solid ${sel ? "#5a8f8f" : "#e3e9ee"}`, borderRadius: 10, cursor: "pointer",
                    }}>
                      <div style={{ fontFamily: "Consolas,monospace", fontWeight: 700, color: "#142131" }}>{v.immatriculation}</div>
                      <div style={{ fontSize: 11, color: "#5a6878" }}>{v.marque} {v.modele}</div>
                      {v.capacite_kg && <div style={{ fontSize: 11, color: "#8a98a8" }}>📦 {v.capacite_kg} kg</div>}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="fld" style={{ marginTop: 12 }}>
              <label>Chauffeur *</label>
              <select value={form.chauffeur_user_id} onChange={(e) => setForm({...form, chauffeur_user_id: e.target.value})}>
                <option value="">— Choisir —</option>
                {chauffeurs.map(c => <option key={c.user_id} value={c.user_id}>{c.prenom} {c.nom}</option>)}
              </select>
            </div>
          </Panel>

          {/* Sélection DI */}
          <Panel style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: "#EF9F27" }}>3. DI à livrer ({selectedDis.length}/{disALivrer.length} sélectionnée{selectedDis.length > 1 ? "s" : ""})</h3>
              <Btn variant="ghost" onClick={() => setSelectedDis(disALivrer)}>Tout cocher</Btn>
            </div>
            {loading ? <div style={{ padding: 20, textAlign: "center" }}>Chargement...</div>
            : disALivrer.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>
                Aucune DI à livrer. Les DI validées non encore livrées apparaîtront ici.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 400, overflowY: "auto" }}>
                {disALivrer.map(d => {
                  const sel = !!selectedDis.find(x => x.id === d.id);
                  const typeColor = d.type_demande === "sav" ? "#e35d5b" : d.type_demande === "transfert" ? "#7a6fb0" : "#5a8f8f";
                  return (
                    <div key={d.id} onClick={() => toggleDi(d)} style={{
                      padding: 10, background: sel ? "rgba(239,159,39,.10)" : "#fff",
                      border: `2px solid ${sel ? "#EF9F27" : "#e3e9ee"}`, borderRadius: 8, cursor: "pointer",
                      display: "flex", gap: 10, alignItems: "center",
                    }}>
                      <input type="checkbox" checked={sel} onChange={() => {}} style={{ accentColor: "#EF9F27" }} />
                      <span style={{ padding: "2px 6px", background: `${typeColor}15`, color: typeColor, borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{d.type_demande}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{d.etablissement_nom || d.depot_nom || "Livraison"}</div>
                        <div style={{ fontSize: 11, color: "#5a6878" }}>{d.numero} · {d.nb_lignes} ligne(s) · {d.etablissement_ville || "—"}</div>
                      </div>
                      {d.priorite === "urgente" && <span style={{ color: "#e35d5b", fontSize: 11, fontWeight: 700 }}>🔥 URGENT</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, gap: 10 }}>
            <Btn variant="ghost" onClick={() => router.back()}>Annuler</Btn>
            <Btn variant="primary" icon="ti-check" onClick={submit} disabled={saving || !form.vehicule_id || !form.chauffeur_user_id}>
              {saving ? "Création..." : `Créer la tournée (${selectedDis.length} étape${selectedDis.length > 1 ? "s" : ""})`}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
