import { format, formatDistanceToNow } from 'date-fns'

export function getMultiplierClass(multiplier) {
  if (multiplier < 1.5) return 'text-green-400'
  if (multiplier < 2) return 'text-emerald-400'
  if (multiplier < 3) return 'text-teal-400'
  if (multiplier < 5) return 'text-cyan-400'
  if (multiplier < 10) return 'text-blue-400'
  if (multiplier < 50) return 'text-indigo-400'
  return 'text-purple-400'
}

export function getMultiplierColor(multiplier) {
  if (multiplier < 1.5) return 'bg-green-800/40'
  if (multiplier < 2) return 'bg-emerald-800/40'
  if (multiplier < 3) return 'bg-teal-800/40'
  if (multiplier < 5) return 'bg-cyan-800/40'
  if (multiplier < 10) return 'bg-blue-800/40'
  if (multiplier < 50) return 'bg-indigo-800/40'
  return 'bg-purple-800/40'
}

export function getProbabilityClass(probability) {
  if (probability >= 70) return 'text-green-400'
  if (probability >= 50) return 'text-yellow-400'
  if (probability >= 30) return 'text-orange-400'
  return 'text-red-400'
}

export function getProbabilityBgClass(probability) {
  if (probability >= 70) return 'bg-green-500/20'
  if (probability >= 50) return 'bg-yellow-500/20'
  if (probability >= 30) return 'bg-orange-500/20'
  return 'bg-red-500/20'
}

export function getRiskLabel(probability) {
  if (probability >= 70) return 'Low Risk'
  if (probability >= 50) return 'Medium Risk'
  if (probability >= 30) return 'High Risk'
  return 'Extreme Risk'
}

export function formatTime(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatDateTime(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  return format(d, 'MMM d, HH:mm:ss')
}

export function formatNumber(num, decimals = 0) {
  if (num === null || num === undefined) return '-'
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

export function formatPercent(num, decimals = 1) {
  if (num === null || num === undefined) return '-'
  return `${num.toFixed(decimals)}%`
}

export function formatMultiplier(num, decimals = 2) {
  if (num === null || num === undefined) return '-'
  return `${num.toFixed(decimals)}x`
}

/**
 * Calculate probability of revealing N gems with M mines
 */
export function calculateGemProbability(mineCount, gemsToReveal, gridSize = 25) {
  const safeSpots = gridSize - mineCount

  if (gemsToReveal > safeSpots) return 0

  let probability = 1
  for (let i = 0; i < gemsToReveal; i++) {
    const remainingCells = gridSize - i
    const remainingGems = safeSpots - i
    probability *= remainingGems / remainingCells
  }

  return probability * 100
}

/**
 * Calculate multiplier for revealing N gems with M mines
 */
export function calculateMultiplier(mineCount, gemsRevealed, gridSize = 25, houseEdge = 3) {
  const probability = calculateGemProbability(mineCount, gemsRevealed, gridSize) / 100
  if (probability === 0) return 0

  return (1 / probability) * (1 - houseEdge / 100)
}
