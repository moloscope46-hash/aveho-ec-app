// =============================================================
//  mercurialeHelper — Application auto des prix de mercuriale (0.61.7)
// =============================================================
import { createClient } from "./supabase";

/**
 * Pour un article et un établissement donné, retourne le prix négocié
 * de la mercuriale ACTIVE en cours, ou null si pas de mercuriale applicable.
 *
 * Recherche dans cet ordre :
 *   1. Mercuriale active rattachée à cet étab + cet article (via rattachement)
 *   2. Mercuriale active générique (pas d'étab) + cet article
 *   3. Prix négocié direct dans articles_rattachements (override)
 *   4. null (utiliser prix public)
 */
export async function getPrixMercurialeActif({ articleId, etablissementId }) {
  if (!articleId || !etablissementId) return null;
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  try {
    // 1. Cherche rattachement direct (article étab → article magasin) avec prix négocié override
    const rat = await supabase.from("articles_rattachements")
      .select("article_magasin_id, prix_negocie_ht")
      .eq("article_etablissement_id", articleId)
      .eq("etablissement_id", etablissementId)
      .maybeSingle();

    let articleMagasinId = rat.data?.article_magasin_id || articleId;

    // Si prix négocié direct dans rattachement → priorité absolue
    if (rat.data?.prix_negocie_ht) {
      return {
        prix: parseFloat(rat.data.prix_negocie_ht),
        source: "rattachement_direct",
        mercurialeId: null,
      };
    }

    // 2. Cherche mercuriale active sur cet étab
    const merEtab = await supabase
      .from("mercuriales_lignes")
      .select("prix_negocie_ht, mercuriale_id, mercuriales!inner(id, nom, statut, etablissement_id, date_debut, date_fin)")
      .eq("article_id", articleMagasinId)
      .eq("mercuriales.statut", "active")
      .eq("mercuriales.etablissement_id", etablissementId);

    const valides = (merEtab.data || []).filter(m => {
      const m2 = m.mercuriales;
      if (!m2) return false;
      if (m2.date_debut && m2.date_debut > today) return false;
      if (m2.date_fin && m2.date_fin < today) return false;
      return true;
    });
    if (valides.length > 0) {
      const best = valides[0];
      return {
        prix: parseFloat(best.prix_negocie_ht),
        source: "mercuriale_etab",
        mercurialeId: best.mercuriale_id,
        mercurialeNom: best.mercuriales?.nom,
      };
    }

    // 3. Cherche mercuriale active générique (pas d'étab)
    const merGen = await supabase
      .from("mercuriales_lignes")
      .select("prix_negocie_ht, mercuriale_id, mercuriales!inner(id, nom, statut, etablissement_id, date_debut, date_fin)")
      .eq("article_id", articleMagasinId)
      .eq("mercuriales.statut", "active")
      .is("mercuriales.etablissement_id", null);

    const validesGen = (merGen.data || []).filter(m => {
      const m2 = m.mercuriales;
      if (!m2) return false;
      if (m2.date_debut && m2.date_debut > today) return false;
      if (m2.date_fin && m2.date_fin < today) return false;
      return true;
    });
    if (validesGen.length > 0) {
      const best = validesGen[0];
      return {
        prix: parseFloat(best.prix_negocie_ht),
        source: "mercuriale_generique",
        mercurialeId: best.mercuriale_id,
        mercurialeNom: best.mercuriales?.nom,
      };
    }

    return null;
  } catch (e) {
    console.warn("[getPrixMercurialeActif]", e);
    return null;
  }
}

/**
 * Enrichit une ligne de panier avec son prix mercuriale.
 * Modifie la ligne en place et retourne true si un prix a été appliqué.
 */
export async function appliquerMercurialeLigne(ligne, etablissementId) {
  if (!ligne?.article_id || !etablissementId) return false;
  const res = await getPrixMercurialeActif({ articleId: ligne.article_id, etablissementId });
  if (res) {
    ligne.prix_mercuriale_ht = res.prix;
    ligne.mercuriale_id = res.mercurialeId;
    ligne.mercuriale_nom = res.mercurialeNom;
    ligne.mercuriale_source = res.source;
    return true;
  }
  return false;
}
