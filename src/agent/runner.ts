import { createClient } from '@supabase/supabase-js';
import { RequestContext } from '@mastra/core/request-context';
import { buildSellerPersonaPrompt } from '@/agent/prompts/seller-persona';
import { downloadWhatsAppMedia } from '@/lib/whatsapp';
import { extractDetailsFromImage } from '@/lib/vision';
import {
  dispatchStaggeredMessages,
  sendQuickReplyButtons,
  sendPaymentCTA,
} from '@/agent/dispatcher/whatsapp-messenger';

// --- Tool imports (the full 10-tool ecosystem) ---
import { searchCatalogTool }     from '@/agent/tools/01-search-catalog';
import { checkVariantTool }      from '@/agent/tools/02-check-variant';
import { evaluateDiscountTool }  from '@/agent/tools/03-evaluate-discount';
import { calculateBundleTool }   from '@/agent/tools/04-calculate-bundle';
import { createPaymentLinkTool } from '@/agent/tools/05-create-payment-link';
import { verifyPaymentTool }     from '@/agent/tools/06-verify-payment';
import { validateDeliveryTool }  from '@/agent/tools/07-validate-delivery';
import { trackOrderTool }        from '@/agent/tools/08-track-order';
import { dispatchInvoiceTool }   from '@/agent/tools/09-dispatch-invoice';
import { escalateHumanTool }     from '@/agent/tools/10-escalate-human';

import { Agent } from '@mastra/core/agent';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Types ──────────────────────────────────────────────────────────────────

interface AgentMessage {
  text: string;
  delayMs: number;
}

interface InteractiveAction {
  type: 'quick_reply' | 'payment_cta';
  bodyText: string;
  buttons?: Array<{ id: string; title: string }>;
  buttonText?: string;
  url?: string;
}

interface AgentOutput {
  chain_of_thought: string;
  messages: AgentMessage[];
  interactiveAction: InteractiveAction | null;
}

// ─── Seller Row (minimal shape) ──────────────────────────────────────────────

interface SellerRow {
  id: string;
  store_name: string;
  full_name?: string;    // actual DB column name
  niche?: string;
  phone_number: string;
  address?: string;
  youtube_handle?: string;
  global_agent_prompt?: string;
  whatsapp_phone_number_id?: string;
}

// ─── Vision: Gemini Flash extraction via OpenAI-compatible vision ─────────────
// Uses the existing extractDetailsFromImage from @/lib/vision (OpenAI gpt-4o-mini)
// which is already installed and working. Alias kept for clarity.
async function extractFromImageViaGemini(base64: string): Promise<{
  itemCode: string | null;
  size: string | null;
}> {
  const { itemCode, size } = await extractDetailsFromImage(base64);
  return { itemCode, size };
}

// ─── Core Runner ────────────────────────────────────────────────────────────

export async function runSellerAgent(
  seller: SellerRow,
  payload: object
) {
  const meta = payload as any;
  const entry    = meta.entry?.[0];
  const changes  = entry?.changes?.[0];
  const value    = changes?.value;
  const message  = value?.messages?.[0];

  if (!message) return; // status update or non-message event

  const customerPhone = message.from as string;
  const messageType   = message.type  as string;
  const customerName  = value?.contacts?.[0]?.profile?.name || 'Customer';
  const incomingMsgId = message.id as string; // used for deduplication

  // Deduplication check
  const { data: existingLog } = await supabase
    .from('whatsapp_logs')
    .select('id')
    .eq('metadata->>wamid', incomingMsgId)
    .limit(1)
    .maybeSingle();

  if (existingLog) {
    console.log(`[Runner] Duplicate webhook detected for wamid ${incomingMsgId}, dropping.`);
    return;
  }

  console.log(`[Runner] Seller: ${seller.store_name} | Customer: ${customerPhone} | Type: ${messageType}`);

  let incomingText = '';
  let isImage = false;

  // ── 1. Handle IMAGE ─────────────────────────────────────────────────────
  if (messageType === 'image') {
    isImage = true;
    const imageId = message.image?.id as string;
    console.log(`[Runner] Image received, ID: ${imageId}`);

    try {
      const base64 = await downloadWhatsAppMedia(imageId);
      const { itemCode, size } = await extractFromImageViaGemini(base64);

      if (!itemCode) {
        const reply = "I couldn't identify the product code in that image. Could you please send a clearer screenshot? 🙏";
        await dispatchStaggeredMessages(customerPhone, [{ text: reply, delayAfterMs: 1000 }]);
        return;
      }

      // Lookup product
      const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', seller.id)
        .eq('item_code', itemCode)
        .single();

      if (!product) {
        const reply = `Sorry, I couldn't find item code ${itemCode} in our inventory. Could you double-check?`;
        await dispatchStaggeredMessages(customerPhone, [{ text: reply, delayAfterMs: 1000 }]);
        return;
      }

      // Create order record (PENDING_PAYMENT)
      await supabase
        .from('orders')
        .insert({
          seller_id: seller.id,
          product_id: product.id,
          customer_phone: customerPhone,
          customer_name: customerName,
          selected_size: size || null,
          quantity: 1,
          total_amount: product.listed_price,
          status: 'PENDING_PAYMENT'
        });

      // Log system message as customer with bracket notation to bypass constraint
      await supabase.from('whatsapp_logs').insert({
        seller_id: seller.id,
        customer_phone: customerPhone,
        sender_type: 'customer',
        message_content: `[System: User uploaded image containing product "${product.name}" (Code: ${product.item_code}). Size detected: ${size || 'None'}]`,
        metadata: { wamid: incomingMsgId }
      });

    } catch (e) {
      console.error('[Runner] Image processing error:', e);
      const reply = 'Sorry, I ran into an error processing your screenshot. Please try again!';
      await dispatchStaggeredMessages(customerPhone, [{ text: reply, delayAfterMs: 500 }]);
      return;
    }
  } 
  // ── 2. Handle TEXT / BUTTON REPLY ────────────────────────────────────────
  else if (messageType === 'text') {
    incomingText = message.text?.body || '';
  } else if (messageType === 'interactive' || messageType === 'address_message') {
    if (message.interactive?.type === 'button_reply') {
      incomingText = message.interactive.button_reply.title;
    } else if (message.interactive?.type === 'list_reply') {
      incomingText = message.interactive.list_reply.title;
    } else if (message.interactive?.type === 'address_message' || messageType === 'address_message') {
      const addr = message.interactive?.address_message || message.address_message;
      if (addr) {
        const addrDetails = addr.address || {};
        const formattedAddress = `${addr.name || customerName}, Phone: ${addr.phone_number || customerPhone}, Address: ${addrDetails.street || ''}, ${addrDetails.city || ''}, ${addrDetails.state || ''} - ${addrDetails.zip || ''}, ${addrDetails.country || 'IN'}`;
        incomingText = `[System: User submitted official Address Form] ${formattedAddress}`;
      }
    } else {
      // Unsupported type — just ack
      return;
    }
  } else {
    // Unsupported type — just ack
    return;
  }

  if (!isImage && incomingText) {
    console.log(`[Runner] Text from ${customerPhone}: "${incomingText}"`);
    await supabase.from('whatsapp_logs').insert({
      seller_id: seller.id,
      customer_phone: customerPhone,
      sender_type: 'customer',
      message_content: incomingText,
      metadata: { wamid: incomingMsgId }
    });
  }

  await invokeAgent(seller, customerPhone, customerName);
}

// ─── Agent Invocation (shared by text + image flows) ────────────────────────

async function invokeAgent(
  seller: SellerRow,
  customerPhone: string,
  customerName: string
) {
  // 1. Fetch active order & product for state hydration (last 2 hours only)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: activeOrder } = await supabase
    .from('orders')
    .select('*, product:products(*)')
    .eq('seller_id', seller.id)
    .eq('customer_phone', customerPhone)
    .in('status', ['PENDING_PAYMENT', 'PAID'])
    .gte('updated_at', twoHoursAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log(`[invokeAgent] activeOrder: ${JSON.stringify(activeOrder)}`);
  let activeProduct = activeOrder?.product;
  if (Array.isArray(activeProduct)) {
    activeProduct = activeProduct[0];
  }

  let sessionContext = "[ACTIVE SESSION CONTEXT: No active product selected yet. Customer is browsing.]";

  // Check if the last log was a customer message and matches a size
  const { data: lastLog } = await supabase
    .from('whatsapp_logs')
    .select('message_content, sender_type')
    .eq('seller_id', seller.id)
    .eq('customer_phone', customerPhone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log(`[invokeAgent] activeProduct sizes: ${activeProduct?.available_sizes}, lastLog: ${JSON.stringify(lastLog)}`);

  if (activeOrder && activeProduct) {
    // Proactively update selected_size if the user just clicked a size button
    if (lastLog?.sender_type === 'customer' && activeProduct.available_sizes?.includes(lastLog.message_content)) {
      console.log(`[invokeAgent] Updating order size to ${lastLog.message_content}`);
      await supabase.from('orders').update({ selected_size: lastLog.message_content }).eq('id', activeOrder.id);
      activeOrder.selected_size = lastLog.message_content;
    }

    sessionContext = `[ACTIVE SESSION CONTEXT:
- Active Product: "${activeProduct.name}" (SKU: ${activeProduct.item_code})
- Listed Price: ₹${activeProduct.listed_price} | Floor Price: ₹${activeProduct.floor_price}
- Exact Available Sizes in DB: ${JSON.stringify(activeProduct.available_sizes)}
- Selected Size: ${activeOrder.selected_size || "None chosen yet"}
- Order ID: ${activeOrder.id}
- Current Order Status: ${activeOrder.status}]`;
  }

  // 2. Build conversation transcript (last 20 messages)
  const { data: logs } = await supabase
    .from('whatsapp_logs')
    .select('sender_type, message_content')
    .eq('seller_id', seller.id)
    .eq('customer_phone', customerPhone)
    .order('created_at', { ascending: false })
    .limit(20);

  const transcript = (logs || [])
    .reverse()
    .map(l => `${l.sender_type === 'customer' ? 'Customer' : (l.sender_type === 'system' ? 'System' : 'Agent')}: ${l.message_content}`)
    .join('\n');

  // 3. Build system prompt via persona builder
  const systemPrompt = buildSellerPersonaPrompt({
    storeName: seller.store_name,
    sellerName: seller.full_name,   // actual DB column
    niche: seller.niche,
    globalAgentPrompt: seller.global_agent_prompt,
    customerName,
    sessionContext
  });

  // 4. Build runtime context (injected into every tool via requestContext)
  const requestContext = new RequestContext(Object.entries({
    sellerId: seller.id,
    orderId: activeOrder?.id || '',
    customerPhone,
    storeName: seller.store_name,
    globalAgentPrompt: seller.global_agent_prompt || '',
    youtubeHandle: seller.youtube_handle || '',
  }));

  // 4. Instantiate a fresh runtime agent with full 10-tool ecosystem
  // Model string format: "provider/model-id" (Mastra ModelRouterModelId)
  const runtimeAgent = new Agent({
    name: 'sellerAgentRuntime',
    instructions: systemPrompt,
    model: 'openai/gpt-4o-mini',
    tools: {
      searchCatalog:     searchCatalogTool,
      checkVariant:      checkVariantTool,
      evaluateDiscount:  evaluateDiscountTool,
      calculateBundle:   calculateBundleTool,
      createPaymentLink: createPaymentLinkTool,
      verifyPayment:     verifyPaymentTool,
      validateDelivery:  validateDeliveryTool,
      trackOrder:        trackOrderTool,
      dispatchInvoice:   dispatchInvoiceTool,
      escalateHuman:     escalateHumanTool,
    },
  } as any);

  // 5. Invoke LLM with just the transcript 
  // (the transcript already contains the latest customer/system message since we logged it prior)
  const result = await runtimeAgent.generate(transcript, {
    requestContext
  });
  const raw = result.text.trim();

  let agentOutput: AgentOutput;
  try {
    const firstBrace = raw.indexOf('{');
    if (firstBrace === -1) throw new Error('No JSON object found in response');
    
    let jsonStr = raw.substring(firstBrace);
    let depth = 0;
    let endIdx = -1;
    for (let i = 0; i < jsonStr.length; i++) {
      if (jsonStr[i] === '{') depth++;
      else if (jsonStr[i] === '}') {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }
    
    if (endIdx === -1) throw new Error('Unbalanced JSON object found in response');
    const finalJson = jsonStr.substring(0, endIdx + 1);
    agentOutput = JSON.parse(finalJson) as AgentOutput;
  } catch (e) {
    console.error('[Runner] Agent JSON parse error:', e);
    console.error('[Runner] Raw output was:', raw);
    // Graceful fallback — send a plain sorry message
    const fallback = "I'm sorry, I ran into a small hiccup. Could you repeat that? 🙏";
    await dispatchStaggeredMessages(customerPhone, [{ text: fallback, delayAfterMs: 500 }]);
    await supabase.from('whatsapp_logs').insert({
      seller_id: seller.id, customer_phone: customerPhone,
      sender_type: 'agent', message_content: fallback
    });
    return;
  }

  // 6. Dispatch staggered text bubbles
  const bubbles = agentOutput.messages.map(m => ({
    text: m.text,
    delayAfterMs: m.delayMs ?? 1500,
  }));

  await dispatchStaggeredMessages(customerPhone, bubbles);

  // 7. Dispatch interactive action (if any)
  const action = agentOutput.interactiveAction;
  if (action) {
    if (action.type === 'quick_reply' && action.buttons) {
      await sendQuickReplyButtons(customerPhone, action.bodyText, action.buttons);
    } else if (action.type === 'payment_cta' && action.url) {
      await sendPaymentCTA(customerPhone, action.bodyText, action.buttonText || 'Pay Now', action.url);
    }
  }

  // 8. Audit log all outbound bubbles
  const outboundContent = [
    ...agentOutput.messages.map(m => m.text),
    ...(action ? [`[Interactive: ${action.type}] ${action.bodyText}`] : [])
  ].join(' | ');

  await supabase.from('whatsapp_logs').insert({
    seller_id: seller.id,
    customer_phone: customerPhone,
    sender_type: 'agent',
    message_content: outboundContent,
  });

  console.log(`[Runner] Agent replied with ${bubbles.length} bubble(s) to ${customerPhone}`);
}
