import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  console.log("Checking sellers...")
  const { data: sellers, error: e1 } = await supabase.from('sellers').select('*').limit(1)
  if (e1) console.error("Sellers error:", e1.message)
  else console.log("Sellers OK:", sellers?.[0] ? Object.keys(sellers[0]) : "Empty table but exists")

  console.log("Checking products...")
  const { data: products, error: e2 } = await supabase.from('products').select('*').limit(1)
  if (e2) console.error("Products error:", e2.message)
  else console.log("Products OK:", products?.[0] ? Object.keys(products[0]) : "Empty table but exists")

  console.log("Checking orders...")
  const { data: orders, error: e3 } = await supabase.from('orders').select('*').limit(1)
  if (e3) console.error("Orders error:", e3.message)
  else console.log("Orders OK:", orders?.[0] ? Object.keys(orders[0]) : "Empty table but exists")

  console.log("Checking whatsapp_logs...")
  const { data: logs, error: e4 } = await supabase.from('whatsapp_logs').select('*').limit(1)
  if (e4) console.error("Logs error:", e4.message)
  else console.log("Logs OK:", logs?.[0] ? Object.keys(logs[0]) : "Empty table but exists")
}

check()
