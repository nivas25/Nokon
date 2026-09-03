import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-10 px-6 py-16">
      <p className="text-xs tracking-[0.25em] uppercase text-[var(--marigold)]">Track 01 · Razorpay test</p>
      <div>
        <h1 className="text-5xl leading-tight font-bold text-[var(--paper)]">Nokon</h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-[#d9ccb1]">
          YouTube is the storefront. Nokon is the agent layer that turns a reel
          screenshot into a bounded, logged Razorpay test order — without a fake UPI photo.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/buyer"
          className="rounded-2xl border border-[#3a3326] bg-[#1c1810] p-6 no-underline hover:border-[var(--marigold)]"
        >
          <h2 className="text-2xl text-[var(--marigold)]">Buyer</h2>
          <p className="mt-2 text-sm leading-6 text-[#cbbfa6]">
            Paste @sareedidi 14 and a cap. Watch the agents. Pay only if the gate passes.
          </p>
        </Link>
        <Link
          href="/seller"
          className="rounded-2xl border border-[#3a3326] bg-[#1c1810] p-6 no-underline hover:border-[var(--marigold)]"
        >
          <h2 className="text-2xl text-[var(--marigold)]">Seller</h2>
          <p className="mt-2 text-sm leading-6 text-[#cbbfa6]">
            Catalog for @sareedidi. Orders show paid only after a verified webhook.
          </p>
        </Link>
      </div>
      <p className="text-sm text-[#8d826c]">
        Demo fail: same item, max ₹500 → zero Razorpay create, audit BLOCKED_OVER_CAP.
      </p>
    </main>
  );
}
