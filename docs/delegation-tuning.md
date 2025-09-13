# Delegation runtime tuning

This system adapts delegation timeouts based on progress to avoid premature cuts and runaway jobs. Tune via env vars:

- PROGRESS_MIN_DELTA (default 5): extend only when progress increases by at least N percentage points. Prevents tiny/noisy increments from extending too much.
- NO_PROGRESS_NO_EXTEND_MS (default 60000): if no progress for this long, don’t extend further. Stops stalled runs from growing the window.
- DELEGATION_TIMEOUT_MS (default 180000): base timeout.
- DELEGATION_EXTEND_ON_PROGRESS_MS (default 60000): extension size when threshold is met.
- DELEGATION_MAX_EXTENSION_MS (default 180000): cap on total extension.
- DELEGATION_POLL_MS (default 750): polling cadence.

Recommended starting points (prod):
- Short tasks (chat/formatting): TIMEOUT 90s, EXTEND 30s, MAX_EXT 60s, DELTA 10, NO_PROGRESS 30s
- Medium tasks (research, API fetch + synth): TIMEOUT 180s, EXTEND 60s, MAX_EXT 180s, DELTA 5, NO_PROGRESS 60s
- Long tasks (multi-hop, heavy tools): TIMEOUT 240s, EXTEND 60–90s, MAX_EXT 240–300s, DELTA 5, NO_PROGRESS 90s

Notes:
- Progress must be monotonic (0–100). The runner extends more aggressively when delta >= PROGRESS_MIN_DELTA; minor progress extends lightly if it’s recent.
- If you see frequent timeouts, increase MAX_EXTENSION and/or reduce DELTA. If jobs run too long, increase DELTA and/or reduce MAX_EXTENSION.
- Always pair with budget limits and circuit breakers.
