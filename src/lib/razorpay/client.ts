import Razorpay from 'razorpay'
import { requireRazorpay, getServerEnv } from '@/lib/env'

let client: Razorpay | null = null

export function getRazorpay(): Razorpay {
  if (client) return client
  const { keyId, keySecret } = requireRazorpay()
  client = new Razorpay({ key_id: keyId, key_secret: keySecret })
  return client
}

export const PAYMENT_LINK_TTL_SECONDS = 20 * 60

export type CreatePaymentLinkInput = {
  orderId: string
  amountPaise: number
  itemCode: string
  description?: string
  customerName?: string
}

export async function createStandardPaymentLink(input: CreatePaymentLinkInput) {
  if (!Number.isInteger(input.amountPaise) || input.amountPaise < 100) {
    throw new Error('refusing Razorpay create: amount is not chargeable paise')
  }
  const env = getServerEnv()
  const expireBy = Math.floor(Date.now() / 1000) + PAYMENT_LINK_TTL_SECONDS
  const payload: Record<string, unknown> = {
    amount: input.amountPaise,
    currency: 'INR',
    accept_partial: false,
    expire_by: expireBy,
    reference_id: input.orderId,
    description: input.description ?? `Nokon item ${input.itemCode}`,
    notify: { sms: false, email: false },
    reminder_enable: false,
    notes: {
      nokon_order_id: input.orderId,
      item_code: input.itemCode,
    },
  }
  if (input.customerName) {
    payload.customer = { name: input.customerName }
  }
  if (env.RAZORPAY_CALLBACK_URL) {
    payload.callback_url = env.RAZORPAY_CALLBACK_URL
    payload.callback_method = 'get'
  }
  const link = await getRazorpay().paymentLink.create(payload)
  return {
    id: String(link.id),
    shortUrl: String(link.short_url),
    orderId: link.order_id ? String(link.order_id) : null,
    expireBy,
    raw: link,
  }
}
