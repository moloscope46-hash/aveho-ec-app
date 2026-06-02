"use client";
// app/patient/[id]/edit/tabs/TabAdresses.js — extrait depuis page.js en 0.57.1

import React, { useState, useEffect } from "react";
import { Panel} from "../../../../ui";
// 0.57.10 : imports retirés (logger non utilisés)

import AdresseAutocomplete from "../../../../AdresseAutocomplete";
import { Field} from "./_helpers";
function TabAdresses({ pat, set, adresses, onAdd, onUpdate, onSave, onRemove }) {
  // 0.55.55 : appliquer les champs renvoyés par AdresseAutocomplete BAN
  function fillFromBAN(a) {
    set("adresse", a.adresse);
    set("code_postal", a.code_postal);
    set("ville", a.ville);
    if (a.code_insee) set("code_insee_residence", a.code_insee);
    if (a.latitude) set("latitude", a.latitude);
    if (a.longitude) set("longitude", a.longitude);
  }
  return (
    <>
      <Panel style={{ marginBottom: 12 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
          <i className="ti ti-home" style={{ color: "#185FA5", marginRight: 6 }} /> Adresse principale (sociale)
        </h3>
        {/* 0.55.55 : autocomplete BAN INSEE — la rue/cp/ville/insee se remplissent ensemble */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10.5, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700, marginBottom: 4 }}>
            Recherche d'adresse (BAN INSEE)
          </div>
          <AdresseAutocomplete
            value={pat.adresse || ""}
            onChange={v => set("adresse", v)}
            onSelect={fillFromBAN}
            placeholder="Tape une adresse — sélectionne pour remplir auto cp + ville + INSEE"
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <Field label="Complément (résidence, étage)" value={pat.complement_adresse} onChange={v => set("complement_adresse", v)} />
          <Field label="Code postal" value={pat.code_postal} onChange={v => set("code_postal", v)} mono />
          <Field label="Ville" value={pat.ville} onChange={v => set("ville", v)} />
          <Field label="Code INSEE résidence" value={pat.code_insee_residence} onChange={v => set("code_insee_residence", v)} mono placeholder="(rempli auto)" />
          <Field label="Pays" value={pat.pays || "France"} onChange={v => set("pays", v)} />
        </div>
      </Panel>

      <Panel style={{ background: "linear-gradient(135deg, #eef9ef 0%, #fff 100%)", borderColor: "#bfe2bf" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: 15, flex: 1 }}>
            <i className="ti ti-truck-delivery" style={{ color: "#5aa05a", marginRight: 6 }} /> Adresses de livraison
            <span style={{ marginLeft: 8, fontSize: 11, color: "#2e6f33", fontWeight: 700, background: "#dff5e0", padding: "2px 8px", borderRadius: 8 }}>
              {adresses.length}
            </span>
          </h3>
          <button onClick={onAdd} style={{ background: "#5aa05a", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
            <i className="ti ti-plus" /> Ajouter
          </button>
        </div>

        {adresses.length === 0 && (
          <div style={{ padding: 14, background: "#fff", borderRadius: 8, fontSize: 12.5, color: "#6c7a89", textAlign: "center" }}>
            Aucune adresse de livraison. <button onClick={onAdd} style={{ background: "transparent", border: "none", color: "#5aa05a", textDecoration: "underline", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}>+ Ajouter une première adresse</button>
            <div style={{ marginTop: 6, fontSize: 11 }}>(par défaut, on livre à l'adresse principale ci-dessus)</div>
          </div>
        )}

        {adresses.map((a, i) => (
          <div key={a.id} style={{ background: "#fff", border: "1px solid #e3e9ee", borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <input
                value={a.libelle || ""}
                onChange={(e) => onUpdate(a.id, "libelle", e.target.value)}
                placeholder="Libellé (ex Domicile, Maison campagne…)"
                style={{ flex: 1, minWidth: 160, padding: "6px 10px", border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 13, fontWeight: 700, color: "#142131", fontFamily: "inherit" }}
              />
              <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#5aa05a", fontWeight: 600, cursor: "pointer" }}>
                <input type="checkbox" checked={a.est_principale || false} onChange={(e) => onUpdate(a.id, "est_principale", e.target.checked)} />
                Principale
              </label>
              <button onClick={() => onSave(a.id)} style={{ background: "#185FA5", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <i className="ti ti-device-floppy" /> Sauv.
              </button>
              <button onClick={() => onRemove(a.id)} style={{ background: "transparent", border: "none", color: "#c0392b", fontSize: 18, cursor: "pointer", padding: 0 }} title="Supprimer">×</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
              <Field label="Destinataire (si différent)" value={a.destinataire} onChange={v => onUpdate(a.id, "destinataire", v)} placeholder="Mme Dupont (sa fille)" compact />
              <Field label="Téléphone contact" value={a.telephone_contact} onChange={v => onUpdate(a.id, "telephone_contact", v)} compact />
              {/* 0.55.55 : autocomplete BAN INSEE sur livraison aussi */}
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 10, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 700, marginBottom: 2 }}>
                  Adresse (BAN)
                </div>
                <AdresseAutocomplete
                  value={a.adresse || ""}
                  onChange={v => onUpdate(a.id, "adresse", v)}
                  onSelect={(adr) => {
                    onUpdate(a.id, "adresse", adr.adresse);
                    onUpdate(a.id, "cp", adr.code_postal);
                    onUpdate(a.id, "ville", adr.ville);
                  }}
                  compact
                  placeholder="Tape une adresse — auto cp + ville"
                />
              </div>
              <Field label="Complément" value={a.complement} onChange={v => onUpdate(a.id, "complement", v)} compact />
              <Field label="Code postal" value={a.cp} onChange={v => onUpdate(a.id, "cp", v)} mono compact />
              <Field label="Ville" value={a.ville} onChange={v => onUpdate(a.id, "ville", v)} compact />
              <Field label="Code porte / digicode" value={a.code_porte} onChange={v => onUpdate(a.id, "code_porte", v)} mono compact />
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Instructions livraison" value={a.instructions} onChange={v => onUpdate(a.id, "instructions", v)} placeholder='Sonner 2×, au fond de la cour…' compact />
              </div>
            </div>
          </div>
        ))}
      </Panel>
    </>
  );
}

export default TabAdresses;
