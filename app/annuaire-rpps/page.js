"use client";
// =============================================================
//  app/annuaire-rpps/page.js (Alpha 0.55.33)
//
//  Annuaire RPPS — moteur de recherche national avec 2 actions
//  par résultat : Rattacher à un établissement + Transformer en utilisateur.
// =============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel } from "../ui";
import RppsSearch from "../components/RppsSearch";
import Modal from "../components/Modal";
import { dialogs } from "../dialogs";
import { logger } from "../../lib/logger";

export default function AnnuaireRppsPage() {
  const supabase = createClient();
  const auth = useAuth();
  const router = useRouter();
  const cart = useCart();

  // Données pour les modales d'action
  const [allEtabs, setAllEtabs] = useState([]); // mes étabs + partenaires
  const [linkModal, setLinkModal] = useState(null); // { praticien, choix }
  const [inviteModal, setInviteModal] = useState(null); // { praticien, fields, role_id }
  const [roles, setRoles] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    (async () => {
      try {
        // Charge mes étabs + partenaires + rôles disponibles
        const [resMine, resPart, resRoles] = await Promise.all([
          supabase.from("etablissements").select("id, nom, type, ville, est_partenaire").eq("structure_id", auth.structureId),
          supabase.from("etablissements_partenaires").select("id, nom, type, ville, type_relation").eq("structure_id", auth.structureId).eq("archive", false),
          supabase.from("roles").select("id, nom").eq("structure_id", auth.structureId).order("nom"),
        ]);
        const combined = [
          ...(resMine.data || []).filter(e => !e.est_partenaire).map(e => ({ ...e, kind: "mine" })),
          ...(resPart.data || []).map(e => ({ ...e, kind: "partner" })),
        ];
        setAllEtabs(combined);
        setRoles(resRoles.data || []);
      } catch (e) {
        // 0.57.5 : try/catch englobant pour pas crasher la page
        logger.error("[AnnuaireRpps] load failed:", e);
      }
    })();
  }, [auth.ready, auth.structureId]);

  // ============== ACTION 1 : Rattacher à un établissement ==============
  async function openLinkModal(p) {
    // 0.55.35 : si le RPPS contient un FINESS, on cherche d'abord
    // l'établissement correspondant dans la base pour pré-sélection
    let preSelected = null;
    if (p.finess) {
      try {
        const { data: matchMine } = await supabase
          .from("etablissements")
          .select("id, nom, type, ville, est_partenaire")
          .eq("structure_id", auth.structureId)
          .eq("finess", p.finess)
          .maybeSingle();
        if (matchMine) preSelected = { ...matchMine, kind: "mine" };

        if (!preSelected) {
          const { data: matchPart } = await supabase
            .from("etablissements_partenaires")
            .select("id, nom, type, ville, type_relation")
            .eq("structure_id", auth.structureId)
            .eq("finess", p.finess)
            .maybeSingle();
          if (matchPart) preSelected = { ...matchPart, kind: "partner" };
        }
      } catch (e) {
        logger.warn("[annuaire-rpps] auto-link FINESS échec:", e?.message);
      }
    }
    setLinkModal({ praticien: p, choix: preSelected, autoMatched: !!preSelected });
  }

  async function confirmLink() {
    if (!linkModal?.choix) return;
    setBusy(true);
    try {
      // 1) Crée ou récupère le partenaire RPPS dans notre table
      const p = linkModal.praticien;
      let partenaireRppsId = null;

      // Cherche s'il existe déjà
      if (p.rpps) {
        const { data: existing } = await supabase
          .from("partenaires_rpps")
          .select("id")
          .eq("structure_id", auth.structureId)
          .eq("rpps", p.rpps)
          .eq("archive", false)
          .maybeSingle();
        if (existing) partenaireRppsId = existing.id;
      }

      // Si pas existant → on l'ajoute
      if (!partenaireRppsId) {
        const { data: created, error } = await supabase
          .from("partenaires_rpps")
          .insert({
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
          })
          .select("id")
          .single();
        if (error) throw error;
        partenaireRppsId = created.id;
      }

      // 2) RPC pour rattacher
      const { data, error } = await supabase.rpc("link_partenaire_rpps_to_etablissement", {
        p_partenaire_rpps_id: partenaireRppsId,
        p_etablissement_id: linkModal.choix.id,
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Échec rattachement");

      setLinkModal(null);
      await dialogs.alert({
        title: "Rattachement réussi",
        message: `${p.prenom || ""} ${p.nom} est désormais rattaché à ${linkModal.choix.nom}.`,
      });
    } catch (e) {
      await dialogs.alert({ title: "Erreur", message: e.message, variant: "danger" });
    } finally {
      setBusy(false);
    }
  }

  // ============== ACTION 2 : Transformer en utilisateur (invitation) ==============
  function openInviteModal(p) {
    setInviteModal({
      praticien: p,
      role_id: "",
      email: p.email || "",
      // Champs sélectionnables avec valeur par défaut
      fields: {
        prenom: !!p.prenom,
        nom: !!p.nom,
        telephone: !!p.telephone,
        rpps: !!p.rpps,
        adeli: !!p.adeli,
        rpps_profession: !!p.profession,
        rpps_specialite: !!p.specialite,
        rpps_mode_exercice: !!p.mode_exercice,
        adresse_complete: !!(p.adresse || p.cp || p.commune),
      },
    });
  }

  async function confirmInvite() {
    if (!inviteModal?.email) {
      await dialogs.alert({ title: "Email requis", message: "Un email valide est nécessaire pour envoyer l'invitation." });
      return;
    }
    if (!inviteModal?.role_id) {
      await dialogs.alert({ title: "Rôle requis", message: "Sélectionne un rôle pour l'utilisateur." });
      return;
    }
    setBusy(true);
    try {
      const p = inviteModal.praticien;
      const f = inviteModal.fields;
      const nom_affiche = `${f.prenom ? (p.prenom || "") : ""} ${f.nom ? (p.nom || "") : ""}`.trim();

      const payload = {
        structure_id: auth.structureId,
        email: inviteModal.email,
        role_id: inviteModal.role_id,
        nom_affiche: nom_affiche || inviteModal.email,
        prenom: f.prenom ? p.prenom : null,
        telephone: f.telephone ? p.telephone : null,
        fonction_detail: f.rpps_profession ? p.profession : null,
        rpps: f.rpps ? p.rpps : null,
        adeli: f.adeli ? p.adeli : null,
        rpps_profession: f.rpps_profession ? p.profession : null,
        rpps_specialite: f.rpps_specialite ? p.specialite : null,
        rpps_mode_exercice: f.rpps_mode_exercice ? p.mode_exercice : null,
        origine: "rpps_annuaire",
      };
      // Retry sans champs RPPS si SQL pas passé
      let { data: invData, error } = await supabase.from("invitations").insert(payload).select("token").single();
      if (error && (error.message || "").match(/rpps|adeli|origine/)) {
        const fb = { ...payload };
        ["rpps", "adeli", "rpps_profession", "rpps_specialite", "rpps_mode_exercice", "origine"].forEach(k => delete fb[k]);
        const retry = await supabase.from("invitations").insert(fb).select("token").single();
        invData = retry.data; error = retry.error;
      }
      if (error) throw error;

      const inviteLink = `${window.location.origin}/inscription/${invData.token}`;

      // Envoi email via Edge Function (best-effort)
      try {
        await supabase.functions.invoke("invite-user", {
          body: {
            email: inviteModal.email,
            nom: nom_affiche,
            collectivite: auth.structureNom,
            role: roles.find(r => r.id === inviteModal.role_id)?.nom || "Utilisateur",
            etablissements: [],
            inviteLink,
            rpps_profession: f.rpps_profession ? p.profession : null,
            rpps_specialite: f.rpps_specialite ? p.specialite : null,
            rpps: f.rpps ? p.rpps : null,
          },
        });
      } catch (e) {
        logger.warn("[annuaire-rpps] invite-user not deployed:", e);
      }

      setInviteModal(null);
      await dialogs.alert({
        title: "Invitation envoyée",
        message: `${nom_affiche} a été invité(e). Lien : ${inviteLink}`,
      });
    } catch (e) {
      await dialogs.alert({ title: "Erreur", message: e.message, variant: "danger" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-dark" style={{ minHeight: "100vh" }}>
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="ANNUAIRE NATIONAL"
          title="Annuaire RPPS"
          accent="(libéraux)"
          sub="Recherche les ~1,7M de professionnels de santé via l'API FHIR ANS officielle. Rattache à un établissement ou crée un utilisateur."
        />
        <Panel>
          <RppsSearch
            maxResults={50}
            showRichFilters={true}
            renderActions={(p) => (
              <>
                <button
                  type="button"
                  onClick={() => openLinkModal(p)}
                  style={btnAction("#5aa05a")}
                >
                  <i className="ti ti-link" /> Rattacher à un étab
                </button>
                <button
                  type="button"
                  onClick={() => openInviteModal(p)}
                  style={btnAction("#185FA5")}
                >
                  <i className="ti ti-user-plus" /> Transformer en utilisateur
                </button>
              </>
            )}
          />
        </Panel>
      </div>

      {/* Modale RATTACHER */}
      <Modal
        open={!!linkModal}
        onClose={() => setLinkModal(null)}
        title="Rattacher à un établissement"
        subtitle={linkModal ? `${linkModal.praticien.prenom || ""} ${linkModal.praticien.nom}` : ""}
        icon="ti-link"
        color="#5aa05a"
        maxWidth={520}
        footer={
          <>
            <button onClick={() => setLinkModal(null)} style={btnGhost}>Annuler</button>
            <button
              onClick={confirmLink}
              disabled={!linkModal?.choix || busy}
              style={{ ...btnAction("#5aa05a"), opacity: linkModal?.choix && !busy ? 1 : 0.5 }}
            >
              <i className="ti ti-check" /> {busy ? "Enregistrement…" : "Rattacher"}
            </button>
          </>
        }
      >
        {/* 0.55.35 : badge auto-match si FINESS détecté */}
        {linkModal?.autoMatched && linkModal?.choix && (
          <div style={{
            background: "linear-gradient(135deg, #eef9ef, #fff)",
            border: "1px solid #bfe2bf",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 12,
            fontSize: 12.5,
            color: "#2e6f33",
          }}>
            <b><i className="ti ti-magic-wand" /> Auto-rattachement détecté !</b><br />
            Le FINESS <code style={{ background: "#dff5e0", padding: "1px 6px", borderRadius: 4, fontFamily: "Consolas, monospace" }}>{linkModal.praticien.finess}</code> du praticien correspond à <b>{linkModal.choix.nom}</b>. Tu peux valider directement, ou changer ci-dessous.
          </div>
        )}
        {linkModal?.praticien?.finess && !linkModal?.autoMatched && (
          <div style={{
            background: "#fff8ec",
            border: "1px solid #f0d59f",
            borderRadius: 8,
            padding: "8px 12px",
            marginBottom: 12,
            fontSize: 11.5,
            color: "#7a4f15",
          }}>
            <i className="ti ti-info-circle" /> FINESS détecté <code style={{ background: "#fff", padding: "0 4px", borderRadius: 3 }}>{linkModal.praticien.finess}</code>{linkModal.praticien.organization_name ? ` (${linkModal.praticien.organization_name})` : ""} mais aucun établissement avec ce FINESS dans ta base. Choisis manuellement ci-dessous.
          </div>
        )}
        {allEtabs.length === 0 ? (
          <p style={{ color: "#8a98a8" }}>Aucun établissement disponible. Crée-en d'abord dans /etablissements.</p>
        ) : (
          <div style={{ display: "grid", gap: 6, maxHeight: 360, overflowY: "auto" }}>
            {allEtabs.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setLinkModal({ ...linkModal, choix: e })}
                style={{
                  background: linkModal?.choix?.id === e.id ? "#dff5e0" : "#fff",
                  border: `2px solid ${linkModal?.choix?.id === e.id ? "#5aa05a" : "#e3e9ee"}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <i className={`ti ${e.kind === "partner" ? "ti-building-community" : "ti-building-hospital"}`}
                   style={{ color: e.kind === "partner" ? "#7a6fb0" : "#185FA5", fontSize: 20 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#142131" }}>{e.nom}</div>
                  <div style={{ fontSize: 11, color: "#8a98a8" }}>
                    {e.type || "—"}{e.ville ? ` · ${e.ville}` : ""}
                    {e.kind === "partner" && <span style={{ marginLeft: 6, color: "#7a6fb0" }}>(partenaire)</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Modal>

      {/* Modale INVITER */}
      <Modal
        open={!!inviteModal}
        onClose={() => setInviteModal(null)}
        title="Voulez-vous envoyer une invitation ?"
        subtitle={inviteModal ? `${inviteModal.praticien.prenom || ""} ${inviteModal.praticien.nom}` : ""}
        icon="ti-user-plus"
        color="#185FA5"
        maxWidth={580}
        footer={
          <>
            <button onClick={() => setInviteModal(null)} style={btnGhost}>Annuler</button>
            <button
              onClick={confirmInvite}
              disabled={busy || !inviteModal?.email || !inviteModal?.role_id}
              style={{ ...btnAction("#185FA5"), opacity: !busy && inviteModal?.email && inviteModal?.role_id ? 1 : 0.5 }}
            >
              <i className="ti ti-send" /> {busy ? "Envoi…" : "Envoyer l'invitation"}
            </button>
          </>
        }
      >
        {inviteModal && (
          <div>
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <label style={lbl}>Email du nouvel utilisateur *</label>
                <input
                  type="email"
                  value={inviteModal.email}
                  onChange={(e) => setInviteModal({ ...inviteModal, email: e.target.value })}
                  placeholder="marie.dupont@etablissement.fr"
                  style={inp}
                />
              </div>
              <div>
                <label style={lbl}>Rôle attribué *</label>
                <select
                  value={inviteModal.role_id}
                  onChange={(e) => setInviteModal({ ...inviteModal, role_id: e.target.value })}
                  style={inp}
                >
                  <option value="">— Sélectionner —</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.nom}</option>
                  ))}
                </select>
              </div>
            </div>

            <h4 style={{ fontSize: 12, color: "#185FA5", margin: "16px 0 8px", letterSpacing: 1, textTransform: "uppercase" }}>
              Informations à pré-remplir
            </h4>
            <div style={{ background: "#f4f7fa", border: "1px solid #e3e9ee", borderRadius: 8, padding: 10 }}>
              {[
                { k: "prenom", l: "Prénom", v: inviteModal.praticien.prenom },
                { k: "nom", l: "Nom", v: inviteModal.praticien.nom },
                { k: "telephone", l: "Téléphone", v: inviteModal.praticien.telephone },
                { k: "rpps", l: "N° RPPS", v: inviteModal.praticien.rpps },
                { k: "adeli", l: "N° ADELI", v: inviteModal.praticien.adeli },
                { k: "rpps_profession", l: "Profession", v: inviteModal.praticien.profession },
                { k: "rpps_specialite", l: "Spécialité", v: inviteModal.praticien.specialite },
                { k: "rpps_mode_exercice", l: "Mode d'exercice", v: inviteModal.praticien.mode_exercice },
                { k: "adresse_complete", l: "Adresse postale", v: `${inviteModal.praticien.adresse || ""} ${inviteModal.praticien.cp || ""} ${inviteModal.praticien.commune || ""}`.trim() },
              ].filter(x => x.v).map((x) => (
                <label key={x.k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer", fontSize: 12.5 }}>
                  <input
                    type="checkbox"
                    checked={inviteModal.fields[x.k] !== false}
                    onChange={(e) => setInviteModal({ ...inviteModal, fields: { ...inviteModal.fields, [x.k]: e.target.checked } })}
                  />
                  <span style={{ flex: 1 }}>
                    <b style={{ color: "#142131" }}>{x.l}</b> : <span style={{ color: "#5a4a90" }}>{x.v}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const btnAction = (color) => ({
  background: color,
  color: "#fff",
  border: "none",
  padding: "7px 12px",
  borderRadius: 8,
  fontSize: 11.5,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
});

const btnGhost = {
  background: "transparent",
  color: "#142131",
  border: "1px solid #d3d9e0",
  padding: "8px 14px",
  borderRadius: 8,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const lbl = { display: "block", fontSize: 11, color: "#6c7a89", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 };
const inp = { width: "100%", padding: "8px 10px", border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 13, fontFamily: "inherit", background: "#fff" };
