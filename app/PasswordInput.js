"use client";
// =============================================================
//  app/PasswordInput.js (Alpha 0.55.12)
//  Input mot de passe avec :
//   - bouton "voir/masquer"
//   - jauge de force visuelle
//   - liste des règles non respectées
//   - bouton "générer un mot de passe sûr"
//
//  Usage :
//    <PasswordInput value={pwd} onChange={setPwd} showStrength />
// =============================================================
import { useState } from "react";
import { checkPassword, strengthColor, generateSecurePassword } from "../lib/passwordPolicy";

export default function PasswordInput({
  value = "",
  onChange,
  placeholder = "••••••••",
  showStrength = true,
  showGenerate = false,
  autoComplete = "new-password",
  required = false,
  id,
  disabled = false,
}) {
  const [visible, setVisible] = useState(false);
  const check = showStrength ? checkPassword(value) : null;

  return (
    <div style={{ width: "100%" }}>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          className="input"
          style={{
            paddingRight: showGenerate ? 78 : 40,
            width: "100%",
            fontFamily: "Consolas, Menlo, monospace",
            letterSpacing: visible ? "normal" : "1px",
          }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          title={visible ? "Masquer" : "Afficher"}
          tabIndex={-1}
          style={{
            position: "absolute",
            right: showGenerate ? 42 : 6,
            top: "50%",
            transform: "translateY(-50%)",
            background: "transparent",
            border: "none",
            color: "#6c7a89",
            cursor: "pointer",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}
        >
          <i className={`ti ${visible ? "ti-eye-off" : "ti-eye"}`} />
        </button>
        {showGenerate && (
          <button
            type="button"
            onClick={() => {
              const g = generateSecurePassword(16);
              onChange?.(g);
              setVisible(true);
            }}
            title="Générer un mot de passe sûr (16 caractères)"
            tabIndex={-1}
            style={{
              position: "absolute",
              right: 6,
              top: "50%",
              transform: "translateY(-50%)",
              background: "#142131",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            <i className="ti ti-dice" />
          </button>
        )}
      </div>

      {showStrength && value && (
        <>
          {/* Jauge */}
          <div style={{
            marginTop: 6,
            height: 6,
            background: "#e3e9ee",
            borderRadius: 3,
            overflow: "hidden",
            display: "flex",
            gap: 2,
          }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  background: i <= check.score ? strengthColor(check.score) : "transparent",
                  transition: "background .25s",
                }}
              />
            ))}
          </div>
          <div style={{
            marginTop: 4,
            fontSize: 11,
            color: strengthColor(check.score),
            fontWeight: 600,
            display: "flex",
            justifyContent: "space-between",
          }}>
            <span>Force : {check.strength}</span>
            {check.ok && (
              <span style={{ color: "#2e6f33" }}>
                <i className="ti ti-check" /> Conforme
              </span>
            )}
          </div>

          {/* Liste des règles non respectées */}
          {check.problems.length > 0 && (
            <ul style={{
              margin: "6px 0 0",
              padding: "8px 12px",
              listStyle: "none",
              background: "#fff8ec",
              border: "1px solid #f0d59f",
              borderRadius: 6,
              fontSize: 11.5,
              color: "#7a4f15",
            }}>
              {check.problems.map((p, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 6, margin: "2px 0" }}>
                  <i className="ti ti-alert-circle" /> {p}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
