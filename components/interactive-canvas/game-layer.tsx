"use client"

import React from 'react'
import { Layer, Group, Rect, Line, Text, Circle } from 'react-konva'
import { useInteractiveCanvasStore } from '@/lib/interactive-canvas/store'
import type { GameElement } from '@/lib/interactive-canvas/types'

interface TicTacToeProps {
  game: GameElement
  onGameUpdate: (updates: Partial<GameElement>) => void
}

function TicTacToeGame({ game, onGameUpdate }: TicTacToeProps) {
  const cellSize = 60
  const data = game.data

  const handleCellClick = (row: number, col: number) => {
    if (data.grid[row][col] !== '' || data.winner || !data.isPlayerTurn) return

    const newGrid = data.grid.map((r: any[], i: number) =>
      r.map((cell: any, j: number) => 
        i === row && j === col ? data.currentPlayer : cell
      )
    )

    // Check for winner
    const winner = checkWinner(newGrid)
    const isDraw = !winner && newGrid.every((row: any[]) => row.every((cell: any) => cell !== ''))

    // Get AI move if game continues and player just moved
    let finalGrid = newGrid
    let nextPlayer = data.currentPlayer === 'X' ? 'O' : 'X'
    let isPlayerTurn = true

    if (!winner && !isDraw && data.currentPlayer === 'X') {
      // AI move (Cleo plays as O)
      const aiMove = getAIMove(newGrid)
      if (aiMove) {
        finalGrid[aiMove.row][aiMove.col] = 'O'
        nextPlayer = 'X'
        isPlayerTurn = true
      }
    }

    const finalWinner = checkWinner(finalGrid)

    onGameUpdate({
      data: {
        ...data,
        grid: finalGrid,
        currentPlayer: nextPlayer,
        winner: finalWinner,
        isPlayerTurn: isPlayerTurn && !finalWinner
      }
    })
  }

  const checkWinner = (grid: string[][]) => {
    // Check rows, columns, and diagonals
    for (let i = 0; i < 3; i++) {
      if (grid[i][0] && grid[i][0] === grid[i][1] && grid[i][1] === grid[i][2]) return grid[i][0]
      if (grid[0][i] && grid[0][i] === grid[1][i] && grid[1][i] === grid[2][i]) return grid[0][i]
    }
    if (grid[0][0] && grid[0][0] === grid[1][1] && grid[1][1] === grid[2][2]) return grid[0][0]
    if (grid[0][2] && grid[0][2] === grid[1][1] && grid[1][1] === grid[2][0]) return grid[0][2]
    return null
  }

  const getAIMove = (grid: string[][]) => {
    // Simple AI: first try to win, then block, then take center, then corners
    const availableMoves = []
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (grid[i][j] === '') availableMoves.push({ row: i, col: j })
      }
    }

    // Try to win
    for (const move of availableMoves) {
      const testGrid = grid.map(row => [...row])
      testGrid[move.row][move.col] = 'O'
      if (checkWinner(testGrid) === 'O') return move
    }

    // Try to block
    for (const move of availableMoves) {
      const testGrid = grid.map(row => [...row])
      testGrid[move.row][move.col] = 'X'
      if (checkWinner(testGrid) === 'X') return move
    }

    // Take center
    if (grid[1][1] === '') return { row: 1, col: 1 }

    // Take corners
    const corners = [{ row: 0, col: 0 }, { row: 0, col: 2 }, { row: 2, col: 0 }, { row: 2, col: 2 }]
    const availableCorners = corners.filter(corner => grid[corner.row][corner.col] === '')
    if (availableCorners.length > 0) {
      return availableCorners[Math.floor(Math.random() * availableCorners.length)]
    }

    // Take any available move
    return availableMoves[0] || null
  }

  return (
    <Group x={game.x} y={game.y}>
      {/* Game board background */}
      <Rect
        width={cellSize * 3}
        height={cellSize * 3}
        fill="white"
        stroke="#333"
        strokeWidth={2}
      />
      
      {/* Grid lines */}
      <Line points={[cellSize, 0, cellSize, cellSize * 3]} stroke="#333" strokeWidth={1} />
      <Line points={[cellSize * 2, 0, cellSize * 2, cellSize * 3]} stroke="#333" strokeWidth={1} />
      <Line points={[0, cellSize, cellSize * 3, cellSize]} stroke="#333" strokeWidth={1} />
      <Line points={[0, cellSize * 2, cellSize * 3, cellSize * 2]} stroke="#333" strokeWidth={1} />

      {/* Game cells */}
      {data.grid.map((row: string[], i: number) =>
        row.map((cell: string, j: number) => (
          <Group key={`${i}-${j}`}>
            {/* Invisible clickable area */}
            <Rect
              x={j * cellSize}
              y={i * cellSize}
              width={cellSize}
              height={cellSize}
              fill="transparent"
              onClick={() => handleCellClick(i, j)}
            />
            
            {/* Cell content */}
            {cell === 'X' && (
              <Group>
                <Line
                  points={[
                    j * cellSize + 10, i * cellSize + 10,
                    j * cellSize + cellSize - 10, i * cellSize + cellSize - 10
                  ]}
                  stroke="#e74c3c"
                  strokeWidth={3}
                />
                <Line
                  points={[
                    j * cellSize + cellSize - 10, i * cellSize + 10,
                    j * cellSize + 10, i * cellSize + cellSize - 10
                  ]}
                  stroke="#e74c3c"
                  strokeWidth={3}
                />
              </Group>
            )}
            
            {cell === 'O' && (
              <Circle
                x={j * cellSize + cellSize / 2}
                y={i * cellSize + cellSize / 2}
                radius={cellSize / 2 - 10}
                stroke="#3498db"
                strokeWidth={3}
              />
            )}
          </Group>
        ))
      )}

      {/* Game status */}
      <Text
        x={0}
        y={cellSize * 3 + 10}
        text={
          data.winner 
            ? `¡${data.winner === 'X' ? 'Ganaste' : 'Cleo ganó'}!` 
            : data.isPlayerTurn 
              ? 'Tu turno (X)' 
              : 'Turno de Cleo (O)'
        }
        fontSize={14}
        fill={data.winner ? (data.winner === 'X' ? '#27ae60' : '#e74c3c') : '#333'}
        fontStyle={data.winner ? 'bold' : 'normal'}
      />
    </Group>
  )
}

interface CheckerboardProps {
  game: GameElement
}

function CheckerboardGame({ game }: CheckerboardProps) {
  const cellSize = 40
  const size = game.data.size || 8

  return (
    <Group x={game.x} y={game.y}>
      {Array.from({ length: size }).map((_, i) =>
        Array.from({ length: size }).map((_, j) => (
          <Rect
            key={`${i}-${j}`}
            x={j * cellSize}
            y={i * cellSize}
            width={cellSize}
            height={cellSize}
            fill={(i + j) % 2 === 0 ? '#f8f9fa' : '#343a40'}
            stroke="#6c757d"
            strokeWidth={0.5}
          />
        ))
      )}
    </Group>
  )
}

interface GridProps {
  game: GameElement
}

function GridGame({ game }: GridProps) {
  const cellSize = 30
  const rows = game.data.rows || 10
  const cols = game.data.cols || 10

  return (
    <Group x={game.x} y={game.y}>
      {/* Grid background */}
      <Rect
        width={cols * cellSize}
        height={rows * cellSize}
        fill="white"
        stroke="#ddd"
        strokeWidth={1}
      />
      
      {/* Vertical lines */}
      {Array.from({ length: cols + 1 }).map((_, i) => (
        <Line
          key={`v-${i}`}
          points={[i * cellSize, 0, i * cellSize, rows * cellSize]}
          stroke="#ddd"
          strokeWidth={1}
        />
      ))}
      
      {/* Horizontal lines */}
      {Array.from({ length: rows + 1 }).map((_, i) => (
        <Line
          key={`h-${i}`}
          points={[0, i * cellSize, cols * cellSize, i * cellSize]}
          stroke="#ddd"
          strokeWidth={1}
        />
      ))}

      {/* Row/column numbers if enabled */}
      {game.data.showNumbers && (
        <>
          {Array.from({ length: rows }).map((_, i) => (
            <Text
              key={`row-${i}`}
              x={-20}
              y={i * cellSize + cellSize / 2 - 6}
              text={(i + 1).toString()}
              fontSize={12}
              fill="#666"
            />
          ))}
          {Array.from({ length: cols }).map((_, i) => (
            <Text
              key={`col-${i}`}
              x={i * cellSize + cellSize / 2 - 6}
              y={-20}
              text={(i + 1).toString()}
              fontSize={12}
              fill="#666"
            />
          ))}
        </>
      )}
    </Group>
  )
}

export function GameLayer() {
  const { canvasState, updateGame } = useInteractiveCanvasStore()

  const handleGameUpdate = (gameId: string, updates: Partial<GameElement>) => {
    updateGame(gameId, updates)
  }

  return (
    <Layer>
      {canvasState.games.map((game) => {
        switch (game.type) {
          case 'tic-tac-toe':
            return (
              <TicTacToeGame
                key={game.id}
                game={game}
                onGameUpdate={(updates) => handleGameUpdate(game.id, updates)}
              />
            )
          case 'checkerboard':
            return <CheckerboardGame key={game.id} game={game} />
          case 'grid':
            return <GridGame key={game.id} game={game} />
          default:
            return null
        }
      })}
    </Layer>
  )
}
