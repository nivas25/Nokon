import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { requireSupabaseAdmin } from '@/lib/env'

let admin: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (admin) return admin
  const { url, serviceRoleKey } = requireSupabaseAdmin()
  admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return admin
}

export function hasSupabaseAdminEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
}
