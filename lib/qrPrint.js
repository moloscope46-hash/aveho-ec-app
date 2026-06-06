// =============================================================
//  lib/qrPrint.js (0.58.79)
//  Génère des fenêtres d'impression QR pour dépôts et emplacements
// =============================================================
import { generateQrCodeUrl } from "./barcode";

/**
 * Ouvre une fenêtre d'impression avec un GRAND QR pour un dépôt (A4 single).
 * À coller sur la porte/le mur du dépôt.
 */
export function printDepotQR(depot) {
  if (typeof window === "undefined") return;
  const url = `${window.location.origin}/depots/scan/${depot.id}`;
  const qrImg = generateQrCodeUrl(url, 600);
  const w = window.open("", "_blank", "width=800,height=1100");
  if (!w) return;
  const nom = (depot.nom || "Dépôt").replace(/[<>]/g, "");
  const code = (depot.code || "").replace(/[<>]/g, "");
  const couleur = depot.couleur || "#7CC8C8";
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QR ${nom}</title>
    <style>
      @page { size: A4 portrait; margin: 15mm; }
      *{box-sizing:border-box;font-family:Quicksand,'Segoe UI',sans-serif}
      body{margin:0;padding:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#fff}
      .frame{
        border: 6px solid ${couleur};
        border-radius: 24px;
        padding: 40px 50px;
        text-align: center;
        max-width: 620px;
        box-shadow: 0 0 0 4px #fff inset, 0 8px 30px rgba(20,33,49,0.08);
      }
      .ic{
        width: 70px; height: 70px;
        margin: 0 auto 18px;
        border-radius: 16px;
        background: ${couleur}22;
        display: flex; align-items: center; justify-content: center;
        font-size: 36px; color: ${couleur};
      }
      h1{ font-size: 36px; margin: 0 0 6px; color: #142131; letter-spacing: -0.5px; }
      .code{ font-family: Consolas, monospace; color: ${couleur}; font-size: 14px; margin-bottom: 24px; font-weight: 700; letter-spacing: 2px; }
      .qr{ display: block; margin: 14px auto; padding: 12px; background: #fff; border: 2px solid #f0f3f6; border-radius: 12px; }
      .footer{ margin-top: 22px; font-size: 12px; color: #8a98a8; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; }
      .url{ margin-top: 8px; font-size: 10px; color: #cfd8e0; font-family: Consolas, monospace; word-break: break-all; }
      .badge{
        display: inline-block;
        background: ${couleur};
        color: #fff;
        padding: 4px 14px;
        border-radius: 99px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 1px;
        margin-bottom: 12px;
        text-transform: uppercase;
      }
    </style></head><body>
    <div class="frame">
      <div class="badge">DÉPÔT</div>
      <h1>${nom}</h1>
      ${code ? `<div class="code">${code}</div>` : ""}
      <img src="${qrImg}" alt="QR" width="500" height="500" class="qr"/>
      <div class="footer">📱 Scanner pour gérer le contenu</div>
      <div class="url">${url}</div>
    </div>
    <script>window.onload = () => setTimeout(() => window.print(), 500);</script>
  </body></html>`);
  w.document.close();
}

/**
 * Imprime une planche de petites étiquettes QR pour des emplacements
 * (format A4 en 4×8 = 32 étiquettes par page)
 */
export function printEmplacementsQR(depot, emplacements) {
  if (typeof window === "undefined") return;
  if (!emplacements || emplacements.length === 0) return;
  const w = window.open("", "_blank", "width=800,height=1100");
  if (!w) return;
  const items = emplacements.map(e => {
    const url = `${window.location.origin}/emplacements/scan/${e.id}`;
    const qrImg = generateQrCodeUrl(url, 200);
    const nom = (e.nom || "").replace(/[<>]/g, "");
    const code = (e.code || "").replace(/[<>]/g, "");
    const couleur = e.couleur || depot.couleur || "#7CC8C8";
    return `
      <div class="tag" style="border-color:${couleur}">
        <div class="tag-head" style="color:${couleur}">${code || nom}</div>
        <img src="${qrImg}" width="120" height="120" alt="QR"/>
        <div class="tag-name">${nom}</div>
        <div class="tag-depot">${(depot.nom || "").replace(/[<>]/g, "")}</div>
      </div>
    `;
  }).join("");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Étiquettes ${depot.nom || ""}</title>
    <style>
      @page { size: A4 portrait; margin: 10mm; }
      *{box-sizing:border-box;font-family:Quicksand,'Segoe UI',sans-serif}
      body{margin:0;padding:0;background:#fff;color:#142131}
      .header{ padding: 0 0 8mm; text-align: center; }
      .header h1{ margin: 0; font-size: 16px; color: #142131; }
      .header p{ margin: 4px 0 0; font-size: 11px; color: #8a98a8; }
      .grid{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
      .tag{
        border: 2px dashed currentColor;
        border-radius: 10px;
        padding: 6mm 4mm;
        text-align: center;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .tag-head{ font-size: 13px; font-weight: 700; letter-spacing: 1px; margin-bottom: 4mm; text-transform: uppercase; }
      .tag img{ display: block; margin: 0 auto; }
      .tag-name{ font-size: 11px; color: #142131; font-weight: 600; margin-top: 3mm; min-height: 14px; }
      .tag-depot{ font-size: 9px; color: #8a98a8; margin-top: 1mm; }
    </style></head><body>
    <div class="header">
      <h1>📦 Étiquettes emplacements — ${(depot.nom || "").replace(/[<>]/g, "")}</h1>
      <p>${emplacements.length} étiquettes · À découper et coller</p>
    </div>
    <div class="grid">
      ${items}
    </div>
    <script>window.onload = () => setTimeout(() => window.print(), 500);</script>
  </body></html>`);
  w.document.close();
}
