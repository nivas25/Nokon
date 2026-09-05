import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const evaluateDiscountTool = createTool({
  id: 'evaluate-discount',
  description: 'Evaluates if a buyer\'s offer is mathematically acceptable based on the strictly enforced floor price and current negotiation round.',
  inputSchema: z.object({
    itemCode: z.string().describe('The code of the item being negotiated'),
    buyerOfferRupees: z.number().describe('The price the customer is asking for (in Rupees)'),
    currentBargainRound: z.number().describe('How many times the buyer has counter-offered. Starts at 1.')
  }),
  execute: async ({ itemCode, buyerOfferRupees, currentBargainRound }, executeContext) => {
    const { sellerId } = (executeContext.requestContext?.all as any) || {};
    if (!sellerId) throw new Error('sellerId is required in context for evaluateDiscountTool');

    const { data: product, error } = await supabase
      .from('products')
      .select('listed_price, floor_price, agent_negotiation_rules')
      .eq('seller_id', sellerId)
      .eq('item_code', itemCode)
      .single();

    if (error || !product) {
      return { allowed: false, reason: `Item ${itemCode} not found in catalog.` };
    }

    const { listed_price: listedPrice, floor_price: floorPrice } = product;

    // Floor price is null? Then no discount is allowed.
    if (floorPrice === null || floorPrice === undefined) {
      return { 
        allowed: false, 
        reason: 'This item is strictly fixed price. No discounts are permitted.' 
      };
    }

    if (buyerOfferRupees >= listedPrice) {
      return { allowed: true, approvedPrice: listedPrice, reason: 'Offer meets or exceeds listed price.' };
    }

    if (buyerOfferRupees < floorPrice) {
      return { 
        allowed: false, 
        minCounterOffer: floorPrice, 
        reason: 'Offer is below minimum floor margin. DO NOT ACCEPT. Counter at the minCounterOffer.' 
      };
    }

    // Offer is between floorPrice and listedPrice. 
    // We calculate an incremental counter-offer so the bot doesn't immediately drop to the buyer's offer.
    // If round 1: meet them 25% of the way down from listed price.
    // If round 2: meet them 50% of the way down from listed price.
    // If round 3+: accept their offer (since it's above floor).
    
    let counterOffer = listedPrice;
    
    if (currentBargainRound === 1) {
      const drop = (listedPrice - buyerOfferRupees) * 0.25;
      counterOffer = Math.round(listedPrice - drop);
    } else if (currentBargainRound === 2) {
      const drop = (listedPrice - buyerOfferRupees) * 0.50;
      counterOffer = Math.round(listedPrice - drop);
    } else {
      counterOffer = buyerOfferRupees; // Accept it on round 3+
    }

    // Ensure the calculated counter offer never dips below the floor (safety net)
    counterOffer = Math.max(counterOffer, floorPrice);

    if (counterOffer > buyerOfferRupees) {
      return {
        allowed: false,
        recommendedCounterOffer: counterOffer,
        reason: 'Offer is above floor, but we should counter-offer incrementally to maximize profit.'
      };
    }

    return {
      allowed: true,
      approvedPrice: buyerOfferRupees,
      reason: 'Offer accepted after sufficient negotiation rounds.'
    };
  }
});
