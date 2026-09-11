from __future__ import annotations

import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Generator

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import UserModel
from app.db.session import get_db


def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with random salt."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 600_000)
    return f"pbkdf2_sha256${salt.hex()}${key.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against stored PBKDF2 hash."""
    try:
        parts = hashed.split("$")
        if len(parts) != 3 or parts[0] != "pbkdf2_sha256":
            return False
        salt = bytes.fromhex(parts[1])
        expected_key = bytes.fromhex(parts[2])
        computed_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 600_000)
        return hmac.compare_digest(computed_key, expected_key)
    except Exception:
        return False


def create_access_token(
    user_id: str, email: str, expires_delta: timedelta | None = None
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)

    to_encode = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    encoded_jwt = jwt.encode(
        to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm
    )
    return encoded_jwt


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError:
        return None


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> UserModel:
    """Extract and validate the authenticated user from JWT token or fallback to demo account."""
    if not authorization:
        # Backward compatibility: default to Aisha Sharma demo user if available
        user = db.query(UserModel).filter(UserModel.id == settings.demo_user_id).first()
        if not user:
            user = db.query(UserModel).first()
        if user:
            return user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    token = authorization.replace("Bearer ", "").strip()

    if token == settings.demo_token:
        # Legacy demo token support
        user = db.query(UserModel).filter(UserModel.id == settings.demo_user_id).first()
        if not user:
            user = db.query(UserModel).first()
        if user:
            return user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Demo user not found in database",
        )

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = payload["sub"]
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account does not exist",
        )

    return user
