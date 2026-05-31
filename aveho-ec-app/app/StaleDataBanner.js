"use client";
// =============================================================
//  StaleDataBanner — Bandeau "données potentiellement obsolètes"
//  Alpha 0.27.0
//
//  Affiché quand les données viennent du cache offline (résultat
//  fromCache=true de safeFetch).
//
//  Usage :
//    const [stale, setStale] = useState(false);
//    const res = await safeFetch(...);
//    setStale(res.fromCache);
//    ...
//    {stale && <StaleDataBanner />}
// =============================================================
export default function StaleDataBanner({ message }) {
  return (
    <div style={{
      background: "linear-gradient(90deg,#fef3e2,#fcefda)",
      border: "1px solid #f0d59f",
      color: "#7a4f15",
      padding: "10px 16px",
      borderRadius: 10,
      fontSize: 13,
      marginBottom: 14,
      display: "flex",
      alignItems: "center",
      gap: 10,
    }}>
      <i className="ti ti-clock-exclamation" style={{ fontSize: 18, color: "#EF9F27" }} />
      <span>
        <b>Données potentiellement obsolètes.</b>{" "}
        {message || "Vous consultez le cache local (hors-ligne ou réseau instable). La liste se rafraîchira automatiquement à la reconnexion."}
      </span>
    </div>
  );
}
