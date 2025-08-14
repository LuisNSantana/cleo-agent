"use client"

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Stage, Layer } from 'react-konva'
import { Rect } from 'react-konva'
import Konva from 'konva'
import { useInteractiveCanvasStore } from '@/lib/interactive-canvas/store'
import { DrawingLayer } from './drawing-layer'
import { ShapeLayer } from './shape-layer'
import { GameLayer } from './game-layer'
import { SelectionLayer } from './selection-layer'
import type { Point } from '@/lib/interactive-canvas/types'

interface InteractiveCanvasProps {
  width: number
  height: number
  className?: string
}

export const InteractiveCanvas = React.forwardRef<Konva.Stage, InteractiveCanvasProps>(
  function InteractiveCanvas({ width, height, className }, ref) {
    const stageRef = useRef<Konva.Stage>(null)
    const [stageSize, setStageSize] = useState({ width, height })
    
    // Expose the stage ref to parent components
    React.useImperativeHandle(ref, () => stageRef.current!, [])
    
    const {
    canvasState,
    selectedTool,
    isDrawing,
    currentPath,
    startDrawing,
    addDrawingPoint,
    endDrawing,
    addShape,
    selectedColor,
    strokeWidth,
    fontSize,
    setZoom,
    setPan
  } = useInteractiveCanvasStore()

  // Update stage size when props change
  useEffect(() => {
    setStageSize({ width, height })
  }, [width, height])

  // Handle mouse/touch events
  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!selectedTool) return

    const stage = e.target.getStage()
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    const point: Point = { x: pos.x, y: pos.y }

    if (selectedTool.category === 'draw') {
      startDrawing(point)
    } else if (selectedTool.category === 'shape') {
      // Handle shape creation
      handleShapeCreation(point)
    } else if (selectedTool.category === 'game') {
      // Handle game element creation
      handleGameCreation(point)
    }
  }, [selectedTool, startDrawing])

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !selectedTool) return

    const stage = e.target.getStage()
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    const point: Point = { x: pos.x, y: pos.y }

    if (selectedTool.category === 'draw') {
      addDrawingPoint(point)
    }
  }, [isDrawing, selectedTool, addDrawingPoint])

  const handleStageMouseUp = useCallback(() => {
    if (isDrawing && selectedTool?.category === 'draw') {
      endDrawing()
    }
  }, [isDrawing, selectedTool, endDrawing])

  // Shape creation handler
  const handleShapeCreation = useCallback((point: Point) => {
    if (!selectedTool) return

    const shapeConfig = {
      type: selectedTool.id as any,
      x: point.x,
      y: point.y,
      width: selectedTool.id === 'text' ? 200 : 100,
      height: selectedTool.id === 'text' ? 30 : 100,
      radius: selectedTool.id === 'circle' ? 50 : undefined,
      text: selectedTool.id === 'text' ? 'Nuevo texto' : undefined,
      fontSize: selectedTool.id === 'text' ? fontSize : undefined,
      color: selectedColor,
      strokeWidth,
      fill: selectedTool.id === 'text' ? 'transparent' : undefined
    }

    addShape(shapeConfig)
  }, [selectedTool, selectedColor, strokeWidth, fontSize, addShape])

  // Game creation handler
  const handleGameCreation = useCallback((point: Point) => {
    if (!selectedTool) return

    // Safely compute dimensions with sensible defaults
    const cellSize = selectedTool.config?.cellSize ?? 40
    const cols = (selectedTool.config?.gridSize ?? selectedTool.config?.cols ?? 3)
    const rows = (selectedTool.config?.gridSize ?? selectedTool.config?.rows ?? 3)

    const gameConfig = {
      type: selectedTool.id as any,
      x: point.x,
      y: point.y,
      width: cellSize * cols,
      height: cellSize * rows,
      data: createGameData(selectedTool.id)
    }

    useInteractiveCanvasStore.getState().addGame(gameConfig)
  }, [selectedTool])

  // Create initial game data
  const createGameData = (gameType: string) => {
    switch (gameType) {
      case 'tic-tac-toe':
        return {
          grid: Array(3).fill(null).map(() => Array(3).fill('')),
          currentPlayer: 'X',
          winner: null,
          isPlayerTurn: true
        }
      case 'checkerboard':
        return {
          pattern: 'checkers',
          size: 8
        }
      case 'grid':
        return {
          rows: 10,
          cols: 10,
          showNumbers: true
        }
      default:
        return {}
    }
  }

  // Handle zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    
    const stage = stageRef.current
    if (!stage) return

    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const scaleBy = 1.1
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy

    // Limit zoom
    const clampedScale = Math.max(0.1, Math.min(5, newScale))

    setZoom(clampedScale)
    stage.scale({ x: clampedScale, y: clampedScale })

    // Adjust position to zoom towards pointer
    const newPos = {
      x: pointer.x - ((pointer.x - stage.x()) / oldScale) * clampedScale,
      y: pointer.y - ((pointer.y - stage.y()) / oldScale) * clampedScale
    }

    stage.position(newPos)
    setPan(newPos)
    stage.batchDraw()
  }, [setZoom, setPan])
  
  // Helpers for template styling
  const isDark = canvasState.backgroundColor === '#0f172a'
  const isNote = canvasState.backgroundColor === '#fdf5e6'
  const lineColor = isDark ? '#334155' : isNote ? '#d2c2a3' : '#c7cedf'
  const lineWidthLines = isDark ? 1 : 1.25
  const lineOpacityLines = isDark ? 0.5 : 0.7
  const lineWidthGrid = isDark ? 1 : 1.2
  const lineOpacityGrid = isDark ? 0.35 : 0.6

  return (
    <div className={className} style={{ backgroundColor: canvasState.backgroundColor }}>
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onWheel={handleWheel}
        draggable={selectedTool?.id === 'hand'}
      >
        {/* Background + Template */}
        <Layer>
          <Rect x={0} y={0} width={stageSize.width} height={stageSize.height} fill={canvasState.backgroundColor} />

          {/* Lines template */}
          {canvasState.backgroundTemplate === 'lines' && (
            <>
              {Array.from({ length: Math.ceil(stageSize.height / 30) }, (_, i) => (
                <Rect
                  key={`line-${i}`}
                  x={0}
                  y={i * 30}
                  width={stageSize.width}
                  height={lineWidthLines}
                  fill={lineColor}
                  opacity={lineOpacityLines}
                />
              ))}
            </>
          )}

          {/* Grid template */}
          {canvasState.backgroundTemplate === 'grid' && (
            <>
              {Array.from({ length: Math.ceil(stageSize.width / 20) }, (_, i) => (
                <Rect
                  key={`v-line-${i}`}
                  x={i * 20}
                  y={0}
                  width={lineWidthGrid}
                  height={stageSize.height}
                  fill={lineColor}
                  opacity={lineOpacityGrid}
                />
              ))}
              {Array.from({ length: Math.ceil(stageSize.height / 20) }, (_, i) => (
                <Rect
                  key={`h-line-${i}`}
                  x={0}
                  y={i * 20}
                  width={stageSize.width}
                  height={lineWidthGrid}
                  fill={lineColor}
                  opacity={lineOpacityGrid}
                />
              ))}
            </>
          )}
        </Layer>

        {/* Drawing paths */}
        <DrawingLayer />
        {/* Shapes */}
        <ShapeLayer />
        {/* Games */}
        <GameLayer />
        {/* Selection */}
        <SelectionLayer />
      </Stage>
    </div>
  )
})

