#!/usr/bin/env bash
# Backend (:5050) + ML service (:5051) + Vite frontend (:5173). Ctrl+C stops all three.
cd "$(dirname "$0")/.." || exit 1
[ -f .venv/bin/activate ] && source .venv/bin/activate
trap 'kill 0' EXIT INT TERM
python -m m1_auth_lucky.backend.run &
python -m m3_ml_kushagra.ml_service.app &
npm run dev &
wait
