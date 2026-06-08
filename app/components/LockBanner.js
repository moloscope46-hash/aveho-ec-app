"use client";
// =============================================================
//  components/LockBanner.js (0.62.123)
//
//  Bannière à afficher en haut d'une modal d'édition quand
//  un autre utilisateur est en train d'éditer la même ressource.
//
//  Usage :
//    const { locked, lockedBy, takeover, ownLock } = useEditLock("patient", id, !!id);
//    return (
//      <>
//        {locked && <LockBanner lockedBy={lockedBy} onTakeover={takeover} />}
//        <form>...</form>
//      </>
//    );
// =============================================================

export default function LockBanner({
  lockedBy,
  onTakeover,
  resourceLabel = "cette ressource",
}) {
  if (!lockedBy) return null;
  const nom = lockedBy.nom || lockedBy.email || "Un autre utilisateur";
  const since = lockedBy.locked_at ? new Date(lockedBy.locked_at) : null;
  const minAgo = since ? Math.round((Date.now() - since.getTime()) / 60000) : null;

  return (
    <div className="av-edit-lock-banner">
      <i className="ti ti-lock lock-icon" />
      <div className="lock-text">
        <div className="lock-title">Édition en cours</div>
        <div className="lock-detail">
          <strong>{nom}</strong> est en train de modifier {resourceLabel}
          {minAgo !== null && minAgo > 0 && ` depuis ${minAgo} min`}.
          Vous pouvez attendre la fin ou reprendre la main.
        </div>
      </div>
      {onTakeover && (
        <button
          onClick={onTakeover}
          style={{
            background: "linear-gradient(135deg, #EF9F27, #e35d5b)",
            color: "#fff",
            border: "none",
            padding: "10px 16px",
            borderRadius: 10,
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 13,
            fontWeight: 700,
            whiteSpace: "nowrap",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(239, 159, 39, .35)",
            transition: "all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(239, 159, 39, .45)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 159, 39, .35)"; }}
        >
          <i className="ti ti-arrow-back-up" style={{ marginRight: 4 }} />
          Reprendre la main
        </button>
      )}
    </div>
  );
}
