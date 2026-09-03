import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seedData() {
  const email = 'admin@sareedidi.com'

  console.log('Fetching admin user...')
  const { data } = await supabase.auth.admin.listUsers()
  const user = data.users.find((u: any) => u.email === email)
  
  if (!user) {
      console.error("Admin user not found. Please run create-seller.ts first.")
      process.exit(1)
  }
  
  const sellerId = user.id
  console.log('Seller ID:', sellerId)

  // Fetch or Create a Dummy Product for the Orders
  console.log('Setting up a dummy product...')
  let productId;
  const { data: existingProducts } = await supabase.from('products').select('id').eq('seller_id', sellerId).limit(1)
  
  if (existingProducts && existingProducts.length > 0) {
      productId = existingProducts[0].id
  } else {
      const { data: product, error } = await supabase.from('products').insert({
          seller_id: sellerId,
          item_code: 'SAREE-TEST',
          name: 'Demo Silk Saree',
          listed_price: 1500,
          floor_price: 1300,
          stock_count: 5,
          is_active: true
      }).select().single()
      
      if (error) {
          console.error("Error creating dummy product", error)
          process.exit(1)
      }
      productId = product.id
  }

  // 1. Seed Dummy Orders
  console.log('Seeding Orders...')
  await supabase.from('orders').delete().eq('seller_id', sellerId) // Clear existing test orders
  
  const { error: ordersError } = await supabase.from('orders').insert([
      {
          seller_id: sellerId,
          product_id: productId,
          customer_phone: '+919876543210',
          customer_name: 'Priya Sharma',
          selected_size: 'M',
          quantity: 1,
          total_amount: 1500,
          status: 'DELIVERED',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
      },
      {
          seller_id: sellerId,
          product_id: productId,
          customer_phone: '+919988776655',
          customer_name: 'Anjali Verma',
          selected_size: 'S',
          quantity: 2,
          total_amount: 2800,
          status: 'PAID',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      },
      {
          seller_id: sellerId,
          product_id: productId,
          customer_phone: '+919122334455',
          customer_name: 'Neha Gupta',
          selected_size: 'L',
          quantity: 1,
          total_amount: 1400,
          status: 'PENDING_PAYMENT',
          created_at: new Date().toISOString() // now
      }
  ])

  if (ordersError) console.error("Error seeding orders:", ordersError.message)

  // 2. Seed WhatsApp Logs
  console.log('Seeding WhatsApp Logs...')
  await supabase.from('whatsapp_logs').delete().eq('seller_id', sellerId) // Clear existing test logs

  const customerPhone = '+919122334455' // The pending order customer
  const logs = [
      {
          seller_id: sellerId,
          customer_phone: customerPhone,
          sender_type: 'customer',
          message_content: 'Hi! I saw your reel. Is the red silk saree still available?',
          created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15 mins ago
      },
      {
          seller_id: sellerId,
          customer_phone: customerPhone,
          sender_type: 'agent',
          message_content: 'Namaste didi! 🙏 Yes, the beautiful red silk saree is available in sizes S, M, and L. The price is ₹1500. Would you like me to book one for you? ✨',
          created_at: new Date(Date.now() - 14 * 60 * 1000).toISOString()
      },
      {
          seller_id: sellerId,
          customer_phone: customerPhone,
          sender_type: 'customer',
          message_content: 'Yes size L. But can you give discount?',
          created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
      },
      {
          seller_id: sellerId,
          customer_phone: customerPhone,
          sender_type: 'agent',
          message_content: 'Since you asked so nicely didi, I can offer it to you for ₹1400! 💖 I will reserve size L for you now.',
          created_at: new Date(Date.now() - 9 * 60 * 1000).toISOString()
      },
      {
          seller_id: sellerId,
          customer_phone: customerPhone,
          sender_type: 'agent',
          message_content: 'Here is your secure Razorpay link to complete the purchase: https://rzp.io/l/demo123 \n\nLet me know once you have paid! 🛍️',
          created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString()
      }
  ]

  const { error: logsError } = await supabase.from('whatsapp_logs').insert(logs)
  if (logsError) console.error("Error seeding logs:", logsError.message)

  console.log('✅ Dummy data seeded successfully!')
}

seedData()
