import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const checkVariantTool = createTool({
  id: 'check-variant',
  description: 'Inspects stock and available sizes for a specific item code. Use this when the buyer explicitly asks for a size or availability.',
  inputSchema: z.object({
    itemCode: z.string().describe('The code of the item to check'),
    requestedSize: z.string().optional().describe('The size the customer is asking for (e.g., S, M, Free Size)'),
  }),
  execute: async ({ itemCode, requestedSize }, executeContext) => {
    const { sellerId } = (executeContext.requestContext?.all as any) || {};
    if (!sellerId) throw new Error('sellerId is required in context for checkVariantTool');

    const { data: product, error } = await supabase
      .from('products')
      .select('stock_count, available_sizes, agent_upsell_item_ids')
      .eq('seller_id', sellerId)
      .eq('item_code', itemCode)
      .single();

    if (error || !product) {
      return { inStock: false, error: `Item ${itemCode} not found in catalog.` };
    }

    // Check Out-of-Stock Condition
    if (product.stock_count <= 0) {
      let similarItems: any[] = [];
      if (Array.isArray(product.agent_upsell_item_ids) && product.agent_upsell_item_ids.length > 0) {
        // Fetch up to 2 upsell items
        const { data: upsells } = await supabase
          .from('products')
          .select('item_code, name, listed_price')
          .in('id', product.agent_upsell_item_ids.slice(0, 2))
          .eq('seller_id', sellerId);
        if (upsells) similarItems = upsells;
      }
      return { 
        inStock: false, 
        message: 'This item is currently out of stock.',
        similarItems 
      };
    }

    // Item is in stock. Now check size requirements.
    if (!product.available_sizes || product.available_sizes.length === 0) {
      return { inStock: true, requiresSize: false };
    }

    if (requestedSize) {
      const isSizeAvailable = product.available_sizes.some((s: string) => 
        s.toLowerCase() === requestedSize.toLowerCase()
      );
      if (isSizeAvailable) {
        return { inStock: true, requiresSize: true, requestedSizeAvailable: true };
      } else {
        return { 
          inStock: true, 
          requiresSize: true, 
          requestedSizeAvailable: false, 
          availableSizes: product.available_sizes 
        };
      }
    }

    // Size is required but wasn't requested
    return { 
      inStock: true, 
      requiresSize: true, 
      availableSizes: product.available_sizes 
    };
  }
});
