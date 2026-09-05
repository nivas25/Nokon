import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const searchCatalogTool = createTool({
  id: 'search-catalog',
  description: 'Searches the seller catalog for items matching a text query and optional maximum budget.',
  inputSchema: z.object({
    query: z.string().describe('Search term (e.g. "saree", "green", "silk")'),
    maxBudget: z.number().optional().describe('Maximum budget in Rupees'),
  }),
  execute: async ({ query, maxBudget }, executeContext) => {
    const { sellerId } = (executeContext.requestContext?.all as any) || {};
    if (!sellerId) {
      throw new Error('sellerId is required in context for searchCatalogTool');
    }

    let dbQuery = supabase
      .from('products')
      .select('item_code, name, description, listed_price, stock_count, available_sizes')
      .eq('seller_id', sellerId);
    
    if (query) {
      // Basic text search on name or description or item_code
      dbQuery = dbQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%,item_code.ilike.%${query}%`);
    }

    if (maxBudget) {
      dbQuery = dbQuery.lte('listed_price', maxBudget);
    }

    const { data: products, error } = await dbQuery.limit(5);

    if (error) {
      console.error('Supabase query failed in searchCatalogTool:', error);
      return { success: false, error: 'Database search failed' };
    }

    if (!products || products.length === 0) {
      return { success: true, items: [] };
    }

    return {
      success: true,
      items: products.map(p => ({
        itemCode: p.item_code,
        name: p.name,
        listedPrice: p.listed_price,
        inStock: p.stock_count > 0,
        hasSizes: Array.isArray(p.available_sizes) && p.available_sizes.length > 0
      }))
    };
  }
});
