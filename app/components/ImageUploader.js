"use client";
// =============================================================
//  components/ImageUploader.js (0.62.84)
//
//  Upload d'image vers Supabase Storage avec preview.
//  À utiliser dans tous les formulaires de création/édition :
//  articles, matériels, patients, fournisseurs, partenaires, etc.
//
//  Usage :
//    <ImageUploader
//      value={form.photo_url}
//      onChange={(url) => setForm({ ...form, photo_url: url })}
//      bucket="articles-photos"
//      folder={article.id}
//      label="Photo de l'article"
//    />
// =============================================================
import { useState, useRef } from "react";
import { createClient } from "../../lib/supabase";

export default function ImageUploader({
  value,
  onChange,
  bucket = "articles-photos",
  folder = "general",
  label = "Photo",
  maxSizeMB = 5,
  compact = false,
}) {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    if (!file.type.startsWith("image/")) {
      setError("Format non supporté (JPG, PNG, WEBP uniquement)");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Image trop grosse (max ${maxSizeMB} Mo)`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const ext = file.name.split(".").pop().toLowerCase();
      const fileName = `${folder}/${Date.now()}.${ext}`;

      const { data, error: upErr } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: "31536000",
          upsert: false,
        });

      if (upErr) throw upErr;

      // URL publique
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      onChange?.(urlData.publicUrl);
    } catch (e) {
      console.error("[ImageUploader] upload error:", e);
      setError(e.message || "Erreur upload");
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleRemove() {
    onChange?.("");
  }

  if (compact) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {value ? (
          <div style={{ position: "relative", width: 48, height: 48, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
            <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <button onClick={handleRemove} style={{
              position: "absolute", top: 2, right: 2, width: 18, height: 18,
              background: "rgba(227,93,91,.95)", color: "#fff", border: "none", borderRadius: 9,
              fontSize: 10, cursor: "pointer", lineHeight: 1,
            }}>✕</button>
          </div>
        ) : (
          <div style={{
            width: 48, height: 48, borderRadius: 8, background: "#f4f7fa",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px dashed #c0d0d8", flexShrink: 0,
          }}>
            <i className="ti ti-photo" style={{ color: "#8a98a8", fontSize: 20 }} />
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          style={{ display: "none" }}
          id={`img-upload-${folder}`}
        />
        <label htmlFor={`img-upload-${folder}`} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "8px 12px", borderRadius: 8,
          background: "linear-gradient(135deg, #f4f7fa, #fff)",
          border: "1px solid #e3e9ee", color: "#185FA5",
          fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>
          <i className="ti ti-upload" />
          {uploading ? "..." : value ? "Changer" : "Photo"}
        </label>
        {error && <span style={{ color: "#e35d5b", fontSize: 11 }}>{error}</span>}
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#5a6878", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
        <i className="ti ti-photo" style={{ marginRight: 4 }} /> {label}
      </div>

      {value ? (
        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
          <img src={value} alt={label} style={{
            width: "100%", maxHeight: 220, objectFit: "cover", display: "block",
          }} />
          <button onClick={handleRemove} style={{
            position: "absolute", top: 8, right: 8,
            background: "rgba(20,33,49,.85)", color: "#fff",
            border: "none", borderRadius: 8, padding: "6px 10px",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 4,
            backdropFilter: "blur(6px)",
          }}>
            <i className="ti ti-trash" /> Supprimer
          </button>
        </div>
      ) : (
        <div style={{
          border: "2px dashed #c0d0d8",
          borderRadius: 12, padding: 24,
          textAlign: "center", color: "#8a98a8",
          background: "linear-gradient(135deg, #fafbfc, #fff)",
          marginBottom: 8,
        }}>
          <i className="ti ti-photo-plus" style={{ fontSize: 36, color: "#7CC8C8" }} />
          <div style={{ fontSize: 12, marginTop: 6 }}>Aucune photo</div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleUpload}
        style={{ display: "none" }}
        id={`img-upload-full-${folder}`}
      />
      <label htmlFor={`img-upload-full-${folder}`} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "10px 14px", borderRadius: 10,
        background: uploading ? "#f4f7fa" : "linear-gradient(135deg, #185FA5, #7CC8C8)",
        color: uploading ? "#8a98a8" : "#fff",
        fontSize: 13, fontWeight: 700, cursor: uploading ? "wait" : "pointer",
        border: "none", fontFamily: "inherit",
      }}>
        <i className={`ti ti-${uploading ? "loader-2" : "upload"}`} style={{ animation: uploading ? "spin 1s linear infinite" : "" }} />
        {uploading ? "Upload en cours..." : value ? "Changer la photo" : "Ajouter une photo"}
      </label>

      {error && (
        <div style={{ marginTop: 6, padding: "6px 10px", background: "#fff3f3", color: "#c0392b", borderRadius: 6, fontSize: 11 }}>
          <i className="ti ti-alert-triangle" /> {error}
        </div>
      )}
      <div style={{ fontSize: 10.5, color: "#8a98a8", marginTop: 4 }}>
        JPG, PNG ou WEBP · max {maxSizeMB} Mo
      </div>
    </div>
  );
}
