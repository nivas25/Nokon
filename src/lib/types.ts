export const ORDER_STATUSES = [
  'started',
  'awaiting_buyer',
  'blocked',
  'awaiting_payment',
  'paid',
  'expired',
  'failed',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export type MessageChannel = 'main' | 'watch'
export type MessageSender = 'buyer_human' | 'buyer_agent' | 'seller_agent' | 'system'
export type AuditDecision = 'PASS' | 'FAIL' | 'INFO'

export const DEMO_SELLER = {
  shopName: 'Saree Didi',
  youtubeHandle: 'sareedidi',
  city: 'Hyderabad',
} as const

export const DEMO_ITEM = {
  itemCode: '14',
  title: 'Cotton handloom saree — Item 14',
  pricePaise: 99900,
  stock: 2,
  sizes: ['S', 'M', 'L'] as string[],
} as const
