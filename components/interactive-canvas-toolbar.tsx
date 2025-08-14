"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { useInteractiveCanvasStore } from '@/lib/interactive-canvas/store'
import { tools } from '@/lib/interactive-canvas/tools'
import type { Tool } from '@/lib/interactive-canvas/types'

interface ToolButtonProps {
  tool: Tool
  isSelected: boolean
  onClick: () => void
}

function ToolButton({ tool, isSelected, onClick }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-12 h-12 rounded-lg border-2 transition-all duration-200 flex items-center justify-center text-lg
        ${isSelected 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300' 
          : 'border-border hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/50'
        }
      `}
      title={tool.name}
    >
      {tool.icon}
    </button>
  )
}

interface ColorPickerProps {
  selectedColor: string
  onColorChange: (color: string) => void
}

function ColorPicker({ selectedColor, onColorChange }: ColorPickerProps) {
  const colors = [
    '#000000', '#374151', '#6b7280', '#9ca3af',
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
    '#ffffff', '#f3f4f6', '#e5e7eb', '#d1d5db'
  ]

  return (
    <div className="grid grid-cols-2 gap-1 p-2">
      {colors.map((color) => (
        <button
          key={color}
          onClick={() => onColorChange(color)}
          className={`
            w-6 h-6 rounded border-2 transition-all
            ${selectedColor === color 
              ? 'border-blue-500 scale-110' 
              : 'border-gray-300 hover:border-gray-400'
            }
          `}
          style={{ backgroundColor: color }}
          title={`Color: ${color}`}
        />
      ))}
    </div>
  )
}

interface BackgroundSelectorProps {
  current: string | undefined
  onChange: (color: string) => void
}

function BackgroundSelector({ current, onChange }: BackgroundSelectorProps) {
  const options = [
    { key: 'light', color: '#ffffff', label: 'Light' },
    { key: 'dark', color: '#0f172a', label: 'Dark' },
    { key: 'note', color: '#fdf5e6', label: 'Nota' }
  ]

  return (
    <div className="flex items-center gap-2">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.color)}
          className={`px-2 py-1 rounded border transition-all text-xs flex items-center gap-2 ${current === opt.color ? 'ring-2 ring-blue-400' : 'border-border hover:border-gray-300'}`}
          style={{ backgroundColor: opt.color, color: opt.key === 'dark' ? '#fff' : undefined }}
          title={opt.label}
        >
          <span className="hidden sm:inline">{opt.label}</span>
        </button>
      ))}
    </div>
  )
}

export function InteractiveCanvasToolbar() {
  const { 
    selectedTool, 
    setSelectedTool, 
    selectedColor, 
    setColor,
  canvasState,
  setBackgroundColor,
    strokeWidth,
    setStrokeWidth,
    fontSize,
    setFontSize,
    undo,
    redo,
    clearCanvas
  } = useInteractiveCanvasStore()

  const toolsByCategory = {
    utility: tools.filter(t => t.category === 'utility'),
    draw: tools.filter(t => t.category === 'draw'),
    shape: tools.filter(t => t.category === 'shape'),
    game: tools.filter(t => t.category === 'game')
  }

  return (
    <div className="flex flex-col h-full p-2 gap-3 overflow-y-auto">
      {/* Utility tools */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground px-1">Herramientas</div>
        {toolsByCategory.utility.map((tool) => (
          <ToolButton
            key={tool.id}
            tool={tool}
            isSelected={selectedTool?.id === tool.id}
            onClick={() => setSelectedTool(tool)}
          />
        ))}
      </div>

      {/* Drawing tools */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground px-1">Dibujo</div>
        {toolsByCategory.draw.map((tool) => (
          <ToolButton
            key={tool.id}
            tool={tool}
            isSelected={selectedTool?.id === tool.id}
            onClick={() => setSelectedTool(tool)}
          />
        ))}
      </div>

      {/* Shape tools */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground px-1">Formas</div>
        {toolsByCategory.shape.map((tool) => (
          <ToolButton
            key={tool.id}
            tool={tool}
            isSelected={selectedTool?.id === tool.id}
            onClick={() => setSelectedTool(tool)}
          />
        ))}
      </div>

      {/* Game tools */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground px-1">Juegos</div>
        {toolsByCategory.game.map((tool) => (
          <ToolButton
            key={tool.id}
            tool={tool}
            isSelected={selectedTool?.id === tool.id}
            onClick={() => setSelectedTool(tool)}
          />
        ))}
      </div>

      {/* Color picker */}
      <div className="border-t pt-2">
        <div className="text-xs font-medium text-muted-foreground px-1 mb-2">Color</div>
        <ColorPicker 
          selectedColor={selectedColor} 
          onColorChange={setColor} 
        />
        {/* Make background selector more visible under colors */}
        <div className="mt-2">
          <div className="text-xs font-medium text-muted-foreground px-1 mb-1">Fondo</div>
          <BackgroundSelector current={canvasState?.backgroundColor} onChange={setBackgroundColor} />
        </div>
      </div>

      {/* Stroke width */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground px-1">Grosor: {strokeWidth}px</div>
        <input
          type="range"
          min={1}
          max={20}
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Font size for text */}
      {selectedTool?.id === 'text' && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground px-1">Texto: {fontSize}px</div>
          <input
            type="range"
            min={8}
            max={72}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-auto space-y-1 border-t pt-2">
        <button
          onClick={undo}
          className="w-full px-2 py-1 text-xs rounded hover:bg-muted transition-colors"
          title="Deshacer (Ctrl+Z)"
        >
          ↶ Deshacer
        </button>
        <button
          onClick={redo}
          className="w-full px-2 py-1 text-xs rounded hover:bg-muted transition-colors"
          title="Rehacer (Ctrl+Y)"
        >
          ↷ Rehacer
        </button>
        <button
          onClick={clearCanvas}
          className="w-full px-2 py-1 text-xs rounded bg-red-50 hover:bg-red-100 text-red-700 transition-colors"
          title="Limpiar todo"
        >
          🗑️ Limpiar
        </button>
      </div>
    </div>
  )
}
