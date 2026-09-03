import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { getStore } from '@/lib/store'

export const checkCatalogTool = createTool({
  id: 'check-catalog',
  description: 'Looks up an item in the seller catalog by its itemCode.',
  inputSchema: z.object({
    itemCode: z.string().describe('The code of the item to lookup'),
  }),
  execute: async ({ itemCode }, executeContext) => {
    const { youtubeHandle } = (executeContext.requestContext?.all as any) || {}
    if (!youtubeHandle) return { found: false, error: 'youtubeHandle missing in context' }

    const store = getStore()
    const seller = await store.getSellerByHandle(youtubeHandle)
    if (!seller) {
      return { found: false, error: 'Seller not found on Nokon.' }
    }
    const item = await store.getItem(seller.id, itemCode)
    if (!item) {
      return { found: false, error: `Item code ${itemCode} not found in catalog.` }
    }
    return {
      found: true,
      itemId: item.id,
      itemCode: item.item_code,
      title: item.title,
      pricePaise: item.price_paise,
      priceRupees: item.price_paise / 100,
      stock: item.stock,
      sizes: item.sizes,
      isActive: item.is_active,
    }
  },
})
