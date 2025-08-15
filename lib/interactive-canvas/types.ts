export interface Point {
  x: number
  y: number
}

export interface DrawingPath {
  id: string
  points: Point[]
  color: string
  strokeWidth: number
  tool: string
  timestamp: number
}

export interface Shape {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  color: string
  strokeWidth?: number
  radius?: number
  // Optional visual and geometry props used by various shape renderers
  fill?: string
  rotation?: number
  points?: Array<{ x: number; y: number }>
  // For line-like shapes that may store end coordinates separately
  endX?: number
  endY?: number
  // For text shapes
  text?: string
  fontSize?: number
  timestamp: number
}

export interface GameElement {
  id: string
  type: string
  x: number
  y: number
  // Flexible data payload for specific game types (tic-tac-toe, grid, checkerboard, etc.)
  data?: any
  timestamp: number
}

export interface Tool {
  id: string
  name: string
  icon: string
  category: string
  description?: string
  config?: {
    cellSize?: number
    gridSize?: number
    cols?: number
    rows?: number
  // drawing tool specific
  opacity?: number
  width?: number
  size?: number
  }
}

export interface CanvasState {
  paths: DrawingPath[]
  shapes: Shape[]
  games: GameElement[]
  backgroundColor: string
  backgroundTemplate: 'none' | 'lines' | 'grid'
  zoom: number
  pan: Point
}

export interface CanvasHistory {
  states: CanvasState[]
  currentIndex: number
  maxStates: number
}