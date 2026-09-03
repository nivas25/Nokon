"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { logout } from "@/app/auth-actions"

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const navs = [
    { name: "Orders", href: "/seller/orders" },
    { name: "Stock Management", href: "/seller/stock" },
  ]

  return (
    <div className="flex min-h-screen bg-[#f2f2f7]">
      <aside className="w-64 border-r border-[#c6c6c8] bg-[#f9f9f9] flex flex-col hidden md:flex">
        <div className="p-6 border-b border-[#c6c6c8]">
          <h1 className="text-xl font-bold tracking-tight text-black">Seller Dashboard</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navs.map((nav) => {
            const isActive = pathname === nav.href
            return (
              <Link
                key={nav.name}
                href={nav.href}
                className={`block px-4 py-2.5 rounded-[10px] text-[15px] font-medium transition-colors ${
                  isActive
                    ? "bg-[#007aff] text-white"
                    : "text-black hover:bg-[#e5e5ea]"
                }`}
              >
                {nav.name}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-[#c6c6c8]">
          <form action={logout}>
            <button className="text-[14px] text-[#ff3b30] font-medium w-full text-left px-4 py-2 rounded-[10px] hover:bg-[#ffe5e5] transition-colors">
              Log out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden border-b border-[#c6c6c8] bg-[#f9f9f9] p-4 flex gap-4 overflow-x-auto">
          {navs.map((nav) => {
            const isActive = pathname === nav.href
            return (
              <Link
                key={nav.name}
                href={nav.href}
                className={`px-4 py-1.5 rounded-full text-[14px] font-medium whitespace-nowrap ${
                  isActive
                    ? "bg-[#007aff] text-white"
                    : "bg-[#e5e5ea] text-black"
                }`}
              >
                {nav.name}
              </Link>
            )
          })}
        </div>
        <div className="flex-1 p-6 lg:p-10 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
