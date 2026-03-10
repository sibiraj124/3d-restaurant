"use client";

import React, { useEffect, useState } from "react";

export default function HotspotPanel({ HOTSPOTS }: { HOTSPOTS: Array<any> }) {
  const [camPos, setCamPos] = useState<number[]>([0, 0, 0]);

  useEffect(() => {
    function onCamera(e: any) {
      if (!e?.detail) return;
      setCamPos(e.detail);
    }
    window.addEventListener("cameraPos", onCamera as EventListener);
    return () => window.removeEventListener("cameraPos", onCamera as EventListener);
  }, []);

  function jump(hp: any) {
    window.dispatchEvent(new CustomEvent("moveCameraTo", { detail: { cam: hp.cam.toArray(), lookAt: hp.lookAt.toArray() } }));
  }

  return (
    <div style={{ position: "absolute", right: 16, top: 16, zIndex: 40 }}>
      <div style={{ background: "rgba(0,0,0,0.6)", color: "white", padding: 8, borderRadius: 8, minWidth: 180 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Hotspots</div>
        {HOTSPOTS.map((hp) => (
          <button key={hp.id} onClick={() => jump(hp)} style={{ display: "block", width: "100%", marginBottom: 6, padding: "6px 8px", borderRadius: 6, border: "none", background: "#111827", color: "#fff" }}>
            {hp.label}
          </button>
        ))}
        <div style={{ marginTop: 8, fontSize: 12 }}>Camera: {camPos.map((n) => n.toFixed(3)).join(", ")}</div>
      </div>
    </div>
  );
}
