const getBaseUrl = () => `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
const getHeaders = () => ({
  'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
});

/**
 * Sends a 'typing_on' indicator to the specified WhatsApp number.
 */
export async function sendTypingIndicator(to: string) {
  try {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'system',
      sender_action: 'typing_on'
    };

    const response = await fetch(getBaseUrl(), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      // Silently catch so we don't crash the stagger sequence if Meta requires a message_id 
      // or throws an OAuth restriction error.
    }
  } catch (e) {
    // Silent catch
  }
}

/**
 * Dispatches an array of staggered text messages.
 */
export async function dispatchStaggeredMessages(to: string, bubbles: Array<{ text: string; delayAfterMs?: number }>) {
  for (const bubble of bubbles) {
    await sendTypingIndicator(to);
    
    // Wait for the specified delay, or a default 1500ms
    const delay = bubble.delayAfterMs ?? 1500;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: bubble.text
      }
    };

    const response = await fetch(getBaseUrl(), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to dispatch text message:', errorData);
    }
  }
}

/**
 * Dispatches a message with up to 3 quick reply buttons.
 */
export async function sendQuickReplyButtons(to: string, bodyText: string, buttons: Array<{ id: string; title: string }>) {
  if (buttons.length > 3) {
    console.warn(`WhatsApp allows a maximum of 3 buttons. Received ${buttons.length}. Slicing to first 3.`);
    buttons = buttons.slice(0, 3);
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: bodyText
      },
      action: {
        buttons: buttons.map(btn => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.title
          }
        }))
      }
    }
  };

  const response = await fetch(getBaseUrl(), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Failed to send quick reply buttons:', errorData);
  }
}

/**
 * Dispatches an interactive CTA URL button (e.g. for Razorpay checkout).
 */
export async function sendPaymentCTA(to: string, bodyText: string, buttonText: string, url: string) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'cta_url',
      body: {
        text: bodyText
      },
      action: {
        name: 'cta_url',
        parameters: {
          display_text: buttonText,
          url: url
        }
      }
    }
  };

  const response = await fetch(getBaseUrl(), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Failed to send CTA button:', errorData);
  }
}
