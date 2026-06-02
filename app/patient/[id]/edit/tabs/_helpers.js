"use client";
// app/patient/[id]/edit/tabs/_helpers.js — extrait depuis page.js en 0.57.1
// Petits composants partagés par les Tab*

import React from "react";

export function Lbl({ children }) {
  return <div style={{ fontSize: 10.5, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700, marginBottom: 4 }}>{children}</div>;
}

export function Field({ label, value, onChange, type = "text", placeholder, required, mono, compact }) {
  return (
    <div>
      <Lbl>{label}{required && <span style={{ color: "#c0392b" }}> *</span>}</Lbl>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: compact ? "6px 8px" : "8px 10px",
          border: "1px solid #d3d9e0", borderRadius: 6,
          fontSize: compact ? 12 : 13, fontFamily: mono ? "Consolas, monospace" : "inherit",
          background: "#fff",
        }}
      />
    </div>
  );
}

export function FieldSelect({ label, value, onChange, options }) {
  return (
    <div>
      <Lbl>{label}</Lbl>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box", padding: "7px 10px", border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 13, fontFamily: "inherit", background: "#fff" }}
      >
        {options.map(o => <option key={o.v} value={o.v}>{o.lbl}</option>)}
      </select>
    </div>
  );
}

// 0.57.1 : FieldCheckbox ajouté (utilisé par TabSecu, n'existait pas avant)
export function FieldCheckbox({ label, value, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export function Toggle({ label, value, onChange, color }) {
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 10px",
      background: value ? `${color}15` : "#f4f7fa",
      border: `1px solid ${value ? color + "40" : "#e3e9ee"}`,
      borderRadius: 6, cursor: "pointer",
      transition: "all .15s",
    }}>
      <input type="checkbox" checked={value || false} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: color }} />
      <span style={{ fontSize: 12.5, fontWeight: 600, color: value ? color : "#6c7a89" }}>{label}</span>
    </label>
  );
}

export function KvBlock({ label, value }) {
  return (
    <div style={{ background: "#f4f7fa", borderRadius: 6, padding: "8px 10px" }}>
      <div style={{ fontSize: 10, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: "#142131" }}>{value}</div>
    </div>
  );
}
