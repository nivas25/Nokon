import { NextResponse } from 'next/server'
import { getStore } from '@/lib/store'

export const runtime = 'nodejs'

export async function GET() {
  const store = getStore()
  await store.seedDemo()
  const items = await store.listItems()
  const orders = await store.listOrders()
  return NextResponse.json({ items, orders })
}

export async function POST(req: Request) {
  const store = getStore()
  const body = (await req.json()) as { resetStock?: boolean }
  const seeded = await store.seedDemo({ resetStock: body.resetStock === true })
  return NextResponse.json({ ok: true, seeded })
}
