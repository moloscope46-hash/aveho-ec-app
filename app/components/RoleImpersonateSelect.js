"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";

const STORAGE_KEY = "av-impersonate-role-id";

const FAMILLES = {
  direction:  { lbl: "Direction",   col: "#142131", ic: "ti-crown" },
  medical:    { lbl: "Médical",     col: "#C9867F", ic: "ti-stethoscope" },
  technique:  { lbl: "Technique",   col: "#7a6fb0", ic: "ti-tool" },
  logistique: { lbl: "Logistique",  col: "#185FA5", ic: "ti-truck" },
  commercial: { lbl: "Commercial",  col: "#5aa05a", ic: "ti-handshake" },
  admin:      { lbl: "Administratif",col: "#EF9F27", ic: "ti-calculator" },
  support:    { lbl: "Support",     col: "#7CC8C8", ic: "ti-help" },
  had:        { lbl: "HAD",         col: "#D45E5E", ic: "ti-home-heart" },
  caisse:     { lbl: "Caisse",      col: "#EF9F27", ic: "ti-cash-register" },
  autre:      { lbl: "Autre",       col: "#5e4a8c", ic: "ti-shield" },
};

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
  const [familyOpen, setFamilyOpen] = useState({});
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!auth?.structureId) return;
    setImpersonating(getImpersonatedRoleId());

    (async () => {
      let r = await supabase.from("roles")
        .select("id, nom, icone, couleur, permissions_json, systeme, famille_metier, ordre_affichage")
        .eq("structure_id", auth.structureId)
        .order("ordre_affichage", { ascending: true });
      if (r.error) {
        r = await supabase.from("roles").select("id, nom").eq("structure_id", auth.structureId).order("nom");
      }
      if (r.error) { setError(r.error.message); return; }
      setRoles(r.data || []);
    })();
  }, [auth?.structureId]);

  const userIsAdmin = isAdmin(auth);
  if (!userIsAdmin && !impersonating) return null;

  const current = roles.find(r => r.id === impersonating);
  
  // Grouper par famille
  const grouped = roles.reduce((acc, r) => {
    const fam = r.famille_metier || (r.systeme ? "direction" : "autre");
    if (!acc[fam]) acc[fam] = [];
    acc[fam].push(r);
    return acc;
  }, {});
  
  // Filtrer par recherche
  const filteredGrouped = Object.entries(grouped).reduce((acc, [fam, list]) => {
    const filtered = search 
      ? list.filter(r => r.nom.toLowerCase().includes(search.toLowerCase()))
      : list;
    if (filtered.length > 0) acc[fam] = filtered;
    return acc;
  }, {});

  return (
    <>
      <button onClick={() => setOpen(!open)} title={impersonating ? `Vu : ${current?.nom}` : "Simuler"}
        style={{
          padding: "6px 12px", borderRadius: 10,
          background: impersonating ? "linear-gradient(135deg, #EF9F27, #d4881a)" : "rgba(255,255,255,.08)",
          color: "#fff", border: `1px solid ${impersonating ? "#EF9F2780" : "rgba(255,255,255,.15)"}`,
          fontSize: 11, fontWeight: 700, fontFamily: "Quicksand, sans-serif", cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 6,
          animation: impersonating ? "av-impersonate-pulse 2s ease-in-out infinite" : "none",
        }}>
        <i className={`ti ${impersonating ? "ti-user-bolt" : "ti-eye"}`} />
        {impersonating ? `Vu : ${(current?.nom || "...").substring(0, 14)}` : "Voir comme"}
        <i className="ti ti-chevron-down" style={{ fontSize: 10 }} />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9990 }} />
          <div style={{
            position: "absolute", top: 50, right: 0, width: 360,
            background: "linear-gradient(135deg, #0e1a2a, #142131)",
            border: "1px solid rgba(255,255,255,.10)", borderRadius: 14,
            boxShadow: "0 12px 32px rgba(0,0,0,.5)", zIndex: 9991, padding: 12,
            fontFamily: "Quicksand, sans-serif", maxHeight: "80vh", overflowY: "auto",
          }}>
            <h3 style={{ margin: "0 0 8px", color: "#fff", fontSize: 13, fontWeight: 800, textTransform: "uppercase" }}>
              <i className="ti ti-user-search" style={{ marginRight: 6, color: "#EF9F27" }} />
              Voir l'app comme... ({roles.length})
            </h3>

            <input
              placeholder="Rechercher un rôle..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "8px 12px",
                background: "rgba(255,255,255,.06)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,.10)",
                borderRadius: 8, fontFamily: "Quicksand", fontSize: 12,
                marginBottom: 10, boxSizing: "border-box",
              }}
            />

            {error && (
              <div style={{ padding: 10, background: "rgba(212,94,94,.20)", color: "#D45E5E", borderRadius: 8, fontSize: 11, marginBottom: 10 }}>
                <strong>Erreur :</strong><br />{error}
              </div>
            )}

            {impersonating && (
              <button onClick={() => setImpersonatedRoleId(null)} style={{
                width: "100%", padding: "10px 14px",
                background: "linear-gradient(135deg, #5aa05a, #4a8a4a)",
                color: "#fff", border: "none", borderRadius: 10,
                fontFamily: "Quicksand", fontWeight: 800, fontSize: 12, cursor: "pointer", marginBottom: 10,
              }}>
                <i className="ti ti-arrow-back-up" /> RETOUR ADMIN
              </button>
            )}

            {/* Familles cliquables */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {Object.entries(filteredGrouped).sort(([a], [b]) => {
                const oa = FAMILLES[a]?.col === "#142131" ? 0 : 1;
                const ob = FAMILLES[b]?.col === "#142131" ? 0 : 1;
                return oa - ob;
              }).map(([fam, list]) => {
                const f = FAMILLES[fam] || FAMILLES.autre;
                const isOpen = familyOpen[fam] || !!search;
                return (
                  <div key={fam}>
                    <button onClick={() => setFamilyOpen(p => ({ ...p, [fam]: !isOpen }))} style={{
                      width: "100%", padding: "8px 10px",
                      background: `${f.col}25`,
                      color: "#fff",
                      border: `1px solid ${f.col}40`,
                      borderRadius: 8, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 8,
                      fontFamily: "Quicksand", fontSize: 12, fontWeight: 700,
                      textAlign: "left",
                    }}>
                      <i className={`ti ${f.ic}`} style={{ color: f.col, fontSize: 16 }} />
                      <span style={{ flex: 1 }}>{f.lbl}</span>
                      <span style={{ background: `${f.col}40`, color: "#fff", padding: "1px 6px", borderRadius: 4, fontSize: 10 }}>{list.length}</span>
                      <i className={`ti ti-chevron-${isOpen ? "up" : "down"}`} style={{ color: f.col, fontSize: 12 }} />
                    </button>
                    {isOpen && (
                      <div style={{ paddingLeft: 8, paddingTop: 4, paddingBottom: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                        {list.map(r => {
                          const isCurrent = r.id === impersonating;
                          const couleur = r.couleur || f.col;
                          const icone = r.icone || "ti-user";
                          return (
                            <button key={r.id} onClick={() => setImpersonatedRoleId(r.id)} disabled={isCurrent} style={{
                              padding: "6px 10px",
                              background: isCurrent ? `${couleur}30` : "rgba(255,255,255,.04)",
                              color: "#fff", border: `1px solid ${isCurrent ? couleur + "60" : "transparent"}`,
                              borderRadius: 6, cursor: isCurrent ? "default" : "pointer", fontFamily: "Quicksand",
                              textAlign: "left", display: "flex", alignItems: "center", gap: 8, fontSize: 11,
                            }}>
                              <i className={`ti ${icone}`} style={{ color: couleur, fontSize: 13 }} />
                              <span style={{ flex: 1 }}>{r.nom}</span>
                              {isCurrent && <i className="ti ti-check" style={{ color: couleur }} />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
        let r = await supabase.from("roles").select("nom, couleur, icone, famille_metier").eq("id", id).maybeSingle();
        if (r.error) r = await supabase.from("roles").select("nom").eq("id", id).maybeSingle();
        setRoleNom(r.data);
      } catch (e) {}
    })();
  }, []);
  if (!roleNom) return null;
  const fam = FAMILLES[roleNom.famille_metier] || FAMILLES.autre;
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 999, padding: "8px 16px",
      background: `linear-gradient(90deg, ${roleNom.couleur || fam.col}30, ${roleNom.couleur || fam.col}10)`,
      borderBottom: `1px solid ${roleNom.couleur || fam.col}40`,
      display: "flex", alignItems: "center", gap: 10,
      fontFamily: "Quicksand, sans-serif", color: "#fff", fontSize: 12, fontWeight: 700,
      backdropFilter: "blur(8px)",
    }}>
      <i className={`ti ${roleNom.icone || fam.ic}`} style={{ color: roleNom.couleur || fam.col, fontSize: 16 }} />
      <span>Mode <strong>"Voir comme"</strong> : <span style={{ color: roleNom.couleur || fam.col }}>{roleNom.nom}</span></span>
      {roleNom.famille_metier && <span style={{ fontSize: 10, opacity: .6 }}>· {fam.lbl}</span>}
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
