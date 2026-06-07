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
  // 0.62.18 : sources additionnelles (transferts + autres demandes)
  const [transferts, setTransferts] = useState([]);
  const [autresDemandes, setAutresDemandes] = useState([]);
  const [selectedTransferts, setSelectedTransferts] = useState([]);
  const [selectedAutres, setSelectedAutres] = useState([]);
  const [sourceTab, setSourceTab] = useState("di");  // di | transferts | sav | maintenance | retour | bilan
  const [hoverItem, setHoverItem] = useState(null);   // popup au survol
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.ready || magasinCtx.loading) return;
    reload();
  }, [auth.ready, magasinCtx.loading, magasinCtx.magasinId]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch (e) { console.warn("[NewTournee]", e); return []; } };

    // 0.62.18 : Charger TOUTES les sources possibles (DI, transferts, retours, maintenance, bilans SAV)
    const promises = [];
    // 1. DI à livrer (existant)
    let disQ = supabase.from("v_di_a_livrer").select("*");
    if (magasinCtx.isUserMagasin && magasinCtx.magasinId) disQ = disQ.eq("magasin_id", magasinCtx.magasinId);
    promises.push(tryFetch(disQ));
    // 2. Véhicules dispo
    let vehQ = supabase.from("vehicules_magasin").select("id, immatriculation, marque, modele, type_vehicule, capacite_kg").eq("statut", "disponible");
    if (magasinCtx.isUserMagasin && magasinCtx.magasinId) vehQ = vehQ.eq("magasin_id", magasinCtx.magasinId);
    promises.push(tryFetch(vehQ));
    // 3. Membres du magasin (chauffeurs + tous les collab)
    let chQ = supabase.from("membres_structure").select("user_id, prenom, nom, role_professionnel, fonction_detail, telephone, email, magasin_fournisseur_id, etablissement_nom, types_di_geres");
    promises.push(tryFetch(chQ));
    // 4. Transferts en attente
    let trQ = supabase.from("transferts").select("*").eq("statut", "en_attente");
    if (magasinCtx.isUserMagasin && magasinCtx.magasinId) trQ = trQ.eq("magasin_emetteur_id", magasinCtx.magasinId);
    promises.push(tryFetch(trQ));
    // 5. Retours / SAV / Maintenance / Bilans : depuis demandes_internes par sous-type
    // 0.62.48 FIX : pas de jointure PostgREST `etablissements(...)` (FK pas déclarée → 400)
    // → on récupère les DI seules, puis on fetch les étabs séparément + Map lookup
    let savQ = supabase.from("demandes_internes").select("id, numero, type, sous_type, etablissement_id, description, urgence, statut, created_at").in("statut", ["nouvelle", "ouverte", "en_attente", "planifiee"]).in("type", ["sav", "maintenance", "retour", "bilan", "depannage"]);
    if (magasinCtx.isUserMagasin && magasinCtx.magasinId) savQ = savQ.eq("magasin_id", magasinCtx.magasinId);
    promises.push(tryFetch(savQ));

    const [dis, veh, ch, trs, autres] = await Promise.all(promises);

    // 0.62.48 : enrichir les DI avec leur etablissement via une 2e query séparée
    const etabIds = Array.from(new Set([...(autres || []).map(d => d.etablissement_id)].filter(Boolean)));
    let etabsMap = new Map();
    if (etabIds.length > 0) {
      try {
        const r = await supabase.from("etablissements").select("id, nom, ville, adresse, latitude, longitude").in("id", etabIds);
        (r.data || []).forEach(e => etabsMap.set(e.id, e));
      } catch {}
    }
    const autresEnrichis = (autres || []).map(d => ({
      ...d,
      etablissements: d.etablissement_id ? etabsMap.get(d.etablissement_id) : null,
    }));

    setDisALivrer(dis);
    setVehicules(veh);
    setChauffeurs(ch);
    setTransferts(trs);
    setAutresDemandes(autresEnrichis);
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
    const totalEtapes = selectedDis.length + selectedTransferts.length + selectedAutres.length;
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
        nb_etapes: totalEtapes,
        nb_completees: 0,
        notes: form.notes?.trim() || null,
        created_by: auth.user?.id,
      }).select("id").single();

      if (t.error) throw t.error;

      // 0.62.18 : Construire les étapes depuis TOUTES les sources
      const etapes = [];
      // DI
      selectedDis.forEach((d, i) => {
        etapes.push({
          tournee_id: t.data.id,
          ordre: etapes.length + 1,
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
        });
      });
      // Transferts
      selectedTransferts.forEach(tr => {
        etapes.push({
          tournee_id: t.data.id,
          ordre: etapes.length + 1,
          type_etape: "transfert",
          demande_id: tr.id,
          etablissement_id: tr.depots?.etablissement_id,
          depot_id: tr.depot_destination_id,
          label: `Transfert ${tr.numero || ""} → ${tr.depots?.nom || ""}`,
          adresse: tr.depots?.etablissements?.adresse,
          ville: tr.depots?.etablissements?.ville,
          latitude: tr.depots?.etablissements?.latitude,
          longitude: tr.depots?.etablissements?.longitude,
          statut: "a_faire",
          duree_estimee_min: 10,
        });
      });
      // Autres (SAV/maintenance/retour/bilan)
      selectedAutres.forEach(a => {
        etapes.push({
          tournee_id: t.data.id,
          ordre: etapes.length + 1,
          type_etape: a.type,
          demande_id: a.id,
          etablissement_id: a.etablissement_id,
          label: `${a.type.toUpperCase()} ${a.numero || ""} · ${a.etablissements?.nom || ""}`,
          adresse: a.etablissements?.adresse,
          ville: a.etablissements?.ville,
          latitude: a.etablissements?.latitude,
          longitude: a.etablissements?.longitude,
          statut: "a_faire",
          duree_estimee_min: a.type === "maintenance" ? 30 : 20,
        });
      });
      if (etapes.length > 0) {
        await supabase.from("tournees_etapes").insert(etapes);
      }

      alert(`✓ Tournée ${numero} créée avec ${totalEtapes} étape(s)`);
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
              <label>Chauffeur / Collaborateur magasin *</label>
              <select value={form.chauffeur_user_id} onChange={(e) => setForm({...form, chauffeur_user_id: e.target.value})}>
                <option value="">— Choisir —</option>
                {chauffeurs.map(c => {
                  const nom = `${c.prenom || ""} ${c.nom || ""}`.trim() || c.email || "—";
                  const role = c.role_professionnel ? ` [${c.role_professionnel}]` : "";
                  const fonction = c.fonction_detail ? ` · ${c.fonction_detail}` : "";
                  const tel = c.telephone ? ` ☎ ${c.telephone}` : "";
                  return <option key={c.user_id} value={c.user_id}>{nom}{role}{fonction}{tel}</option>;
                })}
              </select>
              {form.chauffeur_user_id && (() => {
                const c = chauffeurs.find(x => x.user_id === form.chauffeur_user_id);
                if (!c) return null;
                return (
                  <div style={{ marginTop: 6, padding: 8, background: "rgba(122,111,176,.08)", borderLeft: "3px solid #7a6fb0", borderRadius: 4, fontSize: 11.5, color: "#5a6878" }}>
                    {c.role_professionnel && <div>🎓 Rôle pro : <b>{c.role_professionnel}</b></div>}
                    {c.email && <div>✉ {c.email}</div>}
                    {c.types_di_geres && <div>📦 Types DI gérés : <b>{c.types_di_geres}</b></div>}
                  </div>
                );
              })()}
            </div>
          </Panel>

          {/* 0.62.18 : Sélection multi-sources avec onglets */}
          <Panel style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <h3 style={{ margin: 0, color: "#EF9F27" }}>3. Étapes à intégrer ({selectedDis.length + selectedTransferts.length + selectedAutres.length} sélectionnée(s))</h3>
            </div>
            {/* Tabs des sources */}
            <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap", borderBottom: "2px solid #e3e9ee", paddingBottom: 4 }}>
              {[
                { k: "di",          lbl: "📦 DI à livrer", count: disALivrer.length, col: "#EF9F27" },
                { k: "transferts",  lbl: "🔄 Transferts", count: transferts.length, col: "#7a6fb0" },
                { k: "sav",         lbl: "🛠 SAV", count: autresDemandes.filter(a => a.type === "sav").length, col: "#e35d5b" },
                { k: "maintenance", lbl: "🔧 Maintenance", count: autresDemandes.filter(a => a.type === "maintenance").length, col: "#185FA5" },
                { k: "retour",      lbl: "↩ Retours", count: autresDemandes.filter(a => a.type === "retour").length, col: "#5aa05a" },
                { k: "bilan",       lbl: "📋 Bilans", count: autresDemandes.filter(a => a.type === "bilan").length, col: "#7CC8C8" },
              ].map(t => {
                const active = sourceTab === t.k;
                return (
                  <button key={t.k} onClick={() => setSourceTab(t.k)} style={{
                    padding: "6px 12px", borderRadius: 6,
                    background: active ? t.col : "transparent",
                    color: active ? "#fff" : t.col,
                    border: `1px solid ${t.col}40`,
                    fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}>
                    {t.lbl} <span style={{ marginLeft: 4, opacity: .8 }}>({t.count})</span>
                  </button>
                );
              })}
            </div>

            {loading ? <div style={{ padding: 20, textAlign: "center" }}>Chargement…</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 450, overflowY: "auto", position: "relative" }}>
                {/* DI */}
                {sourceTab === "di" && (disALivrer.length === 0 ? <EmptyMsg label="Aucune DI à livrer." /> :
                  <>
                    <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                      <Btn variant="ghost" onClick={() => setSelectedDis(disALivrer)}>Tout cocher</Btn>
                      <Btn variant="ghost" onClick={() => setSelectedDis([])}>Tout décocher</Btn>
                    </div>
                    {disALivrer.map(d => {
                      const sel = !!selectedDis.find(x => x.id === d.id);
                      const typeColor = d.type_demande === "sav" ? "#e35d5b" : d.type_demande === "transfert" ? "#7a6fb0" : "#5a8f8f";
                      return (
                        <div key={d.id}
                          onClick={() => toggleDi(d)}
                          onMouseEnter={() => setHoverItem({ kind: "di", item: d })}
                          onMouseLeave={() => setHoverItem(null)}
                          style={{
                            padding: 10, background: sel ? "rgba(239,159,39,.10)" : "#fff",
                            border: `2px solid ${sel ? "#EF9F27" : "#e3e9ee"}`, borderRadius: 8, cursor: "pointer",
                            display: "grid", gridTemplateColumns: "20px 70px 1fr 100px 120px 60px", gap: 8, alignItems: "center",
                          }}>
                          <input type="checkbox" checked={sel} onChange={() => {}} style={{ accentColor: "#EF9F27" }} />
                          <span style={{ padding: "2px 6px", background: `${typeColor}15`, color: typeColor, borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: "uppercase", textAlign: "center" }}>{d.type_demande}</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.etablissement_nom || d.depot_nom || "—"}</div>
                            <div style={{ fontSize: 10.5, color: "#8a98a8" }}>{d.numero}</div>
                          </div>
                          <div style={{ fontSize: 11, color: "#5a6878" }}>{d.nb_lignes || 0} ligne(s)</div>
                          <div style={{ fontSize: 11, color: "#5a6878" }}>{d.etablissement_ville || "—"}</div>
                          {d.priorite === "urgente" && <span style={{ color: "#e35d5b", fontSize: 11, fontWeight: 700 }}>🔥</span>}
                        </div>
                      );
                    })}
                  </>
                )}

                {/* TRANSFERTS */}
                {sourceTab === "transferts" && (transferts.length === 0 ? <EmptyMsg label="Aucun transfert en attente." /> :
                  <>
                    <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                      <Btn variant="ghost" onClick={() => setSelectedTransferts(transferts)}>Tout cocher</Btn>
                      <Btn variant="ghost" onClick={() => setSelectedTransferts([])}>Tout décocher</Btn>
                    </div>
                    {transferts.map(tr => {
                      const sel = !!selectedTransferts.find(x => x.id === tr.id);
                      return (
                        <div key={tr.id}
                          onClick={() => setSelectedTransferts(sel ? selectedTransferts.filter(x => x.id !== tr.id) : [...selectedTransferts, tr])}
                          onMouseEnter={() => setHoverItem({ kind: "transfert", item: tr })}
                          onMouseLeave={() => setHoverItem(null)}
                          style={{
                            padding: 10, background: sel ? "rgba(122,111,176,.10)" : "#fff",
                            border: `2px solid ${sel ? "#7a6fb0" : "#e3e9ee"}`, borderRadius: 8, cursor: "pointer",
                            display: "grid", gridTemplateColumns: "20px 80px 1fr 90px 100px", gap: 8, alignItems: "center",
                          }}>
                          <input type="checkbox" checked={sel} onChange={() => {}} style={{ accentColor: "#7a6fb0" }} />
                          <span style={{ padding: "2px 6px", background: "rgba(122,111,176,.15)", color: "#7a6fb0", borderRadius: 4, fontSize: 10, fontWeight: 700, textAlign: "center" }}>TRANSFERT</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tr.depots?.nom || "—"}</div>
                            <div style={{ fontSize: 10.5, color: "#8a98a8" }}>{tr.numero || `TRF-${tr.id?.substring(0, 6)}`}</div>
                          </div>
                          <div style={{ fontSize: 11, color: "#5a6878" }}>Qté {tr.quantite || "—"}</div>
                          <div style={{ fontSize: 11, color: "#5a6878" }}>{tr.depots?.etablissements?.ville || "—"}</div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* AUTRES (SAV/Maintenance/Retour/Bilan) */}
                {(["sav", "maintenance", "retour", "bilan"].includes(sourceTab)) && (() => {
                  const filtres = autresDemandes.filter(a => a.type === sourceTab);
                  if (filtres.length === 0) return <EmptyMsg label={`Aucune demande de type ${sourceTab}.`} />;
                  const typeMeta = { sav: { col: "#e35d5b", ic: "🛠" }, maintenance: { col: "#185FA5", ic: "🔧" }, retour: { col: "#5aa05a", ic: "↩" }, bilan: { col: "#7CC8C8", ic: "📋" } }[sourceTab];
                  return (
                    <>
                      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                        <Btn variant="ghost" onClick={() => setSelectedAutres([...selectedAutres.filter(s => s.type !== sourceTab), ...filtres])}>Tout cocher</Btn>
                        <Btn variant="ghost" onClick={() => setSelectedAutres(selectedAutres.filter(s => s.type !== sourceTab))}>Tout décocher</Btn>
                      </div>
                      {filtres.map(a => {
                        const sel = !!selectedAutres.find(x => x.id === a.id);
                        return (
                          <div key={a.id}
                            onClick={() => setSelectedAutres(sel ? selectedAutres.filter(x => x.id !== a.id) : [...selectedAutres, a])}
                            onMouseEnter={() => setHoverItem({ kind: a.type, item: a })}
                            onMouseLeave={() => setHoverItem(null)}
                            style={{
                              padding: 10, background: sel ? `${typeMeta.col}1A` : "#fff",
                              border: `2px solid ${sel ? typeMeta.col : "#e3e9ee"}`, borderRadius: 8, cursor: "pointer",
                              display: "grid", gridTemplateColumns: "20px 80px 1fr 80px 100px 60px", gap: 8, alignItems: "center",
                            }}>
                            <input type="checkbox" checked={sel} onChange={() => {}} style={{ accentColor: typeMeta.col }} />
                            <span style={{ padding: "2px 6px", background: `${typeMeta.col}15`, color: typeMeta.col, borderRadius: 4, fontSize: 10, fontWeight: 700, textAlign: "center", textTransform: "uppercase" }}>{typeMeta.ic} {a.type}</span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.etablissements?.nom || "—"}</div>
                              <div style={{ fontSize: 10.5, color: "#8a98a8" }}>{a.numero || `${a.type.toUpperCase()}-${a.id?.substring(0, 6)}`}</div>
                            </div>
                            <div style={{ fontSize: 11, color: "#5a6878" }}>{a.sous_type || "—"}</div>
                            <div style={{ fontSize: 11, color: "#5a6878" }}>{a.etablissements?.ville || "—"}</div>
                            {a.urgence === "urgente" && <span style={{ color: "#e35d5b", fontSize: 11, fontWeight: 700 }}>🔥</span>}
                          </div>
                        );
                      })}
                    </>
                  );
                })()}

                {/* 0.62.18 : Popup au survol */}
                {hoverItem && (
                  <div style={{
                    position: "fixed", bottom: 20, right: 20, width: 360, maxWidth: "calc(100% - 40px)",
                    background: "#142131", color: "#fff", borderRadius: 10, padding: 16,
                    boxShadow: "0 20px 50px rgba(0,0,0,.4)", zIndex: 9000,
                    border: "2px solid #EF9F27",
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#EF9F27" }}>
                      {hoverItem.kind === "di" ? "📦 DI" : hoverItem.kind === "transfert" ? "🔄 Transfert" : `${hoverItem.kind.toUpperCase()}`}
                      {hoverItem.item.numero && <span style={{ marginLeft: 6, fontFamily: "Consolas,monospace", fontSize: 11, color: "#cfe4f5" }}>{hoverItem.item.numero}</span>}
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                      {hoverItem.item.etablissement_nom && <div>🏥 <b>{hoverItem.item.etablissement_nom}</b></div>}
                      {hoverItem.item.etablissements?.nom && <div>🏥 <b>{hoverItem.item.etablissements.nom}</b></div>}
                      {hoverItem.item.depot_nom && <div>🏢 Dépôt : {hoverItem.item.depot_nom}</div>}
                      {hoverItem.item.depots?.nom && <div>🏢 Dépôt destination : {hoverItem.item.depots.nom}</div>}
                      {(hoverItem.item.etablissement_ville || hoverItem.item.etablissements?.ville) && <div>📍 {hoverItem.item.etablissement_ville || hoverItem.item.etablissements?.ville}</div>}
                      {hoverItem.item.description && <div style={{ marginTop: 6, fontStyle: "italic", color: "#cfe4f5" }}>{hoverItem.item.description}</div>}
                      {hoverItem.item.motif && <div style={{ marginTop: 6, fontStyle: "italic", color: "#cfe4f5" }}>{hoverItem.item.motif}</div>}
                      {hoverItem.item.quantite && <div style={{ marginTop: 4 }}>Quantité : <b>{hoverItem.item.quantite}</b></div>}
                      {hoverItem.item.nb_lignes && <div style={{ marginTop: 4 }}>Lignes : <b>{hoverItem.item.nb_lignes}</b></div>}
                      {(hoverItem.item.priorite || hoverItem.item.urgence) && (hoverItem.item.priorite === "urgente" || hoverItem.item.urgence === "urgente") && (
                        <div style={{ marginTop: 4, color: "#e35d5b", fontWeight: 700 }}>🔥 URGENT</div>
                      )}
                      {hoverItem.item.created_at && <div style={{ marginTop: 6, fontSize: 10.5, color: "#8a98a8" }}>Créé le {new Date(hoverItem.item.created_at).toLocaleString("fr-FR")}</div>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Panel>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, gap: 10 }}>
            <Btn variant="ghost" onClick={() => router.back()}>Annuler</Btn>
            <Btn variant="primary" icon="ti-check" onClick={submit} disabled={saving || !form.vehicule_id || !form.chauffeur_user_id}>
              {saving ? "Création..." : `Créer la tournée (${selectedDis.length + selectedTransferts.length + selectedAutres.length} étape(s))`}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// 0.62.18 : Helper composant vide
function EmptyMsg({ label }) {
  return (
    <div style={{ padding: 30, textAlign: "center", color: "#8a98a8", fontSize: 12 }}>
      <i className="ti ti-package-off" style={{ fontSize: 30, color: "#e3e9ee", display: "block", marginBottom: 6 }} />
      {label}
    </div>
  );
}
