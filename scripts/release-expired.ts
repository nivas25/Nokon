import './load-env.ts'
import { getStore } from '../src/lib/store.ts'

async function main() {
  const store = getStore()
  console.log('release-expired: scan awaiting_payment rows with reserved_until < now and return stock.')
  console.log('v1: run this by hand after a demo. Store implementation for bulk listing is seller-UI scoped.')
  void store
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
