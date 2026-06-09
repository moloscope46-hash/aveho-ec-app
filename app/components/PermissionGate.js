"use client";
import { useAuth } from "../../lib/useAuth";

export default function PermissionGate({ require, children, fallback }) {
  const auth = useAuth();
  if (!auth.ready) return null;
  if (!require) return children;

  const hasPermission = auth.can?.(require) ||
    (auth.role?.permissions_json || []).includes(require) ||
    auth.role?.systeme === "admin" ||
    (auth.role?.nom || "").toLowerCase().includes("admin");

  if (!hasPermission) {
    return fallback || (
      <div style={{
        minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center",
        padding: 40, fontFamily: "Quicksand, sans-serif",
      }}>
        <div style={{
          maxWidth: 480, padding: 32, borderRadius: 16,
          background: "linear-gradient(135deg, rgba(212,94,94,.10), rgba(212,94,94,.05))",
          border: "1px solid rgba(212,94,94,.30)", textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🔒</div>
          <h2 style={{ color: "#fff", marginTop: 0 }}>Accès restreint</h2>
          <p style={{ color: "rgba(255,255,255,.7)" }}>
            Cette page est réservée aux rôles ayant la permission <strong>{require}</strong>.
          </p>
        </div>
      </div>
    );
  }
  return children;
}
