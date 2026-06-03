"use client";
// =============================================================
//  app/components/MfaSetup.js (Alpha 0.57.37)
//
//  Composant React pour activer le 2FA TOTP dans /profil.
//
//  Workflow :
//   1. Click "Activer la double authentification"
//   2. Affiche QR code + secret en backup
//   3. User scanne avec son authenticator app (Google Auth, Authy, 1Password...)
//   4. User saisit le code à 6 chiffres
//   5. Si OK → 2FA actif pour les prochains logins
//
//  Usage (dans app/profil/page.js ou autre) :
//    import MfaSetup from "../components/MfaSetup";
//    <MfaSetup />
// =============================================================

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import {
  enrollTotp, verifyTotpEnrollment,
  listMfaFactors, unenrollMfaFactor,
} from "../../lib/mfa";

export default function MfaSetup() {
  const supabase = createClient();
  const [step, setStep] = useState("idle"); // idle | enrolling | verifying | active
  const [qrCodeSvg, setQrCodeSvg] = useState(null);
  const [secret, setSecret] = useState(null);
  const [factorId, setFactorId] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [verifiedFactors, setVerifiedFactors] = useState([]);

  // Au mount, check si l'user a déjà du 2FA actif
  useEffect(() => {
    (async () => {
      const { totp, verified } = await listMfaFactors(supabase);
      setVerifiedFactors(totp);
      if (verified) setStep("active");
    })();
  }, []);

  async function startEnroll() {
    setBusy(true); setErr("");
    const result = await enrollTotp(supabase);
    setBusy(false);
    if (result.error) { setErr(result.error); return; }
    setQrCodeSvg(result.qrCodeSvg);
    setSecret(result.secret);
    setFactorId(result.factorId);
    setStep("verifying");
  }

  async function submitCode() {
    if (!/^\d{6}$/.test(code)) { setErr("Le code doit faire 6 chiffres"); return; }
    setBusy(true); setErr("");
    const result = await verifyTotpEnrollment(supabase, factorId, code);
    setBusy(false);
    if (result.error) { setErr(result.error); return; }
    setStep("active");
    const { totp } = await listMfaFactors(supabase);
    setVerifiedFactors(totp);
    setCode("");
  }

  async function disable() {
    if (!confirm("⚠️ Désactiver la double authentification ? Votre compte sera moins sécurisé.")) return;
    setBusy(true); setErr("");
    for (const f of verifiedFactors) {
      await unenrollMfaFactor(supabase, f.id);
    }
    setBusy(false);
    setVerifiedFactors([]);
    setStep("idle");
  }

  // === RENDERING ===

  const cardStyle = {
    background: "#fff", border: "1px solid #e3e9ee", borderRadius: 12,
    padding: 20, margin: "16px 0",
  };

  if (step === "active") {
    return (
      <div style={{ ...cardStyle, borderLeft: "4px solid #5aa05a", background: "#eef9ef" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <i className="ti ti-shield-check" style={{ fontSize: 24, color: "#5aa05a" }} />
          <div>
            <div style={{ fontWeight: 700, color: "#142131" }}>Double authentification active</div>
            <div style={{ fontSize: 12, color: "#6c7a89", marginTop: 2 }}>
              Votre compte est protégé par TOTP. Un code à 6 chiffres vous sera demandé à chaque connexion.
            </div>
          </div>
        </div>
        <button
          onClick={disable}
          disabled={busy}
          style={{
            marginTop: 10, padding: "8px 16px", background: "#fff",
            color: "#c0392b", border: "1px solid #c0392b", borderRadius: 6,
            fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}
        >
          Désactiver
        </button>
      </div>
    );
  }

  if (step === "verifying") {
    return (
      <div style={{ ...cardStyle, borderLeft: "4px solid #185FA5" }}>
        <h3 style={{ color: "#142131", marginTop: 0 }}>Étape 1 : Scanner le QR code</h3>
        <p style={{ fontSize: 13, color: "#6c7a89" }}>
          Ouvre ton application d'authentification (Google Authenticator, Authy, 1Password, etc.)
          et scanne ce QR :
        </p>
        <div style={{
          padding: 16, background: "#fff", border: "1px solid #e3e9ee", borderRadius: 8,
          display: "inline-block", margin: "12px 0",
        }} dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />

        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: "pointer", fontSize: 12, color: "#185FA5" }}>
            Pas de scanner ? Affiche le secret manuel
          </summary>
          <code style={{
            display: "block", marginTop: 8, padding: 10, background: "#f4f7fa",
            color: "#142131", borderRadius: 6, fontSize: 12, wordBreak: "break-all",
          }}>
            {secret}
          </code>
        </details>

        <h3 style={{ color: "#142131", marginTop: 24 }}>Étape 2 : Saisir le code généré</h3>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          pattern="\d{6}"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="123456"
          style={{
            padding: "10px 14px", border: "1px solid #e3e9ee", borderRadius: 8,
            fontSize: 18, fontFamily: "monospace", letterSpacing: 4,
            width: 160, textAlign: "center", marginRight: 8,
          }}
        />
        <button
          onClick={submitCode}
          disabled={busy || code.length !== 6}
          style={{
            padding: "10px 20px", background: "#185FA5", color: "#fff",
            border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13,
            cursor: busy ? "wait" : "pointer", opacity: code.length === 6 ? 1 : 0.5,
          }}
        >
          {busy ? "Vérification..." : "Activer le 2FA"}
        </button>

        {err && (
          <div style={{ marginTop: 12, padding: 10, background: "#ffebee", color: "#b71c1c", borderRadius: 6, fontSize: 13 }}>
            {err}
          </div>
        )}
      </div>
    );
  }

  // step === "idle"
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <i className="ti ti-shield-lock" style={{ fontSize: 24, color: "#185FA5" }} />
        <div>
          <div style={{ fontWeight: 700, color: "#142131" }}>Double authentification (recommandé)</div>
          <div style={{ fontSize: 12, color: "#6c7a89", marginTop: 2 }}>
            Renforce ton compte avec un code à 6 chiffres généré par ton smartphone.
          </div>
        </div>
      </div>
      <button
        onClick={startEnroll}
        disabled={busy}
        style={{
          marginTop: 10, padding: "10px 20px", background: "#185FA5", color: "#fff",
          border: "none", borderRadius: 6, fontWeight: 600, fontSize: 13,
          cursor: busy ? "wait" : "pointer",
        }}
      >
        {busy ? "Génération..." : "Activer la double authentification"}
      </button>
      {err && (
        <div style={{ marginTop: 12, padding: 10, background: "#ffebee", color: "#b71c1c", borderRadius: 6, fontSize: 13 }}>
          {err}
        </div>
      )}
    </div>
  );
}
