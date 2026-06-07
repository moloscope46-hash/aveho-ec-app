"use client";
// =============================================================
//  /magasin/scan — Scan QR mode magasin (0.62.27)
//  Flow dédié au magasin : scan d'un QR article/matériel
//  → propose actions magasin (entrée/sortie/transfert/SAV)
// =============================================================
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { useMagasinContext } from "../../../lib/useMagasinContext";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn } from "../../ui";
import { MagasinSidebar } from "../../components/MagasinSidebar";

const ACTIONS = [
  { v: "entree",     l: "📥 Entrée stock",         desc: "Réception d'un article au magasin",         col: "#5aa05a", route: "/scan/article" },
  { v: "sortie",     l: "📤 Sortie stock",         desc: "Préparation commande / livraison",          col: "#EF9F27", route: "/magasin/sortie" },
  { v: "transfert",  l: "🔄 Transfert",            desc: "Vers un autre dépôt / établissement",       col: "#7a6fb0", route: "/transferts/nouvelle" },
  { v: "sav",        l: "🛠 Déclarer un SAV",      desc: "Matériel défaillant / à réparer",           col: "#e35d5b", route: "/sav/nouvelle" },
  { v: "maintenance",l: "🔧 Programmer maintenance",desc: "Maintenance préventive ou curative",        col: "#185FA5", route: "/maintenance" },
  { v: "info",       l: "ℹ Voir fiche",           desc: "Consulter la fiche article/matériel",       col: "#5a8f8f", route: null }, // résolu dynamiquement
];

export default function MagasinScanPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();

  const [scannedCode, setScannedCode] = useState("");
  const [resolved, setResolved] = useState(null);  // article | materiel | null
  const [loading, setLoading] = useState(false);
  const [depotScan, setDepotScan] = useState(null); // dépôt courant (sauvegardé en session)
  const [depots, setDepots] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    loadDepots();
    // Récupère le dépôt scanné depuis sessionStorage
    const saved = typeof window !== "undefined" && sessionStorage.getItem("magasin_scan_depot");
    if (saved) setDepotScan(JSON.parse(saved));
    // Focus l'input pour permettre scan direct au clavier
    setTimeout(() => inputRef.current?.focus(), 200);
  }, [auth.ready, auth.structureId]);

  async function loadDepots() {
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    let dq = supabase.from("depots").select("id, nom, etablissement_id, magasin_id, etablissements(nom)").eq("structure_id", auth.structureId);
    if (magasinCtx.isUserMagasin && magasinCtx.magasinId) {
      dq = dq.or(`magasin_id.eq.${magasinCtx.magasinId},magasin_id.is.null`);
    }
    const d = await tryFetch(dq);
    setDepots(d);
  }

  function chooseDepot(d) {
    setDepotScan(d);
    sessionStorage.setItem("magasin_scan_depot", JSON.stringify(d));
  }
  function resetDepot() {
    setDepotScan(null);
    sessionStorage.removeItem("magasin_scan_depot");
  }

  async function resolveCode(code) {
    if (!code?.trim()) return;
    setLoading(true);
    setResolved(null);
    const c = code.trim();
    const tryFetch = async (q) => { try { const r = await q; return r.data || null; } catch { return null; } };

    // 1. Cherche article par EAN13 / code_barre / code
    let item = await tryFetch(supabase.from("articles").select("*").or(`code_ean13.eq.${c},code_barre.eq.${c},code.eq.${c}`).limit(1).maybeSingle());
    if (item) {
      setResolved({ kind: "article", data: item });
      setLoading(false);
      return;
    }

    // 2. Cherche matériel par num_serie / num_parc / num_lot / udi_di
    item = await tryFetch(supabase.from("materiels").select("*, articles(libelle, code, code_ean13)").or(`num_serie.eq.${c},num_parc.eq.${c},num_lot.eq.${c},udi_di.eq.${c}`).limit(1).maybeSingle());
    if (item) {
      setResolved({ kind: "materiel", data: item });
      setLoading(false);
      return;
    }

    // 3. Cherche par URL (QR avec /article/UUID ou /materiel/UUID)
    const uuidMatch = c.match(/\/(article|materiel)\/([a-f0-9-]+)/i);
    if (uuidMatch) {
      const [, type, id] = uuidMatch;
      if (type === "article") {
        item = await tryFetch(supabase.from("articles").select("*").eq("id", id).maybeSingle());
        if (item) { setResolved({ kind: "article", data: item }); setLoading(false); return; }
      } else {
        item = await tryFetch(supabase.from("materiels").select("*, articles(libelle, code)").eq("id", id).maybeSingle());
        if (item) { setResolved({ kind: "materiel", data: item }); setLoading(false); return; }
      }
    }

    // Pas trouvé
    setResolved({ kind: "not_found", data: { code: c } });
    setLoading(false);
  }

  function onScanSubmit(e) {
    e?.preventDefault();
    resolveCode(scannedCode);
  }

  function doAction(action) {
    if (!resolved) return;
    if (action.v === "info") {
      router.push(resolved.kind === "article" ? `/article/${resolved.data.id}` : `/materiel/${resolved.data.id}`);
      return;
    }
    // Construit l'URL avec context (article/matériel + dépôt scanné)
    const params = new URLSearchParams();
    if (resolved.kind === "article") params.set("article_id", resolved.data.id);
    if (resolved.kind === "materiel") params.set("materiel_id", resolved.data.id);
    if (depotScan?.id) params.set("depot_id", depotScan.id);
    router.push(`${action.route}?${params.toString()}`);
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <MagasinSidebar />
        <div className="page-content" style={{ flex: 1, padding: "20px 24px", maxWidth: 1000 }}>
          <PageHead icon="ti-scan" title="Scan magasin" subtitle="Scanner un QR / code-barre → choisir l'action" />

          {/* Dépôt scan (contexte qui filtre les actions) */}
          <Panel style={{ marginTop: 12, borderLeft: "4px solid #5a8f8f" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#5a6878", letterSpacing: 1, marginBottom: 4 }}>📍 Dépôt courant (contexte)</div>
                {depotScan ? (
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#142131" }}>
                    🏬 {depotScan.nom}
                    {depotScan.etablissements?.nom && <span style={{ fontSize: 12, fontWeight: 400, color: "#5a6878", marginLeft: 8 }}>· {depotScan.etablissements.nom}</span>}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "#8a98a8", fontStyle: "italic" }}>Aucun dépôt sélectionné — entrées stock désactivées</div>
                )}
              </div>
              {depotScan ? (
                <Btn variant="ghost" icon="ti-x" onClick={resetDepot}>Changer</Btn>
              ) : (
                <select onChange={(e) => { const d = depots.find(x => x.id === e.target.value); if (d) chooseDepot(d); }} style={{ padding: "8px 10px", border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 13, minWidth: 280 }}>
                  <option value="">— Choisir un dépôt —</option>
                  {depots.map(d => <option key={d.id} value={d.id}>🏬 {d.nom} {d.etablissements?.nom ? `· ${d.etablissements.nom}` : ""}</option>)}
                </select>
              )}
            </div>
          </Panel>

          {/* Saisie code */}
          <Panel style={{ marginTop: 12 }}>
            <form onSubmit={onScanSubmit}>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#5a6878", letterSpacing: 1, display: "block", marginBottom: 6 }}>🔍 Code à résoudre</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input ref={inputRef} type="text" value={scannedCode} onChange={(e) => setScannedCode(e.target.value)} placeholder="EAN13, UDI, N° série, N° parc, URL QR…" style={{ flex: 1, padding: "12px 14px", border: "2px solid #185FA5", borderRadius: 8, fontFamily: "Consolas, monospace", fontSize: 15 }} autoFocus />
                <Btn variant="primary" icon="ti-search" type="submit" disabled={loading || !scannedCode.trim()}>{loading ? "..." : "Résoudre"}</Btn>
              </div>
              <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 4, fontStyle: "italic" }}>💡 Scanner physique : le code apparaitra automatiquement, click "Résoudre" (ou Enter)</div>
            </form>
          </Panel>

          {/* Résultat */}
          {resolved && (
            <Panel style={{ marginTop: 12 }}>
              {resolved.kind === "not_found" ? (
                <div style={{ padding: 20, textAlign: "center" }}>
                  <i className="ti ti-zoom-question" style={{ fontSize: 40, color: "#e35d5b" }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#e35d5b", marginTop: 8 }}>Code introuvable</div>
                  <div style={{ fontSize: 12, color: "#5a6878", marginTop: 4 }}>"{resolved.data.code}" ne correspond à aucun article ni matériel.</div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ width: 50, height: 50, background: resolved.kind === "article" ? "rgba(94,160,90,.15)" : "rgba(122,111,176,.15)", color: resolved.kind === "article" ? "#5aa05a" : "#7a6fb0", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                      <i className={`ti ${resolved.kind === "article" ? "ti-package" : "ti-tool"}`} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: "#5a6878", letterSpacing: 1 }}>{resolved.kind === "article" ? "Article" : "Matériel"}</div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "#142131" }}>
                        {resolved.kind === "article" ? resolved.data.libelle : resolved.data.articles?.libelle || "—"}
                      </div>
                      <div style={{ fontSize: 11.5, color: "#5a6878", marginTop: 2 }}>
                        {resolved.kind === "article" ? (
                          <>
                            {resolved.data.code && <>Code : <b>{resolved.data.code}</b> · </>}
                            {resolved.data.code_ean13 && <>EAN13 : <b>{resolved.data.code_ean13}</b> · </>}
                            {resolved.data.code_gs1 && <>GS1 : <b>{resolved.data.code_gs1}</b></>}
                          </>
                        ) : (
                          <>
                            {resolved.data.num_serie && <>N° série : <b>{resolved.data.num_serie}</b> · </>}
                            {resolved.data.num_parc && <>N° parc : <b>{resolved.data.num_parc}</b> · </>}
                            {resolved.data.udi_di && <>UDI : <b>{resolved.data.udi_di}</b> · </>}
                            État : <b style={{ color: resolved.data.etat === "Disponible" ? "#5aa05a" : "#EF9F27" }}>{resolved.data.etat}</b>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions disponibles */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#5a6878", letterSpacing: 1, marginBottom: 10 }}>⚡ Actions disponibles</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                      {ACTIONS.map(a => {
                        const disabled = a.v === "entree" && !depotScan;
                        return (
                          <button key={a.v} onClick={() => !disabled && doAction(a)} disabled={disabled} title={disabled ? "Sélectionne un dépôt d'abord" : a.desc} style={{
                            background: disabled ? "#f4f7fa" : "#fff",
                            border: `2px solid ${disabled ? "#e3e9ee" : `${a.col}40`}`,
                            borderLeft: `4px solid ${a.col}`,
                            borderRadius: 10, padding: 12,
                            textAlign: "left", cursor: disabled ? "not-allowed" : "pointer",
                            fontFamily: "inherit",
                            opacity: disabled ? 0.5 : 1,
                          }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: a.col }}>{a.l}</div>
                            <div style={{ fontSize: 11, color: "#5a6878", marginTop: 3 }}>{a.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
