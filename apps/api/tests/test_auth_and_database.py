import pytest
from fastapi.testclient import TestClient
from uuid import UUID

from app.main import app
from app.db.session import SessionLocal, Base, engine
from app.db.seed import seed_database_if_empty
from app.db.models import UserModel


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database_if_empty(db)
    db.close()


def test_seeded_demo_users_metrics():
    client = TestClient(app)
    resp = client.get("/api/v1/auth/demo-users")
    assert resp.status_code == 200
    users = {u["email"]: u for u in resp.json()}
    assert len(users) == 3

    # Aisha
    aisha = users["aisha@example.com"]
    assert aisha["name"] == "Aisha Sharma"
    assert aisha["circularity_score"] == 74
    assert aisha["impact_points"] == 420
    assert aisha["streak_days"] == 5
    assert aisha["monthly_budget_kg"] == 90.0

    # Rohan
    rohan = users["rohan@example.com"]
    assert rohan["name"] == "Rohan Patel"
    assert rohan["circularity_score"] == 88
    assert rohan["impact_points"] == 850
    assert rohan["streak_days"] == 19
    assert rohan["monthly_budget_kg"] == 60.0

    # Maya
    maya = users["maya@example.com"]
    assert maya["name"] == "Maya Sen"
    assert maya["circularity_score"] == 52
    assert maya["impact_points"] == 110
    assert maya["streak_days"] == 2
    assert maya["monthly_budget_kg"] == 140.0


def test_signin_success_and_failure():
    client = TestClient(app)

    # Valid signin
    res = client.post(
        "/api/v1/auth/signin",
        json={"email": "rohan@example.com", "password": "password123"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["name"] == "Rohan Patel"
    assert data["user"]["circularity_score"] == 88

    # Invalid password
    bad = client.post(
        "/api/v1/auth/signin",
        json={"email": "rohan@example.com", "password": "wrongpassword"},
    )
    assert bad.status_code == 401


def test_signup_creates_new_user_in_db():
    client = TestClient(app)
    new_email = f"test_eco_{UUID(int=1).hex[:6]}_{UUID(bytes=b'1234567890123456').hex[:6]}@example.com"
    # Ensure fresh email by using random or dynamic suffix
    import time
    new_email = f"test_eco_{int(time.time()*1000)}@example.com"

    res = client.post(
        "/api/v1/auth/signup",
        json={
            "name": "Arun Kumar",
            "email": new_email,
            "password": "mypassword123",
            "monthly_budget_kg": 75.0,
            "persona": "low_carbon_minimalist",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["name"] == "Arun Kumar"
    assert data["user"]["email"] == new_email
    assert data["user"]["monthly_budget_kg"] == 75.0
    token = data["access_token"]

    # Verify authenticated query using token
    me_res = client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["name"] == "Arun Kumar"


def test_user_scoped_impact_data():
    client = TestClient(app)

    # Sign in as Rohan
    rohan_auth = client.post(
        "/api/v1/auth/signin",
        json={"email": "rohan@example.com", "password": "password123"},
    ).json()["access_token"]

    # Sign in as Maya
    maya_auth = client.post(
        "/api/v1/auth/signin",
        json={"email": "maya@example.com", "password": "password123"},
    ).json()["access_token"]

    # Rohan impact
    r_impact = client.get(
        "/api/v1/users/me/impact",
        headers={"Authorization": f"Bearer {rohan_auth}"},
    ).json()

    # Maya impact
    m_impact = client.get(
        "/api/v1/users/me/impact",
        headers={"Authorization": f"Bearer {maya_auth}"},
    ).json()

    # Verify metrics are user-specific
    assert r_impact["monthly_budget_kg"] == 60.0
    assert m_impact["monthly_budget_kg"] == 140.0
    assert r_impact["total_kg"] != m_impact["total_kg"]
