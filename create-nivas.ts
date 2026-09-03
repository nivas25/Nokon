import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const IMAGE_PATHS = {
  blue: 'C:\\Users\\reddy\\.gemini\\antigravity-ide\\brain\\7bb2c7cc-b99d-49ce-82f6-fd2688634a99\\nivas_blue_saree_1788455657417.jpg',
  red: 'C:\\Users\\reddy\\.gemini\\antigravity-ide\\brain\\7bb2c7cc-b99d-49ce-82f6-fd2688634a99\\nivas_red_saree_1788455684897.jpg',
  green: 'C:\\Users\\reddy\\.gemini\\antigravity-ide\\brain\\7bb2c7cc-b99d-49ce-82f6-fd2688634a99\\nivas_green_saree_1788455715720.jpg',
  gold: 'C:\\Users\\reddy\\.gemini\\antigravity-ide\\brain\\7bb2c7cc-b99d-49ce-82f6-fd2688634a99\\nivas_gold_saree_1788455755223.jpg'
}

async function uploadImage(filePath: string, filename: string): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath)
  const { data, error } = await supabase.storage
    .from('products')
    .upload(`nivas/${filename}`, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    })
  
  if (error) throw error
  
  const { data: publicUrlData } = supabase.storage.from('products').getPublicUrl(`nivas/${filename}`)
  return publicUrlData.publicUrl
}

async function createNivasStore() {
  try {
    console.log("1. Uploading images to Supabase Storage...")
    const blueUrl = await uploadImage(IMAGE_PATHS.blue, 'nivas_blue_saree.jpg')
    const redUrl = await uploadImage(IMAGE_PATHS.red, 'nivas_red_saree.jpg')
    const greenUrl = await uploadImage(IMAGE_PATHS.green, 'nivas_green_saree.jpg')
    const goldUrl = await uploadImage(IMAGE_PATHS.gold, 'nivas_gold_saree.jpg')
    console.log("Images uploaded successfully!")

    console.log("2. Creating Nivas Auth User...")
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'nivas@nokon.app',
      password: 'NivasPassword123!',
      email_confirm: true,
    })
    
    if (authError && !authError.message.includes('already been registered') && !authError.message.includes('already exists')) {
      throw authError
    }
    
    // If it already exists, fetch it
    let userId = authData?.user?.id
    if (!userId) {
      const { data: existingUsers } = await supabase.auth.admin.listUsers()
      const existingUser = existingUsers.users.find(u => u.email === 'nivas@nokon.app')
      if (existingUser) userId = existingUser.id
      else throw new Error("Could not create or find Nivas user")
    }

    console.log("3. Creating Seller Profile...")
    const { error: sellerError } = await supabase.from('sellers').upsert({
      id: userId,
      email: 'nivas@nokon.app',
      full_name: 'Nivas',
      store_name: 'Nivas Sarees',
      niche: 'Premium Handloom & Designer Sarees',
      phone_number: '919876543210',
      instagram_handle: '@nivas_sarees_official',
      youtube_handle: '@nivas_sarees_yt',
      whatsapp_phone_number_id: '1234598765',
      global_agent_prompt: "You are the premium sales concierge for Nivas Sarees. You speak politely, highlight the rich heritage and weaving techniques of our sarees, and offer guided assistance to buyers. You are allowed to negotiate slightly to close a sale, but you must maintain the luxury perception of the brand."
    })
    if (sellerError) throw sellerError

    console.log("4. Inserting Products...")
    
    // First clear existing products for this seller to avoid duplicates if re-run
    await supabase.from('products').delete().eq('seller_id', userId)

    const productsToInsert = [
      {
        seller_id: userId,
        item_code: 'NIV-001',
        name: 'Royal Midnight Blue Kanchipuram Silk',
        description: 'Pure mulberry silk with 2-gram gold zari border.',
        listed_price: 9500,
        floor_price: 8000,
        stock_count: 10,
        available_sizes: ['Free Size'],
        image_urls: [blueUrl],
        agent_selling_points: 'Pure mulberry silk, 2-gram gold zari border, perfect for evening weddings.',
        agent_negotiation_rules: 'Start by offering a ₹500 discount if the user hesitates. Can drop to ₹8,000 if the buyer is ready to pay immediately.'
      },
      {
        seller_id: userId,
        item_code: 'NIV-002',
        name: 'Crimson Red Bridal Banarasi',
        description: 'Heavy bridal brocade work in traditional auspicious red.',
        listed_price: 14500,
        floor_price: 12500,
        stock_count: 5,
        available_sizes: ['Free Size'],
        image_urls: [redUrl],
        agent_selling_points: 'Heavy bridal brocade work, traditional auspicious red, heirloom quality.',
        agent_negotiation_rules: 'Emphasize that bridal pieces are rarely discounted. Offer a maximum of ₹2,000 off only if they bundle it with another purchase or push very hard.'
      },
      {
        seller_id: userId,
        item_code: 'NIV-003',
        name: 'Emerald Green Mysore Crepe Silk',
        description: 'Ultra-lightweight, easy to drape, subtle sheen suitable for office parties.',
        listed_price: 6500,
        floor_price: 5500,
        stock_count: 15,
        available_sizes: ['Free Size'],
        image_urls: [greenUrl],
        agent_selling_points: 'Ultra-lightweight, easy to drape, subtle sheen suitable for office parties or casual events.',
        agent_negotiation_rules: 'This is a fast-moving item. Offer a flat 10% discount quickly to secure the sale.'
      },
      {
        seller_id: userId,
        item_code: 'NIV-004',
        name: 'Golden Tissue Silk',
        description: 'Shimmering tissue silk that catches the light beautifully.',
        listed_price: 8500,
        floor_price: 7200,
        stock_count: 8,
        available_sizes: ['Free Size'],
        image_urls: [goldUrl],
        agent_selling_points: 'Shimmering tissue silk that catches the light beautifully, trendy and modern yet traditional.',
        agent_negotiation_rules: 'Do not offer discounts upfront. If they ask for a "best price", offer ₹8,000. Final floor is ₹7,200.'
      }
    ]

    const { error: productsError } = await supabase.from('products').insert(productsToInsert)
    if (productsError) throw productsError

    console.log("SUCCESS! Nivas Sarees has been created and populated.")
    console.log(`Login Email: nivas@nokon.app`)
    console.log(`Login Password: NivasPassword123!`)

  } catch (err: any) {
    console.error("FAILED:", err.message || err)
  }
}

createNivasStore()
