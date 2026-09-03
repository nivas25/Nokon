'use client'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let browser: SupabaseClient | null = null

export function getSupabaseBrowser(): SupabaseClient {
  if (browser) return browser
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  browser = createClient(url, anon)
  return browser
}
