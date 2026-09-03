import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { evaluateOrderGate } from '@/lib/gates'
import { formatInrFromPaise } from '@/lib/money'
import { parseBuyerIntent } from '@/lib/ocr'
import { createStandardPaymentLink } from '@/lib/razorpay/client'
import { getStore } from '@/lib/store'
import {
  collectResumeSchema,
  paidResumeSchema,
  workflowInputSchema,
  workflowOutputSchema,
  workflowStateSchema,
  type WorkflowState,
} from '@/mastra/schemas'

const PAY_TTL_MS = 20 * 60 * 1000

const gateOutputSchema = workflowInputSchema.extend({
  gateOk: z.boolean(),
  blockReason: z.string().nullable(),
  gateMessage: z.string(),
})

function asState(state: unknown): WorkflowState {
  return workflowStateSchema.parse(state)
}

const parseIntent = createStep({
  id: 'parseIntent',
  inputSchema: workflowInputSchema,
  outputSchema: workflowInputSchema,
  stateSchema: workflowStateSchema,
  execute: async ({ inputData, setState }) => {
    const store = getStore()
    const parsed = await parseBuyerIntent({
      rawText: inputData.rawText,
      imageUrl: inputData.imageUrl,
    })
    const merged = {
      ...parsed,
      size: inputData.size ?? parsed.size,
      capPaise: inputData.capPaise ?? parsed.capPaise,
    }
    const size = inputData.size ?? merged.size ?? undefined
    const capPaise = inputData.capPaise ?? merged.capPaise ?? undefined
    await store.writeAudit({
      orderId: inputData.orderId,
      step: 'parseIntent',
      decision: 'INFO',
      reason: merged.source,
      payload: {
        youtubeHandle: merged.youtubeHandle,
        itemCode: merged.itemCode,
        size: size ?? null,
        capPaise: capPaise ?? null,
        hasImage: Boolean(inputData.imageUrl),
      },
    })
    await setState({
      orderId: inputData.orderId,
      youtubeHandle: merged.youtubeHandle ?? undefined,
      itemCode: merged.itemCode ?? undefined,
      size,
      capPaise,
      shippingName: inputData.shippingName,
      shippingAddress: inputData.shippingAddress,
    })
    await store.appendMessage({
      orderId: inputData.orderId,
      channel: 'main',
      sender: 'system',
      body: merged.youtubeHandle
        ? `Looking up @${merged.youtubeHandle} item ${merged.itemCode ?? '?'}.`
        : 'Need a YouTube handle and item code (typed fallback: @sareedidi 14).',
    })
    return { ...inputData, size, capPaise }
  },
})

const matchSeller = createStep({
  id: 'matchSeller',
  inputSchema: workflowInputSchema,
  outputSchema: workflowInputSchema,
  stateSchema: workflowStateSchema,
  execute: async ({ inputData, state, setState }) => {
    const store = getStore()
    const current = asState(state)
    const handle = current.youtubeHandle
    const seller = handle ? await store.getSellerByHandle(handle) : null
    await setState({
      ...current,
      shopFound: Boolean(seller),
      sellerId: seller?.id,
      shopName: seller?.shop_name,
    })
    await store.writeAudit({
      orderId: current.orderId,
      step: 'matchSeller',
      decision: seller ? 'PASS' : 'FAIL',
      reason: seller ? 'SHOP_FOUND' : 'SHOP_NOT_FOUND',
      payload: { handle: handle ?? null, sellerId: seller?.id ?? null },
    })
    if (seller) {
      await store.updateOrder(current.orderId, { seller_id: seller.id })
      await store.appendMessage({
        orderId: current.orderId,
        channel: 'watch',
        sender: 'buyer_agent',
        body: `Is @${handle} onboarded? Checking catalog.`,
      })
      await store.appendMessage({
        orderId: current.orderId,
        channel: 'watch',
        sender: 'seller_agent',
        body: `Yes — ${seller.shop_name} is on Nokon.`,
      })
    }
    return inputData
  },
})

const matchItem = createStep({
  id: 'matchItem',
  inputSchema: workflowInputSchema,
  outputSchema: workflowInputSchema,
  stateSchema: workflowStateSchema,
  execute: async ({ inputData, state, setState }) => {
    const store = getStore()
    const current = asState(state)
    const item =
      current.sellerId && current.itemCode
        ? await store.getItem(current.sellerId, current.itemCode)
        : null
    await setState({
      ...current,
      itemFound: Boolean(item),
      itemId: item?.id,
      catalogPricePaise: item?.price_paise,
      stockAtCheck: item?.stock,
      sizes: item?.sizes,
      itemActive: item?.is_active,
      itemTitle: item?.title,
    })
    await store.writeAudit({
      orderId: current.orderId,
      step: 'matchItem',
      decision: item ? 'PASS' : 'FAIL',
      reason: item ? 'ITEM_FOUND' : 'ITEM_NOT_FOUND',
      payload: {
        itemCode: current.itemCode ?? null,
        price_paise: item?.price_paise ?? null,
        stock: item?.stock ?? null,
      },
    })
    if (item) {
      await store.updateOrder(current.orderId, {
        item_id: item.id,
        item_code: item.item_code,
        catalog_price_paise: item.price_paise,
      })
      await store.appendMessage({
        orderId: current.orderId,
        channel: 'watch',
        sender: 'seller_agent',
        body: `Item ${item.item_code} ${item.title}: ${formatInrFromPaise(item.price_paise)}, stock ${item.stock}, sizes ${(item.sizes ?? []).join(', ') || 'one size'}.`,
      })
    }
    return inputData
  },
})

const collectMissing = createStep({
  id: 'collectMissing',
  inputSchema: workflowInputSchema,
  outputSchema: workflowInputSchema,
  stateSchema: workflowStateSchema,
  resumeSchema: collectResumeSchema,
  suspendSchema: z.object({ missing: z.array(z.string()) }),
  execute: async ({ inputData, state, setState, resumeData, suspend }) => {
    const store = getStore()
    const current = asState(state)
    const merged = {
      size: resumeData?.size ?? current.size ?? inputData.size,
      capPaise: resumeData?.capPaise ?? current.capPaise ?? inputData.capPaise,
      shippingName: resumeData?.shippingName ?? current.shippingName ?? inputData.shippingName,
      shippingAddress:
        resumeData?.shippingAddress ?? current.shippingAddress ?? inputData.shippingAddress,
    }
    const missing: string[] = []
    if (!merged.size && (current.sizes?.length ?? 0) > 0) missing.push('size')
    if (merged.capPaise == null) missing.push('capPaise')
    if (!merged.shippingName || !merged.shippingAddress) missing.push('address')

    if (missing.length > 0) {
      await store.updateOrder(current.orderId, {
        status: 'awaiting_buyer',
        size: merged.size ?? null,
        cap_paise: merged.capPaise ?? null,
        shipping_name: merged.shippingName ?? null,
        shipping_address: merged.shippingAddress ?? null,
      })
      await store.appendMessage({
        orderId: current.orderId,
        channel: 'main',
        sender: 'buyer_agent',
        body: `I still need: ${missing.join(', ')}.`,
      })
      return await suspend({ missing })
    }

    await setState({ ...current, ...merged })
    await store.updateOrder(current.orderId, {
      size: merged.size ?? null,
      cap_paise: merged.capPaise ?? null,
      shipping_name: merged.shippingName ?? null,
      shipping_address: merged.shippingAddress ?? null,
    })
    return {
      ...inputData,
      size: merged.size,
      capPaise: merged.capPaise,
      shippingName: merged.shippingName,
      shippingAddress: merged.shippingAddress,
    }
  },
})

const gate = createStep({
  id: 'gate',
  inputSchema: workflowInputSchema,
  outputSchema: gateOutputSchema,
  stateSchema: workflowStateSchema,
  execute: async ({ inputData, state }) => {
    const store = getStore()
    const current = asState(state)
    const result = evaluateOrderGate({
      shopFound: Boolean(current.shopFound),
      itemFound: Boolean(current.itemFound),
      itemActive: current.itemActive !== false,
      catalogPricePaise: current.catalogPricePaise ?? null,
      capPaise: current.capPaise ?? inputData.capPaise ?? null,
      stock: current.stockAtCheck ?? null,
      size: current.size ?? inputData.size ?? null,
      sizes: current.sizes ?? [],
      shippingName: current.shippingName ?? inputData.shippingName ?? null,
      shippingAddress: current.shippingAddress ?? inputData.shippingAddress ?? null,
    })
    if (!result.ok) {
      await store.updateOrder(current.orderId, {
        status: 'blocked',
        block_reason: result.reason,
        catalog_price_paise: current.catalogPricePaise ?? 0,
        cap_paise: current.capPaise ?? inputData.capPaise ?? null,
      })
      await store.writeAudit({
        orderId: current.orderId,
        step: 'gate',
        decision: 'FAIL',
        reason: `BLOCKED_${result.reason}`,
        payload: {
          catalogPricePaise: current.catalogPricePaise ?? null,
          capPaise: current.capPaise ?? inputData.capPaise ?? null,
          stock: current.stockAtCheck ?? null,
          willCreateRazorpayCharge: false,
        },
      })
      await store.appendMessage({
        orderId: current.orderId,
        channel: 'main',
        sender: 'buyer_agent',
        body: result.message,
      })
      await store.appendMessage({
        orderId: current.orderId,
        channel: 'watch',
        sender: 'seller_agent',
        body: result.message,
      })
      return {
        ...inputData,
        gateOk: false,
        blockReason: result.reason,
        gateMessage: result.message,
      }
    }
    await store.writeAudit({
      orderId: current.orderId,
      step: 'gate',
      decision: 'PASS',
      reason: 'GATE_PASS',
      payload: {
        catalogPricePaise: current.catalogPricePaise,
        capPaise: current.capPaise ?? inputData.capPaise,
        stock: current.stockAtCheck,
      },
    })
    return { ...inputData, gateOk: true, blockReason: null, gateMessage: 'ok' }
  },
})

const reserveAndCharge = createStep({
  id: 'reserveAndCharge',
  inputSchema: gateOutputSchema,
  outputSchema: workflowOutputSchema,
  stateSchema: workflowStateSchema,
  execute: async ({ inputData, state }) => {
    const store = getStore()
    const current = asState(state)
    if (!inputData.gateOk) {
      return {
        status: 'blocked' as const,
        blockReason: inputData.blockReason,
        paymentLinkUrl: null,
      }
    }
    if (!current.itemId || current.catalogPricePaise == null) {
      return { status: 'blocked' as const, blockReason: 'ITEM_NOT_FOUND', paymentLinkUrl: null }
    }

    const remaining = await store.reserveStock(current.itemId)
    if (remaining < 0) {
      await store.updateOrder(current.orderId, { status: 'blocked', block_reason: 'OUT_OF_STOCK' })
      await store.writeAudit({
        orderId: current.orderId,
        step: 'reserveAndCharge',
        decision: 'FAIL',
        reason: 'BLOCKED_OUT_OF_STOCK',
        payload: { willCreateRazorpayCharge: false },
      })
      await store.appendMessage({
        orderId: current.orderId,
        channel: 'main',
        sender: 'buyer_agent',
        body: 'Stock was taken while we were talking. I will not create a Razorpay charge.',
      })
      return { status: 'blocked' as const, blockReason: 'OUT_OF_STOCK', paymentLinkUrl: null }
    }

    const amount = current.catalogPricePaise
    const cap = current.capPaise ?? inputData.capPaise
    if (cap == null || amount > cap) {
      await store.releaseStock(current.itemId)
      return { status: 'blocked' as const, blockReason: 'OVER_CAP', paymentLinkUrl: null }
    }

    try {
      const link = await createStandardPaymentLink({
        orderId: current.orderId,
        amountPaise: amount,
        itemCode: current.itemCode ?? '',
        customerName: current.shippingName,
      })
      const reservedUntil = new Date(Date.now() + PAY_TTL_MS).toISOString()
      await store.updateOrder(current.orderId, {
        status: 'awaiting_payment',
        razorpay_payment_link_id: link.id,
        razorpay_payment_link_url: link.shortUrl,
        razorpay_order_id: link.orderId,
        reserved_until: reservedUntil,
        catalog_price_paise: amount,
      })
      await store.writeAudit({
        orderId: current.orderId,
        step: 'reserveAndCharge',
        decision: 'PASS',
        reason: 'PAYMENT_LINK_CREATED',
        payload: {
          amountPaise: amount,
          paymentLinkId: link.id,
          expireBy: link.expireBy,
        },
      })
      await store.appendMessage({
        orderId: current.orderId,
        channel: 'main',
        sender: 'buyer_agent',
        body: `Pay exactly ${formatInrFromPaise(amount)} via this Razorpay test link: ${link.shortUrl}`,
      })
      await store.appendMessage({
        orderId: current.orderId,
        channel: 'watch',
        sender: 'seller_agent',
        body: `Payment link issued for item ${current.itemCode}. Stock reserved until ${reservedUntil}.`,
      })
      return {
        status: 'awaiting_payment' as const,
        blockReason: null,
        paymentLinkUrl: link.shortUrl,
      }
    } catch (error) {
      await store.releaseStock(current.itemId)
      const message = error instanceof Error ? error.message : 'razorpay_create_failed'
      await store.writeAudit({
        orderId: current.orderId,
        step: 'reserveAndCharge',
        decision: 'FAIL',
        reason: 'RAZORPAY_CREATE_FAILED',
        payload: { error: message },
      })
      throw error
    }
  },
})

const awaitPayment = createStep({
  id: 'awaitPayment',
  inputSchema: workflowOutputSchema,
  outputSchema: workflowOutputSchema,
  stateSchema: workflowStateSchema,
  resumeSchema: paidResumeSchema,
  suspendSchema: z.object({ waiting: z.boolean() }),
  execute: async ({ inputData, resumeData, suspend, state }) => {
    if (inputData.status !== 'awaiting_payment') return inputData
    if (!resumeData?.paymentId) {
      return await suspend({ waiting: true })
    }
    const store = getStore()
    const current = asState(state)
    await store.appendMessage({
      orderId: current.orderId,
      channel: 'main',
      sender: 'system',
      body: `Payment captured (${resumeData.paymentId}). Pack-ready.`,
    })
    await store.appendMessage({
      orderId: current.orderId,
      channel: 'watch',
      sender: 'seller_agent',
      body: 'Paid on Razorpay test. Please pack and ship.',
    })
    await store.writeAudit({
      orderId: current.orderId,
      step: 'finalize',
      decision: 'PASS',
      reason: 'PAID',
      payload: { paymentId: resumeData.paymentId },
    })
    return { status: 'paid' as const, blockReason: null, paymentLinkUrl: inputData.paymentLinkUrl }
  },
})

export const orderFromScreenshot = createWorkflow({
  id: 'order-from-screenshot',
  inputSchema: workflowInputSchema,
  outputSchema: workflowOutputSchema,
  stateSchema: workflowStateSchema,
})
  .then(parseIntent)
  .then(matchSeller)
  .then(matchItem)
  .then(collectMissing)
  .then(gate)
  .then(reserveAndCharge)
  .then(awaitPayment)
  .commit()
