import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Sync Orders from Shopify
 * Fetches all orders from Shopify and stores them in the database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { store_id } = body;

    console.log('📦 Order sync started for store_id:', store_id);

    if (!store_id) {
      console.error('❌ Missing store_id');
      return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get store with access token
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('shop_domain, access_token')
      .eq('id', store_id)
      .single();

    if (storeError || !store) {
      console.error('❌ Store not found:', storeError);
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    console.log('🏪 Store found:', store.shop_domain);

    // Check if access token is valid
    if (!store.access_token || store.access_token === '' || store.access_token === 'revoked') {
      console.error('❌ Invalid or missing access token');
      return NextResponse.json({
        error: 'No valid access token. Please reinstall the app to authorize.',
        needsReauth: true
      }, { status: 401 });
    }

    // Get store settings for fee calculations
    const { data: settings } = await supabase
      .from('store_settings')
      .select('*')
      .eq('store_id', store_id)
      .single();

    const defaultCogsPercentage = settings?.default_cogs_percentage || 30;
    const paymentProcessingRate = settings?.payment_processing_rate || 0.029;
    const paymentProcessingFixed = settings?.payment_processing_fixed || 0.30;
    const shopifyFeeRate = settings?.shopify_fee_rate || 0.02;

    // Fetch orders from Shopify (last 90 days)
    let allOrders: any[] = [];
    let pageInfo: string | null = null;
    let hasNextPage = true;

    while (hasNextPage) {
      // Use fields parameter to only request non-protected data (no customer info)
      const fields = 'id,order_number,name,subtotal_price,total_price,total_tax,total_discounts,total_shipping_price_set,shipping_lines,line_items,financial_status,fulfillment_status,created_at';
      const url: string = pageInfo
        ? `https://${store.shop_domain}/admin/api/2024-10/orders.json?limit=250&status=any&page_info=${pageInfo}&fields=${fields}`
        : `https://${store.shop_domain}/admin/api/2024-10/orders.json?limit=250&status=any&created_at_min=${new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()}&fields=${fields}`;

      console.log('📡 Fetching orders from Shopify...');

      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': store.access_token,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Shopify response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Shopify API error:', response.status, errorText);
        return NextResponse.json({
          error: 'Shopify API error',
          status: response.status,
          details: errorText
        }, { status: 500 });
      }

      const data = await response.json();
      allOrders = [...allOrders, ...data.orders];

      // Check for pagination
      const linkHeader = response.headers.get('Link');
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match = linkHeader.match(/page_info=([^>]+)>; rel="next"/);
        pageInfo = match ? match[1] : null;
        hasNextPage = !!pageInfo;
      } else {
        hasNextPage = false;
      }
    }

    console.log('📦 Found', allOrders.length, 'orders');

    // Process and save orders
    let synced = 0;
    for (const order of allOrders) {
      // Calculate order metrics
      const subtotalPrice = parseFloat(order.subtotal_price) || 0;
      const totalPrice = parseFloat(order.total_price) || 0;
      const totalTax = parseFloat(order.total_tax) || 0;
      const totalShipping = order.shipping_lines?.reduce((sum: number, line: any) => sum + parseFloat(line.price || 0), 0) || 0;
      const totalDiscounts = parseFloat(order.total_discounts) || 0;

      // Calculate COGS from line items (use product cost or default percentage)
      let totalCogs = 0;
      const lineItems = [];

      for (const item of order.line_items || []) {
        const itemPrice = parseFloat(item.price) || 0;
        const quantity = item.quantity || 1;
        const totalItemPrice = itemPrice * quantity;

        // Try to get product cost from database
        const { data: product } = await supabase
          .from('products')
          .select('cost_per_item')
          .eq('store_id', store_id)
          .eq('shopify_variant_id', item.variant_id?.toString())
          .single();

        const costPerItem = product?.cost_per_item || (itemPrice * defaultCogsPercentage / 100);
        const itemCogs = costPerItem * quantity;
        totalCogs += itemCogs;

        lineItems.push({
          store_id,
          order_id: order.id.toString(),
          shopify_line_item_id: item.id?.toString(),
          shopify_product_id: item.product_id?.toString(),
          shopify_variant_id: item.variant_id?.toString(),
          title: item.title,
          quantity,
          price: itemPrice,
          total_price: totalItemPrice,
          cost_per_item: costPerItem,
          total_cost: itemCogs,
          profit: totalItemPrice - itemCogs,
          created_at: order.created_at,
        });
      }

      // Calculate fees
      const paymentFee = (totalPrice * paymentProcessingRate) + paymentProcessingFixed;
      const shopifyFee = subtotalPrice * shopifyFeeRate;
      const totalFees = paymentFee + shopifyFee;

      // Calculate profits
      const grossProfit = subtotalPrice - totalCogs;
      const netProfit = grossProfit - totalFees;
      const profitMargin = subtotalPrice > 0 ? (netProfit / subtotalPrice) * 100 : 0;

      // Upsert order
      await supabase
        .from('orders')
        .upsert({
          store_id,
          shopify_order_id: order.id.toString(),
          order_number: order.order_number?.toString() || order.name,
          customer_email: '', // Not fetching customer data to avoid protected data requirements
          subtotal_price: subtotalPrice,
          total_price: totalPrice,
          total_tax: totalTax,
          total_shipping: totalShipping,
          total_discounts: totalDiscounts,
          total_cogs: totalCogs,
          payment_processing_fee: paymentFee,
          shopify_fee: shopifyFee,
          gross_profit: grossProfit,
          net_profit: netProfit,
          profit_margin: profitMargin,
          financial_status: order.financial_status,
          fulfillment_status: order.fulfillment_status || 'unfulfilled',
          order_created_at: order.created_at,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'store_id,shopify_order_id',
        });

      // Upsert line items
      let lineItemsSynced = 0;
      for (const item of lineItems) {
        const { error: lineItemError } = await supabase
          .from('order_line_items')
          .upsert(item, {
            onConflict: 'store_id,shopify_line_item_id',
          });
        if (lineItemError) {
          console.error('❌ Line item upsert error:', lineItemError, 'Item:', item.title);
        } else {
          lineItemsSynced++;
        }
      }
      console.log(`📦 Order ${order.id}: ${lineItemsSynced}/${lineItems.length} line items synced`);

      synced++;
    }

    console.log('✅ Order sync complete:', synced, 'orders');

    return NextResponse.json({
      success: true,
      synced,
      total_orders: allOrders.length,
    });
  } catch (error) {
    console.error('❌ Order sync error:', error);
    return NextResponse.json({ error: 'Sync failed', details: String(error) }, { status: 500 });
  }
}
