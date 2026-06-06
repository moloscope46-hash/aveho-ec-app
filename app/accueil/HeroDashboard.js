"use client";
// =============================================================
//  HeroDashboard — Hero section premium pour l'Accueil (0.58.0)
//
//  Remplace l'ancienne section KPIs + à traiter par un design
//  ultra moderne avec :
//   - Hero gradient header avec greeting personnalisé
//   - Grid de KpiCards avec sparklines + animations count-up
//   - Section "À traiter" en grand format avec cards interactives
//   - Empty states élégants
//
//  Reçoit les data du parent (page.js) → reste sans state propre.
// =============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KpiCard, MetricCard, EmptyState, SkeletonGrid, ConicCard } from "../components/ui-premium";
import { fmtEur } from "../../lib/format";

/**
 * Petit helper pour le greeting selon l'heure.
 */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 6)  return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

export default function HeroDashboard({ auth, kpis, atraiter, loading, onNavigate }) {
  const router = useRouter();
  const greet = getGreeting();
  const userName = auth?.user?.user_metadata?.nom_affiche
    || auth?.user?.email?.split("@")[0]
    || "";

  const go = onNavigate || ((path) => router.push(path));

  // Total "à traiter" pour le badge
  const totalAtraiter = (atraiter?.di || 0) + (atraiter?.achats || 0) +
                        (atraiter?.signalements || 0) + (atraiter?.renouv || 0) +
                        (atraiter?.maint || 0);

  return (
    <div style={{ marginBottom: 28 }}>

      {/* ====================================================
          HERO HEADER : greeting + status global
      ==================================================== */}
      <div style={{
        position: "relative",
        background: "var(--av-grad-hero)",
        borderRadius: "var(--av-r-2xl)",
        padding: "28px 30px",
        marginBottom: 24,
        overflow: "hidden",
        boxShadow: "var(--av-shadow-xl)",
        animation: "av-fade-in 0.5s var(--av-ease-out)",
      }}>
        {/* Mesh gradient decorative */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "var(--av-mesh-navy)",
          opacity: 0.6,
          pointerEvents: "none",
        }} />

        {/* Decorative shapes */}
        <div style={{
          position: "absolute",
          top: -50, right: -50,
          width: 200, height: 200,
          background: "radial-gradient(circle, rgba(124,200,200,0.3) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute",
          bottom: -30, left: 200,
          width: 150, height: 150,
          background: "radial-gradient(circle, rgba(201,134,127,0.2) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
        }} />

        <div style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 20,
          flexWrap: "wrap",
        }}>
          <div style={{ flex: "1 1 300px" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(124, 200, 200, 0.18)",
              color: "var(--av-teal)",
              border: "1px solid rgba(124, 200, 200, 0.3)",
              padding: "5px 13px",
              borderRadius: "var(--av-r-full)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.5px",
              marginBottom: 12,
            }}>
              <span style={{
                width: 6, height: 6,
                borderRadius: "50%",
                background: "var(--av-teal)",
                boxShadow: "0 0 0 0 rgba(124, 200, 200, 0.5)",
                animation: "av-pulse-ring 2s ease-out infinite",
              }} />
              ESPACE COLLECTIVITÉ
            </div>

            <h1 style={{
              fontSize: 30,
              fontWeight: 700,
              color: "#fff",
              margin: "0 0 8px",
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
            }}>
              {greet}{userName && <span style={{ color: "var(--av-teal)" }}>, {userName}</span>}
            </h1>

            <p style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.7)",
              margin: 0,
              lineHeight: 1.5,
            }}>
              {totalAtraiter > 0
                ? <>Tu as <strong style={{ color: "var(--av-teal)" }}>{totalAtraiter} élément{totalAtraiter > 1 ? "s" : ""}</strong> à traiter aujourd'hui.</>
                : <>Tout est à jour. Profite de ta journée 🌿</>
              }
            </p>
          </div>

          {/* Quick actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => go("/interventions/kanban")}
              style={{
                padding: "10px 18px",
                background: "rgba(255,255,255,0.95)",
                color: "var(--av-navy)",
                border: "none",
                borderRadius: "var(--av-r-md)",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "transform 150ms var(--av-ease-out)",
                boxShadow: "var(--av-shadow-md)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <i className="ti ti-layout-kanban" style={{ fontSize: 15 }} />
              Kanban
            </button>
            <button
              onClick={() => go("/statistiques")}
              style={{
                padding: "10px 18px",
                background: "rgba(255,255,255,0.10)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: "var(--av-r-md)",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                backdropFilter: "blur(10px)",
                transition: "background 150ms",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.18)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.10)"; }}
            >
              <i className="ti ti-chart-line" style={{ fontSize: 15 }} />
              Statistiques
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================
          ATRAITER : section opérationnelle prioritaire
      ==================================================== */}
      {(totalAtraiter > 0 || loading) && (
        <section style={{ marginBottom: 28 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 28, height: 28,
                background: "var(--av-grad-warning)",
                borderRadius: "var(--av-r-md)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "var(--av-shadow-amber)",
              }}>
                <i className="ti ti-bolt" style={{ color: "#fff", fontSize: 16 }} />
              </div>
              <h2 style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#fff",
                margin: 0,
                letterSpacing: "-0.01em",
              }}>
                À traiter en priorité
                {totalAtraiter > 0 && (
                  <span style={{
                    marginLeft: 8,
                    padding: "2px 10px",
                    background: "var(--av-terra)",
                    color: "#fff",
                    borderRadius: "var(--av-r-full)",
                    fontSize: 12,
                    fontWeight: 700,
                  }}>{totalAtraiter}</span>
                )}
              </h2>
            </div>
          </div>

          {loading ? (
            <SkeletonGrid count={5} cols={5} />
          ) : (
            <div className="av-stagger" style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
            }}>
              {atraiter.di > 0 && (
                /* 0.58.22 : ConicCard variant aurora pour le KPI le plus urgent (DI à traiter) */
                <ConicCard
                  label="DI à traiter"
                  value={atraiter.di}
                  icon="ti-tools"
                  variant="aurora"
                  speed="normal"
                  onClick={() => go("/interventions/kanban")}
                />
              )}
              {atraiter.achats > 0 && (
                /* 0.58.22 : ConicCard variant amber pour les achats à valider */
                <ConicCard
                  label="Achats à valider"
                  value={atraiter.achats}
                  icon="ti-shopping-cart"
                  variant="amber"
                  speed="normal"
                  onClick={() => go("/achats")}
                />
              )}
              {atraiter.signalements > 0 && (
                /* 0.58.23 : ConicCard variant=terra pour Signalements (urgent visuel) */
                <ConicCard
                  label="Signalements"
                  value={atraiter.signalements}
                  icon="ti-alert-triangle"
                  variant="terra"
                  speed="fast"
                  onClick={() => go("/signalements")}
                />
              )}
              {atraiter.renouv > 0 && (
                /* 0.58.23 : ConicCard variant=violet pour RGPD à renouveler */
                <ConicCard
                  label="RGPD à renouveler"
                  value={atraiter.renouv}
                  icon="ti-shield-check"
                  variant="violet"
                  speed="normal"
                  onClick={() => go("/statistiques-rgpd")}
                />
              )}
              {atraiter.maint > 0 && (
                <KpiCard
                  label="Maintenances"
                  value={atraiter.maint}
                  icon="ti-settings-cog"
                  variant="blue"
                  onClick={() => go("/maintenance")}
                />
              )}
            </div>
          )}
        </section>
      )}

      {/* ====================================================
          KPIS commerciaux (panneau dégradé)
          0.58.49 : rendu inconditionnel — tuiles toujours visibles
          0.58.50 : valeurs safe (kpis null ou non chargé → 0 partout)
          0.58.52 : ÉLIMINATION du skeleton — cards toujours visibles immédiatement
            avec valeurs 0 par défaut. Le useState initialise kpis à
            { promos:0, commandes:0, enCours:0, aRegler:0 } donc kpis n'est JAMAIS null.
      ==================================================== */}
      <section style={{ marginTop: 28 }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
        }}>
          <div style={{
            width: 28, height: 28,
            background: "var(--av-grad-teal)",
            borderRadius: "var(--av-r-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--av-shadow-teal)",
          }}>
            <i className="ti ti-chart-pie" style={{ color: "#fff", fontSize: 16 }} />
          </div>
          <h2 style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#fff",
            margin: 0,
            letterSpacing: "-0.01em",
          }}>
            Vue d'ensemble
          </h2>
        </div>

        {/* 0.58.52 : cards TOUJOURS rendues, jamais de skeleton.
            kpis a toujours des valeurs (initialisé en useState). */}
        <div className="av-stagger" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}>
          <KpiCard
            label="Promotions actives"
            value={kpis?.promos ?? 0}
            icon="ti-discount-2"
            variant="terra"
            onClick={() => go("/promotions")}
          />
          <KpiCard
            label="Commandes passées"
            value={kpis?.commandes ?? 0}
            icon="ti-truck-delivery"
            variant="teal"
            onClick={() => go("/commandes")}
          />
          <KpiCard
            label="En cours"
            value={kpis?.enCours ?? 0}
            icon="ti-progress-bolt"
            variant="blue"
            onClick={() => go("/commandes")}
          />
          <KpiCard
            label="À régler"
            value={fmtEur(kpis?.aRegler ?? 0)}
            icon="ti-currency-euro"
            variant="navy"
            onClick={() => go("/commandes")}
          />
        </div>
      </section>
    </div>
  );
}
