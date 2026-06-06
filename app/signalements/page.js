"use client";
// Page Signalements — Boîte à idées et problèmes terrain anonymes.
// Tous les membres peuvent déposer un signalement, tous voient tous les
// signalements. Seuls les admins peuvent répondre / changer le statut.
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Modal, Btn} from "../ui";
import { EmptyState, SkeletonRow } from "../components/ui-premium";
import { fmtDate } from "../../lib/format";
import { safeInsert, safeUpdate, safeDelete } from "../../lib/safeWrite";
import { safeFetch } from "../../lib/offlineCache";
import StaleDataBanner from "../StaleDataBanner";
import { useStickyState } from "../../lib/useStickyState";
// 0.58.54 : filtre contexte bât/svc via patient_id
import { useContextPatientIds } from "../../lib/useContextPatientIds";

import { dialogs } from "../dialogs";
import { logger } from "../../lib/logger";
// 0.58.22 : NeonButton premium pour boutons principaux
import { NeonButton } from "../components/ui-premium";
const TYPES = [
  { value: "Problème", color: "#e35d5b", icon: "ti-alert-triangle" },
  { value: "Idée", color: "#7CC8C8", icon: "ti-bulb" },
  { value: "Question", color: "#7a6fb0", icon: "ti-help-circle" },
  { value: "Autre", color: "#8a98a8", icon: "ti-message-circle" },
];

const STATUTS = [
  { value: "Nouveau", color: "#185FA5" },
  { value: "En cours", color: "#EF9F27" },
  { value: "Traité", color: "#5aa05a" },
  { value: "Archivé", color: "#8a98a8" },
];

export default function SignalementsPage() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);    // {} ou row pour édition
  const [form, setForm] = useState({});
  const [err, setErr] = useState("");
  const [fStatut, setFStatut] = useStickyState("", "signalements:fStatut");
  const [fType, setFType] = useStickyState("", "signalements:fType");
  // Alpha 0.41.0 : filtre catégorie + tri
  const [fCategorie, setFCategorie] = useStickyState("", "signalements:fCategorie");
  const [triPar, setTriPar] = useStickyState("recent", "signalements:tri"); // "recent" | "votes"
  // Alpha 0.53.0 (BM) : templates de signalements
  const [templates, setTemplates] = useState([]);

  const isAdmin = auth.role?.nom === "Administrateur" || (auth.can && auth.can("gerer_roles"));

  const [staleData, setStaleData] = useState(false);
  // Alpha 0.40.0 : votes
  const [userVotes, setUserVotes] = useState({}); // {signalement_id: true}
  const [voteBusy, setVoteBusy] = useState({});

  async function load() {
    if (!auth.structureId) { setLoading(false); return; }
    const etabKey = auth.etabId || "all";
    // Alpha 0.28.0 : safeFetch pour cache offline
    const result = await safeFetch(
      `signalements:etab:${etabKey}`,
      () => {
        let q = supabase.from("signalements")
          .select("*")
          .order("created_at", { ascending: false });
        if (auth.etabId) q = q.eq("etablissement_id", auth.etabId);
        return q;
      }
    );
    setStaleData(result.fromCache === true);
    setRows(result.data || []);
    // Alpha 0.40.0 : charger les votes du user
    if (auth.user?.id) {
      const { data: votes } = await supabase
        .from("signalement_votes")
        .select("signalement_id")
        .eq("user_id", auth.user.id);
      const map = {};
      (votes || []).forEach((v) => { map[v.signalement_id] = true; });
      setUserVotes(map);
    }
    setLoading(false);
  }

  // Alpha 0.53.0 (BM) : charge les templates actifs de la structure
  async function loadTemplates() {
    if (!auth.structureId) return;
    const { data } = await supabase
      .from("signalement_templates")
      .select("*")
      .eq("structure_id", auth.structureId)
      .eq("actif", true)
      .order("ordre", { ascending: true })
      .order("nom", { ascending: true });
    setTemplates(data || []);
  }

  function applyTemplate(t) {
    setForm({
      type: t.type,
      titre: t.titre_modele,
      description: t.description_modele,
      signature: form.signature || "",
    });
  }

  // Alpha 0.40.0 : toggle vote
  async function toggleVote(r) {
    if (!auth.user?.id || voteBusy[r.id]) return;
    setVoteBusy({ ...voteBusy, [r.id]: true });
    try {
      if (userVotes[r.id]) {
        // Retrait
        await safeDelete(supabase, "signalement_votes",
          { signalement_id: r.id, user_id: auth.user.id },
          { userId: auth.user?.id }
        );
        setUserVotes({ ...userVotes, [r.id]: false });
        setRows(rows.map((x) => x.id === r.id ? { ...x, nb_votes: Math.max((x.nb_votes || 0) - 1, 0) } : x));
      } else {
        // Ajout
        await safeInsert(supabase, "signalement_votes", {
          signalement_id: r.id,
          user_id: auth.user.id,
        }, { userId: auth.user?.id });
        setUserVotes({ ...userVotes, [r.id]: true });
        setRows(rows.map((x) => x.id === r.id ? { ...x, nb_votes: (x.nb_votes || 0) + 1 } : x));
      }
    } catch (e) {
      logger.warn("vote:", e.message);
    } finally {
      setVoteBusy({ ...voteBusy, [r.id]: false });
    }
  }
  useEffect(() => { if (auth.ready) { load(); loadTemplates(); } }, [auth.ready, auth.etabId, auth.structureId]);

  function openNew() { setForm({ type: "Idée", signature: "" }); setModal({}); setErr(""); }
  function openEdit(r) { setForm({ ...r }); setModal(r); setErr(""); }

  async function save() {
    if (!form.titre?.trim()) { setErr("Le titre est obligatoire."); return; }
    if (!form.description?.trim()) { setErr("La description est obligatoire."); return; }
    const payload = {
      structure_id: auth.structureId,
      etablissement_id: auth.etabId,
      type: form.type || "Autre",
      titre: form.titre.trim(),
      description: form.description.trim(),
      signature: form.signature?.trim() || null,
      // Alpha 0.40.0 : catégorie libre (optionnelle)
      categorie: form.categorie?.trim() || null,
      // Alpha 0.32.0 : opt-in created_by si l'utilisateur a coché "Tracker dans mon profil".
      // L'anonymat reste le défaut. created_by est NULL si la case n'est pas cochée.
      // Note : seule l'écriture initiale renseigne created_by (pas l'édition admin).
    };
    if (modal?.id) {
      // En édition (admin uniquement) on autorise à toucher au statut + réponse
      // On NE TOUCHE PAS à created_by (préserve l'anonymat existant ou la signature initiale)
      payload.statut = form.statut || "Nouveau";
      payload.reponse = form.reponse?.trim() || null;
      if (form.reponse?.trim() && !modal.reponse) {
        // Première réponse : on enregistre qui et quand
        payload.reponse_par = auth.user?.email || "Administrateur";
        payload.reponse_le = new Date().toISOString();
        // Alpha 0.41.0 : transition auto Nouveau → En cours à la 1ère réponse
        // (sauf si l'admin a explicitement choisi un autre statut dans le form)
        if (modal.statut === "Nouveau" && form.statut === "Nouveau") {
          payload.statut = "En cours";
        }
      }
      await safeUpdate(supabase, "signalements", payload, { id: modal.id }, { userId: auth.user?.id });
      // Alpha 0.45.0 : notif à l'auteur si 1ère réponse + signalement nominatif
      if (payload.reponse_par && modal.created_by) {
        try {
          await notifierAuteurSignalement(supabase, modal.id, modal.created_by, modal.titre, payload.reponse);
        } catch (e) {
          // Silencieux : la notif est best-effort, ne pas bloquer le save
          logger.warn("Notif signalement auteur:", e?.message);
        }
      }
    } else {
      // Création : opt-in created_by
      if (form.trackPerso && auth.user?.id) {
        payload.created_by = auth.user.id;
      }
      // UUID client pour offline
      const newId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : null;
      const insertPayload = newId ? { id: newId, ...payload } : payload;
      await safeInsert(supabase, "signalements", insertPayload, { userId: auth.user?.id });
    }
    setModal(null); await load();
  }

  async function del(r) {
    if (!await dialogs.confirm({ title: `Supprimer le signalement "${r.titre}" ? Action irréversible.`, variant: "danger" })) return;
    await safeDelete(supabase, "signalements", { id: r.id }, { userId: auth.user?.id });
    await load();
  }

  if (!auth.ready) return null;

  // 0.58.54 : filtre ctx (bâtiment/service) via patients liés
  const { patientIds, ctx } = useContextPatientIds();
  const rowsCtx = ctx.active
    ? rows.filter(r => {
        if (patientIds && r.patient_id && !patientIds.has(r.patient_id)) return false;
        // 0.58.63 : filtre équipe
        if (ctx.equipeId && r.equipe_id !== ctx.equipeId) return false;
        return true;
      })
    : rows;

  // Filtrage côté client par statut, type, catégorie (Alpha 0.41) + tri
  const filtered = rowsCtx
    .filter((r) => {
      if (fStatut && r.statut !== fStatut) return false;
      if (fType && r.type !== fType) return false;
      if (fCategorie && r.categorie !== fCategorie) return false;
      return true;
    })
    .sort((a, b) => {
      if (triPar === "votes") {
        const va = a.nb_votes || 0, vb = b.nb_votes || 0;
        if (vb !== va) return vb - va;
        // Tiebreak : récents en premier
        return new Date(b.created_at) - new Date(a.created_at);
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

  // Alpha 0.41.0 : liste des catégories existantes pour le filtre
  const categoriesDispos = [...new Set(rows.map(r => r.categorie).filter(Boolean))].sort();

  // KPIs : compte par statut
  const compteStatuts = {};
  rows.forEach((r) => { compteStatuts[r.statut] = (compteStatuts[r.statut] || 0) + 1; });

  function typeInfo(t) { return TYPES.find((x) => x.value === t) || TYPES[3]; }
  function statutInfo(s) { return STATUTS.find((x) => x.value === s) || STATUTS[0]; }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead eyebrow="COMMUNICATION" icon="ti-message" title="Signalements" accent="anonymes"
          sub="Boîte à idées et problèmes terrain — tu peux signer ou rester anonyme" />

        {staleData && <StaleDataBanner />}

        {/* KPIs cliquables pour filtrer */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 18 }}>
          {STATUTS.map((s) => (
            <button key={s.value} onClick={() => setFStatut(fStatut === s.value ? "" : s.value)} style={{
              padding: "14px 16px", border: `2px solid ${fStatut === s.value ? s.color : "#e3e9ee"}`,
              background: fStatut === s.value ? s.color + "1a" : "#fff",
              borderRadius: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, display: "inline-block" }} />
                <span style={{ fontSize: 12, color: "#6c7a89", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600 }}>{s.value}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#142131", marginTop: 4 }}>{compteStatuts[s.value] || 0}</div>
            </button>
          ))}
        </div>

        <Panel>
          <div className="di-toolbar" style={{ flexWrap: "wrap" }}>
            {/* 0.58.22 : NeonButton variant=teal pour "Nouveau signalement" */}
            <NeonButton variant="teal" icon="ti-plus" onClick={openNew}>Nouveau signalement</NeonButton>
            <select value={fType} onChange={(e) => setFType(e.target.value)} style={{ padding: "6px 10px" }}>
              <option value="">Tous les types</option>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.value}</option>)}
            </select>
            {/* Alpha 0.41.0 : filtre catégorie + tri */}
            {categoriesDispos.length > 0 && (
              <select value={fCategorie} onChange={(e) => setFCategorie(e.target.value)} style={{ padding: "6px 10px" }}>
                <option value="">Toutes catégories</option>
                {categoriesDispos.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <select value={triPar} onChange={(e) => setTriPar(e.target.value)} style={{ padding: "6px 10px" }} title="Tri">
              <option value="recent">Plus récents</option>
              <option value="votes">Plus de votes</option>
            </select>
            {(fStatut || fType || fCategorie) && <Btn variant="ghost" icon="ti-x" onClick={() => { setFStatut(""); setFType(""); setFCategorie(""); }}>Effacer filtres</Btn>}
          </div>

          {loading ? (
            /* 0.58.9 : SkeletonRow x 4 */
            <div style={{ background: "#fff", border: "1px solid #e3e9ee", borderRadius: 12, padding: 6 }}>
              {[0,1,2,3].map((i) => <SkeletonRow key={i} cols={4} />)}
            </div>
          )
            : rows.length === 0 ? (
              <EmptyState
                illustration="inbox"
                variant="terra"
                title="Aucun signalement"
                message="Aucun problème signalé pour le moment. Dépose un signalement si tu rencontres un souci avec le matériel ou les interventions."
                actionLabel="Déposer le premier signalement"
                onAction={openNew}
              />
            )
            : filtered.length === 0 ? (
              <EmptyState
                illustration="search"
                variant="gray"
                title="Aucun résultat"
                message="Aucun signalement ne correspond à ces filtres."
                compact
              />
            )
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {filtered.map((r) => {
                  const ti = typeInfo(r.type);
                  const si = statutInfo(r.statut);
                  return (
                    <div key={r.id} style={{
                      padding: "16px 18px", border: "1px solid #e3e9ee", borderRadius: 12, background: "#fff",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                            <span style={{ background: ti.color + "22", color: ti.color, padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, border: `1px solid ${ti.color}44` }}>
                              <i className={`ti ${ti.icon}`} /> {r.type}
                            </span>
                            <span style={{ background: si.color + "22", color: si.color, padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, border: `1px solid ${si.color}44` }}>
                              {r.statut}
                            </span>
                            <span style={{ color: "#8a98a8", fontSize: 12 }}>· {fmtDate(r.created_at)}</span>
                            {r.signature && <span style={{ color: "#142131", fontSize: 12, fontWeight: 600 }}><i className="ti ti-user" /> {r.signature}</span>}
                            {!r.signature && <span style={{ color: "#8a98a8", fontSize: 12, fontStyle: "italic" }}>Anonyme</span>}
                          </div>
                          <h3 style={{ margin: "0 0 6px", fontSize: 15, color: "#142131" }}>{r.titre}</h3>
                          {/* Alpha 0.40.0 : badge catégorie */}
                          {r.categorie && (
                            <span style={{ display: "inline-block", marginBottom: 6, fontSize: 10.5, padding: "2px 9px", borderRadius: 8, background: "#f0edf7", color: "#5e4a8c", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px" }}>
                              <i className="ti ti-bookmark" /> {r.categorie}
                            </span>
                          )}
                          <p style={{ margin: 0, color: "#2a3a48", fontSize: 13.5, whiteSpace: "pre-wrap" }}>{r.description}</p>
                          {/* Alpha 0.40.0 : votes (likes) */}
                          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                            <button
                              onClick={() => toggleVote(r)}
                              disabled={voteBusy[r.id]}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 5,
                                padding: "5px 10px", borderRadius: 18,
                                border: `1px solid ${userVotes[r.id] ? "#185FA5" : "#e3e9ee"}`,
                                background: userVotes[r.id] ? "#eef5fc" : "#fff",
                                color: userVotes[r.id] ? "#185FA5" : "#6c7a89",
                                fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                                cursor: voteBusy[r.id] ? "wait" : "pointer",
                                transition: "all .12s",
                              }}
                              title={userVotes[r.id] ? "Retirer mon vote" : "Voter pour ce signalement"}
                            >
                              <i className={`ti ${userVotes[r.id] ? "ti-thumb-up-filled" : "ti-thumb-up"}`} />
                              {r.nb_votes || 0}
                            </button>
                            {(r.nb_votes || 0) >= 3 && (
                              <span style={{ fontSize: 11, color: "#EF9F27", fontWeight: 600 }}>
                                <i className="ti ti-flame" /> Sujet populaire
                              </span>
                            )}
                          </div>
                          {r.reponse && (
                            <div style={{ marginTop: 12, padding: "10px 14px", background: "#eaf7f7", borderRadius: 8, borderLeft: "3px solid #5aa05a" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#5aa05a", letterSpacing: ".5px", marginBottom: 4 }}>
                                <i className="ti ti-corner-down-right" /> RÉPONSE DE {r.reponse_par?.toUpperCase() || "L'ADMINISTRATION"} {r.reponse_le && `· ${fmtDate(r.reponse_le)}`}
                              </div>
                              <p style={{ margin: 0, color: "#142131", fontSize: 13.5, whiteSpace: "pre-wrap" }}>{r.reponse}</p>
                            </div>
                          )}
                        </div>
                        {isAdmin && (
                          <div style={{ display: "flex", gap: 8, whiteSpace: "nowrap" }}>
                            <Btn variant="ghost" icon="ti-edit" onClick={() => openEdit(r)}>Répondre</Btn>
                            <i className="ti ti-trash" style={{ color: "#C9867F", cursor: "pointer", padding: 6 }} onClick={() => del(r)} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </Panel>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} kind="patient"
        title={modal?.id ? "Répondre / modifier le signalement" : "Nouveau signalement"}
        footer={<>
          <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
          <NeonButton variant="teal" icon={modal?.id ? "ti-device-floppy" : "ti-send"} onClick={save}>
            {modal?.id ? "Enregistrer" : "Déposer"}
          </NeonButton>
        </>}
      >
        {err && <div className="err">{err}</div>}
        {!modal?.id && (
          <p style={{ background: "#eaf7f7", padding: "10px 14px", borderRadius: 8, fontSize: 13, margin: "0 0 14px", borderLeft: "3px solid #7CC8C8" }}>
            <i className="ti ti-shield-lock" /> Ton signalement est <b>anonyme par défaut</b>. Aucun lien avec ton compte n'est enregistré. Tu peux signer en bas si tu souhaites.
          </p>
        )}
        {/* Alpha 0.53.0 (BM) : templates de signalement */}
        {!modal?.id && templates.length > 0 && (
          <div className="fld">
            <label><i className="ti ti-bookmark" /> Modèles disponibles ({templates.length})</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {templates.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  title={`Type: ${t.type}\n${t.titre_modele}`}
                  style={{
                    padding: "5px 11px", border: "1px solid #bfd6f0",
                    background: "#eef5fc", color: "#185FA5",
                    borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
                    fontSize: 12, fontWeight: 600,
                    display: "inline-flex", alignItems: "center", gap: 5,
                  }}
                >
                  <i className={`ti ${t.icone || "ti-template"}`} />
                  {t.nom}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Alpha 0.53.0 (BM) : templates pour gagner du temps */}
        {!modal?.id && templates.length > 0 && (
          <div className="fld" style={{ background: "#eef5fc", padding: "10px 12px", borderRadius: 8, marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 6, color: "#185FA5", fontSize: 11, fontWeight: 700 }}>
              <i className="ti ti-template" /> Démarrer depuis un template
            </label>
            <select 
              onChange={(e) => {
                const t = templates.find(x => x.id === e.target.value);
                if (t) applyTemplate(t);
                e.target.value = "";  // reset après application
              }}
              defaultValue=""
              style={{ width: "100%", padding: 8, border: "1px solid #bfd6f0", borderRadius: 6, fontFamily: "inherit", background: "#fff" }}
            >
              <option value="">— Choisir un template pour pré-remplir le formulaire —</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nom} ({t.type})
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="fld">
          <label>Type *</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TYPES.map((t) => (
              <button key={t.value} type="button" onClick={() => setForm({ ...form, type: t.value })}
                disabled={!!modal?.id}
                style={{
                  padding: "8px 14px", border: `2px solid ${form.type === t.value ? t.color : "#e3e9ee"}`,
                  background: form.type === t.value ? t.color + "1a" : "#fff",
                  borderRadius: 10, cursor: modal?.id ? "default" : "pointer", fontFamily: "inherit",
                  display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13,
                  opacity: modal?.id ? 0.6 : 1,
                }}>
                <i className={`ti ${t.icon}`} style={{ color: t.color }} /> {t.value}
              </button>
            ))}
          </div>
        </div>
        <div className="fld">
          <label>Titre *</label>
          <input value={form.titre || ""} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Résumé en quelques mots…" disabled={!!modal?.id && !isAdmin} />
        </div>
        {/* Alpha 0.40.0 : catégorie libre (optionnelle) */}
        <div className="fld">
          <label>Catégorie (optionnel)</label>
          <input
            value={form.categorie || ""}
            onChange={(e) => setForm({ ...form, categorie: e.target.value })}
            placeholder="Ex: UI, Bug, Performance, Sécurité…"
            disabled={!!modal?.id && !isAdmin}
            list="categ-suggestions"
          />
          <datalist id="categ-suggestions">
            <option value="UI / UX" />
            <option value="Bug" />
            <option value="Performance" />
            <option value="Sécurité" />
            <option value="Documentation" />
            <option value="Demande de fonctionnalité" />
          </datalist>
        </div>
        <div className="fld">
          <label>Description *</label>
          <textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} placeholder="Détails du problème, de l'idée ou de la question…" disabled={!!modal?.id && !isAdmin} />
        </div>
        {!modal?.id && (
          <div className="fld">
            <label>Signature (optionnel)</label>
            <input value={form.signature || ""} onChange={(e) => setForm({ ...form, signature: e.target.value })} placeholder="Ex: Marie, IDE service 2A — laisse vide pour rester anonyme" />
          </div>
        )}
        {/* Alpha 0.32.0 : opt-in tracker dans son profil (préserve l'anonymat par défaut) */}
        {!modal?.id && (
          <div style={{
            padding: "12px 14px",
            background: form.trackPerso ? "linear-gradient(135deg,#eef5fc,#fff)" : "#fafbfc",
            border: `1px solid ${form.trackPerso ? "#7CC8C8" : "#e3e9ee"}`,
            borderRadius: 10,
            marginBottom: 12,
            transition: "all .15s",
          }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={!!form.trackPerso}
                onChange={(e) => setForm({ ...form, trackPerso: e.target.checked })}
                style={{ marginTop: 3, cursor: "pointer" }}
              />
              <span style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: form.trackPerso ? "#142131" : "#6c7a89" }}>
                  <i className="ti ti-user-check" style={{ color: form.trackPerso ? "#185FA5" : "#8a98a8", marginRight: 6 }} />
                  Tracker dans mon profil
                </span>
                <span style={{ display: "block", fontSize: 11.5, color: "#8a98a8", marginTop: 3 }}>
                  Ce signalement apparaîtra dans tes statistiques personnelles (/profil).
                  Reste visible par tous les membres comme un signalement classique.
                  {!form.trackPerso && (
                    <> <b style={{ color: "#5aa05a" }}>Anonymat préservé par défaut.</b></>
                  )}
                </span>
              </span>
            </label>
          </div>
        )}
        {modal?.id && isAdmin && (
          <>
            <div className="fld">
              <label>Statut</label>
              <select value={form.statut || "Nouveau"} onChange={(e) => setForm({ ...form, statut: e.target.value })}>
                {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.value}</option>)}
              </select>
            </div>
            <div className="fld">
              <label>Réponse de l'administration</label>
              <textarea value={form.reponse || ""} onChange={(e) => setForm({ ...form, reponse: e.target.value })} rows={4} placeholder="Réponse visible publiquement par tous les membres de la collectivité." />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

// Alpha 0.45.0 : helper notification auteur signalement
async function notifierAuteurSignalement(supabase, signalementId, authorUserId, titre, reponse) {
  // 1) Récupère l'email de l'auteur via v_users_emails (RLS-safe : read seul)
  //    Si la vue n'est pas accessible côté client, fallback gracieux
  let email = null;
  try {
    const { data: u } = await supabase
      .from("v_users_emails")
      .select("email")
      .eq("user_id", authorUserId)
      .maybeSingle();
    email = u?.email || null;
  } catch (e) {
    email = null;
  }

  // 2) Crée une notif in-app (toujours, indépendamment de l'email)
  await supabase.from("notifications").insert({
    user_id: authorUserId,
    type: "systeme",
    titre: "Réponse à votre signalement",
    message: `« ${titre || "Signalement"} » a reçu une réponse${reponse ? `: ${reponse.slice(0, 80)}${reponse.length > 80 ? "…" : ""}` : ""}`,
    lien: "/signalements",
    lue: false,
  });

  // 3) Marque le signalement comme notifié pour éviter doublons
  await supabase
    .from("signalements")
    .update({ reponse_notifie: true })
    .eq("id", signalementId);

  // 4) Best-effort : envoyer email via Edge Function send-email
  if (email) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (session && supabaseUrl) {
        await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            to: email,
            subject: `Réponse à votre signalement « ${titre} »`,
            html: `<p>Bonjour,</p>
<p>Le signalement <b>${titre}</b> que vous avez déposé a reçu une réponse :</p>
<blockquote style="border-left: 3px solid #185FA5; padding: 8px 14px; margin: 14px 0; color: #2a3a48;">
${reponse?.replace(/\n/g, "<br>") || "(pas de contenu fourni)"}
</blockquote>
<p>Vous pouvez consulter la suite et y répondre depuis l'app Aveho EC.</p>
<p style="color: #6c7a89; font-size: 12px;">Aveho — Espace Collectivité</p>`,
          }),
        });
      }
    } catch (e) {
      // Email best-effort, ne pas bloquer
      logger.warn("Send email signalement:", e?.message);
    }
  }

  // 5) Alpha 0.46.0 : push browser (silencieux, best-effort)
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (session && supabaseUrl) {
      await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: authorUserId,
          title: "Réponse à votre signalement",
          body: `« ${titre || "Signalement"} » a reçu une réponse`,
          url: "/signalements",
        }),
      });
    }
  } catch (e) {
    // Push best-effort
    logger.warn("Send push signalement:", e?.message);
  }
}
