// =============================================================
//  app/api/ocr/prescription/route.js (Alpha 0.56.3)
//
//  OCR d'une ordonnance médicale via Claude Vision.
//  Extrait prescripteur (nom, RPPS, spécialité, FINESS, contact),
//  date, type, durée, renouvelabilité + liste structurée des
//  médicaments avec posologie complète.
//
//  ENV VAR REQUIRED : ANTHROPIC_API_KEY
// =============================================================

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

const EXTRACTION_PROMPT = `Tu es un assistant spécialisé dans l'extraction de données depuis des ordonnances médicales françaises (ordonnance simple, bizone ALD, médicaments d'exception, ordonnance sécurisée, ordonnance bi-zone).

Analyse l'image fournie et retourne UNIQUEMENT un JSON strict (pas de markdown, pas de commentaire). Si un champ n'est pas visible/lisible, mets null. Ne devine PAS — préfère null à une valeur incertaine.

Format JSON attendu (toutes les clés présentes même si null) :
{
  "prescripteur": {
    "nom": "DUPONT",
    "prenom": "Jean",
    "rpps": "10100123456" (11 chiffres),
    "specialite": "Médecine générale" ou "Cardiologie" etc.,
    "adresse": "12 Rue de la République, 75011 Paris",
    "telephone": "01 23 45 67 89",
    "email": null,
    "finess": "750100123" (9 chiffres) ou null
  },
  "date_prescription": "2025-03-15" (format YYYY-MM-DD strict),
  "type_prescription": "ordonnance" | "bizone" | "medicaments_exception" | "hospitaliere" | "securisee",
  "duree_traitement": "1 mois" ou "3 mois" ou "QSP 1 mois renouvelable 2 fois",
  "est_renouvelable": true | false,
  "nb_renouvellements": 0 | 1 | 2 | 3,
  "patient_nom": "MARTIN" ou null (parfois visible sur l'ordonnance),
  "patient_prenom": "Marie" ou null,
  "patient_date_naissance": "1965-04-12" ou null,
  "medicaments": [
    {
      "medicament_nom": "DOLIPRANE 1000 mg" (nom commercial visible),
      "medicament_dci": "PARACETAMOL" (DCI si déductible, sinon null),
      "forme": "comprimé" | "gélule" | "sirop" | "patch" | "ampoule" | "suppositoire" | "crème" | "solution buvable" | null,
      "dosage": "1000 mg" ou "500 mg/5 ml" ou null,
      "voie_administration": "orale" | "cutanée" | "intraveineuse" | "rectale" | "inhalation" | "ophtalmique" | null,
      "posologie_libre": "1 comprimé matin et soir pendant 7 jours" (texte exact lu sur l'ordonnance),
      "qte_par_prise": 1 | 0.5 | 2 (nombre, null si pas extractible),
      "unite_prise": "comprimé" | "ml" | "goutte" | "bouffée" | null,
      "prises_par_jour": 1 | 2 | 3 | 4 | null,
      "duree_jours": 7 | 30 | 90 | null (durée totale du traitement de ce médicament en jours),
      "quantite_a_delivrer": "QSP 1 mois" | "2 boîtes de 30" | null,
      "est_renouvelable": true | false,
      "commentaire": "à jeun" | "le matin" | "ALD" | "à éviter pendant la grossesse" | null
    }
    // ... un objet par médicament prescrit
  ],
  "notes_libres": "Texte additionnel non structuré visible sur l'ordonnance",
  "confiance": "haute" | "moyenne" | "faible"
}

Règles importantes :
- Le champ "confiance" reflète ta certitude globale d'extraction (lisibilité écriture + visibilité champs).
- "type_prescription" : "bizone" si tu vois 2 zones (médicaments ALD vs hors ALD), "medicaments_exception" si mention "médicament d'exception", "securisee" si papier vert filigrané, sinon "ordonnance" par défaut.
- Pour les posologies en français : "matin midi soir" = 3 prises/jour, "2 fois par jour" = 2, "x3" ou "3x/j" = 3.
- "duree_jours" : convertir "1 mois" en 30, "2 mois" en 60, "3 mois" en 90, "1 semaine" en 7.
- "qte_par_prise" : "un demi" = 0.5, "deux comprimés" = 2.
- Si plusieurs zones (bizone), met TOUS les médicaments dans le tableau "medicaments" (peu importe la zone), avec mention dans "commentaire" : "ALD" ou "non-ALD".
- N'INVENTE PAS de médicaments. Si tu ne lis qu'un nom partiel, mets ce que tu vois et baisse la confiance.

Retourne UNIQUEMENT le JSON.`;

// 0.56.20 : auth + rate limit
import { requireAuth, checkRateLimit } from "../../../../lib/apiAuth";
import { safeError } from "../../../../lib/safeError";  // 0.57.28

export async function POST(req) {
  const t0 = Date.now();

  const authCheck = await requireAuth(req);
  if (!authCheck.ok) return authCheck.response;
  const { user } = authCheck;

  const rate = checkRateLimit(user.id, { maxRequests: 10, windowMs: 60_000 });
  if (!rate.ok) return rate.response;

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ ok: false, error: "ANTHROPIC_API_KEY manquante" }, { status: 500 });
  }

  let body;
  try { body = await req.json(); }
  catch (e) { return Response.json({ ok: false, error: "Body JSON invalide" }, { status: 400 }); }

  // 0.57.26 : validation schema (image_base64 = potentiellement énorme → 25 MB max)
  const { validate } = await import("../../../../lib/validateInput");
  const errors = validate(body, {
    image_base64: { type: "string", required: true, maxLen: 25_000_000 },  // 25 MB en base64
    media_type: { type: "string", maxLen: 100 },
  });
  if (errors.length > 0) {
    return Response.json(
      { ok: false, error: "Body invalide", details: errors },
      { status: 400 }
    );
  }

  const { image_base64, media_type } = body;

  // Nettoyer le préfixe data:image/...;base64, si présent
  const cleanB64 = image_base64.replace(/^data:[^;]+;base64,/, "");
  const mt = media_type || "image/jpeg";

  // Validation MIME (Claude Vision ne supporte pas tous les types)
  const validMimes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
  if (!validMimes.includes(mt)) {
    return Response.json({
      ok: false,
      error: `Type MIME non supporté : ${mt}. Utilise JPEG, PNG, WEBP ou PDF.`,
    }, { status: 400 });
  }

  const isDoc = mt === "application/pdf";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000); // 55s, garde marge sous maxDuration

  try {
    const apiRes = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: [
            {
              type: isDoc ? "document" : "image",
              source: { type: "base64", media_type: mt, data: cleanB64 },
            },
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        }],
      }),
    });

    clearTimeout(timeout);

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return Response.json({
        ok: false,
        error: `Claude API HTTP ${apiRes.status}`,
        details: errText.slice(0, 500),
      }, { status: 502 });
    }

    const data = await apiRes.json();
    const text = data?.content?.[0]?.text || "";
    const tokens = {
      input: data?.usage?.input_tokens || 0,
      output: data?.usage?.output_tokens || 0,
    };

    // Parser le JSON retourné (Claude doit retourner du pur JSON)
    let parsed;
    try {
      // Robustesse : si Claude a malgré tout mis du markdown autour
      const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return Response.json({
        ok: false,
        error: "Réponse Claude non-JSON",
        ocr_text: text,
        duration_ms: Date.now() - t0,
        tokens,
      }, { status: 502 });
    }

    return Response.json({
      ok: true,
      data: parsed,
      ocr_text: text,
      model: data?.model || MODEL,
      duration_ms: Date.now() - t0,
      tokens,
    });
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === "AbortError") {
      return Response.json({
        ok: false,
        error: "Timeout OCR (>55s)",
        duration_ms: Date.now() - t0,
      }, { status: 504 });
    }
    return Response.json({
      ...safeError(e, "Erreur OCR prescription"),
      duration_ms: Date.now() - t0,
    }, { status: 500 });
  }
}
