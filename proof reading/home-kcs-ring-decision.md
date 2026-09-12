# Home KCS ring decision

The Home hero ring and its progress bar now use the Carbon Credit Score (Karma Credit Score, KCS) returned by `useScore()`. The UI shows the verified score only when the server marks it verified and provides a value; otherwise it shows the provisional score. Ring/progress mapping uses the KCS range of 480–820.

Impact/reward points remain a separate immediate-action rewards track. They do not supply, modify, or determine the Home KCS display.

## 2026-09-12 approved policy override

Provisional KCS is a dynamic questionnaire-based estimate, not a capped score. It uses the same 480–820 mapping as verified KCS, while its provisional label makes clear that it is not the actual verified score. The server recomputes the provisional value from submitted baseline kilograms rather than trusting a client-provided score.

## Navigation and Profile KCS

The bottom dock now exposes only Home, Tools, Impact, and Actions. Profile remains reachable through the Home avatar but is hidden from the dock. The Profile score card uses the same KCS query and 480–820 ring mapping as Home; impact points remain independent.
