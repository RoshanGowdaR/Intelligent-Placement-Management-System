# ADR 0003: Serverless LLM Edge Proxy with Failover Affinity between Groq & Gemini

## Context
Assessment question generation and natural language database assistance require high-speed LLM inference. Storing API keys directly in client-side `.env` files exposes secret keys in compiled browser JavaScript bundles (`VITE_GEMINI_API_KEY`). Furthermore, relying on a single AI provider creates single-point-of-failure risks during provider rate limits or downtime.

## Decision
We implemented a serverless proxy route `/api/gemini` on Vercel Functions:
- Private API keys are stored in server-side environment variables.
- The relay uses a dual-engine failover mechanism:
  - Primary Provider: Groq Cloud (`llama-3.3-70b-versatile`) for low latency (< 350ms).
  - Secondary Provider: Google Gemini 2.5 Flash for extended context windows.
- If the primary provider returns HTTP 429 or 5xx, the proxy seamlessly fails over to the backup key/provider.

## Consequences
- **Positive**: Zero client-side API key exposure; high availability with automated fallback; centralized rate limiting.
- **Negative**: Adds a negligible 20-40ms hop through Vercel serverless edge functions.
