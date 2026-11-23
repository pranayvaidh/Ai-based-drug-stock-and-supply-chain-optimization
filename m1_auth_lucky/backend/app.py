"""Flask application factory (decision D2: the single backend lives in Module 1).

Registers Module 1 (auth, users) and Module 2 (inventory) blueprints.
Run from the repo root:  python -m m1_auth_lucky.backend.run
"""
from flask import Flask, jsonify
from flask_cors import CORS

from .config import Config
from .errors import register_error_handlers, register_jwt_handlers
from .extensions import bcrypt, connect_mongo, ensure_indexes, jwt


def create_app(overrides=None, mongo_client=None):
    """Build the app.

    ``mongo_client`` lets tests inject a ``mongomock.MongoClient``. In normal runs we connect
    to MONGO_URI and fail fast with a readable message if MongoDB is not reachable.
    """
    app = Flask(__name__)
    app.config.from_object(Config)
    app.json.sort_keys = False
    if overrides:
        app.config.update(overrides)

    CORS(app, resources={r"/*": {"origins": app.config["CORS_ORIGIN"]}})
    jwt.init_app(app)
    bcrypt.init_app(app)
    register_jwt_handlers(jwt)
    register_error_handlers(app)

    if mongo_client is None:
        client, db = connect_mongo(app.config["MONGO_URI"], app.config["MONGO_DB"])
    else:
        client, db = mongo_client, mongo_client[app.config["MONGO_DB"]]
    app.extensions["mongo_client"] = client
    app.extensions["mongo_db"] = db
    ensure_indexes(db)

    # ---- Module 1 blueprints ----
    from .auth.routes import bp as auth_bp
    from .users.routes import bp as users_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)

    # ---- Module 2 blueprints (Kunal) ----
    from m2_inventory_kunal.backend import register_blueprints as register_m2
    register_m2(app)

    @app.get("/health")
    def health():
        try:
            client.admin.command("ping")
            db_state = "up"
        except Exception:  # noqa: BLE001
            db_state = "down"
        return jsonify({"status": "ok" if db_state == "up" else "degraded", "db": db_state,
                        "service": "drug-supply-chain-api"}), (200 if db_state == "up" else 503)

    @app.get("/")
    def index():
        return jsonify({"service": "drug-supply-chain-api", "health": "/health",
                        "docs": "see m1_auth_lucky/README.md and m2_inventory_kunal/README.md"})

    return app
