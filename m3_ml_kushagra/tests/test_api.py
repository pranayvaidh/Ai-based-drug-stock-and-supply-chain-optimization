import pytest

from m3_ml_kushagra.ml_service.app import create_app

KEY = "test-key"


@pytest.fixture
def client():
    return create_app(service_key=KEY).test_client()


def _sales(n=70):
    import datetime as dt
    start = dt.date(2026, 6, 1)
    return [{"date": (start + dt.timedelta(days=i)).isoformat(), "quantity": 10 + (i % 7)} for i in range(n)]


def test_health_is_public(client):
    body = client.get("/health").get_json()
    assert body["status"] == "ok" and isinstance(body["prophet_available"], bool)


def test_401_without_key(client):
    assert client.post("/ml/forecast", json={}).status_code == 401
    assert client.post("/ml/forecast", json={}, headers={"X-Service-Key": "wrong"}).status_code == 401


def test_forecast_200_shape(client):
    res = client.post("/ml/forecast", headers={"X-Service-Key": KEY},
                      json={"drug_id": "Paracetamol 500 mg", "branch_id": "Malviya Nagar Pharmacy",
                            "horizon_days": 14, "sales": _sales() + [{"date": "2026-06-02", "quantity": -4}]})
    assert res.status_code == 200
    body = res.get_json()
    for key in ("drug_id", "branch_id", "model_used", "horizon_days", "history_days", "candidates", "mape",
                "confidence", "avg_daily_demand", "daily_predictions", "preprocessing", "generated_at"):
        assert key in body
    assert body["horizon_days"] == 14 and len(body["daily_predictions"]) == 14
    assert body["history_days"] == 70 and body["preprocessing"]["dropped_invalid"] == 1
    assert set(body["daily_predictions"][0]) == {"date", "yhat", "yhat_lower", "yhat_upper"}


def test_forecast_validation(client):
    res = client.post("/ml/forecast", headers={"X-Service-Key": KEY}, json={"drug_id": "x", "sales": []})
    assert res.status_code == 400
    details = res.get_json()["error"]["details"]
    assert "sales" in details and "branch_id" in details


def test_anomaly_501_with_contract(client):
    res = client.post("/ml/anomaly", headers={"X-Service-Key": KEY}, json={"sales": _sales(10), "z_limit": 3})
    assert res.status_code == 501
    body = res.get_json()
    assert body["status"] == "not_implemented" and "Sprint 6" in body["planned"]
    assert body["contract"]["anomalies"][0]["type"] == "SPIKE|DROP"


def test_anomaly_validates_input(client):
    res = client.post("/ml/anomaly", headers={"X-Service-Key": KEY}, json={"sales": [], "z_limit": -1})
    assert res.status_code == 400
