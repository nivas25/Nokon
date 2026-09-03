# Razorpay test mode (verified 2026-09-03)

Primary sources:

- Orders: https://razorpay.com/docs/api/orders/create
- Standard Payment Links: https://razorpay.com/docs/api/payments/payment-links/create-standard
- Payments webhooks: https://razorpay.com/docs/webhooks/payments
- Payment Link webhooks: https://razorpay.com/docs/webhooks/payment-links
- Node SDK verify: https://github.com/razorpay/razorpay-node/blob/master/documents/paymentVerfication.md
- Node SDK paymentLink: https://github.com/razorpay/razorpay-node/blob/master/documents/paymentLink.md
- Test cards / UPI: https://razorpay.com/docs/developer-tools/integrations/standard-checkout

Package: `razorpay@2.9.8`. Keys: `rzp_test_…` only. Never commit keys.

## Amounts

- Always **paise integers**. ₹999 → `99900`.
- Minimum INR amount: **100 paise (₹1)**.
- Never send floats or strings.

## What we create

Nokon v1 uses a **Standard Payment Link** as the buyer-facing charge. A Payment Link internally creates a Razorpay Order (`payload.payment_link.entity.order_id`). We do **not** also call `orders.create` for the same attempt — that would be two charge instruments.

Deviation from the master brief (“create Order + Payment Link”): documented in ADR-003. Brief allowed “Orders and/or Payment Links”.

```js
import Razorpay from 'razorpay'

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

const expireBy = Math.floor(Date.now() / 1000) + 20 * 60 // 20 min; 15 min is the API minimum

const link = await rzp.paymentLink.create({
  amount: catalogPricePaise,          // MUST equal items.price_paise
  currency: 'INR',
  accept_partial: false,
  expire_by: expireBy,
  reference_id: ourOrderId,           // uuid, unique, max 40 chars
  description: `Nokon item ${itemCode}`,
  notify: { sms: false, email: false },
  reminder_enable: false,
  notes: {
    nokon_order_id: ourOrderId,
    item_code: itemCode,
  },
  callback_url: process.env.RAZORPAY_CALLBACK_URL, // optional
  callback_method: 'get',
})

// persist:
// razorpay_payment_link_id = link.id            // plink_…
// razorpay_payment_link_url = link.short_url
// razorpay_order_id = link.order_id             // if present on create; else from webhook
```

### Hard constraints from official docs

| Constraint | What we do |
|---|---|
| **UPI Payment Links are not supported in Test Mode** (`upi_link: true` → 400) | Never set `upi_link`. Standard link. Buyer may still pick UPI on Checkout. |
| Test mode: **max ~30 Payment Links per business** | One demo shop. Cancel/expire old links. Reuse `@sareedidi`. |
| `expire_by` Unix seconds, **≥ 15 minutes from now** | Use **20 minutes**. |
| `reference_id` unique, ≤ 40 chars | Our order UUID (36 chars). |
| `accept_partial` default false | Keep false. Amount is catalog price, not a range. |
| `notify.sms` / `notify.email` | false in test — we show the URL in-app. |

## Test pay

Official test instruments (Standard Checkout / Standard Payment Link):

| Method | Value | Result |
|---|---|---|
| Visa | `4100 2800 0000 1007`, any CVV, any future expiry | success |
| Mastercard | `5555 5100 0008 1006` | success |
| Visa decline | `4100 2800 0006 0003` | failed |
| UPI | `success@razorpay` | success |
| UPI | `failure@razorpay` | failed |
| UPI | `pending@razorpay` | pending (webhook later) |
| Payment Link hosted page | Success / Failure buttons in test mode | as labelled |

OTP in test: 4-digit (e.g. `1234`) succeeds. Webhook dashboard OTP in test: `754081`.

Paid is **not** a UI toggle. Paid = webhook after signature verify.

## Webhooks we subscribe to

| Event | Action |
|---|---|
| `payment.captured` | Primary “money is real” signal. |
| `order.paid` | Same capture, includes order+payment. Treat as equivalent; idempotent on `payment.id`. |
| `payment_link.paid` | Link-level paid; payload contains `payment_link`, `order`, `payment`. |
| `payment.failed` | Do not mark paid. Optionally `status=failed` if no later capture. |
| `payment_link.expired` | Release reserve if still `awaiting_payment`. |

**Idempotency:** `orders.razorpay_payment_id` is UNIQUE. Upsert/ignore on conflict. Webhook retries are expected. `payment.failed` then `payment.captured` for the same retry is documented (UPI PIN retry) — **capture wins**.

### Signature verify (mandatory)

Use the **raw request body** string. Do not `req.json()` first.

```ts
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils'

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) return new Response('webhook unconfigured', { status: 500 })

  const ok = validateWebhookSignature(rawBody, signature, secret)
  if (!ok) return new Response('invalid signature', { status: 400 })

  const event = JSON.parse(rawBody)
  // …handle event.event
  return new Response('ok', { status: 200 })
}
```

Webhook secret ≠ API key secret. Configure it on the Razorpay Dashboard (test mode). Local tunnel: ngrok or cloudflared; never commit the tunnel URL if it embeds a secret.

### What the webhook must NOT do

- Must not create a Payment Link.
- Must not `resume()` a charge-create step.
- Must not trust `amount` from the payload without comparing to `orders.catalog_price_paise`.
- Must not log full card objects. `payload` in `audit_events` stores ids + amounts + event name only.

## Mapping to our `orders` row

| Razorpay field | `orders` column |
|---|---|
| Payment Link `id` | `razorpay_payment_link_id` |
| Payment Link `short_url` | `razorpay_payment_link_url` |
| Payment Link / payment `order_id` | `razorpay_order_id` |
| payment `id` | `razorpay_payment_id` (unique) |
| our UUID | Payment Link `reference_id` and `notes.nokon_order_id` |

Lookup on webhook: `notes.nokon_order_id` OR `reference_id` OR `razorpay_payment_link_id`. Fail closed if none match.

## What I verified

1. Node SDK: `new Razorpay({ key_id, key_secret })`, `instance.paymentLink.create({ amount, currency, expire_by, reference_id, … })`, `instance.orders.create({ amount, currency, receipt })`.
2. `validateWebhookSignature(rawBody, header, webhookSecret)` is the documented helper.
3. UPI **links** are live-mode only; Standard links + test cards / `success@razorpay` work in test.
4. 30-link test cap is official.
5. `expire_by` minimum 15 minutes — we use 20.
6. `payment.captured` is the fulfil signal. UI `status=paid` only after this (or `order.paid` / `payment_link.paid` that includes a captured payment), signature verified, amount matched.
