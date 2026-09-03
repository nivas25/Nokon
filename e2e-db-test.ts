import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Use service role key to bypass RLS for test setup/teardown
const supabase = createClient(supabaseUrl, supabaseKey)

// Test helpers
function assert(condition: boolean, message: string, error?: any) {
  if (!condition) {
    if (error) console.error("Database Error:", error)
    throw new Error(`[FAIL] ${message}`)
  }
  console.log(`[PASS] ${message}`)
}

async function runTests() {
  const testEmail = `test.e2e.${Date.now()}@nokon.app`
  const testPassword = 'TestPassword123!'
  let testUserId: string | null = null
  let testProductId: string | null = null
  let testOrderId: string | null = null

  try {
    console.log("=== STARTING END-TO-END DATABASE TESTS ===")

    // ---------------------------------------------------------
    // PHASE 1: SETUP
    // ---------------------------------------------------------
    console.log("\n[Phase 1] Setting up Test User...")
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    })
    
    assert(!authError && authData.user !== null, "Successfully created test user in auth.users")
    testUserId = authData.user!.id

    const { data: sellerData, error: sellerError } = await supabase.from('sellers').insert({
      id: testUserId,
      email: testEmail,
      full_name: 'Test E2E Seller',
      store_name: 'E2E Boutique',
      niche: 'Testing',
      phone_number: '919999999999',
      youtube_handle: '',
      instagram_handle: '',
      whatsapp_phone_number_id: '',
    }).select().single()

    assert(!sellerError && sellerData?.id === testUserId, "Successfully created profile in public.sellers", sellerError)

    // ---------------------------------------------------------
    // PHASE 2: SELLER TESTS
    // ---------------------------------------------------------
    console.log("\n[Phase 2] Testing Seller Edge Cases...")
    
    // Valid Update
    const { data: updatedSeller, error: updateError } = await supabase
      .from('sellers')
      .update({ store_name: 'Updated E2E Boutique', whatsapp_phone_number_id: '12345' })
      .eq('id', testUserId)
      .select().single()
    
    assert(!updateError && updatedSeller?.store_name === 'Updated E2E Boutique', "Successfully updated seller profile", updateError)

    // Edge Case: Missing required field during update
    const { error: invalidUpdateError } = await supabase
      .from('sellers')
      .update({ store_name: null }) // store_name is NOT NULL
      .eq('id', testUserId)
    
    assert(invalidUpdateError !== null, "Database correctly rejected null for required store_name field")

    // ---------------------------------------------------------
    // PHASE 3: PRODUCT & INVENTORY TESTS
    // ---------------------------------------------------------
    console.log("\n[Phase 3] Testing Product Lifecycle & Edge Cases...")

    // Valid Create
    const { data: productData, error: productError } = await supabase
      .from('products')
      .insert({
        seller_id: testUserId,
        item_code: 'TEST-100',
        name: 'Test Kanchipuram Silk',
        listed_price: 5000,
        floor_price: 4500,
        stock_count: 10,
        available_sizes: ['One Size'],
      }).select().single()

    assert(!productError && productData !== null, "Successfully added new product with full data", productError)
    testProductId = productData!.id

    // Edge Case: Missing required field
    const { error: invalidProductError } = await supabase
      .from('products')
      .insert({
        seller_id: testUserId,
        item_code: 'TEST-101',
        name: 'Missing Price Silk',
        // listed_price is missing
        floor_price: 4500,
      })
    
    assert(invalidProductError !== null, "Database correctly rejected product missing required price")

    // Edge Case: Empty array sizes
    const { data: emptySizesProduct, error: emptySizesError } = await supabase
      .from('products')
      .insert({
        seller_id: testUserId,
        item_code: 'TEST-102',
        name: 'Empty Sizes Silk',
        listed_price: 2000,
        floor_price: 1800,
        available_sizes: [],
      }).select().single()

    assert(!emptySizesError && emptySizesProduct?.available_sizes?.length === 0, "Successfully added product with empty sizes array", emptySizesError)

    // Valid Update (Stock and Price)
    const { data: updatedProduct, error: productUpdateError } = await supabase
      .from('products')
      .update({ stock_count: 5, floor_price: 4600 })
      .eq('id', testProductId)
      .select().single()

    assert(!productUpdateError && updatedProduct?.stock_count === 5 && updatedProduct?.floor_price === 4600, "Successfully updated product stock and price", productUpdateError)

    // Edge Case: Duplicate Item Code
    const { error: dupItemCodeError } = await supabase
      .from('products')
      .insert({
        seller_id: testUserId,
        item_code: 'TEST-100', // Already exists for this seller
        name: 'Duplicate Silk',
        listed_price: 1000,
        floor_price: 900,
      })
    
    assert(dupItemCodeError !== null, "Database correctly rejected duplicate item_code for same seller")

    // ---------------------------------------------------------
    // PHASE 4: ORDER TESTS
    // ---------------------------------------------------------
    console.log("\n[Phase 4] Testing Orders...")

    // Valid Create Order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        seller_id: testUserId,
        product_id: testProductId,
        customer_phone: '918888888888',
        customer_name: 'Test Customer',
        quantity: 1,
        total_amount: 5000,
      }).select().single()
    
    assert(!orderError && orderData !== null, "Successfully created a new order", orderError)
    testOrderId = orderData!.id

    // Valid Update Order Status
    const { data: updatedOrder, error: orderUpdateError } = await supabase
      .from('orders')
      .update({ status: 'PAID' })
      .eq('id', testOrderId)
      .select().single()
    
    assert(!orderUpdateError && updatedOrder?.status === 'PAID', "Successfully updated order status to PAID", orderUpdateError)

    console.log("\n=== ALL E2E DATABASE TESTS PASSED SUCCESSFULLY ===")

  } catch (err: any) {
    console.error(`\n[FATAL ERROR] E2E Tests Failed: ${err.message}`)
  } finally {
    // ---------------------------------------------------------
    // PHASE 5: CLEANUP
    // ---------------------------------------------------------
    console.log("\n[Phase 5] Running Cleanup...")
    if (testUserId) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(testUserId)
      if (deleteError) {
        console.error(`[CLEANUP ERROR] Failed to delete test user: ${deleteError.message}`)
      } else {
        console.log(`[PASS] Successfully deleted test user and all cascade data (Sellers, Products, Orders).`)
      }
    } else {
      console.log("No test user to clean up.")
    }
  }
}

runTests()
