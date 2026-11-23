"""Entry point:  python -m m1_auth_lucky.backend.run   (from the repo root)."""
import sys

from .app import create_app
from .config import Config


def main():
    try:
        app = create_app()
    except RuntimeError as exc:
        print(f"\n[startup error] {exc}\n", file=sys.stderr)
        sys.exit(1)
    print(f" * Drug Supply Chain API on http://localhost:{Config.API_PORT}  (health: /health)")
    app.run(host="0.0.0.0", port=Config.API_PORT, debug=False)


if __name__ == "__main__":
    main()
