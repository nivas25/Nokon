import { z } from 'zod'

export const workflowInputSchema = z.object({
  orderId: z.string(),
  imageUrl: z.string().optional(),
  rawText: z.string().optional(),
  buyerId: z.string().optional(),
  size: z.string().optional(),
  capPaise: z.number().int().optional(),
  shippingName: z.string().optional(),
  shippingAddress: z.record(z.string(), z.unknown()).optional(),
})

export const workflowStateSchema = z.object({
  orderId: z.string(),
  sellerId: z.string().optional(),
  itemId: z.string().optional(),
  youtubeHandle: z.string().optional(),
  itemCode: z.string().optional(),
  size: z.string().optional(),
  capPaise: z.number().int().optional(),
  shippingName: z.string().optional(),
  shippingAddress: z.record(z.string(), z.unknown()).optional(),
  catalogPricePaise: z.number().int().optional(),
  stockAtCheck: z.number().int().optional(),
  shopName: z.string().optional(),
  itemTitle: z.string().optional(),
  sizes: z.array(z.string()).optional(),
  itemActive: z.boolean().optional(),
  shopFound: z.boolean().optional(),
  itemFound: z.boolean().optional(),
})

export const workflowOutputSchema = z.object({
  status: z.enum(['awaiting_payment', 'blocked', 'paid', 'awaiting_buyer']),
  blockReason: z.string().nullable(),
  paymentLinkUrl: z.string().nullable(),
})

export const collectResumeSchema = z.object({
  size: z.string().optional(),
  capPaise: z.number().int().optional(),
  shippingName: z.string().optional(),
  shippingAddress: z.record(z.string(), z.unknown()).optional(),
})

export const paidResumeSchema = z.object({
  paymentId: z.string(),
})

export type WorkflowInput = z.infer<typeof workflowInputSchema>
export type WorkflowState = z.infer<typeof workflowStateSchema>
