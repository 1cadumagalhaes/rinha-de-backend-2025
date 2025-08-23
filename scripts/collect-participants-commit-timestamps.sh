#!/usr/bin/env bash
set -euo pipefail

# Scans participantes/* folders and writes a JSON map with first and last commit timestamps
# Output: participants_first_commit_timestamps.json at repository root

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$REPO_ROOT/participants_first_commit_timestamps.json"

echo "Writing commit timestamps to: $OUT"

printf '{\n' > "$OUT"
first_entry=true

for d in "$REPO_ROOT"/participantes/*; do
  [ -d "$d" ] || continue
  name=$(basename "$d")

  # first commit touching this path (oldest) excluding commits authored by 'rinha'
  first_line=$(git -C "$REPO_ROOT" log --format='%aI %an <%ae>' --reverse -- "$d" 2>/dev/null | grep -i -v 'rinha' | sed -n '1p' || true)
  first_date=$(printf '%s' "$first_line" | awk '{print $1}' || true)
  # last commit touching this path (newest) excluding commits authored by 'rinha'
  last_line=$(git -C "$REPO_ROOT" log --format='%aI %an <%ae>' -- "$d" 2>/dev/null | grep -i -v 'rinha' | sed -n '1p' || true)
  last_date=$(printf '%s' "$last_line" | awk '{print $1}' || true)

  # commits count excluding commits authored by 'rinha'
  commit_count=$(git -C "$REPO_ROOT" log --format='%H %an <%ae>' -- "$d" 2>/dev/null | grep -i -v 'rinha' | wc -l | tr -d ' ' || true)
  # normalize empty -> 0
  if [ -z "$commit_count" ]; then
    commit_count=0
  fi

  if [ -z "$first_date" ]; then
    first_val=null
  else
    # escape any double quotes just in case (shouldn't exist in ISO dates)
    first_val="\"${first_date}\""
  fi

  if [ -z "$last_date" ]; then
    last_val=null
  else
    last_val="\"${last_date}\""
  fi

  if [ "$first_entry" = true ]; then
    first_entry=false
  else
    printf ',\n' >> "$OUT"
  fi

  printf '  "%s": {"first_commit": %s, "last_commit": %s, "commits_count": %s}' "$name" "$first_val" "$last_val" "$commit_count" >> "$OUT"
done

printf '\n}\n' >> "$OUT"

echo "Done. Output: $OUT"
