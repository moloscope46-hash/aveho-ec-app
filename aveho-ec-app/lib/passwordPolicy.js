// =============================================================
//  lib/passwordPolicy.js (Alpha 0.55.12)
//  Validateur de mot de passe utilisable depuis n'importe quelle page.
//  Symétrique avec la RPC validate_password_policy() côté SQL.
//
//  Usage :
//    import { checkPassword, strengthLabel } from "lib/passwordPolicy";
//    const r = checkPassword("monMotDePasse!");
//    // → { ok: bool, score: 0..5, problems: [], strength: "Moyen" }
// =============================================================

const COMMON_PASSWORDS = new Set([
  "password", "azerty", "motdepasse", "123456", "12345678",
  "1234567890", "qwerty", "password123", "admin", "aveho",
  "soleil", "iloveyou", "welcome", "monkey", "azerty123",
  "p@ssword1", "password1!", "admin123!", "bonjour", "secret",
]);

export function checkPassword(p) {
  const problems = [];
  let score = 0;

  if (!p) {
    return {
      ok: false,
      score: 0,
      problems: ["Mot de passe requis"],
      strength: "Vide",
    };
  }

  // Règle 1 — longueur minimale
  if (p.length < 12) {
    problems.push("Au moins 12 caractères");
  } else {
    score++;
    if (p.length >= 16) score++; // bonus 16+
  }

  // Règle 2 — majuscule
  if (!/[A-Z]/.test(p)) {
    problems.push("Au moins 1 majuscule");
  } else {
    score++;
  }

  // Règle 3 — minuscule
  if (!/[a-z]/.test(p)) {
    problems.push("Au moins 1 minuscule");
  }

  // Règle 4 — chiffre
  if (!/[0-9]/.test(p)) {
    problems.push("Au moins 1 chiffre");
  } else {
    score++;
  }

  // Règle 5 — caractère spécial
  if (!/[^A-Za-z0-9]/.test(p)) {
    problems.push("Au moins 1 caractère spécial (!@#…)");
  } else {
    score++;
  }

  // Règle 6 — pas dans la blacklist
  if (COMMON_PASSWORDS.has(p.toLowerCase())) {
    problems.push("Mot de passe trop commun, choisis-en un autre");
    score = 0;
  }

  // Règle 7 — pas seulement un mot répété (ex: "azertyazerty")
  if (p.length >= 8 && p.toLowerCase() === p.slice(0, p.length / 2).toLowerCase().repeat(2)) {
    problems.push("Mot de passe répétitif");
    score = Math.max(0, score - 1);
  }

  // Cap score à 5
  score = Math.min(5, score);

  return {
    ok: problems.length === 0,
    score,
    problems,
    strength: strengthLabel(score),
  };
}

export function strengthLabel(score) {
  if (score <= 1) return "Très faible";
  if (score === 2) return "Faible";
  if (score === 3) return "Moyen";
  if (score === 4) return "Fort";
  return "Excellent";
}

export function strengthColor(score) {
  if (score <= 1) return "#c0392b";   // rouge
  if (score === 2) return "#e87b3f";  // orange
  if (score === 3) return "#EF9F27";  // ambre
  if (score === 4) return "#5aa05a";  // vert
  return "#2e6f33";                    // vert foncé
}

/**
 * Génère un mot de passe sûr aléatoire (utilisable pour l'admin
 * qui veut créer un user manuel sans envoyer d'invit).
 */
export function generateSecurePassword(length = 16) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";    // pas I O
  const lower = "abcdefghijkmnpqrstuvwxyz";    // pas l o
  const digits = "23456789";                    // pas 0 1
  const special = "!@#$%^&*-_+=";
  const all = upper + lower + digits + special;

  // Garantit au moins 1 de chaque catégorie
  let pwd = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  for (let i = 4; i < length; i++) {
    pwd.push(all[Math.floor(Math.random() * all.length)]);
  }
  // Shuffle
  for (let i = pwd.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pwd[i], pwd[j]] = [pwd[j], pwd[i]];
  }
  return pwd.join("");
}
