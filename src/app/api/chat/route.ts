import { NextResponse } from 'next/server'
import { parseIntentFromText } from '@/lib/parse-intent'
import { getStore } from '@/lib/store'
import { mastra } from '@/mastra'

export const runtime = 'nodejs'

/** Buyer types in main chat. We parse fields and resume the workflow. No Razorpay here. */
export async function POST(req: Request) {
  const body = (await req.json()) as { orderId?: string; text?: string }
  if (!body.orderId || !body.text?.trim()) {
    return NextResponse.json({ error: 'orderId and text required' }, { status: 400 })
  }
  const store = getStore()
  const order = await store.getOrder(body.orderId)
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 })

  await store.appendMessage({
    orderId: order.id,
    channel: 'main',
    sender: 'buyer_human',
    body: body.text,
  })

  const parsed = parseIntentFromText(body.text)
  const resumeData = {
    size: parsed.size ?? undefined,
    capPaise: parsed.capPaise ?? undefined,
    shippingName: order.shipping_name ?? (looksLikeName(body.text) ? body.text.trim() : undefined),
    shippingAddress: order.shipping_address ?? (looksLikeAddress(body.text) ? { line1: body.text.trim() } : undefined),
  }

  if (!order.mastra_run_id) {
    return NextResponse.json({ order, parsed: resumeData })
  }

  try {
    const workflow = mastra.getWorkflow('orderFromScreenshot')
    const run = await workflow.createRun({ runId: order.mastra_run_id })
    const result = await run.resume({ resumeData })
    const fresh = await store.getOrder(order.id)
    return NextResponse.json({
      order: fresh,
      workflowStatus: result.status,
      parsed: resumeData,
    })
  } catch (error) {
    const code = error && typeof error === 'object' && 'id' in error ? String(error.id) : ''
    if (code === 'WORKFLOW_RESUME_ALREADY_CLAIMED') {
      const fresh = await store.getOrder(order.id)
      return NextResponse.json({ order: fresh, claimed: true }, { status: 409 })
    }
    const message = error instanceof Error ? error.message : 'chat failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function looksLikeAddress(text: string): boolean {
  return /\d/.test(text) && text.length > 12 && !/@/.test(text)
}

function looksLikeName(text: string): boolean {
  return /^[A-Za-z][A-Za-z .']{2,40}$/.test(text.trim())
}
