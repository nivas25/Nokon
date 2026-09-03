import { mergeIntent, parseIntentFromText, type ParsedIntent } from '@/lib/parse-intent'

/**
 * Typed handle+item code always wins. Vision fills gaps only when XAI_API_KEY is set.
 */
export async function parseBuyerIntent(input: {
  rawText?: string
  imageUrl?: string
}): Promise<ParsedIntent> {
  const typed = parseIntentFromText(input.rawText)
  if (typed.youtubeHandle && typed.itemCode) {
    return typed
  }
  if (!input.imageUrl || !process.env.XAI_API_KEY) {
    return typed
  }
  try {
    const { buyerAgent } = await import('@/mastra/agents/buyer-agent')
    const result = await buyerAgent.generate(
      [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: input.imageUrl,
            },
            {
              type: 'text',
              text: `Extract youtubeHandle (no @), itemCode, size, and cap in rupees from this YouTube overlay screenshot. Optional extra text: ${input.rawText ?? ''}`,
            },
          ],
        },
      ],
      {
        structuredOutput: {
          schema: {
            youtubeHandle: 'string',
            itemCode: 'string',
            size: 'string',
            capRupees: 'number',
          },
        },
      } as never,
    )
    const obj = (result as { object?: Record<string, unknown> }).object ?? {}
    const overlay: Partial<ParsedIntent> = {
      youtubeHandle: typeof obj.youtubeHandle === 'string' ? obj.youtubeHandle : null,
      itemCode: typeof obj.itemCode === 'string' ? obj.itemCode : null,
      size: typeof obj.size === 'string' ? obj.size : null,
      capPaise: typeof obj.capRupees === 'number' ? Math.round(obj.capRupees * 100) : null,
    }
    return mergeIntent(typed, overlay)
  } catch (error) {
    console.error('ocr fallback to typed parse', error)
    return typed
  }
}
