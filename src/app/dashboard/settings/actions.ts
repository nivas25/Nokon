"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  const fullName = formData.get("fullName") as string
  const storeName = formData.get("storeName") as string
  const niche = formData.get("niche") as string
  const phoneNumber = formData.get("phoneNumber") as string
  const address = formData.get("address") as string
  const youtubeHandle = formData.get("youtubeHandle") as string
  const instagramHandle = formData.get("instagramHandle") as string
  const whatsappPhoneNumberId = formData.get("whatsappPhoneNumberId") as string
  const globalAgentPrompt = formData.get("globalAgentPrompt") as string

  const updateData: Record<string, any> = {
    full_name: fullName,
    store_name: storeName,
    niche,
    phone_number: phoneNumber,
    address,
    youtube_handle: youtubeHandle,
    instagram_handle: instagramHandle,
    global_agent_prompt: globalAgentPrompt,
    updated_at: new Date().toISOString(),
  }

  if (whatsappPhoneNumberId !== null && whatsappPhoneNumberId !== undefined) {
    updateData.whatsapp_phone_number_id = whatsappPhoneNumberId
  }

  const { error } = await supabase
    .from("sellers")
    .update(updateData)
    .eq("id", user.id)

  if (error) {
    console.error("Error updating profile:", error)
    throw new Error("Failed to update profile: " + error.message)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/settings")
  return { success: true }
}
