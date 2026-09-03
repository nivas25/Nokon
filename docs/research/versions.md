# Pinned versions (research date: 2026-09-03)

Queried `npm view <pkg> version` and official docs the same day. Do not guess APIs from memory; if a package moves, re-run `npm view` and update this file.

## Runtime

| Tool | Pin / requirement | Source |
|---|---|---|
| Node.js | **>= 22.13.0** (Mastra official) | https://mastra.ai/integrations/frameworks/next-js |
| TypeScript | **7.0.2** npm latest; **Next 16.3.4 scaffold pins `typescript@^5`** — we follow the Next scaffold | `npm view typescript version`; `create-next-app@16.3.4` |

## Application packages

| Package | npm latest 2026-09-03 | Role |
|---|---|---|
| `next` | **16.3.4** | App Router. Official docs “Latest Version 16.3.4”, Active LTS. Mastra Next.js guide uses `create-next-app@latest`. |
| `react` / `react-dom` | whatever `create-next-app@16.3.4` installs | Do not pin independently. |
| `@mastra/core` | **1.64.0** | Workflows, Agents, Tools. Mastra 1.x (not 0.x). |
| `mastra` | **1.27.3** | CLI (`mastra init`, Studio). |
| `@mastra/libsql` | **1.22.3** | Default local snapshot store (`file:./mastra.db`). |
| `@mastra/pg` | **1.22.3** | Optional Postgres snapshot store. |
| `@mastra/memory` | **1.28.2** | Chat memory only. |
| `@mastra/ai-sdk` | **1.10.1** | Next.js chat adapter (`handleChatStream`, `version: 'v7'`). |
| `@supabase/supabase-js` | **2.114.0** | Postgres + Auth + Realtime. Node 20 dropped as of 2.110.0 — another reason for Node 22. |
| `razorpay` | **2.9.8** | Official Node SDK. Test keys `rzp_test_…` only. |
| `ai` | **7.0.91** | Vercel AI SDK (v7). Mastra Next.js chat route uses this. |
| `@ai-sdk/xai` | **4.0.54** | SpaceXAI / xAI provider. OCR + agents. |
| `@ai-sdk/google` | **4.0.63** | **Not used in v1.** Kept as a documented fallback if Grok vision is unavailable. |
| `zod` | **4.5.4** | Every workflow I/O and API body. Mastra 1.x accepts Zod as Standard JSON Schema. |

## Security note on `@mastra/*`

June 2026: npm `@mastra` scope was briefly republished with a malicious dependency (`easy-day-js`). Mastra forward-rolled clean versions. Compromised examples included `@mastra/core@1.42.1`. **Pin `1.64.0` (or later clean latest).** Never install `1.42.1` or other attacker-published tags. Regenerated lockfile only.

## Official doc URLs opened this pass

- Mastra get started: https://mastra.ai/docs
- Mastra + Next.js: https://mastra.ai/integrations/frameworks/next-js
- Mastra workflows: https://mastra.ai/docs/workflows/overview
- Mastra suspend/resume: https://mastra.ai/docs/workflows/suspend-and-resume
- Mastra `Run.resume()` (incl. `WORKFLOW_RESUME_ALREADY_CLAIMED`): https://mastra.ai/reference/workflows/run-methods/resume
- Mastra snapshots: https://mastra.ai/docs/workflows/snapshots
- Mastra storage: https://mastra.ai/docs/storage
- Mastra xAI models: https://mastra.ai/models/providers/xai
- Next.js docs: https://nextjs.org/docs (16.3.4)
- Supabase JS: https://www.npmjs.com/package/@supabase/supabase-js
- Supabase Realtime Postgres Changes: https://supabase.com/docs/guides/realtime/postgres-changes
- Razorpay create Order: https://razorpay.com/docs/api/orders/create
- Razorpay create Standard Payment Link: https://razorpay.com/docs/api/payments/payment-links/create-standard
- Razorpay payments webhooks: https://razorpay.com/docs/webhooks/payments
- Razorpay payment-link webhooks: https://razorpay.com/docs/webhooks/payment-links
- Razorpay Node verify: https://github.com/razorpay/razorpay-node/blob/master/documents/paymentVerfication.md
- xAI models: https://docs.x.ai/developers/models
- xAI image understanding: https://docs.x.ai/docs/guides/image-understanding
- xAI structured outputs: https://docs.x.ai/developers/model-capabilities/text/structured-outputs
- Zod: https://zod.dev / https://www.npmjs.com/package/zod

## What I verified (this pass)

1. Mastra 1.x is the current line. New projects must **not** use `@mastra/core@^0`.
2. `createWorkflow` / `createStep` / `suspend()` / `resume()` / `state`+`setState` are current 1.x APIs. Concurrent resume throws `WORKFLOW_RESUME_ALREADY_CLAIMED` (HTTP 409).
3. Snapshots persist to configured storage. Default local = libSQL. Postgres is supported via `@mastra/pg`. There is **no** first-party `@mastra/supabase` adapter.
4. Next.js latest stable is 16.3.4. Mastra’s Next.js guide scaffolds with `create-next-app@latest` and imports `mastra` from `src/mastra` inside App Router routes.
5. Razorpay amounts are **paise integers**. `receipt` (Orders) and `reference_id` (Payment Links) max 40 chars and must be unique.
6. **UPI Payment Links are rejected in test mode.** Use Standard Payment Links. Test UPI VPAs (`success@razorpay`) still work on Standard Checkout/Link.
7. Test mode Payment Link cap: **30 per business**.
8. `expire_by` is Unix seconds and **must be ≥ 15 minutes in the future**. A 15-minute target is the *minimum*, not a safe target — use **20 minutes**.
9. Webhook HMAC uses the **raw body** and header `X-Razorpay-Signature`. Parsing JSON first invalidates the signature.
10. Grok 4.6 accepts image + text input and structured JSON output. Mastra model id: `xai/grok-4.6`. Env: `XAI_API_KEY`.
11. Supabase Realtime requires `alter publication supabase_realtime add table …` plus RLS policies that allow the subscribing role to `SELECT`.
12. `create-next-app@16.3.4` installs `typescript@^5` (not npm latest 7.0.2). Keep the scaffold pin.
13. Without cloud keys, `docs/schema.sql` was compiled and seeded against PGlite (`@electric-sql/pglite`). `gen_random_uuid()` is core PG; `pgcrypto` is optional. RLS policies that name `anon`/`authenticated` no-op on vanilla Postgres.

See also: [mastra.md](./mastra.md), [razorpay.md](./razorpay.md), [decisions.md](../knowledge/decisions.md).
