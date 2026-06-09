"use client";
// =============================================================
//  /administration/utilisateurs — Liste users avec bulles
//  Cards avec permissions en bulles + icône œil → popup détail
// =============================================================
import { useEffect, useState, useMemo } from "react";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { PageShell, ModernCard, ModernModal, ModalBtn, HiTechIconBox } from "../../components/ui-premium";

const COLOR = "#5e4a8c";

// Toutes les permissions possibles (groupées par module)
const ALL_PERMISSIONS = {
  "Base": ["lire", "ecrire", "supprimer", "valider", "admin"],
  "Patients": ["patients_lire", "patients_ecrire", "patients_supprimer", "patients_deces"],
  "Matériel": ["materiel_lire", "materiel_ecrire", "materiel_supprimer", "materiel_inventaire"],
  "Interventions": ["interventions_lire", "interventions_ecrire", "interventions_valider", "interventions_cloturer"],
  "Pharmacie": ["pharmacie_lire", "pharmacie_ecrire", "pharmacie_dispenser", "pharmacie_stupefiants", "pharmacie_commander"],
  "Infirmières": ["infirmiere_lire", "infirmiere_ecrire", "infirmieres_admin", "visites_creer", "visites_valider", "visites_admin", "tournees_admin"],
  "Facturation": ["facturation_lire", "facturation_emettre", "facturation_pointer", "compta_admin"],
  "Voiture / CarPlay": ["voiture_acces", "voiture_patients", "voiture_etablissements", "voiture_magasins", "voiture_pharmacies", "voiture_rpps", "voiture_fournisseurs", "voiture_had", "voiture_tournees_jour", "voiture_di_urgentes", "voiture_infirmieres", "voiture_visites_inf", "voiture_tts", "voiture_wakelock"],
};

const PERM_COLORS = {
  "Base": "#7CC8C8",
  "Patients": "#7a6fb0",
  "Matériel": "#142131",
  "Interventions": "#e35d5b",
  "Pharmacie": "#5aa05a",
  "Infirmières": "#C9867F",
  "Facturation": "#185FA5",
  "Voiture / CarPlay": "#EF9F27",
};

export default function UtilisateursAdminPage() {
  const supabase = createClient();
  const auth = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState("");
  const [modalEye, setModalEye] = useState(null);  // user
  const [permsEdit, setPermsEdit] = useState({});
  const [cmdSql, setCmdSql] = useState("");

  useEffect(() => { if (auth.ready) load(); }, [auth.ready]);

  async function load() {
    const [u, r] = await Promise.all([
      supabase.from("membres_etablissements")
        .select("id, user_id, email, nom_complet, role_id, role, structure_id, etablissement_id, role_data:roles(id, nom, icone, couleur, permissions_json, droits)")
        .eq("structure_id", auth.structureId)
        .limit(200),
      supabase.from("roles").select("*").eq("structure_id", auth.structureId).order("nom"),
    ]);
    setUsers(u.data || []);
    setRoles(r.data || []);
  }

  function openEye(user) {
    setModalEye(user);
    const currentPerms = user.role_data?.permissions_json || [];
    const obj = {};
    Object.values(ALL_PERMISSIONS).flat().forEach(p => { obj[p] = currentPerms.includes(p); });
    setPermsEdit(obj);
    setCmdSql("");
  }

  function buildSQL() {
    const checked = Object.entries(permsEdit).filter(([k, v]) => v).map(([k]) => k);
    const roleId = modalEye?.role_data?.id || modalEye?.role_id;
    if (!roleId) {
      setCmdSql(`-- Aucun rôle attribué à cet utilisateur. Affecte-en un d'abord.\n-- INSERT INTO membres_etablissements (user_id, role_id, structure_id) VALUES ('${modalEye?.user_id}', '<role_id>', '${auth.structureId}');`);
      return;
    }
    const sql = `-- Mise à jour des permissions du rôle "${modalEye.role_data?.nom || ''}"\nUPDATE roles SET permissions_json = '${JSON.stringify(checked)}'::jsonb\n  WHERE id = '${roleId}';`;
    setCmdSql(sql);
  }

  async function applyCheckedPerms() {
    const checked = Object.entries(permsEdit).filter(([k, v]) => v).map(([k]) => k);
    const roleId = modalEye?.role_data?.id || modalEye?.role_id;
    if (!roleId) { alert("Pas de rôle attribué"); return; }
    const r = await supabase.from("roles").update({ permissions_json: checked }).eq("id", roleId);
    if (r.error) { alert(r.error.message); return; }
    alert("✓ Permissions sauvegardées");
    load();
    setModalEye(null);
  }

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return users;
    return users.filter(u => 
      (`${u.nom_complet || ""} ${u.email || ""} ${u.role_data?.nom || ""}`).toLowerCase().includes(s)
    );
  }, [users, search]);

  return (
    <>
      <TopBar />
      <PageShell
        color={COLOR}
        icon="ti-users"
        title="Utilisateurs & Droits"
        subtitle="Gestion fine des permissions par utilisateur"
        badge={`${users.length} utilisateurs · ${roles.length} rôles`}
      >
        {/* Search */}
        <ModernCard color={COLOR} variant="default" padding={14} style={{ marginBottom: 18 }}>
          <input placeholder="Rechercher nom, email, rôle..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,.08)", color: "#fff", border: "1px solid rgba(255,255,255,.15)", fontFamily: "Quicksand", fontSize: 13 }} />
        </ModernCard>

        {/* Cards users */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          {filtered.map(u => {
            const role = u.role_data;
            const perms = role?.permissions_json || [];
            return (
              <ModernCard key={u.id} color={role?.couleur || COLOR} variant="default" padding={16} hoverable>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center", marginBottom: 12 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: `linear-gradient(135deg, ${role?.couleur || COLOR}, ${role?.couleur || COLOR}cc)`,
                    color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, boxShadow: `0 4px 12px ${role?.couleur || COLOR}50`,
                  }}>
                    {u.nom_complet ? u.nom_complet.charAt(0).toUpperCase() : <i className="ti ti-user" />}
                  </div>
                  <div>
                    <div style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>{u.nom_complet || u.email}</div>
                    <div style={{ color: "rgba(255,255,255,.6)", fontSize: 12 }}>
                      <i className="ti ti-mail" /> {u.email}
                    </div>
                    {role && (
                      <div style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", background: `${role.couleur}25`, color: role.couleur, border: `1px solid ${role.couleur}50`, borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                        <i className={`ti ${role.icone || "ti-user"}`} /> {role.nom}
                      </div>
                    )}
                  </div>
                  <button onClick={() => openEye(u)} title="Voir et éditer les permissions" style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: "linear-gradient(135deg, rgba(255,255,255,.10), rgba(255,255,255,.04))",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,.15)",
                    cursor: "pointer",
                    fontSize: 22,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <i className="ti ti-eye" />
                  </button>
                </div>

                {/* Bulles permissions */}
                {perms.length > 0 ? (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.06)" }}>
                    {perms.slice(0, 20).map(p => {
                      const group = Object.keys(ALL_PERMISSIONS).find(g => ALL_PERMISSIONS[g].includes(p)) || "Base";
                      const c = PERM_COLORS[group] || "#888";
                      return (
                        <span key={p} title={`${group} · ${p}`} style={{
                          background: `${c}20`, color: c,
                          border: `1px solid ${c}40`,
                          padding: "3px 8px", borderRadius: 8,
                          fontSize: 10, fontWeight: 700,
                          fontFamily: "Quicksand",
                        }}>
                          {p}
                        </span>
                      );
                    })}
                    {perms.length > 20 && (
                      <span style={{ color: "rgba(255,255,255,.4)", fontSize: 11, padding: "3px 8px" }}>
                        +{perms.length - 20} autres
                      </span>
                    )}
                  </div>
                ) : (
                  <div style={{ paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.06)", color: "rgba(255,255,255,.4)", fontSize: 11 }}>
                    <i className="ti ti-alert-circle" /> Aucune permission
                  </div>
                )}
              </ModernCard>
            );
          })}
        </div>

        {/* MODAL ŒIL — Permissions cochables */}
        <ModernModal
          open={!!modalEye}
          onClose={() => setModalEye(null)}
          color={modalEye?.role_data?.couleur || COLOR}
          icon="ti-eye-edit"
          title={`Permissions de ${modalEye?.nom_complet || modalEye?.email}`}
          subtitle={modalEye?.role_data?.nom ? `Rôle : ${modalEye.role_data.nom}` : "Pas de rôle"}
          size="xl"
          actions={
            <>
              <ModalBtn variant="secondary" onClick={() => setModalEye(null)}>Fermer</ModalBtn>
              <ModalBtn variant="secondary" onClick={buildSQL} icon="ti-terminal">Générer SQL</ModalBtn>
              <ModalBtn variant="primary" color="#5aa05a" icon="ti-check" onClick={applyCheckedPerms}>Appliquer</ModalBtn>
            </>
          }
        >
          {/* Groupes de permissions */}
          {Object.entries(ALL_PERMISSIONS).map(([group, perms]) => {
            const c = PERM_COLORS[group] || "#888";
            const groupChecked = perms.filter(p => permsEdit[p]).length;
            return (
              <div key={group} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "6px 0", borderBottom: `1px solid ${c}20` }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: `${c}30`, color: c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>
                    {groupChecked}
                  </div>
                  <h4 style={{ margin: 0, color: "#142131", fontSize: 13, fontWeight: 800 }}>{group}</h4>
                  <button onClick={() => {
                    const all = perms.every(p => permsEdit[p]);
                    const next = {};
                    perms.forEach(p => { next[p] = !all; });
                    setPermsEdit({ ...permsEdit, ...next });
                  }} style={{ marginLeft: "auto", padding: "2px 8px", background: "transparent", border: `1px solid ${c}50`, color: c, borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "Quicksand" }}>
                    {perms.every(p => permsEdit[p]) ? "Tout décocher" : "Tout cocher"}
                  </button>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {perms.map(p => (
                    <label key={p} style={{
                      padding: "5px 10px",
                      background: permsEdit[p] ? `${c}20` : "#f4f7fa",
                      border: `1px solid ${permsEdit[p] ? c + "60" : "#d3dce5"}`,
                      borderRadius: 16,
                      cursor: "pointer",
                      display: "inline-flex", alignItems: "center", gap: 4,
                      fontSize: 11, fontWeight: 700,
                      color: permsEdit[p] ? c : "#5a6878",
                      fontFamily: "Quicksand",
                      transition: "all 150ms",
                    }}>
                      <input type="checkbox" checked={!!permsEdit[p]} onChange={(e) => setPermsEdit({ ...permsEdit, [p]: e.target.checked })}
                        style={{ display: "none" }} />
                      <i className={`ti ${permsEdit[p] ? "ti-check" : "ti-circle"}`} style={{ fontSize: 11 }} />
                      {p}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Commande SQL générée */}
          {cmdSql && (
            <div style={{ marginTop: 14, padding: 14, background: "#0c1726", borderRadius: 10, border: "1px solid #142131" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <i className="ti ti-terminal" style={{ color: "#5aa05a" }} />
                <span style={{ color: "#5aa05a", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>Commande SQL à exécuter</span>
                <button onClick={() => { navigator.clipboard.writeText(cmdSql); alert("Copié !"); }} style={{ marginLeft: "auto", padding: "3px 10px", background: "rgba(90,160,90,.20)", color: "#5aa05a", border: "1px solid #5aa05a50", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "Quicksand" }}>
                  <i className="ti ti-copy" /> Copier
                </button>
              </div>
              <pre style={{ color: "#7CC8C8", fontSize: 11, fontFamily: "monospace", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{cmdSql}</pre>
            </div>
          )}
        </ModernModal>
      </PageShell>
    </>
  );
}
