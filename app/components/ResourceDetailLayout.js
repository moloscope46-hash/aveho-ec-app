"use client";
// =============================================================
//  components/ResourceDetailLayout.js (0.63.0)
//
//  Layout générique pour les pages détail /xxx/[id].
//  Combine : Header + Workflow + Pièces jointes + Activité + Children.
//
//  Évite de dupliquer le pattern pour chaque module.
//
//  Usage :
//    <ResourceDetailLayout
//      resourceType="signalement"
//      resourceId={params.id}
//      icon="ti-alert-circle"
//      iconColor="#EF9F27"
//      title="Signalement #SIG-2026-0142"
//      subtitle="EHPAD Bellevue · Lit instable"
//      backHref="/signalements"
//      auth={auth}
//      enableWorkflow={true}
//      enableAttachments={true}
//    >
//      <DetailRichContent />
//    </ResourceDetailLayout>
// =============================================================

import { useRouter } from "next/navigation";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn } from "../ui";
import WorkflowApproval from "./WorkflowApproval";
import AttachmentsPanel from "./AttachmentsPanel";

export default function ResourceDetailLayout({
  resourceType,
  resourceId,
  icon = "ti-file",
  iconColor = "#185FA5",
  title,
  subtitle,
  badges = [],
  backHref,
  backLabel = "Retour",
  auth,
  enableWorkflow = true,
  enableAttachments = true,
  onWorkflowChange,
  headerActions,
  loading = false,
  error = null,
  children,
}) {
  const router = useRouter();
  const cart = useCart();

  if (!auth?.user) return <div className="bg-dark"><div style={{ padding: 40, color: "#fff" }}>Authentification…</div></div>;

  if (loading) return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>
          <i className="ti ti-loader-2" style={{ animation: "av-spinner-spin 0.85s linear infinite", fontSize: 30 }} />
          <div style={{ marginTop: 10 }}>Chargement…</div>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <Panel>
          <div style={{ padding: 30, textAlign: "center" }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 36, color: "#e35d5b", display: "block", marginBottom: 8 }} />
            <div style={{ color: "#e35d5b", fontWeight: 700, marginBottom: 14, fontSize: 14 }}>{error}</div>
            {backHref && <Btn variant="primary" onClick={() => router.push(backHref)}>← {backLabel}</Btn>}
          </div>
        </Panel>
      </div>
    </div>
  );

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          icon={icon}
          title={title}
          accent="teal"
          eyebrow={`DÉTAIL ${(resourceType || "").toUpperCase()}`}
          sub={subtitle}
          actions={<>
            {headerActions}
            {backHref && <Btn variant="ghost" icon="ti-arrow-left" onClick={() => router.push(backHref)}>{backLabel}</Btn>}
          </>}
        />

        {/* Badges */}
        {badges.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {badges.map((b, i) => (
              <span key={i} style={{
                padding: "5px 12px",
                background: b.color + "22",
                color: b.color,
                borderRadius: 16,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.3,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}>
                {b.icon && <i className={`ti ${b.icon}`} />}
                {b.label}
              </span>
            ))}
          </div>
        )}

        {/* Content principal */}
        <Panel style={{ marginBottom: 14 }}>
          {children}
        </Panel>

        {/* Workflow */}
        {enableWorkflow && resourceId && (
          <Panel style={{ marginBottom: 14 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#142131", display: "flex", alignItems: "center", gap: 6 }}>
              <i className="ti ti-stack-2" style={{ color: "#7a6fb0" }} />
              Workflow d'approbation
            </h3>
            <WorkflowApproval
              resourceType={resourceType}
              resourceId={resourceId}
              auth={auth}
              onChange={onWorkflowChange}
            />
          </Panel>
        )}

        {/* Pièces jointes */}
        {enableAttachments && resourceId && (
          <Panel>
            <AttachmentsPanel
              resourceType={resourceType}
              resourceId={resourceId}
              structureId={auth.structureId}
              readOnly={false}
            />
          </Panel>
        )}
      </div>
    </div>
  );
}

// ============================================================
//  Helper : InfoBlock pour afficher des stats/infos en grid
// ============================================================
export function InfoBlock({ label, value, icon, color = "#185FA5", highlight = false }) {
  return (
    <div style={{
      padding: 12,
      background: highlight ? `linear-gradient(135deg, ${color}18, #fff)` : "#fff",
      border: `1px solid ${highlight ? color + "55" : "#e3e9ee"}`,
      borderRadius: 10,
      display: "flex",
      alignItems: "center",
      gap: 10,
    }}>
      {icon && <i className={`ti ${icon}`} style={{ fontSize: 22, color, flexShrink: 0 }} />}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 9.5, color: "#8a98a8", textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 700, marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 14, color: "#142131", fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  );
}
