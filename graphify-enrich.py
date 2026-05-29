"""
Post-build enrichment for graphify.
Greps the codebase for TODO/FIXME/BUG/hardcoded issues and injects them
as "rationale" nodes into graphify-out/graph.json so that
`graphify query "broken"` returns real code issues.

Usage:
    python graphify-enrich.py
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent
GRAPH_PATH = ROOT / "graphify-out" / "graph.json"

# Patterns to search for
PATTERNS = [
    (r"#\s*(TODO|FIXME|HACK|BUG|XXX)[:\s]+(.*)", "issue"),
    (r"raise NotImplementedError\((.*?)\)", "unimplemented"),
    (r'(https?://[a-z0-9.-]*dograh[a-z0-9.-]*[^\s"\']*)', "hardcoded_url"),
    (r'"([A-Z_]*(?:SECRET|KEY|TOKEN|PASSWORD)[A-Z_]*)"\s*[,)]', "hardcoded_secret_ref"),
]

SEARCH_DIRS = ["api", "ui/src/app", "ui/src/components", "ui/src/hooks", "ui/src/context"]
SEARCH_EXTS = [".py", ".ts", ".tsx"]
SKIP_DIRS = {"__pycache__", "node_modules", ".next", "alembic/versions"}


def _make_id(text: str) -> str:
    return re.sub(r"[^a-z0-9_]", "_", text.lower())[:60].strip("_")


def collect_issues() -> list[dict]:
    issues = []
    for dir_name in SEARCH_DIRS:
        search_path = ROOT / dir_name
        if not search_path.exists():
            continue
        for ext in SEARCH_EXTS:
            for fpath in search_path.rglob(f"*{ext}"):
                # Skip noise dirs
                if any(skip in fpath.parts for skip in SKIP_DIRS):
                    continue
                try:
                    lines = fpath.read_text(encoding="utf-8", errors="replace").splitlines()
                except OSError:
                    continue
                for lineno, line in enumerate(lines, 1):
                    for pattern, kind in PATTERNS:
                        m = re.search(pattern, line, re.IGNORECASE)
                        if not m:
                            continue
                        tag = m.group(1).upper() if kind == "issue" else kind.upper()
                        detail = m.group(2).strip() if kind == "issue" else m.group(1).strip()
                        detail = detail[:120]
                        rel_path = fpath.relative_to(ROOT).as_posix()
                        stem = fpath.stem.replace("-", "_").replace(".", "_")
                        node_id = _make_id(f"{stem}_{tag}_{lineno}")
                        label = f"{tag}: {detail}" if detail else tag
                        issues.append({
                            "id": node_id,
                            "label": label,
                            "file_type": "rationale",
                            "source_file": rel_path,
                            "source_location": f"L{lineno}",
                            "source_url": None,
                            "captured_at": None,
                            "author": None,
                            "contributor": None,
                            "_kind": kind,
                        })
    return issues


def enrich_graph(issues: list[dict]) -> None:
    if not GRAPH_PATH.exists():
        print(f"[enrich] graph.json not found at {GRAPH_PATH}", file=sys.stderr)
        sys.exit(1)

    graph = json.loads(GRAPH_PATH.read_text(encoding="utf-8"))
    existing_ids = {n["id"] for n in graph.get("nodes", [])}

    added = 0
    for issue in issues:
        node = {k: v for k, v in issue.items() if not k.startswith("_")}
        if node["id"] in existing_ids:
            continue
        graph.setdefault("nodes", []).append(node)
        existing_ids.add(node["id"])
        added += 1

    GRAPH_PATH.write_text(json.dumps(graph, ensure_ascii=False), encoding="utf-8")
    print(f"[enrich] injected {added} issue nodes into graph.json ({len(issues)} found, {len(issues)-added} already present)")


if __name__ == "__main__":
    print("[enrich] scanning codebase for issues...")
    issues = collect_issues()
    print(f"[enrich] found {len(issues)} issues across {len(SEARCH_DIRS)} directories")
    enrich_graph(issues)
    print("[enrich] done — run `graphify query \"TODO\"` or `graphify query \"broken\"` to query issues")
