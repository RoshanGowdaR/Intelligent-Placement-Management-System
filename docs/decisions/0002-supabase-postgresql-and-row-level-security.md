# ADR 0002: Supabase PostgreSQL with Database-Enforced Row Level Security (RLS)

## Context
Multi-tenant applications containing students, administrators, and competitive corporate recruiters require strict data isolation. If authorization checks are performed solely in application code, developer oversight or endpoint misconfiguration can expose candidate marks, answers, or competitor drive cutoffs.

## Decision
We chose **Supabase (PostgreSQL 15)** with Row Level Security (RLS) enabled on all tables:
- Policies use SQL functions (`auth.uid() = student_id`, `has_role(auth.uid(), 'admin')`).
- PostgREST evaluates RLS rules at the database engine level before executing any query.

## Consequences
- **Positive**: Impossible for a compromised or spoofed client to read peer records even if direct REST queries are sent.
- **Negative**: Queries requesting columns not permitted by RLS fail with HTTP 400/403; developers must maintain database migrations and schema types in lockstep.
