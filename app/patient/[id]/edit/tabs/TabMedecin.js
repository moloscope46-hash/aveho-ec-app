"use client";
// app/patient/[id]/edit/tabs/TabMedecin.js — extrait depuis page.js en 0.57.1

import React, { useState, useEffect } from "react";
import { Panel} from "../../../../ui";
// 0.57.10 : imports retirés (logger non utilisés)

import { Field } from "./_helpers";

function TabMedecin({ pat, set }) {
  return (
    <Panel>
      <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
        <i className="ti ti-stethoscope" style={{ color: "#c0392b", marginRight: 6 }} /> Médecin traitant
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        <Field label="Nom du médecin" value={pat.medecin_traitant} onChange={v => set("medecin_traitant", v)} />
        <Field label="Prénom" value={pat.medecin_traitant_prenom} onChange={v => set("medecin_traitant_prenom", v)} />
        <Field label="Téléphone" value={pat.medecin_traitant_telephone} onChange={v => set("medecin_traitant_telephone", v)} mono />
        <Field label="N° RPPS (11 chiffres)" value={pat.medecin_traitant_rpps} onChange={v => set("medecin_traitant_rpps", v)} mono placeholder="10000000001" />
        <Field label="FINESS établissement" value={pat.medecin_traitant_finess} onChange={v => set("medecin_traitant_finess", v)} mono />
      </div>
      <div style={{ marginTop: 14, padding: 10, background: "#f4f7fa", borderRadius: 8, fontSize: 11.5, color: "#6c7a89" }}>
        <i className="ti ti-info-circle" /> Le médecin traitant est déclaré à la CPAM par le patient. Sa désignation est obligatoire pour bénéficier du parcours de soins coordonné et du remboursement à 100% sur la base de remboursement.
      </div>
    </Panel>
  );
}

export default TabMedecin;
