# Architecture Decision Records

## ADR-001 — No WhatsApp in v1

**Status:** Accepted

Cold-outreach to numbers scraped from YouTube overlays is against Meta ToS, gets seller numbers banned, and the seller did not opt in. A real WhatsApp Business API integration is a weekend-killer (BSP, templates, webhooks, quality rating).

Nokon’s watch chat **looks like** WhatsApp so judges feel the replaced dance. It is a read-only transcript generated from workflow events. Sellers who want production WhatsApp later opt in on our platform first.

## ADR-002 — Workflow, not a free agent, for money

**Status:** Accepted

LLMs are probabilistic. Charges must be deterministic.

- Mastra **workflow** is the transaction state machine: parse → match → collect → **gate** → reserve → Payment Link → wait → finalize.
- Agents speak. They do not call Razorpay.
- Cap and stock are TypeScript in `lib/gates.ts`. Prompt injection can change the parsed cap; it cannot change `items.price_paise`.
- `createRazorpayPayment` is invoked only from `reserveAndCharge` after `gate` returns pass **and** SQL reserve `rowCount = 1`.

Mastra 1.x (`createWorkflow` / `createStep` / `suspend` / `resume` / `WORKFLOW_RESUME_ALREADY_CLAIMED`) is the official API as of 2026-09-03. See `docs/research/mastra.md`.

## ADR-003 — Standard Payment Link (not Order+Link, not UPI Link)

**Status:** Accepted — **deviates from the master brief’s “create Order + Payment Link” wording**

Official docs (2026-09-03):

- A Payment Link **creates its own Order**. Creating both for one attempt is two instruments and a double-charge footgun.
- **`upi_link: true` is rejected in test mode.**
- Test mode cap: **30 Payment Links per business**.
- `expire_by` Unix seconds, **minimum 15 minutes in the future** → we use **20 minutes**.
- Buyer gets a `short_url` with no Checkout.js required. Headless scripts can print the URL.

We store:

- `razorpay_payment_link_id` = `plink_…`
- `razorpay_payment_link_url` = `short_url`
- `razorpay_order_id` = the link’s internal order id (create response or webhook)
- `reference_id` / `notes.nokon_order_id` = our `orders.id`

Fulfil on `payment.captured` (or `payment_link.paid` / `order.paid`) after HMAC verify and amount match.

If we later need Orders-only Checkout, add it behind the same gate; do not dual-create.

## ADR-004 — Typed handle + item code is the OCR fallback

**Status:** Accepted

Vision (Grok 4.6 image understanding) is best-effort. Demo screenshots of phone-camera YouTube overlays fail often. The product rule already allows `@sareedidi 14`. Parser: if `rawText` contains a handle and code, that **wins** over OCR. OCR fills gaps only.

## ADR-005 — SpaceXAI / xAI instead of Gemini Flash

**Status:** Accepted — **deviates from the master brief’s `@ai-sdk/google` suggestion**

Workspace default for LLM features is SpaceXAI (`XAI_API_KEY`, `https://api.x.ai/v1`). Official facts used:

- Grok 4.6: text + **image** input, structured JSON output.
- Mastra model router: `model: 'xai/grok-4.6'`.
- `@ai-sdk/xai@4.0.54` exists if we call AI SDK directly.

Gemini remains a documented fallback in `docs/research/versions.md`, unused in v1.

## ADR-006 — LibSQL for Mastra snapshots, Supabase for business data

**Status:** Accepted

Mastra has no Supabase storage adapter. Snapshots go to `@mastra/libsql` `file:./mastra.db` (gitignored). Orders/items/messages/audit stay in Supabase.

Production follow-up: `@mastra/pg` with `schemaName: 'mastra'` on the same Postgres, not mixed into `public`.

## ADR-007 — Service role on the server, anon Realtime in the browser

**Status:** Accepted

Hackathon: mutations use the Supabase **service role** in Route Handlers only. Browser uses URL + anon key to subscribe to `messages` and `orders`. RLS is enabled with SELECT-open policies so Realtime delivers rows; anon cannot INSERT/UPDATE/DELETE. Tighten with per-user policies after the demo.

## ADR-008 — Fail closed; no mock paid

**Status:** Accepted

If unsure, do not charge. No UI control sets `status=paid`. The only exception is a clearly labelled **dev-only** script that still talks to Razorpay test APIs or is named `scripts/dev-*.ts` and refuses to run without `ALLOW_DEV_PAID=1`.

Webhook retries + double resume: unique `razorpay_payment_id`, catch `WORKFLOW_RESUME_ALREADY_CLAIMED`.

## ADR-009 — Watch chat is generated, not negotiated live

**Status:** Accepted

A free two-agent loop can invent discounts. Watch lines are templates written by workflow/audit events (`sellerAgent` may *phrase* a stock reply using `getItem`, but the numbers come from SQL). Human cannot type in watch chat.
