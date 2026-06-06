"use client";
// =============================================================
//  /diagnostic — Page de diagnostic pour identifier la version déployée
//  0.58.96 : créée pour aider Cédric à voir ce qui tourne réellement
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import pkg from "../../package.json";

export default function DiagnosticPage() {
  const supabase = createClient();
  const auth = useAuth();
  const [tests, setTests] = useState({});
  const [running, setRunning] = useState(false);

  async function runTests() {
    if (!auth.ready) return;
    setRunning(true);
    const r = {};

    // 1. SW version
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        r.sw = "✓ Service Worker actif";
      } else {
        r.sw = "⚠ Pas de Service Worker actif";
      }
    } catch { r.sw = "❌ Erreur SW"; }

    // 2. Auth
    r.auth = {
      ready: auth.ready,
      user: auth.user?.email || "?",
      structureId: auth.structureId || "(null)",
      etabId: auth.etabId || "(null)",
    };

    // 3. Tables existence
    const tablesToTest = [
      "patients", "materiels", "articles", "depots", "transferts",
      "vehicules", "cuves_oxygene", "cuves_remplissages",
      "interventions", "etablissements", "batiments", "services", "chambres",
    ];

    for (const t of tablesToTest) {
      try {
        const res = await supabase.from(t).select("*", { count: "exact", head: true }).limit(1);
        if (res.error) {
          if (res.error.code === "42P01") {
            r[`table_${t}`] = { ok: false, msg: "❌ TABLE ABSENTE", detail: "Migration SQL non appliquée" };
          } else {
            r[`table_${t}`] = { ok: false, msg: `⚠ ${res.error.code || "?"}`, detail: res.error.message };
          }
        } else {
          r[`table_${t}`] = { ok: true, msg: `✓ ${res.count ?? "?"} lignes` };
        }
      } catch (e) {
        r[`table_${t}`] = { ok: false, msg: "❌ Exception", detail: e.message };
      }
    }

    // 4. Patient INSERT test (dry run)
    try {
      const test = {
        structure_id: auth.structureId,
        nom: "TEST_DIAGNOSTIC_" + Date.now(),
      };
      const ins = await supabase.from("patients").insert(test).select("id").single();
      if (ins.error) {
        r.patient_insert = { ok: false, msg: `❌ ${ins.error.code}`, detail: ins.error.message };
      } else {
        // Supprimer immédiatement
        await supabase.from("patients").delete().eq("id", ins.data.id);
        r.patient_insert = { ok: true, msg: "✓ INSERT minimal OK (test puis delete)" };
      }
    } catch (e) {
      r.patient_insert = { ok: false, msg: "❌ Exception", detail: e.message };
    }

    setTests(r);
    setRunning(false);
  }

  useEffect(() => {
    if (auth.ready) runTests();
  }, [auth.ready]);

  function clearCacheAndReload() {
    if (!confirm("Vider le cache navigateur et recharger ?")) return;
    try {
      if ("caches" in window) {
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
      }
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
      }
      // Vide localStorage sauf token auth
      const auth_token = Object.keys(localStorage).filter(k => k.startsWith("sb-"));
      const tokens = {};
      auth_token.forEach(k => tokens[k] = localStorage.getItem(k));
      localStorage.clear();
      Object.entries(tokens).forEach(([k, v]) => localStorage.setItem(k, v));
      setTimeout(() => window.location.reload(true), 500);
    } catch (e) { alert("Erreur : " + e.message); }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#142131", color: "#fff",
      padding: 30, fontFamily: "Quicksand, sans-serif", fontSize: 13,
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, marginBottom: 10 }}><i className="ti ti-stethoscope" /> Diagnostic Aveho EC</h1>

        {/* Version */}
        <div style={{ background: "linear-gradient(135deg, #7CC8C8, #5db5b5)", color: "#142131", padding: 20, borderRadius: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>Version installée</div>
          <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "Consolas, monospace" }}>{pkg.version}</div>
          <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>
            Si cette version diffère de ce que j'ai livré (0.58.96), le déploiement Vercel n'est pas à jour.
          </div>
        </div>

        {/* Bouton actions */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <button onClick={runTests} disabled={running} style={btnStyle("#7CC8C8")}>
            <i className="ti ti-refresh" /> {running ? "Tests en cours..." : "Relancer les tests"}
          </button>
          <button onClick={clearCacheAndReload} style={btnStyle("#EF9F27")}>
            <i className="ti ti-eraser" /> Vider cache + recharger
          </button>
          <button onClick={() => window.location.reload(true)} style={btnStyle("#185FA5")}>
            <i className="ti ti-reload" /> Hard refresh
          </button>
        </div>

        {/* Auth */}
        <Section title="🔐 Authentification" color="#7a6fb0">
          <pre style={preStyle}>{JSON.stringify(tests.auth || {}, null, 2)}</pre>
        </Section>

        {/* Service Worker */}
        <Section title="🔧 Service Worker" color="#5aa05a">
          <div style={{ fontFamily: "Consolas, monospace" }}>{tests.sw || "..."}</div>
        </Section>

        {/* Tables */}
        <Section title="🗄 Tables Supabase" color="#185FA5">
          {Object.keys(tests).filter(k => k.startsWith("table_")).map(k => {
            const t = tests[k];
            const name = k.replace("table_", "");
            return (
              <div key={k} style={{
                display: "flex", gap: 10, padding: "6px 10px",
                background: t.ok ? "rgba(90,160,90,.08)" : "rgba(227,93,91,.08)",
                borderLeft: `3px solid ${t.ok ? "#5aa05a" : "#e35d5b"}`,
                borderRadius: 6, marginBottom: 4, fontFamily: "Consolas, monospace",
              }}>
                <span style={{ minWidth: 200, fontWeight: 600 }}>{name}</span>
                <span style={{ minWidth: 140 }}>{t.msg}</span>
                {t.detail && <span style={{ opacity: 0.6, fontSize: 11 }}>{t.detail}</span>}
              </div>
            );
          })}
        </Section>

        {/* Patient insert test */}
        {tests.patient_insert && (
          <Section title="🧪 Test création patient" color="#e35d5b">
            <div style={{ fontFamily: "Consolas, monospace" }}>
              {tests.patient_insert.msg}
              {tests.patient_insert.detail && (
                <div style={{ marginTop: 6, opacity: 0.7, fontSize: 12 }}>{tests.patient_insert.detail}</div>
              )}
            </div>
          </Section>
        )}

        {/* Instructions */}
        <Section title="📋 Instructions" color="#EF9F27">
          <ol style={{ paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Si la version ci-dessus n'est pas <code style={{ background: "#050a14", padding: "2px 6px", borderRadius: 4 }}>{pkg.version}</code> → ton dernier push n'est pas déployé sur Vercel. Va sur dashboard Vercel → Deployments et vérifie</li>
            <li>Si des tables sont en rouge "TABLE ABSENTE" → applique le SQL correspondant dans Supabase SQL Editor</li>
            <li>Si le test patient échoue avec un code Postgres → copie le détail et envoie-moi</li>
            <li>Bouton <b>"Vider cache + recharger"</b> peut résoudre les bugs de cache sans déconnexion</li>
          </ol>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, color, children }) {
  return (
    <div style={{
      background: "rgba(255,255,255,.04)",
      border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`,
      borderRadius: 12, padding: 16, marginBottom: 14,
    }}>
      <h3 style={{ margin: "0 0 12px", color, fontSize: 14, fontWeight: 700 }}>{title}</h3>
      {children}
    </div>
  );
}

function btnStyle(color) {
  return {
    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
    color: "#fff", border: "none",
    padding: "10px 16px", borderRadius: 10,
    fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer",
  };
}

const preStyle = {
  background: "#050a14", color: "#bfe6e6",
  padding: 12, borderRadius: 8, fontSize: 12,
  fontFamily: "Consolas, monospace", overflow: "auto",
  margin: 0,
};
