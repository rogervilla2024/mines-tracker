# CLAUDE.md - Mines Tracker AI Instructions

## Quick Reference
- **Game**: Mines by Spribe
- **Domain**: minestracker.com
- **RTP**: 97.0% | House Edge: 3.0%
- **Max Multiplier**: 5,000x (depends on mine count)
- **Year**: 2026 - all dates must use 2026

## Project Status: SETUP PHASE
- [ ] Frontend structure
- [ ] Backend API
- [ ] Data collector
- [ ] SEO articles
- [ ] Deploy

## Game-Specific Information

### About Mines
- **Provider**: Spribe (spribe.co)
- **Release Year**: 2019
- **Type**: Instant win / Minesweeper style
- **Grid**: 5x5 = 25 tiles

### Key Mechanics
- Choose number of mines (1-24)
- Reveal tiles to find gems
- Each gem increases multiplier
- Hit a mine = lose bet
- Cash out anytime
- More mines = higher risk = higher multipliers

### Multiplier Calculation
```
Example with 3 mines:
- 1 gem: 1.09x
- 5 gems: 1.62x
- 10 gems: 4.10x
- 15 gems: 16.43x
- 20 gems: 219.17x
- 22 gems (max): 2194.17x
```

## Content Guidelines
1. **Independence**: NOT affiliated with Spribe
2. **No Gambling Encouragement**: Educational only
3. **Provably Fair**: Explain seed verification
4. **Strategy**: Risk management, not winning secrets

## Theme Colors
- Primary: #27ae60 (Green - gems)
- Secondary: #2ecc71 (Light Green)
- Accent: #f1c40f (Gold)
- Danger: #e74c3c (Red - mines)

## SEO Article Topics
1. What is Mines Game - Complete Guide
2. How to Play Mines - Tutorial
3. Mines RTP & Probability Tables
4. Mines vs Other Instant Games
5. Mines Strategies - Risk Levels
6. Mines Provably Fair Verification
7. Best Mines Casinos 2026
8. Mines Calculator - Odds & Payouts

## File Structure
```
mines-tracker/
├── CLAUDE.md
├── frontend/
│   ├── src/config/gameConfig.js
│   └── ...
├── backend/
└── content/articles/
```

## Unique Components Needed
- Grid visualizer (5x5)
- Mine count selector
- Probability calculator
- Payout table by gems revealed

## Remember
- Mines™ is trademark of Spribe
- Different from crash games (instant win type)
- Player controls risk level via mine count
- Each round is independent
