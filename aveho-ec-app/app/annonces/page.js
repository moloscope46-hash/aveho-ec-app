"use client";
// =============================================================
//  /annonces — Gestion des annonces internes (admin)
//  Alpha 0.50.0
//
//  Permet aux admins de créer, modifier, désactiver et supprimer
//  les annonces diffusées à toute la structure.
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { useCart } from "../useCart";
import TopBar from "../TopBar";
import { PageHead, Panel, StateMsg, Btn } from "../ui";
import { dialogs } from "../dialogs";

const NIVEAU_OPTS = [
  { v: "info", lbl: "Info (bleu)", color: "#185FA5" },
  { v: "warning", lbl: "Warning (orange)", color: "#EF9F27" },
  { v: "critique", lbl: "Critique (rouge)", color: "#c0392b" },
];

export default function AnnoncesAdminPage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState([]);
  const [etabs, setEtabs] = useState([]);  // Alpha 0.52.5 : ciblage par établissement
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);  // null | {} (new) | row (edit)
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  const peutGerer = auth?.role?.nom === "Administrateur" || auth?.can?.("gerer_roles");

  async function load() {
    if (!auth.structureId || !peutGerer) {
      setLoading(false);
      return;
    }
    setLoading(true);
    // Alpha 0.51.0 : annonces + stats. Alpha 0.52.5 : + établissements pour ciblage
    const [{ data }, { data: st }, { data: et }] = await Promise.all([
      supabase
        .from("annonces")
        .select("*")
        .eq("structure_id", auth.structureId)
        .order("created_at", { ascending: false }),
      supabase
        .from("v_annonces_stats")
        .select("id, nb_destinataires, nb_dismisses, taux_dismiss_pct")
        .eq("structure_id", auth.structureId),
      supabase
        .from("etablissements")
        .select("id, nom")
        .eq("structure_id", auth.structureId)
        .order("nom"),
    ]);
    setRows(data || []);
    setStats(st || []);
    setEtabs(et || []);
    setLoading(false);
  }

  useEffect(() => {
    if (auth.ready) load();
  }, [auth.ready, auth.structureId]);

  function openNew() {
    setForm({
      titre: "",
      message: "",
      niveau: "info",
      etablissement_id: "",  // Alpha 0.52.5 : "" = toute la structure
      date_debut: new Date().toISOString().slice(0, 16),
      date_fin: "",
      active: true,
    });
    setModal({});
  }

  function openEdit(row) {
    setForm({
      ...row,
      etablissement_id: row.etablissement_id || "",  // Alpha 0.52.5
      date_debut: row.date_debut ? new Date(row.date_debut).toISOString().slice(0, 16) : "",
      date_fin: row.date_fin ? new Date(row.date_fin).toISOString().slice(0, 16) : "",
    });
    setModal(row);
  }

  async function save() {
    if (!form.titre.trim() || !form.message.trim()) {
      await dialogs.alert({ title: "Titre et message obligatoires" });
      return;
    }
    setBusy(true);
    try {
      const payload = {
        structure_id: auth.structureId,
        titre: form.titre.trim(),
        message: form.message.trim(),
        niveau: form.niveau || "info",
        etablissement_id: form.etablissement_id || null,  // Alpha 0.52.5
        active: form.active !== false,
        date_debut: form.date_debut ? new Date(form.date_debut).toISOString() : new Date().toISOString(),
        date_fin: form.date_fin ? new Date(form.date_fin).toISOString() : null,
        cree_par: auth.user.id,
        cree_par_email: auth.user.email,
      };
      const { error } = modal.id
        ? await supabase.from("annonces").update(payload).eq("id", modal.id)
        : await supabase.from("annonces").insert(payload);
      if (error) throw error;
      setModal(null);
      await load();
    } catch (e) {
      await dialogs.alert({ title: "Erreur", message: e.message });
    }
    setBusy(false);
  }

  async function toggleActive(row) {
    await supabase.from("annonces").update({ active: !row.active }).eq("id", row.id);
    await load();
  }

  async function del(row) {
    if (!await dialogs.confirm({ title: `Supprimer l'annonce "${row.titre}" ?`, variant: "danger" })) return;
    await supabase.from("annonces").delete().eq("id", row.id);
    await load();
  }

  function fmt(d) {
    if (!d) return "—";
    return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  if (!peutGerer && auth.ready) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap">
          <Panel><StateMsg><i className="ti ti-lock" /> Accès réservé aux administrateurs.</StateMsg></Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead 
          eyebrow="ADMINISTRATION" 
          icon="ti-speakerphone" 
          title="Annonces" 
          accent="internes"
          sub="Messages diffusés à tous les membres de la structure"
        />

        <Panel style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#6c7a89" }}>
              {rows.length} annonce{rows.length > 1 ? "s" : ""} · {rows.filter(r => r.active).length} active{rows.filter(r => r.active).length > 1 ? "s" : ""}
            </p>
            <Btn variant="primary" icon="ti-plus" onClick={openNew}>Nouvelle annonce</Btn>
          </div>
        </Panel>

        {loading ? (
          <Panel><StateMsg>Chargement…</StateMsg></Panel>
        ) : rows.length === 0 ? (
          <Panel><StateMsg>Aucune annonce. <a style={{ color: "#185FA5", fontWeight: 600, cursor: "pointer" }} onClick={openNew}>Créer la première</a></StateMsg></Panel>
        ) : (
          <Panel>
            <div className="panel-table"><table style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Niveau</th>
                  <th>Titre</th>
                  <th>Cible</th>
                  <th>Période</th>
                  <th>Réception</th>
                  <th>État</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const niveau = NIVEAU_OPTS.find(n => n.v === r.niveau) || NIVEAU_OPTS[0];
                  // Alpha 0.51.0 : stats de réception
                  const stat = stats.find(s => s.id === r.id);
                  // Alpha 0.52.5 : nom établissement ciblé
                  const etabNom = r.etablissement_id ? etabs.find(e => e.id === r.etablissement_id)?.nom : null;
                  return (
                    <tr key={r.id} style={{ opacity: r.active ? 1 : 0.5 }}>
                      <td>
                        <span style={{ background: niveau.color + "22", color: niveau.color, padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, letterSpacing: ".4px" }}>
                          {r.niveau}
                        </span>
                      </td>
                      <td>
                        <b>{r.titre}</b>
                        <div style={{ fontSize: 11.5, color: "#8a98a8", marginTop: 2, maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.message}</div>
                      </td>
                      {/* Alpha 0.52.5 : colonne cible établissement */}
                      <td style={{ fontSize: 11.5 }}>
                        {etabNom ? (
                          <span style={{ background: "#eef5fc", color: "#185FA5", padding: "2px 8px", borderRadius: 8, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <i className="ti ti-building-hospital" /> {etabNom}
                          </span>
                        ) : (
                          <span style={{ color: "#8a98a8", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <i className="ti ti-world" /> Toute la structure
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: 11.5, color: "#6c7a89" }}>
                        Du {fmt(r.date_debut)}<br/>
                        {r.date_fin ? `Au ${fmt(r.date_fin)}` : <i style={{ color: "#8a98a8" }}>Sans fin</i>}
                      </td>
                      {/* Alpha 0.51.0 : stats dismiss */}
                      <td>
                        {stat ? (
                          <>
                            <div style={{ fontSize: 11.5, color: "#142131", fontWeight: 600 }}>
                              {stat.nb_dismisses}/{stat.nb_destinataires}
                              <span style={{ fontSize: 10, color: "#8a98a8", fontWeight: 400, marginLeft: 4 }}>dismiss</span>
                            </div>
                            <div style={{ 
                              marginTop: 4, height: 4, background: "#e3e9ee", borderRadius: 2, overflow: "hidden", width: 80 
                            }}>
                              <div style={{ 
                                width: `${stat.taux_dismiss_pct || 0}%`, height: "100%",
                                background: (stat.taux_dismiss_pct || 0) > 50 ? "#5aa05a" : (stat.taux_dismiss_pct || 0) > 25 ? "#EF9F27" : "#185FA5",
                              }} />
                            </div>
                            <div style={{ fontSize: 10, color: "#8a98a8", marginTop: 2 }}>
                              {stat.taux_dismiss_pct || 0}%
                            </div>
                          </>
                        ) : (
                          <span style={{ color: "#cfd5db", fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td>
                        <button 
                          onClick={() => toggleActive(r)}
                          style={{ background: r.active ? "#dff5e0" : "#f4f7fa", color: r.active ? "#2e6f33" : "#8a98a8", border: "none", padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                          aria-label={r.active ? "Désactiver" : "Activer"}
                        >
                          {r.active ? "ACTIVE" : "INACTIVE"}
                        </button>
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <i className="ti ti-edit" style={{ color: "#2a5a5a", cursor: "pointer", marginRight: 12 }} onClick={() => openEdit(r)} title="Modifier" />
                        <i className="ti ti-trash" style={{ color: "#C9867F", cursor: "pointer" }} onClick={() => del(r)} title="Supprimer" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          </Panel>
        )}

        {/* Modal édition */}
        {modal && (
          <div className="modal-bg" onClick={(e) => e.target.classList.contains("modal-bg") && setModal(null)}>
            <div className="modal" style={{ maxWidth: 540 }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 17 }}>
                <i className="ti ti-speakerphone" style={{ color: "#185FA5", marginRight: 6 }} />
                {modal.id ? "Modifier l'annonce" : "Nouvelle annonce"}
              </h3>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#6c7a89", fontWeight: 600, marginBottom: 4 }}>Niveau</label>
                  <select value={form.niveau || "info"} onChange={(e) => setForm({ ...form, niveau: e.target.value })} style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit" }}>
                    {NIVEAU_OPTS.map(n => <option key={n.v} value={n.v}>{n.lbl}</option>)}
                  </select>
                </div>
                {/* Alpha 0.52.5 : ciblage par établissement */}
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#6c7a89", fontWeight: 600, marginBottom: 4 }}>
                    Cibler un établissement <span style={{ fontSize: 10.5, color: "#8a98a8", fontWeight: 400 }}>(optionnel)</span>
                  </label>
                  <select 
                    value={form.etablissement_id || ""} 
                    onChange={(e) => setForm({ ...form, etablissement_id: e.target.value })}
                    style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit" }}
                  >
                    <option value="">🌍 Toute la structure (par défaut)</option>
                    {etabs.map(e => <option key={e.id} value={e.id}>🏥 {e.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#6c7a89", fontWeight: 600, marginBottom: 4 }}>Titre *</label>
                  <input value={form.titre || ""} onChange={(e) => setForm({ ...form, titre: e.target.value })} style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit" }} placeholder="Ex : Maintenance prévue dimanche" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#6c7a89", fontWeight: 600, marginBottom: 4 }}>Message *</label>
                  <textarea value={form.message || ""} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", resize: "vertical" }} placeholder="Détails de l'annonce…" />
                </div>
                <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "#6c7a89", fontWeight: 600, marginBottom: 4 }}>Date début</label>
                    <input type="datetime-local" value={form.date_debut || ""} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "#6c7a89", fontWeight: 600, marginBottom: 4 }}>Date fin (optionnel)</label>
                    <input type="datetime-local" value={form.date_fin || ""} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit" }} />
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <input type="checkbox" checked={form.active !== false} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                  Active (visible immédiatement par les utilisateurs)
                </label>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
                <Btn variant="primary" icon="ti-check" onClick={save} disabled={busy}>{busy ? "…" : "Enregistrer"}</Btn>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
