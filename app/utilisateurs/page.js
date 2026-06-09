"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { fmtDate } from "../../lib/format";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg } from "../ui";
import { KpiRow } from "../kpis";

const MODULES = [
  { k: "patients", l: "Patients" }, { k: "etablissement", l: "Établissement" },
  { k: "materiels", l: "Matériel" }, { k: "articles", l: "Articles" },
  { k: "stock", l: "Stock" }, { k: "transferts", l: "Transferts" },
  { k: "interventions", l: "Interventions" }, { k: "commandes", l: "Commandes" },
  { k: "utilisateurs", l: "Utilisateurs" },
];

export default function Utilisateurs() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [tab, setTab] = useState("membres");
  const [membres, setMembres] = useState([]);
  const [roles, setRoles] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [services, setServices] = useState([]);
  const [memServices, setMemServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // modale rôle
  const [roleModal, setRoleModal] = useState(null);
  const [roleForm, setRoleForm] = useState({ nom: "", description: "", droits: {} });
  // modale invitation
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role_id: "", nom_affiche: "" });
  const [err, setErr] = useState("");

  async function loadAll() {
    const [m, r, i, s, ms] = await Promise.all([
      supabase.from("membres_structure").select("*, roles(nom)"),
      supabase.from("roles").select("*").order("created_at"),
      supabase.from("invitations").select("*, roles(nom)").order("created_at", { ascending: false }),
      supabase.from("services").select("id,nom"),
      supabase.from("membres_services").select("*"),
    ]);
    setMembres(m.data || []); setRoles(r.data || []); setInvitations(i.data || []);
    setServices(s.data || []); setMemServices(ms.data || []);
    setLoading(false);
  }
  useEffect(() => { if (auth.ready) loadAll(); }, [auth.ready]);

  // ---- rôles ----
  function openRole(r) {
    if (r) { setRoleForm({ nom: r.nom, description: r.description || "", droits: r.droits || {} }); setRoleModal(r); }
    else { setRoleForm({ nom: "", description: "", droits: {} }); setRoleModal({}); }
    setErr("");
  }
  function toggleDroit(mod, perm) {
    setRoleForm((f) => {
      const cur = new Set(f.droits[mod] || []);
      cur.has(perm) ? cur.delete(perm) : cur.add(perm);
      // write implique read
      if (perm === "write" && cur.has("write")) cur.add("read");
      const d = { ...f.droits };
      if (cur.size) d[mod] = [...cur]; else delete d[mod];
      return { ...f, droits: d };
    });
  }
  async function saveRole() {
    if (!roleForm.nom) { setErr("Nom du rôle requis."); return; }
    const payload = { nom: roleForm.nom, description: roleForm.description, droits: roleForm.droits };
    if (roleModal.id) await supabase.from("roles").update(payload).eq("id", roleModal.id);
    else await supabase.from("roles").insert({ ...payload, structure_id: auth.structureId });
    setRoleModal(null); await loadAll();
  }
  async function delRole(r) {
    if (r.systeme) { alert("Rôle système non supprimable."); return; }
    if (!confirm("Supprimer ce rôle ?")) return;
    await supabase.from("roles").delete().eq("id", r.id); await loadAll();
  }

  // ---- membre : changer rôle / services / statut ----
  async function setMembreRole(userId, roleId) {
    await supabase.from("membres_structure").update({ role_id: roleId || null }).eq("user_id", userId).eq("structure_id", auth.structureId);
    await loadAll();
  }
  async function toggleActif(m) {
    await supabase.from("membres_structure").update({ actif: !m.actif }).eq("user_id", m.user_id).eq("structure_id", auth.structureId);
    await loadAll();
  }
  async function toggleService(userId, serviceId, has) {
    if (has) await supabase.from("membres_services").delete().eq("user_id", userId).eq("service_id", serviceId);
    else await supabase.from("membres_services").insert({ user_id: userId, service_id: serviceId, structure_id: auth.structureId });
    await loadAll();
  }
  async function toggleRestreint(m) {
    await supabase.from("membres_structure").update({ restreint_services: !m.restreint_services }).eq("user_id", m.user_id).eq("structure_id", auth.structureId);
    await loadAll();
  }

  // ---- invitations ----
  async function sendInvite() {
    if (!inviteForm.email) { setErr("Email requis."); return; }
    // 1) enregistrer l'invitation
    await supabase.from("invitations").insert({
      structure_id: auth.structureId, email: inviteForm.email, role_id: inviteForm.role_id || null, nom_affiche: inviteForm.nom_affiche,
    });
    // 2) tenter l'envoi du mail de bienvenue (Edge Function invite-user)
    try {
      const roleNom = roles.find((r) => r.id === inviteForm.role_id)?.nom || "Utilisateur";
      const etabNoms = auth.etablissements.map((e) => e.nom);
      await supabase.functions.invoke("invite-user", {
        body: { email: inviteForm.email, nom: inviteForm.nom_affiche, collectivite: auth.structureNom, role: roleNom, etablissements: etabNoms },
      });
    } catch (e) {
      // si la fonction n'est pas déployée, l'invitation reste enregistrée (envoi manuel possible)
      console.warn("Email non envoyé (Edge Function invite-user non déployée ?)", e);
    }
    setInviteModal(false); setInviteForm({ email: "", role_id: "", nom_affiche: "" }); await loadAll();
  }

  if (!auth.ready) return null;

  const kpis = [
    { label: "Utilisateurs", value: membres.length, icon: "ti-users", color: "#7a6fb0" },
    { label: "Actifs", value: membres.filter((m) => m.actif !== false).length, icon: "ti-user-check", color: "#5aa05a" },
    { label: "Rôles", value: roles.length, icon: "ti-shield-lock", color: "#185FA5" },
    { label: "Invitations en attente", value: invitations.filter((i) => i.statut === "En attente").length, icon: "ti-mail", color: "#e35d5b" },
  ];
  const svcOfUser = (uid) => memServices.filter((x) => x.user_id === uid).map((x) => x.service_id);

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead small title="Gestion des utilisateurs" sub="Rôles, droits, rattachement aux services et invitations" />
        <KpiRow tiles={kpis} />

        <div className="seg" style={{ marginBottom: 14 }}>
          <button className={tab === "membres" ? "on" : ""} onClick={() => setTab("membres")}>Membres</button>
          <button className={tab === "roles" ? "on" : ""} onClick={() => setTab("roles")}>Rôles & droits</button>
          <button className={tab === "invitations" ? "on" : ""} onClick={() => setTab("invitations")}>Invitations</button>
        </div>

        {loading ? <Panel><StateMsg>Chargement…</StateMsg></Panel> : (
          <>
            {tab === "membres" && (
              <Panel>
                {membres.length === 0 ? <StateMsg>Aucun membre rattaché.</StateMsg> : (
                  <table>
                    <thead><tr><th>Utilisateur</th><th>Rôle</th><th>Services</th><th>Visibilité</th><th>Statut</th></tr></thead>
                    <tbody>
                      {membres.map((m) => {
                        const userSvc = svcOfUser(m.user_id);
                        return (
                          <tr key={m.user_id}>
                            <td>{m.nom_affiche || m.user_id.slice(0, 8)}</td>
                            <td>
                              <select value={m.role_id || ""} onChange={(e) => setMembreRole(m.user_id, e.target.value)} style={{ height: 32, borderRadius: 8, border: "1px solid #e1e6eb", fontFamily: "inherit" }}>
                                <option value="">— Aucun —</option>
                                {roles.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
                              </select>
                            </td>
                            <td style={{ maxWidth: 240 }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                {services.map((s) => {
                                  const has = userSvc.includes(s.id);
                                  return <span key={s.id} onClick={() => toggleService(m.user_id, s.id, has)}
                                    style={{ cursor: "pointer", fontSize: 11, padding: "3px 9px", borderRadius: 12, fontWeight: 600, background: has ? "#eef6f6" : "#f1f3f5", color: has ? "#2a5a5a" : "#9aa7b4", border: `1px solid ${has ? "#cfe6e6" : "#e6ebf0"}` }}>
                                    {has ? <i className="ti ti-check" /> : <i className="ti ti-plus" />} {s.nom}
                                  </span>;
                                })}
                              </div>
                            </td>
                            <td>
                              <span onClick={() => toggleRestreint(m)} style={{ cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 12, background: m.restreint_services ? "#FFF3E0" : "#E1F5EE", color: m.restreint_services ? "#8a5300" : "#0F6E56" }}>
                                {m.restreint_services ? "Ses services" : "Tout l'établissement"}
                              </span>
                            </td>
                            <td>
                              <span onClick={() => toggleActif(m)} style={{ cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 12, background: m.actif !== false ? "#E1F5EE" : "#FDECEA", color: m.actif !== false ? "#0F6E56" : "#c0392b" }}>
                                {m.actif !== false ? "Actif" : "Inactif"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </Panel>
            )}

            {tab === "roles" && (
              <Panel>
                <div className="di-toolbar"><button className="btn-new" onClick={() => openRole(null)}><i className="ti ti-plus" /> Nouveau rôle</button></div>
                <table>
                  <thead><tr><th>Rôle</th><th>Description</th><th>Modules autorisés</th><th></th></tr></thead>
                  <tbody>
                    {roles.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.nom}{r.systeme && <span className="tag-type" style={{ marginLeft: 6 }}>système</span>}</td>
                        <td style={{ fontSize: 12, color: "#5a6776" }}>{r.description}</td>
                        <td style={{ fontSize: 11, color: "#5a6776" }}>{Object.keys(r.droits || {}).length} module(s)</td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <i className="ti ti-edit" style={{ color: "#2a5a5a", cursor: "pointer", marginRight: 12 }} onClick={() => openRole(r)} />
                          {!r.systeme && <i className="ti ti-trash" style={{ color: "#C9867F", cursor: "pointer" }} onClick={() => delRole(r)} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            )}

            {tab === "invitations" && (
              <Panel>
                <div className="di-toolbar"><button className="btn-new" onClick={() => { setErr(""); setInviteModal(true); }}><i className="ti ti-mail" /> Inviter un utilisateur</button></div>
                {invitations.length === 0 ? <StateMsg>Aucune invitation.</StateMsg> : (
                  <table>
                    <thead><tr><th>Email</th><th>Nom</th><th>Rôle</th><th>Date</th><th>Statut</th></tr></thead>
                    <tbody>
                      {invitations.map((i) => (
                        <tr key={i.id}><td>{i.email}</td><td>{i.nom_affiche || "—"}</td><td>{i.roles?.nom || "—"}</td><td>{fmtDate(i.created_at)}</td>
                          <td><span className="statut s-validee">{i.statut}</span></td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Panel>
            )}
          </>
        )}
      </div>

      {/* modale rôle */}
      {roleModal && (
        <div className="modal-bg" onClick={(e) => e.target.classList.contains("modal-bg") && setRoleModal(null)}>
          <div className="modal">
            <div className="modal-head">{roleModal.id ? "Modifier le rôle" : "Nouveau rôle"} <i className="ti ti-x" style={{ cursor: "pointer" }} onClick={() => setRoleModal(null)} /></div>
            <div className="modal-body">
              {err && <div className="err">{err}</div>}
              <div className="fld"><label>Nom du rôle</label><input value={roleForm.nom} onChange={(e) => setRoleForm({ ...roleForm, nom: e.target.value })} placeholder="Ex : Infirmier coordinateur" /></div>
              <div className="fld"><label>Description</label><input value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} /></div>
              <label style={{ display: "block", marginBottom: 8 }}>Droits par module</label>
              <div style={{ border: "1px solid #e6ebf0", borderRadius: 10, overflow: "hidden" }}>
                {MODULES.map((mod, i) => {
                  const cur = roleForm.droits[mod.k] || [];
                  return (
                    <div key={mod.k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: i % 2 ? "#f9fbfc" : "#fff" }}>
                      <span style={{ fontSize: 13 }}>{mod.l}</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        {["read", "write"].map((perm) => {
                          const on = cur.includes(perm);
                          return <span key={perm} onClick={() => toggleDroit(mod.k, perm)}
                            style={{ cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 12, background: on ? "#eef6f6" : "#f1f3f5", color: on ? "#2a5a5a" : "#9aa7b4", border: `1px solid ${on ? "#cfe6e6" : "#e6ebf0"}` }}>
                            {perm === "read" ? "Lecture" : "Écriture"}
                          </span>;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => setRoleModal(null)}>Annuler</button>
              <button className="btn-save" onClick={saveRole}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* modale invitation */}
      {inviteModal && (
        <div className="modal-bg" onClick={(e) => e.target.classList.contains("modal-bg") && setInviteModal(false)}>
          <div className="modal">
            <div className="modal-head">Inviter un utilisateur <i className="ti ti-x" style={{ cursor: "pointer" }} onClick={() => setInviteModal(false)} /></div>
            <div className="modal-body">
              {err && <div className="err">{err}</div>}
              <div className="fld"><label>Email</label><input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="prenom.nom@etablissement.fr" /></div>
              <div className="fld"><label>Nom affiché</label><input value={inviteForm.nom_affiche} onChange={(e) => setInviteForm({ ...inviteForm, nom_affiche: e.target.value })} /></div>
              <div className="fld"><label>Rôle</label>
                <select value={inviteForm.role_id} onChange={(e) => setInviteForm({ ...inviteForm, role_id: e.target.value })}>
                  <option value="">— Choisir —</option>{roles.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
                </select>
              </div>
              <p style={{ fontSize: 12, color: "#8a98a8" }}>L'utilisateur recevra le lien d'inscription. Dans cette démo, l'invitation est enregistrée mais l'envoi d'email se configure côté Supabase.</p>
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => setInviteModal(false)}>Annuler</button>
              <button className="btn-save" onClick={sendInvite}>Envoyer l'invitation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
