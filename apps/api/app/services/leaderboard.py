"""Friends, leaderboard, and renewable challenge domain services."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.models import (
    ChallengeModel,
    FriendConnectionModel,
    UserCompletedActionModel,
    UserDailyStepsModel,
    UserChallengeProgressModel,
    UserModel,
)
from app.services.core import log_activity_event


class ChallengeNotReadyError(ValueError):
    """Raised when a user tries to claim a challenge without evidence."""


def _period_start(cadence: str, today: date | None = None) -> date:
    current = today or date.today()
    if cadence == "daily":
        return current
    if cadence == "weekly":
        return current - timedelta(days=current.weekday())
    if cadence == "monthly":
        return current.replace(day=1)
    raise ValueError(f"Unsupported challenge cadence: {cadence}")


def _measured_progress(db: Session, user: UserModel, challenge: ChallengeModel) -> int:
    """Read challenge progress only from persisted, verifiable app evidence.

    The client may request a progress update, but it can never supply the
    value used for completion. Unknown challenge types intentionally report
    zero rather than accepting a fabricated claim.
    """
    start = _period_start(challenge.cadence).isoformat()
    end = date.today().isoformat()
    if challenge.goal_kind in {"steps", "walking"}:
        total = db.query(UserDailyStepsModel).filter(
            UserDailyStepsModel.user_id == user.id,
            UserDailyStepsModel.date >= start,
            UserDailyStepsModel.date <= end,
        ).with_entities(UserDailyStepsModel.steps).all()
        return sum(int(row[0] or 0) for row in total)
    if challenge.goal_kind == "repair_action":
        return db.query(UserCompletedActionModel).filter(
            UserCompletedActionModel.user_id == user.id,
            UserCompletedActionModel.completed_at >= datetime.combine(_period_start(challenge.cadence), datetime.min.time()),
            UserCompletedActionModel.action_type.in_(("repair", "refurbish", "donate", "resell")),
        ).count()
    if challenge.goal_kind == "green_actions":
        return db.query(UserCompletedActionModel).filter(
            UserCompletedActionModel.user_id == user.id,
            UserCompletedActionModel.completed_at >= datetime.combine(_period_start(challenge.cadence), datetime.min.time()),
        ).count()
    # Walking challenges use verified phone step totals above. GPS commute
    # and cycling events are intentionally not evidence for challenges.
    return 0


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


def _carbon_score(user: UserModel) -> int:
    """Return the same server-owned CCS value used by every leaderboard view."""
    return int(
        user.verified_score
        if user.verified_score is not None
        else (user.provisional_score or 650)
    )


def _user_metrics(user: UserModel) -> dict[str, int]:
    """Expose canonical balances when a user is found for a friend request.

    Search results used to contain only identity fields, which made the client
    create a friend row with zero coins/default CCS until another leaderboard
    refresh. Keeping these values beside the identity makes the global and
    friends views use one source of truth.
    """
    return {
        "impact_points": int(user.impact_points or 0),
        "carbon_score": _carbon_score(user),
    }


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
            **_user_metrics(user),
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
    return {
        "id": target.id,
        "username": _public_username(target),
        "name": target.name,
        "status": "accepted",
        **_user_metrics(target),
    }


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
    return [
        {
            "id": u.id,
            "username": _public_username(u),
            "name": u.name,
            "status": "accepted",
            **_user_metrics(u),
        }
        for u in rows
    ]


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
        return _carbon_score(u)

    users.sort(key=lambda u: (-score(u), _public_username(u).lower(), u.id))
    entries = []
    for rank, user in enumerate(users, start=1):
        entries.append({
            "rank": rank,
            "user_id": user.id,
            "username": _public_username(user),
            "name": user.name,
            "reward_points": int(user.impact_points or 0),
            "carbon_credit_score": _carbon_score(user),
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
        # Keep the displayed progress tied to current-period evidence. This
        # also prevents an old client-side value from surviving a refresh.
        row.progress = min(_measured_progress(db, user, challenge), challenge.goal_value)
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


def update_challenge_progress(
    db: Session,
    user: UserModel,
    challenge_id: UUID,
    progress: int,
    *,
    require_completion: bool = False,
) -> dict:
    challenge = db.query(ChallengeModel).filter(ChallengeModel.id == str(challenge_id), ChallengeModel.active.is_(True)).first()
    if challenge is None:
        raise ValueError("Challenge not found")
    row = _progress_row(db, user, challenge)
    measured = min(_measured_progress(db, user, challenge), challenge.goal_value)
    # ``progress`` is retained in the signature for API compatibility only;
    # accepting it as evidence would let a caller mint challenge rewards.
    del progress
    row.progress = measured
    if require_completion and measured < challenge.goal_value:
        db.commit()
        raise ChallengeNotReadyError(
            f"Challenge requires {challenge.goal_value} {challenge.goal_kind}; "
            f"verified progress is {measured}."
        )
    if row.progress >= challenge.goal_value and row.completed_at is None:
        row.completed_at = datetime.now(timezone.utc)
    points_awarded = 0
    if row.completed_at is not None and not row.reward_awarded:
        user.impact_points = int(user.impact_points or 0) + challenge.reward_points
        row.reward_awarded = True
        points_awarded = challenge.reward_points
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
    payload["points_awarded"] = points_awarded
    if league is not None:
        payload["league_points_awarded"] = int(league.get("awarded_points", 0))
        payload["league"] = league
    return payload
