import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { DEMO_ITEM, DEMO_SELLER, type AuditDecision, type MessageChannel, type MessageSender, type OrderStatus } from '@/lib/types'
import { normalizeYoutubeHandle } from '@/lib/handles'
import { sanitizeAuditPayload } from '@/lib/audit'

export type SellerRow = {
  id: string
  shop_name: string
  youtube_handle: string
  city: string | null
}

export type ItemRow = {
  id: string
  seller_id: string
  item_code: string
  title: string
  price_paise: number
  stock: number
  sizes: string[]
  is_active: boolean
}

export type OrderRow = {
  id: string
  buyer_id: string | null
  seller_id: string | null
  item_id: string | null
  item_code: string | null
  size: string | null
  qty: number
  catalog_price_paise: number
  cap_paise: number | null
  status: OrderStatus
  block_reason: string | null
  mastra_run_id: string | null
  razorpay_order_id: string | null
  razorpay_payment_link_id: string | null
  razorpay_payment_link_url: string | null
  razorpay_payment_id: string | null
  reserved_until: string | null
  shipping_name: string | null
  shipping_address: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type MessageRow = {
  id: string
  order_id: string
  channel: MessageChannel
  sender: MessageSender
  body: string
  meta: Record<string, unknown>
  created_at: string
}

export type AuditRow = {
  id: string
  order_id: string | null
  step: string
  decision: AuditDecision
  reason: string | null
  payload: Record<string, unknown>
  created_at: string
}

export type NokonStore = {
  seedDemo(opts?: { resetStock?: boolean }): Promise<{ seller: SellerRow; item: ItemRow }>
  getSellerByHandle(handle: string): Promise<SellerRow | null>
  getSellerById(id: string): Promise<SellerRow | null>
  getItem(sellerId: string, itemCode: string): Promise<ItemRow | null>
  getItemById(id: string): Promise<ItemRow | null>
  getBuyerByName(name: string): Promise<{ id: string, name: string } | null>
  getBuyer(id: string): Promise<{ id: string, name: string } | null>
  createBuyer(name?: string): Promise<{ id: string, name: string }>
  createOrder(input: Partial<OrderRow> & { catalog_price_paise?: number }): Promise<OrderRow>
  getOrder(id: string): Promise<OrderRow | null>
  getLatestOrderForBuyer(buyerId: string): Promise<OrderRow | null>
  updateOrder(id: string, patch: Partial<OrderRow>): Promise<OrderRow>
  findOrderByPaymentId(paymentId: string): Promise<OrderRow | null>
  findOrderByPaymentLinkId(linkId: string): Promise<OrderRow | null>
  reserveStock(itemId: string): Promise<number>
  releaseStock(itemId: string): Promise<number>
  appendMessage(input: {
    orderId: string
    channel: MessageChannel
    sender: MessageSender
    body: string
    meta?: Record<string, unknown>
  }): Promise<void>
  writeAudit(input: {
    orderId: string | null
    step: string
    decision: AuditDecision
    reason?: string
    payload?: Record<string, unknown>
  }): Promise<void>
  listMessages(orderId: string): Promise<MessageRow[]>
  listAudit(orderId: string): Promise<AuditRow[]>
  listItems(): Promise<ItemRow[]>
  listOrders(): Promise<OrderRow[]>
}

function nowIso(): string {
  return new Date().toISOString()
}

export function createMemoryStore(): NokonStore {
  const sellers = new Map<string, SellerRow>()
  const items = new Map<string, ItemRow>()
  const orders = new Map<string, OrderRow>()
  const messages: MessageRow[] = []
  const audits: AuditRow[] = []

  const store: NokonStore = {
    async seedDemo(opts?: { resetStock?: boolean }) {
      const handle = normalizeYoutubeHandle(DEMO_SELLER.youtubeHandle)!
      let seller = [...sellers.values()].find((s) => s.youtube_handle === handle)
      if (!seller) {
        seller = {
          id: randomUUID(),
          shop_name: DEMO_SELLER.shopName,
          youtube_handle: handle,
          city: DEMO_SELLER.city,
        }
        sellers.set(seller.id, seller)
      }
      let item = [...items.values()].find(
        (i) => i.seller_id === seller!.id && i.item_code === DEMO_ITEM.itemCode,
      )
      if (!item) {
        item = {
          id: randomUUID(),
          seller_id: seller.id,
          item_code: DEMO_ITEM.itemCode,
          title: DEMO_ITEM.title,
          price_paise: DEMO_ITEM.pricePaise,
          stock: DEMO_ITEM.stock,
          sizes: [...DEMO_ITEM.sizes],
          is_active: true,
        }
        items.set(item.id, item)
      } else {
        item.price_paise = DEMO_ITEM.pricePaise
        item.is_active = true
        item.title = DEMO_ITEM.title
        item.sizes = [...DEMO_ITEM.sizes]
        if (opts?.resetStock) item.stock = DEMO_ITEM.stock
      }
      return { seller, item }
    },
    async getSellerByHandle(handle) {
      const normalized = normalizeYoutubeHandle(handle)
      if (!normalized) return null
      return [...sellers.values()].find((s) => s.youtube_handle === normalized) ?? null
    },
    async getSellerById(id) {
      return sellers.get(id) ?? null
    },
    async getItem(sellerId, itemCode) {
      return (
        [...items.values()].find((i) => i.seller_id === sellerId && i.item_code === itemCode) ?? null
      )
    },
    async getItemById(id) {
      return items.get(id) ?? null
    },
    async getBuyerByName(name) {
      return null
    },
    async getBuyer(id) {
      return null
    },
    async createBuyer(name?: string) {
      return { id: randomUUID(), name: name ?? 'Demo buyer' }
    },
    async createOrder(input) {
      const row: OrderRow = {
        id: input.id ?? randomUUID(),
        buyer_id: input.buyer_id ?? null,
        seller_id: input.seller_id ?? null,
        item_id: input.item_id ?? null,
        item_code: input.item_code ?? null,
        size: input.size ?? null,
        qty: input.qty ?? 1,
        catalog_price_paise: input.catalog_price_paise ?? 0,
        cap_paise: input.cap_paise ?? null,
        status: input.status ?? 'started',
        block_reason: input.block_reason ?? null,
        mastra_run_id: input.mastra_run_id ?? null,
        razorpay_order_id: input.razorpay_order_id ?? null,
        razorpay_payment_link_id: input.razorpay_payment_link_id ?? null,
        razorpay_payment_link_url: input.razorpay_payment_link_url ?? null,
        razorpay_payment_id: input.razorpay_payment_id ?? null,
        reserved_until: input.reserved_until ?? null,
        shipping_name: input.shipping_name ?? null,
        shipping_address: input.shipping_address ?? null,
        created_at: nowIso(),
        updated_at: nowIso(),
      }
      orders.set(row.id, row)
      return row
    },
    async getOrder(id) {
      return orders.get(id) ?? null
    },
    async getLatestOrderForBuyer(buyerId) {
      return [...orders.values()]
        .filter(o => o.buyer_id === buyerId && o.status !== 'failed' && o.status !== 'expired')
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
    },
    async updateOrder(id, patch) {
      const current = orders.get(id)
      if (!current) throw new Error(`order ${id} not found`)
      const next = { ...current, ...patch, id, updated_at: nowIso() }
      orders.set(id, next)
      return next
    },
    async findOrderByPaymentId(paymentId) {
      return [...orders.values()].find((o) => o.razorpay_payment_id === paymentId) ?? null
    },
    async findOrderByPaymentLinkId(linkId) {
      return [...orders.values()].find((o) => o.razorpay_payment_link_id === linkId) ?? null
    },
    async reserveStock(itemId) {
      const item = items.get(itemId)
      if (!item || !item.is_active || item.stock <= 0) return -1
      item.stock -= 1
      return item.stock
    },
    async releaseStock(itemId) {
      const item = items.get(itemId)
      if (!item) return -1
      item.stock += 1
      return item.stock
    },
    async appendMessage(input) {
      messages.push({
        id: randomUUID(),
        order_id: input.orderId,
        channel: input.channel,
        sender: input.sender,
        body: input.body,
        meta: input.meta ?? {},
        created_at: nowIso(),
      })
    },
    async writeAudit(input) {
      audits.push({
        id: randomUUID(),
        order_id: input.orderId,
        step: input.step,
        decision: input.decision,
        reason: input.reason ?? null,
        payload: sanitizeAuditPayload(input.payload ?? {}),
        created_at: nowIso(),
      })
    },
    async listMessages(orderId) {
      return messages.filter((m) => m.order_id === orderId)
    },
    async listAudit(orderId) {
      return audits.filter((a) => a.order_id === orderId)
    },
    async listItems() {
      return [...items.values()]
    },
    async listOrders() {
      return [...orders.values()].sort((a, b) => b.created_at.localeCompare(a.created_at))
    },
  }
  return store
}

export function createSupabaseStore(client: SupabaseClient): NokonStore {
  return {
    async seedDemo(opts?: { resetStock?: boolean }) {
      const handle = normalizeYoutubeHandle(DEMO_SELLER.youtubeHandle)!
      const { data: seller, error: sErr } = await client
        .from('sellers')
        .upsert(
          { shop_name: DEMO_SELLER.shopName, youtube_handle: handle, city: DEMO_SELLER.city },
          { onConflict: 'youtube_handle' },
        )
        .select('id, shop_name, youtube_handle, city')
        .single()
      if (sErr || !seller) throw new Error(sErr?.message ?? 'seller seed failed')
      const existing = await client
        .from('items')
        .select('id, seller_id, item_code, title, price_paise, stock, sizes, is_active')
        .eq('seller_id', seller.id)
        .eq('item_code', DEMO_ITEM.itemCode)
        .maybeSingle()
      const stock = opts?.resetStock || !existing.data ? DEMO_ITEM.stock : existing.data.stock
      const { data: item, error: iErr } = await client
        .from('items')
        .upsert(
          {
            seller_id: seller.id,
            item_code: DEMO_ITEM.itemCode,
            title: DEMO_ITEM.title,
            price_paise: DEMO_ITEM.pricePaise,
            stock,
            sizes: DEMO_ITEM.sizes,
            is_active: true,
          },
          { onConflict: 'seller_id,item_code' },
        )
        .select('id, seller_id, item_code, title, price_paise, stock, sizes, is_active')
        .single()
      if (iErr || !item) throw new Error(iErr?.message ?? 'item seed failed')
      return { seller, item }
    },
    async getSellerByHandle(handle) {
      const normalized = normalizeYoutubeHandle(handle)
      if (!normalized) return null
      const { data } = await client
        .from('sellers')
        .select('id, shop_name, youtube_handle, city')
        .eq('youtube_handle', normalized)
        .maybeSingle()
      return data
    },
    async getSellerById(id) {
      const { data } = await client
        .from('sellers')
        .select('id, shop_name, youtube_handle, city')
        .eq('id', id)
        .maybeSingle()
      return data
    },
    async getItem(sellerId, itemCode) {
      const { data } = await client
        .from('items')
        .select('id, seller_id, item_code, title, price_paise, stock, sizes, is_active')
        .eq('seller_id', sellerId)
        .eq('item_code', itemCode)
        .maybeSingle()
      return data
    },
    async getItemById(id) {
      const { data } = await client
        .from('items')
        .select('id, seller_id, item_code, title, price_paise, stock, sizes, is_active')
        .eq('id', id)
        .maybeSingle()
      return data
    },
    async getBuyerByName(name) {
      const { data } = await client.from('buyers').select('id, name').eq('name', name).maybeSingle()
      return data
    },
    async getBuyer(id) {
      const { data } = await client.from('buyers').select('id, name').eq('id', id).maybeSingle()
      return data
    },
    async createBuyer(name) {
      const { data, error } = await client.from('buyers').insert({ name: name ?? 'Demo buyer' }).select('id, name').single()
      if (error || !data) throw new Error(error?.message ?? 'buyer insert failed')
      return data
    },
    async createOrder(input) {
      const { data, error } = await client
        .from('orders')
        .insert({
          buyer_id: input.buyer_id ?? null,
          seller_id: input.seller_id ?? null,
          item_id: input.item_id ?? null,
          item_code: input.item_code ?? null,
          size: input.size ?? null,
          qty: input.qty ?? 1,
          catalog_price_paise: input.catalog_price_paise ?? 0,
          cap_paise: input.cap_paise ?? null,
          status: input.status ?? 'started',
          shipping_name: input.shipping_name ?? null,
          shipping_address: input.shipping_address ?? null,
        })
        .select()
        .single()
      if (error || !data) throw new Error(error?.message ?? 'order insert failed')
      return data as OrderRow
    },
    async getOrder(id) {
      const { data } = await client.from('orders').select('*').eq('id', id).maybeSingle()
      return (data as OrderRow | null) ?? null
    },
    async getLatestOrderForBuyer(buyerId) {
      const { data } = await client
        .from('orders')
        .select('*')
        .eq('buyer_id', buyerId)
        .neq('status', 'failed')
        .neq('status', 'expired')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return (data as OrderRow | null) ?? null
    },
    async updateOrder(id, patch) {
      const { data, error } = await client.from('orders').update(patch).eq('id', id).select().single()
      if (error || !data) throw new Error(error?.message ?? 'order update failed')
      return data as OrderRow
    },
    async findOrderByPaymentId(paymentId) {
      const { data } = await client.from('orders').select('*').eq('razorpay_payment_id', paymentId).maybeSingle()
      return (data as OrderRow | null) ?? null
    },
    async findOrderByPaymentLinkId(linkId) {
      const { data } = await client.from('orders').select('*').eq('razorpay_payment_link_id', linkId).maybeSingle()
      return (data as OrderRow | null) ?? null
    },
    async reserveStock(itemId) {
      const { data, error } = await client.rpc('reserve_item_stock', { p_item_id: itemId })
      if (error) throw new Error(error.message)
      return typeof data === 'number' ? data : -1
    },
    async releaseStock(itemId) {
      const { data, error } = await client.rpc('release_item_stock', { p_item_id: itemId })
      if (error) throw new Error(error.message)
      return typeof data === 'number' ? data : -1
    },
    async appendMessage(input) {
      const { error } = await client.from('messages').insert({
        order_id: input.orderId,
        channel: input.channel,
        sender: input.sender,
        body: input.body,
        meta: input.meta ?? {},
      })
      if (error) throw new Error(error.message)
    },
    async writeAudit(input) {
      const { error } = await client.from('audit_events').insert({
        order_id: input.orderId,
        step: input.step,
        decision: input.decision,
        reason: input.reason ?? null,
        payload: sanitizeAuditPayload(input.payload ?? {}),
      })
      if (error) console.error('audit insert failed', error.message)
    },
    async listMessages(orderId) {
      const { data } = await client
        .from('messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })
      return (data ?? []) as MessageRow[]
    },
    async listAudit(orderId) {
      const { data } = await client
        .from('audit_events')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })
      return (data ?? []) as AuditRow[]
    },
    async listItems() {
      const { data } = await client
        .from('items')
        .select('id, seller_id, item_code, title, price_paise, stock, sizes, is_active')
        .order('item_code')
      return (data ?? []) as ItemRow[]
    },
    async listOrders() {
      const { data } = await client.from('orders').select('*').order('created_at', { ascending: false })
      return (data ?? []) as OrderRow[]
    },
  }
}

let current: NokonStore | null = null

export function setStore(store: NokonStore) {
  current = store
}

export function getStore(): NokonStore {
  if (current) return current
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    current = createSupabaseStore(
      createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    )
    return current
  }
  current = createMemoryStore()
  return current
}
