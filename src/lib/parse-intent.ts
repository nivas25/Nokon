import { normalizeYoutubeHandle, parseHandleAndItemCode, parseSize } from '@/lib/handles'
import { parseMaxRupees } from '@/lib/money'

export type ParsedIntent = {
  youtubeHandle: string | null
  itemCode: string | null
  size: string | null
  capPaise: number | null
  notes: string | null
  source: 'typed' | 'mixed' | 'empty'
}

export function parseIntentFromText(rawText: string | undefined | null): ParsedIntent {
  const text = rawText?.trim() ?? ''
  if (!text) {
    return {
      youtubeHandle: null,
      itemCode: null,
      size: null,
      capPaise: null,
      notes: null,
      source: 'empty',
    }
  }
  const { youtubeHandle, itemCode } = parseHandleAndItemCode(text)
  return {
    youtubeHandle,
    itemCode,
    size: parseSize(text),
    capPaise: parseMaxRupees(text),
    notes: text,
    source: youtubeHandle && itemCode ? 'typed' : 'mixed',
  }
}

export function mergeIntent(base: ParsedIntent, overlay: Partial<ParsedIntent>): ParsedIntent {
  return {
    youtubeHandle: overlay.youtubeHandle ?? base.youtubeHandle,
    itemCode: overlay.itemCode ?? base.itemCode,
    size: overlay.size ?? base.size,
    capPaise: overlay.capPaise ?? base.capPaise,
    notes: overlay.notes ?? base.notes,
    source: overlay.youtubeHandle || overlay.itemCode ? 'mixed' : base.source,
  }
}
