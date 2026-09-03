"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { formatInrFromPaise } from "@/lib/money"

type Item = {
  id: string
  item_code: string
  title: string
  price_paise: number
  stock: number
  sizes: string[]
  is_active: boolean
}
type Order = {
  id: string
  item_code: string | null
  status: string
  block_reason: string | null
  razorpay_payment_id: string | null
  shipping_name: string | null
  catalog_price_paise: number
}

export default function SellerPage() {
  const [items, setItems] = useState<Item[]>([])
  const [orders, setOrders] = useState<Order[]>([])

  async function load() {
    const res = await fetch("/api/seller")
    const data = await res.json()
    setItems(data.items ?? [])
    setOrders(data.orders ?? [])
  }

  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), 3000)
    return () => clearInterval(t)
  }, [])

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/" className="text-xs uppercase tracking-widest">
        ← Nokon
      </Link>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">@sareedidi</h1>
          <p className="text-sm text-[#cbbfa6]">Stock drops only after webhook paid — not when the link is created.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-[#3a3326] px-4 py-2 text-xs uppercase tracking-widest"
          onClick={async () => {
            await fetch("/api/seller", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ resetStock: true }),
            })
            await load()
          }}
        >
          Reset demo stock
        </button>
      </div>
      <h2 className="mt-10 text-sm uppercase tracking-[0.2em] text-[var(--marigold)]">Catalog</h2>
      <div className="mt-3 grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-[#3a3326] bg-[#1c1810] p-4">
            <p className="text-xs text-[#7d7360]">Item {item.item_code}</p>
            <h3 className="text-xl">{item.title}</h3>
            <p className="mt-1 text-sm">
              {formatInrFromPaise(item.price_paise)} · stock {item.stock} · sizes {item.sizes.join(", ")}
            </p>
          </article>
        ))}
      </div>
      <h2 className="mt-10 text-sm uppercase tracking-[0.2em] text-[var(--marigold)]">Orders</h2>
      <div className="mt-3 space-y-2">
        {orders.length === 0 ? <p className="text-sm text-[#7d7360]">No orders yet.</p> : null}
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/audit/${order.id}`}
            className="block rounded-2xl border border-[#3a3326] bg-[#1c1810] p-4 no-underline"
          >
            <div className="flex justify-between gap-3 text-sm">
              <span>Item {order.item_code ?? "?"} · {order.shipping_name ?? "no name"}</span>
              <span className={order.status === "paid" ? "text-[var(--leaf)]" : order.status === "blocked" ? "text-[var(--blocked)]" : "text-[var(--marigold)]"}>
                {order.status}
                {order.block_reason ? ` · ${order.block_reason}` : ""}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#7d7360]">
              {formatInrFromPaise(order.catalog_price_paise)} · payment {order.razorpay_payment_id ?? "—"}
            </p>
          </Link>
        ))}
      </div>
    </main>
  )
}
