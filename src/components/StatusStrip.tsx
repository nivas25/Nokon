const STEPS = [
  "started",
  "awaiting_buyer",
  "awaiting_payment",
  "paid",
  "blocked",
] as const

export function StatusStrip({ status, blockReason }: { status: string; blockReason?: string | null }) {
  const label =
    status === "blocked"
      ? `blocked${blockReason ? ` · ${blockReason}` : ""}`
      : status.replaceAll("_", " ")
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-full border border-[#3a3326] bg-[#1c1810] px-4 py-2 text-xs uppercase tracking-wider">
      {STEPS.filter((s) => s !== "blocked" || status === "blocked").map((step) => {
        const active = status === step
        return (
          <span
            key={step}
            className={
              active
                ? step === "blocked"
                  ? "rounded-full bg-[var(--blocked)] px-2 py-1 text-white"
                  : step === "paid"
                    ? "rounded-full bg-[var(--leaf)] px-2 py-1 text-white"
                    : "rounded-full bg-[var(--marigold)] px-2 py-1 text-[var(--ink)]"
                : "text-[#7d7360]"
            }
          >
            {step.replaceAll("_", " ")}
          </span>
        )
      })}
      <span className="ml-auto text-[#cbbfa6] normal-case tracking-normal">{label}</span>
    </div>
  )
}
