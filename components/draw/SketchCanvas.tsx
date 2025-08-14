// Deprecated: the SketchCanvas implementation has been replaced by TldrawWrapper (tldraw).
// The original implementation is preserved below for history but not exported. If you need
// to restore it, move the content into a new file and import it explicitly.

/*
"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type SketchCanvasRef = {
  exportPNG: () => Promise<string> // dataURL
  exportSVG: () => Promise<string> // svg string
  getScene: () => any
  loadScene: (scene: any) => void
  clear: () => void
}

export function SketchCanvas({
  initialScene,
  onChange,
}: {
  initialScene?: any
  onChange?: (scene: any) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [color, setColor] = useState('#000000')
  const [paths, setPaths] = useState<any[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Set drawing properties
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.imageSmoothingEnabled = true
  }, [])

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true)
    const coords = getCoordinates(e)
    const newPath = {
      tool,
      color: tool === 'eraser' ? 'white' : color,
      strokeWidth: tool === 'eraser' ? strokeWidth * 2 : strokeWidth,
      points: [coords]
    }
    setPaths(prev => [...prev, newPath])
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    
    const coords = getCoordinates(e)
    setPaths(prev => {
      const newPaths = [...prev]
      const currentPath = newPaths[newPaths.length - 1]
      currentPath.points.push(coords)
      return newPaths
    })
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    onChange?.(paths)
  }

  // Redraw canvas when paths change
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw all paths
    paths.forEach(path => {
      if (path.points.length < 2) return

      ctx.strokeStyle = path.color
      ctx.lineWidth = path.strokeWidth
      ctx.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over'

      ctx.beginPath()
      ctx.moveTo(path.points[0].x, path.points[0].y)
      
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y)
      }
      
      ctx.stroke()
    })
  }, [paths])

  const exportPNG = useCallback(async (): Promise<string> => {
    const canvas = canvasRef.current
    if (!canvas) throw new Error("Canvas not ready")
    return canvas.toDataURL('image/png')
  }, [])

  const exportSVG = useCallback(async (): Promise<string> => {
    // Simple SVG export
    const canvas = canvasRef.current
    if (!canvas) throw new Error("Canvas not ready")
    
    let svg = `<svg width="${canvas.width}" height="${canvas.height}" xmlns="http://www.w3.org/2000/svg">`
    
    paths.forEach(path => {
      if (path.points.length < 2) return
      
      const pathData = path.points.map((point: { x: number; y: number }, i: number) => 
        `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
      ).join(' ')
      
      svg += `<path d="${pathData}" stroke="${path.color}" stroke-width="${path.strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    })
    
    svg += '</svg>'
    return svg
  }, [paths])

  const clear = useCallback(() => {
    setPaths([])
    onChange?.([])
  }, [onChange])

  const getScene = useCallback(() => ({ paths }), [paths])
  const loadScene = useCallback((scene: any) => {
    if (scene?.paths) setPaths(scene.paths)
  }, [])

  // CustomEvent bridge for export
  useEffect(() => {
    const handler = async () => {
      try {
        const dataUrl = await exportPNG()
        document.dispatchEvent(new CustomEvent('sketch:export:png:done', { detail: { dataUrl } }))
      } catch (e) {
        document.dispatchEvent(new CustomEvent('sketch:export:png:done', { detail: { error: String(e) } }))
      }
    }
    const listener = () => { handler() }
    document.addEventListener('sketch:export:png', listener)
    return () => document.removeEventListener('sketch:export:png', listener)
  }, [exportPNG])

  return (
    <div className="h-full w-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-muted/20">
        <button
          onClick={() => setTool('pen')}
          className={`px-3 py-1 rounded text-xs ${tool === 'pen' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
        >✏️ Lápiz</button>
        <button
          onClick={() => setTool('eraser')}
          className={`px-3 py-1 rounded text-xs ${tool === 'eraser' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
        >🧹 Borrar</button>
        
        <div className="h-4 w-px bg-border mx-1" />
        
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-8 h-8 rounded border"
          disabled={tool === 'eraser'}
        />
        
        <input
          type="range"
          min="1"
          max="20"
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(Number(e.target.value))}
          className="w-16"
        />
        <span className="text-xs text-muted-foreground">{strokeWidth}px</span>
        
        <div className="h-4 w-px bg-border mx-1" />
        
        <button
          onClick={clear}
          className="px-3 py-1 rounded text-xs bg-destructive/10 text-destructive hover:bg-destructive/20"
        >🗑️ Limpiar</button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair bg-white"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
    </div>
  )
}
*/

"use client"

export default function SketchCanvasDeprecated() {
  return (
    <div className="p-4 text-sm text-muted-foreground">SketchCanvas deprecated — replaced by the new Tldraw editor.</div>
  )
}
