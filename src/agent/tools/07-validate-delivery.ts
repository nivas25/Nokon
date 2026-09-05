import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const validateDeliveryTool = createTool({
  id: 'validate-delivery',
  description: 'Validates if a 6-digit Indian PIN code is serviceable and returns location details.',
  inputSchema: z.object({
    destinationPincode: z.string().regex(/^[1-9][0-9]{5}$/, "Must be a valid 6-digit Indian PIN code")
  }),
  execute: async ({ destinationPincode }) => {
    // 1. Attempt Shiprocket (mocked/omitted full auth here for resilience)
    const shiprocketToken = process.env.SHIPROCKET_API_KEY;
    const sellerPickupPincode = '560001'; // Defaulting for example
    
    let shiprocketSuccess = false;
    if (shiprocketToken) {
      try {
        const srResponse = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/serviceability/?pickup_postcode=${sellerPickupPincode}&delivery_postcode=${destinationPincode}&cod=1&weight=1`, {
          headers: {
            'Authorization': `Bearer ${shiprocketToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (srResponse.ok) {
          const data = await srResponse.json();
          if (data.status === 200 && data.data && data.data.available_courier_companies?.length > 0) {
            shiprocketSuccess = true;
            return {
              serviceable: true,
              estimatedDays: data.data.available_courier_companies[0].estimated_delivery_days || 3,
              locationName: data.data.available_courier_companies[0].city || 'Your Location',
              codAvailable: data.data.available_courier_companies[0].cod === 1,
              source: 'shiprocket'
            };
          }
        }
      } catch (e) {
        console.warn('Shiprocket API failed, falling back to Postal API...', e);
      }
    }

    // 2. Fallback to Postal API
    try {
      const postalResponse = await fetch(`https://api.postalpincode.in/pincode/${destinationPincode}`);
      const postalData = await postalResponse.json();
      
      if (postalData && postalData[0].Status === 'Success' && postalData[0].PostOffice?.length > 0) {
        const po = postalData[0].PostOffice[0];
        return {
          serviceable: true,
          estimatedDays: 4, // Conservative estimate for generic fallback
          locationName: `${po.District}, ${po.State}`,
          codAvailable: false, // Assume no COD by default on fallback
          source: 'postal_fallback'
        };
      }
    } catch (e) {
      console.error('Postal API fallback failed:', e);
    }

    return {
      serviceable: false,
      estimatedDays: null,
      locationName: 'Unknown Location',
      codAvailable: false,
      source: 'none'
    };
  }
});
