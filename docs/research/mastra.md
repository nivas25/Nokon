# Mastra (verified 2026-09-03)

Primary sources: https://mastra.ai/docs , https://mastra.ai/docs/workflows/overview , https://mastra.ai/docs/workflows/suspend-and-resume , https://mastra.ai/reference/workflows/run-methods/resume , https://mastra.ai/docs/storage , https://mastra.ai/integrations/frameworks/next-js , https://mastra.ai/models/providers/xai

Package: `@mastra/core@1.64.0` (Mastra **1.x**, not 0.x). Node **>= 22.13.0**.

## Next.js integration (official)

Mastra’s current Next.js guide:

1. `npx create-next-app@latest … --ts --eslint --tailwind --src-dir --app --turbopack`
2. `npx mastra@latest init` → creates `src/mastra/` (`index.ts`, agents, tools)
3. Call agents/workflows by **importing `mastra` from `@/mastra` inside App Router route handlers**. No separate Mastra HTTP server required for v1.
4. Chat UI (optional): `npm i @mastra/ai-sdk@latest @ai-sdk/react ai` and `handleChatStream({ mastra, agentId, version: 'v7', params })`.

Relative libSQL paths (`file:./mastra.db`) resolve from the process cwd. `next dev` and `mastra dev` have different cwds — use an **absolute** file URL if both run at once.

## Workflow API we will use

```ts
import { createWorkflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'

const step = createStep({
  id: 'collect-missing',
  inputSchema: z.object({ orderId: z.string().uuid() }),
  outputSchema: z.object({ size: z.string(), capPaise: z.number().int() }),
  resumeSchema: z.object({
    size: z.string().optional(),
    capPaise: z.number().int().optional(),
    shippingName: z.string().optional(),
    shippingAddress: z.record(z.string(), z.unknown()).optional(),
  }),
  suspendSchema: z.object({ missing: z.array(z.string()) }),
  stateSchema: z.object({ orderId: z.string().uuid() }),
  execute: async ({ inputData, resumeData, suspend, state, setState }) => {
    if (!resumeData?.capPaise) {
      return await suspend({ missing: ['capPaise'] })
    }
    setState({ ...state, orderId: inputData.orderId })
    return { size: resumeData.size ?? 'M', capPaise: resumeData.capPaise }
  },
})

export const orderFromScreenshot = createWorkflow({
  id: 'order-from-screenshot',
  inputSchema: z.object({
    orderId: z.string().uuid(),
    imageUrl: z.string().url().optional(),
    rawText: z.string().optional(),
    buyerId: z.string().uuid(),
  }),
  outputSchema: z.object({
    status: z.enum(['awaiting_payment', 'blocked', 'paid']),
    blockReason: z.string().nullable(),
  }),
  stateSchema: /* master schema */,
})
  .then(step)
  .commit()
```

Register on the Mastra instance with the **registration key**:

```ts
export const mastra = new Mastra({
  workflows: { orderFromScreenshot },
  storage: /* see below */,
})

const wf = mastra.getWorkflow('orderFromScreenshot') // registration key, not id
const run = await wf.createRun()
const started = await run.start({ inputData: { … } })
// persist run.id onto orders.mastra_run_id

if (started.status === 'suspended') {
  const resumed = await run.resume({
    step: started.suspended[0], // or omit if exactly one step is suspended
    resumeData: { size: 'M', capPaise: 120000 },
  })
}
```

Resume by stored id later:

```ts
const run = await wf.createRun({ runId: order.mastra_run_id })
await run.resume({ resumeData })
```

### Concurrent resume

Official: only one `resume()` may continue a suspension. Storage adapters that support concurrent updates atomically move status `suspended` → `running`. A second caller throws **`WORKFLOW_RESUME_ALREADY_CLAIMED`**. Over HTTP this is **409 Conflict**.

```ts
try {
  await run.resume({ resumeData })
} catch (error) {
  if (error && typeof error === 'object' && 'id' in error && error.id === 'WORKFLOW_RESUME_ALREADY_CLAIMED') {
    // re-read order row; do not create a second Payment Link
  }
}
```

### State vs step I/O

- **inputData / outputData**: piped between consecutive `.then()` steps.
- **state / setState**: shared bag that survives suspend/resume. Declare `stateSchema` on the workflow (master) and a subset on each step.
- Catalog price, seller id, item id live in **state and SQL**, never in chat memory.

### Webhook vs resume

Do **not** have the Razorpay webhook blindly `resume()` a `reserveAndCharge` step. Webhook writes SQL first (`status=paid`, payment id unique). If the workflow is sitting on `awaitPayment`, resume **that** wait step once. If the run already finished, skip resume.

## Agents vs tools vs money

- Agents = language only (`buyerAgent`, `sellerAgent`).
- Money tools (`createRazorpayPayment`) are called from **workflow steps after the TypeScript gate**, never from an agent tool list.
- Seller agent tools: `getItem`, `getStock` (read-only, scoped to the matched seller).
- Buyer agent: no Razorpay. It may conceptually call `submitResumeFields` (our Next.js resume route).

Mastra model routing (no extra provider package required if using the router string):

```ts
import { Agent } from '@mastra/core/agent'

export const buyerAgent = new Agent({
  id: 'buyer-agent',
  name: 'Buyer agent',
  instructions: 'Ask only for missing size, cap, and shipping. Never invent catalog price.',
  model: 'xai/grok-4.6',
})
```

Env: `XAI_API_KEY`. Docs: https://mastra.ai/models/providers/xai

Vision OCR: Grok 4.6 accepts image+text. Use `agent.generate` / structured output with a Zod extract schema. Typed `@handle` + item code always wins over a weak OCR.

## Storage choice (hackathon)

Official snapshot backends: libSQL (default), PostgreSQL (`@mastra/pg`), Upstash, Oracle, Mongo, etc. **No Supabase-specific adapter.**

Decision (also in ADRs):

| Data | Store |
|---|---|
| Orders, items, messages, audit | **Supabase Postgres** via `@supabase/supabase-js` service role on the server |
| Mastra workflow snapshots + agent memory | **libSQL file** `file:./mastra.db` (`@mastra/libsql`) for local/hackathon |

Why not put Mastra snapshots on the same Supabase DB in v1: Mastra auto-creates `mastra_*` tables; mixing them with our RLS/realtime schema is extra surface for a weekend. `@mastra/pg` with `schemaName: 'mastra'` is the production path (documented, not implemented in v1).

In-memory storage loses suspend state on `next dev` restart — do not use it.

## What I verified

- `createWorkflow` + `.then(step).commit()` is the 1.x composition API.
- `suspend()` / `resume({ resumeData, step? })` and snapshot persistence are first-class.
- `WORKFLOW_RESUME_ALREADY_CLAIMED` is documented on `Run.resume()`.
- `state` + `setState` persist across suspend.
- Next.js: import the Mastra instance in route handlers; Studio is optional.
- xAI is a first-class Mastra model provider (`xai/grok-4.6`).
- Zod 4 is acceptable (Mastra 1.x uses Standard JSON Schema).
