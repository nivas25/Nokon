"use client"

import { useState } from "react"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
} from "@/components/ui/sheet"
import { 
  Package, 
  User, 
  IndianRupee, 
  MapPin, 
  Phone, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Check, 
  AlertCircle,
  ExternalLink,
  Loader2
} from "lucide-react"
import { updateOrderStatus } from "@/app/dashboard/orders/actions"

export type Order = {
  id: string
  seller_id: string
  customer_name: string | null
  customer_phone: string
  shipping_address: string | null
  selected_size: string | null
  quantity: number
  total_amount: number
  status: string
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  razorpay_payment_link: string | null
  created_at: string
  products: {
    name: string
    item_code: string
    image_urls?: string[]
  } | null
}

const STATUS_OPTIONS = [
  { value: "PENDING_PAYMENT", label: "Pending Payment", color: "bg-amber-500", badgeBg: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "PAID", label: "Paid", color: "bg-indigo-500", badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "PROCESSING", label: "Processing", color: "bg-purple-500", badgeBg: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "SHIPPED", label: "Shipped", color: "bg-blue-500", badgeBg: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "DELIVERED", label: "Delivered", color: "bg-emerald-500", badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-rose-500", badgeBg: "bg-rose-50 text-rose-700 border-rose-200" },
]

export function getStatusMeta(status: string) {
  return (
    STATUS_OPTIONS.find((s) => s.value === status) || {
      value: status,
      label: status?.replace("_", " ") || "Unknown",
      color: "bg-slate-400",
      badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
    }
  )
}

interface OrderDetailsSheetProps {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusUpdated?: (orderId: string, newStatus: string) => void
}

export function OrderDetailsSheet({
  order,
  open,
  onOpenChange,
  onStatusUpdated,
}: OrderDetailsSheetProps) {
  const [currentStatus, setCurrentStatus] = useState(order.status)
  const [isUpdating, setIsUpdating] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const meta = getStatusMeta(currentStatus)

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus || isUpdating) return
    setIsUpdating(true)
    setSuccessMessage(null)

    try {
      await updateOrderStatus(order.id, newStatus)
      setCurrentStatus(newStatus)
      setSuccessMessage(`Order updated to ${newStatus.replace("_", " ")}`)
      if (onStatusUpdated) {
        onStatusUpdated(order.id, newStatus)
      }
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error("Failed to update status", error)
      alert("Failed to update order status. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px] overflow-y-auto bg-slate-50/60 p-0 border-l border-slate-200 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 bg-white border-b border-slate-100">
          <SheetHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
                  ORDER ID
                </span>
                <SheetTitle className="text-xl font-bold font-heading text-slate-900 mt-0.5">
                  #{order.id.slice(0, 8).toUpperCase()}
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(order.created_at).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </SheetDescription>
              </div>

              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${meta.badgeBg}`}
              >
                <span className={`w-2 h-2 rounded-full ${meta.color}`} />
                {meta.label}
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Status Update Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                Update Order Status
              </h3>
              {isUpdating && (
                <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </span>
              )}
            </div>

            {successMessage && (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-3 py-2 rounded-xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {successMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = currentStatus === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleStatusChange(opt.value)}
                    className={`
                      flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all text-left
                      ${
                        isSelected
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80"
                      }
                      ${isUpdating ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
                    `}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${opt.color}`} />
                      <span className="truncate">{opt.label}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Customer Details */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" /> Customer Information
            </h3>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-400">Customer Name</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">
                  {order.customer_name || "Guest Customer"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">WhatsApp / Phone</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm font-mono text-slate-800">
                    {order.customer_phone}
                  </p>
                  <a
                    href={`https://wa.me/${order.customer_phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition-colors inline-flex items-center gap-1"
                  >
                    Chat <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400">Shipping Address</p>
                <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-line leading-relaxed">
                  {order.shipping_address || "No shipping address provided yet"}
                </p>
              </div>
            </div>
          </div>

          {/* Product & Payment Summary */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-400" /> Item & Payment
            </h3>

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {order.products?.name || "Product"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {order.products?.item_code && (
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {order.products.item_code}
                      </span>
                    )}
                    {order.selected_size && (
                      <span className="text-[11px] font-medium text-slate-600 bg-indigo-50 px-2 py-0.5 rounded text-indigo-700">
                        Size: {order.selected_size}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">Qty: {order.quantity || 1}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-sm font-medium text-slate-600">Total Paid / Amount</span>
                <span className="text-xl font-bold font-heading text-slate-900">
                  ₹{Number(order.total_amount).toLocaleString("en-IN")}
                </span>
              </div>

              {order.razorpay_payment_id && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Razorpay Payment ID:</span>
                  <span className="font-mono text-slate-700 font-medium">
                    {order.razorpay_payment_id}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
