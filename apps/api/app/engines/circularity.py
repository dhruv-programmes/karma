from __future__ import annotations

from dataclasses import dataclass

from app.schemas import ActionType, CircularOption, EffortLevel, UserPreferences


@dataclass
class RankingWeights:
    environmental: float = 0.35
    financial: float = 0.25
    feasibility: float = 0.15
    personalization: float = 0.15
    local_availability: float = 0.15
    effort_penalty: float = 0.15


DEFAULT_WEIGHTS = RankingWeights()

EFFORT_SCORE = {
    EffortLevel.LOW: 0.2,
    EffortLevel.MEDIUM: 0.5,
    EffortLevel.HIGH: 0.85,
}


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def score_option(
    option: CircularOption,
    prefs: UserPreferences,
    weights: RankingWeights = DEFAULT_WEIGHTS,
) -> float:
    """
    action_score =
      env + financial + feasibility + personalization + local - effort
    """
    env = clamp01(option.co2e_avoided_kg / 150.0)

    money = option.money_return_inr or 0.0
    if option.action_type == ActionType.REPLACE:
        financial = clamp01(1.0 - (option.estimated_cost_inr / 100000.0))
    elif money > 0:
        financial = clamp01(money / 20000.0)
    else:
        # savings vs replacement-ish costs
        financial = clamp01((20000.0 - option.estimated_cost_inr) / 20000.0)

    feasibility = clamp01(option.convenience)
    local = 1.0 if "nearby" in option.availability.lower() or "available" in option.availability.lower() else 0.45

    personalization = (
        prefs.eco_priority * env
        + prefs.budget_sensitivity * financial
        + prefs.convenience_preference * feasibility
    ) / max(
        prefs.eco_priority + prefs.budget_sensitivity + prefs.convenience_preference,
        0.01,
    )

    effort = EFFORT_SCORE.get(option.effort, 0.5)

    return (
        weights.environmental * env
        + weights.financial * financial
        + weights.feasibility * feasibility
        + weights.personalization * personalization
        + weights.local_availability * local
        - weights.effort_penalty * effort
    ) * 100.0


def rank_options(
    options: list[CircularOption],
    prefs: UserPreferences,
    weights: RankingWeights | None = None,
) -> list[CircularOption]:
    w = weights or DEFAULT_WEIGHTS
    scored: list[CircularOption] = []
    for opt in options:
        updated = opt.model_copy(update={"score": round(score_option(opt, prefs, w), 2)})
        scored.append(updated)
    return sorted(scored, key=lambda o: o.score, reverse=True)
