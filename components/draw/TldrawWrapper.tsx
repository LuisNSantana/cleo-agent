"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import html2canvas from "html2canvas";

const Tldraw = dynamic(() => import("@tldraw/tldraw").then((m) => (m as any).Tldraw), {
  ssr: false,
});

// Cast the dynamic component to a generic React component so we can pass props without type errors
const TldrawAny = Tldraw as unknown as React.ComponentType<any>;

export default function TldrawWrapper({
  autosave = true,
  autosaveDebounce = 1200,
}: {
  autosave?: boolean;
  autosaveDebounce?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<any>(null);
  const [docState, setDocState] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // onMount handler from tldraw
  function handleMount(app: any) {
    appRef.current = app;
  }

  // onChange handler — tldraw calls this with the latest state; keep as `any` to avoid strict typing issues
  function handleChange(state: any) {
    // store minimal state for autosave/analysis
    setDocState(state?.document ?? state ?? null);
  }

  // Helper: dispatch analysis done event
  function emitAnalysisDone(detail: any) {
    try {
      document.dispatchEvent(new CustomEvent("tldraw:analysis:done", { detail }));
    } catch (e) {
      // ignore
    }
  }

  // send JSON document to analysis endpoint
  async function sendDocJSON(doc: any) {
    try {
      setSaving(true);
      const res = await fetch("/api/analyze-drawing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "document", payload: doc }),
      });
      const json = await res.json();
      // emit event so parent can update UI
      emitAnalysisDone({ kind: "document", result: json, payload: doc });
      return json;
    } catch (e) {
      console.error("sendDocJSON error", e);
      emitAnalysisDone({ kind: "document", error: String(e), payload: doc });
      throw e;
    } finally {
      setSaving(false);
    }
  }

  // capture raster PNG thumbnail with html2canvas and send
  async function sendPNGThumbnail() {
    if (!containerRef.current) return;
    try {
      setSaving(true);
      const canvas = await html2canvas(containerRef.current, { backgroundColor: null });
      const dataUrl = canvas.toDataURL("image/png");
      const res = await fetch("/api/analyze-drawing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "png", payload: dataUrl }),
      });
      const json = await res.json();
      emitAnalysisDone({ kind: "png", result: json, payload: dataUrl });
      return { json, dataUrl };
    } catch (e) {
      console.error("sendPNGThumbnail error", e);
      emitAnalysisDone({ kind: "png", error: String(e) });
      throw e;
    } finally {
      setSaving(false);
    }
  }

  // autosave debounce
  useEffect(() => {
    if (!autosave || !docState) return;
    const id = setTimeout(() => sendDocJSON(docState), autosaveDebounce);
    return () => clearTimeout(id);
  }, [docState, autosave, autosaveDebounce]);

  // Listen for external export requests (allow parent to trigger PNG/JSON analysis)
  useEffect(() => {
    const onExportPng = () => {
      void sendPNGThumbnail();
    };
    const onExportJson = () => {
      if (docState) void sendDocJSON(docState);
    };
    document.addEventListener("tldraw:export:png", onExportPng as EventListener);
    document.addEventListener("tldraw:export:json", onExportJson as EventListener);
    return () => {
      document.removeEventListener("tldraw:export:png", onExportPng as EventListener);
      document.removeEventListener("tldraw:export:json", onExportJson as EventListener);
    };
  }, [docState]);

  return (
    <div className="tldraw-wrapper" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", gap: 8, padding: 8, alignItems: "center" }}>
        <button
          onClick={() => {
            if (docState) void sendDocJSON(docState);
          }}
          className="btn"
        >
          Export JSON / Analyze
        </button>

        <button
          onClick={() => {
            void sendPNGThumbnail();
          }}
          className="btn"
        >
          Capture PNG / Analyze
        </button>

        <div style={{ marginLeft: "auto" }}>{saving ? "Saving..." : ""}</div>
      </div>

      <div ref={containerRef} style={{ flex: 1, position: "relative", minHeight: 400 }}>
        <TldrawAny
          onMount={handleMount}
          onChange={handleChange}
          showMiniMap={false}
          // eslint-disable-next-line react/jsx-no-bind
          // ...you can pass more props here to customize behavior
        />
      </div>
    </div>
  );
}
