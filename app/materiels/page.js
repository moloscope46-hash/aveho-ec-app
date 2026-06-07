"use client";
// Page Materiels — Matériel médical : série, parc, lot, état, dépôt, zone (CRUD)
// 0.62.8 : force-dynamic pour éviter erreur prerender Vercel useSearchParams
export const dynamic = "force-dynamic";
import { useEffect, useState, Suspense } from "react";
import { createClient } from "../../lib/supabase";
import { selectChambresContexte } from "../../lib/chambres";
import { useAuth } from "../../lib/useAuth";
// 0.58.40 : hook réutilisable pour le contexte bât/svc (introduit 0.58.39)
import { useCurrentContext } from "../../lib/useCurrentContext";
// 0.58.43 : hook pour écouter les page-actions du Cmd+K
import { usePageAction } from "../../lib/usePageAction";
import TopBar from "../TopBar";
import MobileActionsBar from "../components/MobileActionsBar";  /* 0.62.109 */
import { useCart } from "../useCart";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHead, Statut, Modal, Btn } from "../ui";
import { getEtatMeta } from "../materiel/[id]/page";
import { PageHero } from "../components/ui-premium";
// 0.58.4 : KpiRow remplacé par les stats inline dans PageHero
import Crud from "../crud";
import { safeInsert, safeDelete } from "../../lib/safeWrite";
import { logger } from "../../lib/logger";

export default function Materiels() {
  return (
    <Suspense fallback={null}>
      <MaterielsInner />
    </Suspense>
  );
}

function MaterielsInner() {
  const supabase = createClient();
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // 0.62.2 : Pré-filtre via query string (ex: /materiels?article_id=XXX)
  const filterArticleId = searchParams.get("article_id");
  const cart = useCart();
  const [rel, setRel] = useState({ article_id: [], patient_id: [] });
  const [relReady, setRelReady] = useState(false);
  const [items, setItems] = useState([]);
  // 0.62.103 : Mode d'affichage tuiles/liste
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window === "undefined") return "list";
    return localStorage.getItem("av:materiels:viewMode") || "list";
  });
  useEffect(() => {
    try { localStorage.setItem("av:materiels:viewMode", viewMode); } catch {}
  }, [viewMode]);
  // Alpha 0.11 : tags matériel
  const [tags, setTags] = useState([]);
  const [matTags, setMatTags] = useState({});      // {materiel_id: [tag_id, ...]}
  const [tagModal, setTagModal] = useState(null);  // matériel ouvert pour gestion tags
  // Alpha 0.13 : filtres combinés dépôt
  const [depots, setDepots] = useState([]);
  // 0.62.16 : chambres pour sélecteur localisation + colonne
  const [chambres, setChambres] = useState([]);
  // 0.58.40 : filtre par contexte bât/svc courant (via hook useCurrentContext)
  const ctx = useCurrentContext();
  const [ctxPatientIds, setCtxPatientIds] = useState(null);
  useEffect(() => {
    if (!ctx.batimentId && !ctx.serviceId) {
      setCtxPatientIds(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        // Chambres du contexte → patient_ids assignés
        // 0.58.70 : helper avec fallback batiment_id absent
        const { data: chambres } = await selectChambresContexte(supabase, {
          serviceId: ctx.serviceId, batimentId: ctx.batimentId,
        });
        if (!alive || !chambres) return;
        const chambreIds = chambres.map(c => c.id);
        if (chambreIds.length === 0) { setCtxPatientIds(new Set()); return; }
        const { data: pats } = await supabase.from("patients").select("id").in("chambre_id", chambreIds);
        if (!alive) return;
        setCtxPatientIds(new Set((pats || []).map(p => p.id)));
      } catch {
        if (alive) setCtxPatientIds(null);
      }
    })();
    return () => { alive = false; };
  }, [ctx.batimentId, ctx.serviceId]);

  useEffect(() => {
    if (!auth.ready) return;
    let mounted = true;
    (async () => {
      // 0.58.79 : tryFetch individuel — si UNE requête échoue (colonne/table absente),
      // les autres continuent. Avant : Promise.all → un fail = tout fail = relReady jamais true
      // 0.58.84 : mounted ref pour éviter setState après unmount (cause React #310)
      const tryFetch = async (q, fallback = []) => {
        try { const r = await q; return r.data || fallback; }
        catch (e) {
          logger.warn("[Materiels] partial load fail:", e?.message || e);
          return fallback;
        }
      };
      try {
        // Patients : essaie d'abord avec chambre, sinon sans
        let pats = await tryFetch(supabase.from("patients").select("id,nom,prenom,chambre"));
        if (pats.length === 0) {
          pats = await tryFetch(supabase.from("patients").select("id,nom,prenom"));
        }
        const [arts, tg, links, dep, eqs, ch] = await Promise.all([
          tryFetch(supabase.from("articles").select("id,libelle")),
          tryFetch(supabase.from("tags_materiel").select("*").order("libelle")),
          tryFetch(supabase.from("materiel_tags").select("materiel_id, tag_id")),
          tryFetch(supabase.from("depots").select("id, nom, magasin_id, etablissement_id").order("nom")),
          tryFetch(supabase.from("equipes").select("id, nom").order("nom")),
          tryFetch(supabase.from("chambres").select("id, nom, service_id").order("nom")),
        ]);
        if (!mounted) return;  // 0.58.84
        setRel({
          article_id: arts.map((a) => ({ value: a.id, label: a.libelle })),
          patient_id: pats.map((p) => ({ value: p.id, label: `${p.nom} ${p.prenom || ""}${p.chambre ? ` (ch.${p.chambre})` : ""}` })),
          equipe_id: eqs.map((e) => ({ value: e.id, label: e.nom })),
        });
        setTags(tg);
        const linksByMat = {};
        links.forEach((l) => {
          if (!linksByMat[l.materiel_id]) linksByMat[l.materiel_id] = [];
          linksByMat[l.materiel_id].push(l.tag_id);
        });
        setMatTags(linksByMat);
        setDepots(dep);
        setChambres(ch);
        setRelReady(true);
      } catch (e) {
        logger.error("[Materiels] load failed:", e);
        // 0.58.79 : même en cas d'erreur globale, on flag relReady à true
        // pour ne pas bloquer la page sur return null indéfiniment
        if (mounted) setRelReady(true);
      }
    })();
    return () => { mounted = false; };
  }, [auth.ready]);

  // 0.62.10 : Les hooks DOIVENT être appelés AVANT tout early return (React rules)
  // sinon erreur #310 "Rendered more hooks than during the previous render"
  // 0.58.43 : page-actions du Cmd+K
  usePageAction("open-new", () => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("new", "1");
      window.location.href = url.toString();
    }
  });
  usePageAction("export-csv", () => exportMaterielsCsv());
  usePageAction("toggle-ctx-filter", () => ctx.toggle());

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

  // 0.58.43 : export CSV factorisé (auparavant inline dans le bouton) pour appel depuis Cmd+K
  async function exportMaterielsCsv() {
    try {
      // Si le filtre contexte est actif, on n'exporte que les matériels du contexte
      const data = (ctx.active && ctxPatientIds)
        ? (items || []).filter(r => r.patient_id && ctxPatientIds.has(r.patient_id))
        : (items || []);
      const { exportRows } = await import("../../lib/exportExcel");
      await exportRows(data, {
        filename: `materiels_${new Date().toISOString().slice(0, 10)}`,
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
    } catch (e) {
      console.error("Export CSV matériels :", e);
    }
  }
  // 0.62.10 : usePageAction déplacés en haut du composant (voir avant le early return)

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      {/* 0.62.110 : barre actions mobile + desktop */}
      <MobileActionsBar
        primary={[
          { icon: "ti-plus", label: "Nouveau matériel", onClick: () => {
            const btn = document.querySelector('[data-crud-action="new"]');
            if (btn) btn.click();
          }, color: "#142131" },
        ]}
        secondary={[
          { icon: "ti-file-spreadsheet", label: "Export CSV", onClick: exportMaterielsCsv },
          { icon: "ti-layout-grid", label: viewMode === "grid" ? "Vue liste" : "Vue tuiles", onClick: () => setViewMode(viewMode === "grid" ? "list" : "grid") },
          { icon: "ti-printer", label: "Imprimer", onClick: () => window.print() },
        ]}
      />
      <div className="wrap">
        {/* 0.58.4 : PageHero premium avec stats inline */}
        <PageHero
          icon="ti-armchair-2"
          eyebrow="INVENTAIRE"
          title="Parc matériel"
          subtitle="Exemplaires physiques — série, parc, lot"
          variant="navy"
          breadcrumbs={[
            { label: "Accueil", href: "/accueil" },
            { label: "Matériels" },
          ]}
          stats={[
            { label: "Total", value: items.length },
            { label: "En location", value: items.filter((m) => m.etat === "En location").length },
            { label: "Maintenance", value: items.filter((m) => m.etat === "Maintenance").length },
            { label: "Affectés", value: items.filter((m) => m.patient_id).length },
          ]}
        />
        {/* 0.55.11 (AI) : Export CSV matériels + 0.58.71 : bouton Scanner matériel */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 8, alignItems: "center" }}>
          {/* 0.58.71 : raccourci scanner matériel */}
          <button
            onClick={() => router.push("/scan/materiel")}
            title="Scanner un code GS1/UDI pour identifier un matériel"
            style={{
              background: "linear-gradient(135deg, #5e4a8c, #4a3a70)",
              color: "#fff", border: "none",
              padding: "6px 13px", borderRadius: 8,
              fontSize: 12.5, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 5,
              boxShadow: "0 3px 10px rgba(94,74,140,.25)",
            }}
          >
            <i className="ti ti-scan" /> Scanner matériel
          </button>
          {/* 0.58.40 : toggle filtre par contexte bât/svc (apparait si contexte défini) */}
          {(ctx.batimentId || ctx.serviceId) && (
            <button
              onClick={ctx.toggle}
              title="Filtre selon le bâtiment/service courant choisi dans la TopBar"
              style={{
                borderColor: ctx.active ? "#7CC8C8" : "#e3e9ee",
                background: ctx.active ? "rgba(124,200,200,.12)" : "#fff",
                color: ctx.active ? "#1c5454" : "#6c7a89",
                border: "1px solid",
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 12.5,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontWeight: 600,
              }}
            >
              <i className={`ti ${ctx.active ? "ti-eye" : "ti-eye-off"}`} />
              {ctx.active ? "Contexte ON" : "Filtrer par contexte"}
              {ctx.active && <span style={{ background: "#7CC8C8", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 8, marginLeft: 4 }}>●</span>}
            </button>
          )}
          <button
            onClick={exportMaterielsCsv}
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
          {/* 0.62.103 : Toggle vue Liste / Tuiles */}
          <div style={{ display: "inline-flex", background: "#f4f7fa", borderRadius: 8, padding: 3, gap: 2 }}>
            <button onClick={() => setViewMode("list")} title="Vue liste"
              style={{
                padding: "5px 10px", borderRadius: 6,
                background: viewMode === "list" ? "linear-gradient(135deg, #185FA5, #7CC8C8)" : "transparent",
                color: viewMode === "list" ? "#fff" : "#5a6878",
                border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
              }}>
              <i className="ti ti-list" /> Liste
            </button>
            <button onClick={() => setViewMode("grid")} title="Vue tuiles"
              style={{
                padding: "5px 10px", borderRadius: 6,
                background: viewMode === "grid" ? "linear-gradient(135deg, #185FA5, #7CC8C8)" : "transparent",
                color: viewMode === "grid" ? "#fff" : "#5a6878",
                border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
              }}>
              <i className="ti ti-grid-dots" /> Tuiles
            </button>
          </div>
        </div>

        {/* 0.62.103 : Rendu TUILES custom (au-dessus du Crud caché en mode grid) */}
        {viewMode === "grid" && items.length > 0 && (
          <div className="av-stagger" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}>
            {items.filter(r => {
              if (ctx.active && ctxPatientIds && (!r.patient_id || !ctxPatientIds.has(r.patient_id))) return false;
              if (ctx.active && ctx.equipeId && r.equipe_id !== ctx.equipeId) return false;
              if (filterArticleId && r.article_id !== filterArticleId) return false;
              return true;
            }).map(r => {
              const meta = getEtatMeta ? getEtatMeta(r.etat) : { color: "#185FA5", icon: "ti-package" };
              return (
                <div key={r.id} data-3d="true" data-accent="bleu"
                  onClick={() => router.push(`/materiel/${r.id}`)}
                  style={{
                    background: "#fff",
                    borderRadius: 14,
                    padding: 0,
                    cursor: "pointer",
                    border: `1px solid ${meta.color}22`,
                    borderLeft: `4px solid ${meta.color}`,
                  }}>
                  {/* Photo bannière */}
                  <div style={{
                    height: 120, position: "relative",
                    background: r.photo_url
                      ? `url(${r.photo_url}) center/cover`
                      : `linear-gradient(135deg, ${meta.color}22, ${meta.color}08)`,
                    borderRadius: "14px 14px 0 0",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {!r.photo_url && <i className={`ti ${meta.icon}`} style={{ fontSize: 48, color: meta.color }} />}
                    {/* Badge état */}
                    <div style={{
                      position: "absolute", top: 8, right: 8,
                      padding: "3px 9px", borderRadius: 6,
                      background: meta.color, color: "#fff",
                      fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
                      boxShadow: `0 2px 6px ${meta.color}55`,
                    }}>
                      {r.etat || "?"}
                    </div>
                    {/* Tags miniatures */}
                    {(matTags[r.id] || []).length > 0 && (
                      <div style={{ position: "absolute", bottom: 8, left: 8, display: "flex", gap: 3, flexWrap: "wrap" }}>
                        {(matTags[r.id] || []).slice(0, 3).map(tid => {
                          const t = tags.find(x => x.id === tid);
                          if (!t) return null;
                          return (
                            <span key={tid} style={{
                              background: (t.couleur || "#5a6878") + "ee",
                              color: "#fff", padding: "1px 6px",
                              borderRadius: 4, fontSize: 9, fontWeight: 700,
                            }}>{t.libelle}</span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {/* Contenu */}
                  <div style={{ padding: 12 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#142131", marginBottom: 6, lineHeight: 1.25 }}>
                      {r.libelle || "Matériel"}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11, color: "#5a6878" }}>
                      {r.num_serie && (
                        <span>
                          <i className="ti ti-hash" /> S/N <code style={{ fontFamily: "Consolas, monospace", color: "#7a6fb0" }}>{r.num_serie}</code>
                        </span>
                      )}
                      {r.num_lot && (
                        <span>
                          <i className="ti ti-tag" /> Lot <code style={{ fontFamily: "Consolas, monospace", color: "#7CC8C8" }}>{r.num_lot}</code>
                        </span>
                      )}
                      {r.depot_id && depots.find(d => d.id === r.depot_id) && (
                        <span><i className="ti ti-warehouse" /> {depots.find(d => d.id === r.depot_id).nom}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Le Crud reste TOUJOURS rendu pour gérer add/edit/delete, mais caché en mode grid */}
        <div style={{ display: viewMode === "list" ? "block" : "none" }}>
        <Crud
          structureId={auth.structureId}
          etabId={auth.etabId}
          canWrite={auth.can("ecrire")}
          canDelete={auth.can("supprimer")}
          onData={setItems}
          table="materiels"
          title="Nouveau matériel"
          relations={rel}
          extraFilter={(ctx.active || filterArticleId) ? (r) => {
            // 0.58.62 : combine filtre patient (bât/svc) ET filtre équipe
            if (ctx.active && ctxPatientIds && (!r.patient_id || !ctxPatientIds.has(r.patient_id))) return false;
            if (ctx.active && ctx.equipeId && r.equipe_id !== ctx.equipeId) return false;
            // 0.62.2 : filtre par article_id depuis URL
            if (filterArticleId && r.article_id !== filterArticleId) return false;
            return true;
          } : null}
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
                          {/* 0.58.47 : icône custom du tag */}
                          <i className={`ti ${t.icone || "ti-tag"}`} style={{ fontSize: 10, marginRight: 2 }} /> {t.libelle}
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
            { key: "udi_di", label: "UDI", render: (r) => r.udi_di ? <span style={{ fontFamily: "Consolas,monospace", fontSize: 11 }}>{r.udi_di}</span> : "—" },
            { key: "patient_id", label: "Patient", render: (r) => patLabel[r.patient_id] || "—" },
            { key: "chambre_id", label: "Chambre", render: (r) => {
              if (!r.chambre_id) return "—";
              const ch = chambres.find(c => c.id === r.chambre_id);
              return ch ? ch.nom : "—";
            } },
            { key: "depot_id", label: "Dépôt", render: (r) => {
              if (!r.depot_id) return "—";
              const d = depots.find(d => d.id === r.depot_id);
              if (!d) return "—";
              return (
                <span title={d.magasin_id ? "Dépôt magasin" : "Dépôt étab"}>
                  <i className={d.magasin_id ? "ti ti-building-warehouse" : "ti ti-building"} style={{ color: d.magasin_id ? "#5a8f8f" : "#185FA5", marginRight: 3 }} />
                  {d.nom}
                </span>
              );
            } },
            { key: "date_achat", label: "Achat", render: (r) => r.date_achat ? new Date(r.date_achat).toLocaleDateString("fr-FR") : "—" },
            { key: "prix_achat_ht", label: "Prix HT", render: (r) => r.prix_achat_ht ? `${parseFloat(r.prix_achat_ht).toFixed(2)} €` : "—" },
            { key: "etat", label: "État", render: (r) => {
              // 0.58.71 : badge état coloré + indicateur immobilisation
              const etatMeta = getEtatMeta(r.etat);
              return (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 4, fontSize: 10.5, fontWeight: 700,
                    background: etatMeta.tint, color: etatMeta.color,
                    border: `1px solid ${etatMeta.color}40`,
                    display: "inline-flex", alignItems: "center", gap: 3,
                  }}>
                    <i className={`ti ${etatMeta.icon}`} style={{ fontSize: 10 }} /> {r.etat || "—"}
                  </span>
                  {r.immobilisation_active && (
                    <span title="Immobilisé comptablement" style={{
                      padding: "2px 6px", borderRadius: 4, fontSize: 9.5, fontWeight: 700,
                      background: "rgba(94,74,140,.18)", color: "#5e4a8c",
                    }}>📊 IMMO</span>
                  )}
                </span>
              );
            } },
          ]}
          fields={[
            { key: "libelle", label: "Libellé matériel", required: true },
            { key: "article_id", label: "Article rattaché", type: "select" },
            { key: "num_serie", label: "N° de série" },
            { key: "num_parc", label: "N° de parc" },
            { key: "num_lot", label: "N° de lot" },
            { key: "udi_di", label: "UDI (Unique Device Identifier)", help: "Code GS1/HIBC réglementaire" },
            { key: "marque", label: "Marque" },
            { key: "modele", label: "Modèle" },
            { key: "fournisseur", label: "Fournisseur" },
            { key: "patient_id", label: "Patient affecté", type: "select" },
            { key: "chambre_id", label: "Chambre actuelle", type: "select",
              options: chambres.map(c => ({ value: c.id, label: `Ch. ${c.nom}` })),
            },
            { key: "depot_id", label: "🏢 Dépôt de rattachement (EC ou magasin)", type: "select",
              options: depots.map(d => ({
                value: d.id,
                label: `${d.magasin_id ? "🏬 " : "🏢 "}${d.nom}${d.magasin_id ? " (magasin)" : ""}`,
              })),
              help: "Dépôt étab ou dépôt magasin — détermine où est physiquement le matériel",
            },
            { key: "date_achat", label: "Date d'achat", type: "date" },
            { key: "prix_achat_ht", label: "Prix d'achat HT (€)", type: "number" },
            { key: "date_mise_service", label: "Mise en service", type: "date" },
            { key: "duree_amortissement_mois", label: "Durée amortissement (mois)", type: "number" },
            { key: "valeur_nette_comptable", label: "Valeur nette comptable (€)", type: "number" },
            { key: "etat", label: "État", type: "select", options: [
              { value: "Disponible", label: "Disponible" },
              { value: "En location", label: "En location" },
              { value: "Maintenance", label: "Maintenance" },
              { value: "Hors service", label: "Hors service" },
              { value: "Réformé", label: "Réformé" },
            ] },
            { key: "date_prochaine_maintenance", label: "Prochaine maintenance", type: "date" },
            { key: "notes", label: "Notes", type: "textarea" },
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
                        <i className={`ti ${t.icone || "ti-tag"}`} /> {t.libelle}
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
      </div>{/* 0.62.107 : fermeture wrap manquante */}
    </div>
  );
}
