"use client";
// =============================================================
//  app/equipe/[id]/page.js (Alpha 0.56.15)
//
//  Détail d'une équipe : nom, bâtiment, membres, services rattachés.
//  Gestion : ajouter/retirer membres + services.
// =============================================================

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, StateMsg } from "../../ui";

export default function EquipeDetailPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const auth = useAuth();
  const cart = useCart();
  const [equipe, setEquipe] = useState(null);
  const [batiment, setBatiment] = useState(null);
  const [membres, setMembres] = useState([]);
  const [servicesAttaches, setServicesAttaches] = useState([]);
  const [tousServices, setTousServices] = useState([]);
  const [tousMembres, setTousMembres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [showAddMembre, setShowAddMembre] = useState(false);
  const [showAddService, setShowAddService] = useState(false);

  useEffect(() => {
    if (!auth.ready || !params?.id) return;
    loadAll();
  }, [auth.ready, params?.id]);

  async function loadAll() {
    setLoading(true);
    const { data: eq } = await supabase.from("equipes").select("*").eq("id", params.id).single();
    setEquipe(eq);
    if (eq?.batiment_id) {
      const { data: bat } = await supabase.from("batiments").select("*").eq("id", eq.batiment_id).single();
      setBatiment(bat);
    }
    const [{ data: m }, { data: es }, { data: ts }, { data: tm }] = await Promise.all([
      supabase.rpc("equipe_detail", { p_equipe_id: params.id }),
      supabase.from("equipes_services").select("service_id, services(id, nom, etage_id, etages(nom, batiment_id))").eq("equipe_id", params.id),
      supabase.from("services").select("id, nom, etage_id, etages(nom, batiment_id, batiments(nom))").order("nom"),
      supabase.from("membres_structure").select("user_id, nom_affiche, email, fonction_detail").eq("structure_id", auth.structureId).order("nom_affiche"),
    ]);
    setMembres(m || []);
    setServicesAttaches((es || []).map(x => x.services).filter(Boolean));
    setTousServices(ts || []);
    setTousMembres(tm || []);
    setLoading(false);
  }

  async function addMembre(userId) {
    const { error } = await supabase.from("equipes_membres").insert({
      equipe_id: params.id,
      user_id: userId,
      role_dans_equipe: "membre",
      added_by: auth.user?.id,
    });
    if (error) {
      setMsg({ type: "error", text: error.message });
    } else {
      setMsg({ type: "success", text: "Membre ajouté" });
      await loadAll();
    }
  }

  async function removeMembre(userId, label) {
    if (!confirm(`Retirer ${label} de l'équipe ?`)) return;
    const { error } = await supabase.from("equipes_membres").delete()
      .eq("equipe_id", params.id).eq("user_id", userId);
    if (error) {
      setMsg({ type: "error", text: error.message });
    } else {
      setMsg({ type: "success", text: "Membre retiré" });
      await loadAll();
    }
  }

  async function toggleRole(userId, currentRole) {
    const newRole = currentRole === "responsable" ? "membre" : "responsable";
    const { error } = await supabase.from("equipes_membres").update({ role_dans_equipe: newRole })
      .eq("equipe_id", params.id).eq("user_id", userId);
    if (!error) {
      setMsg({ type: "success", text: `Rôle mis à jour vers ${newRole}` });
      await loadAll();
    }
  }

  async function addService(serviceId) {
    const { error } = await supabase.from("equipes_services").insert({
      equipe_id: params.id,
      service_id: serviceId,
    });
    if (error) {
      setMsg({ type: "error", text: error.message });
    } else {
      setMsg({ type: "success", text: "Service rattaché" });
      await loadAll();
    }
  }

  async function removeService(serviceId, label) {
    if (!confirm(`Retirer le service "${label}" de l'équipe ?`)) return;
    const { error } = await supabase.from("equipes_services").delete()
      .eq("equipe_id", params.id).eq("service_id", serviceId);
    if (error) {
      setMsg({ type: "error", text: error.message });
    } else {
      setMsg({ type: "success", text: "Service retiré" });
      await loadAll();
    }
  }

  if (!auth.ready) return null;
  if (loading) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap"><StateMsg type="loading">Chargement…</StateMsg></div>
      </div>
    );
  }
  if (!equipe) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap"><StateMsg type="empty">Équipe introuvable</StateMsg></div>
      </div>
    );
  }

  const memberIds = new Set(membres.map(m => m.user_id));
  const serviceIds = new Set(servicesAttaches.map(s => s.id));
  const candidatsMembres = tousMembres.filter(m => !memberIds.has(m.user_id));
  const candidatsServices = tousServices.filter(s => !serviceIds.has(s.id));

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        {/* Header */}
        <Panel style={{
          marginBottom: 12,
          background: `linear-gradient(135deg, ${equipe.couleur || "#185FA5"}, #142131)`,
          color: "#fff", borderColor: "transparent",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <i className="ti ti-users-group" style={{ fontSize: 36 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{equipe.nom}</div>
              {equipe.description && (
                <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>{equipe.description}</div>
              )}
              {batiment && (
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                  <i className="ti ti-building" /> Bâtiment : <b>{batiment.nom}</b>
                </div>
              )}
              {equipe.est_par_defaut && (
                <span style={{ background: "rgba(255,255,255,.25)", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, marginTop: 6, display: "inline-block" }}>
                  <i className="ti ti-star" /> ÉQUIPE PAR DÉFAUT (créée à la création du bâtiment)
                </span>
              )}
            </div>
            <button onClick={() => router.push("/equipes")} style={{
              background: "rgba(255,255,255,.2)", color: "#fff", border: "1px solid rgba(255,255,255,.3)",
              padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>
              <i className="ti ti-arrow-left" /> Liste équipes
            </button>
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

        {/* Membres */}
        <Panel style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 14, flex: 1 }}>
              <i className="ti ti-users" style={{ color: equipe.couleur }} /> Membres ({membres.length})
            </h3>
            <button onClick={() => setShowAddMembre(!showAddMembre)} style={btnPrimary}>
              <i className={`ti ${showAddMembre ? "ti-x" : "ti-plus"}`} /> {showAddMembre ? "Fermer" : "Ajouter"}
            </button>
          </div>

          {showAddMembre && (
            <div style={{ background: "#f4f7fa", padding: 10, borderRadius: 6, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#6c7a89", marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>
                Choisis un utilisateur à ajouter
              </div>
              {candidatsMembres.length === 0 ? (
                <p style={{ fontSize: 12, color: "#a0aeb9", fontStyle: "italic" }}>Tous les utilisateurs de la structure sont déjà dans cette équipe</p>
              ) : (
                <div style={{ display: "grid", gap: 4, maxHeight: 200, overflowY: "auto" }}>
                  {candidatsMembres.map(u => (
                    <button key={u.user_id} onClick={() => { addMembre(u.user_id); setShowAddMembre(false); }} style={{
                      background: "#fff", border: "1px solid #d3d9e0", borderRadius: 6, padding: "6px 10px",
                      cursor: "pointer", fontFamily: "inherit", textAlign: "left", fontSize: 12,
                    }}>
                      <b>{u.nom_affiche || u.email}</b>
                      {u.fonction_detail && <span style={{ color: "#6c7a89", marginLeft: 6 }}>· {u.fonction_detail}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {membres.length === 0 ? (
            <p style={{ fontSize: 12, color: "#a0aeb9", fontStyle: "italic", textAlign: "center", padding: 16 }}>
              Aucun membre pour l'instant
            </p>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {membres.map(m => (
                <div key={m.user_id} style={{
                  padding: 10, background: "#f4f7fa", borderRadius: 6,
                  display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: equipe.couleur || "#185FA5", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {(m.nom_affiche || m.email || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <b style={{ fontSize: 13 }}>{m.nom_affiche || m.email}</b>
                    <div style={{ fontSize: 11, color: "#6c7a89" }}>
                      {m.email && <span><i className="ti ti-mail" /> {m.email}</span>}
                      {m.fonction_detail && <span style={{ marginLeft: 8 }}>· {m.fonction_detail}</span>}
                    </div>
                  </div>
                  <button onClick={() => toggleRole(m.user_id, m.role_dans_equipe)} style={{
                    background: m.role_dans_equipe === "responsable" ? "#EF9F27" : "#dbe7f5",
                    color: m.role_dans_equipe === "responsable" ? "#fff" : "#185FA5",
                    border: "none", padding: "3px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase",
                  }}>
                    {m.role_dans_equipe === "responsable" ? <><i className="ti ti-crown" /> Responsable</> : "Membre"}
                  </button>
                  <button onClick={() => removeMembre(m.user_id, m.nom_affiche || m.email)} style={{ ...btnGhost, color: "#c0392b" }}>
                    <i className="ti ti-x" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Services rattachés */}
        <Panel>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 14, flex: 1 }}>
              <i className="ti ti-stack" style={{ color: equipe.couleur }} /> Services rattachés ({servicesAttaches.length})
            </h3>
            <button onClick={() => setShowAddService(!showAddService)} style={btnPrimary}>
              <i className={`ti ${showAddService ? "ti-x" : "ti-plus"}`} /> {showAddService ? "Fermer" : "Rattacher"}
            </button>
          </div>

          {showAddService && (
            <div style={{ background: "#f4f7fa", padding: 10, borderRadius: 6, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#6c7a89", marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>
                Choisis un service à rattacher
              </div>
              {candidatsServices.length === 0 ? (
                <p style={{ fontSize: 12, color: "#a0aeb9", fontStyle: "italic" }}>Tous les services sont déjà rattachés</p>
              ) : (
                <div style={{ display: "grid", gap: 4, maxHeight: 200, overflowY: "auto" }}>
                  {candidatsServices.map(s => (
                    <button key={s.id} onClick={() => { addService(s.id); setShowAddService(false); }} style={{
                      background: "#fff", border: "1px solid #d3d9e0", borderRadius: 6, padding: "6px 10px",
                      cursor: "pointer", fontFamily: "inherit", textAlign: "left", fontSize: 12,
                    }}>
                      <b>{s.nom}</b>
                      {s.etages && (
                        <span style={{ color: "#6c7a89", marginLeft: 6, fontSize: 10 }}>
                          · {s.etages.batiments?.nom} · {s.etages.nom}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {servicesAttaches.length === 0 ? (
            <p style={{ fontSize: 12, color: "#a0aeb9", fontStyle: "italic", textAlign: "center", padding: 16 }}>
              Aucun service rattaché — clique sur 'Rattacher' pour ajouter
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 6 }}>
              {servicesAttaches.map(s => (
                <div key={s.id} style={{
                  padding: 8, background: "#f4f7fa", borderRadius: 6,
                  borderLeft: `3px solid ${equipe.couleur || "#185FA5"}`,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <i className="ti ti-stack" style={{ color: equipe.couleur }} />
                  <div style={{ flex: 1 }}>
                    <b style={{ fontSize: 12 }}>{s.nom}</b>
                    {s.etages && (
                      <div style={{ fontSize: 10, color: "#6c7a89" }}>{s.etages.nom}</div>
                    )}
                  </div>
                  <button onClick={() => removeService(s.id, s.nom)} style={{ background: "transparent", border: "none", color: "#c0392b", cursor: "pointer", fontSize: 14 }}>
                    <i className="ti ti-x" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

const btnGhost = {
  background: "#fff", color: "#142131", border: "1px solid #d3d9e0",
  padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4,
};

const btnPrimary = {
  background: "#185FA5", color: "#fff", border: "none",
  padding: "6px 12px", borderRadius: 6, fontSize: 11.5, fontWeight: 700,
  cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4,
};
