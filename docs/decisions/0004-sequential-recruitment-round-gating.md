# ADR 0004: Multi-Round Sequential Recruitment Drive Engine & Hard Gating

## Context
Corporate campus recruitment drives typically involve sequential elimination rounds (Round 1: Online Assessment &rarr; Round 2: Technical Interview &rarr; Round 3: HR). In manual setups, rejected candidates frequently bypass cutoffs or mistakenly enter subsequent rounds, creating administrative confusion and unfair hiring practices.

## Decision
We implemented a centralized recruitment drive engine (`src/services/driveEngine.ts`) enforcing hard state-machine gating:
- Each drive consists of ordered rounds stored in `drive_rounds`.
- Evaluators define mathematical passing logic: `cutoff_score`, `top_n`, `top_percent`, or `manual`.
- Candidate progress is tracked in `round_participants` with discrete statuses (`pending`, `qualified`, `not_qualified`, `absent`).
- Access Gating Rule: Any attempt by a candidate to access Round $K$ ($K > 1$) checks Round $K-1$. If `status != "qualified"`, access is strictly denied at both the UI and database API levels.

## Consequences
- **Positive**: Zero possibility of disqualified candidates slipping into advanced rounds; fully automated enrollment when `auto_progress = true`.
- **Negative**: Recruiters must explicitly publish results before candidates can proceed to next-stage rounds.
