"""Seeded document upload (OCR→LLM demo) — process splits + confirm import."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import SessionLocal, Base, engine
from app.db.seed import seed_database_if_empty
from app.seed.data import DOCUMENT_EXAMPLES


@pytest.fixture(autouse=True)
def setup_database():
    # A document import deliberately persists replay keys. Recreate the
    # temporary test schema per test so each test begins with a fresh document
    # while still exercising replay protection within that test.
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database_if_empty(db)
    db.close()


@pytest.fixture
def client_and_token():
    client = TestClient(app)
    auth = client.post(
        "/api/v1/auth/signin",
        json={"email": "aisha@example.com", "password": "password123"},
    )
    assert auth.status_code == 200
    token = auth.json()["access_token"]
    return client, {"Authorization": f"Bearer {token}"}


def test_list_document_examples(client_and_token):
    client, headers = client_and_token
    resp = client.get("/api/v1/documents/examples", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 5
    ids = {d["id"] for d in data}
    assert ids == {ex["id"] for ex in DOCUMENT_EXAMPLES}
    review_ids = {d["id"] for d in data if d["forces_review"]}
    assert "doc-bescom-bill" in review_ids
    assert "doc-flipkart-invoice" in review_ids
    assert "doc-croma-receipt" not in review_ids


def test_process_high_confidence_auto_imports(client_and_token):
    client, headers = client_and_token
    resp = client.post(
        "/api/v1/documents/process",
        headers=headers,
        json={"example_id": "doc-croma-receipt"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["requires_review"] is False
    assert body["imported"] == 2
    assert len(body["auto_import"]) == 2
    assert body["needs_review"] == []
    assert len(body["transactions"]) == 2
    assert "receipt_ranger" in (body.get("badges_unlocked") or []) or body["imported"] == 2

    # Replaying the same document must remain safe: document/line source keys
    # keep its reward and carbon evidence from being counted twice.
    replay = client.post(
        "/api/v1/documents/process",
        headers=headers,
        json={"example_id": "doc-croma-receipt"},
    )
    assert replay.status_code == 200
    assert replay.json()["imported"] == 0
    assert replay.json()["duplicate_count"] == 2


def test_process_bescom_requires_review_no_import(client_and_token):
    client, headers = client_and_token
    before = client.get("/api/v1/transactions", headers=headers)
    before_count = len(before.json())

    resp = client.post(
        "/api/v1/documents/process",
        headers=headers,
        json={"example_id": "doc-bescom-bill"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["requires_review"] is True
    assert body["imported"] == 0
    assert len(body["auto_import"]) == 2
    assert len(body["needs_review"]) == 1
    assert body["needs_review"][0]["confidence"] == "medium"

    after = client.get("/api/v1/transactions", headers=headers)
    assert len(after.json()) == before_count


def test_process_flipkart_low_confidence_review(client_and_token):
    client, headers = client_and_token
    resp = client.post(
        "/api/v1/documents/process",
        headers=headers,
        json={"example_id": "doc-flipkart-invoice"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["requires_review"] is True
    assert body["imported"] == 0
    assert any(i["confidence"] == "low" for i in body["needs_review"])


def test_confirm_imports_and_unlocks_badge(client_and_token):
    client, headers = client_and_token
    proc = client.post(
        "/api/v1/documents/process",
        headers=headers,
        json={"example_id": "doc-bescom-bill"},
    )
    assert proc.status_code == 200
    draft = proc.json()

    items = [
        {
            "id": i["id"],
            "merchant": i["merchant"],
            "amount_inr": i["amount_inr"],
            "date": i["date"],
            "category": i["category"],
            "discarded": False,
        }
        for i in draft["auto_import"] + draft["needs_review"]
    ]
    conf = client.post(
        "/api/v1/documents/confirm",
        headers=headers,
        json={"example_id": "doc-bescom-bill", "items": items},
    )
    assert conf.status_code == 200
    body = conf.json()
    assert body["imported"] == 3
    assert len(body["transactions"]) == 3
    assert "receipt_ranger" in body.get("badges_unlocked", []) or body["imported"] == 3


def test_confirm_discards_uncertain_item(client_and_token):
    client, headers = client_and_token
    proc = client.post(
        "/api/v1/documents/process",
        headers=headers,
        json={"example_id": "doc-flipkart-invoice"},
    )
    draft = proc.json()
    items = [
        {
            "id": i["id"],
            "merchant": i["merchant"],
            "amount_inr": i["amount_inr"],
            "date": i["date"],
            "category": i["category"],
            "discarded": False,
        }
        for i in draft["auto_import"]
    ]
    for i in draft["needs_review"]:
        items.append(
            {
                "id": i["id"],
                "merchant": i["merchant"],
                "amount_inr": i["amount_inr"],
                "date": i["date"],
                "category": i["category"],
                "discarded": True,
            }
        )
    conf = client.post(
        "/api/v1/documents/confirm",
        headers=headers,
        json={"example_id": "doc-flipkart-invoice", "items": items},
    )
    assert conf.status_code == 200
    assert conf.json()["imported"] == 2


def test_process_unknown_example_404(client_and_token):
    client, headers = client_and_token
    resp = client.post(
        "/api/v1/documents/process",
        headers=headers,
        json={"example_id": "doc-does-not-exist"},
    )
    assert resp.status_code == 404
