"use client";
// =============================================================
//  app/admin/rpps-dump/page.js (Alpha 0.55.56)
//
//  Pilotage du Plan B RPPS : voir l'état du dump local + le seeder
//  depuis un CSV. Côté serveur, /api/rpps fallback automatiquement
//  sur ce dump si l'API ANS plante.
// =============================================================

import { useEffect, useRef, useState } from "react";
import { createClient } from "../../../lib/supabase";
import { fetchWithAuth } from "../../../lib/fetchWithAuth";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, StateMsg } from "../../ui";

export default function RppsDumpAdminPage() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Seed state
  const [file, setFile] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, batch: 0, errors: 0 });
  const [seedLog, setSeedLog] = useState([]);
  const [testQuery, setTestQuery] = useState("");
  const [testResult, setTestResult] = useState(null);

  async function loadStatus() {
    setLoadingStatus(true);
    try {
      const res = await fetchWithAuth("/api/rpps/dump-status");
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      setStatus({ ok: false, error: e.message });
    } finally {
      setLoadingStatus(false);
    }
  }

  useEffect(() => {
    if (!auth.ready) return;
    loadStatus();
  }, [auth.ready]);

  function pushLog(line, kind = "info") {
    setSeedLog((logs) => [...logs.slice(-200), { t: new Date(), line, kind }]);
  }

  // Parser CSV simple — adapté au format ANS open data RPPS
  // Format attendu : ; comme séparateur, première ligne = entête, UTF-8 ou ISO-8859-1
  function parseCSVLine(line, sep = ";") {
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; continue; }
      if (c === '"') { inQuotes = !inQuotes; continue; }
      if (c === sep && !inQuotes) { out.push(cur); cur = ""; continue; }
      cur += c;
    }
    out.push(cur);
    return out;
  }

  async function startSeed() {
    if (!file) return;
    if (!confirm("Lancer le seed du dump RPPS ? Cela peut prendre plusieurs minutes selon la taille du fichier.")) return;
    setSeeding(true);
    setSeedLog([]);
    setProgress({ done: 0, total: 0, batch: 0, errors: 0 });

    try {
      pushLog(`Lecture du fichier ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} Mo)…`);

      // Truncate avant
      pushLog("Vidage de la table rpps_dump existante…");
      const { error: errTrunc } = await supabase.rpc("rpps_dump_truncate");
      if (errTrunc) {
        pushLog(`✗ Truncate échoué : ${errTrunc.message}`, "error");
        setSeeding(false);
        return;
      }

      // Lire le fichier en texte
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) {
        pushLog("✗ Fichier vide ou pas de données", "error");
        setSeeding(false);
        return;
      }

      // Détection du séparateur (priorité ; puis , puis \t)
      const headerLine = lines[0];
      let sep = ";";
      if (!headerLine.includes(";") && headerLine.includes(",")) sep = ",";
      else if (!headerLine.includes(";") && headerLine.includes("\t")) sep = "\t";
      pushLog(`Séparateur détecté : '${sep === "\t" ? "\\t" : sep}'`);

      const headers = parseCSVLine(headerLine, sep).map((h) => h.trim().toLowerCase());
      pushLog(`En-têtes : ${headers.length} colonnes`);

      // Mapping flexible — on cherche les noms probables dans le dump ANS open data
      const findIdx = (...names) => {
        for (const n of names) {
          const i = headers.findIndex((h) => h.includes(n.toLowerCase()));
          if (i !== -1) return i;
        }
        return -1;
      };
      const idx = {
        rpps: findIdx("identification nationale", "identifiant pp", "id personne", "rpps"),
        nom: findIdx("nom d'exercice", "nom"),
        prenom: findIdx("prénom d'exercice", "prenom d'exercice", "prénom", "prenom"),
        civilite: findIdx("libellé civilité", "civilite"),
        profession: findIdx("libellé profession", "profession"),
        specialite: findIdx("libellé savoir-faire", "spécialité", "specialite"),
        raison_sociale: findIdx("raison sociale", "lieu d'exercice"),
        finess: findIdx("finess"),
        adresse: findIdx("numéro voie", "adresse"),
        cp: findIdx("code postal"),
        ville: findIdx("libellé commune", "commune", "ville"),
        insee: findIdx("code commune", "insee"),
        tel: findIdx("téléphone", "telephone"),
        email: findIdx("courriel", "email"),
      };
      pushLog(`Mapping colonnes : ${Object.entries(idx).filter(([_, v]) => v !== -1).map(([k]) => k).join(", ")}`);

      if (idx.rpps === -1 || idx.nom === -1) {
        pushLog("✗ Colonnes RPPS ou Nom introuvables dans le header — vérifie le format du CSV", "error");
        await supabase.rpc("rpps_dump_meta_update", { p_status: "failed", p_message: "Header invalide" });
        setSeeding(false);
        return;
      }

      const total = lines.length - 1;
      setProgress({ done: 0, total, batch: 0, errors: 0 });

      const BATCH_SIZE = 5000;
      let batchRows = [];
      let totalInserted = 0;
      let totalErrors = 0;
      let batchNum = 0;
      const today = new Date().toISOString().slice(0, 10);

      for (let i = 1; i < lines.length; i++) {
        const cells = parseCSVLine(lines[i], sep);
        const rpps = (cells[idx.rpps] || "").trim();
        const nom = (cells[idx.nom] || "").trim();
        if (!rpps || !nom) continue;

        batchRows.push({
          rpps,
          adeli: null,
          civilite: idx.civilite !== -1 ? (cells[idx.civilite] || "").trim() : null,
          nom,
          prenom: idx.prenom !== -1 ? (cells[idx.prenom] || "").trim() : null,
          profession_code: null,
          profession_libelle: idx.profession !== -1 ? (cells[idx.profession] || "").trim() : "Inconnu",
          specialite_code: null,
          specialite_libelle: idx.specialite !== -1 ? (cells[idx.specialite] || "").trim() : null,
          categorie_pro: null,
          mode_exercice: null,
          raison_sociale_lieu: idx.raison_sociale !== -1 ? (cells[idx.raison_sociale] || "").trim() : null,
          finess: idx.finess !== -1 ? (cells[idx.finess] || "").trim() : null,
          adresse: idx.adresse !== -1 ? (cells[idx.adresse] || "").trim() : null,
          complement_adresse: null,
          code_postal: idx.cp !== -1 ? (cells[idx.cp] || "").trim() : null,
          ville: idx.ville !== -1 ? (cells[idx.ville] || "").trim() : null,
          code_insee_commune: idx.insee !== -1 ? (cells[idx.insee] || "").trim() : null,
          telephone: idx.tel !== -1 ? (cells[idx.tel] || "").trim() : null,
          email: idx.email !== -1 ? (cells[idx.email] || "").trim() : null,
          latitude: null,
          longitude: null,
          date_extrait: today,
        });

        if (batchRows.length >= BATCH_SIZE) {
          batchNum++;
          const { data, error } = await supabase.rpc("upsert_rpps_dump_batch", { rows: batchRows });
          if (error) {
            totalErrors++;
            pushLog(`✗ Batch ${batchNum} : ${error.message}`, "error");
          } else {
            totalInserted += data || 0;
          }
          setProgress({ done: i, total, batch: batchNum, errors: totalErrors });
          batchRows = [];
          // Yield au browser pour ne pas freezer l'UI
          await new Promise(r => setTimeout(r, 10));
        }
      }

      // Dernier batch
      if (batchRows.length > 0) {
        batchNum++;
        const { data, error } = await supabase.rpc("upsert_rpps_dump_batch", { rows: batchRows });
        if (error) {
          totalErrors++;
          pushLog(`✗ Batch final ${batchNum} : ${error.message}`, "error");
        } else {
          totalInserted += data || 0;
        }
      }

      setProgress({ done: total, total, batch: batchNum, errors: totalErrors });
      pushLog(`✓ Seed terminé : ${totalInserted.toLocaleString()} lignes insérées en ${batchNum} batchs`, "success");

      await supabase.rpc("rpps_dump_meta_update", {
        p_status: totalErrors === 0 ? "completed" : "failed",
        p_message: `${totalInserted} lignes / ${total} traitées · ${totalErrors} batchs en erreur`,
        p_source_url: file.name,
        p_source_extract_date: today,
      });

      await loadStatus();
    } catch (e) {
      pushLog(`✗ Exception : ${e.message}`, "error");
      await supabase.rpc("rpps_dump_meta_update", { p_status: "failed", p_message: e.message });
    } finally {
      setSeeding(false);
    }
  }

  async function runTest() {
    if (!testQuery) return;
    setTestResult({ loading: true });
    try {
      const res = await fetchWithAuth(`/api/rpps?q=${encodeURIComponent(testQuery)}&limit=10`);
      const data = await res.json();
      setTestResult(data);
    } catch (e) {
      setTestResult({ ok: false, error: e.message });
    }
  }

  if (!auth.ready) return null;

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="ADMIN · RPPS · PLAN B"
          icon="ti-database"
          title="Dump RPPS local"
          accent="(fallback si API ANS KO)"
          sub="Si l'API ANS plante (403, timeout, vide), le code bascule automatiquement sur ce dump local"
        />

        {/* État du dump */}
        <Panel style={{
          marginBottom: 12,
          borderLeft: `4px solid ${
            status?.empty ? "#c0392b"
            : status?.is_fresh ? "#5aa05a"
            : "#EF9F27"
          }`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>
              <i className="ti ti-database" /> État du dump local
            </h3>
            <button onClick={loadStatus} disabled={loadingStatus} style={{
              background: "#185FA5", color: "#fff", border: "none",
              padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700,
              cursor: loadingStatus ? "wait" : "pointer", fontFamily: "inherit",
            }}>
              <i className={`ti ${loadingStatus ? "ti-loader-2" : "ti-refresh"}`} style={{ animation: loadingStatus ? "spin 1s linear infinite" : "none" }} /> Rafraîchir
            </button>
          </div>

          {status && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              <Kv label="Records" value={(status.total_records || 0).toLocaleString()} color={status.empty ? "#c0392b" : "#5aa05a"} mono />
              <Kv label="Source extract" value={status.source_extract_date || "—"} />
              <Kv label="Dernier seed" value={status.last_seed_at ? new Date(status.last_seed_at).toLocaleString() : "—"} />
              <Kv label="Âge (jours)" value={status.age_jours !== null && status.age_jours !== undefined ? `${status.age_jours} j` : "—"} color={status.is_fresh ? "#5aa05a" : "#EF9F27"} mono />
              <Kv label="Statut" value={status.seed_status || "idle"} mono />
            </div>
          )}
          {status?.seed_message && (
            <div style={{ marginTop: 8, fontSize: 11.5, color: "#6c7a89" }}>
              <i className="ti ti-info-circle" /> {status.seed_message}
            </div>
          )}
          {status?.empty && (
            <div style={{ marginTop: 10, background: "#fce5e0", border: "1px solid #f0c4be", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#7a2d23" }}>
              <b>⚠ Dump vide.</b> Le fallback ne fonctionnera pas tant que tu n'as pas fait un premier seed.
            </div>
          )}
        </Panel>

        {/* Seed */}
        <Panel style={{ marginBottom: 12 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>
            <i className="ti ti-upload" /> Seeder le dump
          </h3>
          <p style={{ fontSize: 12.5, color: "#6c7a89", margin: "0 0 10px" }}>
            Télécharge le fichier CSV RPPS open data depuis <a href="https://annuaire.sante.fr/web/site-pro/extractions-publiques" target="_blank" rel="noopener" style={{ color: "#185FA5" }}>annuaire.sante.fr</a> (≈ 500 Mo, mise à jour mensuelle), puis charge-le ici. Les données seront upsertées par batchs de 5 000 lignes.
          </p>

          {/* 0.56.14 : raccourcis direct vers les pages de téléchargement ANS */}
          <div style={{ background: "#dbe7f5", border: "1px solid #bdd2eb", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#185FA5", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
              <i className="ti ti-cloud-download" /> Liens directs ANS (annuaire.sante.fr)
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <a
                href="https://annuaire.sante.fr/web/site-pro/extractions-publiques"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "#185FA5", color: "#fff", border: "none",
                  padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                  textDecoration: "none", fontFamily: "inherit",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                <i className="ti ti-external-link" /> Ouvrir la page d'extractions ANS
              </a>
              <a
                href="https://annuaire.sante.fr/web/site-pro/extractions-publiques?p_p_id=abonnementportlet_WAR_annuairesantefrportlet&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=telechargerCNOM&p_p_cacheability=cacheLevelPage"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "#5aa05a", color: "#fff", border: "none",
                  padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                  textDecoration: "none", fontFamily: "inherit",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                <i className="ti ti-download" /> Télécharger PS_LibreAcces (CSV ZIP)
              </a>
            </div>
            <p style={{ fontSize: 10.5, color: "#185FA5", margin: "8px 0 0", fontStyle: "italic" }}>
              Le 2ème lien lance directement le téléchargement du fichier ZIP (~150 Mo compressé). Décompresse-le pour obtenir un CSV ≈ 500 Mo à charger ci-dessous.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={seeding}
              style={{ flex: 1, minWidth: 240, padding: 8, border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 12 }}
            />
            <button onClick={startSeed} disabled={!file || seeding} style={{
              background: seeding ? "#a0aeb9" : "#5aa05a", color: "#fff", border: "none",
              padding: "8px 18px", borderRadius: 6, fontWeight: 700, fontSize: 12,
              cursor: seeding || !file ? "not-allowed" : "pointer", fontFamily: "inherit",
            }}>
              {seeding ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> : <i className="ti ti-wand" />}
              {seeding ? " Seed en cours…" : " Lancer le seed"}
            </button>
          </div>

          {seeding || progress.total > 0 ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ background: "#e3e9ee", borderRadius: 10, overflow: "hidden", height: 12 }}>
                <div style={{
                  background: "linear-gradient(90deg, #5aa05a, #2e6f33)",
                  height: "100%", width: `${pct}%`, transition: "width .2s",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6c7a89", marginTop: 4 }}>
                <span>{progress.done.toLocaleString()} / {progress.total.toLocaleString()} lignes</span>
                <span><b>{pct}%</b> · Batch {progress.batch}{progress.errors ? ` · ${progress.errors} erreurs` : ""}</span>
              </div>
            </div>
          ) : null}

          {seedLog.length > 0 && (
            <details open style={{ marginTop: 10 }}>
              <summary style={{ fontSize: 11.5, color: "#6c7a89", cursor: "pointer" }}>Log ({seedLog.length} lignes)</summary>
              <pre style={{ background: "#142131", color: "#e8edf2", padding: 10, borderRadius: 6, fontSize: 11, maxHeight: 220, overflow: "auto", marginTop: 6 }}>
                {seedLog.map((l, i) => (
                  <div key={i} style={{ color: l.kind === "error" ? "#ff7a6c" : l.kind === "success" ? "#7af0a0" : "#cfe4f5" }}>
                    [{l.t.toLocaleTimeString()}] {l.line}
                  </div>
                ))}
              </pre>
            </details>
          )}
        </Panel>

        {/* Test fallback */}
        <Panel style={{ marginBottom: 12, background: "linear-gradient(135deg, #f3effa, #fff)", borderColor: "#d6c9ec" }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>
            <i className="ti ti-flask" /> Tester le fallback
          </h3>
          <p style={{ fontSize: 12, color: "#6c7a89", margin: "0 0 8px" }}>
            Tape un nom — la route /api/rpps va tenter l'ANS puis fallback sur le dump si KO. Regarde le champ <code>source</code> dans la réponse :
            <code> "ANS FHIR"</code> = ANS OK · <code>"dump_local"</code> = fallback déclenché.
          </p>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="DUPONT, MARTIN, BERNARD…"
              style={{ flex: 1, padding: "7px 10px", border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 12 }}
            />
            <button onClick={runTest} style={{ background: "#7a6fb0", color: "#fff", border: "none", padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Tester
            </button>
          </div>

          {testResult && !testResult.loading && (
            <div style={{ marginTop: 10, background: "#fff", borderRadius: 8, padding: 10, border: "1px solid #e3e9ee" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <span style={{ background: testResult.ok ? "#dff5e0" : "#fce5e0", color: testResult.ok ? "#2e6f33" : "#7a2d23", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                  {testResult.ok ? "✓ OK" : "✗ KO"}
                </span>
                <span style={{ background: "#f3effa", color: "#5a4a90", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: "Consolas,monospace" }}>
                  source: {testResult.source || "?"}
                </span>
                <span style={{ fontSize: 11, color: "#6c7a89" }}>
                  {testResult.count || 0} résultats · {testResult.duration_ms || 0}ms
                </span>
              </div>
              {testResult.fallback_reason && (
                <div style={{ fontSize: 11, color: "#7a4f15", background: "#fff8ec", padding: 6, borderRadius: 4, marginBottom: 6 }}>
                  <i className="ti ti-arrow-fork" /> Fallback déclenché : <b>{testResult.fallback_reason}</b>
                </div>
              )}
              {(testResult.results || []).slice(0, 3).map((r, i) => (
                <div key={i} style={{ fontSize: 12, padding: "4px 0", borderTop: i ? "1px solid #f4f7fa" : "none" }}>
                  <b>{r.nom} {r.prenom}</b> · {r.profession} · {r.ville} <code style={{ marginLeft: 6, fontFamily: "Consolas,monospace", color: "#a0aeb9", fontSize: 10 }}>{r.rpps}</code>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Pédagogie */}
        <Panel style={{ background: "#fff8ec", borderColor: "#f0d59f" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 13.5, color: "#7a4f15" }}>
            <i className="ti ti-help-circle" /> Comment ça marche
          </h3>
          <ul style={{ fontSize: 12, color: "#7a4f15", margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
            <li>Toutes les recherches RPPS de l'app passent par <code>/api/rpps</code></li>
            <li>La route tente d'abord l'API ANS officielle (FHIR Annuaire Santé)</li>
            <li><b>Si l'ANS répond 403, timeout, 5xx, ou 0 résultat</b> → fallback automatique sur le dump local</li>
            <li>La réponse contient un champ <code>source</code> : <code>"ANS FHIR"</code> ou <code>"dump_local"</code></li>
            <li>L'UI carte affiche un badge "API ANS bloquée — voir diagnostic" si fallback déclenché</li>
            <li>Le dump est upserté (ON CONFLICT) — un seed mensuel suffit</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Kv({ label, value, color, mono }) {
  return (
    <div style={{ background: "#f4f7fa", borderRadius: 6, padding: "8px 10px" }}>
      <div style={{ fontSize: 10, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2, color: color || "#142131", fontFamily: mono ? "Consolas, monospace" : "inherit" }}>{value}</div>
    </div>
  );
}
