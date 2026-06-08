"use client";
// =============================================================
//  components/VoiceDictation.js (0.63.0)
//
//  Bouton micro pour dictée vocale dans n'importe quel champ texte
//  ou textarea. Utilise l'API Web Speech (gratuit, navigateur).
//
//  Usage 1 (intégré dans input/textarea) :
//    <VoiceDictation
//      onTranscript={(text) => setForm({ ...form, description: form.description + " " + text })}
//      lang="fr-FR"
//    />
//
//  Usage 2 (avec wrapper qui inclut le champ) :
//    <VoiceDictationField
//      value={form.description}
//      onChange={(v) => setForm({...form, description: v})}
//      placeholder="..."
//      rows={4}
//    />
// =============================================================

import { useEffect, useRef, useState } from "react";

const SUPPORTED = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

export default function VoiceDictation({
  onTranscript,
  lang = "fr-FR",
  size = "sm",  // "sm" | "md" | "lg"
  showLabel = false,
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSupported(!!SUPPORTED);
  }, []);

  function start() {
    if (!SUPPORTED) {
      alert("La saisie vocale n'est pas supportée par ce navigateur. Utilisez Chrome, Edge ou Safari récent.");
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let finalTranscript = "";
    rec.onresult = (event) => {
      let interimT = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
          onTranscript?.(transcript.trim());
        } else {
          interimT += transcript;
        }
      }
      setInterim(interimT);
    };

    rec.onerror = (e) => {
      console.warn("[Voice] error:", e.error);
      if (e.error === "not-allowed") {
        alert("L'accès au micro a été refusé. Autorisez le micro dans les paramètres du navigateur.");
      }
      setListening(false);
      setInterim("");
    };

    rec.onend = () => {
      setListening(false);
      setInterim("");
    };

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  function stop() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setListening(false);
    setInterim("");
  }

  if (!supported) {
    return (
      <button type="button"
        title="Saisie vocale non supportée par ce navigateur"
        disabled
        style={{
          background: "transparent",
          border: "1px dashed #cfd8e0",
          color: "#cfd8e0",
          borderRadius: 6,
          padding: size === "sm" ? "3px 7px" : "5px 10px",
          cursor: "not-allowed",
          fontSize: size === "sm" ? 10 : 11,
          fontFamily: "inherit",
        }}>
        <i className="ti ti-microphone-off" />
        {showLabel && " Non supporté"}
      </button>
    );
  }

  const dim = size === "sm" ? 28 : size === "md" ? 36 : 44;
  const iconSize = size === "sm" ? 13 : size === "md" ? 17 : 22;

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 4 }}>
      <button
        type="button"
        onClick={listening ? stop : start}
        title={listening ? "Arrêter la dictée" : "Démarrer la dictée vocale"}
        style={{
          width: dim, height: dim,
          background: listening
            ? "linear-gradient(135deg, #e35d5b, #c0392b)"
            : "linear-gradient(135deg, #7CC8C8, #5a9999)",
          color: "#fff",
          border: "none",
          borderRadius: "50%",
          cursor: "pointer",
          fontSize: iconSize,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "inherit",
          boxShadow: listening
            ? "0 0 0 0 rgba(227, 93, 91, .7)"
            : "0 2px 6px rgba(124, 200, 200, .35)",
          animation: listening ? "av-mic-pulse 1.5s ease-in-out infinite" : "none",
          flexShrink: 0,
          transition: "all 200ms",
        }}>
        <i className={`ti ${listening ? "ti-microphone-2" : "ti-microphone"}`} />
      </button>
      {showLabel && (
        <span style={{ fontSize: 11, color: listening ? "#e35d5b" : "#5a6878", fontWeight: 700 }}>
          {listening ? "Écoute…" : "Dicter"}
        </span>
      )}
      {interim && (
        <span style={{
          position: "absolute",
          bottom: -28,
          left: 0,
          background: "rgba(20, 33, 49, .92)",
          color: "#fff",
          fontSize: 10.5,
          padding: "3px 8px",
          borderRadius: 6,
          whiteSpace: "nowrap",
          maxWidth: 280,
          overflow: "hidden",
          textOverflow: "ellipsis",
          fontStyle: "italic",
          zIndex: 100,
        }}>
          🎙 {interim.substring(0, 40)}…
        </span>
      )}
      <style jsx global>{`
        @keyframes av-mic-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(227, 93, 91, .7); }
          50%      { box-shadow: 0 0 0 12px rgba(227, 93, 91, 0); }
        }
      `}</style>
    </span>
  );
}

// =============================================================
//  VoiceDictationField : wrapper pratique avec textarea intégré
// =============================================================
export function VoiceDictationField({
  value = "",
  onChange,
  placeholder = "Tapez ou dictez...",
  rows = 3,
  lang = "fr-FR",
  style,
}) {
  const handleTranscript = (text) => {
    const sep = value && !value.endsWith(" ") && !value.endsWith("\n") ? " " : "";
    onChange?.(value + sep + text);
  };

  return (
    <div style={{ position: "relative", ...style }}>
      <textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: "100%",
          padding: "8px 44px 8px 12px",
          border: "1.5px solid #e3e9ee",
          borderRadius: 8,
          fontSize: 13,
          fontFamily: "inherit",
          resize: "vertical",
          minHeight: 60,
        }}
      />
      <div style={{ position: "absolute", bottom: 8, right: 6 }}>
        <VoiceDictation onTranscript={handleTranscript} lang={lang} size="sm" />
      </div>
    </div>
  );
}
