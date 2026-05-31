"use client";
// =============================================================
//  app/BiometricSection.js (Alpha 0.55.17)
//
//  Section "Connexion biométrique" pour /profil.
//  Affiche pour chaque méthode (empreinte + face) :
//   - État sur cet appareil + bouton activer/désactiver
//   - Liste des appareils enregistrés pour cette méthode
// =============================================================

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase";
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  isMobileDevice,
  isLikelyFaceCapable,
  getAvailableMethods,
  listMyCredentials,
  registerBiometric,
  revokeCredential,
  getDeviceName,
  clearOptInState,
  METHOD_LABEL,
  METHOD_ICON,
  METHOD_COLOR,
} from "../lib/webauthn";

export default function BiometricSection({ auth }) {
  const supabase = createClient();
  const [supported, setSupported] = useState(false);
  const [platformOk, setPlatformOk] = useState(false);
  const [localMethods, setLocalMethods] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // method en cours d'activation
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
        const methods = await getAvailableMethods(auth.user.email);
        setLocalMethods(methods);
      }
    } catch (e) {
      console.warn("[BiometricSection] refresh fail:", e);
    }
  }

  async function activate(method) {
    setBusy(method);
    setErr("");
    setOkMsg("");
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
        authMethod: method,
      });
      clearOptInState();
      setOkMsg(`${METHOD_LABEL[method]} activée !`);
      await refresh();
      setTimeout(() => setOkMsg(""), 2500);
    } catch (e) {
      setErr(e.message || "Erreur");
    } finally {
      setBusy(null);
    }
  }

  async function revoke(cred) {
    if (!confirm(`Désactiver "${METHOD_LABEL[cred.auth_method] || "Biométrie"}" sur "${cred.device_name}" ?`)) return;
    setBusy("revoke");
    setErr("");
    setOkMsg("");
    try {
      await revokeCredential(supabase, cred.id, auth.user?.email, cred.auth_method);
      setOkMsg("Appareil désactivé.");
      await refresh();
      setTimeout(() => setOkMsg(""), 2500);
    } catch (e) {
      setErr(e.message || "Erreur");
    } finally {
      setBusy(null);
    }
  }

  if (!supported || !platformOk) {
    return (
      <div style={{ padding: "12px 14px", background: "#f4f7fa", border: "1px solid #e3e9ee", borderRadius: 8, fontSize: 12, color: "#6c7a89" }}>
        <i className="ti ti-info-circle" /> L'authentification biométrique n'est pas disponible sur ce navigateur ou cet appareil.
        {isMobileDevice() ? " Essayez sur un autre appareil." : " Cette fonctionnalité est conçue pour les appareils avec empreinte ou caméra de reconnaissance faciale."}
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

      {/* Bandeau état device courant pour les 2 méthodes */}
      <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
        <MethodRow
          method="empreinte"
          title="Empreinte digitale"
          desc="Touch ID, capteur d'empreinte Android, Windows Hello"
          icon="ti-fingerprint"
          color="#185FA5"
          active={localMethods.includes("empreinte")}
          busy={busy === "empreinte"}
          disabled={!!busy}
          onActivate={() => activate("empreinte")}
        />
        <MethodRow
          method="face"
          title="Détection faciale"
          desc="Face ID (iPhone/iPad), Windows Hello caméra"
          icon="ti-face-id"
          color="#7a6fb0"
          suggested={isLikelyFaceCapable() && !localMethods.includes("face")}
          active={localMethods.includes("face")}
          busy={busy === "face"}
          disabled={!!busy}
          onActivate={() => activate("face")}
        />
      </div>

      {/* Liste des appareils enregistrés */}
      <h3 style={{ fontSize: 14, color: "#142131", margin: "16px 0 8px", fontWeight: 700 }}>
        <i className="ti ti-devices" /> Appareils enregistrés ({credentials.length})
      </h3>
      {credentials.length === 0 ? (
        <p style={{ fontSize: 13, color: "#8a98a8", margin: "8px 0" }}>
          Aucun appareil enregistré.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {credentials.map((c) => {
            const isCurrentDevice = c.user_agent && c.user_agent.slice(0, 80) === navigator.userAgent.slice(0, 80);
            const methodKey = c.auth_method || "empreinte";
            const methodColor = METHOD_COLOR[methodKey] || "#185FA5";
            const methodIcon = METHOD_ICON[methodKey] || "ti-fingerprint";
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
                <span style={{
                  width: 36, height: 36,
                  background: methodColor + "15",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <i className={`ti ${methodIcon}`} style={{ fontSize: 20, color: methodColor }} />
                </span>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#142131", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {c.device_name || "Appareil sans nom"}
                    <span style={{
                      background: methodColor + "22",
                      color: methodColor,
                      padding: "1px 8px",
                      borderRadius: 8,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.3,
                    }}>
                      {METHOD_LABEL[methodKey]?.toUpperCase() || "BIOMÉTRIE"}
                    </span>
                    {isCurrentDevice && (
                      <span style={{
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
                  onClick={() => revoke(c)}
                  disabled={busy === "revoke"}
                  title="Désactiver cette méthode sur cet appareil"
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
        Vos données biométriques ne quittent jamais votre appareil. Aveho ne reçoit qu'un identifiant cryptographique. Pour activer une méthode sur un nouvel appareil, connectez-vous d'abord avec votre mot de passe depuis cet appareil.
      </div>
    </div>
  );
}

// =============================================================
//  Sub-component : ligne d'une méthode
// =============================================================
function MethodRow({ method, title, desc, icon, color, active, busy, disabled, suggested, onActivate }) {
  return (
    <div style={{
      background: active ? "#eef9ef" : suggested ? color + "08" : "#fff8ec",
      border: `1px solid ${active ? "#bfe2bf" : suggested ? color + "55" : "#f0d59f"}`,
      borderRadius: 10,
      padding: "12px 14px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
    }}>
      <i className={`ti ${icon}`} style={{
        fontSize: 28,
        color: active ? "#2e6f33" : color,
        flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#142131", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {active ? `${title} activée sur cet appareil` : `${title} non activée`}
          {suggested && !active && (
            <span style={{
              background: color + "22",
              color: color,
              padding: "1px 8px",
              borderRadius: 8,
              fontSize: 10,
              fontWeight: 700,
            }}>RECOMMANDÉ</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "#6c7a89", marginTop: 2 }}>
          {active ? "Vous pouvez vous connecter avec cette méthode." : desc}
        </div>
      </div>
      {!active && (
        <button
          onClick={onActivate}
          disabled={disabled}
          style={{
            background: busy ? "#8a98a8" : `linear-gradient(135deg, #142131, ${color})`,
            color: "#fff",
            border: "none",
            padding: "9px 14px",
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 700,
            cursor: disabled ? "wait" : "pointer",
            fontFamily: "inherit",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            minHeight: 38,
            flexShrink: 0,
          }}
        >
          {busy ? (
            <><i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> Activation…</>
          ) : (
            <><i className={`ti ${icon}`} /> Activer</>
          )}
        </button>
      )}
    </div>
  );
}
