import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/twilio';

/**
 * Low Stock Alerts Cron
 * Checks for high-profit items running low on inventory
 * Schedule: Daily at 9am
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get stores with low stock alerts enabled
  const { data: stores } = await supabase
    .from('stores')
    .select('id, store_name, email, store_settings(*)')
    .eq('subscription_status', 'active');

  if (!stores || stores.length === 0) {
    return NextResponse.json({ message: 'No active stores' });
  }

  let alertsSent = 0;

  for (const store of stores) {
    // store_settings can be array or object depending on Supabase query
    const settingsData = store.store_settings;
    const settings = Array.isArray(settingsData) ? settingsData[0] : settingsData;

    // Skip if alerts not enabled
    if (!settings?.low_stock_alerts_enabled) continue;

    // Get products that are low on stock
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', store.id)
      .not('inventory_quantity', 'is', null);

    if (!products || products.length === 0) continue;

    // Filter to low stock items
    const lowStockProducts = products.filter(p =>
      p.inventory_quantity <= (p.low_stock_threshold || 10)
    );

    if (lowStockProducts.length === 0) continue;

    // Get profit data for these products (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const productIds = lowStockProducts.map(p => p.shopify_product_id);

    const { data: lineItems } = await supabase
      .from('order_line_items')
      .select('shopify_product_id, profit')
      .eq('store_id', store.id)
      .in('shopify_product_id', productIds);

    // Calculate profit per product
    const productProfits: { [key: string]: number } = {};
    for (const item of lineItems || []) {
      const key = item.shopify_product_id;
      productProfits[key] = (productProfits[key] || 0) + (item.profit || 0);
    }

    // Sort low stock products by profit (highest first)
    const sortedLowStock = lowStockProducts
      .map(p => ({
        ...p,
        totalProfit: productProfits[p.shopify_product_id] || 0
      }))
      .filter(p => p.totalProfit > 0) // Only alert for profitable items
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 5); // Top 5 most profitable low-stock items

    if (sortedLowStock.length === 0) continue;

    // Send SMS alert if enabled
    if (settings.sms_enabled && settings.low_stock_sms_enabled && settings.sms_phone_number) {
      try {
        let smsBody = `⚠️ Low Stock Alert
${store.store_name}

High-profit items running low:\n`;

        for (const product of sortedLowStock) {
          smsBody += `\n• ${product.title}
  Stock: ${product.inventory_quantity} left
  Profit: $${product.totalProfit.toFixed(0)}/mo`;
        }

        smsBody += '\n\nRestock soon to avoid lost sales!';

        await sendSMS(settings.sms_phone_number, smsBody);
        alertsSent++;
        console.log('📱 Low stock SMS sent for', store.store_name);
      } catch (err) {
        console.error('Low stock SMS error:', err);
      }
    }

    // Could also send email here
  }

  return NextResponse.json({ success: true, alertsSent });
}
