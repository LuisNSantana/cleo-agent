"use client"

import React from 'react'
import { Layer, Rect, Circle, Line, Text, Path, RegularPolygon } from 'react-konva'
import { useInteractiveCanvasStore } from '@/lib/interactive-canvas/store'
import type { Shape } from '@/lib/interactive-canvas/types'

interface ShapeComponentProps {
  shape: Shape
  isSelected: boolean
  onSelect: () => void
  onTransform: (updates: Partial<Shape>) => void
}

function ShapeComponent({ shape, isSelected, onSelect, onTransform }: ShapeComponentProps) {
  const handleDragEnd = (e: any) => {
    onTransform({
      x: e.target.x(),
      y: e.target.y()
    })
  }

  const handleTransformEnd = (e: any) => {
    const node = e.target
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()

    // Reset scale and update dimensions
    node.scaleX(1)
    node.scaleY(1)

    onTransform({
      x: node.x(),
      y: node.y(),
      width: Math.max(5, (shape.width || 100) * scaleX),
      height: Math.max(5, (shape.height || 100) * scaleY),
      rotation: node.rotation()
    })
  }

  const commonProps = {
    x: shape.x,
    y: shape.y,
    stroke: shape.color,
    strokeWidth: shape.strokeWidth,
    fill: shape.fill || 'transparent',
    draggable: true,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: handleDragEnd,
    onTransformEnd: handleTransformEnd,
    rotation: shape.rotation || 0
  }

  switch (shape.type) {
    case 'rectangle':
      return (
        <Rect
          {...commonProps}
          width={shape.width || 100}
          height={shape.height || 100}
        />
      )

    case 'circle':
      return (
        <Circle
          {...commonProps}
          radius={shape.radius || 50}
        />
      )

    case 'line':
      const endX = shape.points?.[1]?.x || shape.x + (shape.width || 100)
      const endY = shape.points?.[1]?.y || shape.y
      return (
        <Line
          {...commonProps}
          points={[shape.x, shape.y, endX, endY]}
        />
      )

    case 'arrow':
      const arrowEndX = shape.points?.[1]?.x || shape.x + (shape.width || 100)
      const arrowEndY = shape.points?.[1]?.y || shape.y
      return (
        <Line
          {...commonProps}
          points={[shape.x, shape.y, arrowEndX, arrowEndY]}
          fill={shape.color}
          closed={false}
          // Add arrow properties
          pointerLength={10}
          pointerWidth={10}
        />
      )

    case 'triangle':
      return (
        <RegularPolygon
          {...commonProps}
          sides={3}
          radius={(shape.width || 50) / 2}
        />
      )

    case 'text':
      return (
        <Text
          {...commonProps}
          text={shape.text || 'Texto'}
          fontSize={shape.fontSize || 16}
          width={shape.width || 200}
          height={shape.height || 30}
          fill={shape.color}
          stroke=""
        />
      )

    default:
      return null
  }
}

export function ShapeLayer() {
  const { canvasState, selectedElements, selectElements, updateShape } = useInteractiveCanvasStore()

  const handleShapeSelect = (shapeId: string) => {
    selectElements([shapeId])
  }

  const handleShapeTransform = (shapeId: string, updates: Partial<Shape>) => {
    updateShape(shapeId, updates)
  }

  return (
    <Layer>
      {canvasState.shapes.map((shape) => (
        <ShapeComponent
          key={shape.id}
          shape={shape}
          isSelected={selectedElements.includes(shape.id)}
          onSelect={() => handleShapeSelect(shape.id)}
          onTransform={(updates) => handleShapeTransform(shape.id, updates)}
        />
      ))}
    </Layer>
  )
}
