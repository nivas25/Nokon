import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Image as ImageIcon, PackageSearch, Tag, Sparkles } from "lucide-react"
import { AddProductDialog } from "@/components/products/add-product-dialog"
import { EditProductDialog } from "@/components/products/edit-product-dialog"

export default async function ProductsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="flex-1 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-heading text-slate-900 tracking-tight">Catalog</h1>
          <p className="text-slate-500 mt-1">Manage your professional catalog and AI agent selling parameters.</p>
        </div>
        
        <AddProductDialog />
      </div>

      {!products || products.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/60 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <PackageSearch className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No products yet</h3>
          <p className="text-slate-500 max-w-sm mx-auto">Upload your first product to generate your catalog and start selling via AI.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <EditProductDialog key={product.id} product={product}>
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] group-hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.12)] group-hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full">
                
                {/* Product Image */}
                <div className="relative aspect-[4/5] bg-slate-50 overflow-hidden">
                  {product.image_urls && product.image_urls.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={product.image_urls[0]} 
                      alt={product.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                      <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
                      <span className="text-xs font-medium uppercase tracking-wider">No Image</span>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm backdrop-blur-md border ${product.is_active ? 'bg-emerald-500/95 text-white border-emerald-400/50' : 'bg-slate-900/90 text-white border-slate-700/50'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${product.is_active ? 'bg-emerald-200' : 'bg-slate-400'}`} />
                      {product.is_active ? 'Active' : 'Draft'}
                    </span>
                  </div>

                  {/* Stock Badge */}
                  <div className="absolute bottom-4 left-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-md backdrop-blur-md ${product.stock_count > 0 ? 'bg-white/95 text-slate-900' : 'bg-red-500/95 text-white'}`}>
                      {product.stock_count > 0 ? `${product.stock_count} IN STOCK` : 'OUT OF STOCK'}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 flex-1 flex flex-col bg-white group-hover:bg-slate-50/50 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div className="text-left">
                      <h3 className="font-bold text-lg text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-1">{product.name}</h3>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">{product.item_code}</p>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-900 text-lg">₹{product.listed_price}</p>
                      {product.floor_price && (
                        <p className="text-[10px] font-bold text-indigo-600 flex items-center justify-end gap-1 mt-0.5 uppercase tracking-wider">
                          <Tag className="w-3 h-3" /> Floor: ₹{product.floor_price}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Agent Config indicator */}
                  {product.agent_negotiation_rules && (
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider bg-slate-100/80 px-2 py-1.5 rounded-md border border-slate-200">
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      Agent Rules Active
                    </div>
                  )}
                </div>
              </div>
            </EditProductDialog>
          ))}
        </div>
      )}
    </div>
  )
}
