import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/dashboard/app-sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: seller } = await supabase
    .from("sellers")
    .select("onboarding_completed, store_name, full_name")
    .eq("id", user.id)
    .single()

  if (!seller?.onboarding_completed) {
    redirect("/onboarding")
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AppSidebar seller={seller} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  )
}

