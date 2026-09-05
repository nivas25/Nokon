import { after } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runSellerAgent } from '@/agent/runner';

// Admin Supabase client — bypasses RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── GET: Meta Webhook Verification ─────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ [Webhook] Meta verification successful.');
    return new Response(challenge, { status: 200 });
  }

  console.error('❌ [Webhook] Verification failed — token mismatch.');
  return new Response('Forbidden', { status: 403 });
}

// ─── POST: Incoming Message Handler (The Bouncer) ───────────────────────────
//
// Meta strictly enforces a 3-second response window.
// This handler does ONLY three things:
//   1. Parse the payload
//   2. Resolve the seller tenant from the phone_number_id
//   3. Return 200 IMMEDIATELY — then offload to the runner via after()
//
// The runner (src/agent/runner.ts) handles all heavy lifting:
// DB queries, LLM inference, tool execution, WhatsApp dispatch, audit logging.

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    // Malformed JSON — still ack to prevent Meta retries
    console.warn('[Webhook] Malformed JSON body received.');
    return new Response('EVENT_RECEIVED', { status: 200 });
  }

  // ── Tenant Resolution ────────────────────────────────────────────────────
  const phoneNumberId: string | undefined =
    body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

  if (!phoneNumberId) {
    // Could be a Meta test ping or a non-message event (e.g., message status)
    return new Response('EVENT_RECEIVED', { status: 200 });
  }

  // Resolve the seller synchronously (fast indexed lookup, <50ms)
  // Uses SUPABASE_SERVICE_ROLE_KEY — bypasses RLS
  const { data: seller, error: sellerLookupErr } = await supabase
    .from('sellers')
    .select('*')
    .eq('whatsapp_phone_number_id', phoneNumberId)
    .single();

  if (sellerLookupErr) {
    console.warn(`[Webhook] Seller lookup error for ${phoneNumberId}:`, sellerLookupErr.message, sellerLookupErr.code);
  }

  if (!seller) {
    console.warn(`[Webhook] No seller found for phone_number_id: ${phoneNumberId}`);
    return new Response('EVENT_RECEIVED', { status: 200 });
  }

  // ── CRITICAL: Return 200 to Meta BEFORE doing any heavy work ────────────
  // next/server's after() schedules work that runs after the response is sent.
  // This guarantees Meta's 3-second window is never violated.
  after(async () => {
    try {
      console.log(`[Webhook] Dispatching to runner for seller: ${seller.store_name}`);
      await runSellerAgent(seller, body);
    } catch (err) {
      // The runner has internal error handling, but we catch here as a final backstop.
      console.error('[Webhook] Unhandled error in agent runner:', err);
    }
  });

  return new Response('EVENT_RECEIVED', { status: 200 });
}
