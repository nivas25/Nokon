import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const escalateHumanTool = createTool({
  id: 'escalate-human',
  description: 'Escalates the conversation to the human store owner and pauses the bot auto-replies.',
  inputSchema: z.object({
    customerPhone: z.string().describe('The customer\'s WhatsApp phone number'),
    reason: z.string().describe('The reason for escalation (e.g. "Customer requested custom bulk pricing")'),
    customerSummary: z.string().describe('A brief summary of what the customer wants')
  }),
  execute: async ({ customerPhone, reason, customerSummary }, executeContext) => {
    const { sellerId } = (executeContext.requestContext?.all as any) || {};
    if (!sellerId) throw new Error('sellerId is required in context for escalateHumanTool');

    // 1. Fetch Seller Details
    const { data: seller, error: sellerErr } = await supabase
      .from('sellers')
      .select('phone_number, store_name')
      .eq('id', sellerId)
      .single();

    if (sellerErr || !seller) {
      return { success: false, error: 'Seller not found.' };
    }

    // 2. Log Escalation Event & Pause Bot (We use intent_detected and metadata to flag it)
    await supabase.from('whatsapp_logs').insert({
      seller_id: sellerId,
      customer_phone: customerPhone,
      sender_type: 'agent',
      message_content: 'I have paused automated replies and notified the store owner. They will assist you shortly.',
      intent_detected: 'escalation',
      metadata: { escalation: true, reason, customerSummary }
    });

    // In a full implementation, we'd have a `paused_sessions` table.
    // For now, logging the escalation intent serves as a flag that the webhook can read to skip replies.

    // 3. Dispatch Alert to the Seller
    // The seller's phone_number from profile needs to be formatted for WhatsApp API (e.g. starting with country code)
    const sellerWhatsAppPhone = seller.phone_number.replace(/\D/g, ''); // strip non-digits
    
    const alertMessage = `🚨 *Store Alert: ${seller.store_name}*\n\nA customer (+${customerPhone}) requested human assistance.\n\n*Reason:* ${reason}\n*Summary:* ${customerSummary}\n\nAuto-replies have been paused so you can step in. Please message them directly.`;

    try {
      await sendWhatsAppMessage(sellerWhatsAppPhone, alertMessage);
      return { 
        success: true, 
        message: 'Escalation complete. Bot paused and seller notified.' 
      };
    } catch (e) {
      console.error('Failed to notify seller via WhatsApp:', e);
      return { 
        success: false, 
        error: 'Failed to dispatch alert to seller.' 
      };
    }
  }
});
