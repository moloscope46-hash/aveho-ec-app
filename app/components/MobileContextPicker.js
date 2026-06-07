"use client";
// =============================================================
//  components/MobileContextPicker.js (0.62.74)
//
//  Sur mobile, la TopBar cache : sélecteur étab + bât/svc + filtre.
//  Ce composant ajoute un bouton burger à droite du logo en mobile
//  qui ouvre une popup full-screen avec :
//   - Sélecteur établissement
//   - Sélecteur bâtiment
//   - Sélecteur service
//   - Toutes les options cachées
// =============================================================
import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase";

const STORAGE_BAT = "av-current-batiment-id";
const STORAGE_SVC = "av-current-service-id";

export default function MobileContextPicker({ auth }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [batiments, setBatiments] = useState([]);
  const [services, setServices] = useState([]);
  const [batId, setBatId] = useState("");
  const [svcId, setSvcId] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setBatId(localStorage.getItem(STORAGE_BAT) || "");
      setSvcId(localStorage.getItem(STORAGE_SVC) || "");
    } catch {}
  }, []);

  useEffect(() => {
    if (!open || !auth?.etabId) return;
    (async () => {
      try {
        const r = await supabase.from("batiments").select("id, nom").eq("etablissement_id", auth.etabId).order("nom");
        setBatiments(r.data || []);
      } catch {}
    })();
  }, [open, auth?.etabId]);

  useEffect(() => {
    if (!open || !batId) { setServices([]); return; }
    (async () => {
      try {
        const r = await supabase.from("services").select("id, nom").eq("batiment_id", batId).order("nom");
        setServices(r.data || []);
      } catch {}
    })();
  }, [open, batId]);

  function chooseBat(id) {
    setBatId(id);
    try { localStorage.setItem(STORAGE_BAT, id); } catch {}
    window.dispatchEvent(new CustomEvent("av-current-context-change"));
  }
  function chooseSvc(id) {
    setSvcId(id);
    try { localStorage.setItem(STORAGE_SVC, id); } catch {}
    window.dispatchEvent(new CustomEvent("av-current-context-change"));
  }
  function clearBatSvc() {
    setBatId(""); setSvcId("");
    try { localStorage.removeItem(STORAGE_BAT); localStorage.removeItem(STORAGE_SVC); } catch {}
    window.dispatchEvent(new CustomEvent("av-current-context-change"));
  }

  if (!auth?.etabId) return null;

  return (
    <>
      {/* Bouton context mobile (visible < 768px uniquement) */}
      <button
        onClick={() => setOpen(true)}
        className="mobile-context-btn"
        aria-label="Contexte établissement / bâtiment / service"
        title={`${auth.etabNom || "Établissement"}${batId ? ` · Bât` : ""}${svcId ? ` · Svc` : ""}`}
        style={{
          display: "none",
          alignItems: "center", justifyContent: "center",
          width: 36, height: 36, borderRadius: 8,
          background: "linear-gradient(135deg, rgba(124,200,200,.20), rgba(24,95,165,.15))",
          color: "#7CC8C8",
          border: "1px solid rgba(124,200,200,.30)",
          cursor: "pointer", fontSize: 18, position: "relative",
        }}
      >
        <i className="ti ti-building-hospital" />
        {(batId || svcId) && (
          <span style={{
            position: "absolute", top: 2, right: 2,
            width: 8, height: 8, borderRadius: "50%",
            background: "#EF9F27",
            boxShadow: "0 0 0 2px #142131",
          }} />
        )}
      </button>

      {/* Popup full-screen */}
      {open && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }} style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(20,33,49,.7)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "flex-end",
          padding: 0,
        }}>
          <div style={{
            width: "100%",
            maxHeight: "90vh",
            background: "linear-gradient(180deg, #fff, #fafbfc)",
            borderRadius: "20px 20px 0 0",
            padding: "16px 16px max(20px, env(safe-area-inset-bottom)) 16px",
            overflowY: "auto",
            animation: "av-modal-slide-up 280ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            boxShadow: "0 -8px 30px rgba(0,0,0,.25)",
          }}>
            {/* Handle */}
            <div style={{ width: 44, height: 4, background: "#c0d0d8", borderRadius: 2, margin: "0 auto 14px" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#142131" }}>
                <i className="ti ti-building-hospital" style={{ color: "#185FA5" }} /> Contexte
              </h3>
              <button onClick={() => setOpen(false)} style={{
                width: 32, height: 32, borderRadius: 8,
                background: "#fafbfc", border: "1px solid #e3e9ee",
                cursor: "pointer", color: "#5a6878",
              }}>
                <i className="ti ti-x" />
              </button>
            </div>

            {/* === SÉLECTEUR ÉTABLISSEMENT === */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "#5a6878", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                Établissement
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {(auth.etablissements || []).map(et => {
                  const selected = et.id === auth.etabId;
                  return (
                    <button key={et.id} onClick={() => { auth.setEtab(et.id); setOpen(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px",
                        background: selected ? "linear-gradient(135deg, rgba(24,95,165,.15), rgba(24,95,165,.05))" : "#fff",
                        border: `1px solid ${selected ? "#185FA5" : "#e3e9ee"}`,
                        borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                        textAlign: "left", width: "100%",
                      }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: selected ? "linear-gradient(135deg, #185FA5, #134e87)" : "#f4f7fa",
                        color: selected ? "#fff" : "#5a6878",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                      }}>
                        <i className="ti ti-building-hospital" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#142131" }}>{et.nom}</div>
                        {et.ville && <div style={{ fontSize: 11, color: "#8a98a8" }}>{et.ville}</div>}
                      </div>
                      {selected && <i className="ti ti-check" style={{ color: "#185FA5", fontSize: 18 }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* === SÉLECTEUR BÂTIMENT === */}
            {batiments.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontSize: 10, color: "#5a6878", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Bâtiment
                  </div>
                  {batId && (
                    <button onClick={clearBatSvc} style={{ background: "none", border: "none", color: "#e35d5b", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                      <i className="ti ti-x" /> Effacer
                    </button>
                  )}
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {batiments.map(b => {
                    const selected = b.id === batId;
                    return (
                      <button key={b.id} onClick={() => chooseBat(b.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                          background: selected ? "linear-gradient(135deg, rgba(124,200,200,.15), rgba(124,200,200,.05))" : "#fff",
                          border: `1px solid ${selected ? "#7CC8C8" : "#e3e9ee"}`,
                          borderRadius: 8, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                        }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 6,
                          background: selected ? "linear-gradient(135deg, #7CC8C8, #5a9494)" : "#f4f7fa",
                          color: selected ? "#fff" : "#5a6878",
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
                        }}>
                          <i className="ti ti-home" />
                        </div>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{b.nom}</span>
                        {selected && <i className="ti ti-check" style={{ color: "#7CC8C8" }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* === SÉLECTEUR SERVICE === */}
            {services.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: "#5a6878", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                  Service
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {services.map(s => {
                    const selected = s.id === svcId;
                    return (
                      <button key={s.id} onClick={() => chooseSvc(s.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                          background: selected ? "linear-gradient(135deg, rgba(239,159,39,.15), rgba(239,159,39,.05))" : "#fff",
                          border: `1px solid ${selected ? "#EF9F27" : "#e3e9ee"}`,
                          borderRadius: 8, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                        }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 6,
                          background: selected ? "linear-gradient(135deg, #EF9F27, #d48a1a)" : "#f4f7fa",
                          color: selected ? "#fff" : "#5a6878",
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
                        }}>
                          <i className="ti ti-stethoscope" />
                        </div>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{s.nom}</span>
                        {selected && <i className="ti ti-check" style={{ color: "#EF9F27" }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button onClick={() => setOpen(false)} style={{
              width: "100%", padding: 12,
              background: "linear-gradient(135deg, #185FA5, #7CC8C8)", color: "#fff",
              border: "none", borderRadius: 10,
              fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
              marginTop: 8,
            }}>
              <i className="ti ti-check" /> Valider
            </button>
          </div>
        </div>
      )}
    </>
  );
}
