/**
 * Grid Game Specific Statistics Component
 *
 * Specialized visualizations for grid-type games:
 * - Mines: Mine position heatmap
 * - Towers: Floor analysis
 * - Chicken Road: Lane analysis
 */

import React, { useState, useEffect, useMemo } from 'react'
import GAME_CONFIG from '../config/gameConfig'

// =============================================================================
// Utility Functions
// =============================================================================

const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined) return '-'
  return Number(num).toFixed(decimals)
}

const formatPercent = (num) => {
  if (num === null || num === undefined) return '-'
  return `${Number(num).toFixed(1)}%`
}

// =============================================================================
// Tile Analysis Component (Common)
// =============================================================================

export const TileAnalysis = ({ data, className = '' }) => {
  if (!data) return null

  return (
    <div className={`bg-slate-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>📊</span>
        Tile/Step Analysis
      </h3>

      {/* Core Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-slate-700/50 rounded">
          <p className="text-xl font-bold text-blue-400">{formatNumber(data.avg_tiles_opened)}</p>
          <p className="text-xs text-slate-400">Avg Tiles</p>
        </div>
        <div className="text-center p-3 bg-slate-700/50 rounded">
          <p className="text-xl font-bold text-green-400">{formatNumber(data.avg_multiplier)}x</p>
          <p className="text-xs text-slate-400">Avg Multi</p>
        </div>
        <div className="text-center p-3 bg-slate-700/50 rounded">
          <p className="text-xl font-bold text-purple-400">{data.max_tiles_opened}</p>
          <p className="text-xs text-slate-400">Max Tiles</p>
        </div>
      </div>

      {/* Cashout Patterns */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-slate-400 mb-2">Cashout Patterns</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-20 text-xs text-slate-400">Early (1-3)</span>
            <div className="flex-1 h-4 bg-slate-700 rounded overflow-hidden">
              <div
                className="h-full bg-yellow-500"
                style={{ width: `${data.early_cashout_rate}%` }}
              />
            </div>
            <span className="w-12 text-xs font-mono text-right">{formatPercent(data.early_cashout_rate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-20 text-xs text-slate-400">Mid (4-7)</span>
            <div className="flex-1 h-4 bg-slate-700 rounded overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${data.mid_cashout_rate}%` }}
              />
            </div>
            <span className="w-12 text-xs font-mono text-right">{formatPercent(data.mid_cashout_rate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-20 text-xs text-slate-400">Late (8+)</span>
            <div className="flex-1 h-4 bg-slate-700 rounded overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{ width: `${data.late_cashout_rate}%` }}
              />
            </div>
            <span className="w-12 text-xs font-mono text-right">{formatPercent(data.late_cashout_rate)}</span>
          </div>
        </div>
      </div>

      {/* Failure Stats */}
      <div className="p-3 bg-red-500/10 rounded">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">First Tile Fail Rate</span>
          <span className="font-mono text-red-400">{formatPercent(data.first_tile_fail_rate)}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-slate-400">Avg Tiles Before Fail</span>
          <span className="font-mono">{formatNumber(data.avg_tiles_before_fail)}</span>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Based on {data.total_rounds?.toLocaleString()} rounds.
      </p>
    </div>
  )
}

// =============================================================================
// Risk Level Comparison Component
// =============================================================================

export const RiskLevelComparison = ({ data, className = '' }) => {
  if (!data || !data.length) return null

  const getRiskColor = (level) => {
    switch (level.toLowerCase()) {
      case 'easy': return 'text-green-400 border-green-500 bg-green-500/10'
      case 'medium': return 'text-yellow-400 border-yellow-500 bg-yellow-500/10'
      case 'hard': return 'text-orange-400 border-orange-500 bg-orange-500/10'
      case 'extreme': return 'text-red-400 border-red-500 bg-red-500/10'
      default: return 'text-slate-400 border-slate-500 bg-slate-500/10'
    }
  }

  return (
    <div className={`bg-slate-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>⚖️</span>
        Risk Level Comparison
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.map((risk) => (
          <div
            key={risk.risk_level}
            className={`p-4 rounded-lg border ${getRiskColor(risk.risk_level)}`}
          >
            <h4 className="font-bold text-center uppercase mb-3">{risk.risk_level}</h4>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Avg Multi</span>
                <span className="font-mono">{formatNumber(risk.avg_multiplier)}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Success</span>
                <span className="font-mono">{formatPercent(risk.success_rate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Big Win</span>
                <span className="font-mono">{formatPercent(risk.big_win_rate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">RTP</span>
                <span className="font-mono">{formatPercent(risk.theoretical_rtp)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Higher risk = higher potential rewards but lower success rate.
      </p>
    </div>
  )
}

// =============================================================================
// Mine Position Heatmap (Mines specific)
// =============================================================================

export const MineHeatmap = ({ data, className = '' }) => {
  if (!data) return null

  const gridSize = 5 // 5x5 grid
  const maxFreq = Math.max(...Object.values(data.position_frequency || {}), 1)

  const getHeatColor = (freq) => {
    const ratio = freq / maxFreq
    if (ratio >= 0.8) return 'bg-red-500'
    if (ratio >= 0.6) return 'bg-orange-500'
    if (ratio >= 0.4) return 'bg-yellow-500'
    if (ratio >= 0.2) return 'bg-green-500'
    return 'bg-blue-500'
  }

  const positionName = (pos) => {
    const row = Math.floor(pos / gridSize)
    const col = pos % gridSize
    return `R${row + 1}C${col + 1}`
  }

  return (
    <div className={`bg-slate-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>💣</span>
        Mine Position Heatmap
      </h3>

      {/* Grid */}
      <div className="flex justify-center mb-4">
        <div className="grid grid-cols-5 gap-1">
          {Array.from({ length: 25 }).map((_, pos) => {
            const freq = data.position_frequency?.[pos] || 0

            return (
              <div
                key={pos}
                className={`w-12 h-12 rounded flex items-center justify-center text-xs font-mono ${getHeatColor(freq)}`}
                title={`Position ${pos}: ${formatPercent(freq)}`}
              >
                {formatNumber(freq, 1)}%
              </div>
            )
          })}
        </div>
      </div>

      {/* Position Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-slate-700/50 rounded">
          <p className="text-lg font-bold text-yellow-400">{formatPercent(data.corner_mine_rate)}</p>
          <p className="text-xs text-slate-400">Corners</p>
        </div>
        <div className="text-center p-3 bg-slate-700/50 rounded">
          <p className="text-lg font-bold text-blue-400">{formatPercent(data.edge_mine_rate)}</p>
          <p className="text-xs text-slate-400">Edges</p>
        </div>
        <div className="text-center p-3 bg-slate-700/50 rounded">
          <p className="text-lg font-bold text-red-400">{formatPercent(data.center_mine_rate)}</p>
          <p className="text-xs text-slate-400">Center</p>
        </div>
      </div>

      {/* Safe/Risky Positions */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-green-500/10 rounded">
          <h4 className="text-sm font-medium text-green-400 mb-1">Safest Positions</h4>
          <p className="text-xs font-mono">
            {data.safest_positions?.map(p => positionName(p)).join(', ') || '-'}
          </p>
        </div>
        <div className="p-3 bg-red-500/10 rounded">
          <h4 className="text-sm font-medium text-red-400 mb-1">Riskiest Positions</h4>
          <p className="text-xs font-mono">
            {data.riskiest_positions?.map(p => positionName(p)).join(', ') || '-'}
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Heatmap shows mine frequency per position. Mine positions are random - patterns are coincidental.
      </p>
    </div>
  )
}

// =============================================================================
// Floor Analysis (Towers specific)
// =============================================================================

export const FloorAnalysis = ({ data, className = '' }) => {
  if (!data) return null

  const maxFloors = Math.max(...Object.keys(data.floor_success_rates || {}).map(Number), 10)

  return (
    <div className={`bg-slate-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>🏗️</span>
        Floor Analysis
      </h3>

      {/* Overview Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-slate-700/50 rounded">
          <p className="text-xl font-bold text-blue-400">{formatNumber(data.avg_floor_reached)}</p>
          <p className="text-xs text-slate-400">Avg Floor</p>
        </div>
        <div className="text-center p-3 bg-slate-700/50 rounded">
          <p className="text-xl font-bold text-green-400">{data.max_floor_reached}</p>
          <p className="text-xs text-slate-400">Max Floor</p>
        </div>
        <div className="text-center p-3 bg-slate-700/50 rounded border-2 border-yellow-500">
          <p className="text-xl font-bold text-yellow-400">{data.recommended_stop_floor}</p>
          <p className="text-xs text-slate-400">Best Stop</p>
        </div>
      </div>

      {/* Floor Success Rates */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-slate-400 mb-2">Success Rate by Floor</h4>
        <div className="space-y-1">
          {Object.entries(data.floor_success_rates || {}).slice(0, 10).map(([floor, rate]) => (
            <div key={floor} className="flex items-center gap-2">
              <span className="w-8 text-xs text-slate-400">F{floor}</span>
              <div className="flex-1 h-4 bg-slate-700 rounded overflow-hidden">
                <div
                  className={`h-full ${rate >= 50 ? 'bg-green-500' : rate >= 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${rate}%` }}
                />
              </div>
              <span className="w-12 text-xs font-mono text-right">{formatPercent(rate)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Choice Analysis */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-blue-500/10 rounded">
          <p className="text-lg font-bold text-blue-400">{formatPercent(data.left_success_rate)}</p>
          <p className="text-xs text-slate-400">Left</p>
        </div>
        <div className="text-center p-3 bg-green-500/10 rounded">
          <p className="text-lg font-bold text-green-400">{formatPercent(data.middle_success_rate)}</p>
          <p className="text-xs text-slate-400">Middle</p>
        </div>
        <div className="text-center p-3 bg-purple-500/10 rounded">
          <p className="text-lg font-bold text-purple-400">{formatPercent(data.right_success_rate)}</p>
          <p className="text-xs text-slate-400">Right</p>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Based on {data.total_rounds?.toLocaleString()} rounds. Success rates decrease with each floor.
      </p>
    </div>
  )
}

// =============================================================================
// Lane Analysis (Chicken Road specific)
// =============================================================================

export const LaneAnalysis = ({ data, className = '' }) => {
  if (!data) return null

  return (
    <div className={`bg-slate-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>🐔</span>
        Lane Analysis
      </h3>

      {/* Overview Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-slate-700/50 rounded">
          <p className="text-xl font-bold text-blue-400">{formatNumber(data.avg_distance)}</p>
          <p className="text-xs text-slate-400">Avg Distance</p>
        </div>
        <div className="text-center p-3 bg-slate-700/50 rounded">
          <p className="text-xl font-bold text-green-400">{data.max_distance}</p>
          <p className="text-xs text-slate-400">Max Distance</p>
        </div>
        <div className="text-center p-3 bg-slate-700/50 rounded">
          <p className="text-xl font-bold text-purple-400">{formatPercent(data.completed_rate)}</p>
          <p className="text-xs text-slate-400">Completed</p>
        </div>
      </div>

      {/* Lane Success Rates */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-slate-400 mb-2">Success Rate by Lane</h4>
        <div className="space-y-1">
          {Object.entries(data.lane_success_rates || {}).map(([lane, rate]) => (
            <div key={lane} className="flex items-center gap-2">
              <span className="w-8 text-xs text-slate-400">L{lane}</span>
              <div className="flex-1 h-4 bg-slate-700 rounded overflow-hidden">
                <div
                  className={`h-full ${rate >= 50 ? 'bg-green-500' : rate >= 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${rate}%` }}
                />
              </div>
              <span className="w-12 text-xs font-mono text-right">{formatPercent(rate)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zones */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-green-500/10 rounded">
          <h4 className="text-sm font-medium text-green-400 mb-1">Safest Lane</h4>
          <p className="text-2xl font-bold text-center">Lane {data.safest_lane}</p>
        </div>
        <div className="p-3 bg-red-500/10 rounded">
          <h4 className="text-sm font-medium text-red-400 mb-1">Most Dangerous</h4>
          <p className="text-2xl font-bold text-center">Lane {data.most_dangerous_lane}</p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-orange-500/10 rounded">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Caught Early (1-3 lanes)</span>
          <span className="font-mono text-orange-400">{formatPercent(data.caught_early_rate)}</span>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Based on {data.total_rounds?.toLocaleString()} rounds. Lane patterns are random.
      </p>
    </div>
  )
}

// =============================================================================
// Main Grid Game Stats Page Component
// =============================================================================

export const GridGameStatsPage = ({ gameType = 'mines', className = '' }) => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState('24h')

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      setError(null)

      try {
        const apiUrl = GAME_CONFIG?.apiBaseUrl || GAME_CONFIG?.apiUrl || 'http://localhost:8000'
        const gameId = GAME_CONFIG?.gameId || GAME_CONFIG?.id || gameType

        const response = await fetch(`${apiUrl}/api/v2/grid/${gameId}?period=${period}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const data = await response.json()
        setStats(data)
      } catch (e) {
        console.error('Failed to fetch grid stats:', e)
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 60 * 1000)
    return () => clearInterval(interval)
  }, [period, gameType])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
        Failed to load statistics: {error}
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Period Selector */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">
          {gameType === 'mines' && 'Mines Analytics'}
          {gameType === 'towers' && 'Towers Analytics'}
          {gameType === 'chickenroad' && 'Chicken Road Analytics'}
        </h2>
        <div className="flex gap-1">
          {['1h', '6h', '24h', '7d', '30d'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Common Components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TileAnalysis data={stats?.tile_analysis} />
        <RiskLevelComparison data={stats?.risk_level_comparison} />
      </div>

      {/* Game-Specific Components */}
      {gameType === 'mines' && stats?.position_heatmap && (
        <MineHeatmap data={stats.position_heatmap} className="mb-6" />
      )}

      {gameType === 'towers' && stats?.floor_analysis && (
        <FloorAnalysis data={stats.floor_analysis} className="mb-6" />
      )}

      {gameType === 'chickenroad' && stats?.lane_analysis && (
        <LaneAnalysis data={stats.lane_analysis} className="mb-6" />
      )}

      {/* Disclaimer */}
      <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <p className="text-xs text-slate-400">
          <strong className="text-yellow-400">Disclaimer:</strong> These statistics are for
          educational purposes only. All positions and outcomes are randomly generated. Past
          patterns do not predict future results. Gamble responsibly.
        </p>
      </div>
    </div>
  )
}

export default GridGameStatsPage
