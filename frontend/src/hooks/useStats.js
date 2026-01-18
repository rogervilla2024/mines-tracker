import { useState, useEffect, useCallback } from 'react'
import GAME_CONFIG from '../config/gameConfig'

export function useStats() {
  const [summary, setSummary] = useState(null)
  const [recentGames, setRecentGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [summaryRes, gamesRes] = await Promise.all([
        fetch(`${GAME_CONFIG.apiUrl}/api/stats/summary`),
        fetch(`${GAME_CONFIG.apiUrl}/api/games?limit=50`)
      ])

      if (summaryRes.ok) setSummary(await summaryRes.json())
      if (gamesRes.ok) {
        const data = await gamesRes.json()
        setRecentGames(data.items || [])
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e)
      setError(e.message)

      // Set mock data for development
      setSummary({
        total_games: 0,
        avg_mines: 5,
        avg_gems_revealed: 4.2,
        win_rate: 45.5,
        avg_multiplier: 2.35,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [fetchStats])

  return { summary, recentGames, loading, error, refetch: fetchStats }
}

export function useProbability(mineCount, gemsRevealed) {
  const gridSize = GAME_CONFIG.gridSize || 25
  const safeSpots = gridSize - mineCount
  const remaining = gridSize - gemsRevealed
  const remainingGems = safeSpots - gemsRevealed

  // Probability of next tile being a gem
  const nextGemProbability = remaining > 0 ? (remainingGems / remaining) * 100 : 0

  // Risk level
  const riskLevel =
    nextGemProbability >= 70 ? 'low' :
    nextGemProbability >= 50 ? 'medium' :
    nextGemProbability >= 30 ? 'high' :
    'extreme'

  return { nextGemProbability, riskLevel, remainingGems, remaining }
}

export function usePayoutCalculator() {
  const [mineCount, setMineCount] = useState(3)
  const [betAmount, setBetAmount] = useState(1)
  const [gemsToReveal, setGemsToReveal] = useState(5)

  // Calculate expected payout
  const calculatePayout = useCallback(() => {
    // Simplified payout calculation
    // Real payout depends on sequential probability
    const gridSize = GAME_CONFIG.gridSize || 25
    let multiplier = 1
    let probability = 1

    for (let i = 0; i < gemsToReveal; i++) {
      const remainingCells = gridSize - i
      const remainingGems = (gridSize - mineCount) - i
      const stepProbability = remainingGems / remainingCells
      probability *= stepProbability
    }

    // House edge adjusted multiplier
    multiplier = (1 / probability) * (1 - GAME_CONFIG.houseEdge / 100)

    return {
      multiplier: multiplier.toFixed(2),
      payout: (betAmount * multiplier).toFixed(2),
      winProbability: (probability * 100).toFixed(2),
    }
  }, [mineCount, betAmount, gemsToReveal])

  return {
    mineCount, setMineCount,
    betAmount, setBetAmount,
    gemsToReveal, setGemsToReveal,
    ...calculatePayout()
  }
}
