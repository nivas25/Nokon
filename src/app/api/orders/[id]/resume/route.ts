import { NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { mastra } from '@/mastra'

export const runtime = 'nodejs'

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = (await req.json()) as {
    size?: string
    capPaise?: number
    shippingName?: string
    shippingAddress?: Record<string, unknown>
  }
  const store = getStore()
  const order = await store.getOrder(id)
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (!order.mastra_run_id) {
    return NextResponse.json({ error: 'no workflow run' }, { status: 409 })
  }

  try {
    const workflow = mastra.getWorkflow('orderFromScreenshot')
    const run = await workflow.createRun({ runId: order.mastra_run_id })
    const result = await run.resume({
      resumeData: {
        size: body.size,
        capPaise: body.capPaise,
        shippingName: body.shippingName,
        shippingAddress: body.shippingAddress,
      },
    })
    const fresh = await store.getOrder(id)
    return NextResponse.json({
      order: fresh,
      workflowStatus: result.status,
      workflowResult: result.status === 'success' ? result.result : null,
    })
  } catch (error) {
    const code = error && typeof error === 'object' && 'id' in error ? String(error.id) : ''
    if (code === 'WORKFLOW_RESUME_ALREADY_CLAIMED') {
      const fresh = await store.getOrder(id)
      return NextResponse.json({ order: fresh, claimed: true }, { status: 409 })
    }
    const message = error instanceof Error ? error.message : 'resume failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
