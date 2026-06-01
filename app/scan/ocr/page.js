"use client";
// =============================================================
//  app/scan/ocr/page.js (Alpha 0.55.51)
//
//  OCR générique : upload n'importe quel document → Claude Vision
//  retourne le texte brut. Pas de schéma forcé comme le bulletin de
//  situation — utile pour des prescriptions, factures, courriers…
// =============================================================

import { useState, useRef } from "react";
import { useAuth } from "../../../lib/useAuth";
import { createClient } from "../../../lib/supabase";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, StateMsg } from "../../ui";

export default function ScanOcrPage() {
  const auth = useAuth();
  const cart = useCart();
  const supabase = createClient();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [duration, setDuration] = useState(null);

  function handleFile(f) {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { setError("Fichier > 8 Mo"); return; }
    setError(null);
    setFile(f);
    setText("");
    const r = new FileReader();
    r.onload = (e) => setFilePreview(e.target.result);
    r.readAsDataURL(f);
  }

  async function runOcr() {
    if (!file) return;
    setLoading(true); setError(null); setText("");
    const t0 = Date.now();
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = () => rej(new Error("Lecture fichier impossible"));
        r.readAsDataURL(file);
      });
      // 0.56.20 : token Bearer pour passer requireAuth
      const token = (await supabase.auth.getSession()).data?.session?.access_token;
      const res = await fetch("/api/ocr/generic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ image_base64: base64, media_type: file.type }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Erreur OCR");
      } else {
        setText(data.text || "");
        setDuration(data.duration_ms);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(text);
  }

  if (!auth.ready) return null;
  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="OUTILS SCAN · OCR GÉNÉRIQUE"
          icon="ti-text-recognition"
          title="OCR libre"
          accent="(prescription, facture, courrier…)"
          sub="Téléverse un document → Claude Vision retourne le texte brut, copiable"
        />

        {error && <StateMsg type="error" icon="ti-alert-circle">{error}</StateMsg>}

        <Panel style={{ background: "linear-gradient(135deg, #fff8ec 0%, #fff 100%)", borderColor: "#f0d59f" }}>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); }}
            onDragOver={(e) => e.preventDefault()}
            style={{
              border: "2px dashed #f0d59f", borderRadius: 12, padding: 20,
              textAlign: "center", cursor: "pointer",
              background: filePreview ? "#fff" : "#fffaf0",
            }}
          >
            {filePreview ? (
              file?.type === "application/pdf"
                ? <div style={{ fontSize: 60 }}>📄</div>
                : <img src={filePreview} style={{ maxWidth: "100%", maxHeight: 280, borderRadius: 8 }} alt="" />
            ) : (
              <>
                <div style={{ fontSize: 40 }}>📄</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#7a4f15", marginTop: 6 }}>Glisse ou clique pour parcourir</div>
                <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 4 }}>JPG, PNG, WEBP, PDF · Max 8 Mo</div>
              </>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" onChange={(e) => handleFile(e.target.files?.[0])} style={{ display: "none" }} />
          </div>

          {file && !text && (
            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={runOcr} disabled={loading} style={{
                background: "linear-gradient(135deg, #EF9F27, #c97a2a)", color: "#fff", border: "none",
                padding: "9px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                cursor: loading ? "wait" : "pointer", fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
                {loading ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> : <i className="ti ti-wand" />}
                {loading ? "OCR…" : "Extraire le texte"}
              </button>
            </div>
          )}
        </Panel>

        {text && (
          <Panel style={{ marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: 14, flex: 1 }}>
                <i className="ti ti-text-recognition" style={{ color: "#EF9F27" }} /> Texte extrait
                <span style={{ marginLeft: 8, fontSize: 11, color: "#7a4f15", background: "#fff8ec", padding: "2px 8px", borderRadius: 6 }}>{text.length} chars · {duration}ms</span>
              </h3>
              <button onClick={copy} style={{ background: "#185FA5", color: "#fff", border: "none", padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <i className="ti ti-copy" /> Copier
              </button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                minHeight: 240, padding: 12,
                border: "1px solid #d3d9e0", borderRadius: 8,
                fontSize: 12.5, fontFamily: "Consolas, Menlo, monospace",
                background: "#fff", lineHeight: 1.5,
              }}
            />
          </Panel>
        )}
      </div>
    </div>
  );
}
