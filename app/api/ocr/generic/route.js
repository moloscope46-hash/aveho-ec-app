// =============================================================
//  app/api/ocr/generic/route.js (Alpha 0.55.51)
//
//  OCR générique : retourne le texte brut d'une image/PDF
//  via Claude Vision, sans schéma forcé.
// =============================================================

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

const PROMPT = `Tu es un assistant d'extraction de texte (OCR).

Extrais TOUT le texte visible dans le document fourni, dans l'ordre de lecture (de haut en bas, gauche à droite). Conserve la structure naturelle : sauts de ligne, paragraphes, listes, tableaux (utilise des espaces pour aligner les colonnes).

Réponds UNIQUEMENT avec le texte extrait, sans introduction, sans commentaire, sans markdown. Si l'image n'est pas lisible ou ne contient pas de texte, réponds "(aucun texte détecté)".`;

// 0.56.20 : auth + rate limit
import { requireAuth, checkRateLimit } from "../../../../lib/apiAuth";

export async function POST(req) {
  const t0 = Date.now();

  const authCheck = await requireAuth(req);
  if (!authCheck.ok) return authCheck.response;
  const { user } = authCheck;

  const rate = checkRateLimit(user.id, { maxRequests: 10, windowMs: 60_000 });
  if (!rate.ok) return rate.response;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ ok: false, error: "ANTHROPIC_API_KEY non configurée" }, { status: 500 });
  }

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ ok: false, error: "Body JSON invalide" }, { status: 400 });
  }
  let { image_base64, media_type } = body;
  if (!image_base64) return Response.json({ ok: false, error: "image_base64 manquant" }, { status: 400 });

  if (image_base64.startsWith("data:")) {
    const match = image_base64.match(/^data:([^;]+);base64,(.+)$/);
    if (match) { media_type = media_type || match[1]; image_base64 = match[2]; }
  }
  if (!media_type) media_type = "image/jpeg";

  const isPdf = media_type === "application/pdf";
  try {
    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: [
            { type: isPdf ? "document" : "image", source: { type: "base64", media_type, data: image_base64 } },
            { type: "text", text: PROMPT },
          ],
        }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return Response.json({
        ok: false,
        error: `Anthropic API HTTP ${res.status}`,
        details: errBody.slice(0, 500),
        duration_ms: Date.now() - t0,
      }, { status: 200 });
    }

    const result = await res.json();
    const text = (result.content || []).find(c => c.type === "text")?.text || "";

    return Response.json({
      ok: true,
      text,
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
