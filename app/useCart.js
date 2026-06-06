"use client";
import { useState, useEffect, useCallback } from "react";

const KEY = "aveho_ec_cart";

export function useCart() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    function reload() {
      try { setItems(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { setItems([]); }
    }
    reload();
    // 0.58.87 : écoute les modifications du panier depuis d'autres composants
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
      // 0.58.87 : notifie les autres composants (CartDropdown, badge TopBar)
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

  const remove = useCallback((id) => persist(items.filter((i) => i.id !== id)), [items, persist]);
  const clear = useCallback(() => persist([]), [persist]);
  const setQte = useCallback((id, qte) => persist(items.map((i) => i.id === id ? { ...i, qte: Math.max(1, qte) } : i)), [items, persist]);

  const count = items.reduce((s, i) => s + i.qte, 0);
  const total = items.reduce((s, i) => s + i.prix * i.qte, 0);

  return { items, add, remove, clear, setQte, count, total };
}
