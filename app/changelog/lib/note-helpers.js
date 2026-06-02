// =============================================================
//  app/changelog/lib/note-helpers.js (Alpha 0.57.10)
//
//  Helpers purs pour la modale de note du changelog :
//   - scopeHtml : scope les styles inline du body pour pas écraser la page
//   - extractKeywords : tokenise + filtre stopwords pour le highlight
//   - highlightInHtml : injecte des <mark> sur les mots-clés trouvés
//
//  Extrait de app/changelog/page.js en 0.57.10 pour alléger.
// =============================================================

// Stopwords français pour ne pas surligner les mots vides
export const STOPWORDS_FR = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "au", "aux", "et", "ou", "mais", "donc", "car", "ni", "or",
  "à", "en", "dans", "sur", "sous", "pour", "par", "avec", "sans", "chez", "vers", "entre", "contre", "selon",
  "ce", "cet", "cette", "ces", "mon", "ma", "mes", "ton", "ta", "tes", "son", "sa", "ses", "notre", "votre", "leur", "leurs", "nos", "vos",
  "qui", "que", "quoi", "dont", "où", "quand", "comme", "si", "ne", "pas", "plus", "moins", "très", "trop", "aussi", "encore", "déjà", "puis",
  "est", "sont", "être", "était", "sera", "ont", "avoir", "avait", "fait", "faire", "peut", "peuvent", "doit", "doivent",
  "tous", "toutes", "tout", "toute", "chaque", "autre", "autres", "même", "mêmes", "aucun", "aucune",
  "alors", "ainsi", "puis", "ensuite", "enfin", "cependant", "toutefois", "néanmoins",
  "via", "sans", "cas", "mode", "etc",
]);

/**
 * Échappe les caractères regex spéciaux d'un mot-clé.
 */
export function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Scope les styles inline du body d'une note HTML pour ne pas écraser
 * la page du changelog. Préfixe ".cl-note-scope" sur tous les sélecteurs.
 */
export function scopeHtml(fullHtml) {
  const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const styleMatch = fullHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const body = bodyMatch ? bodyMatch[1] : fullHtml;
  const styles = styleMatch ? styleMatch[1] : "";
  const scopedStyles = styles
    .replace(/body\s*\{/g, '.cl-note-scope {')
    .replace(/(^|\})\s*\.wrap\b/g, '$1 .cl-note-scope .wrap');
  return `<style>${scopedStyles}</style><div class="cl-note-scope">${body}</div>`;
}

/**
 * Extrait les mots-clés significatifs d'un texte (pour highlight dans une note).
 * Garde les mots de 4+ caractères non-stopwords, les versions (0.55.12),
 * les acronymes (CERFA, RPC).
 */
export function extractKeywords(text) {
  if (!text) return [];
  const tokens = text
    .toLowerCase()
    .replace(/[«»''""()[\]{},;:!?.…]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const kws = new Set();
  for (const t of tokens) {
    if (t.length >= 4 && !STOPWORDS_FR.has(t) && /[a-zà-ÿ0-9]/i.test(t)) {
      const clean = t.replace(/^[^a-zà-ÿ0-9]+|[^a-zà-ÿ0-9]+$/gi, "");
      if (clean.length >= 4) kws.add(clean);
    } else if (/^\d+(\.\d+)+$/.test(t)) {
      kws.add(t); // versions
    } else if (t.length >= 3 && /^[A-Z0-9]+$/i.test(t) && /[A-Z]/.test(t)) {
      kws.add(t); // acronymes
    }
  }
  return Array.from(kws);
}

/**
 * Surligne les keywords dans le HTML scopé en injectant des <mark>.
 * Renvoie { html, matchCount }.
 *
 * Particularité : tokenise alternativement les tags HTML et le texte pour
 * ne pas matcher dans les attributs (= éviter de casser les balises).
 */
export function highlightInHtml(html, keywords) {
  if (!keywords || keywords.length === 0) return { html, matchCount: 0 };
  const escaped = keywords.map(escapeRegex).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(
    `(?<![a-zà-ÿ0-9])(${escaped.join("|")})(?![a-zà-ÿ0-9])`,
    "gi"
  );

  const tokenizer = /<[^>]+>|[^<]+/g;
  let result = "";
  let matchIdx = 0;
  let match;
  while ((match = tokenizer.exec(html)) !== null) {
    const seg = match[0];
    if (seg.startsWith("<")) {
      result += seg;
    } else {
      result += seg.replace(pattern, (m) => {
        const idx = matchIdx++;
        return `<mark class="cl-match" data-cl-idx="${idx}">${m}</mark>`;
      });
    }
  }
  return { html: result, matchCount: matchIdx };
}
