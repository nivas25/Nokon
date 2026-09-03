import type { SupabaseClient } from '@supabase/supabase-js'
import type { MessageChannel, MessageSender } from '@/lib/types'

export async function appendMessage(
  supabase: SupabaseClient,
  input: {
    orderId: string
    channel: MessageChannel
    sender: MessageSender
    body: string
    meta?: Record<string, unknown>
  },
) {
  const { error } = await supabase.from('messages').insert({
    order_id: input.orderId,
    channel: input.channel,
    sender: input.sender,
    body: input.body,
    meta: input.meta ?? {},
  })
  if (error) {
    throw new Error(`message insert failed: ${error.message}`)
  }
}

export function blockedWatchCopy(reason: string, detail: string): {
  seller: string
  buyer: string
} {
  return {
    seller: `Catalog check failed (${reason}). ${detail}`,
    buyer: detail,
  }
}
