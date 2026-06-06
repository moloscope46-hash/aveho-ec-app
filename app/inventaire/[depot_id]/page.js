"use client";
// =============================================================
//  /inventaire/[depot_id] — Inventaire scan d'un dépôt
//  Workflow : liste théorique → scan caméra → coche → écarts
// =============================================================
import { useEffect, useState, useMemo, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { Panel, Btn, PageHead } from "../../ui";
import { toast } from "../../components/ui-premium";
import BackButton from "../../components/BackButton";
import QrScanner from "../../QrScanner";

export default function InventairePage({ params }) {
  const { depot_id: depotId } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();

  const [depot, setDepot] = useState(null);
  const [materiels, setMateriels] = useState([]);     // théoriques (depot_id = ce dépôt)
  const [scanned, setScanned] = useState(new Set()); // ids matériels scannés/cochés
  const [intrus, setIntrus] = useState([]);          // matériels scannés mais d'un autre dépôt
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastBeep, setLastBeep] = useState(0);

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      try {
        const [{ data: d }, { data: mats }] = await Promise.all([
          supabase.from("depots").select("*").eq("id", depotId).maybeSingle(),
          supabase.from("materiels")
            .select("id, libelle, numero_serie, numero_lot, etat, emplacement, depot_id")
            .eq("structure_id", auth.structureId)
            .eq("depot_id", depotId)
            .order("libelle")
            .limit(1000),
        ]);
        setDepot(d);
        setMateriels(mats || []);
      } catch (e) { console.error(e); toast.error("Erreur chargement"); }
      finally { setLoading(false); }
    })();
  }, [depotId, auth.ready, auth.structureId]);

  // Recherche / résultats
  const filtered = useMemo(() => {
    if (!searchQ.trim()) return materiels;
    const q = searchQ.toLowerCase();
    return materiels.filter(m =>
      (m.libelle || "").toLowerCase().includes(q) ||
      (m.numero_serie || "").toLowerCase().includes(q) ||
      (m.numero_lot || "").toLowerCase().includes(q) ||
      (m.emplacement || "").toLowerCase().includes(q)
    );
  }, [materiels, searchQ]);

  // Écarts
  const manquants = useMemo(() =>
    materiels.filter(m => !scanned.has(m.id)),
    [materiels, scanned]
  );
  const trouves = useMemo(() =>
    materiels.filter(m => scanned.has(m.id)),
    [materiels, scanned]
  );
  const progressPct = materiels.length === 0 ? 0
    : Math.round((trouves.length / materiels.length) * 100);

  function beep(success = true) {
    // Anti-spam: 1 beep / 300ms max
    const now = Date.now();
    if (now - lastBeep < 300) return;
    setLastBeep(now);
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = success ? 880 : 220;
      g.gain.value = 0.08;
      o.start(); o.stop(ctx.currentTime + 0.10);
    } catch {}
  }

  async function handleScan({ text }) {
    if (!text || busy) return;
    setBusy(true);
    try {
      // Cherche le matériel par numero_serie, numero_lot, ou id direct
      // Le QR contient typiquement l'id ou un code-barre
      let mat = materiels.find(m =>
        m.id === text ||
        m.numero_serie === text ||
        m.numero_lot === text
      );
      // Si pas trouvé dans la liste théorique → chercher en DB (peut-être intrus)
      if (!mat) {
        const { data: dbResult } = await supabase
          .from("materiels")
          .select("id, libelle, numero_serie, numero_lot, depot_id, etat, emplacement")
          .or(`id.eq.${text},numero_serie.eq.${text},numero_lot.eq.${text}`)
          .eq("structure_id", auth.structureId)
          .maybeSingle();
        if (dbResult) {
          // Matériel existe mais d'un autre dépôt = intrus
          if (dbResult.depot_id !== depotId) {
            if (!intrus.find(i => i.id === dbResult.id)) {
              setIntrus(prev => [...prev, dbResult]);
              beep(false);
              toast.warning(`⚠ Intrus : ${dbResult.libelle} (d'un autre dépôt)`);
            }
          } else {
            // Sinon il est dans notre depot mais pas chargé (limite 1000) → ajoute-le
            setMateriels(prev => [...prev, dbResult]);
            setScanned(prev => new Set([...prev, dbResult.id]));
            beep(true);
            toast.success(`✓ ${dbResult.libelle}`);
          }
        } else {
          beep(false);
          toast.error(`Code "${text.slice(0, 20)}" inconnu`);
        }
        setBusy(false);
        return;
      }
      // Trouvé dans la liste théorique
      if (scanned.has(mat.id)) {
        toast.info(`Déjà scanné : ${mat.libelle}`);
      } else {
        setScanned(prev => new Set([...prev, mat.id]));
        beep(true);
        toast.success(`✓ ${mat.libelle}`);
      }
    } catch (e) {
      console.error(e);
      beep(false);
    } finally {
      setBusy(false);
    }
  }

  function toggleManual(id) {
    setScanned(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function validateInventaire() {
    if (!confirm(`Valider l'inventaire ?\n\n${trouves.length} trouvés / ${materiels.length} attendus\n${manquants.length} manquants · ${intrus.length} intrus\n\nLa date d'inventaire sera enregistrée.`)) return;
    try {
      await supabase.from("depots").update({
        inventaire_dernier: new Date().toISOString(),
        inventaire_dernier_par: auth.user?.id || null,
        inventaire_ecarts_count: manquants.length + intrus.length,
      }).eq("id", depotId);
      toast.success("Inventaire validé !");
      router.push(`/depots`);
    } catch (e) {
      toast.error("Erreur : " + e.message);
    }
  }

  if (!auth.ready) return null;
  if (loading) return <div className="bg-dark"><TopBar auth={auth} cartCount={cart.count} /><div className="wrap"><Panel>Chargement...</Panel></div></div>;

  return (
    <div className="bg-dark">
      <TopBar auth={auth} cartCount={cart.count} />
      <div className="wrap">
        <BackButton />
        <PageHead
          eyebrow="INVENTAIRE · SCAN AUTOMATIQUE"
          icon="ti-clipboard-check"
          title={depot?.nom || "Inventaire"}
          accent={`${trouves.length}/${materiels.length}`}
          sub={depot?.code ? `Code : ${depot.code}` : "Compte par scan caméra ou validation manuelle"}
        />

        {/* Barre de progression */}
        <Panel style={{ marginBottom: 14, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ flex: 1, fontSize: 13, color: "#5a6878" }}>Avancement inventaire</span>
            <span style={{ fontSize: 24, fontWeight: 700, color: progressPct === 100 ? "#5aa05a" : "#185FA5", fontFamily: "Consolas, monospace" }}>{progressPct}%</span>
          </div>
          <div style={{ width: "100%", height: 12, background: "#e3e9ee", borderRadius: 6, overflow: "hidden" }}>
            <div style={{
              width: `${progressPct}%`, height: "100%",
              background: progressPct === 100 ? "linear-gradient(90deg, #5aa05a, #4a8a4a)" : "linear-gradient(90deg, #7CC8C8, #185FA5)",
              transition: "width 250ms ease-out",
              boxShadow: "0 0 8px rgba(124,200,200,.5)",
            }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 14 }}>
            <Stat color="#185FA5" label="Attendus" value={materiels.length} icon="ti-package" />
            <Stat color="#5aa05a" label="Trouvés" value={trouves.length} icon="ti-check" />
            <Stat color="#e35d5b" label="Manquants" value={manquants.length} icon="ti-alert-triangle" />
            <Stat color="#7a6fb0" label="Intrus" value={intrus.length} icon="ti-help-circle" />
          </div>
        </Panel>

        {/* Scanner */}
        {scannerOpen ? (
          <Panel style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ margin: 0, flex: 1, fontSize: 15 }}><i className="ti ti-scan" /> Scan continu</h3>
              <Btn variant="ghost" icon="ti-x" onClick={() => setScannerOpen(false)}>Fermer</Btn>
            </div>
            <QrScanner onScan={handleScan} />
            <p style={{ fontSize: 11.5, color: "#5a6878", marginTop: 8, textAlign: "center" }}>
              <i className="ti ti-info-circle" /> Le scanner reste ouvert. Scanne chaque matériel l'un après l'autre.
            </p>
          </Panel>
        ) : (
          <Panel style={{ marginBottom: 14, background: "linear-gradient(135deg, rgba(124,200,200,.10), rgba(255,255,255,.95))", textAlign: "center", padding: 22 }}>
            <i className="ti ti-scan" style={{ fontSize: 44, color: "#7CC8C8", display: "block", marginBottom: 10 }} />
            <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "#142131" }}>Prêt à scanner</h3>
            <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "#5a6878" }}>Active la caméra et scanne chaque matériel pour le compter</p>
            <Btn variant="primary" icon="ti-camera" onClick={() => setScannerOpen(true)}>Démarrer le scan</Btn>
          </Panel>
        )}

        {/* Recherche manuelle */}
        <Panel style={{ marginBottom: 14, padding: "12px 14px" }}>
          <input
            type="search"
            placeholder="🔍 Rechercher (cocher manuellement)"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            style={{ width: "100%", padding: "8px 14px", border: "1px solid #e3e9ee", borderRadius: 18, fontSize: 13, fontFamily: "inherit" }}
          />
        </Panel>

        {/* Liste matériels */}
        <Panel style={{ marginBottom: 14 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, color: "#142131" }}>
            <i className="ti ti-list" /> Matériels théoriques ({filtered.length})
          </h3>
          {filtered.length === 0 ? (
            <p style={{ textAlign: "center", color: "#8a98a8", padding: 16, fontSize: 12.5 }}>Aucun matériel dans ce dépôt</p>
          ) : (
            <div style={{ maxHeight: 420, overflowY: "auto", border: "1px solid #f0f3f6", borderRadius: 8 }}>
              {filtered.map(m => {
                const isScanned = scanned.has(m.id);
                return (
                  <div key={m.id} onClick={() => toggleManual(m.id)} style={{
                    padding: "10px 14px", borderBottom: "1px solid #f0f3f6",
                    cursor: "pointer", display: "flex", gap: 12, alignItems: "center",
                    background: isScanned ? "rgba(90,160,90,.08)" : "transparent",
                    transition: "background .12s",
                  }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: 5,
                      border: `2px solid ${isScanned ? "#5aa05a" : "#cfd8e0"}`,
                      background: isScanned ? "#5aa05a" : "transparent",
                      display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      {isScanned && <i className="ti ti-check" style={{ color: "#fff", fontSize: 14 }} />}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#142131", textDecoration: isScanned ? "line-through" : "none", opacity: isScanned ? 0.6 : 1 }}>
                        {m.libelle || "Matériel sans libellé"}
                      </div>
                      <div style={{ display: "flex", gap: 8, fontSize: 10.5, color: "#5a6878", marginTop: 2, flexWrap: "wrap" }}>
                        {m.numero_serie && <span><i className="ti ti-hash" /> S/N {m.numero_serie}</span>}
                        {m.numero_lot && <span><i className="ti ti-package" /> Lot {m.numero_lot}</span>}
                        {m.emplacement && <span style={{ color: "#7a6fb0", fontWeight: 600 }}><i className="ti ti-map-pin" /> {m.emplacement}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                      background: m.etat === "Disponible" ? "rgba(90,160,90,.15)" : "rgba(239,159,39,.15)",
                      color: m.etat === "Disponible" ? "#5aa05a" : "#EF9F27"
                    }}>{m.etat || "—"}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Intrus */}
        {intrus.length > 0 && (
          <Panel style={{ marginBottom: 14, borderLeft: "4px solid #7a6fb0", background: "rgba(122,111,176,.04)" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#7a6fb0" }}>
              <i className="ti ti-help-circle" /> Intrus scannés ({intrus.length})
            </h3>
            <p style={{ fontSize: 12, color: "#5a6878", margin: "0 0 10px" }}>
              Ces matériels sont enregistrés dans un autre dépôt mais ont été scannés ici. Pense à les transférer.
            </p>
            {intrus.map(m => (
              <div key={m.id} style={{ padding: "6px 10px", background: "#fff", borderRadius: 6, marginBottom: 4, fontSize: 12 }}>
                <b>{m.libelle}</b>
                {m.numero_serie && <span style={{ color: "#5a6878", marginLeft: 8 }}>S/N {m.numero_serie}</span>}
              </div>
            ))}
          </Panel>
        )}

        {/* Actions finales */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn variant="primary" icon="ti-check-checks" onClick={validateInventaire} style={{ flex: 1, minWidth: 220 }}>
            Valider l'inventaire ({trouves.length}/{materiels.length})
          </Btn>
          <Btn variant="ghost" icon="ti-x" onClick={() => { setScanned(new Set()); setIntrus([]); }}>Reset</Btn>
        </div>
      </div>
    </div>
  );
}

function Stat({ color, label, value, icon }) {
  return (
    <div style={{ padding: "8px 10px", background: `${color}10`, borderLeft: `3px solid ${color}`, borderRadius: 6 }}>
      <div style={{ fontSize: 10, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 2 }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 11 }} /> {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "Consolas, monospace" }}>{value}</div>
    </div>
  );
}
