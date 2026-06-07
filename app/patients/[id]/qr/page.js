"use client";
// =============================================================
//  /patients/[id]/qr — Bracelet QR imprimable patient (0.58.82)
//  A4 ou format bracelet imprimable
//  Inclut : identité + QR + RGPD résumé + procédure
// =============================================================
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/useAuth";
import { fmtDate } from "../../../../lib/format";

export default function PatientQrPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const [patient, setPatient] = useState(null);
  const [chambre, setChambre] = useState(null);
  const [consent, setConsent] = useState(null);
  const [structureLogo, setStructureLogo] = useState(null);  /* 0.62.69 */
  const [loading, setLoading] = useState(true);
  const [format, setFormat] = useState("a4"); // "a4" | "bracelet"
  // 0.62.67 : choix type de code (QR ou code-barres horizontal)
  const [codeType, setCodeType] = useState("qr"); // "qr" | "barcode"

  const targetUrl = typeof window !== "undefined"
    ? `${window.location.origin}/scan/patient/${id}`
    : `/scan/patient/${id}`;
  const qrSize = format === "bracelet" ? 200 : 400;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&margin=10&format=png&data=${encodeURIComponent(targetUrl)}`;
  // 0.62.67 : code-barres horizontal pour bracelet (Code128 = supporte URL)
  // Utilise patient.numero_dossier si dispo, sinon target URL court
  const barcodeData = patient?.numero_dossier || id.slice(0, 16);
  const barcodeWidth = format === "bracelet" ? 320 : 500;
  const barcodeHeight = format === "bracelet" ? 60 : 80;
  const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(barcodeData)}&scale=2&height=${barcodeHeight === 60 ? 12 : 16}&includetext&textxalign=center&textsize=10`;

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      try {
        const { data } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
        setPatient(data);
        if (data?.chambre_id) {
          const { data: ch } = await supabase.from("chambres").select("*, services(nom, batiments(nom))").eq("id", data.chambre_id).maybeSingle();
          setChambre(ch);
        }
        // Statut RGPD
        try {
          const { data: cons } = await supabase
            .from("consentements_rgpd")
            .select("a_consenti, date_signature, version_texte")
            .eq("patient_id", id)
            .order("date_signature", { ascending: false })
            .limit(1)
            .maybeSingle();
          setConsent(cons);
        } catch {}
        // 0.62.69 : Logo structure pour bracelet/A4
        if (auth.structureId) {
          try {
            const { data: st } = await supabase.from("structures").select("logo_url").eq("id", auth.structureId).maybeSingle();
            setStructureLogo(st?.logo_url || null);
          } catch {}
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [id, auth.ready]);

  function printPage() { window.print(); }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#5a6878" }}>Chargement...</div>;
  if (!patient) return <div style={{ padding: 40, textAlign: "center", color: "#c0392b" }}>Patient introuvable</div>;

  const ageYears = patient.date_naissance
    ? Math.floor((Date.now() - new Date(patient.date_naissance).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <>
      <style jsx global>{`
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .print-page { padding: 0 !important; max-width: none !important; }
          @page { margin: 0.8cm; size: ${format === "bracelet" ? "A6 landscape" : "A4 portrait"}; }
        }
      `}</style>

      <div className="no-print" style={{ background: "#142131", padding: 14, display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 100, flexWrap: "wrap" }}>
        <button onClick={() => router.back()} style={{ background: "rgba(255,255,255,.12)", color: "#fff", border: "1px solid rgba(255,255,255,.22)", padding: "8px 14px", borderRadius: 8, fontFamily: "inherit", cursor: "pointer" }}>
          <i className="ti ti-arrow-left" /> Retour
        </button>
        <h1 style={{ margin: 0, fontSize: 16, color: "#fff", flex: 1 }}>QR Bracelet · {patient.nom} {patient.prenom || ""}</h1>
        <div style={{ display: "inline-flex", border: "1px solid rgba(255,255,255,.22)", borderRadius: 8, overflow: "hidden" }}>
          <button onClick={() => setFormat("a4")} style={{ background: format === "a4" ? "#7CC8C8" : "transparent", color: format === "a4" ? "#142131" : "#fff", border: "none", padding: "8px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
            <i className="ti ti-file-text" /> A4 fiche
          </button>
          <button onClick={() => setFormat("bracelet")} style={{ background: format === "bracelet" ? "#7CC8C8" : "transparent", color: format === "bracelet" ? "#142131" : "#fff", border: "none", padding: "8px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
            <i className="ti ti-id" /> Bracelet
          </button>
        </div>
        {/* 0.62.67 : Switcher type de code QR / Code-barres */}
        <div style={{ display: "inline-flex", border: "1px solid rgba(255,255,255,.22)", borderRadius: 8, overflow: "hidden" }}>
          <button onClick={() => setCodeType("qr")} style={{ background: codeType === "qr" ? "#EF9F27" : "transparent", color: codeType === "qr" ? "#142131" : "#fff", border: "none", padding: "8px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
            <i className="ti ti-qrcode" /> QR
          </button>
          <button onClick={() => setCodeType("barcode")} style={{ background: codeType === "barcode" ? "#EF9F27" : "transparent", color: codeType === "barcode" ? "#142131" : "#fff", border: "none", padding: "8px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
            <i className="ti ti-barcode" /> Code-barres
          </button>
        </div>
        <button onClick={printPage} style={{ background: "linear-gradient(135deg, #7CC8C8, #5db5b5)", color: "#142131", border: "none", padding: "10px 18px", borderRadius: 8, fontFamily: "inherit", fontWeight: 700, cursor: "pointer" }}>
          <i className="ti ti-printer" /> Imprimer
        </button>
      </div>

      <div className="print-page" style={{
        maxWidth: format === "bracelet" ? "14.8cm" : "21cm",  /* A6 paysage / A4 portrait */
        width: "100%",
        margin: "0 auto",
        padding: format === "bracelet" ? "0.5cm" : "1cm",
        background: "#fff",
        minHeight: "100vh",
        color: "#142131",
        boxSizing: "border-box",
      }}>
        {format === "a4" ? (
          // ===== FICHE A4 =====
          <div style={{ border: "4px solid #185FA5", borderRadius: 14, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, paddingBottom: 12, borderBottom: "2px solid #e3e9ee" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {structureLogo && (
                  <img src={structureLogo} alt="Logo" style={{ width: 54, height: 54, objectFit: "contain", borderRadius: 8 }} />
                )}
                <div>
                  <div style={{ fontSize: 11, letterSpacing: 3, color: "#5a6878", textTransform: "uppercase", fontWeight: 700 }}>AVEHO · BRACELET PATIENT</div>
                <h1 style={{ fontSize: 28, margin: "4px 0 2px", color: "#142131", fontWeight: 700, letterSpacing: -0.5 }}>
                  {patient.nom} <span style={{ fontWeight: 500 }}>{patient.prenom || ""}</span>
                </h1>
                {patient.civilite && <div style={{ fontSize: 12, color: "#5a6878" }}>{patient.civilite}{patient.nom_jeune_fille ? ` (née ${patient.nom_jeune_fille})` : ""}</div>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 16, fontFamily: "Consolas, monospace", color: "#185FA5", fontWeight: 700 }}>{patient.numero_dossier || "—"}</div>
                <div style={{ fontSize: 10, color: "#8a98a8", textTransform: "uppercase" }}>N° dossier</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, alignItems: "start" }}>
              {/* Colonne gauche : infos */}
              <div>
                <InfoRow label="Né(e) le" value={patient.date_naissance ? `${fmtDate(patient.date_naissance)}${ageYears ? ` (${ageYears} ans)` : ""}` : "—"} icon="ti-cake" color="#7a6fb0" />
                {patient.lieu_naissance && <InfoRow label="Lieu" value={patient.lieu_naissance} icon="ti-map-pin" />}
                {chambre && (
                  <InfoRow label="Chambre" value={
                    `${chambre.nom}${chambre.services?.nom ? ` · ${chambre.services.nom}` : ""}${chambre.services?.batiments?.nom ? ` · ${chambre.services.batiments.nom}` : ""}`
                  } icon="ti-bed" color="#EF9F27" />
                )}
                {chambre?.telephone && <InfoRow label="☎ Chambre" value={chambre.telephone} icon="ti-phone" color="#5aa05a" mono />}
                {patient.telephone && <InfoRow label="☎ Patient" value={patient.telephone} icon="ti-phone" color="#5aa05a" mono />}
                {patient.medecin_traitant && <InfoRow label="Médecin" value={`${patient.medecin_traitant}${patient.medecin_traitant_telephone ? ` · ${patient.medecin_traitant_telephone}` : ""}`} icon="ti-stethoscope" color="#7a6fb0" />}
                {(patient.contact_urgence_nom || patient.contact_urgence_telephone) && (
                  <InfoRow
                    label="🚨 Urgence"
                    value={`${patient.contact_urgence_nom || ""}${patient.contact_urgence_lien ? ` (${patient.contact_urgence_lien})` : ""}${patient.contact_urgence_telephone ? ` · ${patient.contact_urgence_telephone}` : ""}`}
                    icon="ti-alert-triangle"
                    color="#e35d5b"
                    bold
                  />
                )}
                {patient.gir && <InfoRow label="GIR" value={`${patient.gir} / 6`} icon="ti-heartbeat" color="#185FA5" />}
                {patient.mobilite && <InfoRow label="Mobilité" value={patient.mobilite} icon="ti-walk" />}
                {patient.allergies && (
                  <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(227,93,91,.10)", border: "1px solid #e35d5b", borderRadius: 6 }}>
                    <div style={{ fontSize: 10, color: "#c0392b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
                      <i className="ti ti-alert-octagon" /> ⚠ ALLERGIES
                    </div>
                    <div style={{ fontSize: 13, color: "#142131", fontWeight: 600 }}>{patient.allergies}</div>
                  </div>
                )}
                {patient.regime_alimentaire && (
                  <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(239,159,39,.10)", border: "1px solid #EF9F27", borderRadius: 6, fontSize: 12 }}>
                    <i className="ti ti-tools-kitchen-2" style={{ color: "#EF9F27" }} /> <b>Régime :</b> {patient.regime_alimentaire}
                  </div>
                )}
              </div>

              {/* Colonne droite : QR ou code-barres + RGPD */}
              <div style={{ textAlign: "center" }}>
                <div style={{ background: "#fff", padding: 10, display: "inline-block", borderRadius: 8, border: "1px solid #e3e9ee" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {codeType === "qr" ? (
                    <img src={qrUrl} alt={`QR du patient ${patient.nom}`} width={qrSize} height={qrSize} style={{ display: "block" }} />
                  ) : (
                    <img src={barcodeUrl} alt={`Code-barres ${patient.nom}`} style={{ maxWidth: 260, height: "auto", display: "block" }} />
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: "#5a6878", marginTop: 8, fontWeight: 600 }}>
                  <i className={`ti ti-${codeType === "qr" ? "scan" : "barcode"}`} /> {codeType === "qr" ? "Scannez pour la fiche" : "Code-barres patient"}
                </div>
                <div style={{ fontSize: 9, color: "#8a98a8", marginTop: 4, fontFamily: "Consolas, monospace", wordBreak: "break-all" }}>
                  {targetUrl}
                </div>

                {/* RGPD badge */}
                <div style={{ marginTop: 14, padding: "8px 10px", borderRadius: 6,
                  background: consent?.a_consenti ? "rgba(90,160,90,.10)" : "rgba(239,159,39,.10)",
                  border: `1px solid ${consent?.a_consenti ? "#5aa05a" : "#EF9F27"}`,
                }}>
                  <div style={{ fontSize: 10, color: consent?.a_consenti ? "#5aa05a" : "#EF9F27", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
                    <i className={`ti ${consent?.a_consenti ? "ti-shield-check" : "ti-shield-off"}`} /> RGPD
                  </div>
                  <div style={{ fontSize: 11, color: "#142131" }}>
                    {consent?.a_consenti
                      ? `Consentement signé${consent.date_signature ? " le " + fmtDate(consent.date_signature) : ""}`
                      : "Consentement à recueillir"}
                  </div>
                </div>
              </div>
            </div>

            {/* Procédure */}
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px dashed #cfd8e0" }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#5a6878", textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>
                <i className="ti ti-list-check" /> Procédure scan
              </div>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "#142131", lineHeight: 1.6 }}>
                <li>Vérifier l'<b>identité</b> du patient sur ce bracelet avant tout acte</li>
                <li>Scanner le QR avec l'app Aveho mobile pour ouvrir la fiche complète</li>
                <li>Pour signaler un problème, scanner puis cliquer 🛠 Signaler</li>
                <li>Pour matériel/transfert/inventaire : passer par <b>/mobile</b></li>
                <li>RGPD : ce bracelet contient des données sensibles, le détruire à la sortie</li>
              </ol>
            </div>

            <div style={{ marginTop: 14, fontSize: 9, color: "#8a98a8", fontStyle: "italic", textAlign: "center", borderTop: "1px solid #f0f3f6", paddingTop: 8 }}>
              Aveho Espace Collectivité · Bracelet généré le {new Date().toLocaleString("fr-FR")} · Conformément RGPD/HDS, ce document doit être détruit après usage
            </div>
          </div>
        ) : (
          // ===== BRACELET A6 PAYSAGE (0.62.67 : QR ou code-barres horizontal) =====
          codeType === "qr" ? (
            // QR : layout horizontal infos + QR
            <div style={{ border: "3px solid #185FA5", borderRadius: 10, padding: 14, display: "flex", gap: 14, alignItems: "center", boxSizing: "border-box" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {structureLogo && <img src={structureLogo} alt="L" style={{ width: 22, height: 22, objectFit: "contain" }} />}
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#5a6878", textTransform: "uppercase", fontWeight: 700 }}>BRACELET</div>
                </div>
                <h1 style={{ fontSize: 18, margin: "4px 0 2px", color: "#142131", fontWeight: 700, lineHeight: 1 }}>
                  {patient.nom}
                </h1>
                <div style={{ fontSize: 14, color: "#142131" }}>{patient.prenom || ""}</div>
                {patient.date_naissance && <div style={{ fontSize: 10, color: "#5a6878", marginTop: 2 }}>{fmtDate(patient.date_naissance)}{ageYears ? ` · ${ageYears}a` : ""}</div>}
                {chambre && <div style={{ fontSize: 11, color: "#EF9F27", fontWeight: 700, marginTop: 2 }}><i className="ti ti-bed" /> {chambre.nom}</div>}
                {patient.numero_dossier && <div style={{ fontSize: 10, color: "#185FA5", fontFamily: "Consolas, monospace", marginTop: 2 }}>{patient.numero_dossier}</div>}
                {patient.allergies && (
                  <div style={{ marginTop: 4, padding: "2px 6px", background: "rgba(227,93,91,.12)", border: "1px solid #e35d5b", borderRadius: 4, fontSize: 9, color: "#c0392b", fontWeight: 700 }}>
                    ⚠ {patient.allergies.slice(0, 50)}
                  </div>
                )}
                {patient.gir && <div style={{ fontSize: 10, color: "#5a6878", marginTop: 2 }}>GIR {patient.gir}</div>}
              </div>
              <div style={{ textAlign: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="QR" width={180} height={180} style={{ display: "block", border: "1px solid #e3e9ee" }} />
                <div style={{ fontSize: 8, color: consent?.a_consenti ? "#5aa05a" : "#EF9F27", fontWeight: 700, marginTop: 2 }}>
                  {consent?.a_consenti ? "✓ RGPD signé" : "⚠ RGPD à recueillir"}
                </div>
              </div>
            </div>
          ) : (
            // 0.62.67 : CODE-BARRES HORIZONTAL — layout vertical infos en haut, barcode en bas en longueur
            <div style={{ border: "3px solid #185FA5", borderRadius: 10, padding: 14, boxSizing: "border-box" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {structureLogo && <img src={structureLogo} alt="L" style={{ width: 22, height: 22, objectFit: "contain" }} />}
                    <div style={{ fontSize: 9, letterSpacing: 2, color: "#5a6878", textTransform: "uppercase", fontWeight: 700 }}>BRACELET</div>
                  </div>
                  <h1 style={{ fontSize: 20, margin: "4px 0 2px", color: "#142131", fontWeight: 700, lineHeight: 1 }}>
                    {patient.nom} <span style={{ fontWeight: 500 }}>{patient.prenom || ""}</span>
                  </h1>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
                    {patient.date_naissance && <span style={{ fontSize: 10.5, color: "#5a6878" }}>{fmtDate(patient.date_naissance)}{ageYears ? ` · ${ageYears}a` : ""}</span>}
                    {chambre && <span style={{ fontSize: 10.5, color: "#EF9F27", fontWeight: 700 }}><i className="ti ti-bed" /> {chambre.nom}</span>}
                    {patient.gir && <span style={{ fontSize: 10.5, color: "#5a6878" }}>GIR {patient.gir}</span>}
                  </div>
                </div>
                {patient.numero_dossier && (
                  <div style={{ fontSize: 11, fontFamily: "Consolas, monospace", color: "#185FA5", fontWeight: 700, textAlign: "right" }}>
                    {patient.numero_dossier}
                  </div>
                )}
              </div>
              {patient.allergies && (
                <div style={{ marginBottom: 6, padding: "3px 8px", background: "rgba(227,93,91,.12)", border: "1px solid #e35d5b", borderRadius: 4, fontSize: 10, color: "#c0392b", fontWeight: 700 }}>
                  ⚠ ALLERGIES : {patient.allergies.slice(0, 80)}
                </div>
              )}
              {/* Code-barres horizontal en bas, plein largeur */}
              <div style={{ marginTop: 8, textAlign: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={barcodeUrl} alt="Code-barres" style={{ maxWidth: "100%", height: "auto", display: "block", margin: "0 auto" }} />
                <div style={{ fontSize: 8, color: consent?.a_consenti ? "#5aa05a" : "#EF9F27", fontWeight: 700, marginTop: 2 }}>
                  {consent?.a_consenti ? "✓ RGPD signé" : "⚠ RGPD à recueillir"} · Scan via l'app Aveho mobile
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </>
  );
}

function InfoRow({ label, value, icon, color = "#185FA5", mono, bold }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "5px 0", fontSize: 12.5, alignItems: "baseline" }}>
      <div style={{ minWidth: 90, color: "#8a98a8", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>
        <i className={`ti ${icon}`} style={{ color, marginRight: 4 }} /> {label}
      </div>
      <div style={{ flex: 1, color: "#142131", fontFamily: mono ? "Consolas, monospace" : "inherit", fontWeight: bold ? 700 : 500 }}>{value}</div>
    </div>
  );
}
