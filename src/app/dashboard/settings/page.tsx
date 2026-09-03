import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SettingsView } from "@/components/settings/settings-view"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: seller } = await supabase
    .from("sellers")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!seller) redirect("/onboarding")

  const sellerWithEmail = {
    ...seller,
    email: user.email || seller.email,
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <SettingsView seller={sellerWithEmail} />
    </div>
  )
}
