import React from 'react';
import { GridGameStatsPage } from '../components/GameStats';
import gameConfig from '../config/gameConfig';

/**
 * Statistics Page for Mines Tracker
 * Uses game-specific statistics component
 */
export default function StatsPage() {
  return (
    <GridGameStatsPage
      gameId={gameConfig.gameId}
      apiBaseUrl={gameConfig.apiBaseUrl}
    />
  );
}
