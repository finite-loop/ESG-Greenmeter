# GreenMeter AI — Decisions Log

> Captured during analyst review of `GreenMeter_AI_Requirements_v1.md`

## Confirmed Decisions

| # | Area | Decision | Source |
|---|---|---|---|
| D1 | Missing UI entities | Will be provided via Next.js code — no need for analyst to design schemas for alerts, supplier_scores, survey responses, report_templates, uptime_logs | User |
| D2 | Authentication | OAuth | User |
| D3 | Tech stack — framework | Next.js 16 (fullstack) | User |
| D4 | Tech stack — LLM pipeline | Azure Document Intelligence → LLM processing → JSON payload. Store metrics locally. Future: configurable API key for paid models OR localhost LLM connection for real-time processing | User |
| D5 | Notifications | Deferred — not yet designed. Must be addressed before relevant modules ship. | User |
| D6 | Goal progress formula | Retain current formula as documented. Target should not be 100%. | User |
| D7 | Forecasting method | Linear regression (confirmed). Not Monte Carlo. | User |
| D8 | Performance/scale | Use sensible defaults; no hard SLA targets defined yet. | User |
| D9 | Multi-currency | Store in source currency, convert at rollup using admin-entered period-average exchange rates. Peer benchmarks normalized to USD or tenant base currency. | Analyst recommendation — confirmed |
| D10 | Deployment | Azure | User |
| D11 | Component refactoring | Incremental extraction screen-by-screen as backend is wired. Not a big-bang refactor. | Analyst recommendation — confirmed |
| D12 | Onboarding wizard | Design from scratch, must match existing UI design system (DM Sans, teal/indigo/amber palette, custom CSS component classes) | User |
| D13 | Materiality & Industry Data | In scope — static mockup pages yet to be created | User |
| D14 | Analytics — advanced pipeline | MDS for competitive positioning + industry-wise feature-selected correlation analysis + flexible metric storage from LLM extraction | User |
| D15 | Extraction approach | Keep free-text extraction (no canonical name enforcement in prompts). Build post-hoc mapping layer with fuzzy match + LLM + manual review. | User |
| D16 | Parameter model | Separate entries per standard, linked by `canonical_id` for cross-standard analytics. NOT single-param-multi-tag. | User |
| D17 | Extraction prompts | BRSR (existing) + ESRS (new) + GRI (new). All produce free-text JSON. Standard-specific output structure (principles vs standards vs GRI codes). | Analyst — built |

## Open Items

| # | Item | Status |
|---|---|---|
| O1 | Notification system design | Deferred — tracked as task |
| O2 | Supplier scoring parameter set (Appendix A, Q12) | Deferred until module is closer |
| O3 | ~~LLM extraction JSON format~~ | **RESOLVED** — format understood, schema designed |
| O4 | Materiality screen mockup | User to create |
| O5 | Industry Data screen mockup | User to create |
| O6 | ~~Advanced analytics pipeline design~~ | **UNBLOCKED** — storage schema supports MDS + correlation. Implementation details TBD. |
| O7 | Onboarding wizard UI design | To be designed from scratch |
| O8 | Populate seed data into DB from Excel files | Next step — script needed |
| O9 | Build fuzzy mapping layer (aliases + patterns + LLM fallback) | Implementation phase |

## Artifacts Produced

| File | Description |
|---|---|
| `ExtractionPrompt.txt` | Original BRSR extraction prompt (user-provided) |
| `ExtractionSample.json` | Sample BRSR extraction output — Adani Total Gas FY24-25 |
| `ExtractionPrompt_ESRS.txt` | New ESRS extraction prompt (analyst-created) |
| `ExtractionPrompt_GRI.txt` | New GRI extraction prompt (analyst-created) |
| `_bmad-output/planning-artifacts/storage-schema-design.md` | Full storage schema with 11 tables + materialized view |
| `seed_data/BRSR_Seed_Data.xlsx` | 4 companies × 80 params × 3 years |
| `seed_data/ESRS_Seed_Data.xlsx` | 4 companies × 100 params × 3 years |
| `seed_data/GRI_Seed_Data.xlsx` | 4 companies × 80 params × 3 years |

## Codebase Status (greenmeter/)

- **10 screens fully implemented** (frontend only, all mock data)
- **4 screens placeholder** (Org Hierarchy, Materiality, Audit & Assurance, Industry Data)
- **0 API routes, 0 database, 0 auth**
- **115+ KPI parameters** defined in static data
- **Next.js 16 + React 19 + TypeScript + Tailwind 4 + Chart.js + Radix UI**
- **Deployed to:** Azure (target)
