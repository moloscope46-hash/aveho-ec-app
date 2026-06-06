"use client";
// =============================================================
//  /depots/[id]/qr — Page imprimable A4 avec gros QR du dépôt
//  Pour coller physiquement sur l'étagère / mur / porte du dépôt
//  Scan → /scan/depot/[id] (landing avec actions)
// =============================================================
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/useAuth";

export default function DepotQrPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const [depot, setDepot] = useState(null);
  const [loading, setLoading] = useState(true);

  // Génère l'URL absolue pour le QR
  const targetUrl = typeof window !== "undefined"
    ? `${window.location.origin}/scan/depot/${id}`
    : `/scan/depot/${id}`;
  // QR via api gratuite qrserver (existe déjà dans le projet 0.58.75)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=20&format=png&data=${encodeURIComponent(targetUrl)}`;

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      try {
        const { data } = await supabase.from("depots").select("*").eq("id", id).maybeSingle();
        setDepot(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [id, auth.ready]);

  function printPage() {
    window.print();
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#5a6878" }}>Chargement...</div>;
  if (!depot) return <div style={{ padding: 40, textAlign: "center", color: "#c0392b" }}>Dépôt introuvable</div>;

  return (
    <>
      <style jsx global>{`
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .print-page { padding: 0 !important; max-width: none !important; }
          @page { margin: 1cm; size: A4 portrait; }
        }
      `}</style>

      <div className="no-print" style={{ background: "#142131", padding: 14, display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 100 }}>
        <button onClick={() => router.back()} style={{ background: "rgba(255,255,255,.12)", color: "#fff", border: "1px solid rgba(255,255,255,.22)", padding: "8px 14px", borderRadius: 8, fontFamily: "inherit", cursor: "pointer" }}>
          <i className="ti ti-arrow-left" /> Retour
        </button>
        <h1 style={{ margin: 0, fontSize: 16, color: "#fff", flex: 1 }}>Étiquette QR · {depot.nom}</h1>
        <button onClick={printPage} style={{ background: "linear-gradient(135deg, #7CC8C8, #5db5b5)", color: "#142131", border: "none", padding: "10px 18px", borderRadius: 8, fontFamily: "inherit", fontWeight: 700, cursor: "pointer" }}>
          <i className="ti ti-printer" /> Imprimer
        </button>
      </div>

      <div className="print-page" style={{ maxWidth: 720, margin: "0 auto", padding: "40px 30px", background: "#fff", minHeight: "100vh", color: "#142131" }}>
        <div style={{ border: `4px solid ${depot.couleur || "#142131"}`, borderRadius: 14, padding: 30, textAlign: "center" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#5a6878", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
            AVEHO · DÉPÔT
          </div>
          <h1 style={{ fontSize: 36, margin: "0 0 8px", color: depot.couleur || "#142131", fontWeight: 700, letterSpacing: -0.5 }}>
            {depot.nom}
          </h1>
          {depot.code && (
            <div style={{ fontSize: 16, fontFamily: "Consolas, monospace", color: "#5a6878", marginBottom: 4 }}>
              {depot.code}
            </div>
          )}
          {depot.type && (
            <div style={{ fontSize: 12, color: "#8a98a8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>
              {depot.type}
            </div>
          )}

          {/* GROS QR */}
          <div style={{ background: "#fff", padding: 16, display: "inline-block", borderRadius: 8, margin: "10px 0" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt={`QR du dépôt ${depot.nom}`} width={500} height={500} style={{ display: "block" }} />
          </div>

          <div style={{ fontSize: 14, color: "#5a6878", marginTop: 14, fontWeight: 600 }}>
            <i className="ti ti-scan" /> Scannez ce QR pour gérer ce dépôt
          </div>
          <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 4, fontFamily: "Consolas, monospace", wordBreak: "break-all" }}>
            {targetUrl}
          </div>

          {/* Pictos actions disponibles */}
          <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 24, paddingTop: 18, borderTop: "1px dashed #cfd8e0", flexWrap: "wrap" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 36, height: 36, background: "#eef5fc", borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-package" style={{ color: "#185FA5", fontSize: 18 }} />
              </div>
              <div style={{ fontSize: 10, color: "#5a6878", marginTop: 4 }}>Voir matériels</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 36, height: 36, background: "#fff4e1", borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-clipboard-check" style={{ color: "#EF9F27", fontSize: 18 }} />
              </div>
              <div style={{ fontSize: 10, color: "#5a6878", marginTop: 4 }}>Inventaire</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 36, height: 36, background: "#f0edf7", borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-arrows-right-left" style={{ color: "#7a6fb0", fontSize: 18 }} />
              </div>
              <div style={{ fontSize: 10, color: "#5a6878", marginTop: 4 }}>Transfert</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 36, height: 36, background: "#e8f5e9", borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-plus" style={{ color: "#5aa05a", fontSize: 18 }} />
              </div>
              <div style={{ fontSize: 10, color: "#5a6878", marginTop: 4 }}>Ranger</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 36, height: 36, background: "#ffeae8", borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-alert-triangle" style={{ color: "#e35d5b", fontSize: 18 }} />
              </div>
              <div style={{ fontSize: 10, color: "#5a6878", marginTop: 4 }}>Signaler</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 10, color: "#8a98a8", fontStyle: "italic" }}>
          Aveho EC · Espace Collectivité · QR généré le {new Date().toLocaleDateString("fr-FR")}
        </div>
      </div>
    </>
  );
}
