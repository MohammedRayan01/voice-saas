#!/usr/bin/env bash
# Run graphify extraction on voice-saas with NVIDIA free LLM.
# Usage:
#   ./graphify-run.sh           — full semantic re-extraction
#   ./graphify-run.sh update    — AST-only incremental (no LLM cost)
#   ./graphify-run.sh query "your question"

set -a
source "$(dirname "$0")/.env.graphify"
set +a

REPO_DIR="$(dirname "$0")"

case "${1:-}" in
  update)
    graphify update "$REPO_DIR"
    ;;
  query)
    shift
    graphify query "$@"
    ;;
  path)
    shift
    graphify path "$@"
    ;;
  explain)
    shift
    graphify explain "$@"
    ;;
  *)
    graphify extract "$REPO_DIR" \
      --backend openai \
      --model meta/llama-3.3-70b-instruct \
      --max-concurrency 2 \
      --api-timeout 120
    # Enrich graph with TODO/FIXME/BUG/hardcoded issue nodes
    python "$REPO_DIR/graphify-enrich.py"
    ;;
esac
