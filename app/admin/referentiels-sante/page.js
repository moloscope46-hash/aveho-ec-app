"use client";
import AdminGuard from "../../components/AdminGuard"; // 0.57.34 anti-régression admin
// =============================================================
//  app/admin/referentiels-sante/page.js (Alpha 0.56.4)
//
//  Gestion référentiels santé : caisses CPAM/CGSS + mutuelles.
//  2 onglets, recherche live, actions tel/gps/mail/web,
//  création + édition + suppression.
// =============================================================

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import ContactActions from "../../ContactActions";
import AdresseAutocomplete from "../../AdresseAutocomplete";
import { PageHead, Panel, StateMsg } from "../../ui";

function ReferentielsSantePageInner() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [tab, setTab] = useState("caisses"); // caisses | mutuelles
  const [caisses, setCaisses] = useState([]);
  const [mutuelles, setMutuelles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState(null);   // objet en cours d'édition
  const [creating, setCreating] = useState(false); // mode "création"
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // 0.56.12 : la table mutuelles utilise raison_sociale au lieu de nom.
  // Helper qui résout le bon champ selon l'onglet.
  const nomField = tab === "caisses" ? "nom" : "raison_sociale";
  const getNom = (item) => item?.nom || item?.raison_sociale || "";

  useEffect(() => {
    if (!auth.ready) return;
    loadAll();
  }, [auth.ready]);

  async function loadAll() {
    setLoading(true);
    const [c, m] = await Promise.all([
      supabase.from("caisses_assurance_maladie").select("*").order("nom").limit(500),
      supabase.from("mutuelles").select("*").order("raison_sociale").limit(500),
    ]);
    setCaisses(c.data || []);
    setMutuelles(m.data || []);
    setLoading(false);
  }

  function openCreate() {
    setCreating(true);
    setEditing(tab === "caisses"
      ? { nom: "", code_organisme: "", type_caisse: "CPAM", regime: "general" }
      : { raison_sociale: "", type_organisme: "mutuelle" }
    );
  }

  function openEdit(item) {
    setCreating(false);
    setEditing({ ...item });
  }

  function closeEdit() {
    setEditing(null);
    setCreating(false);
  }

  async function save() {
    if (!editing) return;
    const nomVal = tab === "caisses" ? editing.nom : editing.raison_sociale;
    if (!nomVal) { setMsg({ type: "error", text: "Le nom est obligatoire" }); return; }
    if (tab === "caisses" && !editing.code_organisme) {
      setMsg({ type: "error", text: "Le code organisme est obligatoire" });
      return;
    }
    setSaving(true);
    setMsg(null);
    const token = (await supabase.auth.getSession()).data?.session?.access_token;
    const endpoint = tab === "caisses" ? "/api/caisses" : "/api/mutuelles";
    const method = creating ? "POST" : "PUT";
    const body = creating ? editing : editing;

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) {
        setMsg({ type: "error", text: data.duplicate ? "Cette entrée existe déjà (doublon)" : data.error || "Erreur" });
        setSaving(false);
        return;
      }
      setMsg({ type: "success", text: creating ? "Créé avec succès" : "Mis à jour" });
      await loadAll();
      closeEdit();
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  }

  async function del(item) {
    if (!confirm(`Supprimer ${getNom(item)} ? Cette action est irréversible.`)) return;
    const token = (await supabase.auth.getSession()).data?.session?.access_token;
    const endpoint = tab === "caisses" ? "/api/caisses" : "/api/mutuelles";
    try {
      const res = await fetch(`${endpoint}?id=${item.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.ok) {
        setMsg({ type: "success", text: "Supprimé" });
        loadAll();
      } else {
        setMsg({ type: "error", text: data.error || "Suppression impossible (probablement utilisé par des patients)" });
      }
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    }
  }

  const items = tab === "caisses" ? caisses : mutuelles;
  const filtered = filter
    ? items.filter(x => {
        const f = filter.toLowerCase();
        return (getNom(x)).toLowerCase().includes(f)
          || (x.code_organisme || "").toLowerCase().includes(f)
          || (x.numero_amc || "").toLowerCase().includes(f)
          || (x.ville || "").toLowerCase().includes(f)
          || (x.departement || "").includes(f);
      })
    : items;

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="ADMIN · RÉFÉRENTIELS"
          icon="ti-shield-check"
          title="Caisses & Mutuelles"
          accent="(gestion complète)"
          sub="105 caisses + 44 mutuelles seedées · ajouter/modifier/supprimer · actions tel/mail/GPS/web"
        />

        {/* Onglets */}
        <Panel style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <TabBtn label="Caisses" icon="ti-shield-check" color="#185FA5" count={caisses.length} active={tab === "caisses"} onClick={() => setTab("caisses")} />
            <TabBtn label="Mutuelles" icon="ti-heart-handshake" color="#7a6fb0" count={mutuelles.length} active={tab === "mutuelles"} onClick={() => setTab("mutuelles")} />
          </div>
        </Panel>

        {/* Toolbar */}
        <Panel style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={tab === "caisses" ? "Filtrer par nom, code, ville, département…" : "Filtrer par nom, n° AMC, ville…"}
              style={{ flex: 1, minWidth: 200, padding: "8px 12px", border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 12.5 }}
            />
            <button
              onClick={openCreate}
              style={{ background: tab === "caisses" ? "#185FA5" : "#7a6fb0", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              <i className="ti ti-plus" /> Nouvelle {tab === "caisses" ? "caisse" : "mutuelle"}
            </button>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: "#6c7a89" }}>
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""}{filter && ` (sur ${items.length})`}
          </div>
        </Panel>

        {msg && (
          <Panel style={{
            marginBottom: 12,
            background: msg.type === "success" ? "#dff5e0" : "#fce5e0",
            borderColor: msg.type === "success" ? "#bfe2bf" : "#f0c4be",
          }}>
            <p style={{ margin: 0, fontSize: 12, color: msg.type === "success" ? "#2e6f33" : "#7a2d23" }}>
              <i className={`ti ${msg.type === "success" ? "ti-check" : "ti-alert-circle"}`} /> {msg.text}
            </p>
          </Panel>
        )}

        {/* Liste */}
        {loading && <StateMsg type="loading">Chargement…</StateMsg>}
        {!loading && filtered.length === 0 && (
          <StateMsg type="empty">{filter ? "Aucun résultat" : "Liste vide — clique 'Nouvelle' pour ajouter"}</StateMsg>
        )}
        {!loading && filtered.length > 0 && (
          <Panel>
            {filtered.map(item => (
              <div key={item.id} style={{
                padding: "10px 0", borderBottom: "1px solid #f4f7fa",
                display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap",
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#142131" }}>
                    {getNom(item)}
                  </div>
                  <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {tab === "caisses" && (
                      <>
                        {item.code_organisme && <span><i className="ti ti-hash" /> <code style={{ fontFamily: "Consolas, monospace" }}>{item.code_organisme}</code></span>}
                        {(item.type_caisse || item.type) && <span style={{ background: "#dbe7f5", color: "#185FA5", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>{item.type_caisse || item.type}</span>}
                        {item.departement && <span>Dept {item.departement}</span>}
                      </>
                    )}
                    {tab === "mutuelles" && (
                      <>
                        {item.numero_amc && <span><i className="ti ti-hash" /> AMC <code style={{ fontFamily: "Consolas, monospace" }}>{item.numero_amc}</code></span>}
                        {(item.type_organisme || item.type) && <span style={{ background: "#f3effa", color: "#5a4a90", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>{item.type_organisme || item.type}</span>}
                      </>
                    )}
                    {item.ville && <span><i className="ti ti-map-pin" /> {item.ville}{(item.code_postal || item.cp) && ` (${item.code_postal || item.cp})`}</span>}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <ContactActions entity={item} size="sm" />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => openEdit(item)} style={btnGhost}>
                    <i className="ti ti-edit" /> Modifier
                  </button>
                  <button onClick={() => del(item)} style={{ ...btnGhost, color: "#c0392b", borderColor: "#f0c4be" }}>
                    <i className="ti ti-trash" />
                  </button>
                </div>
              </div>
            ))}
          </Panel>
        )}

        {/* Modale édition / création */}
        {editing && (
          <EditModal
            tab={tab}
            entity={editing}
            setEntity={setEditing}
            onSave={save}
            onCancel={closeEdit}
            saving={saving}
            creating={creating}
          />
        )}

        {/* Info */}
        <Panel style={{ marginTop: 14, background: "#fff8ec", borderColor: "#f0d59f" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 13, color: "#7a4f15" }}>
            <i className="ti ti-info-circle" /> À savoir
          </h3>
          <ul style={{ fontSize: 12, color: "#7a4f15", margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
            <li>Ces référentiels sont <b>partagés entre toutes les structures</b> — fais attention aux suppressions</li>
            <li>Une caisse ou mutuelle <b>rattachée à un patient ne peut pas être supprimée</b> (contrainte FK)</li>
            <li>Les coordonnées GPS sont remplies <b>automatiquement</b> via l'autocomplete BAN INSEE</li>
            <li>Les actions tel/mail/GPS/web s'affichent automatiquement selon les champs renseignés</li>
            <li>Le bouton GPS ouvre Google Maps en navigation</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function TabBtn({ label, icon, color, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? color : "transparent",
        color: active ? "#fff" : color,
        border: `1.5px solid ${color}`,
        padding: "8px 14px", borderRadius: 8,
        fontSize: 13, fontWeight: 700,
        cursor: "pointer", fontFamily: "inherit",
        display: "inline-flex", alignItems: "center", gap: 6,
      }}
    >
      <i className={`ti ${icon}`} /> {label}
      <span style={{
        background: active ? "rgba(255,255,255,.25)" : `${color}22`,
        padding: "1px 7px", borderRadius: 10, fontSize: 10.5,
      }}>{count}</span>
    </button>
  );
}

function EditModal({ tab, entity, setEntity, onSave, onCancel, saving, creating }) {
  function set(k, v) { setEntity({ ...entity, [k]: v }); }
  function fillFromBAN(a) {
    // 0.56.13 : les 2 tables utilisent 'cp' au lieu de 'code_postal'
    setEntity({
      ...entity,
      adresse: a.adresse,
      cp: a.code_postal,
      ville: a.ville,
      latitude: a.latitude,
      longitude: a.longitude,
    });
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(20,33,49,.55)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, overflowY: "auto",
    }}>
      <div style={{
        background: "#fff", borderRadius: 12, maxWidth: 640, width: "100%",
        padding: 22, maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, flex: 1 }}>
            <i className={tab === "caisses" ? "ti ti-shield-check" : "ti ti-heart-handshake"} style={{ marginRight: 6, color: tab === "caisses" ? "#185FA5" : "#7a6fb0" }} />
            {creating ? `Nouvelle ${tab === "caisses" ? "caisse" : "mutuelle"}` : `Modifier : ${entity.nom || entity.raison_sociale || ""}`}
          </h3>
          <button onClick={onCancel} style={{ background: "transparent", border: "none", fontSize: 24, color: "#a0aeb9", cursor: "pointer" }}>×</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <FieldCol span={2}>
            {tab === "caisses" ? (
              <Field label="Nom *" value={entity.nom || ""} onChange={(v) => set("nom", v)} />
            ) : (
              <Field label="Raison sociale *" value={entity.raison_sociale || ""} onChange={(v) => set("raison_sociale", v)} />
            )}
          </FieldCol>
          {tab === "caisses" && (
            <>
              <Field label="Code organisme *" mono value={entity.code_organisme || ""} onChange={(v) => set("code_organisme", v)} placeholder="751010101" />
              <FieldSelect label="Type" value={entity.type_caisse || entity.type || "CPAM"} onChange={(v) => set("type_caisse", v)} options={[
                { v: "CPAM", lbl: "CPAM" },
                { v: "CGSS", lbl: "CGSS (DROM)" },
                { v: "CSSM", lbl: "CSSM (Mayotte)" },
                { v: "MSA", lbl: "MSA agricole" },
                { v: "CNMSS", lbl: "CNMSS (militaires)" },
                { v: "LMG", lbl: "LMG (fonctionnaires)" },
                { v: "CAMIEG", lbl: "CAMIEG (EDF)" },
                { v: "CAVIMAC", lbl: "CAVIMAC (cultes)" },
                { v: "MNH", lbl: "MNH" },
                { v: "autre", lbl: "Autre" },
              ]} />
              <FieldSelect label="Régime" value={entity.regime || "general"} onChange={(v) => set("regime", v)} options={[
                { v: "general", lbl: "Régime général" },
                { v: "agricole", lbl: "Agricole" },
                { v: "militaire", lbl: "Militaire" },
                { v: "fonctionnaire", lbl: "Fonctionnaire" },
                { v: "special", lbl: "Spécial" },
                { v: "drom", lbl: "DROM" },
              ]} />
              <Field label="Département" mono value={entity.departement || ""} onChange={(v) => set("departement", v)} placeholder="75" />
              <Field label="Région" value={entity.region || ""} onChange={(v) => set("region", v)} />
            </>
          )}
          {tab === "mutuelles" && (
            <>
              <Field label="N° AMC" mono value={entity.numero_amc || ""} onChange={(v) => set("numero_amc", v)} placeholder="25992142" />
              <FieldSelect label="Type" value={entity.type_organisme || entity.type || "mutuelle"} onChange={(v) => set("type_organisme", v)} options={[
                { v: "mutuelle", lbl: "Mutuelle" },
                { v: "assurance", lbl: "Assurance" },
                { v: "prevoyance", lbl: "Prévoyance" },
                { v: "autre", lbl: "Autre" },
              ]} />
              <Field label="Nom court" value={entity.nom_court || ""} onChange={(v) => set("nom_court", v)} placeholder="Diminutif usuel" />
              <Field label="Code organisme" mono value={entity.code_orgcomp || ""} onChange={(v) => set("code_orgcomp", v)} placeholder="Code de gestion" />
            </>
          )}
        </div>

        <h4 style={{ fontSize: 12, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700, marginTop: 14, marginBottom: 6 }}>
          <i className="ti ti-map-pin" /> Coordonnées
        </h4>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 700, marginBottom: 3 }}>
            Adresse (recherche BAN INSEE)
          </div>
          <AdresseAutocomplete
            value={entity.adresse || ""}
            onChange={(v) => set("adresse", v)}
            onSelect={fillFromBAN}
            placeholder="Tape une adresse — auto cp + ville + lat/lng"
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
          {tab === "caisses" ? (
            <Field label="Code postal" mono value={entity.cp || entity.code_postal || ""} onChange={(v) => set("cp", v)} />
          ) : (
            <Field label="Code postal" mono value={entity.cp || entity.code_postal || ""} onChange={(v) => set("cp", v)} />
          )}
          <Field label="Ville" value={entity.ville || ""} onChange={(v) => set("ville", v)} />
        </div>

        <h4 style={{ fontSize: 12, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700, marginTop: 14, marginBottom: 6 }}>
          <i className="ti ti-address-book" /> Contact
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Téléphone" mono value={entity.telephone || ""} onChange={(v) => set("telephone", v)} placeholder="01 23 45 67 89" />
          <Field label="Email" value={entity.email || ""} onChange={(v) => set("email", v)} placeholder="contact@..." />
        </div>
        <div style={{ marginTop: 8 }}>
          <Field label="Site web" value={entity.site_web || ""} onChange={(v) => set("site_web", v)} placeholder="https://..." />
        </div>

        {(entity.latitude && entity.longitude) && (
          <div style={{ marginTop: 10, padding: 8, background: "#dff5e0", border: "1px solid #bfe2bf", borderRadius: 6, fontSize: 11.5, color: "#2e6f33" }}>
            <i className="ti ti-map-pin-filled" /> Géocodage : <code style={{ fontFamily: "Consolas, monospace" }}>{entity.latitude.toFixed(5)}, {entity.longitude.toFixed(5)}</code>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button onClick={onCancel} disabled={saving} style={btnGhost}>Annuler</button>
          <button onClick={onSave} disabled={saving} style={{
            background: saving ? "#a0aeb9" : (tab === "caisses" ? "#185FA5" : "#7a6fb0"),
            color: "#fff", border: "none", padding: "8px 18px", borderRadius: 6,
            fontSize: 12.5, fontWeight: 700, cursor: saving ? "wait" : "pointer", fontFamily: "inherit",
          }}>
            {saving ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> : <i className="ti ti-device-floppy" />}
            {saving ? " Enregistrement…" : (creating ? " Créer" : " Enregistrer")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, mono }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 700, marginBottom: 3 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "7px 10px", border: "1px solid #d3d9e0", borderRadius: 6,
          fontSize: 12.5, fontFamily: mono ? "Consolas, monospace" : "inherit",
        }}
      />
    </div>
  );
}

function FieldSelect({ label, value, onChange, options }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 700, marginBottom: 3 }}>{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{
        width: "100%", boxSizing: "border-box",
        padding: "7px 10px", border: "1px solid #d3d9e0", borderRadius: 6,
        fontSize: 12.5, background: "#fff", fontFamily: "inherit",
      }}>
        {options.map(o => <option key={o.v} value={o.v}>{o.lbl}</option>)}
      </select>
    </div>
  );
}

function FieldCol({ span = 1, children }) {
  return <div style={{ gridColumn: `span ${span}` }}>{children}</div>;
}

const btnGhost = {
  background: "#fff", color: "#142131", border: "1px solid #d3d9e0",
  padding: "5px 10px", borderRadius: 6, fontSize: 11.5, fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit",
};

// 0.57.34 : wrapper AdminGuard pour restreindre l'accès aux admins
export default function ReferentielsSantePage() {
  return (
    <AdminGuard>
      <ReferentielsSantePageInner />
    </AdminGuard>
  );
}
