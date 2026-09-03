import { NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  const store = getStore()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Fetch items and orders for this seller
  const { data: items } = await supabase.from('items').select('*').eq('seller_id', user.id)
  const { data: orders } = await supabase.from('orders').select('*').eq('seller_id', user.id).order('created_at', { ascending: false })
  const { data: seller } = await supabase.from('sellers').select('*').eq('id', user.id).maybeSingle()

  return NextResponse.json({ items: items ?? [], orders: orders ?? [], seller })
}

export async function POST(req: Request) {
  // Disable reset stock for now
  return NextResponse.json({ ok: true })
}
