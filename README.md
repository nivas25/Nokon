<p align="center">
  <img src="public/logo.png" alt="Nokon Logo" width="200" />
</p>

<h1 align="center">Nokon</h1>

<p align="center">
  <strong>An autonomous, state-aware WhatsApp Conversational Commerce engine that transforms any merchant's WhatsApp number into a full-stack retail salesperson — capable of visual product identification, real-time price negotiation, Razorpay checkout generation, and post-payment fulfillment — without a single line of merchant code.</strong>
</p>

<p align="center">
  <code>Next.js 15</code> · <code>Mastra AI Framework</code> · <code>Supabase (Postgres)</code> · <code>Razorpay Payment Links</code> · <code>Meta Cloud API v21.0</code> · <code>GPT-4o-mini Vision</code>
</p>

---

## System Architecture

<p align="center">
  <img src="Archi.jpg" alt="Nokon System Architecture" width="100%" />
</p>

---

## How It Works: End-to-End Message Lifecycle

Every WhatsApp message triggers a deterministic pipeline. No step is skipped, no shortcut is taken.

```
Customer sends message (text/image/button tap)
        │
        ▼
┌──────────────────────────────────────────────┐
│  1. Meta Webhook (route.ts)                  │
│     → Parse payload                          │
│     → Resolve seller tenant via phone_id     │
│     → Return 200 OK within 50ms              │
│     → Hand off to runner via after()          │
└──────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│  2. The Runner (runner.ts)                   │
│     → If IMAGE: download media bytes →       │
│       base64 encode → GPT-4o-mini Vision     │
│       zero-shot extraction → lookup product  │
│     → If TEXT/BUTTON: log to whatsapp_logs   │
└──────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│  3. State Hydration (Supabase)               │
│     → Fetch active PENDING_PAYMENT order     │
│       from last 2 hours                      │
│     → Inject floor_price, listed_price,      │
│       available_sizes, selected_size         │
│     → Retrieve last 20 chat messages         │
│     → Proactively patch size if user tapped  │
│       a Quick Reply size button              │
└──────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│  4. LLM Agent (Mastra Core)                  │
│     → System prompt: seller persona +        │
│       session context + pacing rules         │
│     → Model: openai/gpt-4o-mini              │
│     → Autonomous tool execution (10 tools)   │
│     → Outputs structured JSON:               │
│       { chain_of_thought, messages[],        │
│         interactiveAction }                  │
└──────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│  5. Dispatcher (whatsapp-messenger.ts)       │
│     → Parse JSON output                      │
│     → Send typing indicator per bubble       │
│     → Stagger text messages with delays      │
│     → Dispatch Quick Reply buttons or        │
│       CTA URL payment links                  │
│     → Audit log all outbound messages        │
└──────────────────────────────────────────────┘
```

---

## Core Technical Pillars

### 1. Zero-Shot Multimodal Product Identification

When a customer forwards a screenshot from YouTube Shorts, Instagram, or any catalog image, the system does not rely on QR codes, barcodes, or rigid template matching.

**Implementation** (`src/lib/vision.ts`): The raw image bytes are downloaded from Meta's media CDN via `downloadWhatsAppMedia()`, base64-encoded, and dispatched to GPT-4o-mini's vision endpoint with a zero-shot extraction prompt. The model returns a structured JSON containing `itemCode`, `sellerHandle`, and `size` — which is then used for a direct indexed lookup against the `products` table.

**Failure path**: If extraction returns `null` for `itemCode`, the runner replies with a graceful retry message and exits early. If the item code is extracted but not found in inventory, the runner responds with a specific "item not found" message. If the Vision API itself throws, the catch block dispatches a generic error message without crashing.

### 2. Conversational State Hydration (Solving LLM Amnesia)

LLMs are stateless by design. Every invocation starts with zero memory. Nokon solves this with a two-layer state injection system:

**Layer 1 — Active Order Context**: On every message, the runner queries Supabase for the most recent `PENDING_PAYMENT` or `PAID` order within the last 2 hours for the current `(seller_id, customer_phone)` pair. If found, the product's `listed_price`, `floor_price`, `available_sizes`, `selected_size`, and `order_status` are serialized into a `[ACTIVE SESSION CONTEXT]` block injected directly into the system prompt.

**Layer 2 — Transcript Window**: The last 20 messages from `whatsapp_logs` are fetched, reversed into chronological order, and formatted as a `Customer: / Agent:` transcript. This gives the LLM conversational continuity across turns without exceeding token budgets.

**Proactive Size Patching**: If the last customer message matches an entry in `available_sizes`, the runner silently patches the `orders.selected_size` column before invoking the LLM, so the agent sees the updated state immediately.

### 3. Deterministic Guardrails & Profit-First Negotiation

The agent is permitted to negotiate, but it operates within strict mathematical boundaries enforced at two independent levels:

**Prompt-Level Guardrails** (`src/agent/prompts/seller-persona.ts`):
- A 5-stage conversational pacing framework (Acknowledge → Size → Consent → Tool Execution → Shipping) prevents the agent from rushing to checkout.
- Negotiation tactics (Anchor & Defend, The Flinch, The Trade-Off, The Hard Stop) are encoded as behavioral rules.
- The agent is instructed to never drop below `floor_price` and to counter-offer incrementally.

**Tool-Level Guardrails** (`src/agent/tools/03-evaluate-discount.ts`):
- Round 1: Counter at 75% of the gap between listed and buyer's offer.
- Round 2: Counter at 50% of the gap.
- Round 3+: Accept the offer (if above floor).
- A `Math.max(counterOffer, floorPrice)` safety net ensures the floor is never breached regardless of rounding.

**Checkout-Level Guardrails** (`src/agent/tools/05-create-payment-link.ts`):
- Before generating a Razorpay link, the tool re-fetches `floor_price` from the database and performs a hard comparison: `agreedPriceRupees < item.floor_price` → immediate abort with `"Security abort: Agreed price is strictly below the minimum floor price."`. This defense is independent of the LLM and cannot be bypassed by prompt injection.

### 4. Razorpay Payment Link Integration

Nokon generates time-bound Razorpay Payment Links with the following properties:

- **Dynamic Pricing**: The `amount` field is set to `Math.round(agreedPriceRupees * 100)` — the exact negotiated price in paise, not the listed price.
- **Auto-Expiry**: Every link has `expire_by` set to 16 minutes from generation (960 seconds). Razorpay requires a minimum of 15 minutes; 16 provides a safety buffer.
- **Idempotency**: Before generating a new link, the tool checks for any existing `PENDING_PAYMENT` order for the same `(seller_id, customer_phone, product_id)` created in the last 15 minutes. If found with the same `total_amount`, it fetches the existing link via `rzp.paymentLink.fetch()` and returns the active `short_url`, preventing duplicate charges.
- **Stock Locking**: Upon link generation, stock is atomically decremented. If Razorpay generation fails, a rollback restores the stock count.
- **CTA Dispatch**: The payment URL is delivered as a Meta Interactive `cta_url` message — a native tappable button rendered inside WhatsApp, not a raw text link.

### 5. Webhook-Driven Post-Payment Lifecycle

Razorpay webhooks (`src/app/api/webhooks/razorpay/route.ts`) close the loop:

| Event | Action |
|---|---|
| `payment_link.paid` | Update order status to `PAID`, store `razorpay_payment_id`, send WhatsApp confirmation requesting shipping address |
| `payment_link.expired` | Update order to `CANCELLED`, restore `stock_count + 1`, notify customer that item is back on shelf |
| Signature mismatch | Reject with 400 (HMAC validation via `razorpay-utils`) |
| Duplicate `PAID` event | Idempotent 200 response, no double-processing |

### 6. Automated Invoice Generation & Dispatch

After payment confirmation, the agent collects the customer's shipping address via text and executes `dispatchInvoice` (`src/agent/tools/09-dispatch-invoice.ts`), which:

1. Fetches order + seller details from Supabase.
2. Generates a styled PDF using PDFKit with store branding, line items, and customer details.
3. Uploads the PDF to Supabase Storage.
4. Sends the document link to the customer via WhatsApp.
5. Updates the order status to `PROCESSING`.

---

## The 10-Tool Ecosystem

Every tool is a Mastra `createTool()` definition with Zod-validated input schemas. The LLM autonomously decides which tool(s) to execute based on conversational context.

| # | Tool | Trigger | Function |
|---|---|---|---|
| 01 | `searchCatalog` | Customer asks "show me sarees" or "what do you have under ₹5000?" | Fuzzy `ilike` search on `name`, `description`, `item_code` with optional `maxBudget` filter |
| 02 | `checkVariant` | Customer asks "is this available in M?" | Checks `stock_count` and `available_sizes` for a specific SKU; suggests upsell items if out of stock |
| 03 | `evaluateDiscount` | Customer counter-offers a price | Computes whether the offer is acceptable based on `floor_price`, `listed_price`, and bargain round; returns `allowed` or `recommendedCounterOffer` |
| 04 | `calculateBundle` | Customer wants to buy multiple items | Sums prices, applies 5% bundle discount for 2+ items, reports missing codes |
| 05 | `createPaymentLink` | Customer agrees to buy | Floor-price validation → idempotency check → stock lock → Razorpay `paymentLink.create()` → order upsert |
| 06 | `verifyPayment` | Customer asks "did my payment go through?" | Fetches latest order; if `PENDING`, pings Razorpay API directly to check status and updates DB |
| 07 | `validateDelivery` | Customer provides a PIN code | Validates via Shiprocket API (primary) or India Postal API (fallback); returns serviceability, estimated days, COD availability |
| 08 | `trackOrder` | Customer asks "where is my order?" | Returns latest order status, item name, and last updated timestamp |
| 09 | `dispatchInvoice` | Agent collects shipping address post-payment | Generates PDF receipt via PDFKit, uploads to Supabase Storage, sends via WhatsApp, updates order to `PROCESSING` |
| 10 | `escalateHuman` | Customer requests human help or agent detects complex scenario | Logs escalation intent, pauses bot auto-replies, dispatches WhatsApp alert to seller's personal number |

---

## Resilience & Error Handling

| Failure Scenario | Recovery Mechanism |
|---|---|
| LLM returns malformed JSON | Substring extraction (`firstBrace` to `lastBrace`); if still invalid, sends fallback message without crashing |
| Vision API timeout/error | Catch block dispatches "try again" message and returns early |
| Product not found in DB | Tool returns `{ success: false }` with descriptive error; LLM apologizes naturally |
| Razorpay link generation fails | Stock rollback executed; error returned to LLM for customer notification |
| Duplicate payment link request | 15-minute idempotency window prevents double-generation; existing link is reused |
| Payment link expires | Razorpay webhook restores stock, cancels order, notifies customer |
| Meta webhook timeout risk | `after()` from `next/server` returns 200 OK within 50ms; all processing runs asynchronously |
| Unsupported message type (voice, PDF) | Silent acknowledgment — no crash, no LLM invocation |

---

## Multi-Tenant Architecture

Nokon is designed as a multi-tenant SaaS from day one. The `whatsapp_phone_number_id` in the Meta webhook payload is used to resolve the seller tenant. Each seller has isolated:

- Product catalog (`products.seller_id`)
- Order history (`orders.seller_id`)
- Chat logs (`whatsapp_logs.seller_id`)
- Custom agent persona (`sellers.global_agent_prompt`)
- Negotiation rules (`products.agent_negotiation_rules` per item)

Row-Level Security (RLS) policies enforce tenant isolation at the database layer.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Next.js 15 (App Router, Node.js runtime) |
| AI Orchestration | Mastra AI Framework (`@mastra/core`) |
| LLM | OpenAI GPT-4o-mini (chat + vision) |
| Database | Supabase (PostgreSQL + Storage + RLS) |
| Payments | Razorpay Payment Links API |
| Messaging | Meta WhatsApp Business Cloud API v21.0 |
| PDF Generation | PDFKit |
| Delivery Validation | Shiprocket API + India Postal API (fallback) |
| Schema Validation | Zod |
| Webhook Security | HMAC-SHA256 signature verification (Razorpay) |

---

## Project Structure

```
src/
├── agent/
│   ├── runner.ts                    # Core orchestration engine
│   ├── prompts/
│   │   └── seller-persona.ts        # LLM system prompt builder
│   ├── dispatcher/
│   │   └── whatsapp-messenger.ts    # Staggered message dispatch
│   └── tools/
│       ├── 01-search-catalog.ts     # Inventory search
│       ├── 02-check-variant.ts      # Size & stock check
│       ├── 03-evaluate-discount.ts  # Negotiation engine
│       ├── 04-calculate-bundle.ts   # Multi-item pricing
│       ├── 05-create-payment-link.ts# Razorpay checkout
│       ├── 06-verify-payment.ts     # Payment status check
│       ├── 07-validate-delivery.ts  # PIN code validation
│       ├── 08-track-order.ts        # Order tracking
│       ├── 09-dispatch-invoice.ts   # PDF invoice generation
│       └── 10-escalate-human.ts     # Human handoff
├── app/
│   └── api/
│       ├── whatsapp-webhook/
│       │   └── route.ts             # Meta webhook ingestion
│       └── webhooks/
│           └── razorpay/
│               └── route.ts         # Razorpay event handler
└── lib/
    ├── whatsapp.ts                  # WhatsApp API utilities
    ├── vision.ts                    # GPT-4o-mini vision extraction
    └── razorpay/
        └── verify.ts               # HMAC signature verification
```

---

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/nivas25/Nokon.git
cd Nokon

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
#          OPENAI_API_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET,
#          RAZORPAY_WEBHOOK_SECRET, WHATSAPP_ACCESS_TOKEN,
#          WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN

# 4. Run the development server
npm run dev

# 5. Expose to Meta via ngrok (for local testing)
ngrok http 3000
```

---

## Author

**Reddy Sai Nivas C**

Architecture, systems design, and full-stack development.
