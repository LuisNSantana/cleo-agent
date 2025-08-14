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
  timestamp: number
}

export interface GameElement {
  id: string
  type: string
  x: number
  y: number
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