export async function sendWhatsAppMessage(to: string, message: string) {
  const url = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'text',
      text: {
        preview_url: false,
        body: message,
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('❌ Failed to send WhatsApp message:', data);
    throw new Error(data.error?.message || 'Failed to send message');
  }

  return data;
}

export async function downloadWhatsAppMedia(imageId: string): Promise<string> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  
  // 1. Get the media URL from the image ID
  const urlRes = await fetch(`https://graph.facebook.com/v21.0/${imageId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!urlRes.ok) {
    throw new Error(`Failed to get media URL for ${imageId}`);
  }
  
  const urlData = await urlRes.json();
  const mediaUrl = urlData.url;
  
  // 2. Download the binary data from the media URL
  const mediaRes = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!mediaRes.ok) {
    throw new Error(`Failed to download media bytes for ${imageId}`);
  }
  
  // 3. Convert array buffer to base64
  const arrayBuffer = await mediaRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

export async function sendAddressRequestMessage(to: string, message: string) {
  const url = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'address_message',
        body: {
          text: message
        },
        action: {
          name: 'address_message',
          parameters: {
            country: 'IN'
          }
        }
      }
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('❌ Failed to send WhatsApp address message:', data);
    throw new Error(data.error?.message || 'Failed to send address request');
  }

  return data;
}
