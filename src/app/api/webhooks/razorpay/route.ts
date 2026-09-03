import { NextResponse } from 'next/server'
import { getStore } from '@/lib/store'
import {
  extractNokonOrderId,
  verifyRazorpayWebhookSignature,
  type RazorpayWebhookEvent,
} from '@/lib/razorpay/verify'
import { mastra } from '@/mastra'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET

  if (!secret) {
    console.error('RAZORPAY_WEBHOOK_SECRET missing')
    return NextResponse.json({ error: 'webhook unconfigured' }, { status: 500 })
  }

  const valid = verifyRazorpayWebhookSignature(rawBody, signature, secret)
  if (!valid) {
    console.warn('razorpay webhook signature failed')
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  let event: RazorpayWebhookEvent
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookEvent
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const name = event.event ?? 'unknown'
  const payment = event.payload?.payment?.entity
  const link = event.payload?.payment_link?.entity
  console.log('razorpay webhook', {
    event: name,
    paymentId: payment?.id ?? null,
    orderId: payment?.order_id ?? link?.order_id ?? null,
    linkId: link?.id ?? null,
    amount: payment?.amount ?? link?.amount ?? null,
  })

  if (name === 'payment.failed') {
    const store = getStore()
    const orderId = extractNokonOrderId(event)
    if (orderId) {
      const order = await store.getOrder(orderId)
      if (order && order.status === 'awaiting_payment') {
        await store.writeAudit({
          orderId,
          step: 'webhook',
          decision: 'INFO',
          reason: 'PAYMENT_FAILED_EVENT',
          payload: { paymentId: payment?.id ?? null },
        })
      }
    }
    return NextResponse.json({ ok: true })
  }

  const captured =
    name === 'payment.captured' ||
    name === 'order.paid' ||
    name === 'payment_link.paid'
  if (!captured) {
    return NextResponse.json({ ok: true, ignored: name })
  }

  const store = getStore()
  const paymentId = payment?.id
  if (paymentId) {
    const existing = await store.findOrderByPaymentId(paymentId)
    if (existing) {
      return NextResponse.json({ ok: true, idempotent: true })
    }
  }

  let order =
    (link?.id ? await store.findOrderByPaymentLinkId(link.id) : null) ??
    (extractNokonOrderId(event) ? await store.getOrder(extractNokonOrderId(event)!) : null)

  if (!order) {
    await store.writeAudit({
      orderId: null,
      step: 'webhook',
      decision: 'FAIL',
      reason: 'ORDER_NOT_FOUND',
      payload: { event: name, paymentId: paymentId ?? null },
    })
    return NextResponse.json({ error: 'order not found' }, { status: 404 })
  }

  const amount = payment?.amount ?? link?.amount
  if (amount != null && amount !== order.catalog_price_paise) {
    await store.writeAudit({
      orderId: order.id,
      step: 'webhook',
      decision: 'FAIL',
      reason: 'AMOUNT_MISMATCH',
      payload: { expected: order.catalog_price_paise, got: amount },
    })
    return NextResponse.json({ error: 'amount mismatch' }, { status: 409 })
  }

  if (order.status === 'paid') {
    return NextResponse.json({ ok: true, idempotent: true })
  }

  const updated = await store.updateOrder(order.id, {
    status: 'paid',
    razorpay_payment_id: paymentId ?? order.razorpay_payment_id,
    razorpay_order_id: payment?.order_id ?? link?.order_id ?? order.razorpay_order_id,
    razorpay_payment_link_id: link?.id ?? order.razorpay_payment_link_id,
  })

  await store.writeAudit({
    orderId: updated.id,
    step: 'webhook',
    decision: 'PASS',
    reason: 'PAYMENT_CAPTURED',
    payload: { event: name, paymentId: paymentId ?? null },
  })

  if (paymentId) {
    // Fire and forget agent confirmation loop
    ;(async () => {
      try {
        const msgs = await store.listMessages(updated.id)
        if (msgs.some((m) => m.sender === 'seller_agent' && m.body.includes('Payment of ₹'))) {
          return // already sent final confirmation
        }

        const finalSellerMsg = `Payment of ₹${(order.catalog_price_paise / 100).toFixed(2)} received successfully! 🎉\n\nYour order is confirmed and will be shipped soon. Thank you for shopping with Nokon!`
        
        await store.appendMessage({
          orderId: updated.id,
          channel: 'main',
          sender: 'seller_agent',
          body: finalSellerMsg,
        })

        if (updated.buyer_id) {
          const buyer = await store.getBuyer(updated.buyer_id)
          if (buyer && buyer.name.startsWith('whatsapp:')) {
            const phone = buyer.name.replace('whatsapp:', '')
            await sendWhatsAppMessage(phone, finalSellerMsg)
          }
        }
      } catch (error) {
        console.error('WhatsApp confirmation loop failed', error)
      }
    })()
  }

  return NextResponse.json({ ok: true, orderId: updated.id, status: updated.status })
}
