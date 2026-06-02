"use client";
// Page Materiels — Matériel médical : série, parc, lot, état, dépôt, zone (CRUD)
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Statut, Modal, Btn } from "../ui";
import { KpiRow } from "../kpis";
import Crud from "../crud";
import { safeInsert, safeDelete } from "../../lib/safeWrite";
import { logger } from "../../lib/logger";

export default function Materiels() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [rel, setRel] = useState({ article_id: [], patient_id: [] });
  const [relReady, setRelReady] = useState(false);
  const [items, setItems] = useState([]);
  // Alpha 0.11 : tags matériel
  const [tags, setTags] = useState([]);
  const [matTags, setMatTags] = useState({});      // {materiel_id: [tag_id, ...]}
  const [tagModal, setTagModal] = useState(null);  // matériel ouvert pour gestion tags
  // Alpha 0.13 : filtres combinés dépôt
  const [depots, setDepots] = useState([]);

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      try {
        const [{ data: arts }, { data: pats }, { data: tg }, { data: links }, { data: dep }] = await Promise.all([
          supabase.from("articles").select("id,libelle"),
          supabase.from("patients").select("id,nom,prenom,chambre"),
          supabase.from("tags_materiel").select("*").order("libelle"),
          supabase.from("materiel_tags").select("materiel_id, tag_id"),
          supabase.from("depots").select("id, nom").order("nom"),
        ]);
        setRel({
          article_id: (arts || []).map((a) => ({ value: a.id, label: a.libelle })),
          patient_id: (pats || []).map((p) => ({ value: p.id, label: `${p.nom} ${p.prenom || ""}${p.chambre ? ` (ch.${p.chambre})` : ""}` })),
        });
        setTags(tg || []);
        const linksByMat = {};
        (links || []).forEach((l) => {
          if (!linksByMat[l.materiel_id]) linksByMat[l.materiel_id] = [];
          linksByMat[l.materiel_id].push(l.tag_id);
        });
        setMatTags(linksByMat);
        setDepots(dep || []);
        setRelReady(true);
      } catch (e) {
        // 0.57.5 : try/catch englobant pour pas crasher la page
        logger.error("[Materiels] load failed:", e);
      }
    })();
  }, [auth.ready]);

  if (!auth.ready || !relReady) return null;

  // Alpha 0.11 : bascule un tag sur un matériel
  async function toggleTag(matId, tagId) {
    const current = matTags[matId] || [];
    const userId = auth.user?.id;
    if (current.includes(tagId)) {
      await safeDelete(supabase, "materiel_tags", { materiel_id: matId, tag_id: tagId }, { userId });
      setMatTags({ ...matTags, [matId]: current.filter((id) => id !== tagId) });
    } else {
      await safeInsert(supabase, "materiel_tags", { materiel_id: matId, tag_id: tagId, structure_id: auth.structureId }, { userId });
      setMatTags({ ...matTags, [matId]: [...current, tagId] });
    }
  }

  const artLabel = Object.fromEntries(rel.article_id.map((o) => [o.value, o.label]));
  const patLabel = Object.fromEntries(rel.patient_id.map((o) => [o.value, o.label]));

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead small title="Parc matériel" sub="Exemplaires physiques — série, parc, lot" />
        <KpiRow tiles={[
          { label: "Matériels", value: items.length, icon: "ti-armchair-2", color: "#142131" },
          { label: "En location", value: items.filter((m) => m.etat === "En location").length, icon: "ti-home-check", color: "#5aa05a" },
          { label: "Maintenance", value: items.filter((m) => m.etat === "Maintenance").length, icon: "ti-tool", color: "#EF9F27" },
          { label: "Affectés patient", value: items.filter((m) => m.patient_id).length, icon: "ti-user", color: "#7a6fb0" },
        ]} />
        {/* 0.55.11 (AI) : Export CSV matériels */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button
            onClick={async () => {
              const { exportRows } = await import("../../lib/exportExcel");
              await exportRows(items || [], {
                filename: `materiels_${new Date().toISOString().slice(0,10)}`,
                sheetName: "Matériels",
                columns: {
                  "Libellé": "libelle",
                  "Article": (r) => artLabel[r.article_id] || "",
                  "Patient affecté": (r) => patLabel[r.patient_id] || "",
                  "N° série": "num_serie",
                  "N° parc": "num_parc",
                  "N° lot": "num_lot",
                  "État": "etat",
                  "Marque": "marque",
                  "Modèle": "modele",
                  "Date acquisition": (r) => r.date_acquisition || "",
                },
              });
            }}
            style={{
              background: "#fff", color: "#1c5454",
              border: "1px solid #1c5454",
              padding: "5px 11px", borderRadius: 8,
              fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 5,
            }}
          >
            <i className="ti ti-file-spreadsheet" /> Export CSV
          </button>
        </div>
        <Crud
          structureId={auth.structureId}
          etabId={auth.etabId}
          canWrite={auth.can("ecrire")}
          canDelete={auth.can("supprimer")}
          onData={setItems}
          table="materiels"
          title="Nouveau matériel"
          relations={rel}
          columns={[
            { key: "libelle", label: "Article", render: (r) => (
              <>
                <a onClick={(e) => { e.stopPropagation(); window.location.href = `/materiel/${r.id}`; }}
                   style={{ cursor: "pointer", color: "#142131", fontWeight: 600 }}
                   title="Voir la fiche complète"
                >{r.libelle}</a>
                {(matTags[r.id] || []).length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                    {(matTags[r.id] || []).map((tid) => {
                      const t = tags.find((x) => x.id === tid);
                      if (!t) return null;
                      return (
                        <span key={tid} className="etq-tag" style={{ background: t.couleur + "22", color: t.couleur, border: `1px solid ${t.couleur}44`, fontSize: 11 }}>
                          {t.libelle}
                        </span>
                      );
                    })}
                  </div>
                )}
                {auth.can("ecrire") && tags.length > 0 && (
                  <i className="ti ti-tag" style={{ color: "#7a6fb0", cursor: "pointer", marginLeft: 8, fontSize: 13 }} onClick={(e) => { e.stopPropagation(); setTagModal(r); }} title="Gérer les tags" />
                )}
              </>
            ) },
            { key: "num_serie", label: "N° série" },
            { key: "num_parc", label: "N° parc" },
            { key: "num_lot", label: "N° lot" },
            { key: "patient_id", label: "Patient", render: (r) => patLabel[r.patient_id] || "—" },
            { key: "etat", label: "État", render: (r) => <Statut value={r.etat} /> },
          ]}
          fields={[
            { key: "libelle", label: "Libellé matériel", required: true },
            { key: "article_id", label: "Article rattaché", type: "select" },
            { key: "num_serie", label: "N° de série" },
            { key: "num_parc", label: "N° de parc" },
            { key: "num_lot", label: "N° de lot" },
            { key: "patient_id", label: "Patient affecté", type: "select" },
            { key: "etat", label: "État", type: "select", options: [
              { value: "Disponible", label: "Disponible" },
              { value: "En location", label: "En location" },
              { value: "Maintenance", label: "Maintenance" },
            ] },
          ]}
          filterFields={[
            { key: "q", label: "Recherche", type: "text", searchKeys: ["libelle", "num_serie", "num_parc", "num_lot"], placeholder: "Libellé, série, parc…" },
            { key: "etat", label: "État", type: "select", options: ["Disponible", "En location", "Maintenance"] },
            ...(tags.length > 0 ? [{
              key: "tag", label: "Tag", type: "select",
              options: tags.map((t) => ({ value: t.id, label: t.libelle })),
              accessor: (r) => {
                const ids = matTags[r.id] || [];
                return ids;
              },
            }] : []),
            // Alpha 0.13 : filtres combinés
            ...(depots.length > 0 ? [{
              key: "depot_id", label: "Dépôt", type: "select",
              options: depots.map((d) => ({ value: d.id, label: d.nom })),
            }] : []),
            { key: "affecte", label: "Affecté à un patient", type: "select",
              options: [{ value: "oui", label: "Oui" }, { value: "non", label: "Non" }],
              accessor: (r) => r.patient_id ? "oui" : "non",
            },
          ]}
        />
      </div>

      {/* Alpha 0.11 : modale gestion des tags d'un matériel */}
      <Modal
        open={!!tagModal}
        onClose={() => setTagModal(null)}
        kind="materiel"
        title={tagModal ? `Tags — ${tagModal.libelle}` : "Tags"}
        footer={<Btn variant="primary" onClick={() => setTagModal(null)}>Fermer</Btn>}
      >
        {tags.length === 0 ? (
          <p style={{ color: "#6c7a89", fontSize: 13 }}>
            Aucun tag défini. <a href="/tags-materiel" style={{ color: "#2a5a5a", fontWeight: 600 }}>Créer un tag →</a>
          </p>
        ) : (
          <>
            <p style={{ color: "#6c7a89", fontSize: 13, marginTop: 0 }}>
              Clique pour basculer un tag. Les changements sont enregistrés immédiatement.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {tags.map((t) => {
                const active = tagModal && (matTags[tagModal.id] || []).includes(t.id);
                return (
                  <button key={t.id} onClick={() => toggleTag(tagModal.id, t.id)} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", border: `2px solid ${active ? t.couleur : "#e3e9ee"}`,
                    background: active ? t.couleur + "1a" : "#fff",
                    borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                  }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="etq-tag" style={{ background: t.couleur + "22", color: t.couleur, border: `1px solid ${t.couleur}44` }}>
                        <i className="ti ti-tag" /> {t.libelle}
                      </span>
                      {t.description && <span style={{ color: "#8a98a8", fontSize: 12 }}>{t.description}</span>}
                    </span>
                    {active && <i className="ti ti-check" style={{ color: t.couleur, fontSize: 18 }} />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
