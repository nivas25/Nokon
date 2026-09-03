"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function addProduct(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  const name = formData.get("name") as string
  const itemCode = formData.get("itemCode") as string
  const listedPriceStr = formData.get("listedPrice") as string
  const floorPriceStr = formData.get("floorPrice") as string
  const stockCountStr = formData.get("stockCount") as string
  const availableSizes = formData.get("availableSizes") as string // comma separated
  const description = formData.get("description") as string
  
  // Agent configuration
  const agentRules = formData.get("agentRules") as string
  const agentSellingPoints = formData.get("agentSellingPoints") as string

  // File upload
  const imageFile = formData.get("image") as File | null
  let imageUrl = null

  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('products')
      .upload(fileName, imageFile, {
        cacheControl: '3600',
        upsert: false
      })
      
    if (uploadError) {
      console.error("Upload error:", uploadError)
      throw new Error("Failed to upload image")
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('products')
      .getPublicUrl(uploadData.path)
      
    imageUrl = publicUrl
  }

  // Insert product
  const { error } = await supabase.from('products').insert({
    seller_id: user.id,
    item_code: itemCode,
    name: name,
    description: description || null,
    image_url: imageUrl,
    listed_price: parseFloat(listedPriceStr),
    floor_price: floorPriceStr ? parseFloat(floorPriceStr) : parseFloat(listedPriceStr),
    stock_count: parseInt(stockCountStr, 10),
    available_sizes: availableSizes.split(',').map(s => s.trim()).filter(Boolean),
    is_active: true,
    agent_negotiation_rules: agentRules || null,
    agent_selling_points: agentSellingPoints || null,
  })

  if (error) {
    console.error("Insert error:", error)
    throw new Error(error.message)
  }

  revalidatePath("/dashboard/products")
}

export async function updateStock(productId: string, newStock: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from('products')
    .update({ stock_count: newStock })
    .eq('id', productId)
    .eq('seller_id', user.id)

  if (error) {
    console.error("Update stock error:", error)
    throw new Error(error.message)
  }

  revalidatePath("/dashboard/products")
}

export async function updateProduct(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error("Unauthorized")

  const id = formData.get("id") as string
  const name = formData.get("name") as string
  const itemCode = formData.get("itemCode") as string
  const listedPriceStr = formData.get("listedPrice") as string
  const floorPriceStr = formData.get("floorPrice") as string
  const stockCountStr = formData.get("stockCount") as string
  const availableSizes = formData.get("availableSizes") as string
  const description = formData.get("description") as string
  const agentRules = formData.get("agentRules") as string
  const agentSellingPoints = formData.get("agentSellingPoints") as string
  const isActive = formData.get("isActive") === 'true'

  // File upload logic (optional for edits)
  const imageFile = formData.get("image") as File | null
  let imageUrl = formData.get("existingImage") as string | null

  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('products')
      .upload(fileName, imageFile, { cacheControl: '3600', upsert: false })
      
    if (uploadError) throw new Error("Failed to upload image")
    const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(uploadData.path)
    imageUrl = publicUrl
  }

  const { error } = await supabase.from('products').update({
    item_code: itemCode,
    name: name,
    description: description || null,
    image_url: imageUrl,
    listed_price: parseFloat(listedPriceStr),
    floor_price: floorPriceStr ? parseFloat(floorPriceStr) : parseFloat(listedPriceStr),
    stock_count: parseInt(stockCountStr, 10),
    available_sizes: availableSizes.split(',').map(s => s.trim()).filter(Boolean),
    is_active: isActive,
    agent_negotiation_rules: agentRules || null,
    agent_selling_points: agentSellingPoints || null,
  }).eq('id', id).eq('seller_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath("/dashboard/products")
}
