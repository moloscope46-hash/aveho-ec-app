"use client";
import { useState, useEffect, useCallback } from "react";
// 0.61.8 : application auto mercuriale au moment du add to cart
import { getPrixMercurialeActif } from "../lib/mercurialeHelper";

const KEY = "aveho_ec_cart";

export function useCart() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    function reload() {
      try { setItems(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { setItems([]); }
    }
    reload();
    function onCartChange() { reload(); }
    if (typeof window !== "undefined") {
      window.addEventListener("av-cart-change", onCartChange);
      window.addEventListener("storage", onCartChange);
      return () => {
        window.removeEventListener("av-cart-change", onCartChange);
        window.removeEventListener("storage", onCartChange);
      };
    }
  }, []);

  const persist = useCallback((next) => {
    setItems(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      if (typeof window !== "undefined") window.dispatchEvent(new Event("av-cart-change"));
    } catch {}
  }, []);

  const add = useCallback((promo) => {
    setItems((cur) => {
      const exist = cur.find((i) => i.id === promo.id);
      const next = exist
        ? cur.map((i) => i.id === promo.id ? { ...i, qte: i.qte + 1 } : i)
        : [...cur, { id: promo.id, titre: promo.titre, prix: promo.prix_apres, unite: promo.unite, magasin_id: promo.magasin_id, qte: 1 }];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
        if (typeof window !== "undefined") window.dispatchEvent(new Event("av-cart-change"));
      } catch {}
      return next;
    });
  }, []);

  // 0.61.8 : ajout avec application auto mercuriale active de l'étab
  const addWithMercuriale = useCallback(async ({ article, etablissementId, qte = 1 }) => {
    let prixFinal = article.prix_apres || article.prix_public_ht || 0;
    let mercurialeInfo = null;
    if (article.id && etablissementId) {
      try {
        const res = await getPrixMercurialeActif({ articleId: article.id, etablissementId });
        if (res) {
          prixFinal = res.prix;
          mercurialeInfo = { id: res.mercurialeId, nom: res.mercurialeNom, source: res.source };
        }
      } catch (e) { console.warn("[mercu cart]", e); }
    }
    setItems((cur) => {
      const exist = cur.find((i) => i.id === article.id);
      const itemBase = exist
        ? { ...exist, qte: exist.qte + qte }
        : {
            id: article.id, titre: article.titre || article.libelle,
            prix: prixFinal, prix_public: article.prix_apres || article.prix_public_ht || prixFinal,
            unite: article.unite, magasin_id: article.magasin_id,
            etablissement_id: etablissementId,
            mercuriale_id: mercurialeInfo?.id || null,
            mercuriale_nom: mercurialeInfo?.nom || null,
            mercuriale_source: mercurialeInfo?.source || null,
            qte,
          };
      const next = exist ? cur.map(i => i.id === article.id ? itemBase : i) : [...cur, itemBase];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
        if (typeof window !== "undefined") window.dispatchEvent(new Event("av-cart-change"));
      } catch {}
      return next;
    });
    return mercurialeInfo;
  }, []);

  const remove = useCallback((id) => persist(items.filter((i) => i.id !== id)), [items, persist]);
  const clear = useCallback(() => persist([]), [persist]);
  const setQte = useCallback((id, qte) => persist(items.map((i) => i.id === id ? { ...i, qte: Math.max(1, qte) } : i)), [items, persist]);

  const count = items.reduce((s, i) => s + i.qte, 0);
  const total = items.reduce((s, i) => s + i.prix * i.qte, 0);
  // 0.61.8 : nombre de lignes avec mercuriale appliquée
  const nbMercu = items.filter(i => i.mercuriale_id).length;

  return { items, add, addWithMercuriale, remove, clear, setQte, count, total, nbMercu };
}
