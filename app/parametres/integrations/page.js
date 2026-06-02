"use client";
// =============================================================
//  app/parametres/integrations/page.js (Alpha 0.55.39)
//
//  Page paramètres pour les intégrations API externes :
//  - État de connexion (clé configurée ou non)
//  - Compteur de requêtes par API et par mois
//  - Détails (avg duration, erreurs, cache hits)
// =============================================================

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, StateMsg } from "../../ui";
import { fetchWithAuth } from "../../../lib/fetchWithAuth";

const API_META = {
  google_places: {
    label: "Google Places API",
    color: "#4285F4",
    icon: "ti-brand-google",
    description: "Photos, horaires, étoiles et avis des établissements",
    envVar: "GOOGLE_PLACES_API_KEY",
    freeQuota: 1000,
    pricePerThousand: 17,
    docUrl: "https://console.cloud.google.com/google/maps-apis",
  },
  rpps: {
    label: "RPPS — API FHIR ANS",
    color: "#185FA5",
    icon: "ti-stethoscope",
    description: "Annuaire national des professionnels de santé",
    envVar: null,
    freeQuota: null, // libre accès
    pricePerThousand: 0,
    docUrl: "https://annuaire.sante.fr/web/site-pro/extractions-publiques",
  },
  finess: {
    label: "FINESS — data.gouv.fr",
    color: "#5aa05a",
    icon: "ti-building-hospital",
    description: "Établissements de santé et médico-sociaux",
    envVar: null,
    freeQuota: null,
    pricePerThousand: 0,
    docUrl: "https://www.data.gouv.fr/fr/datasets/finess-extraction-du-fichier-des-etablissements/",
  },
  sirene: {
    label: "SIRENE — recherche-entreprises.api.gouv.fr",
    color: "#7a6fb0",
    icon: "ti-building-store",
    description: "Annuaire des entreprises françaises",
    envVar: null,
    freeQuota: null,
    pricePerThousand: 0,
    docUrl: "https://recherche-entreprises.api.gouv.fr/",
  },
  ban_insee: {
    label: "BAN INSEE — api-adresse.data.gouv.fr",
    color: "#EF9F27",
    icon: "ti-map-pin",
    description: "Base Adresse Nationale (autocomplete adresses)",
    envVar: null,
    freeQuota: null,
    pricePerThousand: 0,
    docUrl: "https://adresse.data.gouv.fr/api-doc/adresse",
  },
};

export default function IntegrationsPage() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [googleKeyConfigured, setGoogleKeyConfigured] = useState(null);

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      // Stats
      const { data } = await supabase.rpc("get_api_usage_stats");
      setStats(data || []);

      // Test si la clé Google Places est configurée côté serveur
      try {
        const res = await fetchWithAuth("/api/place?nom=test");
        const json = await res.json();
        setGoogleKeyConfigured(!json.note?.includes("non configurée"));
      } catch {
        setGoogleKeyConfigured(false);
      }
      setLoading(false);
    })();
  }, [auth.ready]);

  if (!auth.ready) return null;
  if (!auth.can("parametres_admin")) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap">
          <PageHead small title="Intégrations API" sub="Accès refusé" />
          <Panel><StateMsg>Réservé aux admins (droit <code>parametres_admin</code>).</StateMsg></Panel>
        </div>
      </div>
    );
  }

  const statsByApi = {};
  stats.forEach(s => { statsByApi[s.api_name] = s; });

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="ADMIN · PARAMÈTRES"
          icon="ti-plug"
          title="Intégrations"
          accent="API externes"
          sub="État de connexion + compteur de requêtes du mois en cours"
        />

        {loading ? (
          <Panel><StateMsg>Chargement…</StateMsg></Panel>
        ) : (
          <>
            <div style={{ display: "grid", gap: 16 }}>
              {Object.entries(API_META).map(([key, meta]) => {
                const s = statsByApi[key] || { calls_total: 0, calls_ok: 0, calls_error: 0, calls_no_key: 0, avg_duration_ms: 0 };
                const isGoogle = key === "google_places";
                const configured = isGoogle ? googleKeyConfigured : true;
                const overQuota = meta.freeQuota && s.calls_total > meta.freeQuota;
                const pctQuota = meta.freeQuota ? Math.min(100, (s.calls_total / meta.freeQuota) * 100) : 0;

                return (
                  <Panel key={key}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: `${meta.color}1f`, color: meta.color,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <i className={`ti ${meta.icon}`} style={{ fontSize: 24 }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <h3 style={{ margin: 0, fontSize: 15, color: "#142131" }}>{meta.label}</h3>
                          {configured ? (
                            <span style={{
                              background: "#dff5e0", color: "#2e6f33",
                              padding: "2px 8px", borderRadius: 10,
                              fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3,
                            }}>
                              <i className="ti ti-circle-check" /> CONNECTÉ
                            </span>
                          ) : (
                            <span style={{
                              background: "#fce5e0", color: "#7a1f15",
                              padding: "2px 8px", borderRadius: 10,
                              fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3,
                            }}>
                              <i className="ti ti-circle-x" /> NON CONFIGURÉ
                            </span>
                          )}
                          {meta.freeQuota === null && (
                            <span style={{
                              background: "#eef5fc", color: "#185FA5",
                              padding: "2px 8px", borderRadius: 10,
                              fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3,
                            }}>
                              GRATUIT
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 12.5, color: "#6c7a89", margin: "4px 0 10px" }}>{meta.description}</p>

                        {/* Compteur */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 10 }}>
                          <Stat label="Ce mois (total)" value={s.calls_total} color="#142131" big />
                          <Stat label="Succès" value={s.calls_ok} color="#5aa05a" />
                          <Stat label="Erreurs" value={s.calls_error} color="#c0392b" />
                          {meta.freeQuota === null ? (
                            <Stat label="Temps moy." value={s.avg_duration_ms ? `${s.avg_duration_ms}ms` : "—"} color="#7a6fb0" />
                          ) : (
                            <Stat label="Coût ce mois (est.)" value={overQuota
                              ? `~${(((s.calls_total - meta.freeQuota) * meta.pricePerThousand) / 1000).toFixed(2)}€`
                              : "Gratuit"
                            } color={overQuota ? "#c0392b" : "#5aa05a"} />
                          )}
                        </div>

                        {/* Barre quota */}
                        {meta.freeQuota && (
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6c7a89", marginBottom: 3 }}>
                              <span>Quota gratuit : {s.calls_total} / {meta.freeQuota.toLocaleString()}</span>
                              <span style={{ color: overQuota ? "#c0392b" : "#6c7a89" }}>{pctQuota.toFixed(0)}%</span>
                            </div>
                            <div style={{ height: 6, background: "#e3e9ee", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{
                                height: "100%",
                                width: `${Math.min(100, pctQuota)}%`,
                                background: overQuota ? "#c0392b" : pctQuota > 80 ? "#EF9F27" : meta.color,
                                transition: "width 0.4s ease",
                              }} />
                            </div>
                          </div>
                        )}

                        {/* Configuration */}
                        {meta.envVar && !configured && (
                          <div style={{
                            background: "#fff8ec",
                            border: "1px solid #f0d59f",
                            borderRadius: 8,
                            padding: "10px 12px",
                            fontSize: 12,
                            color: "#7a4f15",
                            marginBottom: 8,
                          }}>
                            <b><i className="ti ti-key" /> Configuration requise</b>
                            <ol style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                              <li>Récupère ta clé sur <a href={meta.docUrl} target="_blank" rel="noopener noreferrer" style={{ color: meta.color }}>{meta.label}</a></li>
                              <li>Sur Vercel : Settings → Environment Variables → Ajouter <code>{meta.envVar}=...</code></li>
                              <li>Redeploy pour activer</li>
                            </ol>
                          </div>
                        )}

                        <a href={meta.docUrl} target="_blank" rel="noopener noreferrer" style={{
                          fontSize: 11.5, color: meta.color, textDecoration: "none", fontWeight: 600,
                        }}>
                          <i className="ti ti-external-link" /> Documentation officielle
                        </a>
                      </div>
                    </div>
                  </Panel>
                );
              })}
            </div>

            <Panel style={{ marginTop: 16, background: "linear-gradient(135deg, #f3effa 0%, #fff 100%)", borderColor: "#d6c9ec" }}>
              <h3 style={{ margin: 0, fontSize: 14, color: "#5a4a90" }}>
                <i className="ti ti-info-circle" /> À propos du compteur
              </h3>
              <ul style={{ fontSize: 12, color: "#5a4a90", margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
                <li>Les compteurs sont remis à zéro le 1er du mois</li>
                <li>Le cache Next.js (24h) + cache localStorage (7j) divisent énormément les appels réels</li>
                <li>Les logs sont auto-nettoyés au bout de 90 jours</li>
                <li>Seuls les admins avec <code>parametres_admin</code> voient cette page</li>
              </ul>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color, big }) {
  return (
    <div style={{
      background: "#f4f7fa",
      borderRadius: 8,
      padding: "8px 12px",
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: 10.5, color: "#6c7a89", fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: big ? 22 : 16, fontWeight: 700, color, marginTop: 2, fontFamily: "Consolas, monospace" }}>
        {value === 0 || value === "0" ? "0" : value}
      </div>
    </div>
  );
}
