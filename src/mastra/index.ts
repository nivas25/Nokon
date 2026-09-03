import { Mastra } from '@mastra/core/mastra'
import { LibSQLStore } from '@mastra/libsql'
import { sellerAgent } from '@/mastra/agents/seller-agent'

const dbUrl = process.env.MASTRA_DB_URL ?? 'file:./mastra.db'

export const mastra = new Mastra({
  agents: { sellerAgent },
  storage: new LibSQLStore({
    id: 'nokon-mastra',
    url: dbUrl,
  }),
  logger: false,
})
