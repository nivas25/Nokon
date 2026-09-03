"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateOrderStatus(orderId: string, newStatus: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId)
    .eq("seller_id", user.id)

  if (error) {
    console.error("Error updating order status:", error)
    throw new Error("Failed to update order status")
  }

  revalidatePath("/dashboard/orders")
  revalidatePath("/dashboard")
}
