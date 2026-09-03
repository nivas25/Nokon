import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { OrdersView } from "@/components/orders/orders-view"
import { Order } from "@/components/orders/order-details-sheet"

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      *,
      products ( name, item_code )
    `)
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false })

  const typedOrders: Order[] = (orders || []) as Order[]

  return (
    <div className="flex-1 p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-heading text-slate-900 tracking-tight">
          Orders
        </h1>
        <p className="text-slate-500 mt-1">
          Manage, inspect, and update customer order fulfillment statuses in real-time.
        </p>
      </div>

      <OrdersView initialOrders={typedOrders} />
    </div>
  )
}
