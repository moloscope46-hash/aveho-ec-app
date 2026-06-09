"use client";
// =============================================================
//  components/AttachmentsPanel.js (0.63.0)
//
//  Panel générique pour gérer les pièces jointes liées à n'importe
//  quelle ressource (DI, signalement, bilan SAV, achat, etc.)
//
//  Stockage Supabase Storage bucket "attachments".
//  Table "pieces_jointes" : resource_type, resource_id, nom, url, taille, mime, created_by.
//
//  Usage :
//    <AttachmentsPanel
//      resourceType="intervention"
//      resourceId={di.id}
//      structureId={auth.structureId}
//      readOnly={false}
//    />
// =============================================================

import { useEffect, useState, useRef } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";

const MAX_SIZE_MB = 10;
const MAX_SIZE = MAX_SIZE_MB * 1024 * 1024;
const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx";

export default function AttachmentsPanel({
  resourceType,
  resourceId,
  structureId,
  readOnly = false,
  compact = false,
}) {
  const supabase = createClient();
  const auth = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  async function load() {
    if (!resourceId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pieces_jointes")
        .select("*")
        .eq("resource_type", resourceType)
        .eq("resource_id", resourceId)
        .order("created_at", { ascending: false });
      if (!error) setItems(data || []);
    } catch {
      setItems([]);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [resourceType, resourceId]);

  async function upload(files) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setProgress(0);
    let success = 0, failed = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > MAX_SIZE) {
        alert(`"${file.name}" dépasse ${MAX_SIZE_MB} Mo`);
        failed++;
        continue;
      }
      try {
        const ext = file.name.split(".").pop().toLowerCase();
        const filename = `${resourceType}/${resourceId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("attachments").upload(filename, file);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("attachments").getPublicUrl(filename);
        const { error: dbErr } = await supabase.from("pieces_jointes").insert({
          structure_id: structureId,
          resource_type: resourceType,
          resource_id: resourceId,
          nom: file.name,
          path: filename,
          url: pub.publicUrl,
          taille: file.size,
          mime: file.type,
          created_by: auth?.user?.id || null,
        });
        if (dbErr) throw dbErr;
        success++;
      } catch (e) {
        console.warn("[Attachments] upload failed:", e);
        failed++;
      }
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }
    setUploading(false);
    if (success > 0) {
      try {
        const { toast } = await import("./ui-premium");
        toast?.success?.(`${success} pièce${success > 1 ? "s" : ""} jointe${success > 1 ? "s" : ""} ajoutée${success > 1 ? "s" : ""}${failed > 0 ? ` (${failed} échec${failed > 1 ? "s" : ""})` : ""}`);
      } catch {}
    }
    await load();
  }

  async function remove(item) {
    if (!confirm(`Supprimer "${item.nom}" ?`)) return;
    try {
      await supabase.storage.from("attachments").remove([item.path]);
      await supabase.from("pieces_jointes").delete().eq("id", item.id);
      try {
        const { toast } = await import("./ui-premium");
        toast?.success?.("Pièce jointe supprimée");
      } catch {}
      await load();
    } catch (e) {
      alert("Erreur : " + e.message);
    }
  }

  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + " o";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " Ko";
    return (bytes / 1024 / 1024).toFixed(1) + " Mo";
  }

  function getIcon(mime) {
    if (!mime) return "ti-file";
    if (mime.startsWith("image/")) return "ti-photo";
    if (mime === "application/pdf") return "ti-file-type-pdf";
    if (mime.includes("word")) return "ti-file-type-doc";
    if (mime.includes("sheet") || mime.includes("excel")) return "ti-file-type-xls";
    return "ti-file";
  }

  function isImage(mime) {
    return mime && mime.startsWith("image/");
  }

  return (
    <div style={{ marginTop: compact ? 8 : 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <i className="ti ti-paperclip" style={{ color: "#185FA5", fontSize: 16 }} />
        <h4 style={{ margin: 0, fontSize: 13, color: "#142131", fontWeight: 700 }}>
          Pièces jointes {items.length > 0 && <span style={{ color: "#8a98a8", fontWeight: 500 }}>({items.length})</span>}
        </h4>
        {!readOnly && resourceId && (
          <>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept={ACCEPTED}
              onChange={(e) => upload(Array.from(e.target.files))}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                marginLeft: "auto",
                padding: "4px 10px",
                background: uploading ? "#cfd8e0" : "linear-gradient(135deg, #185FA5, #7CC8C8)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: uploading ? "wait" : "pointer",
                fontFamily: "inherit",
                fontSize: 11,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}>
              <i className="ti ti-plus" /> {uploading ? `${progress}%` : "Ajouter"}
            </button>
          </>
        )}
      </div>

      {!resourceId && (
        <div style={{ padding: 10, background: "#fafbfc", borderRadius: 8, fontSize: 11, color: "#8a98a8", fontStyle: "italic" }}>
          <i className="ti ti-info-circle" /> Enregistrez d'abord pour pouvoir ajouter des pièces jointes.
        </div>
      )}

      {resourceId && loading && (
        <div style={{ padding: 12, textAlign: "center", color: "#8a98a8", fontSize: 12 }}>
          <i className="ti ti-loader-2" style={{ animation: "av-spinner-spin 0.85s linear infinite" }} /> Chargement…
        </div>
      )}

      {resourceId && !loading && items.length === 0 && (
        <div style={{ padding: 16, textAlign: "center", color: "#8a98a8", fontSize: 11, background: "#fafbfc", borderRadius: 8, border: "1.5px dashed #cfd8e0" }}>
          <i className="ti ti-paperclip-off" style={{ fontSize: 20, display: "block", marginBottom: 4 }} />
          Aucune pièce jointe
        </div>
      )}

      {items.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: compact ? "repeat(auto-fill, minmax(80px, 1fr))" : "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
          {items.map(item => (
            <div key={item.id} style={{
              position: "relative",
              background: "#fff",
              border: "1px solid #e3e9ee",
              borderRadius: 8,
              padding: compact ? 6 : 8,
              transition: "all 200ms",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7CC8C8"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(124,200,200,.2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e3e9ee"; e.currentTarget.style.boxShadow = "none"; }}
            >
              {isImage(item.mime) ? (
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <img src={item.url} alt={item.nom}
                    style={{ width: "100%", height: compact ? 60 : 80, objectFit: "cover", borderRadius: 6, display: "block" }} />
                </a>
              ) : (
                <a href={item.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", height: compact ? 60 : 80, background: "#fafbfc", borderRadius: 6, textDecoration: "none" }}>
                  <i className={`ti ${getIcon(item.mime)}`} style={{ fontSize: compact ? 24 : 36, color: "#185FA5" }} />
                </a>
              )}
              <div style={{ marginTop: 4, fontSize: 10, color: "#142131", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.nom}>
                {item.nom}
              </div>
              <div style={{ fontSize: 9, color: "#8a98a8" }}>{fmtSize(item.taille || 0)}</div>
              {!readOnly && (
                <button onClick={() => remove(item)}
                  title="Supprimer"
                  style={{
                    position: "absolute", top: 4, right: 4,
                    width: 20, height: 20,
                    background: "rgba(227, 93, 91, .9)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "50%",
                    cursor: "pointer",
                    fontSize: 11,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                  <i className="ti ti-x" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
