"""
Mines Data Collector

Collects game data from Spribe Mines game.
Uses Playwright for browser automation and WebSocket interception.

This module provides:
- WebSocket message interception for real-time data collection
- Database persistence for collected rounds
- Test data generation for development

Note: This is a template collector. The actual implementation
depends on Spribe's demo game structure and WebSocket/API endpoints.

Author: Crash Games Team
Version: 1.0.0
"""

import asyncio
import json
import logging
import os
import hashlib
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

import aiosqlite
from playwright.async_api import async_playwright, Page, WebSocket


# =============================================================================
# Logging Configuration
# =============================================================================

def setup_logger(name: str) -> logging.Logger:
    """
    Configure and return a logger with structured JSON formatting.

    Args:
        name: The name of the logger (typically __name__).

    Returns:
        logging.Logger: Configured logger instance with JSON output.
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

DATABASE_PATH: str = os.getenv("DATABASE_PATH", "mines.db")

# Known field names for mine count extraction
MINE_COUNT_FIELDS: List[str] = [
    'mines', 'minesCount', 'mine_count', 'mineCount', 'numMines'
]

# Known field names for gems revealed extraction
GEMS_FIELDS: List[str] = [
    'gems', 'gemsRevealed', 'gems_revealed', 'revealed', 'safe_tiles'
]

# Known field names for multiplier extraction
MULTIPLIER_FIELDS: List[str] = [
    'multiplier', 'payout', 'cashout', 'coefficient', 'odds'
]

# Known field names for round ID extraction
ROUND_ID_FIELDS: List[str] = [
    'roundId', 'gameId', 'id', 'round', 'roundNumber',
    'gameNumber', 'sessionId'
]

# Message types that indicate a game start
START_MESSAGE_TYPES: List[str] = [
    'game_start', 'start', 'new_game', 'begin', 'init'
]

# Message types that indicate a tile reveal
REVEAL_MESSAGE_TYPES: List[str] = [
    'reveal', 'tile_revealed', 'cell_opened', 'click', 'open'
]

# Message types that indicate cashout
CASHOUT_MESSAGE_TYPES: List[str] = [
    'cashout', 'cash_out', 'collect', 'withdraw', 'claim'
]

# Message types that indicate game history
HISTORY_MESSAGE_TYPES: List[str] = [
    'history', 'game_history', 'past_games', 'recent_games'
]


# =============================================================================
# Custom Exceptions
# =============================================================================

class CollectorError(Exception):
    """Base exception for collector errors."""
    pass


class DatabaseError(CollectorError):
    """Raised when database operations fail."""
    pass


class ConnectionError(CollectorError):
    """Raised when connection to data source fails."""
    pass


class ParseError(CollectorError):
    """Raised when message parsing fails."""
    pass


# =============================================================================
# Mines Collector Class
# =============================================================================

class MinesCollector:
    """
    Collects game data from Spribe Mines using Playwright.

    This collector uses browser automation to intercept WebSocket messages
    and extract game data in real-time.

    Attributes:
        db_path: Path to the SQLite database file.
        running: Flag indicating if collection is active.
        rounds_collected: Counter of successfully collected rounds.
        current_game: Currently active game data.
        max_retries: Maximum number of retry attempts for failed operations.
        retry_delay: Base delay between retries in seconds.

    Example:
        collector = MinesCollector()
        await collector.run(demo_url="https://spribe.co/games/mines")
    """

    def __init__(
        self,
        db_path: Optional[str] = None,
        max_retries: int = 5,
        retry_delay: float = 2.0
    ) -> None:
        """
        Initialize the Mines collector.

        Args:
            db_path: Path to SQLite database. Defaults to DATABASE_PATH env var.
            max_retries: Maximum retry attempts for failed operations.
            retry_delay: Base delay between retries in seconds.
        """
        self.db_path: str = db_path or DATABASE_PATH
        self.running: bool = False
        self.rounds_collected: int = 0
        self.current_game: Optional[Dict[str, Any]] = None
        self.max_retries: int = max_retries
        self.retry_delay: float = retry_delay

        logger.info(f"MinesCollector initialized with db_path={self.db_path}")

    async def init_db(self) -> None:
        """
        Initialize the database schema.

        Creates the mines_rounds table if it doesn't exist.

        Raises:
            DatabaseError: If database initialization fails.
        """
        logger.info("Initializing database...")

        try:
            async with aiosqlite.connect(self.db_path) as db:
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
                await db.execute(
                    "CREATE INDEX IF NOT EXISTS idx_created ON mines_rounds(created_at DESC)"
                )
                await db.execute(
                    "CREATE INDEX IF NOT EXISTS idx_mines_count ON mines_rounds(mines_count)"
                )
                await db.execute(
                    "CREATE INDEX IF NOT EXISTS idx_won ON mines_rounds(won)"
                )
                await db.commit()
                logger.info("Database initialized successfully")
        except aiosqlite.Error as e:
            logger.error(f"Database initialization failed: {e}", exc_info=True)
            raise DatabaseError(f"Failed to initialize database: {e}") from e

    async def save_round(
        self,
        round_id: str,
        mines_count: int,
        gems_revealed: int,
        cashout_multiplier: float,
        won: bool
    ) -> bool:
        """
        Save a game round to the database.

        Args:
            round_id: Unique identifier for the round.
            mines_count: Number of mines in the game.
            gems_revealed: Number of gems successfully revealed.
            cashout_multiplier: Cashout multiplier value.
            won: Whether the player won (cashed out) or lost (hit mine).

        Returns:
            bool: True if round was saved successfully, False otherwise.

        Raises:
            ValueError: If parameters are invalid.
        """
        # Validate parameters
        if mines_count < 1 or mines_count > 24:
            logger.error(f"Invalid mines_count: {mines_count} (must be 1-24)")
            raise ValueError(f"Mines count must be 1-24, got {mines_count}")

        if gems_revealed < 0 or gems_revealed > 24:
            logger.error(f"Invalid gems_revealed: {gems_revealed} (must be 0-24)")
            raise ValueError(f"Gems revealed must be 0-24, got {gems_revealed}")

        if cashout_multiplier < 0:
            logger.error(f"Invalid cashout_multiplier: {cashout_multiplier} (must be >= 0)")
            raise ValueError(f"Cashout multiplier must be >= 0, got {cashout_multiplier}")

        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    """INSERT OR IGNORE INTO mines_rounds
                       (round_id, mines_count, gems_revealed, cashout_multiplier, won)
                       VALUES (?, ?, ?, ?, ?)""",
                    (round_id, mines_count, gems_revealed, cashout_multiplier, won)
                )
                await db.commit()
                self.rounds_collected += 1
                logger.info(
                    f"Round saved: round_id={round_id}, mines={mines_count}, "
                    f"gems={gems_revealed}, multiplier={cashout_multiplier:.2f}x, "
                    f"won={won}, total_collected={self.rounds_collected}"
                )
                return True
        except aiosqlite.IntegrityError:
            logger.debug(f"Round {round_id} already exists (duplicate)")
            return False
        except aiosqlite.Error as e:
            logger.error(f"Failed to save round {round_id}: {e}", exc_info=True)
            return False

    async def collect_with_playwright(self, demo_url: str) -> None:
        """
        Collect data using Playwright browser automation.

        Intercepts WebSocket messages from the game to extract game data.
        Implements exponential backoff for reconnection attempts.

        Args:
            demo_url: URL of the demo game to collect data from.

        Raises:
            ConnectionError: If unable to connect after max retries.
        """
        logger.info(f"Starting Playwright collection from {demo_url}")

        retry_count: int = 0

        while self.running and retry_count < self.max_retries:
            try:
                async with async_playwright() as p:
                    browser = await p.chromium.launch(headless=True)
                    context = await browser.new_context(
                        viewport={"width": 1920, "height": 1080},
                        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                    )
                    page = await context.new_page()

                    # Set up WebSocket message handler
                    page.on("websocket", lambda ws: self._setup_websocket_handler(ws))

                    try:
                        await page.goto(demo_url, wait_until="networkidle", timeout=60000)
                        logger.info("Page loaded successfully, monitoring for rounds...")

                        # Reset retry count on successful connection
                        retry_count = 0

                        # Keep collecting while running
                        while self.running:
                            await asyncio.sleep(1)

                    except Exception as e:
                        logger.error(f"Page navigation error: {e}", exc_info=True)
                        raise

                    finally:
                        await browser.close()
                        logger.info("Browser closed")

            except Exception as e:
                retry_count += 1
                wait_time = self.retry_delay * (2 ** (retry_count - 1))  # Exponential backoff

                logger.warning(
                    f"Collection failed (attempt {retry_count}/{self.max_retries}): {e}. "
                    f"Retrying in {wait_time:.1f}s..."
                )

                if retry_count < self.max_retries:
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"Max retries ({self.max_retries}) exceeded. Stopping collection.")
                    raise ConnectionError(
                        f"Failed to connect after {self.max_retries} attempts"
                    ) from e

    def _setup_websocket_handler(self, ws: WebSocket) -> None:
        """
        Set up handlers for WebSocket message events.

        Args:
            ws: Playwright WebSocket object.
        """
        logger.info(f"WebSocket connected: {ws.url}")

        def on_message(payload: str) -> None:
            """Handle incoming WebSocket message."""
            try:
                self._process_websocket_message(payload)
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}", exc_info=True)

        ws.on("framereceived", lambda payload: on_message(payload))
        ws.on("close", lambda: logger.info(f"WebSocket closed: {ws.url}"))

    def _process_websocket_message(self, message: str) -> None:
        """
        Process a raw WebSocket message.

        Args:
            message: Raw WebSocket message string.
        """
        try:
            data = json.loads(message) if isinstance(message, str) else message
            self.parse_ws_message(data)
        except json.JSONDecodeError as e:
            logger.debug(f"Non-JSON message received: {message[:100]}...")
        except Exception as e:
            logger.error(f"Failed to process message: {e}", exc_info=True)

    def parse_ws_message(self, data: Union[Dict[str, Any], List, Any]) -> None:
        """
        Parse WebSocket message to extract game data.

        This method attempts to extract game information from various
        possible message formats used by different game providers.

        Args:
            data: Parsed WebSocket message (dict, list, or other).

        Note:
            The actual message format depends on Spribe's API structure.
            This implementation handles common patterns found in Mines games.
        """
        if not isinstance(data, dict):
            logger.debug(f"Skipping non-dict message: {type(data)}")
            return

        msg_type = self._extract_message_type(data)

        # Game start
        if msg_type and msg_type.lower() in START_MESSAGE_TYPES:
            self._handle_game_start(data)

        # Tile revealed
        elif msg_type and msg_type.lower() in REVEAL_MESSAGE_TYPES:
            self._handle_tile_reveal(data)

        # Cash out
        elif msg_type and msg_type.lower() in CASHOUT_MESSAGE_TYPES:
            self._handle_cashout(data)

        # History data
        elif msg_type and msg_type.lower() in HISTORY_MESSAGE_TYPES:
            self._handle_history(data)

    def _handle_game_start(self, data: Dict[str, Any]) -> None:
        """
        Handle game start message.

        Args:
            data: Message data dictionary.
        """
        round_id = self._extract_round_id(data) or self._generate_round_id()
        mines_count = self._extract_mine_count(data) or 3

        self.current_game = {
            "id": round_id,
            "mine_count": mines_count,
            "gems_revealed": 0,
            "reveals": [],
            "hash": data.get("hash")
        }

        logger.info(f"New game started: round_id={round_id}, mines={mines_count}")

    def _handle_tile_reveal(self, data: Dict[str, Any]) -> None:
        """
        Handle tile reveal message.

        Args:
            data: Message data dictionary.
        """
        if not self.current_game:
            logger.debug("Tile reveal received but no active game")
            return

        # Check if it's a gem or mine
        is_gem = data.get("isGem") or data.get("gem") or data.get("result") == "gem"
        position = data.get("position") or data.get("cell") or data.get("index")

        if is_gem:
            self.current_game["gems_revealed"] += 1
            if position is not None:
                self.current_game["reveals"].append(position)
            logger.debug(f"Gem revealed at position {position}, total: {self.current_game['gems_revealed']}")
        else:
            # Hit a mine - game over
            logger.info(f"Mine hit! Game over: gems_revealed={self.current_game['gems_revealed']}")
            asyncio.create_task(
                self.save_round(
                    round_id=str(self.current_game["id"]),
                    mines_count=self.current_game["mine_count"],
                    gems_revealed=self.current_game["gems_revealed"],
                    cashout_multiplier=0.0,
                    won=False
                )
            )
            self.current_game = None

    def _handle_cashout(self, data: Dict[str, Any]) -> None:
        """
        Handle cashout message.

        Args:
            data: Message data dictionary.
        """
        if not self.current_game:
            logger.debug("Cashout received but no active game")
            return

        multiplier = self._extract_multiplier(data) or 1.0

        logger.info(f"Cashout: gems_revealed={self.current_game['gems_revealed']}, multiplier={multiplier:.2f}x")
        asyncio.create_task(
            self.save_round(
                round_id=str(self.current_game["id"]),
                mines_count=self.current_game["mine_count"],
                gems_revealed=self.current_game["gems_revealed"],
                cashout_multiplier=multiplier,
                won=True
            )
        )
        self.current_game = None

    def _handle_history(self, data: Dict[str, Any]) -> None:
        """
        Handle game history message.

        Args:
            data: Message data dictionary.
        """
        games = data.get("games") or data.get("history") or []

        for game in games:
            round_id = self._extract_round_id(game) or self._generate_round_id()
            mines_count = self._extract_mine_count(game) or 3
            gems_revealed = self._extract_gems_revealed(game) or 0
            multiplier = self._extract_multiplier(game) or 0.0
            won = game.get("won") or game.get("cashed_out") or multiplier > 0

            asyncio.create_task(
                self.save_round(
                    round_id=str(round_id),
                    mines_count=mines_count,
                    gems_revealed=gems_revealed,
                    cashout_multiplier=multiplier,
                    won=bool(won)
                )
            )

    def _extract_message_type(self, data: Dict[str, Any]) -> Optional[str]:
        """
        Extract message type from data dictionary.

        Args:
            data: Message data dictionary.

        Returns:
            Optional[str]: Message type if found, None otherwise.
        """
        for field in ['type', 't', 'action', 'event', 'messageType', 'cmd']:
            if field in data:
                return str(data[field])
        return None

    def _extract_mine_count(self, data: Dict[str, Any]) -> Optional[int]:
        """
        Extract mine count from data dictionary.

        Args:
            data: Message data dictionary.

        Returns:
            Optional[int]: Mine count if found and valid, None otherwise.
        """
        for field in MINE_COUNT_FIELDS:
            if field in data:
                try:
                    value = data[field]
                    if isinstance(value, int):
                        return value
                    elif isinstance(value, str):
                        return int(value)
                except (ValueError, TypeError) as e:
                    logger.debug(f"Failed to convert {field}={data[field]} to int: {e}")
                    continue

        # Check nested structures
        if 'result' in data and isinstance(data['result'], dict):
            return self._extract_mine_count(data['result'])

        if 'data' in data and isinstance(data['data'], dict):
            return self._extract_mine_count(data['data'])

        return None

    def _extract_gems_revealed(self, data: Dict[str, Any]) -> Optional[int]:
        """
        Extract gems revealed from data dictionary.

        Args:
            data: Message data dictionary.

        Returns:
            Optional[int]: Gems revealed if found and valid, None otherwise.
        """
        for field in GEMS_FIELDS:
            if field in data:
                try:
                    value = data[field]
                    if isinstance(value, int):
                        return value
                    elif isinstance(value, str):
                        return int(value)
                except (ValueError, TypeError) as e:
                    logger.debug(f"Failed to convert {field}={data[field]} to int: {e}")
                    continue

        # Check nested structures
        if 'result' in data and isinstance(data['result'], dict):
            return self._extract_gems_revealed(data['result'])

        if 'data' in data and isinstance(data['data'], dict):
            return self._extract_gems_revealed(data['data'])

        return None

    def _extract_multiplier(self, data: Dict[str, Any]) -> Optional[float]:
        """
        Extract multiplier value from data dictionary.

        Args:
            data: Message data dictionary.

        Returns:
            Optional[float]: Multiplier value if found and valid, None otherwise.
        """
        for field in MULTIPLIER_FIELDS:
            if field in data:
                try:
                    value = data[field]
                    if isinstance(value, (int, float)):
                        return float(value)
                    elif isinstance(value, str):
                        return float(value)
                except (ValueError, TypeError) as e:
                    logger.debug(f"Failed to convert {field}={data[field]} to float: {e}")
                    continue

        # Check nested structures
        if 'result' in data and isinstance(data['result'], dict):
            return self._extract_multiplier(data['result'])

        if 'data' in data and isinstance(data['data'], dict):
            return self._extract_multiplier(data['data'])

        return None

    def _extract_round_id(self, data: Dict[str, Any]) -> Optional[str]:
        """
        Extract round ID from data dictionary.

        Args:
            data: Message data dictionary.

        Returns:
            Optional[str]: Round ID if found, None otherwise.
        """
        for field in ROUND_ID_FIELDS:
            if field in data:
                return str(data[field])

        # Check nested structures
        if 'result' in data and isinstance(data['result'], dict):
            return self._extract_round_id(data['result'])

        if 'data' in data and isinstance(data['data'], dict):
            return self._extract_round_id(data['data'])

        return None

    def _generate_round_id(self) -> str:
        """
        Generate a unique round ID.

        Returns:
            str: Generated round ID.
        """
        timestamp = datetime.now().isoformat()
        return hashlib.md5(timestamp.encode()).hexdigest()[:12]

    async def generate_test_data(self, count: int = 100) -> None:
        """
        Generate test data for development and testing.

        Creates simulated Mines game rounds with realistic distribution.

        Args:
            count: Number of test rounds to generate.
        """
        import random

        logger.info(f"Generating {count} test rounds...")

        for i in range(count):
            # Random mine count (weighted towards 3-5 mines)
            mines_count = random.choices(
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                weights=[5, 10, 30, 25, 15, 7, 4, 2, 1, 1]
            )[0]

            # Calculate safe tiles
            safe_tiles = 25 - mines_count

            # Simulate player revealing tiles
            # ~50% chance to hit mine, ~50% chance to cash out
            hit_mine = random.random() < 0.5

            if hit_mine:
                # Hit a mine - reveal 0 to safe_tiles gems
                gems_revealed = random.randint(0, min(safe_tiles, 8))
                cashout_multiplier = 0.0
                won = False
            else:
                # Cash out - reveal 1 to safe_tiles gems
                gems_revealed = random.randint(1, min(safe_tiles, 10))
                # Calculate multiplier based on probability
                prob = 1.0
                for j in range(gems_revealed):
                    prob *= (safe_tiles - j) / (25 - j)
                cashout_multiplier = round(0.97 / prob, 2)
                won = True

            round_id = f"test_{datetime.now().timestamp()}_{i}"

            try:
                await self.save_round(
                    round_id=round_id,
                    mines_count=mines_count,
                    gems_revealed=gems_revealed,
                    cashout_multiplier=cashout_multiplier,
                    won=won
                )
            except ValueError as e:
                logger.warning(f"Skipping invalid test round: {e}")

            # Small delay to avoid overwhelming the database
            await asyncio.sleep(0.01)

        logger.info(f"Test data generation complete: {count} rounds created")

    async def run(
        self,
        demo_url: Optional[str] = None,
        test_mode: bool = False
    ) -> None:
        """
        Main collection loop.

        Initializes the database and starts data collection from either
        a live demo URL or generates test data.

        Args:
            demo_url: URL of the demo game to collect from.
            test_mode: If True, generate test data instead of collecting.

        Raises:
            ValueError: If neither demo_url nor test_mode is specified.
        """
        logger.info("Starting Mines collector...")

        await self.init_db()
        self.running = True

        try:
            if test_mode:
                logger.info("Running in test mode - generating test data")
                await self.generate_test_data(1000)
            elif demo_url:
                logger.info(f"Collecting from demo URL: {demo_url}")
                await self.collect_with_playwright(demo_url)
            else:
                error_msg = "No demo URL provided and not in test mode"
                logger.error(error_msg)
                raise ValueError(error_msg)
        except Exception as e:
            logger.error(f"Collection failed: {e}", exc_info=True)
            raise
        finally:
            self.running = False
            logger.info(
                f"Collector stopped. Total rounds collected: {self.rounds_collected}"
            )

    def stop(self) -> None:
        """
        Stop the collector gracefully.

        Sets the running flag to False, which will cause the collection
        loop to exit on its next iteration.
        """
        logger.info("Stop requested - collector will shut down gracefully")
        self.running = False


# =============================================================================
# Main Entry Point
# =============================================================================

async def main() -> None:
    """
    Main entry point for the collector.

    Parses command line arguments and starts the collector in either
    test mode or live collection mode.
    """
    import sys

    collector = MinesCollector()

    # Check for test mode flag
    test_mode = "--test" in sys.argv

    if test_mode:
        logger.info("Starting in test mode")
        await collector.run(test_mode=True)
    else:
        # Try to collect from Spribe demo
        demo_url = os.getenv("DEMO_URL", "https://demo.spribe.io/mines")
        logger.info(f"Starting collection from: {demo_url}")
        logger.info("Note: This may require additional configuration based on Spribe's demo structure")

        try:
            await collector.run(demo_url=demo_url)
        except KeyboardInterrupt:
            logger.info("Received keyboard interrupt")
            collector.stop()
        except Exception as e:
            logger.error(f"Collector failed: {e}", exc_info=True)
            raise


if __name__ == "__main__":
    asyncio.run(main())
