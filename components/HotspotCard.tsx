"use client";

import React from "react";

export default function HotspotCard({ hotspot, onClose }: { hotspot: any | null; onClose: () => void }) {
  if (!hotspot) return null;

  return (
    <div style={{ position: "absolute", left: 16, bottom: 16, zIndex: 50 }}>
      <div style={{ background: "rgba(255,255,255,0.95)", color: "#111", padding: 12, borderRadius: 10, width: 320, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{hotspot.label}</div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: "#374151" }}>A point of interest. Click the hotspot or use the HUD to move the camera here.</div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("moveCameraTo", { detail: { cam: hotspot.cam.toArray(), lookAt: hotspot.lookAt.toArray(), duration: 1200 } }));
            }}
            style={{ padding: "8px 10px", borderRadius: 8, border: "none", background: "#111827", color: "white", cursor: "pointer" }}
          >
            Re-center
          </button>
          <button
            onClick={() => {
              window.open("#", "_blank");
            }}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "white", color: "#111827", cursor: "pointer" }}
          >
            More
          </button>
        </div>
      </div>
    </div>
  );
}
