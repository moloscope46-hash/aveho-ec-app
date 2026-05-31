"use client";
// =============================================================
//  Charts — Composants graphiques SVG natifs pour stats
//  Alpha 0.30.0
//
//  Pas de dépendance externe (Recharts, Chart.js etc.) pour rester léger.
//  3 composants exposés :
//   - <BarChart data={[{label, value, color?}]} max? height? />
//   - <LineChart data={[{x, y, label}]} color? height? />
//   - <DonutChart segments={[{label, value, color}]} size? />
// =============================================================

/**
 * Diagramme en barres verticales
 */
export function BarChart({ data = [], max, height = 200, valueFormat }) {
  if (!data || data.length === 0) {
    return <div style={{ padding: 20, color: "#8a98a8", fontSize: 13, textAlign: "center" }}>Pas de données</div>;
  }
  const maxValue = max || Math.max(...data.map((d) => d.value || 0), 1);
  const barWidth = 100 / data.length; // % de la largeur
  const padding = 30; // padding bottom pour les labels

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox={`0 0 ${data.length * 80} ${height + padding}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        preserveAspectRatio="none"
      >
        {/* Ligne horizontale de base */}
        <line
          x1="0" x2={data.length * 80}
          y1={height} y2={height}
          stroke="#e3e9ee" strokeWidth="1"
        />

        {data.map((d, i) => {
          const barHeight = maxValue > 0 ? (d.value / maxValue) * (height - 20) : 0;
          const x = i * 80 + 15;
          const y = height - barHeight;
          const color = d.color || "#185FA5";
          return (
            <g key={i}>
              {/* Barre */}
              <rect
                x={x} y={y}
                width="50" height={barHeight}
                fill={color}
                rx="4"
                opacity="0.85"
              >
                <title>{`${d.label}: ${valueFormat ? valueFormat(d.value) : d.value}`}</title>
              </rect>
              {/* Valeur au-dessus de la barre */}
              {d.value > 0 && (
                <text
                  x={x + 25} y={y - 6}
                  textAnchor="middle"
                  fontSize="11" fontWeight="700"
                  fill="#142131"
                >
                  {valueFormat ? valueFormat(d.value) : d.value}
                </text>
              )}
              {/* Label sous la barre */}
              <text
                x={x + 25} y={height + 18}
                textAnchor="middle"
                fontSize="10"
                fill="#6c7a89"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Diagramme en barres empilées (signés / refusés par mois par ex.)
 */
export function StackedBarChart({ data = [], series = [], height = 200, valueFormat }) {
  if (!data || data.length === 0 || !series || series.length === 0) {
    return <div style={{ padding: 20, color: "#8a98a8", fontSize: 13, textAlign: "center" }}>Pas de données</div>;
  }
  // Calculer la valeur max parmi les totaux empilés
  const maxTotal = Math.max(
    ...data.map((d) => series.reduce((sum, s) => sum + (d[s.key] || 0), 0)),
    1
  );
  const padding = 30;
  const barWidthInner = 50;
  const barSpacing = 80;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox={`0 0 ${data.length * barSpacing} ${height + padding}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        preserveAspectRatio="none"
      >
        <line x1="0" x2={data.length * barSpacing} y1={height} y2={height} stroke="#e3e9ee" strokeWidth="1" />

        {data.map((d, i) => {
          const x = i * barSpacing + 15;
          let yCursor = height;
          const total = series.reduce((sum, s) => sum + (d[s.key] || 0), 0);

          return (
            <g key={i}>
              {series.map((s, si) => {
                const value = d[s.key] || 0;
                const segHeight = maxTotal > 0 ? (value / maxTotal) * (height - 20) : 0;
                if (segHeight <= 0) return null;
                yCursor -= segHeight;
                return (
                  <rect
                    key={si}
                    x={x} y={yCursor}
                    width={barWidthInner} height={segHeight}
                    fill={s.color}
                    rx={si === series.length - 1 ? "4" : "0"}
                    opacity="0.85"
                  >
                    <title>{`${d.label} — ${s.label}: ${valueFormat ? valueFormat(value) : value}`}</title>
                  </rect>
                );
              })}
              {/* Total au-dessus */}
              {total > 0 && (
                <text
                  x={x + barWidthInner / 2} y={yCursor - 6}
                  textAnchor="middle"
                  fontSize="11" fontWeight="700"
                  fill="#142131"
                >
                  {valueFormat ? valueFormat(total) : total}
                </text>
              )}
              {/* Label */}
              <text
                x={x + barWidthInner / 2} y={height + 18}
                textAnchor="middle"
                fontSize="10"
                fill="#6c7a89"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Légende */}
      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
        {series.map((s, si) => (
          <span key={si} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6c7a89" }}>
            <span style={{ width: 12, height: 12, background: s.color, borderRadius: 3, display: "inline-block" }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Donut chart pour répartitions (signés vs refusés, finalités, etc.)
 */
export function DonutChart({ segments = [], size = 180, valueFormat }) {
  if (!segments || segments.length === 0) {
    return <div style={{ padding: 20, color: "#8a98a8", fontSize: 13, textAlign: "center" }}>Pas de données</div>;
  }
  const total = segments.reduce((sum, s) => sum + (s.value || 0), 0);
  if (total === 0) {
    return <div style={{ padding: 20, color: "#8a98a8", fontSize: 13, textAlign: "center" }}>Aucune donnée à afficher</div>;
  }
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 10;
  const strokeWidth = 28;

  let cumulativeAngle = -Math.PI / 2; // Démarre en haut (12h)
  const arcs = segments.map((s, i) => {
    const fraction = s.value / total;
    const angleStart = cumulativeAngle;
    const angleEnd = angleStart + fraction * 2 * Math.PI;
    cumulativeAngle = angleEnd;

    const x1 = cx + radius * Math.cos(angleStart);
    const y1 = cy + radius * Math.sin(angleStart);
    const x2 = cx + radius * Math.cos(angleEnd);
    const y2 = cy + radius * Math.sin(angleEnd);
    const largeArc = fraction > 0.5 ? 1 : 0;
    const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;

    return {
      path,
      color: s.color,
      label: s.label,
      value: s.value,
      pct: Math.round(fraction * 100),
    };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {arcs.map((a, i) => (
          <path
            key={i}
            d={a.path}
            stroke={a.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="butt"
          >
            <title>{`${a.label}: ${valueFormat ? valueFormat(a.value) : a.value} (${a.pct}%)`}</title>
          </path>
        ))}
        {/* Total au centre */}
        <text
          x={cx} y={cy - 4}
          textAnchor="middle"
          fontSize="20" fontWeight="700"
          fill="#142131"
        >
          {valueFormat ? valueFormat(total) : total}
        </text>
        <text
          x={cx} y={cy + 14}
          textAnchor="middle"
          fontSize="10"
          fill="#8a98a8"
          style={{ textTransform: "uppercase", letterSpacing: "1px" }}
        >
          Total
        </text>
      </svg>
      <div style={{ minWidth: 160 }}>
        {arcs.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 13 }}>
            <span style={{ width: 12, height: 12, background: a.color, borderRadius: 3, display: "inline-block", flexShrink: 0 }} />
            <span style={{ flex: 1, color: "#2a3a48" }}>{a.label}</span>
            <span style={{ fontWeight: 600, color: "#142131" }}>{valueFormat ? valueFormat(a.value) : a.value}</span>
            <span style={{ fontSize: 11, color: "#8a98a8", minWidth: 36, textAlign: "right" }}>{a.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Petite jauge horizontale (pour le taux de refus par ex)
 */
export function Gauge({ value, max = 100, label, color = "#185FA5", suffix = "%", height = 8 }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
          <span style={{ color: "#6c7a89" }}>{label}</span>
          <span style={{ fontWeight: 700, color: "#142131" }}>{value}{suffix}</span>
        </div>
      )}
      <div style={{ background: "#eef2f5", borderRadius: height / 2, height, overflow: "hidden" }}>
        <div
          style={{
            background: color,
            width: `${pct}%`,
            height: "100%",
            borderRadius: height / 2,
            transition: "width .3s ease",
          }}
        />
      </div>
    </div>
  );
}

/**
 * Heatmap 7×24 (jour de la semaine × heure)
 * Alpha 0.31.0
 *
 * data: array de { jour_semaine: 0-6, heure: 0-23, nb_actions: int }
 *   jour_semaine : 0 = dimanche (convention PostgreSQL EXTRACT(dow))
 *
 * Affiche une grille avec intensité de couleur proportionnelle au nb_actions.
 * Couleur de base configurable (défaut bleu Aveho).
 */
export function Heatmap({ data = [], color = "#185FA5", cellSize = 18, gap = 2, onCellClick = null }) {
  // Convertit en map { "jour-heure": nb } pour lookup O(1)
  const cellMap = new Map();
  let maxNb = 0;
  data.forEach((d) => {
    const k = `${d.jour_semaine}-${d.heure}`;
    cellMap.set(k, d.nb_actions);
    if (d.nb_actions > maxNb) maxNb = d.nb_actions;
  });

  const jours = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  // Réordonne : lundi = 1, ..., samedi = 6, dimanche = 0 → on remap pour affichage Lun-Dim
  const dowOrder = [1, 2, 3, 4, 5, 6, 0]; // Indices PostgreSQL EXTRACT(dow)
  const heures = Array.from({ length: 24 }, (_, i) => i);

  // Fonction d'opacité selon le nb (0 = transparent, max = 1)
  function opacityFor(nb) {
    if (!nb || maxNb === 0) return 0;
    // Échelle logarithmique pour éviter que les pics écrasent tout
    return Math.min(1, Math.log10(nb + 1) / Math.log10(maxNb + 1));
  }

  const labelW = 36;
  const headerH = 16;
  const totalW = labelW + heures.length * (cellSize + gap);
  const totalH = headerH + jours.length * (cellSize + gap);

  return (
    <div style={{ overflowX: "auto", paddingBottom: 8 }}>
      <svg
        viewBox={`0 0 ${totalW} ${totalH}`}
        style={{ width: "100%", minWidth: 600, maxWidth: 900, height: "auto", display: "block" }}
      >
        {/* En-tête : heures (toutes les 3h pour la lisibilité) */}
        {heures.map((h) => (
          <text
            key={`hh-${h}`}
            x={labelW + h * (cellSize + gap) + cellSize / 2}
            y={headerH - 4}
            textAnchor="middle"
            fontSize="9"
            fill="#8a98a8"
          >
            {h % 3 === 0 ? `${h}h` : ""}
          </text>
        ))}

        {/* Lignes : un jour par ligne */}
        {dowOrder.map((dow, rowIdx) => (
          <g key={`row-${dow}`}>
            {/* Label jour */}
            <text
              x={labelW - 6}
              y={headerH + rowIdx * (cellSize + gap) + cellSize / 2 + 3}
              textAnchor="end"
              fontSize="10"
              fontWeight="600"
              fill="#6c7a89"
            >
              {jours[rowIdx]}
            </text>
            {/* Cellules heures */}
            {heures.map((h) => {
              const nb = cellMap.get(`${dow}-${h}`) || 0;
              const op = opacityFor(nb);
              const clickable = onCellClick && nb > 0;
              return (
                <rect
                  key={`c-${dow}-${h}`}
                  x={labelW + h * (cellSize + gap)}
                  y={headerH + rowIdx * (cellSize + gap)}
                  width={cellSize}
                  height={cellSize}
                  rx="3"
                  fill={op > 0 ? color : "#f4f7fa"}
                  opacity={op > 0 ? Math.max(0.12, op) : 1}
                  stroke={op > 0 ? "transparent" : "#eef2f5"}
                  strokeWidth="1"
                  style={{ cursor: clickable ? "pointer" : "default" }}
                  onClick={clickable ? () => onCellClick({ jour_semaine: dow, heure: h, nb_actions: nb, jour_label: jours[rowIdx] }) : undefined}
                >
                  <title>{`${jours[rowIdx]} ${h}h : ${nb} action${nb > 1 ? "s" : ""}${clickable ? " — cliquer pour détail" : ""}`}</title>
                </rect>
              );
            })}
          </g>
        ))}
      </svg>

      {/* Légende */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 11, color: "#6c7a89" }}>
        <span>Moins</span>
        {[0.15, 0.35, 0.55, 0.75, 1].map((op, i) => (
          <span
            key={i}
            style={{ width: 12, height: 12, background: color, opacity: op, borderRadius: 2, display: "inline-block" }}
          />
        ))}
        <span>Plus</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#8a98a8" }}>
          Max : {maxNb} action{maxNb > 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

/**
 * TrendBadge — Badge de tendance N vs N-1
 * Alpha 0.37.0
 *
 * Compare deux valeurs (actuelle vs précédente) et affiche un pourcentage
 * coloré : vert si hausse, rouge si baisse, gris si neutre/inconnu.
 *
 * Props :
 *   - current : nombre actuel (ex: 25 DI ce mois)
 *   - previous : nombre précédent (ex: 20 DI mois dernier)
 *   - inverse : si true, baisse = bon (ex: taux de refus, erreurs)
 *   - label : suffixe optionnel (ex: "vs mois dernier")
 *   - size : "sm" (par défaut) ou "md"
 */
export function TrendBadge({ current, previous, inverse = false, label = "vs mois dernier", size = "sm" }) {
  // Cas spéciaux
  if (current == null || previous == null) {
    return null;
  }
  // previous = 0 : on ne peut pas calculer un %, on affiche un signe
  if (previous === 0) {
    if (current === 0) {
      return <Pill color="#8a98a8" bg="#f4f7fa" icon="ti-equal" label={`= ${label}`} size={size} />;
    }
    return <Pill color="#5aa05a" bg="#dff5e0" icon="ti-trending-up" label={`Nouveau ${label}`} size={size} />;
  }

  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);
  const abs = Math.abs(pct);

  // Tendance "neutre" si l'écart est minime (< 2%)
  if (abs < 2) {
    return <Pill color="#8a98a8" bg="#f4f7fa" icon="ti-equal" label={`≈ ${label}`} size={size} />;
  }

  // Détermination couleur
  // Cas normal : hausse = vert (bon), baisse = rouge (mauvais)
  // Cas inverse : hausse = rouge (mauvais), baisse = vert (bon) — pour taux de refus, erreurs, etc.
  const isUp = diff > 0;
  const isGood = inverse ? !isUp : isUp;

  const color = isGood ? "#2e6f33" : "#c0392b";
  const bg = isGood ? "#dff5e0" : "#fef0ee";
  const icon = isUp ? "ti-trending-up" : "ti-trending-down";
  const sign = isUp ? "+" : "−";

  return <Pill color={color} bg={bg} icon={icon} label={`${sign}${abs}% ${label}`} size={size} />;
}

// Helper interne pour TrendBadge (pas exporté)
function Pill({ color, bg, icon, label, size }) {
  const sz = size === "md" 
    ? { fontSize: 12, padding: "4px 10px", iconSize: 13 }
    : { fontSize: 10, padding: "2px 7px", iconSize: 11 };
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 3,
      padding: sz.padding,
      background: bg,
      color: color,
      borderRadius: 10,
      fontSize: sz.fontSize,
      fontWeight: 700,
      letterSpacing: ".3px",
      whiteSpace: "nowrap",
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: sz.iconSize }} />
      {label}
    </span>
  );
}
