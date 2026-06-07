"use client";
// =============================================================
//  components/LogoUploader.js (0.62.67)
//
//  Upload de logo réutilisable pour : structures, etablissements, services
//
//  Usage :
//    <LogoUploader
//      value={logoUrl}
//      onChange={(url) => setLogoUrl(url)}
//      bucket="logos"
//      pathPrefix={`structures/${structureId}`}
//      label="Logo de la structure"
//    />
// =============================================================
import { useState, useRef } from "react";
import { createClient } from "../../lib/supabase";

export default function LogoUploader({
  value,
  onChange,
  bucket = "sav-photos",      // bucket par défaut (réutilise l'existant)
  pathPrefix = "logos",
  label = "Logo",
  size = 90,
  accept = "image/*",
}) {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(value || "");
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Logo trop volumineux (max 2 MB). Compresse l'image.");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${pathPrefix}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      setPreview(data.publicUrl);
      onChange?.(data.publicUrl);
    } catch (e) {
      alert("Erreur upload logo : " + e.message);
    }
    setBusy(false);
  }

  function clearLogo() {
    if (!confirm("Supprimer le logo ?")) return;
    setPreview("");
    onChange?.(null);
  }

  return (
    <div>
      {label && (
        <div style={{ fontSize: 11, fontWeight: 600, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>
          {label}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {/* Preview ou placeholder */}
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            width: size, height: size,
            borderRadius: 12,
            background: preview ? "#fff" : "#f4f7fa",
            border: `2px dashed ${preview ? "transparent" : "#c0d0d8"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            overflow: "hidden",
            transition: "all 200ms",
            position: "relative",
          }}
          onMouseEnter={(e) => { if (preview) e.currentTarget.style.transform = "scale(1.02)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          {preview ? (
            <img src={preview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <div style={{ textAlign: "center", color: "#8a98a8" }}>
              <i className="ti ti-photo-plus" style={{ fontSize: 26 }} />
              <div style={{ fontSize: 10, marginTop: 4 }}>Cliquer pour ajouter</div>
            </div>
          )}
          {busy && (
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(255,255,255,.85)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <i className="ti ti-loader-2" style={{ fontSize: 24, animation: "av-spin 1s linear infinite", color: "#185FA5" }} />
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            style={{
              padding: "7px 14px",
              background: "linear-gradient(135deg, #185FA5, #134e87)",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 5,
            }}
          >
            <i className="ti ti-upload" /> {preview ? "Changer" : "Téléverser"}
          </button>
          {preview && (
            <button
              type="button"
              onClick={clearLogo}
              disabled={busy}
              style={{
                padding: "5px 10px",
                background: "rgba(227,93,91,.1)",
                color: "#e35d5b", border: "1px solid rgba(227,93,91,.3)", borderRadius: 6,
                fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <i className="ti ti-trash" /> Supprimer
            </button>
          )}
          <div style={{ fontSize: 10.5, color: "#8a98a8" }}>
            PNG/JPG · max 2 MB · idéal carré 200×200
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => handleFile(e.target.files?.[0])}
        style={{ display: "none" }}
      />
    </div>
  );
}
