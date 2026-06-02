"use client";
// =============================================================
//  app/partenaires-rpps/page.js (Alpha 0.55.30)
//
//  Gestion des partenaires RPPS — médecins prescripteurs, IDE
//  libéraux qui interviennent, etc. Contacts NON-utilisateurs
//  de l'app (pas de compte).
//
//  Données enrichies depuis l'API FHIR ANS (recherche RPPS).
// =============================================================

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg} from "../ui";
import { KpiRow } from "../kpis";
import RppsAutocomplete from "../RppsAutocomplete";
import Modal from "../components/Modal";
import ContactActions from "../components/ContactActions";
import { dialogs } from "../dialogs";
import { logger } from "../../lib/logger";

export default function PartenairesRpps() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("all"); // all | prescripteur | intervenant
  const [rppsSearchOpen, setRppsSearchOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(null); // partenaire en édition

  async function loadAll() {
    if (!auth.ready || !auth.structureId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("partenaires_rpps")
      .select("*")
      .eq("structure_id", auth.structureId)
      .eq("archive", false)
      .order("nom");
    if (error) {
      logger.warn("[partenaires-rpps] load:", error.message);
    }
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, [auth.ready, auth.structureId]);

  async function addPartenaireFromRpps(p) {
    if (!auth.structureId) return;
    try {
      // Check si déjà existant (même RPPS dans cette structure)
      if (p.rpps) {
        const { data: existing } = await supabase
          .from("partenaires_rpps")
          .select("id, nom, prenom")
          .eq("structure_id", auth.structureId)
          .eq("rpps", p.rpps)
          .eq("archive", false)
          .maybeSingle();
        if (existing) {
          await dialogs.alert({
            title: "Déjà partenaire",
            message: `${existing.prenom || ""} ${existing.nom} (RPPS ${p.rpps}) est déjà dans votre liste de partenaires.`,
          });
          setRppsSearchOpen(false);
          return;
        }
      }
      const payload = {
        structure_id: auth.structureId,
        rpps: p.rpps || null,
        adeli: p.adeli || null,
        civilite: p.civilite || null,
        nom: p.nom || "Inconnu",
        prenom: p.prenom || null,
        profession: p.profession || null,
        specialite: p.specialite || null,
        mode_exercice: p.mode_exercice || null,
        adresse: p.adresse || null,
        cp: p.cp || null,
        commune: p.commune || null,
        telephone: p.telephone || null,
        email: p.email || null,
        created_by: auth.user?.id,
        est_prescripteur: (p.profession || "").toLowerCase().includes("médecin"),
        est_intervenant: !!(p.profession || "").toLowerCase().match(/infirm|kin|sage/),
      };
      const { error } = await supabase.from("partenaires_rpps").insert(payload);
      if (error) throw error;
      setRppsSearchOpen(false);
      await loadAll();
      await dialogs.alert({
        title: "Partenaire ajouté",
        message: `${payload.prenom || ""} ${payload.nom} a été ajouté à votre liste de partenaires.`,
      });
    } catch (e) {
      await dialogs.alert({
        title: "Erreur",
        message: e.message || "Impossible d'ajouter ce partenaire",
        variant: "danger",
      });
    }
  }

  async function archivePartenaire(p) {
    if (!await dialogs.confirm({
      title: `Archiver ${p.prenom || ""} ${p.nom} ?`,
      message: "Ce partenaire ne sera plus visible dans la liste, mais ses données restent disponibles pour l'historique.",
      variant: "danger",
    })) return;
    await supabase.from("partenaires_rpps").update({ archive: true }).eq("id", p.id);
    await loadAll();
  }

  // Filtres
  const filtered = rows.filter((p) => {
    if (filterTag === "prescripteur" && !p.est_prescripteur) return false;
    if (filterTag === "intervenant" && !p.est_intervenant) return false;
    if (search) {
      const s = search.toLowerCase();
      return (p.nom || "").toLowerCase().includes(s)
          || (p.prenom || "").toLowerCase().includes(s)
          || (p.profession || "").toLowerCase().includes(s)
          || (p.rpps || "").includes(s)
          || (p.commune || "").toLowerCase().includes(s);
    }
    return true;
  });

  const countPrescripteurs = rows.filter((p) => p.est_prescripteur).length;
  const countIntervenants = rows.filter((p) => p.est_intervenant).length;

  return (
    <div className="bg-dark" style={{ minHeight: "100vh" }}>
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <PageHead
            eyebrow="COLLABORATIONS"
            title="Partenaires RPPS"
            accent="(non-utilisateurs)"
            sub="Médecins prescripteurs, IDE libéraux, kinés et autres intervenants qui n'ont pas de compte Aveho"
          />
          <button
            onClick={() => setRppsSearchOpen(true)}
            style={{
              background: "linear-gradient(135deg, #7a6fb0, #bfa9e0)",
              color: "#fff",
              border: "none",
              padding: "10px 16px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              alignSelf: "center",
            }}
          >
            <i className="ti ti-stethoscope" /> Ajouter un partenaire depuis RPPS
          </button>
        </div>

        <KpiRow tiles={[
          { label: "Partenaires actifs", value: rows.length, icon: "ti-users", color: "#7a6fb0" },
          { label: "Prescripteurs", value: countPrescripteurs, icon: "ti-prescription", color: "#185FA5" },
          { label: "Intervenants", value: countIntervenants, icon: "ti-stethoscope", color: "#5aa05a" },
        ]} />

        {/* Filtres */}
        <Panel style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, profession, RPPS, commune…"
              style={{
                flex: 1, minWidth: 200,
                padding: "8px 12px",
                border: "1px solid #d3d9e0",
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { k: "all", l: `Tous (${rows.length})` },
                { k: "prescripteur", l: `Prescripteurs (${countPrescripteurs})` },
                { k: "intervenant", l: `Intervenants (${countIntervenants})` },
              ].map((opt) => (
                <button
                  key={opt.k}
                  onClick={() => setFilterTag(opt.k)}
                  style={{
                    background: filterTag === opt.k ? "#7a6fb0" : "transparent",
                    color: filterTag === opt.k ? "#fff" : "#142131",
                    border: `1px solid ${filterTag === opt.k ? "#7a6fb0" : "#d3d9e0"}`,
                    padding: "6px 12px",
                    borderRadius: 16,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
        </Panel>

        {loading ? (
          <Panel><StateMsg>Chargement…</StateMsg></Panel>
        ) : filtered.length === 0 ? (
          <Panel><StateMsg>
            {rows.length === 0 ? (
              <>Aucun partenaire enregistré. <a style={{ color: "#7a6fb0", fontWeight: 600, cursor: "pointer" }} onClick={() => setRppsSearchOpen(true)}>Ajouter un partenaire depuis RPPS</a></>
            ) : (
              "Aucun partenaire ne correspond aux filtres."
            )}
          </StateMsg></Panel>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginTop: 12 }}>
            {filtered.map((p) => (
              <div
                key={p.id}
                onClick={() => setEditOpen(p)}
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: 14,
                  cursor: "pointer",
                  border: "1px solid #e3e9ee",
                  transition: "border-color 0.15s, transform 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7a6fb0"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e3e9ee"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: "linear-gradient(135deg, #7a6fb0, #bfa9e0)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <i className="ti ti-user-circle" style={{ fontSize: 24, color: "#fff" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#142131" }}>
                      {p.civilite ? `${p.civilite} ` : ""}{p.prenom ? `${p.prenom} ` : ""}{p.nom}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#7a6fb0", fontWeight: 600, marginTop: 2 }}>
                      {p.profession || "—"}{p.specialite ? ` · ${p.specialite}` : ""}
                    </div>
                    <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 4, lineHeight: 1.4 }}>
                      {p.commune && <span><i className="ti ti-map-pin" style={{ fontSize: 11 }} /> {p.cp} {p.commune}<br /></span>}
                      {p.telephone && <span><i className="ti ti-phone" style={{ fontSize: 11 }} /> {p.telephone}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                      {p.est_prescripteur && (
                        <span style={{ background: "#dbe7f5", color: "#185FA5", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, letterSpacing: 0.3 }}>
                          PRESCRIPTEUR
                        </span>
                      )}
                      {p.est_intervenant && (
                        <span style={{ background: "#dff5e0", color: "#2e6f33", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, letterSpacing: 0.3 }}>
                          INTERVENANT
                        </span>
                      )}
                      {p.rpps && (
                        <span style={{ background: "#f3effa", color: "#5a4a90", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, fontFamily: "Consolas, monospace" }}>
                          RPPS {p.rpps}
                        </span>
                      )}
                    </div>
                    {/* 0.55.34 : ContactActions tel/mail/GPS */}
                    <div style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                      <ContactActions
                        telephone={p.telephone}
                        email={p.email}
                        adresse={p.adresse}
                        cp={p.cp}
                        commune={p.commune}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modale recherche RPPS pour ajouter un partenaire — 0.55.45 : autocomplete live, plus de bouton Rechercher */}
      <Modal
        open={rppsSearchOpen}
        onClose={() => setRppsSearchOpen(false)}
        title="Ajouter un partenaire RPPS"
        subtitle="Recherche en direct dans l'annuaire ANS (tape un nom OU une ville)"
        icon="ti-stethoscope"
        color="#7a6fb0"
        maxWidth={720}
      >
        <div style={{ minHeight: 380 }}>
          <RppsAutocomplete
            placeholder="Nom, ville, profession ou n° RPPS (recherche en direct)…"
            onSelect={addPartenaireFromRpps}
          />
          <div style={{ marginTop: 14, padding: 10, background: "#f4f7fa", borderRadius: 8, fontSize: 11.5, color: "#6c7a89", lineHeight: 1.6 }}>
            <b><i className="ti ti-info-circle" /> Astuce :</b> tape un <b>nom</b> de famille (ex : <i>"Dupont"</i>) ou une <b>ville</b> (ex : <i>"Paris"</i>) ou les deux séparés par un espace. Le sélecteur profession à gauche filtre encore plus précisément.
          </div>
        </div>
      </Modal>

      {/* Modale détails / édition d'un partenaire */}
      <Modal
        open={!!editOpen}
        onClose={() => setEditOpen(null)}
        title={editOpen ? `${editOpen.civilite || ""} ${editOpen.prenom || ""} ${editOpen.nom}`.trim() : ""}
        subtitle={editOpen?.profession}
        icon="ti-user-circle"
        color="#7a6fb0"
        maxWidth={560}
        footer={
          editOpen ? (
            <>
              <button
                onClick={() => archivePartenaire(editOpen)}
                style={{
                  background: "transparent",
                  color: "#c0392b",
                  border: "1px solid #c0392b",
                  padding: "8px 14px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <i className="ti ti-archive" /> Archiver
              </button>
              <button
                onClick={() => setEditOpen(null)}
                style={{
                  background: "#142131",
                  color: "#fff",
                  border: "none",
                  padding: "8px 14px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Fermer
              </button>
            </>
          ) : null
        }
      >
        {editOpen && (
          <div>
            <div style={{ display: "grid", gap: 10 }}>
              <DetailRow label="Profession" value={editOpen.profession} />
              {editOpen.specialite && <DetailRow label="Spécialité" value={editOpen.specialite} />}
              {editOpen.mode_exercice && <DetailRow label="Mode d'exercice" value={editOpen.mode_exercice} />}
              {editOpen.rpps && <DetailRow label="N° RPPS" value={editOpen.rpps} mono />}
              {editOpen.adeli && <DetailRow label="N° ADELI" value={editOpen.adeli} mono />}
            </div>
            <h3 style={{ fontSize: 13, color: "#7a6fb0", margin: "16px 0 8px", letterSpacing: 1, textTransform: "uppercase" }}>
              Coordonnées
            </h3>
            <div style={{ display: "grid", gap: 10 }}>
              {editOpen.adresse && <DetailRow label="Adresse" value={editOpen.adresse} />}
              {(editOpen.cp || editOpen.commune) && (
                <DetailRow label="Commune" value={`${editOpen.cp || ""} ${editOpen.commune || ""}`.trim()} />
              )}
              {editOpen.telephone && (
                <DetailRow label="Téléphone" value={
                  <a href={`tel:${editOpen.telephone.replace(/\s/g, "")}`} style={{ color: "#7a6fb0", fontWeight: 600 }}>
                    {editOpen.telephone}
                  </a>
                } />
              )}
              {editOpen.email && (
                <DetailRow label="Email" value={
                  <a href={`mailto:${editOpen.email}`} style={{ color: "#7a6fb0", fontWeight: 600 }}>
                    {editOpen.email}
                  </a>
                } />
              )}
            </div>
            {editOpen.notes && (
              <>
                <h3 style={{ fontSize: 13, color: "#7a6fb0", margin: "16px 0 8px", letterSpacing: 1, textTransform: "uppercase" }}>
                  Notes
                </h3>
                <p style={{ fontSize: 13, color: "#142131", margin: 0, whiteSpace: "pre-wrap" }}>
                  {editOpen.notes}
                </p>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function DetailRow({ label, value, mono }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: "#6c7a89", fontWeight: 600 }}>{label}</span>
      <span style={{
        fontSize: 13,
        color: "#142131",
        fontFamily: mono ? "Consolas, Menlo, monospace" : "inherit",
        textAlign: "right",
      }}>{value || "—"}</span>
    </div>
  );
}
