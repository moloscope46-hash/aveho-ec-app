"use client";
// =============================================================
//  app/BiometricOptInModal.js (Alpha 0.55.17)
//
//  Modale qui propose les 2 méthodes biométriques :
//   - Empreinte digitale
//   - Détection faciale
//  L'user peut activer une ou les deux. Apparaît automatiquement
//  après login si au moins 1 méthode n'est pas encore activée.
// =============================================================

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase";
import {
  shouldShowBiometricOptIn,
  registerBiometric,
  markOptInSkipped,
  getDeviceName,
  getAvailableMethods,
  METHOD_LABEL,
  METHOD_ICON,
  METHOD_COLOR,
  isLikelyFaceCapable,
} from "../lib/webauthn";

export default function BiometricOptInModal({ forceShow = false, onClose }) {
  const supabase = createClient();
  const [open, setOpen] = useState(forceShow);
  const [busy, setBusy] = useState(null); // 'empreinte' | 'face' | null
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [user, setUser] = useState(null);
  const [enabledMethods, setEnabledMethods] = useState([]);

  useEffect(() => {
    if (forceShow) {
      setOpen(true);
      loadUserAndCheck(true);
      return;
    }
    function handler() { loadUserAndCheck(false); }
    window.addEventListener("aveho:login-success", handler);
    loadUserAndCheck(false);
    return () => window.removeEventListener("aveho:login-success", handler);
  }, [forceShow]);

  async function loadUserAndCheck(force) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setUser(session.user);
      setDeviceName(getDeviceName());
      const methods = await getAvailableMethods(session.user.email);
      setEnabledMethods(methods);

      if (force) { setOpen(true); return; }

      const should = await shouldShowBiometricOptIn(session.user.email);
      if (should) setTimeout(() => setOpen(true), 1500);
    } catch (e) {
      console.warn("[BiometricOptIn]", e);
    }
  }

  async function activateMethod(method) {
    setBusy(method);
    setErr("");
    setOkMsg("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !user) throw new Error("Pas de session active");

      const { data: ms } = await supabase
        .from("membres_structure")
        .select("structure_id")
        .eq("user_id", user.id)
        .eq("actif", true)
        .limit(1)
        .maybeSingle();

      await registerBiometric({
        supabase,
        email: user.email,
        userId: user.id,
        structureId: ms?.structure_id || null,
        refreshToken: session.refresh_token,
        deviceName: deviceName || getDeviceName(),
        authMethod: method,
      });
      setOkMsg(`${METHOD_LABEL[method]} activée !`);
      const newMethods = await getAvailableMethods(user.email);
      setEnabledMethods(newMethods);
      // Si les 2 méthodes sont maintenant activées, on ferme
      if (newMethods.length >= 2) {
        setTimeout(() => { setOpen(false); onClose?.(); }, 2000);
      }
    } catch (e) {
      setErr(e.message || "Erreur");
    } finally {
      setBusy(null);
    }
  }

  function skip() {
    markOptInSkipped();
    setOpen(false);
    onClose?.();
  }

  function close() {
    setOpen(false);
    onClose?.();
  }

  if (!open) return null;

  const allMethodsActive = enabledMethods.length >= 2;
  // Suggestion : activer face en priorité si appareil capable
  const faceSuggested = isLikelyFaceCapable();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,33,49,.7)",
        zIndex: 9990,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 14px",
        animation: "fadeIn .2s",
      }}
      onClick={(e) => e.target === e.currentTarget && skip()}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          maxWidth: 480,
          width: "100%",
          maxHeight: "92vh",
          overflow: "auto",
          boxShadow: "0 30px 80px rgba(0,0,0,.45)",
          animation: "modalIn .25s cubic-bezier(.2,.8,.2,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #142131 0%, #185FA5 100%)",
          color: "#fff",
          padding: "26px 24px 22px",
          textAlign: "center",
        }}>
          <div style={{
            display: "inline-flex",
            gap: 8,
            background: "rgba(255,255,255,.12)",
            border: "1px solid rgba(255,255,255,.25)",
            borderRadius: 30,
            padding: "10px 16px",
            marginBottom: 14,
          }}>
            <i className="ti ti-fingerprint" style={{ fontSize: 26, color: "#7CC8C8" }} />
            <i className="ti ti-face-id" style={{ fontSize: 26, color: "#bfa9e0" }} />
          </div>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>
            Connexion biométrique
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#cfe4f5" }}>
            Activez une ou plusieurs méthodes pour vous connecter plus vite
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px 22px" }}>
          {err && (
            <div style={{
              background: "#fce5e0", color: "#7a1f15", padding: "10px 12px",
              borderRadius: 8, fontSize: 12.5, marginBottom: 12,
              border: "1px solid #f0c4be",
            }}>
              <i className="ti ti-alert-circle" /> {err}
            </div>
          )}
          {okMsg && (
            <div style={{
              background: "#dff5e0", color: "#2e6f33", padding: "10px 12px",
              borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 12,
              border: "1px solid #bfe2bf",
            }}>
              <i className="ti ti-circle-check" /> {okMsg}
            </div>
          )}

          {/* Nom de l'appareil — partagé entre les 2 méthodes */}
          <div style={{
            background: "#f4f7fa",
            border: "1px solid #e3e9ee",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 12,
            color: "#6c7a89",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}>
            <b style={{ color: "#142131" }}>
              <i className="ti ti-device-mobile" /> Appareil :
            </b>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              disabled={!!busy}
              style={{
                border: "1px solid #d3d9e0",
                borderRadius: 6,
                padding: "5px 10px",
                fontSize: 12,
                flex: 1,
                minWidth: 140,
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* CARDS MÉTHODES */}
          <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
            <MethodCard
              method="empreinte"
              title="Empreinte digitale"
              desc="Touch ID, capteur d'empreinte Android, Windows Hello"
              icon="ti-fingerprint"
              color="#185FA5"
              active={enabledMethods.includes("empreinte")}
              busy={busy === "empreinte"}
              disabled={!!busy}
              onActivate={() => activateMethod("empreinte")}
            />
            <MethodCard
              method="face"
              title="Détection faciale"
              desc="Face ID (iPhone/iPad), Windows Hello caméra, reconnaissance Android"
              icon="ti-face-id"
              color="#7a6fb0"
              suggested={faceSuggested && !enabledMethods.includes("face")}
              active={enabledMethods.includes("face")}
              busy={busy === "face"}
              disabled={!!busy}
              onActivate={() => activateMethod("face")}
            />
          </div>

          {/* Info sécurité */}
          <div style={{
            background: "#eef5fc",
            border: "1px solid #bfd6f0",
            borderRadius: 8,
            padding: "9px 12px",
            fontSize: 11.5,
            color: "#142131",
            lineHeight: 1.55,
            marginBottom: 14,
          }}>
            <i className="ti ti-lock" style={{ color: "#185FA5" }} />{" "}
            <b>Vos données biométriques ne quittent jamais votre appareil.</b>
            {" "}Aveho ne reçoit qu'un identifiant cryptographique généré par votre OS.
          </div>

          {/* Footer actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={allMethodsActive ? close : skip}
              disabled={!!busy}
              style={{
                flex: 1,
                background: allMethodsActive ? "linear-gradient(135deg, #2e6f33, #5aa05a)" : "#f4f7fa",
                color: allMethodsActive ? "#fff" : "#6c7a89",
                border: allMethodsActive ? "none" : "1px solid #d3d9e0",
                padding: "12px",
                borderRadius: 8,
                fontSize: 13.5,
                fontWeight: 700,
                cursor: busy ? "wait" : "pointer",
                fontFamily: "inherit",
                minHeight: 44,
              }}
            >
              {allMethodsActive ? (
                <><i className="ti ti-circle-check" /> Terminer</>
              ) : enabledMethods.length > 0 ? (
                "C'est bon comme ça"
              ) : (
                "Plus tard"
              )}
            </button>
          </div>

          <p style={{
            textAlign: "center",
            fontSize: 10.5,
            color: "#8a98a8",
            margin: "10px 0 0",
          }}>
            Réactivable à tout moment depuis Profil → Connexion biométrique
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================
//  Sub-component : Carte d'une méthode
// =============================================================
function MethodCard({ method, title, desc, icon, color, active, busy, disabled, suggested, onActivate }) {
  return (
    <div style={{
      border: `1.5px solid ${active ? "#bfe2bf" : suggested ? color + "55" : "#e3e9ee"}`,
      background: active ? "#eef9ef" : suggested ? color + "08" : "#fff",
      borderRadius: 10,
      padding: "12px 14px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
      transition: "background .15s, border-color .15s",
    }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: active ? "#2e6f33" : color + "18",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        <i className={`ti ${icon}`} style={{
          fontSize: 22,
          color: active ? "#fff" : color,
        }} />
      </div>

      <div style={{ flex: 1, minWidth: 140 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#142131", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {title}
          {active && (
            <span style={{
              background: "#dff5e0",
              color: "#2e6f33",
              padding: "1px 8px",
              borderRadius: 8,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.3,
            }}>ACTIVÉE</span>
          )}
          {suggested && !active && (
            <span style={{
              background: color + "22",
              color: color,
              padding: "1px 8px",
              borderRadius: 8,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.3,
            }}>RECOMMANDÉ</span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: "#6c7a89", marginTop: 2 }}>
          {desc}
        </div>
      </div>

      {active ? (
        <i className="ti ti-circle-check" style={{ fontSize: 24, color: "#2e6f33", flexShrink: 0 }} />
      ) : (
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
            minHeight: 40,
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
