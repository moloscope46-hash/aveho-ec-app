"use client";
// =============================================================
//  app/ContactActions.js (Alpha 0.56.4)
//
//  Pastilles d'actions cliquables (tel, mail, gps, web) pour un
//  organisme (caisse, mutuelle, etc.). Affiche uniquement les
//  actions disponibles selon les données.
// =============================================================

export default function ContactActions({ entity, size = "md" }) {
  if (!entity) return null;

  const tel = (entity.telephone || "").replace(/\s/g, "");
  const email = entity.email;
  const web = entity.site_web;
  const lat = entity.latitude;
  const lng = entity.longitude;
  // 0.56.18 : fallback cp ↔ code_postal (mutuelles utilisent cp, caisses utilisent cp aussi)
  const cp = entity.cp || entity.code_postal;
  const adresse = [entity.adresse, cp, entity.ville].filter(Boolean).join(", ");

  const actions = [];

  if (tel) {
    actions.push({
      icon: "ti-phone",
      label: "Appeler",
      href: `tel:${tel}`,
      color: "#5aa05a",
      bg: "#dff5e0",
      title: entity.telephone,
    });
  }

  if (email) {
    actions.push({
      icon: "ti-mail",
      label: "Email",
      href: `mailto:${email}`,
      color: "#185FA5",
      bg: "#dbe7f5",
      title: email,
    });
  }

  if (lat && lng) {
    actions.push({
      icon: "ti-map-pin",
      label: "Itinéraire GPS",
      href: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      color: "#c0392b",
      bg: "#fce5e0",
      target: "_blank",
      title: "Ouvrir dans Google Maps",
    });
  } else if (adresse) {
    actions.push({
      icon: "ti-map-pin",
      label: "Itinéraire",
      href: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`,
      color: "#c0392b",
      bg: "#fce5e0",
      target: "_blank",
      title: adresse,
    });
  }

  if (web) {
    const url = /^https?:\/\//i.test(web) ? web : `https://${web}`;
    actions.push({
      icon: "ti-world",
      label: "Site web",
      href: url,
      color: "#7a6fb0",
      bg: "#f3effa",
      target: "_blank",
      title: web,
    });
  }

  if (actions.length === 0) {
    return (
      <span style={{ fontSize: 10.5, color: "#a0aeb9", fontStyle: "italic" }}>
        <i className="ti ti-info-circle" /> Pas de coordonnées
      </span>
    );
  }

  const sz = size === "sm" ? { pad: "3px 7px", fs: 10, icon: 11 }
    : size === "lg" ? { pad: "7px 12px", fs: 12, icon: 14 }
    : { pad: "5px 9px", fs: 11, icon: 12 };

  return (
    <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
      {actions.map((a, i) => (
        <a
          key={i}
          href={a.href}
          target={a.target}
          rel={a.target === "_blank" ? "noopener noreferrer" : undefined}
          title={a.title}
          onClick={(e) => e.stopPropagation()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: a.bg, color: a.color,
            padding: sz.pad, borderRadius: 6,
            fontSize: sz.fs, fontWeight: 700,
            textDecoration: "none",
            border: `1px solid ${a.color}30`,
            cursor: "pointer",
          }}
        >
          <i className={`ti ${a.icon}`} style={{ fontSize: sz.icon }} />
          {size !== "sm" && a.label}
        </a>
      ))}
    </div>
  );
}
