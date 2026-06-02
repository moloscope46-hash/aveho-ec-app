"use client";
// Page Login — Page de connexion (email/mot de passe + magic link + empreinte)
// Alpha 0.55.13 : ajout connexion par empreinte (WebAuthn) si dispo
// Alpha 0.55.37 : version dynamique + features list mise à jour
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import pkg from "../../package.json";
import {
  isWebAuthnSupported, getAvailableMethods, authenticateBiometric, isPlatformAuthenticatorAvailable} from "../../lib/webauthn";
export default function Login() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [mode, setMode] = useState("signin"); // signin | signup
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
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
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password: pwd });
        if (error) throw error;
        setOk("Compte créé. Vérifie tes mails si la confirmation est activée, puis connecte-toi.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
        if (error) throw error;
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
        router.push("/vue-globale");
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
      router.push("/vue-globale");
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
    <div className="bg-dark login-wrap">
      <div className="login-card">
        <div className="login-left">
          <div className="presente">AVEHO PRÉSENTE</div>
          <div className="logo">a<span className="v">v</span>eho</div>
          <div style={{ fontSize: 9, letterSpacing: 1, opacity: .7 }}>SOFTS &amp; SERVICES</div>
          <h2>L'espace pro<br />du <span className="accent">matériel médical</span></h2>
          <p>Une seule connexion pour les collectivités clientes : gérez vos établissements, votre matériel, votre stock et passez commande à vos magasins Aveho.</p>
          <div className="feat"><span className="fi"><i className="ti ti-building-community" /></span> Multi-établissements + partenaires (FINESS, SIRENE, RPPS)</div>
          <div className="feat"><span className="fi"><i className="ti ti-stethoscope" /></span> Annuaire RPPS national · 1,7M praticiens · API FHIR ANS</div>
          <div className="feat"><span className="fi"><i className="ti ti-fingerprint" /></span> Connexion biométrique (empreinte + reconnaissance faciale)</div>
          <div className="feat"><span className="fi"><i className="ti ti-bed" /></span> Plan de l'établissement, lits, patients & matériel</div>
          <div className="feat"><span className="fi"><i className="ti ti-shield-check" /></span> Hébergement HDS · Certifié RGPD</div>
          <div className="version-badge" title={`Build ${pkg.version}`}>
            Version Alpha {pkg.version.replace(/-alpha$/, "")}
          </div>
        </div>
        <div className="login-right">
          <h1>Bienvenue 👋</h1>
          <div className="muted">{mode === "signin" ? "Connectez-vous à votre Espace Aveho" : "Créez votre compte"}</div>
          {err && <div className="err">{err}</div>}
          {ok && <div className="ok">{ok}</div>}
          <label>Email professionnel</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cedric@hop01.fr" autoComplete="email" />

          {/* 0.56.14 : TOUJOURS afficher les 2 boutons bio, avec état grisé si non dispo */}
          {mode === "signin" && isWebAuthnSupported() && (
            <>
              <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                <BioButton
                  method="face"
                  icon="ti-face-id"
                  label="Détection faciale"
                  busy={busy}
                  bioAvailable={bioAvailable}
                  enabled={bioMethodsForEmail.includes("face")}
                  email={email}
                  onClick={() => biometricLogin("face")}
                  color="linear-gradient(135deg, #7a6fb0, #bfa9e0)"
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
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 6px" }}>
                <span style={{ flex: 1, height: 1, background: "#e1e6eb" }} />
                <span style={{ fontSize: 12, color: "#8a98a8" }}>ou mot de passe</span>
                <span style={{ flex: 1, height: 1, background: "#e1e6eb" }} />
              </div>
            </>
          )}

          {/* 0.55.39 : info biométrie si pas encore enregistrée pour cet email */}
          {bioMethodsForEmail.length === 0 && bioAvailable && email && mode === "signin" && (
            <div style={{
              background: "linear-gradient(135deg, #eef5fc, #fff)",
              border: "1px solid #c7dcef",
              borderRadius: 8,
              padding: "8px 10px",
              fontSize: 11.5,
              color: "#185FA5",
              marginTop: 10,
              marginBottom: 4,
            }}>
              <i className="ti ti-bulb" style={{ fontSize: 13 }} />{" "}
              <b>Astuce :</b> après ta connexion, active la biométrie dans <a style={{ color: "#185FA5", fontWeight: 600 }} href="/profil">Mon profil</a> pour te connecter en un coup d'œil.
            </div>
          )}

          <label>Mot de passe</label>
          <input className="input" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && submit()} autoComplete="current-password" />
          <button className="btn-primary" onClick={submit} disabled={busy || !email || !pwd}>
            {busy ? "..." : mode === "signin" ? "Se connecter" : "Créer mon compte"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
            <span style={{ flex: 1, height: 1, background: "#e1e6eb" }} /><span style={{ fontSize: 12, color: "#8a98a8" }}>ou</span><span style={{ flex: 1, height: 1, background: "#e1e6eb" }} />
          </div>
          <button className="btn-magic" onClick={magicLink} disabled={busy || !email}>
            <i className="ti ti-mail-fast" /> Recevoir un lien de connexion
          </button>
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#8a98a8" }}>
            {mode === "signin"
              ? <>Pas encore de compte ? <a style={{ color: "#2a5a5a", fontWeight: 600 }} onClick={() => setMode("signup")}>Créer un compte</a></>
              : <>Déjà un compte ? <a style={{ color: "#2a5a5a", fontWeight: 600 }} onClick={() => setMode("signin")}>Se connecter</a></>}
          </div>
          {/* Alpha 0.53.0 (BL) : lien mentions légales */}
          <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "#aaa" }}>
            <a href="/mentions-legales" style={{ color: "#8a98a8", textDecoration: "underline" }}>
              Mentions légales & RGPD
            </a>
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
