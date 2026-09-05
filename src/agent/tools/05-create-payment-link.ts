import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import Razorpay from 'razorpay';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Setup Razorpay client
const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

export const createPaymentLinkTool = createTool({
  id: 'create-payment-link',
  description: 'Generates a secure Razorpay payment link for an agreed checkout. Requires the item to be in stock.',
  inputSchema: z.object({
    itemCode: z.string().describe('The code of the item to purchase'),
    agreedPriceRupees: z.number().describe('The final negotiated price in Rupees'),
    selectedSize: z.string().optional().describe('The selected size, if applicable')
  }),
  execute: async ({ itemCode, agreedPriceRupees, selectedSize }, executeContext) => {
    const { sellerId, storeName, customerPhone } = (executeContext.requestContext?.all as any) || {};
    if (!sellerId) throw new Error('sellerId is required in context for createPaymentLinkTool');
    if (!customerPhone) throw new Error('customerPhone is required in context for createPaymentLinkTool');

    // 1. Fetch Item Data (Floor Verification)
    const { data: item, error: itemErr } = await supabase
      .from('products')
      .select('id, name, floor_price, stock_count')
      .eq('seller_id', sellerId)
      .eq('item_code', itemCode)
      .single();

    if (itemErr || !item) {
      return { success: false, error: 'Item not found in database.' };
    }

    if (item.floor_price !== null && agreedPriceRupees < item.floor_price) {
      return { success: false, error: 'Security abort: Agreed price is strictly below the minimum floor price.' };
    }

    if (item.stock_count <= 0) {
      return { success: false, error: 'Item is currently out of stock.' };
    }

    // 2. Idempotency Check (Check for orders created in the last 15 mins)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, razorpay_order_id, created_at, total_amount')
      .eq('seller_id', sellerId)
      .eq('customer_phone', customerPhone)
      .eq('product_id', item.id)
      .eq('status', 'PENDING_PAYMENT')
      .gte('created_at', fifteenMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingOrder && existingOrder.razorpay_order_id && existingOrder.total_amount === agreedPriceRupees) {
      try {
        const fetchedLink = await rzp.paymentLink.fetch(existingOrder.razorpay_order_id);
        const createdAtUnix = Math.floor(new Date(existingOrder.created_at).getTime() / 1000);
        return { 
          success: true, 
          paymentUrl: fetchedLink.short_url,
          expiresAtUnix: createdAtUnix + 960,
          message: 'Reusing existing active payment link.'
        };
      } catch (e) {
        console.warn('Failed to fetch existing link from Razorpay, generating new one.');
      }
    }

    // 3. Atomic Stock Hold
    // Decrement stock in public.products safely (for now using an update, in production use RPC or lock)
    const { error: stockErr } = await supabase.rpc('reserve_item_stock', { p_item_id: item.id });
    if (stockErr) {
      // Fallback if RPC doesn't exist, we just do a regular update minus 1
      await supabase.from('products')
        .update({ stock_count: item.stock_count - 1 })
        .eq('id', item.id)
        .gte('stock_count', 1);
    }

    // 4. Razorpay Generation
    const orderId = randomUUID();
    const expireBy = Math.floor(Date.now() / 1000) + 960; // 16 minutes (must be > 15m for Razorpay)

    try {
      const linkPayload = {
        amount: Math.round(agreedPriceRupees * 100),
        currency: 'INR',
        accept_partial: false,
        expire_by: expireBy,
        reference_id: orderId,
        description: `${storeName || 'Store'} - ${item.name}`,
        notes: {
          sellerId,
          itemCode,
          customerPhone,
          size: selectedSize || 'Free'
        }
      };

      const link = await rzp.paymentLink.create(linkPayload as any);

      // 5. Record Creation or Update
      // Look for any existing pending order to update instead of creating duplicates
      const { data: pendingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('seller_id', sellerId)
        .eq('customer_phone', customerPhone)
        .eq('product_id', item.id)
        .eq('status', 'PENDING_PAYMENT')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingOrder) {
        const { error: updateErr } = await supabase.from('orders').update({
          total_amount: agreedPriceRupees,
          selected_size: selectedSize || null,
          razorpay_order_id: link.id
        }).eq('id', pendingOrder.id);
        
        if (updateErr) {
          console.error('Failed to update order in Supabase:', updateErr);
          throw new Error('Database update failed: ' + updateErr.message);
        }
      } else {
        const { error: insertErr } = await supabase.from('orders').insert({
          id: orderId,
          seller_id: sellerId,
          product_id: item.id,
          customer_phone: customerPhone,
          selected_size: selectedSize || null,
          total_amount: agreedPriceRupees,
          quantity: 1,
          status: 'PENDING_PAYMENT',
          razorpay_order_id: link.id // Storing plink_xxx ID here for reference
        });

        if (insertErr) {
          console.error('Failed to insert order into Supabase:', insertErr);
          throw new Error('Database insert failed: ' + insertErr.message);
        }
      }

      return {
        success: true,
        paymentUrl: link.short_url,
        expiresAtUnix: expireBy
      };
    } catch (e: any) {
      console.error('Razorpay generation failed:', e);
      // Rollback stock
      const { error: rollbackErr } = await supabase.rpc('release_item_stock', { p_item_id: item.id });
      if (rollbackErr) {
        await supabase.from('products').update({ stock_count: item.stock_count }).eq('id', item.id);
      }
      return { success: false, error: 'Failed to generate payment link via Razorpay.' };
    }
  }
});
