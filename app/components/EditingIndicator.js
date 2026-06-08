"use client";
// =============================================================
//  components/EditingIndicator.js (0.62.126)
//
//  Indicateur visuel dans la TopBar quand l'utilisateur courant
//  détient un lock d'édition (i.e. il est en train d'éditer
//  quelque chose). S'affiche en pill animée avec compteur.
//
//  Détecte les locks via fetch sur la table edit_locks.
//  Refresh toutes les 20s. Cache résiste aux changements de page.
// =============================================================

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";

const REFRESH_INTERVAL = 20 * 1000; // 20s

export default function EditingIndicator() {
  const supabase = createClient();
  const auth = useAuth();
  const [myLocks, setMyLocks] = useState([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!auth?.user?.id) return;
    let alive = true;

    async function check() {
      try {
        const { data, error } = await supabase
          .from("edit_locks")
          .select("resource_type, resource_id, locked_at")
          .eq("user_id", auth.user.id)
          .gte("locked_at", new Date(Date.now() - 120 * 1000).toISOString());
        if (!alive) return;
        if (error) {
          // Table peut ne pas exister → silencieux
          setMyLocks([]);
          return;
        }
        setMyLocks(data || []);
      } catch {
        if (alive) setMyLocks([]);
      }
    }

    check();
    const interval = setInterval(check, REFRESH_INTERVAL);
    return () => { alive = false; clearInterval(interval); };
  }, [auth?.user?.id, supabase]);

  // Affiche uniquement si on a au moins 1 lock actif
  const count = myLocks.length;
  if (count === 0) return null;

  // Label adapté
  const types = [...new Set(myLocks.map(l => l.resource_type))];
  const label = types.length === 1 ?
    `Édition ${types[0]}` :
    `${count} éditions en cours`;

  return (
    <div
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        background: "linear-gradient(135deg, rgba(239, 159, 39, .25), rgba(124, 200, 200, .20))",
        border: "1px solid rgba(239, 159, 39, .45)",
        borderRadius: 12,
        color: "#fff",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.3,
        cursor: "help",
        whiteSpace: "nowrap",
        flexShrink: 0,
        animation: "av-editing-pulse 2.5s ease-in-out infinite",
      }}
    >
      <i className="ti ti-pencil" style={{ fontSize: 12, color: "#EF9F27" }} />
      <span style={{ display: "none" }} className="editing-label-text">{label}</span>
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 16,
        height: 16,
        padding: "0 4px",
        background: "#EF9F27",
        color: "#fff",
        borderRadius: 8,
        fontSize: 10,
        fontWeight: 800,
      }}>
        {count}
      </span>

      {/* Tooltip détaillé */}
      {show && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          background: "rgba(20, 33, 49, 0.96)",
          color: "#fff",
          padding: "10px 14px",
          borderRadius: 10,
          fontSize: 11.5,
          whiteSpace: "nowrap",
          boxShadow: "0 8px 24px rgba(0, 0, 0, .35)",
          zIndex: 1000,
          backdropFilter: "blur(10px)",
          animation: "av-fade-in 200ms ease-out",
          minWidth: 200,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: "#EF9F27" }}>
            <i className="ti ti-lock" style={{ marginRight: 4 }} />
            {count} verrou{count > 1 ? "x" : ""} actif{count > 1 ? "s" : ""}
          </div>
          {myLocks.slice(0, 5).map((lock, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <i className="ti ti-pencil" style={{ color: "#7CC8C8", fontSize: 11 }} />
              <span>{lock.resource_type}</span>
              <code style={{ marginLeft: "auto", fontSize: 9, color: "#8a98a8", fontFamily: "Consolas, monospace" }}>
                {lock.resource_id?.substring(0, 6)}…
              </code>
            </div>
          ))}
          {count > 5 && <div style={{ marginTop: 4, fontStyle: "italic", color: "#8a98a8" }}>… et {count - 5} autres</div>}
          <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,.15)", fontSize: 10, color: "#8a98a8" }}>
            Les verrous expirent automatiquement après 2 min d'inactivité.
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes av-editing-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 159, 39, .35); }
          50% { transform: scale(1.02); box-shadow: 0 0 0 4px rgba(239, 159, 39, 0); }
        }
        @media (min-width: 769px) {
          .editing-label-text { display: inline !important; }
        }
      `}</style>
    </div>
  );
}
