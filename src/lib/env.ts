import { z } from 'zod'

const serverSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10).optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_CALLBACK_URL: z.string().url().optional(),
  XAI_API_KEY: z.string().optional(),
  XAI_MODEL: z.string().default('xai/grok-4.6'),
  MASTRA_DB_URL: z.string().default('file:./mastra.db'),
})

export type ServerEnv = z.infer<typeof serverSchema>

export function getServerEnv(): ServerEnv {
  return serverSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
    RAZORPAY_CALLBACK_URL: process.env.RAZORPAY_CALLBACK_URL,
    XAI_API_KEY: process.env.XAI_API_KEY,
    XAI_MODEL: process.env.XAI_MODEL,
    MASTRA_DB_URL: process.env.MASTRA_DB_URL,
  })
}

export function requireSupabaseAdmin(): {
  url: string
  serviceRoleKey: string
} {
  const env = getServerEnv()
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Supabase admin env missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    )
  }
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  }
}

export function requireRazorpay(): { keyId: string; keySecret: string } {
  const env = getServerEnv()
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay test keys missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.')
  }
  if (!env.RAZORPAY_KEY_ID.startsWith('rzp_test_')) {
    throw new Error('Refusing to run: RAZORPAY_KEY_ID is not a test key (rzp_test_…).')
  }
  return { keyId: env.RAZORPAY_KEY_ID, keySecret: env.RAZORPAY_KEY_SECRET }
}
