"use client";
// =============================================================
//  app/BiometricSection.js (Alpha 0.55.13)
//
//  Section "Sécurité & appareils" pour la page /profil.
//  Permet de :
//   - Voir la liste des appareils enregistrés (this device + autres)
//   - Activer l'empreinte sur l'appareil courant
//   - Renommer un appareil
//   - Révoquer un appareil
// =============================================================

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase";
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  isMobileDevice,
  hasLocalCredential,
  listMyCredentials,
  registerBiometric,
  revokeCredential,
  getDeviceName,
  clearOptInState,
} from "../lib/webauthn";

export default function BiometricSection({ auth }) {
  const supabase = createClient();
  const [supported, setSupported] = useState(false);
  const [platformOk, setPlatformOk] = useState(false);
  const [thisDeviceActive, setThisDeviceActive] = useState(false);
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  useEffect(() => {
    (async () => {
      setSupported(isWebAuthnSupported());
      if (isWebAuthnSupported()) {
        setPlatformOk(await isPlatformAuthenticatorAvailable());
      }
      await refresh();
      setLoading(false);
    })();
  }, [auth.user?.email]);

  async function refresh() {
    try {
      const list = await listMyCredentials(supabase);
      setCredentials(list);
      if (auth.user?.email) {
        setThisDeviceActive(await hasLocalCredential(auth.user.email));
      }
    } catch (e) {
      console.warn("[BiometricSection] refresh fail:", e);
    }
  }

  async function activate() {
    setBusy(true); setErr(""); setOkMsg("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !auth.user) throw new Error("Pas de session active");

      const { data: ms } = await supabase
        .from("membres_structure")
        .select("structure_id")
        .eq("user_id", auth.user.id)
        .eq("actif", true)
        .limit(1)
        .maybeSingle();

      await registerBiometric({
        supabase,
        email: auth.user.email,
        userId: auth.user.id,
        structureId: ms?.structure_id || null,
        refreshToken: session.refresh_token,
        deviceName: getDeviceName(),
      });
      clearOptInState();
      setOkMsg("Empreinte activée sur cet appareil !");
      await refresh();
      setTimeout(() => setOkMsg(""), 2500);
    } catch (e) {
      setErr(e.message || "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(credUuid, deviceName) {
    if (!confirm(`Désactiver l'empreinte pour "${deviceName}" ? L'appareil devra se reconnecter avec mot de passe.`)) return;
    setBusy(true); setErr(""); setOkMsg("");
    try {
      await revokeCredential(supabase, credUuid, auth.user?.email);
      setOkMsg("Appareil désactivé.");
      await refresh();
      setTimeout(() => setOkMsg(""), 2500);
    } catch (e) {
      setErr(e.message || "Erreur");
    } finally {
      setBusy(false);
    }
  }

  // Si WebAuthn pas dispo, on cache la section (rien d'utile à montrer)
  if (!supported || !platformOk) {
    return (
      <div style={{ padding: "12px 14px", background: "#f4f7fa", border: "1px solid #e3e9ee", borderRadius: 8, fontSize: 12, color: "#6c7a89" }}>
        <i className="ti ti-info-circle" /> L'authentification biométrique n'est pas disponible sur ce navigateur ou cet appareil.
        {isMobileDevice() ? " Essayez sur un autre appareil." : " Cette fonctionnalité est conçue pour les appareils mobiles avec empreinte digitale ou reconnaissance faciale."}
      </div>
    );
  }

  if (loading) {
    return <div style={{ color: "#8a98a8", fontSize: 13 }}>Chargement…</div>;
  }

  return (
    <div>
      {err && <div className="err" style={{ marginBottom: 10 }}>{err}</div>}
      {okMsg && <div className="ok" style={{ marginBottom: 10 }}>{okMsg}</div>}

      {/* État sur ce device */}
      <div style={{
        background: thisDeviceActive ? "#eef9ef" : "#fff8ec",
        border: `1px solid ${thisDeviceActive ? "#bfe2bf" : "#f0d59f"}`,
        borderRadius: 10,
        padding: "12px 14px",
        marginBottom: 14,
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}>
        <i className="ti ti-fingerprint" style={{
          fontSize: 28,
          color: thisDeviceActive ? "#2e6f33" : "#7a4f15",
          flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#142131" }}>
            {thisDeviceActive ? "Empreinte activée sur cet appareil" : "Empreinte non activée sur cet appareil"}
          </div>
          <div style={{ fontSize: 12, color: "#6c7a89", marginTop: 2 }}>
            {thisDeviceActive
              ? "Vous pouvez vous connecter avec votre empreinte depuis cet appareil."
              : `Appareil détecté : ${getDeviceName()}`}
          </div>
        </div>
        {!thisDeviceActive && (
          <button
            onClick={activate}
            disabled={busy}
            style={{
              background: "linear-gradient(135deg, #142131, #185FA5)",
              color: "#fff",
              border: "none",
              padding: "10px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: busy ? "wait" : "pointer",
              fontFamily: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              minHeight: 40,
            }}
          >
            <i className="ti ti-fingerprint" />
            {busy ? "Activation…" : "Activer maintenant"}
          </button>
        )}
      </div>

      {/* Liste des appareils enregistrés */}
      <h3 style={{ fontSize: 14, color: "#142131", margin: "16px 0 8px", fontWeight: 700 }}>
        <i className="ti ti-devices" /> Appareils enregistrés ({credentials.length})
      </h3>
      {credentials.length === 0 ? (
        <p style={{ fontSize: 13, color: "#8a98a8", margin: "8px 0" }}>
          Aucun appareil enregistré pour l'instant.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {credentials.map((c) => {
            const isCurrentDevice = thisDeviceActive && c.user_agent && c.user_agent.slice(0, 80) === navigator.userAgent.slice(0, 80);
            return (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  background: "#fff",
                  border: "1px solid #e3e9ee",
                  borderRadius: 8,
                  flexWrap: "wrap",
                }}
              >
                <i className="ti ti-device-mobile" style={{ fontSize: 22, color: "#185FA5", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#142131" }}>
                    {c.device_name || "Appareil sans nom"}
                    {isCurrentDevice && (
                      <span style={{
                        marginLeft: 8,
                        background: "#dff5e0",
                        color: "#2e6f33",
                        padding: "1px 8px",
                        borderRadius: 8,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: 0.3,
                      }}>
                        CET APPAREIL
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 2 }}>
                    Ajouté le {new Date(c.created_at).toLocaleDateString("fr-FR")}
                    {c.last_used_at && ` · Dernière utilisation ${new Date(c.last_used_at).toLocaleDateString("fr-FR")}`}
                  </div>
                </div>
                <button
                  onClick={() => revoke(c.id, c.device_name)}
                  disabled={busy}
                  title="Désactiver cet appareil"
                  style={{
                    background: "#fff",
                    color: "#c0392b",
                    border: "1px solid #f0c4be",
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: busy ? "wait" : "pointer",
                    fontFamily: "inherit",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <i className="ti ti-trash" /> Désactiver
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        marginTop: 14,
        padding: "10px 12px",
        background: "#f4f7fa",
        border: "1px solid #e3e9ee",
        borderRadius: 8,
        fontSize: 11.5,
        color: "#6c7a89",
        lineHeight: 1.55,
      }}>
        <i className="ti ti-info-circle" style={{ color: "#185FA5" }} />{" "}
        Chaque appareil enregistre son propre credential biométrique. Votre empreinte ne quitte jamais votre appareil — Aveho ne stocke que l'identifiant du credential et le nom de l'appareil.
        Pour activer l'empreinte sur un nouvel appareil, connectez-vous d'abord avec votre mot de passe depuis cet appareil.
      </div>
    </div>
  );
}
