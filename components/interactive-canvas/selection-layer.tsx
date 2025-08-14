"use client"

import React from 'react'
import { Layer, Group, Rect, Line } from 'react-konva'
import { useInteractiveCanvasStore } from '@/lib/interactive-canvas/store'
import type { Point } from '@/lib/interactive-canvas/types'

interface SelectionBoxProps {
  start: Point
  end: Point
}

function SelectionBox({ start, end }: SelectionBoxProps) {
  const x = Math.min(start.x, end.x)
  const y = Math.min(start.y, end.y)
  const width = Math.abs(end.x - start.x)
  const height = Math.abs(end.y - start.y)

  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="rgba(59, 130, 246, 0.1)"
      stroke="#3b82f6"
      strokeWidth={1}
      dash={[5, 5]}
    />
  )
}

interface TransformHandleProps {
  x: number
  y: number
  onMouseDown: (e: any) => void
}

function TransformHandle({ x, y, onMouseDown }: TransformHandleProps) {
  return (
    <Rect
      x={x - 4}
      y={y - 4}
      width={8}
      height={8}
      fill="white"
      stroke="#3b82f6"
      strokeWidth={2}
      onMouseDown={onMouseDown}
    />
  )
}

interface SelectionIndicatorProps {
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  onTransform?: (deltaX: number, deltaY: number, scaleX: number, scaleY: number) => void
}

function SelectionIndicator({ bounds, onTransform }: SelectionIndicatorProps) {
  const { x, y, width, height } = bounds

  const handleCornerDrag = (corner: string) => (e: any) => {
    e.cancelBubble = true
    
    const stage = e.target.getStage()
    const startPointer = stage.getPointerPosition()
    
    const handleMouseMove = (e: any) => {
      const newPointer = stage.getPointerPosition()
      const deltaX = newPointer.x - startPointer.x
      const deltaY = newPointer.y - startPointer.y
      
      let scaleX = 1
      let scaleY = 1
      
      switch (corner) {
        case 'top-left':
          scaleX = (width - deltaX) / width
          scaleY = (height - deltaY) / height
          break
        case 'top-right':
          scaleX = (width + deltaX) / width
          scaleY = (height - deltaY) / height
          break
        case 'bottom-left':
          scaleX = (width - deltaX) / width
          scaleY = (height + deltaY) / height
          break
        case 'bottom-right':
          scaleX = (width + deltaX) / width
          scaleY = (height + deltaY) / height
          break
      }
      
      onTransform?.(0, 0, Math.max(0.1, scaleX), Math.max(0.1, scaleY))
    }
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <Group>
      {/* Selection border */}
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="transparent"
        stroke="#3b82f6"
        strokeWidth={2}
        dash={[5, 5]}
      />
      
      {/* Transform handles */}
      <TransformHandle 
        x={x} 
        y={y} 
        onMouseDown={handleCornerDrag('top-left')} 
      />
      <TransformHandle 
        x={x + width} 
        y={y} 
        onMouseDown={handleCornerDrag('top-right')} 
      />
      <TransformHandle 
        x={x} 
        y={y + height} 
        onMouseDown={handleCornerDrag('bottom-left')} 
      />
      <TransformHandle 
        x={x + width} 
        y={y + height} 
        onMouseDown={handleCornerDrag('bottom-right')} 
      />
      
      {/* Edge handles for larger selections */}
      {width > 50 && (
        <>
          <TransformHandle 
            x={x + width / 2} 
            y={y} 
            onMouseDown={handleCornerDrag('top-center')} 
          />
          <TransformHandle 
            x={x + width / 2} 
            y={y + height} 
            onMouseDown={handleCornerDrag('bottom-center')} 
          />
        </>
      )}
      
      {height > 50 && (
        <>
          <TransformHandle 
            x={x} 
            y={y + height / 2} 
            onMouseDown={handleCornerDrag('center-left')} 
          />
          <TransformHandle 
            x={x + width} 
            y={y + height / 2} 
            onMouseDown={handleCornerDrag('center-right')} 
          />
        </>
      )}
    </Group>
  )
}

export function SelectionLayer() {
  const { 
    canvasState, 
    selectionBoxStart, 
    selectionBoxEnd,
    selectedElements,
    transformSelection
  } = useInteractiveCanvasStore()

  // Show selection box while dragging
  const showSelectionBox = selectionBoxStart && selectionBoxEnd && 
    (Math.abs(selectionBoxEnd.x - selectionBoxStart.x) > 5 || 
     Math.abs(selectionBoxEnd.y - selectionBoxStart.y) > 5)

  // Calculate bounds for selected elements
  const getSelectionBounds = () => {
    if (selectedElements.length === 0) return null

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    selectedElements.forEach(elementId => {
      // Find the element in shapes or games
      const shape = canvasState.shapes.find(s => s.id === elementId)
      const game = canvasState.games.find(g => g.id === elementId)
      
      if (shape) {
        minX = Math.min(minX, shape.x)
        minY = Math.min(minY, shape.y)
        
        switch (shape.type) {
          case 'rectangle':
            maxX = Math.max(maxX, shape.x + (shape.width || 100))
            maxY = Math.max(maxY, shape.y + (shape.height || 100))
            break
          case 'circle':
            const radius = shape.radius || 50
            maxX = Math.max(maxX, shape.x + radius)
            maxY = Math.max(maxY, shape.y + radius)
            break
          case 'line':
          case 'arrow':
            maxX = Math.max(maxX, shape.endX || shape.x + 100)
            maxY = Math.max(maxY, shape.endY || shape.y + 100)
            break
          case 'text':
            // Estimate text bounds
            const fontSize = shape.fontSize || 16
            const textWidth = (shape.text?.length || 5) * fontSize * 0.6
            maxX = Math.max(maxX, shape.x + textWidth)
            maxY = Math.max(maxY, shape.y + fontSize)
            break
          default:
            maxX = Math.max(maxX, shape.x + 100)
            maxY = Math.max(maxY, shape.y + 100)
        }
      }
      
      if (game) {
        minX = Math.min(minX, game.x)
        minY = Math.min(minY, game.y)
        
        // Estimate game bounds based on type
        switch (game.type) {
          case 'tic-tac-toe':
            maxX = Math.max(maxX, game.x + 180) // 3 * 60
            maxY = Math.max(maxY, game.y + 210) // 3 * 60 + 30 for status
            break
          case 'checkerboard':
            const size = game.data.size || 8
            maxX = Math.max(maxX, game.x + size * 40)
            maxY = Math.max(maxY, game.y + size * 40)
            break
          case 'grid':
            const rows = game.data.rows || 10
            const cols = game.data.cols || 10
            maxX = Math.max(maxX, game.x + cols * 30)
            maxY = Math.max(maxY, game.y + rows * 30)
            break
          default:
            maxX = Math.max(maxX, game.x + 200)
            maxY = Math.max(maxY, game.y + 200)
        }
      }
    })

    if (minX === Infinity) return null

    return {
      x: minX - 5,
      y: minY - 5,
      width: maxX - minX + 10,
      height: maxY - minY + 10
    }
  }

  const selectionBounds = getSelectionBounds()

  const handleTransform = (deltaX: number, deltaY: number, scaleX: number, scaleY: number) => {
    transformSelection(deltaX, deltaY, scaleX, scaleY)
  }

  return (
    <Layer>
      {/* Selection box while dragging */}
      {showSelectionBox && (
        <SelectionBox 
          start={selectionBoxStart!} 
          end={selectionBoxEnd!} 
        />
      )}
      
      {/* Selection indicator for selected elements */}
      {selectionBounds && selectedElements.length > 0 && (
        <SelectionIndicator 
          bounds={selectionBounds}
          onTransform={handleTransform}
        />
      )}
    </Layer>
  )
}
