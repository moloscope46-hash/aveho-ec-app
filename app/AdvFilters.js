"use client";
// =============================================================
//  Composant AdvFilters (Alpha 0.8)
//  Panneau de filtres avancés réutilisable.
//  Usage :
//    <AdvFilters
//      fields={[
//        { key: "q", label: "Recherche", type: "text" },
//        { key: "etat", label: "État", type: "select", options: ["Présent","Sorti"] },
//      ]}
//      values={filters}
//      onChange={setFilters}
//    />
//  Le parent gère ensuite le filtrage des rows selon `filters`.
// =============================================================
import { useState } from "react";

export default function AdvFilters({ fields, values, onChange, title = "Filtres avancés" }) {
  const [open, setOpen] = useState(false);
  const hasActive = Object.values(values || {}).some((v) => v !== "" && v != null);

  return (
    <>
      <button className="btn-ghost" onClick={() => setOpen(!open)}>
        <i className={`ti ${open ? "ti-filter-off" : "ti-filter"}`} /> {title}
        {hasActive && <span style={{ background: "#7CC8C8", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 8, marginLeft: 4 }}>●</span>}
      </button>
      {open && (
        <div className="adv-filters">
          {fields.map((f) => (
            <div key={f.key} className="fld">
              <label>{f.label}</label>
              {f.type === "select" ? (
                <select value={values[f.key] || ""} onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}>
                  <option value="">Tous</option>
                  {(f.options || []).map((o) => {
                    const val = typeof o === "string" ? o : o.value;
                    const lbl = typeof o === "string" ? o : o.label;
                    return <option key={val} value={val}>{lbl}</option>;
                  })}
                </select>
              ) : (
                <input type={f.type || "text"} placeholder={f.placeholder || "Recherche…"}
                  value={values[f.key] || ""} onChange={(e) => onChange({ ...values, [f.key]: e.target.value })} />
              )}
            </div>
          ))}
          {hasActive && (
            <div className="fld" style={{ alignSelf: "end" }}>
              <button className="btn-ghost" onClick={() => onChange(Object.fromEntries(fields.map((f) => [f.key, ""])))}>
                <i className="ti ti-x" /> Effacer
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
