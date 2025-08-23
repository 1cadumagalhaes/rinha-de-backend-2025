import json
from collections import Counter, defaultdict
from pathlib import Path

import duckdb
import pandas as pd

BASE_DIR = Path(__file__).parent
DB_FILE = BASE_DIR / "rinha.duckdb"
HIGHLIGHTS_FILE = BASE_DIR / "highlights.json"

con = duckdb.connect(str(DB_FILE))

# --- Participants and submissions ---
total_participants = con.execute(
    "SELECT COUNT(DISTINCT provided_name) FROM tech_submissions"
).fetchone()[0]
total_submissions = con.execute("SELECT COUNT(*) FROM tech_submissions").fetchone()[0]

# --- Language and storage usage ---
languages = (
    con.execute("SELECT unnest(tech_languages) AS lang FROM tech_submissions")
    .fetchdf()["lang"]
    .dropna()
    .tolist()
)
storages = (
    con.execute("SELECT unnest(tech_storages) AS storage FROM tech_submissions")
    .fetchdf()["storage"]
    .dropna()
    .tolist()
)
runtimes = (
    con.execute("SELECT unnest(tech_runtimes) AS runtime FROM tech_submissions")
    .fetchdf()["runtime"]
    .dropna()
    .tolist()
)

lang_counter = Counter(languages)
storage_counter = Counter(storages)
runtime_counter = Counter(runtimes)

most_used_language = lang_counter.most_common(1)[0][0] if lang_counter else None
most_used_storage = storage_counter.most_common(1)[0][0] if storage_counter else None

language_distribution = dict(lang_counter)
runtime_distribution = dict(runtime_counter)

# --- Submissions over time (only those that have results) ---
# Compute merged PR dates per submission by matching repo link in PR body to submission repo
pr_dates_df = con.execute(
    """
    WITH pr_extracted AS (
        SELECT
            LOWER(regexp_extract(body, 'github.com/([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)', 1)) AS pr_repo_path,
            created_at
        FROM main_repo_prs
        WHERE merged_at IS NOT NULL
    ), ts_repos AS (
        SELECT
            submission_id,
            LOWER(
                COALESCE(
                    regexp_extract(provided_repo, 'github.com/([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)', 1),
                    NULLIF(provided_repo, '')
                )
            ) AS ts_repo_path,
            LOWER(NULLIF(detected_repo, '')) AS detected_repo_path
        FROM tech_submissions
    )
    SELECT t.submission_id, MIN(p.created_at) AS pr_date
    FROM ts_repos t
    JOIN results_final r ON r.submission_id = t.submission_id
    JOIN pr_extracted p
      ON p.pr_repo_path IS NOT NULL
     AND (p.pr_repo_path = t.ts_repo_path OR p.pr_repo_path = t.detected_repo_path)
    GROUP BY t.submission_id
    """
).fetchdf()
dates = pd.to_datetime(pr_dates_df["pr_date"], errors="coerce").dt.date.dropna()
submissions_per_day = dict(Counter(dates))

# --- First and last submission (only those that have results) ---
first_row = None
last_row = None
if not pr_dates_df.empty:
    pr_dates_df = pr_dates_df.sort_values("pr_date")
    first = pr_dates_df.iloc[0]
    last = pr_dates_df.iloc[-1]
    first_row = (first["submission_id"], first["pr_date"])  # type: ignore[index]
    last_row = (last["submission_id"], last["pr_date"])  # type: ignore[index]
first_submission = (
    {"submission_id": first_row[0], "date": str(first_row[1])} if first_row else None
)
last_submission = (
    {"submission_id": last_row[0], "date": str(last_row[1])} if last_row else None
)

# --- Top 3 total_liquido overall ---
top3_total_liquido = [
    r[0]
    for r in con.execute(
        "SELECT submission_id FROM results_final ORDER BY total_liquido DESC NULLS LAST LIMIT 3"
    ).fetchall()
]

# --- Top 3 total_liquido per language ---
top3_total_liquido_per_lang = defaultdict(list)
rows = con.execute("""
    SELECT lang, r.submission_id, r.total_liquido
    FROM results_final r
    JOIN tech_submissions t ON r.submission_id = t.submission_id
    , UNNEST(t.tech_languages) AS lang_val(lang)
    WHERE lang_val.lang IS NOT NULL
    ORDER BY lang_val.lang, r.total_liquido DESC NULLS LAST
""").fetchall()
for lang, sub_id, _ in rows:
    lang_str = lang["lang"] if isinstance(lang, dict) else lang
    if len(top3_total_liquido_per_lang[lang_str]) < 3:
        top3_total_liquido_per_lang[lang_str].append(sub_id)

# --- Top 3 p99 overall ---
top3_p99 = [
    r[0]
    for r in con.execute(
        "SELECT submission_id FROM results_final ORDER BY p99_ms ASC NULLS LAST LIMIT 3"
    ).fetchall()
]

# --- Top 3 p99 per language ---
top3_p99_per_lang = defaultdict(list)
rows = con.execute("""
    SELECT lang, r.submission_id, r.p99_ms
    FROM results_final r
    JOIN tech_submissions t ON r.submission_id = t.submission_id
    , UNNEST(t.tech_languages) AS lang_val(lang)
    WHERE lang_val.lang IS NOT NULL
    ORDER BY lang_val.lang, r.p99_ms ASC NULLS LAST
""").fetchall()
for lang, sub_id, _ in rows:
    lang_str = lang["lang"] if isinstance(lang, dict) else lang
    if len(top3_p99_per_lang[lang_str]) < 3:
        top3_p99_per_lang[lang_str].append(sub_id)

# --- Top 3 p99 overall (total_liquido > 0) ---
top3_p99_liquido = [
    r[0]
    for r in con.execute(
        "SELECT submission_id FROM results_final WHERE total_liquido > 0 ORDER BY p99_ms ASC NULLS LAST LIMIT 3"
    ).fetchall()
]

# --- Top 3 p99 per language (total_liquido > 0) ---
top3_p99_per_lang_liquido = defaultdict(list)
rows = con.execute("""
    SELECT lang, r.submission_id, r.p99_ms
    FROM results_final r
    JOIN tech_submissions t ON r.submission_id = t.submission_id
    , UNNEST(t.tech_languages) AS lang_val(lang)
    WHERE lang_val.lang IS NOT NULL AND r.total_liquido > 0
    ORDER BY lang_val.lang, r.p99_ms ASC NULLS LAST
""").fetchall()
for lang, sub_id, _ in rows:
    lang_str = lang["lang"] if isinstance(lang, dict) else lang
    if len(top3_p99_per_lang_liquido[lang_str]) < 3:
        top3_p99_per_lang_liquido[lang_str].append(sub_id)

# --- Top 3 participants with most submissions ---
rows = con.execute("""
    SELECT provided_name, COUNT(*) AS n, LIST(submission_id) AS submissions, provided_repo
    FROM tech_submissions
    GROUP BY provided_name, provided_repo
    ORDER BY n DESC, provided_name
    LIMIT 10
""").fetchall()
# Group by name, then flatten to top 3 by count
participants = defaultdict(lambda: {"count": 0, "submissions": [], "github": None})
for name, n, submissions, repo in rows:
    if name and n > participants[name]["count"]:
        github = None
        if repo and "github.com" in repo:
            github = repo.split("github.com/")[-1].split("/")[0]
        participants[name] = {"count": n, "submissions": submissions, "github": github}
top3_participants = sorted(participants.items(), key=lambda x: -x[1]["count"])[:3]
top3_participants_out = [
    {"name": name, "submissions": vals["submissions"], "github": vals["github"]}
    for name, vals in top3_participants
]

# --- Output ---
highlights = {
    "total_participants": total_participants,
    "total_submissions": total_submissions,
    "most_used_language": most_used_language,
    "most_used_storage": most_used_storage,
    "language_distribution": language_distribution,
    "runtime_distribution": runtime_distribution,
    "submissions_per_day": {str(k): v for k, v in submissions_per_day.items()},
    "first_submission": first_submission,
    "last_submission": last_submission,
    "top3_total_liquido": top3_total_liquido,
    "top3_total_liquido_per_language": dict(top3_total_liquido_per_lang),
    "top3_p99": top3_p99,
    "top3_p99_per_language": dict(top3_p99_per_lang),
    "top3_p99_liquido": top3_p99_liquido,
    "top3_p99_per_language_liquido": dict(top3_p99_per_lang_liquido),
    "top3_participants_most_submissions": top3_participants_out,
}

with open(HIGHLIGHTS_FILE, "w", encoding="utf-8") as f:
    json.dump(highlights, f, ensure_ascii=False, indent=2)

print(f"Wrote {HIGHLIGHTS_FILE}")
