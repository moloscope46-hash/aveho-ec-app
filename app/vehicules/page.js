"use client";
// =============================================================
//  /vehicules — CRUD basique des véhicules sanitaires (0.58.86)
// =============================================================
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn, Modal } from "../ui";
import BackButton from "../components/BackButton";

const TYPES = [
  { v: "sanitaire",  l: "Sanitaire",  c: "#185FA5", i: "ti-ambulance" },
  { v: "ambulance",  l: "Ambulance",  c: "#e35d5b", i: "ti-ambulance" },
  { v: "vsl",        l: "VSL",        c: "#7CC8C8", i: "ti-car" },
  { v: "taxi",       l: "Taxi",       c: "#EF9F27", i: "ti-cab" },
  { v: "utilitaire", l: "Utilitaire", c: "#5aa05a", i: "ti-truck" },
  { v: "autre",      l: "Autre",      c: "#8a98a8", i: "ti-car-suv" },
];
const STATUTS = [
  { v: "disponible",     l: "Disponible",  c: "#5aa05a" },
  { v: "en_mission",     l: "En mission",  c: "#185FA5" },
  { v: "en_maintenance", l: "Maintenance", c: "#EF9F27" },
  { v: "hors_service",   l: "Hors service",c: "#e35d5b" },
];

function VehiculesPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [vehs, setVehs] = useState([]);
  const [etabs, setEtabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "new" | row
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!auth.ready) return;
    let mounted = true;
    (async () => {
      try {
        const [v, et] = await Promise.all([
          supabase.from("vehicules").select("*, etablissements(nom)").eq("structure_id", auth.structureId).order("nom"),
          supabase.from("etablissements").select("id, nom").eq("structure_id", auth.structureId).order("nom"),
        ]);
        if (!mounted) return;
        setVehs(v.data || []);
        setEtabs(et.data || []);
      } catch (e) { console.error(e); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [auth.ready, auth.structureId]);

  // Ouvrir modal new auto si ?new=1
  useEffect(() => {
    if (sp.get("new") === "1") {
      setForm({
        type: "sanitaire", statut: "disponible", couleur: "#185FA5", actif: true,
        etablissement_id: sp.get("etablissement_id") || auth.etabId || "",
      });
      setModal("new");
    }
  }, [sp, auth.etabId]);

  function openNew() {
    setForm({ type: "sanitaire", statut: "disponible", couleur: "#185FA5", actif: true, etablissement_id: auth.etabId || "" });
    setModal("new");
  }
  function openEdit(v) {
    setForm({ ...v });
    setModal(v);
  }

  async function save() {
    setSaveError("");
    if (!form.nom?.trim()) { setSaveError("Le nom est obligatoire"); return; }
    setSaving(true);
    try {
      const payload = {
        structure_id: auth.structureId,
        etablissement_id: form.etablissement_id || null,
        nom: form.nom,
        type: form.type || "sanitaire",
        immatriculation: form.immatriculation || null,
        marque: form.marque || null,
        modele: form.modele || null,
        annee: form.annee ? parseInt(form.annee, 10) : null,
        couleur: form.couleur || "#185FA5",
        capacite_personnes: form.capacite_personnes ? parseInt(form.capacite_personnes, 10) : null,
        capacite_brancards: form.capacite_brancards ? parseInt(form.capacite_brancards, 10) : 0,
        numero_agrement: form.numero_agrement || null,
        kilometrage: form.kilometrage ? parseInt(form.kilometrage, 10) : null,
        statut: form.statut || "disponible",
        notes: form.notes || null,
        actif: form.actif !== false,
        prochaine_revision: form.prochaine_revision || null,
        prochain_controle_technique: form.prochain_controle_technique || null,
      };
      console.log("[Vehicules] Save payload:", payload);
      let result;
      if (modal === "new") {
        result = await supabase.from("vehicules").insert({ ...payload, created_by: auth.user?.id }).select();
      } else {
        result = await supabase.from("vehicules").update({ ...payload, updated_by: auth.user?.id, updated_at: new Date().toISOString() }).eq("id", modal.id).select();
      }
      if (result.error) {
        console.error("[Vehicules] Erreur save:", result.error);
        // Détection des erreurs courantes
        if (result.error.code === "42P01" || /relation.*does not exist/i.test(result.error.message || "")) {
          throw new Error("⚠ La table 'vehicules' n'existe pas dans ta base. Applique d'abord migration-0.58.85-vehicules-cuves-stock.sql dans Supabase SQL Editor.");
        }
        if (result.error.code === "42501" || /row-level security/i.test(result.error.message || "")) {
          throw new Error("⚠ La sécurité RLS bloque l'insertion. Applique fix-rls-vehicules-cuves-0.58.92.sql dans Supabase SQL Editor.");
        }
        if (result.error.code === "23502") {
          throw new Error("⚠ Champ obligatoire manquant : " + (result.error.details || result.error.message));
        }
        throw new Error(`${result.error.message || "Erreur inconnue"} (code: ${result.error.code || "?"})`);
      }
      setModal(null);
      // reload
      const { data } = await supabase.from("vehicules").select("*, etablissements(nom)").eq("structure_id", auth.structureId).order("nom");
      setVehs(data || []);
    } catch (e) {
      console.error("[Vehicules] Catch:", e);
      setSaveError(e.message || "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <BackButton />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <PageHead eyebrow="FLOTTE · MOBILITÉ" icon="ti-ambulance" title="Véhicules" />
          <Btn variant="primary" icon="ti-plus" onClick={openNew}>Nouveau véhicule</Btn>
        </div>

        {loading ? (
          <Panel>Chargement...</Panel>
        ) : vehs.length === 0 ? (
          <Panel>
            <div style={{ textAlign: "center", padding: 40 }}>
              <i className="ti ti-ambulance" style={{ fontSize: 56, color: "#e3e9ee" }} />
              <h3 style={{ marginTop: 12 }}>Aucun véhicule</h3>
              <p style={{ color: "#5a6878" }}>Crée ton premier véhicule (sanitaire, ambulance, VSL, taxi, utilitaire).</p>
              <Btn variant="primary" icon="ti-plus" onClick={openNew}>Créer un véhicule</Btn>
            </div>
          </Panel>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
            {vehs.map(v => {
              const t = TYPES.find(x => x.v === v.type) || TYPES[5];
              const s = STATUTS.find(x => x.v === v.statut) || STATUTS[0];
              return (
                <div key={v.id} style={{
                  background: "#fff", border: `1px solid ${t.c}33`, borderLeft: `4px solid ${v.couleur || t.c}`,
                  borderRadius: 12, padding: "16px 18px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 44, height: 44, background: `${v.couleur || t.c}22`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className={`ti ${t.i}`} style={{ color: v.couleur || t.c, fontSize: 22 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{v.nom}</div>
                      <div style={{ fontSize: 11, color: "#5a6878" }}>{t.l}{v.immatriculation ? <> · <span style={{ fontFamily: "Consolas, monospace" }}>{v.immatriculation}</span></> : null}</div>
                    </div>
                    <span style={{ background: `${s.c}22`, color: s.c, padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{s.l}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, fontSize: 11.5, color: "#5a6878", flexWrap: "wrap", marginBottom: 8 }}>
                    {v.marque && <span>{v.marque} {v.modele}</span>}
                    {v.kilometrage != null && <span><i className="ti ti-route" /> {v.kilometrage.toLocaleString()} km</span>}
                    {v.capacite_personnes && <span><i className="ti ti-users" /> {v.capacite_personnes} pers</span>}
                    {v.capacite_brancards > 0 && <span><i className="ti ti-bed" /> {v.capacite_brancards} bran.</span>}
                    {v.etablissements?.nom && <span><i className="ti ti-building-hospital" /> {v.etablissements.nom}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn variant="ghost" icon="ti-edit" onClick={() => openEdit(v)}>Éditer</Btn>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal new/edit */}
        {modal && (
          <Modal title={modal === "new" ? "Nouveau véhicule" : `Éditer ${modal.nom}`} onClose={() => { setModal(null); setSaveError(""); }}
            footer={<>
              <Btn variant="ghost" onClick={() => { setModal(null); setSaveError(""); }}>Annuler</Btn>
              <Btn variant="primary" icon="ti-device-floppy" onClick={save}>{saving ? "Enregistrement..." : "Enregistrer"}</Btn>
            </>}>
            {/* 0.58.92 : feedback erreur visible dans le modal */}
            {saveError && (
              <div style={{
                background: "rgba(227,93,91,.10)",
                border: "1px solid #e35d5b",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 14,
                color: "#c0392b",
                fontSize: 13,
                fontWeight: 600,
              }}>
                <i className="ti ti-alert-triangle" /> {saveError}
              </div>
            )}
            <div className="fld-row">
              <div className="fld" style={{ flex: 2 }}>
                <label>Nom *</label>
                <input value={form.nom || ""} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Ambulance 1" />
              </div>
              <div className="fld" style={{ flex: 1 }}>
                <label>Couleur</label>
                <input type="color" value={form.couleur || "#185FA5"} onChange={e => setForm({ ...form, couleur: e.target.value })} style={{ height: 38 }} />
              </div>
            </div>
            <div className="fld-row">
              <div className="fld" style={{ flex: 1 }}>
                <label>Type</label>
                <select value={form.type || "sanitaire"} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </div>
              <div className="fld" style={{ flex: 1 }}>
                <label>Statut</label>
                <select value={form.statut || "disponible"} onChange={e => setForm({ ...form, statut: e.target.value })}>
                  {STATUTS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                </select>
              </div>
            </div>
            <div className="fld">
              <label>Établissement</label>
              <select value={form.etablissement_id || ""} onChange={e => setForm({ ...form, etablissement_id: e.target.value })}>
                <option value="">— Aucun rattachement —</option>
                {etabs.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </div>
            <div className="fld-row">
              <div className="fld" style={{ flex: 1 }}>
                <label>Immatriculation</label>
                <input value={form.immatriculation || ""} onChange={e => setForm({ ...form, immatriculation: e.target.value.toUpperCase() })} placeholder="AB-123-CD" style={{ fontFamily: "Consolas, monospace" }} />
              </div>
              <div className="fld" style={{ flex: 1 }}>
                <label>N° agrément ARS</label>
                <input value={form.numero_agrement || ""} onChange={e => setForm({ ...form, numero_agrement: e.target.value })} placeholder="ex: 75-2023-001" style={{ fontFamily: "Consolas, monospace" }} />
              </div>
            </div>
            <div className="fld-row">
              <div className="fld" style={{ flex: 1 }}>
                <label>Marque</label>
                <input value={form.marque || ""} onChange={e => setForm({ ...form, marque: e.target.value })} placeholder="Renault" />
              </div>
              <div className="fld" style={{ flex: 1 }}>
                <label>Modèle</label>
                <input value={form.modele || ""} onChange={e => setForm({ ...form, modele: e.target.value })} placeholder="Master" />
              </div>
              <div className="fld" style={{ flex: 0, minWidth: 90 }}>
                <label>Année</label>
                <input type="number" min="1980" max="2030" value={form.annee || ""} onChange={e => setForm({ ...form, annee: e.target.value })} placeholder="2023" />
              </div>
            </div>
            <div className="fld-row">
              <div className="fld" style={{ flex: 1 }}>
                <label>Capacité personnes</label>
                <input type="number" min="0" value={form.capacite_personnes || ""} onChange={e => setForm({ ...form, capacite_personnes: e.target.value })} />
              </div>
              <div className="fld" style={{ flex: 1 }}>
                <label>Capacité brancards</label>
                <input type="number" min="0" value={form.capacite_brancards || ""} onChange={e => setForm({ ...form, capacite_brancards: e.target.value })} />
              </div>
              <div className="fld" style={{ flex: 1 }}>
                <label>Kilométrage</label>
                <input type="number" min="0" value={form.kilometrage || ""} onChange={e => setForm({ ...form, kilometrage: e.target.value })} />
              </div>
            </div>
            <div className="fld-row">
              <div className="fld" style={{ flex: 1 }}>
                <label>Prochaine révision</label>
                <input type="date" value={form.prochaine_revision || ""} onChange={e => setForm({ ...form, prochaine_revision: e.target.value })} />
              </div>
              <div className="fld" style={{ flex: 1 }}>
                <label>Prochain CT</label>
                <input type="date" value={form.prochain_controle_technique || ""} onChange={e => setForm({ ...form, prochain_controle_technique: e.target.value })} />
              </div>
            </div>
            <div className="fld">
              <label>Notes</label>
              <textarea value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

export default function VehiculesPage() {
  return <Suspense fallback={null}><VehiculesPageInner /></Suspense>;
}
