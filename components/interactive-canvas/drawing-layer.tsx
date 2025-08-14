"use client"

import React, { useMemo } from 'react'
import { Layer, Line } from 'react-konva'
import { useInteractiveCanvasStore } from '@/lib/interactive-canvas/store'
import { getStroke } from 'perfect-freehand'

export function DrawingLayer() {
  const { canvasState, currentPath, isDrawing } = useInteractiveCanvasStore()

  // Render all completed paths
  const completedPaths = useMemo(() => {
    return canvasState.paths.map((path) => {
      if (path.points.length < 2) return null

      // Use perfect-freehand for smooth drawing
      const stroke = getStroke(path.points, {
        size: path.strokeWidth,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
      })

      // Convert stroke to points for Konva Line
      const points = stroke.reduce((acc: number[], point) => {
        acc.push(point[0], point[1])
        return acc
      }, [])

      return (
        <Line
          key={path.id}
          points={points}
          stroke={path.color}
          strokeWidth={path.tool === 'eraser' ? 0 : 1}
          fill={path.tool === 'eraser' ? 'white' : path.color}
          closed={true}
          globalCompositeOperation={path.tool === 'eraser' ? 'destination-out' : 'source-over'}
          opacity={path.tool === 'highlighter' ? 0.6 : 1}
        />
      )
    })
  }, [canvasState.paths])

  // Render current drawing path
  const currentDrawing = useMemo(() => {
    if (!isDrawing || !currentPath || currentPath.points.length < 2) {
      return null
    }

    const stroke = getStroke(currentPath.points, {
      size: currentPath.strokeWidth,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
    })

    const points = stroke.reduce((acc: number[], point) => {
      acc.push(point[0], point[1])
      return acc
    }, [])

    return (
      <Line
        points={points}
        stroke={currentPath.color}
        strokeWidth={currentPath.tool === 'eraser' ? 0 : 1}
        fill={currentPath.tool === 'eraser' ? 'white' : currentPath.color}
        closed={true}
        globalCompositeOperation={currentPath.tool === 'eraser' ? 'destination-out' : 'source-over'}
        opacity={currentPath.tool === 'highlighter' ? 0.6 : 1}
      />
    )
  }, [isDrawing, currentPath])

  return (
    <Layer>
      {completedPaths}
      {currentDrawing}
    </Layer>
  )
}
