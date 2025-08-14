"use client";

import React from "react";

export default function TldrawPlaceholder() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, border: "1px dashed var(--border)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Tldraw editor</div>
        <div style={{ color: "var(--muted)" }}>Se montará el editor de dibujo aquí</div>
      </div>
    </div>
  );
}
