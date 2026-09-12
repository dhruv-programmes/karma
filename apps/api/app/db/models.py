from __future__ import annotations

import json
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.db.session import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserModel(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    # Public handle used by friend search.  Kept nullable for legacy SQLite
    # databases; startup backfill assigns handles to existing accounts.
    username = Column(String(80), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    circularity_score = Column(Integer, default=70, nullable=False)
    impact_points = Column(Integer, default=0, nullable=False)
    streak_days = Column(Integer, default=1, nullable=False)
    trend_delta = Column(Integer, default=0, nullable=False)
    loop_level = Column(Integer, default=1, nullable=False)
    offset_kg_total = Column(Float, default=0.0, nullable=False)
    monthly_budget_kg = Column(Float, default=90.0, nullable=False)
    preferences_json = Column(Text, default="{}", nullable=False)
    created_at = Column(DateTime, default=_utcnow, nullable=False)
    # --- KCS provisional->verified (nullable-safe, SQLite compatible) ---
    provisional_score = Column(Integer, default=650, nullable=True)
    verified_score = Column(Integer, nullable=True)
    score_confidence = Column(Float, default=0.4, nullable=True)
    score_state = Column(String(20), default="provisional", nullable=True)
    baseline_hash = Column(String(64), nullable=True)
    baseline_total_kg = Column(Float, nullable=True)
    data_meter_json = Column(Text, nullable=True)
    baseline_created_at = Column(String(50), nullable=True)

    transactions = relationship(
        "TransactionModel", back_populates="user", cascade="all, delete-orphan"
    )
    user_products = relationship(
        "UserProductModel", back_populates="user", cascade="all, delete-orphan"
    )
    completed_actions = relationship(
        "UserCompletedActionModel", back_populates="user", cascade="all, delete-orphan"
    )
    redemptions = relationship(
        "UserRewardRedemptionModel", back_populates="user", cascade="all, delete-orphan"
    )
    offset_purchases = relationship(
        "UserOffsetPurchaseModel", back_populates="user", cascade="all, delete-orphan"
    )
    badges = relationship(
        "UserBadgeModel", back_populates="user", cascade="all, delete-orphan"
    )
    activity_events = relationship(
        "ActivityEventModel", back_populates="user", cascade="all, delete-orphan"
    )
    daily_steps = relationship(
        "UserDailyStepsModel", back_populates="user", cascade="all, delete-orphan"
    )
    solar_recommendations = relationship(
        "SolarRecommendationStateModel", back_populates="user", cascade="all, delete-orphan"
    )
    daily_commutes = relationship(
        "UserCommuteTripModel", back_populates="user", cascade="all, delete-orphan"
    )
    friend_links = relationship(
        "FriendConnectionModel",
        foreign_keys="FriendConnectionModel.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    challenge_progress = relationship(
        "UserChallengeProgressModel", back_populates="user", cascade="all, delete-orphan"
    )
    league_state = relationship(
        "UserLeagueStateModel", back_populates="user", uselist=False,
        cascade="all, delete-orphan"
    )
    league_action_logs = relationship(
        "LeagueActionLogModel", back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def preferences(self) -> dict:
        try:
            return json.loads(self.preferences_json) if self.preferences_json else {}
        except Exception:
            return {}

    @preferences.setter
    def preferences(self, value: dict) -> None:
        self.preferences_json = json.dumps(value)


class ProductModel(Base):
    __tablename__ = "products"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    barcode = Column(String(64), index=True, nullable=True)
    name = Column(String(255), nullable=False)
    brand = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)
    image_url = Column(String(500), nullable=False)
    estimated_co2e_kg = Column(Float, nullable=False)
    circularity_score = Column(Integer, nullable=False)
    circularity_breakdown_json = Column(Text, nullable=False)
    repairability = Column(Integer, nullable=False)
    expected_remaining_life_months = Column(Integer, nullable=False)
    condition = Column(String(50), nullable=False)
    age_months = Column(Integer, nullable=False)
    attributes_json = Column(Text, nullable=False)
    last_action_label = Column(String(100), nullable=True)
    next_action_label = Column(String(100), nullable=True)

    user_products = relationship("UserProductModel", back_populates="product")

    @property
    def circularity_breakdown(self) -> dict:
        try:
            return json.loads(self.circularity_breakdown_json) if self.circularity_breakdown_json else {}
        except Exception:
            return {}

    @property
    def attributes(self) -> dict:
        try:
            return json.loads(self.attributes_json) if self.attributes_json else {}
        except Exception:
            return {}


class UserProductModel(Base):
    __tablename__ = "user_products"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False, index=True)
    status = Column(String(50), default="active", nullable=False)
    acquired_date = Column(String(20), nullable=False)

    user = relationship("UserModel", back_populates="user_products")
    product = relationship("ProductModel", back_populates="user_products")


class TransactionModel(Base):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    date = Column(String(20), nullable=False)
    merchant = Column(String(255), nullable=False)
    amount_inr = Column(Float, nullable=False)
    category = Column(String(50), nullable=False)
    co2e_kg = Column(Float, nullable=False)

    user = relationship("UserModel", back_populates="transactions")


class FacilityModel(Base):
    __tablename__ = "facilities"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(255), nullable=False)
    facility_type = Column(String(50), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    supported_categories_json = Column(Text, nullable=False)
    open_now = Column(Boolean, default=True, nullable=False)
    verification_status = Column(String(50), nullable=False)
    address = Column(String(255), nullable=False)
    cover_image_url = Column(String(500), nullable=False)

    @property
    def supported_categories(self) -> list[str]:
        try:
            return json.loads(self.supported_categories_json) if self.supported_categories_json else []
        except Exception:
            return []


class OffsetProjectModel(Base):
    __tablename__ = "offset_projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(255), nullable=False)
    provider = Column(String(100), nullable=False)
    co2e_kg = Column(Float, nullable=False)
    price_inr = Column(Float, nullable=False)
    verification_status = Column(String(50), nullable=False)
    geography = Column(String(20), nullable=False)
    description = Column(Text, nullable=False)
    methodology = Column(String(100), nullable=False)
    cover_image_url = Column(String(500), nullable=False)


class RewardModel(Base):
    __tablename__ = "rewards"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    points_required = Column(Integer, nullable=False)
    brand = Column(String(100), nullable=False)
    is_mock = Column(Boolean, default=True, nullable=False)
    expires_on = Column(String(20), nullable=False)


class RecommendationModel(Base):
    __tablename__ = "recommendations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    category = Column(String(50), nullable=False)
    action_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    subtitle = Column(String(255), nullable=False)
    co2e_avoided_kg = Column(Float, nullable=False)
    money_impact_inr = Column(Float, nullable=False)
    effort = Column(String(20), nullable=False)
    local_availability = Column(String(255), nullable=False)
    product_id = Column(String(36), nullable=True)
    explanation = Column(Text, nullable=False)
    score = Column(Integer, nullable=False)


class UserCompletedActionModel(Base):
    __tablename__ = "user_completed_actions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    action_id = Column(String(36), nullable=False, index=True)
    action_type = Column(String(50), nullable=False)
    points_awarded = Column(Integer, nullable=False)
    completed_at = Column(DateTime, default=_utcnow, nullable=False)

    user = relationship("UserModel", back_populates="completed_actions")


class UserRewardRedemptionModel(Base):
    __tablename__ = "user_reward_redemptions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    reward_id = Column(String(36), ForeignKey("rewards.id"), nullable=False)
    points_spent = Column(Integer, nullable=False)
    redeemed_at = Column(DateTime, default=_utcnow, nullable=False)

    user = relationship("UserModel", back_populates="redemptions")


class UserOffsetPurchaseModel(Base):
    __tablename__ = "user_offset_purchases"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    offset_id = Column(String(36), ForeignKey("offset_projects.id"), nullable=False)
    co2e_kg = Column(Float, nullable=False)
    amount_inr = Column(Float, nullable=False)
    purchased_at = Column(DateTime, default=_utcnow, nullable=False)

    user = relationship("UserModel", back_populates="offset_purchases")


class UserBadgeModel(Base):
    __tablename__ = "user_badges"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    badge_id = Column(String(100), nullable=False)
    unlocked_at = Column(DateTime, default=_utcnow, nullable=False)

    user = relationship("UserModel", back_populates="badges")


class ActivityEventModel(Base):
    __tablename__ = "activity_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    kind = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    subtitle = Column(String(255), nullable=False)
    points_delta = Column(Integer, default=0, nullable=False)
    created_at = Column(String(50), nullable=False)
    meta_json = Column(Text, default="{}", nullable=False)

    user = relationship("UserModel", back_populates="activity_events")

    @property
    def meta(self) -> dict:
        try:
            return json.loads(self.meta_json) if self.meta_json else {}
        except Exception:
            return {}

    @meta.setter
    def meta(self, value: dict) -> None:
        self.meta_json = json.dumps(value)


class UserDailyStepsModel(Base):
    """A user's reported walking total and earned reward points for one day."""

    __tablename__ = "user_daily_steps"
    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_user_daily_steps_user_date"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    # ISO local date (YYYY-MM-DD). The API only writes the server's current date.
    date = Column(String(10), nullable=False, index=True)
    steps = Column(Integer, default=0, nullable=False)
    points_awarded = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow, nullable=False)

    user = relationship("UserModel", back_populates="daily_steps")


class SolarRecommendationStateModel(Base):
    """Per-user state for the deterministic solar demo recommendations.

    Solar rewards are Impact Points and are intentionally independent from KCS.
    Keeping state in its own table makes accept/complete idempotent across
    browser refreshes and multiple devices.
    """

    __tablename__ = "solar_recommendation_states"
    __table_args__ = (
        UniqueConstraint("user_id", "recommendation_id", name="uq_solar_rec_user_rec"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    recommendation_id = Column(String(100), nullable=False, index=True)
    status = Column(String(30), default="suggested", nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    points_awarded = Column(Integer, default=0, nullable=False)

    user = relationship("UserModel", back_populates="solar_recommendations")


class UserCommuteTripModel(Base):
    """An individual commute trip detected via GPS with mode, distance, and awarded impact points."""

    __tablename__ = "user_commute_trips"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)
    mode = Column(String(20), nullable=False)  # "walk", "cycle", "motor"
    distance_km = Column(Float, nullable=False)
    duration_min = Column(Float, nullable=False)
    avg_speed_kmh = Column(Float, nullable=False)
    points_awarded = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=_utcnow, nullable=False)

    user = relationship("UserModel", back_populates="daily_commutes")


class FriendConnectionModel(Base):
    """A one-way friend request/connection.

    The service stores an accepted link in both directions, which keeps friend
    leaderboard queries simple and makes removing a friend deterministic.
    """

    __tablename__ = "friend_connections"
    __table_args__ = (UniqueConstraint("user_id", "friend_id", name="uq_friend_connection"),)

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    friend_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String(20), default="accepted", nullable=False)
    created_at = Column(DateTime, default=_utcnow, nullable=False)

    user = relationship("UserModel", foreign_keys=[user_id], back_populates="friend_links")
    friend = relationship("UserModel", foreign_keys=[friend_id])


class ChallengeModel(Base):
    """A renewable green challenge definition."""

    __tablename__ = "challenges"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    slug = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    cadence = Column(String(20), nullable=False)  # daily, weekly, monthly
    goal_kind = Column(String(50), nullable=False)
    goal_value = Column(Integer, nullable=False)
    reward_points = Column(Integer, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    starts_on = Column(String(20), nullable=True)
    ends_on = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=_utcnow, nullable=False)

    progress = relationship(
        "UserChallengeProgressModel", back_populates="challenge", cascade="all, delete-orphan"
    )


class UserChallengeProgressModel(Base):
    """Per-user progress for one challenge period.

    ``period_key`` makes daily/weekly/monthly challenges renewable without
    deleting history, and the unique constraint makes reward claiming safe on
    retries or multiple devices.
    """

    __tablename__ = "user_challenge_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "challenge_id", "period_key", name="uq_user_challenge_period"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    challenge_id = Column(String(36), ForeignKey("challenges.id"), nullable=False, index=True)
    period_key = Column(String(20), nullable=False, index=True)
    progress = Column(Integer, default=0, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    reward_awarded = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=_utcnow, nullable=False)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow, nullable=False)

    user = relationship("UserModel", back_populates="challenge_progress")
    challenge = relationship("ChallengeModel", back_populates="progress")


class LeagueDefinitionModel(Base):
    """Seeded configuration for a competitive CCS league.

    Thresholds and presentation metadata live in the database so clients can
    render the current rules without duplicating game-balance constants.
    ``promotion_threshold`` is the accumulated season-point target for that
    league; Bronze is the floor and therefore has no lower promotion target.
    """

    __tablename__ = "league_definitions"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_league_definition_slug"),
        UniqueConstraint("rank", name="uq_league_definition_rank"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    slug = Column(String(30), nullable=False, index=True)
    display_name = Column(String(60), nullable=False)
    rank = Column(Integer, nullable=False)
    # Points required while the user is in this league to promote one tier.
    # Platinum is the ceiling and stores 0.
    promotion_threshold = Column(Integer, nullable=False, default=0)
    weekly_points_cap = Column(Integer, default=500, nullable=False)
    badge_id = Column(String(100), nullable=False)
    badge_asset_url = Column(String(500), nullable=True)
    color_hex = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=_utcnow, nullable=False)


class UserLeagueStateModel(Base):
    """The user's current monthly league season state."""

    __tablename__ = "user_league_states"
    __table_args__ = (UniqueConstraint("user_id", name="uq_user_league_state_user"),)

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    season_key = Column(String(7), nullable=False, index=True)
    current_league_slug = Column(String(30), nullable=False, default="bronze")
    season_points = Column(Integer, nullable=False, default=0)
    weekly_league_points = Column(Integer, nullable=False, default=0)
    weekly_key = Column(String(8), nullable=False, default="")
    weekly_action_count = Column(Integer, nullable=False, default=0)
    lifetime_best_league_slug = Column(String(30), nullable=False, default="bronze")
    last_demotion_at = Column(DateTime, nullable=True)
    last_demotion_from = Column(String(30), nullable=True)
    last_demotion_to = Column(String(30), nullable=True)
    last_promotion_at = Column(DateTime, nullable=True)
    last_promotion_from = Column(String(30), nullable=True)
    last_promotion_to = Column(String(30), nullable=True)
    last_rollover_key = Column(String(7), nullable=True)
    created_at = Column(DateTime, default=_utcnow, nullable=False)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow, nullable=False)

    user = relationship("UserModel", back_populates="league_state")


class LeagueActionLogModel(Base):
    """Idempotent, verified action ledger used to award league points."""

    __tablename__ = "league_action_logs"
    __table_args__ = (
        UniqueConstraint("user_id", "action_key", name="uq_league_action_user_key"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    action_key = Column(String(160), nullable=False)
    action_type = Column(String(50), nullable=False)
    source = Column(String(50), default="app", nullable=False)
    evidence_json = Column(Text, default="{}", nullable=False)
    verified = Column(Boolean, default=True, nullable=False)
    week_key = Column(String(8), nullable=False, index=True)
    season_key = Column(String(7), nullable=False, index=True)
    base_points = Column(Integer, nullable=False)
    awarded_points = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=_utcnow, nullable=False)

    user = relationship("UserModel", back_populates="league_action_logs")



# --- Lightweight SQLite migrations (no Alembic) ---
# Base.metadata.create_all() does not ADD columns to an existing table. Keep
# user-account migrations alongside the KCS backfill so a database created
# before authentication can still accept a newly signed-up user.
USER_MIGRATION_COLUMNS: dict[str, str] = {
    # SQLite cannot add a NOT NULL column without a default to a populated
    # table. The ORM still requires this for all new rows; seed repairs the
    # known demo accounts below, while legacy non-demo accounts must use a
    # password-reset flow rather than silently receiving a password.
    "password_hash": "VARCHAR(255)",
    "username": "VARCHAR(80)",
    "provisional_score": "INTEGER",
    "verified_score": "INTEGER",
    "score_confidence": "FLOAT",
    "score_state": "VARCHAR(20)",
    "baseline_hash": "VARCHAR(64)",
    "baseline_total_kg": "FLOAT",
    "data_meter_json": "TEXT",
    "baseline_created_at": "VARCHAR(50)",
}


def ensure_user_columns(engine_or_conn) -> None:
    """Add missing auth and KCS columns to ``users`` (SQLite compatible).

    Accepts an Engine, Connection, or Session. No-op if columns exist.
    """
    from sqlalchemy import text

    # Resolve a connection-like object with .execute()
    conn = None
    close_after = False
    try:
        if hasattr(engine_or_conn, "get_bind"):
            # Session object
            bind = engine_or_conn.get_bind()
            conn = bind.connect()
            close_after = True
        elif hasattr(engine_or_conn, "connect"):
            conn = engine_or_conn.connect()
            close_after = True
        else:
            # Assume already a Connection
            conn = engine_or_conn

        existing: set[str] = set()
        try:
            rows = conn.execute(text("PRAGMA table_info(users)")).fetchall()
            # rows: (cid, name, type, notnull, dflt_value, pk)
            existing = {r[1] for r in rows}
        except Exception:
            return

        for col, coltype in USER_MIGRATION_COLUMNS.items():
            if col not in existing:
                try:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {coltype}"))
                except Exception:
                    # Column may have been added concurrently; ignore
                    pass
        try:
            conn.commit()
        except Exception:
            pass
    finally:
        if close_after and conn is not None:
            try:
                conn.close()
            except Exception:
                pass


# Compatibility alias for callers introduced with the KCS-only migration.
def ensure_kcs_columns(engine_or_conn) -> None:
    ensure_user_columns(engine_or_conn)
