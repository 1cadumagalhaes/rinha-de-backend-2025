# Data (DuckDB) schema and usage

This folder builds a DuckDB database from the JSON sources for SQL analysis.

## Generate/update the DB file

- Create/update `rinha.duckdb`:

```bash
uv run python data/main.py
```

- Connect and explore quickly:

```bash
uv run python data/analysis.py
```

## Tables

All tables use `submission_id` as the join key.

### commits
- submission_id TEXT
- first_commit TIMESTAMP
- last_commit TIMESTAMP
- commits_count INTEGER (nullable)

### tech_submissions
- submission_id TEXT
- provided_name TEXT (comma-joined if an array)
- provided_social LIST<VARCHAR>
- provided_repo TEXT (first element if an array)
- provided_langs LIST<VARCHAR>
- provided_storages LIST<VARCHAR>
- provided_messaging LIST<VARCHAR>
- provided_load_balancers LIST<VARCHAR>
- provided_other_technologies LIST<VARCHAR>
- detected_repo TEXT
- detected_default_branch TEXT
- detected_commits_count INTEGER (nullable)
- detected_first_commit_date TIMESTAMP
- detected_last_commit_date TIMESTAMP
- tech_languages LIST<VARCHAR>
- tech_runtimes LIST<VARCHAR>
- tech_storages LIST<VARCHAR>
- tech_messaging LIST<VARCHAR>
- tech_load_balancers LIST<VARCHAR>
- tech_frameworks LIST<VARCHAR>
- tech_libraries LIST<VARCHAR>
- note TEXT (nullable)

### results_final
Same schema as `results_partial`.
- submission_id TEXT
- erro_na_execucao BOOLEAN
- timestamp TIMESTAMP
- total_liquido DOUBLE
- total_bruto DOUBLE
- total_taxas DOUBLE
- p99_valor_text TEXT
- p99_bonus_text TEXT
- p99_max_requests_text TEXT
- p99_ms DOUBLE (parsed from p99_valor_text like "2.54ms")
- p99_bonus_pct DOUBLE (parsed from p99_bonus_text like "17%")
- p99_max_requests INTEGER
- multa_porcentagem DOUBLE
- multa_total DOUBLE
- multa_num_inconsistencias INTEGER
- caixa_dois_detectado BOOLEAN
- lag_num_pagamentos_total INTEGER
- lag_num_pagamentos_solicitados INTEGER
- lag INTEGER
- pagamentos_solicitados_qtd_sucesso INTEGER
- pagamentos_solicitados_qtd_falha INTEGER
- prd_total_bruto DOUBLE
- prd_num_pagamentos INTEGER
- prd_total_taxas DOUBLE
- prf_total_bruto DOUBLE
- prf_num_pagamentos INTEGER
- prf_total_taxas DOUBLE

### results_partial
- Same columns as `results_final`.

## Views

### tech_submissions_exploded
One row per technology per category.
- submission_id TEXT
- category TEXT (one of: languages, runtimes, storages, messaging, load_balancers, frameworks, libraries)
- technology TEXT

## Quick examples

- Top 10 by score with languages:
```sql
SELECT rf.submission_id, rf.total_liquido, rf.p99_ms, ts.provided_name, ts.detected_repo, ts.tech_languages
FROM results_final rf
LEFT JOIN tech_submissions ts USING (submission_id)
ORDER BY rf.total_liquido DESC NULLS LAST
LIMIT 10;
```

- Count technologies (exploded):
```sql
SELECT category, technology, COUNT(*) AS n
FROM tech_submissions_exploded
GROUP BY 1,2
ORDER BY n DESC
LIMIT 20;
```