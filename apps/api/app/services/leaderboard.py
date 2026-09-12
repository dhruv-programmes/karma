"""Friends, leaderboard, and renewable challenge domain services."""

from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.models import (
    ChallengeModel,
    FriendConnectionModel,
    UserChallengeProgressModel,
    UserModel,
)
from app.services.core import log_activity_event


def _period_key(cadence: str, today: date | None = None) -> str:
    today = today or date.today()
    if cadence == "daily":
        return today.isoformat()
    if cadence == "weekly":
        year, week, _ = today.isocalendar()
        return f"{year}-W{week:02d}"
    if cadence == "monthly":
        return today.strftime("%Y-%m")
    raise ValueError(f"Unsupported challenge cadence: {cadence}")


def _public_username(user: UserModel) -> str:
    return user.username or user.email.split("@", 1)[0]


def search_users(db: Session, query: str, current_user: UserModel, limit: int = 20) -> list[dict]:
    clean = query.strip().lower()
    if not clean:
        return []
    users = (
        db.query(UserModel)
        .filter(UserModel.id != current_user.id)
        .filter(or_(UserModel.username.ilike(f"%{clean}%"), UserModel.name.ilike(f"%{clean}%")))
        .order_by(UserModel.username.asc(), UserModel.id.asc())
        .limit(limit)
        .all()
    )
    existing = {
        row.friend_id
        for row in db.query(FriendConnectionModel)
        .filter(FriendConnectionModel.user_id == current_user.id)
        .all()
    }
    return [
        {
            "id": user.id,
            "username": _public_username(user),
            "name": user.name,
            "status": "accepted" if user.id in existing else "not_connected",
        }
        for user in users
    ]


def add_friend(db: Session, current_user: UserModel, username: str) -> dict:
    clean = username.strip().lower()
    target = db.query(UserModel).filter(UserModel.username == clean).first()
    if target is None:
        raise ValueError("No user exists with that username")
    if target.id == current_user.id:
        raise ValueError("You cannot add yourself as a friend")
    for owner, friend in ((current_user.id, target.id), (target.id, current_user.id)):
        if not db.query(FriendConnectionModel).filter_by(user_id=owner, friend_id=friend).first():
            db.add(FriendConnectionModel(user_id=owner, friend_id=friend, status="accepted"))
    db.commit()
    return {"id": target.id, "username": _public_username(target), "name": target.name, "status": "accepted"}


def remove_friend(db: Session, current_user: UserModel, username: str) -> None:
    target = db.query(UserModel).filter(UserModel.username == username.strip().lower()).first()
    if target is None:
        return
    db.query(FriendConnectionModel).filter(
        or_(
            (FriendConnectionModel.user_id == current_user.id) & (FriendConnectionModel.friend_id == target.id),
            (FriendConnectionModel.user_id == target.id) & (FriendConnectionModel.friend_id == current_user.id),
        )
    ).delete(synchronize_session=False)
    db.commit()


def list_friends(db: Session, current_user: UserModel) -> list[dict]:
    rows = (
        db.query(UserModel)
        .join(FriendConnectionModel, FriendConnectionModel.friend_id == UserModel.id)
        .filter(FriendConnectionModel.user_id == current_user.id, FriendConnectionModel.status == "accepted")
        .order_by(UserModel.username.asc(), UserModel.id.asc())
        .all()
    )
    return [{"id": u.id, "username": _public_username(u), "name": u.name, "status": "accepted"} for u in rows]


def leaderboard(db: Session, current_user: UserModel, scope: str = "global", metric: str = "reward_points") -> dict:
    if scope not in {"global", "friends"}:
        raise ValueError("scope must be global or friends")
    if metric not in {"reward_points", "carbon_credit_score"}:
        raise ValueError("metric must be reward_points or carbon_credit_score")
    users = db.query(UserModel).all()
    friend_ids = {
        row.friend_id
        for row in db.query(FriendConnectionModel).filter(
            FriendConnectionModel.user_id == current_user.id, FriendConnectionModel.status == "accepted"
        )
    }
    if scope == "friends":
        users = [u for u in users if u.id == current_user.id or u.id in friend_ids]

    def score(u: UserModel) -> int:
        if metric == "reward_points":
            return int(u.impact_points or 0)
        return int(u.verified_score if u.verified_score is not None else (u.provisional_score or 650))

    users.sort(key=lambda u: (-score(u), _public_username(u).lower(), u.id))
    entries = []
    for rank, user in enumerate(users, start=1):
        entries.append({
            "rank": rank,
            "user_id": user.id,
            "username": _public_username(user),
            "name": user.name,
            "reward_points": int(user.impact_points or 0),
            "carbon_credit_score": score(user) if metric == "carbon_credit_score" else int(user.verified_score if user.verified_score is not None else (user.provisional_score or 650)),
            "is_current_user": user.id == current_user.id,
            "is_friend": user.id in friend_ids,
        })
    me = next((entry["rank"] for entry in entries if entry["is_current_user"]), None)
    return {"scope": scope, "metric": metric, "entries": entries, "current_user_rank": me}


def _progress_row(db: Session, user: UserModel, challenge: ChallengeModel) -> UserChallengeProgressModel:
    key = _period_key(challenge.cadence)
    row = db.query(UserChallengeProgressModel).filter_by(
        user_id=user.id, challenge_id=challenge.id, period_key=key
    ).first()
    if row is None:
        row = UserChallengeProgressModel(user_id=user.id, challenge_id=challenge.id, period_key=key)
        db.add(row)
        db.flush()
    return row


def list_challenges(db: Session, user: UserModel, cadence: str | None = None) -> list[dict]:
    query = db.query(ChallengeModel).filter(ChallengeModel.active.is_(True))
    if cadence:
        query = query.filter(ChallengeModel.cadence == cadence)
    challenges = query.order_by(ChallengeModel.cadence.asc(), ChallengeModel.reward_points.asc(), ChallengeModel.id.asc()).all()
    result = []
    for challenge in challenges:
        row = _progress_row(db, user, challenge)
        result.append(_challenge_payload(challenge, row))
    db.commit()
    return result


def _challenge_payload(challenge: ChallengeModel, row: UserChallengeProgressModel) -> dict:
    return {
        "id": challenge.id,
        "slug": challenge.slug,
        "title": challenge.title,
        "description": challenge.description,
        "cadence": challenge.cadence,
        "goal_kind": challenge.goal_kind,
        "goal_value": challenge.goal_value,
        "reward_points": challenge.reward_points,
        "progress": {
            "progress": row.progress,
            "goal_value": challenge.goal_value,
            "completed": row.completed_at is not None,
            "reward_awarded": row.reward_awarded,
            "period_key": row.period_key,
        },
    }


def update_challenge_progress(db: Session, user: UserModel, challenge_id: UUID, progress: int) -> dict:
    challenge = db.query(ChallengeModel).filter(ChallengeModel.id == str(challenge_id), ChallengeModel.active.is_(True)).first()
    if challenge is None:
        raise ValueError("Challenge not found")
    row = _progress_row(db, user, challenge)
    row.progress = max(row.progress, min(progress, challenge.goal_value))
    if row.progress >= challenge.goal_value and row.completed_at is None:
        row.completed_at = datetime.now(timezone.utc)
    if row.completed_at is not None and not row.reward_awarded:
        user.impact_points = int(user.impact_points or 0) + challenge.reward_points
        row.reward_awarded = True
        log_activity_event(
            user, db, "challenge", f"Completed: {challenge.title}",
            f"+{challenge.reward_points} Impact Points · {challenge.cadence.title()} challenge",
            challenge.reward_points, {"challenge_id": challenge.id, "period_key": row.period_key},
        )
        # Challenge rewards also count as one verified league action. League
        # points remain separate from Karma Coins and are idempotent by period.
        from app.services import leagues as league_service

        league = league_service.record_action(
            db,
            user,
            action_key=f"challenge:{challenge.id}:{row.period_key}",
            action_type="challenge",
            source="challenge",
            reward_points=challenge.reward_points,
            evidence={"challenge_id": challenge.id, "cadence": challenge.cadence},
            _commit=False,
        )
    else:
        league = None
    db.commit()
    payload = _challenge_payload(challenge, row)
    if league is not None:
        payload["league_points_awarded"] = int(league.get("awarded_points", 0))
        payload["league"] = league
    return payload
