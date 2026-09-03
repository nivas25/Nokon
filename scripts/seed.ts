import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

// Load .env.local manually
const envContent = fs.readFileSync(".env.local", "utf8")
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) process.env[match[1].trim()] = match[2].trim()
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase env vars")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function seed() {
  console.log("Seeding started...")

  // 1. Create users
  const sellerCreds = { email: "seller@nokon.com", password: "password123" }
  const buyerCreds = { email: "buyer@nokon.com", password: "password123" }

  console.log("Creating users...")
  let sellerId = ""
  let buyerId = ""

  const { data: sData, error: sErr } = await supabase.auth.admin.createUser({
    email: sellerCreds.email,
    password: sellerCreds.password,
    email_confirm: true
  })
  
  if (sErr) {
    if (sErr.message.includes("already registered")) {
       const { data } = await supabase.from('sellers').select('id').eq('youtube_handle', 'sareedidi').single()
       if (data) sellerId = data.id
    } else {
       console.error("Seller creation error:", sErr)
    }
  } else {
    sellerId = sData.user.id
  }

  const { data: bData, error: bErr } = await supabase.auth.admin.createUser({
    email: buyerCreds.email,
    password: buyerCreds.password,
    email_confirm: true
  })

  if (bErr) {
    if (!bErr.message.includes("already registered")) {
       console.error("Buyer creation error:", bErr)
    }
  } else {
    buyerId = bData.user.id
  }

  if (!sellerId) sellerId = sData?.user?.id || ""
  if (!buyerId) buyerId = bData?.user?.id || ""

  // 2. Insert Profiles
  console.log("Inserting profiles...")
  if (sellerId) {
    await supabase.from("sellers").upsert({
      id: sellerId,
      youtube_handle: "sareedidi",
      shop_name: "Saree Didi Premium",
      city: "Mumbai"
    })
  }

  if (buyerId) {
    await supabase.from("buyers").upsert({
      id: buyerId,
      name: "Jane Smith"
    })
  }

  // 3. Setup Storage
  console.log("Setting up storage...")
  const { data: buckets } = await supabase.storage.listBuckets()
  if (!buckets?.find(b => b.name === "items")) {
    await supabase.storage.createBucket("items", { public: true })
  }

  // 4. Upload Images and Create Items
  // Wait for the artifacts to be passed in as arguments
  const [img1, img2, img3] = process.argv.slice(2)
  if (!img1 || !img2 || !img3) {
    console.error("Please provide 3 image paths as arguments")
    process.exit(1)
  }

  const items = [
    { code: "101", title: "Crimson Red Silk Saree", price: 125000, img: img1 },
    { code: "102", title: "Royal Blue Embroidery Saree", price: 140000, img: img2 },
    { code: "103", title: "Gold Tissue Zari Saree", price: 180000, img: img3 }
  ]

  for (const item of items) {
    console.log(`Processing item ${item.code}...`)
    const fileBuf = fs.readFileSync(item.img)
    const ext = path.extname(item.img)
    const filename = `${item.code}-${Date.now()}${ext}`
    
    const { error: upErr } = await supabase.storage.from("items").upload(filename, fileBuf, {
      contentType: `image/${ext.replace('.', '')}`
    })
    
    if (upErr) {
      console.error(`Upload error for ${item.code}:`, upErr)
      continue
    }

    const { data: publicUrlData } = supabase.storage.from("items").getPublicUrl(filename)
    const imageUrl = publicUrlData.publicUrl

    await supabase.from("items").upsert({
      seller_id: sellerId,
      item_code: item.code,
      title: item.title,
      price_paise: item.price,
      stock: 10,
      sizes: ["Free Size"],
      is_active: true,
      image_url: imageUrl // Assuming we add this column, or maybe we don't have it? We'll see.
    }, { onConflict: 'seller_id,item_code' }) // if there's a unique constraint
  }

  console.log("Seeding complete!")
}

seed()
