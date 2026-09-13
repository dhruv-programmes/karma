# Universal Sustainability Verification & Reward Engine

## 1. Project Overview

### Working name
**EcoProof / EcoScan** — a local-first multimodal AI system that verifies sustainability and renewable-energy evidence captured through an in-app camera, extracts structured facts, estimates environmental impact, and converts verified actions into short-term rewards and a long-term Sustainability Credit.

### Core idea
The system is **not** simply an image classifier that says “solar panel detected.” It is a **verification + impact + rewards engine**.

User flow:

```text
User selects evidence type
        ↓
In-app camera capture
        ↓
Local Vision-Language Model
        ↓
Evidence extraction
        ↓
Legitimacy / fraud / duplicate checks
        ↓
Deterministic impact calculation
        ↓
Reward calculation
        ↓
Long-term Sustainability Credit
        ↓
Stored evidence + history + trend
```

### Design principle
The VLM should **observe, extract, classify, explain, and flag**. It should **not directly invent the final reward points or environmental score**.

The final numerical rewards should come from a deterministic scoring engine that operates on structured facts and published rules.

---

# 2. Product Goals

## Primary goals

1. Encourage adoption of renewable energy and environmentally beneficial technologies.
2. Reward **verified adoption** once rather than repeatedly.
3. Reward **continued real-world usage** where measurable evidence exists.
4. Convert actual generation/usage into environmental impact rather than awarding points merely for owning equipment.
5. Prevent obvious evidence reuse, duplicate submissions, fabricated documents, and implausible measurements.
6. Keep inference local for privacy, speed, and cost control.
7. Produce structured JSON that can be consumed by a mobile/web application.

## Important distinction

The system should distinguish between:

- **Adoption** — “I own/have installed this.”
- **Usage** — “I am actually using it.”
- **Generation** — “It is actually producing renewable energy.”
- **Environmental impact** — “This activity is likely reducing emissions/pollution/resource use.”
- **Sustained behavior** — “The benefit continues over months.”

This distinction prevents the system from rewarding a person heavily for a one-time photograph of a product that may not be used.

---

# 3. Scope of the First Version

The first version should support a focused but extensible set of evidence types.

## Tier 1: strongest initial use cases

### Solar PV
Evidence:
- Electricity bill showing solar generation.
- Net-metering statement.
- Solar generation/inverter dashboard.
- Solar installation photograph.
- Installation invoice/certificate.

Key recurring metric:
- **Solar units generated (kWh).**

### Electric vehicle
Evidence:
- Registration certificate / RC book.
- Official vehicle document.
- Vehicle photograph.
- Charging receipt or charging-session evidence.
- Electricity/charger usage evidence where available.

Key recurring metric:
- Verified charging/usage evidence.
- Optional distance driven if reliable evidence is available.

### Solar water heater
Evidence:
- Installation photograph.
- Invoice/certificate.
- Utility/energy-use evidence if available.

### Electric appliance / energy-efficient appliance
Evidence:
- Product label / model label.
- Purchase invoice.
- Energy-rating label.

Recurring usage should only be rewarded when a reliable measurement source exists.

### Other future categories
- Wind micro-generation.
- Biogas.
- Biomass systems.
- Heat pumps.
- Rainwater harvesting.
- Energy-efficient buildings.
- Public transport / cycling / shared mobility.
- Battery storage.
- Green-certified construction materials.

The architecture should use a generic `asset_type` + `evidence_type` model so these categories can be added without rebuilding the backend.

---

# 4. Evidence Philosophy

## 4.1 Evidence hierarchy

Each submission receives an evidence strength level.

### Level A — direct quantitative evidence
Best for recurring rewards.

Examples:
- Electricity/net-metering bill with generation values.
- Official charging statement.
- Meter/inverter generation report.

### Level B — official ownership/adoption evidence
Strong for one-time rewards.

Examples:
- Vehicle registration certificate.
- Installation certificate.
- Utility registration.

### Level C — physical existence evidence
Useful for confirmation but weaker than official records.

Examples:
- Photograph of solar installation.
- Photograph of EV.
- Photograph of equipment nameplate.

### Level D — weak contextual evidence
Should generally not create substantial rewards.

Examples:
- Generic photograph of a product without identifiable ownership.
- Promotional material.
- Unverifiable screenshot.

---

# 5. In-App Camera Requirement

The product should not expose a normal “upload anything” workflow for verification.

Instead:

```text
Select evidence type
      ↓
Open camera
      ↓
Capture image/document
      ↓
Optional second image if requested
      ↓
Local verification
```

## Why

This reduces the easiest form of abuse: submitting a random internet image.

However, camera-only capture is **not** treated as cryptographic proof. A user can still photograph:
- Another person's document.
- A computer/phone screen.
- A printed copy.
- An old document.

Therefore the system also requires identity/evidence matching, duplicate detection, timestamp/history checks, and plausibility checks.

---

# 6. Capture Authenticity Layer

The client should capture metadata where technically available and appropriate:

```json
{
  "capture": {
    "source": "in_app_camera",
    "captured_at": "ISO-8601 timestamp",
    "camera_session_id": "unique ID",
    "front_or_rear_camera": "rear",
    "image_hash": "SHA-256/perceptual hash"
  }
}
```

Do not treat metadata alone as proof of authenticity.

## Visual capture checks

The VLM / image processing layer can flag:
- Photograph of a screen.
- Heavy image recompression.
- Obvious screenshot UI.
- Cropped or incomplete document.
- Missing required fields.
- Contradictory fields.
- Document type mismatch.
- Excessive blur.
- Manipulation indicators.

These should be **risk signals**, not accusations.

Example:

```json
{
  "capture_risk": {
    "screen_photo_risk": 0.04,
    "manipulation_risk": 0.08,
    "quality_score": 0.91,
    "needs_retake": false
  }
}
```

---

# 7. Core AI Architecture

## Recommended architecture

```text
                    ┌──────────────────────┐
                    │     Mobile / Web     │
                    │   Camera + UI        │
                    └──────────┬───────────┘
                               │
                               ↓
                    ┌──────────────────────┐
                    │ Local inference API  │
                    │  OpenAI-compatible   │
                    │      endpoint        │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │       VLM            │
                    │ Gemma 4 E4B / Qwen   │
                    │      Vision          │
                    └──────────┬───────────┘
                               │
                          Strict JSON
                               │
                    ┌──────────▼───────────┐
                    │ Evidence Validator   │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │ Duplicate / History  │
                    │     Engine           │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │ Impact Calculation   │
                    │    Engine            │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │ Reward / Credit      │
                    │    Engine            │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │ Database + Audit Log │
                    └──────────────────────┘
```

---

# 8. Model Strategy

## Primary model to test

### Gemma 4 E4B Vision / approximately 7.5B-class local model

Use it as the first baseline because it fits the local-first design and should be fast enough for interactive inference on appropriate hardware.

## Strong alternative

### Qwen2.5-VL 7B

This is a very relevant benchmark for this project because the workload contains:
- Document understanding.
- OCR-like extraction.
- Tables.
- Bills.
- IDs.
- Numerical values.
- Visual grounding.
- Structured output.

## Additional benchmark candidate

### Newer Qwen-VL family model that fits the available hardware

The exact model should be selected after measuring local latency and memory consumption rather than choosing only from benchmark claims.

## Model selection experiment

Run the same test dataset through each candidate and compare:

| Metric | Description |
|---|---|
| Object/evidence accuracy | Correct identification of evidence type |
| Field extraction accuracy | Correct extraction of model, meter, date, kWh, etc. |
| JSON validity | Percentage of outputs that parse successfully |
| Hallucination rate | Invented/missing facts |
| Verification precision | Genuine evidence correctly accepted |
| False acceptance | Invalid evidence incorrectly accepted |
| Duplicate detection support | Ability to identify repeated/related evidence |
| Latency | Time per image |
| VRAM/RAM | Runtime resource usage |
| Consistency | Same input gives stable structured output |

Do not select the model purely by “reasoning benchmark” score. The application is fundamentally an **evidence extraction and verification** workload.

---

# 9. Local Inference Server

Expose the local model through an API such as:

```text
POST /v1/verify
```

Request:

```json
{
  "user_id": "USER123",
  "evidence_type_hint": "solar_bill",
  "image": "local/base64/reference",
  "session_id": "SESSION456"
}
```

Response:

```json
{
  "request_id": "REQ789",
  "status": "ok",
  "analysis": { }
}
```

Possible local-serving technologies:
- llama.cpp server.
- Ollama.
- vLLM if GPU resources justify it.
- LM Studio local server during development.

The application should communicate with a stable **OpenAI-compatible API layer** where possible, so the underlying local model can be swapped without rewriting the application.

---

# 10. VLM Prompting Strategy

Use a strong system prompt with explicit rules.

## Core rules

1. Never assume a fact that is not visible in the submitted evidence.
2. Separate observed facts from inferred facts.
3. Extract exact numeric values exactly as shown.
4. Return `null` when a value is not visible.
5. Never calculate reward points.
6. Never invent an environmental score.
7. Flag ambiguity instead of guessing.
8. Identify the evidence type.
9. Identify whether the evidence appears relevant to the claimed asset.
10. Identify suspicious inconsistencies.
11. Return valid JSON only.
12. Explain why evidence is accepted, rejected, or requires review.

## Example system prompt

```text
You are the Evidence Verification Vision Model for a sustainability rewards system.

Your task is to inspect ONLY the submitted camera image and extract observable evidence.
Do not award points and do not invent environmental impact numbers.

You must:
1. Identify the document/object/evidence type.
2. Determine the claimed sustainability asset.
3. Extract visible fields exactly as written.
4. Distinguish observed facts from uncertain inference.
5. Identify contradictions, missing fields, suspicious alterations, or poor image quality.
6. Decide whether the evidence is sufficient for the requested verification level.
7. Return structured JSON matching the required schema.
8. Use null for fields that cannot be reliably read.
9. Never guess a number.
10. Never use outside knowledge as if it were visible evidence.

The downstream system will independently calculate environmental impact and reward points.
```

---

# 11. Universal JSON Output Schema

Recommended top-level schema:

```json
{
  "verification": {
    "legitimate": true,
    "evidence_type": "SOLAR_ELECTRICITY_BILL",
    "evidence_quality": "HIGH",
    "confidence": 0.96,
    "sufficient_for_claim": true,
    "reason": "..."
  },

  "asset": {
    "type": "solar_pv",
    "subtype": "rooftop_solar",
    "ownership_verified": true
  },

  "observations": {
    "fields": [],
    "visible_text": [],
    "measurements": []
  },

  "temporal": {
    "evidence_date": null,
    "billing_period_start": null,
    "billing_period_end": null,
    "recency_status": "CURRENT"
  },

  "fraud": {
    "duplicate_risk": 0.01,
    "screen_photo_risk": 0.02,
    "manipulation_risk": 0.03,
    "identity_mismatch_risk": 0.00,
    "measurement_anomaly_risk": 0.01,
    "needs_manual_review": false
  },

  "impact_inputs": {
    "capacity_kw": null,
    "generation_kwh": null,
    "distance_km": null,
    "energy_consumption_kwh": null
  },

  "short_run": {
    "eligible": true,
    "reward_type": "ADOPTION"
  },

  "long_run": {
    "eligible": true,
    "measurement_type": "GENERATION"
  },

  "explanation": "..."
}
```

The scoring engine then adds:

```json
{
  "impact": {
    "overall": 88,
    "carbon_reduction": 91,
    "pollution_reduction": 80,
    "energy_efficiency": 86,
    "resource_efficiency": 75,
    "ecological_risk": 10
  },
  "rewards": {
    "adoption_points": 500,
    "usage_points": 0,
    "generation_points": 612,
    "performance_bonus": 74,
    "total_points": 1186
  },
  "long_term": {
    "sustainability_credit": 81,
    "trend": "IMPROVING"
  }
}
```

---

# 12. Legitimacy vs Gimmick Detection

The system should explicitly answer:

> **Is this actually evidence of a sustainability action, or is it weak/gimmicky/irrelevant evidence?**

This should not be a purely binary VLM decision.

Use a layered decision:

```text
VLM evidence confidence
        +
Evidence strength
        +
User/history consistency
        +
Duplicate check
        +
Numerical plausibility
        ↓
Final verification decision
```

Possible states:

```text
VERIFIED
PROVISIONALLY_VERIFIED
INSUFFICIENT_EVIDENCE
SUSPICIOUS
DUPLICATE
MANUAL_REVIEW
REJECTED
```

---

# 13. Duplicate and Reuse Prevention

This is mandatory because rewards are persistent.

## Store per evidence item

```text
submission_id
user_id
asset_id
evidence_type
capture_timestamp
image_hash
perceptual_hash
normalized_document_fingerprint
extracted identifiers
billing_period
reward_status
```

## Duplicate levels

### Exact duplicate
Same file/image.

### Near duplicate
Same image with cropping/compression/rotation.

### Document duplicate
Same meter/consumer/account/document number + same period.

### Semantic duplicate
Same physical asset submitted again for the same one-time adoption reward.

Use perceptual hashing and extracted identifiers before asking the VLM to reason about duplication again.

---

# 14. One-Time vs Recurring Rewards

## One-time reward

Examples:
- Registering an EV.
- Installing solar.
- Installing a solar water heater.

One asset should have one adoption reward.

Database constraint:

```text
UNIQUE(user_id, asset_id, adoption_reward_type)
```

## Recurring reward

Examples:
- Solar electricity generation for a billing month.
- Verified charging usage.
- Monthly energy-saving evidence.

Use a period key:

```text
UNIQUE(user_id, asset_id, metric_type, period_start, period_end)
```

This prevents repeated submission of the same month.

---

# 15. Solar Verification Design

## 15.1 Evidence accepted

Strong evidence:
- Electricity bill.
- Net-metering statement.
- Inverter generation report.
- Utility portal statement captured in camera.

Supporting evidence:
- Solar panel photograph.
- Installation certificate.
- Installation invoice.

## 15.2 Data extraction

Important fields:

```text
consumer/account number
meter number
billing period
installed capacity
opening reading
closing reading
solar generation
imported energy
exported energy
net energy
```

The model should extract values **exactly as displayed**.

## 15.3 Generation-based reward

The recurring reward should be primarily based on **verified solar generation in kWh**.

Conceptual formula:

```text
Generation Reward
    = Verified kWh × Reward Rate
```

Then optionally:

```text
Total Solar Reward
    = Generation Reward
    + Verified Performance Bonus
    − Anomaly Adjustment
```

The actual rate should be configurable from a server-side rules table.

## 15.4 Performance incentive

To encourage maintenance and productive use:

```text
Performance Ratio
    = Actual Generation / Expected Generation
```

Expected generation should be estimated from:
- System capacity.
- Location/solar resource assumptions.
- Time period.
- Season.
- Historical production.

Do not let the VLM determine expected generation.

Use engineering/scoring logic outside the model.

## 15.5 Plausibility checks

Example:

```text
Reported generation
        ↓
Compare with installed capacity
        ↓
Estimate maximum plausible range
        ↓
Compare with user's history
        ↓
Compare with previous/next billing period
        ↓
Normal / suspicious
```

A suspicious value should result in:

```json
{
  "measurement_anomaly": true,
  "needs_manual_review": true
}
```

rather than automatically accusing the user of fraud.

---

# 16. EV Verification Design

## 16.1 Ownership verification

The user photographs the RC book/document.

Extract:

```text
registration number
vehicle make
vehicle model
fuel/power type
owner name
registration date
vehicle class
```

Only the minimum necessary personal data should be stored.

## 16.2 Asset registration

Create an internal asset:

```json
{
  "asset_id": "EV-123",
  "type": "electric_vehicle",
  "registration_hash": "...",
  "vehicle_model": "...",
  "ownership_verified": true,
  "adoption_reward_claimed": true
}
```

Sensitive identifiers should be encrypted or hashed where possible.

## 16.3 Recurring usage

Possible evidence:
- Charging session receipt.
- Charging-app/session summary captured in camera.
- EV dashboard/odometer image.
- Electricity/charging meter record.

The safest first implementation is to reward **verified charging/energy evidence**, rather than trying to estimate environmental benefit from an odometer alone.

Later, combine:

```text
Charging energy
×
vehicle efficiency assumptions
×
regional electricity emissions factor
```

and compare with an appropriate ICE baseline if a robust methodology is defined.

---

# 17. Environmental Impact Model

The user requested an **overall** score, so use a transparent multi-dimensional framework.

Recommended dimensions:

```text
Carbon reduction
Pollution reduction
Energy efficiency
Resource efficiency
Ecological risk
```

Normalize each dimension to 0–100.

Example overall score:

```text
Overall Impact
 = w1*Carbon
 + w2*Pollution
 + w3*Energy
 + w4*Resource
 - w5*EcologicalRisk
```

The weights should be configuration values, not hard-coded inside the VLM prompt.

Example initial weights:

```text
Carbon:             40%
Pollution:          20%
Energy efficiency:  20%
Resource efficiency:10%
Ecological risk:    10% penalty
```

These are **prototype defaults**, not scientific truth. The final methodology should be justified and documented.

---

# 18. Why Impact Is Not the Same as Ownership

Example:

### Solar A
- 5 kWp installation.
- Produces 620 kWh/month.

### Solar B
- 5 kWp installation.
- Produces 150 kWh/month.

Both have the same adoption status.

They should not necessarily receive the same recurring impact reward.

This produces the central incentive mechanism:

> **Adopt → use → maintain → generate → earn.**

---

# 19. Sustainability Credit

Do not call this a financial credit score unless the system is actually validated for credit-risk use.

Recommended name:

**Sustainability Credit (SC)**

or

**Environmental Impact Credit (EIC)**

## Proposed components

```text
Adoption history
+ verified usage
+ verified generation
+ consistency
+ environmental impact
− anomaly/fraud penalties
```

The score should have inertia so one unusually good month does not completely dominate a long record.

Conceptual model:

```text
SC_t
 = α × SC_(t-1)
 + β × CurrentImpact
 + γ × Consistency
 + δ × VerifiedAdoption
```

All terms should be normalized.

Use a transparent published formula for the prototype.

---

# 20. Short-Run Reward Score

The short-run score exists to provide immediate motivation.

Examples:

```text
Register verified EV       → adoption points
Install verified solar     → adoption points
Generate 500 kWh this month→ generation points
Maintain strong production → performance bonus
```

This should be easy for users to understand.

Recommended UI:

```text
+612 points
Solar generation
August 2026

+74 bonus
High system performance
```

---

# 21. Long-Run Reward / Credit Score

The long-run score should reflect:

- repeated valid submissions.
- persistence over time.
- real production/use.
- environmental impact.
- consistency.
- trustworthiness of the evidence history.

Example status:

```text
SC: 81/100

★★★★★

Verified sustainable behavior: 14 months
Estimated clean generation: 7,340 kWh
Verified adoption assets: 2
```

---

# 22. Important Missing Dimension: Confidence

Every environmental conclusion should have a confidence value.

Example:

```json
{
  "impact": {
    "score": 88,
    "confidence": 0.91
  }
}
```

A user should not receive the exact same treatment for:

```text
Known generation = 612 kWh
```

and:

```text
Model-inferred generation ≈ 600 kWh
```

The latter should receive less weight or require stronger evidence.

---

# 23. Important Missing Dimension: Evidence Freshness

Evidence is not equally useful forever.

Example:

A solar installation photograph from 2024 proves adoption, but it does not prove generation in August 2026.

Add:

```json
{
  "evidence_freshness": {
    "age_days": 4,
    "status": "CURRENT"
  }
}
```

Different evidence types can have different validity windows.

---

# 24. Important Missing Dimension: Evidence Chain

The system should link evidence items to the same asset.

Example:

```text
EV asset EV-001
│
├── RC verification (one-time)
├── Vehicle photo
├── Charging evidence - August
├── Charging evidence - September
└── Charging evidence - October
```

Solar:

```text
Solar asset SOLAR-001
│
├── Installation proof
├── Capacity proof
├── Bill - June
├── Bill - July
├── Bill - August
└── Bill - September
```

This creates a longitudinal verified record rather than treating every image as an isolated classification problem.

---

# 25. Database Design

A relational database such as PostgreSQL is recommended.

## users

```text
user_id
created_at
region
privacy_settings
```

## assets

```text
asset_id
user_id
asset_type
subtype
status
created_at
ownership_verified_at
```

## evidence_submissions

```text
submission_id
user_id
asset_id
evidence_type
captured_at
image_hash
perceptual_hash
model_version
verification_status
confidence
created_at
```

## extracted_facts

```text
submission_id
field_name
field_value
normalized_value
confidence
source_region
```

## measurements

```text
measurement_id
asset_id
metric_type
value
unit
period_start
period_end
source_submission_id
verification_status
```

## rewards

```text
reward_id
user_id
asset_id
submission_id
reward_type
points
created_at
period_key
```

## sustainability_credit_history

```text
user_id
period
score
impact_score
consistency_score
confidence_score
created_at
```

## audit_log

Store important decisions:

```text
request_id
user_id
submission_id
action
old_state
new_state
reason
model_version
rules_version
timestamp
```

This is particularly important if the system is ever used for actual rewards.

---

# 26. Privacy Design

The app will potentially process:
- Names.
- Registration numbers.
- Consumer numbers.
- Bills.
- Addresses.
- Vehicle information.

Therefore privacy should be a first-class requirement.

Recommended principles:

1. Process images locally whenever possible.
2. Do not send documents to a cloud VLM by default.
3. Store only required extracted information.
4. Hash/ encrypt sensitive identifiers.
5. Use access-controlled storage.
6. Separate user identity from environmental scoring data where possible.
7. Keep a deletion mechanism.
8. Never expose full personal document images in public leaderboards.

---

# 27. Anti-Fraud System

The fraud engine should combine several weak signals rather than relying on one classifier.

## Signals

```text
Image duplicate
Document duplicate
Asset already registered
Same billing period reused
Impossible generation
Unexpected capacity jump
Screen photograph
Manipulation risk
Identity mismatch
Contradictory fields
Stale evidence
Repeated suspicious submissions
```

## Decision score

Conceptual:

```text
FraudRisk
 = duplicate_risk
 + manipulation_risk
 + anomaly_risk
 + identity_risk
 + history_risk
```

Normalize and cap the score.

Suggested actions:

```text
0–20    → accept
20–50   → accept with reduced confidence / additional evidence
50–75   → manual review
75–100  → reject / hold reward
```

These thresholds should be tuned on real test data.

---

# 28. Human Review

The system should not attempt to automate every edge case.

Use:

```text
LOW RISK       → automatic approval
MEDIUM RISK    → additional evidence requested
HIGH RISK      → manual review
```

A manual-review packet should contain:
- Original evidence image.
- Extracted fields.
- Risk signals.
- History.
- Model reasoning/explanation.
- Expected vs reported measurement.

This makes the project realistic.

---

# 29. API Endpoints

Suggested backend:

```text
POST   /api/v1/evidence/verify
POST   /api/v1/assets/register
GET    /api/v1/assets/:id
GET    /api/v1/assets/:id/history
GET    /api/v1/user/:id/rewards
GET    /api/v1/user/:id/sustainability-credit
POST   /api/v1/review/:id/decision
```

## Main verification flow

```text
POST /api/v1/evidence/verify
        ↓
Validate session/image
        ↓
Perceptual hash
        ↓
Duplicate lookup
        ↓
VLM extraction
        ↓
Schema validation
        ↓
Evidence rules
        ↓
History rules
        ↓
Impact calculation
        ↓
Reward calculation
        ↓
Persist decision
        ↓
Return JSON
```

---

# 30. Strict JSON Validation

Never trust raw model output.

Use a schema validator such as:
- Pydantic.
- JSON Schema.
- Zod if using TypeScript.

Pipeline:

```text
Raw VLM output
      ↓
Parse JSON
      ↓
Schema validation
      ↓
Type normalization
      ↓
Range validation
      ↓
Business rules
```

Example:

```text
kWh < 0
→ invalid

confidence > 1
→ invalid

billing_end < billing_start
→ invalid

capacity = null
and generation > implausible maximum
→ review
```

---

# 31. Deterministic Scoring Engine

The engine should be independent of the model.

Example Python-style interface:

```python
result = score_evidence(
    asset=asset,
    evidence=evidence,
    historical_data=history,
    rules=rules,
)
```

Return:

```python
{
    "impact_score": 88,
    "reward_points": 1186,
    "long_term_credit_delta": 1.7,
    "confidence": 0.91,
}
```

## Why this separation matters

It makes the system:
- Explainable.
- Testable.
- Auditable.
- Less susceptible to model randomness.
- Easier to improve without changing the VLM.

---

# 32. Example End-to-End Solar Transaction

### Step 1
User chooses:

```text
"Monthly Solar Generation"
```

### Step 2
App launches camera.

### Step 3
User photographs electricity/net-metering bill.

### Step 4
VLM extracts:

```text
Solar generation = 612 kWh
Billing period = August 2026
Capacity = 5 kWp
Meter number = XXXXX
```

### Step 5
Backend checks:

```text
Is this user linked to this solar asset?
Is August already submitted?
Is this meter number consistent?
Is 612 kWh plausible for 5 kWp?
Does the bill look legitimate?
```

### Step 6
Scoring engine calculates:

```text
Generation reward = 612 points
Performance bonus = 74
```

### Step 7
Update credit history.

### Step 8
Return:

```json
{
  "verified": true,
  "generation_kwh": 612,
  "reward_points": 686,
  "sustainability_credit_delta": 1.2
}
```

---

# 33. Example End-to-End EV Transaction

### First submission

User photographs RC.

VLM extracts:

```text
Vehicle: electric car
Registration: XXXXX
Owner: user
```

Backend creates:

```text
EV-001
```

One-time adoption reward:

```text
+500
```

### Later submission

User photographs charging evidence.

Backend detects:

```text
EV-001
September 2026
Charging energy = 184 kWh
```

Reward is based on the verified recurring metric, not another ownership reward.

---

# 34. Confidence-Weighted Rewards

A useful refinement is to avoid granting maximum points when evidence quality is weak.

Conceptually:

```text
Final Reward
 = Base Reward × Verification Confidence × Evidence Factor
```

Example:

```text
Base reward: 500
Confidence: 0.96
Evidence factor: 1.0

Final = 480
```

For the prototype, consider keeping confidence effects conservative. The system should reward genuine actions rather than punish users excessively for camera quality.

---

# 35. Important Guardrail: Do Not Reward the Model's Guess

Never do:

```text
VLM says:
"This is probably a 5 kW solar system and probably generated 600 kWh."

→ give 600 points
```

Instead:

```text
VLM says:
"The bill visibly states 612 kWh."

→ verified measurement = 612 kWh
→ scoring engine calculates reward
```

If the value is inferred, mark it as inferred and either:
- assign reduced reward weight, or
- require a stronger evidence source.

---

# 36. Local Development Stack

Recommended prototype stack:

### Frontend
- Flutter or React Native for a mobile-first app.
- Native camera capture.

### Backend
- Python + FastAPI.
- Pydantic for schemas.
- PostgreSQL.
- Redis optional for queues/cache.

### AI
- Local Gemma Vision server.
- Qwen-VL benchmark server.
- llama.cpp / Ollama / LM Studio during development.

### Image processing
- Pillow/OpenCV.
- Perceptual hash such as pHash/dHash.
- Optional document preprocessing.

### Observability
- Structured application logs.
- Model latency metrics.
- Verification decision logs.
- Scoring-rule versioning.

---

# 37. Suggested Repository Structure

```text
sustainability-scanner/
│
├── app/
│   ├── api/
│   │   ├── routes/
│   │   └── schemas/
│   ├── ai/
│   │   ├── client.py
│   │   ├── prompts/
│   │   └── parsers/
│   ├── verification/
│   │   ├── duplicate.py
│   │   ├── fraud.py
│   │   ├── evidence_rules.py
│   │   └── plausibility.py
│   ├── scoring/
│   │   ├── impact.py
│   │   ├── rewards.py
│   │   ├── sustainability_credit.py
│   │   └── rules.py
│   ├── db/
│   │   ├── models.py
│   │   └── repositories.py
│   └── main.py
│
├── prompts/
│   ├── system.md
│   ├── solar.md
│   ├── ev.md
│   └── generic.md
│
├── tests/
│   ├── test_schema.py
│   ├── test_duplicates.py
│   ├── test_solar_scoring.py
│   ├── test_ev_scoring.py
│   └── fixtures/
│
├── model_benchmark/
│   ├── dataset.json
│   ├── run_benchmark.py
│   └── results.csv
│
├── docs/
│   ├── scoring.md
│   ├── evidence.md
│   └── methodology.md
│
└── README.md
```

---

# 38. Model Benchmark Dataset

Build a small controlled dataset before optimizing prompts.

Suggested first dataset:

```text
20 genuine solar bills
10 poor-quality solar bills
10 duplicate solar bills
10 manipulated-looking samples
20 EV RC documents
10 non-EV RC documents
10 charging records
10 irrelevant sustainability images
```

Then evaluate:

```text
Did it identify the evidence correctly?
Did it extract the numbers correctly?
Did it detect missing fields?
Did it flag duplicates?
Did it hallucinate?
Did it output valid JSON?
```

Store ground truth separately.

---

# 39. Prompt Engineering Procedure

Do not tune temperature and parameters based only on subjective quality.

Run a controlled experiment.

Test:

```text
temperature:
0.0 / 0.1 / 0.2 / 0.4

Top-p:
several conservative values

Context size:
according to model/runtime
```

Measure:
- JSON validity.
- Field extraction accuracy.
- Hallucination.
- Consistency.
- Latency.

For deterministic evidence extraction, prefer a **low temperature**.

Creative generation is not required here.

---

# 40. Recommended Two-Stage Vision Pipeline

A very strong implementation is:

```text
                 Image
                   ↓
          Image quality check
                   ↓
          Document/object type
                   ↓
          VLM structured extraction
                   ↓
            Rule verification
```

For especially difficult documents, you may optionally add a separate OCR/document parser before or after the VLM.

However, avoid making the architecture unnecessarily complex in version 1.

---

# 41. Universal Schema vs Category-Specific Rules

Keep the **schema universal** but the **rules category-specific**.

Universal:

```text
verification
asset
observations
temporal
fraud
impact_inputs
```

Category-specific rules:

```text
solar rules
EV rules
heat-pump rules
battery rules
etc.
```

This gives scalability without forcing every category into the same scoring formula.

---

# 42. Scoring Rules Should Be Versioned

Every reward decision must record:

```text
rules_version
model_version
schema_version
```

Example:

```text
rules_version = "solar-v1.3"
model_version = "gemma-local-2026-09"
```

If reward rates change later, historical rewards should remain auditable.

---

# 43. Important Scientific Caution

Environmental benefit should not be presented as an exact physical truth when the system only has limited evidence.

Use labels such as:

```text
Verified
Estimated
Inferred
Unknown
```

For example:

```text
612 kWh generated
→ VERIFIED

CO₂ avoided
→ ESTIMATED

Lifetime emissions avoided
→ NOT CLAIMED unless methodology supports it
```

This is important both scientifically and for the credibility of the project.

---

# 44. Suggested User Experience

After submission, show:

```text
╭──────────────────────────────────────╮
│          VERIFIED ✓                  │
│                                      │
│      Rooftop Solar PV                │
│                                      │
│      612 kWh generated               │
│                                      │
│      +686 Reward Points              │
│                                      │
│      Environmental Impact             │
│             88 / 100                 │
│                                      │
│      Sustainability Credit            │
│             81 / 100                 │
╰──────────────────────────────────────╯
```

Then explain:

```text
Why?

✓ Evidence verified
✓ Billing period is new
✓ Generation is plausible
✓ Asset already registered
✓ No duplicate detected
```

This makes the system feel trustworthy rather than like a black-box AI gimmick.

---

# 45. “Gimmick Detector” Concept

The system should explicitly identify low-value sustainability claims.

Examples:

```text
Photo of EV → proves existence, not usage

Photo of solar panel → proves installation, not generation

Energy-efficient product label → proves product specification, not actual household savings

Generic bicycle photo → proves nothing about the user's behavior
```

This produces a more credible philosophy:

> **Reward evidence of behavior, not evidence of marketing.**

---

# 46. Leaderboard / Gamification

Optional future component.

Do not rank users only on absolute points because wealthier users could gain an unfair advantage by buying more expensive systems.

Better metrics:

- Impact per household.
- Improvement over baseline.
- Verified sustainability streak.
- Generation efficiency.
- Consistency.

This aligns the gamification with behavior rather than purchasing power.

---

# 47. Recommended First Release

Do not implement every category immediately.

### Phase 1
Support only:

1. Solar PV.
2. Electric vehicles.

This is enough to demonstrate the complete architecture.

### Phase 2
Add:

3. Solar water heaters.
4. Battery storage.
5. Energy-efficient appliances.

### Phase 3
Add:

6. Heat pumps.
7. Rainwater systems.
8. Other sustainable technologies.

The category engine should be plugin-like.

---

# 48. Implementation Roadmap

## Phase 0 — methodology

Deliverables:
- Evidence taxonomy.
- Scoring rules.
- JSON schema.
- Database schema.

## Phase 1 — local VLM

Deliverables:
- Gemma local server.
- One API endpoint.
- Strict JSON extraction.
- Solar and EV prompts.

## Phase 2 — verification

Deliverables:
- Duplicate detection.
- Evidence history.
- Plausibility checks.
- Capture quality checks.

## Phase 3 — scoring

Deliverables:
- Adoption rewards.
- Generation rewards.
- Performance bonuses.
- Sustainability Credit.

## Phase 4 — UI

Deliverables:
- Camera capture.
- Evidence selection.
- Results page.
- History.
- Reward balance.
- Sustainability Credit dashboard.

## Phase 5 — evaluation

Deliverables:
- Ground-truth dataset.
- Gemma vs Qwen benchmark.
- Accuracy/latency analysis.
- Failure-case analysis.

---

# 49. Term-Paper / Academic Evaluation Angle

This project can be framed as a **multimodal AI decision-support and verification system** rather than a generic chatbot.

Potential research questions:

1. Can a local VLM reliably verify visual evidence of sustainable technology adoption?
2. How accurately can local VLMs extract structured measurements from electricity bills and registration documents?
3. How much does deterministic post-processing improve reliability compared with raw VLM scoring?
4. Can longitudinal evidence reduce reward fraud and duplicate claims?
5. How does model choice affect latency, accuracy, and JSON reliability?

Potential experiments:

```text
VLM-only scoring
vs
VLM + deterministic scoring

Gemma
vs
Qwen-VL

No duplicate detection
vs
Perceptual + semantic duplicate detection
```

These give the project a much stronger technical story.

---

# 50. Core Design Principle to Keep

The most important implementation rule is:

```text
AI observes.
Rules verify.
Math scores.
History remembers.
```

More explicitly:

```text
LOCAL VLM
  → What is visible?
  → What document/object is this?
  → What values are written?
  → Is evidence incomplete or suspicious?

VERIFICATION ENGINE
  → Is it linked to the user's asset?
  → Is it new?
  → Is it plausible?
  → Is it sufficient?

IMPACT ENGINE
  → What does the verified measurement imply?

REWARD ENGINE
  → What points should be awarded?

LONGITUDINAL ENGINE
  → What has the user consistently done over time?
```

This separation is what makes the system credible, auditable, and scalable.

---

# 51. Final Recommended MVP

The strongest realistic MVP is:

```text
Mobile Camera
     ↓
Solar Bill / EV RC capture
     ↓
Local Gemma Vision model
     ↓
Strict structured JSON
     ↓
Evidence validator
     ↓
Duplicate/history database
     ↓
Solar kWh / EV verification rules
     ↓
Deterministic reward engine
     ↓
Sustainability Credit
     ↓
User dashboard
```

### Solar MVP

Support:
- Installation verification.
- One-time adoption reward.
- Monthly bill capture.
- Solar kWh extraction.
- Duplicate-period protection.
- Plausibility checking.
- Generation-based rewards.
- Performance bonus.
- Long-term credit.

### EV MVP

Support:
- RC verification.
- One-time adoption reward.
- Vehicle identity/asset creation.
- Charging evidence.
- Monthly usage tracking.
- Duplicate prevention.
- Long-term credit.

---

# 52. Success Criteria

The project is successful if it can demonstrate all of the following locally:

- A user photographs genuine evidence inside the app.
- The local VLM correctly identifies the evidence.
- The VLM extracts relevant values into valid JSON.
- The backend rejects or flags obviously invalid/duplicate evidence.
- The system stores an asset so it cannot be repeatedly claimed as a new adoption.
- Monthly solar evidence produces rewards proportional to verified generation.
- Solar generation is sanity-checked against capacity/history.
- EV ownership gives a one-time adoption reward.
- Later EV usage evidence contributes to recurring impact.
- The system maintains a longitudinal Sustainability Credit.
- The final numerical rewards are reproducible without relying on model randomness.

---

# 53. One-Sentence Product Definition

> **A local-first multimodal AI platform that verifies real-world sustainable technology and behavior from camera-captured evidence, converts verified environmental impact into transparent rewards, and maintains a longitudinal Sustainability Credit.**

