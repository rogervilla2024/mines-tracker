import { useState, useCallback } from 'react'
import clsx from 'clsx'
import GAME_CONFIG, { PAYOUT_TABLE } from '../config/gameConfig'

/**
 * Interactive 5x5 Mines Grid Component
 * Allows users to simulate mine placement and gem reveals
 */
function MinesGrid({ mineCount = 3, onReveal, interactive = true }) {
  const gridSize = 25 // 5x5
  const [revealed, setRevealed] = useState([])
  const [mines, setMines] = useState([])
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)

  // Generate random mine positions
  const generateMines = useCallback(() => {
    const positions = []
    while (positions.length < mineCount) {
      const pos = Math.floor(Math.random() * gridSize)
      if (!positions.includes(pos)) {
        positions.push(pos)
      }
    }
    return positions
  }, [mineCount, gridSize])

  // Start new game
  const resetGame = useCallback(() => {
    setRevealed([])
    setMines(generateMines())
    setGameOver(false)
    setWon(false)
  }, [generateMines])

  // Initialize mines on first render
  useState(() => {
    setMines(generateMines())
  }, [])

  // Handle cell click
  const handleClick = (index) => {
    if (!interactive || gameOver || revealed.includes(index)) return

    const newRevealed = [...revealed, index]
    setRevealed(newRevealed)

    if (mines.includes(index)) {
      // Hit a mine - game over
      setGameOver(true)
      setWon(false)
      if (onReveal) onReveal({ type: 'mine', index, revealed: newRevealed })
    } else {
      // Found a gem
      const gemsFound = newRevealed.filter(r => !mines.includes(r)).length
      const safeSpots = gridSize - mineCount

      if (gemsFound >= safeSpots) {
        // All gems found - won!
        setGameOver(true)
        setWon(true)
      }

      if (onReveal) onReveal({ type: 'gem', index, revealed: newRevealed, gemsFound })
    }
  }

  // Calculate current multiplier
  const getCurrentMultiplier = () => {
    const gemsFound = revealed.filter(r => !mines.includes(r)).length
    if (gemsFound === 0) return 1.00

    const payouts = PAYOUT_TABLE[mineCount] || PAYOUT_TABLE[3]
    return payouts[gemsFound - 1] || 1.00
  }

  // Calculate probability of next gem
  const getNextGemProbability = () => {
    const gemsFound = revealed.filter(r => !mines.includes(r)).length
    const remainingCells = gridSize - revealed.length
    const remainingGems = (gridSize - mineCount) - gemsFound

    if (remainingCells === 0) return 0
    return (remainingGems / remainingCells) * 100
  }

  const renderCell = (index) => {
    const isRevealed = revealed.includes(index)
    const isMine = mines.includes(index)
    const showMine = isRevealed && isMine
    const showGem = isRevealed && !isMine
    const showAllMines = gameOver && isMine

    return (
      <button
        key={index}
        onClick={() => handleClick(index)}
        disabled={!interactive || gameOver || isRevealed}
        className={clsx(
          'mines-grid-cell',
          !isRevealed && !showAllMines && 'tile-hidden',
          showGem && 'tile-gem animate-reveal',
          (showMine || showAllMines) && 'tile-mine animate-reveal',
          !interactive && 'cursor-default',
          gameOver && !isRevealed && !showAllMines && 'opacity-50'
        )}
      >
        {showGem && <span className="animate-gem">💎</span>}
        {(showMine || showAllMines) && <span className={showMine ? 'animate-mine' : ''}>💣</span>}
        {!isRevealed && !showAllMines && <span className="text-slate-500">?</span>}
      </button>
    )
  }

  return (
    <div className="space-y-4">
      {/* Game Info */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-slate-400">
            Mines: <span className="text-red-400 font-semibold">{mineCount}</span>
          </span>
          <span className="text-slate-400">
            Gems Found: <span className="text-green-400 font-semibold">
              {revealed.filter(r => !mines.includes(r)).length}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className={clsx(
            'font-bold',
            getCurrentMultiplier() >= 5 ? 'text-green-400' :
            getCurrentMultiplier() >= 2 ? 'text-emerald-400' : 'text-slate-300'
          )}>
            {getCurrentMultiplier().toFixed(2)}x
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-5 gap-2 p-4 bg-slate-900/50 rounded-xl">
        {Array.from({ length: gridSize }, (_, i) => renderCell(i))}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className={clsx(
          'px-3 py-1 rounded-full',
          getNextGemProbability() >= 70 ? 'bg-green-500/20 text-green-400' :
          getNextGemProbability() >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
          getNextGemProbability() >= 30 ? 'bg-orange-500/20 text-orange-400' :
          'bg-red-500/20 text-red-400'
        )}>
          Next Gem: {getNextGemProbability().toFixed(1)}%
        </div>

        {interactive && (
          <button
            onClick={resetGame}
            className="px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
          >
            New Game
          </button>
        )}
      </div>

      {/* Game Over Message */}
      {gameOver && (
        <div className={clsx(
          'text-center py-3 px-4 rounded-lg font-semibold',
          won ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        )}>
          {won ? (
            <>🎉 You found all gems! Final multiplier: {getCurrentMultiplier().toFixed(2)}x</>
          ) : (
            <>💥 Boom! You hit a mine!</>
          )}
        </div>
      )}
    </div>
  )
}

export default MinesGrid
