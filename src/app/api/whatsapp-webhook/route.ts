import { NextResponse } from 'next/server';
import { sendWhatsAppMessage, downloadWhatsAppMedia } from '@/lib/whatsapp';
import { extractDetailsFromImage } from '@/lib/vision';
import { mastra } from '@/mastra';
import { RequestContext } from '@mastra/core/request-context';
import { createClient } from '@supabase/supabase-js';

// Setup admin client to bypass RLS in webhook
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 1. VERIFICATION (Meta calls this once to verify your URL)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("✅ Webhook verified by Meta!");
    return new NextResponse(challenge, { status: 200 });
  }

  console.error("❌ Webhook verification failed.");
  return new NextResponse("Forbidden", { status: 403 });
}

// 2. INCOMING MESSAGES (Meta posts buyer messages here)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    // IDENTIFY TENANT (SELLER)
    const phoneNumberId = value?.metadata?.phone_number_id;
    if (!phoneNumberId) return new NextResponse("OK", { status: 200 });

    const { data: seller } = await supabase
      .from('sellers')
      .select('*')
      .eq('whatsapp_phone_number_id', phoneNumberId)
      .single();

    if (!seller) {
      console.log(`No tenant found for phone number ID: ${phoneNumberId}`);
      return new NextResponse("OK", { status: 200 });
    }

    if (message) {
      const customerPhone = message.from; // e.g. "919538389193"
      const messageType = message.type;
      const customerName = value?.contacts?.[0]?.profile?.name || "Customer";

      const sellerAgent = mastra.getAgent('sellerAgent');

      if (messageType === 'text') {
        const textBody = message.text?.body;
        console.log(`💬 Received text from ${customerPhone} to Seller ${seller.store_name}: "${textBody}"`);

        // Log incoming message
        await supabase.from('whatsapp_logs').insert({
          seller_id: seller.id,
          customer_phone: customerPhone,
          sender_type: 'customer',
          message_content: textBody,
        });

        // Find active order for this customer
        const { data: activeOrder } = await supabase
          .from('orders')
          .select('*')
          .eq('seller_id', seller.id)
          .eq('customer_phone', customerPhone)
          .in('status', ['PENDING_PAYMENT', 'PROCESSING'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!activeOrder) {
          const replyText = `Namaste ${customerName}! Welcome to ${seller.store_name}. Please send a screenshot of a Saree reel to start your order!`;
          await sendWhatsAppMessage(customerPhone, replyText);
          
          await supabase.from('whatsapp_logs').insert({
            seller_id: seller.id,
            customer_phone: customerPhone,
            sender_type: 'agent',
            message_content: replyText,
          });
        } else {
          // Get conversation history from whatsapp_logs
          const { data: logs } = await supabase
            .from('whatsapp_logs')
            .select('*')
            .eq('seller_id', seller.id)
            .eq('customer_phone', customerPhone)
            .order('created_at', { ascending: true })
            .limit(10); // Last 10 messages for context

          const transcript = logs?.map(log => `${log.sender_type === 'customer' ? 'Customer' : 'Agent'}: ${log.message_content}`).join('\n') || '';

          const sellerContext = new RequestContext(Object.entries({
            orderId: activeOrder.id,
            itemId: activeOrder.product_id || '',
            itemCode: activeOrder.item_code || '',
            youtubeHandle: seller.youtube_handle || '',
            globalAgentPrompt: seller.global_agent_prompt || '',
            storeName: seller.store_name || ''
          }));

          const sellerRes = await sellerAgent.generate(transcript, { requestContext: sellerContext });
          
          await sendWhatsAppMessage(customerPhone, sellerRes.text);

          await supabase.from('whatsapp_logs').insert({
            seller_id: seller.id,
            customer_phone: customerPhone,
            sender_type: 'agent',
            message_content: sellerRes.text,
          });
        }

      } else if (messageType === 'image') {
        const imageId = message.image?.id;
        console.log(`📸 Received screenshot with ID: ${imageId}`);
        
        await sendWhatsAppMessage(customerPhone, `Scanning your screenshot... One second!`);

        (async () => {
          try {
            const base64 = await downloadWhatsAppMedia(imageId);
            const details = await extractDetailsFromImage(base64);
            
            if (!details.itemCode) {
              const reply = "I couldn't identify the product code in that image. Could you send a clearer screenshot?";
              await sendWhatsAppMessage(customerPhone, reply);
              await supabase.from('whatsapp_logs').insert({
                seller_id: seller.id,
                customer_phone: customerPhone,
                sender_type: 'agent',
                message_content: reply,
              });
              return;
            }

            // Look up product in seller's inventory
            const { data: product } = await supabase
              .from('products')
              .select('*')
              .eq('seller_id', seller.id)
              .eq('item_code', details.itemCode)
              .single();

            if (!product) {
              const reply = `Sorry, I couldn't find item code ${details.itemCode} in ${seller.store_name}'s inventory!`;
              await sendWhatsAppMessage(customerPhone, reply);
              await supabase.from('whatsapp_logs').insert({
                seller_id: seller.id,
                customer_phone: customerPhone,
                sender_type: 'agent',
                message_content: reply,
              });
              return;
            }

            // Create order
            const { data: order, error: orderError } = await supabase
              .from('orders')
              .insert({
                seller_id: seller.id,
                product_id: product.id,
                customer_phone: customerPhone,
                customer_name: customerName,
                selected_size: details.size || null,
                quantity: 1,
                total_amount: product.listed_price,
                status: 'PENDING_PAYMENT'
              }).select().single();

            if (orderError || !order) {
              console.error("Order creation failed", orderError);
              throw new Error("Order creation failed");
            }

            const initialSystemPrompt = `Customer uploaded an image. Product: ${product.name} (Code: ${product.item_code}). Size requested: ${details.size || 'Unknown'}. Listed Price: ₹${product.listed_price}. Greet them enthusiastically and help them complete the order!`;
            
            // Log customer image message
            await supabase.from('whatsapp_logs').insert({
              seller_id: seller.id,
              customer_phone: customerPhone,
              sender_type: 'customer',
              message_content: '[Image Attachment]',
              intent_detected: 'product_inquiry'
            });

            const sellerContext = new RequestContext(Object.entries({
              orderId: order.id,
              itemCode: product.item_code,
              youtubeHandle: seller.youtube_handle || '',
              globalAgentPrompt: seller.global_agent_prompt || '',
              storeName: seller.store_name || ''
            }));

            const sellerRes = await sellerAgent.generate(initialSystemPrompt, { requestContext: sellerContext });
            
            await sendWhatsAppMessage(customerPhone, sellerRes.text);

            await supabase.from('whatsapp_logs').insert({
              seller_id: seller.id,
              customer_phone: customerPhone,
              sender_type: 'agent',
              message_content: sellerRes.text,
            });

          } catch (e) {
            console.error("Image processing error:", e);
            await sendWhatsAppMessage(customerPhone, "Sorry, I ran into an error processing your screenshot.");
          }
        })();
      }
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook parse error:", error);
    return new NextResponse("Error parsing body", { status: 500 });
  }
}
