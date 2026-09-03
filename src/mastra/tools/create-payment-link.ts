import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { getStore } from '@/lib/store'
import { createStandardPaymentLink } from '@/lib/razorpay/client'

const PAY_TTL_MS = 20 * 60 * 1000

export const createPaymentLinkTool = createTool({
  id: 'create-payment-link',
  description: 'Reserves stock and generates a Razorpay payment link. Only call this when the buyer explicitly agrees to the price.',
  inputSchema: z.object({
    itemCode: z.string().describe('The code of the item to purchase'),
  }),
  execute: async ({ itemCode }, executeContext) => {
    const { orderId, customerName, youtubeHandle } = (executeContext.requestContext?.all as any) || {}
    if (!orderId) throw new Error('orderId is required in context')
    if (!youtubeHandle) throw new Error('youtubeHandle is required in context')

    const store = getStore()
    const seller = await store.getSellerByHandle(youtubeHandle)
    if (!seller) return { success: false, error: 'Store not found' }
    
    const item = await store.getItem(seller.id, itemCode)
    if (!item) return { success: false, error: 'Invalid item code' }

    const itemId = item.id
    const catalogPricePaise = item.price_paise
    
    // Safety check: is it in stock?
    const remaining = await store.reserveStock(itemId)
    if (remaining < 0) {
      await store.updateOrder(orderId, { status: 'blocked', block_reason: 'OUT_OF_STOCK' })
      return { success: false, error: 'Item is out of stock.' }
    }

    try {
      const link = await createStandardPaymentLink({
        orderId,
        amountPaise: catalogPricePaise,
        itemCode,
        customerName: customerName ?? undefined,
        sellerHandle: youtubeHandle,
      })
      const reservedUntil = new Date(Date.now() + PAY_TTL_MS).toISOString()
      
      await store.updateOrder(orderId, {
        status: 'awaiting_payment',
        razorpay_payment_link_id: link.id,
        razorpay_payment_link_url: link.shortUrl,
        razorpay_order_id: link.orderId,
        reserved_until: reservedUntil,
        catalog_price_paise: catalogPricePaise,
        item_id: itemId,
        item_code: itemCode,
      })
      
      return {
        success: true,
        paymentLinkUrl: link.shortUrl,
        message: `Payment link created successfully: ${link.shortUrl}`,
      }
    } catch (error) {
      await store.releaseStock(itemId)
      return { success: false, error: error instanceof Error ? error.message : 'razorpay_create_failed' }
    }
  },
})
