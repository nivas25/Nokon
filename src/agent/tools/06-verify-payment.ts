import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import Razorpay from 'razorpay';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

export const verifyPaymentTool = createTool({
  id: 'verify-payment',
  description: 'Checks the payment status of the most recent order for a customer.',
  inputSchema: z.object({
    customerPhone: z.string().describe('The customer\'s WhatsApp phone number')
  }),
  execute: async ({ customerPhone }, executeContext) => {
    const { sellerId } = (executeContext.requestContext?.all as any) || {};
    if (!sellerId) throw new Error('sellerId is required in context for verifyPaymentTool');

    // 1. Fetch the most recent order
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('customer_phone', customerPhone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !order) {
      return { success: false, status: 'NOT_FOUND', message: 'No recent orders found for this customer.' };
    }

    if (order.status === 'PAID' || order.status === 'PROCESSING') {
      return { success: true, status: 'PAID', message: 'Payment has been successfully verified.' };
    }

    if (order.status === 'PENDING_PAYMENT' && order.razorpay_order_id) {
      // 2. Ping Razorpay API directly
      try {
        const rzpLink = await rzp.paymentLink.fetch(order.razorpay_order_id);
        if (rzpLink.status === 'paid') {
          // Update DB since webhook might be delayed
          await supabase.from('orders')
            .update({ status: 'PROCESSING' })
            .eq('id', order.id);
          
          return { success: true, status: 'PAID', message: 'Payment has been successfully verified.' };
        } else if (rzpLink.status === 'expired') {
          await supabase.from('orders')
            .update({ status: 'CANCELLED' })
            .eq('id', order.id);
            
          return { success: false, status: 'EXPIRED', message: 'Payment link has expired.' };
        } else {
          return { success: false, status: 'PENDING', message: 'Payment has not been completed yet.' };
        }
      } catch (e: any) {
        console.error('Failed to verify with Razorpay:', e);
        return { success: false, status: 'UNKNOWN', message: 'Could not reach payment gateway to verify.' };
      }
    }

    return { success: false, status: order.status, message: `Order status is currently ${order.status}.` };
  }
});
