"use client";
// =============================================================
//  /parametres/compta — Page paramétrage comptabilité (0.58.69)
//  UI CRUD sur la table tva_taux créée en 0.58.67.
//  Architecture extensible : on commence par la TVA, on pourra
//  ajouter d'autres modules compta (plans comptables, codes
//  analytiques, journaux…).
// =============================================================

import { useEffect, useState, useMemo } from "react";
import { createClient } from "../../../lib/supabase";
import BackButton from "../../components/BackButton";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Modal, Btn, IconButton } from "../../ui";
import { EmptyState, SkeletonRow, toast } from "../../components/ui-premium";
import { safeInsert, safeUpdate, safeDelete } from "../../../lib/safeWrite";

const TVA_DEFAULT_SEED = [
  { code: "NORMAL",        libelle: "TVA Normale",            taux: 20.00, compte_vente: "707100", compte_achat: "607100", compte_tva_collectee: "44571100", compte_tva_deductible: "44566100" },
  { code: "INTERMEDIAIRE", libelle: "TVA Intermédiaire",     taux: 10.00, compte_vente: "707200", compte_achat: "607200", compte_tva_collectee: "44571200", compte_tva_deductible: "44566200" },
  { code: "REDUIT",        libelle: "TVA Réduite",            taux:  5.50, compte_vente: "707300", compte_achat: "607300", compte_tva_collectee: "44571300", compte_tva_deductible: "44566300" },
  { code: "SUPER_REDUIT",  libelle: "TVA Super-réduite",     taux:  2.10, compte_vente: "707400", compte_achat: "607400", compte_tva_collectee: "44571400", compte_tva_deductible: "44566400" },
  { code: "EXO",           libelle: "Exonération TVA",        taux:  0.00, compte_vente: "707500", compte_achat: "607500", compte_tva_collectee: null,        compte_tva_deductible: null },
];

export default function ParametresCompta() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [taux, setTaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [activeTab, setActiveTab] = useState("tva");

  async function loadAll() {
    if (!auth.ready || !auth.structureId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tva_taux")
        .select("*")
        .eq("structure_id", auth.structureId)
        .order("est_defaut", { ascending: false })
        .order("taux", { ascending: false });
      if (error) throw error;
      setTaux(data || []);
    } catch (e) {
      console.error("[compta] load:", e);
      if (e?.code === "42P01" || /does not exist/i.test(e?.message || "")) {
        toast.error("Table tva_taux absente. Exécute le SQL 0.58.67 d'abord.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [auth.ready, auth.structureId]);

  function newTaux() {
    setForm({
      code: "",
      libelle: "",
      taux: 20.00,
      compte_vente: "",
      compte_achat: "",
      compte_tva_collectee: "",
      compte_tva_deductible: "",
      code_analytique: "",
      est_defaut: false,
      actif: true,
    });
    setModal({});
    setErr("");
  }

  function editTaux(t) {
    setForm({ ...t });
    setModal(t);
    setErr("");
  }

  async function saveTaux() {
    if (!form.code?.trim()) { setErr("Le code est obligatoire (ex: NORMAL, REDUIT...)"); return; }
    if (!form.libelle?.trim()) { setErr("Le libellé est obligatoire."); return; }
    if (form.taux === undefined || form.taux === null || form.taux === "") { setErr("Le taux est obligatoire."); return; }
    setBusy(true);
    try {
      const payload = {
        structure_id: auth.structureId,
        code: form.code.trim().toUpperCase(),
        libelle: form.libelle.trim(),
        taux: parseFloat(form.taux),
        compte_vente: form.compte_vente?.trim() || null,
        compte_achat: form.compte_achat?.trim() || null,
        compte_tva_collectee: form.compte_tva_collectee?.trim() || null,
        compte_tva_deductible: form.compte_tva_deductible?.trim() || null,
        code_analytique: form.code_analytique?.trim() || null,
        est_defaut: !!form.est_defaut,
        actif: form.actif !== false,
      };
      const userId = auth.user?.id;
      // Si on coche "est_defaut", retirer cette propriété des autres
      if (payload.est_defaut) {
        await supabase.from("tva_taux")
          .update({ est_defaut: false })
          .eq("structure_id", auth.structureId)
          .neq("id", modal?.id || "00000000-0000-0000-0000-000000000000");
      }
      if (modal?.id) {
        const { error } = await safeUpdate(supabase, "tva_taux", payload, { id: modal.id }, { userId });
        if (error) throw error;
        toast.success(`Taux "${payload.libelle}" mis à jour`);
      } else {
        const { error } = await safeInsert(supabase, "tva_taux", payload, { userId });
        if (error) throw error;
        toast.success(`Taux "${payload.libelle}" créé`);
      }
      setModal(null);
      await loadAll();
    } catch (e) {
      if (/duplicate key|unique constraint/i.test(e?.message || "")) {
        setErr(`Le code "${form.code}" existe déjà. Choisis un code unique.`);
      } else {
        setErr(e.message || "Erreur lors de la sauvegarde");
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteTaux(t) {
    if (t.est_defaut) {
      toast.error("Impossible de supprimer le taux par défaut. Définis-en un autre par défaut d'abord.");
      return;
    }
    if (!confirm(`Supprimer définitivement le taux "${t.libelle}" ?\n\nLes articles qui l'utilisent garderont leur taux numérique mais perdront la liaison comptable.`)) return;
    try {
      const { error } = await safeDelete(supabase, "tva_taux", { id: t.id }, { userId: auth.user?.id });
      if (error) throw error;
      toast.success("Taux supprimé");
      await loadAll();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function setDefaut(t) {
    if (t.est_defaut) return;
    try {
      await supabase.from("tva_taux")
        .update({ est_defaut: false })
        .eq("structure_id", auth.structureId);
      const { error } = await supabase
        .from("tva_taux")
        .update({ est_defaut: true })
        .eq("id", t.id);
      if (error) throw error;
      toast.success(`"${t.libelle}" est maintenant le taux par défaut`);
      await loadAll();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function toggleActif(t) {
    if (t.est_defaut && t.actif) {
      toast.error("Impossible de désactiver le taux par défaut.");
      return;
    }
    try {
      const { error } = await supabase
        .from("tva_taux")
        .update({ actif: !t.actif })
        .eq("id", t.id);
      if (error) throw error;
      toast.success(t.actif ? `"${t.libelle}" désactivé` : `"${t.libelle}" réactivé`);
      await loadAll();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function seedDefaults() {
    if (taux.length > 0) {
      if (!confirm(`${taux.length} taux existent déjà. Ajouter les 5 taux français standards quand même (les codes existants seront skippés) ?`)) return;
    }
    setSeeding(true);
    try {
      const existing = new Set(taux.map(t => t.code));
      const toInsert = TVA_DEFAULT_SEED
        .filter(s => !existing.has(s.code))
        .map((s, idx) => ({
          structure_id: auth.structureId,
          code: s.code,
          libelle: s.libelle,
          taux: s.taux,
          compte_vente: s.compte_vente,
          compte_achat: s.compte_achat,
          compte_tva_collectee: s.compte_tva_collectee,
          compte_tva_deductible: s.compte_tva_deductible,
          est_defaut: idx === 0 && taux.length === 0,  // premier seul si vide
          actif: true,
        }));
      if (toInsert.length === 0) {
        toast.error("Tous les codes standards existent déjà.");
        return;
      }
      const { error } = await supabase.from("tva_taux").insert(toInsert);
      if (error) throw error;
      toast.success(`${toInsert.length} taux standards français créés`);
      await loadAll();
    } catch (e) {
      toast.error(e.message || "Erreur lors du seed");
    } finally {
      setSeeding(false);
    }
  }

  if (!auth.ready) return null;
  const isAdmin = auth.can("admin") || auth.can("gestionnaire");

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <div style={{ marginBottom: 8 }}><BackButton /></div>
        <PageHead small title="Paramétrage Comptabilité" sub="TVA et comptes comptables de ton organisation" />

        {/* Tabs (extensible — on commence par TVA, on pourra ajouter d'autres modules après) */}
        <div style={{ display: "flex", borderBottom: "2px solid #e3e9ee", marginBottom: 16, gap: 0 }}>
          {[
            { key: "tva", lbl: "Taux TVA", icon: "ti-percentage", count: taux.length },
            { key: "plan", lbl: "Plan comptable", icon: "ti-book", count: 0, disabled: true },
            { key: "analytique", lbl: "Codes analytiques", icon: "ti-tag", count: 0, disabled: true },
            { key: "journaux", lbl: "Journaux", icon: "ti-folder", count: 0, disabled: true },
          ].map(t => (
            <button key={t.key}
              onClick={() => !t.disabled && setActiveTab(t.key)}
              disabled={t.disabled}
              style={{
                background: activeTab === t.key ? "linear-gradient(135deg, rgba(239,159,39,.15), transparent)" : "transparent",
                color: t.disabled ? "#cfd8e0" : (activeTab === t.key ? "#EF9F27" : "#5a6878"),
                border: "none", borderBottom: `3px solid ${activeTab === t.key ? "#EF9F27" : "transparent"}`,
                padding: "10px 18px", fontSize: 13, fontWeight: activeTab === t.key ? 700 : 500,
                cursor: t.disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              <i className={`ti ${t.icon}`} /> {t.lbl}
              {t.count > 0 && (
                <span style={{ background: activeTab === t.key ? "#EF9F27" : "#cfd8e0", color: "#fff", padding: "1px 7px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{t.count}</span>
              )}
              {t.disabled && (
                <span style={{ background: "#f0f3f6", color: "#a0aeb9", padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, fontStyle: "italic" }}>BIENTÔT</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab : TVA */}
        {activeTab === "tva" && (
          <>
            <Panel style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: 15, color: "#142131" }}>Taux de TVA configurés</h3>
                  <p style={{ margin: 0, fontSize: 12, color: "#5a6878" }}>
                    Ces taux sont sélectionnables dans la fiche article. Le taux par défaut est appliqué automatiquement aux nouveaux articles.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {taux.length === 0 && isAdmin && (
                    <button onClick={seedDefaults} disabled={seeding} style={{
                      background: "linear-gradient(135deg, #7CC8C8, #5da8a8)",
                      color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                      display: "inline-flex", alignItems: "center", gap: 5,
                    }}>
                      <i className="ti ti-sparkles" /> {seeding ? "Création..." : "Créer les 5 taux FR standards"}
                    </button>
                  )}
                  {isAdmin && (
                    <button onClick={newTaux} style={{
                      background: "linear-gradient(135deg, #EF9F27, #d28818)",
                      color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                      display: "inline-flex", alignItems: "center", gap: 5,
                    }}>
                      <i className="ti ti-plus" /> Nouveau taux
                    </button>
                  )}
                </div>
              </div>
            </Panel>

            <Panel style={{ padding: 0, overflow: "hidden" }}>
              {loading ? (
                <div style={{ padding: 12 }}><SkeletonRow count={5} /></div>
              ) : taux.length === 0 ? (
                <EmptyState
                  illustration="package"
                  variant="amber"
                  title="Aucun taux TVA configuré"
                  message="Configure les taux de TVA utilisés par ton organisation. Tu peux créer les 5 taux français standards en 1 clic."
                  actionLabel={isAdmin ? "Créer les taux standards FR" : null}
                  onAction={isAdmin ? seedDefaults : null}
                />
              ) : (
                <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: "linear-gradient(135deg, #fff8ec, #fff)", borderBottom: "2px solid #f0d59f" }}>
                      <th style={{ padding: "10px 8px", textAlign: "left", color: "#7a4f15", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Code</th>
                      <th style={{ padding: "10px 8px", textAlign: "left", color: "#7a4f15", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Libellé</th>
                      <th style={{ padding: "10px 8px", textAlign: "right", color: "#7a4f15", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Taux</th>
                      <th style={{ padding: "10px 8px", textAlign: "left", color: "#7a4f15", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Cpte vente</th>
                      <th style={{ padding: "10px 8px", textAlign: "left", color: "#7a4f15", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Cpte achat</th>
                      <th style={{ padding: "10px 8px", textAlign: "left", color: "#7a4f15", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>TVA coll. / déd.</th>
                      <th style={{ padding: "10px 8px", textAlign: "center", color: "#7a4f15", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Défaut</th>
                      <th style={{ padding: "10px 8px", textAlign: "center", color: "#7a4f15", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Actif</th>
                      <th style={{ padding: "10px 8px", textAlign: "right", color: "#7a4f15", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taux.map(t => (
                      <tr key={t.id} style={{
                        borderBottom: "1px solid #f0f3f6",
                        opacity: t.actif ? 1 : 0.55,
                        background: t.est_defaut ? "rgba(239,159,39,.04)" : "transparent",
                      }}>
                        <td style={{ padding: "9px 8px", fontFamily: "Consolas, monospace", fontSize: 11.5, fontWeight: 700, color: "#7a4f15" }}>
                          {t.code}
                        </td>
                        <td style={{ padding: "9px 8px" }}>
                          <a onClick={() => editTaux(t)} style={{ cursor: "pointer", color: "#142131", fontWeight: 600 }}>{t.libelle}</a>
                        </td>
                        <td style={{ padding: "9px 8px", textAlign: "right", fontFamily: "Consolas, monospace", color: "#EF9F27", fontWeight: 700, fontSize: 13.5 }}>
                          {t.taux}%
                        </td>
                        <td style={{ padding: "9px 8px", fontFamily: "Consolas, monospace", fontSize: 11, color: "#5a6878" }}>{t.compte_vente || "—"}</td>
                        <td style={{ padding: "9px 8px", fontFamily: "Consolas, monospace", fontSize: 11, color: "#5a6878" }}>{t.compte_achat || "—"}</td>
                        <td style={{ padding: "9px 8px", fontFamily: "Consolas, monospace", fontSize: 10.5, color: "#5a6878" }}>
                          {t.compte_tva_collectee || "—"} / {t.compte_tva_deductible || "—"}
                        </td>
                        <td style={{ padding: "9px 8px", textAlign: "center" }}>
                          {t.est_defaut ? (
                            <span style={{ background: "linear-gradient(135deg, #EF9F27, #d28818)", color: "#fff", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
                              <i className="ti ti-star" /> DÉFAUT
                            </span>
                          ) : (
                            <button onClick={() => setDefaut(t)} disabled={!isAdmin || !t.actif} title={!t.actif ? "Le taux doit être actif" : "Définir par défaut"} style={{
                              background: "transparent", border: "1px solid #cfd8e0",
                              color: "#8a98a8", borderRadius: 6, padding: "2px 8px",
                              fontSize: 10, cursor: (!isAdmin || !t.actif) ? "not-allowed" : "pointer", fontFamily: "inherit",
                              opacity: (!isAdmin || !t.actif) ? 0.4 : 1,
                            }}>
                              <i className="ti ti-star" /> Définir
                            </button>
                          )}
                        </td>
                        <td style={{ padding: "9px 8px", textAlign: "center" }}>
                          <button onClick={() => toggleActif(t)} disabled={!isAdmin || (t.est_defaut && t.actif)} title={t.actif ? "Cliquer pour désactiver" : "Cliquer pour réactiver"} style={{
                            background: t.actif ? "rgba(90,160,90,.15)" : "rgba(160,174,185,.15)",
                            color: t.actif ? "#5aa05a" : "#8a98a8",
                            border: `1px solid ${t.actif ? "rgba(90,160,90,.30)" : "rgba(160,174,185,.30)"}`,
                            borderRadius: 6, padding: "2px 8px",
                            fontSize: 10, fontWeight: 700, cursor: (!isAdmin || (t.est_defaut && t.actif)) ? "not-allowed" : "pointer", fontFamily: "inherit",
                            opacity: (!isAdmin || (t.est_defaut && t.actif)) ? 0.4 : 1,
                          }}>
                            <i className={`ti ${t.actif ? "ti-check" : "ti-x"}`} /> {t.actif ? "Actif" : "Inactif"}
                          </button>
                        </td>
                        <td style={{ padding: "9px 8px", textAlign: "right" }}>
                          {isAdmin && (
                            <>
                              <IconButton icon="ti-pencil" color="#EF9F27" ariaLabel="Éditer" onClick={() => editTaux(t)} />
                              <IconButton icon="ti-trash" color="#C9867F" ariaLabel="Supprimer" onClick={() => deleteTaux(t)} />
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </Panel>

            {/* Info-box compta */}
            <Panel style={{ marginTop: 16, padding: "14px 18px", background: "linear-gradient(135deg, rgba(122,111,176,.06), #fff)", borderLeft: "4px solid #7a6fb0" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <i className="ti ti-info-circle" style={{ fontSize: 24, color: "#7a6fb0", flexShrink: 0 }} />
                <div style={{ fontSize: 12.5, color: "#5a6878", lineHeight: 1.55 }}>
                  <b style={{ color: "#142131" }}>À propos des comptes comptables</b><br />
                  Les comptes vente (classe 7) et achat (classe 6) sont utilisés pour les écritures comptables. Les comptes de TVA collectée (44571xx) et déductible (44566xx) sont utilisés pour la déclaration de TVA. Si tu ne fais pas de compta intégrée, tu peux laisser ces champs vides — ils servent uniquement aux exports vers ton expert-comptable.<br /><br />
                  <b style={{ color: "#142131" }}>Codes analytiques</b> : si tu utilises de la compta analytique (répartition par activité, projet, secteur), tu peux préciser un code par défaut pour chaque taux. Override possible par article.
                </div>
              </div>
            </Panel>
          </>
        )}

        {/* Modal édition */}
        {modal && (
          <Modal open={!!modal} onClose={() => setModal(null)} kind="patient"
            title={modal?.id ? `Éditer ${modal.libelle}` : "Nouveau taux de TVA"}
            footer={<>
              <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
              <Btn variant="primary" onClick={saveTaux} disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</Btn>
            </>}
          >
            {err && <div className="err">{err}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
              <div className="fld">
                <label>Code *</label>
                <input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="NORMAL" style={{ fontFamily: "Consolas, monospace", fontWeight: 700 }} maxLength={20} />
                <small style={{ fontSize: 10.5, color: "#8a98a8" }}>Identifiant court unique (ex: NORMAL, REDUIT)</small>
              </div>
              <div className="fld">
                <label>Libellé *</label>
                <input value={form.libelle || ""} onChange={(e) => setForm({ ...form, libelle: e.target.value })} placeholder="TVA Normale 20%" />
              </div>
            </div>

            <div className="fld" style={{ maxWidth: 200 }}>
              <label>Taux (%) *</label>
              <input type="number" step="0.01" min="0" max="100" value={form.taux ?? ""} onChange={(e) => setForm({ ...form, taux: e.target.value })} placeholder="20.00" style={{ fontFamily: "Consolas, monospace", fontSize: 16, fontWeight: 700, color: "#EF9F27" }} />
            </div>

            <h4 style={{ margin: "16px 0 8px", color: "#7a4f15", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #f0d59f", paddingBottom: 4 }}>
              <i className="ti ti-book" /> Comptes comptables
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="fld">
                <label>Compte vente (classe 7)</label>
                <input value={form.compte_vente || ""} onChange={(e) => setForm({ ...form, compte_vente: e.target.value })} placeholder="707100" style={{ fontFamily: "Consolas, monospace" }} />
              </div>
              <div className="fld">
                <label>Compte achat (classe 6)</label>
                <input value={form.compte_achat || ""} onChange={(e) => setForm({ ...form, compte_achat: e.target.value })} placeholder="607100" style={{ fontFamily: "Consolas, monospace" }} />
              </div>
              <div className="fld">
                <label>Compte TVA collectée</label>
                <input value={form.compte_tva_collectee || ""} onChange={(e) => setForm({ ...form, compte_tva_collectee: e.target.value })} placeholder="44571100" style={{ fontFamily: "Consolas, monospace" }} />
              </div>
              <div className="fld">
                <label>Compte TVA déductible</label>
                <input value={form.compte_tva_deductible || ""} onChange={(e) => setForm({ ...form, compte_tva_deductible: e.target.value })} placeholder="44566100" style={{ fontFamily: "Consolas, monospace" }} />
              </div>
            </div>
            <div className="fld" style={{ maxWidth: 240 }}>
              <label>Code analytique (optionnel)</label>
              <input value={form.code_analytique || ""} onChange={(e) => setForm({ ...form, code_analytique: e.target.value })} placeholder="PSAD" style={{ fontFamily: "Consolas, monospace" }} />
            </div>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 14, padding: "10px 14px", background: "#fafbfc", borderRadius: 8, border: "1px solid #e3e9ee" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={!!form.est_defaut} onChange={(e) => setForm({ ...form, est_defaut: e.target.checked })} />
                <i className="ti ti-star" style={{ color: form.est_defaut ? "#EF9F27" : "#cfd8e0" }} />
                Taux par défaut (appliqué aux nouveaux articles)
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.actif !== false} onChange={(e) => setForm({ ...form, actif: e.target.checked })} />
                Actif
              </label>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
