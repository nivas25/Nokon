/** YouTube handle: lowercase, no leading @. Exact match only. */

export function normalizeYoutubeHandle(raw: string | undefined | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  const withoutAt = trimmed.replace(/^@+/, '')
  const handle = withoutAt.toLowerCase()
  if (!/^[a-z0-9._]{3,30}$/i.test(handle)) {
    return null
  }
  return handle
}

export function parseHandleAndItemCode(raw: string | undefined | null): {
  youtubeHandle: string | null
  itemCode: string | null
} {
  if (!raw) return { youtubeHandle: null, itemCode: null }
  const handleMatch = raw.match(/@([a-zA-Z0-9._]{3,30})/)
  const codeMatch =
    raw.match(/\b(?:item(?:\s*code)?|code|#)\s*[:\-]?\s*([a-zA-Z0-9_-]{1,16})\b/i)
    ?? raw.match(/\b(\d{1,6})\b/)
  return {
    youtubeHandle: normalizeYoutubeHandle(handleMatch ? `@${handleMatch[1]}` : null),
    itemCode: codeMatch ? codeMatch[1].trim() : null,
  }
}

export function parseSize(raw: string | undefined | null): string | null {
  if (!raw) return null
  const match = raw.match(/\b(XXL|XL|XS|S|M|L)\b/i)
  return match ? match[1].toUpperCase() : null
}
