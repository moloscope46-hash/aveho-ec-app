"use client";
// =============================================================
//  components/WorkflowApproval.js (0.62.128)
//
//  Affiche le statut d'approbation multi-niveaux d'une ressource
//  + permet aux approbateurs autorisés de valider/refuser.
//
//  Usage :
//    <WorkflowApproval
//      resourceType="achat"
//      resourceId={achat.id}
//      auth={auth}
//      onChange={loadAchat}
//    />
// =============================================================

import { useEffect, useState, useCallback } from "react";
import { createClient } from "../../lib/supabase";

const STATUSES = {
  pending: { l: "En attente", col: "#EF9F27", ic: "ti-clock", bg: "rgba(239, 159, 39, .15)" },
  approved: { l: "Approuvé", col: "#5aa05a", ic: "ti-check", bg: "rgba(90, 160, 90, .15)" },
  rejected: { l: "Refusé", col: "#e35d5b", ic: "ti-x", bg: "rgba(227, 93, 91, .15)" },
};

export default function WorkflowApproval({ resourceType, resourceId, auth, onChange }) {
  const supabase = createClient();
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [comment, setComment] = useState("");

  const load = useCallback(async () => {
    if (!resourceType || !resourceId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("workflow_steps")
        .select("*")
        .eq("resource_type", resourceType)
        .eq("resource_id", resourceId)
        .order("step_order");
      if (!error) setSteps(data || []);
    } finally { setLoading(false); }
  }, [supabase, resourceType, resourceId]);

  useEffect(() => { load(); }, [load]);

  async function decide(step, decision) {
    setBusy(step.id);
    try {
      await supabase.from("workflow_steps").update({
        status: decision,
        decided_by: auth?.user?.id,
        decided_by_nom: auth?.user?.email,
        decided_at: new Date().toISOString(),
        comment: comment || null,
      }).eq("id", step.id);
      setComment("");
      await load();
      onChange?.();
    } finally { setBusy(null); }
  }

  if (loading) return <div style={{ padding: 12, textAlign: "center", color: "#8a98a8", fontSize: 12 }}>Chargement workflow…</div>;
  if (steps.length === 0) return <TemplatesSelector resourceType={resourceType} resourceId={resourceId} auth={auth} onApplied={load} />;

  return (
    <div style={{
      background: "linear-gradient(135deg, #fff, #fafbfc)",
      border: "1px solid #e3e9ee",
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 12, fontWeight: 700, color: "#142131", textTransform: "uppercase", letterSpacing: 0.4 }}>
        <i className="ti ti-stack-2" style={{ color: "#185FA5" }} />
        Workflow d'approbation
      </div>

      {/* Stepper visuel */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
        {steps.map((step, i) => {
          const meta = STATUSES[step.status] || STATUSES.pending;
          return (
            <div key={step.id} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 100 }}>
              <div style={{
                width: 32, height: 32,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${meta.col}, ${meta.col}cc)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 16, fontWeight: 700,
                boxShadow: `0 2px 6px ${meta.col}55`,
                flexShrink: 0,
              }}>
                <i className={`ti ${meta.ic}`} />
              </div>
              <div style={{ marginLeft: 6, flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#142131", textTransform: "uppercase", letterSpacing: 0.3 }}>
                  {step.role_label || `Niveau ${step.step_order}`}
                </div>
                <div style={{ fontSize: 10, color: meta.col, fontWeight: 700 }}>{meta.l}</div>
                {step.decided_by_nom && (
                  <div style={{ fontSize: 9.5, color: "#8a98a8" }}>{step.decided_by_nom}</div>
                )}
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: 24, height: 2, background: step.status === "approved" ? "#5aa05a" : "#cfd8e0", marginLeft: 4 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Action pour le niveau en cours */}
      {(() => {
        const current = steps.find(s => s.status === "pending");
        if (!current) return null;
        const canDecide = auth?.user?.id && (
          current.approver_user_id === auth.user.id ||
          (current.approver_role_id && auth.role?.id === current.approver_role_id) ||
          auth.role?.nom === "Administrateur"
        );
        if (!canDecide) {
          return (
            <div style={{ padding: 10, background: "#fafbfc", borderRadius: 8, fontSize: 12, color: "#5a6878", textAlign: "center" }}>
              <i className="ti ti-info-circle" style={{ color: "#EF9F27", marginRight: 4 }} />
              En attente de validation par {current.role_label || `niveau ${current.step_order}`}
            </div>
          );
        }
        return (
          <div style={{ padding: 10, background: "#fafbfc", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: "#5a6878", marginBottom: 6, fontWeight: 700 }}>
              <i className="ti ti-pencil" /> Votre décision (niveau {current.step_order})
            </div>
            <input value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="Commentaire (optionnel)"
              style={{ width: "100%", padding: "6px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 12, fontFamily: "inherit", marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => decide(current, "approved")} disabled={busy === current.id}
                style={{ flex: 1, padding: "7px 12px", background: "linear-gradient(135deg, #5aa05a, #3d7a3d)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}>
                <i className="ti ti-check" /> Approuver
              </button>
              <button onClick={() => decide(current, "rejected")} disabled={busy === current.id}
                style={{ flex: 1, padding: "7px 12px", background: "linear-gradient(135deg, #e35d5b, #c0392b)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}>
                <i className="ti ti-x" /> Refuser
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// 0.62.132 : Sélecteur de templates pour lancer un workflow
function TemplatesSelector({ resourceType, resourceId, auth, onApplied }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(null);

  useEffect(() => {
    async function load() {
      if (!auth?.structureId) return;
      try {
        const { listTemplatesForResource } = await import("../../lib/workflowHelpers");
        const list = await listTemplatesForResource(resourceType, auth.structureId);
        setTemplates(list);
      } finally { setLoading(false); }
    }
    load();
  }, [resourceType, auth?.structureId]);

  async function apply(template) {
    setApplying(template.id);
    try {
      const { applyTemplate } = await import("../../lib/workflowHelpers");
      const result = await applyTemplate({
        template,
        resourceType,
        resourceId,
        structureId: auth.structureId,
        userId: auth.user?.id,
      });
      if (result.ok) {
        try {
          const { toast } = await import("./ui-premium");
          toast?.success?.(`Workflow "${template.nom}" appliqué (${result.stepsCreated} étapes)`);
        } catch {}
        onApplied?.();
      } else {
        alert("Erreur : " + result.error);
      }
    } finally { setApplying(null); }
  }

  if (loading) return null;
  if (templates.length === 0) return null;

  const canTrigger = auth?.user?.id && (auth.role?.nom === "Administrateur" || auth.can?.("gerer_roles"));
  if (!canTrigger) return null;

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(122, 111, 176, .08), #fff)",
      border: "1px solid rgba(122, 111, 176, .25)",
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 12, fontWeight: 700, color: "#5e4a8c", textTransform: "uppercase", letterSpacing: 0.4 }}>
        <i className="ti ti-stack-2" />
        Lancer un workflow d'approbation
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
        {templates.map(t => {
          const isApplying = applying === t.id;
          const nbSteps = (t.steps_json || []).length;
          return (
            <button key={t.id} onClick={() => apply(t)} disabled={isApplying}
              style={{
                padding: "10px 12px",
                background: "#fff",
                border: "1.5px solid #e3e9ee",
                borderLeft: `4px solid ${t.couleur || "#7a6fb0"}`,
                borderRadius: 10,
                cursor: isApplying ? "wait" : "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                transition: "all 200ms",
                opacity: isApplying ? 0.5 : 1,
              }}
              onMouseEnter={(e) => { if (!isApplying) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 4px 12px ${t.couleur || "#7a6fb0"}33`; } }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <i className={`ti ${t.icone || "ti-stack-2"}`} style={{ fontSize: 18, color: t.couleur || "#7a6fb0" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "#142131" }}>{t.nom}</div>
                  {t.description && <div style={{ fontSize: 10, color: "#8a98a8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description}</div>}
                </div>
                <span style={{ fontSize: 9, background: "#eef6fc", color: "#185FA5", padding: "1px 6px", borderRadius: 8, fontWeight: 700, flexShrink: 0 }}>
                  {nbSteps} étape{nbSteps > 1 ? "s" : ""}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
