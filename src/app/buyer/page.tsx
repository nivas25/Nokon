"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import Link from "next/link"

export default function BuyerStartPage() {
  const router = useRouter()
  const [rawText, setRawText] = useState("@sareedidi 14 M, max 1200")
  const [shippingName, setShippingName] = useState("Asha Reddy")
  const [address, setAddress] = useState("12 Film Nagar, Hyderabad 500033")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function start() {
    setPending(true)
    setError(null)
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rawText,
          shippingName,
          shippingAddress: { line1: address },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "start failed")
      router.push(`/buyer/${data.order.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "start failed")
      setPending(false)
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <Link href="/" className="text-xs uppercase tracking-widest">
        ← Nokon
      </Link>
      <h1 className="mt-6 text-3xl">Start from a screenshot overlay</h1>
      <p className="mt-2 text-sm leading-6 text-[#cbbfa6]">
        Typed fallback if OCR is weak: <code>@sareedidi 14</code> plus size and max rupees.
        Fail demo: change max to 500.
      </p>
      <label className="mt-8 block text-xs uppercase tracking-widest text-[var(--marigold)]">
        Screenshot text / typed handle
      </label>
      <textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        rows={4}
        className="mt-2 w-full rounded-xl border border-[#3a3326] bg-[#1c1810] p-3 text-sm"
      />
      <label className="mt-4 block text-xs uppercase tracking-widest text-[var(--marigold)]">Ship to</label>
      <input
        value={shippingName}
        onChange={(e) => setShippingName(e.target.value)}
        className="mt-2 w-full rounded-xl border border-[#3a3326] bg-[#1c1810] p-3 text-sm"
      />
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="mt-2 w-full rounded-xl border border-[#3a3326] bg-[#1c1810] p-3 text-sm"
      />
      {error ? <p className="mt-3 text-sm text-[var(--blocked)]">{error}</p> : null}
      <button
        type="button"
        onClick={start}
        disabled={pending}
        className="mt-6 rounded-full bg-[var(--marigold)] px-5 py-2 text-sm font-semibold text-[var(--ink)] disabled:opacity-50"
      >
        {pending ? "Starting…" : "Start order"}
      </button>
    </main>
  )
}
