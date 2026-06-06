"use client";
// =============================================================
//  /mobile/di — Hub Demandes d'intervention (4 types)
//  Maintenance · Désinfection · Retour · Rebut
// =============================================================
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/useAuth";
import MobileSubHeader from "../../components/MobileSubHeader";

const TYPES_DI = [
  {
    key: "maintenance",
    color: "#EF9F27",
    icon: "ti-tools",
    label: "Maintenance",
    subtitle: "Panne · réparation · préventif",
    detail: "Le matériel passe en état 'En maintenance'. Une DI est créée et assignée.",
    materielEtat: "Maintenance",
    diType: "Panne / réparation",
  },
  {
    key: "desinfection",
    color: "#7CC8C8",
    icon: "ti-spray",
    label: "Désinfection",
    subtitle: "Nettoyage · stérilisation",
    detail: "Le matériel passe en état 'En désinfection'. À refaire scanner à la sortie pour remise en circulation.",
    materielEtat: "En désinfection",
    diType: "Nettoyage / désinfection",
  },
  {
    key: "retour",
    color: "#185FA5",
    icon: "ti-arrow-back-up",
    label: "Retour fournisseur",
    subtitle: "Retour stock · échange · SAV",
    detail: "Le matériel passe en état 'Retour fournisseur'. Un BL retour sera généré.",
    materielEtat: "Retour fournisseur",
    diType: "Remplacement / changement",
  },
  {
    key: "rebut",
    color: "#e35d5b",
    icon: "ti-trash",
    label: "Rebut / mise au rebut",
    subtitle: "Hors service définitif",
    detail: "Le matériel passe en état 'Rebut'. Sortie de stock définitive. Garde une trace pour comptabilité.",
    materielEtat: "Rebut",
    diType: "Autre",
  },
];

export default function MobileDIPage() {
  const router = useRouter();
  const auth = useAuth();
  if (!auth.ready) return null;

  function startDI(type) {
    // Stocke le type choisi pour le workflow scan suivant
    try {
      localStorage.setItem("av-di-mobile-type", JSON.stringify({
        key: type.key,
        materielEtat: type.materielEtat,
        diType: type.diType,
        color: type.color,
        label: type.label,
      }));
    } catch {}
    // Va scanner le matériel concerné
    router.push(`/scan/quick?mode=di&type=${type.key}`);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #142131 0%, #050a14 100%)",
      fontFamily: "Quicksand, sans-serif",
      paddingBottom: 60,
    }}>
      <MobileSubHeader title="Demande d'intervention" icon="ti-tools" color="#e35d5b" />

      <div style={{ padding: "12px 16px 0", color: "#bfe6e6", fontSize: 12.5 }}>
        Choisis le type de DI. Tu scanneras ensuite le matériel concerné — son état changera automatiquement.
      </div>

      <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {TYPES_DI.map(t => (
          <button key={t.key} onClick={() => startDI(t)} style={{
            background: "rgba(255,255,255,.05)",
            border: `2px solid ${t.color}33`,
            borderTop: `4px solid ${t.color}`,
            borderRadius: 14, padding: "18px 14px",
            cursor: "pointer", fontFamily: "inherit",
            transition: "all .15s",
            textAlign: "left",
            minHeight: 150,
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}
          onTouchStart={(e) => { e.currentTarget.style.transform = "scale(0.97)"; }}
          onTouchEnd={(e) => { e.currentTarget.style.transform = "scale(1)"; }}>
            <div>
              <div style={{ width: 44, height: 44, background: `${t.color}22`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                <i className={`ti ${t.icon}`} style={{ color: t.color, fontSize: 24 }} />
              </div>
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{t.label}</div>
              <div style={{ color: "#bfe6e6", fontSize: 11, lineHeight: 1.4 }}>{t.subtitle}</div>
            </div>
            <div style={{
              marginTop: 10, padding: "5px 8px", borderRadius: 6,
              background: `${t.color}1a`, color: t.color,
              fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase",
              display: "inline-block"
            }}>
              <i className="ti ti-scan" /> Scanner le matériel
            </div>
          </button>
        ))}
      </div>

      {/* Lien vers la liste */}
      <div style={{ padding: "20px 16px 0", textAlign: "center" }}>
        <button onClick={() => router.push("/interventions")} style={{
          background: "rgba(255,255,255,.05)",
          color: "#bfe6e6", border: "1px solid rgba(255,255,255,.16)",
          padding: "10px 18px", borderRadius: 10, fontFamily: "inherit", fontSize: 12.5, cursor: "pointer",
        }}>
          <i className="ti ti-list" /> Voir toutes les DI en cours
        </button>
      </div>
    </div>
  );
}
