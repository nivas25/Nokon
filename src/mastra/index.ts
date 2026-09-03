import { Mastra } from '@mastra/core/mastra'
import { LibSQLStore } from '@mastra/libsql'
import { buyerAgent } from '@/mastra/agents/buyer-agent'
import { sellerAgent } from '@/mastra/agents/seller-agent'
import { orderFromScreenshot } from '@/mastra/workflows/order-from-screenshot'

const dbUrl = process.env.MASTRA_DB_URL ?? 'file:./mastra.db'

export const mastra = new Mastra({
  agents: { buyerAgent, sellerAgent },
  workflows: { orderFromScreenshot },
  storage: new LibSQLStore({
    id: 'nokon-mastra',
    url: dbUrl,
  }),
  logger: false,
})
