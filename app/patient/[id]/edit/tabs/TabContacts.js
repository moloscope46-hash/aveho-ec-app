"use client";
// app/patient/[id]/edit/tabs/TabContacts.js — extrait depuis page.js en 0.57.1

import React, { useState, useEffect } from "react";
import { Panel} from "../../../../ui";
// 0.57.10 : imports retirés (logger non utilisés)

import { Field} from "./_helpers";
function TabContacts({ pat, set }) {
  return (
    <>
      <Panel style={{ marginBottom: 12 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
          <i className="ti ti-phone" style={{ color: "#185FA5", marginRight: 6 }} /> Contact patient
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <Field label="Téléphone fixe" value={pat.telephone_fixe} onChange={v => set("telephone_fixe", v)} mono />
          <Field label="Téléphone portable" value={pat.telephone_portable} onChange={v => set("telephone_portable", v)} mono />
          <Field label="Email" type="email" value={pat.email} onChange={v => set("email", v)} />
        </div>
      </Panel>

      <Panel style={{ marginBottom: 12, background: "linear-gradient(135deg, #fff8ec 0%, #fff 100%)", borderColor: "#f0d59f" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
          <i className="ti ti-emergency-bed" style={{ color: "#c0392b", marginRight: 6 }} /> Personne à prévenir (urgence)
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <Field label="Nom" value={pat.contact_urgence_nom} onChange={v => set("contact_urgence_nom", v)} />
          <Field label="Prénom" value={pat.contact_urgence_prenom} onChange={v => set("contact_urgence_prenom", v)} />
          <Field label="Lien de parenté" value={pat.contact_urgence_lien} onChange={v => set("contact_urgence_lien", v)} placeholder="Conjoint, enfant, aidant…" />
          <Field label="Téléphone" value={pat.contact_urgence_telephone} onChange={v => set("contact_urgence_telephone", v)} mono />
        </div>
      </Panel>

      <Panel style={{ background: "#f3effa", borderColor: "#d6c9ec" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
          <i className="ti ti-shield-heart" style={{ color: "#7a6fb0", marginRight: 6 }} /> Personne de confiance
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <Field label="Nom" value={pat.personne_confiance_nom} onChange={v => set("personne_confiance_nom", v)} />
          <Field label="Prénom" value={pat.personne_confiance_prenom} onChange={v => set("personne_confiance_prenom", v)} />
          <Field label="Téléphone" value={pat.personne_confiance_telephone} onChange={v => set("personne_confiance_telephone", v)} mono />
        </div>
        <div style={{ marginTop: 8, padding: 8, background: "rgba(255,255,255,.6)", borderRadius: 6, fontSize: 11, color: "#5a4a90" }}>
          <i className="ti ti-info-circle" /> La personne de confiance est désignée par le patient (loi du 4 mars 2002). Elle peut l'accompagner dans ses démarches et être consultée en cas d'incapacité de s'exprimer.
        </div>
      </Panel>
    </>
  );
}

export default TabContacts;
