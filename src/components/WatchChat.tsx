type Msg = { id: string; sender: string; body: string; created_at: string }

export function WatchChat({ messages }: { messages: Msg[] }) {
  return (
    <section className="flex h-full min-h-[28rem] flex-col overflow-hidden rounded-2xl bg-[var(--wa-green)]">
      <header className="flex items-center gap-3 bg-[#064e46] px-4 py-3 text-white">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-[#25d366] text-sm font-bold text-[#064e46]">
          SD
        </div>
        <div>
          <p className="text-sm font-semibold">Saree Didi · watch</p>
          <p className="text-[11px] text-[#b7ddd6]">read-only · agents only</p>
        </div>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto bg-[#ece5dd] p-3">
        {messages.length === 0 ? (
          <p className="pt-8 text-center text-sm text-[#667781]">Negotiation appears here. You cannot type.</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-5 text-[#111] shadow-sm ${
                m.sender === "buyer_agent" ? "ml-auto bg-[var(--wa-bubble)]" : "bg-white"
              }`}
            >
              <p className="text-[10px] uppercase tracking-wide text-[#667781]">{m.sender.replace("_", " ")}</p>
              <p>{m.body}</p>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
