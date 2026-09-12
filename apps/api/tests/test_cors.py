from fastapi.testclient import TestClient

from app.main import app


def test_local_web_origin_gets_cors_headers_on_preflight():
    client = TestClient(app)
    response = client.options(
        "/api/v1/users/me",
        headers={
            "Origin": "http://localhost:8081",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:8081"
    assert response.headers["access-control-allow-credentials"] == "true"


def test_local_web_origin_gets_cors_headers_on_authenticated_response():
    client = TestClient(app)
    response = client.get(
        "/api/v1/users/me",
        headers={
            "Origin": "http://127.0.0.1:8081",
            "Authorization": "Bearer demo-carbon-loop-token",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:8081"


def test_unhandled_api_errors_keep_cors_headers(monkeypatch):
    def raise_error(*_args, **_kwargs):
        raise RuntimeError("test backend failure")

    monkeypatch.setattr("app.api.routes.services.user_impact", raise_error)
    client = TestClient(app, raise_server_exceptions=False)
    response = client.get(
        "/api/v1/users/me/impact",
        headers={
            "Origin": "http://localhost:8081",
            "Authorization": "Bearer demo-carbon-loop-token",
        },
    )

    assert response.status_code == 500
    assert response.headers["access-control-allow-origin"] == "http://localhost:8081"
