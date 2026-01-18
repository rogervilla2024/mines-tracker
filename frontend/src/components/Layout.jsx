import { Link, useNavigate } from 'react-router-dom'
import { Footer } from '../../../../shared-core/components/footer/Footer'
import GAME_CONFIG from '../config/gameConfig'
import { SchemaMarkup } from '../../../../shared-core/components/SchemaMarkup'


// Game configuration for SEO
const GAME_SEO = {
  name: 'Mines',
  provider: 'Spribe',
  rtp: 97,
  domain: 'minestracker.com',
  maxMultiplier: '5,000x',
  description: 'Real-time Mines statistics tracker with live multiplier data, RTP analysis, and historical patterns.'
}

function Layout({ children, summary }) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-mines-darker">
      {/* Schema.org SEO Markup */}
      <SchemaMarkup game={GAME_SEO} />

      {/* Header */}
      <header className="border-b border-slate-700/50 bg-mines-dark/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div className="text-3xl">💎</div>
              <div>
                <span className="text-xl font-bold gradient-text block">Mines Tracker</span>
                <span className="text-xs text-slate-400">Statistics & probability calculator</span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link to="/what-is-mines/" className="text-slate-400 hover:text-green-400 transition-colors">What is Mines?</Link>
              <Link to="/mines-statistics/" className="text-slate-400 hover:text-green-400 transition-colors">Statistics</Link>
              <Link to="/mines-strategies/" className="text-slate-400 hover:text-green-400 transition-colors">Strategies</Link>
              <Link to="/mines-calculator/" className="text-slate-400 hover:text-green-400 transition-colors">Calculator</Link>
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {/* Demo Button */}
              <a
                href={GAME_CONFIG.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold text-sm transition-all"
              >
                <span>💎</span>
                <span>Play Demo</span>
              </a>

              {/* RTP Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-green-500/20 text-green-400">
                <span className="font-semibold">{GAME_CONFIG.rtp}% RTP</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {children}

      {/* Footer */}
      <Footer
        gameName="Mines"
        gameEmoji="💎"
        domain="minestracker.com"
        primaryColor="#27ae60"
        botUsername="MinesTrackerBot"
        rtp={97}
        provider="Spribe"
      />
    </div>
  )
}

export default Layout
