# ADR 0005: Remark-GFM and Recharts Generative UI Pipeline in Placement AI Chat

## Context
When placement directors query the Placement AI Assistant about institutional metrics, raw text or raw markdown pipes (`| Metric | Value ||---|---|`) produce an unreadable, clumsy presentation. Administrators need instantly digestible executive KPI cards, comparative charts, and clean tabular data.

## Decision
We engineered a Generative UI rendering pipeline inside `PlacementAIChat.tsx` and `AdminAIAssistant.tsx`:
1. Integrated `remark-gfm` with `ReactMarkdown` to render valid HTML `<table>`, `<th>`, and `<td>` elements with Tailwind CSS zebra striping and borders.
2. Intercepted code blocks with language identifiers `chart`, `kpi`, and `proctor`:
   - ````kpi`: Renders a responsive grid of luminous KPI Metric Cards.
   - ````chart`: Parses JSON telemetry and mounts an interactive Recharts `BarChart` with tooltips and animations.
   - ````proctor`: Renders a candidate Proctor Integrity Gauge with violation progress bars.

## Consequences
- **Positive**: High executive appeal; instant data visualization; clean fallback to standard code blocks if parsing fails.
- **Negative**: Requires system prompts to provide strictly formatted JSON payloads inside specific code block tags.
