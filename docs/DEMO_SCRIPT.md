# Demo script

Seed: seller `@sareedidi`, item **14**, **₹999** (`price_paise = 99900`), **stock = 2**, sizes include `M`.

Typed fallback (always available if OCR is weak): `@sareedidi 14` plus `M, max 1200`.

Prepare a clean screenshot of a YouTube overlay that literally contains `@sareedidi` and `14` so vision has a chance. Do not depend on it.

## Happy path (must work)

1. Seller is onboarded (seed). Catalog shows item 14, stock 2.
2. Buyer starts an order: screenshot **or** text `@sareedidi 14` and `M, max 1200`.
3. Status strip: reading → found shop → checking stock → (maybe waiting for you if size/cap/address missing) → creating pay link → awaiting payment.
4. Main chat asks only for missing fields. Watch chat shows buyer-agent ↔ seller-agent lines generated from workflow events.
5. Gate: stock > 0 AND `99900 <= 120000` → PASS. Audit: `GATE PASS`.
6. A Razorpay **test** Payment Link is created. Amount **99900**. URL shown in buyer UI. **No** mock paid button.
7. Open the link. Pay with test Visa `4100 2800 0000 1007` (any CVV, future expiry) or UPI `success@razorpay`, or the test-mode Success button on the hosted page.
8. Webhook `payment.captured` (signature verified) → `orders.status = paid`, `razorpay_payment_id` set, stock **1**, seller order card pack-ready. Both chats append a paid line.

## Fail path (required)

Same item, buyer cap **₹500** (`cap_paise = 50000`).

1. Start order `@sareedidi 14` + `M, max 500`.
2. Gate: `99900 <= 50000` → FAIL.
3. **Zero** calls to `paymentLink.create` / `orders.create`.
4. `orders.status = blocked`, `block_reason = OVER_CAP`.
5. Audit: `decision = FAIL`, `reason = BLOCKED_OVER_CAP` (or `OVER_CAP`).
6. Watch + main chat: seller-agent / system explain the catalog price vs cap, and **“I will not create a Razorpay charge.”**

Optional extra fails (nice, not required if over-cap is visible):

- Unknown handle `@notashop` → `SHOP_NOT_FOUND`, no Razorpay call.
- Item `99` at `@sareedidi` → `ITEM_NOT_FOUND`.
- Stock 0 → `OUT_OF_STOCK`.

## What judges should see

- Audit panel: parse → match seller → match item → gate → (charge or block) → webhook.
- Razorpay dashboard (test mode): a real Payment Link / payment for the happy path only.
- Seller UI stock 2 → 1 only after webhook, not after “create link”.

## Reset

```bash
npx tsx scripts/seed.ts          # upsert demo seller + item 14 stock 2
npx tsx scripts/release-expired.ts   # optional: return reserved stock
```
