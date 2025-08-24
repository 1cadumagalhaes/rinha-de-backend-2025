import json
from pathlib import Path

import duckdb
import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).parent
TECH_FILE = BASE_DIR / "tech.json"
COMMITS_FILE = BASE_DIR / "commits.json"
RESULTS_FINAL_FILE = BASE_DIR / "resultados-finais+participantes-info-ordered.json"
DB_FILE = BASE_DIR / "rinha.duckdb"

con = duckdb.connect(str(DB_FILE))


# Ensure tables are built (reuse your main.py logic)
def ensure_tables():
    from main import build_tables

    build_tables()


def get_github_username(repo_url):
    if not repo_url:
        return None
    # Handles both string and list
    if isinstance(repo_url, list):
        repo_url = repo_url[0] if repo_url else None
    if not repo_url:
        return None
    # Extract username from URL
    try:
        parts = repo_url.split("github.com/")
        if len(parts) > 1:
            user = parts[1].split("/")[0]
            return user
    except Exception:
        pass
    return None


def to_list(val):
    """Convert duckdb/pandas/numpy list-like column values into a plain Python list.
    Returns [] for None/NaN. Wrap scalars (including strings) in a single-item list.
    """
    if val is None:
        return []
    # Avoid pd.isna on arrays; only use on scalars
    try:
        if np.isscalar(val):
            try:
                if pd.isna(val):
                    return []
            except Exception:
                pass
            return [val]
    except Exception:
        pass
    # numpy or pandas arrays
    if isinstance(val, np.ndarray):
        return val.tolist()
    if hasattr(val, "to_list"):
        try:
            return val.to_list()
        except Exception:
            pass
    if hasattr(val, "tolist"):
        try:
            return val.tolist()
        except Exception:
            pass
    if isinstance(val, (list, tuple, set)):
        return list(val)
    # strings should be treated as scalar single item
    if isinstance(val, (str, bytes)):
        return [val]
    # Fallback: try iterating
    try:
        return list(val)
    except Exception:
        return [val]


def py(val):
    """Convert pandas/NumPy scalars and NA to JSON-serializable Python types.
    - pd.NA/NaN -> None
    - numpy scalar -> Python scalar
    - pandas Timestamp -> ISO string
    """
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except Exception:
        pass
    if isinstance(val, np.generic):
        try:
            return val.item()
        except Exception:
            pass
    # pandas Timestamp
    if val.__class__.__name__ == "Timestamp":
        try:
            return val.isoformat()
        except Exception:
            return str(val)
    return val


def build_tags(row):
    tags = []
    for col in [
        "provided_langs",
        "provided_storages",
        "provided_messaging",
        "provided_load_balancers",
        "provided_other_technologies",
    ]:
        val = row[col] if col in row else None
        tags.extend(to_list(val))
    return tags


def main():
    ensure_tables()
    # Compute ranks
    con.execute("""
        CREATE OR REPLACE TABLE ranked AS
        SELECT *,
            RANK() OVER (ORDER BY total_liquido DESC NULLS LAST) AS rank,
            RANK() OVER (ORDER BY p99_ms ASC NULLS LAST) AS performance_rank
        FROM results_final
    """)
    # Join all info
    query = """
    SELECT
        r.submission_id,
        t.provided_repo,
    -- first PR date where PR matches repo or looks like a submission by the same github user
    p.first_pr_date,
        COALESCE(c.commits_count, t.detected_commits_count) AS commits_count,
        COALESCE(c.first_commit, t.detected_first_commit_date) AS first_commit,
        COALESCE(c.last_commit, t.detected_last_commit_date) AS last_commit,
        r.rank,
        r.performance_rank,
        t.provided_name,
        t.provided_social,
        t.provided_langs,
        t.provided_storages,
        t.provided_messaging,
        t.provided_load_balancers,
        t.provided_other_technologies,
        t.tech_languages,
        t.tech_runtimes,
        t.tech_storages,
        t.tech_messaging,
        t.tech_load_balancers,
        t.tech_frameworks,
        t.tech_libraries,
        r.total_liquido,
        r.total_bruto,
        r.total_taxas,
        r.multa_total,
        r.multa_porcentagem,
        r.p99_ms,
        r.p99_max_requests,
        r.lag_num_pagamentos_solicitados,
        r.lag,
        r.pagamentos_solicitados_qtd_falha,
        r.multa_num_inconsistencias,
        r.caixa_dois_detectado,
        r.prd_total_bruto,
        r.prd_num_pagamentos,
        r.prd_total_taxas,
        r.prf_total_bruto,
        r.prf_total_taxas,
        r.prf_num_pagamentos
    FROM ranked r
    LEFT JOIN tech_submissions t ON r.submission_id = t.submission_id
    LEFT JOIN commits c ON r.submission_id = c.submission_id
        LEFT JOIN (
            -- For each submission, find the earliest PR that likely represents the submission.
            -- Only consider PRs created after the first valid submission (PR #21 on July 9, 2025)
            SELECT r.submission_id, MIN(m.created_at) AS first_pr_date
            FROM tech_submissions r
            JOIN main_repo_prs m ON (
                -- 1) PR references the repo in its body or html_url
                LOWER(COALESCE(regexp_extract(m.body, 'github.com/([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)', 1), regexp_extract(m.html_url, 'github.com/([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)', 1))) = LOWER(COALESCE(regexp_extract(r.provided_repo, 'github.com/([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)', 1), regexp_extract(r.detected_repo, '([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)', 1)))
                -- OR 2) PR title/body contains 'submiss' and PR author matches the repo owner (username)
                OR (
                    (LOWER(COALESCE(m.title, '')) LIKE '%submiss%' OR LOWER(COALESCE(m.body, '')) LIKE '%submiss%')
                    AND LOWER(m.author_login) = LOWER(regexp_extract(COALESCE(r.provided_repo, r.detected_repo, ''), 'github.com/([A-Za-z0-9_.-]+)/', 1))
                )
            )
            WHERE m.created_at IS NOT NULL
            -- Filter to only valid submission PRs (after July 9, 2025, 20:30:44 and PR >= 21)
            AND m.created_at >= '2025-07-09T20:30:44Z'
            AND m.number >= 21
            GROUP BY r.submission_id
        ) p ON p.submission_id = t.submission_id
    """
    df = con.execute(query).fetchdf()
    # Normalize NA to None to simplify JSON serialization
    df = df.where(pd.notna(df), None)
    # Count submissions per user (by name)
    name_counts = df["provided_name"].value_counts().to_dict()
    submissions = []
    for _, row in df.iterrows():
        repo = row["provided_repo"]
        github = get_github_username(repo)

        submission = {
            "submission_id": row["submission_id"],
            "source_code_repo": repo,
            "commits_count": py(row["commits_count"]),
            "first_commit": py(row["first_commit"]),
            "last_commit": py(row["last_commit"]),
            "first_pr": py(row["first_pr_date"]),
            "rank": int(row["rank"]) if pd.notnull(row["rank"]) else None,
            "performance_rank": int(row["performance_rank"])
            if pd.notnull(row["performance_rank"])
            else None,
            "user": {
                "name": py(row["provided_name"]),
                "socials": to_list(row["provided_social"]),
                "github": github,
                "github_profile_pic": None,  # Optional: fill with API if needed
                "num_submissions": name_counts.get(row["provided_name"], 1),
            },
            "tech_stack": {
                "languages": to_list(row["tech_languages"]),
                "runtimes": to_list(row["tech_runtimes"]),
                "storages": to_list(row["tech_storages"]),
                "messaging": to_list(row["tech_messaging"]),
                "load_balancers": to_list(row["tech_load_balancers"]),
                "others": to_list(row["tech_frameworks"])
                + to_list(row["tech_libraries"]),
                "tags": build_tags(row),
            },
            "results": {
                "financeiro": {
                    "total_liquido": py(row["total_liquido"]),
                    "total_bruto": py(row["total_bruto"]),
                    "total_taxas": py(row["total_taxas"]),
                    "multa_total": py(row["multa_total"]),
                    "multa_porcentagem": py(row["multa_porcentagem"]),
                    "bonus": None,  # Can be filled if needed
                    "caixa_dois": py(row["caixa_dois_detectado"]),
                },
                "performance": {
                    "p99": py(row["p99_ms"]),
                    "max_requests": py(row["p99_max_requests"]),
                    "num_pagamentos_solicitados": py(
                        row["lag_num_pagamentos_solicitados"]
                    ),
                    "lag": py(row["lag"]),
                    "num_pagamentos_falha": py(row["pagamentos_solicitados_qtd_falha"]),
                    "num_inconsistencias": py(row["multa_num_inconsistencias"]),
                },
                "pagamentos": {
                    "default_total_bruto": py(row["prd_total_bruto"]),
                    "default_num_pagamentos": py(row["prd_num_pagamentos"]),
                    "default_total_taxas": py(row["prd_total_taxas"]),
                    "fallback_total_bruto": py(row["prf_total_bruto"]),
                    "fallback_total_taxas": py(row["prf_total_taxas"]),
                    "fallback_num_pagamentos": py(row["prf_num_pagamentos"]),
                },
            },
        }
        submissions.append(submission)
    # Write to file
    with open(BASE_DIR / "submissions.json", "w", encoding="utf-8") as f:
        json.dump(submissions, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(submissions)} submissions to submissions.json")


if __name__ == "__main__":
    main()
