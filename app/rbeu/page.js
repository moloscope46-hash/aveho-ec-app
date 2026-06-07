"use client";
// =============================================================
//  /rbeu — Registre des Bénéficiaires Effectifs Ultimes (0.61.0)
//  Décret 2025-247 du 17 mars 2025
//  CRUD bénéficiaires + workflow validation + génération attestation PDF
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn, Modal } from "../ui";
import BackButton from "../components/BackButton";

const STATUTS = {
  brouillon:     { lbl: "Brouillon",       col: "#8a98a8", ic: "ti-edit" },
  en_validation: { lbl: "En validation",   col: "#EF9F27", ic: "ti-clock" },
  valide:        { lbl: "Validé",          col: "#5aa05a", ic: "ti-check" },
  archive:       { lbl: "Archivé",         col: "#7a6fb0", ic: "ti-archive" },
  obsolete:      { lbl: "Obsolète",        col: "#e35d5b", ic: "ti-x" },
};

const QUALITES = ["Associé", "Dirigeant", "Mandataire social", "Représentant légal", "Gérant", "Président", "Autre"];

const empty = {
  nom: "", prenom: "", nom_naissance: "", date_naissance: "",
  lieu_naissance: "", pays_naissance: "France", nationalite: "française",
  adresse: "", code_postal: "", ville: "", pays: "France",
  pct_capital: "", pct_droits_vote: "", qualite: "Associé", type_controle: "direct",
  modalites_controle: "",
  date_debut_qualite: "", date_fin_qualite: "",
  piece_identite_type: "CNI", piece_identite_numero: "",
  statut: "brouillon", notes: "",
  etablissement_id: "",
};

export default function RbeuPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [list, setList] = useState([]);
  const [etabs, setEtabs] = useState([]);
  const [etatRbeu, setEtatRbeu] = useState([]);
  const [filterEtab, setFilterEtab] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    reload();
  }, [auth.ready, auth.structureId]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    const [be, et, etat] = await Promise.all([
      tryFetch(supabase.from("beneficiaires_effectifs").select("*").eq("structure_id", auth.structureId).order("nom")),
      tryFetch(supabase.from("etablissements").select("id, nom, ville").eq("structure_id", auth.structureId).order("nom")),
      tryFetch(supabase.from("v_rbeu_etat").select("*").eq("structure_id", auth.structureId)),
    ]);
    setList(be);
    setEtabs(et);
    setEtatRbeu(etat);
    setLoading(false);
  }

  function openCreate() { setForm({ ...empty, etablissement_id: filterEtab || (etabs[0]?.id || "") }); setEditing({ mode: "create" }); }
  function openEdit(b) { setForm({ ...empty, ...b, date_naissance: b.date_naissance || "", date_debut_qualite: b.date_debut_qualite || "", date_fin_qualite: b.date_fin_qualite || "" }); setEditing({ mode: "edit", data: b }); }

  async function save() {
    if (!form.nom.trim() || !form.prenom.trim()) { alert("Nom et prénom obligatoires"); return; }
    if (!form.etablissement_id) { alert("Établissement obligatoire"); return; }
    setSaving(true);
    try {
      const payload = {
        structure_id: auth.structureId,
        etablissement_id: form.etablissement_id,
        nom: form.nom.trim(), prenom: form.prenom.trim(),
        nom_naissance: form.nom_naissance?.trim() || null,
        date_naissance: form.date_naissance || null,
        lieu_naissance: form.lieu_naissance?.trim() || null,
        pays_naissance: form.pays_naissance?.trim() || null,
        nationalite: form.nationalite?.trim() || null,
        adresse: form.adresse?.trim() || null,
        code_postal: form.code_postal?.trim() || null,
        ville: form.ville?.trim() || null,
        pays: form.pays?.trim() || null,
        pct_capital: form.pct_capital ? parseFloat(form.pct_capital) : null,
        pct_droits_vote: form.pct_droits_vote ? parseFloat(form.pct_droits_vote) : null,
        qualite: form.qualite || null,
        type_controle: form.type_controle || null,
        modalites_controle: form.modalites_controle?.trim() || null,
        date_debut_qualite: form.date_debut_qualite || null,
        date_fin_qualite: form.date_fin_qualite || null,
        piece_identite_type: form.piece_identite_type || null,
        piece_identite_numero: form.piece_identite_numero?.trim() || null,
        statut: form.statut || "brouillon",
        notes: form.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (editing.mode === "create") {
        payload.created_by = auth.user?.id;
        const r = await supabase.from("beneficiaires_effectifs").insert(payload);
        if (r.error) throw r.error;
      } else {
        const r = await supabase.from("beneficiaires_effectifs").update(payload).eq("id", editing.data.id);
        if (r.error) throw r.error;
      }
      setEditing(null);
      await reload();
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setSaving(false); }
  }

  async function changeStatut(b, newStatut) {
    const updates = { statut: newStatut, updated_at: new Date().toISOString() };
    if (newStatut === "valide") { updates.validee_at = new Date().toISOString(); updates.validee_par = auth.user?.id; }
    if (newStatut === "archive") { updates.archivee_at = new Date().toISOString(); }
    await supabase.from("beneficiaires_effectifs").update(updates).eq("id", b.id);
    await reload();
  }

  async function del(b) {
    if (!confirm(`Supprimer ${b.prenom} ${b.nom} du RBEU ?`)) return;
    await supabase.from("beneficiaires_effectifs").delete().eq("id", b.id);
    await reload();
  }

  function genererAttestation(etabId) {
    const etab = etabs.find(e => e.id === etabId);
    const benefs = list.filter(b => b.etablissement_id === etabId && b.statut === "valide");
    if (benefs.length === 0) { alert("Aucun bénéficiaire validé pour cet établissement"); return; }
    imprimerAttestation({ etab, benefs, auth });
  }

  const filtered = list.filter(b => {
    if (filterEtab && b.etablissement_id !== filterEtab) return false;
    if (filterStatut && b.statut !== filterStatut) return false;
    return true;
  });

  const stats = {
    total: list.length,
    valides: list.filter(b => b.statut === "valide").length,
    brouillons: list.filter(b => b.statut === "brouillon" || b.statut === "en_validation").length,
    obsoletes: list.filter(b => b.statut === "obsolete" || b.statut === "archive").length,
  };

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content">
        <BackButton />
        <PageHead icon="ti-shield-check" title="RBEU - Bénéficiaires effectifs" subtitle="Registre des Bénéficiaires Effectifs Ultimes · Décret 2025-247 du 17 mars 2025" />

        {/* Bandeau réglementaire */}
        <Panel style={{ background: "rgba(122,111,176,.08)", borderLeft: "4px solid #7a6fb0" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <i className="ti ti-info-circle" style={{ color: "#7a6fb0", fontSize: 22, marginTop: 2 }} />
            <div style={{ fontSize: 12.5, color: "#5a4a90", lineHeight: 1.6 }}>
              <b>Obligation Tracfin</b> : déclarer toute personne détenant ≥ <b>25% du capital</b> ou des <b>droits de vote</b>, ou exerçant un <b>contrôle de fait</b>. Renouvellement annuel obligatoire. Sanction max 7 500€ + 6 mois prison en cas de défaut.
            </div>
          </div>
        </Panel>

        {/* Stats par établissement */}
        {etatRbeu.length > 0 && (
          <Panel style={{ marginTop: 12 }}>
            <h3 style={{ margin: "0 0 12px", color: "#7a6fb0" }}>📋 État RBEU par établissement</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,320px))", gap: 12, justifyContent: "start" }}>
              {etatRbeu.map(e => {
                const etatCol = {
                  a_jour: "#5aa05a",
                  a_renouveler: "#EF9F27",
                  depasse: "#e35d5b",
                  jamais_declare: "#8a98a8",
                }[e.etat_renouvellement] || "#8a98a8";
                const etatLbl = {
                  a_jour: "✓ À jour",
                  a_renouveler: "⚠ À renouveler",
                  depasse: "🔴 Dépassée",
                  jamais_declare: "— Jamais déclarée",
                }[e.etat_renouvellement] || "?";
                return (
                  <div key={e.etablissement_id} style={{
                    background: "#fff", border: `1px solid ${etatCol}33`, borderLeft: `4px solid ${etatCol}`,
                    borderRadius: 10, padding: 12,
                  }}>
                    <div style={{ fontWeight: 700, color: "#142131" }}>{e.etablissement_nom}</div>
                    <div style={{ fontSize: 11, color: "#5a6878", marginTop: 4 }}>
                      {e.nb_beneficiaires || 0} bénéficiaire(s) · {e.nb_valides || 0} validés
                    </div>
                    <div style={{ marginTop: 6, padding: 4, background: `${etatCol}15`, borderRadius: 4, fontSize: 11, color: etatCol, fontWeight: 700, textAlign: "center" }}>
                      {etatLbl}
                    </div>
                    {e.derniere_declaration && (
                      <div style={{ fontSize: 10, color: "#8a98a8", marginTop: 4 }}>
                        Dernière décl. : {new Date(e.derniere_declaration).toLocaleDateString("fr-FR")}
                      </div>
                    )}
                    <Btn variant="ghost" icon="ti-file-text" onClick={() => genererAttestation(e.etablissement_id)} style={{ marginTop: 8, fontSize: 11, width: "100%" }}>
                      Générer attestation
                    </Btn>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        {/* Filtres */}
        <Panel style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <select value={filterEtab} onChange={(e) => setFilterEtab(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 13, minWidth: 180 }}>
              <option value="">Tous établissements</option>
              {etabs.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
            <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 13 }}>
              <option value="">Tous statuts</option>
              {Object.entries(STATUTS).map(([v, s]) => <option key={v} value={v}>{s.lbl}</option>)}
            </select>
            <div style={{ flex: 1 }} />
            <Btn variant="primary" icon="ti-plus" onClick={openCreate}>Nouveau bénéficiaire</Btn>
          </div>
        </Panel>

        {/* Stats globales */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 220px))", gap: 10, marginTop: 12, justifyContent: "start" }}>
          <StatTile color="#7a6fb0" icon="ti-users" lbl="Total" val={stats.total} />
          <StatTile color="#5aa05a" icon="ti-check" lbl="Validés" val={stats.valides} />
          <StatTile color="#EF9F27" icon="ti-clock" lbl="En cours" val={stats.brouillons} />
          <StatTile color="#8a98a8" icon="ti-archive" lbl="Archivés" val={stats.obsoletes} />
        </div>

        {/* Liste bénéficiaires */}
        <Panel style={{ marginTop: 12 }}>
          <h3 style={{ margin: "0 0 12px", color: "#7a6fb0" }}>👥 Bénéficiaires ({filtered.length})</h3>
          {loading ? <div style={{ padding: 30, textAlign: "center" }}>Chargement...</div>
          : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#8a98a8" }}>
              <i className="ti ti-users-off" style={{ fontSize: 48, color: "#e3e9ee", display: "block", marginBottom: 10 }} />
              Aucun bénéficiaire enregistré.
              <div style={{ fontSize: 12, marginTop: 6 }}>
                Crée le premier bénéficiaire effectif de ton établissement.
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,340px))", gap: 12, justifyContent: "start" }}>
              {filtered.map(b => {
                const etab = etabs.find(e => e.id === b.etablissement_id);
                const st = STATUTS[b.statut] || STATUTS.brouillon;
                return (
                  <div key={b.id} style={{
                    background: "#fff", border: `1px solid ${st.col}33`, borderLeft: `4px solid ${st.col}`,
                    borderRadius: 10, padding: 14,
                  }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ width: 40, height: 40, background: `${st.col}22`, color: st.col, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>
                        {b.prenom?.[0]}{b.nom?.[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: "#142131", fontSize: 14 }}>{b.prenom} {b.nom}</div>
                        {b.qualite && <div style={{ fontSize: 11, color: "#5a6878" }}>{b.qualite}</div>}
                        {etab && <div style={{ fontSize: 10.5, color: "#8a98a8" }}><i className="ti ti-building-hospital" /> {etab.nom}</div>}
                      </div>
                      <span style={{ padding: "2px 8px", borderRadius: 4, background: `${st.col}15`, color: st.col, fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap" }}>{st.lbl}</span>
                    </div>
                    {/* Détention */}
                    {(b.pct_capital || b.pct_droits_vote) && (
                      <div style={{ marginTop: 8, padding: 6, background: "#fafbfc", borderRadius: 6, fontSize: 11.5, color: "#5a6878", display: "flex", gap: 12 }}>
                        {b.pct_capital && <span>💰 {b.pct_capital}% capital</span>}
                        {b.pct_droits_vote && <span>🗳 {b.pct_droits_vote}% droits</span>}
                      </div>
                    )}
                    {/* Actions */}
                    <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                      <Btn variant="ghost" icon="ti-edit" onClick={() => openEdit(b)} style={{ flex: 1, fontSize: 11 }}>Éditer</Btn>
                      {b.statut === "brouillon" && (
                        <Btn variant="ghost" icon="ti-clock" onClick={() => changeStatut(b, "en_validation")} style={{ flex: 1, fontSize: 11, color: "#EF9F27" }}>Soumettre</Btn>
                      )}
                      {b.statut === "en_validation" && (
                        <Btn variant="primary" icon="ti-check" onClick={() => changeStatut(b, "valide")} style={{ flex: 1, fontSize: 11 }}>Valider</Btn>
                      )}
                      {b.statut === "valide" && (
                        <Btn variant="ghost" icon="ti-archive" onClick={() => changeStatut(b, "archive")} style={{ flex: 1, fontSize: 11, color: "#7a6fb0" }}>Archiver</Btn>
                      )}
                      <Btn variant="ghost" icon="ti-trash" onClick={() => del(b)} style={{ color: "#e35d5b", fontSize: 11 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Modal édition */}
        {editing && (
          <Modal title={editing.mode === "create" ? "Nouveau bénéficiaire effectif" : `Éditer ${form.prenom} ${form.nom}`}
            onClose={() => setEditing(null)}
            footer={<>
              <Btn variant="ghost" onClick={() => setEditing(null)}>Annuler</Btn>
              <Btn variant="primary" icon="ti-device-floppy" onClick={save}>{saving ? "..." : "Enregistrer"}</Btn>
            </>}>

            <h4 style={{ color: "#7a6fb0", margin: "0 0 8px", fontSize: 13 }}>👤 Identité</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="fld"><label>Prénom *</label><input value={form.prenom} onChange={(e) => setForm({...form, prenom: e.target.value})} autoFocus /></div>
              <div className="fld"><label>Nom *</label><input value={form.nom} onChange={(e) => setForm({...form, nom: e.target.value})} /></div>
            </div>
            <div className="fld"><label>Nom de naissance (si différent)</label><input value={form.nom_naissance} onChange={(e) => setForm({...form, nom_naissance: e.target.value})} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div className="fld"><label>Date naissance</label><input type="date" value={form.date_naissance} onChange={(e) => setForm({...form, date_naissance: e.target.value})} /></div>
              <div className="fld"><label>Lieu naissance</label><input value={form.lieu_naissance} onChange={(e) => setForm({...form, lieu_naissance: e.target.value})} /></div>
              <div className="fld"><label>Nationalité</label><input value={form.nationalite} onChange={(e) => setForm({...form, nationalite: e.target.value})} /></div>
            </div>

            <h4 style={{ color: "#7a6fb0", margin: "16px 0 8px", fontSize: 13 }}>📍 Adresse personnelle</h4>
            <div className="fld"><label>Adresse</label><input value={form.adresse} onChange={(e) => setForm({...form, adresse: e.target.value})} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 140px", gap: 10 }}>
              <div className="fld"><label>CP</label><input value={form.code_postal} onChange={(e) => setForm({...form, code_postal: e.target.value})} /></div>
              <div className="fld"><label>Ville</label><input value={form.ville} onChange={(e) => setForm({...form, ville: e.target.value})} /></div>
              <div className="fld"><label>Pays</label><input value={form.pays} onChange={(e) => setForm({...form, pays: e.target.value})} /></div>
            </div>

            <h4 style={{ color: "#7a6fb0", margin: "16px 0 8px", fontSize: 13 }}>🏢 Établissement & Qualité</h4>
            <div className="fld">
              <label>Établissement *</label>
              <select value={form.etablissement_id} onChange={(e) => setForm({...form, etablissement_id: e.target.value})}>
                <option value="">— Choisir —</option>
                {etabs.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="fld">
                <label>Qualité</label>
                <select value={form.qualite} onChange={(e) => setForm({...form, qualite: e.target.value})}>
                  {QUALITES.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
              <div className="fld">
                <label>Type contrôle</label>
                <select value={form.type_controle} onChange={(e) => setForm({...form, type_controle: e.target.value})}>
                  <option value="direct">Direct</option>
                  <option value="indirect">Indirect</option>
                  <option value="controle_de_fait">Contrôle de fait</option>
                </select>
              </div>
            </div>

            <h4 style={{ color: "#7a6fb0", margin: "16px 0 8px", fontSize: 13 }}>💰 Détention (critères &gt; 25% Tracfin)</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="fld"><label>% Capital détenu</label><input type="number" step="0.01" min="0" max="100" value={form.pct_capital} onChange={(e) => setForm({...form, pct_capital: e.target.value})} placeholder="Ex: 35.5" /></div>
              <div className="fld"><label>% Droits de vote</label><input type="number" step="0.01" min="0" max="100" value={form.pct_droits_vote} onChange={(e) => setForm({...form, pct_droits_vote: e.target.value})} /></div>
            </div>
            <div className="fld"><label>Modalités du contrôle</label><textarea value={form.modalites_controle} onChange={(e) => setForm({...form, modalites_controle: e.target.value})} rows={2} placeholder="Détails sur la nature du contrôle..." /></div>

            <h4 style={{ color: "#7a6fb0", margin: "16px 0 8px", fontSize: 13 }}>📅 Période & Pièce identité</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="fld"><label>Date début qualité</label><input type="date" value={form.date_debut_qualite} onChange={(e) => setForm({...form, date_debut_qualite: e.target.value})} /></div>
              <div className="fld"><label>Date fin qualité (si fin)</label><input type="date" value={form.date_fin_qualite} onChange={(e) => setForm({...form, date_fin_qualite: e.target.value})} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="fld">
                <label>Type pièce identité</label>
                <select value={form.piece_identite_type} onChange={(e) => setForm({...form, piece_identite_type: e.target.value})}>
                  <option value="CNI">Carte d'identité</option>
                  <option value="Passeport">Passeport</option>
                  <option value="Titre séjour">Titre de séjour</option>
                </select>
              </div>
              <div className="fld"><label>Numéro pièce</label><input value={form.piece_identite_numero} onChange={(e) => setForm({...form, piece_identite_numero: e.target.value})} /></div>
            </div>

            <div className="fld"><label>Notes internes</label><textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} /></div>
          </Modal>
        )}
      </div>
    </div>
  );
}

function StatTile({ color, icon, lbl, val }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`,
      borderRadius: 10, padding: 12,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <i className={`ti ${icon}`} style={{ color, fontSize: 24 }} />
      <div>
        <div style={{ fontSize: 10, color, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 }}>{lbl}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#142131", fontFamily: "Consolas,monospace" }}>{val}</div>
      </div>
    </div>
  );
}

// =============================================================
// Génération attestation RBEU PDF
// =============================================================
function imprimerAttestation({ etab, benefs, auth }) {
  const w = window.open("", "_blank", "width=900,height=1200");
  if (!w) { alert("Bloque les popups"); return; }
  const dateStr = new Date().toLocaleDateString("fr-FR");
  const numero = `ATT-RBEU-${new Date().toISOString().slice(0,10).replace(/-/g, "")}-${etab.id?.substring(0,4)}`;

  const benefsHTML = benefs.map((b, i) => `
    <tr style="border-bottom:1px solid #e3e9ee">
      <td style="padding:10px;text-align:center;color:#7a6fb0;font-weight:700">${i+1}</td>
      <td style="padding:10px">
        <div style="font-weight:700">${b.prenom} ${b.nom}</div>
        ${b.nom_naissance ? `<div style="font-size:10.5px;color:#8a98a8">né(e) ${b.nom_naissance}</div>` : ""}
        ${b.date_naissance ? `<div style="font-size:10.5px;color:#8a98a8">${new Date(b.date_naissance).toLocaleDateString("fr-FR")}${b.lieu_naissance ? ` à ${b.lieu_naissance}` : ""}</div>` : ""}
      </td>
      <td style="padding:10px;font-size:11.5px">
        ${b.adresse || ""}<br>
        ${b.code_postal || ""} ${b.ville || ""}<br>
        <span style="color:#8a98a8">${b.pays || "France"} · ${b.nationalite || ""}</span>
      </td>
      <td style="padding:10px">
        <b>${b.qualite || "—"}</b>
        ${b.type_controle ? `<div style="font-size:10.5px;color:#8a98a8">${b.type_controle}</div>` : ""}
      </td>
      <td style="padding:10px;text-align:center;font-family:Consolas,monospace">
        ${b.pct_capital ? `<div style="color:#7a6fb0;font-weight:700">${b.pct_capital}%</div><div style="font-size:9.5px;color:#8a98a8">capital</div>` : ""}
        ${b.pct_droits_vote ? `<div style="color:#185FA5;font-weight:700;margin-top:4px">${b.pct_droits_vote}%</div><div style="font-size:9.5px;color:#8a98a8">droits</div>` : ""}
      </td>
    </tr>
  `).join("");

  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Attestation RBEU ${numero}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Quicksand','Segoe UI',sans-serif;color:#142131;padding:30px;background:#fff;font-size:13px;line-height:1.55}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #142131;padding-bottom:18px;margin-bottom:24px}
  .logo{font-size:36px;font-weight:600;letter-spacing:3px}
  .logo span{color:#7CC8C8}
  h1{font-size:22px;color:#7a6fb0;font-weight:700;margin-bottom:6px}
  .num{font-family:Consolas,monospace;font-size:13px;background:#7a6fb0;color:#fff;padding:3px 10px;border-radius:4px;display:inline-block}
  .preambule{background:rgba(122,111,176,.08);border-left:4px solid #7a6fb0;padding:16px;border-radius:8px;margin-bottom:18px;font-size:12.5px;line-height:1.7}
  .preambule b{color:#7a6fb0}
  .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:18px;background:#fafbfc;padding:16px;border-radius:8px}
  h2{font-size:14px;color:#7a6fb0;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e3e9ee}
  table{width:100%;border-collapse:collapse;margin:14px 0}
  th{background:#7a6fb0;color:#fff;padding:10px 8px;font-size:10.5px;text-transform:uppercase;letter-spacing:1px;text-align:left;font-weight:700}
  .declaration{background:#fafbfc;padding:16px;border-radius:8px;margin-top:24px;font-size:12.5px;border-left:4px solid #5aa05a}
  .signatures{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:30px}
  .sign-box{border:1px solid #cfd8e0;border-radius:8px;padding:14px;min-height:90px}
  .sign-box h4{font-size:11px;color:#5a6878;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:6px}
  footer{margin-top:30px;padding-top:14px;border-top:1px solid #e3e9ee;text-align:center;font-size:10.5px;color:#8a98a8}
  @media print{body{padding:15mm} .no-print{display:none}}
</style></head><body>

<div class="header">
  <div>
    <div class="logo">a<span>v</span>eho</div>
    <div style="font-size:10.5px;color:#5a6878;letter-spacing:1px;text-transform:uppercase;margin-top:2px">Conformité réglementaire · RBEU</div>
  </div>
  <div style="text-align:right">
    <h1>ATTESTATION RBEU</h1>
    <div class="num">${numero}</div>
    <div style="font-size:11.5px;color:#5a6878;margin-top:6px">Émis le ${dateStr}</div>
  </div>
</div>

<div class="preambule">
  <b>Décret 2025-247 du 17 mars 2025</b> — Registre des Bénéficiaires Effectifs Ultimes.<br>
  La présente attestation déclare l'identité des personnes physiques détenant directement ou indirectement plus de 25% du capital ou des droits de vote, ou exerçant un contrôle de fait sur l'établissement désigné ci-dessous.
</div>

<div class="meta-grid">
  <div>
    <h2>🏥 Établissement déclaré</h2>
    <p style="font-weight:700;font-size:14px">${etab.nom}</p>
    ${etab.ville ? `<p style="font-size:12px;color:#5a6878">${etab.ville}</p>` : ""}
  </div>
  <div>
    <h2>📅 Date de déclaration</h2>
    <p style="font-weight:700;font-size:14px">${dateStr}</p>
    <p style="font-size:11px;color:#8a98a8">Type : Déclaration ${benefs.length > 0 ? "complète" : "initiale"}</p>
    <p style="font-size:11px;color:#8a98a8">${benefs.length} bénéficiaire(s) effectif(s)</p>
  </div>
</div>

<h2 style="margin-top:18px">👥 Bénéficiaires effectifs</h2>
<table>
  <thead>
    <tr>
      <th style="width:40px;text-align:center">#</th>
      <th>Identité</th>
      <th>Adresse</th>
      <th>Qualité</th>
      <th style="width:100px;text-align:center">Détention</th>
    </tr>
  </thead>
  <tbody>${benefsHTML}</tbody>
</table>

<div class="declaration">
  <b>Déclaration sur l'honneur</b> — Le déclarant atteste que les informations ci-dessus sont exactes et complètes à la date du présent acte. Toute modification doit faire l'objet d'une déclaration modificative dans un délai de 30 jours. Sanctions encourues en cas de défaut : amende de 7 500 € maximum + 6 mois d'emprisonnement (article L. 561-49 du Code monétaire et financier).
</div>

<div class="signatures">
  <div class="sign-box">
    <h4>✍ Représentant légal</h4>
    <p style="font-size:12px;margin-top:4px">${auth.user?.email || ""}</p>
    <p style="color:#8a98a8;font-size:10.5px">Le ${dateStr}</p>
  </div>
  <div class="sign-box">
    <h4>📩 Dépôt RBEU</h4>
    <p style="color:#8a98a8;font-style:italic;font-size:11px;margin-top:8px">À déposer sur le portail INPI · Délai 30 jours après tout changement</p>
  </div>
</div>

<footer>
  Attestation RBEU ${numero} · Aveho · Imprimée le ${dateStr}<br>
  Décret 2025-247 du 17 mars 2025 · Article L. 561-46 et suivants du CMF
</footer>

<div class="no-print" style="margin-top:30px;text-align:center">
  <button onclick="window.print()" style="background:#7a6fb0;color:#fff;border:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:Quicksand,sans-serif">
    🖨 Imprimer / Enregistrer en PDF
  </button>
</div>

<script>setTimeout(() => window.print(), 500);</script>
</body></html>`);
  w.document.close();
}
