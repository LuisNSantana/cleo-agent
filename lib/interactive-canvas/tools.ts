import type { Tool } from './types'

// Drawing tools - Optimized for better UX
export const drawingTools: Tool[] = [
  // Removed pen to encourage highlighter use
  {
    id: 'highlighter',
    name: 'Draw',
    icon: '✏️',
    category: 'draw',
    description: 'Draw smooth freehand lines',
    config: { opacity: 0.8, width: 8 }
  },
  {
    id: 'eraser',
    name: 'Erase',
    icon: '🧹',
    category: 'draw',
    description: 'Erase strokes and elements',
    config: { size: 20 }
  }
]

// Shape tools - Essential shapes only
export const shapeTools: Tool[] = [
  {
    id: 'rectangle',
    name: 'Square',
    icon: '⬜',
    category: 'shape',
    description: 'Create rectangles and squares'
  },
  {
    id: 'circle',
    name: 'Circle',
    icon: '⭕',
    category: 'shape',
    description: 'Draw circles and ellipses'
  },
  {
    id: 'line',
    name: 'Line',
    icon: '📏',
    category: 'shape',
    description: 'Draw straight lines'
  },
  {
    id: 'text',
    name: 'Text',
    icon: '📝',
    category: 'shape',
    description: 'Add text to canvas'
  }
]

// Game tools - Essential games only
export const gameTools: Tool[] = [
  {
    id: 'tic-tac-toe',
    name: 'Game',
    icon: '🎮',
    category: 'game',
    description: 'Interactive games with Cleo',
    config: { 
      gridSize: 3,
      cellSize: 60
    }
  }
]

// Utility tools
export const utilityTools: Tool[] = [
  {
    id: 'select',
    name: 'Select',
    icon: '👆',
    category: 'utility',
    description: 'Select and move elements'
  }
]

// All tools combined
export const allTools: Tool[] = [
  ...drawingTools,
  ...shapeTools,
  ...gameTools,
  ...utilityTools
]

// Get tool by ID
export const getToolById = (id: string): Tool | undefined => {
  return allTools.find(tool => tool.id === id)
}

// Get tools by category
export const getToolsByCategory = (category: Tool['category']): Tool[] => {
  return allTools.filter(tool => tool.category === category)
}

// Predefined color palette
export const colorPalette = [
  '#000000', // Negro
  '#FF0000', // Rojo
  '#00FF00', // Verde
  '#0000FF', // Azul
  '#FFFF00', // Amarillo
  '#FF00FF', // Magenta
  '#00FFFF', // Cian
  '#FFA500', // Naranja
  '#800080', // Púrpura
  '#FFC0CB', // Rosa
  '#808080', // Gris
  '#FFFFFF', // Blanco
]

// Stroke width options
export const strokeWidths = [1, 2, 3, 5, 8, 12, 16, 20]

// Font size options
export const fontSizes = [12, 14, 16, 18, 24, 32, 48, 64]

// All tools combined
export const tools: Tool[] = [
  ...utilityTools,
  ...drawingTools,
  ...shapeTools,
  ...gameTools
]
