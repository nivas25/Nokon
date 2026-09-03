import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Need service role to bypass auth rules if any
)

async function createSeller() {
  const email = 'admin@sareedidi.com'
  const password = 'password123'

  console.log('Creating auth user...')
  
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    console.error('Error creating auth user:', authError.message)
    if (authError.message.includes('already exists')) {
        console.log('User already exists, proceeding to create/update seller profile...')
    } else {
        process.exit(1)
    }
  }

  // Get the user ID (either newly created or query existing if it failed with "already exists")
  let userId = authData?.user?.id
  if (!userId) {
     const { data } = await supabase.auth.admin.listUsers()
     const user = data.users.find((u: any) => u.email === email)
     if (user) userId = user.id
  }
  
  if (!userId) {
      console.error("Could not determine user ID")
      process.exit(1)
  }

  console.log('User ID:', userId)

  // 2. Insert into sellers table (Mock Onboarding)
  console.log('Creating seller profile (onboarding)...')
  const { error: sellerError } = await supabase.from('sellers').upsert({
    id: userId,
    user_id: userId,
    email: email,
    full_name: 'Saree Didi Admin',
    store_name: 'Saree Didi',
    niche: 'Womens Ethnic Wear',
    phone: '+91 9876543210',
    phone_number: '+91 9876543210',
    youtube_handle: '@sareedidi',
    youtube_channel_url: 'https://youtube.com/@sareedidi',
    instagram_handle: 'sareedidi_official',
    address: 'Mumbai, MH',
    whatsapp_phone_number_id: '10987654321', // Dummy Meta Phone Number ID for testing Webhooks
    global_agent_prompt: 'You are Velvi, a friendly and polite seller for Saree Didi. You address buyers as "didi" or "ma\'am" and always offer a 10% discount if they ask nicely.',
    onboarding_completed: true,
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' })

  if (sellerError) {
    console.error('Error creating seller profile:', sellerError.message)
    process.exit(1)
  }

  console.log('✅ Seller account created successfully!')
  console.log(`Email: ${email}`)
  console.log(`Password: ${password}`)
}

createSeller()
