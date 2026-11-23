import pytest

from m1_auth_lucky.tests.helpers import auth, login, make_app


@pytest.fixture
def app():
    return make_app()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def db(app):
    return app.extensions["mongo_db"]


@pytest.fixture
def tokens(client):
    return {r: login(client, e) for r, e in {
        "admin": "admin@demo.com", "pharmacist": "pharmacist@demo.com", "pharmacist2": "pharmacist2@demo.com",
        "supplier": "supplier@demo.com", "supplier2": "supplier2@demo.com"}.items()}


@pytest.fixture
def hdr(tokens):
    return {k: auth(v) for k, v in tokens.items()}
