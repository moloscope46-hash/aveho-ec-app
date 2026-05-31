"use client";
// =============================================================
//  GlobalSearch (Alpha 0.14)
//  Palette unifiée Cmd+K / Ctrl+K. Recherche dans patients,
//  matériels, DI, signalements. Navigation clavier ↑↓ Enter Échap.
// =============================================================
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase";

const TYPES = {
  patient: { icon: "ti-user", color: "#185FA5", lbl: "Patient" },
  materiel: { icon: "ti-armchair-2", color: "#7CC8C8", lbl: "Matériel" },
  intervention: { icon: "ti-tools", color: "#e35d5b", lbl: "DI" },
  signalement: { icon: "ti-message", color: "#7a6fb0", lbl: "Signalement" },
  achat: { icon: "ti-shopping-cart", color: "#EF9F27", lbl: "Achat" },
  // Alpha 0.35.0 : ajout transferts + maintenances
  transfert: { icon: "ti-arrows-exchange", color: "#5aa05a", lbl: "Transfert" },
  maintenance: { icon: "ti-tool", color: "#1c5454", lbl: "Maintenance" },
  // Alpha 0.52.0 (G) : ajout consents (c:) + fournisseurs (f:)
  consent: { icon: "ti-shield-check", color: "#5aa05a", lbl: "Consentement" },
  fournisseur: { icon: "ti-truck-loading", color: "#8c2a23", lbl: "Fournisseur" },
};

export default function GlobalSearch() {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [sel, setSel] = useState(0);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]); // Alpha 0.35.0 : historique
  const inputRef = useRef(null);

  // Alpha 0.35.0 : charger l'historique depuis localStorage à l'ouverture
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem("aveho:search-history");
      const h = raw ? JSON.parse(raw) : [];
      setHistory(Array.isArray(h) ? h.slice(0, 6) : []);
    } catch { setHistory([]); }
  }, [open]);

  // Alpha 0.35.0 : sauve une entrée dans l'historique (max 6, dédoublonné)
  function pushHistory(entry) {
    try {
      const raw = localStorage.getItem("aveho:search-history");
      const h = raw ? JSON.parse(raw) : [];
      const filtered = (Array.isArray(h) ? h : []).filter(
        (x) => !(x.type === entry.type && x.id === entry.id)
      );
      const updated = [entry, ...filtered].slice(0, 6);
      localStorage.setItem("aveho:search-history", JSON.stringify(updated));
    } catch {}
  }

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    // Alpha 0.35.0 : event custom déclenché par le bouton 🔍 dans la TopBar
    function onOpenSearch() { setOpen(true); }
    window.addEventListener("keydown", onKey);
    window.addEventListener("aveho:open-search", onOpenSearch);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("aveho:open-search", onOpenSearch);
    };
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQ(""); setResults([]); setSel(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !q || q.length < 2) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        // Alpha 0.15 : préfixe pour filtrer sur un type
        // Alpha 0.35 : ajout t: (transferts) et x: (maintenances)
        // Alpha 0.52 (G) : ajout c: (consents RGPD) et f: (fournisseurs)
        // "p:dupont" → patients uniquement, "m:lit" → matériels, "d:di-2026" → DI,
        // "s:idée" → signalements, "a:cmd-2026" → achats/commandes,
        // "t:tr-2026" → transferts, "x:mnt-2026" → maintenances
        // "c:dupont" → consents RGPD, "f:Bastide" → fournisseurs
        let searchTerm = q;
        let filterType = null;
        const match = q.match(/^([pmdsatxcf]):(.*)$/i);
        if (match) {
          const prefix = match[1].toLowerCase();
          searchTerm = match[2].trim();
          if (searchTerm.length < 1) { setResults([]); setLoading(false); return; }
          filterType = { 
            p: "patient", m: "materiel", d: "intervention", s: "signalement", 
            a: "achat", t: "transfert", x: "maintenance",
            c: "consent", f: "fournisseur"  // Alpha 0.52.0 (G)
          }[prefix];
        }
        const term = `%${searchTerm}%`;
        const list = [];

        if (!filterType || filterType === "patient") {
          // Alpha 0.20.0 : RPC full-text avec fallback ilike si RPC indisponible
          let data;
          const rpcRes = await supabase.rpc("search_patients", { q: searchTerm, lim: 5 });
          if (rpcRes.error) {
            // Fallback : ilike (compatible si patch SQL 0.20 pas encore appliqué)
            const fb = await supabase.from("patients").select("id, nom, prenom, chambre").or(`nom.ilike.${term},prenom.ilike.${term}`).limit(5);
            data = fb.data;
          } else {
            data = rpcRes.data;
          }
          (data || []).forEach((p) => list.push({
            type: "patient", id: p.id,
            titre: `${p.nom} ${p.prenom || ""}`,
            sub: p.chambre ? `Chambre ${p.chambre}` : "",
            href: `/patient/${p.id}`,
          }));
        }
        if (!filterType || filterType === "materiel") {
          // Alpha 0.20.0 : RPC full-text avec fallback ilike
          let data;
          const rpcRes = await supabase.rpc("search_materiels", { q: searchTerm, lim: 5 });
          if (rpcRes.error) {
            const fb = await supabase.from("materiels").select("id, libelle, num_serie, num_parc, num_lot").or(`libelle.ilike.${term},num_serie.ilike.${term},num_parc.ilike.${term},num_lot.ilike.${term}`).limit(5);
            data = fb.data;
          } else {
            data = rpcRes.data;
          }
          (data || []).forEach((m) => {
            const ids = [m.num_serie, m.num_parc, m.num_lot].filter(Boolean).join(" · ");
            list.push({
              type: "materiel", id: m.id,
              titre: m.libelle,
              sub: ids || "",
              href: `/materiel/${m.id}`,
            });
          });
        }
        if (!filterType || filterType === "intervention") {
          const { data } = await supabase.from("interventions").select("id, numero, type, statut").or(`numero.ilike.${term},type.ilike.${term}`).limit(5);
          (data || []).forEach((d) => list.push({
            type: "intervention", id: d.id,
            titre: d.numero,
            sub: `${d.type || ""} · ${d.statut}`,
            href: "/interventions",
          }));
        }
        if (!filterType || filterType === "signalement") {
          const { data } = await supabase.from("signalements").select("id, titre, type, statut").ilike("titre", term).limit(5);
          (data || []).forEach((s) => list.push({
            type: "signalement", id: s.id,
            titre: s.titre,
            sub: `${s.type} · ${s.statut}`,
            href: "/signalements",
          }));
        }
        if (!filterType || filterType === "achat") {
          const { data } = await supabase.from("achats").select("id, numero, motif, statut, fournisseur").or(`numero.ilike.${term},motif.ilike.${term},fournisseur.ilike.${term}`).limit(5);
          (data || []).forEach((a) => list.push({
            type: "achat", id: a.id,
            titre: a.numero,
            sub: `${a.fournisseur || "—"} · ${a.statut}`,
            href: "/achats",
          }));
        }
        // Alpha 0.35.0 : transferts
        if (!filterType || filterType === "transfert") {
          const { data } = await supabase.from("transferts").select("id, numero, statut, motif").or(`numero.ilike.${term},motif.ilike.${term}`).limit(5);
          (data || []).forEach((t) => list.push({
            type: "transfert", id: t.id,
            titre: t.numero,
            sub: `${t.motif || "—"} · ${t.statut}`,
            href: "/transferts",
          }));
        }
        // Alpha 0.35.0 : maintenances
        if (!filterType || filterType === "maintenance") {
          const { data } = await supabase.from("maintenances").select("id, numero, type, statut").or(`numero.ilike.${term},type.ilike.${term}`).limit(5);
          (data || []).forEach((m) => list.push({
            type: "maintenance", id: m.id,
            titre: m.numero,
            sub: `${m.type || "—"} · ${m.statut}`,
            href: "/maintenance",
          }));
        }
        // Alpha 0.52.0 (G) : consentements RGPD
        if (!filterType || filterType === "consent") {
          // Seulement si déclenchement explicite c: ou recherche globale
          // (on évite de polluer la recherche globale avec trop de résultats)
          if (filterType === "consent" || searchTerm.length >= 3) {
            const { data } = await supabase
              .from("consentements_rgpd")
              .select("id, patient_nom_prenom, patient_numero_dossier, date_signature, a_consenti")
              .or(`patient_nom_prenom.ilike.${term},patient_numero_dossier.ilike.${term}`)
              .order("date_signature", { ascending: false })
              .limit(5);
            (data || []).forEach((c) => list.push({
              type: "consent", id: c.id,
              titre: c.patient_nom_prenom,
              sub: `${c.a_consenti ? "✓ Consenti" : "✗ Refusé"} · ${c.patient_numero_dossier || ""} · ${new Date(c.date_signature).toLocaleDateString("fr-FR")}`,
              href: "/consentements",
            }));
          }
        }
        // Alpha 0.52.0 (G) : fournisseurs (depuis achats, distinct)
        if (filterType === "fournisseur") {
          // Recherche dans les fournisseurs distincts mentionnés dans achats
          const { data } = await supabase
            .from("achats")
            .select("fournisseur, id, numero, statut, budget_estime")
            .ilike("fournisseur", term)
            .not("fournisseur", "is", null)
            .order("created_at", { ascending: false })
            .limit(10);
          // Grouper par fournisseur unique
          const byFourn = {};
          (data || []).forEach((a) => {
            if (!a.fournisseur) return;
            if (!byFourn[a.fournisseur]) {
              byFourn[a.fournisseur] = { fournisseur: a.fournisseur, count: 0, last: a };
            }
            byFourn[a.fournisseur].count++;
          });
          Object.values(byFourn).slice(0, 5).forEach((f) => list.push({
            type: "fournisseur", id: f.fournisseur,
            titre: f.fournisseur,
            sub: `${f.count} commande${f.count > 1 ? "s" : ""} · dernière #${f.last.numero}`,
            href: `/achats?fournisseur=${encodeURIComponent(f.fournisseur)}`,
          }));
        }
        setResults(list);
        setSel(0);
      } catch (_) {}
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  function onKeyInput(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Enter" && results[sel]) {
      e.preventDefault();
      pushHistory(results[sel]);
      router.push(results[sel].href);
      setOpen(false);
    }
  }

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(20,33,49,.7)",
      zIndex: 9998, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: "10vh",
    }} onClick={() => setOpen(false)}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 14, width: "90%", maxWidth: 640,
        boxShadow: "0 30px 80px rgba(0,0,0,.4)", overflow: "hidden",
      }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e3e9ee", display: "flex", alignItems: "center", gap: 12 }}>
          <i className="ti ti-search" style={{ color: "#7CC8C8", fontSize: 20 }} />
          <input ref={inputRef} type="text" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyInput}
            placeholder="Rechercher  ·  p: patient · m: matériel · c: consent · f: fournisseur…"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 16, fontFamily: "inherit", color: "#142131" }} />
          <kbd style={{ background: "#f4f7fa", padding: "2px 8px", borderRadius: 4, border: "1px solid #e3e9ee", fontSize: 11, color: "#6c7a89" }}>Échap</kbd>
        </div>
        <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#8a98a8", fontSize: 13 }}>Recherche…</div>
          ) : q.length < 2 ? (
            <div style={{ padding: "20px", color: "#8a98a8", fontSize: 13 }}>
              <p style={{ textAlign: "center", margin: "0 0 14px" }}>Tape au moins 2 caractères pour rechercher</p>
              <div style={{ paddingTop: 14, borderTop: "1px dashed #e3e9ee" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#142131", textTransform: "uppercase", letterSpacing: ".5px", margin: "0 0 8px" }}>Filtres rapides</p>
                <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 }}>
                  <div><kbd style={{ background: "#185FA522", color: "#185FA5", padding: "1px 6px", borderRadius: 3, fontSize: 11, fontWeight: 700 }}>p:</kbd> patients</div>
                  <div><kbd style={{ background: "#7CC8C822", color: "#2a5a5a", padding: "1px 6px", borderRadius: 3, fontSize: 11, fontWeight: 700 }}>m:</kbd> matériels</div>
                  <div><kbd style={{ background: "#e35d5b22", color: "#e35d5b", padding: "1px 6px", borderRadius: 3, fontSize: 11, fontWeight: 700 }}>d:</kbd> demandes d'intervention</div>
                  <div><kbd style={{ background: "#7a6fb022", color: "#7a6fb0", padding: "1px 6px", borderRadius: 3, fontSize: 11, fontWeight: 700 }}>s:</kbd> signalements</div>
                  <div><kbd style={{ background: "#EF9F2722", color: "#EF9F27", padding: "1px 6px", borderRadius: 3, fontSize: 11, fontWeight: 700 }}>a:</kbd> achats</div>
                  <div><kbd style={{ background: "#5aa05a22", color: "#5aa05a", padding: "1px 6px", borderRadius: 3, fontSize: 11, fontWeight: 700 }}>t:</kbd> transferts</div>
                  <div><kbd style={{ background: "#1c545422", color: "#1c5454", padding: "1px 6px", borderRadius: 3, fontSize: 11, fontWeight: 700 }}>x:</kbd> maintenances</div>
                </div>
              </div>
              {/* Alpha 0.35.0 : Historique récent */}
              {history.length > 0 && (
                <div style={{ paddingTop: 14, marginTop: 14, borderTop: "1px dashed #e3e9ee" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#142131", textTransform: "uppercase", letterSpacing: ".5px", margin: 0 }}>
                      <i className="ti ti-history" /> Récents
                    </p>
                    <button
                      onClick={() => {
                        try { localStorage.removeItem("aveho:search-history"); } catch {}
                        setHistory([]);
                      }}
                      style={{ background: "none", border: "none", color: "#8a98a8", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Effacer
                    </button>
                  </div>
                  <div>
                    {history.map((r, i) => {
                      const t = TYPES[r.type];
                      if (!t) return null;
                      return (
                        <div key={`h-${r.type}-${r.id}`}
                          onClick={() => { router.push(r.href); setOpen(false); }}
                          style={{
                            padding: "6px 8px", cursor: "pointer", borderRadius: 6,
                            display: "flex", alignItems: "center", gap: 10,
                            transition: "background .12s",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#eaf7f7"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          <span style={{ width: 22, height: 22, borderRadius: 6, background: t.color + "22", color: t.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <i className={`ti ${t.icon}`} style={{ fontSize: 12 }} />
                          </span>
                          <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
                            <div style={{ color: "#142131", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.titre}</div>
                            {r.sub && <div style={{ fontSize: 10, color: "#8a98a8" }}>{r.sub}</div>}
                          </div>
                          <span style={{ fontSize: 9, color: t.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>{t.lbl}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#8a98a8", fontSize: 13 }}>Aucun résultat pour <b>"{q}"</b></div>
          ) : (
            <div>
              {results.map((r, i) => {
                const t = TYPES[r.type];
                const isSel = i === sel;
                return (
                  <div key={`${r.type}-${r.id}`}
                    onClick={() => { pushHistory(r); router.push(r.href); setOpen(false); }}
                    onMouseEnter={() => setSel(i)}
                    style={{
                      padding: "10px 18px", cursor: "pointer",
                      background: isSel ? "#eaf7f7" : "#fff",
                      borderLeft: isSel ? `3px solid ${t.color}` : "3px solid transparent",
                      display: "flex", alignItems: "center", gap: 12,
                    }}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: t.color + "22", color: t.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className={`ti ${t.icon}`} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#142131", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.titre}</div>
                      {r.sub && <div style={{ fontSize: 11, color: "#8a98a8" }}>{r.sub}</div>}
                    </div>
                    <span style={{ fontSize: 10, color: t.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>{t.lbl}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ padding: "10px 18px", borderTop: "1px solid #e3e9ee", fontSize: 11, color: "#8a98a8", display: "flex", gap: 14 }}>
          <span><kbd style={{ background: "#f4f7fa", padding: "1px 6px", borderRadius: 3, border: "1px solid #e3e9ee", fontSize: 10 }}>↑↓</kbd> naviguer</span>
          <span><kbd style={{ background: "#f4f7fa", padding: "1px 6px", borderRadius: 3, border: "1px solid #e3e9ee", fontSize: 10 }}>↵</kbd> ouvrir</span>
          <span style={{ marginLeft: "auto" }}>Raccourci global : <kbd style={{ background: "#f4f7fa", padding: "1px 6px", borderRadius: 3, border: "1px solid #e3e9ee", fontSize: 10 }}>⌘ K</kbd></span>
        </div>
      </div>
    </div>
  );
}
