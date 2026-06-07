"use client";
// =============================================================
//  components/EtabContextHeader.js (0.62.73)
//
//  Header standardisé en haut des modals de création.
//  Affiche l'établissement courant (auth.etabId) avec lock visuel
//  pour rappeler à l'utilisateur où il crée.
//
//  Usage :
//    <Modal title="Nouvelle DI">
//      <EtabContextHeader auth={auth} />
//      <!-- reste du form -->
//    </Modal>
// =============================================================

export default function EtabContextHeader({ auth, color = "#185FA5", icon = "ti-building-hospital" }) {
  if (!auth?.etabId || !auth?.etabNom) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px",
      marginBottom: 14,
      background: `linear-gradient(135deg, ${color}10, ${color}05)`,
      border: `1px solid ${color}30`,
      borderLeft: `4px solid ${color}`,
      borderRadius: 10,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: `linear-gradient(135deg, ${color}, ${color}dd)`,
        color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, flexShrink: 0,
      }}>
        <i className={`ti ${icon}`} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: "#8a98a8", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700 }}>
          Création dans l'établissement
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#142131", lineHeight: 1.2, marginTop: 2 }}>
          {auth.etabNom}
        </div>
      </div>
      <i className="ti ti-lock" style={{ color: "#8a98a8", fontSize: 16 }} title="Établissement défini par votre contexte" />
    </div>
  );
}
