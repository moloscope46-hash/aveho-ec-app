"use client";
// =============================================================
//  Page publique de vérification de consentement
//  Alpha 0.22.0
//
//  URL : /verifier/<consent_id>?h=<hash>
//  Accessible sans authentification (anonyme).
//  Appelle la RPC verify_consent_hash() qui :
//   - vérifie que le hash correspond
//   - trace la vérification (audit)
//   - retourne un statut minimal (pas d'info sensible)
// =============================================================
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";

export default function VerifierConsentement() {
  const params = useParams();
  const sp = useSearchParams();
  const consentId = params?.id;
  const hash = sp?.get("h");
  const supabase = createClient();

  const [state, setState] = useState("loading"); // loading | valid | invalid | error | missing
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function verify() {
      if (!consentId || !hash) {
        setState("missing");
        return;
      }
      try {
        const { data, error } = await supabase.rpc("verify_consent_hash", {
          consent_id: consentId,
          provided_hash: hash,
          client_ip: null, // IP captée côté serveur via Edge Function plus tard
          client_ua: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
        });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row || row.statut === "introuvable") {
          setState("invalid");
          setErr("Ce consentement n'existe pas dans nos registres.");
          return;
        }
        setResult(row);
        setState(row.is_valid ? "valid" : "invalid");
      } catch (e) {
        setState("error");
        setErr(e.message || "Erreur inconnue");
      }
    }
    verify();
  }, [consentId, hash]);

  const expired = result?.expired;
  const dateSig = result?.date_signature ? new Date(result.date_signature).toLocaleString("fr-FR") : null;
  const dateExp = result?.date_expiration ? new Date(result.date_expiration).toLocaleDateString("fr-FR") : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #142131 0%, #1e4a91 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px", fontFamily: "Segoe UI, Helvetica, Arial, sans-serif",
    }}>
      <div style={{
        maxWidth: 480, width: "100%",
        background: "#fff", borderRadius: 16, padding: 32,
        boxShadow: "0 20px 50px rgba(0,0,0,.3)",
      }}>
        {/* Logo / header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: "#142131", letterSpacing: 2 }}>
            a<span style={{ color: "#7CC8C8" }}>v</span>eho
          </div>
          <div style={{ fontSize: 11, color: "#6c7a89", letterSpacing: 3, marginTop: 4 }}>
            VÉRIFICATION CONSENTEMENT RGPD
          </div>
        </div>

        {/* Loading */}
        {state === "loading" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 40 }}>⏳</div>
            <p style={{ color: "#6c7a89", marginTop: 12 }}>Vérification en cours…</p>
          </div>
        )}

        {/* Missing params */}
        {state === "missing" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              background: "#fff8ec", color: "#EF9F27",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px", fontSize: 32,
            }}>⚠</div>
            <h2 style={{ color: "#142131", fontSize: 18, margin: "0 0 8px" }}>URL incomplète</h2>
            <p style={{ color: "#6c7a89", fontSize: 14 }}>
              Le lien de vérification est incomplet. Il manque l'identifiant ou le hash.
            </p>
          </div>
        )}

        {/* Valid */}
        {state === "valid" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                background: expired ? "#fff8ec" : "#eef9ef",
                color: expired ? "#EF9F27" : "#5aa05a",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px", fontSize: 44,
              }}>{expired ? "⏰" : "✓"}</div>
              <h2 style={{ color: expired ? "#7a4f15" : "#2e6f33", fontSize: 22, margin: "0 0 6px" }}>
                {expired ? "Consentement expiré" : "Consentement authentique"}
              </h2>
              <p style={{ color: "#6c7a89", fontSize: 13 }}>
                {expired
                  ? "Ce consentement est authentique mais sa durée de validité a expiré. Un renouvellement est nécessaire."
                  : "L'intégrité de cette signature est vérifiée. Le hash correspond aux registres."}
              </p>
            </div>
            <div style={{ background: "#f4f7fa", borderRadius: 10, padding: "16px 20px", fontSize: 13, lineHeight: 1.8 }}>
              <div><b style={{ color: "#142131" }}>Patient :</b> {result.patient_initials || "—"} <span style={{ color: "#6c7a89", fontSize: 11 }}>(initiales, anonymisé)</span></div>
              <div><b style={{ color: "#142131" }}>Établissement :</b> {result.etablissement_nom || "—"}</div>
              <div><b style={{ color: "#142131" }}>Collectivité :</b> {result.collectivite_nom || "—"}</div>
              <div><b style={{ color: "#142131" }}>Signé le :</b> {dateSig}</div>
              {dateExp && (
                <div style={{ color: expired ? "#c0392b" : "#2a3a48" }}>
                  <b style={{ color: "#142131" }}>Valide jusqu'au :</b> {dateExp}
                </div>
              )}
              <div><b style={{ color: "#142131" }}>Statut :</b> {result.statut === "signe" ? "Signé" : result.statut}</div>
            </div>
          </>
        )}

        {/* Invalid */}
        {state === "invalid" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "#fef0ee", color: "#c0392b",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px", fontSize: 44,
            }}>✗</div>
            <h2 style={{ color: "#c0392b", fontSize: 22, margin: "0 0 6px" }}>Vérification échouée</h2>
            <p style={{ color: "#6c7a89", fontSize: 13, padding: "0 16px" }}>
              {err || "Le hash de la signature ne correspond pas à celui enregistré. Le document a peut-être été altéré, ou le QR provient d'une copie modifiée."}
            </p>
            <p style={{ color: "#8a98a8", fontSize: 11, marginTop: 16 }}>
              Cette tentative a été enregistrée à des fins d'audit.
            </p>
          </div>
        )}

        {/* Error */}
        {state === "error" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              background: "#fef0ee", color: "#c0392b",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px", fontSize: 28,
            }}>!</div>
            <h2 style={{ color: "#c0392b", fontSize: 18, margin: "0 0 8px" }}>Erreur technique</h2>
            <p style={{ color: "#6c7a89", fontSize: 13 }}>{err}</p>
          </div>
        )}

        <div style={{ marginTop: 28, paddingTop: 18, borderTop: "1px solid #eef2f5", textAlign: "center" }}>
          <p style={{ fontSize: 11, color: "#8a98a8", margin: 0 }}>
            Cette page est conforme RGPD : aucune donnée personnelle complète n'est exposée.
            <br />Les vérifications sont tracées pour audit.
          </p>
        </div>
      </div>
    </div>
  );
}
