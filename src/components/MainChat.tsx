"use client"

type Msg = { id: string; sender: string; body: string }

export function MainChat({
  messages,
  onSend,
  disabled,
}: {
  messages: Msg[]
  onSend: (text: string) => void
  disabled?: boolean
}) {
  return (
    <section className="flex h-full min-h-[28rem] flex-col rounded-2xl border border-[#3a3326] bg-[#1c1810]">
      <header className="border-b border-[#3a3326] px-4 py-3 text-sm tracking-wide text-[var(--marigold)]">
        Main chat · buyer agent
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm leading-6">
        {messages.map((m) => (
          <div key={m.id} className={m.sender === "buyer_human" ? "text-right" : "text-left"}>
            <p className="text-[10px] uppercase tracking-wide text-[#7d7360]">{m.sender.replace("_", " ")}</p>
            <p
              className={`inline-block max-w-[90%] rounded-xl px-3 py-2 ${
                m.sender === "buyer_human" ? "bg-[#3a2a12] text-[var(--paper)]" : "bg-[#241f16] text-[#eee4cf]"
              }`}
            >
              {m.body}
            </p>
          </div>
        ))}
      </div>
      <form
        className="border-t border-[#3a3326] p-3"
        onSubmit={(e) => {
          e.preventDefault()
          const input = e.currentTarget.elements.namedItem("text") as HTMLInputElement
          const value = input.value.trim()
          if (!value || disabled) return
          onSend(value)
          input.value = ""
        }}
      >
        <input
          name="text"
          disabled={disabled}
          placeholder="Size, cap, name, address…"
          className="w-full rounded-xl border border-[#3a3326] bg-[#14110b] px-3 py-2 text-sm text-[var(--paper)] outline-none disabled:opacity-50"
        />
      </form>
    </section>
  )
}
