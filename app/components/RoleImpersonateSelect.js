"use client";
// =============================================================
//  RoleImpersonateSelect — Voir l'app "comme" un autre rôle
//  Visible seulement pour les admins
//  Stocke le rôle simulé dans localStorage
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";

const STORAGE_KEY = "av-impersonate-role-id";

export function isAdmin(auth) {
  if (!auth) return false;
  return auth.role?.systeme === "admin" || 
         (auth.role?.nom || "").toLowerCase().includes("admin") ||
         (auth.role?.permissions_json || []).includes("admin");
}

export function getImpersonatedRoleId() {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
}

export function setImpersonatedRoleId(id) {
  if (typeof window === "undefined") return;
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  // Recharger pour appliquer
  window.location.reload();
}

export default function RoleImpersonateSelect({ auth }) {
  const supabase = createClient();
  const [roles, setRoles] = useState([]);
  const [impersonating, setImpersonating] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!auth?.structureId) return;
    if (!isAdmin(auth)) return;
    
    setImpersonating(getImpersonatedRoleId());

    (async () => {
      const r = await supabase.from("roles")
        .select("id, nom, icone, couleur, permissions_json")
        .eq("structure_id", auth.structureId)
        .order("nom");
      setRoles(r.data || []);
    })();
  }, [auth?.structureId]);

  if (!isAdmin(auth) && !impersonating) return null;

  const current = roles.find(r => r.id === impersonating);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        title={impersonating ? `Mode vu comme : ${current?.nom || "Rôle"}` : "Simuler un rôle"}
        style={{
          padding: "6px 12px",
          borderRadius: 10,
          background: impersonating ? "linear-gradient(135deg, #EF9F27, #d4881a)" : "rgba(255,255,255,.08)",
          color: "#fff",
          border: `1px solid ${impersonating ? "#EF9F2780" : "rgba(255,255,255,.15)"}`,
          fontSize: 11, fontWeight: 700,
          fontFamily: "Quicksand, sans-serif",
          cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 6,
          animation: impersonating ? "av-impersonate-pulse 2s ease-in-out infinite" : "none",
        }}
      >
        <i className={`ti ${impersonating ? "ti-user-bolt" : "ti-eye"}`} />
        {impersonating ? `Vu comme : ${current?.nom || "..."}` : "Voir comme"}
        <i className="ti ti-chevron-down" style={{ fontSize: 10 }} />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{
            position: "fixed", inset: 0, zIndex: 9990,
          }} />
          <div style={{
            position: "absolute", top: 50, right: 0,
            width: 320,
            background: "linear-gradient(135deg, #0e1a2a, #142131)",
            border: "1px solid rgba(255,255,255,.10)",
            borderRadius: 14,
            boxShadow: "0 12px 32px rgba(0,0,0,.5)",
            zIndex: 9991,
            padding: 12,
            fontFamily: "Quicksand, sans-serif",
            maxHeight: "70vh",
            overflowY: "auto",
          }}>
            <h3 style={{ margin: "0 0 10px", color: "#fff", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>
              <i className="ti ti-user-search" style={{ marginRight: 6, color: "#EF9F27" }} />
              Simuler un rôle utilisateur
            </h3>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)", marginBottom: 10 }}>
              Voir l'application comme si tu avais ces permissions
            </div>

            {impersonating && (
              <button
                onClick={() => setImpersonatedRoleId(null)}
                style={{
                  width: "100%", padding: "10px 14px",
                  background: "linear-gradient(135deg, #5aa05a, #4a8a4a)",
                  color: "#fff", border: "none",
                  borderRadius: 10,
                  fontFamily: "Quicksand", fontWeight: 800, fontSize: 12,
                  cursor: "pointer",
                  marginBottom: 10,
                  boxShadow: "0 4px 12px rgba(90,160,90,.4)",
                }}
              >
                <i className="ti ti-arrow-back-up" /> RETOUR ADMINISTRATEUR
              </button>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {roles.map(r => {
                const isCurrent = r.id === impersonating;
                return (
                  <button
                    key={r.id}
                    onClick={() => setImpersonatedRoleId(r.id)}
                    disabled={isCurrent}
                    style={{
                      padding: "10px 12px",
                      background: isCurrent ? `${r.couleur || "#7CC8C8"}30` : "rgba(255,255,255,.04)",
                      color: "#fff",
                      border: `1px solid ${isCurrent ? (r.couleur || "#7CC8C8") + "60" : "rgba(255,255,255,.08)"}`,
                      borderRadius: 8,
                      cursor: isCurrent ? "default" : "pointer",
                      fontFamily: "Quicksand",
                      textAlign: "left",
                      display: "flex", alignItems: "center", gap: 10,
                      fontSize: 12,
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: `${r.couleur || "#7CC8C8"}30`,
                      color: r.couleur || "#7CC8C8",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14,
                    }}>
                      <i className={`ti ${r.icone || "ti-user"}`} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{r.nom}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,.5)" }}>
                        {(r.permissions_json || []).length} permissions
                      </div>
                    </div>
                    {isCurrent && <i className="ti ti-check" style={{ color: r.couleur || "#7CC8C8" }} />}
                  </button>
                );
              })}
            </div>

            <style jsx global>{`
              @keyframes av-impersonate-pulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(239,159,39,.5); }
                50%      { box-shadow: 0 0 0 6px rgba(239,159,39,0); }
              }
            `}</style>
          </div>
        </>
      )}
    </>
  );
}

// =============================================================
//  Banner d'avertissement quand mode impersonate actif
// =============================================================
export function ImpersonateBanner({ auth }) {
  const [roleNom, setRoleNom] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    const id = getImpersonatedRoleId();
    if (!id) return;
    (async () => {
      const r = await supabase.from("roles").select("nom, couleur").eq("id", id).maybeSingle();
      setRoleNom(r.data);
    })();
  }, []);

  if (!roleNom) return null;

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 999,
      padding: "8px 16px",
      background: "linear-gradient(90deg, rgba(239,159,39,.25), rgba(239,159,39,.10))",
      borderBottom: "1px solid rgba(239,159,39,.40)",
      display: "flex", alignItems: "center", gap: 10,
      fontFamily: "Quicksand, sans-serif",
      color: "#fff",
      fontSize: 12, fontWeight: 700,
      backdropFilter: "blur(8px)",
    }}>
      <i className="ti ti-eye" style={{ color: "#EF9F27", fontSize: 16, filter: "drop-shadow(0 0 4px #EF9F27)" }} />
      <span>Mode <strong>"Voir comme"</strong> actif : <span style={{ color: roleNom.couleur || "#EF9F27" }}>{roleNom.nom}</span></span>
      <span style={{ flex: 1 }} />
      <button onClick={() => setImpersonatedRoleId(null)} style={{
        background: "rgba(255,255,255,.10)", color: "#fff",
        border: "1px solid rgba(255,255,255,.20)",
        padding: "4px 12px", borderRadius: 8,
        fontFamily: "Quicksand", fontWeight: 700, fontSize: 11,
        cursor: "pointer",
      }}>
        <i className="ti ti-x" /> Sortir
      </button>
    </div>
  );
}
