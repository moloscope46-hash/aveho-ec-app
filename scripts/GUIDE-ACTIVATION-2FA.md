# 🔐 Aveho EC — Guide d'activation du 2FA TOTP

**Version :** Alpha 0.57.38
**Date :** 3 juin 2026

Le code applicatif est prêt (livré en 0.57.37). Il reste à :
1. Activer TOTP dans le Dashboard Supabase
2. Intégrer le composant `<MfaSetup />` dans `/profil`
3. Activer le check au login

---

## 📍 Étape 1 — Activer TOTP côté Supabase Dashboard

1. Va sur : **https://supabase.com/dashboard/project/rnvlzddgxiuslgljkobm/auth/providers**
2. Cherche la section **"Multi-Factor Authentication"** ou **"MFA"**
3. Active le toggle **TOTP (Time-based One-Time Password)**
4. Save

> ⚠️ **Si tu es sur le plan Free** : Supabase MFA est inclus depuis 2024 dans tous les plans. Si tu ne vois pas l'option, c'est peut-être une page différente. Cherche "MFA" dans la barre de recherche du Dashboard.

---

## 📍 Étape 2 — Intégrer `<MfaSetup />` dans la page profil

Le composant est déjà créé : `app/components/MfaSetup.js`.

Édite **`app/profil/page.js`** et ajoute :

```jsx
import MfaSetup from "../components/MfaSetup";

// ... dans le JSX, dans une nouvelle section "Sécurité" :
<section style={{ marginTop: 32 }}>
  <h2 style={{ fontSize: 16, color: "#142131", borderBottom: "2px solid #185FA5", paddingBottom: 6 }}>
    🔐 Sécurité du compte
  </h2>
  <MfaSetup />
</section>
```

L'utilisateur verra alors :
- Un bouton **"Activer la double authentification"**
- Au clic : un QR code à scanner avec son authenticator app
- Un input pour saisir le code à 6 chiffres
- Une fois activé : un encart vert avec un bouton "Désactiver"

---

## 📍 Étape 3 — Activer le check 2FA au login

Le helper `checkMfaRequired()` est dans `lib/mfa.js`. Édite **`app/login/page.js`** :

```jsx
// Après le signInWithPassword réussi
const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
if (error) throw error;

// 0.57.38 : check 2FA requis
const { checkMfaRequired, challengeAndVerifyTotp } = await import("../../lib/mfa");
const mfaCheck = await checkMfaRequired(supabase);

if (mfaCheck.challengeRequired) {
  // Afficher un input pour le code TOTP à 6 chiffres
  const code = prompt("Code de double authentification (6 chiffres) :");
  if (!code) throw new Error("Code 2FA requis");

  const result = await challengeAndVerifyTotp(supabase, mfaCheck.factorId, code);
  if (result.error) {
    await supabase.auth.signOut();  // logout si échec
    throw new Error(result.error);
  }
  // ✅ Session maintenant en aal2 (Authentication Assurance Level 2)
}

// Continue le flow normal (audit log, redirect, etc.)
```

> 💡 **Mieux que prompt()** : remplace par une modale React propre avec un input à 6 chiffres style OTP.

---

## 📍 Étape 4 — Tester

1. Connecte-toi avec ton compte Aveho normal
2. Va dans `/profil`
3. Clique sur **"Activer la double authentification"**
4. Scanne le QR avec Google Authenticator, Authy, Microsoft Authenticator, ou 1Password
5. Saisis le code à 6 chiffres → "Activer le 2FA"
6. Déconnecte-toi
7. Reconnecte-toi avec ton mot de passe → tu dois être prompté pour le code TOTP
8. Saisis le code → accès accordé ✅

---

## 🚨 Important pour les utilisateurs

- **Ne perds pas ton authenticator app !** Si tu perds ton téléphone, tu ne pourras plus te connecter.
- **Garde le secret en backup** : lors de l'enrollment, le composant `<MfaSetup />` affiche aussi le secret en clair (cliquer "Pas de scanner ? Affiche le secret manuel"). Note-le quelque part de sûr.
- **Recovery codes** : Supabase ne génère pas de recovery codes automatiquement. Si tu veux en ajouter, c'est à toi de les générer manuellement (à voir dans une future version).

---

## 🛡️ Recommandations sécurité

| Profil utilisateur | 2FA recommandé ? |
|---|---|
| Administrateur structure | ✅ **OBLIGATOIRE** |
| User avec accès données patients | ✅ **OBLIGATOIRE** |
| User standard | 🟡 Recommandé |
| User externe / partenaire | 🟢 Optionnel |

Pour forcer le 2FA sur les admins, tu peux :
- Soit ajouter une vérification dans `AdminGuard.js` qui refuse si `auth.role === admin && !mfaActive`
- Soit faire une campagne de communication interne pour inciter à l'activation
- Soit créer un dashboard admin qui liste les users sans 2FA actif

---

## 📊 Audit logs

Tous les événements MFA sont automatiquement loggés dans `audit_log` via le helper `lib/securityAudit.js` :
- `mfa_enrolled` quand un user active le 2FA
- `mfa_unenrolled` quand un user le désactive
- `mfa_challenge_success` à chaque login 2FA réussi
- `mfa_challenge_failed` à chaque code 2FA invalide

Visible dans **/audit** ou via SQL :

```sql
SELECT created_at, user_email, action, details
FROM audit_log
WHERE entite = 'security_event'
  AND action LIKE 'mfa_%'
ORDER BY created_at DESC
LIMIT 50;
```

---

## 🆘 Help

Si quelque chose ne marche pas :
1. Check la console browser pour erreurs Supabase Auth
2. Check Dashboard Supabase → Auth → Logs
3. Vérifie que `supabase.auth.mfa.enroll()` est bien disponible (pas un projet trop ancien)
