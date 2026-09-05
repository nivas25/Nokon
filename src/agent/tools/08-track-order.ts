import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const trackOrderTool = createTool({
  id: 'track-order',
  description: 'Looks up the latest order status for a customer.',
  inputSchema: z.object({
    customerPhone: z.string().describe('The customer\'s WhatsApp phone number')
  }),
  execute: async ({ customerPhone }, executeContext) => {
    const { sellerId } = (executeContext.requestContext?.all as any) || {};
    if (!sellerId) throw new Error('sellerId is required in context for trackOrderTool');

    // 1. Fetch the most recent order with product details
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, status, updated_at, products(name)')
      .eq('seller_id', sellerId)
      .eq('customer_phone', customerPhone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !order) {
      return { orderFound: false, message: 'No orders found for this customer.' };
    }

    const itemName = Array.isArray(order.products) ? order.products[0]?.name : (order.products as any)?.name || 'Unknown Item';

    return {
      orderFound: true,
      orderId: order.id,
      status: order.status,
      itemName,
      lastUpdated: new Date(order.updated_at).toLocaleString('en-IN')
    };
  }
});
