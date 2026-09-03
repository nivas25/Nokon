"use client"

import { useState } from "react"
import { updateProduct } from "@/app/dashboard/products/actions"
import { Pencil, Settings2, Loader2, Sparkles, AlertCircle, UploadCloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function EditProductDialog({ product, children }: { product: any, children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isActive, setIsActive] = useState(product.is_active)
  const [fileName, setFileName] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    try {
      setLoading(true)
      formData.append("id", product.id)
      formData.append("existingImage", product.image_url || "")
      formData.append("isActive", isActive.toString())
      await updateProduct(formData)
      setOpen(false) 
      setFileName(null)
    } catch (err) {
      console.error(err)
      alert("Failed to update product.")
    } finally {
      setLoading(false)
    }
  }

  // Also adding a dummy delete handler (you should implement deleteProduct server action later)
  async function handleDelete() {
    if (confirm("Are you sure you want to delete this product?")) {
      // await deleteProduct(product.id)
      alert("Delete functionality pending implementation.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setFileName(null); }}>
      <DialogTrigger className="cursor-pointer h-full flex flex-col group w-full text-left appearance-none bg-transparent border-none p-0 m-0">
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-2xl p-0">
        <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-start">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-heading text-slate-900">Edit Product</DialogTitle>
            <DialogDescription className="text-slate-500">
              Update inventory details and AI agent parameters.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1 items-end">
            <span className="text-[10px] uppercase font-bold text-slate-400">Toggle Status</span>
            <button 
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors shadow-sm ${isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
            >
              {isActive ? 'Active' : 'Inactive'}
            </button>
          </div>
        </div>
        
        <form action={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            
            {/* Standard Details */}
            <div className="col-span-2 md:col-span-1 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-2 border-b pb-2">Details</h3>
              
              <div className="space-y-2">
                <Label htmlFor="image" className="text-slate-700">Product Image (Optional)</Label>
                <div className="flex gap-4 items-center">
                  {product.image_url && (
                    <img src={product.image_url} alt="" className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200 shrink-0" />
                  )}
                  <div className="flex-1 relative">
                    <Input 
                      id="image" 
                      name="image" 
                      type="file" 
                      accept="image/*" 
                      className="hidden"
                      onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
                    />
                    <label 
                      htmlFor="image" 
                      className="flex flex-col items-center justify-center gap-1 w-full h-16 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 cursor-pointer transition-colors"
                    >
                      <UploadCloud className="h-5 w-5" />
                      <span className="text-[10px] font-semibold truncate px-2 max-w-full">
                        {fileName || "Click to upload new"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700">Product Name</Label>
                <Input id="name" name="name" defaultValue={product.name} className="rounded-xl h-11 bg-white border-slate-200" required />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="itemCode" className="text-slate-700">SKU / Code</Label>
                  <Input id="itemCode" name="itemCode" defaultValue={product.item_code} className="rounded-xl h-11 bg-white border-slate-200" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stockCount" className="text-slate-700">Stock</Label>
                  <Input id="stockCount" name="stockCount" type="number" min="0" defaultValue={product.stock_count} className="rounded-xl h-11 bg-white border-slate-200 font-bold" required />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="availableSizes" className="text-slate-700">Sizes (csv)</Label>
                <Input id="availableSizes" name="availableSizes" defaultValue={product.available_sizes?.join(', ') || ''} className="rounded-xl h-11 bg-white border-slate-200" />
              </div>
            </div>

            {/* Agent Config */}
            <div className="col-span-2 md:col-span-1 space-y-4 bg-indigo-50 p-5 rounded-2xl shadow-inner border border-indigo-100">
              <div className="flex items-center gap-2 mb-2 border-b border-indigo-200/50 pb-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-900">Agent Directives</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="listedPrice" className="text-indigo-900">Listed Price (₹)</Label>
                  <Input id="listedPrice" name="listedPrice" type="number" defaultValue={product.listed_price} className="rounded-xl h-11 bg-white border-indigo-200 focus:ring-indigo-600 text-indigo-950 font-bold" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floorPrice" className="text-indigo-900">Floor Price (₹)</Label>
                  <Input id="floorPrice" name="floorPrice" type="number" defaultValue={product.floor_price} className="rounded-xl h-11 bg-white border-indigo-200 focus:ring-indigo-600 text-indigo-950 font-bold" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="agentRules" className="text-indigo-900 flex items-center gap-1">Negotiation Rules <AlertCircle className="w-3 h-3 text-indigo-500"/></Label>
                <Textarea 
                  id="agentRules" 
                  name="agentRules" 
                  defaultValue={product.agent_negotiation_rules || ''}
                  placeholder="e.g. Only drop price to floor if they buy 2+" 
                  className="rounded-xl bg-white border-indigo-200 resize-none min-h-[80px] focus:ring-indigo-600 text-indigo-950" 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentSellingPoints" className="text-indigo-900">Selling Points (csv)</Label>
                <Input 
                  id="agentSellingPoints" 
                  name="agentSellingPoints" 
                  defaultValue={product.agent_selling_points || ''}
                  placeholder="Pure silk, Handwoven" 
                  className="rounded-xl h-11 bg-white border-indigo-200 focus:ring-indigo-600 text-indigo-950" 
                />
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-between gap-3 pt-6 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={handleDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl px-6 h-12">
              Delete Product
            </Button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl px-6 h-12">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="rounded-xl px-8 h-12 shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base transition-all">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
