import json
from pathlib import Path


def normalize_storage(name):
    if not isinstance(name, str):
        return name
    n = name.lower()
    if "redis" in n:
        return "redis"
    if "postgres" in n:
        return "postgresql"
    if "sqlite" in n:
        return "sqlite"
    if "mysql" in n:
        return "mysql"
    if "mariadb" in n:
        return "mariadb"
    if "mongodb" in n or "mongo" in n:
        return "mongodb"
    if "oracle" in n:
        return "oracle"
    if "firebird" in n:
        return "firebird"
    if "dynamodb" in n:
        return "dynamodb"
    if "cassandra" in n:
        return "cassandra"
    if "cockroach" in n:
        return "cockroachdb"
    if "elasticsearch" in n:
        return "elasticsearch"
    if "neo4j" in n:
        return "neo4j"
    if "h2" == n or "h2db" in n:
        return "h2"
    # fallback: return original
    return name


def clean_storages(storages):
    if not storages:
        return storages
    return sorted(set(normalize_storage(s) for s in storages if s))


def process_submission(sub):
    # Provided
    if "provided" in sub and isinstance(sub["provided"], dict):
        if "storages" in sub["provided"]:
            sub["provided"]["storages"] = clean_storages(sub["provided"]["storages"])
    # Detected
    if "detected" in sub and isinstance(sub["detected"], dict):
        tech = sub["detected"].get("technologies")
        if tech and "storages" in tech:
            tech["storages"] = clean_storages(tech["storages"])
    return sub


def main():
    path = Path(__file__).parent / "tech.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    for i, sub in enumerate(data.get("submissions", [])):
        data["submissions"][i] = process_submission(sub)
    out_path = Path(__file__).parent / "tech.cleaned.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Wrote cleaned tech file to {out_path}")


if __name__ == "__main__":
    main()
