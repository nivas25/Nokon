"use client"

import { useState } from "react"
import { updateStock } from "@/app/dashboard/products/actions"
import { Minus, Plus, Loader2 } from "lucide-react"

export function StockEditor({ productId, currentStock }: { productId: string, currentStock: number }) {
  const [stock, setStock] = useState(currentStock)
  const [isUpdating, setIsUpdating] = useState(false)

  async function handleUpdate(newStock: number) {
    if (newStock < 0) return
    try {
      setIsUpdating(true)
      setStock(newStock) // optimistic UI update
      await updateStock(productId, newStock)
    } catch (e) {
      console.error(e)
      setStock(currentStock) // revert on error
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
      <span className="text-sm font-medium text-slate-500">In Stock:</span>
      <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
        <button 
          onClick={() => handleUpdate(stock - 1)}
          disabled={isUpdating || stock <= 0}
          className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm text-slate-600 disabled:opacity-50 transition-all"
        >
          <Minus className="h-3 w-3" />
        </button>
        
        <div className="w-10 text-center font-semibold text-slate-900 text-sm flex justify-center items-center">
          {isUpdating ? <Loader2 className="h-3 w-3 animate-spin text-indigo-600" /> : stock}
        </div>
        
        <button 
          onClick={() => handleUpdate(stock + 1)}
          disabled={isUpdating}
          className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm text-slate-600 disabled:opacity-50 transition-all"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
