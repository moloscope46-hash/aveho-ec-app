"use client";
// app/patient/[id]/edit/tabs/TabIdentite.js — extrait depuis page.js en 0.57.1

import React, { useState, useEffect } from "react";
import { Panel} from "../../../../ui";
// 0.57.10 : imports retirés (logger non utilisés)

import AdresseAutocomplete from "../../../../AdresseAutocomplete";
import { Field, FieldSelect } from "./_helpers";

function TabIdentite({ pat, set }) {
  return (
    <Panel>
      <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
        <i className="ti ti-user-circle" style={{ color: "#185FA5", marginRight: 6 }} /> Identité du patient
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        <Field label="Nom *" value={pat.nom} onChange={v => set("nom", v)} required />
        <Field label="Prénom" value={pat.prenom} onChange={v => set("prenom", v)} />
        <Field label="Nom de naissance" value={pat.nom_naissance} onChange={v => set("nom_naissance", v)} />
        <FieldSelect label="Sexe" value={pat.sexe} onChange={v => set("sexe", v)} options={[
          { v: "", lbl: "—" }, { v: "M", lbl: "Masculin" }, { v: "F", lbl: "Féminin" }, { v: "X", lbl: "Non précisé" },
        ]} />
        <Field label="Date de naissance" type="date" value={pat.date_naissance} onChange={v => set("date_naissance", v)} />
        <Field label="Pays de naissance" value={pat.lieu_naissance_pays || "France"} onChange={v => set("lieu_naissance_pays", v)} />
        <Field label="Nationalité" value={pat.nationalite || "Française"} onChange={v => set("nationalite", v)} />
        <Field label="N° dossier interne" value={pat.numero_dossier} onChange={v => set("numero_dossier", v)} />
      </div>
      {/* 0.55.55 : lieu de naissance — autocomplete commune BAN INSEE */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 10.5, color: "#6c7a89", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700, marginBottom: 4 }}>
          Lieu de naissance (commune INSEE)
        </div>
        <AdresseAutocomplete
          value={pat.lieu_naissance_ville || ""}
          onChange={v => set("lieu_naissance_ville", v)}
          onSelect={(a) => {
            set("lieu_naissance_ville", a.ville || a.label?.split(" ")[0]);
            if (a.code_insee) set("lieu_naissance_code_insee", a.code_insee);
          }}
          placeholder="Tape une ville (ex Paris, Lyon, Toulouse…)"
        />
        <div style={{ marginTop: 6 }}>
          <Field label="Code INSEE commune (5 chiffres — rempli auto)" value={pat.lieu_naissance_code_insee} onChange={v => set("lieu_naissance_code_insee", v)} mono />
        </div>
      </div>
    </Panel>
  );
}

export default TabIdentite;
