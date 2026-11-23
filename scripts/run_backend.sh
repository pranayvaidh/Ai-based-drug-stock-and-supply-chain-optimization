#!/usr/bin/env bash
# Flask API (Module 1 + 2) on :5050. Run from anywhere.
cd "$(dirname "$0")/.." || exit 1
[ -f .venv/bin/activate ] && source .venv/bin/activate
exec python -m m1_auth_lucky.backend.run
