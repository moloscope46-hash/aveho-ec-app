"use client";
// =============================================================
//  app/scan/bulletin-situation/page.js (Alpha 0.55.46 placeholder)
//
//  Page principale OCR / création patient depuis bulletin de situation.
//  Cette version est un placeholder — l'OCR complet arrive en 0.55.47.
//
//  Structure prévue :
//   1. Drop zone / upload photo bulletin
//   2. OCR (Tesseract.js ou Claude Vision via Anthropic API)
//   3. Pré-remplissage formulaire patient
//   4. Validation + création patient avec lien vers BS scanné
// =============================================================

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, StateMsg } from "../../ui";

export default function ScanBulletinSituationPage() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [stats, setStats] = useState({ caisses: 0, mutuelles: 0 });

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      const { count: nbCaisses } = await supabase.from("caisses_assurance_maladie")
        .select("*", { count: "exact", head: true });
      const { count: nbMutuelles } = await supabase.from("mutuelles")
        .select("*", { count: "exact", head: true });
      setStats({ caisses: nbCaisses || 0, mutuelles: nbMutuelles || 0 });
    })();
  }, [auth.ready]);

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="OUTILS SCAN · OCR"
          icon="ti-file-scan"
          title="Créer un patient"
          accent="depuis un bulletin de situation"
          sub="Scan + OCR automatique pour pré-remplir l'identité, sécu, mutuelle, adresse, contacts"
        />

        <Panel style={{ background: "linear-gradient(135deg, #eef9ef 0%, #fff 100%)", borderColor: "#bfe2bf" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <div style={{
              background: "#5aa05a", color: "#fff",
              width: 52, height: 52, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28,
            }}>
              <i className="ti ti-file-scan" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, color: "#142131" }}>
                Bientôt : OCR du bulletin de situation
              </h3>
              <p style={{ fontSize: 12.5, color: "#6c7a89", margin: "4px 0 0" }}>
                Photo ou PDF du bulletin → patient créé automatiquement avec toutes les infos
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            <Step n={1} title="Photographie ou glisse le bulletin">
              Smartphone, scanner, ou fichier PDF/JPG. Idéal en bonne lumière, sans reflets.
            </Step>
            <Step n={2} title="Reconnaissance automatique (OCR)">
              Identifie nom, prénom, n° sécu, caisse, date de naissance, adresse, mutuelle, médecin traitant…
            </Step>
            <Step n={3} title="Vérification & complément">
              Tu valides champ par champ. Le système suggère les caisses/mutuelles correspondantes depuis nos référentiels.
            </Step>
            <Step n={4} title="Création + archivage">
              Patient créé, bulletin scanné archivé (lien <code>bs_file_url</code>), texte OCR conservé pour audit.
            </Step>
          </div>
        </Panel>

        <Panel style={{ marginTop: 14 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14, color: "#142131" }}>
            <i className="ti ti-database" /> Référentiels disponibles
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <StatBox label="Caisses (CPAM/MSA/CGSS)" value={stats.caisses} color="#185FA5" icon="ti-shield-check" />
            <StatBox label="Mutuelles / AMC" value={stats.mutuelles} color="#7a6fb0" icon="ti-heart-handshake" />
            <StatBox label="Établissements FINESS" value="540 000+" color="#5aa05a" icon="ti-building-hospital" />
            <StatBox label="Praticiens RPPS" value="1,7M" color="#EF9F27" icon="ti-stethoscope" />
          </div>
          <div style={{ marginTop: 10, padding: "8px 12px", background: "#f4f7fa", borderRadius: 8, fontSize: 11.5, color: "#6c7a89" }}>
            <i className="ti ti-info-circle" /> Ces référentiels sont déjà connectés et peuvent être interrogés depuis la fiche patient
            (recherche live de la caisse et de la mutuelle par nom ou n° AMC).
          </div>
        </Panel>

        <Panel style={{ marginTop: 14, background: "#fff8ec", borderColor: "#f0d59f" }}>
          <h3 style={{ margin: "0 0 6px", fontSize: 13.5, color: "#7a4f15" }}>
            <i className="ti ti-tools" /> Stack technique prévue (0.55.47)
          </h3>
          <ul style={{ fontSize: 12, color: "#7a4f15", margin: "0 0 0 18px", lineHeight: 1.7 }}>
            <li><b>Capture</b> : input file + caméra (getUserMedia) pour smartphone</li>
            <li><b>OCR</b> : Tesseract.js (client-side gratuit) ou Claude Vision (API Anthropic, plus précis)</li>
            <li><b>Extraction</b> : regex sur n° sécu (15 chiffres), code organisme (9 chiffres), n° AMC (8 chiffres), date naissance</li>
            <li><b>Référentiels</b> : auto-suggestion caisse via code, mutuelle via AMC</li>
            <li><b>Archivage</b> : storage Supabase bucket + bs_file_url sur patient</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Step({ n, title, children }) {
  return (
    <div style={{
      display: "flex", gap: 12, padding: "10px 12px",
      background: "#fff", border: "1px solid #e3e9ee", borderRadius: 8,
    }}>
      <div style={{
        background: "#5aa05a", color: "#fff",
        width: 28, height: 28, borderRadius: 14,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: 13, flexShrink: 0,
      }}>{n}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#142131" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#6c7a89", marginTop: 2 }}>{children}</div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color, icon }) {
  return (
    <div style={{
      background: "#f4f7fa",
      borderRadius: 8,
      padding: "10px 12px",
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "#6c7a89", fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 12 }} /> {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 4, fontFamily: "Consolas, monospace" }}>
        {value}
      </div>
    </div>
  );
}
