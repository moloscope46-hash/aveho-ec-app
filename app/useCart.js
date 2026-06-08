"use client";
import { useState, useEffect, useCallback } from "react";

const KEY = "aveho_ec_cart";

export function useCart() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { setItems([]); }
  }, []);

  const persist = useCallback((next) => {
    setItems(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  }, []);

  const add = useCallback((promo) => {
    setItems((cur) => {
      const exist = cur.find((i) => i.id === promo.id);
      const next = exist
        ? cur.map((i) => i.id === promo.id ? { ...i, qte: i.qte + 1 } : i)
        : [...cur, { id: promo.id, titre: promo.titre, prix: promo.prix_apres, unite: promo.unite, magasin_id: promo.magasin_id, qte: 1 }];
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
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
