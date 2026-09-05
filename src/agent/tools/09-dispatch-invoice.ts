import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import path from 'path';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const dispatchInvoiceTool = createTool({
  id: 'dispatch-invoice',
  description: 'Generates a premium PDF payment receipt and dispatches it to the customer via WhatsApp.',
  inputSchema: z.object({
    customerName: z.string().describe('The full name of the customer provided for shipping'),
    shippingAddress: z.string().describe('The full shipping address provided by the customer')
  }),
  execute: async ({ customerName, shippingAddress }, executeContext) => {
    const { sellerId, customerPhone, orderId } = (executeContext.requestContext?.all as any) || {};
    if (!sellerId || !customerPhone || !orderId) throw new Error('Missing required context for dispatchInvoiceTool');

    // 1. Fetch Order and Seller Details
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*, products(name)')
      .eq('id', orderId)
      .eq('seller_id', sellerId)
      .single();

    if (orderErr || !order) return { success: false, error: 'Order not found.' };

    const { data: seller, error: sellerErr } = await supabase
      .from('sellers')
      .select('store_name, phone_number, address')
      .eq('id', sellerId)
      .single();

    if (sellerErr || !seller) return { success: false, error: 'Seller profile not found.' };

    const itemName = Array.isArray(order.products) ? order.products[0]?.name : (order.products as any)?.name || 'Product';
    const finalCustomerName = customerName || order.customer_name || 'Valued Customer';
    
    // Update order with customer name, shipping address and status
    const { error: updateErr } = await supabase
      .from('orders')
      .update({ 
        customer_name: finalCustomerName,
        shipping_address: shippingAddress,
        status: 'PROCESSING'
      })
      .eq('id', orderId);

    if (updateErr) console.error('Failed to update shipping address:', updateErr);

    // 2. Generate Premium PDF Buffer using PDFKit
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 0, size: 'A4', autoFirstPage: true });
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // --- REGISTER FONTS ---
        let fontRegular = 'Helvetica';
        let fontBold = 'Helvetica-Bold';
        try {
          const soraRegular = path.join(process.cwd(), 'node_modules', '@fontsource', 'sora', 'files', 'sora-latin-400-normal.woff');
          const soraBold = path.join(process.cwd(), 'node_modules', '@fontsource', 'sora', 'files', 'sora-latin-700-normal.woff');
          doc.registerFont('Sora', soraRegular);
          doc.registerFont('Sora-Bold', soraBold);
          fontRegular = 'Sora';
          fontBold = 'Sora-Bold';
        } catch (e) {
          console.warn('Sora font not found, falling back to Helvetica');
        }

        // --- COLORS & LAYOUT CONSTANTS ---
        doc.info['Title'] = `Payment Receipt - ${order.id}`;
        const primaryColor  = '#0F0B40'; // Nokon deep indigo
        const accentColor   = '#4F46E5'; // Brand purple
        const mutedColor    = '#6B7280'; // Gray for labels
        const dividerColor  = '#E5E7EB';
        const bgHeader      = '#F5F5FF'; // Very light indigo tint
        const pageW         = 595.28;
        const pageH         = 841.89;
        const marginX       = 48;
        const rightEdge     = pageW - marginX;

        // =============================================
        // SECTION 1 — HEADER BAND (Y: 0–160)
        // =============================================
        doc.rect(0, 0, pageW, 160).fill(bgHeader);

        // TOP-LEFT: Store name + address + phone
        doc.font(fontBold).fontSize(18).fillColor(primaryColor)
           .text(seller.store_name, marginX, 40, { lineBreak: false });
        doc.font(fontRegular).fontSize(9).fillColor(mutedColor)
           .text(seller.address || 'Online Store', marginX, 64, { lineBreak: false });
        doc.font(fontRegular).fontSize(9).fillColor(mutedColor)
           .text(`Tel: ${seller.phone_number}`, marginX, 78, { lineBreak: false });

        // TOP-RIGHT: "RECEIPT" label
        doc.font(fontBold).fontSize(32).fillColor(accentColor)
           .text('RECEIPT', 0, 40, { align: 'right', width: rightEdge });

        // Accent bar at the bottom of the header band
        doc.rect(0, 158, pageW, 3).fill(accentColor);

        // =============================================
        // SECTION 2 — BILLED TO / RECEIPT META (Y: 178–310)
        // =============================================
        const secY = 185;

        // LEFT: Billed To
        doc.font(fontBold).fontSize(8).fillColor(mutedColor)
           .text('BILLED TO', marginX, secY, { lineBreak: false });
        doc.font(fontBold).fontSize(15).fillColor(primaryColor)
           .text(finalCustomerName, marginX, secY + 16, { lineBreak: false });
        doc.font(fontRegular).fontSize(9).fillColor(mutedColor)
           .text(`+${customerPhone}`, marginX, secY + 38, { lineBreak: false });
        doc.font(fontRegular).fontSize(9).fillColor(mutedColor)
           .text(shippingAddress, marginX, secY + 53, { width: 240, lineBreak: true });

        // RIGHT: Receipt Meta table
        const metaLabelX  = 355;
        const metaValueX  = 445;
        const metaValW    = rightEdge - metaValueX;

        const printMeta = (label: string, value: string, y: number) => {
          doc.font(fontBold).fontSize(8).fillColor(mutedColor)
             .text(label, metaLabelX, y, { lineBreak: false });
          doc.font(fontRegular).fontSize(9).fillColor(primaryColor)
             .text(value, metaValueX, y, { width: metaValW, align: 'right', lineBreak: false });
        };

        printMeta('Receipt No:', `#${order.id.slice(0, 8).toUpperCase()}`, secY);
        printMeta('Date:', new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), secY + 20);
        printMeta('Order ID:', order.id.slice(0, 8).toUpperCase() + '...', secY + 40);
        printMeta('Payment:', 'Razorpay Secure', secY + 60);

        // =============================================
        // SECTION 3 — ITEM TABLE (Y: 310–430)
        // =============================================
        const tblTop = 318;
        const col1   = marginX;
        const col2   = 310;
        const col3   = 380;
        const col4   = 460;

        // Table header background
        doc.rect(marginX, tblTop, pageW - marginX * 2, 28).fill('#EDEDFF');

        // Table column headers
        doc.font(fontBold).fontSize(9).fillColor(primaryColor);
        doc.text('Item Description', col1 + 8,  tblTop + 9, { lineBreak: false });
        doc.text('Qty',              col2,       tblTop + 9, { width: 55, align: 'right', lineBreak: false });
        doc.text('Unit Price',       col3,       tblTop + 9, { width: 68, align: 'right', lineBreak: false });
        doc.text('Total',            col4,       tblTop + 9, { width: rightEdge - col4, align: 'right', lineBreak: false });

        // Divider after header
        doc.moveTo(marginX, tblTop + 28).lineTo(rightEdge, tblTop + 28)
           .lineWidth(0.5).strokeColor(dividerColor).stroke();

        // Item row
        const rowY      = tblTop + 46;
        const sizeText  = order.selected_size ? ` — Size: ${order.selected_size}` : '';
        const fullDesc  = `${itemName}${sizeText}`;
        const unitPrice = (order.total_amount / order.quantity).toFixed(2);
        const rupee     = 'INR ';

        doc.font(fontBold).fontSize(10).fillColor(primaryColor)
           .text(fullDesc, col1 + 8, rowY, { width: col2 - col1 - 16, lineBreak: false });
        doc.font(fontRegular).fontSize(10).fillColor(mutedColor)
           .text(order.quantity.toString(), col2, rowY, { width: 55, align: 'right', lineBreak: false });
        doc.font(fontRegular).fontSize(10).fillColor(mutedColor)
           .text(`${rupee}${unitPrice}`, col3, rowY, { width: 68, align: 'right', lineBreak: false });
        doc.font(fontBold).fontSize(10).fillColor(primaryColor)
           .text(`${rupee}${order.total_amount.toFixed(2)}`, col4, rowY, { width: rightEdge - col4, align: 'right', lineBreak: false });

        // Bottom row divider
        doc.moveTo(marginX, rowY + 26).lineTo(rightEdge, rowY + 26)
           .lineWidth(0.5).strokeColor(dividerColor).stroke();

        // =============================================
        // SECTION 4 — PAYMENT SUMMARY (Y: ~470)
        // =============================================
        const sumTop = rowY + 46;

        // LEFT: Payment status details
        doc.font(fontBold).fontSize(9).fillColor(primaryColor)
           .text('Payment Details', col1, sumTop, { lineBreak: false });

        const detail = (label: string, value: string, y: number) => {
          doc.font(fontRegular).fontSize(9).fillColor(mutedColor)
             .text(`${label}:`, col1, y, { lineBreak: false });
          doc.font(fontRegular).fontSize(9).fillColor(primaryColor)
             .text(value, col1 + 110, y, { lineBreak: false });
        };

        detail('Status',         'PAID',                                    sumTop + 16);
        detail('Method',         'Razorpay Secure',                         sumTop + 30);
        detail('Transaction ID', order.razorpay_payment_id || 'N/A',        sumTop + 44);
        detail('Razorpay Order', order.razorpay_order_id   || 'N/A',        sumTop + 58);

        // RIGHT: Amount paid accent box
        const amtBoxX = 350;
        const amtBoxY = sumTop - 6;
        const amtBoxW = rightEdge - amtBoxX;
        doc.rect(amtBoxX, amtBoxY, amtBoxW, 80).fill('#F0F0FF');

        doc.font(fontRegular).fontSize(9).fillColor(mutedColor)
           .text('Amount Paid', amtBoxX + 14, amtBoxY + 12, { lineBreak: false });
        doc.font(fontBold).fontSize(20).fillColor(accentColor)
           .text(`${rupee}${order.total_amount.toFixed(2)}`, amtBoxX + 14, amtBoxY + 28, { width: amtBoxW - 28, lineBreak: false });
        doc.font(fontRegular).fontSize(8).fillColor(mutedColor)
           .text('Payment Confirmed', amtBoxX + 14, amtBoxY + 60, { lineBreak: false });

        // =============================================
        // SECTION 5 — FOOTER (Y: pageH - 80)
        // =============================================
        const footerY = pageH - 80;

        doc.moveTo(marginX, footerY).lineTo(rightEdge, footerY)
           .lineWidth(0.5).strokeColor(dividerColor).stroke();

        // Centered: Thank you
        doc.font(fontBold).fontSize(11).fillColor(primaryColor)
           .text('Thank you for your purchase!', 0, footerY + 12, { align: 'center', width: pageW });
        doc.font(fontRegular).fontSize(8).fillColor(mutedColor)
           .text('This is a computer-generated receipt and does not require a signature.', 0, footerY + 28, { align: 'center', width: pageW });

        // Centered: Small Nokon watermark
        try {
          const logoPath = path.join(process.cwd(), 'public', 'logo.png');
          doc.image(logoPath, (pageW / 2) - 28, footerY + 44, { width: 56 });
        } catch (e) {
          doc.font(fontRegular).fontSize(8).fillColor('#9CA3AF')
             .text('Powered by Nokon', 0, footerY + 50, { align: 'center', width: pageW });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });

    // 3. Upload to Supabase Storage
    const uniqueSuffix = Date.now();
    const fileName = `invoices/${sellerId}/${orderId}_${uniqueSuffix}.pdf`;
    
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('products')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadErr) {
      console.error('Failed to upload invoice PDF to Supabase:', uploadErr);
      return { success: false, error: 'Failed to upload invoice.' };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('products')
      .getPublicUrl(fileName);

    // 4. Dispatch via WhatsApp
    try {
      const waToken = process.env.WHATSAPP_ACCESS_TOKEN;
      const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID; 
      
      const res = await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: customerPhone,
          type: 'document',
          document: {
            link: publicUrl,
            caption: 'Here is your official payment receipt for your order.',
            filename: `Nokon_Receipt_${orderId.slice(0,8).toUpperCase()}.pdf`
          }
        })
      });

      if (!res.ok) {
        console.warn('WhatsApp API media dispatch failed, sending text fallback');
        await sendWhatsAppMessage(customerPhone, `Here is your official payment receipt for your order: ${publicUrl}`);
      }

      return { success: true, message: 'PDF invoice successfully sent to the customer. Acknowledge the order is processing, but DO NOT output the raw URL link in your chat response.' };
    } catch (e) {
      console.error('Failed to dispatch receipt via WhatsApp:', e);
      return { success: false, error: 'Failed to dispatch receipt' };
    }
  }
});
