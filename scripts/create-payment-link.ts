/**
 * Step 3: Razorpay headless — create a Standard Payment Link for ₹999 after the TypeScript gate.
 * Does not create a link if the gate fails.
 */
import './load-env.ts'
import { evaluateOrderGate } from '../src/lib/gates.ts'
import { DEMO_ITEM } from '../src/lib/types.ts'
import { createStandardPaymentLink } from '../src/lib/razorpay/client.ts'

async function main() {
  const capPaise = Number(process.env.CAP_PAISE ?? '120000')
  const gate = evaluateOrderGate({
    shopFound: true,
    itemFound: true,
    itemActive: true,
    catalogPricePaise: DEMO_ITEM.pricePaise,
    capPaise,
    stock: DEMO_ITEM.stock,
    size: 'M',
    sizes: DEMO_ITEM.sizes,
    shippingName: 'Asha Reddy',
    shippingAddress: { city: 'Hyderabad' },
  })

  if (!gate.ok) {
    console.log(
      JSON.stringify(
        {
          blocked: true,
          reason: gate.reason,
          message: gate.message,
          willCreateRazorpayCharge: false,
        },
        null,
        2,
      ),
    )
    process.exit(2)
  }

  const orderId = crypto.randomUUID()
  const link = await createStandardPaymentLink({
    orderId,
    amountPaise: DEMO_ITEM.pricePaise,
    itemCode: DEMO_ITEM.itemCode,
    customerName: 'Asha Reddy',
  })
  console.log('PAYMENT_LINK_OK')
  console.log(
    JSON.stringify(
      {
        nokonOrderId: orderId,
        amountPaise: DEMO_ITEM.pricePaise,
        paymentLinkId: link.id,
        url: link.shortUrl,
        razorpayOrderId: link.orderId,
        expireBy: link.expireBy,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
