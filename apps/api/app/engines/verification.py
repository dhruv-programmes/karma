"""Universal Sustainability Verification Engine (EcoProof / EcoScan).

Deterministic scoring and fraud-checking engine:
"AI observes. Rules verify. Math scores. History remembers."
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.db.models import (
    ActivityEventModel,
    EvidenceSubmissionModel,
    SustainabilityAssetModel,
    SustainabilityCreditHistoryModel,
    SustainabilityRewardModel,
    UserModel,
)
from app.schemas import (
    ImpactBreakdown,
    LongTermCredit,
    RewardsBreakdown,
    UniversalVerificationResponse,
    VerificationAnalysis,
)

# Standard grid emissions factor for India / general prototype: 0.82 kg CO2e / kWh
GRID_EMISSIONS_FACTOR_KG_PER_KWH = 0.82
EV_EMISSIONS_SAVED_PER_KM_KG = 0.12  # Average avoided tailpipe emissions vs ICE car

ADOPTION_REWARD_RATES = {
    "solar_pv": 500,
    "electric_vehicle": 500,
    "solar_water_heater": 300,
    "energy_efficient_appliance": 200,
    "other": 150,
}

GENERATION_RATE_POINTS_PER_KWH = 1.0
CHARGING_RATE_POINTS_PER_KWH = 2.0


def compute_image_hash(image_base64: str | None) -> str | None:
    if not image_base64:
        return None
    cleaned = image_base64.strip().encode("utf-8")
    return hashlib.sha256(cleaned).hexdigest()


def compute_period_key(
    period_start: str | None, period_end: str | None, evidence_date: str | None
) -> str | None:
    if period_start and period_end:
        return f"{period_start[:10]}:{period_end[:10]}"
    if period_start:
        return period_start[:7]  # YYYY-MM
    if evidence_date:
        return evidence_date[:7]  # YYYY-MM
    return None


def calculate_deterministic_impact(
    analysis: VerificationAnalysis,
) -> tuple[ImpactBreakdown, float]:
    """Calculate multi-dimensional environmental impact scores (0 - 100)."""
    asset_type = analysis.asset.type
    inputs = analysis.impact_inputs
    kwh = inputs.generation_kwh or 0.0
    distance_km = inputs.distance_km or 0.0
    co2_saved = 0.0

    if asset_type == "solar_pv":
        if kwh > 0:
            co2_saved = round(kwh * GRID_EMISSIONS_FACTOR_KG_PER_KWH, 2)
            carbon_dim = min(100, int(70 + min(30, kwh / 25)))
        else:
            carbon_dim = 85
            co2_saved = 50.0  # nominal baseline for adoption
        pollution_dim = 80
        energy_dim = 86
        resource_dim = 75
        risk_dim = 10
    elif asset_type == "electric_vehicle":
        if distance_km > 0:
            co2_saved = round(distance_km * EV_EMISSIONS_SAVED_PER_KM_KG, 2)
            carbon_dim = min(100, int(65 + min(35, distance_km / 50)))
        else:
            carbon_dim = 88
            co2_saved = 120.0
        pollution_dim = 92  # Zero tailpipe emissions
        energy_dim = 84
        resource_dim = 70
        risk_dim = 12
    else:
        co2_saved = 25.0
        carbon_dim = 75
        pollution_dim = 70
        energy_dim = 80
        resource_dim = 65
        risk_dim = 15

    overall = int(
        0.40 * carbon_dim
        + 0.20 * pollution_dim
        + 0.20 * energy_dim
        + 0.10 * resource_dim
        - 0.10 * risk_dim
    )
    overall = max(0, min(100, overall))

    return (
        ImpactBreakdown(
            overall=overall,
            carbon_reduction=carbon_dim,
            pollution_reduction=pollution_dim,
            energy_efficiency=energy_dim,
            resource_efficiency=resource_dim,
            ecological_risk=risk_dim,
            co2_saved_kg=co2_saved,
        ),
        co2_saved,
    )


def calculate_sustainability_credit(
    user: UserModel,
    db: Session,
    new_points: int = 0,
    is_duplicate: bool = False,
) -> LongTermCredit:
    """Calculate the user's longitudinal Sustainability Credit (SC 0 - 100)."""
    # Count verified assets
    verified_assets = (
        db.query(SustainabilityAssetModel)
        .filter(
            SustainabilityAssetModel.user_id == user.id,
            SustainabilityAssetModel.ownership_verified.is_(True),
        )
        .all()
    )
    adoption_count = len(verified_assets)

    # Sum verified generation kWh
    generation_submissions = (
        db.query(EvidenceSubmissionModel)
        .filter(
            EvidenceSubmissionModel.user_id == user.id,
            EvidenceSubmissionModel.verification_status == "VERIFIED",
            EvidenceSubmissionModel.metric_type == "GENERATION_KWH",
        )
        .all()
    )
    total_kwh = sum(s.metric_value or 0.0 for s in generation_submissions)

    # Consistency: count distinct periods verified
    distinct_periods = {
        s.period_key for s in generation_submissions if s.period_key
    }
    consistency_factor = round(1.0 + (len(distinct_periods) * 0.1), 2)

    # Longitudinal SC formula
    # Base: 50
    # + 12 per verified adoption (max 30)
    # + generation factor: up to 25
    # + consistency bonus: up to 20
    adoption_score = min(30, adoption_count * 15)
    generation_score = min(25, int(total_kwh / 50))
    consistency_score = min(20, len(distinct_periods) * 5)
    credit_score = min(100, max(20, 45 + adoption_score + generation_score + consistency_score))

    trend = "IMPROVING" if new_points > 0 else "STABLE"

    return LongTermCredit(
        sustainability_credit=credit_score,
        trend=trend,
        consistency_factor=consistency_factor,
        total_verified_kwh=round(total_kwh, 1),
        total_verified_adoptions=adoption_count,
    )


def run_deterministic_verification(
    user: UserModel,
    analysis: VerificationAnalysis,
    db: Session,
    image_hash: str | None = None,
) -> UniversalVerificationResponse:
    """Execute deterministic rules, duplicate checks, and reward scoring."""
    now = datetime.now(timezone.utc)
    v_block = analysis.verification
    a_block = analysis.asset
    f_block = analysis.fraud
    t_block = analysis.temporal
    i_block = analysis.impact_inputs
    s_block = analysis.short_run
    # 0. Early rejection — VLM marked evidence as not legitimate or insufficient
    if not v_block.legitimate or not v_block.sufficient_for_claim:
        credit = calculate_sustainability_credit(user, db, new_points=0)
        return UniversalVerificationResponse(
            status="SUSPICIOUS",
            verification_status="SUSPICIOUS",
            already_claimed=False,
            submission_id=None,
            asset_id=None,
            routing_hint=v_block.routing_hint,
            analysis=analysis,
            impact=None,
            rewards=RewardsBreakdown(),
            long_term=credit,
            message=v_block.reason or "Evidence is not valid sustainability proof.",
        )

    # 1. Exact Image Duplicate Check

    if image_hash:
        existing_image = (
            db.query(EvidenceSubmissionModel)
            .filter(
                EvidenceSubmissionModel.user_id == user.id,
                EvidenceSubmissionModel.image_hash == image_hash,
            )
            .first()
        )
        if existing_image:
            impact, _ = calculate_deterministic_impact(analysis)
            credit = calculate_sustainability_credit(user, db, new_points=0, is_duplicate=True)
            return UniversalVerificationResponse(
                status="DUPLICATE",
                verification_status="DUPLICATE",
                already_claimed=True,
                submission_id=existing_image.id,
                asset_id=existing_image.asset_id,
                routing_hint=v_block.routing_hint,
                analysis=analysis,
                impact=impact,
                rewards=RewardsBreakdown(),
                long_term=credit,
                message="This exact image has already been submitted and verified.",
            )

    # 2. Asset Resolution / Registration
    asset: SustainabilityAssetModel | None = None
    identifier = a_block.identifier or None

    if identifier:
        asset = (
            db.query(SustainabilityAssetModel)
            .filter(
                SustainabilityAssetModel.user_id == user.id,
                SustainabilityAssetModel.asset_type == a_block.type,
                SustainabilityAssetModel.identifier == identifier,
            )
            .first()
        )

    if not asset:
        # Check if user has an asset of this type without specific identifier
        asset = (
            db.query(SustainabilityAssetModel)
            .filter(
                SustainabilityAssetModel.user_id == user.id,
                SustainabilityAssetModel.asset_type == a_block.type,
            )
            .first()
        )

    if not asset:
        asset = SustainabilityAssetModel(
            user_id=user.id,
            asset_type=a_block.type,
            subtype=a_block.subtype,
            identifier=identifier,
            capacity_kw=i_block.capacity_kw,
            ownership_verified=a_block.ownership_verified,
            ownership_verified_at=now if a_block.ownership_verified else None,
            adoption_reward_claimed=False,
            meta_json=json.dumps({"source": "UniversalVerificationEngine"}),
        )
        db.add(asset)
        db.flush()
    else:
        # Update asset if newly verified
        if a_block.ownership_verified and not asset.ownership_verified:
            asset.ownership_verified = True
            asset.ownership_verified_at = now
        if identifier and not asset.identifier:
            asset.identifier = identifier
        if i_block.capacity_kw and not asset.capacity_kw:
            asset.capacity_kw = i_block.capacity_kw
        db.flush()

    # 3. Plausibility & Fraud Checks
    is_suspicious = False
    suspicious_reason = ""

    # Plausibility check for Solar Generation vs Capacity
    if a_block.type == "solar_pv" and i_block.generation_kwh:
        capacity = i_block.capacity_kw or asset.capacity_kw or 5.0
        # 350 full sun hours in a month is physically implausible anywhere on Earth
        if i_block.generation_kwh > (capacity * 350):
            is_suspicious = True
            suspicious_reason = (
                f"Reported solar generation ({i_block.generation_kwh} kWh) exceeds maximum "
                f"theoretical threshold for {capacity} kW capacity."
            )
            f_block.measurement_anomaly_risk = 0.85
            f_block.needs_manual_review = True

    if f_block.manipulation_risk > 0.65 or f_block.screen_photo_risk > 0.90:
        is_suspicious = True
        suspicious_reason = "Visual anomalies or screen recapture detected."

    if not v_block.legitimate or v_block.confidence < 0.60:
        is_suspicious = True
        suspicious_reason = v_block.reason or "Evidence legibility or legitimacy insufficient."

    # 4. Duplicate Check by Period / Adoption
    if s_block.reward_type == "ADOPTION":
        metric_type = "ADOPTION"
        period_key = None
    else:
        metric_type = (
            "GENERATION_KWH"
            if i_block.generation_kwh
            else ("USAGE_KWH" if i_block.energy_consumption_kwh else "ADOPTION")
        )
        period_key = compute_period_key(
            t_block.billing_period_start,
            t_block.billing_period_end,
            t_block.evidence_date,
        )

    metric_value = i_block.generation_kwh or i_block.energy_consumption_kwh or i_block.distance_km

    already_claimed = False
    existing_period = None
    if s_block.reward_type == "ADOPTION":
        if asset.adoption_reward_claimed:
            already_claimed = True
    elif period_key and metric_type in ("GENERATION_KWH", "USAGE_KWH"):
        existing_period = (
            db.query(EvidenceSubmissionModel)
            .filter(
                EvidenceSubmissionModel.user_id == user.id,
                EvidenceSubmissionModel.asset_id == asset.id,
                EvidenceSubmissionModel.metric_type == metric_type,
                EvidenceSubmissionModel.period_key == period_key,
                EvidenceSubmissionModel.verification_status == "VERIFIED",
            )
            .first()
        )
        if existing_period:
            already_claimed = True

    if already_claimed:
        impact, _ = calculate_deterministic_impact(analysis)
        credit = calculate_sustainability_credit(user, db, new_points=0, is_duplicate=True)
        return UniversalVerificationResponse(
            status="DUPLICATE",
            verification_status="DUPLICATE",
            already_claimed=True,
            submission_id=existing_period.id if existing_period else None,
            asset_id=asset.id,
            routing_hint=v_block.routing_hint,
            analysis=analysis,
            impact=impact,
            rewards=RewardsBreakdown(),
            long_term=credit,
            message=(
                "Adoption reward already claimed for this asset."
                if s_block.reward_type == "ADOPTION"
                else f"Submission already exists for billing period {period_key}."
            ),
        )

    # 5. Deterministic Scoring
    impact, co2_saved = calculate_deterministic_impact(analysis)
    rewards = RewardsBreakdown()

    final_status = "SUSPICIOUS" if is_suspicious else "VERIFIED"

    if final_status == "VERIFIED":
        if s_block.reward_type == "ADOPTION":
            adoption_pts = ADOPTION_REWARD_RATES.get(a_block.type, 200)
            rewards.adoption_points = adoption_pts
            rewards.total_points += adoption_pts
            asset.adoption_reward_claimed = True
        elif s_block.reward_type == "GENERATION":
            gen_pts = int((i_block.generation_kwh or 0.0) * GENERATION_RATE_POINTS_PER_KWH)
            rewards.generation_points = gen_pts
            # Performance bonus if generation > expected
            cap = asset.capacity_kw or i_block.capacity_kw or 5.0
            if (i_block.generation_kwh or 0.0) > (cap * 110):
                bonus = min(150, int((i_block.generation_kwh or 0.0) * 0.12))
                rewards.performance_bonus = bonus
            rewards.total_points = rewards.generation_points + rewards.performance_bonus
        elif s_block.reward_type == "USAGE":
            usage_pts = int((i_block.energy_consumption_kwh or 0.0) * CHARGING_RATE_POINTS_PER_KWH)
            if not usage_pts and i_block.distance_km:
                usage_pts = int(i_block.distance_km * 0.5)
            rewards.usage_points = max(10, usage_pts)
            rewards.total_points = rewards.usage_points

    # 6. Save Submission to Database
    submission = EvidenceSubmissionModel(
        user_id=user.id,
        asset_id=asset.id,
        evidence_type=v_block.evidence_type,
        image_hash=image_hash,
        verification_status=final_status,
        confidence=v_block.confidence,
        sufficient_for_claim=v_block.sufficient_for_claim,
        metric_type=metric_type,
        metric_value=metric_value,
        period_start=t_block.billing_period_start,
        period_end=t_block.billing_period_end,
        period_key=period_key,
        extracted_data_json=json.dumps(analysis.model_dump()),
        fraud_checks_json=json.dumps(f_block.model_dump()),
        explanation=suspicious_reason if is_suspicious else analysis.explanation,
    )
    db.add(submission)
    db.flush()

    # 7. Record Rewards & Update User Points
    if rewards.total_points > 0 and final_status == "VERIFIED":
        user.impact_points = int(user.impact_points) + rewards.total_points

        # Record reward in ledger
        reward_record = SustainabilityRewardModel(
            user_id=user.id,
            asset_id=asset.id,
            submission_id=submission.id,
            reward_type=s_block.reward_type,
            points=rewards.total_points,
            co2_saved_kg=co2_saved,
            breakdown_json=json.dumps(rewards.model_dump()),
        )
        db.add(reward_record)

        # Log Activity Event
        event_title = (
            f"Verified {a_block.type.replace('_', ' ').title()}"
            if s_block.reward_type == "ADOPTION"
            else f"Verified Clean Energy Generation (+{rewards.total_points} pts)"
        )
        event_desc = (
            f"Verified {v_block.evidence_type} · +{rewards.total_points} Impact Points"
        )
        activity_event = ActivityEventModel(
            user_id=user.id,
            kind="sustainability_evidence_verification",
            title=event_title,
            subtitle=event_desc,
            points_delta=rewards.total_points,
            created_at=now.isoformat(),
            meta_json=json.dumps({
                "submission_id": submission.id,
                "asset_id": asset.id,
                "asset_type": a_block.type,
                "reward_type": s_block.reward_type,
                "co2_saved_kg": co2_saved,
            }),
        )
        db.add(activity_event)

    # 8. Calculate & Update Longitudinal Sustainability Credit
    credit = calculate_sustainability_credit(
        user, db, new_points=rewards.total_points, is_duplicate=already_claimed
    )
    credit_record = SustainabilityCreditHistoryModel(
        user_id=user.id,
        credit_score=credit.sustainability_credit,
        trend=credit.trend,
        consistency_factor=credit.consistency_factor,
        total_verified_generation_kwh=credit.total_verified_kwh,
        total_verified_adoption_count=credit.total_verified_adoptions,
        summary_json=json.dumps({
            "latest_submission_id": submission.id,
            "latest_asset_id": asset.id,
            "overall_impact": impact.overall,
        }),
    )
    db.add(credit_record)
    db.commit()

    message = (
        suspicious_reason
        if is_suspicious
        else (
            "Verification successful! Rewards and impact credited."
            if not already_claimed
            else "Already verified. No duplicate points awarded."
        )
    )

    return UniversalVerificationResponse(
        status=final_status,
        verification_status=final_status,
        already_claimed=already_claimed,
        submission_id=submission.id,
        asset_id=asset.id,
        routing_hint=v_block.routing_hint,
        analysis=analysis,
        impact=impact,
        rewards=rewards,
        long_term=credit,
        message=message,
    )
