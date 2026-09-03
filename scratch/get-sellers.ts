import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function getSellersAndProducts() {
  console.log("Fetching Sellers and their Products...")
  const { data: sellers, error: sellerError } = await supabase
    .from('sellers')
    .select('id, store_name, full_name, niche, products(name, listed_price, stock_count)')
  
  if (sellerError) {
    console.error("Error fetching data:", sellerError)
    return
  }

  if (!sellers || sellers.length === 0) {
    console.log("No sellers found in the database.")
    return
  }

  sellers.forEach(seller => {
    console.log(`\n🛍️  STORE: ${seller.store_name} (Owner: ${seller.full_name}, Niche: ${seller.niche})`)
    const products = seller.products as any[]
    if (!products || products.length === 0) {
      console.log(`   - No products listed yet.`)
    } else {
      products.forEach(p => {
        console.log(`   - ${p.name} | ₹${p.listed_price} | Stock: ${p.stock_count}`)
      })
    }
  })
}

getSellersAndProducts()
