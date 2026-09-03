"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect("/login")

  const fullName = formData.get("fullName") as string
  const storeName = formData.get("storeName") as string
  const niche = formData.get("niche") as string
  const phone = formData.get("phone") as string
  const youtubeHandle = formData.get("youtubeHandle") as string
  const youtubeUrl = formData.get("youtubeUrl") as string
  const instagramHandle = formData.get("instagramHandle") as string
  const address = formData.get("address") as string
  const agentPrompt = formData.get("agentPrompt") as string

  const { error } = await supabase.from('sellers').upsert({
    id: user.id, // Primary key linked to auth.users
    user_id: user.id, // Legacy compat
    email: user.email,
    full_name: fullName,
    store_name: storeName,
    niche: niche,
    phone: phone,
    phone_number: phone, // Legacy compat
    youtube_handle: youtubeHandle,
    youtube_channel_url: youtubeUrl,
    instagram_handle: instagramHandle,
    address: address,
    global_agent_prompt: agentPrompt,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })

  if (error) {
    return redirect(`/onboarding?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath("/", "layout")
  redirect("/dashboard")
}
