from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

import duckdb
import pandas as pd

BASE_DIR = Path(__file__).parent

TECH_FILE = BASE_DIR / "tech.json"
COMMITS_FILE = BASE_DIR / "commits.json"
RESULTS_FINAL_FILE = BASE_DIR / "resultados-finais+participantes-info-ordered.json"
RESULTS_PARTIAL_FILE = BASE_DIR / "previa-resultados+participantes-info.json"
MAIN_REPO_PRS_FILE = BASE_DIR / "main_repo_prs.json"

# Persist to a file for reuse in notebooks / other scripts
DB_FILE = BASE_DIR / "rinha.duckdb"
con = duckdb.connect(str(DB_FILE))


def ensure_list(val: Any) -> List[Any]:
    if val is None:
        return []
    if isinstance(val, list):
        return val
    # name can be string; social can be string; normalize to single-item list
    return [val]


def join_names(name_field: Any) -> str:
    # Name can be string or list -> join with comma
    if name_field is None:
        return ""
    if isinstance(name_field, list):
        return ", ".join([str(x) for x in name_field])
    return str(name_field)


def first_or_str(val: Any) -> str:
    # For repo fields where value may be array or string
    if val is None:
        return ""
    if isinstance(val, list):
        return str(val[0]) if val else ""
    return str(val)


def parse_ms(s: Optional[str]) -> Optional[float]:
    if s is None:
        return None
    try:
        s = s.strip().lower().replace("ms", "")
        return float(s)
    except Exception:
        return None


def parse_pct(s: Optional[str]) -> Optional[float]:
    if s is None:
        return None
    try:
        s = s.strip().replace("%", "")
        return float(s)
    except Exception:
        return None


def parse_int_str(s: Optional[str]) -> Optional[int]:
    if s is None:
        return None
    try:
        return int(str(s).strip())
    except Exception:
        return None


def to_timestamp_series(series: pd.Series) -> pd.Series:
    # Convert to pandas datetime and drop timezone to align with DuckDB TIMESTAMP (no TZ)
    dt = pd.to_datetime(series, errors="coerce", utc=True)
    return dt.dt.tz_convert(None)


def load_commits(path: Path) -> pd.DataFrame:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    rows = []
    for submission_id, payload in data.items():
        rows.append({
            "submission_id": submission_id,
            "first_commit": payload.get("first_commit"),
            "last_commit": payload.get("last_commit"),
            "commits_count": payload.get("commits_count"),
        })
    df = pd.DataFrame(rows)
    if not df.empty:
        df["first_commit"] = to_timestamp_series(df["first_commit"])  # type: ignore[index]
        df["last_commit"] = to_timestamp_series(df["last_commit"])  # type: ignore[index]
        df["commits_count"] = pd.to_numeric(
            df["commits_count"], errors="coerce"
        ).astype("Int64")
    return df


def load_tech(path: Path) -> pd.DataFrame:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    submissions = data.get("submissions", []) or []

    rows = []
    for item in submissions:
        submission_id = item.get("participant")
        detected = item.get("detected") or {}
        provided = item.get("provided") or {}
        note = item.get("note")

        tech = detected.get("technologies") or {}

        rows.append({
            "submission_id": submission_id,
            # provided
            "provided_name": join_names(provided.get("name")),
            "provided_social": ensure_list(provided.get("social")),
            "provided_repo": first_or_str(provided.get("source-code-repo")),
            "provided_langs": ensure_list(provided.get("langs")),
            "provided_storages": ensure_list(provided.get("storages")),
            "provided_messaging": ensure_list(provided.get("messaging")),
            "provided_load_balancers": ensure_list(provided.get("load-balancers")),
            "provided_other_technologies": ensure_list(
                provided.get("other-technologies")
            ),
            # detected (ignore relevant_files and languages dict per guidance)
            "detected_repo": detected.get("repo") or "",
            "detected_default_branch": detected.get("default_branch") or "",
            "detected_commits_count": detected.get("commits_count"),
            "detected_first_commit_date": detected.get("first_commit_date"),
            "detected_last_commit_date": detected.get("last_commit_date"),
            # technologies (LIST columns)
            "tech_languages": ensure_list(tech.get("languages")),
            "tech_runtimes": ensure_list(tech.get("runtimes")),
            "tech_storages": ensure_list(tech.get("storages")),
            "tech_messaging": ensure_list(tech.get("messaging")),
            "tech_load_balancers": ensure_list(tech.get("load_balancers")),
            "tech_frameworks": ensure_list(tech.get("frameworks")),
            "tech_libraries": ensure_list(tech.get("libraries")),
            # misc
            "note": note,
        })

    df = pd.DataFrame(rows)
    if not df.empty:
        df["detected_commits_count"] = pd.to_numeric(
            df["detected_commits_count"], errors="coerce"
        ).astype("Int64")
        df["detected_first_commit_date"] = to_timestamp_series(
            df["detected_first_commit_date"]
        )  # type: ignore[index]
        df["detected_last_commit_date"] = to_timestamp_series(
            df["detected_last_commit_date"]
        )  # type: ignore[index]
    return df


def _flatten_result_entry(entry: Dict[str, Any], key: str) -> Dict[str, Any]:
    r = entry.get(key) or {}
    # Scalars
    out: Dict[str, Any] = {
        "submission_id": r.get("participante"),
        "erro_na_execucao": bool(entry.get("erro_na_execucao", False)),
        "timestamp": r.get("timestamp"),
        "total_liquido": r.get("total_liquido"),
        "total_bruto": r.get("total_bruto"),
        "total_taxas": r.get("total_taxas"),
    }
    # p99
    p99 = r.get("p99") or {}
    out.update({
        "p99_valor_text": p99.get("valor"),
        "p99_bonus_text": p99.get("bonus"),
        "p99_max_requests_text": p99.get("max_requests"),
        "p99_ms": parse_ms(p99.get("valor")),
        "p99_bonus_pct": parse_pct(p99.get("bonus")),
        "p99_max_requests": parse_int_str(p99.get("max_requests")),
    })
    # multa
    multa = r.get("multa") or {}
    comp = multa.get("composicao") or {}
    out.update({
        "multa_porcentagem": multa.get("porcentagem"),
        "multa_total": multa.get("total"),
        "multa_num_inconsistencias": comp.get("num_inconsistencias"),
    })
    # caixa_dois
    caixa = r.get("caixa_dois") or {}
    out["caixa_dois_detectado"] = bool(caixa.get("detectado", False))
    # lag
    lag = r.get("lag") or {}
    out.update({
        "lag_num_pagamentos_total": lag.get("num_pagamentos_total"),
        "lag_num_pagamentos_solicitados": lag.get("num_pagamentos_solicitados"),
        "lag": lag.get("lag"),
    })
    # pagamentos_solicitados
    ps = r.get("pagamentos_solicitados") or {}
    out.update({
        "pagamentos_solicitados_qtd_sucesso": ps.get("qtd_sucesso"),
        "pagamentos_solicitados_qtd_falha": ps.get("qtd_falha"),
    })
    # pagamentos_realizados_default
    prd = r.get("pagamentos_realizados_default") or {}
    out.update({
        "prd_total_bruto": prd.get("total_bruto"),
        "prd_num_pagamentos": prd.get("num_pagamentos"),
        "prd_total_taxas": prd.get("total_taxas"),
    })
    # pagamentos_realizados_fallback
    prf = r.get("pagamentos_realizados_fallback") or {}
    out.update({
        "prf_total_bruto": prf.get("total_bruto"),
        "prf_num_pagamentos": prf.get("num_pagamentos"),
        "prf_total_taxas": prf.get("total_taxas"),
    })
    return out


def load_results(path: Path, key: str) -> pd.DataFrame:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    rows = [_flatten_result_entry(entry, key) for entry in data]
    df = pd.DataFrame(rows)
    if not df.empty:
        # Types
        numeric_cols = [
            "total_liquido",
            "total_bruto",
            "total_taxas",
            "p99_ms",
            "p99_bonus_pct",
            "p99_max_requests",
            "multa_porcentagem",
            "multa_total",
            "multa_num_inconsistencias",
            "lag_num_pagamentos_total",
            "lag_num_pagamentos_solicitados",
            "lag",
            "pagamentos_solicitados_qtd_sucesso",
            "pagamentos_solicitados_qtd_falha",
            "prd_total_bruto",
            "prd_num_pagamentos",
            "prd_total_taxas",
            "prf_total_bruto",
            "prf_num_pagamentos",
            "prf_total_taxas",
        ]
        for c in numeric_cols:
            if c in df.columns:
                df[c] = pd.to_numeric(df[c], errors="coerce")

        df["timestamp"] = to_timestamp_series(df["timestamp"])  # type: ignore[index]
        df["erro_na_execucao"] = df["erro_na_execucao"].astype(bool)
    return df


def load_main_repo_prs(path: Path) -> pd.DataFrame:
    """Load PRs from the main repo if the JSON file exists.

    Returns a DataFrame with: author_login, created_at, number, state, merged_at, closed_at, title, html_url, body.
    """
    if not path.exists():
        return pd.DataFrame(
            columns=[
                "author_login",
                "created_at",
                "number",
                "state",
                "merged_at",
                "closed_at",
                "title",
                "html_url",
                "body",
            ]
        )
    with path.open("r", encoding="utf-8") as f:
        items = json.load(f)
    rows = []
    for pr in items:
        user = pr.get("user") or {}
        rows.append({
            "author_login": user.get("login"),
            "created_at": pr.get("created_at"),
            "number": pr.get("number"),
            "state": pr.get("state"),
            "merged_at": pr.get("merged_at"),
            "closed_at": pr.get("closed_at"),
            "title": pr.get("title"),
            "html_url": pr.get("html_url"),
            "body": pr.get("body"),
        })
    df = pd.DataFrame(rows)
    if not df.empty:
        df["created_at"] = to_timestamp_series(df["created_at"])  # type: ignore[index]
        df["merged_at"] = to_timestamp_series(df["merged_at"])  # type: ignore[index]
        df["closed_at"] = to_timestamp_series(df["closed_at"])  # type: ignore[index]
    return df


def build_tables() -> None:
    # Load DataFrames
    commits_df = load_commits(COMMITS_FILE)
    tech_df = load_tech(TECH_FILE)
    results_final_df = load_results(RESULTS_FINAL_FILE, "resultado_final")
    prs_df = load_main_repo_prs(MAIN_REPO_PRS_FILE)

    # Register as DuckDB tables (preserves LIST columns from Python lists)
    con.register("commits_df", commits_df)
    con.register("tech_df", tech_df)
    con.register("results_final_df", results_final_df)
    con.register("main_repo_prs_df", prs_df)

    con.execute("CREATE OR REPLACE TABLE commits AS SELECT * FROM commits_df")
    con.execute("CREATE OR REPLACE TABLE tech_submissions AS SELECT * FROM tech_df")
    con.execute(
        "CREATE OR REPLACE TABLE results_final AS SELECT * FROM results_final_df"
    )
    con.execute(
        "CREATE OR REPLACE TABLE main_repo_prs AS SELECT * FROM main_repo_prs_df"
    )

    # Optional: create a view to UNNEST technologies when needed (no separate table required)
    con.execute(
        """
        CREATE OR REPLACE VIEW tech_submissions_exploded AS
        SELECT submission_id, 'languages' AS category, technology
        FROM tech_submissions, UNNEST(tech_languages) AS t(technology)
        UNION ALL
        SELECT submission_id, 'runtimes' AS category, technology
        FROM tech_submissions, UNNEST(tech_runtimes) AS t(technology)
        UNION ALL
        SELECT submission_id, 'storages' AS category, technology
        FROM tech_submissions, UNNEST(tech_storages) AS t(technology)
        UNION ALL
        SELECT submission_id, 'messaging' AS category, technology
        FROM tech_submissions, UNNEST(tech_messaging) AS t(technology)
        UNION ALL
        SELECT submission_id, 'load_balancers' AS category, technology
        FROM tech_submissions, UNNEST(tech_load_balancers) AS t(technology)
        UNION ALL
        SELECT submission_id, 'frameworks' AS category, technology
        FROM tech_submissions, UNNEST(tech_frameworks) AS t(technology)
        UNION ALL
        SELECT submission_id, 'libraries' AS category, technology
        FROM tech_submissions, UNNEST(tech_libraries) AS t(technology)
        """
    )

    # No views here: keep main focused on reading files and creating tables only.

    # Indexes to speed up joins, filters and ordering
    # Note: DuckDB supports CREATE INDEX on persistent tables since 0.7+. Use deterministic names and drop if exists.
    con.execute("DROP INDEX IF EXISTS idx_commits_submission_id")
    con.execute("CREATE INDEX idx_commits_submission_id ON commits(submission_id)")

    con.execute("DROP INDEX IF EXISTS idx_tech_submission_id")
    con.execute(
        "CREATE INDEX idx_tech_submission_id ON tech_submissions(submission_id)"
    )
    con.execute("DROP INDEX IF EXISTS idx_tech_first_commit_date")
    con.execute(
        "CREATE INDEX idx_tech_first_commit_date ON tech_submissions(detected_first_commit_date)"
    )

    con.execute("DROP INDEX IF EXISTS idx_results_final_submission_id")
    con.execute(
        "CREATE INDEX idx_results_final_submission_id ON results_final(submission_id)"
    )
    con.execute("DROP INDEX IF EXISTS idx_results_final_total_liquido")
    con.execute(
        "CREATE INDEX idx_results_final_total_liquido ON results_final(total_liquido)"
    )
    con.execute("DROP INDEX IF EXISTS idx_results_final_p99_ms")
    con.execute("CREATE INDEX idx_results_final_p99_ms ON results_final(p99_ms)")

    # Indexes for PRs
    con.execute("DROP INDEX IF EXISTS idx_prs_author_login")
    con.execute("CREATE INDEX idx_prs_author_login ON main_repo_prs(author_login)")
    con.execute("DROP INDEX IF EXISTS idx_prs_created_at")
    con.execute("CREATE INDEX idx_prs_created_at ON main_repo_prs(created_at)")
    con.execute("DROP INDEX IF EXISTS idx_prs_merged_at")
    con.execute("CREATE INDEX idx_prs_merged_at ON main_repo_prs(merged_at)")

    # Note: results_partial is not created here; indexes omitted intentionally


def example_queries() -> None:
    # Simple sanity checks
    print("commits rows:", con.execute("SELECT COUNT(*) FROM commits").fetchone()[0])
    print(
        "tech rows:", con.execute("SELECT COUNT(*) FROM tech_submissions").fetchone()[0]
    )
    print(
        "results_final rows:",
        con.execute("SELECT COUNT(*) FROM results_final").fetchone()[0],
    )
    try:
        print(
            "main_repo_prs rows:",
            con.execute("SELECT COUNT(*) FROM main_repo_prs").fetchone()[0],
        )
    except Exception:
        pass
    # results_partial table may not be present
    try:
        cnt = con.execute("SELECT COUNT(*) FROM results_partial").fetchone()[0]
        print("results_partial rows:", cnt)
    except Exception:
        pass

    # Join example: score + tech summary
    query = """
	SELECT rf.submission_id,
		   rf.total_liquido,
		   rf.p99_ms,
		   ts.provided_name,
		   ts.detected_repo,
		   ts.tech_languages
	FROM results_final rf
	LEFT JOIN tech_submissions ts USING (submission_id)
	ORDER BY rf.total_liquido DESC NULLS LAST
	LIMIT 10
	"""
    top10 = con.execute(query).fetchdf()
    print("Top 10 by total_liquido (with tech):")
    print(top10)


if __name__ == "__main__":
    build_tables()
    example_queries()
