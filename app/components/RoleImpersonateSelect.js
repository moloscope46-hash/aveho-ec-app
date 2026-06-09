"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";

const STORAGE_KEY = "av-impersonate-role-id";

export function isAdmin(auth) {
  if (!auth) return false;
  if (auth.role?.systeme === true) return true;
  const nom = (auth.role?.nom || "").toLowerCase();
  if (nom.includes("admin")) return true;
  const perms = auth.role?.permissions_json || auth.permissions || [];
  if (Array.isArray(perms) && perms.includes("admin")) return true;
  return false;
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
  window.location.reload();
}

export default function RoleImpersonateSelect({ auth }) {
  const supabase = createClient();
  const [roles, setRoles] = useState([]);
  const [impersonating, setImpersonating] = useState(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!auth?.structureId) return;
    setImpersonating(getImpersonatedRoleId());

    (async () => {
      // 1) Tentative complète
      let r = await supabase.from("roles")
        .select("id, nom, icone, couleur, permissions_json, systeme")
        .eq("structure_id", auth.structureId)
        .order("nom");
      // 2) Fallback minimal si colonnes manquent
      if (r.error) {
        console.warn("Roles full select failed, fallback to id,nom:", r.error.message);
        r = await supabase.from("roles").select("id, nom").eq("structure_id", auth.structureId).order("nom");
      }
      if (r.error) { setError(r.error.message); return; }
      setRoles(r.data || []);
    })();
  }, [auth?.structureId]);

  const userIsAdmin = isAdmin(auth);
  if (!userIsAdmin && !impersonating) return null;

  const current = roles.find(r => r.id === impersonating);

  return (
    <>
      <button onClick={() => setOpen(!open)} title={impersonating ? `Vu comme : ${current?.nom || "Rôle"}` : "Simuler un rôle"}
        style={{
          padding: "6px 12px", borderRadius: 10,
          background: impersonating ? "linear-gradient(135deg, #EF9F27, #d4881a)" : "rgba(255,255,255,.08)",
          color: "#fff", border: `1px solid ${impersonating ? "#EF9F2780" : "rgba(255,255,255,.15)"}`,
          fontSize: 11, fontWeight: 700, fontFamily: "Quicksand, sans-serif", cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 6,
          animation: impersonating ? "av-impersonate-pulse 2s ease-in-out infinite" : "none",
        }}>
        <i className={`ti ${impersonating ? "ti-user-bolt" : "ti-eye"}`} />
        {impersonating ? `Vu : ${current?.nom?.substring(0, 14) || "..."}` : "Voir comme"}
        <i className="ti ti-chevron-down" style={{ fontSize: 10 }} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9990 }} />
          <div style={{
            position: "absolute", top: 50, right: 0, width: 340,
            background: "linear-gradient(135deg, #0e1a2a, #142131)",
            border: "1px solid rgba(255,255,255,.10)", borderRadius: 14,
            boxShadow: "0 12px 32px rgba(0,0,0,.5)", zIndex: 9991, padding: 12,
            fontFamily: "Quicksand, sans-serif", maxHeight: "70vh", overflowY: "auto",
          }}>
            <h3 style={{ margin: "0 0 10px", color: "#fff", fontSize: 13, fontWeight: 800, textTransform: "uppercase" }}>
              <i className="ti ti-user-search" style={{ marginRight: 6, color: "#EF9F27" }} />
              Simuler un rôle ({roles.length})
            </h3>
            {error && (
              <div style={{ padding: 10, background: "rgba(212,94,94,.20)", color: "#D45E5E", borderRadius: 8, fontSize: 11, marginBottom: 10 }}>
                <strong>Erreur SQL :</strong><br />{error}<br />
                <em>→ Exécute aveho-FIX-400-colonnes-manquantes.sql</em>
              </div>
            )}
            {impersonating && (
              <button onClick={() => setImpersonatedRoleId(null)} style={{
                width: "100%", padding: "10px 14px",
                background: "linear-gradient(135deg, #5aa05a, #4a8a4a)",
                color: "#fff", border: "none", borderRadius: 10,
                fontFamily: "Quicksand", fontWeight: 800, fontSize: 12, cursor: "pointer", marginBottom: 10,
              }}>
                <i className="ti ti-arrow-back-up" /> RETOUR ADMINISTRATEUR
              </button>
            )}
            {roles.length === 0 && !error && (
              <div style={{ padding: 16, textAlign: "center", color: "rgba(255,255,255,.4)", fontSize: 11 }}>
                <i className="ti ti-loader-2" /> Chargement...
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {roles.map(r => {
                const isCurrent = r.id === impersonating;
                const couleur = r.couleur || "#7CC8C8";
                const icone = r.icone || "ti-user";
                const perms = r.permissions_json || [];
                return (
                  <button key={r.id} onClick={() => setImpersonatedRoleId(r.id)} disabled={isCurrent} style={{
                    padding: "10px 12px",
                    background: isCurrent ? `${couleur}30` : "rgba(255,255,255,.04)",
                    color: "#fff", border: `1px solid ${isCurrent ? couleur + "60" : "rgba(255,255,255,.08)"}`,
                    borderRadius: 8, cursor: isCurrent ? "default" : "pointer", fontFamily: "Quicksand",
                    textAlign: "left", display: "flex", alignItems: "center", gap: 10, fontSize: 12,
                  }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${couleur}30`, color: couleur, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                      <i className={`ti ${icone}`} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{r.nom}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,.5)" }}>
                        {Array.isArray(perms) ? perms.length : 0} perms{r.systeme && " · 🛡"}
                      </div>
                    </div>
                    {isCurrent && <i className="ti ti-check" style={{ color: couleur }} />}
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

export function ImpersonateBanner({ auth }) {
  const [roleNom, setRoleNom] = useState(null);
  const supabase = createClient();
  useEffect(() => {
    const id = getImpersonatedRoleId();
    if (!id) return;
    (async () => {
      try {
        let r = await supabase.from("roles").select("nom, couleur").eq("id", id).maybeSingle();
        if (r.error) r = await supabase.from("roles").select("nom").eq("id", id).maybeSingle();
        setRoleNom(r.data);
      } catch (e) {}
    })();
  }, []);
  if (!roleNom) return null;
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 999, padding: "8px 16px",
      background: "linear-gradient(90deg, rgba(239,159,39,.25), rgba(239,159,39,.10))",
      borderBottom: "1px solid rgba(239,159,39,.40)",
      display: "flex", alignItems: "center", gap: 10,
      fontFamily: "Quicksand, sans-serif", color: "#fff", fontSize: 12, fontWeight: 700,
      backdropFilter: "blur(8px)",
    }}>
      <i className="ti ti-eye" style={{ color: "#EF9F27", fontSize: 16 }} />
      <span>Mode <strong>"Voir comme"</strong> : <span style={{ color: roleNom.couleur || "#EF9F27" }}>{roleNom.nom}</span></span>
      <span style={{ flex: 1 }} />
      <button onClick={() => setImpersonatedRoleId(null)} style={{
        background: "rgba(255,255,255,.10)", color: "#fff",
        border: "1px solid rgba(255,255,255,.20)", padding: "4px 12px", borderRadius: 8,
        fontFamily: "Quicksand", fontWeight: 700, fontSize: 11, cursor: "pointer",
      }}>
        <i className="ti ti-x" /> Sortir
      </button>
    </div>
  );
}
