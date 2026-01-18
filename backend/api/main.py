"""
Mines Tracker - Backend API

FastAPI application for serving Mines game statistics.
This module provides REST API endpoints for accessing Mines game data
including rounds, statistics, and distribution analysis.

Author: Crash Games Team
Version: 1.0.0
"""

import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, List, Optional

import aiosqlite
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Game-specific statistics
from game_stats import create_grid_game_router


# =============================================================================
# Logging Configuration
# =============================================================================

def setup_logger(name: str) -> logging.Logger:
    """
    Configure and return a logger with structured formatting.

    Args:
        name: The name of the logger (typically __name__).

    Returns:
        logging.Logger: Configured logger instance.
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '{"timestamp": "%(asctime)s", "level": "%(levelname)s", '
            '"logger": "%(name)s", "module": "%(module)s", '
            '"function": "%(funcName)s", "line": %(lineno)d, '
            '"message": "%(message)s"}'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger


logger = setup_logger(__name__)


# =============================================================================
# Configuration
# =============================================================================

# Database path from environment variable with default fallback
DATABASE_PATH: str = os.getenv("DATABASE_PATH", "mines.db")

# CORS allowed origins - configurable via environment
ALLOWED_ORIGINS: List[str] = [
    "http://localhost:3000",
    "http://localhost:3001",
    os.getenv("FRONTEND_URL", "https://minestracker.com"),
    os.getenv("SECONDARY_DOMAIN", "https://www.minestracker.com"),
]

# Constants for mine count distribution
MINE_COUNT_RANGE: List[int] = list(range(1, 25))  # 1-24 mines possible


# =============================================================================
# Pydantic Models
# =============================================================================

class Round(BaseModel):
    """
    Represents a single game round.

    Attributes:
        round_id: Unique identifier for the round.
        mines_count: Number of mines in the game.
        gems_revealed: Number of gems successfully revealed.
        cashout_multiplier: The multiplier value when cashing out.
        won: Whether the player won (cashed out) or lost (hit mine).
        created_at: Timestamp when the round was recorded.
    """
    round_id: str = Field(..., description="Unique identifier for the round")
    mines_count: int = Field(..., ge=1, le=24, description="Number of mines (1-24)")
    gems_revealed: int = Field(..., ge=0, le=24, description="Number of gems revealed")
    cashout_multiplier: float = Field(..., ge=0, description="Cashout multiplier value")
    won: bool = Field(..., description="Whether the round was won")
    created_at: datetime = Field(..., description="Timestamp when round was recorded")


class RoundsResponse(BaseModel):
    """
    Response model for paginated rounds endpoint.

    Attributes:
        items: List of Round objects.
        total: Total number of rounds in the database.
    """
    items: List[Round] = Field(..., description="List of game rounds")
    total: int = Field(..., ge=0, description="Total number of rounds")


class SummaryStats(BaseModel):
    """
    Summary statistics for all game rounds.

    Attributes:
        total_rounds: Total number of rounds played.
        win_rate: Percentage of rounds won (cashed out).
        avg_gems_revealed: Average number of gems revealed per round.
        most_popular_mines: Most commonly selected mine count.
        avg_cashout_multiplier: Average cashout multiplier for winning rounds.
    """
    total_rounds: int = Field(..., ge=0, description="Total number of rounds")
    win_rate: float = Field(..., ge=0, le=100, description="Win rate percentage")
    avg_gems_revealed: float = Field(..., ge=0, description="Average gems revealed")
    most_popular_mines: int = Field(..., ge=1, le=24, description="Most popular mine count")
    avg_cashout_multiplier: float = Field(..., ge=0, description="Average cashout multiplier")


class RecentStats(BaseModel):
    """
    Statistics for recent game rounds.

    Attributes:
        avg_gems_revealed: Average gems revealed in recent rounds.
        win_rate: Win rate percentage for recent rounds.
    """
    avg_gems_revealed: float = Field(..., ge=0, description="Average gems revealed for recent rounds")
    win_rate: float = Field(..., ge=0, le=100, description="Win rate percentage")


class DistributionBucket(BaseModel):
    """
    Represents a bucket in the mine count distribution.

    Attributes:
        mines: Number of mines.
        count: Number of rounds with this mine count.
        percentage: Percentage of total rounds with this mine count.
    """
    mines: int = Field(..., ge=1, le=24, description="Number of mines")
    count: int = Field(..., ge=0, description="Number of rounds")
    percentage: float = Field(..., ge=0, le=100, description="Percentage of total rounds")


class PayoutInfo(BaseModel):
    """
    Represents payout information for a given gems/mines combination.

    Attributes:
        gems: Number of gems revealed.
        multiplier: Payout multiplier.
        probability: Probability of reaching this many gems (percentage).
    """
    gems: int = Field(..., ge=1, le=24, description="Number of gems revealed")
    multiplier: float = Field(..., ge=0, description="Payout multiplier")
    probability: float = Field(..., ge=0, le=100, description="Probability percentage")


class HealthResponse(BaseModel):
    """
    Health check response model.

    Attributes:
        status: Current health status ('healthy' or 'unhealthy').
        game: Name of the game being tracked.
        database: Database connection status.
        last_data_update: Timestamp of most recent data.
        timestamp: Current server timestamp.
    """
    status: str = Field(..., description="Health status")
    game: str = Field(..., description="Game name")
    database: str = Field(..., description="Database connection status")
    last_data_update: Optional[str] = Field(None, description="Last data update timestamp")
    timestamp: str = Field(..., description="Current server timestamp")


class ErrorResponse(BaseModel):
    """
    Standardized error response model.

    Attributes:
        error: Error type identifier.
        detail: Human-readable error description.
        timestamp: When the error occurred.
        request_id: Optional request tracking ID.
    """
    error: str = Field(..., description="Error type identifier")
    detail: str = Field(..., description="Error description")
    timestamp: str = Field(..., description="Error timestamp")
    request_id: Optional[str] = Field(None, description="Request tracking ID")


# =============================================================================
# Database Connection Management
# =============================================================================

class DatabaseManager:
    """
    Manages database connections using context managers for proper cleanup.

    This class provides async context manager for database connections,
    ensuring connections are properly closed after use.
    """

    def __init__(self, db_path: str) -> None:
        """
        Initialize the database manager.

        Args:
            db_path: Path to the SQLite database file.
        """
        self.db_path = db_path

    @asynccontextmanager
    async def connect(self) -> AsyncGenerator[aiosqlite.Connection, None]:
        """
        Get a database connection using async context manager.

        Yields:
            aiosqlite.Connection: Database connection with Row factory set.

        Raises:
            DatabaseError: If connection cannot be established.
        """
        db: Optional[aiosqlite.Connection] = None
        try:
            db = await aiosqlite.connect(self.db_path)
            db.row_factory = aiosqlite.Row
            logger.debug(f"Database connection established to {self.db_path}")
            yield db
        except aiosqlite.Error as e:
            logger.error(f"Database connection error: {e}")
            raise HTTPException(
                status_code=503,
                detail="Database connection failed"
            ) from e
        finally:
            if db:
                await db.close()
                logger.debug("Database connection closed")


# Create singleton database manager
db_manager = DatabaseManager(DATABASE_PATH)


async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    """
    Dependency function for database connection injection.

    Yields:
        aiosqlite.Connection: Database connection.

    Example:
        @app.get("/api/data")
        async def get_data(db: aiosqlite.Connection = Depends(get_db)):
            cursor = await db.execute("SELECT * FROM table")
    """
    async with db_manager.connect() as db:
        yield db


# =============================================================================
# FastAPI Application Setup
# =============================================================================

app = FastAPI(
    title="Mines Tracker API",
    description="Real-time statistics API for Spribe Mines game",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)


# =============================================================================
# CORS Configuration (Security Fix)
# =============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,  # API doesn't require credentials
    allow_methods=["GET", "HEAD", "OPTIONS"],  # Read-only API
    allow_headers=["Content-Type", "Accept"],
    expose_headers=["Content-Length", "Content-Range"],
    max_age=3600,
)


# =============================================================================
# Exception Handlers
# =============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Global exception handler for unhandled exceptions.

    Args:
        request: The incoming request that caused the exception.
        exc: The exception that was raised.

    Returns:
        JSONResponse: Standardized error response with 500 status code.
    """
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    error_response = ErrorResponse(
        error="internal_error",
        detail="An internal server error occurred",
        timestamp=datetime.utcnow().isoformat(),
        request_id=request.headers.get("X-Request-ID")
    )
    return JSONResponse(
        status_code=500,
        content=error_response.model_dump()
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Handler for HTTP exceptions.

    Args:
        request: The incoming request.
        exc: The HTTPException that was raised.

    Returns:
        JSONResponse: Standardized error response.
    """
    logger.warning(f"HTTP exception: {exc.status_code} - {exc.detail}")
    error_response = ErrorResponse(
        error="http_error",
        detail=str(exc.detail),
        timestamp=datetime.utcnow().isoformat(),
        request_id=request.headers.get("X-Request-ID")
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump()
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    """
    Handler for validation errors.

    Args:
        request: The incoming request.
        exc: The ValueError that was raised.

    Returns:
        JSONResponse: Standardized error response with 422 status code.
    """
    logger.warning(f"Validation error: {exc}")
    error_response = ErrorResponse(
        error="validation_error",
        detail=str(exc),
        timestamp=datetime.utcnow().isoformat(),
        request_id=request.headers.get("X-Request-ID")
    )
    return JSONResponse(
        status_code=422,
        content=error_response.model_dump()
    )


# =============================================================================
# Startup Event
# =============================================================================

@app.on_event("startup")
async def startup() -> None:
    """
    Application startup event handler.

    Creates the database table and indexes if they don't exist.
    Logs the startup process for monitoring.
    """
    logger.info("Starting Mines Tracker API...")

    try:
        async with db_manager.connect() as db:
            # Create main table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS mines_rounds (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    round_id TEXT UNIQUE NOT NULL,
                    mines_count INTEGER NOT NULL,
                    gems_revealed INTEGER NOT NULL,
                    cashout_multiplier REAL NOT NULL,
                    won BOOLEAN NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Create indexes for performance
            await db.execute(
                "CREATE INDEX IF NOT EXISTS idx_mines_count ON mines_rounds(mines_count)"
            )
            await db.execute(
                "CREATE INDEX IF NOT EXISTS idx_created ON mines_rounds(created_at DESC)"
            )
            await db.execute(
                "CREATE INDEX IF NOT EXISTS idx_round_id ON mines_rounds(round_id)"
            )
            await db.execute(
                "CREATE INDEX IF NOT EXISTS idx_won ON mines_rounds(won)"
            )

            await db.commit()
            logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}", exc_info=True)
        raise


# =============================================================================
# API Endpoints
# =============================================================================

@app.get("/api/rounds", response_model=RoundsResponse)
async def get_rounds(
    limit: int = Query(
        default=50,
        ge=1,
        le=500,
        description="Maximum number of rounds to return (1-500)"
    ),
    offset: int = Query(
        default=0,
        ge=0,
        description="Number of rounds to skip (must be >= 0)"
    ),
    db: aiosqlite.Connection = Depends(get_db)
) -> RoundsResponse:
    """
    Get paginated list of game rounds.

    Retrieves game rounds ordered by creation time (most recent first).
    Supports pagination through limit and offset parameters.

    Args:
        limit: Maximum number of rounds to return (default: 50, max: 500).
        offset: Number of rounds to skip for pagination (default: 0).
        db: Database connection (injected).

    Returns:
        RoundsResponse: Paginated list of rounds with total count.

    Raises:
        HTTPException: If database query fails.

    Example:
        GET /api/rounds?limit=100&offset=0
        Response: {"items": [...], "total": 5000}
    """
    logger.debug(f"Fetching rounds with limit={limit}, offset={offset}")

    try:
        # Get total count
        cursor = await db.execute("SELECT COUNT(*) FROM mines_rounds")
        total = (await cursor.fetchone())[0]

        # Get paginated rounds
        cursor = await db.execute(
            """
            SELECT round_id, mines_count, gems_revealed, cashout_multiplier, won, created_at
            FROM mines_rounds
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            """,
            (limit, offset)
        )
        rows = await cursor.fetchall()

        items = [
            Round(
                round_id=row["round_id"],
                mines_count=row["mines_count"],
                gems_revealed=row["gems_revealed"],
                cashout_multiplier=row["cashout_multiplier"],
                won=bool(row["won"]),
                created_at=row["created_at"]
            )
            for row in rows
        ]

        logger.info(f"Retrieved {len(items)} rounds (total: {total})")
        return RoundsResponse(items=items, total=total)

    except aiosqlite.Error as e:
        logger.error(f"Database error fetching rounds: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch rounds from database"
        ) from e


@app.get("/api/stats/summary", response_model=SummaryStats)
async def get_summary(db: aiosqlite.Connection = Depends(get_db)) -> SummaryStats:
    """
    Get summary statistics for all game rounds.

    Calculates aggregate statistics including win rate, average gems revealed,
    most popular mine count, and average cashout multiplier.

    Args:
        db: Database connection (injected).

    Returns:
        SummaryStats: Aggregate statistics for all rounds.

    Raises:
        HTTPException: If database query fails.

    Example:
        GET /api/stats/summary
        Response: {"total_rounds": 5000, "win_rate": 45.2, ...}
    """
    logger.debug("Fetching summary statistics")

    try:
        # Get main statistics in a single query
        cursor = await db.execute("""
            SELECT
                COUNT(*) as total,
                AVG(gems_revealed) as avg_gems,
                SUM(CASE WHEN won THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as win_rate,
                AVG(CASE WHEN won THEN cashout_multiplier ELSE NULL END) as avg_cashout
            FROM mines_rounds
        """)
        row = await cursor.fetchone()

        # Get most popular mine count
        cursor = await db.execute("""
            SELECT mines_count, COUNT(*) as cnt
            FROM mines_rounds
            GROUP BY mines_count
            ORDER BY cnt DESC
            LIMIT 1
        """)
        popular_row = await cursor.fetchone()
        most_popular_mines = popular_row[0] if popular_row else 3

        result = SummaryStats(
            total_rounds=row[0] or 0,
            avg_gems_revealed=round(row[1] or 0, 4),
            win_rate=round(row[2] or 0, 2),
            most_popular_mines=most_popular_mines,
            avg_cashout_multiplier=round(row[3] or 0, 4)
        )

        logger.info(f"Summary stats: {result.total_rounds} total rounds")
        return result

    except aiosqlite.Error as e:
        logger.error(f"Database error fetching summary: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch summary statistics"
        ) from e


@app.get("/api/stats/recent", response_model=RecentStats)
async def get_recent_stats(
    limit: int = Query(
        default=100,
        ge=1,
        le=1000,
        description="Number of recent rounds to analyze (1-1000)"
    ),
    db: aiosqlite.Connection = Depends(get_db)
) -> RecentStats:
    """
    Get statistics for recent game rounds.

    Analyzes the most recent N rounds to provide current trend data.

    Args:
        limit: Number of recent rounds to analyze (default: 100, max: 1000).
        db: Database connection (injected).

    Returns:
        RecentStats: Statistics for recent rounds.

    Raises:
        HTTPException: If database query fails.

    Example:
        GET /api/stats/recent?limit=500
        Response: {"avg_gems_revealed": 4.5, "win_rate": 48.2}
    """
    logger.debug(f"Fetching recent stats for last {limit} rounds")

    try:
        cursor = await db.execute("""
            SELECT
                AVG(gems_revealed) as avg_gems,
                SUM(CASE WHEN won THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as win_rate
            FROM (
                SELECT gems_revealed, won
                FROM mines_rounds
                ORDER BY created_at DESC
                LIMIT ?
            )
        """, (limit,))
        row = await cursor.fetchone()

        result = RecentStats(
            avg_gems_revealed=round(row[0] or 0, 4),
            win_rate=round(row[1] or 0, 2)
        )

        logger.info(f"Recent stats (last {limit}): avg_gems={result.avg_gems_revealed}")
        return result

    except aiosqlite.Error as e:
        logger.error(f"Database error fetching recent stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch recent statistics"
        ) from e


@app.get("/api/distribution", response_model=List[DistributionBucket])
async def get_distribution(
    db: aiosqlite.Connection = Depends(get_db)
) -> List[DistributionBucket]:
    """
    Get mine count distribution across all rounds.

    Returns the count and percentage of rounds for each mine count
    for visualization and analysis.

    Args:
        db: Database connection (injected).

    Returns:
        List[DistributionBucket]: Distribution data for each mine count.

    Raises:
        HTTPException: If database query fails.

    Example:
        GET /api/distribution
        Response: [
            {"mines": 1, "count": 300, "percentage": 6.0},
            {"mines": 3, "count": 1500, "percentage": 30.0},
            ...
        ]
    """
    logger.debug("Fetching mine count distribution")

    try:
        # Get total count first
        cursor = await db.execute("SELECT COUNT(*) FROM mines_rounds")
        total = (await cursor.fetchone())[0] or 1  # Avoid division by zero

        # Get distribution for each mine count
        cursor = await db.execute("""
            SELECT mines_count, COUNT(*) as count
            FROM mines_rounds
            GROUP BY mines_count
            ORDER BY mines_count
        """)
        rows = await cursor.fetchall()

        result: List[DistributionBucket] = []
        for row in rows:
            mines = row[0]
            count = row[1]
            percentage = round((count / total) * 100, 2)

            result.append(DistributionBucket(
                mines=mines,
                count=count,
                percentage=percentage
            ))

        logger.info(f"Distribution calculated for {total} rounds")
        return result

    except aiosqlite.Error as e:
        logger.error(f"Database error fetching distribution: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch distribution data"
        ) from e


@app.get("/api/payout-table", response_model=List[PayoutInfo])
async def get_payout_table(
    mines: int = Query(
        default=3,
        ge=1,
        le=24,
        description="Number of mines (1-24)"
    )
) -> List[PayoutInfo]:
    """
    Calculate payout multipliers for given mine count.

    Calculates theoretical payout multipliers for each possible number
    of gems revealed, based on probability and house edge (RTP 97%).

    Args:
        mines: Number of mines in the game (default: 3, range: 1-24).

    Returns:
        List[PayoutInfo]: Payout information for each gems count.

    Raises:
        HTTPException: If mines count is invalid.

    Example:
        GET /api/payout-table?mines=3
        Response: [
            {"gems": 1, "multiplier": 1.14, "probability": 88.0},
            {"gems": 2, "multiplier": 1.29, "probability": 79.3},
            ...
        ]
    """
    logger.debug(f"Calculating payout table for {mines} mines")

    try:
        if mines < 1 or mines > 24:
            raise ValueError("Mines count must be between 1 and 24")

        gems_count = 25 - mines
        rtp = 0.97
        payouts: List[PayoutInfo] = []

        for gems in range(1, gems_count + 1):
            # Calculate probability of revealing this many gems
            prob = 1.0
            for i in range(gems):
                prob *= (gems_count - i) / (25 - i)

            # Calculate multiplier with house edge
            multiplier = round(rtp / prob, 2)

            payouts.append(PayoutInfo(
                gems=gems,
                multiplier=multiplier,
                probability=round(prob * 100, 2)
            ))

        logger.info(f"Payout table calculated for {mines} mines: {len(payouts)} entries")
        return payouts

    except ValueError as e:
        logger.warning(f"Invalid payout table request: {e}")
        raise HTTPException(
            status_code=422,
            detail=str(e)
        ) from e


@app.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """
    Health check endpoint for monitoring and orchestration.

    Checks database connectivity and returns the service health status
    along with the timestamp of the most recent data update.

    Returns:
        HealthResponse: Service health status and metadata.

    Example:
        GET /api/health
        Response: {
            "status": "healthy",
            "game": "mines",
            "database": "connected",
            "last_data_update": "2026-01-17T10:30:00",
            "timestamp": "2026-01-17T10:35:00"
        }
    """
    logger.debug("Health check requested")

    try:
        async with db_manager.connect() as db:
            # Check database connectivity and get last update time
            cursor = await db.execute(
                "SELECT MAX(created_at) FROM mines_rounds"
            )
            last_update_row = await cursor.fetchone()
            last_update = last_update_row[0] if last_update_row and last_update_row[0] else None

            response = HealthResponse(
                status="healthy",
                game="mines",
                database="connected",
                last_data_update=str(last_update) if last_update else "No data",
                timestamp=datetime.utcnow().isoformat()
            )

            logger.info("Health check: healthy")
            return response

    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        return HealthResponse(
            status="unhealthy",
            game="mines",
            database="disconnected",
            last_data_update=None,
            timestamp=datetime.utcnow().isoformat()
        )


# =============================================================================
# Main Entry Point
# =============================================================================


# Game-specific statistics router
grid_stats_router = create_grid_game_router(db_manager, "mines", "mines")
app.include_router(grid_stats_router)


if __name__ == "__main__":
    import uvicorn

    logger.info("Starting Mines Tracker API server...")
    uvicorn.run(app, host="0.0.0.0", port=8003)
