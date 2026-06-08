"use client";
// =============================================================
//  components/TVFiltersBar.js (0.65.3)
//
//  Barre de filtres avancés pour les pages TV avec :
//   - Recherche texte + MICRO (Web Speech API)
//   - Filtres cascade : Établissement → Bâtiment → Service → Chambre → Patient
//   - Filtre garage / dépôt
//   - Persistance localStorage (clé par page)
//   - Bouton "Tout réinitialiser"
//   - Affichage compact avec badges de filtres actifs
//
//  Output : objet { etabId, batId, svcId, chambreId, patientId, garageId, depotId, search }
//  via onChange.
// =============================================================

import { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";

export default function TVFiltersBar({
  pageKey = "default",   // pour localStorage isolé par page
  onChange,
  available = ["etab", "bat", "svc", "chambre", "patient", "garage", "depot", "search"],
  compact = false,
}) {
  const supabase = createClient();
  const auth = useAuth();
  const storageKey = `av-tv-filters-${pageKey}`;

  // Données chargées
  const [etabs, setEtabs] = useState([]);
  const [batiments, setBatiments] = useState([]);
  const [services, setServices] = useState([]);
  const [chambres, setChambres] = useState([]);
  const [patients, setPatients] = useState([]);
  const [garages, setGarages] = useState([]);
  const [depots, setDepots] = useState([]);

  // Filtres actifs
  const [filters, setFilters] = useState({
    etabId: null, batId: null, svcId: null, chambreId: null,
    patientId: null, garageId: null, depotId: null, search: "",
  });

  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  // Restauration depuis localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        setFilters(prev => ({ ...prev, ...saved }));
      }
    } catch {}
  }, [storageKey]);

  // Chargement listes
  useEffect(() => {
    if (!auth?.structureId) return;
    (async () => {
      const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
      const [etabsRes, garagesRes, depotsRes] = await Promise.all([
        tryFetch(supabase.from("etablissements").select("id, nom, ville, actif").eq("structure_id", auth.structureId).order("nom")),
        tryFetch(supabase.from("garages").select("id, nom").eq("structure_id", auth.structureId).order("nom")),
        tryFetch(supabase.from("depots").select("id, nom, etablissement_id").eq("structure_id", auth.structureId).order("nom")),
      ]);
      setEtabs(etabsRes.filter(e => e.actif !== false));
      setGarages(garagesRes);
      setDepots(depotsRes);
    })();
  }, [auth?.structureId]);

  // Cascade : quand etabId change → recharger bâtiments
  useEffect(() => {
    if (!filters.etabId) { setBatiments([]); setServices([]); setChambres([]); setPatients([]); return; }
    (async () => {
      const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
      const [bRes, pRes] = await Promise.all([
        tryFetch(supabase.from("batiments").select("id, nom, etablissement_id").eq("etablissement_id", filters.etabId).order("nom")),
        tryFetch(supabase.from("patients").select("id, nom, prenom, chambre, ville").eq("structure_id", auth.structureId).eq("etablissement_id", filters.etabId).order("nom").limit(500)),
      ]);
      setBatiments(bRes);
      setPatients(pRes);
    })();
  }, [filters.etabId, auth?.structureId]);

  // Cascade bâtiment → services
  useEffect(() => {
    if (!filters.batId) { setServices([]); setChambres([]); return; }
    (async () => {
      const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
      const r = await tryFetch(supabase.from("services").select("id, nom, batiment_id").eq("batiment_id", filters.batId).order("nom"));
      setServices(r);
    })();
  }, [filters.batId]);

  // Cascade service → chambres
  useEffect(() => {
    if (!filters.svcId) { setChambres([]); return; }
    (async () => {
      const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
      const r = await tryFetch(supabase.from("chambres").select("id, libelle, numero, service_id").eq("service_id", filters.svcId).order("numero"));
      setChambres(r);
    })();
  }, [filters.svcId]);

  // Notification parent + persistance
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(filters)); } catch {}
    onChange?.(filters);
  }, [filters]);

  // ========== Recherche vocale (Web Speech API) ==========
  function startVoiceSearch() {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("La recherche vocale n'est pas disponible sur ce navigateur. Utilise Chrome ou Edge.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop?.();
      setListening(false);
      return;
    }
    const recognition = new SR();
    recognition.lang = "fr-FR";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map(r => r[0].transcript)
        .join("");
      setFilters(prev => ({ ...prev, search: text }));
    };
    recognition.onerror = (e) => {
      console.warn("Voice recognition error:", e.error);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
  }

  function update(key, val) {
    setFilters(prev => {
      const next = { ...prev, [key]: val };
      // Cascade reset
      if (key === "etabId") { next.batId = null; next.svcId = null; next.chambreId = null; next.patientId = null; }
      if (key === "batId")  { next.svcId = null; next.chambreId = null; }
      if (key === "svcId")  { next.chambreId = null; }
      return next;
    });
  }

  function resetAll() {
    setFilters({ etabId: null, batId: null, svcId: null, chambreId: null, patientId: null, garageId: null, depotId: null, search: "" });
  }

  // Compteur badges actifs
  const activeCount = useMemo(() => {
    let c = 0;
    if (filters.etabId) c++; if (filters.batId) c++; if (filters.svcId) c++;
    if (filters.chambreId) c++; if (filters.patientId) c++;
    if (filters.garageId) c++; if (filters.depotId) c++;
    if (filters.search?.trim()) c++;
    return c;
  }, [filters]);

  return (
    <>
      {/* Bouton trigger compact */}
      <button onClick={() => setOpen(!open)}
        title={`Filtres avancés${activeCount > 0 ? ` (${activeCount} actif${activeCount > 1 ? "s" : ""})` : ""}`}
        style={{
          padding: "6px 12px",
          background: activeCount > 0 ? "linear-gradient(135deg, #EF9F27, #d68a1c)" : "rgba(124, 200, 200, .12)",
          color: activeCount > 0 ? "#fff" : "#7CC8C8",
          border: `1px solid ${activeCount > 0 ? "transparent" : "rgba(124, 200, 200, .3)"}`,
          borderRadius: 10,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          letterSpacing: 0.3,
          textTransform: "uppercase",
          transition: "all 200ms",
        }}>
        <i className="ti ti-filter" />
        Filtres
        {activeCount > 0 && (
          <span style={{ background: "#fff", color: "#EF9F27", padding: "0 6px", borderRadius: 10, fontSize: 10, fontWeight: 800 }}>
            {activeCount}
          </span>
        )}
      </button>

      {/* Panel modal */}
      {open && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 99998,
            background: "rgba(20, 33, 49, .7)",
            backdropFilter: "blur(8px)",
            display: "flex", justifyContent: "center", alignItems: "flex-start",
            padding: "60px 20px 20px",
            overflowY: "auto",
          }}>
          <div style={{
            background: "#fff",
            borderRadius: 16,
            padding: 0,
            width: "100%",
            maxWidth: 720,
            maxHeight: "calc(100vh - 80px)",
            display: "flex", flexDirection: "column",
            boxShadow: "0 30px 80px rgba(0,0,0,.5)",
            fontFamily: "Quicksand, sans-serif",
          }}>
            {/* Header */}
            <div style={{
              padding: "14px 18px",
              background: "linear-gradient(135deg, #185FA5, #7CC8C8)",
              color: "#fff",
              borderRadius: "16px 16px 0 0",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <i className="ti ti-filter-cog" style={{ fontSize: 22 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Filtres avancés</div>
                <div style={{ fontSize: 11.5, opacity: 0.9, marginTop: 2 }}>
                  Affine ce qui s'affiche sur l'écran TV
                </div>
              </div>
              <button onClick={() => setOpen(false)}
                style={{ background: "rgba(255,255,255,.15)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontFamily: "inherit", fontSize: 16 }}>
                <i className="ti ti-x" />
              </button>
            </div>

            <div style={{ padding: 18, overflowY: "auto", flex: 1, color: "#142131" }}>
              {/* Recherche + micro */}
              {available.includes("search") && (
                <Section icon="ti-search" color="#7CC8C8" label="Recherche libre">
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      value={filters.search}
                      onChange={(e) => update("search", e.target.value)}
                      placeholder="Tape ou parle… (ex: numéro DI, nom patient, ville)"
                      style={{
                        flex: 1, padding: "10px 12px",
                        border: "1.5px solid #e3e9ee", borderRadius: 10,
                        fontSize: 13, fontFamily: "inherit",
                      }} />
                    <button onClick={startVoiceSearch}
                      title={listening ? "Arrêter l'écoute" : "Recherche vocale"}
                      style={{
                        padding: "0 14px",
                        background: listening ? "linear-gradient(135deg, #e35d5b, #c0392b)" : "linear-gradient(135deg, #7CC8C8, #5db5b5)",
                        color: "#fff", border: "none", borderRadius: 10,
                        cursor: "pointer", fontSize: 18,
                        animation: listening ? "av-mic-pulse 1.2s ease-in-out infinite" : "none",
                        fontFamily: "inherit",
                      }}>
                      <i className={`ti ${listening ? "ti-microphone-off" : "ti-microphone"}`} />
                    </button>
                    {filters.search && (
                      <button onClick={() => update("search", "")}
                        title="Effacer la recherche"
                        style={{ padding: "0 12px", background: "#fafbfc", color: "#5a6878", border: "1.5px solid #e3e9ee", borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}>
                        <i className="ti ti-x" />
                      </button>
                    )}
                  </div>
                  {listening && (
                    <div style={{ fontSize: 11, color: "#e35d5b", marginTop: 6, fontWeight: 700 }}>
                      🎙 Écoute en cours… parle maintenant
                    </div>
                  )}
                </Section>
              )}

              {/* Filtre Établissement */}
              {available.includes("etab") && (
                <Section icon="ti-building-hospital" color="#185FA5" label="Établissement">
                  <FilterSelect
                    value={filters.etabId} placeholder="Tous les établissements"
                    options={etabs.map(e => ({ v: e.id, l: `${e.nom}${e.ville ? " · " + e.ville : ""}` }))}
                    onChange={(v) => update("etabId", v)}
                  />
                </Section>
              )}

              {/* Filtre Bâtiment (cascade) */}
              {available.includes("bat") && filters.etabId && batiments.length > 0 && (
                <Section icon="ti-building" color="#7CC8C8" label="Bâtiment">
                  <FilterSelect
                    value={filters.batId} placeholder="Tous les bâtiments"
                    options={batiments.map(b => ({ v: b.id, l: b.nom }))}
                    onChange={(v) => update("batId", v)}
                  />
                </Section>
              )}

              {/* Filtre Service (cascade) */}
              {available.includes("svc") && filters.batId && services.length > 0 && (
                <Section icon="ti-stethoscope" color="#7a6fb0" label="Service">
                  <FilterSelect
                    value={filters.svcId} placeholder="Tous les services"
                    options={services.map(s => ({ v: s.id, l: s.nom }))}
                    onChange={(v) => update("svcId", v)}
                  />
                </Section>
              )}

              {/* Filtre Chambre (cascade) */}
              {available.includes("chambre") && filters.svcId && chambres.length > 0 && (
                <Section icon="ti-bed" color="#5a8f8f" label="Chambre">
                  <FilterSelect
                    value={filters.chambreId} placeholder="Toutes les chambres"
                    options={chambres.map(c => ({ v: c.id, l: c.libelle || `Ch. ${c.numero}` }))}
                    onChange={(v) => update("chambreId", v)}
                  />
                </Section>
              )}

              {/* Filtre Patient */}
              {available.includes("patient") && filters.etabId && patients.length > 0 && (
                <Section icon="ti-user" color="#EF9F27" label="Patient">
                  <FilterSelect
                    value={filters.patientId} placeholder="Tous les patients"
                    options={patients.map(p => ({ v: p.id, l: `${p.nom} ${p.prenom || ""}${p.chambre ? " · Ch. " + p.chambre : ""}` }))}
                    onChange={(v) => update("patientId", v)}
                  />
                </Section>
              )}

              {/* Filtre Garage */}
              {available.includes("garage") && garages.length > 0 && (
                <Section icon="ti-parking" color="#C9867F" label="Garage">
                  <FilterSelect
                    value={filters.garageId} placeholder="Tous les garages"
                    options={garages.map(g => ({ v: g.id, l: g.nom }))}
                    onChange={(v) => update("garageId", v)}
                  />
                </Section>
              )}

              {/* Filtre Dépôt */}
              {available.includes("depot") && depots.length > 0 && (
                <Section icon="ti-building-warehouse" color="#5e4a8c" label="Dépôt">
                  <FilterSelect
                    value={filters.depotId} placeholder="Tous les dépôts"
                    options={depots.map(d => ({ v: d.id, l: d.nom }))}
                    onChange={(v) => update("depotId", v)}
                  />
                </Section>
              )}

              {/* Récap badges actifs */}
              {activeCount > 0 && (
                <div style={{ marginTop: 14, padding: 12, background: "linear-gradient(135deg, rgba(239,159,39,.08), rgba(239,159,39,.02))", border: "1px solid rgba(239,159,39,.3)", borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#EF9F27", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.3 }}>
                    {activeCount} filtre{activeCount > 1 ? "s" : ""} actif{activeCount > 1 ? "s" : ""}
                  </div>
                  <button onClick={resetAll}
                    style={{ padding: "6px 12px", background: "#fff", color: "#e35d5b", border: "1.5px solid #e35d5b55", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>
                    <i className="ti ti-restore" /> Tout réinitialiser
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 18px", borderTop: "1px solid #e3e9ee", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={resetAll}
                style={{ padding: "8px 14px", background: "#fafbfc", color: "#5a6878", border: "1.5px solid #e3e9ee", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>
                <i className="ti ti-restore" /> Réinitialiser
              </button>
              <button onClick={() => setOpen(false)}
                style={{ padding: "8px 18px", background: "linear-gradient(135deg, #185FA5, #7CC8C8)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>
                <i className="ti ti-check" /> Appliquer
              </button>
            </div>

            <style jsx global>{`
              @keyframes av-mic-pulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(227,93,91,.6); }
                50%      { box-shadow: 0 0 0 12px rgba(227,93,91,0); }
              }
              @media (max-width:720px) {
                /* Bottom-sheet mobile */
                .tv-filters-modal {
                  max-width: 100% !important;
                  border-radius: 18px 18px 0 0 !important;
                  margin-top: auto !important;
                }
              }
            `}</style>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ icon, color, label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, color: color, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 14 }} />
        {label}
      </label>
      {children}
    </div>
  );
}

function FilterSelect({ value, options, onChange, placeholder }) {
  return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value || null)}
      style={{
        width: "100%", padding: "8px 12px",
        border: "1.5px solid #e3e9ee", borderRadius: 10,
        fontSize: 13, fontFamily: "inherit",
        background: "#fff", color: "#142131",
        cursor: "pointer",
      }}>
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.v} value={o.v}>{o.l}</option>
      ))}
    </select>
  );
}

// Helper pour récupérer les filtres initiaux côté pages
export function getTVFilters(pageKey) {
  try {
    const raw = localStorage.getItem(`av-tv-filters-${pageKey}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
