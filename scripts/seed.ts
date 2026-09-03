import './load-env.ts'
import { createClient } from '@supabase/supabase-js'
import { DEMO_ITEM, DEMO_SELLER } from '../src/lib/types.ts'
import { normalizeYoutubeHandle } from '../src/lib/handles.ts'
import { runPgliteSchemaSmoke } from './verify-schema.ts'

function hasSupabaseAdminEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
}

async function seedSupabase() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const handle = normalizeYoutubeHandle(`@${DEMO_SELLER.youtubeHandle}`)
  if (!handle) throw new Error('invalid demo handle')

  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .upsert(
      {
        shop_name: DEMO_SELLER.shopName,
        youtube_handle: handle,
        city: DEMO_SELLER.city,
      },
      { onConflict: 'youtube_handle' },
    )
    .select('id, shop_name, youtube_handle')
    .single()

  if (sellerError || !seller) {
    throw new Error(`seller upsert failed: ${sellerError?.message ?? 'no row'}`)
  }

  const { data: item, error: itemError } = await supabase
    .from('items')
    .upsert(
      {
        seller_id: seller.id,
        item_code: DEMO_ITEM.itemCode,
        title: DEMO_ITEM.title,
        price_paise: DEMO_ITEM.pricePaise,
        stock: DEMO_ITEM.stock,
        sizes: DEMO_ITEM.sizes,
        is_active: true,
      },
      { onConflict: 'seller_id,item_code' },
    )
    .select('id, item_code, price_paise, stock, sizes')
    .single()

  if (itemError || !item) {
    throw new Error(`item upsert failed: ${itemError?.message ?? 'no row'}`)
  }

  const { data: verify, error: verifyError } = await supabase
    .from('items')
    .select('item_code, price_paise, stock, sellers!inner(shop_name, youtube_handle)')
    .eq('item_code', DEMO_ITEM.itemCode)
    .eq('sellers.youtube_handle', handle)
    .single()

  if (verifyError || !verify) {
    throw new Error(`verify select failed: ${verifyError?.message ?? 'no row'}`)
  }

  console.log('SEED_OK supabase')
  console.log(JSON.stringify({ seller, item, verify }, null, 2))
}

async function main() {
  if (hasSupabaseAdminEnv()) {
    await seedSupabase()
    return
  }
  console.log(
    'No NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Skipping cloud seed.',
  )
  console.log('Apply docs/schema.sql in the Supabase SQL editor, then re-run with env set.')
  console.log('Running local PGlite schema smoke test instead…')
  await runPgliteSchemaSmoke()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
