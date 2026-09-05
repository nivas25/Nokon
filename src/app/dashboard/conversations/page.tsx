import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Bot, User as UserIcon } from "lucide-react"

export default async function ConversationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: logs } = await supabase
    .from("whatsapp_logs")
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: true })

  const typedLogs = logs || []

  // Group logs by customer_phone
  const groupedLogs = typedLogs.reduce((acc, log) => {
    if (!acc[log.customer_phone]) acc[log.customer_phone] = []
    acc[log.customer_phone].push(log)
    return acc
  }, {} as Record<string, any[]>)

  const customerPhones = Object.keys(groupedLogs)
  // For demo, just showing the first conversation or a placeholder if empty
  const activePhone = customerPhones.length > 0 ? customerPhones[0] : null
  const activeConversation = activePhone ? groupedLogs[activePhone] : []

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-theme(spacing.16))] md:h-screen p-6 overflow-hidden">
      <div className="mb-6 shrink-0">
        <h1 className="text-3xl font-bold font-heading text-slate-900 tracking-tight">Live Audit</h1>
        <p className="text-slate-500 mt-1">Monitor your AI Agent's real-time WhatsApp conversations.</p>
      </div>

      <div className="flex-1 flex bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-0">
        
        {/* Left Pane: Conversation List */}
        <div className="w-1/3 min-w-[250px] border-r border-slate-100 flex flex-col bg-slate-50/50">
          <div className="p-4 border-b border-slate-100 bg-white shrink-0">
            <h2 className="font-semibold text-slate-900">Active Chats</h2>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {customerPhones.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">
                No active conversations yet.
              </div>
            ) : (
              customerPhones.map((phone) => (
                <button 
                  key={phone}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${
                    phone === activePhone 
                      ? 'bg-indigo-50 border border-indigo-100' 
                      : 'hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  <div className="font-medium text-slate-900 truncate">{phone}</div>
                  <div className="text-xs text-slate-500 mt-1 truncate">
                    {groupedLogs[phone][groupedLogs[phone].length - 1].message_content}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Pane: Chat Window */}
        <div className="flex-1 flex flex-col bg-[#E5DDD5]">
          {activePhone ? (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center shrink-0 shadow-sm z-10">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mr-3">
                  <UserIcon className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{activePhone}</h3>
                  <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Agent Active
                  </p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {activeConversation.map((log: any) => {
                  const isAgent = log.sender_type === 'agent'
                  return (
                    <div key={log.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm relative ${
                        isAgent 
                          ? 'bg-[#E1FFC7] text-slate-900 rounded-tr-sm' 
                          : 'bg-white text-slate-900 rounded-tl-sm'
                      }`}>
                        {isAgent && (
                          <div className="absolute -left-7 top-1 h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center shadow-sm">
                            <Bot className="h-3 w-3 text-indigo-600" />
                          </div>
                        )}
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{log.message_content}</p>
                        <div className="text-[10px] text-slate-500 text-right mt-1 opacity-70">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center flex-col text-slate-500 bg-[#f0f2f5]">
              <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm">
                <Bot className="h-10 w-10 text-slate-300" />
              </div>
              <p>Waiting for customers to message your agent...</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
