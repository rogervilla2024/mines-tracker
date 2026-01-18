import React, { useState, useMemo, useCallback } from 'react';

/**
 * Interactive Minefield - Mines Game Simulator
 * Visual grid-based probability calculator and simulator
 */
export function InteractiveMinefield({ rtp = 97 }) {
  const [gridSize] = useState({ rows: 5, cols: 5 });
  const [mineCount, setMineCount] = useState(3);
  const [revealedTiles, setRevealedTiles] = useState(new Set());
  const [mines, setMines] = useState(new Set());
  const [gameState, setGameState] = useState('idle'); // idle, playing, won, lost
  const [betAmount, setBetAmount] = useState(10);
  const [stats, setStats] = useState({ games: 0, wins: 0, profit: 0 });

  const totalTiles = gridSize.rows * gridSize.cols;
  const safeTiles = totalTiles - mineCount;

  // Calculate current multiplier and probabilities
  const calculations = useMemo(() => {
    const revealed = revealedTiles.size;
    const remainingSafe = safeTiles - revealed;
    const remainingTotal = totalTiles - revealed;

    // Next tile safe probability
    const nextSafeProb = remainingTotal > 0 ? (remainingSafe / remainingTotal) * 100 : 0;

    // Current multiplier based on RTP
    let multiplier = 1;
    for (let i = 0; i < revealed; i++) {
      const safeLeft = safeTiles - i;
      const totalLeft = totalTiles - i;
      multiplier *= (totalLeft / safeLeft);
    }
    multiplier *= (rtp / 100);

    // If one more tile revealed
    let nextMultiplier = multiplier;
    if (remainingSafe > 0) {
      nextMultiplier *= (remainingTotal / remainingSafe) * (rtp / 100);
    }

    // Survival for next N tiles
    const survivalChances = [];
    let cumProb = 1;
    let cumMult = multiplier;
    for (let i = 0; i < Math.min(5, remainingSafe); i++) {
      const safeLeft = remainingSafe - i;
      const totalLeft = remainingTotal - i;
      cumProb *= safeLeft / totalLeft;
      cumMult *= (totalLeft / safeLeft) * (rtp / 100);
      survivalChances.push({
        tiles: i + 1,
        probability: cumProb * 100,
        multiplier: cumMult
      });
    }

    return {
      nextSafeProb,
      currentMultiplier: multiplier,
      nextMultiplier,
      potentialWin: (multiplier - 1) * betAmount,
      nextPotentialWin: (nextMultiplier - 1) * betAmount,
      survivalChances,
      revealed,
      remainingSafe,
      remainingTotal
    };
  }, [revealedTiles, mineCount, totalTiles, safeTiles, rtp, betAmount]);

  // Start new game
  const startGame = useCallback(() => {
    // Place mines randomly
    const newMines = new Set();
    while (newMines.size < mineCount) {
      newMines.add(Math.floor(Math.random() * totalTiles));
    }
    setMines(newMines);
    setRevealedTiles(new Set());
    setGameState('playing');
  }, [mineCount, totalTiles]);

  // Reveal a tile
  const revealTile = useCallback((index) => {
    if (gameState !== 'playing' || revealedTiles.has(index)) return;

    if (mines.has(index)) {
      // Hit a mine!
      setGameState('lost');
      setStats(prev => ({
        games: prev.games + 1,
        wins: prev.wins,
        profit: prev.profit - betAmount
      }));
    } else {
      // Safe!
      const newRevealed = new Set(revealedTiles);
      newRevealed.add(index);
      setRevealedTiles(newRevealed);

      // Check if won (all safe tiles revealed)
      if (newRevealed.size === safeTiles) {
        setGameState('won');
        const winAmount = calculations.currentMultiplier * betAmount - betAmount;
        setStats(prev => ({
          games: prev.games + 1,
          wins: prev.wins + 1,
          profit: prev.profit + winAmount
        }));
      }
    }
  }, [gameState, revealedTiles, mines, safeTiles, betAmount, calculations.currentMultiplier]);

  // Cash out
  const cashOut = useCallback(() => {
    if (gameState !== 'playing' || revealedTiles.size === 0) return;

    const winAmount = calculations.potentialWin;
    setGameState('won');
    setStats(prev => ({
      games: prev.games + 1,
      wins: prev.wins + 1,
      profit: prev.profit + winAmount
    }));
  }, [gameState, revealedTiles, calculations.potentialWin]);

  // Reset
  const reset = useCallback(() => {
    setRevealedTiles(new Set());
    setMines(new Set());
    setGameState('idle');
  }, []);

  // Get tile state
  const getTileState = (index) => {
    if (gameState === 'lost' || gameState === 'won') {
      if (mines.has(index)) return 'mine';
      if (revealedTiles.has(index)) return 'safe';
      return 'hidden-safe';
    }
    if (revealedTiles.has(index)) return 'safe';
    return 'hidden';
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">💎</span>
        Interactive Minefield
        <span className="text-xs bg-emerald-600 text-white px-2 py-1 rounded ml-2">MINES EXCLUSIVE</span>
      </h3>

      {/* Settings */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Mines</label>
          <select
            value={mineCount}
            onChange={(e) => setMineCount(parseInt(e.target.value))}
            disabled={gameState === 'playing'}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
          >
            {[1, 2, 3, 5, 10, 15, 20, 24].map(n => (
              <option key={n} value={n}>{n} mines</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Bet ($)</label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(parseFloat(e.target.value) || 1)}
            disabled={gameState === 'playing'}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Safe Tiles</label>
          <div className="bg-gray-900 rounded px-3 py-2 text-green-400 font-bold">
            {safeTiles} / {totalTiles}
          </div>
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Revealed</label>
          <div className="bg-gray-900 rounded px-3 py-2 text-blue-400 font-bold">
            {revealedTiles.size} tiles
          </div>
        </div>
      </div>

      {/* Game Grid */}
      <div className="flex justify-center mb-6">
        <div className="grid gap-2 p-4 bg-gray-900 rounded-lg" style={{
          gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)`,
          width: 'fit-content'
        }}>
          {Array.from({ length: totalTiles }).map((_, idx) => {
            const state = getTileState(idx);
            return (
              <button
                key={idx}
                onClick={() => revealTile(idx)}
                disabled={gameState !== 'playing' || revealedTiles.has(idx)}
                className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold transition-all ${
                  state === 'mine' ? 'bg-red-600 text-white' :
                  state === 'safe' ? 'bg-green-600 text-white' :
                  state === 'hidden-safe' ? 'bg-green-900/50 text-green-400' :
                  'bg-gray-700 hover:bg-gray-600 text-gray-400'
                }`}
              >
                {state === 'mine' ? '💣' :
                 state === 'safe' ? '💎' :
                 state === 'hidden-safe' ? '✓' :
                 '?'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Stats */}
      <div className={`p-4 rounded-lg mb-4 ${
        gameState === 'lost' ? 'bg-red-900/30 border border-red-600' :
        gameState === 'won' ? 'bg-green-900/30 border border-green-600' :
        'bg-gray-900'
      }`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-xs text-gray-400">Current Multiplier</div>
            <div className="text-2xl font-bold text-yellow-400">
              {calculations.currentMultiplier.toFixed(2)}x
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Potential Win</div>
            <div className="text-2xl font-bold text-green-400">
              ${calculations.potentialWin.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Next Tile Safe</div>
            <div className={`text-2xl font-bold ${
              calculations.nextSafeProb > 50 ? 'text-green-400' : 'text-red-400'
            }`}>
              {calculations.nextSafeProb.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Next Multiplier</div>
            <div className="text-2xl font-bold text-purple-400">
              {calculations.nextMultiplier.toFixed(2)}x
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        {gameState === 'idle' && (
          <button
            onClick={startGame}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
          >
            START GAME (${betAmount})
          </button>
        )}
        {gameState === 'playing' && (
          <>
            <button
              onClick={cashOut}
              disabled={revealedTiles.size === 0}
              className="flex-1 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white rounded-lg font-bold"
            >
              CASH OUT ${calculations.potentialWin.toFixed(2)}
            </button>
            <button
              onClick={reset}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium"
            >
              Reset
            </button>
          </>
        )}
        {(gameState === 'won' || gameState === 'lost') && (
          <button
            onClick={reset}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
          >
            PLAY AGAIN
          </button>
        )}
      </div>

      {/* Survival Chances */}
      {gameState === 'playing' && calculations.survivalChances.length > 0 && (
        <div className="bg-gray-900 rounded-lg p-4 mb-4">
          <h4 className="text-white font-medium mb-2">Survival Forecast</h4>
          <div className="space-y-2">
            {calculations.survivalChances.map((chance, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-gray-400 w-16">+{chance.tiles} tile{chance.tiles > 1 ? 's' : ''}</span>
                <div className="flex-1 h-4 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      chance.probability > 50 ? 'bg-green-500' :
                      chance.probability > 25 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${chance.probability}%` }}
                  />
                </div>
                <span className="text-gray-400 w-16 text-right">{chance.probability.toFixed(1)}%</span>
                <span className="text-yellow-400 w-16 text-right">{chance.multiplier.toFixed(2)}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Stats */}
      <div className="bg-gray-900 rounded-lg p-4 mb-4">
        <h4 className="text-white font-medium mb-2">Session Stats</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-gray-400">Games</div>
            <div className="text-lg font-bold text-white">{stats.games}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Win Rate</div>
            <div className={`text-lg font-bold ${stats.wins / Math.max(stats.games, 1) >= 0.5 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.games > 0 ? ((stats.wins / stats.games) * 100).toFixed(1) : 0}%
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Profit</div>
            <div className={`text-lg font-bold ${stats.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.profit >= 0 ? '+' : ''}${stats.profit.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Mine Probability Table */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h4 className="text-white font-medium mb-2">Mines Reference ({mineCount} mines)</h4>
        <div className="grid grid-cols-5 gap-2 text-xs text-center">
          <div className="text-gray-400">Tiles</div>
          <div className="text-gray-400">Safe %</div>
          <div className="text-gray-400">Multiplier</div>
          <div className="text-gray-400">If Win</div>
          <div className="text-gray-400">Risk</div>
          {[1, 3, 5, 10, safeTiles].filter((n, i, arr) => n <= safeTiles && arr.indexOf(n) === i).map(tiles => {
            let prob = 1;
            for (let i = 0; i < tiles; i++) {
              prob *= (safeTiles - i) / (totalTiles - i);
            }
            let mult = 1;
            for (let i = 0; i < tiles; i++) {
              mult *= (totalTiles - i) / (safeTiles - i);
            }
            mult *= Math.pow(rtp / 100, tiles);

            return (
              <React.Fragment key={tiles}>
                <div className="text-white">{tiles}</div>
                <div className={prob > 0.5 ? 'text-green-400' : 'text-red-400'}>{(prob * 100).toFixed(1)}%</div>
                <div className="text-yellow-400">{mult.toFixed(2)}x</div>
                <div className="text-green-400">${((mult - 1) * betAmount).toFixed(2)}</div>
                <div className={prob > 0.5 ? 'text-green-400' : prob > 0.25 ? 'text-yellow-400' : 'text-red-400'}>
                  {prob > 0.5 ? 'Low' : prob > 0.25 ? 'Med' : 'High'}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default InteractiveMinefield;
