"use client";
// =============================================================
//  app/BiometricOptInModal.js (Alpha 0.55.13)
//
//  Modale qui apparaît automatiquement après une connexion réussie
//  sur mobile, si :
//   - WebAuthn supporté + platform authenticator dispo
//   - L'user n'a pas encore enregistré son empreinte pour ce compte
//     sur ce device
//   - L'user n'a pas refusé/skippé l'opt-in dans les 7 derniers jours
//
//  Le composant se monte sur toutes les pages via le layout, et
//  écoute l'événement custom "aveho:login-success" pour s'afficher.
//  Il peut aussi être déclenché manuellement depuis /profil.
// =============================================================

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase";
import {
  shouldShowBiometricOptIn,
  registerBiometric,
  markOptInSkipped,
  getDeviceName,
} from "../lib/webauthn";

export default function BiometricOptInModal({ forceShow = false, onClose }) {
  const supabase = createClient();
  const [open, setOpen] = useState(forceShow);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [user, setUser] = useState(null);

  // Écouter l'événement post-login + check initial au mount
  useEffect(() => {
    if (forceShow) {
      setOpen(true);
      loadUserAndCheck(true);
      return;
    }
    function handler() {
      loadUserAndCheck(false);
    }
    window.addEventListener("aveho:login-success", handler);
    // Check aussi au mount si user déjà connecté (cas refresh)
    loadUserAndCheck(false);
    return () => window.removeEventListener("aveho:login-success", handler);
  }, [forceShow]);

  async function loadUserAndCheck(force) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setUser(session.user);
      setDeviceName(getDeviceName());

      if (force) {
        setOpen(true);
        return;
      }

      const should = await shouldShowBiometricOptIn(session.user.email);
      if (should) {
        // Petit délai pour éviter de surprendre l'user
        setTimeout(() => setOpen(true), 1500);
      }
    } catch (e) {
      console.warn("[BiometricOptIn]", e);
    }
  }

  async function activate() {
    setBusy(true);
    setErr("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !user) throw new Error("Pas de session active");

      // Récupérer la structure de l'user (premier rattachement actif)
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
      });
      setOk(true);
      setTimeout(() => {
        setOpen(false);
        onClose?.();
      }, 2200);
    } catch (e) {
      setErr(e.message || "Erreur");
    } finally {
      setBusy(false);
    }
  }

  function skip() {
    markOptInSkipped();
    setOpen(false);
    onClose?.();
  }

  if (!open) return null;

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
          maxWidth: 420,
          width: "100%",
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,.45)",
          animation: "modalIn .25s cubic-bezier(.2,.8,.2,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #142131 0%, #185FA5 100%)",
          color: "#fff",
          padding: "28px 24px 22px",
          textAlign: "center",
        }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "rgba(255,255,255,.15)",
            border: "2px solid rgba(255,255,255,.3)",
            margin: "0 auto 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 38,
          }}>
            <i className="ti ti-fingerprint" style={{ color: "#7CC8C8" }} />
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
            Connexion par empreinte
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#cfe4f5" }}>
            Connectez-vous plus vite la prochaine fois
          </p>
        </div>

        {/* Body */}
        {ok ? (
          <div style={{ padding: "32px 24px", textAlign: "center" }}>
            <i className="ti ti-circle-check" style={{ fontSize: 56, color: "#2e6f33" }} />
            <h3 style={{ margin: "14px 0 6px", color: "#142131", fontSize: 18 }}>
              Empreinte activée !
            </h3>
            <p style={{ margin: 0, color: "#6c7a89", fontSize: 13 }}>
              <b>{deviceName}</b> a été enregistré.<br/>
              À votre prochaine connexion, utilisez votre empreinte.
            </p>
          </div>
        ) : (
          <div style={{ padding: "22px 24px 24px" }}>
            <ul style={{
              listStyle: "none",
              padding: 0,
              margin: "0 0 18px",
              fontSize: 13.5,
              lineHeight: 1.55,
              color: "#2a3a48",
            }}>
              <li style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "8px 0" }}>
                <span style={{ color: "#5aa05a", fontSize: 16, flexShrink: 0 }}>
                  <i className="ti ti-bolt" />
                </span>
                <span>Connexion rapide en une seconde</span>
              </li>
              <li style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "8px 0" }}>
                <span style={{ color: "#185FA5", fontSize: 16, flexShrink: 0 }}>
                  <i className="ti ti-lock" />
                </span>
                <span>Plus sécurisé qu'un mot de passe — votre empreinte ne quitte jamais votre appareil</span>
              </li>
              <li style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "8px 0" }}>
                <span style={{ color: "#7a6fb0", fontSize: 16, flexShrink: 0 }}>
                  <i className="ti ti-device-mobile" />
                </span>
                <span>Vous pourrez toujours utiliser votre mot de passe</span>
              </li>
            </ul>

            <div style={{
              background: "#f4f7fa",
              border: "1px solid #e3e9ee",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 12,
              color: "#6c7a89",
              marginBottom: 16,
            }}>
              <b style={{ color: "#142131" }}>
                <i className="ti ti-device-mobile" /> Appareil :
              </b>{" "}
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                disabled={busy}
                style={{
                  border: "1px solid #d3d9e0",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 12,
                  width: 160,
                  fontFamily: "inherit",
                  marginLeft: 4,
                }}
              />
            </div>

            {err && (
              <div style={{
                background: "#fce5e0",
                color: "#7a1f15",
                padding: "10px 12px",
                borderRadius: 8,
                fontSize: 12.5,
                marginBottom: 12,
                border: "1px solid #f0c4be",
              }}>
                <i className="ti ti-alert-circle" /> {err}
              </div>
            )}

            <button
              onClick={activate}
              disabled={busy}
              style={{
                width: "100%",
                background: busy ? "#8a98a8" : "linear-gradient(135deg, #142131, #185FA5)",
                color: "#fff",
                border: "none",
                padding: "14px",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: busy ? "wait" : "pointer",
                fontFamily: "inherit",
                marginBottom: 8,
                minHeight: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {busy ? (
                <>
                  <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> Activation…
                </>
              ) : (
                <>
                  <i className="ti ti-fingerprint" /> Activer maintenant
                </>
              )}
            </button>

            <button
              onClick={skip}
              disabled={busy}
              style={{
                width: "100%",
                background: "transparent",
                color: "#6c7a89",
                border: "none",
                padding: "10px",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Plus tard
            </button>

            <p style={{
              textAlign: "center",
              fontSize: 11,
              color: "#8a98a8",
              margin: "8px 0 0",
            }}>
              Vous pouvez activer/désactiver dans Profil → Sécurité
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
