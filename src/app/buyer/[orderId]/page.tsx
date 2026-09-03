"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { AuditPanel } from "@/components/AuditPanel"
import { MainChat } from "@/components/MainChat"
import { StatusStrip } from "@/components/StatusStrip"
import { WatchChat } from "@/components/WatchChat"

type Payload = {
  order: {
    id: string
    status: string
    block_reason: string | null
    razorpay_payment_link_url: string | null
    catalog_price_paise: number
    cap_paise: number | null
  }
  messages: { id: string; channel: string; sender: string; body: string; created_at: string }[]
  audit: {
    id: string
    step: string
    decision: string
    reason: string | null
    payload: Record<string, unknown>
    created_at: string
  }[]
}

export default function BuyerOrderPage() {
  const params = useParams<{ orderId: string }>()
  const [data, setData] = useState<Payload | null>(null)

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/orders?id=${params.orderId}`)
    if (res.ok) setData(await res.json())
  }, [params.orderId])

  useEffect(() => {
    void refresh()
    const t = setInterval(() => void refresh(), 2000)
    return () => clearInterval(t)
  }, [refresh])

  if (!data) {
    return <p className="p-8 text-sm text-[#cbbfa6]">Loading order…</p>
  }

  const main = data.messages.filter((m) => m.channel === "main")
  const watch = data.messages.filter((m) => m.channel === "watch")
  const waiting = data.order.status === "awaiting_buyer"

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <Link href="/buyer" className="text-xs uppercase tracking-widest">
          ← new order
        </Link>
        <Link href={`/audit/${data.order.id}`} className="text-xs uppercase tracking-widest">
          audit trail →
        </Link>
      </div>
      <StatusStrip status={data.order.status} blockReason={data.order.block_reason} />
      {data.order.status === "blocked" ? (
        <p className="mt-4 rounded-xl border border-[var(--blocked)] bg-[#2a1210] p-4 text-sm">
          I will not create a Razorpay charge. {data.order.block_reason}
        </p>
      ) : null}
      {data.order.razorpay_payment_link_url ? (
        <p className="mt-4 rounded-xl border border-[var(--leaf)] bg-[#102218] p-4 text-sm">
          Pay the catalog amount on Razorpay test:{" "}
          <a href={data.order.razorpay_payment_link_url} target="_blank" rel="noreferrer">
            {data.order.razorpay_payment_link_url}
          </a>
        </p>
      ) : null}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <MainChat
          messages={main}
          disabled={!waiting}
          onSend={async (text) => {
            await fetch("/api/chat", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ orderId: data.order.id, text }),
            })
            await refresh()
          }}
        />
        <WatchChat messages={watch} />
      </div>
      <div className="mt-6">
        <AuditPanel events={data.audit} />
      </div>
    </main>
  )
}
