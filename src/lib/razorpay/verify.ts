import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils'

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!rawBody || !signature || !secret) return false
  try {
    return Boolean(validateWebhookSignature(rawBody, signature, secret))
  } catch {
    return false
  }
}

export type RazorpayWebhookEvent = {
  event?: string
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity }
    order?: { entity?: { id?: string; receipt?: string; amount?: number } }
    payment_link?: { entity?: RazorpayPaymentLinkEntity }
  }
}

export type RazorpayPaymentEntity = {
  id?: string
  amount?: number
  status?: string
  order_id?: string
  notes?: Record<string, string> | string[]
}

export type RazorpayPaymentLinkEntity = {
  id?: string
  amount?: number
  status?: string
  order_id?: string
  reference_id?: string
  short_url?: string
  notes?: Record<string, string> | null
}

export function extractNokonOrderId(event: RazorpayWebhookEvent): string | null {
  const link = event.payload?.payment_link?.entity
  const payment = event.payload?.payment?.entity
  const fromLinkNotes = notesRecord(link?.notes)?.nokon_order_id
  const fromPaymentNotes = notesRecord(payment?.notes)?.nokon_order_id
  return fromLinkNotes || fromPaymentNotes || link?.reference_id || null
}

function notesRecord(notes: RazorpayPaymentEntity['notes'] | null | undefined): Record<string, string> | null {
  if (!notes || Array.isArray(notes)) return null
  return notes
}
