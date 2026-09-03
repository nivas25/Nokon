"use client"

import { useMemo } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartConfig = {
  sales: {
    label: "Sales (₹)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export function OverviewCharts({ orders }: { orders: any[] }) {
  const chartData = useMemo(() => {
    // Group orders by date
    const dailySales: Record<string, number> = {}
    
    // Create last 7 days framework
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dailySales[d.toISOString().split('T')[0]] = 0
    }

    orders.forEach((order) => {
      // Only count non-cancelled, non-pending
      if (order.status === "CANCELLED" || order.status === "PENDING_PAYMENT") return

      const dateStr = new Date(order.created_at).toISOString().split('T')[0]
      if (dailySales[dateStr] !== undefined) {
        dailySales[dateStr] += Number(order.total_amount) || 0
      }
    })

    return Object.entries(dailySales).map(([date, sales]) => ({
      date,
      sales,
    }))
  }, [orders])

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">Revenue Over Time</h2>
        <p className="text-sm text-slate-500">Daily sales performance for the last 7 days</p>
      </div>
      
      <div className="h-[300px] w-full mt-6">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-sales)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-sales)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }}
                className="text-xs text-slate-500"
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `₹${value}`}
                className="text-xs text-slate-500"
                width={60}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area 
                type="monotone" 
                dataKey="sales" 
                stroke="var(--color-sales)" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorSales)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  )
}
