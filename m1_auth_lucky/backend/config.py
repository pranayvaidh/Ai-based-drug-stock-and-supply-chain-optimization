"""Configuration for the Flask API (Module 1 owns the app; Module 2 plugs in)."""
import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(REPO_ROOT / ".env")


def _int(name, default):
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


class Config:
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB = os.getenv("MONGO_DB", "drug_supply_chain")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-only-secret-change-me")
    JWT_EXPIRES_MINUTES = _int("JWT_EXPIRES_MINUTES", 60)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=JWT_EXPIRES_MINUTES)
    CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:5173")
    ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://localhost:5051")
    ML_SERVICE_KEY = os.getenv("ML_SERVICE_KEY", "")
    API_PORT = _int("API_PORT", 5050)
    MAX_CONTENT_LENGTH = 6 * 1024 * 1024  # hard cap; CSV route enforces 5 MB itself
    JSON_SORT_KEYS = False
    TESTING = False
