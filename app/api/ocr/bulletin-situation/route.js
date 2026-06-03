// =============================================================
//  app/api/ocr/bulletin-situation/route.js (Alpha 0.55.50)
//
//  OCR d'un bulletin de situation hospitalier via Claude Vision.
//  Reçoit une image (base64), l'envoie à Anthropic Claude avec un
//  prompt structurant, et retourne un JSON avec les champs extraits.
//
//  ENV VAR REQUIRED : ANTHROPIC_API_KEY (sk-ant-...)
//
//  Body JSON :
//    {
//      "image_base64": "data:image/jpeg;base64,...",
//      "media_type": "image/jpeg" | "image/png" | "application/pdf"
//    }
//
//  Réponse :
//    {
//      "ok": true,
//      "data": { nom, prenom, ..., 30+ champs },
//      "ocr_text": "texte brut extrait",
//      "model": "claude-sonnet-4-...",
//      "duration_ms": 4523,
//      "tokens": { input: 1230, output: 456 }
//    }
// =============================================================

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel : 60s pour l'OCR

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

const EXTRACTION_PROMPT = `Tu es un assistant spécialisé dans l'extraction de données médicales et administratives françaises depuis des bulletins de situation hospitaliers ou attestations de droits de l'Assurance Maladie.

Analyse l'image fournie et extrais TOUTES les informations visibles dans un JSON strict (sans markdown, sans commentaire, juste le JSON pur). Si un champ n'est pas visible, mets null (pas de chaîne vide, pas "non trouvé"). Ne devine PAS, mets null si pas sûr.

Format JSON attendu (toutes les clés doivent être présentes même si null) :
{
  "nom": "DUPONT",
  "prenom": "Jean",
  "nom_naissance": "MARTIN ou null si pas indiqué",
  "sexe": "M" ou "F" ou null,
  "date_naissance": "1980-05-23" (format YYYY-MM-DD),
  "lieu_naissance_ville": "PARIS",
  "lieu_naissance_code_insee": "75056" ou null,
  "lieu_naissance_pays": "France",
  "nationalite": "Française",
  "numero_secu": "1850375116001" (13 chiffres sans clé) ou "185037511600123" (15 chiffres avec clé) - retourne tel que visible,
  "cle_nir": "23" (clé de sécu sur 2 chiffres) ou null si pas séparée,
  "code_organisme_rattachement": "751010101" ou "751" (9 chiffres ou format court),
  "nom_caisse": "CPAM DE PARIS" (texte exact tel que visible),
  "centre_paiement": "code centre dans caisse" ou null,
  "regime_secu": "general" | "agricole" | "militaire" | "fonctionnaire" | "special" | null,
  "qualite_assure": "assure" | "ayant_droit" | null,
  "rang_naissance": 1 (entier) ou null,
  "date_debut_droits": "2024-01-01" ou null,
  "date_fin_droits": "2025-12-31" ou null,
  "ald": true ou false ou null (si visible "ALD" / "Affection Longue Durée"),
  "ald_commentaire": "diagnostic ALD si visible" ou null,
  "cmu_c": true/false/null,
  "c2s": true/false/null (Complémentaire Santé Solidaire),
  "ame": true/false/null,
  "mutuelle_nom": "HARMONIE MUTUELLE" ou null,
  "mutuelle_numero_amc": "25992142" (8 chiffres) ou null,
  "mutuelle_numero_adherent": "ABC123456" ou null,
  "adresse": "12 RUE DU LAC",
  "complement_adresse": "Bâtiment B Apt 3" ou null,
  "code_postal": "75011",
  "ville": "PARIS",
  "pays": "France",
  "telephone_fixe": null,
  "telephone_portable": null,
  "email": null,
  "medecin_traitant_nom": "DURAND" ou null,
  "medecin_traitant_prenom": "Sophie" ou null,
  "medecin_traitant_rpps": "10000000001" ou null,
  "etablissement_emetteur": "Hôpital Bichat" ou null (si visible),
  "date_emission_bulletin": "2024-10-15" ou null,
  "date_entree_hospit": "2024-10-15" ou null,
  "date_sortie_hospit": "2024-10-22" ou null,
  "service_hospit": "Cardiologie" ou null,
  "ocr_text_brut": "tout le texte visible dans le document, dans l'ordre, pour audit",
  "confiance": "haute" | "moyenne" | "faible" (ton évaluation de la fiabilité de l'extraction)
}

RÈGLES IMPORTANTES :
- Réponds UNIQUEMENT avec le JSON, RIEN d'autre. Pas de markdown, pas de \`\`\`json, pas de commentaire.
- Si l'image n'est pas lisible ou pas un bulletin de situation, retourne {"erreur": "Image non lisible ou non reconnue comme bulletin de situation", "ocr_text_brut": "..."}
- Les noms doivent être en MAJUSCULES tels que visibles sur le document
- Les prénoms en Casse normale (première lettre majuscule)
- Les dates au format ISO YYYY-MM-DD
- ocr_text_brut doit contenir TOUT le texte visible (utile pour audit/correction manuelle)`;

// 0.56.20 : auth + rate limit obligatoires
import { requireAuth, checkRateLimit } from "../../../../lib/apiAuth";

export async function POST(req) {
  const t0 = Date.now();

  // 0.56.20 : protection auth — sans Bearer valide, 401
  const authCheck = await requireAuth(req);
  if (!authCheck.ok) return authCheck.response;
  const { user } = authCheck;

  // 0.56.20 : rate limit 10 OCR/min/user pour éviter brûler la quota Anthropic
  const rate = checkRateLimit(user.id, { maxRequests: 10, windowMs: 60_000 });
  if (!rate.ok) return rate.response;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({
      ok: false,
      error: "ANTHROPIC_API_KEY non configurée côté serveur. Ajoute-la dans les Environment Variables Vercel.",
    }, { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Body JSON invalide" }, { status: 400 });
  }

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

  let { image_base64, media_type } = body;

  // Si l'image arrive avec le préfixe data: URL, on l'enlève
  if (image_base64.startsWith("data:")) {
    const match = image_base64.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      media_type = media_type || match[1];
      image_base64 = match[2];
    }
  }

  if (!media_type) media_type = "image/jpeg";
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
  if (!allowedTypes.includes(media_type)) {
    return Response.json({ ok: false, error: `Type non supporté : ${media_type}` }, { status: 400 });
  }

  // Construction du message Anthropic avec image + prompt
  const isPdf = media_type === "application/pdf";
  const anthropicBody = {
    model: MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: isPdf ? "document" : "image",
            source: { type: "base64", media_type, data: image_base64 },
          },
          { type: "text", text: EXTRACTION_PROMPT },
        ],
      },
    ],
  };

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(anthropicBody),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return Response.json({
        ok: false,
        error: `Anthropic API HTTP ${res.status}`,
        details: errBody.slice(0, 500),
      }, { status: 200 });
    }

    const result = await res.json();
    const textContent = (result.content || []).find(c => c.type === "text")?.text || "";

    // Parser le JSON renvoyé par Claude
    let parsed = null;
    let parseError = null;
    try {
      // Au cas où Claude aurait quand même mis du ```json ... ```
      const cleaned = textContent.replace(/^```(?:json)?\s*/g, "").replace(/\s*```\s*$/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      parseError = e.message;
    }

    if (parseError || !parsed) {
      return Response.json({
        ok: false,
        error: "Réponse Claude non parseable en JSON",
        raw_text: textContent.slice(0, 1000),
        parse_error: parseError,
        duration_ms: Date.now() - t0,
      });
    }

    // Si Claude a signalé une erreur (image non lisible)
    if (parsed.erreur) {
      return Response.json({
        ok: false,
        error: parsed.erreur,
        ocr_text_brut: parsed.ocr_text_brut || null,
        duration_ms: Date.now() - t0,
      });
    }

    return Response.json({
      ok: true,
      data: parsed,
      ocr_text: parsed.ocr_text_brut || null,
      confiance: parsed.confiance || "moyenne",
      model: result.model,
      duration_ms: Date.now() - t0,
      tokens: {
        input: result.usage?.input_tokens || 0,
        output: result.usage?.output_tokens || 0,
      },
    });
  } catch (e) {
    return Response.json({
      ok: false,
      error: `Exception : ${e.message}`,
      duration_ms: Date.now() - t0,
    }, { status: 200 });
  }
}
