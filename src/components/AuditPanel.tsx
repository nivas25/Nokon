type Row = {
  id: string
  step: string
  decision: string
  reason: string | null
  payload: Record<string, unknown>
  created_at: string
}

export function AuditPanel({ events }: { events: Row[] }) {
  return (
    <section className="rounded-2xl border border-[#3a3326] bg-[#1c1810] p-4">
      <h2 className="mb-3 text-sm tracking-[0.2em] uppercase text-[var(--marigold)]">Audit</h2>
      <ol className="space-y-2 font-mono text-xs">
        {events.map((e) => (
          <li key={e.id} className="grid grid-cols-[7rem_4rem_1fr] gap-2 border-b border-[#2a241a] py-2">
            <span>{e.step}</span>
            <span className={e.decision === "FAIL" ? "text-[var(--blocked)]" : "text-[var(--leaf)]"}>
              {e.decision}
            </span>
            <span className="text-[#cbbfa6]">
              {e.reason}
              {e.payload && "willCreateRazorpayCharge" in e.payload
                ? ` · charge=${String(e.payload.willCreateRazorpayCharge)}`
                : ""}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
