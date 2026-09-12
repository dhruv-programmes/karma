"""Keep API tests isolated from the developer's local demo database."""
from __future__ import annotations

import os
import tempfile
from pathlib import Path


# Settings are imported by the application modules in the individual tests.
# Point them at a fresh, per-pytest SQLite file before those imports happen so
# receipt idempotency keys and demo balances cannot leak from a prior test run
# (or from the locally running app) into this suite.
_TEST_DB_PATH = Path(tempfile.gettempdir()) / f"carbon_loop_pytest_{os.getpid()}.db"
for suffix in ("", "-shm", "-wal"):
    _TEST_DB_PATH.with_name(_TEST_DB_PATH.name + suffix).unlink(missing_ok=True)
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB_PATH}"
