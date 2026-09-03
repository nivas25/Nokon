"use client"

import { useEffect, useState } from "react"
import { formatInrFromPaise } from "@/lib/money"

type Item = {
  id: string
  item_code: string
  title: string
  price_paise: number
  stock: number
  sizes: string[]
  is_active: boolean
  image_url?: string | null
}

type SellerProfile = {
  shop_name: string
  youtube_handle: string
  city: string
}

export default function StockPage() {
  const [items, setItems] = useState<Item[]>([])
  const [profile, setProfile] = useState<SellerProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/seller")
      .then((r) => r.json())
      .then((data) => {
        if (data.items) setItems(data.items)
        if (data.seller) setProfile(data.seller)
        setLoading(false)
      })
      .catch((e) => {
        console.error(e)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f2f2f7]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    )
  }

  return (
    <div className="bg-[#f2f2f7] min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#f2f2f7]/80 backdrop-blur-xl border-b border-[#c6c6c8] px-8 py-6 flex justify-between items-center">
        <div>
          <h1 className="text-[28px] font-bold text-black tracking-tight">Stock Management</h1>
          <p className="text-[#8e8e93] text-[15px] mt-1">Manage your catalog items and inventory.</p>
        </div>
        <button className="bg-[#007aff] hover:bg-[#0056b3] text-white px-5 py-2.5 rounded-full font-medium text-[15px] transition-colors shadow-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Add New Item
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8 space-y-10">
        
        {/* Profile Card */}
        <section>
          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#e5e5ea] flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#007aff] to-[#34c759] flex items-center justify-center text-white text-[32px] shadow-inner shrink-0">
              {profile?.shop_name?.charAt(0) || "S"}
            </div>
            <div className="flex-1">
              <h2 className="text-[22px] font-bold text-black tracking-tight">{profile?.shop_name || "Store Profile"}</h2>
              <p className="text-[#8e8e93] text-[15px] mt-1">
                @{profile?.youtube_handle || "handle"} • {profile?.city || "City"}
              </p>
            </div>
            <div className="text-center px-6 border-l border-[#e5e5ea]">
              <p className="text-[24px] font-bold text-black">{items.length}</p>
              <p className="text-[13px] font-medium text-[#8e8e93] uppercase tracking-wider">Active Items</p>
            </div>
          </div>
        </section>

        {/* Catalog */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[20px] font-bold text-black">Your Catalog</h2>
          </div>
          
          {items.length === 0 ? (
            <div className="bg-white rounded-[24px] p-12 text-center border border-[#e5e5ea] shadow-sm">
              <div className="w-16 h-16 bg-[#f2f2f7] rounded-full flex items-center justify-center mx-auto mb-4 text-[24px]">
                👗
              </div>
              <h3 className="text-[17px] font-semibold text-black mb-1">No items yet</h3>
              <p className="text-[15px] text-[#8e8e93]">Add your first catalog item to start selling.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {items.map((item) => (
                <article key={item.id} className="bg-white rounded-[24px] overflow-hidden border border-[#e5e5ea] shadow-sm hover:shadow-md transition-shadow group">
                  <div className="h-48 bg-[#f2f2f7] relative">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[40px]">📦</div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-[12px] font-medium">
                        Code: {item.item_code}
                      </span>
                    </div>
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 rounded-full text-[12px] font-bold shadow-sm backdrop-blur-md ${
                        item.stock > 0 ? "bg-[#34c759]/90 text-white" : "bg-[#ff3b30]/90 text-white"
                      }`}>
                        {item.stock > 0 ? "In Stock" : "Out of Stock"}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <h3 className="text-[18px] font-bold text-black leading-tight line-clamp-1 mb-1">
                      {item.title}
                    </h3>
                    
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-[20px] font-bold text-black">
                        {formatInrFromPaise(item.price_paise)}
                      </span>
                      <span className="text-[14px] text-[#8e8e93] bg-[#f2f2f7] px-2.5 py-1 rounded-lg">
                        Qty: {item.stock}
                      </span>
                    </div>

                    <div className="flex gap-3 mt-5 pt-5 border-t border-[#f2f2f7]">
                      <button className="flex-1 bg-[#f2f2f7] hover:bg-[#e5e5ea] text-black font-medium py-2.5 rounded-xl text-[14px] transition-colors">
                        Edit
                      </button>
                      <button className="flex-1 bg-[#ffe5e5] hover:bg-[#ffd1d1] text-[#ff3b30] font-medium py-2.5 rounded-xl text-[14px] transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
