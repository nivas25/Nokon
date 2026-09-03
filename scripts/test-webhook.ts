import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function testWebhook() {
  const payload = {
    "object": "whatsapp_business_account",
    "entry": [
      {
        "id": "1234567890",
        "changes": [
          {
            "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                "display_phone_number": "918888888888",
                "phone_number_id": "10987654321" // Matches our dummy seller
              },
              "contacts": [
                {
                  "profile": {
                    "name": "Test Customer"
                  },
                  "wa_id": "919988776655" // Matches our dummy order in DB
                }
              ],
              "messages": [
                {
                  "from": "+919988776655", // Same customer
                  "id": "wamid.123",
                  "timestamp": Date.now().toString(),
                  "type": "text",
                  "text": {
                    "body": "Can you give me a discount on this saree please?"
                  }
                }
              ]
            },
            "field": "messages"
          }
        ]
      }
    ]
  }

  console.log("Sending webhook payload...")
  
  const res = await fetch('http://localhost:3000/api/whatsapp-webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  console.log("Status:", res.status)
  const text = await res.text()
  console.log("Response:", text)
}

testWebhook()
