import type { SupabaseClient } from '@supabase/supabase-js'
import type { AuditDecision } from '@/lib/types'

export async function writeAudit(
  supabase: SupabaseClient,
  input: {
    orderId: string | null
    step: string
    decision: AuditDecision
    reason?: string
    payload?: Record<string, unknown>
  },
) {
  const { error } = await supabase.from('audit_events').insert({
    order_id: input.orderId,
    step: input.step,
    decision: input.decision,
    reason: input.reason ?? null,
    payload: sanitizeAuditPayload(input.payload ?? {}),
  })
  if (error) {
    console.error('audit insert failed', error.message)
  }
}

const REDACT = ['key', 'secret', 'card', 'cvv', 'pan', 'authorization']

export function sanitizeAuditPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    const lower = key.toLowerCase()
    if (REDACT.some((part) => lower.includes(part))) {
      out[key] = '[redacted]'
      continue
    }
    out[key] = value
  }
  return out
}
