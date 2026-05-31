"use client";
// =============================================================
//  Page Consentements RGPD — Alpha 0.21.0
//  Liste tous les consentements signés/refusés/archivés, avec
//  filtres par statut, recherche, accès à l'image de signature,
//  et archivage manuel.
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, FilterBar } from "../ui";
import { KpiRow } from "../kpis";
import { fmtDate, relativeTime } from "../../lib/format";

import { dialogs } from "../dialogs";
export default function ConsentementsPage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtreStatut, setFiltreStatut] = useState("actifs"); // 'actifs' | 'refuses' | 'archives' | 'tous'
  const [search, setSearch] = useState("");
  const [viewModal, setViewModal] = useState(null); // consentement ouvert pour visualisation
  const [sigUrl, setSigUrl] = useState(null);
  const [sigLoading, setSigLoading] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false); // Alpha 0.22.0

  async function load() {
    if (!auth.structureId) return;
    const { data } = await supabase.from("consentements_rgpd")
      .select("*")
      .eq("structure_id", auth.structureId)
      .order("date_signature", { ascending: false });
    setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { if (auth.ready) load(); }, [auth.ready]);

  async function openConsent(c) {
    setViewModal(c);
    setSigUrl(null);
    if (c.signature_storage_path && c.statut === "signe") {
      setSigLoading(true);
      // URL signée valide 5 minutes
      const { data, error } = await supabase.storage
        .from("signatures-rgpd")
        .createSignedUrl(c.signature_storage_path, 300);
      if (!error && data?.signedUrl) setSigUrl(data.signedUrl);
      setSigLoading(false);
    }
  }

  async function toggleArchive(c) {
    const nouvelEtat = !c.archive;
    const verbe = nouvelEtat ? "archiver" : "désarchiver";
    if (!await dialogs.confirm({ title: `Confirmer ${verbe} ce consentement ?\n\nCela n'efface pas les données, le consentement reste consultable.`, variant: "danger" })) return;
    await supabase.from("consentements_rgpd")
      .update({ archive: nouvelEtat })
      .eq("id", c.id);
    setViewModal(null);
    await load();
  }

  async function imprimer(c) {
    // Récupère l'URL signée si pas déjà fait
    let url = sigUrl;
    if (!url && c.signature_storage_path) {
      const { data } = await supabase.storage
        .from("signatures-rgpd")
        .createSignedUrl(c.signature_storage_path, 300);
      url = data?.signedUrl;
    }
    // Génère du HTML printable
    const { consentementToHtml } = await import("../../lib/rgpd");
    const sigImg = url ? `<img src="${url}" style="max-width:300px;border:1px solid #ccc;padding:8px;margin-top:10px" />` : "<p><em>Aucune signature</em></p>";
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Consentement RGPD — ${c.patient_nom_prenom}</title>
<style>
  body{font-family:'Segoe UI',Helvetica,sans-serif;max-width:700px;margin:30px auto;padding:0 24px;color:#142131;line-height:1.6;font-size:13px}
  h1{font-size:18px;color:#185FA5;border-bottom:2px solid #7CC8C8;padding-bottom:6px}
  strong{color:#142131}
  hr{border:none;border-top:1px solid #cfd5db;margin:14px 0}
  .meta{background:#f4f7fa;padding:14px 18px;border-radius:8px;margin:14px 0;font-size:12px}
  .meta b{color:#185FA5}
  .sig{margin-top:24px;padding-top:14px;border-top:2px solid #cfd5db}
  ul{padding-left:22px}
  @media print{body{padding:0;margin:10px}}
</style></head><body>
<h1>Consentement RGPD signé</h1>
${consentementToHtml(c.texte_consentement)}
<div class="sig">
  <p><b>Statut :</b> ${c.statut === "signe" ? "✓ Signé" : c.statut === "refuse" ? "✗ Refusé" : c.statut}</p>
  <p><b>Date de signature :</b> ${new Date(c.date_signature).toLocaleString("fr-FR")}</p>
  <p><b>Signataire :</b> ${c.signe_par_nom || c.patient_nom_prenom} (${c.signe_par_role === "patient" ? "patient lui-même" : "représentant légal"})</p>
  <p><b>Recueilli par :</b> ${c.recueilli_par_nom || c.recueilli_par_email || "—"}</p>
  ${c.signature_hash ? `<p><b>Hash d'intégrité :</b> <code style="font-size:10px;word-break:break-all">${c.signature_hash}</code></p>` : ""}
  <div class="meta">
    <b>Patient :</b> ${c.patient_nom_prenom}<br>
    ${c.patient_date_naissance ? `<b>Né(e) le :</b> ${new Date(c.patient_date_naissance).toLocaleDateString("fr-FR")}<br>` : ""}
    ${c.patient_numero_dossier ? `<b>Dossier :</b> ${c.patient_numero_dossier}<br>` : ""}
    <b>Établissement :</b> ${c.etablissement_nom || "—"}<br>
    <b>Collectivité :</b> ${c.collectivite_nom || "—"}
  </div>
  <p><b>Signature :</b></p>
  ${sigImg}
</div>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    const w = window.open(blobUrl, "_blank", "width=900,height=700");
    if (!w) { alert("Impossible d'ouvrir la fenêtre d'impression (popup bloquée ?)."); return; }
    setTimeout(() => { try { w.print(); } catch {} setTimeout(() => URL.revokeObjectURL(blobUrl), 30000); }, 500);
  }

  // Alpha 0.22.0 : génération PDF avec signature image intégrée + QR code de vérification
  async function telechargerPdf(c) {
    setPdfBusy(true);
    try {
      // Récupérer l'URL signée de la signature si disponible
      let signatureUrl = null;
      if (c.signature_storage_path && c.statut === "signe") {
        const { data } = await supabase.storage
          .from("signatures-rgpd")
          .createSignedUrl(c.signature_storage_path, 300);
        signatureUrl = data?.signedUrl;
      }
      const { generateConsentPDF } = await import("../../lib/consentPdf");
      await generateConsentPDF(c, { signatureUrl });
    } catch (e) {
      alert("Erreur génération PDF : " + (e.message || "inconnue"));
    } finally {
      setPdfBusy(false);
    }
  }

  // Alpha 0.22.0 : marquer "renouvellement demandé"
  async function demanderRenouvellement(c) {
    if (!await dialogs.confirm({ title: `Marquer ce consentement comme à renouveler ?\n\nLe patient ${c.patient_nom_prenom} sera signalé pour resignature.`, variant: "danger" })) return;
    const { error } = await supabase.from("consentements_rgpd")
      .update({
        renouvellement_demande: true,
        renouvellement_demande_at: new Date().toISOString(),
      })
      .eq("id", c.id);
    if (error) { alert("Erreur : " + error.message); return; }
    setViewModal(null);
    await load();
  }

  if (!auth.ready) return null;

  // Filtrer côté client
  const q = search.trim().toLowerCase();
  const visibles = rows.filter((c) => {
    // Filtre statut
    if (filtreStatut === "actifs" && (c.archive || c.statut !== "signe")) return false;
    if (filtreStatut === "refuses" && (c.statut !== "refuse" || c.archive)) return false;
    if (filtreStatut === "archives" && !c.archive) return false;
    if (filtreStatut === "a_renouveler") {
      // À renouveler : signé, non archivé, expire dans <= 30j OU déjà expiré OU renouvellement demandé
      if (c.archive || c.statut !== "signe") return false;
      const exp = c.date_expiration ? new Date(c.date_expiration) : null;
      const jours = exp ? Math.floor((exp.getTime() - Date.now()) / 86400000) : null;
      const concerne = (jours !== null && jours <= 30) || c.renouvellement_demande;
      if (!concerne) return false;
    }
    // Filtre recherche
    if (q) {
      const hay = `${c.patient_nom_prenom} ${c.patient_numero_dossier || ""} ${c.signe_par_nom || ""} ${c.etablissement_nom || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // KPIs
  const totalSignes = rows.filter((c) => c.statut === "signe" && !c.archive).length;
  const totalRefuses = rows.filter((c) => c.statut === "refuse" && !c.archive).length;
  const totalArchives = rows.filter((c) => c.archive).length;
  const semDerniere = rows.filter((c) => c.statut === "signe" && !c.archive && (Date.now() - new Date(c.date_signature).getTime()) < 7 * 86400000).length;
  // Alpha 0.22.0 : KPI expiration
  const aRenouveler = rows.filter((c) => {
    if (c.archive || c.statut !== "signe") return false;
    if (c.renouvellement_demande) return true;
    if (!c.date_expiration) return false;
    const jours = Math.floor((new Date(c.date_expiration).getTime() - Date.now()) / 86400000);
    return jours <= 30;
  }).length;
  const expires = rows.filter((c) => {
    if (c.archive || c.statut !== "signe" || !c.date_expiration) return false;
    return new Date(c.date_expiration).getTime() < Date.now();
  }).length;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead eyebrow="CONFORMITÉ" icon="ti-shield-lock" title="Consentements" accent="RGPD"
          sub="Suivi des consentements signés, refusés, archivés. Document complet et signature électronique tracée." />

        <KpiRow tiles={[
          { label: "Signés", value: totalSignes, icon: "ti-shield-check", color: "#5aa05a" },
          { label: "À renouveler", value: aRenouveler, icon: "ti-clock-exclamation", color: "#EF9F27" },
          { label: "Expirés", value: expires, icon: "ti-clock-x", color: "#c0392b" },
          { label: "Refusés", value: totalRefuses, icon: "ti-shield-x", color: "#e35d5b" },
        ]} />

        <Panel>
          <FilterBar
            label="Voir :"
            value={filtreStatut}
            onChange={setFiltreStatut}
            options={[
              { v: "actifs", l: "Actifs", count: totalSignes },
              { v: "a_renouveler", l: "À renouveler", count: aRenouveler },
              { v: "refuses", l: "Refusés", count: totalRefuses },
              { v: "archives", l: "Archivés", count: totalArchives },
              { v: "tous", l: "Tous", count: rows.length },
            ]}
            rightSlot={
              <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                <i className="ti ti-search" style={{ position: "absolute", left: 10, color: "#8a98a8", fontSize: 14, pointerEvents: "none" }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Patient, dossier, signataire…"
                  aria-label="Rechercher un consentement"
                  style={{ padding: "6px 28px 6px 32px", borderRadius: 8, border: "1px solid #e1e6eb", fontFamily: "inherit", fontSize: 13, width: 240, background: "#fff" }}
                />
                {search && <button onClick={() => setSearch("")} aria-label="Effacer" style={{ position: "absolute", right: 6, background: "transparent", border: "none", cursor: "pointer", color: "#8a98a8", fontSize: 14, padding: 4 }}><i className="ti ti-x" /></button>}
              </div>
            }
          />
          {loading ? <StateMsg>Chargement…</StateMsg> : visibles.length === 0 ? (
            <StateMsg>{search ? `Aucun consentement trouvé pour "${search}".` : `Aucun consentement ${filtreStatut === "archives" ? "archivé" : filtreStatut === "refuses" ? "refusé" : filtreStatut === "actifs" ? "actif" : ""}.`}</StateMsg>
          ) : (
            <div className="panel-table"><table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Statut</th>
                  <th>Date signature</th>
                  <th>Expiration</th>
                  <th>Signataire</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((c) => {
                  // Alpha 0.22.0 : statut expiration
                  const exp = c.date_expiration ? new Date(c.date_expiration) : null;
                  const joursRestants = exp ? Math.floor((exp.getTime() - Date.now()) / 86400000) : null;
                  const expired = joursRestants !== null && joursRestants < 0;
                  const bientotExpire = joursRestants !== null && joursRestants >= 0 && joursRestants <= 30;
                  return (
                  <tr key={c.id} style={c.archive ? { opacity: .55 } : null}>
                    <td>
                      <b>{c.patient_nom_prenom}</b>
                      {c.patient_numero_dossier && <span style={{ fontSize: 11, color: "#8a98a8", display: "block" }}>Dossier {c.patient_numero_dossier}</span>}
                    </td>
                    <td>
                      {c.statut === "signe" && <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 8, background: "#eef9ef", color: "#2e6f33" }}><i className="ti ti-shield-check" /> Signé</span>}
                      {c.statut === "refuse" && <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 8, background: "#fef0ee", color: "#c0392b" }}><i className="ti ti-shield-x" /> Refusé</span>}
                      {c.statut === "en_attente" && <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 8, background: "#fff8ec", color: "#7a4f15" }}>En attente</span>}
                      {c.renouvellement_demande && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 6, background: "#fff8ec", color: "#7a4f15", display: "block", marginTop: 3 }}><i className="ti ti-refresh" /> Renouv. demandé</span>}
                    </td>
                    <td style={{ fontSize: 13 }} title={new Date(c.date_signature).toLocaleString("fr-FR")}>
                      {fmtDate(c.date_signature)}<br/>
                      <span style={{ fontSize: 11, color: "#8a98a8" }}>{relativeTime(c.date_signature)}</span>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {!exp ? <span style={{ color: "#8a98a8" }}>—</span> :
                       expired ? <span style={{ color: "#c0392b", fontWeight: 600 }}><i className="ti ti-clock-x" /> Expiré<br/><span style={{ fontWeight: 400, fontSize: 11 }}>depuis {-joursRestants}j</span></span> :
                       bientotExpire ? <span style={{ color: "#EF9F27", fontWeight: 600 }}><i className="ti ti-clock-exclamation" /> Dans {joursRestants}j<br/><span style={{ fontWeight: 400, fontSize: 11 }}>{fmtDate(c.date_expiration)}</span></span> :
                       <span style={{ color: "#5aa05a" }}><i className="ti ti-clock-check" /> {fmtDate(c.date_expiration)}<br/><span style={{ fontSize: 11, color: "#8a98a8" }}>dans {joursRestants}j</span></span>}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {c.signe_par_nom || c.patient_nom_prenom}
                      <span style={{ fontSize: 11, color: "#8a98a8", display: "block" }}>{c.signe_par_role === "representant_legal" ? "Rep. légal" : "Patient"}</span>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <i className="ti ti-eye" style={{ color: "#185FA5", cursor: "pointer", marginRight: 10, fontSize: 16 }} onClick={() => openConsent(c)} title="Voir le document" />
                      {/* Alpha 0.22.0 : bouton télécharger PDF */}
                      <i className="ti ti-file-type-pdf" style={{ color: "#c0392b", cursor: pdfBusy ? "wait" : "pointer", marginRight: 10, fontSize: 16, opacity: pdfBusy ? 0.5 : 1 }} onClick={() => !pdfBusy && telechargerPdf(c)} title="Télécharger PDF" />
                      <i className="ti ti-printer" style={{ color: "#5a8f8f", cursor: "pointer", marginRight: 10, fontSize: 16 }} onClick={() => imprimer(c)} title="Imprimer" />
                      {/* Alpha 0.22.0 : bouton renouvellement (uniquement si signé non archivé non déjà demandé) */}
                      {c.statut === "signe" && !c.archive && !c.renouvellement_demande && (bientotExpire || expired) && (
                        <i className="ti ti-refresh" style={{ color: "#EF9F27", cursor: "pointer", marginRight: 10, fontSize: 16 }} onClick={() => demanderRenouvellement(c)} title="Demander renouvellement" />
                      )}
                      <i className={`ti ${c.archive ? "ti-archive-off" : "ti-archive"}`} style={{ color: c.archive ? "#5aa05a" : "#8a98a8", cursor: "pointer", fontSize: 16 }} onClick={() => toggleArchive(c)} title={c.archive ? "Désarchiver" : "Archiver"} />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
        </Panel>
      </div>

      {/* Modale visualisation */}
      {viewModal && (
        <div className="modal-bg" onClick={(e) => e.target.classList.contains("modal-bg") && setViewModal(null)}>
          <div className="modal consent-modal" role="dialog" aria-modal="true">
            <div className="modal-head consent-head">
              <i className="ti ti-shield-lock" aria-hidden="true" style={{ marginRight: 6 }} />
              <span>Consentement RGPD — {viewModal.patient_nom_prenom}</span>
              <i className="ti ti-x" style={{ cursor: "pointer", marginLeft: "auto" }} onClick={() => setViewModal(null)} aria-label="Fermer" role="button" tabIndex={0} />
            </div>
            <div className="modal-body consent-body">
              <div className="consent-section">
                <h3 style={{ fontSize: 14, color: "#142131", marginBottom: 10 }}><i className="ti ti-info-circle" /> Métadonnées</h3>
                <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                  <div><b>Statut :</b> {viewModal.statut === "signe" ? "✓ Signé" : viewModal.statut === "refuse" ? "✗ Refusé" : viewModal.statut}</div>
                  <div><b>Date :</b> {new Date(viewModal.date_signature).toLocaleString("fr-FR")}</div>
                  <div><b>Signataire :</b> {viewModal.signe_par_nom || viewModal.patient_nom_prenom} ({viewModal.signe_par_role === "patient" ? "patient lui-même" : "représentant légal"})</div>
                  <div><b>Recueilli par :</b> {viewModal.recueilli_par_nom || viewModal.recueilli_par_email || "—"}</div>
                  <div><b>Appareil :</b> {viewModal.device_type || "—"}</div>
                  {viewModal.signature_hash && <div><b>Hash SHA-256 :</b> <code style={{ fontSize: 10, wordBreak: "break-all" }}>{viewModal.signature_hash}</code></div>}
                </div>
              </div>
              {viewModal.finalites_acceptees?.length > 0 && (
                <div className="consent-section">
                  <h3 style={{ fontSize: 14, color: "#142131", marginBottom: 10 }}><i className="ti ti-checklist" /> Finalités acceptées</h3>
                  <ul style={{ fontSize: 13 }}>
                    {viewModal.finalites_acceptees.map((k) => <li key={k}>{k}</li>)}
                  </ul>
                </div>
              )}
              <div className="consent-section">
                <h3 style={{ fontSize: 14, color: "#142131", marginBottom: 10 }}><i className="ti ti-signature" /> Signature</h3>
                {sigLoading ? <p style={{ color: "#8a98a8" }}>Chargement…</p> :
                 sigUrl ? <img src={sigUrl} alt="Signature" style={{ maxWidth: "100%", border: "1px solid #e3e9ee", borderRadius: 8, padding: 8, background: "#fff" }} /> :
                 viewModal.statut === "signe" ? <p style={{ color: "#c0392b" }}>Signature introuvable (chemin : {viewModal.signature_storage_path})</p> :
                 <p style={{ color: "#8a98a8", fontStyle: "italic" }}>Pas de signature (consentement {viewModal.statut})</p>}
              </div>
              {viewModal.notes && (
                <div className="consent-section">
                  <h3 style={{ fontSize: 14, color: "#142131", marginBottom: 10 }}><i className="ti ti-note" /> Notes</h3>
                  <p style={{ fontSize: 13, color: "#2a3a48" }}>{viewModal.notes}</p>
                </div>
              )}
            </div>
            <div className="modal-foot consent-foot">
              <button className="btn-ghost" onClick={() => setViewModal(null)}>Fermer</button>
              <button className="btn-ghost" onClick={() => telechargerPdf(viewModal)} disabled={pdfBusy}>
                <i className="ti ti-file-type-pdf" /> {pdfBusy ? "Génération…" : "Télécharger PDF"}
              </button>
              <button className="btn-ghost" onClick={() => imprimer(viewModal)}>
                <i className="ti ti-printer" /> Imprimer
              </button>
              {viewModal.statut === "signe" && !viewModal.archive && !viewModal.renouvellement_demande && (
                <button className="btn-ghost" onClick={() => demanderRenouvellement(viewModal)} style={{ color: "#EF9F27", borderColor: "#EF9F27" }}>
                  <i className="ti ti-refresh" /> Demander renouvellement
                </button>
              )}
              <button className="btn-save" onClick={() => toggleArchive(viewModal)} style={{ background: viewModal.archive ? "#5aa05a" : "#8a98a8" }}>
                <i className={`ti ${viewModal.archive ? "ti-archive-off" : "ti-archive"}`} /> {viewModal.archive ? "Désarchiver" : "Archiver"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
