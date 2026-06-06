"use client";
// =============================================================
//  /scan/depot/[id] — Landing après scan du QR collé sur un dépôt
//  Propose les 4 actions principales : inventaire, transfert, ranger, voir
// =============================================================
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/useAuth";
import TopBar from "../../../TopBar";
import { useCart } from "../../../useCart";
import { Panel, Btn } from "../../../ui";
import BackButton from "../../../components/BackButton";

const KEY_TRANSFERT_SRC = "av-transfert-source-depot";

export default function ScanDepotLandingPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [depot, setDepot] = useState(null);
  const [materielsCount, setMaterielsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [transfertSource, setTransfertSource] = useState(null);

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      try {
        const [{ data: d }, { count }] = await Promise.all([
          supabase.from("depots").select("*").eq("id", id).maybeSingle(),
          supabase.from("materiels").select("id", { count: "exact", head: true }).eq("depot_id", id),
        ]);
        setDepot(d);
        setMaterielsCount(count || 0);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }

      // Vérifie s'il y a un transfert en cours dans localStorage
      try {
        const stored = localStorage.getItem(KEY_TRANSFERT_SRC);
        if (stored) setTransfertSource(JSON.parse(stored));
      } catch {}
    })();
  }, [id, auth.ready]);

  // Si on est dans un workflow transfert (source déjà scannée) → ce dépôt = destination
  async function finalizeTransfert() {
    if (!transfertSource) return;
    if (transfertSource.depot_id === id) {
      alert("Source = destination, transfert inutile");
      return;
    }
    try {
      const payload = {
        structure_id: auth.structureId,
        etablissement_id: auth.etabId || null,
        depot_source_id: transfertSource.depot_id,
        depot_destination_id: id,
        materiel_id: transfertSource.materiel_id || null,
        statut: "Validée",
        cree_par_scan: true,
        date_validation: new Date().toISOString(),
        valide_par: auth.user?.id || null,
        motif: "Transfert créé par scan",
      };
      const { error } = await supabase.from("transferts").insert(payload);
      if (error) throw error;
      // Si on a un matériel précisé → on update son depot_id
      if (transfertSource.materiel_id) {
        await supabase.from("materiels").update({ depot_id: id }).eq("id", transfertSource.materiel_id);
      }
      localStorage.removeItem(KEY_TRANSFERT_SRC);
      setTransfertSource(null);
      router.push("/transferts?created=1");
    } catch (e) {
      alert("Erreur création transfert : " + (e.message || e));
    }
  }

  function startTransfertFromHere() {
    // Mémorise ce dépôt comme source
    const payload = { depot_id: id, depot_nom: depot?.nom };
    try { localStorage.setItem(KEY_TRANSFERT_SRC, JSON.stringify(payload)); } catch {}
    router.push("/scan/quick?mode=transfert-from");
  }

  function cancelTransfert() {
    try { localStorage.removeItem(KEY_TRANSFERT_SRC); } catch {}
    setTransfertSource(null);
  }

  if (!auth.ready || loading) return <div style={{ padding: 40, textAlign: "center", color: "#bfe6e6" }}>Chargement...</div>;
  if (!depot) return (
    <div className="bg-dark"><TopBar auth={auth} cartCount={cart.count} /><div className="wrap"><BackButton /><Panel style={{ textAlign: "center", color: "#c0392b" }}><i className="ti ti-alert-triangle" style={{ fontSize: 32 }} /><br/>Dépôt introuvable</Panel></div></div>
  );

  return (
    <div className="bg-dark">
      <TopBar auth={auth} cartCount={cart.count} />
      <div className="wrap">
        <BackButton />

        {/* En-tête dépôt avec couleur */}
        <div style={{
          background: `linear-gradient(135deg, ${depot.couleur || "#7CC8C8"}, ${depot.couleur || "#7CC8C8"}dd)`,
          color: "#fff", padding: "22px 26px", borderRadius: 14, marginBottom: 18,
          boxShadow: `0 8px 24px ${depot.couleur || "#7CC8C8"}44`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(255,255,255,.22)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <i className={`ti ${depot.icone || "ti-building-warehouse"}`} style={{ fontSize: 30 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, opacity: 0.85, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>
                <i className="ti ti-scan" /> Vous avez scanné
              </div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>{depot.nom}</h1>
              {depot.code && <div style={{ fontSize: 12, opacity: 0.8, fontFamily: "Consolas, monospace", marginTop: 2 }}>{depot.code}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "Consolas, monospace" }}>{materielsCount}</div>
              <div style={{ fontSize: 10, opacity: 0.85, textTransform: "uppercase", letterSpacing: 0.5 }}>matériels</div>
            </div>
          </div>
          {depot.securise && (
            <div style={{ marginTop: 12, padding: "6px 10px", background: "rgba(0,0,0,.15)", borderRadius: 6, fontSize: 11.5, fontWeight: 600 }}>
              <i className="ti ti-lock" /> Accès restreint — Vérifiez vos droits avant manipulation
            </div>
          )}
        </div>

        {/* Bandeau transfert en cours si applicable */}
        {transfertSource && transfertSource.depot_id !== id && (
          <Panel style={{ marginBottom: 14, background: "linear-gradient(135deg, rgba(122,111,176,.18), rgba(124,200,200,.14))", borderColor: "#7a6fb0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <i className="ti ti-arrows-right-left" style={{ fontSize: 22, color: "#7a6fb0" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#7a6fb0", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>Transfert en cours</div>
                <div style={{ fontSize: 13, color: "#142131" }}>
                  Source : <b>{transfertSource.depot_nom || "Dépôt inconnu"}</b>
                  {transfertSource.materiel_libelle && <> · Matériel : <b>{transfertSource.materiel_libelle}</b></>}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="primary" icon="ti-check" onClick={finalizeTransfert} style={{ flex: 1 }}>Valider le transfert ICI</Btn>
              <Btn variant="ghost" icon="ti-x" onClick={cancelTransfert}>Annuler</Btn>
            </div>
          </Panel>
        )}

        {/* 5 grandes actions (3+2) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <ActionTile color="#185FA5" icon="ti-package" label="Voir matériels" subtitle={`${materielsCount} dans ce dépôt`}
            onClick={() => router.push(`/materiels?depot=${id}`)} />
          <ActionTile color="#EF9F27" icon="ti-clipboard-check" label="Inventaire" subtitle="Compter & vérifier"
            onClick={() => router.push(`/inventaire/${id}`)} />
          <ActionTile color="#7a6fb0" icon="ti-arrows-right-left" label="Transfert depuis ici" subtitle="Démarrer un workflow scan"
            onClick={startTransfertFromHere} />
          <ActionTile color="#5aa05a" icon="ti-plus" label="Ranger un matériel ici" subtitle="Scan + assignation auto"
            onClick={() => router.push(`/scan/quick?mode=put&depot=${id}`)} />
          <ActionTile color="#e35d5b" icon="ti-alert-triangle" label="🛠 Signaler un problème" subtitle="Créer une DI pré-remplie"
            onClick={() => router.push(`/interventions?depot=${id}`)} fullWidth />
        </div>

        {/* Bouton imprimer si admin */}
        <div style={{ marginTop: 18, textAlign: "center" }}>
          <Btn variant="ghost" icon="ti-printer" onClick={() => router.push(`/depots/${id}/qr`)}>Réimprimer l'étiquette QR</Btn>
        </div>
      </div>
    </div>
  );
}

function ActionTile({ color, icon, label, subtitle, onClick, fullWidth }) {
  return (
    <button onClick={onClick} style={{
      gridColumn: fullWidth ? "span 2" : "auto",
      background: "#fff", border: `2px solid ${color}33`, borderRadius: 12,
      padding: "18px 16px", cursor: "pointer", fontFamily: "inherit",
      textAlign: "left", transition: "all .15s",
      borderLeft: `4px solid ${color}`,
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 20px ${color}33`; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{ width: 44, height: 44, background: `${color}1a`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 24 }} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#142131", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11, color: "#5a6878" }}>{subtitle}</div>
    </button>
  );
}
