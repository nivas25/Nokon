# Nokon

**YouTube is the storefront. Nokon is the agent layer that turns a reel screenshot into a bounded, logged Razorpay test order — without a fake UPI photo.**

Hackathon track 01: an AI buyer that can complete a **real Razorpay test-mode** payment against an onboarded YouTube seller’s catalog. Cap and stock are TypeScript gates. Paid is a verified webhook, not a screenshot.

## What it is

India YouTube sellers overlay a phone number + item code. Buyers WhatsApp a screenshot, pay UPI, and send a receipt photo. Fake receipts, no stock truth, no audit.

Nokon replaces that money dance **only for sellers who onboard** (`@sareedidi`). Discovery stays on YouTube. We are not Flipkart and not Razorpay RAY (RAY is merchant ops on WhatsApp; we are product buying).

## Demo (must work)

Seed: `@sareedidi`, item **14**, **₹999**, stock **2**.

**Happy**

1. Buyer: screenshot **or** typed `@sareedidi 14` + `M, max 1200`.
2. Gates pass → Razorpay **test** Payment Link (₹999.00).
3. Pay with test Visa `4100 2800 0000 1007` or UPI `success@razorpay`.
4. Webhook `payment.captured` (signature verified) → `orders.status = paid`, stock **1**, seller pack-ready.

**Fail (required)**

1. Same item, cap **₹500**.
2. **Zero** Razorpay create calls.
3. Audit `BLOCKED_OVER_CAP`. Chat: *I will not create a Razorpay charge.*

Full script: [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md).

## Stack (pinned 2026-09-03)

| Piece | Pin | Notes |
|---|---|---|
| Next.js App Router | 16.3.4 | Node ≥ 22.13 |
| Mastra | `@mastra/core` 1.64.0 | Workflows + agents. Snapshots in local libSQL. |
| Supabase | `@supabase/supabase-js` 2.114.0 | Business data + Realtime |
| Razorpay | `razorpay` 2.9.8 | **Test keys only.** Standard Payment Links (UPI *links* do not work in test). |
| AI | SpaceXAI `xai/grok-4.6` | Vision + chat. `XAI_API_KEY`. |
| Zod | 4.5.4 | Every workflow I/O and API body |

Versions, doc URLs, and “what I verified”: [`docs/research/versions.md`](docs/research/versions.md).

## Money rules

- Amounts in **paise** internally.
- Catalog price never comes from chat.
- Cap gate + stock reserve in TypeScript **before** `paymentLink.create`.
- Paid = webhook after HMAC on the **raw** body. No mock paid button.
- Concurrent workflow resume: catch `WORKFLOW_RESUME_ALREADY_CLAIMED`.

## Docs

- Product rules: [`docs/PRODUCT.md`](docs/PRODUCT.md)
- Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Schema: [`docs/schema.sql`](docs/schema.sql)
- ADRs: [`docs/knowledge/decisions.md`](docs/knowledge/decisions.md)
- Razorpay notes: [`docs/research/razorpay.md`](docs/research/razorpay.md)
- Mastra notes: [`docs/research/mastra.md`](docs/research/mastra.md)

## Setup

```bash
cp .env.example .env.local
# fill Supabase, Razorpay test keys, XAI_API_KEY
```

Apply [`docs/schema.sql`](docs/schema.sql) in the Supabase SQL editor.

```bash
npm install
npx tsx scripts/seed.ts
npm run dev
```

Point a Razorpay **test** webhook at `https://<tunnel>/api/webhooks/razorpay` (`payment.captured`, `payment.failed`, `order.paid`, `payment_link.paid`, `payment_link.expired`). Secret → `RAZORPAY_WEBHOOK_SECRET`. Test dashboard OTP: `754081`.

## Headless checks

```bash
npx tsx scripts/headless-over-cap.ts   # must print BLOCKED_OVER_CAP and not call Razorpay
npx tsx scripts/headless-happy.ts      # prints a Payment Link URL; pay it by hand
```

## Out of scope (v1)

WhatsApp Business API, COD, returns, ads, logistics, upsell, campaign orchestrator, silent auto-debit.
