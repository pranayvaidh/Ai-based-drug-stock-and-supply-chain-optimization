"""Module 3 ML microservice (standalone, port 5051).

    python -m m3_ml_kushagra.ml_service.app

Every /ml/* call needs header ``X-Service-Key: <ML_SERVICE_KEY>``.
Backend integration is planned for Sprint 7 (FR-3.8); for now it is demoed with
scripts/demo_forecast.py, Postman and pytest.
"""
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request

from . import forecaster
from .models import prophet_model
from .preprocessing import build_daily_series

load_dotenv(Path(__file__).resolve().parents[2] / ".env")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


def _err(status, code, message, details=None):
    body = {"error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return jsonify(body), status


def _validate_sales(body):
    details = {}
    if not isinstance(body, dict):
        return None, {"body": "Must be a JSON object"}
    sales = body.get("sales")
    if not isinstance(sales, list) or not sales:
        details["sales"] = "Must be a non-empty list of {date, quantity}"
    elif not all(isinstance(s, dict) and "date" in s and "quantity" in s for s in sales):
        details["sales"] = "Every item needs 'date' and 'quantity'"
    return sales, details


def create_app(service_key=None):
    app = Flask(__name__)
    app.json.sort_keys = False
    key = service_key if service_key is not None else os.getenv("ML_SERVICE_KEY", "dev-ml-service-key")
    app.config["ML_SERVICE_KEY"] = key

    @app.before_request
    def _check_key():
        if request.path.startswith("/ml/"):
            if not key or request.headers.get("X-Service-Key") != key:
                return _err(401, "UNAUTHORIZED", "Missing or invalid X-Service-Key header")
        return None

    @app.get("/health")
    def health():
        return jsonify({"status": "ok", "service": "ml-forecast-service",
                        "prophet_available": prophet_model.AVAILABLE})

    @app.post("/ml/forecast")
    def ml_forecast():
        body = request.get_json(silent=True)
        sales, details = _validate_sales(body)
        if body is not None and isinstance(body, dict):
            for f in ("drug_id", "branch_id"):
                if not isinstance(body.get(f), str) or not body.get(f).strip():
                    details[f] = "Required string"
            horizon = body.get("horizon_days", 30)
            if isinstance(horizon, bool) or not isinstance(horizon, int) or not 1 <= horizon <= 90:
                details["horizon_days"] = "Must be an integer between 1 and 90"
        if details:
            return _err(400, "VALIDATION_ERROR", "Invalid forecast request", details)
        series, stats = build_daily_series(sales)
        if series.empty:
            return _err(400, "NO_VALID_SALES", "No valid sales rows after preprocessing", stats)
        result = forecaster.forecast(series, horizon, body["drug_id"], body["branch_id"], stats)
        return jsonify(result)

    @app.post("/ml/anomaly")
    def ml_anomaly():
        body = request.get_json(silent=True)
        _sales, details = _validate_sales(body)
        if isinstance(body, dict) and "z_limit" in body:
            z = body["z_limit"]
            if isinstance(z, bool) or not isinstance(z, (int, float)) or z <= 0:
                details["z_limit"] = "Must be a positive number (default 3)"
        if details:
            return _err(400, "VALIDATION_ERROR", "Invalid anomaly request", details)
        return jsonify({
            "status": "not_implemented",
            "planned": "Sprint 6 (Jan–Feb 2027), FR-3.7",
            "z_limit": body.get("z_limit", 3),
            "contract": {"anomalies": [{"date": "YYYY-MM-DD", "quantity": 0, "z_score": 0.0,
                                        "type": "SPIKE|DROP"}]},
        }), 501

    @app.errorhandler(404)
    def _nf(_e):
        return _err(404, "NOT_FOUND", "Not found")

    @app.errorhandler(405)
    def _na(_e):
        return _err(405, "METHOD_NOT_ALLOWED", "Method not allowed")

    return app


def main():
    port = int(os.getenv("ML_PORT", "5051"))
    app = create_app()
    print(f" * ML service on http://localhost:{port}  (prophet_available={prophet_model.AVAILABLE})")
    app.run(host="0.0.0.0", port=port, debug=False)


if __name__ == "__main__":
    main()
