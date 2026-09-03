"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { AuditPanel } from "@/components/AuditPanel"
import { StatusStrip } from "@/components/StatusStrip"

export default function AuditPage() {
  const params = useParams<{ orderId: string }>()
  const [data, setData] = useState<{
    order: { id: string; status: string; block_reason: string | null; razorpay_payment_link_url: string | null }
    audit: {
      id: string
      step: string
      decision: string
      reason: string | null
      payload: Record<string, unknown>
      created_at: string
    }[]
  } | null>(null)

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/orders?id=${params.orderId}`)
      if (res.ok) setData(await res.json())
    }
    void load()
  }, [params.orderId])

  if (!data) return <p className="p-8 text-sm">Loading audit…</p>

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href={`/buyer/${data.order.id}`} className="text-xs uppercase tracking-widest">
        ← order
      </Link>
      <h1 className="mt-4 text-3xl">Audit trail</h1>
      <p className="mt-2 text-sm text-[#cbbfa6]">Every money decision. No card data. Paid is not a UI toggle.</p>
      <div className="mt-6">
        <StatusStrip status={data.order.status} blockReason={data.order.block_reason} />
      </div>
      <div className="mt-6">
        <AuditPanel events={data.audit} />
      </div>
    </main>
  )
}
