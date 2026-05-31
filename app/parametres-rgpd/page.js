"use client";
// =============================================================
//  Page Paramètres RGPD — Éditeur de templates consentement
//  Alpha 0.34.0
//
//  Permet aux admins de la collectivité de :
//   - Créer un nouveau template à partir du template par défaut
//   - Modifier un brouillon (template non activé)
//   - Activer un template (les nouveaux consentements l'utilisent)
//   - Consulter les anciennes versions (audit)
//
//  Préserve l'audit : un template utilisé par au moins 1 consentement
//  ne peut PAS être supprimé (RLS + UI). Pour "remplacer" un template,
//  on crée une nouvelle version (1.0 → 1.1 → 1.2 ...).
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Modal, Btn } from "../ui";
import { dialogs } from "../dialogs";
import { 
  TEMPLATE_CONSENTEMENT, VERSION_TEMPLATE, TEMPLATE_VARIABLES,
  renderConsentement, consentementToHtml, validateTemplate, nextVersion,
  loadCustomVariables, saveCustomVariables,
} from "../../lib/rgpd";
import { logger } from "../../lib/logger";

export default function ParametresRgpd() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(null); // { id?, version, contenu_md, nom, description }
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null); // template à prévisualiser
  const [usageStats, setUsageStats] = useState({}); // { templateId: nb_signes }
  // Alpha 0.40.0 : variables custom de la structure
  const [customVars, setCustomVars] = useState([]); // [{key, label, value, example}]
  const [customVarsModal, setCustomVarsModal] = useState(false);
  const [customVarsDraft, setCustomVarsDraft] = useState([]);
  const [customSaveBusy, setCustomSaveBusy] = useState(false);
  // Alpha 0.42.0 : établissements (pour template etab-spécifique)
  const [etablissements, setEtablissements] = useState([]);
  // Alpha 0.43.0 : duplication vers plusieurs établissements
  const [dupModal, setDupModal] = useState(null); // { sourceTemplate, etabsSelected: Set }
  const [dupBusy, setDupBusy] = useState(false);
  // Alpha 0.44.0 : activation groupée multi-templates (brouillons)
  const [actMassModal, setActMassModal] = useState(false);
  const [actMassSelected, setActMassSelected] = useState(new Set());
  const [actMassBusy, setActMassBusy] = useState(false);

  async function load() {
    if (!auth.structureId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("consent_templates")
      .select("*")
      .eq("structure_id", auth.structureId)
      .order("created_at", { ascending: false });
    if (error) logger.warn("load templates:", error.message);
    setTemplates(data || []);
    // Compteur d'usage : nombre de consentements signés référençant chaque template
    if (data && data.length > 0) {
      const ids = data.map((t) => t.id);
      const { data: counts } = await supabase
        .from("consentements_rgpd")
        .select("template_id")
        .eq("structure_id", auth.structureId)
        .in("template_id", ids);
      const usage = {};
      (counts || []).forEach((c) => {
        if (c.template_id) usage[c.template_id] = (usage[c.template_id] || 0) + 1;
      });
      setUsageStats(usage);
    }
    // Alpha 0.40.0 : charger les variables custom
    const cv = await loadCustomVariables(supabase, auth.structureId);
    setCustomVars(cv);
    // Alpha 0.42.0 : charger les établissements pour sélecteur template etab
    const { data: etabs } = await supabase
      .from("etablissements")
      .select("id, nom")
      .eq("structure_id", auth.structureId)
      .order("nom");
    setEtablissements(etabs || []);
    setLoading(false);
  }

  // Alpha 0.40.0 : sauvegarde custom vars
  async function saveCustom() {
    setCustomSaveBusy(true);
    const ok = await saveCustomVariables(supabase, auth.structureId, customVarsDraft);
    if (ok) {
      setCustomVars(customVarsDraft);
      setCustomVarsModal(false);
    } else {
      alert("Erreur lors de l'enregistrement");
    }
    setCustomSaveBusy(false);
  }

  function openCustomVarsEditor() {
    setCustomVarsDraft([...customVars]);
    setCustomVarsModal(true);
  }

  // Alpha 0.43.0 : duplication d'un template vers plusieurs établissements
  function openDupModal(template) {
    setDupModal({
      sourceTemplate: template,
      etabsSelected: new Set(),
    });
  }

  function toggleEtabSelected(etabId) {
    if (!dupModal) return;
    const next = new Set(dupModal.etabsSelected);
    if (next.has(etabId)) next.delete(etabId);
    else next.add(etabId);
    setDupModal({ ...dupModal, etabsSelected: next });
  }

  // Alpha 0.44.0 : activation groupée de plusieurs brouillons (typiquement après duplication multi-etabs)
  function openActMassModal() {
    setActMassSelected(new Set());
    setActMassModal(true);
  }

  function toggleActMassSel(templateId) {
    const next = new Set(actMassSelected);
    if (next.has(templateId)) next.delete(templateId);
    else next.add(templateId);
    setActMassSelected(next);
  }

  async function executerActivationGroupee() {
    if (actMassSelected.size === 0) return;
    const selected = templates.filter(t => actMassSelected.has(t.id));
    
    // Validation : aucun template avec warnings critiques
    const tousWarnings = [];
    selected.forEach((t) => {
      const w = validateTemplate(t.contenu_md, customVars.map(v => v.key));
      if (w.length > 0) tousWarnings.push(`v${t.version}${t.nom ? ` (${t.nom})` : ""} : ${w[0]}`);
    });
    let confirmMsg = `Activer ${selected.length} template(s) ?\n\nPour chaque établissement, le template précédent sera désactivé automatiquement.`;
    if (tousWarnings.length > 0) {
      confirmMsg += `\n\n⚠ Avertissements (${tousWarnings.length}) :\n${tousWarnings.slice(0, 5).join("\n")}`;
      if (tousWarnings.length > 5) confirmMsg += `\n… et ${tousWarnings.length - 5} autres.`;
    }
    if (!await dialogs.confirm({ title: confirmMsg, variant: "danger" })) return;

    setActMassBusy(true);
    try {
      // Pour chaque template à activer, désactiver les autres actifs de la même structure+etab
      for (const t of selected) {
        // Désactiver le template actif existant sur le même (structure, etab)
        let qDeact = supabase
          .from("consent_templates")
          .update({ is_active: false })
          .eq("structure_id", t.structure_id)
          .eq("is_active", true)
          .neq("id", t.id);
        if (t.etablissement_id) {
          qDeact = qDeact.eq("etablissement_id", t.etablissement_id);
        } else {
          qDeact = qDeact.is("etablissement_id", null);
        }
        await qDeact;
        // Activer le nouveau
        await supabase
          .from("consent_templates")
          .update({ is_active: true })
          .eq("id", t.id);
      }
      alert(`${selected.length} template(s) activé(s) avec succès.`);
      setActMassModal(false);
      setActMassSelected(new Set());
      await load();
    } catch (e) {
      alert("Erreur activation groupée : " + e.message);
    } finally {
      setActMassBusy(false);
    }
  }

  async function executerDuplication() {
    if (!dupModal || dupModal.etabsSelected.size === 0) return;
    setDupBusy(true);
    try {
      const source = dupModal.sourceTemplate;
      const etabIds = [...dupModal.etabsSelected];
      // Pour chaque etab cible : insérer un nouveau template (brouillon, is_active=false)
      const inserts = etabIds.map((etabId) => ({
        structure_id: auth.structureId,
        etablissement_id: etabId,
        version: source.version, // même version (sera réincrémenté à l'activation si conflit)
        nom: source.nom ? `${source.nom} (copie)` : `Copie de v${source.version}`,
        description: source.description,
        contenu_md: source.contenu_md,
        is_active: false,
        created_by: auth.user?.id,
      }));
      const { error } = await supabase.from("consent_templates").insert(inserts);
      if (error) {
        // Erreur de duplicate (contrainte unique) : message clair
        if (error.code === "23505" || error.message?.includes("duplicate")) {
          throw new Error(
            "Un template avec cette version existe déjà pour au moins un des établissements sélectionnés.\n\n" +
            "Soit l'hotfix SQL de la 0.43 n'a pas été appliqué (contrainte unique à mettre à jour), " +
            "soit tu as déjà un template v" + source.version + " pour un de ces établissements. " +
            "Dans ce dernier cas, modifie la version source ou supprime le doublon."
          );
        }
        throw error;
      }
      alert(`Template dupliqué vers ${etabIds.length} établissement(s). Activer manuellement chaque copie pour la rendre effective.`);
      setDupModal(null);
      await load();
    } catch (e) {
      alert("Erreur duplication : " + e.message);
    } finally {
      setDupBusy(false);
    }
  }

  useEffect(() => { if (auth.ready) load(); }, [auth.ready, auth.structureId]);

  // ----- Restriction admin -----
  const peutGerer = auth.can?.("gerer_roles") || auth.can?.("manage_collectivite") || auth.role?.systeme === "admin" || auth.role?.nom === "Administrateur";

  if (!auth.ready) return null;
  if (!peutGerer) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap">
          <Panel><StateMsg><i className="ti ti-shield-x" /> Cette page est réservée aux administrateurs.</StateMsg></Panel>
        </div>
      </div>
    );
  }

  // ----- Actions -----
  function openNewFromDefault() {
    const latestVersion = templates.length > 0 ? templates[0].version : null;
    setEditor({
      version: nextVersion(latestVersion),
      contenu_md: TEMPLATE_CONSENTEMENT,
      nom: "",
      description: "",
      etablissement_id: null, // Alpha 0.42.0 : global structure par défaut
    });
  }

  function openNewFromExisting(t) {
    setEditor({
      version: nextVersion(t.version),
      contenu_md: t.contenu_md,
      nom: t.nom ? `${t.nom} (copie)` : "",
      description: t.description || "",
      etablissement_id: t.etablissement_id || null,
    });
  }

  function openEdit(t) {
    // Édition autorisée uniquement si pas encore activé / utilisé
    if (t.is_active || (usageStats[t.id] || 0) > 0) {
      alert("Ce template est activé ou déjà utilisé. Crée une nouvelle version pour modifier.");
      return;
    }
    setEditor({ ...t });
  }

  async function saveTemplate() {
    if (!editor) return;
    if (!editor.contenu_md?.trim()) { alert("Le contenu du template ne peut pas être vide."); return; }
    if (!editor.version?.trim()) { alert("Numéro de version requis."); return; }
    // Avertissements (non bloquants)
    const warnings = validateTemplate(editor.contenu_md, customVars.map(v => v.key));
    if (warnings.length > 0) {
      const ok = confirm(`Avertissements détectés :\n\n${warnings.join("\n")}\n\nContinuer quand même ?`);
      if (!ok) return;
    }
    setBusy(true);
    try {
      const payload = {
        structure_id: auth.structureId,
        version: editor.version.trim(),
        nom: editor.nom?.trim() || null,
        description: editor.description?.trim() || null,
        contenu_md: editor.contenu_md,
        // Alpha 0.42.0 : template etab-spécifique (null = global structure)
        etablissement_id: editor.etablissement_id || null,
        is_active: false, // jamais actif à la création
        created_by: auth.user?.id,
      };
      if (editor.id) {
        // UPDATE (brouillon non actif)
        delete payload.structure_id;
        delete payload.created_by;
        const { error } = await supabase
          .from("consent_templates")
          .update(payload)
          .eq("id", editor.id);
        if (error) throw error;
      } else {
        // INSERT
        const { error } = await supabase
          .from("consent_templates")
          .insert(payload);
        if (error) throw error;
      }
      setEditor(null);
      await load();
    } catch (e) {
      alert("Erreur : " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function activate(t) {
    const warnings = validateTemplate(t.contenu_md, customVars.map(v => v.key));
    let confirmMsg = `Activer le template ${t.version}${t.nom ? ` "${t.nom}"` : ""} ?\n\nLes nouveaux consentements utiliseront cette version. Les consentements déjà signés conservent leur ancien texte.`;
    if (warnings.length > 0) {
      confirmMsg += `\n\n⚠ Avertissements :\n${warnings.join("\n")}`;
    }
    if (!await dialogs.confirm({ title: confirmMsg, variant: "danger" })) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("consent_templates")
        .update({ is_active: true })
        .eq("id", t.id);
      if (error) throw error;
      await load();
    } catch (e) {
      alert("Erreur : " + e.message);
    } finally {
      setBusy(false);
    }
  }

  // Prévisualisation avec données mockées
  function getPreviewHtml(contenu_md) {
    const mockVars = {
      patient_nom_prenom: "Dupont Marie",
      patient_date_naissance: "1958-03-12",
      patient_numero_dossier: "D-2026-042",
      collectivite_nom: auth.structureNom || "Collectivité",
      etablissement_nom: auth.etabNom || "Hôpital Cédric",
      date_signature: new Date().toLocaleDateString("fr-FR"),
      finalites_acceptees: ["soins", "materiel", "facturation"],
    };
    const rendered = renderConsentement(contenu_md, mockVars);
    return consentementToHtml(rendered);
  }

  const activeTemplate = templates.find((t) => t.is_active);

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="CONFORMITÉ · ADMIN"
          icon="ti-shield-cog"
          title="Modèles"
          accent="de consentement RGPD"
          sub="Personnalise le texte du formulaire de consentement de ta collectivité"
        />

        {loading ? <Panel><StateMsg>Chargement…</StateMsg></Panel> : (
          <>
            {/* Bandeau template actif */}
            <Panel style={{ marginBottom: 18, borderLeft: "4px solid #5aa05a" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#142131" }}>
                    <i className="ti ti-shield-check" style={{ color: "#5aa05a", marginRight: 6 }} />
                    Template actuellement utilisé
                  </h3>
                  {activeTemplate ? (
                    <p style={{ margin: 0, fontSize: 13, color: "#2a3a48" }}>
                      <b>Version {activeTemplate.version}</b>
                      {activeTemplate.nom && <> — {activeTemplate.nom}</>}
                      <span style={{ marginLeft: 8, color: "#8a98a8", fontSize: 12 }}>
                        activé le {activeTemplate.activated_at ? new Date(activeTemplate.activated_at).toLocaleDateString("fr-FR") : "—"}
                      </span>
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13, color: "#6c7a89" }}>
                      <b>Template par défaut</b> (intégré au code Aveho) — version {VERSION_TEMPLATE}.
                      <br /><span style={{ fontSize: 12, color: "#8a98a8" }}>Aucune personnalisation pour cette collectivité. Crée-en un pour avoir un texte adapté.</span>
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", }}>
                  <Btn variant="primary" icon="ti-plus" onClick={openNewFromDefault}>
                    {templates.length === 0 ? "Créer mon template" : "Nouvelle version"}
                  </Btn>
                </div>
              </div>
            </Panel>

            {/* Alpha 0.40.0 : Variables custom de la structure */}
            <Panel style={{ marginBottom: 18, borderLeft: "4px solid #7a6fb0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: customVars.length > 0 ? 14 : 0 }}>
                <h3 style={{ margin: 0, fontSize: 16, color: "#142131" }}>
                  <i className="ti ti-variable" style={{ color: "#7a6fb0", marginRight: 6 }} />
                  Variables personnalisées ({customVars.length})
                </h3>
                <Btn variant="ghost" icon="ti-edit" onClick={openCustomVarsEditor}>
                  {customVars.length === 0 ? "Définir des variables" : "Modifier"}
                </Btn>
              </div>
              {customVars.length === 0 ? (
                <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "#6c7a89" }}>
                  Tu peux définir des variables personnalisées (ex: <code style={{ background: "#f4f7fa", padding: "1px 6px", borderRadius: 4 }}>{"{{partenaire_nom}}"}</code>) à utiliser dans tes templates de consentement. Pratique pour mentionner un partenaire technique, un télé-service, etc.
                </p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  {customVars.map((v) => (
                    <div key={v.key} style={{ background: "#fafbfc", border: "1px solid #e3e9ee", borderRadius: 8, padding: "10px 12px" }}>
                      <code style={{ fontSize: 11.5, color: "#5e4a8c", background: "#f0edf7", padding: "2px 6px", borderRadius: 4 }}>
                        {"{{"}{v.key}{"}}"}
                      </code>
                      <div style={{ fontSize: 12.5, color: "#142131", marginTop: 6, fontWeight: 600 }}>{v.label || v.key}</div>
                      <div style={{ fontSize: 11.5, color: "#6c7a89", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        → {v.value || <i>vide</i>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* Liste des templates */}
            {templates.length === 0 ? (
              <Panel>
                <div style={{ textAlign: "center", padding: "20px 12px" }}>
                  <i className="ti ti-file-text" style={{ fontSize: 40, color: "#cfd6dd", display: "block", marginBottom: 10 }} />
                  <p style={{ fontSize: 14, color: "#6c7a89", margin: "0 0 12px" }}>
                    Aucun template personnalisé. Le template par défaut (intégré au code) est utilisé.
                  </p>
                  <Btn variant="primary" icon="ti-plus" onClick={openNewFromDefault}>
                    Créer mon premier template
                  </Btn>
                </div>
              </Panel>
            ) : (
              <Panel>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: "#142131" }}>
                    <i className="ti ti-history" style={{ color: "#185FA5", marginRight: 6 }} />
                    Historique des versions ({templates.length})
                </h3>
                {/* Alpha 0.44.0 : bouton activation groupée si ≥ 2 brouillons */}
                {templates.filter(t => !t.is_active).length >= 2 && (
                  <button
                    onClick={openActMassModal}
                    style={{ background: "#fff", border: "1px solid #5aa05a", color: "#2e6f33", padding: "6px 12px", borderRadius: 6, fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                    aria-label="Activer plusieurs templates en masse"
                  >
                    <i className="ti ti-check-list" /> Activer en masse
                  </button>
                )}
                </div>
                <div className="panel-table"><table>
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>Nom</th>
                      <th>Créé le</th>
                      <th style={{ textAlign: "right" }}>Utilisations</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((t) => {
                      const usage = usageStats[t.id] || 0;
                      const canEdit = !t.is_active && usage === 0;
                      return (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 600, color: "#185FA5" }}>{t.version}</td>
                          <td>
                            {t.nom || <span style={{ color: "#8a98a8", fontStyle: "italic" }}>(sans nom)</span>}
                            {t.description && (
                              <div style={{ fontSize: 11.5, color: "#8a98a8", marginTop: 2 }}>{t.description}</div>
                            )}
                          </td>
                          <td style={{ fontSize: 12, color: "#6c7a89" }}>
                            {new Date(t.created_at).toLocaleDateString("fr-FR")}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 600, color: usage > 0 ? "#185FA5" : "#8a98a8" }}>
                            {usage}
                          </td>
                          <td>
                            {t.is_active ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 12, background: "#dff5e0", color: "#2e6f33", fontSize: 11, fontWeight: 700 }}>
                                <i className="ti ti-check" /> ACTIF
                              </span>
                            ) : canEdit ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 12, background: "#fef3e2", color: "#7a4f15", fontSize: 11, fontWeight: 700 }}>
                                <i className="ti ti-edit" /> BROUILLON
                              </span>
                            ) : (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 12, background: "#f0f0f3", color: "#5a6171", fontSize: 11, fontWeight: 700 }}>
                                <i className="ti ti-archive" /> ARCHIVÉ
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", }}>
                              <button
                                onClick={() => setPreview(t)}
                                style={{ background: "#fff", border: "1px solid #185FA5", color: "#185FA5", padding: "4px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}
                                title="Prévisualiser"
                              >
                                <i className="ti ti-eye" />
                              </button>
                              {canEdit && (
                                <button
                                  onClick={() => openEdit(t)}
                                  style={{ background: "#fff", border: "1px solid #EF9F27", color: "#a06a15", padding: "4px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}
                                  title="Modifier"
                                >
                                  <i className="ti ti-edit" />
                                </button>
                              )}
                              <button
                                onClick={() => openNewFromExisting(t)}
                                style={{ background: "#fff", border: "1px solid #7a6fb0", color: "#5e4a8c", padding: "4px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}
                                title="Dupliquer en nouvelle version"
                              >
                                <i className="ti ti-copy" />
                              </button>
                              {/* Alpha 0.43.0 : duplication vers d'autres établissements */}
                              {etablissements.length > 0 && (
                                <button
                                  onClick={() => openDupModal(t)}
                                  style={{ background: "#fff", border: "1px solid #5a8f8f", color: "#2a5a5a", padding: "4px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}
                                  title="Dupliquer vers d'autres établissements"
                                >
                                  <i className="ti ti-building-community" />
                                </button>
                              )}
                              {!t.is_active && canEdit && (
                                <button
                                  onClick={() => activate(t)}
                                  style={{ background: "#5aa05a", border: "none", color: "#fff", padding: "4px 12px", borderRadius: 6, fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                                  title="Activer ce template"
                                >
                                  <i className="ti ti-rocket" /> Activer
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table></div>
                <p style={{ fontSize: 12, color: "#8a98a8", marginTop: 12 }}>
                  <i className="ti ti-info-circle" /> Un template <b>utilisé par au moins 1 consentement signé</b> ne peut plus être modifié ni supprimé — pour préserver l'intégrité de l'audit RGPD. Pour le faire évoluer, crée une <b>nouvelle version</b>.
                </p>
              </Panel>
            )}
          </>
        )}

        {/* MODAL ÉDITEUR */}
        {editor && (
          <Modal open={true} title={editor.id ? `Modifier brouillon v${editor.version}` : `Nouveau template v${editor.version}`} onClose={() => setEditor(null)} size="lg">
            <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* Colonne gauche : édition */}
              <div>
                <div className="fld">
                  <label>Version</label>
                  <input
                    value={editor.version}
                    onChange={(e) => setEditor({ ...editor, version: e.target.value })}
                    placeholder="1.0"
                  />
                </div>
                <div className="fld">
                  <label>Nom (optionnel)</label>
                  <input
                    value={editor.nom || ""}
                    onChange={(e) => setEditor({ ...editor, nom: e.target.value })}
                    placeholder="Template 2026 — Clause télé-suivi"
                  />
                </div>
                <div className="fld">
                  <label>Description (optionnelle)</label>
                  <input
                    value={editor.description || ""}
                    onChange={(e) => setEditor({ ...editor, description: e.target.value })}
                    placeholder="Changement RGPD 2026"
                  />
                </div>
                {/* Alpha 0.42.0 : sélecteur établissement (null = global structure) */}
                <div className="fld">
                  <label>Portée du template</label>
                  <select
                    value={editor.etablissement_id || ""}
                    onChange={(e) => setEditor({ ...editor, etablissement_id: e.target.value || null })}
                    disabled={!!editor.id} // pas modifiable en édition (sinon impact existing signatures)
                  >
                    <option value="">Global (toute la structure)</option>
                    {etablissements.map((e) => (
                      <option key={e.id} value={e.id}>{e.nom}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: 11.5, color: "#6c7a89", marginTop: 4, marginBottom: 0 }}>
                    <i className="ti ti-info-circle" /> Si un établissement est sélectionné, ce template ne s'appliquera qu'aux patients de cet établissement. Sinon, c'est le template par défaut pour toute la structure.
                  </p>
                </div>
                <div className="fld">
                  <label>Contenu du template (markdown léger)</label>
                  <textarea
                    value={editor.contenu_md}
                    onChange={(e) => setEditor({ ...editor, contenu_md: e.target.value })}
                    rows={22}
                    style={{ fontFamily: "Consolas, Menlo, monospace", fontSize: 12 }}
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* Colonne droite : preview + variables */}
              <div>
                <div style={{ marginBottom: 12 }}>
                  <h4 style={{ margin: "0 0 8px", fontSize: 13, color: "#142131" }}>
                    <i className="ti ti-variable" /> Variables disponibles
                  </h4>
                  <div style={{ background: "#f4f7fa", border: "1px solid #e3e9ee", borderRadius: 8, padding: 10, fontSize: 11.5, maxHeight: 140, overflowY: "auto" }}>
                    {TEMPLATE_VARIABLES.map((v) => (
                      <div key={v.key} style={{ marginBottom: 4 }}>
                        <code
                          onClick={() => navigator.clipboard?.writeText(`{{${v.key}}}`)}
                          style={{ cursor: "pointer", color: "#185FA5", fontSize: 11 }}
                          title="Cliquer pour copier"
                        >
                          {"{{" + v.key + "}}"}
                        </code>
                        <span style={{ color: "#6c7a89", marginLeft: 6 }}>— {v.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <h4 style={{ margin: "0 0 8px", fontSize: 13, color: "#142131" }}>
                  <i className="ti ti-eye" /> Prévisualisation (données mockées)
                </h4>
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e3e9ee",
                    borderRadius: 8,
                    padding: 14,
                    fontSize: 12,
                    lineHeight: 1.5,
                    maxHeight: 380,
                    overflowY: "auto",
                  }}
                  dangerouslySetInnerHTML={{ __html: getPreviewHtml(editor.contenu_md) }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16, flexWrap: "wrap", }}>
              <button
                onClick={() => setEditor(null)}
                style={{ background: "#fff", border: "1px solid #e3e9ee", color: "#6c7a89", padding: "8px 16px", borderRadius: 8, fontFamily: "inherit", fontSize: 13, cursor: "pointer" }}
              >
                Annuler
              </button>
              <Btn variant="primary" icon="ti-device-floppy" onClick={saveTemplate} disabled={busy}>
                {busy ? "Enregistrement…" : editor.id ? "Enregistrer le brouillon" : "Créer le brouillon"}
              </Btn>
            </div>
            <p style={{ fontSize: 11.5, color: "#8a98a8", marginTop: 8, marginBottom: 0 }}>
              <i className="ti ti-info-circle" /> Le template est créé en brouillon. Active-le ensuite depuis la liste pour qu'il soit utilisé.
            </p>
          </Modal>
        )}

        {/* MODAL PREVIEW */}
        {preview && (
          <Modal open={true} title={`Prévisualisation v${preview.version}${preview.nom ? ` — ${preview.nom}` : ""}`} onClose={() => setPreview(null)} size="lg">
            <div
              style={{
                background: "#fff",
                border: "1px solid #e3e9ee",
                borderRadius: 8,
                padding: 18,
                fontSize: 13,
                lineHeight: 1.6,
                maxHeight: 600,
                overflowY: "auto",
              }}
              dangerouslySetInnerHTML={{ __html: getPreviewHtml(preview.contenu_md) }}
            />
            <p style={{ fontSize: 11.5, color: "#8a98a8", marginTop: 10 }}>
              <i className="ti ti-info-circle" /> Aperçu avec données mockées. Le texte réel utilisera les vraies infos du patient et de la collectivité.
            </p>
          </Modal>
        )}

        {/* Alpha 0.40.0 : Modale édition variables custom */}
        {customVarsModal && (
          <Modal
            open={true}
            title="Variables personnalisées"
            onClose={() => setCustomVarsModal(false)}
            size="lg"
            footer={<>
              <Btn variant="ghost" onClick={() => setCustomVarsModal(false)}>Annuler</Btn>
              <Btn variant="primary" onClick={saveCustom} disabled={customSaveBusy}>
                {customSaveBusy ? "Enregistrement…" : "Enregistrer"}
              </Btn>
            </>}
          >
            <p style={{ fontSize: 12.5, color: "#6c7a89", margin: "0 0 14px" }}>
              Définis des variables personnalisées (clé en minuscules + underscores) à utiliser dans tes templates RGPD.
              Exemple : <code style={{ background: "#f4f7fa", padding: "1px 6px", borderRadius: 4 }}>{"{{partenaire_nom}}"}</code> → "Société XYZ".
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
              {customVarsDraft.map((v, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.5fr 2fr auto", gap: 6, alignItems: "start" }}>
                  <input
                    placeholder="ma_variable"
                    value={v.key}
                    onChange={(e) => {
                      const next = [...customVarsDraft];
                      next[i] = { ...next[i], key: e.target.value.toLowerCase().replace(/[^a-z_]/g, "") };
                      setCustomVarsDraft(next);
                    }}
                    style={{ padding: "7px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 12.5, fontFamily: "Consolas, monospace" }}
                  />
                  <input
                    placeholder="Libellé visible"
                    value={v.label || ""}
                    onChange={(e) => {
                      const next = [...customVarsDraft];
                      next[i] = { ...next[i], label: e.target.value };
                      setCustomVarsDraft(next);
                    }}
                    style={{ padding: "7px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 12.5 }}
                  />
                  <input
                    placeholder="Valeur (texte qui remplace la variable)"
                    value={v.value || ""}
                    onChange={(e) => {
                      const next = [...customVarsDraft];
                      next[i] = { ...next[i], value: e.target.value };
                      setCustomVarsDraft(next);
                    }}
                    style={{ padding: "7px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 12.5 }}
                  />
                  <button
                    onClick={() => setCustomVarsDraft(customVarsDraft.filter((_, j) => j !== i))}
                    style={{ padding: "7px 10px", border: "1px solid #e3e9ee", borderRadius: 6, background: "#fff", color: "#c0392b", cursor: "pointer", fontFamily: "inherit" }}
                    title="Supprimer"
                  >
                    <i className="ti ti-trash" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setCustomVarsDraft([...customVarsDraft, { key: "", label: "", value: "" }])}
              style={{ padding: "8px 14px", border: "1px dashed #7a6fb0", borderRadius: 8, background: "#fafbfc", color: "#7a6fb0", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <i className="ti ti-plus" /> Ajouter une variable
            </button>

            <div style={{ marginTop: 16, padding: "10px 12px", background: "#f0edf7", borderRadius: 8, fontSize: 11.5, color: "#5e4a8c" }}>
              <i className="ti ti-info-circle" /> <b>Astuce</b> : utilise ces variables dans le contenu d'un template via <code style={{ background: "#fff", padding: "1px 5px", borderRadius: 3 }}>{"{{cle}}"}</code>.
              L'aperçu live et la validation des templates reconnaîtront automatiquement tes variables.
            </div>
          </Modal>
        )}

        {/* Alpha 0.43.0 : Modale duplication vers établissements */}
        {dupModal && (
          <Modal
            open={true}
            title={`Dupliquer v${dupModal.sourceTemplate.version} vers d'autres établissements`}
            onClose={() => setDupModal(null)}
            size="lg"
            footer={<>
              <Btn variant="ghost" onClick={() => setDupModal(null)}>Annuler</Btn>
              <Btn variant="primary" onClick={executerDuplication} disabled={dupBusy || dupModal.etabsSelected.size === 0}>
                {dupBusy ? "Duplication…" : `Dupliquer (${dupModal.etabsSelected.size})`}
              </Btn>
            </>}
          >
            <p style={{ fontSize: 12.5, color: "#6c7a89", margin: "0 0 14px" }}>
              Le contenu du template <b>v{dupModal.sourceTemplate.version}</b>
              {dupModal.sourceTemplate.nom ? <> ({dupModal.sourceTemplate.nom})</> : null}
              {" "}va être copié comme <b>brouillon</b> (non actif) sur chaque établissement sélectionné.
              Tu pourras ensuite l'activer manuellement par établissement.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 360, overflowY: "auto" }}>
              {etablissements.length === 0 ? (
                <p style={{ color: "#8a98a8", fontSize: 13, fontStyle: "italic" }}>Aucun établissement disponible.</p>
              ) : (
                etablissements.map((e) => {
                  const checked = dupModal.etabsSelected.has(e.id);
                  // Si le template source est déjà spécifique à cet etab → on évite de proposer
                  const isSource = dupModal.sourceTemplate.etablissement_id === e.id;
                  return (
                    <label
                      key={e.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px",
                        border: `1px solid ${checked ? "#185FA5" : "#e3e9ee"}`,
                        background: checked ? "#eef5fc" : isSource ? "#fafbfc" : "#fff",
                        borderRadius: 8,
                        cursor: isSource ? "not-allowed" : "pointer",
                        opacity: isSource ? 0.5 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isSource}
                        onChange={() => toggleEtabSelected(e.id)}
                      />
                      <i className="ti ti-building" style={{ color: "#5a8f8f" }} />
                      <span style={{ flex: 1, fontSize: 13.5, color: "#142131", fontWeight: 600 }}>{e.nom}</span>
                      {isSource && <span style={{ fontSize: 11, color: "#8a98a8", fontStyle: "italic" }}>(source)</span>}
                    </label>
                  );
                })
              )}
            </div>

            {etablissements.length > 1 && (
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button
                  onClick={() => setDupModal({ ...dupModal, etabsSelected: new Set(etablissements.filter(e => e.id !== dupModal.sourceTemplate.etablissement_id).map(e => e.id)) })}
                  style={{ padding: "4px 10px", border: "1px solid #e3e9ee", borderRadius: 6, background: "#fff", color: "#185FA5", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Tout sélectionner
                </button>
                <button
                  onClick={() => setDupModal({ ...dupModal, etabsSelected: new Set() })}
                  style={{ padding: "4px 10px", border: "1px solid #e3e9ee", borderRadius: 6, background: "#fff", color: "#6c7a89", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Tout désélectionner
                </button>
              </div>
            )}
          </Modal>
        )}

        {/* Alpha 0.44.0 : Modale activation groupée */}
        {actMassModal && (
          <Modal
            open={true}
            title="Activer plusieurs templates en masse"
            onClose={() => setActMassModal(false)}
            size="lg"
            footer={<>
              <Btn variant="ghost" onClick={() => setActMassModal(false)}>Annuler</Btn>
              <Btn 
                variant="primary" 
                onClick={executerActivationGroupee} 
                disabled={actMassBusy || actMassSelected.size === 0}
              >
                {actMassBusy ? "Activation…" : `Activer (${actMassSelected.size})`}
              </Btn>
            </>}
          >
            <p style={{ fontSize: 12.5, color: "#6c7a89", margin: "0 0 14px" }}>
              Sélectionne les templates brouillons à activer. Pour chaque établissement concerné,
              le template actuellement actif sera <b>automatiquement désactivé</b>.
            </p>

            {(() => {
              const brouillons = templates.filter(t => !t.is_active);
              if (brouillons.length === 0) {
                return <p style={{ color: "#8a98a8", fontSize: 13, fontStyle: "italic" }}>Aucun template brouillon disponible.</p>;
              }
              return (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 380, overflowY: "auto" }}>
                    {brouillons.map((t) => {
                      const checked = actMassSelected.has(t.id);
                      const etabNom = t.etablissement_id 
                        ? (etablissements.find(e => e.id === t.etablissement_id)?.nom || "Etab.")
                        : "Global";
                      return (
                        <label
                          key={t.id}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 12px",
                            border: `1px solid ${checked ? "#5aa05a" : "#e3e9ee"}`,
                            background: checked ? "#eef9ef" : "#fff",
                            borderRadius: 8, cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleActMassSel(t.id)}
                            aria-label={`Sélectionner template v${t.version}`}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#142131" }}>
                              v{t.version}
                              {t.nom && <span style={{ color: "#6c7a89", fontWeight: 400 }}> · {t.nom}</span>}
                            </div>
                            <div style={{ fontSize: 11.5, color: "#8a98a8", marginTop: 2 }}>
                              <i className={t.etablissement_id ? "ti ti-building" : "ti ti-world"} /> {etabNom}
                              {" · "}
                              <i className="ti ti-calendar" /> {t.created_at ? new Date(t.created_at).toLocaleDateString("fr-FR") : "—"}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {brouillons.length > 1 && (
                    <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                      <button
                        onClick={() => setActMassSelected(new Set(brouillons.map(t => t.id)))}
                        style={{ padding: "4px 10px", border: "1px solid #e3e9ee", borderRadius: 6, background: "#fff", color: "#5aa05a", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Tout sélectionner
                      </button>
                      <button
                        onClick={() => setActMassSelected(new Set())}
                        style={{ padding: "4px 10px", border: "1px solid #e3e9ee", borderRadius: 6, background: "#fff", color: "#6c7a89", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Tout désélectionner
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </Modal>
        )}
      </div>
    </div>
  );
}
