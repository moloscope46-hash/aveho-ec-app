"use client";
// =============================================================
//  app/v056/page.js (Alpha 0.56.0)
//
//  Page de récap "Aveho EC 0.56" — milestone du cycle 0.55.X
//  Affiche les piliers de fonctionnalités atteints, KPI d'effort,
//  et un parcours de découverte pour les nouveaux users.
// =============================================================

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel } from "../ui";

const PILIERS = [
  {
    titre: "Gestion matériel & patients",
    icon: "ti-armchair-2", color: "#142131",
    items: [
      "Catalogue matériel + parc par établissement",
      "Affectation matériel ↔ patient avec historique",
      "Étiquettes personnalisables",
      "Demandes d'intervention (DI) avec workflow",
      "PPC, perfusion, VPH, nutrition entérale",
    ],
  },
  {
    titre: "Fiche patient niveau bulletin de situation",
    icon: "ti-user-circle", color: "#7a6fb0",
    items: [
      "60+ champs : identité, sécu, mutuelle, ALD/C2S/AME",
      "6 onglets d'édition (identité, sécu, adresses, contacts, médecin, audit)",
      "1-N adresses de livraison par patient",
      "Personne de confiance + contact d'urgence",
      "Audit complet (source création, OCR brut)",
    ],
  },
  {
    titre: "OCR & IA Claude Vision",
    icon: "ti-wand", color: "#5aa05a",
    items: [
      "Création patient depuis photo de bulletin (40+ champs en 10s)",
      "Auto-link caisse via code_organisme",
      "Auto-link mutuelle via numero_amc",
      "OCR générique pour tout document (prescriptions, factures)",
      "Architecture prête pour QR Vitale + codes-barres GS1/UDI",
    ],
  },
  {
    titre: "Géolocalisation BAN INSEE",
    icon: "ti-map-pin", color: "#185FA5",
    items: [
      "Autocomplete d'adresse (Base Adresse Nationale)",
      "Auto-fill cp + ville + code INSEE + lat/lng en 1 clic",
      "Intégré dans patients + édition complète",
      "Lieu de naissance avec INSEE commune",
      "Carte interactive multi-couches (RPPS + FINESS + SIRENE)",
    ],
  },
  {
    titre: "Référentiels santé intégrés",
    icon: "ti-database", color: "#EF9F27",
    items: [
      "105 caisses CPAM/CGSS/régimes spéciaux",
      "44 mutuelles avec n° AMC",
      "Recherche RPPS via API ANS officielle",
      "Plan B : dump RPPS local (fallback automatique)",
      "FINESS, SIRENE, recherche libre carte",
    ],
  },
  {
    titre: "Administration & diagnostic",
    icon: "ti-shield-cog", color: "#c0392b",
    items: [
      "Système d'invitation avec diagnostic mail Resend",
      "Diagnostic API RPPS (4 tests parallèles)",
      "Gestion utilisateurs + rôles + permissions",
      "Audit log toutes actions sensibles",
      "Anti-doublon établissements + groupements",
    ],
  },
  {
    titre: "Robustesse & performance",
    icon: "ti-bolt", color: "#7CC8C8",
    items: [
      "Service Worker offline-ready (66 bumps consécutifs)",
      "Toutes routes API avec maxDuration + AbortController",
      "Plus jamais de 502 — format unifié {ok, ...}",
      "RLS Supabase sur tables sensibles",
      "SafeWrite : mode hors-ligne avec queue de sync",
    ],
  },
  {
    titre: "Tests & qualité",
    icon: "ti-test-pipe", color: "#5a8f8f",
    items: [
      "1642 tests Vitest verts",
      "Build Next.js sans warnings",
      "Smoke tests intégrés dans le changelog",
      "0 console.log/warn résiduels",
      "SQL 100% idempotent (IF NOT EXISTS partout)",
    ],
  },
];

const PARCOURS = [
  { lbl: "Créer un patient depuis un bulletin", icon: "ti-file-scan", color: "#5aa05a", to: "/scan/bulletin-situation" },
  { lbl: "Voir la liste des patients", icon: "ti-users", color: "#7a6fb0", to: "/patients" },
  { lbl: "Explorer la carte multi-couches", icon: "ti-map", color: "#185FA5", to: "/carte" },
  { lbl: "Voir l'historique des versions", icon: "ti-history", color: "#EF9F27", to: "/changelog" },
];

export default function V056Page() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [kpis, setKpis] = useState(null);

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      const [c, m, p, e] = await Promise.all([
        supabase.from("caisses_assurance_maladie").select("*", { count: "exact", head: true }),
        supabase.from("mutuelles").select("*", { count: "exact", head: true }),
        supabase.from("patients").select("*", { count: "exact", head: true }),
        supabase.from("etablissements").select("*", { count: "exact", head: true }),
      ]);
      setKpis({
        caisses: c.count || 0,
        mutuelles: m.count || 0,
        patients: p.count || 0,
        etablissements: e.count || 0,
      });
    })();
  }, [auth.ready]);

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        {/* En-tête milestone */}
        <div style={{
          background: "linear-gradient(135deg, #142131 0%, #185FA5 40%, #5aa05a 100%)",
          color: "#fff", borderRadius: 16, padding: "32px 28px",
          marginBottom: 18, boxShadow: "0 12px 32px rgba(20,33,49,.28)",
        }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#cfe4f5", fontWeight: 700, marginBottom: 6 }}>
            MILESTONE · CYCLE 0.55.X TERMINÉ
          </div>
          <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: 2 }}>
            a<span style={{ color: "#7CC8C8" }}>v</span>eho EC <span style={{ fontSize: 20, color: "#7CC8C8" }}>0.56</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "14px 0 4px" }}>
            56 versions de stabilisation + features
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: 13.5, color: "#cfe4f5", lineHeight: 1.6, maxWidth: 640 }}>
            Le cycle 0.55 a transformé un MVP en plateforme robuste : OCR IA, géolocalisation BAN, référentiels santé,
            fallback RPPS, anti-doublon établissements, diagnostic Resend, 6 onglets fiche patient, 1628 tests Vitest verts.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 18, fontSize: 12, color: "#cfe4f5" }}>
            <span><b style={{ color: "#fff" }}>56</b> versions dans le cycle 0.55</span>
            <span>·</span>
            <span><b style={{ color: "#fff" }}>1642</b> tests verts</span>
            <span>·</span>
            <span><b style={{ color: "#fff" }}>66</b> bumps SW consécutifs</span>
            <span>·</span>
            <span><b style={{ color: "#fff" }}>0</b> erreur de build</span>
          </div>
        </div>

        {/* KPI live de la base */}
        {kpis && (
          <Panel style={{ marginBottom: 14 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 13 }}>
              <i className="ti ti-chart-arcs" /> Base de données — chiffres en temps réel
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              <KpiCard icon="ti-shield-check" color="#185FA5" lbl="Caisses" val={kpis.caisses} />
              <KpiCard icon="ti-heart-handshake" color="#7a6fb0" lbl="Mutuelles" val={kpis.mutuelles} />
              <KpiCard icon="ti-users" color="#5aa05a" lbl="Patients" val={kpis.patients} />
              <KpiCard icon="ti-building-hospital" color="#EF9F27" lbl="Établissements" val={kpis.etablissements} />
            </div>
          </Panel>
        )}

        {/* 8 piliers */}
        <PageHead
          eyebrow="LES 8 PILIERS"
          icon="ti-stars"
          title="Ce qu'Aveho EC sait faire"
          sub="Récap des grands chantiers menés sur le cycle 0.55.X"
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 18 }}>
          {PILIERS.map((p, i) => (
            <Panel key={i} style={{ borderLeft: `4px solid ${p.color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{
                  background: `${p.color}15`, color: p.color,
                  width: 36, height: 36, borderRadius: 10,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                }}>
                  <i className={`ti ${p.icon}`} />
                </div>
                <h3 style={{ margin: 0, fontSize: 14, color: "#142131" }}>{p.titre}</h3>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#2a3a48", lineHeight: 1.7 }}>
                {p.items.map((it, j) => <li key={j}>{it}</li>)}
              </ul>
            </Panel>
          ))}
        </div>

        {/* Parcours de découverte */}
        <PageHead
          eyebrow="PAR OÙ COMMENCER"
          icon="ti-route"
          title="Parcours de découverte"
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 18 }}>
          {PARCOURS.map((p, i) => (
            <a key={i} href={p.to} style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "#fff", border: `2px solid ${p.color}30`,
              borderRadius: 12, padding: "14px 16px",
              textDecoration: "none", color: "#142131",
              transition: "transform .15s, box-shadow .15s, border-color .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = `0 6px 16px ${p.color}30`;
              e.currentTarget.style.borderColor = p.color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = `${p.color}30`;
            }}>
              <div style={{
                background: `${p.color}15`, color: p.color,
                width: 42, height: 42, borderRadius: 10,
                display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              }}>
                <i className={`ti ${p.icon}`} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{p.lbl}</div>
                <div style={{ fontSize: 11, color: "#6c7a89", fontFamily: "Consolas,monospace" }}>{p.to}</div>
              </div>
              <i className="ti ti-arrow-right" style={{ color: p.color, fontSize: 18 }} />
            </a>
          ))}
        </div>

        {/* La suite */}
        <Panel style={{ background: "linear-gradient(135deg, #fff8ec, #fff)", borderColor: "#f0d59f" }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14, color: "#7a4f15" }}>
            <i className="ti ti-arrow-big-right" /> Et après ? Cycle 0.56.X
          </h3>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#7a4f15", lineHeight: 1.7 }}>
            <li><b>Storage Supabase</b> : archivage des images de bulletins scannés (bs_file_url)</li>
            <li><b>Scan QR fonctionnel</b> : html5-qrcode pour Vitale, étiquettes Aveho, RFID matériel</li>
            <li><b>Scan code-barre</b> : ZXing + parser GS1/UDI pour matériel médical (n° série, lot, péremption)</li>
            <li><b>OCR prescriptions</b> : extraction médicaments + posologie + création prescription patient</li>
            <li><b>Sync Google reviews</b> Edge Function cron pour les avis établissements</li>
            <li><b>Page audit /admin/doublons-forces</b> avec vue v_doublons_forces</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function KpiCard({ icon, color, lbl, val }) {
  return (
    <div style={{
      background: "#f4f7fa", borderRadius: 8, padding: "10px 12px",
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700 }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 13 }} /> {lbl}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 4, fontFamily: "Consolas, monospace" }}>
        {Number(val).toLocaleString()}
      </div>
    </div>
  );
}
