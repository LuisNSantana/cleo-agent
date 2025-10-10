import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { CanvasState, CanvasHistory, Tool, Point, DrawingPath, Shape, GameElement } from './types'
import { drawingTools } from './tools'

interface InteractiveCanvasStore {
  // Canvas state
  canvasState: CanvasState
  history: CanvasHistory
  
  // UI state
  isOpen: boolean
  selectedTool: Tool | null
  selectedColor: string
  strokeWidth: number
  fontSize: number
  
  // Interaction state
  isDrawing: boolean
  currentPath: DrawingPath | null
  selectedElements: string[] // IDs of selected elements
  selectionBoxStart?: Point
  selectionBoxEnd?: Point
  
  // Actions
  openCanvas: () => void
  closeCanvas: () => void
  setSelectedTool: (tool: Tool) => void
  setColor: (color: string) => void
  setStrokeWidth: (width: number) => void
  setFontSize: (size: number) => void
  
  // Canvas operations
  startDrawing: (point: Point) => void
  addDrawingPoint: (point: Point) => void
  endDrawing: () => void
  
  addShape: (shape: Omit<Shape, 'id' | 'timestamp'>) => void
  updateShape: (id: string, updates: Partial<Shape>) => void
  deleteShape: (id: string) => void
  
  addGame: (game: Omit<GameElement, 'id' | 'timestamp'>) => void
  updateGame: (id: string, updates: Partial<GameElement>) => void
  
  selectElements: (ids: string[]) => void
  clearSelection: () => void
  setSelectionBox: (start?: Point, end?: Point) => void
  transformSelection: (deltaX: number, deltaY: number, scaleX: number, scaleY: number) => void
  
  // History operations
  undo: () => void
  redo: () => void
  addToHistory: (state: CanvasState) => void
  
  // Canvas utilities
  clearCanvas: () => void
  setZoom: (zoom: number) => void
  setPan: (pan: Point) => void
  setBackgroundColor: (color: string) => void
  setBackgroundTemplate: (template: 'none' | 'lines' | 'grid') => void
  
  // Export/Import
  exportCanvas: () => CanvasState
  importCanvas: (state: CanvasState) => void
}

const initialCanvasState: CanvasState = {
  paths: [],
  shapes: [],
  games: [],
  backgroundColor: '#ffffff',
  backgroundTemplate: 'none',
  zoom: 1,
  pan: { x: 0, y: 0 }
}

const initialHistory: CanvasHistory = {
  states: [initialCanvasState],
  currentIndex: 0,
  maxStates: 50
}

export const useInteractiveCanvasStore = create<InteractiveCanvasStore>()((set, get) => ({
    // Initial state
    canvasState: initialCanvasState,
    history: initialHistory,
    isOpen: false,
    selectedTool: drawingTools[0], // Default to highlighter tool
    selectedColor: '#000000',
    strokeWidth: 3,
    fontSize: 16,
    isDrawing: false,
    currentPath: null,
    selectedElements: [],
    selectionBoxStart: undefined,
    selectionBoxEnd: undefined,

    // Basic actions
    openCanvas: () => set({ isOpen: true }),
    closeCanvas: () => set({ isOpen: false }),
    setSelectedTool: (tool) => set({ selectedTool: tool }),
    setColor: (color) => set({ selectedColor: color }),
    setStrokeWidth: (width) => set({ strokeWidth: width }),
    setFontSize: (size) => set({ fontSize: size }),

    // Drawing operations
    startDrawing: (point) => {
      const { selectedTool, selectedColor, strokeWidth } = get()
      if (!selectedTool || selectedTool.category !== 'draw') return

      const newPath: DrawingPath = {
        id: `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        points: [point],
        color: selectedColor,
        strokeWidth,
        tool: selectedTool.id as any,
        timestamp: Date.now()
      }

      set({ 
        isDrawing: true, 
        currentPath: newPath 
      })
    },

    addDrawingPoint: (point) => {
      const { currentPath, isDrawing } = get()
      if (!isDrawing || !currentPath) return

      const updatedPath = {
        ...currentPath,
        points: [...currentPath.points, point]
      }

      set({ currentPath: updatedPath })
    },

    endDrawing: () => {
      const { currentPath, canvasState } = get()
      if (!currentPath) return

      const newCanvasState = {
        ...canvasState,
        paths: [...canvasState.paths, currentPath]
      }

      set({ 
        isDrawing: false, 
        currentPath: null,
        canvasState: newCanvasState 
      })

      // Add to history
      get().addToHistory(newCanvasState)
    },

    // Shape operations
    addShape: (shapeData) => {
      const { canvasState } = get()
      const newShape: Shape = {
        ...shapeData,
        id: `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now()
      }

      const newCanvasState = {
        ...canvasState,
        shapes: [...canvasState.shapes, newShape]
      }

      set({ canvasState: newCanvasState })
      get().addToHistory(newCanvasState)
    },

    updateShape: (id, updates) => {
      const { canvasState } = get()
      const newCanvasState = {
        ...canvasState,
        shapes: canvasState.shapes.map(shape =>
          shape.id === id ? { ...shape, ...updates } : shape
        )
      }

      set({ canvasState: newCanvasState })
      get().addToHistory(newCanvasState)
    },

    deleteShape: (id) => {
      const { canvasState } = get()
      const newCanvasState = {
        ...canvasState,
        shapes: canvasState.shapes.filter(shape => shape.id !== id)
      }

      set({ canvasState: newCanvasState })
      get().addToHistory(newCanvasState)
    },

    // Game operations
    addGame: (gameData) => {
      const { canvasState } = get()
      const newGame: GameElement = {
        ...gameData,
        id: `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now()
      }

      const newCanvasState = {
        ...canvasState,
        games: [...canvasState.games, newGame]
      }

      set({ canvasState: newCanvasState })
      get().addToHistory(newCanvasState)
    },

    updateGame: (id, updates) => {
      const { canvasState } = get()
      const newCanvasState = {
        ...canvasState,
        games: canvasState.games.map(game =>
          game.id === id ? { ...game, ...updates } : game
        )
      }

      set({ canvasState: newCanvasState })
      get().addToHistory(newCanvasState)
    },

    // Selection operations
    selectElements: (ids) => set({ selectedElements: ids }),
    clearSelection: () => set({ selectedElements: [], selectionBoxStart: undefined, selectionBoxEnd: undefined }),
    setSelectionBox: (start, end) => set({ selectionBoxStart: start, selectionBoxEnd: end }),
    
    transformSelection: (deltaX, deltaY, scaleX, scaleY) => {
      const { canvasState, selectedElements } = get()
      
      const newCanvasState = { ...canvasState }
      
      // Transform shapes
      newCanvasState.shapes = canvasState.shapes.map(shape => {
        if (selectedElements.includes(shape.id)) {
          return {
            ...shape,
            x: shape.x + deltaX,
            y: shape.y + deltaY,
            ...(shape.width && { width: shape.width * scaleX }),
            ...(shape.height && { height: shape.height * scaleY }),
            ...(shape.radius && { radius: shape.radius * Math.min(scaleX, scaleY) })
          }
        }
        return shape
      })
      
      // Transform games
      newCanvasState.games = canvasState.games.map(game => {
        if (selectedElements.includes(game.id)) {
          return {
            ...game,
            x: game.x + deltaX,
            y: game.y + deltaY
          }
        }
        return game
      })
      
      set({ canvasState: newCanvasState })
      get().addToHistory(newCanvasState)
    },

    // History operations
    addToHistory: (state) => {
      const { history } = get()
      const newStates = history.states.slice(0, history.currentIndex + 1)
      newStates.push(state)
      
      // Limit history size
      if (newStates.length > history.maxStates) {
        newStates.shift()
      }

      const newHistory = {
        ...history,
        states: newStates,
        currentIndex: newStates.length - 1
      }

      set({ history: newHistory })
    },

    undo: () => {
      const { history } = get()
      if (history.currentIndex > 0) {
        const newIndex = history.currentIndex - 1
        const newCanvasState = history.states[newIndex]
        
        set({ 
          canvasState: newCanvasState,
          history: { ...history, currentIndex: newIndex }
        })
      }
    },

    redo: () => {
      const { history } = get()
      if (history.currentIndex < history.states.length - 1) {
        const newIndex = history.currentIndex + 1
        const newCanvasState = history.states[newIndex]
        
        set({ 
          canvasState: newCanvasState,
          history: { ...history, currentIndex: newIndex }
        })
      }
    },

    // Canvas utilities
    clearCanvas: () => {
      const newCanvasState = { ...initialCanvasState }
      set({ canvasState: newCanvasState })
      get().addToHistory(newCanvasState)
    },

    setZoom: (zoom) => {
      const { canvasState } = get()
      set({ canvasState: { ...canvasState, zoom } })
    },

    setPan: (pan) => {
      const { canvasState } = get()
      set({ canvasState: { ...canvasState, pan } })
    },

    setBackgroundColor: (backgroundColor) => {
      const { canvasState } = get()
      const newCanvasState = { ...canvasState, backgroundColor }
      set({ canvasState: newCanvasState })
      get().addToHistory(newCanvasState)
    },

    setBackgroundTemplate: (backgroundTemplate) => {
      const { canvasState } = get()
      const newCanvasState = { ...canvasState, backgroundTemplate }
      set({ canvasState: newCanvasState })
      get().addToHistory(newCanvasState)
    },

    // Export/Import
    exportCanvas: () => get().canvasState,
    importCanvas: (state) => {
      set({ canvasState: state })
      get().addToHistory(state)
    }
  }))
