import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const calculateBundleTool = createTool({
  id: 'calculate-bundle',
  description: 'Sums the total price for a multi-item order and applies bundle discounts.',
  inputSchema: z.object({
    itemCodes: z.array(z.string()).describe('An array of item codes the buyer wants to purchase together.')
  }),
  execute: async ({ itemCodes }, executeContext) => {
    const { sellerId } = (executeContext.requestContext?.all as any) || {};
    if (!sellerId) throw new Error('sellerId is required in context for calculateBundleTool');

    if (itemCodes.length === 0) {
      return { success: false, error: 'No item codes provided.' };
    }

    const { data: products, error } = await supabase
      .from('products')
      .select('item_code, name, listed_price')
      .eq('seller_id', sellerId)
      .in('item_code', itemCodes);

    if (error) {
      console.error('Supabase query failed in calculateBundleTool:', error);
      return { success: false, error: 'Failed to retrieve bundle items.' };
    }

    if (!products || products.length === 0) {
      return { success: false, error: 'None of the provided item codes were found.' };
    }

    let subtotal = 0;
    const foundItems = [];
    const missingCodes = itemCodes.filter(code => !products.find(p => p.item_code === code));

    for (const p of products) {
      subtotal += p.listed_price;
      foundItems.push({ itemCode: p.item_code, name: p.name, price: p.listed_price });
    }

    // Apply a 5% discount if there are 2 or more items in the bundle.
    let discountApplied = 0;
    let finalTotal = subtotal;
    let isBundleDiscountEligible = foundItems.length >= 2;

    if (isBundleDiscountEligible) {
      discountApplied = Math.round(subtotal * 0.05); // 5% bundle discount
      finalTotal = subtotal - discountApplied;
    }

    return {
      success: true,
      foundItems,
      missingCodes: missingCodes.length > 0 ? missingCodes : undefined,
      pricing: {
        subtotal,
        discountApplied,
        finalTotal,
        bundleDiscountPercent: isBundleDiscountEligible ? 5 : 0
      }
    };
  }
});
