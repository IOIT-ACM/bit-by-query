#!/usr/bin/env bash
# Entry point for fresh-machine setup. The real logic lives in
# scripts/setup.mjs (Node.js) - this wrapper only needs to exist because
# Node itself might not be installed yet.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required but wasn't found on this machine."
  echo "Install it from https://nodejs.org/en/download (or via your OS package manager), then re-run this script."
  exit 1
fi

exec node scripts/setup.mjs "$@"
