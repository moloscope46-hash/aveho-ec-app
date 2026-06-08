"use client";
// =============================================================
//  CartDropdown — Mini-panier dropdown style Amazon (0.58.87)
//  S'ouvre au click sur l'icône panier de la TopBar
//  Affiche les items, totals, bouton "Voir le panier" et "Vider"
// =============================================================
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

const CART_KEY = "aveho_ec_cart";

export default function CartDropdown({ open, onClose, anchorRef }) {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(CART_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setItems(Array.isArray(parsed) ? parsed : []);
    } catch { setItems([]); }
  }, [open]);

  // Fermer si clic en dehors
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    }
    function handleEsc(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open, onClose, anchorRef]);

  function updateQty(id, delta) {
    setItems(prev => {
      const next = prev.map(it => it.id === id ? { ...it, qte: Math.max(1, (it.qte || 1) + delta) } : it);
      try { localStorage.setItem(CART_KEY, JSON.stringify(next)); window.dispatchEvent(new Event("av-cart-change")); } catch {}
      return next;
    });
  }

  function remove(id) {
    setItems(prev => {
      const next = prev.filter(it => it.id !== id);
      try { localStorage.setItem(CART_KEY, JSON.stringify(next)); window.dispatchEvent(new Event("av-cart-change")); } catch {}
      return next;
    });
  }

  function clear() {
    if (!confirm("Vider entièrement le panier ?")) return;
    setItems([]);
    try { localStorage.setItem(CART_KEY, JSON.stringify([])); window.dispatchEvent(new Event("av-cart-change")); } catch {}
  }

  function goToCart() {
    onClose();
    router.push("/panier");
  }

  const subtotal = items.reduce((s, it) => s + ((parseFloat(it.prix_vente_ht || it.prix) || 0) * (it.qte || 1)), 0);
  const totalQte = items.reduce((s, it) => s + (it.qte || 1), 0);

  // 0.65.6 : Détection mobile pour forcer bottom-sheet (belt-and-suspenders)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 720);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!open) return null;

  return (
    <div ref={dropdownRef} className="tb-dropdown" style={isMobile ? {
      position: "fixed", top: "auto", bottom: 0, left: 0, right: 0,
      width: "100vw", maxWidth: "100vw", maxHeight: "80vh",
      background: "#fff", color: "#142131",
      borderRadius: "18px 18px 0 0",
      boxShadow: "0 -10px 30px rgba(20,33,49,.4)",
      border: "none",
      zIndex: 99998,
      display: "flex", flexDirection: "column",
      fontFamily: "Quicksand, sans-serif",
      overflowY: "auto",
      animation: "av-cart-bottom-sheet-up 280ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      paddingTop: 18,
    } : {
      position: "absolute", top: "calc(100% + 8px)", right: 0,
      width: 380, maxHeight: "calc(100vh - 80px)",
      background: "#fff", color: "#142131",
      borderRadius: 14, boxShadow: "0 16px 50px rgba(20,33,49,.30), 0 2px 8px rgba(0,0,0,.10)",
      border: "1px solid #e3e9ee",
      zIndex: 1000,
      display: "flex", flexDirection: "column",
      fontFamily: "Quicksand, sans-serif",
      animation: "av-cart-dropdown-in 0.18s ease-out",
    }}>
      <style jsx global>{`
        @keyframes av-cart-dropdown-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes av-cart-bottom-sheet-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
      {/* Drag-handle mobile */}
      {isMobile && (
        <div style={{ width: 40, height: 4, background: "rgba(20,33,49,.25)", borderRadius: 99, margin: "0 auto 10px", flexShrink: 0 }} />
      )}

      {/* Header */}
      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid #e3e9ee",
        background: "linear-gradient(135deg, rgba(124,200,200,.08), rgba(20,33,49,.03))",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <i className="ti ti-shopping-cart" style={{ fontSize: 22, color: "#e35d5b" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Mon panier</div>
          <div style={{ fontSize: 11, color: "#5a6878" }}>
            {totalQte} article{totalQte > 1 ? "s" : ""} {subtotal > 0 ? `· ${subtotal.toFixed(2)} € HT` : ""}
          </div>
        </div>
        <button onClick={onClose} aria-label="Fermer" style={{
          background: "rgba(20,33,49,.04)", color: "#142131",
          border: "1px solid #e3e9ee", width: 28, height: 28,
          borderRadius: 6, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit",
        }}>
          <i className="ti ti-x" style={{ fontSize: 14 }} />
        </button>
      </div>

      {/* Items list */}
      <div style={{ flex: 1, overflowY: "auto", maxHeight: 360 }}>
        {items.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#5a6878" }}>
            <i className="ti ti-shopping-cart-off" style={{ fontSize: 48, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: "#142131", marginBottom: 4 }}>Panier vide</div>
            <div style={{ fontSize: 12 }}>Ajoute des articles depuis le catalogue ou la fiche dépôt.</div>
          </div>
        ) : (
          items.map(it => (
            <div key={it.id} style={{
              display: "flex", gap: 10, padding: "10px 14px",
              borderBottom: "1px solid #f0f3f6",
            }}>
              <div style={{
                width: 48, height: 48, flexShrink: 0,
                background: "#f7fafa", border: "1px solid #e3e9ee", borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {it.photo_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={it.photo_url} alt={it.libelle} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 7 }} />
                ) : (
                  <i className="ti ti-package" style={{ color: "#7CC8C8", fontSize: 22 }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {it.libelle || it.titre || "Article"}
                </div>
                {it.code && <div style={{ fontSize: 10.5, color: "#8a98a8", fontFamily: "Consolas, monospace" }}>{it.code}</div>}
                {it.depot_nom && <div style={{ fontSize: 10.5, color: "#5a6878" }}><i className="ti ti-building-warehouse" /> {it.depot_nom}</div>}
                {/* 0.61.8 : badge mercuriale appliquée */}
                {it.mercuriale_id && (
                  <div style={{ marginTop: 4, padding: "2px 6px", background: "rgba(122,111,176,.12)", color: "#7a6fb0", borderRadius: 4, fontSize: 10, fontWeight: 700, display: "inline-flex", gap: 4, alignItems: "center" }}>
                    💰 Mercu {it.mercuriale_nom ? `(${it.mercuriale_nom.slice(0, 20)})` : ""}
                    {it.prix_public && it.prix < it.prix_public && (
                      <span style={{ textDecoration: "line-through", opacity: 0.7, marginLeft: 4 }}>{parseFloat(it.prix_public).toFixed(2)} €</span>
                    )}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                  <button onClick={() => updateQty(it.id, -1)} aria-label="Diminuer" style={qtyBtn}>−</button>
                  <span style={{ fontSize: 12, fontWeight: 700, minWidth: 22, textAlign: "center", fontFamily: "Consolas, monospace" }}>{it.qte || 1}</span>
                  <button onClick={() => updateQty(it.id, 1)} aria-label="Augmenter" style={qtyBtn}>+</button>
                  <span style={{ flex: 1 }} />
                  {(it.prix_vente_ht || it.prix) && (
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: "#5aa05a" }}>{(parseFloat(it.prix_vente_ht || it.prix) * (it.qte || 1)).toFixed(2)} €</span>
                  )}
                  <button onClick={() => remove(it.id)} aria-label="Retirer" style={{
                    background: "rgba(227,93,91,.10)", color: "#e35d5b",
                    border: "1px solid rgba(227,93,91,.25)",
                    width: 24, height: 24, borderRadius: 6, cursor: "pointer",
                    fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <i className="ti ti-trash" style={{ fontSize: 11 }} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer actions */}
      {items.length > 0 && (
        <div style={{
          padding: 14, borderTop: "1px solid #e3e9ee",
          background: "#fafbfc",
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          {subtotal > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
              <span style={{ color: "#5a6878" }}>Sous-total HT</span>
              <span style={{ fontWeight: 700, fontFamily: "Consolas, monospace" }}>{subtotal.toFixed(2)} €</span>
            </div>
          )}
          <button onClick={goToCart} style={{
            width: "100%",
            background: "linear-gradient(135deg, #e35d5b, #c0494a)",
            color: "#fff", border: "none",
            padding: "11px", borderRadius: 10,
            fontFamily: "inherit", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
            boxShadow: "0 4px 12px rgba(227,93,91,.30)",
          }}>
            <i className="ti ti-shopping-cart" /> Voir mon panier · Commander
          </button>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onClose} style={{
              flex: 1, background: "transparent", color: "#185FA5",
              border: "1px solid #cfd8e0", padding: "8px", borderRadius: 8,
              fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
              Continuer mes achats
            </button>
            <button onClick={clear} style={{
              background: "transparent", color: "#e35d5b",
              border: "1px solid rgba(227,93,91,.20)", padding: "8px 12px", borderRadius: 8,
              fontFamily: "inherit", fontSize: 12, cursor: "pointer",
            }}>
              <i className="ti ti-trash" /> Vider
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const qtyBtn = {
  background: "#fff", color: "#142131",
  border: "1px solid #cfd8e0",
  width: 22, height: 22, borderRadius: 5,
  cursor: "pointer", fontFamily: "inherit",
  fontSize: 13, fontWeight: 700, lineHeight: 1,
  display: "flex", alignItems: "center", justifyContent: "center",
};
