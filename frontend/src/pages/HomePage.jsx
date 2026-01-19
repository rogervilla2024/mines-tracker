import { useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import GAME_CONFIG, { PAYOUT_TABLE } from '../config/gameConfig'
import MinesGrid from '../components/MinesGrid'
import { formatNumber, formatPercent, calculateGemProbability, calculateMultiplier } from '../utils/formatters'

const TABS = [
  { id: 'simulator', label: 'Simulator', icon: '💎' },
  { id: 'calculator', label: 'Calculator', icon: '🧮' },
  { id: 'payouts', label: 'Payout Table', icon: '📊' },
]

function StatsCard({ title, value, icon, color = 'default' }) {
  const colorClasses = {
    default: 'from-slate-600 to-slate-700',
    green: 'from-green-600/20 to-emerald-600/20 border-green-500/30',
    blue: 'from-blue-600/20 to-cyan-600/20 border-blue-500/30',
    purple: 'from-purple-600/20 to-indigo-600/20 border-purple-500/30',
    yellow: 'from-yellow-600/20 to-amber-600/20 border-yellow-500/30',
    red: 'from-red-600/20 to-orange-600/20 border-red-500/30',
  }

  return (
    <div className={clsx(
      'card bg-gradient-to-br border',
      colorClasses[color]
    )}>
      <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  )
}

function PayoutCalculator() {
  const [mineCount, setMineCount] = useState(5)
  const [gemsToReveal, setGemsToReveal] = useState(5)
  const [betAmount, setBetAmount] = useState(1)

  const gridSize = GAME_CONFIG.gridSize || 25
  const maxGems = gridSize - mineCount

  const probability = calculateGemProbability(mineCount, gemsToReveal, gridSize)
  const multiplier = calculateMultiplier(mineCount, gemsToReveal, gridSize, GAME_CONFIG.houseEdge)
  const payout = betAmount * multiplier

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>🧮</span> Probability Calculator
      </h3>

      <div className="space-y-4">
        {/* Mine Count Slider */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">
            Number of Mines: <span className="text-red-400 font-semibold">{mineCount}</span>
          </label>
          <input
            type="range"
            min={GAME_CONFIG.minMines}
            max={GAME_CONFIG.maxMines}
            value={mineCount}
            onChange={(e) => {
              const newMines = parseInt(e.target.value)
              setMineCount(newMines)
              if (gemsToReveal > gridSize - newMines) {
                setGemsToReveal(gridSize - newMines)
              }
            }}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>{GAME_CONFIG.minMines}</span>
            <span>{GAME_CONFIG.maxMines}</span>
          </div>
        </div>

        {/* Gems to Reveal Slider */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">
            Gems to Reveal: <span className="text-green-400 font-semibold">{gemsToReveal}</span>
          </label>
          <input
            type="range"
            min={1}
            max={maxGems}
            value={gemsToReveal}
            onChange={(e) => setGemsToReveal(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>1</span>
            <span>{maxGems}</span>
          </div>
        </div>

        {/* Bet Amount */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Bet Amount ($)</label>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={betAmount}
            onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
          />
        </div>

        {/* Results */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-700">
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">Win Probability</div>
            <div className={clsx(
              'text-lg font-bold',
              probability >= 50 ? 'text-green-400' :
              probability >= 20 ? 'text-yellow-400' : 'text-red-400'
            )}>
              {formatPercent(probability)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">Multiplier</div>
            <div className="text-lg font-bold text-emerald-400">
              {multiplier.toFixed(2)}x
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">Potential Win</div>
            <div className="text-lg font-bold text-cyan-400">
              ${payout.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Risk Warning */}
        <div className={clsx(
          'text-center text-sm py-2 px-3 rounded-lg',
          probability >= 50 ? 'bg-green-500/10 text-green-400' :
          probability >= 20 ? 'bg-yellow-500/10 text-yellow-400' :
          probability >= 5 ? 'bg-orange-500/10 text-orange-400' :
          'bg-red-500/10 text-red-400'
        )}>
          {probability >= 50 ? 'Low Risk' :
           probability >= 20 ? 'Medium Risk' :
           probability >= 5 ? 'High Risk' : 'Extreme Risk'}
        </div>
      </div>
    </div>
  )
}

function PayoutTable() {
  const mineOptions = Object.keys(PAYOUT_TABLE).map(Number)

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>📊</span> Payout Multipliers
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3 text-slate-400">Gems</th>
              {mineOptions.map(mines => (
                <th key={mines} className="text-center py-2 px-3 text-slate-400">
                  {mines} 💣
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }, (_, i) => i + 1).map(gems => (
              <tr key={gems} className="border-b border-slate-700/50">
                <td className="py-2 px-3 text-green-400 font-semibold">
                  {gems} 💎
                </td>
                {mineOptions.map(mines => {
                  const payouts = PAYOUT_TABLE[mines]
                  const value = payouts && payouts[gems - 1]
                  return (
                    <td key={mines} className="text-center py-2 px-3">
                      {value ? (
                        <span className={clsx(
                          value >= 10 ? 'text-purple-400' :
                          value >= 5 ? 'text-blue-400' :
                          value >= 2 ? 'text-emerald-400' : 'text-slate-300'
                        )}>
                          {value.toFixed(2)}x
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-500 text-center">
        Multipliers based on {GAME_CONFIG.rtp}% RTP. More mines = higher multipliers but lower probability.
      </p>
    </div>
  )
}

function HomePage({ summary, recentGames, loading, refetch }) {
  const [activeTab, setActiveTab] = useState('simulator')
  const [selectedMines, setSelectedMines] = useState(5)

  return (
    <>
      {/* Tabs */}
      <div className="border-b border-slate-700/30 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 text-green-400 border border-green-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
                )}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}

            <div className="w-px h-6 bg-slate-700/50 mx-2"></div>

            {/* Mine Count Selector */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 text-sm">
              <span className="text-slate-400">Mines:</span>
              <select
                value={selectedMines}
                onChange={(e) => setSelectedMines(parseInt(e.target.value))}
                className="bg-transparent text-red-400 font-semibold focus:outline-none cursor-pointer"
              >
                {Array.from({ length: GAME_CONFIG.maxMines }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n} className="bg-slate-800">{n}</option>
                ))}
              </select>
            </div>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="sr-only">Mines Game Statistics - Probability Calculator & Simulator</h1>

        {/* About Game Section */}
        <section className="mb-6">
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>💎</span>
              What is Mines?
            </h2>
            <div className="space-y-4 text-sm text-slate-300">
              <p>Mines is Spribe's strategic instant win game that brings the classic Minesweeper concept to the casino floor. Released in 2019 alongside Aviator, Mines offers players direct control over their risk level through a 5x5 grid where hidden gems and mines await discovery. Each revealed gem increases your multiplier; hit a mine and lose everything.</p>
              <p>What makes Mines unique among instant win games is the granular risk control. Players choose how many mines to place (1-24), dramatically affecting the odds and potential rewards. One mine means high probability but low multipliers; twenty-four mines means near-impossible odds but astronomical payouts if you find that single gem. This flexibility appeals to both cautious and aggressive players.</p>
              <p>The mathematics are transparent: with 5 mines, revealing 5 gems has roughly a 25% success chance for a 2.8x multiplier. The 97% RTP applies across all configurations, though variance increases significantly with more mines. The probability calculator above helps you understand exact odds for any combination of mines and gems revealed.</p>
              <p>Unlike crash games where timing matters, Mines is purely about risk assessment. However, each tile is randomly assigned at round start - no pattern recognition can identify safe tiles. The grid visualizer demonstrates mechanics but uses simulated outcomes. Real gameplay uses provably fair cryptographic systems. Play mindfully within your budget.</p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700/50 flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-slate-700/50 rounded-full text-xs text-slate-400">RTP: 97%</span>
              <span className="px-3 py-1 bg-slate-700/50 rounded-full text-xs text-slate-400">Provider: Spribe</span>
              <span className="px-3 py-1 bg-slate-700/50 rounded-full text-xs text-slate-400">Max: 5,000x</span>
            </div>
          </div>
        </section>

        {/* Stats Row */}
        <section className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <StatsCard
              title="Grid Size"
              value={`${GAME_CONFIG.gridSize} (5x5)`}
              icon="📐"
            />
            <StatsCard
              title="RTP"
              value={`${GAME_CONFIG.rtp}%`}
              icon="📊"
              color="green"
            />
            <StatsCard
              title="House Edge"
              value={`${GAME_CONFIG.houseEdge}%`}
              icon="🏠"
              color="yellow"
            />
            <StatsCard
              title="Mine Range"
              value={`${GAME_CONFIG.minMines}-${GAME_CONFIG.maxMines}`}
              icon="💣"
              color="red"
            />
            <StatsCard
              title="Max Multiplier"
              value={`${formatNumber(GAME_CONFIG.maxMultiplier)}x`}
              icon="🚀"
              color="purple"
            />
          </div>
        </section>

        {activeTab === 'simulator' && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Mines Grid Simulator */}
            <div className="lg:col-span-2">
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <span>💎</span> Mines Simulator
                  </h2>
                  <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">
                    Interactive Demo
                  </span>
                </div>

                <MinesGrid mineCount={selectedMines} interactive={true} />

                <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
                  <p className="text-xs text-slate-400 text-center">
                    Click tiles to reveal gems. Avoid the mines! This is a simulation - no real money involved.
                  </p>
                </div>
              </div>
            </div>

            {/* Calculator */}
            <div className="space-y-6">
              <PayoutCalculator />

              {/* Game Info */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span>ℹ️</span> About Mines
                </h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Choose 1-24 mines to customize difficulty</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span>More mines = higher risk but bigger rewards</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Cash out anytime to secure your multiplier</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Provably fair algorithm ensures transparency</span>
                  </li>
                </ul>

                <a
                  href={GAME_CONFIG.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold transition-all"
                >
                  <span>💎</span>
                  <span>Play Official Demo</span>
                </a>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'calculator' && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PayoutCalculator />

            <div className="card">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>📈</span> Understanding Probability
              </h3>

              <div className="space-y-4 text-sm text-slate-300">
                <p>
                  In Mines, each tile you reveal affects the probability of the next one being safe.
                  The formula for probability at each step is:
                </p>

                <div className="p-3 bg-slate-900/50 rounded-lg font-mono text-center text-green-400">
                  P = (Remaining Gems) / (Remaining Tiles)
                </div>

                <p>
                  For example, with 5 mines (20 gems) on a 5x5 grid:
                </p>

                <ul className="space-y-2">
                  <li className="flex justify-between">
                    <span>First tile:</span>
                    <span className="text-green-400">20/25 = 80%</span>
                  </li>
                  <li className="flex justify-between">
                    <span>After 1 gem:</span>
                    <span className="text-green-400">19/24 = 79.2%</span>
                  </li>
                  <li className="flex justify-between">
                    <span>After 5 gems:</span>
                    <span className="text-yellow-400">15/20 = 75%</span>
                  </li>
                  <li className="flex justify-between">
                    <span>After 10 gems:</span>
                    <span className="text-orange-400">10/15 = 66.7%</span>
                  </li>
                </ul>

                <p className="text-slate-400 text-xs mt-4">
                  The multiplier is calculated as (1/probability) minus the house edge of {GAME_CONFIG.houseEdge}%.
                </p>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'payouts' && (
          <section>
            <PayoutTable />
          </section>
        )}

        {/* Responsible Gambling Notice */}
        <section className="mt-8">
          <div className="card bg-yellow-500/5 border-yellow-500/20">
            <div className="flex items-start gap-4">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-yellow-400 mb-2">Responsible Gambling</h3>
                <p className="text-sm text-slate-400">
                  Mines is a game of chance. Past results do not predict future outcomes.
                  Always gamble responsibly and never bet more than you can afford to lose.
                  If you need help, visit <Link to="/responsible-gambling/" className="text-yellow-400 hover:underline">our resources page</Link>.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}

export default HomePage
