import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from uuid import UUID

from app.main import app
from app.db.session import SessionLocal, Base, engine
from app.db.seed import seed_database_if_empty
from app.db.models import UserModel, ensure_user_columns
from app.auth.security import verify_password
from app.schemas import AuthResponse


@pytest.fixture(autouse=True)
def setup_database():
    # Seed assertions describe the baseline demo account, not mutations left
    # by a different API test.
    Base.metadata.drop_all(bind=engine)
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


def test_auth_response_matches_profile_contract_at_runtime():
    client = TestClient(app)
    res = client.post(
        "/api/v1/auth/signin",
        json={"email": "rohan@example.com", "password": "password123"},
    )
    assert res.status_code == 200
    parsed = AuthResponse.model_validate(res.json())
    assert parsed.user.email == "rohan@example.com"
    assert parsed.user.provisional_score is not None


def test_legacy_users_table_migration_adds_password_hash_for_new_accounts(tmp_path):
    """An old SQLite users table must accept auth-era user rows after startup."""
    legacy_engine = create_engine(f"sqlite:///{tmp_path / 'legacy.db'}")
    with legacy_engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE users (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    circularity_score INTEGER NOT NULL,
                    impact_points INTEGER NOT NULL,
                    streak_days INTEGER NOT NULL,
                    trend_delta INTEGER NOT NULL,
                    loop_level INTEGER NOT NULL,
                    offset_kg_total FLOAT NOT NULL,
                    monthly_budget_kg FLOAT NOT NULL,
                    preferences_json TEXT NOT NULL,
                    created_at DATETIME NOT NULL
                )
                """
            )
        )

    ensure_user_columns(legacy_engine)
    assert "password_hash" in {column["name"] for column in inspect(legacy_engine).get_columns("users")}

    with legacy_engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, name, email, password_hash, circularity_score,
                    impact_points, streak_days, trend_delta, loop_level,
                    offset_kg_total, monthly_budget_kg, preferences_json, created_at
                ) VALUES (
                    'legacy-signup', 'Legacy Sign-up', 'legacy-signup@example.com',
                    'pbkdf2_sha256$00$00', 68, 0, 1, 0, 1, 0, 90, '{}', CURRENT_TIMESTAMP
                )
                """
            )
        )
    with legacy_engine.connect() as conn:
        assert conn.execute(text("SELECT password_hash FROM users WHERE id = 'legacy-signup' ")).scalar_one()


def test_seed_repairs_missing_demo_password_hash_without_touching_other_users():
    db = SessionLocal()
    try:
        aisha = db.query(UserModel).filter(UserModel.email == "aisha@example.com").one()
        aisha.password_hash = ""
        db.commit()

        seed_database_if_empty(db)
        db.refresh(aisha)
        assert verify_password("password123", aisha.password_hash)
    finally:
        db.close()


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


def test_baseline_recomputes_provisional_score_from_kg():
    client = TestClient(app)
    import time

    signup = client.post(
        "/api/v1/auth/signup",
        json={
            "name": "Baseline Test",
            "email": f"baseline_{int(time.time() * 1000)}@example.com",
            "password": "mypassword123",
            "monthly_budget_kg": 75.0,
            "persona": "low_carbon_minimalist",
        },
    )
    assert signup.status_code == 200
    token = signup.json()["access_token"]

    response = client.post(
        "/api/v1/onboarding/baseline",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "transport": {},
            "shopping": {},
            "reductionPct": 15,
            "totalKg": 40,
            "provisional": 480,
        },
    )
    assert response.status_code == 200
    assert response.json()["provisional"] == 804
    assert response.json()["state"] == "provisional"


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
