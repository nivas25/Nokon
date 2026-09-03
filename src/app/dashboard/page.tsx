import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { IndianRupee, Package, Clock, CheckCircle } from "lucide-react"
import { OverviewCharts } from "@/components/dashboard/overview-charts"

export default async function DashboardOverview() {
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

  const typedOrders = orders || []

  const totalSales = typedOrders
    .filter(o => o.status !== "PENDING_PAYMENT" && o.status !== "CANCELLED")
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)

  const pendingOrders = typedOrders.filter(o => o.status === "PENDING_PAYMENT").length
  const completedOrders = typedOrders.filter(o => o.status === "DELIVERED").length
  const processingOrders = typedOrders.filter(o => o.status === "PAID" || o.status === "PROCESSING").length

  return (
    <div className="flex-1 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-heading text-slate-900 tracking-tight">Overview</h1>
        <p className="text-slate-500 mt-1">Track your store's performance and active orders.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Sales</CardTitle>
            <IndianRupee className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">₹{totalSales.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Processing</CardTitle>
            <Package className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">{processingOrders}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Awaiting Payment</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">{pendingOrders}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">{completedOrders}</div>
          </CardContent>
        </Card>
      </div>

      <OverviewCharts orders={typedOrders} />
    </div>
  )
}
