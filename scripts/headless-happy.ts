import './load-env.ts'
import { createMemoryStore, setStore } from '../src/lib/store.ts'
import { mastra } from '../src/mastra/index.ts'

async function main() {
  const store = createMemoryStore()
  setStore(store)
  const { item } = await store.seedDemo()
  const stockBefore = item.stock
  const buyer = await store.createBuyer('Demo son')
  const order = await store.createOrder({
    buyer_id: buyer.id,
    catalog_price_paise: 0,
    status: 'started',
    shipping_name: 'Asha Reddy',
    shipping_address: { line1: '12 Film Nagar', city: 'Hyderabad', pincode: '500033' },
  })

  const workflow = mastra.getWorkflow('orderFromScreenshot')
  const run = await workflow.createRun()
  await store.updateOrder(order.id, { mastra_run_id: run.runId })

  const result = await run.start({
    initialState: { orderId: order.id },
    inputData: {
      orderId: order.id,
      rawText: '@sareedidi 14 M, max 1200',
      buyerId: buyer.id,
      shippingName: 'Asha Reddy',
      shippingAddress: { line1: '12 Film Nagar', city: 'Hyderabad', pincode: '500033' },
    },
  })

  const fresh = await store.getOrder(order.id)
  const after = await store.getItemById(item.id)
  console.log(
    JSON.stringify(
      {
        workflowStatus: result.status,
        workflowResult: result.status === 'success' ? result.result : result,
        orderStatus: fresh?.status,
        blockReason: fresh?.block_reason,
        paymentLinkUrl: fresh?.razorpay_payment_link_url,
        paymentLinkId: fresh?.razorpay_payment_link_id,
        stockBefore,
        stockAfterReserve: after?.stock,
      },
      null,
      2,
    ),
  )

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET (rzp_test_…) to create a real test Payment Link.')
    process.exit(1)
  }

  if (fresh?.status !== 'awaiting_payment' || !fresh.razorpay_payment_link_url) {
    throw new Error(`expected awaiting_payment with link, got ${fresh?.status}`)
  }
  if (after?.stock !== stockBefore - 1) {
    throw new Error(`expected stock ${stockBefore - 1} after reserve, got ${after?.stock}`)
  }
  console.log('HEADLESS_HAPPY_OK')
  console.log(fresh.razorpay_payment_link_url)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
