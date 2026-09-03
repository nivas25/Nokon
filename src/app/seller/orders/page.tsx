"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { formatInrFromPaise } from "@/lib/money"
import { getSupabaseBrowser } from "@/lib/supabase/browser"

type Order = {
  id: string
  item_code: string | null
  status: string
  block_reason: string | null
  razorpay_payment_id: string | null
  shipping_name: string | null
  catalog_price_paise: number
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  
  // Note: we can still use the /api/seller endpoint for now, but in a real app
  // we would fetch using the supabase client directly for the logged in user.
  async function load() {
    const res = await fetch("/api/seller")
    const data = await res.json()
    setOrders(data.orders ?? [])
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div className="max-w-4xl">
      <header className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight text-black">Orders</h1>
        <p className="text-[15px] text-[#8e8e93] mt-1">Manage and track your customer orders.</p>
      </header>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="ios-card p-8 text-center text-[#8e8e93]">
            No orders yet.
          </div>
        ) : null}
        
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/store/sareedidi/${order.id}`} // We'll link to the order page so they can see the chat
            className="block ios-card p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[17px] font-semibold text-black">
                    Item {order.item_code ?? "?"}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-medium uppercase tracking-wider
                    ${order.status === "paid" ? "bg-[#e3f8e8] text-[#34c759]" : 
                      order.status === "blocked" ? "bg-[#ffe5e5] text-[#ff3b30]" : 
                      "bg-[#fff3e0] text-[#ff9500]"}`}
                  >
                    {order.status}
                  </span>
                </div>
                <p className="text-[15px] text-[#8e8e93] mt-1">
                  {order.shipping_name ?? "No shipping name"}
                </p>
              </div>
              
              <div className="sm:text-right">
                <p className="text-[17px] font-semibold text-black">
                  {formatInrFromPaise(order.catalog_price_paise)}
                </p>
                <p className="text-[13px] text-[#8e8e93] mt-0.5">
                  ID: {order.id.slice(0, 8)}
                </p>
              </div>
            </div>
            
            {order.block_reason && (
              <div className="mt-3 text-[14px] text-[#ff3b30] bg-[#ffe5e5] p-2.5 rounded-lg border border-[#ff3b30]/20">
                Blocked: {order.block_reason}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
