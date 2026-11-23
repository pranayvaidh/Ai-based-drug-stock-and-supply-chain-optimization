#!/usr/bin/env bash
# Standalone ML service (Module 3) on :5051.
cd "$(dirname "$0")/.." || exit 1
[ -f .venv/bin/activate ] && source .venv/bin/activate
exec python -m m3_ml_kushagra.ml_service.app
