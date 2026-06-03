// =============================================================
//  lib/mfa.js (Alpha 0.57.37)
//
//  Helper pour le 2FA TOTP via Supabase Auth MFA.
//  https://supabase.com/docs/guides/auth/auth-mfa
//
//  Workflow utilisateur :
//   1. Aller dans /profil → "Activer la double authentification"
//   2. Appel enrollTotp() → retourne { qr_code_url, secret }
//   3. User scanne le QR avec Google Authenticator, Authy, etc.
//   4. User entre le code à 6 chiffres → verifyTotp(code)
//   5. À chaque login suivant, après mot de passe :
//      - Appel listFactors() pour voir si MFA est requis
//      - Si oui, demander le code TOTP → challengeAndVerify(code)
//   6. Session enrichie avec aal2 (Authentication Assurance Level 2)
//
//  ⚠️ Pour activer côté Supabase :
//   Dashboard → Authentication → Multi-Factor Authentication → Enable TOTP
//
//  Status : helper prêt à l'emploi. Pas encore intégré dans le flow login
//  par défaut (à activer quand on déploie le 2FA pour les utilisateurs).
// =============================================================

/**
 * Lance l'enrollment TOTP pour le user courant.
 * Retourne le QR code à scanner + le secret en backup.
 *
 * @param {SupabaseClient} supabase
 * @returns {Promise<{ qrCodeSvg: string, secret: string, factorId: string } | { error: string }>}
 */
export async function enrollTotp(supabase) {
  try {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Aveho EC — Authenticator",
    });

    if (error) {
      return { error: error.message };
    }

    return {
      qrCodeSvg: data.totp.qr_code,    // SVG inline pour scanner
      secret: data.totp.secret,         // backup manuel si QR pas lisible
      factorId: data.id,
    };
  } catch (e) {
    return { error: e?.message || "Erreur enrollment TOTP" };
  }
}

/**
 * Vérifie le code TOTP à 6 chiffres saisi par l'user pendant l'enrollment.
 * Si OK, le factor passe en "verified" et sera demandé aux prochains logins.
 *
 * @param {SupabaseClient} supabase
 * @param {string} factorId — retourné par enrollTotp()
 * @param {string} code — 6 chiffres saisis par l'user
 * @returns {Promise<{ ok: true } | { error: string }>}
 */
export async function verifyTotpEnrollment(supabase, factorId, code) {
  if (!factorId || !code) return { error: "factorId et code requis" };
  if (!/^\d{6}$/.test(code)) return { error: "Le code doit faire 6 chiffres" };

  try {
    // 1) Créer un challenge pour ce factor
    const { data: chal, error: chalError } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (chalError) return { error: chalError.message };

    // 2) Vérifier le code
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: chal.id,
      code,
    });
    if (verifyError) return { error: verifyError.message };

    return { ok: true };
  } catch (e) {
    return { error: e?.message || "Erreur vérification TOTP" };
  }
}

/**
 * Liste les factors MFA du user courant.
 * @returns {Promise<{ totp: Factor[], verified: boolean }>}
 */
export async function listMfaFactors(supabase) {
  try {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return { totp: [], verified: false };
    const totp = (data?.totp || []).filter((f) => f.status === "verified");
    return { totp, verified: totp.length > 0 };
  } catch {
    return { totp: [], verified: false };
  }
}

/**
 * Au login : si l'user a 2FA activé, exige le code TOTP après le password.
 * Appelle ça après signInWithPassword(). Si AAL est déjà aal2, rien à faire.
 *
 * @param {SupabaseClient} supabase
 * @returns {Promise<{ challengeRequired: boolean, factorId?: string }>}
 */
export async function checkMfaRequired(supabase) {
  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) return { challengeRequired: false };

    // Si déjà aal2, pas besoin de challenge
    if (data.currentLevel === "aal2") return { challengeRequired: false };

    // Si l'user a un factor TOTP vérifié, on doit challenge
    if (data.nextLevel === "aal2") {
      const { totp } = await listMfaFactors(supabase);
      if (totp.length > 0) {
        return { challengeRequired: true, factorId: totp[0].id };
      }
    }

    return { challengeRequired: false };
  } catch {
    return { challengeRequired: false };
  }
}

/**
 * Challenge + verify au login. Appelé quand checkMfaRequired() retourne true.
 *
 * @param {SupabaseClient} supabase
 * @param {string} factorId
 * @param {string} code
 * @returns {Promise<{ ok: true } | { error: string }>}
 */
export async function challengeAndVerifyTotp(supabase, factorId, code) {
  if (!factorId || !code) return { error: "factorId et code requis" };
  if (!/^\d{6}$/.test(code)) return { error: "Le code doit faire 6 chiffres" };

  try {
    const { data: chal, error: chalError } = await supabase.auth.mfa.challenge({ factorId });
    if (chalError) return { error: chalError.message };

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: chal.id,
      code,
    });
    if (verifyError) return { error: verifyError.message };

    return { ok: true };
  } catch (e) {
    return { error: e?.message || "Erreur challenge TOTP" };
  }
}

/**
 * Désinscrit un factor MFA (l'user veut désactiver son 2FA).
 * ⚠️ Demander confirmation à l'user avant d'appeler.
 */
export async function unenrollMfaFactor(supabase, factorId) {
  if (!factorId) return { error: "factorId requis" };
  try {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) return { error: error.message };
    return { ok: true };
  } catch (e) {
    return { error: e?.message || "Erreur désactivation TOTP" };
  }
}
