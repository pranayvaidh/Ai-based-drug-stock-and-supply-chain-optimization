"""Uniform JSON error format: {"error": {"code", "message", "details"?}}."""
from flask import jsonify
from werkzeug.exceptions import HTTPException


class ApiError(Exception):
    def __init__(self, status, code, message, details=None):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details


def error_response(status, code, message, details=None):
    body = {"error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return jsonify(body), status


_HTTP_CODES = {400: "BAD_REQUEST", 401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "NOT_FOUND",
               405: "METHOD_NOT_ALLOWED", 409: "CONFLICT", 413: "FILE_TOO_LARGE", 415: "UNSUPPORTED_MEDIA_TYPE"}


def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def _api_error(err):
        return error_response(err.status, err.code, err.message, err.details)

    @app.errorhandler(HTTPException)
    def _http_error(err):
        code = _HTTP_CODES.get(err.code, "HTTP_ERROR")
        return error_response(err.code, code, err.description or err.name)

    @app.errorhandler(Exception)
    def _unhandled(err):  # pragma: no cover - safety net
        app.logger.exception("Unhandled error: %s", err)
        return error_response(500, "INTERNAL_ERROR", "Something went wrong on the server")


def register_jwt_handlers(jwt):
    @jwt.unauthorized_loader
    def _missing(reason):
        return error_response(401, "UNAUTHORIZED", "Missing or malformed Authorization header")

    @jwt.invalid_token_loader
    def _invalid(reason):
        return error_response(401, "UNAUTHORIZED", "Invalid token")

    @jwt.expired_token_loader
    def _expired(_header, _payload):
        return error_response(401, "TOKEN_EXPIRED", "Session expired, please log in again")

    @jwt.revoked_token_loader
    def _revoked(_header, _payload):
        return error_response(401, "UNAUTHORIZED", "Token has been revoked")
