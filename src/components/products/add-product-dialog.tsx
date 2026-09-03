"use client"

import { useState } from "react"
import { addProduct } from "@/app/dashboard/products/actions"
import { Plus, Settings2, UploadCloud } from "lucide-react"
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

export function AddProductDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    try {
      setLoading(true)
      await addProduct(formData)
      setOpen(false) // Close the dialog on success
      setFileName(null) // Reset on success
    } catch (err) {
      console.error(err)
      alert("Failed to add product.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setFileName(null); }}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-xl px-5 h-11 shadow-md bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm transition-colors">
        <Plus className="mr-2 h-4 w-4" /> Add Product
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-2xl p-0">
        <div className="bg-slate-50/50 p-6 border-b border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-heading">Add New Product</DialogTitle>
            <DialogDescription className="text-slate-500">
              Upload your product and set up AI agent instructions.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <form action={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            
            {/* Standard Details */}
            <div className="col-span-2 md:col-span-1 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-2">Product Details</h3>
              
              <div className="space-y-2">
                <Label htmlFor="image">Product Image</Label>
                <div className="relative">
                  <Input 
                    id="image" 
                    name="image" 
                    type="file" 
                    accept="image/*" 
                    className="hidden"
                    onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
                    required 
                  />
                  <label 
                    htmlFor="image" 
                    className="flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 cursor-pointer transition-colors"
                  >
                    <UploadCloud className="h-6 w-6" />
                    <span className="text-xs font-semibold truncate px-4 max-w-full">
                      {fileName || "Click to upload image"}
                    </span>
                  </label>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input id="name" name="name" placeholder="Silk Designer Saree" className="rounded-xl h-11 bg-white" required />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="itemCode">SKU / Code</Label>
                  <Input id="itemCode" name="itemCode" placeholder="SAREE-01" className="rounded-xl h-11 bg-white" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stockCount">Stock</Label>
                  <Input id="stockCount" name="stockCount" type="number" min="0" defaultValue="10" className="rounded-xl h-11 bg-white" required />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="availableSizes">Sizes (comma separated)</Label>
                <Input id="availableSizes" name="availableSizes" placeholder="S, M, L" className="rounded-xl h-11 bg-white" />
              </div>
            </div>

            {/* Agent Config */}
            <div className="col-span-2 md:col-span-1 space-y-4 bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100/50">
              <div className="flex items-center gap-2 mb-2">
                <Settings2 className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-900">Agent Directives</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="listedPrice" className="text-indigo-900">Listed Price (₹)</Label>
                  <Input id="listedPrice" name="listedPrice" type="number" placeholder="1500" className="rounded-xl h-11 bg-white border-indigo-200" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floorPrice" className="text-indigo-900">Floor Price (₹)</Label>
                  <Input id="floorPrice" name="floorPrice" type="number" placeholder="1300" className="rounded-xl h-11 bg-white border-indigo-200" />
                  <p className="text-[10px] text-indigo-600/70 leading-tight">Lowest price agent can offer.</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="agentRules" className="text-indigo-900">Negotiation Rules</Label>
                <Textarea 
                  id="agentRules" 
                  name="agentRules" 
                  placeholder="e.g. Only drop price to floor if they buy 2+" 
                  className="rounded-xl bg-white border-indigo-200 resize-none min-h-[80px]" 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentSellingPoints" className="text-indigo-900">Selling Points (csv)</Label>
                <Input 
                  id="agentSellingPoints" 
                  name="agentSellingPoints" 
                  placeholder="Pure silk, Handwoven, Free shipping" 
                  className="rounded-xl h-11 bg-white border-indigo-200" 
                />
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end">
            <Button type="submit" disabled={loading} className="rounded-xl px-8 h-12 shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base transition-all">
              {loading ? "Saving..." : "Save Product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
