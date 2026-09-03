/**
 * Compiles docs/schema.sql against PGlite (in-process Postgres).
 * This is a syntax + seed smoke test when Docker / cloud Supabase is not up.
 * Production truth is still Supabase — apply the same file in the SQL editor.
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { DEMO_ITEM, DEMO_SELLER } from '../src/lib/types.ts'
import { normalizeYoutubeHandle } from '../src/lib/handles.ts'

export async function runPgliteSchemaSmoke() {
  const sqlPath = resolve(process.cwd(), 'docs/schema.sql')
  const sql = await readFile(sqlPath, 'utf8')
  const db = new PGlite()

  try {
    await db.exec(sql)
  } catch (error) {
    console.error('schema.sql failed on PGlite:')
    console.error(error)
    process.exit(1)
  }

  const handle = normalizeYoutubeHandle(`@${DEMO_SELLER.youtubeHandle}`)
  if (!handle) {
    throw new Error('demo handle failed to normalize')
  }

  await db.query(
    `insert into public.sellers (shop_name, youtube_handle, city)
     values ($1, $2, $3)
     on conflict (youtube_handle) do update
       set shop_name = excluded.shop_name,
           city = excluded.city`,
    [DEMO_SELLER.shopName, handle, DEMO_SELLER.city],
  )

  const seller = await db.query<{ id: string }>(
    `select id from public.sellers where youtube_handle = $1`,
    [handle],
  )
  const sellerId = seller.rows[0]?.id
  if (!sellerId) throw new Error('seller insert did not return id')

  await db.query(
    `insert into public.items (seller_id, item_code, title, price_paise, stock, sizes, is_active)
     values ($1, $2, $3, $4, $5, $6, true)
     on conflict (seller_id, item_code) do update
       set title = excluded.title,
           price_paise = excluded.price_paise,
           stock = excluded.stock,
           sizes = excluded.sizes,
           is_active = true`,
    [
      sellerId,
      DEMO_ITEM.itemCode,
      DEMO_ITEM.title,
      DEMO_ITEM.pricePaise,
      DEMO_ITEM.stock,
      DEMO_ITEM.sizes,
    ],
  )

  const check = await db.query<{
    shop_name: string
    youtube_handle: string
    item_code: string
    price_paise: number
    stock: number
  }>(
    `select s.shop_name, s.youtube_handle, i.item_code, i.price_paise, i.stock
     from public.items i
     join public.sellers s on s.id = i.seller_id
     where s.youtube_handle = $1 and i.item_code = $2`,
    [handle, DEMO_ITEM.itemCode],
  )

  const row = check.rows[0]
  if (!row) throw new Error('select after seed returned 0 rows')
  if (row.price_paise !== 99900) throw new Error(`price_paise expected 99900 got ${row.price_paise}`)
  if (row.stock !== 2) throw new Error(`stock expected 2 got ${row.stock}`)

  const reserved = await db.query<{ reserve_item_stock: number }>(
    `select public.reserve_item_stock($1) as reserve_item_stock`,
    [
      (
        await db.query<{ id: string }>(
          `select id from public.items where seller_id = $1 and item_code = $2`,
          [sellerId, DEMO_ITEM.itemCode],
        )
      ).rows[0]!.id,
    ],
  )
  if (reserved.rows[0]?.reserve_item_stock !== 1) {
    throw new Error(`reserve should leave stock 1, got ${reserved.rows[0]?.reserve_item_stock}`)
  }

  console.log('SCHEMA_OK')
  console.log(
    JSON.stringify(
      {
        shop: row.shop_name,
        handle: row.youtube_handle,
        item: row.item_code,
        price_paise: row.price_paise,
        stock_after_seed: row.stock,
        stock_after_reserve: reserved.rows[0]?.reserve_item_stock,
      },
      null,
      2,
    ),
  )
  await db.close()
}

const isDirect = process.argv[1]?.includes('verify-schema')
if (isDirect) {
  runPgliteSchemaSmoke().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
