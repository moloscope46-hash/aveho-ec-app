"use client";
// app/patient/[id]/edit/tabs/TabSecu.js — extrait depuis page.js en 0.57.1

import React, { useState, useEffect } from "react";
import { Panel} from "../../../../ui";
// 0.57.10 : imports retirés (logger non utilisés)

import CaisseSearch from "../../../../CaisseSearch";
import MutuelleSearch from "../../../../MutuelleSearch";
import ContactActions from "../../../../ContactActions";
import { Lbl, Field, FieldSelect, Toggle} from "./_helpers";
function TabSecu({ pat, set, caisseInfo, onCaisseSelect, mutuelleInfo, onMutuelleSelect }) {
  return (
    <>
      <Panel style={{ marginBottom: 12 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
          <i className="ti ti-shield-check" style={{ color: "#185FA5", marginRight: 6 }} /> Sécurité sociale (AMO)
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 12 }}>
          <Field label="N° de Sécurité Sociale (NIR — 15 chiffres)" value={pat.numero_secu} onChange={v => set("numero_secu", v)} placeholder="1 85 03 75 116 001 23" mono />
          <FieldSelect label="Régime" value={pat.regime_secu} onChange={v => set("regime_secu", v)} options={[
            { v: "", lbl: "—" },
            { v: "general", lbl: "Général" },
            { v: "agricole", lbl: "Agricole (MSA)" },
            { v: "militaire", lbl: "Militaire (CNMSS)" },
            { v: "fonctionnaire", lbl: "Fonctionnaire (LMG)" },
            { v: "special", lbl: "Spécial" },
          ]} />
          <FieldSelect label="Qualité" value={pat.qualite_assure} onChange={v => set("qualite_assure", v)} options={[
            { v: "", lbl: "—" }, { v: "assure", lbl: "Assuré" }, { v: "ayant_droit", lbl: "Ayant droit" },
          ]} />
          <Field label="Rang naissance" type="number" value={pat.rang_naissance} onChange={v => set("rang_naissance", parseInt(v) || null)} />
        </div>

        <div style={{ marginBottom: 10 }}>
          <Lbl>Caisse d'affiliation</Lbl>
          {caisseInfo ? (
            <div style={{ padding: 8, background: "#dbe7f5", borderRadius: 6, marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className="ti ti-shield-check" style={{ color: "#185FA5" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{caisseInfo.nom}</div>
                  <div style={{ fontSize: 11, color: "#6c7a89" }}>
                    Code {caisseInfo.code_organisme} · {caisseInfo.type_caisse || caisseInfo.type}
                    {caisseInfo.departement ? ` · Dept ${caisseInfo.departement}` : ""}
                  </div>
                </div>
                <button onClick={() => onCaisseSelect(null)} style={{ background: "transparent", border: "none", color: "#c0392b", fontSize: 18, cursor: "pointer" }}>×</button>
              </div>
              {/* 0.56.4 : actions contact tel/mail/GPS/web */}
              <div style={{ marginTop: 6 }}>
                <ContactActions entity={caisseInfo} size="sm" />
              </div>
            </div>
          ) : (
            <CaisseSearch onSelect={onCaisseSelect} />
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 12 }}>
          <Field label="Centre de paiement" value={pat.centre_paiement} onChange={v => set("centre_paiement", v)} />
          <Field label="Date début droits" type="date" value={pat.date_debut_droits} onChange={v => set("date_debut_droits", v)} />
          <Field label="Date fin droits" type="date" value={pat.date_fin_droits} onChange={v => set("date_fin_droits", v)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <Toggle label="ALD" value={pat.ald} onChange={v => set("ald", v)} color="#c0392b" />
          <Toggle label="C2S (ex CMU-C)" value={pat.c2s} onChange={v => set("c2s", v)} color="#EF9F27" />
          <Toggle label="AME" value={pat.ame} onChange={v => set("ame", v)} color="#7a6fb0" />
        </div>
        {pat.ald && (
          <div style={{ marginTop: 8 }}>
            <Field label="Commentaire ALD" value={pat.ald_commentaire} onChange={v => set("ald_commentaire", v)} placeholder="Diagnostic, n° d'exonération…" />
          </div>
        )}
      </Panel>

      <Panel style={{ background: "#f3effa", borderColor: "#d6c9ec" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
          <i className="ti ti-heart-handshake" style={{ color: "#7a6fb0", marginRight: 6 }} /> Complémentaire santé (AMC)
        </h3>

        <div style={{ marginBottom: 10 }}>
          <Lbl>Organisme complémentaire (mutuelle / assurance)</Lbl>
          {mutuelleInfo ? (
            <div style={{ padding: 8, background: "#e9defc", borderRadius: 6, marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className="ti ti-heart-handshake" style={{ color: "#7a6fb0" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{mutuelleInfo.raison_sociale || mutuelleInfo.nom}</div>
                  <div style={{ fontSize: 11, color: "#6c7a89" }}>
                    AMC {mutuelleInfo.numero_amc} · {mutuelleInfo.type_organisme || mutuelleInfo.type}
                    {mutuelleInfo.gere_c2s ? " · Gère C2S" : ""}
                  </div>
                </div>
                <button onClick={() => onMutuelleSelect(null)} style={{ background: "transparent", border: "none", color: "#c0392b", fontSize: 18, cursor: "pointer" }}>×</button>
              </div>
              {/* 0.56.4 : actions contact tel/mail/GPS/web */}
              <div style={{ marginTop: 6 }}>
                <ContactActions entity={mutuelleInfo} size="sm" />
              </div>
            </div>
          ) : (
            <MutuelleSearch onSelect={onMutuelleSelect} />
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          <Field label="N° AMC (8 chiffres)" value={pat.mutuelle_numero_amc} onChange={v => set("mutuelle_numero_amc", v)} mono />
          <Field label="N° adhérent" value={pat.mutuelle_numero_adherent} onChange={v => set("mutuelle_numero_adherent", v)} />
          <Field label="Date début droits mutuelle" type="date" value={pat.mutuelle_date_debut_droits} onChange={v => set("mutuelle_date_debut_droits", v)} />
          <Field label="Date fin droits mutuelle" type="date" value={pat.mutuelle_date_fin_droits} onChange={v => set("mutuelle_date_fin_droits", v)} />
        </div>

        <div style={{ marginTop: 10 }}>
          <Toggle label="Tiers payant actif" value={pat.tiers_payant_actif !== false} onChange={v => set("tiers_payant_actif", v)} color="#5aa05a" />
        </div>
      </Panel>
    </>
  );
}

export default TabSecu;
