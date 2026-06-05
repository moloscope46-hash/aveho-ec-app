"use client";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase";
import { useAuth } from "../lib/useAuth";
import { safeInsert, safeUpdate, safeDelete } from "../lib/safeWrite";
import { Panel, StateMsg } from "./ui";
import AdvFilters from "./AdvFilters";

import { dialogs } from "./dialogs";
/**
 * Bloc CRUD générique réutilisable (anti-doublon).
 * props:
 *  - table : nom de la table Supabase
 *  - structureId : pour insert + filtre
 *  - columns : [{key,label,render?}] colonnes du tableau
 *  - fields : [{key,label,type,options?,required?}] champs du formulaire
 *  - title : titre du bouton "Nouveau X"
 *  - select : colonnes à charger (avec jointures éventuelles)
 *  - relations : { key: [{value,label}] } pour les selects (ex. articles, patients)
 */
export default function Crud({ structureId, etabId, table, columns, fields, title, select = "*", relations = {}, onData, canWrite = true, canDelete = true, filterFields = null, extraFilter = null }) {
  const supabase = createClient();
  const auth = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | {} (new) | row (edit)
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // Alpha 0.7 : import CSV
  const [importPreview, setImportPreview] = useState(null);   // {rows, mapping, fileName}
  const [importBusy, setImportBusy] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  // Alpha 0.8 : tri et pagination
  const [sortBy, setSortBy] = useState(null);      // clé de colonne
  const [sortDir, setSortDir] = useState("asc");   // "asc" ou "desc"
  const [page, setPage] = useState(0);
  // Alpha 0.19.0 : pageSize configurable par l'utilisateur (était fixé à 50)
  const [pageSize, setPageSize] = useState(50);
  // Alpha 0.8 : filtres avancés
  const [filters, setFilters] = useState(filterFields ? Object.fromEntries(filterFields.map((f) => [f.key, ""])) : {});
  // Alpha 0.9 : sélection multiple pour bulk actions
  const [selected, setSelected] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  async function load() {
    let q = supabase.from(table).select(select).order("created_at", { ascending: false });
    if (etabId) q = q.eq("etablissement_id", etabId);
    const { data } = await q;
    setRows(data || []);
    if (onData) onData(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [etabId]);

  function openNew() { setForm({}); setModal({}); setErr(""); }
  function openEdit(r) { setForm({ ...r }); setModal(r); setErr(""); }

  async function save() {
    setErr("");
    for (const f of fields) if (f.required && !form[f.key]) { setErr(`Champ requis : ${f.label}`); return; }
    setBusy(true);
    try {
      const payload = {};
      fields.forEach((f) => { payload[f.key] = form[f.key] ?? null; });
      const userId = auth.user?.id;
      if (modal.id) {
        // Alpha 0.26.0 : safeUpdate pour support offline
        const { error } = await safeUpdate(supabase, table, payload, { id: modal.id }, { userId });
        if (error) throw error;
      } else {
        const insertPayload = { ...payload, structure_id: structureId };
        if (etabId) insertPayload.etablissement_id = etabId;
        // UUID client pour pouvoir continuer le flow en offline
        if (typeof crypto !== "undefined" && crypto.randomUUID && !insertPayload.id) {
          insertPayload.id = crypto.randomUUID();
        }
        const { error } = await safeInsert(supabase, table, insertPayload, { userId });
        if (error) throw error;
      }
      setModal(null); await load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function del(r) {
    if (!await dialogs.confirm({ title: "Supprimer cet élément ?", variant: "danger" })) return;
    // Alpha 0.26.0 : safeDelete pour support offline
    await safeDelete(supabase, table, { id: r.id }, { userId: auth.user?.id });
    await load();
  }

  // Alpha 0.9 : helpers sélection multiple
  function toggleRow(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }
  function toggleAllVisible(visibleRows) {
    const visibleIds = visibleRows.map((r) => r.id);
    const allSelected = visibleIds.every((id) => selected.has(id));
    const next = new Set(selected);
    if (allSelected) visibleIds.forEach((id) => next.delete(id));
    else visibleIds.forEach((id) => next.add(id));
    setSelected(next);
  }
  async function bulkDelete() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!await dialogs.confirm({ title: `Supprimer définitivement ${ids.length} élément(s) ? Cette action est irréversible.`, variant: "danger" })) return;
    setBulkBusy(true);
    try {
      // Supabase ne supporte pas IN large -> on split en batches de 100
      for (let i = 0; i < ids.length; i += 100) {
        await supabase.from(table).delete().in("id", ids.slice(i, i + 100));
      }
      setSelected(new Set());
      await load();
    } finally { setBulkBusy(false); }
  }
  function bulkExportCSV() {
    const rowsToExport = rows.filter((r) => selected.has(r.id));
    if (!rowsToExport.length) return;
    // 0.57.5 : catch pour gérer un échec de chunk load (réseau coupé, etc.)
    import("../lib/export")
      .then((m) => m.exportCSV(`${table}-selection.csv`, rowsToExport, columns.filter((c) => !c.skipExport)))
      .catch((e) => alert("Export CSV impossible : " + (e?.message || "erreur de chargement")));
  }
  function clearSelection() { setSelected(new Set()); }

  return (
    <Panel>
      <div className="di-toolbar">
        {canWrite && <button className="btn-new" onClick={openNew} disabled={!structureId}><i className="ti ti-plus" /> {title}</button>}
        {canWrite && (
          <label className="btn-ghost" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }} title="Importer un fichier CSV pour ajout en masse">
            <i className="ti ti-file-import" /> Import CSV
            <input type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return;
              try {
                const m = await import("../lib/importCsv");
                const parsed = await m.parseCSV(file);
                // Construire un mapping initial (en-têtes CSV -> champs du formulaire)
                const csvHeaders = parsed.length ? Object.keys(parsed[0]) : [];
                const mapping = {};
                fields.forEach((f) => {
                  // auto-match si l'en-tête CSV ressemble au label ou à la clé
                  const hit = csvHeaders.find((h) =>
                    h.toLowerCase().trim() === f.label.toLowerCase().trim() ||
                    h.toLowerCase().trim() === f.key.toLowerCase());
                  if (hit) mapping[f.key] = hit;
                });
                setImportPreview({ rows: parsed, mapping, fileName: file.name, csvHeaders });
                setImportMsg("");
              } catch (err) {
                alert("Lecture du CSV impossible : " + err.message);
              }
              e.target.value = ""; // permet de re-choisir le même fichier
            }} />
          </label>
        )}
        {rows.length > 0 && (
          <button className="btn-ghost" onClick={() => {
            // Import dynamique pour ne pas charger la lib si pas utilisée
            // 0.57.5 : .catch en cas d'échec de chunk load
            import("../lib/export")
              .then((m) => m.exportCSV(`${table}.csv`, rows, columns.filter((c) => !c.skipExport)))
              .catch((e) => alert("Export CSV impossible : " + (e?.message || "erreur de chargement")));
          }} title="Exporter en CSV (Excel)">
            <i className="ti ti-file-export" /> Export CSV
          </button>
        )}
        {rows.length > 0 && (
          <button className="btn-ghost" onClick={() => {
            // 0.57.5 : .catch idem
            import("../lib/exportPdf")
              .then((m) => m.exportPDF({
                titre: title,
                sousTitre: `Liste exportée le ${new Date().toLocaleString("fr-FR")}`,
                rows, columns: columns.filter((c) => !c.skipExport && !c.skipPdf),
              }))
              .catch((e) => alert("Export PDF impossible : " + (e?.message || "erreur de chargement")));
          }} title="Exporter en PDF (impression)">
            <i className="ti ti-file-type-pdf" /> Export PDF
          </button>
        )}
        {filterFields && <AdvFilters fields={filterFields} values={filters} onChange={(v) => { setFilters(v); setPage(0); }} />}
      </div>

      {loading ? <StateMsg>Chargement…</StateMsg>
        : rows.length === 0 ? <StateMsg>Aucun élément. <a style={{ color: "#2a5a5a", fontWeight: 600 }} onClick={openNew}>Créer le premier</a></StateMsg>
        : (() => {
            // 0.58.40 : extraFilter externe (ex : filtre par contexte bât/svc) appliqué EN PREMIER
            const baseRows = extraFilter ? rows.filter(extraFilter) : rows;
            // Alpha 0.8 : filtres avancés (appliqués AVANT tri)
            const filtered = filterFields ? baseRows.filter((r) => {
              for (const f of filterFields) {
                const v = filters[f.key];
                if (!v) continue;
                if (f.type === "select") {
                  // récupération éventuelle via accessor si fourni
                  const rv = f.accessor ? f.accessor(r) : r[f.key];
                  if (rv !== v) return false;
                } else {
                  // recherche texte sur les champs configurés (searchKeys) ou la clé directe
                  const keys = f.searchKeys || [f.key];
                  const needle = v.toLowerCase();
                  const found = keys.some((k) => String(r[k] || "").toLowerCase().includes(needle));
                  if (!found) return false;
                }
              }
              return true;
            }) : baseRows;
            // Alpha 0.8 : tri client-side
            const sorted = sortBy ? [...filtered].sort((a, b) => {
              const va = a[sortBy]; const vb = b[sortBy];
              // null/undefined toujours en fin
              if (va == null && vb == null) return 0;
              if (va == null) return 1;
              if (vb == null) return -1;
              // Comparaison numérique si les deux sont des nombres
              if (typeof va === "number" && typeof vb === "number") return sortDir === "asc" ? va - vb : vb - va;
              // Sinon comparaison string sans casse
              const sa = String(va).toLowerCase(); const sb = String(vb).toLowerCase();
              return sortDir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
            }) : filtered;
            // Pagination
            const totalPages = Math.ceil(sorted.length / pageSize);
            const pageRows = sorted.slice(page * pageSize, (page + 1) * pageSize);
            function clickHeader(c) {
              if (c.skipSort) return;
              if (sortBy === c.key) {
                setSortDir(sortDir === "asc" ? "desc" : "asc");
              } else {
                setSortBy(c.key); setSortDir("asc");
              }
              setPage(0);
            }
            return (
              <>
                {filtered.length !== rows.length && (
                  <p style={{ fontSize: 12, color: "#6c7a89", margin: "0 0 10px" }}>
                    <i className="ti ti-info-circle" /> {filtered.length} sur {rows.length} ligne(s) affichée(s) — filtres actifs.
                  </p>
                )}
                {/* Alpha 0.9 : barre de bulk actions */}
                {selected.size > 0 && (
                  <div className="bulk-bar">
                    <span><b>{selected.size}</b> élément(s) sélectionné(s)</span>
                    <div className="bulk-actions">
                      <button onClick={bulkExportCSV}><i className="ti ti-file-export" /> Exporter CSV</button>
                      {canDelete && <button className="danger" onClick={bulkDelete} disabled={bulkBusy}><i className="ti ti-trash" /> {bulkBusy ? "Suppression…" : "Supprimer"}</button>}
                      <button onClick={clearSelection}><i className="ti ti-x" /> Désélectionner</button>
                    </div>
                  </div>
                )}
                {filtered.length === 0 ? (
                  <StateMsg>Aucun résultat pour ces filtres.</StateMsg>
                ) : (
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>
                        <input type="checkbox"
                          checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))}
                          onChange={() => toggleAllVisible(pageRows)}
                          title="Tout sélectionner (page courante)" />
                      </th>
                      {columns.map((c) => (
                        <th key={c.key}
                          onClick={() => clickHeader(c)}
                          style={{ cursor: c.skipSort ? "default" : "pointer", userSelect: "none" }}
                          title={c.skipSort ? undefined : "Cliquer pour trier"}
                        >
                          {c.label}
                          {sortBy === c.key && <i className={`ti ${sortDir === "asc" ? "ti-chevron-up" : "ti-chevron-down"}`} style={{ marginLeft: 4, fontSize: 14, color: "#2a5a5a" }} />}
                          {sortBy !== c.key && !c.skipSort && <i className="ti ti-arrows-sort" style={{ marginLeft: 4, fontSize: 12, color: "#cfd5db" }} />}
                        </th>
                      ))}
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => (
                      <tr key={r.id} className={selected.has(r.id) ? "tr-selected" : ""}>
                        <td><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleRow(r.id)} /></td>
                        {columns.map((c) => <td key={c.key}>{c.render ? c.render(r) : (r[c.key] ?? "—")}</td>)}
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          {canWrite && <i className="ti ti-edit" style={{ color: "#2a5a5a", cursor: "pointer", marginRight: 12 }} onClick={() => openEdit(r)} />}
                          {canDelete && <i className="ti ti-trash" style={{ color: "#C9867F", cursor: "pointer" }} onClick={() => del(r)} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                )}
                {/* Pagination — affichée si plus d'une page OU si on a > 25 lignes (pour choisir la taille) */}
                {(totalPages > 1 || sorted.length > 25) && (
                  <div className="pagination">
                    {totalPages > 1 && (
                      <button className="btn-ghost" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} aria-label="Page précédente">
                        <i className="ti ti-chevron-left" /> Précédent
                      </button>
                    )}
                    <span className="pagination-info">
                      {totalPages > 1 ? <>Page <b>{page + 1}</b> sur <b>{totalPages}</b> — </> : null}
                      <b>{sorted.length}</b> ligne(s)
                    </span>
                    {/* Alpha 0.19.0 : sélecteur de taille de page (25/50/100/Tout) */}
                    <span style={{ fontSize: 12, color: "#6c7a89", marginLeft: 8 }}>Afficher :</span>
                    <select
                      value={pageSize}
                      onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
                      style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e1e6eb", fontFamily: "inherit", fontSize: 12 }}
                      aria-label="Nombre d'éléments par page"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={sorted.length || 9999}>Tout</option>
                    </select>
                    {totalPages > 1 && (
                      <button className="btn-ghost" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} aria-label="Page suivante">
                        Suivant <i className="ti ti-chevron-right" />
                      </button>
                    )}
                  </div>
                )}
              </>
            );
          })()}

      {modal && (
        <div className="modal-bg" onClick={(e) => e.target.classList.contains("modal-bg") && setModal(null)}>
          <div className="modal">
            <div className="modal-head">{modal.id ? "Modifier" : title} <i className="ti ti-x" style={{ cursor: "pointer" }} onClick={() => setModal(null)} /></div>
            <div className="modal-body">
              {err && <div className="err">{err}</div>}
              {fields.map((f) => (
                <div className="fld" key={f.key}>
                  <label>{f.label}{f.required ? " *" : ""}</label>
                  {f.type === "select" ? (
                    <select value={form[f.key] || ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                      <option value="">— Aucun —</option>
                      {(f.options || relations[f.key] || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea value={form[f.key] || ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                  ) : (
                    <input type={f.type || "text"} value={form[f.key] || ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                  )}
                </div>
              ))}
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => setModal(null)}>Annuler</button>
              <button className="btn-save" onClick={save} disabled={busy}>{busy ? "…" : "Enregistrer"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale d'import CSV (Alpha 0.7) */}
      {importPreview && (
        <div className="modal-bg" onClick={(e) => e.target.classList.contains("modal-bg") && !importBusy && setImportPreview(null)}>
          <div className="modal" style={{ maxWidth: 720, width: "100%" }}>
            <div className="modal-head">
              Importer "{importPreview.fileName}" — {importPreview.rows.length} ligne(s)
              <i className="ti ti-x" style={{ cursor: "pointer" }} onClick={() => !importBusy && setImportPreview(null)} />
            </div>
            <div className="modal-body">
              {importMsg && <div className="ok">{importMsg}</div>}
              <p style={{ fontSize: 13, color: "#6c7a89", marginTop: 0 }}>
                Associe chaque champ Aveho à une colonne de ton CSV. Les champs non associés seront laissés vides.
              </p>
              <table>
                <thead><tr><th>Champ Aveho</th><th>Colonne CSV</th><th>Exemple ligne 1</th></tr></thead>
                <tbody>
                  {fields.map((f) => (
                    <tr key={f.key}>
                      <td style={{ fontWeight: 600 }}>{f.label}{f.required && " *"}</td>
                      <td>
                        <select value={importPreview.mapping[f.key] || ""} onChange={(e) => {
                          setImportPreview({ ...importPreview, mapping: { ...importPreview.mapping, [f.key]: e.target.value } });
                        }} style={{ width: "100%" }}>
                          <option value="">— Aucune —</option>
                          {importPreview.csvHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </td>
                      <td style={{ fontSize: 12, color: "#6c7a89" }}>
                        {importPreview.mapping[f.key] ? (importPreview.rows[0]?.[importPreview.mapping[f.key]] || "—") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: 12, color: "#8a98a8", marginTop: 12 }}>
                <i className="ti ti-info-circle" /> Les lignes seront insérées dans la table <code>{table}</code> avec l'établissement courant. Les erreurs d'insertion arrêteront le processus.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => setImportPreview(null)} disabled={importBusy}>Annuler</button>
              <button className="btn-save" disabled={importBusy} onClick={async () => {
                setImportBusy(true); setImportMsg("");
                try {
                  // Construire les objets à insérer selon le mapping
                  const toInsert = importPreview.rows.map((row) => {
                    const obj = { structure_id: structureId };
                    if (etabId) obj.etablissement_id = etabId;
                    fields.forEach((f) => {
                      const src = importPreview.mapping[f.key];
                      if (src && row[src] !== undefined && row[src] !== "") obj[f.key] = row[src];
                    });
                    return obj;
                  }).filter((o) => Object.keys(o).length > (etabId ? 2 : 1)); // au moins 1 champ utile
                  // Insertion par batches de 100
                  let inserted = 0;
                  for (let i = 0; i < toInsert.length; i += 100) {
                    const batch = toInsert.slice(i, i + 100);
                    const { error } = await supabase.from(table).insert(batch);
                    if (error) throw error;
                    inserted += batch.length;
                  }
                  setImportMsg(`✓ ${inserted} ligne(s) importée(s).`);
                  await load();
                  setTimeout(() => { setImportPreview(null); setImportMsg(""); }, 1800);
                } catch (e) {
                  setImportMsg("Erreur : " + e.message);
                } finally { setImportBusy(false); }
              }}>
                {importBusy ? "Import en cours…" : `Importer ${importPreview.rows.length} ligne(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
