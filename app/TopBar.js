"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "../lib/supabase";

const MENU = [
  { section: "Mon espace", items: [
    { p: "/accueil", ic: "ti-home", lbl: "Accueil", col: "#7CC8C8" },
    { p: "/magasins", ic: "ti-building-store", lbl: "Magasins", col: "#5a8f8f" },
    { p: "/promotions", ic: "ti-discount-2", lbl: "Promotions", col: "#e35d5b" },
  ] },
  { section: "Établissement", items: [
    { p: "/patients", ic: "ti-users", lbl: "Patients", col: "#7a6fb0" },
    { p: "/etablissement", ic: "ti-building-hospital", lbl: "Mon établissement", col: "#185FA5" },
    { p: "/materiels", ic: "ti-armchair-2", lbl: "Matériel", col: "#142131" },
    { p: "/articles", ic: "ti-package", lbl: "Articles", col: "#5aa05a" },
    { p: "/interventions", ic: "ti-tools", lbl: "Interventions", col: "#c0392b" },
  ] },
  { section: "Stock", items: [
    { p: "/depots", ic: "ti-building-warehouse", lbl: "Dépôts", col: "#5a8f8f" },
    { p: "/stock", ic: "ti-stack-2", lbl: "Stock", col: "#c97a2a" },
    { p: "/transferts", ic: "ti-transfer", lbl: "Transferts", col: "#7a6fb0" },
  ] },
  { section: "Commandes", items: [
    { p: "/panier", ic: "ti-shopping-cart", lbl: "Panier", col: "#e35d5b", count: "cart" },
    { p: "/commandes", ic: "ti-truck-delivery", lbl: "Mes commandes", col: "#5a8f8f" },
  ] },
  { section: "Collectivité", items: [
    { p: "/vue-globale", ic: "ti-layout-dashboard", lbl: "Vue globale", col: "#185FA5" },
    { p: "/collectivite", ic: "ti-building-community", lbl: "Fiche collectivité", col: "#5a8f8f" },
  ] },
  { section: "Administration", items: [
    { p: "/utilisateurs", ic: "ti-users-group", lbl: "Utilisateurs", col: "#185FA5" },
  ] },
];
const TITLES = Object.fromEntries(MENU.flatMap((s) => s.items).map((i) => [i.p, i.lbl]));

export default function TopBar({ cartCount = 0, auth }) {
  const supabase = createClient();
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; }, [open]);

  async function logout() { await supabase.auth.signOut(); router.push("/login"); }
  function go(p) { setOpen(false); router.push(p); }

  return (
    <>
      <div className="topbar">
        <button className="burger" onClick={() => setOpen(true)} aria-label="Menu"><i className="ti ti-menu-2" /></button>
        <span className="logo" onClick={() => router.push("/accueil")}>a<span className="v">v</span>eho</span>
        <span className="tb-page">{TITLES[path] || ""}</span>
        <div className="spacer" />
        {auth && auth.etablissements && auth.etablissements.length > 0 && (
          <div className="etab-switch">
            <i className="ti ti-building-hospital" />
            <select value={auth.etabId || ""} onChange={(e) => auth.setEtab(e.target.value)}>
              {auth.etablissements.map((et) => <option key={et.id} value={et.id}>{et.nom}</option>)}
            </select>
          </div>
        )}
        <button className="tb-icon" onClick={() => router.push("/panier")} aria-label="Panier">
          <i className="ti ti-shopping-cart" />{cartCount > 0 && <span className="tb-badge">{cartCount}</span>}
        </button>
        <button className="tb-icon" onClick={logout} aria-label="Déconnexion"><i className="ti ti-logout" /></button>
      </div>

      <div className={`menu-overlay${open ? " open" : ""}`} onClick={() => setOpen(false)} />
      <nav className={`menu-drawer${open ? " open" : ""}`}>
        <div className="menu-head">
          <span className="logo">a<span className="v">v</span>eho</span>
          <button className="menu-close" onClick={() => setOpen(false)} aria-label="Fermer"><i className="ti ti-x" /></button>
        </div>
        <div className="menu-scroll">
          {MENU.map((sec) => (
            <div className="menu-section" key={sec.section}>
              <div className="menu-section-h">{sec.section}<span className="bar" /></div>
              <div className="menu-tiles">
                {sec.items.map((it) => {
                  const cnt = it.count === "cart" ? cartCount : 0;
                  return (
                    <button key={it.p} className={`menu-tile${path === it.p ? " on" : ""}`} onClick={() => go(it.p)}>
                      {cnt > 0 && <span className="mt-count teal">{cnt}</span>}
                      <span className="mt-ic" style={{ background: it.col + "22", color: it.col }}><i className={`ti ${it.ic}`} /></span>
                      <span className="mt-lbl">{it.lbl}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}
