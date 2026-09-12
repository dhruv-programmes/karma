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


# --- Lightweight SQLite migration for KCS columns (no alembic) ---
# Base.metadata.create_all() does not ADD columns to existing tables,
# so Rosa DB files created before KCS need ALTER TABLE backfill.
KCS_USER_COLUMNS: dict[str, str] = {
    "provisional_score": "INTEGER",
    "verified_score": "INTEGER",
    "score_confidence": "FLOAT",
    "score_state": "VARCHAR(20)",
    "baseline_hash": "VARCHAR(64)",
    "baseline_total_kg": "FLOAT",
    "data_meter_json": "TEXT",
    "baseline_created_at": "VARCHAR(50)",
}


def ensure_kcs_columns(engine_or_conn) -> None:
    """Add missing KCS columns to users table if needed (SQLite compatible).

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

        for col, coltype in KCS_USER_COLUMNS.items():
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
