import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Inventory Profit Forecast
 * Predicts profit potential based on current inventory and sales velocity
 */
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('store_id');

  if (!storeId) {
    return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get last 30 days of sales data
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  // Get products with inventory (stored per variant)
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('shopify_product_id, shopify_variant_id, title, price, cost_per_item, inventory_quantity')
    .eq('store_id', storeId);

  console.log('[Inventory Forecast] store_id:', storeId, 'products found:', products?.length, 'error:', productsError?.message);

  // Get sales data by variant
  const { data: lineItems } = await supabase
    .from('order_line_items')
    .select(`
      shopify_variant_id,
      quantity,
      profit,
      orders!inner(order_created_at, store_id)
    `)
    .eq('orders.store_id', storeId)
    .gte('orders.order_created_at', startDate.toISOString());

  // Calculate sales velocity per variant
  const salesData: { [key: string]: { totalSold: number; totalProfit: number } } = {};
  for (const item of lineItems || []) {
    const key = item.shopify_variant_id;
    if (!key) continue;
    if (!salesData[key]) {
      salesData[key] = { totalSold: 0, totalProfit: 0 };
    }
    salesData[key].totalSold += item.quantity || 0;
    salesData[key].totalProfit += item.profit || 0;
  }

  const daysInPeriod = 30;

  // Build forecast for each product variant
  const forecasts = (products || [])
    .map(product => {
      const variantId = product.shopify_variant_id;
      const sales = salesData[variantId] || { totalSold: 0, totalProfit: 0 };

      const dailyVelocity = sales.totalSold / daysInPeriod;
      const profitPerUnit = sales.totalSold > 0
        ? sales.totalProfit / sales.totalSold
        : (product.price || 0) - (product.cost_per_item || 0);

      const currentInventory = product.inventory_quantity || 0;
      const daysOfStock = dailyVelocity > 0 ? currentInventory / dailyVelocity : 999;

      // Calculate 30-day profit potential
      const projectedSales30d = Math.min(currentInventory, dailyVelocity * 30);
      const projectedProfit30d = projectedSales30d * profitPerUnit;

      // Calculate opportunity cost if stocking more
      const optimalStock30d = Math.ceil(dailyVelocity * 30 * 1.5); // 1.5x buffer
      const additionalUnitsNeeded = Math.max(0, optimalStock30d - currentInventory);
      const additionalProfitPotential = additionalUnitsNeeded * profitPerUnit;

      return {
        productId: variantId,
        title: product.title,
        currentPrice: product.price || 0,
        costPerItem: product.cost_per_item || 0,
        profitPerUnit,
        currentInventory,
        dailyVelocity,
        daysOfStock: Math.round(daysOfStock),
        projectedSales30d: Math.round(projectedSales30d),
        projectedProfit30d,
        optimalStock30d,
        additionalUnitsNeeded,
        additionalProfitPotential,
        stockStatus: daysOfStock < 7 ? 'critical' : daysOfStock < 14 ? 'low' : daysOfStock < 30 ? 'adequate' : 'overstocked',
      };
    })
    .filter(f => f.dailyVelocity > 0) // Only products with recent sales
    .sort((a, b) => b.additionalProfitPotential - a.additionalProfitPotential);

  // Calculate summary stats
  const totalProjectedProfit = forecasts.reduce((sum, f) => sum + f.projectedProfit30d, 0);
  const totalOpportunity = forecasts.reduce((sum, f) => sum + f.additionalProfitPotential, 0);
  const criticalStock = forecasts.filter(f => f.stockStatus === 'critical').length;
  const lowStock = forecasts.filter(f => f.stockStatus === 'low').length;

  // Top opportunities
  const topOpportunities = forecasts
    .filter(f => f.additionalProfitPotential > 0 && f.stockStatus !== 'overstocked')
    .slice(0, 5);

  // Products at risk of stockout
  const atRisk = forecasts
    .filter(f => f.stockStatus === 'critical' || f.stockStatus === 'low')
    .slice(0, 5);

  // Debug info
  const productsWithInventory = (products || []).filter(p => (p.inventory_quantity || 0) > 0);
  const productsWithSales = Object.keys(salesData).length;

  return NextResponse.json({
    summary: {
      totalProducts: forecasts.length,
      totalProjectedProfit30d: totalProjectedProfit,
      totalOpportunityLost: totalOpportunity,
      criticalStockCount: criticalStock,
      lowStockCount: lowStock,
    },
    topOpportunities,
    atRiskProducts: atRisk,
    allForecasts: forecasts,
    debug: {
      storeId,
      totalProductsInDB: products?.length || 0,
      productsWithInventory: productsWithInventory.length,
      productsWithSales: productsWithSales,
      lineItemsFound: lineItems?.length || 0,
      productsError: productsError?.message,
      sampleInventory: products?.slice(0, 3).map(p => ({ title: p.title, qty: p.inventory_quantity })),
    },
  });
}
