"use client";
import { useRouter } from "next/navigation";

export default function MobileSubHeader({ title, icon, color = "#7CC8C8", backTo = "/mobile" }) {
  const router = useRouter();
  return (
    <div style={{
      padding: "14px 16px",
      borderBottom: "1px solid rgba(255,255,255,.08)",
      display: "flex", alignItems: "center", gap: 12,
      background: "rgba(20,33,49,.4)", backdropFilter: "blur(10px)",
      position: "sticky", top: 0, zIndex: 50,
    }}>
      <button onClick={() => router.push(backTo)} style={{
        background: "rgba(255,255,255,.08)", color: "#fff",
        border: "1px solid rgba(255,255,255,.16)",
        padding: 8, borderRadius: 8, cursor: "pointer",
        fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center",
        width: 36, height: 36,
      }}>
        <i className="ti ti-arrow-left" style={{ fontSize: 18 }} />
      </button>
      <div style={{ width: 38, height: 38, background: `${color}22`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${color}44` }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 20 }} />
      </div>
      <h1 style={{ flex: 1, margin: 0, color: "#fff", fontSize: 17, fontWeight: 700 }}>{title}</h1>
    </div>
  );
}
