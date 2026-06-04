"use client";
// app/patient/[id]/edit/tabs/TabAudit.js — extrait depuis page.js en 0.57.1

import React, { useState, useEffect } from "react";
import { Panel} from "../../../../ui";
// 0.58.18 : fix bug "createClient is not defined" — import manquant depuis l'extract de 0.57.1
import { createClient } from "../../../../../lib/supabase";
// 0.57.10 : imports retirés (logger non utilisés)

// 0.57.10 : imports retirés (fmtDate, fmtDateTime non utilisés)

import { KvBlock } from "./_helpers";

function TabAudit({ pat }) {
  // 0.56.1 : génère une URL signée du bulletin archivé en Storage
  const [signedUrl, setSignedUrl] = useState(null);
  const [signedErr, setSignedErr] = useState(null);
  const [signing, setSigning] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!pat.bs_file_path) return;
    setSigning(true);
    (async () => {
      try {
        const { getSignedUrl } = await import("../../../../../lib/bulletinsStorage");
        const url = await getSignedUrl(supabase, pat.bs_file_path, 3600);
        if (url) setSignedUrl(url);
        else setSignedErr("Lien signé impossible (fichier inaccessible ?)");
      } catch (e) {
        setSignedErr(e.message);
      } finally {
        setSigning(false);
      }
    })();
  }, [pat.bs_file_path]);

  const isImage = pat.bs_file_mime && pat.bs_file_mime.startsWith("image/");
  const isPdf = pat.bs_file_mime === "application/pdf";

  return (
    <>
      <Panel style={{ marginBottom: 12 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
          <i className="ti ti-file-scan" style={{ color: "#5a8f8f", marginRight: 6 }} /> Source de création
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          <KvBlock label="Source" value={
            pat.source_creation === "ocr_bs" ? "📄 OCR bulletin de situation"
            : pat.source_creation === "import_csv" ? "📊 Import CSV"
            : "✍️ Saisie manuelle"
          } />
          <KvBlock label="Créé le" value={pat.created_at ? new Date(pat.created_at).toLocaleString() : "—"} />
          <KvBlock label="Mis à jour" value={pat.updated_at ? new Date(pat.updated_at).toLocaleString() : "—"} />
          {pat.bs_ocr_confiance && (
            <KvBlock label="Confiance OCR" value={
              pat.bs_ocr_confiance === "haute" ? "✓ Haute"
              : pat.bs_ocr_confiance === "moyenne" ? "⚠ Moyenne"
              : "✗ Faible"
            } />
          )}
          {(pat.bs_ocr_tokens_in || pat.bs_ocr_tokens_out) && (
            <KvBlock label="Tokens Claude (IN/OUT)" value={`${pat.bs_ocr_tokens_in || 0} / ${pat.bs_ocr_tokens_out || 0}`} />
          )}
        </div>
      </Panel>

      {/* 0.56.1 : bulletin archivé en Storage avec preview signée */}
      {pat.bs_file_path ? (
        <Panel style={{ marginBottom: 12 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <i className="ti ti-archive" style={{ color: "#185FA5" }} /> Bulletin scanné archivé
            <span style={{ background: "#dbe7f5", color: "#185FA5", fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 8 }}>
              <i className="ti ti-shield-check" /> Privé · accès RLS
            </span>
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginBottom: 12, fontSize: 11.5 }}>
            <KvBlock label="Type" value={pat.bs_file_mime || "?"} />
            <KvBlock label="Taille" value={pat.bs_file_size_kb ? `${pat.bs_file_size_kb} Ko` : "?"} />
            <KvBlock label="OCR effectué" value={pat.bs_ocr_date ? new Date(pat.bs_ocr_date).toLocaleString() : "—"} />
          </div>

          {signing && (
            <div style={{ background: "#f4f7fa", padding: 10, borderRadius: 6, fontSize: 12, color: "#6c7a89" }}>
              <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> Génération du lien sécurisé…
            </div>
          )}

          {signedErr && (
            <div style={{ background: "#fce5e0", border: "1px solid #f0c4be", padding: 10, borderRadius: 6, fontSize: 12, color: "#7a2d23" }}>
              <i className="ti ti-alert-circle" /> {signedErr}
            </div>
          )}

          {signedUrl && (
            <div>
              {/* Preview image si possible */}
              {isImage && (
                <a href={signedUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
                  <img
                    src={signedUrl}
                    alt="Bulletin scanné"
                    style={{ maxWidth: "100%", maxHeight: 400, borderRadius: 8, border: "1px solid #e3e9ee", boxShadow: "0 2px 8px rgba(20,33,49,.08)", cursor: "zoom-in" }}
                  />
                </a>
              )}
              {isPdf && (
                <div style={{ background: "#dbe7f5", padding: 14, borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>📄</div>
                  <a href={signedUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", background: "#185FA5", color: "#fff", padding: "8px 18px", borderRadius: 6, textDecoration: "none", fontWeight: 700, fontSize: 12 }}>
                    <i className="ti ti-file-text" /> Ouvrir le PDF
                  </a>
                </div>
              )}
              {!isImage && !isPdf && (
                <div style={{ background: "#f4f7fa", padding: 10, borderRadius: 6, fontSize: 12 }}>
                  <a href={signedUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#185FA5", fontWeight: 700 }}>
                    <i className="ti ti-external-link" /> Ouvrir le fichier
                  </a>
                </div>
              )}
              <div style={{ fontSize: 10, color: "#a0aeb9", marginTop: 6, fontStyle: "italic" }}>
                <i className="ti ti-clock" /> Lien valide 1h, régénéré à chaque chargement de la page
              </div>
            </div>
          )}
        </Panel>
      ) : pat.bs_file_url ? (
        // Compat : ancien format avec URL directe (avant 0.56.1)
        <Panel style={{ marginBottom: 12 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
            <i className="ti ti-file" style={{ color: "#185FA5", marginRight: 6 }} /> Bulletin de situation (ancien format)
          </h3>
          <div style={{ background: "#dbe7f5", padding: 10, borderRadius: 6 }}>
            <a href={pat.bs_file_url} target="_blank" rel="noopener noreferrer" style={{ color: "#185FA5", fontWeight: 700, textDecoration: "none" }}>
              <i className="ti ti-external-link" /> Ouvrir le document
            </a>
          </div>
        </Panel>
      ) : (
        <Panel style={{ marginBottom: 12, background: "#f4f7fa" }}>
          <p style={{ fontSize: 12.5, color: "#6c7a89", margin: 0 }}>
            <i className="ti ti-info-circle" /> Pas de bulletin archivé. Pour créer un patient depuis un bulletin et l'archiver automatiquement, utilise <b>Outils scan → Créer patient depuis bulletin</b>.
          </p>
        </Panel>
      )}

      {pat.bs_ocr_brut && (
        <Panel>
          <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>
            <i className="ti ti-clipboard-text" style={{ color: "#7a6fb0", marginRight: 6 }} /> Texte OCR brut
          </h3>
          <details>
            <summary style={{ fontSize: 11.5, color: "#6c7a89", cursor: "pointer" }}>Voir ({pat.bs_ocr_brut.length} caractères)</summary>
            <pre style={{ background: "#142131", color: "#e8edf2", padding: 10, borderRadius: 6, fontSize: 11, overflowX: "auto", marginTop: 6, maxHeight: 200, whiteSpace: "pre-wrap" }}>
              {pat.bs_ocr_brut}
            </pre>
          </details>
        </Panel>
      )}
    </>
  );
}

export default TabAudit;
