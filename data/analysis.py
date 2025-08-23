# %% Imports & connect
from __future__ import annotations

from pathlib import Path

import duckdb
import pandas as pd

BASE_DIR = Path(__file__).parent
DB_FILE = BASE_DIR / "rinha.duckdb"

con = duckdb.connect(str(DB_FILE))
print(f"Connected to {DB_FILE}")


# %% Show available tables
print(con.execute("SHOW TABLES").fetchdf())


# %% Helper: quick DataFrame query function
def q(sql: str) -> pd.DataFrame:
    """Run a SQL query against the DuckDB file and return a DataFrame."""
    return con.execute(sql).fetchdf()


# %% Examples (uncomment to run)

commits = q("SELECT * from commits order by last_commit desc")
commits

# %%
