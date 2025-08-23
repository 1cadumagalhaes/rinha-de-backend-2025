import json
import os
from pathlib import Path
from typing import Any, Dict, List

import requests

BASE_DIR = Path(__file__).parent
OUT_FILE = BASE_DIR / "main_repo_prs.json"


def fetch_all_prs(owner: str, repo: str, state: str = "all") -> List[Dict[str, Any]]:
    """
    Fetch all PRs from a GitHub repository using REST API v3 with pagination.

    Respects optional GITHUB_TOKEN env var for higher rate limits.
    """
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    session = requests.Session()
    session.headers.update(headers)

    url = f"https://api.github.com/repos/{owner}/{repo}/pulls"
    per_page = 100
    page = 1
    all_prs: List[Dict[str, Any]] = []
    while True:
        resp = session.get(
            url, params={"state": state, "per_page": per_page, "page": page}, timeout=30
        )
        resp.raise_for_status()
        items = resp.json()
        if not items:
            break
        # Keep only useful fields to keep the output light
        for pr in items:
            all_prs.append({
                "number": pr.get("number"),
                "title": pr.get("title"),
                "state": pr.get("state"),
                "created_at": pr.get("created_at"),
                "merged_at": pr.get("merged_at"),
                "closed_at": pr.get("closed_at"),
                "user": {"login": (pr.get("user") or {}).get("login")},
                "head": {
                    "ref": ((pr.get("head") or {}).get("ref")),
                    "repo_full_name": (
                        ((pr.get("head") or {}).get("repo") or {}).get("full_name")
                    ),
                },
                "body": pr.get("body"),
                "html_url": pr.get("html_url"),
            })
        page += 1

    return all_prs


def main() -> None:
    owner = "zanfranceschi"
    repo = "rinha-de-backend-2025"
    prs = fetch_all_prs(owner, repo, state="all")
    OUT_FILE.write_text(json.dumps(prs, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_FILE} with {len(prs)} PRs")


if __name__ == "__main__":
    main()
