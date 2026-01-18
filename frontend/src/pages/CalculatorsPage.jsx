import React, { useState } from 'react';
import GAME_CONFIG from '../config/gameConfig';

/**
 * Calculators Page for Mines
 * Interactive probability, RTP, and expected value calculators
 */

// ==================== PROBABILITY CALCULATOR ====================
function ProbabilityCalculator({ gameType, maxMultiplier, rtp }) {
  const [targetMultiplier, setTargetMultiplier] = useState(2.0);

  // Calculate probability based on game type
  const calculateProbability = () => {
    if (gameType === 'crash') {
      // Crash game: P(reaching x) = (RTP/100) / x
      return Math.min(((rtp / 100) / targetMultiplier) * 100, 100);
    } else if (gameType === 'grid') {
      // Grid game: depends on tiles revealed
      const baseProbability = (rtp / 100) / targetMultiplier;
      return Math.min(baseProbability * 100, 100);
    } else if (gameType === 'plinko') {
      // Plinko: normal distribution approximation
      const centerProb = (rtp / 100) * 0.5;
      return Math.min(centerProb * 100 / Math.log2(targetMultiplier + 1), 100);
    }
    return 0;
  };

  const probability = calculateProbability();

  // Quick select multipliers
  const quickMultipliers = gameType === 'plinko'
    ? [2, 5, 10, 50, 100]
    : [1.5, 2, 3, 5, 10, 20, 50, 100];

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">&#127922;</span>
        Probability Calculator
      </h3>

      <div className="mb-4">
        <label className="block text-gray-400 text-sm mb-2">Target Multiplier</label>
        <input
          type="range"
          min="1.1"
          max={Math.min(maxMultiplier, 1000)}
          step="0.1"
          value={targetMultiplier}
          onChange={(e) => setTargetMultiplier(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between mt-2">
          <span className="text-gray-500 text-sm">1.1x</span>
          <span className="text-xl font-bold text-white">{targetMultiplier.toFixed(2)}x</span>
          <span className="text-gray-500 text-sm">{Math.min(maxMultiplier, 1000)}x</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {quickMultipliers.map(mult => (
          <button
            key={mult}
            onClick={() => setTargetMultiplier(mult)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              Math.abs(targetMultiplier - mult) < 0.1
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {mult}x
          </button>
        ))}
      </div>

      <div className="bg-gray-900 rounded-lg p-4">
        <div className="text-center">
          <div className="text-gray-400 mb-2">Probability of reaching {targetMultiplier.toFixed(2)}x</div>
          <div className={`text-4xl font-bold ${
            probability > 50 ? 'text-green-400' :
            probability > 25 ? 'text-yellow-400' :
            probability > 10 ? 'text-orange-400' : 'text-red-400'
          }`}>
            {probability.toFixed(2)}%
          </div>
          <div className="text-gray-500 text-sm mt-2">
            Approximately 1 in {Math.round(100 / probability)} rounds
          </div>
        </div>

        <div className="mt-4 h-4 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              probability > 50 ? 'bg-green-500' :
              probability > 25 ? 'bg-yellow-500' :
              probability > 10 ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${probability}%` }}
          />
        </div>
      </div>

      <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
        <p className="text-yellow-400 text-sm">
          <strong>Note:</strong> These are theoretical probabilities based on {rtp}% RTP.
          Actual results vary due to randomness.
        </p>
      </div>
    </div>
  );
}

// ==================== RTP EXPLAINER ====================
function RTPExplainer({ rtp, gameName, rank }) {
  const [showDetails, setShowDetails] = useState(false);
  const houseEdge = 100 - rtp;

  const getRTPRating = () => {
    if (rtp >= 99) return { label: 'Excellent', color: 'text-green-400', bg: 'bg-green-900/30' };
    if (rtp >= 97) return { label: 'Very Good', color: 'text-green-400', bg: 'bg-green-900/30' };
    if (rtp >= 96) return { label: 'Good', color: 'text-yellow-400', bg: 'bg-yellow-900/30' };
    if (rtp >= 95) return { label: 'Below Average', color: 'text-orange-400', bg: 'bg-orange-900/30' };
    return { label: 'Poor', color: 'text-red-400', bg: 'bg-red-900/30' };
  };

  const rating = getRTPRating();
  const exampleBet = 100;
  const theoreticalReturn = exampleBet * (rtp / 100);
  const theoreticalLoss = exampleBet - theoreticalReturn;

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">&#128202;</span>
        RTP Explained
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <div className="text-gray-400 text-sm mb-1">Return to Player</div>
          <div className={`text-4xl font-bold ${rating.color}`}>{rtp}%</div>
          <div className={`text-xs mt-1 px-2 py-1 rounded inline-block ${rating.bg} ${rating.color}`}>
            {rating.label}
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <div className="text-gray-400 text-sm mb-1">House Edge</div>
          <div className="text-4xl font-bold text-red-400">{houseEdge.toFixed(2)}%</div>
          <div className="text-xs text-gray-500 mt-1">Casino's Advantage</div>
        </div>
      </div>

      <div className={`p-3 rounded-lg mb-4 ${rating.bg} border border-gray-700`}>
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Ranking Among 19 Games:</span>
          <span className={`font-bold ${rating.color}`}>
            #{rank} {rank === 1 ? 'Best!' : rank <= 3 ? 'Top 3' : ''}
          </span>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 mb-4">
        <div className="text-gray-400 text-sm mb-2">Example Calculation</div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">If you bet:</span>
            <span className="text-white font-bold">${exampleBet}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Theoretical return:</span>
            <span className="text-green-400 font-bold">${theoreticalReturn.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Expected loss:</span>
            <span className="text-red-400 font-bold">-${theoreticalLoss.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        {showDetails ? 'Hide Details' : 'Show More Details'}
      </button>

      {showDetails && (
        <div className="mt-4 space-y-4 text-sm">
          <div className="p-3 bg-gray-900 rounded-lg">
            <h4 className="font-bold text-white mb-2">What is RTP?</h4>
            <p className="text-gray-400">
              RTP (Return to Player) is the theoretical percentage of all wagered money
              that a game will pay back to players over time. An RTP of {rtp}% means that
              for every $100 wagered, {gameName} is expected to return ${theoreticalReturn.toFixed(0)} on average.
            </p>
          </div>

          <div className="p-3 bg-red-900/30 border border-red-600/50 rounded-lg">
            <h4 className="font-bold text-red-400 mb-2">Reality Check</h4>
            <p className="text-gray-400">
              Even with a {rtp}% RTP, the casino keeps {houseEdge}% of all money wagered.
              Over time, the house always wins.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== HOUSE EDGE VISUAL ====================
function HouseEdgeVisual({ rtp, gameName }) {
  const [simulatedBets, setSimulatedBets] = useState(0);
  const [totalWagered, setTotalWagered] = useState(0);
  const [totalReturned, setTotalReturned] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);

  const houseEdge = 100 - rtp;
  const houseProfit = totalWagered - totalReturned;

  React.useEffect(() => {
    let interval;
    if (isSimulating && simulatedBets < 10000) {
      interval = setInterval(() => {
        setSimulatedBets(prev => {
          const newBets = Math.min(prev + 100, 10000);
          const wagered = 100;
          const variance = (Math.random() - 0.5) * 0.1;
          const actualRTP = (rtp / 100) + variance;
          const returned = wagered * actualRTP;
          setTotalWagered(p => p + wagered);
          setTotalReturned(p => p + returned);
          return newBets;
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isSimulating, simulatedBets, rtp]);

  const resetSimulation = () => {
    setSimulatedBets(0);
    setTotalWagered(0);
    setTotalReturned(0);
    setIsSimulating(false);
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">&#127974;</span>
        House Edge Simulator
      </h3>

      <div className="flex justify-center mb-6">
        <div className="relative w-48 h-48">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="96" cy="96" r="80" fill="none" stroke="#374151" strokeWidth="24" />
            <circle cx="96" cy="96" r="80" fill="none" stroke="#10B981" strokeWidth="24"
              strokeDasharray={`${rtp * 5.03} ${(100 - rtp) * 5.03}`} />
            <circle cx="96" cy="96" r="80" fill="none" stroke="#EF4444" strokeWidth="24"
              strokeDasharray={`${houseEdge * 5.03} ${rtp * 5.03}`}
              strokeDashoffset={`${-rtp * 5.03}`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-sm text-gray-400">House Edge</div>
            <div className="text-3xl font-bold text-red-400">{houseEdge}%</div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-6 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-gray-300">Players: {rtp}%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-gray-300">House: {houseEdge}%</span>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-400">Simulated Bets:</span>
          <span className="text-white font-bold">{simulatedBets.toLocaleString()} / 10,000</span>
        </div>

        <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-blue-500 transition-all" style={{ width: `${(simulatedBets / 10000) * 100}%` }} />
        </div>

        {simulatedBets > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4 text-center">
            <div className="bg-gray-800 rounded-lg p-2">
              <div className="text-xs text-gray-400">Wagered</div>
              <div className="text-lg font-bold text-white">${totalWagered.toFixed(0)}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-2">
              <div className="text-xs text-gray-400">Returned</div>
              <div className="text-lg font-bold text-green-400">${totalReturned.toFixed(0)}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-2">
              <div className="text-xs text-gray-400">House Profit</div>
              <div className="text-lg font-bold text-red-400">${houseProfit.toFixed(0)}</div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            disabled={simulatedBets >= 10000}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              isSimulating ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'
            } text-white ${simulatedBets >= 10000 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSimulating ? 'Pause' : simulatedBets >= 10000 ? 'Complete' : 'Start Simulation'}
          </button>
          <button
            onClick={resetSimulation}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="p-3 bg-red-900/30 border border-red-600/50 rounded-lg">
        <p className="text-red-400 text-sm">
          <strong>Reality:</strong> The house ALWAYS wins in the long run.
          There is no strategy to overcome the {houseEdge}% edge.
        </p>
      </div>
    </div>
  );
}

// ==================== EXPECTED VALUE CALCULATOR ====================
function ExpectedValueCalculator({ rtp }) {
  const [betAmount, setBetAmount] = useState(10);
  const [targetMultiplier, setTargetMultiplier] = useState(2.0);
  const [numberOfBets, setNumberOfBets] = useState(100);

  const winProbability = (rtp / 100) / targetMultiplier;
  const loseProbability = 1 - winProbability;
  const winAmount = betAmount * targetMultiplier - betAmount;
  const loseAmount = betAmount;
  const evPerBet = (winProbability * winAmount) - (loseProbability * loseAmount);
  const totalWagered = betAmount * numberOfBets;
  const expectedReturn = totalWagered * (rtp / 100);
  const expectedProfit = expectedReturn - totalWagered;
  const expectedWins = Math.round(numberOfBets * winProbability);

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">&#128176;</span>
        Expected Value Calculator
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-gray-400 text-sm mb-2">Bet Amount ($)</label>
          <input
            type="number"
            min="1"
            max="1000"
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(1, parseFloat(e.target.value) || 1))}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-2">Target Multiplier</label>
          <select
            value={targetMultiplier}
            onChange={(e) => setTargetMultiplier(parseFloat(e.target.value))}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
            <option value="3">3x</option>
            <option value="5">5x</option>
            <option value="10">10x</option>
            <option value="20">20x</option>
            <option value="50">50x</option>
            <option value="100">100x</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-2">Number of Bets</label>
          <select
            value={numberOfBets}
            onChange={(e) => setNumberOfBets(parseInt(e.target.value))}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="10">10 bets</option>
            <option value="50">50 bets</option>
            <option value="100">100 bets</option>
            <option value="500">500 bets</option>
            <option value="1000">1,000 bets</option>
          </select>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 mb-4">
        <h4 className="text-white font-medium mb-3">Single Bet Analysis</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Win Probability:</span>
              <span className={`font-bold ${winProbability * 100 > 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                {(winProbability * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">If you win:</span>
              <span className="text-green-400 font-bold">+${winAmount.toFixed(2)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Lose Probability:</span>
              <span className="text-red-400 font-bold">{(loseProbability * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">If you lose:</span>
              <span className="text-red-400 font-bold">-${loseAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Expected Value per Bet:</span>
            <span className={`text-xl font-bold ${evPerBet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {evPerBet >= 0 ? '+' : ''}${evPerBet.toFixed(4)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 mb-4">
        <h4 className="text-white font-medium mb-3">Over {numberOfBets} Bets</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400">Total Wagered</div>
            <div className="text-lg font-bold text-white">${totalWagered.toFixed(0)}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400">Expected Return</div>
            <div className="text-lg font-bold text-blue-400">${expectedReturn.toFixed(2)}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400">Expected Profit</div>
            <div className={`text-lg font-bold ${expectedProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {expectedProfit >= 0 ? '+' : ''}${expectedProfit.toFixed(2)}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400">Expected Wins</div>
            <div className="text-lg font-bold text-yellow-400">{expectedWins} / {numberOfBets}</div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
        <p className="text-yellow-400 text-sm">
          <strong>Important:</strong> Negative EV means the house has an advantage.
          No betting strategy can overcome this mathematical edge.
        </p>
      </div>
    </div>
  );
}

// ==================== MAIN CALCULATOR PAGE ====================
export default function CalculatorsPage() {
  const [activeTab, setActiveTab] = useState('probability');

  const gameType = 'grid';
  const rtp = 97;
  const maxMultiplier = 1000;
  const rtpRank = 2;
  const gameName = GAME_CONFIG.name || 'Mines';

  const tabs = [
    { id: 'probability', label: 'Probability', icon: '&#127922;' },
    { id: 'rtp', label: 'RTP Guide', icon: '&#128202;' },
    { id: 'houseedge', label: 'House Edge', icon: '&#127974;' },
    { id: 'ev', label: 'Expected Value', icon: '&#128176;' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {gameName} Calculators
          </h1>
          <p className="text-gray-400">
            Interactive tools to understand probabilities, RTP, and expected value
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span dangerouslySetInnerHTML={{ __html: tab.icon }} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {activeTab === 'probability' && (
            <ProbabilityCalculator
              gameType={gameType}
              maxMultiplier={maxMultiplier}
              rtp={rtp}
            />
          )}
          {activeTab === 'rtp' && (
            <RTPExplainer
              rtp={rtp}
              gameName={gameName}
              rank={rtpRank}
            />
          )}
          {activeTab === 'houseedge' && (
            <HouseEdgeVisual
              rtp={rtp}
              gameName={gameName}
            />
          )}
          {activeTab === 'ev' && (
            <ExpectedValueCalculator
              rtp={rtp}
            />
          )}
        </div>

        <div className="mt-8 p-4 bg-gray-800 rounded-xl border border-gray-700">
          <h3 className="text-white font-bold mb-2">About These Calculators</h3>
          <p className="text-gray-400 text-sm">
            These calculators provide theoretical probabilities based on {gameName}'s {rtp}% RTP.
            Actual results will vary due to the random nature of gambling. These tools are for
            educational purposes only and should not be used as gambling advice.
          </p>
        </div>
      </div>
    </div>
  );
}
