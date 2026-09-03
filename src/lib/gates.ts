/**
 * Money and stock gates. Pure TypeScript. Never call Razorpay from here.
 * Catalog price comes from SQL, never from chat.
 */

export type BlockReason =
  | 'OVER_CAP'
  | 'OUT_OF_STOCK'
  | 'SHOP_NOT_FOUND'
  | 'ITEM_NOT_FOUND'
  | 'PAYMENT_FAILED'
  | 'MISSING_CAP'
  | 'MISSING_SIZE'
  | 'MISSING_ADDRESS'
  | 'INACTIVE_ITEM'
  | 'INVALID_AMOUNT'

export type GateInput = {
  shopFound: boolean
  itemFound: boolean
  itemActive: boolean
  catalogPricePaise: number | null
  capPaise: number | null
  stock: number | null
  size: string | null
  sizes: string[]
  shippingName: string | null
  shippingAddress: unknown | null
}

export type GateResult =
  | { ok: true }
  | { ok: false; reason: BlockReason; message: string; willCreateRazorpayCharge: false }

const NO_CHARGE = { willCreateRazorpayCharge: false as const }

export function evaluateOrderGate(input: GateInput): GateResult {
  if (!input.shopFound) {
    return {
      ok: false,
      reason: 'SHOP_NOT_FOUND',
      message:
        'This YouTube handle is not onboarded on Nokon. I will not create a Razorpay charge.',
      ...NO_CHARGE,
    }
  }
  if (!input.itemFound || input.catalogPricePaise == null) {
    return {
      ok: false,
      reason: 'ITEM_NOT_FOUND',
      message: 'That item code is not in this shop catalog. I will not create a Razorpay charge.',
      ...NO_CHARGE,
    }
  }
  if (!input.itemActive) {
    return {
      ok: false,
      reason: 'INACTIVE_ITEM',
      message: 'This item is hidden from agents. I will not create a Razorpay charge.',
      ...NO_CHARGE,
    }
  }
  if (!Number.isInteger(input.catalogPricePaise) || input.catalogPricePaise < 100) {
    return {
      ok: false,
      reason: 'INVALID_AMOUNT',
      message: 'Catalog price is not a chargeable paise amount. I will not create a Razorpay charge.',
      ...NO_CHARGE,
    }
  }
  if (input.capPaise == null) {
    return {
      ok: false,
      reason: 'MISSING_CAP',
      message: 'Need a max spend (cap) before charging.',
      ...NO_CHARGE,
    }
  }
  if (input.catalogPricePaise > input.capPaise) {
    return {
      ok: false,
      reason: 'OVER_CAP',
      message: `Catalog price is ${input.catalogPricePaise} paise; your cap is ${input.capPaise} paise. I will not create a Razorpay charge.`,
      ...NO_CHARGE,
    }
  }
  if (input.stock == null || input.stock <= 0) {
    return {
      ok: false,
      reason: 'OUT_OF_STOCK',
      message: 'This item is out of stock. I will not create a Razorpay charge.',
      ...NO_CHARGE,
    }
  }
  if (input.sizes.length > 0) {
    if (!input.size) {
      return {
        ok: false,
        reason: 'MISSING_SIZE',
        message: 'This item needs a size before charging.',
        ...NO_CHARGE,
      }
    }
    const allowed = input.sizes.map((s) => s.toUpperCase())
    if (!allowed.includes(input.size.toUpperCase())) {
      return {
        ok: false,
        reason: 'MISSING_SIZE',
        message: `Size ${input.size} is not in the catalog (${allowed.join(', ')}). I will not create a Razorpay charge.`,
        ...NO_CHARGE,
      }
    }
  }
  if (!input.shippingName || !input.shippingAddress) {
    return {
      ok: false,
      reason: 'MISSING_ADDRESS',
      message: 'Need a shipping name and address before charging.',
      ...NO_CHARGE,
    }
  }
  return { ok: true }
}

export function canCreateRazorpayCharge(input: GateInput): boolean {
  return evaluateOrderGate(input).ok
}
