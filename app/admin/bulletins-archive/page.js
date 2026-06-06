"use client";
import AdminGuard from "../../components/AdminGuard"; // 0.57.34 anti-régression admin
// =============================================================
//  app/admin/bulletins-archive/page.js (Alpha 0.56.1)
//
//  Vue admin des archives de bulletins de situation scannés.
//  Stats + liste des patients ayant un bulletin archivé.
// =============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { logger } from "../../../lib/logger";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, StateMsg } from "../../ui";
// 0.58.51 : migration UI premium
import { EmptyState, SkeletonRow } from "../../components/ui-premium";

function BulletinsArchivePageInner() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      setLoading(true);
      try {
        // Stats globales
        const { data: statsData } = await supabase.rpc("bulletins_archive_stats");
        setStats((statsData && statsData[0]) || null);

        // Liste des patients avec bulletin archivé
        const { data: pats } = await supabase
          .from("patients")
          .select("id, nom, prenom, numero_dossier, bs_file_path, bs_file_mime, bs_file_size_kb, bs_ocr_date, bs_ocr_confiance, bs_ocr_tokens_in, bs_ocr_tokens_out")
          .not("bs_file_path", "is", null)
          .order("bs_ocr_date", { ascending: false })
          .limit(200);
        setPatients(pats || []);
      } catch (e) {
        // 0.56.22 : try/catch pour pas planter la page si Supabase répond mal
        logger.error("[BulletinsArchive] load failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [auth.ready]);

  const filtered = patients.filter(p => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return (p.nom || "").toLowerCase().includes(f)
      || (p.prenom || "").toLowerCase().includes(f)
      || (p.numero_dossier || "").toLowerCase().includes(f);
  });

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="ADMIN · ARCHIVES"
          icon="ti-archive"
          title="Bulletins archivés"
          accent="(Storage Supabase)"
          sub="Tous les bulletins scannés via OCR sont conservés ici, privés (RLS) et accessibles via URL signée"
        />

        {/* Stats */}
        {stats && (
          <Panel style={{ marginBottom: 12 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>
              <i className="ti ti-chart-bar" /> Statistiques de la structure
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              <Kpi label="Bulletins archivés" value={Number(stats.total_patients_avec_bs).toLocaleString()} color="#185FA5" icon="ti-archive" />
              <Kpi label="Espace utilisé" value={fmtKo(stats.total_ko)} color="#7a6fb0" icon="ti-database" mono />
              <Kpi label="Premier archive" value={stats.premier_archive ? new Date(stats.premier_archive).toLocaleDateString() : "—"} color="#6c7a89" icon="ti-calendar" />
              <Kpi label="Dernier archive" value={stats.dernier_archive ? new Date(stats.dernier_archive).toLocaleDateString() : "—"} color="#5aa05a" icon="ti-calendar-event" />
              <Kpi label="Tokens IN total" value={Number(stats.tokens_total_in).toLocaleString()} color="#EF9F27" icon="ti-arrow-down-circle" mono />
              <Kpi label="Tokens OUT total" value={Number(stats.tokens_total_out).toLocaleString()} color="#EF9F27" icon="ti-arrow-up-circle" mono />
            </div>
            {/* Estimation coût (Claude Sonnet 4 : 3$/M input, 15$/M output) */}
            <div style={{ marginTop: 10, fontSize: 11, color: "#6c7a89", background: "#f4f7fa", padding: 8, borderRadius: 6 }}>
              <i className="ti ti-coin" /> Coût IA estimé : <b style={{ fontFamily: "Consolas, monospace", color: "#185FA5" }}>
                {fmtEur(estimateCost(stats.tokens_total_in, stats.tokens_total_out))}
              </b> · Claude Sonnet 4 (3$/M tokens IN + 15$/M OUT)
            </div>
          </Panel>
        )}

        {/* Filtre */}
        <Panel style={{ marginBottom: 12 }}>
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrer par nom, prénom ou n° dossier…"
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "9px 12px", border: "1px solid #d3d9e0", borderRadius: 6,
              fontSize: 13, fontFamily: "inherit",
            }}
          />
        </Panel>

        {/* Liste */}
        {loading && <Panel><SkeletonRow count={5} /></Panel>}
        {!loading && filtered.length === 0 && (
          <Panel>
            {filter ? (
              <EmptyState
                icon="ti-search-off"
                title="Aucun résultat"
                description="Aucun bulletin ne correspond au filtre actuel. Essayez d'autres critères de recherche."
              />
            ) : (
              <EmptyState
                icon="ti-archive-off"
                title="Aucun bulletin archivé"
                description="Aucun bulletin de situation n'a été archivé pour le moment. Utilisez Outils scan → Créer patient depuis bulletin pour archiver vos premiers bulletins."
              />
            )}
          </Panel>
        )}
        {!loading && filtered.length > 0 && (
          <Panel>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e3e9ee", color: "#6c7a89", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3 }}>
                    <th style={{ textAlign: "left", padding: "8px 6px" }}>Patient</th>
                    <th style={{ textAlign: "left", padding: "8px 6px" }}>N° dossier</th>
                    <th style={{ textAlign: "left", padding: "8px 6px" }}>Type</th>
                    <th style={{ textAlign: "right", padding: "8px 6px" }}>Taille</th>
                    <th style={{ textAlign: "left", padding: "8px 6px" }}>OCR</th>
                    <th style={{ textAlign: "right", padding: "8px 6px" }}>Tokens</th>
                    <th style={{ textAlign: "left", padding: "8px 6px" }}>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} style={{ borderBottom: "1px solid #f4f7fa" }}>
                      <td style={{ padding: "8px 6px" }}>
                        <b>{p.nom}</b> {p.prenom}
                      </td>
                      <td style={{ padding: "8px 6px", fontFamily: "Consolas, monospace", color: "#6c7a89" }}>
                        {p.numero_dossier || "—"}
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        {p.bs_file_mime === "application/pdf" ? "📄 PDF"
                          : p.bs_file_mime?.startsWith("image/") ? "🖼 Image"
                          : "?"}
                      </td>
                      <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: "Consolas, monospace" }}>
                        {p.bs_file_size_kb ? `${p.bs_file_size_kb} Ko` : "—"}
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        {p.bs_ocr_confiance && (
                          <span style={{
                            background: p.bs_ocr_confiance === "haute" ? "#dff5e0" : p.bs_ocr_confiance === "moyenne" ? "#fff8ec" : "#fce5e0",
                            color: p.bs_ocr_confiance === "haute" ? "#2e6f33" : p.bs_ocr_confiance === "moyenne" ? "#7a4f15" : "#7a2d23",
                            fontSize: 10.5, fontWeight: 700, padding: "2px 6px", borderRadius: 6,
                          }}>{p.bs_ocr_confiance}</span>
                        )}
                      </td>
                      <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: "Consolas, monospace", color: "#6c7a89", fontSize: 11 }}>
                        {(p.bs_ocr_tokens_in || 0)}/{(p.bs_ocr_tokens_out || 0)}
                      </td>
                      <td style={{ padding: "8px 6px", color: "#6c7a89", fontSize: 11 }}>
                        {p.bs_ocr_date ? new Date(p.bs_ocr_date).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding: "8px 6px", textAlign: "right" }}>
                        <button
                          onClick={() => router.push(`/patient/${p.id}/edit?tab=audit`)}
                          style={{ background: "#185FA5", color: "#fff", border: "none", padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                        >
                          <i className="ti ti-eye" /> Voir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 200 && (
              <div style={{ marginTop: 8, fontSize: 11, color: "#6c7a89", textAlign: "center" }}>
                <i className="ti ti-info-circle" /> 200 derniers affichés. Utilise le filtre pour réduire la liste.
              </div>
            )}
          </Panel>
        )}

        {/* Pédagogie RLS */}
        <Panel style={{ marginTop: 14, background: "#fff8ec", borderColor: "#f0d59f" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 13.5, color: "#7a4f15" }}>
            <i className="ti ti-shield-lock" /> Confidentialité
          </h3>
          <ul style={{ fontSize: 12, color: "#7a4f15", margin: 0, paddingLeft: 18, lineHeight: 1.65 }}>
            <li>Bucket privé — pas de lien public</li>
            <li>RLS Supabase : seul un membre de ta structure peut lire les fichiers de ta structure</li>
            <li>URL signées : valides 1h, régénérées à chaque consultation</li>
            <li>Tu peux supprimer un fichier depuis la fiche patient (action irréversible)</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function fmtKo(ko) {
  const n = Number(ko || 0);
  if (n > 1024) return `${(n / 1024).toFixed(1)} Mo`;
  return `${n} Ko`;
}

function fmtEur(n) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);
}

function estimateCost(tokensIn, tokensOut) {
  // Claude Sonnet 4 : 3$/M tokens IN + 15$/M tokens OUT, ~0.92 EUR/USD
  const usd = (Number(tokensIn || 0) / 1_000_000) * 3 + (Number(tokensOut || 0) / 1_000_000) * 15;
  return usd * 0.92;
}

function Kpi({ label, value, color, icon, mono }) {
  return (
    <div style={{ background: "#f4f7fa", borderRadius: 8, padding: "10px 12px", borderLeft: `3px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#6c7a89", fontWeight: 600, textTransform: "uppercase" }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 11 }} /> {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color, marginTop: 4, fontFamily: mono ? "Consolas, monospace" : "inherit" }}>{value}</div>
    </div>
  );
}

// 0.57.34 : wrapper AdminGuard pour restreindre l'accès aux admins
export default function BulletinsArchivePage() {
  return (
    <AdminGuard>
      <BulletinsArchivePageInner />
    </AdminGuard>
  );
}
