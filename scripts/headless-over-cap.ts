import './load-env.ts'
import { createMemoryStore, setStore } from '../src/lib/store.ts'
import { mastra } from '../src/mastra/index.ts'

async function main() {
  const store = createMemoryStore()
  setStore(store)
  await store.seedDemo()
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
      rawText: '@sareedidi 14 M, max 500',
      buyerId: buyer.id,
      shippingName: 'Asha Reddy',
      shippingAddress: { line1: '12 Film Nagar', city: 'Hyderabad', pincode: '500033' },
    },
  })

  const fresh = await store.getOrder(order.id)
  const audit = await store.listAudit(order.id)
  const razorpayCreates = audit.filter((a) => a.reason === 'PAYMENT_LINK_CREATED')
  const blocked = audit.find((a) => a.reason === 'BLOCKED_OVER_CAP')

  console.log(
    JSON.stringify(
      {
        workflowStatus: result.status,
        workflowResult: result.status === 'success' ? result.result : result.status,
        orderStatus: fresh?.status,
        blockReason: fresh?.block_reason,
        razorpayPaymentLinkId: fresh?.razorpay_payment_link_id,
        razorpayCreates: razorpayCreates.length,
        blockedAudit: blocked?.reason ?? null,
      },
      null,
      2,
    ),
  )

  if (fresh?.status !== 'blocked' || fresh.block_reason !== 'OVER_CAP') {
    throw new Error(`expected blocked OVER_CAP, got ${fresh?.status} ${fresh?.block_reason}`)
  }
  if (razorpayCreates.length !== 0 || fresh.razorpay_payment_link_id) {
    throw new Error('Razorpay create happened on over-cap path')
  }
  if (!blocked) throw new Error('missing BLOCKED_OVER_CAP audit row')
  console.log('HEADLESS_OVER_CAP_OK')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
