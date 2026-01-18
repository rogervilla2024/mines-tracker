"""
Crash Games Network - Grid Game Specific Statistics API

Provides specialized statistics for grid-type games:
- Mines - Find tiles without hitting mines
- Towers - Climb floors without hitting obstacles
- Chicken Road - Cross lanes without getting caught

Features:
- Tile/position analysis
- Risk level comparisons
- Heatmaps for mine/obstacle positions
- Optimal stop point analysis
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
import statistics
import math
import random

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field


# =============================================================================
# Models
# =============================================================================

class RiskLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    EXTREME = "extreme"


class TileAnalysis(BaseModel):
    """Tile/step analysis."""
    total_rounds: int
    avg_tiles_opened: float = Field(..., description="Average tiles before cashout/fail")
    avg_multiplier: float = Field(..., description="Average achieved multiplier")
    median_tiles: float
    max_tiles_opened: int

    # Cashout patterns
    early_cashout_rate: float = Field(..., description="Cashout at 1-3 tiles (%)")
    mid_cashout_rate: float = Field(..., description="Cashout at 4-7 tiles (%)")
    late_cashout_rate: float = Field(..., description="Cashout at 8+ tiles (%)")

    # Failure patterns
    first_tile_fail_rate: float = Field(..., description="Failed on first tile (%)")
    avg_tiles_before_fail: float


class PositionHeatmap(BaseModel):
    """Position-based analysis (for Mines)."""
    grid_size: int = Field(default=25, description="Grid size (5x5 = 25)")
    mine_count_analyzed: int

    # Position categories
    corner_mine_rate: float = Field(..., description="Mines in corners (%)")
    edge_mine_rate: float = Field(..., description="Mines on edges (%)")
    center_mine_rate: float = Field(..., description="Mines in center (%)")

    # Position data (0-24 for 5x5 grid)
    position_frequency: Dict[int, float] = Field(..., description="Mine frequency per position")

    # Safe zones (least frequent mine positions)
    safest_positions: List[int]
    riskiest_positions: List[int]


class RiskLevelStats(BaseModel):
    """Statistics for a specific risk level."""
    risk_level: str
    total_rounds: int
    avg_multiplier: float
    success_rate: float = Field(..., description="Rounds with any win (%)")
    big_win_rate: float = Field(..., description="5x+ multiplier (%)")
    avg_tiles_opened: float
    theoretical_rtp: float


class TowersFloorAnalysis(BaseModel):
    """Floor-by-floor analysis for Towers."""
    total_rounds: int
    max_floor_reached: int
    avg_floor_reached: float

    # Per-floor success rates
    floor_success_rates: Dict[int, float] = Field(..., description="Success rate per floor")

    # Choice analysis (left/middle/right)
    left_success_rate: float
    middle_success_rate: float
    right_success_rate: float

    # Optimal stopping points
    recommended_stop_floor: int
    expected_value_per_floor: Dict[int, float]


class ChickenRoadLaneAnalysis(BaseModel):
    """Lane analysis for Chicken Road."""
    total_rounds: int
    avg_distance: float = Field(..., description="Average lanes crossed")
    max_distance: int

    # Lane-by-lane stats
    lane_success_rates: Dict[int, float]

    # Danger zones
    most_dangerous_lane: int
    safest_lane: int

    # Patterns
    caught_early_rate: float = Field(..., description="Caught in first 3 lanes (%)")
    completed_rate: float = Field(..., description="Crossed all lanes (%)")


class GridGameStatistics(BaseModel):
    """Complete grid game statistics."""
    game: str
    game_type: str = Field(..., description="mines, towers, or chickenroad")
    period: str
    generated_at: datetime

    # Common stats
    tile_analysis: TileAnalysis
    risk_level_comparison: List[RiskLevelStats]

    # Game-specific (only one will be populated)
    position_heatmap: Optional[PositionHeatmap] = None  # Mines
    floor_analysis: Optional[TowersFloorAnalysis] = None  # Towers
    lane_analysis: Optional[ChickenRoadLaneAnalysis] = None  # Chicken Road


# =============================================================================
# Calculator
# =============================================================================

class GridGameCalculator:
    """Calculates grid game specific statistics."""

    def analyze_tiles(
        self,
        rounds: List[Dict],
    ) -> TileAnalysis:
        """Analyze tile/step data."""
        if not rounds:
            return TileAnalysis(
                total_rounds=0,
                avg_tiles_opened=0,
                avg_multiplier=0,
                median_tiles=0,
                max_tiles_opened=0,
                early_cashout_rate=0,
                mid_cashout_rate=0,
                late_cashout_rate=0,
                first_tile_fail_rate=0,
                avg_tiles_before_fail=0,
            )

        n = len(rounds)
        tiles = [r.get('tiles_opened', r.get('steps', 0)) for r in rounds]
        multipliers = [r.get('multiplier', 1.0) for r in rounds]
        is_win = [r.get('is_win', r.get('cashout', False)) for r in rounds]

        avg_tiles = statistics.mean(tiles) if tiles else 0
        avg_mult = statistics.mean(multipliers) if multipliers else 0
        med_tiles = statistics.median(tiles) if tiles else 0
        max_tiles = max(tiles) if tiles else 0

        # Cashout patterns (for wins only)
        wins = [t for t, w in zip(tiles, is_win) if w]
        early = sum(1 for t in wins if t <= 3) / len(wins) * 100 if wins else 0
        mid = sum(1 for t in wins if 4 <= t <= 7) / len(wins) * 100 if wins else 0
        late = sum(1 for t in wins if t >= 8) / len(wins) * 100 if wins else 0

        # Failure patterns
        fails = [t for t, w in zip(tiles, is_win) if not w]
        first_fail = sum(1 for t in fails if t == 1) / len(fails) * 100 if fails else 0
        avg_fail_tiles = statistics.mean(fails) if fails else 0

        return TileAnalysis(
            total_rounds=n,
            avg_tiles_opened=round(avg_tiles, 2),
            avg_multiplier=round(avg_mult, 4),
            median_tiles=round(med_tiles, 2),
            max_tiles_opened=max_tiles,
            early_cashout_rate=round(early, 2),
            mid_cashout_rate=round(mid, 2),
            late_cashout_rate=round(late, 2),
            first_tile_fail_rate=round(first_fail, 2),
            avg_tiles_before_fail=round(avg_fail_tiles, 2),
        )

    def analyze_mine_positions(
        self,
        rounds: List[Dict],
        grid_size: int = 25,
    ) -> PositionHeatmap:
        """Analyze mine positions for Mines game."""
        position_counts = {i: 0 for i in range(grid_size)}
        total_mines = 0

        for round_data in rounds:
            mines = round_data.get('mine_positions', [])
            for pos in mines:
                if 0 <= pos < grid_size:
                    position_counts[pos] += 1
                    total_mines += 1

        # Calculate frequencies
        frequencies = {}
        for pos, count in position_counts.items():
            frequencies[pos] = round(count / total_mines * 100, 2) if total_mines > 0 else 0

        # Define position categories (for 5x5 grid)
        corners = [0, 4, 20, 24]
        edges = [1, 2, 3, 5, 9, 10, 14, 15, 19, 21, 22, 23]
        center = [6, 7, 8, 11, 12, 13, 16, 17, 18]

        corner_rate = sum(position_counts[p] for p in corners) / total_mines * 100 if total_mines > 0 else 0
        edge_rate = sum(position_counts[p] for p in edges) / total_mines * 100 if total_mines > 0 else 0
        center_rate = sum(position_counts[p] for p in center) / total_mines * 100 if total_mines > 0 else 0

        # Find safest/riskiest
        sorted_positions = sorted(position_counts.items(), key=lambda x: x[1])
        safest = [p[0] for p in sorted_positions[:5]]
        riskiest = [p[0] for p in sorted_positions[-5:]]

        return PositionHeatmap(
            grid_size=grid_size,
            mine_count_analyzed=total_mines,
            corner_mine_rate=round(corner_rate, 2),
            edge_mine_rate=round(edge_rate, 2),
            center_mine_rate=round(center_rate, 2),
            position_frequency=frequencies,
            safest_positions=safest,
            riskiest_positions=riskiest,
        )

    def analyze_risk_levels(
        self,
        rounds: List[Dict],
    ) -> List[RiskLevelStats]:
        """Analyze statistics by risk level."""
        risk_data: Dict[str, List[Dict]] = {
            "easy": [], "medium": [], "hard": [], "extreme": []
        }

        for r in rounds:
            level = r.get('risk_level', 'medium').lower()
            if level in risk_data:
                risk_data[level].append(r)

        # Theoretical RTPs by risk level
        theoretical_rtps = {
            "easy": 98.0,
            "medium": 97.0,
            "hard": 96.0,
            "extreme": 95.0,
        }

        results = []
        for level, data in risk_data.items():
            if not data:
                continue

            multipliers = [d.get('multiplier', 1.0) for d in data]
            tiles = [d.get('tiles_opened', d.get('steps', 0)) for d in data]
            wins = [d for d in data if d.get('is_win', False)]

            results.append(RiskLevelStats(
                risk_level=level,
                total_rounds=len(data),
                avg_multiplier=round(statistics.mean(multipliers), 4) if multipliers else 0,
                success_rate=round(len(wins) / len(data) * 100, 2) if data else 0,
                big_win_rate=round(sum(1 for m in multipliers if m >= 5) / len(multipliers) * 100, 2) if multipliers else 0,
                avg_tiles_opened=round(statistics.mean(tiles), 2) if tiles else 0,
                theoretical_rtp=theoretical_rtps.get(level, 97.0),
            ))

        return results

    def analyze_towers_floors(
        self,
        rounds: List[Dict],
        max_floors: int = 10,
    ) -> TowersFloorAnalysis:
        """Analyze Towers floor data."""
        if not rounds:
            return TowersFloorAnalysis(
                total_rounds=0,
                max_floor_reached=0,
                avg_floor_reached=0,
                floor_success_rates={},
                left_success_rate=0,
                middle_success_rate=0,
                right_success_rate=0,
                recommended_stop_floor=3,
                expected_value_per_floor={},
            )

        floors = [r.get('floor_reached', r.get('steps', 0)) for r in rounds]
        choices = [r.get('choices', []) for r in rounds]

        avg_floor = statistics.mean(floors)
        max_floor = max(floors)

        # Floor success rates
        floor_rates = {}
        for floor in range(1, max_floors + 1):
            reached = sum(1 for f in floors if f >= floor)
            floor_rates[floor] = round(reached / len(floors) * 100, 2)

        # Choice analysis (aggregate all choices)
        all_choices = []
        all_results = []
        for r in rounds:
            ch = r.get('choices', [])
            res = r.get('choice_results', [])
            all_choices.extend(ch)
            all_results.extend(res)

        left_wins = sum(1 for c, r in zip(all_choices, all_results) if c == 'left' and r)
        left_total = sum(1 for c in all_choices if c == 'left')
        mid_wins = sum(1 for c, r in zip(all_choices, all_results) if c == 'middle' and r)
        mid_total = sum(1 for c in all_choices if c == 'middle')
        right_wins = sum(1 for c, r in zip(all_choices, all_results) if c == 'right' and r)
        right_total = sum(1 for c in all_choices if c == 'right')

        # Expected value per floor (simplified)
        ev_per_floor = {}
        base_mult = 1.0
        for floor in range(1, max_floors + 1):
            success_rate = floor_rates.get(floor, 0) / 100
            base_mult *= 1.5  # Approximate multiplier increase
            ev_per_floor[floor] = round(success_rate * base_mult, 4)

        # Find recommended stop (highest EV)
        recommended = max(ev_per_floor.items(), key=lambda x: x[1])[0] if ev_per_floor else 3

        return TowersFloorAnalysis(
            total_rounds=len(rounds),
            max_floor_reached=max_floor,
            avg_floor_reached=round(avg_floor, 2),
            floor_success_rates=floor_rates,
            left_success_rate=round(left_wins / left_total * 100, 2) if left_total > 0 else 33.33,
            middle_success_rate=round(mid_wins / mid_total * 100, 2) if mid_total > 0 else 33.33,
            right_success_rate=round(right_wins / right_total * 100, 2) if right_total > 0 else 33.33,
            recommended_stop_floor=recommended,
            expected_value_per_floor=ev_per_floor,
        )

    def analyze_chicken_road_lanes(
        self,
        rounds: List[Dict],
        total_lanes: int = 10,
    ) -> ChickenRoadLaneAnalysis:
        """Analyze Chicken Road lane data."""
        if not rounds:
            return ChickenRoadLaneAnalysis(
                total_rounds=0,
                avg_distance=0,
                max_distance=0,
                lane_success_rates={},
                most_dangerous_lane=1,
                safest_lane=1,
                caught_early_rate=0,
                completed_rate=0,
            )

        distances = [r.get('lanes_crossed', r.get('distance', 0)) for r in rounds]

        avg_dist = statistics.mean(distances)
        max_dist = max(distances)

        # Lane success rates
        lane_rates = {}
        for lane in range(1, total_lanes + 1):
            reached = sum(1 for d in distances if d >= lane)
            lane_rates[lane] = round(reached / len(distances) * 100, 2)

        # Find dangerous/safe lanes (biggest drop in success rate)
        danger_drops = {}
        for lane in range(2, total_lanes + 1):
            drop = lane_rates.get(lane - 1, 0) - lane_rates.get(lane, 0)
            danger_drops[lane] = drop

        most_dangerous = max(danger_drops.items(), key=lambda x: x[1])[0] if danger_drops else 1
        safest = min(danger_drops.items(), key=lambda x: x[1])[0] if danger_drops else 1

        # Early catch rate
        early_caught = sum(1 for d in distances if d <= 3) / len(distances) * 100
        completed = sum(1 for d in distances if d >= total_lanes) / len(distances) * 100

        return ChickenRoadLaneAnalysis(
            total_rounds=len(rounds),
            avg_distance=round(avg_dist, 2),
            max_distance=max_dist,
            lane_success_rates=lane_rates,
            most_dangerous_lane=most_dangerous,
            safest_lane=safest,
            caught_early_rate=round(early_caught, 2),
            completed_rate=round(completed, 2),
        )


# =============================================================================
# Service
# =============================================================================

class GridGameStatsService:
    """Service for grid game statistics."""

    def __init__(self, db_pool, game: str, game_type: str):
        self.db_pool = db_pool
        self.game = game
        self.game_type = game_type
        self.calculator = GridGameCalculator()

    async def get_rounds(
        self,
        hours: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> List[Dict]:
        """Fetch rounds from database."""
        query = "SELECT * FROM rounds"
        params = []

        if hours:
            cutoff = datetime.utcnow() - timedelta(hours=hours)
            query += " WHERE created_at >= ?"
            params.append(cutoff)

        query += " ORDER BY created_at DESC"

        if limit:
            query += f" LIMIT {limit}"

        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
            return [dict(row) for row in rows]

    async def get_statistics(
        self,
        period: str = "24h",
    ) -> GridGameStatistics:
        """Get complete grid game statistics."""
        hours_map = {"1h": 1, "6h": 6, "24h": 24, "7d": 168, "30d": 720}
        hours = hours_map.get(period, 24)

        rounds = await self.get_rounds(hours=hours)

        # Common stats
        tile_analysis = self.calculator.analyze_tiles(rounds)
        risk_comparison = self.calculator.analyze_risk_levels(rounds)

        # Game-specific stats
        position_heatmap = None
        floor_analysis = None
        lane_analysis = None

        if self.game_type == "mines":
            position_heatmap = self.calculator.analyze_mine_positions(rounds)
        elif self.game_type == "towers":
            floor_analysis = self.calculator.analyze_towers_floors(rounds)
        elif self.game_type == "chickenroad":
            lane_analysis = self.calculator.analyze_chicken_road_lanes(rounds)

        return GridGameStatistics(
            game=self.game,
            game_type=self.game_type,
            period=period,
            generated_at=datetime.utcnow(),
            tile_analysis=tile_analysis,
            risk_level_comparison=risk_comparison,
            position_heatmap=position_heatmap,
            floor_analysis=floor_analysis,
            lane_analysis=lane_analysis,
        )


# =============================================================================
# Router Factory
# =============================================================================

def create_grid_game_router(db_pool, game: str, game_type: str) -> APIRouter:
    """Create router for grid game statistics."""
    router = APIRouter(prefix="/api/v2/grid", tags=["grid-stats"])
    service = GridGameStatsService(db_pool, game, game_type)

    @router.get(
        "/{game_name}",
        response_model=GridGameStatistics,
        summary="Get Grid Game Statistics",
    )
    async def get_grid_stats(
        game_name: str,
        period: str = Query("24h", regex="^(1h|6h|24h|7d|30d)$"),
    ):
        if game_name != game:
            raise HTTPException(status_code=404, detail="Game not found")
        return await service.get_statistics(period)

    if game_type == "mines":
        @router.get(
            "/{game_name}/heatmap",
            response_model=PositionHeatmap,
            summary="Get Mine Position Heatmap",
        )
        async def get_mine_heatmap(
            game_name: str,
            period: str = Query("7d"),
        ):
            if game_name != game:
                raise HTTPException(status_code=404, detail="Game not found")
            hours_map = {"1h": 1, "6h": 6, "24h": 24, "7d": 168, "30d": 720}
            hours = hours_map.get(period, 168)
            rounds = await service.get_rounds(hours=hours)
            return service.calculator.analyze_mine_positions(rounds)

    if game_type == "towers":
        @router.get(
            "/{game_name}/floors",
            response_model=TowersFloorAnalysis,
            summary="Get Floor Analysis",
        )
        async def get_floor_analysis(
            game_name: str,
            period: str = Query("7d"),
        ):
            if game_name != game:
                raise HTTPException(status_code=404, detail="Game not found")
            hours_map = {"1h": 1, "6h": 6, "24h": 24, "7d": 168, "30d": 720}
            hours = hours_map.get(period, 168)
            rounds = await service.get_rounds(hours=hours)
            return service.calculator.analyze_towers_floors(rounds)

    if game_type == "chickenroad":
        @router.get(
            "/{game_name}/lanes",
            response_model=ChickenRoadLaneAnalysis,
            summary="Get Lane Analysis",
        )
        async def get_lane_analysis(
            game_name: str,
            period: str = Query("7d"),
        ):
            if game_name != game:
                raise HTTPException(status_code=404, detail="Game not found")
            hours_map = {"1h": 1, "6h": 6, "24h": 24, "7d": 168, "30d": 720}
            hours = hours_map.get(period, 168)
            rounds = await service.get_rounds(hours=hours)
            return service.calculator.analyze_chicken_road_lanes(rounds)

    return router


# Grid game mapping
GRID_GAMES = {
    "mines": "mines",
    "towers": "towers",
    "chickenroad": "chickenroad",
}
