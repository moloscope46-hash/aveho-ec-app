"use client";
// =============================================================
//  app/components/ColorPicker.js (0.58.52)
//
//  Sélecteur de couleur avec palette par défaut + input color custom.
//  Utilisé pour les tags matériel, étiquettes patient, annonces, objectifs.
//
//  Props:
//   - value: string (hex, ex: "#7CC8C8")
//   - onChange: (newColor: string) => void
//   - palette: string[] (couleurs proposées, défaut = palette Aveho)
//   - showCustom: bool (défaut: true) — affiche l'input color HTML5
// =============================================================

import { useState, useRef } from "react";

// Palette par défaut (charte Aveho + couleurs étendues)
export const DEFAULT_PALETTE = [
  "#7CC8C8",  // teal Aveho
  "#185FA5",  // blue Aveho
  "#142131",  // navy Aveho
  "#C9867F",  // terra Aveho
  "#EF9F27",  // amber Aveho
  "#5aa05a",  // vert
  "#7a6fb0",  // violet
  "#e35d5b",  // coral
  "#c0392b",  // rouge profond
  "#2a5a5a",  // teal foncé
  "#f0d59f",  // pastel jaune
  "#bfd6f0",  // pastel bleu
];

// Validation hex (#XXX ou #XXXXXX)
function isValidHex(color) {
  return /^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(color || "");
}

export default function ColorPicker({
  value,
  onChange,
  palette = DEFAULT_PALETTE,
  showCustom = true,
}) {
  const inputRef = useRef(null);
  const [hexInput, setHexInput] = useState(value || "#7CC8C8");

  // Quand value externe change, sync l'input hex
  function handleNativeColorChange(e) {
    const color = e.target.value;
    setHexInput(color);
    onChange(color);
  }

  function handleHexInputChange(e) {
    const raw = e.target.value;
    setHexInput(raw);
    // Si format valide, on propage
    if (isValidHex(raw)) {
      onChange(raw);
    }
  }

  function handleHexInputBlur() {
    // Si format invalide au blur, on remet la valeur courante
    if (!isValidHex(hexInput)) {
      setHexInput(value || "#7CC8C8");
    }
  }

  const isInPalette = palette.includes(value);

  return (
    <div>
      {/* Palette de couleurs prédéfinies */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: showCustom ? 12 : 0 }}>
        {palette.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              onChange(c);
              setHexInput(c);
            }}
            style={{
              width: 36, height: 36, borderRadius: 10, background: c, cursor: "pointer",
              border: value === c ? "3px solid #142131" : "2px solid transparent",
              transform: value === c ? "scale(1.1)" : "scale(1)",
              transition: "all 120ms",
              boxShadow: value === c ? "0 4px 12px " + c + "55" : "none",
            }}
            title={c}
            aria-label={`Couleur ${c}`}
          />
        ))}
      </div>

      {/* Section custom : input color HTML5 + hex */}
      {showCustom && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 12px",
          background: !isInPalette && isValidHex(value) ? value + "10" : "#f8fafc",
          border: !isInPalette && isValidHex(value) ? `2px solid ${value}` : "1px solid #e3e9ee",
          borderRadius: 10,
        }}>
          {/* Native color picker */}
          <label style={{
            cursor: "pointer",
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            color: "#185FA5",
          }}>
            <input
              ref={inputRef}
              type="color"
              value={isValidHex(value) ? value : "#7CC8C8"}
              onChange={handleNativeColorChange}
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: "1px solid #cfd5db",
                cursor: "pointer",
                padding: 0,
                background: "transparent",
              }}
              aria-label="Choisir une couleur custom"
            />
            <i className="ti ti-palette" /> Custom
          </label>

          {/* Input hex texte */}
          <input
            type="text"
            value={hexInput}
            onChange={handleHexInputChange}
            onBlur={handleHexInputBlur}
            placeholder="#7CC8C8"
            maxLength={7}
            style={{
              flex: 1,
              padding: "6px 10px",
              border: "1px solid #e3e9ee",
              borderRadius: 6,
              fontFamily: "Consolas, Menlo, monospace",
              fontSize: 12.5,
              textTransform: "uppercase",
              outline: "none",
              background: "#fff",
            }}
            aria-label="Code hexadécimal de la couleur"
          />

          {/* Preview pastille */}
          {isValidHex(value) && (
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: value,
              border: "1px solid #cfd5db",
              flexShrink: 0,
            }} title={value} />
          )}
        </div>
      )}

      {/* Indicateur visuel : custom sélectionné */}
      {!isInPalette && isValidHex(value) && (
        <div style={{
          marginTop: 6,
          fontSize: 10.5,
          color: "#8a98a8",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}>
          <i className="ti ti-sparkles" style={{ color: value }} /> Couleur custom
        </div>
      )}
    </div>
  );
}
