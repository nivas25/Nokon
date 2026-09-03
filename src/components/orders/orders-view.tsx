"use client"

import { useState, useMemo } from "react"
import { 
  Order, 
  OrderDetailsSheet, 
  getStatusMeta 
} from "@/components/orders/order-details-sheet"
import { 
  Package, 
  Search, 
  Calendar, 
  ChevronRight, 
  Filter, 
  ArrowUpRight,
  ShoppingBag
} from "lucide-react"

interface OrdersViewProps {
  initialOrders: Order[]
}

const TABS = [
  { id: "ALL", label: "All Orders" },
  { id: "PROCESSING", label: "Processing" },
  { id: "PAID", label: "Paid" },
  { id: "SHIPPED", label: "Shipped" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "PENDING_PAYMENT", label: "Pending" },
  { id: "CANCELLED", label: "Cancelled" },
]

export function OrdersView({ initialOrders }: OrdersViewProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [selectedTab, setSelectedTab] = useState("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // Handle local updates from the sheet
  const handleStatusUpdated = (orderId: string, newStatus: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    )
    if (activeOrder && activeOrder.id === orderId) {
      setActiveOrder((prev) => (prev ? { ...prev, status: newStatus } : null))
    }
  }

  // Filter orders by tab and search
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      if (selectedTab !== "ALL" && order.status !== selectedTab) {
        return false
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const idMatch = order.id.toLowerCase().includes(query)
        const nameMatch = (order.customer_name || "").toLowerCase().includes(query)
        const phoneMatch = order.customer_phone.includes(query)
        const productMatch = (order.products?.name || "").toLowerCase().includes(query)
        return idMatch || nameMatch || phoneMatch || productMatch
      }
      return true
    })
  }, [orders, selectedTab, searchQuery])

  // Count helper
  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: orders.length }
    orders.forEach((o) => {
      map[o.status] = (map[o.status] || 0) + 1
    })
    return map
  }, [orders])

  const openOrderSheet = (order: Order) => {
    setActiveOrder(order)
    setIsSheetOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Controls Bar: Search & Status Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {TABS.map((tab) => {
            const count = counts[tab.id] || 0
            const isActive = selectedTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTab(tab.id)}
                className={`
                  flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all
                  ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }
                `}
              >
                {tab.label}
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search Box */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer, phone, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/70 p-12 text-center shadow-xs">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No orders found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No orders matching "${searchQuery}". Try clearing your search.`
              : "No orders matching the selected status."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {filteredOrders.map((order) => {
            const meta = getStatusMeta(order.status)
            const initials = (order.customer_name || "G")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()

            return (
              <div
                key={order.id}
                role="button"
                tabIndex={0}
                onClick={() => openOrderSheet(order)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    openOrderSheet(order)
                  }
                }}
                className="group relative bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-500 hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between cursor-pointer h-[240px] focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                {/* Top Section: Order ID & Status Badge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200/60">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${meta.badgeBg}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.color}`} />
                    {meta.label}
                  </span>
                </div>

                {/* Middle Section: Customer & Product Info (Exact uniform proportions) */}
                <div className="my-auto space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-sm border border-indigo-100 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                        {order.customer_name || "Guest Customer"}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono truncate">
                        {order.customer_phone}
                      </p>
                    </div>
                  </div>

                  {/* Product snippet box */}
                  <div className="bg-slate-50/80 rounded-xl px-3 py-1.5 border border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium truncate max-w-[180px]">
                      {order.products?.name || "Product Item"}
                    </span>
                    {order.selected_size && (
                      <span className="text-[10px] font-bold uppercase text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200/80 shrink-0">
                        {order.selected_size}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Section: Date, Price & Action hint */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold font-heading text-slate-900">
                      ₹{Number(order.total_amount).toLocaleString("en-IN")}
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-slate-50 group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600 flex items-center justify-center transition-colors">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Slide-out Order Details Sheet */}
      {activeOrder && (
        <OrderDetailsSheet
          order={activeOrder}
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </div>
  )
}
