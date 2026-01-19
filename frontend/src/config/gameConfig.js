/**
 * Mines Tracker - Game Configuration
 * Provider: Spribe
 */

export const GAME_CONFIG = {
  id: 'mines',
  name: 'Mines',
  slug: 'mines',
  provider: 'Spribe',
  providerWebsite: 'https://spribe.co',

  // Game Math (varies by mine count)
  rtp: 97.0,
  houseEdge: 3.0,
  maxMultiplier: 5000, // With max mines
  minBet: 0.10,
  maxBet: 100,
  gridSize: 25, // 5x5
  minMines: 1,
  maxMines: 24,

  // Branding
  domain: 'minesstats.com',
  trademark: 'Mines™ is a trademark of Spribe.',
  description: 'Minesweeper-style game where you reveal gems and avoid mines.',

  // Theme
  theme: {
    primary: '#27ae60',
    secondary: '#2ecc71',
    accent: '#f1c40f',
    danger: '#e74c3c',
    gradient: 'from-green-600 to-emerald-500',
    darkBg: '#0f1419',
    cardBg: '#1a2332',
  },

  // URLs
  demoUrl: 'https://spribe.co/games/mines',
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  gameId: 'mines',

  // Features
  features: [
    'provablyFair',
    'customMines',    // Choose mine count
    'autoCashout',
    'instantWin',
  ],

  // Contact
  emails: {
    contact: 'contact@minesstats.com',
    legal: 'legal@minesstats.com',
    privacy: 'privacy@minesstats.com',
  },

  // SEO
  seo: {
    title: 'Mines Stats - Statistics & Probability Calculator',
    description: 'Mines game statistics, probability tables, and payout calculator. Understand the math behind the gems.',
    keywords: ['mines game', 'mines spribe', 'mines statistics', 'mines calculator', 'mines rtp'],
  },
}

// Payout multipliers by mine count and gems revealed
// Format: mineCount -> [gem1, gem2, gem3, ...]
export const PAYOUT_TABLE = {
  1: [1.03, 1.07, 1.12, 1.18, 1.24, 1.30, 1.38, 1.46, 1.55, 1.65, 1.77, 1.90, 2.06, 2.25, 2.47, 2.75, 3.09, 3.54, 4.12, 4.95, 6.19, 8.25, 12.37, 24.75],
  3: [1.09, 1.19, 1.31, 1.45, 1.62, 1.81, 2.04, 2.32, 2.66, 3.09, 3.63, 4.33, 5.26, 6.53, 8.32, 10.98, 15.15, 22.09, 34.76, 60.83, 121.65, 291.96],
  5: [1.19, 1.41, 1.69, 2.04, 2.49, 3.07, 3.84, 4.87, 6.28, 8.26, 11.11, 15.37, 21.89, 32.35, 50.06, 82.02, 144.64, 280.72, 621.59, 1656.24],
  // Add more as needed
}

export const CHART_COLORS = [
  '#27ae60', '#2ecc71', '#58d68d', '#82e0aa',
  '#f1c40f', '#f4d03f', '#f7dc6f', '#fad7a0'
]

export default GAME_CONFIG
