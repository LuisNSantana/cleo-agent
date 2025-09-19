"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import html2canvas from "html2canvas";
import { useDeviceCapabilities } from "@/app/hooks/use-device-capabilities";

const Tldraw = dynamic(() => import("@tldraw/tldraw").then((m) => m.Tldraw), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Cargando editor...</div>
});

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
  const deviceCapabilities = useDeviceCapabilities();

  // onMount handler from tldraw
  function handleMount(editor: any) {
    appRef.current = editor;
    console.log('[TldrawWrapper] Tldraw editor mounted successfully');
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

  // Enhanced touch support with Apple Pencil optimization
  useEffect(() => {
    const el = containerRef.current as HTMLDivElement | null;
    if (!el) return;
    
    // Apply styles to ensure touch works properly across all devices
    el.style.touchAction = "none";
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.userSelect = "none";
    el.style.webkitUserSelect = "none";
    
    // Específico para iOS y Apple Pencil usando setProperty para propiedades no estándar
    (el.style as any).webkitTouchCallout = "none";
    (el.style as any).webkitTapHighlightColor = "transparent";
    (el.style as any).msUserSelect = "none";
    (el.style as any).msTouchAction = "none";
    
    // Optimizaciones específicas para Apple Pencil
    if (deviceCapabilities.supportsPencil) {
      // Mejorar precisión para Apple Pencil
      el.style.cursor = "crosshair";
      // Permitir eventos de pointer para mejor detección de presión
      (el.style as any).touchAction = "none";
    }
    
    // Prevenir zoom accidental en móvil (excepto cuando se usa pinch específicamente para zoom)
    const preventDefault = (e: TouchEvent) => {
      // Permitir zoom intencional pero prevenir zoom accidental
      if (e.touches.length > 1) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY
        );
        
        // Solo prevenir si no es un gesto de zoom claro
        if (distance < 100) {
          e.preventDefault();
        }
      }
    };
    
    // Event listeners optimizados
    const options = { passive: false };
    el.addEventListener('touchstart', preventDefault, options);
    el.addEventListener('touchmove', preventDefault, options);
    
    // Soporte mejorado para Apple Pencil (pointer events)
    if (deviceCapabilities.supportsPencil && window.PointerEvent) {
      const handlePointerMove = (e: PointerEvent) => {
        // Apple Pencil tiene pointerType === 'pen'
        if (e.pointerType === 'pen') {
          // Optimizaciones específicas para Apple Pencil
          e.stopPropagation();
        }
      };
      
      el.addEventListener('pointermove', handlePointerMove, { passive: true });
      
      console.log('[TldrawWrapper] Apple Pencil support enabled');
      
      return () => {
        el.removeEventListener('touchstart', preventDefault);
        el.removeEventListener('touchmove', preventDefault);
        el.removeEventListener('pointermove', handlePointerMove);
      };
    }
    
    console.log('[TldrawWrapper] Enhanced mobile/touch configuration applied');
    
    return () => {
      el.removeEventListener('touchstart', preventDefault);
      el.removeEventListener('touchmove', preventDefault);
    };
  }, [deviceCapabilities]);

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
    <div className="tldraw-wrapper" style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      {/* Canvas principal - sin toolbar extra */}
      <div 
        ref={containerRef} 
        data-vaul-drawer-ignore 
        style={{ 
          flex: 1, 
          position: "relative", 
          minHeight: 300,
          width: '100%',
          height: '100%',
          display: 'flex', 
          flexDirection: 'column',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
          // Optimizaciones específicas para móvil y Apple Pencil
          msTouchAction: 'none',
          msUserSelect: 'none'
        }}
      >
        <div style={{ 
          flex: 1, 
          position: 'relative', 
          width: '100%', 
          height: '100%',
          overflow: 'hidden' // Evita scroll accidental
        }}>
          <Tldraw
            onMount={handleMount}
            onChange={handleChange}
            style={{ 
              width: '100%', 
              height: '100%', 
              touchAction: 'none',
              userSelect: 'none'
            }}
            // Configuraciones optimizadas según capacidades del dispositivo
            options={{
              maxPages: 1, // Simplicidad para móvil
              // Configuraciones específicas para dispositivos táctiles
              ...(deviceCapabilities.isMobile && {
                // Optimizaciones para móvil
                gridSize: deviceCapabilities.supportsPencil ? 8 : 16, // Grid más fino para Apple Pencil
              })
            }}
            // Props adicionales para mejor experiencia táctil
            {...(deviceCapabilities.supportsPencil && {
              // Configuraciones específicas para Apple Pencil
              inferDarkMode: true,
            })}
            {...(deviceCapabilities.supportsTouch && {
              // Configuraciones para dispositivos táctiles
              forceDarkMode: undefined, // Permitir detección automática
            })}
          />
        </div>
      </div>
    </div>
  );
}
