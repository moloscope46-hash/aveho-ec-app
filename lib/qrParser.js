// =============================================================
//  lib/qrParser.js (Alpha 0.56.2)
//
//  Détecte le type d'un contenu scanné (QR ou code-barre) et
//  retourne une structure normalisée pour proposer des actions.
//
//  Types détectés :
//    - "vitale_qr"   : QR carte Vitale (format DGE-MSS, contient NIR)
//    - "url"         : URL http(s) — peut être un lien interne app
//    - "url_aveho"   : URL Aveho interne (auto-navigate)
//    - "gs1"         : code-barre GS1/UDI matériel médical
//    - "ean"         : code-barre EAN13/EAN8 produit
//    - "text"        : texte libre
//    - "vcard"       : carte de contact vCard
//    - "wifi"        : config WiFi (WIFI:T:WPA;...)
// =============================================================

/** NIR français : 13 chiffres + 2 clé. Exemple : 1 85 04 75 116 001 22 */
const NIR_RE = /\b([12])\s?(\d{2})\s?(\d{2})\s?(\d{2,3})\s?(\d{3})\s?(\d{3})\s?(\d{2})\b/;

/** Application Identifier GS1 (par ex 01=GTIN, 17=expiration, 10=lot, 21=serial). */
const GS1_AI_RE = /\((\d{2,4})\)([^()]+)/g;

export function parseQrContent(text) {
  if (!text) return { type: "empty", raw: "" };
  const t = text.trim();

  // 1. URL ?
  if (/^https?:\/\//i.test(t)) {
    const url = new URL(t);
    const isAveho = /aveho-ec|aveho\.app|localhost/i.test(url.hostname);
    return {
      type: isAveho ? "url_aveho" : "url",
      raw: t,
      url,
      label: isAveho ? "Lien interne Aveho" : "URL externe",
    };
  }

  // 2. vCard
  if (/^BEGIN:VCARD/i.test(t)) {
    const fn = (t.match(/FN:(.+)/) || [])[1]?.trim();
    const tel = (t.match(/TEL[^:]*:(.+)/) || [])[1]?.trim();
    const email = (t.match(/EMAIL[^:]*:(.+)/) || [])[1]?.trim();
    return { type: "vcard", raw: t, label: "Contact vCard", fn, tel, email };
  }

  // 3. WiFi
  if (/^WIFI:/i.test(t)) {
    const ssid = (t.match(/S:([^;]+)/) || [])[1];
    const auth = (t.match(/T:([^;]+)/) || [])[1];
    return { type: "wifi", raw: t, label: "Config WiFi", ssid, auth };
  }

  // 4. QR Vitale (format DGE-MSS / "TLV") — détection heuristique : contient un NIR + nom
  //    Le vrai format Vitale Carte est complexe (cryptographique), mais on détecte au minimum
  //    si le contenu ressemble à des données patient (NIR + nom/prénom).
  const nirMatch = t.match(NIR_RE);
  if (nirMatch) {
    const sexe = nirMatch[1] === "1" ? "M" : "F";
    const annee = parseInt(nirMatch[2], 10);
    const mois = parseInt(nirMatch[3], 10);
    const nir = nirMatch[0].replace(/\s/g, "");
    return {
      type: "vitale_qr",
      raw: t,
      label: "Données type Vitale",
      nir,
      sexe,
      annee_naissance: annee,
      mois_naissance: mois,
    };
  }

  // 5. GS1/UDI : présence d'Application Identifiers (parenthèses)
  if (/\(\d{2,4}\)/.test(t)) {
    const ais = {};
    let m;
    GS1_AI_RE.lastIndex = 0;
    while ((m = GS1_AI_RE.exec(t)) !== null) {
      ais[m[1]] = m[2].trim();
    }
    const labels = {
      "01": "GTIN",
      "10": "Lot",
      "17": "Péremption",
      "21": "Serial",
      "11": "Date fab",
      "240": "Réf additionnelle",
    };
    return {
      type: "gs1",
      raw: t,
      label: "Code-barre GS1/UDI matériel",
      ais,
      ais_labeled: Object.entries(ais).map(([k, v]) => ({ ai: k, label: labels[k] || `AI ${k}`, value: v })),
    };
  }

  // 6. EAN13/EAN8 : 8 ou 13 chiffres uniquement
  if (/^\d{8}$|^\d{13}$/.test(t)) {
    return {
      type: "ean",
      raw: t,
      label: t.length === 13 ? "Code EAN-13" : "Code EAN-8",
      ean: t,
    };
  }

  // 7. Texte libre
  return { type: "text", raw: t, label: "Texte libre" };
}
