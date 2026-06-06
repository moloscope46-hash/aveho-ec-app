"use client";
// Page Login — Page de connexion (email/mot de passe + magic link + empreinte)
// Alpha 0.55.13 : ajout connexion par empreinte (WebAuthn) si dispo
// Alpha 0.55.37 : version dynamique + features list mise à jour
// Alpha 0.57.38 : honeypot anti-bot
// 0.58.21 : REFONTE FULLSCREEN AURORA — NeonButton géant + ParticlesBackground +
//           glassmorphism card centrée + animations d'entrée + mobile-first
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import pkg from "../../package.json";
import {
  isWebAuthnSupported, getAvailableMethods, authenticateBiometric, isPlatformAuthenticatorAvailable,
  syncBiometricRefreshTokens } from "../../lib/webauthn";
import { useHoneypot } from "../../lib/honeypot";
// 0.58.21 : composants premium pour le redesign login
import { NeonButton, ParticlesBackground } from "../components/ui-premium";
export default function Login() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [mode, setMode] = useState("signin"); // signin | signup
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  // 0.57.38 : honeypot anti-bot (champ caché qui détecte les bots naïfs)
  const { honeypotProps, isBot, getHoneypotValue } = useHoneypot("website_url");
  // 0.55.13/17 : empreinte + face
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioMethodsForEmail, setBioMethodsForEmail] = useState([]); // ['empreinte', 'face'] disponibles

  // Détecter dispo WebAuthn au mount
  useEffect(() => {
    (async () => {
      if (!isWebAuthnSupported()) return;
      const platformOk = await isPlatformAuthenticatorAvailable();
      if (platformOk) setBioAvailable(true);
    })();
  }, []);

  // À chaque changement d'email, vérifier les méthodes locales activées
  useEffect(() => {
    if (!email || !bioAvailable) {
      setBioMethodsForEmail([]);
      return;
    }
    const t = setTimeout(async () => {
      const methods = await getAvailableMethods(email);
      setBioMethodsForEmail(methods);
    }, 300);
    return () => clearTimeout(t);
  }, [email, bioAvailable]);

  async function submit() {
    setBusy(true); setErr(""); setOk("");

    // 0.57.38 : honeypot anti-bot — si rempli, c'est un bot
    if (isBot()) {
      // Log silencieux pour analyse + delay aléatoire + erreur générique
      try {
        const { auditHoneypotTriggered } = await import("../../lib/securityAudit");
        await auditHoneypotTriggered(supabase, { userEmail: email }, {
          honeypot_value_length: getHoneypotValue().length,
          mode,
        });
      } catch {}
      // Simule un délai pour ne pas trop dévoiler la détection
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 400));
      setErr("Erreur de validation. Réessaie.");
      setBusy(false);
      return;
    }

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password: pwd });
        if (error) throw error;
        setOk("Compte créé. Vérifie tes mails si la confirmation est activée, puis connecte-toi.");
        setMode("signin");
      } else {
        // 0.57.36 : check rate-limit côté client avant de hit Supabase Auth
        // (anti-bruteforce + protection quota Supabase + UX claire)
        const { checkLoginBlock, recordFailedLogin, resetLoginAttempts, formatBlockTime } =
          await import("../../lib/loginRateLimit");
        const block = checkLoginBlock(email);
        if (block.blocked) {
          throw new Error(
            `Trop de tentatives échouées. Réessaie dans ${formatBlockTime(block.remainingMs)}.`
          );
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
        if (error) {
          // 0.57.36 : enregistrer l'échec pour le compteur de rate-limit
          const result = recordFailedLogin(email);

          // 0.57.38 : audit log centralisé (security event)
          try {
            const { auditLoginFailed, auditLoginBlocked } = await import("../../lib/securityAudit");
            if (result.blocked) {
              await auditLoginBlocked(supabase, { userEmail: email }, {
                reason: "rate_limit_5_attempts",
                blocked_for_ms: result.remainingMs,
              });
            } else {
              await auditLoginFailed(supabase, { userEmail: email }, {
                error_code: error.code || null,
                attempts_left: result.attemptsLeft,
              });
            }
          } catch {}

          if (result.blocked) {
            throw new Error(
              `Trop de tentatives. Compte temporairement bloqué pour ${formatBlockTime(result.remainingMs)}.`
            );
          }
          if (result.attemptsLeft <= 2) {
            throw new Error(
              `${error.message} (${result.attemptsLeft} tentative${result.attemptsLeft > 1 ? "s" : ""} restante${result.attemptsLeft > 1 ? "s" : ""} avant blocage)`
            );
          }
          throw error;
        }

        // 0.57.36 : login OK → reset le compteur pour cet email
        resetLoginAttempts(email);

        // 0.57.38 : audit log centralisé (login success)
        try {
          const { auditLoginSuccess } = await import("../../lib/securityAudit");
          const { data: { session } } = await supabase.auth.getSession();
          await auditLoginSuccess(supabase, {
            userId: session?.user?.id,
            userEmail: email,
          }, { method: "password" });
        } catch {}

        // 0.57.27 : sync refresh_token biométrique pour empêcher l'erreur
        // "Session expirée" lors d'un futur login empreinte/face
        try {
          await syncBiometricRefreshTokens({ supabase, email });
        } catch (_) { /* non-bloquant */ }

        // Alpha 0.5 : trace de connexion dans audit_log
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const { data: m } = await supabase.from("membres_structure").select("structure_id").limit(1).maybeSingle();
          if (m?.structure_id) {
            await supabase.from("audit_log").insert({
              structure_id: m.structure_id,
              user_id: session?.user?.id,
              user_email: email,
              action: "connexion",
              entite: "session",
              details: { ua: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : null },
            });
          }
        } catch (_) { /* non-bloquant */ }
        // 0.55.13 : signaler login pour déclencher modale opt-in biométrie
        try { window.dispatchEvent(new CustomEvent("aveho:login-success")); } catch (_) {}
        router.push("/choix-mode");  // 0.58.90 : popup choix mode après login
      }
    } catch (e) {
      setErr(e.message || "Erreur");
    } finally {
      setBusy(false);
    }
  }

  // 0.55.13/17 : connexion par empreinte ou détection faciale
  async function biometricLogin(method) {
    setBusy(true); setErr(""); setOk("");
    try {
      const r = await authenticateBiometric({ supabase, email, method });
      if (!r?.ok) throw new Error("Échec authentification biométrique");
      router.push("/choix-mode");  // 0.58.90 : popup choix mode après login
    } catch (e) {
      setErr(e.message || "Erreur authentification biométrique");
    } finally {
      setBusy(false);
    }
  }

  async function magicLink() {
    setBusy(true); setErr(""); setOk("");
    try {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin + "/accueil" : undefined } });
      if (error) throw error;
      setOk("Lien de connexion envoyé par email. Vérifie ta boîte de réception.");
    } catch (e) { setErr(e.message || "Erreur"); } finally { setBusy(false); }
  }

  return (
    <div className="av-login-root">
      {/* Particules teal en background */}
      <div className="av-login-particles">
        <ParticlesBackground count={45} speed={0.25} linkDistance={160} showOnMobile={true} />
      </div>

      {/* Aurora blobs animés flottants */}
      <div className="av-login-aurora" aria-hidden="true">
        <div className="av-login-blob blob-teal" />
        <div className="av-login-blob blob-blue" />
        <div className="av-login-blob blob-violet" />
      </div>

      {/* Grid cyber subtil overlay */}
      <div className="av-login-grid" aria-hidden="true" />

      <div className="av-login-container">

        {/* Branding header */}
        <div className="av-login-brand">
          <div className="av-login-logo">
            a<span className="av-login-v">v</span>eho
          </div>
          <div className="av-login-tagline">SOFTS &amp; SERVICES — ESPACE COLLECTIVITÉ</div>
        </div>

        {/* Card glassmorphism centrale avec scan-line conic */}
        <div className="av-login-card">
          <div className="av-login-card-scan" aria-hidden="true" />
          <div className="av-login-card-inner">

            <div className="av-login-welcome">
              <h1>Bienvenue <span className="wave">👋</span></h1>
              <p>{mode === "signin" ? "Connectez-vous à votre Espace Aveho" : "Créez votre compte"}</p>
            </div>

            {err && <div className="av-login-err"><i className="ti ti-alert-circle" /> {err}</div>}
            {ok && <div className="av-login-ok"><i className="ti ti-circle-check" /> {ok}</div>}

            {/* Honeypot anti-bot */}
            <input {...honeypotProps} />

            {/* Email */}
            <div className="av-login-field">
              <label><i className="ti ti-mail" /> Email professionnel</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cedric@hop01.fr"
                autoComplete="email"
                className="av-login-input"
              />
            </div>

            {/* Boutons biométrie */}
            {mode === "signin" && isWebAuthnSupported() && (
              <>
                <div className="av-login-bio">
                  <BioButton
                    method="face"
                    icon="ti-face-id"
                    label="Détection faciale"
                    busy={busy}
                    bioAvailable={bioAvailable}
                    enabled={bioMethodsForEmail.includes("face")}
                    email={email}
                    onClick={() => biometricLogin("face")}
                    color="linear-gradient(135deg, #7a6fb0, #185FA5)"
                  />
                  <BioButton
                    method="empreinte"
                    icon="ti-fingerprint"
                    label="Empreinte digitale"
                    busy={busy}
                    bioAvailable={bioAvailable}
                    enabled={bioMethodsForEmail.includes("empreinte")}
                    email={email}
                    onClick={() => biometricLogin("empreinte")}
                    color="linear-gradient(135deg, #185FA5, #7CC8C8)"
                  />
                </div>
                <div className="av-login-sep"><span>ou mot de passe</span></div>
              </>
            )}

            {/* Astuce biométrie */}
            {bioMethodsForEmail.length === 0 && bioAvailable && email && mode === "signin" && (
              <div className="av-login-tip">
                <i className="ti ti-bulb" /> <b>Astuce :</b> active la biométrie dans <a href="/profil">Mon profil</a> après connexion.
              </div>
            )}

            {/* Password */}
            <div className="av-login-field">
              <label><i className="ti ti-lock" /> Mot de passe</label>
              <input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === "Enter" && submit()}
                autoComplete="current-password"
                className="av-login-input"
              />
            </div>

            {/* NeonButton géant Se connecter */}
            <div style={{ marginTop: 22 }}>
              <NeonButton
                onClick={submit}
                disabled={busy || !email || !pwd}
                variant="aurora"
                size="lg"
                fullWidth
                icon={busy ? "ti-loader-2" : (mode === "signin" ? "ti-login" : "ti-user-plus")}
              >
                {busy ? "Connexion en cours…" : mode === "signin" ? "Se connecter" : "Créer mon compte"}
              </NeonButton>
            </div>

            {/* Magic link */}
            <div className="av-login-sep"><span>ou</span></div>
            <button className="av-login-magic" onClick={magicLink} disabled={busy || !email}>
              <i className="ti ti-mail-fast" /> Recevoir un lien de connexion par email
            </button>

            {/* Switch signin/signup */}
            <div className="av-login-switch">
              {mode === "signin"
                ? <>Pas encore de compte ? <a onClick={() => setMode("signup")}>Créer un compte</a></>
                : <>Déjà un compte ? <a onClick={() => setMode("signin")}>Se connecter</a></>}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="av-login-footer">
          <div className="av-login-features">
            <div className="av-login-feat"><i className="ti ti-building-community" /> <span>Multi-établissements</span></div>
            <div className="av-login-feat"><i className="ti ti-fingerprint" /> <span>Biométrie WebAuthn</span></div>
            <div className="av-login-feat"><i className="ti ti-shield-check" /> <span>Hébergement HDS</span></div>
            <div className="av-login-feat"><i className="ti ti-bed" /> <span>Plan établissement</span></div>
          </div>
          <div className="av-login-meta">
            <span className="av-login-version">v{pkg.version.replace(/-alpha$/, "")} alpha</span>
            <span className="av-login-sep-dot">·</span>
            <a href="/mentions-legales">Mentions légales &amp; RGPD</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// 0.56.14 : bouton biométrique avec état grisé si non dispo
function BioButton({ method, icon, label, busy, bioAvailable, enabled, email, onClick, color }) {
  // Raison du grisé (priorité de raison)
  let disabledReason = null;
  if (!bioAvailable) {
    disabledReason = "Ton appareil ne supporte pas la biométrie (ou refusée)";
  } else if (!email) {
    disabledReason = "Renseigne d'abord ton email";
  } else if (!enabled) {
    disabledReason = method === "face"
      ? "Détection faciale pas encore activée pour cet email — connecte-toi avec ton mot de passe puis active-la dans ton profil"
      : "Empreinte pas encore activée pour cet email — connecte-toi avec ton mot de passe puis active-la dans ton profil";
  }

  const isDisabled = !!disabledReason || busy;

  return (
    <button
      className="btn-primary"
      onClick={isDisabled ? null : onClick}
      disabled={isDisabled}
      title={disabledReason || ""}
      style={{
        background: isDisabled ? "#d3d9e0" : color,
        color: isDisabled ? "#8a98a8" : "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        fontSize: 14,
        minHeight: 48,
        margin: 0,
        cursor: isDisabled ? "not-allowed" : "pointer",
        position: "relative",
      }}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 22 }} />
      <span style={{ flex: 1, textAlign: "left", marginLeft: 4 }}>
        <div>{busy ? "Authentification…" : `Se connecter avec ${method === "face" ? "la détection faciale" : "mon empreinte"}`}</div>
        {disabledReason && (
          <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.75, marginTop: 2 }}>
            <i className="ti ti-info-circle" /> {disabledReason}
          </div>
        )}
      </span>
      {!isDisabled && <i className="ti ti-chevron-right" style={{ fontSize: 16, opacity: 0.7 }} />}
    </button>
  );
}
