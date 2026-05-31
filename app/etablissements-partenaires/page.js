"use client";
// =============================================================
//  app/etablissements-partenaires/page.js (Alpha 0.55.31)
//
//  Page dédiée aux établissements PARTENAIRES (table séparée
//  etablissements_partenaires). Distincte de /etablissements
//  qui ne montre que MES établissements.
// =============================================================

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg } from "../ui";
import { KpiRow } from "../kpis";
import Modal from "../components/Modal";
import ContactActions from "../components/ContactActions";
import EtabPhoto from "../components/EtabPhoto";
import SireneSearch from "../SireneSearch";
import FinessSearch from "../FinessSearch";
import { dialogs } from "../dialogs";
import { logger } from "../../lib/logger";

const TYPES_RELATION = [
  { v: "Prescripteur", c: "#185FA5" },
  { v: "Fournisseur", c: "#5aa05a" },
  { v: "Sous-traitant", c: "#EF9F27" },
  { v: "Confrère", c: "#7a6fb0" },
  { v: "Autre", c: "#8a98a8" },
];

const emptyForm = {
  nom: "", type: "", type_relation: "",
  finess: "", siret: "", siren: "",
  adresse: "", cp: "", ville: "",
  contact_nom: "", contact_fonction: "",
  telephone: "", email: "", site_web: "",
  notes: "",
};

export default function EtablissementsPartenaires() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [rows, setRows] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRelation, setFilterRelation] = useState("all");
  const [editModal, setEditModal] = useState(null); // { mode: 'create'|'edit', data }
  const [form, setForm] = useState(emptyForm);
  const [auditOpen, setAuditOpen] = useState(false);

  async function loadAll() {
    if (!auth.ready || !auth.structureId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("etablissements_partenaires")
      .select("*")
      .eq("structure_id", auth.structureId)
      .eq("archive", false)
      .order("nom");
    if (error) logger.warn("[etab-part] load:", error.message);
    setRows(data || []);
    setLoading(false);
  }

  async function loadAudit() {
    const { data, error } = await supabase
      .from("etab_partenaires_audit")
      .select("*")
      .eq("structure_id", auth.structureId)
      .order("ts", { ascending: false })
      .limit(50);
    if (error) logger.warn("[etab-part] audit:", error.message);
    setAudit(data || []);
  }

  useEffect(() => { loadAll(); }, [auth.ready, auth.structureId]);

  function openCreate() {
    setForm(emptyForm);
    setEditModal({ mode: "create" });
  }

  function openEdit(p) {
    setForm({
      nom: p.nom || "",
      type: p.type || "",
      type_relation: p.type_relation || "",
      finess: p.finess || "",
      siret: p.siret || "",
      siren: p.siren || "",
      adresse: p.adresse || "",
      cp: p.cp || "",
      ville: p.ville || "",
      contact_nom: p.contact_nom || "",
      contact_fonction: p.contact_fonction || "",
      telephone: p.telephone || "",
      email: p.email || "",
      site_web: p.site_web || "",
      notes: p.notes || "",
    });
    setEditModal({ mode: "edit", data: p });
  }

  async function save() {
    if (!form.nom.trim()) {
      await dialogs.alert({ title: "Nom requis", message: "Le nom de l'établissement partenaire est obligatoire." });
      return;
    }
    const payload = {
      ...form,
      structure_id: auth.structureId,
      created_by: auth.user?.id,
      // Nullify empty strings
      ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v?.trim?.() || v || null])),
    };
    delete payload.id;
    try {
      if (editModal.mode === "edit") {
        const { error } = await supabase
          .from("etablissements_partenaires")
          .update(payload)
          .eq("id", editModal.data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("etablissements_partenaires")
          .insert(payload);
        if (error) throw error;
      }
      setEditModal(null);
      await loadAll();
    } catch (e) {
      await dialogs.alert({ title: "Erreur", message: e.message, variant: "danger" });
    }
  }

  async function archive(p) {
    if (!await dialogs.confirm({
      title: `Archiver ${p.nom} ?`,
      message: "Le partenaire sera masqué de la liste mais ses données et son historique restent disponibles.",
      variant: "danger",
    })) return;
    await supabase
      .from("etablissements_partenaires")
      .update({ archive: true })
      .eq("id", p.id);
    await loadAll();
  }

  // Filtres
  const filtered = rows.filter((p) => {
    if (filterRelation !== "all" && p.type_relation !== filterRelation) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.nom || "").toLowerCase().includes(s)
        || (p.type || "").toLowerCase().includes(s)
        || (p.ville || "").toLowerCase().includes(s)
        || (p.finess || "").includes(s)
        || (p.siret || "").includes(s);
  });

  const kpis = [
    { label: "Partenaires actifs", value: rows.length, icon: "ti-building-community", color: "#7a6fb0" },
    { label: "Prescripteurs", value: rows.filter((r) => r.type_relation === "Prescripteur").length, icon: "ti-prescription", color: "#185FA5" },
    { label: "Fournisseurs", value: rows.filter((r) => r.type_relation === "Fournisseur").length, icon: "ti-truck-delivery", color: "#5aa05a" },
    { label: "Sous-traitants", value: rows.filter((r) => r.type_relation === "Sous-traitant").length, icon: "ti-handshake", color: "#EF9F27" },
  ];

  return (
    <div className="bg-dark" style={{ minHeight: "100vh" }}>
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <PageHead
            eyebrow="COLLABORATIONS"
            title="Établissements partenaires"
            accent="(externe)"
            sub="Hôpitaux, cliniques, cabinets, pharmacies… qui collaborent avec votre structure mais ne sont PAS dans votre périmètre"
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => { loadAudit(); setAuditOpen(true); }}
              title="Voir l'historique des modifications"
              style={{
                background: "transparent",
                color: "#cfd5dd",
                border: "1px solid rgba(255,255,255,.2)",
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <i className="ti ti-history" /> Audit
            </button>
            <button
              onClick={openCreate}
              style={{
                background: "linear-gradient(135deg, #7a6fb0, #bfa9e0)",
                color: "#fff",
                border: "none",
                padding: "10px 16px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <i className="ti ti-plus" /> Ajouter un partenaire
            </button>
          </div>
        </div>

        <KpiRow tiles={kpis} />

        {/* Filtres */}
        <Panel style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (nom, type, ville, FINESS, SIRET)…"
              style={{
                flex: 1, minWidth: 200,
                padding: "8px 12px",
                border: "1px solid #d3d9e0",
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "inherit",
              }}
            />
            <select
              value={filterRelation}
              onChange={(e) => setFilterRelation(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid #d3d9e0",
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "inherit",
                background: "#fff",
              }}
            >
              <option value="all">Toutes relations</option>
              {TYPES_RELATION.map((t) => (
                <option key={t.v} value={t.v}>{t.v}</option>
              ))}
            </select>
          </div>
        </Panel>

        {loading ? (
          <Panel><StateMsg>Chargement…</StateMsg></Panel>
        ) : filtered.length === 0 ? (
          <Panel><StateMsg>
            {rows.length === 0 ? (
              <>Aucun établissement partenaire. <a style={{ color: "#7a6fb0", fontWeight: 600, cursor: "pointer" }} onClick={openCreate}>Ajouter le premier</a></>
            ) : (
              "Aucun résultat."
            )}
          </StateMsg></Panel>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12, marginTop: 12 }}>
            {filtered.map((p) => {
              const typeRel = TYPES_RELATION.find((t) => t.v === p.type_relation);
              return (
                <div
                  key={p.id}
                  onClick={() => openEdit(p)}
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    cursor: "pointer",
                    border: "1px solid #e3e9ee",
                    transition: "all 0.15s",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = typeRel?.c || "#7a6fb0"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(20,33,49,0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e3e9ee"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  {/* 0.55.36 : photo bannière en haut de la tuile */}
                  <EtabPhoto
                    nom={p.nom}
                    ville={p.ville}
                    type={p.type || p.type_relation}
                    height={100}
                    borderRadius={0}
                  />
                  <div style={{ padding: 14 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: `linear-gradient(135deg, ${typeRel?.c || "#7a6fb0"}, #bfa9e0)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      marginTop: -32,
                      boxShadow: "0 2px 6px rgba(20,33,49,0.2)",
                      border: "2px solid #fff",
                    }}>
                      <i className="ti ti-building-community" style={{ fontSize: 22, color: "#fff" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#142131" }}>{p.nom}</div>
                      <div style={{ fontSize: 11.5, color: "#6c7a89", marginTop: 2 }}>
                        {p.type || "—"}{p.ville ? ` · ${p.ville}` : ""}
                      </div>
                      <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                        {p.type_relation && (
                          <span style={{
                            background: `${typeRel?.c || "#7a6fb0"}22`,
                            color: typeRel?.c || "#7a6fb0",
                            fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, letterSpacing: 0.3,
                          }}>{p.type_relation.toUpperCase()}</span>
                        )}
                        {p.finess && (
                          <span style={{ background: "#eef5fc", color: "#185FA5", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, fontFamily: "Consolas, monospace" }}>
                            FINESS {p.finess}
                          </span>
                        )}
                        {p.siret && (
                          <span style={{ background: "#eef9ef", color: "#2e6f33", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, fontFamily: "Consolas, monospace" }}>
                            SIRET {p.siret.slice(0, 9)}…
                          </span>
                        )}
                      </div>
                      {p.contact_nom && (
                        <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 6 }}>
                          <i className="ti ti-user" style={{ fontSize: 11 }} /> {p.contact_nom}{p.contact_fonction ? ` (${p.contact_fonction})` : ""}
                        </div>
                      )}
                      {/* 0.55.34 : ContactActions */}
                      <div style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                        <ContactActions
                          telephone={p.telephone}
                          email={p.email}
                          adresse={p.adresse}
                          cp={p.cp}
                          commune={p.ville}
                          latitude={p.latitude}
                          longitude={p.longitude}
                        />
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modale création / édition */}
      <Modal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        title={editModal?.mode === "edit" ? "Modifier le partenaire" : "Nouveau partenaire"}
        subtitle={editModal?.mode === "edit" ? editModal.data.nom : "Création d'un établissement externe"}
        icon="ti-building-community"
        color="#7a6fb0"
        maxWidth={720}
        footer={
          <>
            {editModal?.mode === "edit" && (
              <button
                onClick={() => archive(editModal.data)}
                style={{
                  background: "transparent",
                  color: "#c0392b",
                  border: "1px solid #c0392b",
                  padding: "8px 14px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <i className="ti ti-archive" /> Archiver
              </button>
            )}
            <button
              onClick={() => setEditModal(null)}
              style={{
                background: "transparent",
                color: "#142131",
                border: "1px solid #d3d9e0",
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Annuler
            </button>
            <button
              onClick={save}
              style={{
                background: "linear-gradient(135deg, #7a6fb0, #bfa9e0)",
                color: "#fff",
                border: "none",
                padding: "8px 18px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <i className="ti ti-check" /> Enregistrer
            </button>
          </>
        }
      >
        <div style={{ display: "grid", gap: 12 }}>
          {/* 0.55.36 — Photo bannière de l'étab (mode édition) */}
          {editModal?.mode === "edit" && editModal.data?.nom && (
            <div style={{ position: "relative", marginBottom: 4 }}>
              <EtabPhoto
                nom={editModal.data.nom}
                ville={editModal.data.ville}
                type={editModal.data.type || editModal.data.type_relation}
                height={140}
                borderRadius={10}
              />
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
                color: "#fff",
                padding: "20px 16px 12px",
                borderRadius: "0 0 10px 10px",
              }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{editModal.data.nom}</div>
                {editModal.data.ville && (
                  <div style={{ fontSize: 12, opacity: 0.9 }}>
                    <i className="ti ti-map-pin" /> {editModal.data.ville}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 0.55.34 — Bloc recherche FINESS / SIRENE pour création */}
          {editModal?.mode === "create" && (
            <div style={{
              background: "linear-gradient(135deg, #f3effa, #fff)",
              border: "1px solid #d6c9ec",
              borderRadius: 10,
              padding: 12,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#5a4a90", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <i className="ti ti-bolt" /> Remplir automatiquement
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 10.5, color: "#6c7a89", fontWeight: 600, display: "block", marginBottom: 4 }}>
                    🏥 FINESS (santé)
                  </label>
                  <FinessSearch
                    placeholder="Hôpital, EHPAD, n° FINESS…"
                    onSelect={(etab) => {
                      setForm({
                        ...form,
                        nom: etab.nom || form.nom,
                        type: etab.type || form.type,
                        finess: etab.finess || form.finess,
                        siret: etab.siret || form.siret,
                        adresse: etab.adresse || form.adresse,
                        cp: etab.code_postal || form.cp,
                        ville: etab.ville || form.ville,
                        telephone: etab.telephone || form.telephone,
                      });
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10.5, color: "#6c7a89", fontWeight: 600, display: "block", marginBottom: 4 }}>
                    🏢 SIRENE (entreprises)
                  </label>
                  <SireneSearch
                    placeholder="Société, SIRET, SIREN…"
                    onSelect={(s) => {
                      setForm({
                        ...form,
                        nom: s.nom || form.nom,
                        type: s.type || form.type,
                        siret: s.siret || form.siret,
                        siren: s.siren || form.siren,
                        adresse: s.adresse || form.adresse,
                        cp: s.code_postal || form.cp,
                        ville: s.ville || form.ville,
                      });
                    }}
                  />
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#7a6fb0", marginTop: 6 }}>
                <i className="ti ti-info-circle" /> Sélectionnez un résultat pour pré-remplir tous les champs ci-dessous.
              </div>
            </div>
          )}

          {/* Identité */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
            <Field label="Nom *">
              <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Hôpital Saint-Joseph" />
            </Field>
            <Field label="Type">
              <input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="Hôpital, Cabinet…" />
            </Field>
            <Field label="Type de relation">
              <select value={form.type_relation} onChange={(e) => setForm({ ...form, type_relation: e.target.value })}>
                <option value="">—</option>
                {TYPES_RELATION.map((t) => (
                  <option key={t.v} value={t.v}>{t.v}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Identifiants */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <Field label="N° FINESS">
              <input value={form.finess} onChange={(e) => setForm({ ...form, finess: e.target.value })} placeholder="123456789" />
            </Field>
            <Field label="N° SIRET">
              <input value={form.siret} onChange={(e) => setForm({ ...form, siret: e.target.value })} placeholder="12345678901234" />
            </Field>
            <Field label="N° SIREN">
              <input value={form.siren} onChange={(e) => setForm({ ...form, siren: e.target.value })} placeholder="123456789" />
            </Field>
          </div>

          {/* Adresse */}
          <Field label="Adresse">
            <input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} placeholder="12 rue de la République" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
            <Field label="Code postal">
              <input value={form.cp} onChange={(e) => setForm({ ...form, cp: e.target.value })} placeholder="75011" />
            </Field>
            <Field label="Ville">
              <input value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} placeholder="Paris" />
            </Field>
          </div>

          {/* Contact */}
          <h3 style={{ fontSize: 13, color: "#7a6fb0", margin: "8px 0 0", letterSpacing: 1, textTransform: "uppercase" }}>
            Contact référent
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Nom du contact">
              <input value={form.contact_nom} onChange={(e) => setForm({ ...form, contact_nom: e.target.value })} placeholder="Dr Marie Dupont" />
            </Field>
            <Field label="Fonction">
              <input value={form.contact_fonction} onChange={(e) => setForm({ ...form, contact_fonction: e.target.value })} placeholder="Directeur, Référent…" />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <Field label="Téléphone">
              <input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} placeholder="01 23 45 67 89" />
            </Field>
            <Field label="Email">
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contact@…" />
            </Field>
            <Field label="Site web">
              <input value={form.site_web} onChange={(e) => setForm({ ...form, site_web: e.target.value })} placeholder="https://…" />
            </Field>
          </div>

          {/* Notes */}
          <Field label="Notes">
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} style={{ resize: "vertical" }} placeholder="Notes internes sur ce partenaire…" />
          </Field>
        </div>
      </Modal>

      {/* Modale audit */}
      <Modal
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        title="Historique des modifications"
        subtitle="50 dernières actions sur les établissements partenaires"
        icon="ti-history"
        color="#142131"
        maxWidth={780}
      >
        {audit.length === 0 ? (
          <StateMsg>Aucune action enregistrée pour le moment.</StateMsg>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {audit.map((a) => (
              <div key={a.id} style={{
                background: "#f4f7fa",
                border: "1px solid #e3e9ee",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 12.5,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{
                    background: a.action === "INSERT" ? "#dff5e0" : a.action === "DELETE" ? "#fce5e0" : "#fff8ec",
                    color: a.action === "INSERT" ? "#2e6f33" : a.action === "DELETE" ? "#7a1f15" : "#7a4f15",
                    padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
                  }}>{a.action}</span>
                  <span style={{ color: "#142131", fontWeight: 600 }}>
                    {a.new_data?.nom || a.old_data?.nom || "—"}
                  </span>
                  <span style={{ color: "#6c7a89", fontSize: 11, fontFamily: "Consolas, monospace" }}>
                    {new Date(a.ts).toLocaleString("fr-FR")}
                  </span>
                </div>
                {a.changes && Object.keys(a.changes).length > 0 && (
                  <details style={{ marginTop: 4 }}>
                    <summary style={{ cursor: "pointer", fontSize: 11, color: "#7a6fb0" }}>
                      {Object.keys(a.changes).length} champ(s) modifié(s)
                    </summary>
                    <div style={{ marginTop: 4, paddingLeft: 12, fontSize: 11, color: "#6c7a89" }}>
                      {Object.entries(a.changes).map(([key, val]) => (
                        <div key={key}>
                          <b>{key}:</b> <span style={{ textDecoration: "line-through", color: "#c0392b" }}>{JSON.stringify(val.old)}</span> → <span style={{ color: "#2e6f33" }}>{JSON.stringify(val.new)}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11.5, color: "#6c7a89", fontWeight: 600 }}>{label}</label>
      {children}
      <style jsx>{`
        div :global(input),
        div :global(select),
        div :global(textarea) {
          padding: 8px 10px;
          border: 1px solid #d3d9e0;
          border-radius: 6;
          font-size: 13px;
          font-family: inherit;
          background: #fff;
          width: 100%;
        }
      `}</style>
    </div>
  );
}
