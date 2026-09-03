"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  Package,
  MessageCircle,
  Settings,
  LogOut,
  ChevronRight,
  ShoppingCart,
} from "lucide-react"
import { logout } from "@/app/auth-actions"

const navItems = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "Orders", url: "/dashboard/orders", icon: ShoppingCart },
  { title: "Inventory", url: "/dashboard/products", icon: Package },
  { title: "Live Audit", url: "/dashboard/conversations", icon: MessageCircle },
]

export function AppSidebar({
  seller,
}: {
  seller: { store_name: string; full_name: string }
}) {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200/80 hidden md:flex flex-col h-screen sticky top-0 shadow-[1px_0_0_0_rgb(226,232,240)]">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Nokon" className="h-10 w-auto object-contain object-left" />
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-3">
          Menu
        </p>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.url
            return (
              <Link
                key={item.url}
                href={item.url}
                className={`
                  group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                  ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }
                `}
              >
                <span className="flex items-center gap-3">
                  <item.icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? "text-indigo-200" : "text-slate-400 group-hover:text-slate-700"
                    }`}
                  />
                  {item.title}
                </span>
                {isActive && (
                  <ChevronRight className="h-3.5 w-3.5 text-indigo-300 shrink-0" />
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 p-3 space-y-1">
        {/* Store info */}
        <div className="px-3 py-2 mb-1">
          <p className="text-sm font-bold text-slate-900 truncate">{seller.store_name}</p>
          <p className="text-xs text-slate-500 truncate">{seller.full_name}</p>
        </div>

        <Link
          href="/dashboard/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            pathname === "/dashboard/settings"
              ? "bg-indigo-50 text-indigo-700 font-semibold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Settings className={`h-4 w-4 ${pathname === "/dashboard/settings" ? "text-indigo-600" : "text-slate-400"}`} />
          Settings
        </Link>

        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="h-4 w-4 text-slate-400" />
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  )
}

