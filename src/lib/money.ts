/** Amounts are paise internally. Rupees exist only at the UI edge. */

export const PAISE_PER_RUPEE = 100
export const MIN_INR_PAISE = 100

export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) {
    throw new Error('rupees must be a finite number')
  }
  return Math.round(rupees * PAISE_PER_RUPEE)
}

export function paiseToRupees(paise: number): number {
  assertPaise(paise)
  return paise / PAISE_PER_RUPEE
}

export function formatInrFromPaise(paise: number): string {
  assertPaise(paise)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(paiseToRupees(paise))
}

export function parseMaxRupees(raw: string | undefined | null): number | null {
  if (!raw) return null
  const match = raw.match(/(?:max|cap|upto|up to|under|below)\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?)/i)
    ?? raw.match(/₹\s*(\d+(?:\.\d+)?)/)
    ?? raw.match(/\b(\d{3,6})\b/)
  if (!match) return null
  const rupees = Number(match[1])
  if (!Number.isFinite(rupees) || rupees <= 0) return null
  return rupeesToPaise(rupees)
}

export function assertPaise(paise: number): asserts paise is number {
  if (!Number.isInteger(paise) || paise < 0) {
    throw new Error(`paise must be a non-negative integer, got ${paise}`)
  }
}

export function isChargeableAmount(paise: number): boolean {
  return Number.isInteger(paise) && paise >= MIN_INR_PAISE
}
