import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyRazorpayWebhookSignature, type RazorpayWebhookEvent } from '@/lib/razorpay/verify';
import { sendWhatsAppMessage, sendAddressRequestMessage } from '@/lib/whatsapp';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error('RAZORPAY_WEBHOOK_SECRET missing');
    return NextResponse.json({ error: 'webhook unconfigured' }, { status: 500 });
  }

  const valid = verifyRazorpayWebhookSignature(rawBody, signature, secret);
  if (!valid) {
    console.warn('razorpay webhook signature failed');
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const name = event.event ?? 'unknown';
  const payment = event.payload?.payment?.entity;
  const link = event.payload?.payment_link?.entity;
  
  const paymentId = payment?.id ?? null;
  const linkId = link?.id ?? null; // plink_xxx

  console.log('razorpay webhook', { event: name, paymentId, linkId });

  const captured = name === 'payment.captured' || name === 'order.paid' || name === 'payment_link.paid';
  const expired = name === 'payment_link.expired' || name === 'payment_link.cancelled';
  
  if (!captured && !expired) {
    return NextResponse.json({ ok: true, ignored: name });
  }

  if (!linkId) {
    // If there is no linkId in the payload, try to extract the order ID from notes
    const orderId = (payment?.notes as any)?.reference_id;
    if (!orderId) {
      console.error('No linkId or reference_id found in webhook payload');
      return NextResponse.json({ ok: true, ignored: 'no identifier' });
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Find the order by Razorpay payment link ID or reference ID
  let orderQuery = supabase.from('orders').select('*, product:products(name, item_code)');
  if (linkId) {
    orderQuery = orderQuery.eq('razorpay_order_id', linkId);
  } else {
    orderQuery = orderQuery.eq('id', (payment?.notes as any)?.reference_id);
  }
  
  const { data: order, error: orderErr } = await orderQuery.single();

  if (orderErr || !order) {
    console.error('Order not found for linkId/reference_id:', linkId || (payment?.notes as any)?.reference_id);
    return NextResponse.json({ error: 'order not found' }, { status: 404 });
  }

  if (order.status === 'PAID') {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  let activeProduct = order.product;
  if (Array.isArray(activeProduct)) {
    activeProduct = activeProduct[0];
  }
  const productName = activeProduct?.name || 'Item';

  if (expired) {
    if (order.status !== 'PENDING_PAYMENT') {
       return NextResponse.json({ ok: true, ignored: 'order not pending' });
    }

    // 1. Update order status to CANCELLED
    await supabase.from('orders').update({ status: 'CANCELLED' }).eq('id', order.id);

    // 2. Restore stock
    const { data: item } = await supabase.from('products').select('stock_count').eq('id', order.product_id).single();
    if (item) {
      await supabase.from('products').update({ stock_count: item.stock_count + 1 }).eq('id', order.product_id);
    }

    // 3. Notify customer
    const expiryMsg = `Your payment link for the *${productName}* has expired and the item has been returned to the shelf. Let me know if you are still interested!`;
    try {
      await sendWhatsAppMessage(order.customer_phone, expiryMsg);
      await supabase.from('whatsapp_logs').insert({
        seller_id: order.seller_id,
        customer_phone: order.customer_phone,
        sender_type: 'agent',
        message_content: expiryMsg
      });
    } catch (error) {
      console.error('WhatsApp confirmation loop failed', error);
    }

    return NextResponse.json({ ok: true, orderId: order.id, status: 'EXPIRED' });
  }

  // 2. Update the order status to PAID
  const { error: updateErr } = await supabase
    .from('orders')
    .update({ 
      status: 'PAID', 
      razorpay_payment_id: paymentId 
    })
    .eq('id', order.id);

  if (updateErr) {
    console.error('Failed to update order status:', updateErr);
    return NextResponse.json({ error: 'db update failed' }, { status: 500 });
  }

  // 3. Send WhatsApp confirmation message
  const amountPaid = order.total_amount;
  
  const finalSellerMsg = `Payment of ₹${amountPaid} received successfully! 🎉\n\nTo process your order for the *${productName}*, please reply with your delivery details:\n\n*Name:*\n*Address:*\n*Pincode:*\n*Phone:*`;

  try {
    await sendWhatsAppMessage(order.customer_phone, finalSellerMsg);
    
    // 4. Log the confirmation in whatsapp_logs so the agent knows it's paid
    await supabase.from('whatsapp_logs').insert({
      seller_id: order.seller_id,
      customer_phone: order.customer_phone,
      sender_type: 'agent', // Representing the automated confirmation
      message_content: finalSellerMsg
    });
  } catch (error) {
    console.error('WhatsApp confirmation loop failed', error);
  }

  return NextResponse.json({ ok: true, orderId: order.id, status: 'PAID' });
}
