from __future__ import annotations

from uuid import UUID

from app.schemas import ActionType, CircularityBreakdown, Product
from app.seed.data import demo_state, unlock_badge

ACTION_POINTS = {
    ActionType.REPAIR: 100,
    ActionType.RECYCLE: 150,
    ActionType.REFURBISH: 120,
    ActionType.DONATE: 100,
    ActionType.RESELL: 90,
    ActionType.REDUCE: 80,
    ActionType.REPLACE: 0,
}

ACTION_SCORE_BUMP = {
    ActionType.REPAIR: 3,
    ActionType.RECYCLE: 2,
    ActionType.REFURBISH: 3,
    ActionType.DONATE: 2,
    ActionType.RESELL: 2,
    ActionType.REDUCE: 2,
    ActionType.REPLACE: 0,
}


def product_circularity_score(product: Product) -> tuple[int, CircularityBreakdown]:
    b = product.circularity_breakdown
    score = round(
        (
            b.repairability
            + b.longevity
            + b.recyclability
            + b.reuse_potential
            + b.circular_options
        )
        / 5.0
    )
    return score, b


def user_circularity_score() -> int:
    """Based on measurable behavior — opening the app does not earn points."""
    return demo_state.user.circularity_score


def complete_action(action_id: UUID, action_type: ActionType | None = None) -> dict:
    user = demo_state.user
    if action_id in demo_state.completed_action_ids:
        return {
            "action_id": action_id,
            "points_awarded": 0,
            "previous_score": user.circularity_score,
            "new_score": user.circularity_score,
            "message": "Action already completed",
            "badges_unlocked": [],
            "loop_level": user.loop_level,
        }

    inferred = action_type
    if inferred is None:
        for rec in demo_state.recommendations:
            if rec.id == action_id:
                inferred = rec.action_type
                break
    if inferred is None:
        inferred = ActionType.REPAIR

    points = ACTION_POINTS.get(inferred, 50)
    bump = ACTION_SCORE_BUMP.get(inferred, 1)
    previous = user.circularity_score

    demo_state.completed_action_ids.add(action_id)
    user.impact_points += points
    user.circularity_score = min(100, previous + bump)
    user.streak_days += 1
    user.trend_delta = max(user.trend_delta, bump)
    demo_state.sync_level()

    badges: list[str] = []
    if inferred == ActionType.REPAIR and unlock_badge("first_repair"):
        badges.append("first_repair")
    if inferred == ActionType.RECYCLE and unlock_badge("e_waste_hero"):
        badges.append("e_waste_hero")
    if user.streak_days >= 7 and unlock_badge("streak_7"):
        badges.append("streak_7")

    return {
        "action_id": action_id,
        "points_awarded": points,
        "previous_score": previous,
        "new_score": user.circularity_score,
        "message": f"+{points} Impact Points",
        "badges_unlocked": badges,
        "loop_level": user.loop_level,
    }
