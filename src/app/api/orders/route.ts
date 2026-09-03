import { NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { parseIntentFromText } from '@/lib/parse-intent'
import { mastra } from '@/mastra'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body = (await req.json()) as {
    rawText?: string
    imageUrl?: string
    size?: string
    capPaise?: number
    shippingName?: string
    shippingAddress?: Record<string, unknown>
    buyerName?: string
  }

  const store = getStore()
  await store.seedDemo()
  const parsed = parseIntentFromText(body.rawText)
  const buyer = await store.createBuyer(body.buyerName)
  const order = await store.createOrder({
    buyer_id: buyer.id,
    item_code: parsed.itemCode,
    size: body.size ?? parsed.size,
    cap_paise: body.capPaise ?? parsed.capPaise,
    catalog_price_paise: 0,
    status: 'started',
    shipping_name: body.shippingName ?? null,
    shipping_address: body.shippingAddress ?? null,
  })

  const workflow = mastra.getWorkflow('orderFromScreenshot')
  const run = await workflow.createRun()
  await store.updateOrder(order.id, { mastra_run_id: run.runId })

  const result = await run.start({
    initialState: { orderId: order.id },
    inputData: {
      orderId: order.id,
      imageUrl: body.imageUrl,
      rawText: body.rawText,
      buyerId: buyer.id,
      size: body.size ?? parsed.size ?? undefined,
      capPaise: body.capPaise ?? parsed.capPaise ?? undefined,
      shippingName: body.shippingName,
      shippingAddress: body.shippingAddress,
    },
  })

  const fresh = await store.getOrder(order.id)
  return NextResponse.json({
    order: fresh,
    runId: run.runId,
    workflowStatus: result.status,
    workflowResult: result.status === 'success' ? result.result : null,
    suspended: result.status === 'suspended' ? result.suspended : null,
  })
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const store = getStore()
  const order = await store.getOrder(id)
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const messages = await store.listMessages(id)
  const audit = await store.listAudit(id)
  return NextResponse.json({ order, messages, audit })
}
